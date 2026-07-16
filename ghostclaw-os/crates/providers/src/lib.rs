//! GHOSTCLAW Providers — LLM provider trait + Ollama/OpenRouter/GLM/MaxPlus impls.
//!
//! Tiered routing: sovereign local (Ollama) → free tier → paid frontier (GLM/MaxPlus/Claude Fable5).

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

/// Create the MaxPlus API provider for Claude Fable 5.
/// MaxPlus is an OpenAI-compatible relay that provides access to Claude models.
pub fn maxplus_claude_fable5() -> OpenAiCompatProvider {
    OpenAiCompatProvider::new(
        "maxplus-claude-fable5",
        "https://api.maxplus.chat/v1",
        "MAXPLUS_API_KEY",
        "claude-fable-5",
    )
}

/// Create a MaxPlus provider with custom model.
pub fn maxplus(model: &str) -> OpenAiCompatProvider {
    OpenAiCompatProvider::new(
        "maxplus",
        "https://api.maxplus.chat/v1",
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

    /// Build the standard GHOSTCLAW routing chain:
    /// Ollama → OpenRouter free → GLM paid → MaxPlus Claude Fable5
    pub fn standard() -> Self {
        let mut tiers: Vec<Box<dyn LlmProvider>> = vec![
            Box::new(OllamaProvider::new(
                std::env::var("OLLAMA_HOST").unwrap_or_else(|_| "http://localhost:11434".into()),
                "qwen2.5-coder",
            )),
            Box::new(openrouter_free("deepseek/deepseek-v4-pro:free")),
        ];

        // Add GLM if key is available
        if std::env::var("GLM_API_KEY").is_ok() {
            tiers.push(Box::new(glm_paid("glm-5.2")));
        }

        // Add MaxPlus Claude Fable5 if key is available
        if std::env::var("MAXPLUS_API_KEY").is_ok() {
            tiers.push(Box::new(maxplus_claude_fable5()));
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
