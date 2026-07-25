//! Cointh GLM lane — PRIMARY tier for the GLM family (P098 Rev F, APPROVED 2026-07-25).
//!
//! Single-vendor gateway, not an aggregator. Verified 2026-07-25: 8 GLM ids, all
//! reachable, `anthropic_messages` only — `/v1/chat/completions` returns 404 for
//! every id. `glm-5.2` measured 1265 ms here against 3610 ms on the maxplus lane,
//! which is why GLM is routed here first.
//!
//! It carries the same guardrails as the maxplus lane: egress redaction before
//! any payload leaves, a per-pool circuit breaker, and a hash-chained receipt per
//! call. Those are shared with [`crate::maxplus`] rather than re-implemented.

use std::sync::Arc;
use std::time::{Duration, Instant};

use async_trait::async_trait;

use crate::breaker::CircuitBreaker;
use crate::maxplus::{env_nonempty, redaction_gate, Schema, BIG_BUDGET_TOKENS, CONNECT_TIMEOUT, MAX_RETRIES, TOTAL_TIMEOUT};
use crate::receipt::{Outcome, ReceiptDraft, ReceiptLog};
use crate::{CompletionRequest, CompletionResponse, LlmProvider, ProviderError};

/// Verified gateway base, including its path prefix (P098 Rev F §3).
/// The path is part of the origin here — unlike a `/v1` suffix, which would be a bug.
pub const COINTH_BASE_URL: &str = "https://cointh.com/glm/anthropic";

/// Breaker key for this lane. Cointh exposes no pools; the whole gateway is one unit.
pub const COINTH_POOL: &str = "cointh";

/// HTTP statuses that mean "out of quota" on their own.
///
/// Rev F §6 is deliberate: a timeout or a 5xx is **not** exhaustion. Treating a
/// blip as exhaustion would quietly redirect spend onto a paid reseller, which is
/// the opposite of the intent. Only an unambiguous quota status counts here.
///
/// `401` is deliberately absent — see [`signals_exhaustion`].
const EXHAUSTION_STATUSES: &[u16] = &[402, 429];

/// Markers in a provider body that name a credit or quota condition.
///
/// Every entry below was taken from a real response captured on this host, not
/// from a vendor doc. The first two come from a genuine out-of-credit event on
/// 2026-06-30 recorded in `~/.hermes/profiles/solis/sessions/`:
///
/// ```text
/// "error": { "type": "CreditsError", "status_code": 401,
///            "body": { "type": "CreditsError",
///                      "message": "Insufficient balance. Manage your billing here: ..." } }
/// ```
/// `usage limit has been reached` was captured live from the `cline` CLI on
/// 2026-07-25 — a third distinct wording, in plain prose rather than an error code.
const EXHAUSTION_MARKERS: &[&str] = &[
    "creditserror",
    "insufficient balance",
    "insufficient_quota",
    "quota_exceeded",
    "rate_limit_exceeded",
    "rate_limit_error",
    "rate_limit_failure",
    "resource_exhausted",
    "credit_exhausted",
    "billing_hard_limit_reached",
    "usage limit has been reached",
];

/// Whether a response body names a quota or credit condition.
pub fn body_signals_exhaustion(body: &str) -> bool {
    let lowered = body.to_ascii_lowercase();
    EXHAUSTION_MARKERS.iter().any(|m| lowered.contains(m))
}

/// Whether an HTTP status is a quota signal on its own.
pub fn status_signals_exhaustion(status: u16) -> bool {
    EXHAUSTION_STATUSES.contains(&status)
}

/// Whether a response means "this credential is spent".
///
/// The captured evidence forced this to be a two-part rule. The real out-of-credit
/// response arrived as **HTTP 401**, not 402 or 429 — so a status-only rule would
/// never fire when the balance actually runs out. But a bare `401` is the ordinary
/// signal for a wrong or revoked key, and reading that as exhaustion would push
/// traffic onto the metered lane every time a credential breaks.
///
/// So: an unambiguous status is enough on its own; otherwise the body must name
/// the condition.
pub fn signals_exhaustion(status: u16, body: &str) -> bool {
    status_signals_exhaustion(status) || body_signals_exhaustion(body)
}

// ─── Provider ────────────────────────────────────────────────────────────────

/// One GLM model on the cointh lane.
pub struct CointhProvider {
    base_url: String,
    model: String,
    api_key_env: String,
    breaker: Arc<CircuitBreaker>,
    receipts: Arc<ReceiptLog>,
    http: reqwest::Client,
}

impl CointhProvider {
    pub fn new(
        model: impl Into<String>,
        breaker: Arc<CircuitBreaker>,
        receipts: Arc<ReceiptLog>,
    ) -> Self {
        let http = reqwest::Client::builder()
            .connect_timeout(CONNECT_TIMEOUT)
            .timeout(TOTAL_TIMEOUT)
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        Self {
            base_url: env_nonempty("COINTH_BASE_URL").unwrap_or_else(|| COINTH_BASE_URL.to_string()),
            model: model.into(),
            api_key_env: "COINTH_API_KEY".to_string(),
            breaker,
            receipts,
            http,
        }
    }

    pub fn model(&self) -> &str {
        &self.model
    }

    fn log(&self, outcome: Outcome, tokens: u32, latency_ms: u64) {
        let draft = ReceiptDraft {
            provider: "cointh".into(),
            model_id: self.model.clone(),
            pool: COINTH_POOL.into(),
            tokens,
            latency_ms,
            outcome,
        };
        if let Err(e) = self.receipts.append(draft) {
            tracing::error!(error = %e, "failed to write cointh receipt");
        }
    }
}

#[async_trait]
impl LlmProvider for CointhProvider {
    fn name(&self) -> &'static str {
        "cointh"
    }

    async fn complete(&self, req: &CompletionRequest) -> Result<CompletionResponse, ProviderError> {
        let outbound = format!("{}\n{}", req.system.clone().unwrap_or_default(), req.prompt);
        if let Err(hit) = redaction_gate(&outbound) {
            tracing::error!(
                marker = hit.marker,
                model = %self.model,
                "DENIED: egress redaction gate blocked cointh request"
            );
            self.log(Outcome::DeniedRedaction, 0, 0);
            return Err(ProviderError::DeniedRedaction(hit.marker.to_string()));
        }

        if !self.breaker.allows(COINTH_POOL) {
            self.log(Outcome::BreakerOpen, 0, 0);
            return Err(ProviderError::Unavailable(
                "cointh lane is DOWN (circuit breaker open)".into(),
            ));
        }

        let key = std::env::var(&self.api_key_env)
            .map_err(|_| ProviderError::Unavailable(format!("{} not set", self.api_key_env)))?;

        let started = Instant::now();
        let mut budget = req.max_tokens;
        let mut retries_left = MAX_RETRIES;

        loop {
            let resp = self
                .http
                .post(format!("{}{}", self.base_url, Schema::AnthropicMessages.path()))
                .bearer_auth(&key)
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .json(&serde_json::json!({
                    "model": self.model,
                    "max_tokens": budget,
                    "messages": [
                        {"role": "system", "content": req.system.clone().unwrap_or_default()},
                        {"role": "user", "content": req.prompt}
                    ]
                }))
                .send()
                .await;

            let ms = || started.elapsed().as_millis() as u64;

            let resp = match resp {
                Ok(r) => r,
                Err(e) if retries_left > 0 && !e.is_timeout() => {
                    tracing::warn!(model = %self.model, error = %e, "cointh transport error, one retry left");
                    retries_left -= 1;
                    continue;
                }
                Err(e) => {
                    let timed_out = e.is_timeout();
                    self.breaker.record_failure(COINTH_POOL);
                    self.log(
                        if timed_out { Outcome::Timeout } else { Outcome::Error },
                        budget,
                        ms(),
                    );
                    return Err(ProviderError::Http(e));
                }
            };

            let status = resp.status().as_u16();
            let body = resp.text().await.unwrap_or_default();

            // Quota exhaustion is its own outcome — the caller falls through to the
            // LEAF lane on purpose, and the breaker is NOT tripped: the lane is
            // healthy, the credential is simply spent.
            if signals_exhaustion(status, &body) {
                tracing::warn!(
                    model = %self.model,
                    status,
                    "cointh quota exhausted — falling through to the leaf lane"
                );
                self.log(Outcome::Error, budget, ms());
                return Err(ProviderError::Exhausted {
                    provider: "cointh",
                    status,
                });
            }

            if !(200..300).contains(&status) {
                self.breaker.record_failure(COINTH_POOL);
                self.log(Outcome::Error, budget, ms());
                return Err(ProviderError::Unavailable(format!(
                    "cointh model '{}' returned HTTP {status}",
                    self.model
                )));
            }

            let v: serde_json::Value = serde_json::from_str(&body).unwrap_or_default();
            let text: String = v["content"]
                .as_array()
                .map(|blocks| {
                    blocks.iter().filter_map(|b| b["text"].as_str()).collect::<String>()
                })
                .unwrap_or_default();

            if !text.is_empty() {
                self.breaker.record_success(COINTH_POOL);
                self.log(Outcome::Ok, budget, ms());
                return Ok(CompletionResponse {
                    text,
                    provider: "cointh",
                    model: self.model.clone(),
                });
            }

            // Empty 200 — spend the one retry on a bigger budget, then give up.
            if retries_left > 0 && budget < BIG_BUDGET_TOKENS {
                tracing::warn!(model = %self.model, "empty content, retrying once at 4096 tokens");
                budget = BIG_BUDGET_TOKENS;
                retries_left -= 1;
                continue;
            }

            self.breaker.record_failure(COINTH_POOL);
            self.log(Outcome::Empty, budget, ms());
            return Err(ProviderError::Unavailable(format!(
                "cointh model '{}' returned empty content",
                self.model
            )));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base_url_carries_the_path_prefix_and_no_v1() {
        assert_eq!(COINTH_BASE_URL, "https://cointh.com/glm/anthropic");
        assert!(
            !COINTH_BASE_URL.ends_with("/v1"),
            "a /v1 suffix would produce /v1/v1/messages"
        );
    }

    #[test]
    fn quota_statuses_are_exhaustion() {
        assert!(status_signals_exhaustion(429));
        assert!(status_signals_exhaustion(402));
    }

    #[test]
    fn transient_failures_are_not_exhaustion() {
        // The whole point of Rev F section 6: a blip must not redirect spend.
        for s in [500, 502, 503, 504, 408, 400, 401, 404] {
            assert!(
                !status_signals_exhaustion(s),
                "HTTP {s} must not be read as quota exhaustion"
            );
        }
    }

    #[test]
    fn quota_codes_in_the_body_are_exhaustion() {
        assert!(body_signals_exhaustion(r#"{"error":{"code":"insufficient_quota"}}"#));
        assert!(body_signals_exhaustion(r#"{"error":{"code":"QUOTA_EXCEEDED"}}"#));
        assert!(body_signals_exhaustion(r#"{"error":{"code":"credit_exhausted"}}"#));
        assert!(body_signals_exhaustion(r#"{"error":{"code":"resource_exhausted"}}"#));
        assert!(body_signals_exhaustion(r#"{"error":{"type":"RATE_LIMIT_FAILURE"}}"#));
    }

    #[test]
    fn ordinary_errors_in_the_body_are_not_exhaustion() {
        assert!(!body_signals_exhaustion(r#"{"error":{"code":"model_not_found"}}"#));
        assert!(!body_signals_exhaustion(r#"{"detail":"Not Found"}"#));
        assert!(!body_signals_exhaustion(r#"{"error":{"type":"service_unavailable"}}"#));
        // OAuth device-flow expiry — unrelated to spend, must not divert traffic.
        assert!(!body_signals_exhaustion(r#"{"error":{"code":"device_code_exhausted"}}"#));
    }

    /// Verbatim from a real out-of-credit response captured on this host,
    /// 2026-06-30, in ~/.hermes/profiles/solis/sessions/. It arrived as HTTP 401.
    const REAL_CREDITS_ERROR: &str = r#"{"type":"error","error":{"type":"CreditsError","message":"Insufficient balance. Manage your billing here: https://opencode.ai/workspace/wrk_01KW2VZF6K8M0RGD886AC0JP07/billing"}}"#;

    #[test]
    fn the_real_out_of_credit_response_is_detected() {
        // A status-only rule would have missed this entirely: the provider sent 401.
        assert!(
            !status_signals_exhaustion(401),
            "401 alone must stay an ordinary auth failure"
        );
        assert!(body_signals_exhaustion(REAL_CREDITS_ERROR));
        assert!(signals_exhaustion(401, REAL_CREDITS_ERROR));
    }

    #[test]
    fn a_plain_401_is_a_bad_credential_not_an_empty_wallet() {
        // Reading a revoked key as exhaustion would push spend onto the paid lane
        // every time a credential breaks. It must not.
        let bad_key = r#"{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}"#;
        assert!(!signals_exhaustion(401, bad_key));
    }

    #[test]
    fn unambiguous_statuses_need_no_body() {
        assert!(signals_exhaustion(429, ""));
        assert!(signals_exhaustion(402, "{}"));
    }
}
