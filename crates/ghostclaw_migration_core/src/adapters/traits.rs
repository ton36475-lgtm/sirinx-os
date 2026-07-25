//! Shared adapter contracts for local-only GhostClaw boundaries.
//!
//! These traits describe what future live adapters must satisfy while P101
//! keeps all implementations dry-run or deterministic local IO only.

use crate::adapters::codex::CodexDryRunPreview;
use crate::adapters::queue::QueueReadReport;
use crate::adapters::validator::ValidatorResult;
use crate::error::Result;
use crate::receipt::ReceiptStore;
use crate::schema::{Receipt, RouteJob};

/// Worker boundary for route-job handling.
pub trait WorkerAdapter {
    /// Returns a preview for a route job without executing a worker.
    fn preview(&self, job: &RouteJob) -> Result<CodexDryRunPreview>;

    /// Reports whether the adapter executed a live worker.
    ///
    /// Implementations must declare this explicitly so a future live adapter
    /// cannot inherit a misleading local-only default.
    fn executed_live(&self) -> bool;
}

/// Validator boundary for deterministic local checks.
pub trait ValidatorAdapter {
    /// Validates one target id.
    fn validate(&self, target_id: &str) -> Result<ValidatorResult>;

    /// Reports whether validation used live external execution.
    ///
    /// Implementations must declare this explicitly so execution provenance
    /// remains a compile-time-visible part of the adapter contract.
    fn executed_live(&self) -> bool;
}

/// Receipt boundary used by engines and adapter tests.
pub trait ReceiptAdapter {
    /// Appends one redacted receipt.
    fn append_receipt(&mut self, receipt: &Receipt) -> Result<()>;

    /// Returns recent receipts newest-first.
    fn recent_receipts(&self, limit: usize) -> Result<Vec<Receipt>>;
}

impl<T> ReceiptAdapter for T
where
    T: ReceiptStore,
{
    fn append_receipt(&mut self, receipt: &Receipt) -> Result<()> {
        self.append(receipt)
    }

    fn recent_receipts(&self, limit: usize) -> Result<Vec<Receipt>> {
        self.recent(limit)
    }
}

/// Queue boundary for local pending route intents.
pub trait QueueAdapter {
    /// Enqueues one local route job.
    fn enqueue(&self, job: &RouteJob) -> Result<()>;

    /// Lists currently pending route jobs and scan metadata.
    fn list(&self) -> Result<QueueReadReport>;

    /// Clears pending route jobs using an append-only marker.
    fn clear_pending_local_only(&self, reason: &str) -> Result<()>;
}
