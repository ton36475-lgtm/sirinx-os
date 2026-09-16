// crates/ghostclaw-core/src/launch_gate.rs
// Launch Gate - Stub version for compilation

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum RiskLevel {
    #[default]
    Medium,
    Low,
    High,
}

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct LaunchAgent {
    pub id: String,
    pub title: String,
    pub role: String,
    pub risk_level: RiskLevel,
    pub status: String,
    pub allowed_mode: String,
    pub auto_execute: bool,
    pub external_writes: bool,
    pub production_writes: bool,
    pub customer_visible: bool,
    pub can_execute_now: bool,
    pub can_launch_automatically: bool,
    pub can_run_mcp: bool,
    pub can_read_secrets: bool,
    pub requires_approval: bool,
    pub health_requirements: Vec<String>,
    pub recommended_first_test: String,
    pub badges: Vec<String>,
    pub source: String,
    pub recommended_manual_smoke_candidate: bool,
}

pub fn get_agent_launch_gate_status() -> LaunchGateStatus {
    LaunchGateStatus {
        title: "Launch Gate".to_string(),
        status: "stub-ready".to_string(),
        mode: "local-only".to_string(),
        source: "rust-core-stub".to_string(),
        agents: vec![],
        summary: LaunchGateSummary {
            agents_total: 0,
            manual_only: 0,
            auto_executable: 0,
            blocked_context_too_small: 0,
            recommended_manual_smoke_candidates: vec![],
            blocked_actions: 0,
        },
        blocked_actions: vec![],
        stop_rules: vec![],
        stop_point: "LAUNCH GATE STUB".to_string(),
        updated_at: chrono::Utc::now().to_rfc3339(),
        can_launch_agents: false,
        can_run_mcp: false,
        can_read_secrets: false,
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct LaunchGateStatus {
    pub title: String,
    pub status: String,
    pub mode: String,
    pub source: String,
    pub agents: Vec<LaunchAgent>,
    pub summary: LaunchGateSummary,
    pub blocked_actions: Vec<String>,
    pub stop_rules: Vec<String>,
    pub stop_point: String,
    pub updated_at: String,
    pub can_launch_agents: bool,
    pub can_run_mcp: bool,
    pub can_read_secrets: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct LaunchGateSummary {
    pub agents_total: u32,
    pub manual_only: u32,
    pub auto_executable: u32,
    pub blocked_context_too_small: u32,
    pub recommended_manual_smoke_candidates: Vec<String>,
    pub blocked_actions: usize,
}