// crates/ghostclaw-providers/src/openrouter.rs
// OpenRouter Provider

use crate::LlmProvider;

pub struct OpenRouterProvider {
    base_url: String,
    model: String,
}

impl OpenRouterProvider {
    pub fn new() -> Self {
        Self {
            base_url: "https://openrouter.ai/api/v1".into(),
            model: "google/gemini-2.0-flash-lite".into(),
        }
    }
}

impl LlmProvider for OpenRouterProvider {
    fn name(&self) -> &'static str {
        "openrouter-free"
    }

    fn complete(&self, _system: Option<&str>, _prompt: &str) -> String {
        format!("OPENROUTER_ENDPOINT: {}/chat/completions | MODEL: {}", 
            self.base_url,
            self.model
        )
    }
}