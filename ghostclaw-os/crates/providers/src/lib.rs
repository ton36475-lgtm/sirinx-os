//! GHOSTCLAW Providers — LLM provider trait + Ollama/OpenRouter/GLM/MaxPlus impls.
//!
//! Tiered routing per **P098 Rev E** (APPROVED 2026-07-25):
//! OpenRouter free → paid frontier (GLM) → maxplus (LEAF).
//!
//! The sovereign local tier (Ollama) was removed by Rev E. `OllamaProvider` is
//! kept compiling so Rev E can be reverted without a rewrite; it is simply no
//! longer part of [`TieredRouter::standard`].

pub mod breaker;
pub mod cointh;
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
        let receipts = Arc::new(receipt::ReceiptLog::new(
            maxplus::env_nonempty("GHOSTCLAW_RECEIPTS")
                .unwrap_or_else(|| ".ghostclaw_runtime/receipts/providers.jsonl".into()),
        ));
        let breaker = Arc::new(breaker::CircuitBreaker::new());

        let mut tiers: Vec<Box<dyn LlmProvider>> = Vec::new();

        // PRIMARY — GLM goes to its own vendor first. Verified 2026-07-25:
        // 8/8 ids OK, glm-5.2 at 1265 ms against 3610 ms on the leaf lane.
        if maxplus::env_nonempty("COINTH_API_KEY").is_some() {
            tiers.push(Box::new(cointh::CointhProvider::new(
                // Present and OK in config/models.cointh.json.
                maxplus::env_nonempty("COINTH_MODEL").unwrap_or_else(|| "glm-5.2".into()),
                Arc::clone(&breaker),
                Arc::clone(&receipts),
            )));
        }

        // LEAF — reached on quota exhaustion above, or when nothing above is configured.
        if maxplus::env_nonempty("MAXPLUS_API_KEY").is_some() {
            tiers.push(Box::new(maxplus::MaxPlusProvider::new(
                // Present and OK in config/models.maxplus.json.
                maxplus::env_nonempty("MAXPLUS_MODEL").unwrap_or_else(|| "glm-5.2".into()),
                maxplus::env_nonempty("MAXPLUS_POOL")
                    .unwrap_or_else(|| "VERIFY AT RUN TIME".into()),
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
