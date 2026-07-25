//! Latent Protocol — shared types for agent communication, configuration, and results.
//!
//! This crate defines the wire protocol between the Rust orchestrator and the
//! Python latent backend. All communication uses JSONL (one JSON object per line)
//! over stdin/stdout.

pub mod agent_state;
pub mod envelope;
pub mod kv_metadata;

pub use agent_state::{AgentConfig, AgentGraph, AgentRole, Topology};
pub use envelope::{AgentEvent, BenchConfig, BenchResult, ProtocolMessage, RunConfig};
pub use kv_metadata::{KVMetadata, KVTransferStats};

/// Version of the latent protocol (semver).
pub const PROTOCOL_VERSION: &str = "0.1.0";

/// Unique correlation ID for tracing a single question through the entire agent chain.
pub type CorrelationId = String;

/// A single benchmark question.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BenchQuestion {
    pub id: String,
    pub question: String,
    pub answer: String,
    pub category: String,
}

/// Mode of multi-agent collaboration.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CollaborationMode {
    /// Single model, no collaboration.
    Single,
    /// Single model with matched compute budget (same total forward passes).
    SingleMatched,
    /// Text-based multi-agent system (agents communicate via decoded text).
    Textmas,
    /// Latent multi-agent system (agents communicate via KV cache).
    Latentmas,
}

/// Position ID strategy across agents.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PositionMode {
    /// Continue position_ids from previous agent's last position.
    Chain,
    /// Reset position_ids to 0 for each agent.
    Reset,
    /// Start at a fixed offset.
    Offset,
}

/// Alignment matrix computation method.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AlignmentMethod {
    /// Ridge regression pseudo-inverse.
    Ridge,
    /// Truncated SVD.
    Svd,
    /// Learned alignment (fine-tuned).
    Learned,
}
