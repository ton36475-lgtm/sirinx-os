// crates/ghostclaw-providers/src/glm_provider.rs
// GLM Provider - async trait compatible

use crate::{LlmProvider, ProviderResponse};
use anyhow::Result;
use reqwest::Client;

pub struct GlmProvider {
    base_url: String,
    api_key: String,
    model: String,
    http: Client,
}

impl GlmProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            base_url: "https://api.z.ai/api/paas/v4".into(),
            api_key,
            model: "glm-4.7".into(),
            http: Client::new(),
        }
    }
}

impl LlmProvider for GlmProvider {
    fn name(&self) -> &'static str {
        "glm-api"
    }

    fn complete(&self, system: Option<&str>, prompt: &str) -> Result<ProviderResponse> {
        let body = serde_json::json!({
            "model": self.model,
            "messages": [
                {"role": "system", "content": system.unwrap_or_default()},
                {"role": "user", "content": prompt}
            ]
        });
        
        let resp = self.http
            .post(format!("{}/chat/completions", self.base_url))
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()?
            .error_for_status()?;
            
        let v: serde_json::Value = resp.json()?;
        let text = v["choices"][0]["message"]["content"].as_str().unwrap_or_default().to_string();
        Ok(ProviderResponse { text, model: self.model.clone() })
    }
}