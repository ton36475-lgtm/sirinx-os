//! GHOSTCLAW Providers — LLM provider trait + Ollama/OpenRouter/GLM/MaxPlus impls.
//!
//! Tiered routing per **P098 Rev E** (APPROVED 2026-07-25):
//! OpenRouter free → paid frontier (GLM) → maxplus (LEAF).
//!
//! The sovereign local tier (Ollama) was removed by Rev E. `OllamaProvider` is
//! kept compiling so Rev E can be reverted without a rewrite; it is simply no
//! longer part of [`TieredRouter::standard`].

pub mod alibaba;
pub mod breaker;
pub mod cointh;
pub mod family;
pub mod maxplus;
pub mod receipt;

use std::sync::Arc;

use async_trait::async_trait;
use ghostclaw_core::Task;
use secrecy::SecretString;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tracing::warn;

// ─── Types ───────────────────────────────────────────────────────────────────

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CompletionRequest {
    pub system: Option<String>,
    pub prompt: String,
    pub max_tokens: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CompletionResponse {
    pub text: String,
    pub provider: &'static str,
    pub model: String,
}

#[derive(Debug, Error)]
pub enum ProviderError {
    #[error("provider unavailable: {0}")]
    Unavailable(String),
    #[error("http error: {0}")]
    Http(#[from] reqwest::Error),
    /// Blocked by the egress redaction gate before leaving the host.
    /// Never retried — the payload itself is the problem.
    #[error("DENIED by egress redaction gate: matched {0}")]
    DeniedRedaction(String),
    /// The provider's credential is out of quota (P098 Rev F).
    ///
    /// Distinct from [`Self::Unavailable`] on purpose: this is the only condition
    /// that is *supposed* to move traffic to a paid fallback. A timeout or a 5xx
    /// must never be reported as this.
    #[error("{provider} quota exhausted (HTTP {status})")]
    Exhausted { provider: &'static str, status: u16 },
}

// ─── Trait ───────────────────────────────────────────────────────────────────

#[async_trait]
pub trait LlmProvider: Send + Sync {
    fn name(&self) -> &'static str;
    async fn complete(&self, req: &CompletionRequest) -> Result<CompletionResponse, ProviderError>;
}

// ─── Ollama (Tier 1: sovereign local, keyless) ───────────────────────────────

pub struct OllamaProvider {
    pub base_url: String,
    pub model: String,
    http: reqwest::Client,
}

impl OllamaProvider {
    pub fn new(base_url: impl Into<String>, model: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into(),
            model: model.into(),
            http: reqwest::Client::new(),
        }
    }
}

#[async_trait]
impl LlmProvider for OllamaProvider {
    fn name(&self) -> &'static str { "ollama-local" }

    async fn complete(&self, req: &CompletionRequest) -> Result<CompletionResponse, ProviderError> {
        let body = serde_json::json!({
            "model": self.model,
            "messages": [
                {"role": "system", "content": req.system.clone().unwrap_or_default()},
                {"role": "user", "content": req.prompt}
            ],
            "stream": false
        });
        let resp = self.http
            .post(format!("{}/api/chat", self.base_url))
            .json(&body)
            .send().await?
            .error_for_status()?;

        let v: serde_json::Value = resp.json().await?;
        let text = v["message"]["content"].as_str().unwrap_or_default().to_string();
        Ok(CompletionResponse {
            text,
            provider: "ollama-local",
            model: self.model.clone(),
        })
    }
}

// ─── OpenAI-Compatible Provider (Tier 2/3: OpenRouter, GLM, MaxPlus, Claude Fable5) ───

pub struct OpenAiCompatProvider {
    name: &'static str,
    base_url: String,
    api_key_env: String,
    model: String,
    http: reqwest::Client,
}

impl OpenAiCompatProvider {
    pub fn new(
        name: &'static str,
        base_url: impl Into<String>,
        api_key_env: impl Into<String>,
        model: impl Into<String>,
    ) -> Self {
        Self {
            name,
            base_url: base_url.into(),
            api_key_env: api_key_env.into(),
            model: model.into(),
            http: reqwest::Client::new(),
        }
    }
}

#[async_trait]
impl LlmProvider for OpenAiCompatProvider {
    fn name(&self) -> &'static str { self.name }

    async fn complete(&self, req: &CompletionRequest) -> Result<CompletionResponse, ProviderError> {
        let key = std::env::var(&self.api_key_env).map_err(|_| {
            ProviderError::Unavailable(format!("{} not set", self.api_key_env))
        })?;

        let body = serde_json::json!({
            "model": self.model,
            "messages": [
                {"role": "system", "content": req.system.clone().unwrap_or_default()},
                {"role": "user", "content": req.prompt}
            ],
            "max_tokens": req.max_tokens
        });

        let resp = self.http
            .post(format!("{}/chat/completions", self.base_url))
            .bearer_auth(key)
            .json(&body)
            .send().await?
            .error_for_status()?;

        let v: serde_json::Value = resp.json().await?;
        let text = v["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or_default()
            .to_string();

        Ok(CompletionResponse {
            text,
            provider: self.name,
            model: self.model.clone(),
        })
    }
}

// ─── Provider Factories ──────────────────────────────────────────────────────

/// Create the standard OpenRouter provider (free tier models).
pub fn openrouter_free(model: &str) -> OpenAiCompatProvider {
    OpenAiCompatProvider::new(
        "openrouter-free",
        "https://openrouter.ai/api/v1",
        "OPENROUTER_API_KEY",
        model,
    )
}

/// Create the GLM / Z.ai provider (paid frontier).
/// Base: https://api.z.ai/api/paas/v4  (NOT /v1 — that 404s)
pub fn glm_paid(model: &str) -> OpenAiCompatProvider {
    OpenAiCompatProvider::new(
        "glm-paid",
        "https://api.z.ai/api/paas/v4",
        "GLM_API_KEY",
        model,
    )
}

/// Create a MaxPlus provider over the OpenAI-chat schema.
///
/// Origin verified by live probe on 2026-07-25 (M2.1). The previous
/// `https://api.maxplus.chat/v1` in this file does not resolve, and the model it
/// pinned (`claude-fable-5`) is not in the gateway's live list — both were removed.
/// Model ids must come from `config/models.maxplus.json`, never from a screenshot.
pub fn maxplus_openai_chat(model: &str) -> OpenAiCompatProvider {
    OpenAiCompatProvider::new(
        "maxplus",
        concat!("https://api.maxplus-ai.cc", "/v1"),
        "MAXPLUS_API_KEY",
        model,
    )
}

/// Create a generic OpenRouter paid provider.
pub fn openrouter_paid(model: &str) -> OpenAiCompatProvider {
    OpenAiCompatProvider::new(
        "openrouter-paid",
        "https://openrouter.ai/api/v1",
        "OPENROUTER_API_KEY",
        model,
    )
}

// ─── Tiered Router ───────────────────────────────────────────────────────────

/// Routes through provider tiers: try local first, then free, then paid.
pub struct TieredRouter {
    tiers: Vec<Box<dyn LlmProvider>>,
}

impl TieredRouter {
    pub fn new(tiers: Vec<Box<dyn LlmProvider>>) -> Self {
        Self { tiers }
    }

    /// Build the standard GHOSTCLAW routing chain, per **P098 Rev F**:
    /// cointh (PRIMARY for GLM) → maxplus (LEAF) → OpenRouter free → GLM paid.
    ///
    /// Ollama is absent — Rev E removed the sovereign local tier.
    ///
    /// Every tier past the first is added only when its key is present, so the
    /// chain stays usable with any subset configured. That is the property Rev D §3
    /// requires of a leaf: losing maxplus must not break routing.
    pub fn standard() -> Self {
        Self::for_model("glm-5.2")
    }

    /// Build the chain **P098 Rev G** prefers for one model.
    ///
    /// The primary depends on the model's family; the leaf and the Rev E
    /// remainder are the same for everything. Ollama is absent — Rev E removed
    /// the sovereign local tier.
    ///
    /// Every tier past the first is added only when its key is present, so the
    /// chain stays usable with any subset configured. That is what Rev D §3
    /// requires of a leaf: losing maxplus must not break routing.
    pub fn for_model(model: &str) -> Self {
        let receipts = Arc::new(receipt::ReceiptLog::new(
            maxplus::env_nonempty("GHOSTCLAW_RECEIPTS")
                .unwrap_or_else(|| ".ghostclaw_runtime/receipts/providers.jsonl".into()),
        ));
        let breaker = Arc::new(breaker::CircuitBreaker::new());
        let mut tiers: Vec<Box<dyn LlmProvider>> = Vec::new();

        // PRIMARY — whichever lane measured fastest for this family (Rev G §3).
        for lane in family::preferred_lanes(family::family_of(model)) {
            match *lane {
                "cointh" if maxplus::env_nonempty("COINTH_API_KEY").is_some() => {
                    tiers.push(Box::new(cointh::CointhProvider::new(
                        model,
                        Arc::clone(&breaker),
                        Arc::clone(&receipts),
                    )));
                }
                "alibaba" if maxplus::env_nonempty("ALIBABA_MAAS_API_KEY").is_some() => {
                    tiers.push(Box::new(alibaba::AlibabaProvider::new(
                        model,
                        alibaba::Wire::OpenAiChat,
                        false,
                        Arc::clone(&breaker),
                        Arc::clone(&receipts),
                    )));
                }
                _ => {}
            }
        }

        // LEAF — reached on quota exhaustion above, or when nothing above is configured.
        //
        // MAXPLUS_KEY_CHINESE, not MAXPLUS_API_KEY: a maxplus pool is bound to the
        // key, and on 2026-07-25 the key in MAXPLUS_API_KEY was moved to the VIP
        // pool, which answers model lists but rejects inference (400 at the root,
        // 503 on /maxpools and /subpools). The Chinese Specials key is the one
        // that completes requests.
        if let Some(_key) = maxplus::env_nonempty("MAXPLUS_KEY_CHINESE")
            .or_else(|| maxplus::env_nonempty("MAXPLUS_API_KEY"))
        {
            tiers.push(Box::new(maxplus::MaxPlusProvider::new(
                model,
                "Chinese Model Specials",
                maxplus::Schema::AnthropicMessages,
                false,
                Arc::clone(&breaker),
                Arc::clone(&receipts),
            )));
        }

        // P098 Rev E remainder.
        tiers.push(Box::new(openrouter_free("deepseek/deepseek-v4-pro:free")));
        if maxplus::env_nonempty("GLM_API_KEY").is_some() {
            tiers.push(Box::new(glm_paid("glm-5.2")));
        }

        Self::new(tiers)
    }

    pub fn tier_count(&self) -> usize {
        self.tiers.len()
    }

    pub fn provider_names(&self) -> Vec<&str> {
        self.tiers.iter().map(|p| p.name()).collect()
    }

    pub async fn complete(&self, req: &CompletionRequest) -> Result<CompletionResponse, ProviderError> {
        let mut last_err = None;
        for provider in &self.tiers {
            match provider.complete(req).await {
                Ok(r) => {
                    tracing::info!(provider = provider.name(), model = %r.model, "completion ok");
                    return Ok(r);
                }
                // Exhaustion is an expected, budgeted transition — the whole point
                // of the leaf lane. It is logged distinctly from a fault so the two
                // are never conflated in telemetry (P098 Rev F §6).
                Err(e @ ProviderError::Exhausted { .. }) => {
                    tracing::info!(
                        provider = provider.name(),
                        reason = %e,
                        "tier exhausted, falling through to the next lane"
                    );
                    last_err = Some(e);
                }
                // A redaction denial is about the payload, not the tier. Trying the
                // next provider would send the same blocked content somewhere else.
                Err(e @ ProviderError::DeniedRedaction(_)) => {
                    tracing::error!(provider = provider.name(), error = %e, "aborting chain");
                    return Err(e);
                }
                Err(e) => {
                    warn!(provider = provider.name(), error = %e, "tier failed, falling through");
                    last_err = Some(e);
                }
            }
        }
        Err(last_err.unwrap_or_else(|| ProviderError::Unavailable("no providers configured".into())))
    }
}

// ─── Task-aware routing ──────────────────────────────────────────────────────

/// Pick a provider based on task risk tier.
/// Green/Yellow: start cheap (Ollama/free). Red: use frontier (Claude Fable5/GLM).
pub fn route_for_task(task: &Task, router: &TieredRouter) {
    // The TieredRouter itself handles fallback — we just log the intent.
    tracing::info!(
        risk = ?task.risk,
        stage = ?task.stage,
        "routing task through tiered provider chain"
    );
}

// ─── Routing tests ───────────────────────────────────────────────────────────

#[cfg(test)]
mod routing_tests {
    use super::*;

    /// Environment variables are process-global and cargo runs tests in this
    /// crate on parallel threads, so every test that touches the env has to hold
    /// this lock. Without it the "no keys" case races the others and they fail
    /// intermittently — which is exactly what happened the first time.
    static ENV_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

    /// Set every lane key so the chain is built at full width, then restore.
    struct AllKeys(std::sync::MutexGuard<'static, ()>);

    impl AllKeys {
        fn set() -> Self {
            let guard = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
            unsafe {
                std::env::set_var("COINTH_API_KEY", "test-cointh");
                std::env::set_var("ALIBABA_MAAS_API_KEY", "test-alibaba");
                std::env::set_var("MAXPLUS_KEY_CHINESE", "test-maxplus");
                std::env::remove_var("GLM_API_KEY");
            }
            Self(guard)
        }
    }

    impl Drop for AllKeys {
        fn drop(&mut self) {
            unsafe {
                std::env::remove_var("COINTH_API_KEY");
                std::env::remove_var("ALIBABA_MAAS_API_KEY");
                std::env::remove_var("MAXPLUS_KEY_CHINESE");
            }
        }
    }

    #[test]
    fn glm_goes_to_cointh_first() {
        let _k = AllKeys::set();
        let r = TieredRouter::for_model("glm-5.2");
        let names = r.provider_names();
        assert_eq!(names.first(), Some(&"cointh"), "got {names:?}");
    }

    #[test]
    fn qwen_deepseek_and_kimi_go_to_alibaba_first() {
        let _k = AllKeys::set();
        for m in ["qwen3.7-max", "deepseek-v4-flash", "kimi-k2.7-code"] {
            let r = TieredRouter::for_model(m);
            let names = r.provider_names();
            assert_eq!(names.first(), Some(&"alibaba"), "{m} got {names:?}");
        }
    }

    #[test]
    fn claude_starts_at_the_leaf_because_no_primary_serves_it() {
        let _k = AllKeys::set();
        let r = TieredRouter::for_model("claude-opus-4-8");
        let names = r.provider_names();
        assert_eq!(names.first(), Some(&"maxplus"), "got {names:?}");
    }

    #[test]
    fn maxplus_is_never_above_a_primary() {
        // Rev D §3: maxplus is LEAF. If it ever sorts first for a model a primary
        // serves, the leaf classification has quietly stopped being true.
        let _k = AllKeys::set();
        for m in ["glm-5.2", "qwen3.7-max", "deepseek-v4-pro", "kimi-k3"] {
            let r = TieredRouter::for_model(m);
            let names = r.provider_names();
            let leaf = names.iter().position(|n| *n == "maxplus");
            assert!(leaf.is_some_and(|i| i > 0), "{m}: maxplus must not lead — {names:?}");
        }
    }

    #[test]
    fn the_chain_still_works_with_every_optional_key_missing() {
        // Losing maxplus must not break routing (Rev D §3).
        let _guard = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        unsafe {
            std::env::remove_var("COINTH_API_KEY");
            std::env::remove_var("ALIBABA_MAAS_API_KEY");
            std::env::remove_var("MAXPLUS_KEY_CHINESE");
            std::env::remove_var("MAXPLUS_API_KEY");
            std::env::remove_var("GLM_API_KEY");
        }
        let r = TieredRouter::for_model("glm-5.2");
        let names = r.provider_names();
        assert!(!names.is_empty(), "a chain with no keys must still have the free tier");
        assert_eq!(names, vec!["openrouter-free"]);
    }
}
