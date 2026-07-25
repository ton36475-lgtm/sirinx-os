// crates/ghostclaw-providers/src/glm_sync.rs
// GLM Provider - implements LlmProvider trait

use super::{LlmProvider, ProviderResponse};

pub struct GlmProvider {
    pub base_url: String,
    pub model: String,
}

impl GlmProvider {
    pub fn new() -> Self {
        Self {
            base_url: "https://api.z.ai/api/paas/v4".into(),
            model: "glm-5.2".into(),
        }
    }

    pub fn endpoint(&self) -> String {
        format!("{}/chat/completions", self.base_url)
    }
}

impl LlmProvider for GlmProvider {
    fn name(&self) -> &'static str {
        "glm-4.7"
    }

    fn complete(&self, system: Option<&str>, prompt: &str) -> String {
        // Return endpoint info for verification
        format!("GLM_ENDPOINT: {} | MODEL: {}", self.endpoint(), self.model)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_glm_provider_name() {
        let provider = GlmProvider::new();
        assert_eq!(provider.name(), "glm-4.7");
    }

    #[test]
    fn test_glm_endpoint() {
        let provider = GlmProvider::new();
        assert_eq!(
            provider.endpoint(),
            "https://api.z.ai/api/paas/v4/chat/completions"
        );
    }
}
