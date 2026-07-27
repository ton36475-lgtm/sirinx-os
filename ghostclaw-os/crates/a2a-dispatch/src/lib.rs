//! Real, lease-gated A2A dispatch to the local Codex CLI.
//!
//! The Phase 9 JSON-RPC hub and its advertised Codex node on `:9001` are
//! deliberate smoke-test stubs. They store tasks in memory and return
//! `live_send:false`; they are not an execution backend. This crate invokes
//! the real local `codex exec` binary and reports `live_send:true` only after a
//! real result and a durable receipt.
//!
//! A persistent MCP connection is not persistent authority. Every call needs
//! a one-use, message-bound operator lease before Codex can start.

pub mod codex;
pub mod lease;

use std::fs::OpenOptions;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Instant;

use ghostclaw_providers::breaker::CircuitBreaker;
use ghostclaw_providers::maxplus::redaction_gate;
use ghostclaw_providers::receipt::{Outcome, ReceiptDraft, ReceiptLog};
use lease::{ConsumedLease, LeaseError, LeaseGuard};
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Breaker/receipt key for the real Codex lane.
pub const CODEX_LANE: &str = "a2a:codex";
const ALLOWED_WORKSPACE_ROOT: &str = "/Users/sirinx/sirinx-os";
const ALLOWED_LEASE_PATH: &str = "/Users/sirinx/.codex/a2a-approvals/next.json";
const MAX_MESSAGE_BYTES: usize = 64 * 1024;

#[derive(Debug, Error)]
pub enum DispatchError {
    #[error("DENIED by egress redaction gate: matched {0}")]
    DeniedRedaction(String),
    #[error("agent '{0}' is DOWN (circuit breaker open)")]
    BreakerOpen(String),
    #[error("unknown agent: {0}")]
    UnknownAgent(String),
    #[error("message exceeds the 64 KiB dispatch limit")]
    MessageTooLarge,
    #[error("execution lease denied: {0}")]
    Lease(#[from] LeaseError),
    #[error("required environment variable is missing: {0}")]
    MissingEnvironment(&'static str),
    #[error("A2A workspace is invalid: {0}")]
    InvalidWorkspace(String),
    #[error("A2A lease path is invalid")]
    InvalidLeasePath,
    #[error("A2A receipt is unavailable: {0}")]
    Receipt(#[source] std::io::Error),
    #[error("codex exec failed: {0}")]
    Codex(#[from] codex::CodexError),
    #[error("Codex output was blocked by redaction gate: matched {0}")]
    DeniedOutputRedaction(String),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DispatchResult {
    pub agent: String,
    pub live_send: bool,
    pub output: String,
    pub latency_ms: u64,
    pub lease_id: String,
    pub message_sha256: String,
    pub session_id: Option<String>,
}

/// Dispatches only to a verified real backend. Every non-Codex name from the
/// Phase 9 agent card is refused rather than silently routed to a stub.
pub struct Dispatcher {
    breaker: Arc<CircuitBreaker>,
    receipts: Arc<ReceiptLog>,
    lease_guard: LeaseGuard,
    workspace: PathBuf,
}

impl Dispatcher {
    pub fn new(
        breaker: Arc<CircuitBreaker>,
        receipts: Arc<ReceiptLog>,
        lease_guard: LeaseGuard,
        workspace: impl AsRef<Path>,
    ) -> Result<Self, DispatchError> {
        let workspace = std::fs::canonicalize(workspace.as_ref())
            .map_err(|e| DispatchError::InvalidWorkspace(e.to_string()))?;
        if !workspace.is_dir() {
            return Err(DispatchError::InvalidWorkspace(
                "workspace is not a directory".into(),
            ));
        }
        let allowed_root = std::fs::canonicalize(ALLOWED_WORKSPACE_ROOT)
            .map_err(|e| DispatchError::InvalidWorkspace(e.to_string()))?;
        if !workspace.starts_with(&allowed_root) {
            return Err(DispatchError::InvalidWorkspace(
                "workspace is outside the SIRINX OS root".into(),
            ));
        }
        Ok(Self {
            breaker,
            receipts,
            lease_guard,
            workspace,
        })
    }

    pub fn from_env(
        breaker: Arc<CircuitBreaker>,
        receipts: Arc<ReceiptLog>,
    ) -> Result<Self, DispatchError> {
        let lease_path = std::env::var_os("GHOSTCLAW_A2A_LEASE_FILE")
            .filter(|value| !value.is_empty())
            .ok_or(DispatchError::MissingEnvironment(
                "GHOSTCLAW_A2A_LEASE_FILE",
            ))?;
        if Path::new(&lease_path) != Path::new(ALLOWED_LEASE_PATH) {
            return Err(DispatchError::InvalidLeasePath);
        }
        let workspace = std::env::var_os("GHOSTCLAW_A2A_WORKSPACE")
            .filter(|value| !value.is_empty())
            .ok_or(DispatchError::MissingEnvironment("GHOSTCLAW_A2A_WORKSPACE"))?;
        Self::new(breaker, receipts, LeaseGuard::new(lease_path), workspace)
    }

    fn ensure_receipts_writable(&self) -> Result<(), DispatchError> {
        if let Some(parent) = self.receipts.path().parent() {
            std::fs::create_dir_all(parent).map_err(DispatchError::Receipt)?;
        }
        OpenOptions::new()
            .create(true)
            .append(true)
            .open(self.receipts.path())
            .map(|_| ())
            .map_err(DispatchError::Receipt)
    }

    fn log(
        &self,
        agent: &str,
        lease: Option<&ConsumedLease>,
        outcome: Outcome,
        latency_ms: u64,
    ) -> Result<(), DispatchError> {
        let model_id = match lease {
            Some(lease) => format!(
                "{agent}@lease={}@sha256={}",
                lease.lease_id, lease.message_sha256
            ),
            None => agent.to_string(),
        };
        self.receipts
            .append(ReceiptDraft {
                provider: "a2a-dispatch".into(),
                model_id,
                pool: CODEX_LANE.into(),
                tokens: 0,
                latency_ms,
                outcome,
            })
            .map(|_| ())
            .map_err(DispatchError::Receipt)
    }

    pub async fn send_message(
        &self,
        agent: &str,
        message: &str,
    ) -> Result<DispatchResult, DispatchError> {
        if message.len() > MAX_MESSAGE_BYTES {
            return Err(DispatchError::MessageTooLarge);
        }
        if let Err(hit) = redaction_gate(message) {
            tracing::error!(
                marker = hit.marker,
                agent,
                "DENIED: egress redaction gate blocked A2A dispatch"
            );
            self.log(agent, None, Outcome::DeniedRedaction, 0)?;
            return Err(DispatchError::DeniedRedaction(hit.marker.to_string()));
        }

        if !matches!(agent, "Codex" | "codex") {
            return Err(DispatchError::UnknownAgent(agent.to_string()));
        }

        if !self.breaker.allows(CODEX_LANE) {
            self.log(agent, None, Outcome::BreakerOpen, 0)?;
            return Err(DispatchError::BreakerOpen(agent.to_string()));
        }

        // A lease is not spent unless durable receipt storage is available.
        self.ensure_receipts_writable()?;
        let consumed = self.lease_guard.consume(agent, message, &self.workspace)?;

        let started = Instant::now();
        match codex::exec(message, &self.workspace).await {
            Ok(output) => {
                let latency_ms = started.elapsed().as_millis() as u64;
                self.breaker.record_success(CODEX_LANE);
                if let Err(hit) = redaction_gate(&output) {
                    self.log(agent, Some(&consumed), Outcome::DeniedRedaction, latency_ms)?;
                    return Err(DispatchError::DeniedOutputRedaction(hit.marker.to_string()));
                }
                self.log(agent, Some(&consumed), Outcome::Ok, latency_ms)?;
                Ok(DispatchResult {
                    agent: agent.to_string(),
                    live_send: true,
                    output,
                    latency_ms,
                    lease_id: consumed.lease_id,
                    message_sha256: consumed.message_sha256,
                    session_id: None,
                })
            }
            Err(error) => {
                let latency_ms = started.elapsed().as_millis() as u64;
                self.breaker.record_failure(CODEX_LANE);
                self.log(agent, Some(&consumed), Outcome::Error, latency_ms)?;
                Err(DispatchError::Codex(error))
            }
        }
    }

    pub async fn send_message_resume(
        &self,
        agent: &str,
        message: &str,
        session_id: &str,
    ) -> Result<DispatchResult, DispatchError> {
        if message.len() > MAX_MESSAGE_BYTES {
            return Err(DispatchError::MessageTooLarge);
        }
        if let Err(hit) = redaction_gate(message) {
            tracing::error!(
                marker = hit.marker,
                agent,
                session = session_id,
                "DENIED: egress redaction gate blocked A2A resume dispatch"
            );
            self.log(agent, None, Outcome::DeniedRedaction, 0)?;
            return Err(DispatchError::DeniedRedaction(hit.marker.to_string()));
        }

        if !matches!(agent, "Codex" | "codex") {
            return Err(DispatchError::UnknownAgent(agent.to_string()));
        }

        if !self.breaker.allows(CODEX_LANE) {
            self.log(agent, None, Outcome::BreakerOpen, 0)?;
            return Err(DispatchError::BreakerOpen(agent.to_string()));
        }

        self.ensure_receipts_writable()?;
        let consumed = self.lease_guard.consume(agent, message, &self.workspace)?;

        let started = Instant::now();
        match codex::exec_resume(session_id, message, &self.workspace).await {
            Ok(output) => {
                let latency_ms = started.elapsed().as_millis() as u64;
                self.breaker.record_success(CODEX_LANE);
                if let Err(hit) = redaction_gate(&output) {
                    self.log(agent, Some(&consumed), Outcome::DeniedRedaction, latency_ms)?;
                    return Err(DispatchError::DeniedOutputRedaction(hit.marker.to_string()));
                }
                self.log(agent, Some(&consumed), Outcome::Ok, latency_ms)?;
                Ok(DispatchResult {
                    agent: agent.to_string(),
                    live_send: true,
                    output,
                    latency_ms,
                    lease_id: consumed.lease_id,
                    message_sha256: consumed.message_sha256,
                    session_id: Some(session_id.to_string()),
                })
            }
            Err(error) => {
                let latency_ms = started.elapsed().as_millis() as u64;
                self.breaker.record_failure(CODEX_LANE);
                self.log(agent, Some(&consumed), Outcome::Error, latency_ms)?;
                Err(DispatchError::Codex(error))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dispatcher(label: &str) -> Dispatcher {
        let suffix = format!("{label}-{}", std::process::id());
        let lease_path =
            std::env::temp_dir().join(format!("ghostclaw-a2a-dispatch-lease-{suffix}.json"));
        let receipt_path =
            std::env::temp_dir().join(format!("ghostclaw-a2a-dispatch-receipt-{suffix}.jsonl"));
        let _ = std::fs::remove_file(&lease_path);
        let _ = std::fs::remove_file(&receipt_path);
        Dispatcher::new(
            Arc::new(CircuitBreaker::new()),
            Arc::new(ReceiptLog::new(receipt_path)),
            LeaseGuard::new(lease_path),
            env!("CARGO_MANIFEST_DIR"),
        )
        .unwrap()
    }

    #[tokio::test]
    async fn credential_bearing_message_is_denied_before_lease_or_codex() {
        let error = dispatcher("redaction")
            .send_message("Codex", "here is ccsk-AAAAAAAAAAAAAAAA")
            .await
            .unwrap_err();
        assert!(matches!(error, DispatchError::DeniedRedaction(marker) if marker == "ccsk-"));
    }

    #[tokio::test]
    async fn unregistered_agent_is_refused_before_lease_or_codex() {
        let error = dispatcher("unknown")
            .send_message("Antigravity", "hello")
            .await
            .unwrap_err();
        assert!(matches!(error, DispatchError::UnknownAgent(agent) if agent == "Antigravity"));
    }

    #[tokio::test]
    async fn missing_lease_is_refused_before_codex() {
        let error = dispatcher("missing-lease")
            .send_message("Codex", "hello")
            .await
            .unwrap_err();
        assert!(matches!(error, DispatchError::Lease(LeaseError::Missing)));
    }

    #[tokio::test]
    async fn breaker_blocks_before_spending_a_lease() {
        let breaker = Arc::new(CircuitBreaker::new());
        for _ in 0..3 {
            breaker.record_failure(CODEX_LANE);
        }
        let dispatcher = Dispatcher::new(
            breaker,
            Arc::new(ReceiptLog::new(
                std::env::temp_dir().join("ghostclaw-a2a-breaker-receipt.jsonl"),
            )),
            LeaseGuard::new(std::env::temp_dir().join("ghostclaw-a2a-breaker-lease.json")),
            env!("CARGO_MANIFEST_DIR"),
        )
        .unwrap();
        let error = dispatcher.send_message("Codex", "hello").await.unwrap_err();
        assert!(matches!(error, DispatchError::BreakerOpen(_)));
    }
}
