// crates/ghostclaw-providers/src/kimi.rs
// Kimi (Moonshot AI) Provider with OAuth support

use super::LlmProvider;

pub struct KimiProvider {
    pub base_url: String,
    pub model: String,
    pub oauth_token: Option<String>,
}

impl KimiProvider {
    /// Create new Kimi provider with OAuth
    pub fn new() -> Self {
        Self {
            base_url: "https://api.moonshot.cn".into(),
            model: "moonshot-v1-8k".into(),
            oauth_token: None,
        }
    }

    /// Create provider with OAuth token
    pub fn with_token(token: String) -> Self {
        let mut provider = Self::new();
        provider.oauth_token = Some(token);
        provider
    }

    /// Get chat completions endpoint
    pub fn endpoint(&self) -> String {
        format!("{}/v1/chat/completions", self.base_url)
    }

    /// Get OAuth authorization URL
    pub fn oauth_url(&self) -> String {
        format!("{}/oauth/authorize", self.base_url)
    }

    /// Check if OAuth is configured
    pub fn has_oauth(&self) -> bool {
        self.oauth_token.is_some()
    }
}

impl LlmProvider for KimiProvider {
    fn name(&self) -> &'static str {
        "kimi-moonshot"
    }

    fn complete(&self, system: Option<&str>, prompt: &str) -> String {
        let auth_status = if self.has_oauth() { "OAuth enabled" } else { "No OAuth token" };
        
        format!(
            "KIMI_ENDPOINT: {} | MODEL: {} | AUTH: {} | SYSTEM: {:?} | PROMPT: {}",
            self.endpoint(),
            self.model,
            auth_status,
            system,
            &prompt[..prompt.len().min(50)]
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kimi_provider_name() {
        let provider = KimiProvider::new();
        assert_eq!(provider.name(), "kimi-moonshot");
    }

    #[test]
    fn test_kimi_endpoint() {
        let provider = KimiProvider::new();
        assert_eq!(provider.endpoint(), "https://api.moonshot.cn/v1/chat/completions");
    }

    #[test]
    fn test_kimi_oauth_url() {
        let provider = KimiProvider::new();
        assert_eq!(provider.oauth_url(), "https://api.moonshot.cn/oauth/authorize");
    }

    #[test]
    fn test_kimi_with_token() {
        let provider = KimiProvider::with_token("test_token".into());
        assert!(provider.has_oauth());
        assert_eq!(provider.oauth_token, Some("test_token".into()));
    }

    #[test]
    fn test_kimi_no_oauth_default() {
        let provider = KimiProvider::new();
        assert!(!provider.has_oauth());
        assert!(provider.oauth_token.is_none());
    }
}
