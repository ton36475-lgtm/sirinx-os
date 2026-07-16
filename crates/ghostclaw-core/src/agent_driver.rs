// crates/ghostclaw-core/src/agent_driver.rs
// Agent Driver - Stub version for compilation

use serde::{Deserialize, Serialize};

// Re-export from launch_gate
use crate::launch_gate::{LaunchAgent, get_agent_launch_gate_status, RiskLevel};

pub const AGENT_DRIVER_BLOCKED_ACTIONS: &[&str] = &[
    "file_edit_by_agent", "mcp_server_start", "install_packages", "message_send", "deploy", "push", "publish"
];

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct AgentDriverStatus {
    pub title: String,
    pub status: String,
    pub mode: String,
    pub source: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct DriverAgent {
    pub id: String,
    pub title: String,
    pub role: String,
    pub risk_level: String,
}

pub fn get_agent_driver_status() -> AgentDriverStatus {
    AgentDriverStatus {
        title: "Agent Driver".to_string(),
        status: "stub-ready".to_string(),
        mode: "local-only".to_string(),
        source: "rust-core-stub".to_string(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    }
}
