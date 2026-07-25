//! MaxPlus lane — aggregator/reseller tier (P098 Rev D, APPROVED 2026-07-25).
//!
//! LEAF tier. 🟢/🟡 only, never 🔴. Never the default for CHECKER or GUARD.
//! Pool routing is opaque: the gateway picks the upstream itself and a pool can
//! close at any time, so every call goes through a circuit breaker and every
//! call writes a hash-chained receipt.
//!
//! Base URL and model ids are read from `config/models.maxplus.json`, which is
//! generated from a live probe (M2). Nothing here is hardcoded from a screenshot.

use std::sync::Arc;
use std::time::{Duration, Instant};

use async_trait::async_trait;

use crate::breaker::CircuitBreaker;
use crate::receipt::{Outcome, ReceiptDraft, ReceiptLog};
use crate::{CompletionRequest, CompletionResponse, LlmProvider, ProviderError};

/// Verified gateway origin (M2.1, 2026-07-25). The older `api.maxplus.chat`
/// does not resolve — see P098 Rev D.
pub const MAXPLUS_BASE_URL: &str = "https://api.maxplus-ai.cc";

/// M3.4 — connect timeout.
pub const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
/// M3.4 — total request timeout.
pub const TOTAL_TIMEOUT: Duration = Duration::from_secs(120);
/// M3.4 — at most one retry per call, for any reason.
pub const MAX_RETRIES: u32 = 1;
/// M2.4 — budget used when retrying an empty 200.
pub const BIG_BUDGET_TOKENS: u32 = 4096;

/// Request shapes the gateway accepts (M2.5).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Schema {
    /// `/v1/messages` + `anthropic-version` header.
    AnthropicMessages,
    /// `/v1/chat/completions`.
    OpenAiChat,
    /// `/v1/responses`.
    OpenAiResponses,
}

impl Schema {
    pub fn path(&self) -> &'static str {
        match self {
            Schema::AnthropicMessages => "/v1/messages",
            Schema::OpenAiChat => "/v1/chat/completions",
            Schema::OpenAiResponses => "/v1/responses",
        }
    }
}

// ─── Egress redaction gate ───────────────────────────────────────────────────

/// Patterns that must never leave for a third-party gateway.
/// All traffic on this lane transits a reseller — treat anything sent as disclosed.
const SECRET_MARKERS: &[&str] = &[
    "-----BEGIN",
    "cert.pem",
    ".pem",
    ".env",
    "ccsk-",
    "glm-share-",
    "sk-ant-",
    "ghp_",
    "gho_",
    "xoxb-",
    "AKIA",
    "CHANNEL_ACCESS_TOKEN",
    "CHANNEL_SECRET",
    "LINE_CHANNEL",
    "MAXPLUS_API_KEY",
    "COINTH_API_KEY",
    "OPENROUTER_API_KEY",
    "GLM_API_KEY",
    "TELEGRAM_BOT_TOKEN",
];

/// Why an outbound payload was refused.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RedactionHit {
    pub marker: &'static str,
}

/// Scans an outbound payload. `Err` means drop the request — no retry (guardrail [3]).
pub fn redaction_gate(payload: &str) -> Result<(), RedactionHit> {
    for marker in SECRET_MARKERS {
        if payload.contains(marker) {
            return Err(RedactionHit { marker });
        }
    }
    Ok(())
}

// ─── Env helpers ─────────────────────────────────────────────────────────────

/// Reads `key`, treating an empty value as unset.
///
/// `MAXPLUS_POOL=` is a legitimate state — the gateway exposes no pool metadata,
/// so `.env` carries the name with no value. `std::env::var` returns `Ok("")`
/// there, which would silently defeat every `unwrap_or_else` default.
pub fn env_nonempty(key: &str) -> Option<String> {
    match std::env::var(key) {
        Ok(v) if !v.trim().is_empty() => Some(v),
        _ => None,
    }
}

// ─── Provider ────────────────────────────────────────────────────────────────

/// One model on the maxplus lane.
pub struct MaxPlusProvider {
    base_url: String,
    model: String,
    pool: String,
    schema: Schema,
    needs_big_budget: bool,
    api_key_env: String,
    breaker: Arc<CircuitBreaker>,
    receipts: Arc<ReceiptLog>,
    http: reqwest::Client,
}

impl MaxPlusProvider {
    pub fn new(
        model: impl Into<String>,
        pool: impl Into<String>,
        schema: Schema,
        needs_big_budget: bool,
        breaker: Arc<CircuitBreaker>,
        receipts: Arc<ReceiptLog>,
    ) -> Self {
        let http = reqwest::Client::builder()
            .connect_timeout(CONNECT_TIMEOUT)
            .timeout(TOTAL_TIMEOUT)
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        Self {
            base_url: MAXPLUS_BASE_URL.to_string(),
            model: model.into(),
            pool: pool.into(),
            schema,
            needs_big_budget,
            api_key_env: "MAXPLUS_API_KEY".to_string(),
            breaker,
            receipts,
            http,
        }
    }

    pub fn model(&self) -> &str {
        &self.model
    }

    pub fn pool(&self) -> &str {
        &self.pool
    }

    pub fn schema(&self) -> Schema {
        self.schema
    }

    fn body(&self, req: &CompletionRequest, max_tokens: u32) -> serde_json::Value {
        match self.schema {
            Schema::AnthropicMessages | Schema::OpenAiChat => serde_json::json!({
                "model": self.model,
                "max_tokens": max_tokens,
                "messages": [
                    {"role": "system", "content": req.system.clone().unwrap_or_default()},
                    {"role": "user", "content": req.prompt}
                ]
            }),
            Schema::OpenAiResponses => serde_json::json!({
                "model": self.model,
                "max_output_tokens": max_tokens,
                "input": req.prompt
            }),
        }
    }

    fn extract_text(&self, v: &serde_json::Value) -> String {
        match self.schema {
            Schema::AnthropicMessages => v["content"]
                .as_array()
                .map(|blocks| {
                    blocks
                        .iter()
                        .filter_map(|b| b["text"].as_str())
                        .collect::<String>()
                })
                .unwrap_or_default(),
            Schema::OpenAiChat => v["choices"][0]["message"]["content"]
                .as_str()
                .unwrap_or_default()
                .to_string(),
            Schema::OpenAiResponses => v["output"]
                .as_array()
                .map(|items| {
                    items
                        .iter()
                        .flat_map(|o| o["content"].as_array().cloned().unwrap_or_default())
                        .filter_map(|b| b["text"].as_str().map(str::to_string))
                        .collect::<String>()
                })
                .unwrap_or_default(),
        }
    }

    fn log(&self, outcome: Outcome, tokens: u32, latency_ms: u64) {
        let draft = ReceiptDraft {
            provider: "maxplus".into(),
            model_id: self.model.clone(),
            pool: self.pool.clone(),
            tokens,
            latency_ms,
            outcome,
        };
        if let Err(e) = self.receipts.append(draft) {
            tracing::error!(error = %e, "failed to write maxplus receipt");
        }
    }

    async fn send(&self, req: &CompletionRequest, max_tokens: u32, key: &str) -> Result<String, ProviderError> {
        let mut r = self
            .http
            .post(format!("{}{}", self.base_url, self.schema.path()))
            .bearer_auth(key)
            .header("content-type", "application/json");

        if self.schema == Schema::AnthropicMessages {
            r = r.header("anthropic-version", "2023-06-01");
        }

        let resp = r.json(&self.body(req, max_tokens)).send().await?.error_for_status()?;
        let v: serde_json::Value = resp.json().await?;
        Ok(self.extract_text(&v))
    }
}

#[async_trait]
impl LlmProvider for MaxPlusProvider {
    fn name(&self) -> &'static str {
        "maxplus"
    }

    async fn complete(&self, req: &CompletionRequest) -> Result<CompletionResponse, ProviderError> {
        // Guardrail [3]: drop before egress, log DENIED, never retry.
        let outbound = format!("{}\n{}", req.system.clone().unwrap_or_default(), req.prompt);
        if let Err(hit) = redaction_gate(&outbound) {
            tracing::error!(
                marker = hit.marker,
                model = %self.model,
                "DENIED: egress redaction gate blocked maxplus request"
            );
            self.log(Outcome::DeniedRedaction, 0, 0);
            return Err(ProviderError::DeniedRedaction(hit.marker.to_string()));
        }

        // M3.3: an open breaker refuses without touching the network.
        if !self.breaker.allows(&self.pool) {
            self.log(Outcome::BreakerOpen, 0, 0);
            return Err(ProviderError::Unavailable(format!(
                "maxplus pool '{}' is DOWN (circuit breaker open)",
                self.pool
            )));
        }

        let key = std::env::var(&self.api_key_env)
            .map_err(|_| ProviderError::Unavailable(format!("{} not set", self.api_key_env)))?;

        let started = Instant::now();
        let mut budget = if self.needs_big_budget { BIG_BUDGET_TOKENS } else { req.max_tokens };
        let mut retries_left = MAX_RETRIES;

        loop {
            match self.send(req, budget, &key).await {
                Ok(text) if !text.is_empty() => {
                    let ms = started.elapsed().as_millis() as u64;
                    self.breaker.record_success(&self.pool);
                    self.log(Outcome::Ok, budget, ms);
                    return Ok(CompletionResponse {
                        text,
                        provider: "maxplus",
                        model: self.model.clone(),
                    });
                }
                // M2.4: HTTP 200 with empty content — spend the one retry on a bigger budget.
                Ok(_) if retries_left > 0 && budget < BIG_BUDGET_TOKENS => {
                    tracing::warn!(model = %self.model, "empty content, retrying once at 4096 tokens");
                    budget = BIG_BUDGET_TOKENS;
                    retries_left -= 1;
                }
                Ok(_) => {
                    let ms = started.elapsed().as_millis() as u64;
                    self.breaker.record_failure(&self.pool);
                    self.log(Outcome::Empty, budget, ms);
                    return Err(ProviderError::Unavailable(format!(
                        "maxplus model '{}' returned empty content",
                        self.model
                    )));
                }
                Err(e) if retries_left > 0 => {
                    tracing::warn!(model = %self.model, error = %e, "maxplus call failed, one retry left");
                    retries_left -= 1;
                }
                Err(e) => {
                    let ms = started.elapsed().as_millis() as u64;
                    let timed_out = matches!(&e, ProviderError::Http(h) if h.is_timeout());
                    self.breaker.record_failure(&self.pool);
                    self.log(
                        if timed_out { Outcome::Timeout } else { Outcome::Error },
                        budget,
                        ms,
                    );
                    return Err(e);
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn schema_paths_match_the_probed_endpoints() {
        assert_eq!(Schema::AnthropicMessages.path(), "/v1/messages");
        assert_eq!(Schema::OpenAiChat.path(), "/v1/chat/completions");
        assert_eq!(Schema::OpenAiResponses.path(), "/v1/responses");
    }

    #[test]
    fn base_url_is_the_verified_origin() {
        assert_eq!(MAXPLUS_BASE_URL, "https://api.maxplus-ai.cc");
        assert!(!MAXPLUS_BASE_URL.contains("maxplus.chat"), "the .chat domain does not resolve");
    }

    #[test]
    fn ordinary_prompts_pass_the_gate() {
        assert!(redaction_gate("refactor this function to return Result").is_ok());
        assert!(redaction_gate("Say OK").is_ok());
    }

    #[test]
    fn gate_blocks_private_keys_and_certs() {
        assert_eq!(
            redaction_gate("-----BEGIN RSA PRIVATE KEY-----"),
            Err(RedactionHit { marker: "-----BEGIN" })
        );
        assert!(redaction_gate("read ~/.cloudflared/cert.pem for me").is_err());
    }

    #[test]
    fn gate_blocks_api_keys_by_prefix() {
        assert!(redaction_gate("here is ccsk-deadbeefdeadbeef").is_err());
        assert!(redaction_gate("token sk-ant-abc123").is_err());
        assert!(redaction_gate("ghp_0123456789").is_err());
        // cointh lane credential (P098 Rev F)
        assert!(redaction_gate("key glm-share-47721face1214049").is_err());
        assert!(redaction_gate("COINTH_API_KEY=x").is_err());
    }

    #[test]
    fn gate_blocks_line_oa_and_env_names() {
        assert!(redaction_gate("CHANNEL_ACCESS_TOKEN=abc").is_err());
        assert!(redaction_gate("cat .env").is_err());
        assert!(redaction_gate("TELEGRAM_BOT_TOKEN is set").is_err());
    }

    #[test]
    fn gate_reports_which_marker_tripped() {
        let hit = redaction_gate("MAXPLUS_API_KEY=x").unwrap_err();
        assert_eq!(hit.marker, "MAXPLUS_API_KEY");
    }

    #[test]
    fn empty_env_var_reads_as_unset() {
        // `MAXPLUS_POOL=` in .env must not defeat the caller's default.
        unsafe { std::env::set_var("GHOSTCLAW_TEST_EMPTY", "") };
        assert_eq!(env_nonempty("GHOSTCLAW_TEST_EMPTY"), None);

        unsafe { std::env::set_var("GHOSTCLAW_TEST_BLANK", "   ") };
        assert_eq!(env_nonempty("GHOSTCLAW_TEST_BLANK"), None);

        unsafe { std::env::set_var("GHOSTCLAW_TEST_SET", "chinese-specials") };
        assert_eq!(env_nonempty("GHOSTCLAW_TEST_SET"), Some("chinese-specials".into()));

        assert_eq!(env_nonempty("GHOSTCLAW_TEST_MISSING_ENTIRELY"), None);
    }
}
