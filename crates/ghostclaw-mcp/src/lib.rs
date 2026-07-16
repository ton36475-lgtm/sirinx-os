//! # ghostclaw-mcp
//!
//! MCP (Model Context Protocol) tool surface for the GhostClaw control plane.
//!
//! This crate defines the [`McpServer`] trait and supporting types that
//! describe the tool surface exposed to LLM clients (Claude, Codex, etc.)
//! via the MCP protocol over stdio.
//!
//! ## Tool Categories
//!
//! The GhostClaw MCP server exposes these tool groups:
//!
//! | Category       | Tools                                     |
//! |----------------|-------------------------------------------|
//! | Task Lifecycle | `submit_task`, `list_tasks`, `approve`    |
//! | Mission Run    | `run_mission`, `mission_status`            |
//! | Evidence       | `get_evidence`, `get_receipts`             |
//! | Policy         | `check_policy`, `get_blocked_actions`      |
//!
//! ## Safety Contract
//!
//! All tools default to local-safe (dry-run) mode. No tool performs
//! live execution unless the underlying adapter declares `is_live() == true`.

use serde::{Deserialize, Serialize};

// ─────────────────────────────────────────────────────────────
// Tool Definition Types
// ─────────────────────────────────────────────────────────────

/// JSON schema descriptor for a single MCP tool parameter.
///
/// Mirrors the MCP protocol's `inputSchema` property shape.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ToolParameter {
    /// Parameter name as it appears in the tool call JSON.
    pub name: String,
    /// Human-readable description for the LLM.
    pub description: String,
    /// JSON Schema type string (`"string"`, `"number"`, `"boolean"`, `"array"`, `"object"`).
    #[serde(rename = "type")]
    pub param_type: String,
    /// Whether this parameter is required.
    pub required: bool,
    /// Default value if the parameter is omitted (serialized as raw JSON).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<serde_json::Value>,
}

/// Definition of a single MCP tool.
///
/// Each tool has a name, description, parameter schema, and an execution
/// category that determines which GhostClaw subsystem handles the call.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ToolDefinition {
    /// Unique tool name (e.g., `"ghostclaw_submit_task"`).
    pub name: String,
    /// Human-readable description shown to the LLM client.
    pub description: String,
    /// Input parameters.
    pub parameters: Vec<ToolParameter>,
    /// Tool category for routing.
    pub category: ToolCategory,
}

/// Category for routing tool invocations within the GhostClaw control plane.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ToolCategory {
    /// Task lifecycle tools (submit, list, approve, reject).
    TaskLifecycle,
    /// Mission execution tools (run, status).
    MissionRun,
    /// Evidence and receipt tools.
    Evidence,
    /// Policy and safety check tools.
    Policy,
}

/// Result of invoking an MCP tool.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ToolResult {
    /// Whether the tool call succeeded.
    pub success: bool,
    /// Result data as JSON (tool-specific shape).
    pub data: serde_json::Value,
    /// Error message if `success == false`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    /// Whether any live (non-dry-run) action was performed.
    pub executed_live: bool,
}

// ─────────────────────────────────────────────────────────────
// Server Configuration
// ─────────────────────────────────────────────────────────────

/// Configuration for the MCP server.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct McpServerConfig {
    /// Server name as reported to the MCP client.
    pub name: String,
    /// Server version string.
    pub version: String,
    /// Whether to allow live execution (default: `false`).
    pub allow_live: bool,
    /// Maximum number of results for list-type tools.
    pub default_limit: usize,
}

impl Default for McpServerConfig {
    fn default() -> Self {
        Self {
            name: "ghostclaw-mcp".to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            allow_live: false,
            default_limit: 50,
        }
    }
}

/// Request to invoke a tool, as received from the MCP client.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ToolInvocation {
    /// Tool name to invoke.
    pub tool: String,
    /// Arguments as a JSON object.
    pub arguments: serde_json::Value,
}

// ─────────────────────────────────────────────────────────────
// McpServer Trait
// ─────────────────────────────────────────────────────────────

/// Core trait for the GhostClaw MCP server.
///
/// Implementors register tools via [`tool_register`] and handle
/// invocations via [`invoke`]. The [`serve`] method starts the
/// MCP stdio transport loop.
///
/// # Safety
///
/// Implementations MUST default to local-safe mode. The `allow_live`
/// flag in [`McpServerConfig`] gates whether any tool may perform
/// live execution. When `false`, all tools return dry-run previews.
///
/// # Example Sketch
///
/// ```rust,ignore
/// struct GhostClawMcpServer {
///     config: McpServerConfig,
///     tools: Vec<ToolDefinition>,
/// }
///
/// impl McpServer for GhostClawMcpServer {
///     fn serve(&mut self) -> Result<()> {
///         // rmcp server loop over stdio
///     }
///     fn tool_register(&mut self, tool: ToolDefinition) {
///         self.tools.push(tool);
///     }
/// }
/// ```
pub trait McpServer {
    /// Starts the MCP server on stdio transport.
    ///
    /// Blocks until the client disconnects or a fatal error occurs.
    ///
    /// # Errors
    ///
    /// Returns an error if the transport fails to initialize or
    /// a protocol-level error occurs.
    fn serve(&mut self) -> McpResult<()>;

    /// Registers a tool definition with the server.
    ///
    /// Tools must be registered before [`serve`] is called.
    /// Duplicate tool names are rejected.
    ///
    /// # Errors
    ///
    /// Returns `Err(McpError::DuplicateTool)` if the name is already registered.
    fn tool_register(&mut self, tool: ToolDefinition) -> McpResult<()>;

    /// Handles a single tool invocation.
    ///
    /// Called internally by the serve loop when the client sends a
    /// `tools/call` request. Also exposed publicly for testing.
    ///
    /// # Errors
    ///
    /// Returns an error if the tool is unknown or execution fails.
    fn invoke(&self, invocation: &ToolInvocation) -> McpResult<ToolResult>;

    /// Lists all registered tool definitions.
    fn list_tools(&self) -> &[ToolDefinition];

    /// Returns whether the server is configured for live execution.
    fn is_live(&self) -> bool;
}

// ─────────────────────────────────────────────────────────────
// Error Type
// ─────────────────────────────────────────────────────────────

/// Errors that can occur in the MCP server.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum McpError {
    /// A tool with this name is already registered.
    DuplicateTool {
        /// The duplicate tool name.
        name: String,
    },
    /// The requested tool is not registered.
    UnknownTool {
        /// The unknown tool name that was requested.
        name: String,
    },
    /// The tool invocation arguments are invalid.
    InvalidArguments {
        /// Description of what was invalid.
        reason: String,
    },
    /// The server is not configured for live execution.
    LiveExecutionDisabled,
    /// Transport or protocol error.
    Transport {
        /// Error message.
        message: String,
    },
}

impl std::fmt::Display for McpError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::DuplicateTool { name } => write!(f, "duplicate tool: {name}"),
            Self::UnknownTool { name } => write!(f, "unknown tool: {name}"),
            Self::InvalidArguments { reason } => write!(f, "invalid arguments: {reason}"),
            Self::LiveExecutionDisabled => write!(f, "live execution is disabled"),
            Self::Transport { message } => write!(f, "transport error: {message}"),
        }
    }
}

impl std::error::Error for McpError {}

/// Result alias for MCP operations.
pub type McpResult<T> = Result<T, McpError>;

// ─────────────────────────────────────────────────────────────
// Default Tool Registry — Stubs
// ─────────────────────────────────────────────────────────────

/// Returns the default GhostClaw tool definitions.
///
/// Codex will flesh out the parameter schemas for each tool.
/// These are the canonical tool names that the MCP client sees.
pub fn default_tools() -> Vec<ToolDefinition> {
    unimplemented!("default_tools — Codex will define the canonical GhostClaw MCP tool set")
}

/// Convenience function — serves the MCP server with default configuration.
///
/// Creates a server with [`default_tools`] registered and calls [`McpServer::serve`].
pub fn serve() {
    unimplemented!("serve() — Codex will instantiate and start the rmcp stdio server")
}
