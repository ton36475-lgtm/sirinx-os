//! Alibaba Cloud Model Studio (MaaS) lane — PRIMARY tier for qwen, and the
//! fastest measured route for deepseek and kimi (P098 Rev G, PROPOSED).
//!
//! Verified 2026-07-25: the endpoint lists 151 models; 11 were smoke-tested and
//! all 11 answered. Both `openai_chat` and `anthropic_messages` work. Every id
//! that also exists on the maxplus lane was faster here — `deepseek-v4-flash`
//! 870 ms against 3112 ms, `qwen3.7-max` 2191 ms against 5357 ms.
//!
//! Guardrails are shared with the other lanes rather than re-implemented: the
//! egress redaction gate and circuit breaker come from [`crate::maxplus`] and
//! [`crate::breaker`], exhaustion detection from [`crate::cointh`].

use std::sync::Arc;
use std::time::Instant;

use async_trait::async_trait;

use crate::breaker::CircuitBreaker;
use crate::cointh::signals_exhaustion;
use crate::maxplus::{env_nonempty, redaction_gate, BIG_BUDGET_TOKENS, CONNECT_TIMEOUT, MAX_RETRIES, TOTAL_TIMEOUT};
use crate::receipt::{Outcome, ReceiptDraft, ReceiptLog};
use crate::{CompletionRequest, CompletionResponse, LlmProvider, ProviderError};

/// Verified workspace endpoint (2026-07-25).
///
/// **This host is account-specific.** `ws-pmpu62szcpaossb6` is the workspace id,
/// baked into the domain by Model Studio. A different workspace is a different
/// URL, so this constant is a default rather than a fact about the service —
/// `ALIBABA_MAAS_BASE_URL` overrides it.
pub const ALIBABA_BASE_URL: &str = "https://ws-pmpu62szcpaossb6.ap-southeast-1.maas.aliyuncs.com";

/// OpenAI-compatible path. All 11 probed ids answered here.
pub const OPENAI_PATH: &str = "/compatible-mode/v1/chat/completions";

/// Anthropic-shaped path. Verified on `qwen3.7-max` and `glm-5.2`.
pub const ANTHROPIC_PATH: &str = "/apps/anthropic/v1/messages";

/// Breaker key. Model Studio exposes no pools; the workspace is the unit.
pub const ALIBABA_POOL: &str = "alibaba-maas";

/// Which wire format to use for a given model.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Wire {
    /// `/compatible-mode/v1/chat/completions`
    OpenAiChat,
    /// `/apps/anthropic/v1/messages` + `anthropic-version`
    AnthropicMessages,
}

impl Wire {
    pub fn path(&self) -> &'static str {
        match self {
            Wire::OpenAiChat => OPENAI_PATH,
            Wire::AnthropicMessages => ANTHROPIC_PATH,
        }
    }
}

/// Some GLM builds on this endpoint leak reasoning markup into the content —
/// `glm-5.2-fast-preview` returned `OK.</think></think>OK.` to a one-word prompt.
/// Strip it rather than passing it downstream as if it were the answer.
pub fn strip_reasoning_markup(text: &str) -> String {
    let mut out = text.to_string();
    for tag in ["<think>", "</think>", "<thinking>", "</thinking>"] {
        out = out.replace(tag, "");
    }
    out.trim().to_string()
}

/// One model on the Alibaba MaaS lane.
pub struct AlibabaProvider {
    base_url: String,
    model: String,
    wire: Wire,
    needs_big_budget: bool,
    api_key_env: String,
    breaker: Arc<CircuitBreaker>,
    receipts: Arc<ReceiptLog>,
    http: reqwest::Client,
}

impl AlibabaProvider {
    pub fn new(
        model: impl Into<String>,
        wire: Wire,
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
            base_url: env_nonempty("ALIBABA_MAAS_BASE_URL")
                .unwrap_or_else(|| ALIBABA_BASE_URL.to_string()),
            model: model.into(),
            wire,
            needs_big_budget,
            api_key_env: "ALIBABA_MAAS_API_KEY".to_string(),
            breaker,
            receipts,
            http,
        }
    }

    pub fn model(&self) -> &str {
        &self.model
    }

    pub fn wire(&self) -> Wire {
        self.wire
    }

    fn body(&self, req: &CompletionRequest, max_tokens: u32) -> serde_json::Value {
        serde_json::json!({
            "model": self.model,
            "max_tokens": max_tokens,
            "messages": [
                {"role": "system", "content": req.system.clone().unwrap_or_default()},
                {"role": "user", "content": req.prompt}
            ]
        })
    }

    fn extract(&self, v: &serde_json::Value) -> String {
        let raw = match self.wire {
            Wire::OpenAiChat => v["choices"][0]["message"]["content"]
                .as_str()
                .unwrap_or_default()
                .to_string(),
            Wire::AnthropicMessages => v["content"]
                .as_array()
                .map(|blocks| {
                    blocks.iter().filter_map(|b| b["text"].as_str()).collect::<String>()
                })
                .unwrap_or_default(),
        };
        strip_reasoning_markup(&raw)
    }

    fn log(&self, outcome: Outcome, tokens: u32, latency_ms: u64) {
        let draft = ReceiptDraft {
            provider: "alibaba".into(),
            model_id: self.model.clone(),
            pool: ALIBABA_POOL.into(),
            tokens,
            latency_ms,
            outcome,
        };
        if let Err(e) = self.receipts.append(draft) {
            tracing::error!(error = %e, "failed to write alibaba receipt");
        }
    }
}

#[async_trait]
impl LlmProvider for AlibabaProvider {
    fn name(&self) -> &'static str {
        "alibaba"
    }

    async fn complete(&self, req: &CompletionRequest) -> Result<CompletionResponse, ProviderError> {
        let outbound = format!("{}\n{}", req.system.clone().unwrap_or_default(), req.prompt);
        if let Err(hit) = redaction_gate(&outbound) {
            tracing::error!(
                marker = hit.marker,
                model = %self.model,
                "DENIED: egress redaction gate blocked alibaba request"
            );
            self.log(Outcome::DeniedRedaction, 0, 0);
            return Err(ProviderError::DeniedRedaction(hit.marker.to_string()));
        }

        if !self.breaker.allows(ALIBABA_POOL) {
            self.log(Outcome::BreakerOpen, 0, 0);
            return Err(ProviderError::Unavailable(
                "alibaba lane is DOWN (circuit breaker open)".into(),
            ));
        }

        let key = std::env::var(&self.api_key_env)
            .map_err(|_| ProviderError::Unavailable(format!("{} not set", self.api_key_env)))?;

        let started = Instant::now();
        let mut budget = if self.needs_big_budget { BIG_BUDGET_TOKENS } else { req.max_tokens };
        let mut retries_left = MAX_RETRIES;

        loop {
            let mut rb = self
                .http
                .post(format!("{}{}", self.base_url, self.wire.path()))
                .bearer_auth(&key)
                .header("content-type", "application/json");
            if self.wire == Wire::AnthropicMessages {
                rb = rb.header("anthropic-version", "2023-06-01");
            }

            let resp = rb.json(&self.body(req, budget)).send().await;
            let ms = || started.elapsed().as_millis() as u64;

            let resp = match resp {
                Ok(r) => r,
                Err(e) if retries_left > 0 && !e.is_timeout() => {
                    tracing::warn!(model = %self.model, error = %e, "alibaba transport error, one retry left");
                    retries_left -= 1;
                    continue;
                }
                Err(e) => {
                    let timed_out = e.is_timeout();
                    self.breaker.record_failure(ALIBABA_POOL);
                    self.log(if timed_out { Outcome::Timeout } else { Outcome::Error }, budget, ms());
                    return Err(ProviderError::Http(e));
                }
            };

            let status = resp.status().as_u16();
            let body = resp.text().await.unwrap_or_default();

            // A spent quota is not a fault: the caller should fall through to the
            // leaf lane, and the breaker should stay closed because the lane is fine.
            if signals_exhaustion(status, &body) {
                tracing::warn!(model = %self.model, status, "alibaba quota exhausted, falling through");
                self.log(Outcome::Error, budget, ms());
                return Err(ProviderError::Exhausted { provider: "alibaba", status });
            }

            if !(200..300).contains(&status) {
                self.breaker.record_failure(ALIBABA_POOL);
                self.log(Outcome::Error, budget, ms());
                return Err(ProviderError::Unavailable(format!(
                    "alibaba model '{}' returned HTTP {status}",
                    self.model
                )));
            }

            let v: serde_json::Value = serde_json::from_str(&body).unwrap_or_default();
            let text = self.extract(&v);

            if !text.is_empty() {
                self.breaker.record_success(ALIBABA_POOL);
                self.log(Outcome::Ok, budget, ms());
                return Ok(CompletionResponse {
                    text,
                    provider: "alibaba",
                    model: self.model.clone(),
                });
            }

            // M2.4: an empty 200 gets one bigger-budget retry. glm-5.2 needed it here.
            if retries_left > 0 && budget < BIG_BUDGET_TOKENS {
                tracing::warn!(model = %self.model, "empty content, retrying once at 4096 tokens");
                budget = BIG_BUDGET_TOKENS;
                retries_left -= 1;
                continue;
            }

            self.breaker.record_failure(ALIBABA_POOL);
            self.log(Outcome::Empty, budget, ms());
            return Err(ProviderError::Unavailable(format!(
                "alibaba model '{}' returned empty content",
                self.model
            )));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn paths_match_what_was_probed() {
        assert_eq!(Wire::OpenAiChat.path(), "/compatible-mode/v1/chat/completions");
        assert_eq!(Wire::AnthropicMessages.path(), "/apps/anthropic/v1/messages");
    }

    #[test]
    fn base_url_is_the_verified_workspace_host() {
        assert!(ALIBABA_BASE_URL.starts_with("https://ws-"));
        assert!(ALIBABA_BASE_URL.contains("maas.aliyuncs.com"));
        assert!(!ALIBABA_BASE_URL.ends_with('/'), "paths are appended, so no trailing slash");
        assert!(!ALIBABA_BASE_URL.ends_with("/v1"), "the wire paths carry their own /v1");
    }

    #[test]
    fn reasoning_markup_is_stripped_from_content() {
        // Verbatim from glm-5.2-fast-preview's reply to "Say OK" on 2026-07-25.
        assert_eq!(strip_reasoning_markup("OK.</think></think>OK."), "OK.OK.");
        assert_eq!(strip_reasoning_markup("<think>hmm</think>Answer"), "hmmAnswer");
    }

    #[test]
    fn ordinary_text_survives_stripping_unchanged() {
        assert_eq!(strip_reasoning_markup("OK"), "OK");
        assert_eq!(strip_reasoning_markup("  padded  "), "padded");
        assert_eq!(
            strip_reasoning_markup("I think this is right"),
            "I think this is right",
            "the word 'think' outside a tag must not be touched"
        );
    }

    #[test]
    fn the_workspace_id_is_overridable() {
        // A different Model Studio workspace is a different host, so the constant
        // has to be a default rather than something the code depends on.
        unsafe { std::env::set_var("ALIBABA_MAAS_BASE_URL", "https://ws-other.example.com") };
        let p = AlibabaProvider::new(
            "qwen3.7-max",
            Wire::OpenAiChat,
            false,
            Arc::new(CircuitBreaker::new()),
            Arc::new(ReceiptLog::new("/tmp/ghostclaw-alibaba-test.jsonl")),
        );
        assert_eq!(p.base_url, "https://ws-other.example.com");
        unsafe { std::env::remove_var("ALIBABA_MAAS_BASE_URL") };
    }
}
