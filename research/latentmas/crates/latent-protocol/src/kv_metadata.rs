//! Metadata about KV cache transfers between agents.
//!
//! This does NOT contain the actual KV tensor data (that stays in the Python
//! process's GPU memory). It only tracks metadata for logging and benchmarking.

/// Metadata about a KV cache at a given point in the agent chain.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct KVMetadata {
    /// Agent that produced this KV.
    pub agent_name: String,
    /// Agent index in the chain.
    pub agent_index: usize,
    /// Number of tokens in the KV cache (sequence length).
    pub seq_len: usize,
    /// Number of layers in the model.
    pub num_layers: usize,
    /// Number of attention heads.
    pub num_heads: usize,
    /// Head dimension.
    pub head_dim: usize,
    /// Whether the KV cache has been compressed.
    pub compressed: bool,
    /// Compression method used (if any).
    pub compression_method: Option<String>,
    /// Original size in bytes before compression.
    pub original_size_bytes: usize,
    /// Actual size in bytes after compression (or same as original if uncompressed).
    pub actual_size_bytes: usize,
    /// Dtype of the KV cache (e.g., "float16", "int8").
    pub dtype: String,
}

impl KVMetadata {
    /// Calculate the theoretical size of an uncompressed KV cache.
    pub fn theoretical_size(
        seq_len: usize,
        num_layers: usize,
        num_heads: usize,
        head_dim: usize,
        dtype_bytes: usize,
    ) -> usize {
        // KV = 2 (keys + values) × layers × seq_len × heads × head_dim × bytes
        2 * num_layers * seq_len * num_heads * head_dim * dtype_bytes
    }

    /// Compression ratio (actual / original). 1.0 = no compression.
    pub fn compression_ratio(&self) -> f64 {
        if self.original_size_bytes == 0 {
            return 1.0;
        }
        self.actual_size_bytes as f64 / self.original_size_bytes as f64
    }
}

/// Statistics about a KV cache transfer between agents.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct KVTransferStats {
    /// From agent.
    pub from_agent: String,
    /// To agent.
    pub to_agent: String,
    /// Transfer fidelity: ||KV_in - KV_out||_F / ||KV_in||_F.
    /// 0.0 = perfect fidelity, higher = more loss.
    pub fidelity: f64,
    /// Time spent transferring (including any serialization/deserialization).
    pub transfer_time_ms: u64,
    /// Whether transfer was done in-process (GPU memory pointer) or via IPC.
    pub in_process: bool,
    /// Whether fallback was used.
    pub fell_back: bool,
    /// Fallback reason (if any).
    pub fallback_reason: Option<String>,
}

/// KV compression method.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum KVCompressionMethod {
    /// No compression.
    None,
    /// Keep only top-k key-value pairs by attention score.
    TopK,
    /// Sliding window of last w tokens.
    Windowed,
    /// Quantize to int8.
    QuantizedInt8,
    /// Quantize to FP8.
    QuantizedFP8,
    /// Prune low-entropy attention heads.
    HeadPruning,
}
