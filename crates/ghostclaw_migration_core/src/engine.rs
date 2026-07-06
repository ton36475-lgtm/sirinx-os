//! Deterministic orchestration engine for local-safe command handling.

use crate::command::{parse_command, ParsedCommand};
use crate::error::Result;
use crate::policy::{PolicyDecision, PolicyGuard};
use crate::receipt::ReceiptStore;
use crate::redaction::redact_sensitive;
use crate::schema::{escape_json, option_json, CommandEnvelope, Receipt, RouteJob};

/// JSON-compatible response returned by the Rust core.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EngineResponse {
    /// `ok`, `queued`, `blocked`, or `error`.
    pub status: String,
    /// Frozen command kind.
    pub command_kind: String,
    /// Human-readable local-safe message.
    pub message: String,
    /// Number of pending local route jobs.
    pub pending_count: usize,
    /// Number of receipts returned by `/receipts`.
    pub receipt_count: usize,
    /// Optional queued job id.
    pub queued_job_id: Option<String>,
    /// Optional block or parse reason.
    pub reason: Option<String>,
}

impl EngineResponse {
    /// Serializes to JSON without external dependencies.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"status\":\"{}\",\"command_kind\":\"{}\",\"message\":\"{}\",\"pending_count\":{},\"receipt_count\":{},\"queued_job_id\":{},\"reason\":{}}}",
            escape_json(&self.status),
            escape_json(&self.command_kind),
            escape_json(&self.message),
            self.pending_count,
            self.receipt_count,
            option_json(self.queued_job_id.as_deref()),
            option_json(self.reason.as_deref())
        )
    }
}

/// Core engine parameterized over a receipt store.
#[derive(Clone, Debug)]
pub struct Engine<S>
where
    S: ReceiptStore,
{
    store: S,
    guard: PolicyGuard,
    pending: Vec<RouteJob>,
}

impl<S> Engine<S>
where
    S: ReceiptStore,
{
    /// Creates an engine with default policy guard.
    pub fn new(store: S) -> Self {
        Self {
            store,
            guard: PolicyGuard::default(),
            pending: Vec::new(),
        }
    }

    /// Handles one command envelope and writes a receipt for every result path.
    pub fn handle(&mut self, envelope: &CommandEnvelope) -> Result<EngineResponse> {
        match parse_command(&envelope.raw) {
            Ok(command) => self.handle_parsed(envelope, command),
            Err(error) => {
                let reason = error.to_string();
                let receipt = Receipt::new(
                    "parse_error",
                    "error",
                    &envelope.raw,
                    None,
                    None,
                    Some(reason.clone()),
                );
                self.store.append(&receipt)?;
                Ok(EngineResponse {
                    status: "error".to_string(),
                    command_kind: "parse_error".to_string(),
                    message: "Command rejected before routing.".to_string(),
                    pending_count: self.pending.len(),
                    receipt_count: 1,
                    queued_job_id: None,
                    reason: Some(reason),
                })
            }
        }
    }

    /// Returns pending jobs.
    pub fn pending(&self) -> &[RouteJob] {
        &self.pending
    }

    /// Consumes the engine and returns its receipt store.
    pub fn into_store(self) -> S {
        self.store
    }

    fn handle_parsed(
        &mut self,
        envelope: &CommandEnvelope,
        command: ParsedCommand,
    ) -> Result<EngineResponse> {
        if let PolicyDecision::Blocked(reason) = self.guard.evaluate(&envelope.raw) {
            let receipt = Receipt::new(
                "blocked",
                "blocked",
                &envelope.raw,
                None,
                None,
                Some(reason.clone()),
            );
            self.store.append(&receipt)?;
            return Ok(EngineResponse {
                status: "blocked".to_string(),
                command_kind: "blocked".to_string(),
                message: "Policy guard blocked this command. No live action was performed."
                    .to_string(),
                pending_count: self.pending.len(),
                receipt_count: 1,
                queued_job_id: None,
                reason: Some(reason),
            });
        }

        match command {
            ParsedCommand::Status => self.handle_status(envelope),
            ParsedCommand::Quota => self.handle_quota(envelope),
            ParsedCommand::Pending => self.handle_pending(envelope),
            ParsedCommand::Receipts { limit } => self.handle_receipts(envelope, limit),
            ParsedCommand::Route { lane, task } => {
                let job_id = format!(
                    "route-{}-{}",
                    crate::schema::now_millis(),
                    self.pending.len() + 1
                );
                let job = RouteJob::new(job_id.clone(), lane, &task);
                self.pending.push(job);
                let receipt = Receipt::new(
                    "route",
                    "queued",
                    &envelope.raw,
                    Some(lane),
                    Some(&task),
                    None,
                );
                self.store.append(&receipt)?;
                Ok(EngineResponse {
                    status: "queued".to_string(),
                    command_kind: "route".to_string(),
                    message: "Route intent queued locally. No worker execution was performed."
                        .to_string(),
                    pending_count: self.pending.len(),
                    receipt_count: 1,
                    queued_job_id: Some(job_id),
                    reason: None,
                })
            }
        }
    }

    fn handle_status(&mut self, envelope: &CommandEnvelope) -> Result<EngineResponse> {
        let receipt = Receipt::new("status", "ok", &envelope.raw, None, None, None);
        self.store.append(&receipt)?;
        Ok(EngineResponse {
            status: "ok".to_string(),
            command_kind: "status".to_string(),
            message: "GhostClaw Rust core is local-safe; live workers remain blocked.".to_string(),
            pending_count: self.pending.len(),
            receipt_count: 1,
            queued_job_id: None,
            reason: None,
        })
    }

    fn handle_quota(&mut self, envelope: &CommandEnvelope) -> Result<EngineResponse> {
        let receipt = Receipt::new("quota", "placeholder", &envelope.raw, None, None, None);
        self.store.append(&receipt)?;
        Ok(EngineResponse {
            status: "ok".to_string(),
            command_kind: "quota".to_string(),
            message: "Quota adapter is not connected. No provider call was performed.".to_string(),
            pending_count: self.pending.len(),
            receipt_count: 1,
            queued_job_id: None,
            reason: None,
        })
    }

    fn handle_pending(&mut self, envelope: &CommandEnvelope) -> Result<EngineResponse> {
        let receipt = Receipt::new("pending", "ok", &envelope.raw, None, None, None);
        self.store.append(&receipt)?;
        Ok(EngineResponse {
            status: "ok".to_string(),
            command_kind: "pending".to_string(),
            message: format!("{} local route job(s) pending.", self.pending.len()),
            pending_count: self.pending.len(),
            receipt_count: 1,
            queued_job_id: None,
            reason: None,
        })
    }

    fn handle_receipts(
        &mut self,
        envelope: &CommandEnvelope,
        limit: usize,
    ) -> Result<EngineResponse> {
        let receipt = Receipt::new("receipts", "ok", &envelope.raw, None, None, None);
        self.store.append(&receipt)?;
        let receipt_count = self.store.recent(limit)?.len();
        Ok(EngineResponse {
            status: "ok".to_string(),
            command_kind: "receipts".to_string(),
            message: format!("{} recent receipt(s) available.", receipt_count),
            pending_count: self.pending.len(),
            receipt_count,
            queued_job_id: None,
            reason: None,
        })
    }
}

/// Convenience helper used by thin adapters.
pub fn handle_with_memory(raw_command: &str) -> Result<EngineResponse> {
    let mut engine = Engine::new(crate::receipt::MemoryReceiptStore::default());
    engine.handle(&CommandEnvelope::cli(redact_sensitive(raw_command)))
}
