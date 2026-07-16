//! # ghostclaw-core
//!
//! Core domain types for the GhostClaw OS control plane.
//!
//! This crate defines the canonical types shared across all GhostClaw binaries:
//! [`Task`], [`Event`], [`RiskTier`], [`MissionResult`], and the [`Advance`]
//! trait that drives stage-based mission progression.
//!
//! ## Design Principles
//!
//! - **Local-safe by default**: No type in this crate performs network IO,
//!   secret reads, or live execution. Adapters handle those boundaries.
//! - **Serde-compatible**: All public types derive `Serialize` + `Deserialize`
//!   so they flow through axum JSON handlers, MCP tool payloads, and receipts.
//! - **Redaction at boundaries**: Types carrying user input are designed to be
//!   passed through the redaction utilities from `ghostclaw_migration_core::redaction`
//!   at persistence boundaries.
//!
//! ## Existing Sub-modules
//!
//! - [`launch_gate`]: Agent launch-gate status types (pre-existing).
//! - [`agent_driver`]: Agent driver status types (pre-existing).

pub mod agent_driver;
pub mod launch_gate;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// ─────────────────────────────────────────────────────────────
// Risk Tier
// ─────────────────────────────────────────────────────────────

/// Risk classification for a task or mission phase.
///
/// Determines whether the system can auto-execute, requires human approval,
/// or is hard-blocked from execution entirely.
///
/// # Ordering
///
/// Variants are ordered by severity: `Green < Yellow < Red`.
/// This allows `max()` to compute the effective risk when combining tiers.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RiskTier {
    /// Safe for automatic execution. No external writes, no secrets, no production impact.
    Green,
    /// Requires human approval before execution. May involve external writes or elevated permissions.
    Yellow,
    /// Hard-blocked. Live execution is forbidden regardless of approval state.
    Red,
}

impl Default for RiskTier {
    fn default() -> Self {
        Self::Yellow
    }
}

impl RiskTier {
    /// Returns the stable string identifier used in JSON payloads and receipts.
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Green => "green",
            Self::Yellow => "yellow",
            Self::Red => "red",
        }
    }

    /// Returns `true` if this tier permits automatic execution without approval.
    pub const fn is_auto_executable(self) -> bool {
        matches!(self, Self::Green)
    }

    /// Returns `true` if this tier requires explicit human approval before execution.
    pub const fn requires_approval(self) -> bool {
        matches!(self, Self::Yellow | Self::Red)
    }

    /// Returns `true` if this tier blocks execution entirely, even with approval.
    pub const fn is_blocked(self) -> bool {
        matches!(self, Self::Red)
    }
}

// ─────────────────────────────────────────────────────────────
// Task Lifecycle
// ─────────────────────────────────────────────────────────────

/// Current lifecycle stage of a task within the maker-checker-guard pipeline.
///
/// Progression: `Triage → Maker → Checker → Guard → Done` (or `Aborted`).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Stage {
    /// Initial intake — task is parsed and risk-assessed.
    Triage,
    /// Execution phase — a worker agent produces output.
    Maker,
    /// Review phase — a checker agent validates maker output.
    Checker,
    /// Gate phase — final policy and safety check before completion.
    Guard,
    /// Task completed successfully; evidence is sealed.
    Done,
    /// Task was aborted before completion (manual or policy-driven).
    Aborted,
}

impl Default for Stage {
    fn default() -> Self {
        Self::Triage
    }
}

impl Stage {
    /// Returns the stable string identifier for JSON serialization.
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Triage => "triage",
            Self::Maker => "maker",
            Self::Checker => "checker",
            Self::Guard => "guard",
            Self::Done => "done",
            Self::Aborted => "aborted",
        }
    }

    /// Returns `true` if this stage is terminal (no further transitions).
    pub const fn is_terminal(self) -> bool {
        matches!(self, Self::Done | Self::Aborted)
    }

    /// Returns the next stage in the normal progression, or `None` if terminal.
    pub const fn next(self) -> Option<Self> {
        match self {
            Self::Triage => Some(Self::Maker),
            Self::Maker => Some(Self::Checker),
            Self::Checker => Some(Self::Guard),
            Self::Guard => Some(Self::Done),
            Self::Done | Self::Aborted => None,
        }
    }
}

/// A unit of work in the GhostClaw control plane.
///
/// A `Task` carries the full lifecycle state of a single piece of work:
/// its description, risk classification, current stage, evidence trail,
/// and metadata for audit receipts.
///
/// # Serialization
///
/// All fields are serde-serializable with `snake_case` naming to match
/// the JSON contract consumed by the dev-control-api and Telegram bot.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Task {
    /// Unique identifier (e.g., `task-1700000000000-1`).
    pub id: String,
    /// Human-readable description of the work to perform.
    /// Redacted at persistence boundaries using the redaction utilities
    /// from `ghostclaw_migration_core::redaction::redact_sensitive`.
    pub description: String,
    /// Risk classification determining execution gating.
    pub risk_tier: RiskTier,
    /// Current lifecycle stage.
    pub stage: Stage,
    /// Build/review lane this task belongs to (e.g., `backend_core`, `review`).
    pub lane: String,
    /// Evidence trail: command, exit code, stdout/stderr from each phase.
    pub evidence: Vec<Evidence>,
    /// ISO-8601 creation timestamp.
    pub created_at: DateTime<Utc>,
    /// ISO-8601 timestamp of the last stage transition.
    pub updated_at: DateTime<Utc>,
    /// Identity of the requester (e.g., `telegram`, `cli`, `codex-sidebar`).
    pub source: String,
    /// Whether this task has been approved for execution.
    pub approved: bool,
}

impl Default for Task {
    fn default() -> Self {
        let now = Utc::now();
        Self {
            id: String::new(),
            description: String::new(),
            risk_tier: RiskTier::default(),
            stage: Stage::default(),
            lane: String::new(),
            evidence: Vec::new(),
            created_at: now,
            updated_at: now,
            source: "cli".to_string(),
            approved: false,
        }
    }
}

impl Task {
    /// Returns `true` if this task can be advanced to the next stage.
    ///
    /// A task is advanceable when it is not terminal and either:
    /// - Its risk tier is `Green` (auto-executable), or
    /// - It has been explicitly approved.
    pub fn can_advance(&self) -> bool {
        !self.stage.is_terminal()
            && (self.risk_tier.is_auto_executable() || self.approved)
    }
}

/// Evidence captured from a command execution or validation phase.
///
/// This struct mirrors the pre-existing `Evidence` type but adds
/// `created_at` for chronological ordering in the evidence trail.
#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct Evidence {
    /// The command that was executed.
    pub command: String,
    /// Process exit code (`0` = success).
    pub exit_code: i32,
    /// Captured stdout output.
    pub stdout: String,
    /// Captured stderr output.
    pub stderr: String,
    /// ISO-8601 timestamp when evidence was captured.
    #[serde(default = "Utc::now")]
    pub created_at: DateTime<Utc>,
}

// ─────────────────────────────────────────────────────────────
// Events
// ─────────────────────────────────────────────────────────────

/// Domain events emitted during task lifecycle transitions.
///
/// Events are used for the WebSocket event stream, audit receipts,
/// and inter-component communication (e.g., Telegram notifications).
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Event {
    /// A new task was submitted to the system.
    TaskSubmitted {
        /// The task that was submitted.
        task: Task,
    },
    /// A task transitioned from one stage to another.
    TaskAdvanced {
        /// Task ID.
        task_id: String,
        /// Previous stage.
        from: Stage,
        /// New stage.
        to: Stage,
    },
    /// A task was approved for execution.
    TaskApproved {
        /// Task ID.
        task_id: String,
        /// Identity of the approver.
        approver: String,
    },
    /// A task was rejected.
    TaskRejected {
        /// Task ID.
        task_id: String,
        /// Identity of the rejecter.
        rejected_by: String,
        /// Reason for rejection.
        reason: String,
    },
    /// A task encountered an error during execution.
    TaskFailed {
        /// Task ID.
        task_id: String,
        /// Error message.
        error: String,
    },
    /// Evidence was captured for a task.
    EvidenceRecorded {
        /// Task ID.
        task_id: String,
        /// The evidence captured.
        evidence: Evidence,
    },
}

// ─────────────────────────────────────────────────────────────
// Mission Result
// ─────────────────────────────────────────────────────────────

/// Final outcome of a completed (or aborted) mission.
///
/// A "mission" is a top-level unit of work that may encompass multiple
/// tasks across different lanes. This type is returned by [`Advance::run`]
/// when a mission reaches a terminal state.
#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct MissionResult {
    /// Mission identifier.
    pub id: String,
    /// Terminal status: `"completed"` or `"aborted"`.
    pub status: String,
    /// All tasks that were part of this mission.
    pub tasks: Vec<Task>,
    /// All events emitted during the mission lifecycle.
    pub events: Vec<Event>,
    /// ISO-8601 timestamp of mission creation.
    pub created_at: DateTime<Utc>,
    /// ISO-8601 timestamp of mission completion.
    pub completed_at: Option<DateTime<Utc>>,
    /// Optional error message if the mission failed.
    pub error: Option<String>,
}

impl MissionResult {
    /// Returns `true` if the mission completed successfully.
    pub fn is_success(&self) -> bool {
        self.status == "completed" && self.error.is_none()
    }
}

// ─────────────────────────────────────────────────────────────
// Advance Trait
// ─────────────────────────────────────────────────────────────

/// Core trait for advancing a task through the maker-checker-guard pipeline.
///
/// Implementors encapsulate the execution boundary:
/// - **Local-safe implementations** (default in dry-run mode) produce
///   deterministic previews without touching external systems.
/// - **Live implementations** (future) execute real worker commands,
///   but must declare their live status via [`Advance::is_live`].
///
/// # Contract
///
/// - `advance()` MUST be idempotent for terminal tasks (returns the
///   task unchanged with its existing stage).
/// - `advance()` MUST redact sensitive content in task descriptions
///   and evidence at persistence boundaries.
/// - `advance()` MUST write an audit receipt for every state transition.
///
/// # Example Implementation Sketch
///
/// ```rust,ignore
/// struct LocalAdvance { store: MemoryReceiptStore }
///
/// impl Advance for LocalAdvance {
///     fn advance(&mut self, task: &mut Task) -> Result<AdvanceOutcome, AdvanceError> {
///         if !task.can_advance() {
///             return Ok(AdvanceOutcome::Blocked);
///         }
///         let from = task.stage;
///         task.stage = from.next().unwrap_or(task.stage);
///         task.updated_at = Utc::now();
///         // write receipt...
///         Ok(AdvanceOutcome::Advanced { from, to: task.stage })
///     }
/// }
/// ```
#[derive(Debug, Clone)]
pub enum AdvanceError {
    TaskNotAdvancable,
    MissingApproval,
    GuardRejected(String),
    InternalError(String),
}
pub trait Advance {
    /// Advances the task by one stage in the pipeline.
    ///
    /// Returns the outcome of the advance attempt. The task is mutated
    /// in-place only if the advance succeeds.
    ///
    /// # Errors
    ///
    /// Returns an error if the underlying receipt store or adapter fails.
    fn advance(&mut self, task: &mut Task) -> Result<AdvanceOutcome, AdvanceError>;

    /// Runs a mission to completion, advancing all tasks until terminal.
    ///
    /// Returns the final [`MissionResult`] with all evidence and events.
    ///
    /// # Errors
    ///
    /// Returns an error if any advance operation fails irrecoverably.
    fn run(&mut self, mission_id: &str) -> Result<MissionResult, AdvanceError>;

    /// Reports whether this adapter performs live execution.
    ///
    /// Implementations MUST declare this explicitly so local-only safety
    /// cannot be silently bypassed by inheriting a misleading default.
    fn is_live(&self) -> bool;
}

/// Outcome of an [`Advance::advance`] call.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AdvanceOutcome {
    /// Task was successfully advanced from one stage to the next.
    Advanced {
        /// Previous stage.
        from: Stage,
        /// New stage.
        to: Stage,
    },
    /// Task is terminal; no further advancement is possible.
    Terminal,
    /// Task requires approval before it can advance.
    ApprovalRequired,
    /// Task is blocked by policy or risk tier.
    Blocked {
        /// Human-readable reason for the block.
        reason: String,
    },
}

// ─────────────────────────────────────────────────────────────
// Module Re-exports
// ─────────────────────────────────────────────────────────────

/// Re-export of the legacy `Stage` alias for backward compatibility.
///
/// New code should use [`Stage`] directly.
pub use Stage as LifecycleStage;

// ─────────────────────────────────────────────────────────────
// Stubs — Codex will implement
// ─────────────────────────────────────────────────────────────

/// Default advance function — creates a local-safe advance adapter.
///
/// # Panics
///
/// This is a stub. Codex will implement the body.
pub fn advance() -> () {
    unimplemented!("advance() — Codex will implement local-safe stage progression")
}
