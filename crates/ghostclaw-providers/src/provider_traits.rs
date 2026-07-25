// crates/ghostclaw-providers/src/provider_traits.rs
// LlmProvider trait definition

use anyhow::Result;

#[derive(Debug, Clone)]
pub struct ProviderResponse {
    pub text: String,
    pub model: String,
}

// Trait implementation moved to lib.rs via mod system