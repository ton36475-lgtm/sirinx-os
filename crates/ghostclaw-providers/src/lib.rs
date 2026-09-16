// crates/ghostclaw-providers/src/lib.rs
// Provider traits

pub mod glm_sync;
pub mod kimi;
pub mod openrouter;

pub use glm_sync::GlmProvider;
pub use kimi::KimiProvider;
pub use openrouter::OpenRouterProvider;

pub struct ProviderResponse {
    pub text: String,
    pub model: String,
}

pub trait LlmProvider {
    fn name(&self) -> &'static str;
    fn complete(&self, system: Option<&str>, prompt: &str) -> String;
}