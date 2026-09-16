//! Wire protocol messages between Rust orchestrator and Python backend.
//!
//! Protocol: JSONL over stdin/stdout.
//! - Rust → Python: `RunConfig` or `BenchConfig` (single message, then stream of questions)
//! - Python → Rust: `AgentEvent` stream, then final `BenchResult`

use crate::{AlignmentMethod, BenchQuestion, CollaborationMode, CorrelationId, PositionMode};

/// Top-level message from orchestrator to backend.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(tag = "type")]
pub enum ProtocolMessage {
    /// Configuration for a single question run.
    Run(RunConfig),
    /// Configuration for a benchmark sweep.
    Bench(BenchConfig),
    /// A single question to process.
    Question(BenchQuestion),
    /// Signal end of questions.
    EndOfQuestions,
}

/// Configuration for processing a single question.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RunConfig {
    pub correlation_id: CorrelationId,
    pub model_name: String,
    pub mode: CollaborationMode,
    pub agents: Vec<String>,
    pub latent_steps: Vec<usize>,
    pub position_mode: PositionMode,
    pub alignment_method: AlignmentMethod,
    pub topology: String,
    pub debug: bool,
    pub device: String,
    pub dtype: String,
    pub seed: u64,
    pub max_decode_tokens: usize,
}

/// Configuration for a benchmark sweep.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BenchConfig {
    pub model_name: String,
    pub mode: CollaborationMode,
    pub agents: Vec<String>,
    pub latent_steps: Vec<usize>,
    pub position_mode: PositionMode,
    pub alignment_method: AlignmentMethod,
    pub topology: String,
    pub debug: bool,
    pub device: String,
    pub dtype: String,
    pub seed: u64,
    pub max_decode_tokens: usize,
    pub dataset_path: String,
    pub output_path: String,
}

/// An event emitted by the backend during processing.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(tag = "event")]
pub enum AgentEvent {
    /// Agent started processing.
    AgentStarted {
        correlation_id: CorrelationId,
        agent_name: String,
        agent_index: usize,
        timestamp_ms: i64,
    },
    /// Agent completed a latent step.
    LatentStep {
        correlation_id: CorrelationId,
        agent_name: String,
        step: usize,
        hidden_norm: f64,
        convergence_metric: f64,
        timestamp_ms: i64,
    },
    /// Agent produced a debug text probe.
    DebugProbe {
        correlation_id: CorrelationId,
        agent_name: String,
        text: String,
        timestamp_ms: i64,
    },
    /// Agent finished all latent steps.
    AgentFinished {
        correlation_id: CorrelationId,
        agent_name: String,
        agent_index: usize,
        latency_ms: u64,
        kv_seq_len: usize,
        kv_layers: usize,
        alignment_residual: f64,
        timestamp_ms: i64,
    },
    /// KV cache transferred to next agent.
    KVTransfer {
        correlation_id: CorrelationId,
        from_agent: String,
        to_agent: String,
        kv_size_bytes: usize,
        transfer_fidelity: f64,
        timestamp_ms: i64,
    },
    /// Error or fallback occurred.
    Fallback {
        correlation_id: CorrelationId,
        agent_name: String,
        reason: String,
        fallback_mode: String,
        timestamp_ms: i64,
    },
    /// Final answer decoded.
    AnswerDecoded {
        correlation_id: CorrelationId,
        answer: String,
        total_tokens: usize,
        total_latency_ms: u64,
        timestamp_ms: i64,
    },
}

/// Final result for a single benchmark question.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BenchResult {
    pub correlation_id: CorrelationId,
    pub question_id: String,
    pub answer: String,
    pub expected: String,
    pub correct: bool,
    pub total_tokens: usize,
    pub total_latency_ms: u64,
    pub peak_memory_mb: f64,
    pub events: Vec<AgentEvent>,
}
