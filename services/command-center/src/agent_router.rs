// services/command-center/src/agent_router.rs
// Routes tasks to different AI agents

pub enum AgentType {
    ClaudeCode,  // High-quality architecture
    Codex,       // Security review
    OpenCode,    // Autonomous dispatch
    Cursor,      // UI/UX edits
}

pub struct AgentRouter;

impl AgentRouter {
    pub fn route_task(task: &str) -> AgentType {
        match task {
            t if t.contains("architecture") => AgentType::ClaudeCode,
            t if t.contains("security") => AgentType::Codex,
            t if t.contains("automation") => AgentType::OpenCode,
            t if t.contains("ui") => AgentType::Cursor,
            _ => AgentType::ClaudeCode,
        }
    }
}