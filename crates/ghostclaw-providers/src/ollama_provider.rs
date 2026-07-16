// crates/ghostclaw-providers/src/ollama_provider.rs
use crate::{LlmProvider, ProviderResponse};
use async_trait::async_trait;

pub struct OllamaProvider {
    base_url: String,
    model: String,
    http: reqwest::Client,
}

impl OllamaProvider {
    pub fn new() -> Self {
        Self {
            base_url: "http://localhost:11434".into(),
            model: "qwen2.5-coder".into(),
            http: reqwest::Client::new(),
        }
    }
}

#[async_trait]
impl LlmProvider for OllamaProvider {
    fn name(&self) -> &'static str {
        "ollama-local"
    }

    async fn complete(&self, system: Option<&str>, prompt: &str) -> anyhow::Result<ProviderResponse> {
        let body = serde_json::json!({
            "model": self.model,
            "messages": [
                {"role": "system", "content": system.unwrap_or_default()},
                {"role": "user", "content": prompt}
            ],
            "stream": false
        });
        let resp = self.http
            .post(format!("{}/api/chat", self.base_url))
            .json(&body)
            .send()
            .await?
            .error_for_status()?;
        let v: serde_json::Value = resp.json().await?;
        let text = v["message"]["content"].as_str().unwrap_or_default().to_string();
        Ok(ProviderResponse { text, model: self.model.clone() })
    }
}