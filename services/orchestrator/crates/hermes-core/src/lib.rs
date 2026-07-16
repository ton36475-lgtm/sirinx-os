//! Domain contracts for the Hermes V5 orchestration control plane.
//!
//! The crate contains only deterministic, platform-neutral primitives so the
//! same policy and receipt code can run on a host or in a `wasm32` Worker.

mod hash_chain;
mod idempotency;
mod outbox;
mod resource_allocation;
mod state_machine;

use std::fmt;

use serde::{de, Deserialize, Deserializer, Serialize};

pub use hash_chain::{
    canonical_json_bytes, hash_bytes, ReceiptChain, ReceiptError, TransitionReceipt,
    RECEIPT_SCHEMA_VERSION,
};
pub use idempotency::{
    IdempotencyDecision, IdempotencyError, IdempotencyLedger, IdempotencyRecord, IdempotencyStatus,
};
pub use outbox::{
    EnqueueDecision, Outbox, OutboxError, OutboxMessage, OutboxMessageId, OutboxStatus,
};
pub use resource_allocation::{
    HardwareProfile, PerformanceTelemetry, ResourceAllocation, ResourceProfileError,
};
pub use state_machine::{
    ExecutionAuthorization, StateMachine, StateMachineError, DEFAULT_MAX_REPAIR_CYCLES,
};

/// Error returned when a constrained string identifier is invalid.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum IdentifierError {
    /// The identifier is empty.
    #[error("{kind} must not be empty")]
    Empty { kind: &'static str },
    /// The identifier exceeds its wire-format limit.
    #[error("{kind} exceeds {max} bytes")]
    TooLong { kind: &'static str, max: usize },
    /// The identifier contains a character not admitted by the contract.
    #[error("{kind} contains an invalid character")]
    InvalidCharacter { kind: &'static str },
    /// The identifier is missing its required prefix.
    #[error("{kind} must start with `{prefix}`")]
    MissingPrefix {
        kind: &'static str,
        prefix: &'static str,
    },
}

macro_rules! identifier_type {
    ($name:ident, $kind:literal, $max:expr) => {
        #[doc = concat!("Validated ", $kind, " identifier.")]
        #[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize)]
        #[serde(transparent)]
        pub struct $name(String);

        impl $name {
            #[doc = concat!("Creates a validated ", $kind, ".")]
            pub fn new(value: impl Into<String>) -> Result<Self, IdentifierError> {
                let value = value.into();
                validate_identifier(&value, $kind, $max)?;
                Ok(Self(value))
            }

            #[doc = concat!("Returns the ", $kind, " as a string slice.")]
            #[must_use]
            pub fn as_str(&self) -> &str {
                &self.0
            }
        }

        impl fmt::Display for $name {
            fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                formatter.write_str(&self.0)
            }
        }

        impl TryFrom<&str> for $name {
            type Error = IdentifierError;

            fn try_from(value: &str) -> Result<Self, Self::Error> {
                Self::new(value)
            }
        }

        impl TryFrom<String> for $name {
            type Error = IdentifierError;

            fn try_from(value: String) -> Result<Self, Self::Error> {
                Self::new(value)
            }
        }

        impl<'de> Deserialize<'de> for $name {
            fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
            where
                D: Deserializer<'de>,
            {
                let value = String::deserialize(deserializer)?;
                Self::new(value).map_err(de::Error::custom)
            }
        }
    };
}

fn validate_identifier(value: &str, kind: &'static str, max: usize) -> Result<(), IdentifierError> {
    if value.is_empty() {
        return Err(IdentifierError::Empty { kind });
    }
    if value.len() > max {
        return Err(IdentifierError::TooLong { kind, max });
    }
    if !value.bytes().all(|byte| {
        byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b':' | b'/')
    }) {
        return Err(IdentifierError::InvalidCharacter { kind });
    }
    Ok(())
}

identifier_type!(CorrelationId, "correlation id", 128);
identifier_type!(ActorId, "actor id", 128);
identifier_type!(ActionTarget, "action target", 512);
identifier_type!(IdempotencyKey, "idempotency key", 128);

/// Validated task identifier using the `gc-` namespace.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize)]
#[serde(transparent)]
pub struct TaskId(String);

impl TaskId {
    /// Creates a task identifier after checking the namespace and characters.
    pub fn new(value: impl Into<String>) -> Result<Self, IdentifierError> {
        let value = value.into();
        validate_identifier(&value, "task id", 128)?;
        if !value.starts_with("gc-") {
            return Err(IdentifierError::MissingPrefix {
                kind: "task id",
                prefix: "gc-",
            });
        }
        Ok(Self(value))
    }

    /// Returns the task identifier as a string slice.
    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for TaskId {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.0)
    }
}

impl TryFrom<&str> for TaskId {
    type Error = IdentifierError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        Self::new(value)
    }
}

impl TryFrom<String> for TaskId {
    type Error = IdentifierError;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        Self::new(value)
    }
}

impl<'de> Deserialize<'de> for TaskId {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        Self::new(value).map_err(de::Error::custom)
    }
}

/// Lowercase hexadecimal SHA-256 digest used as evidence identity.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize)]
#[serde(transparent)]
pub struct EvidenceHash(String);

impl EvidenceHash {
    /// Creates an evidence hash from a validated hexadecimal digest.
    pub fn new(value: impl Into<String>) -> Result<Self, EvidenceHashError> {
        let value = value.into();
        if value.len() != 64 {
            return Err(EvidenceHashError::InvalidLength);
        }
        if !value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
        {
            return Err(EvidenceHashError::InvalidEncoding);
        }
        Ok(Self(value))
    }

    /// Creates a digest from exactly 32 hash bytes.
    #[must_use]
    pub fn from_bytes(bytes: [u8; 32]) -> Self {
        let mut encoded = String::with_capacity(64);
        for byte in bytes {
            use fmt::Write as _;
            let _ = write!(encoded, "{byte:02x}");
        }
        Self(encoded)
    }

    /// Returns the digest as lowercase hexadecimal text.
    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Returns the domain-separated genesis digest for receipt chains.
    #[must_use]
    pub fn genesis() -> Self {
        hash_bytes(b"hermes.receipt.genesis.v1", &[])
    }
}

impl fmt::Display for EvidenceHash {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.0)
    }
}

impl<'de> Deserialize<'de> for EvidenceHash {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        Self::new(value).map_err(de::Error::custom)
    }
}

/// Error returned for malformed evidence hashes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, thiserror::Error)]
pub enum EvidenceHashError {
    /// A SHA-256 digest must contain 64 hexadecimal characters.
    #[error("evidence hash must contain exactly 64 hexadecimal characters")]
    InvalidLength,
    /// Only lowercase hexadecimal encoding is accepted.
    #[error("evidence hash must use lowercase hexadecimal encoding")]
    InvalidEncoding,
}

/// Task risk classification. Unclassified work must never be treated as low risk.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RiskTier {
    /// Read-only or explicitly policy-bounded local work.
    Low,
    /// Local mutation that requires a durable workflow receipt.
    #[serde(rename = "MED")]
    Medium,
    /// External, privileged, destructive, paid, or otherwise gated work.
    High,
}

/// Durable lifecycle states for a Hermes task.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TaskState {
    /// Accepted but not yet classified.
    Intake,
    /// Risk and routing classification.
    Triage,
    /// Implementation or artifact production.
    Maker,
    /// Deterministic and adversarial verification.
    Checker,
    /// Final policy guard before dispatch.
    Guard,
    /// Waiting for a task-scoped approval grant.
    WaitingApproval,
    /// An evidenced effect is currently running.
    Executing,
    /// Successful terminal state.
    Done,
    /// Execution failed and may be routed back for repair.
    Failed,
    /// Repair budget was exhausted.
    Stalled,
    /// Operator or policy terminated the task.
    Aborted,
}

impl TaskState {
    /// Returns whether the state has no outgoing transitions.
    #[must_use]
    pub const fn is_terminal(self) -> bool {
        matches!(self, Self::Done | Self::Stalled | Self::Aborted)
    }
}

/// Closed action vocabulary admitted by the dispatch policy.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ActionType {
    /// No mutation and no external data transfer.
    ReadOnly,
    /// Scoped writes to an approved local workspace.
    LocalWrite,
    /// Dependency installation or package manager mutation.
    InstallDependency,
    /// A model or API provider call.
    ProviderCall,
    /// Sending a message outside the local process.
    ExternalMessage,
    /// Mutation of a remote or cloud resource.
    CloudMutation,
    /// A preview release to a remote environment.
    PreviewDeploy,
    /// A production release.
    ProductionDeploy,
    /// A database write or migration.
    DatabaseMutation,
    /// Access to secret material.
    SecretAccess,
    /// Irreversible or destructive work.
    DestructiveOperation,
    /// Explicit fail-closed marker for an action not yet modeled.
    Unknown,
}

/// Security-relevant effects declared by an action request.
#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct ActionImpact {
    /// The action mutates local files.
    pub writes_files: bool,
    /// The action uses a network outside loopback.
    pub external_network: bool,
    /// The action can consume paid quota or money.
    pub spends_money: bool,
    /// The action sends a message to a person or external system.
    pub sends_messages: bool,
    /// The action reads or writes customer data.
    pub customer_data: bool,
    /// The action accesses credentials or other secret material.
    pub accesses_secrets: bool,
    /// The action mutates a production target.
    pub production: bool,
    /// The action can destroy or irreversibly overwrite data.
    pub destructive: bool,
}

/// Strict task action contract used by policy classification and dispatch.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct ActionManifest {
    /// Closed action type.
    pub action_type: ActionType,
    /// Non-empty, validated scope for the action.
    pub targets: Vec<ActionTarget>,
    /// Declared security effects.
    pub impact: ActionImpact,
    /// Maximum approved spend in integer micro-units, when applicable.
    pub max_cost_micros: Option<u64>,
    /// Request-level duplicate suppression key.
    pub idempotency_key: IdempotencyKey,
}

impl ActionManifest {
    /// Checks cross-field invariants that Serde cannot express.
    pub fn validate(&self) -> Result<(), ActionManifestError> {
        if self.targets.is_empty() {
            return Err(ActionManifestError::MissingTarget);
        }
        if self.action_type == ActionType::ReadOnly && self.impact != ActionImpact::default() {
            return Err(ActionManifestError::ReadOnlyHasEffects);
        }
        if self.impact.spends_money && self.max_cost_micros.is_none() {
            return Err(ActionManifestError::MissingCostLimit);
        }
        if !self.impact.spends_money && self.max_cost_micros.is_some() {
            return Err(ActionManifestError::UnexpectedCostLimit);
        }
        Ok(())
    }

    /// Returns a deterministic digest of the complete manifest.
    pub fn evidence_hash(&self) -> Result<EvidenceHash, serde_json::Error> {
        let value = serde_json::to_value(self)?;
        Ok(hash_bytes(
            b"hermes.action-manifest.v1",
            &[&canonical_json_bytes(&value)?],
        ))
    }
}

/// Cross-field action-manifest validation error.
#[derive(Debug, Clone, Copy, PartialEq, Eq, thiserror::Error)]
pub enum ActionManifestError {
    /// Dispatch scope cannot be inferred.
    #[error("action manifest must contain at least one target")]
    MissingTarget,
    /// Read-only actions cannot declare mutation or external effects.
    #[error("READ_ONLY action cannot declare effects")]
    ReadOnlyHasEffects,
    /// Paid work must be explicitly capped.
    #[error("paid action must declare max_cost_micros")]
    MissingCostLimit,
    /// Cost limits are only admitted for paid actions.
    #[error("max_cost_micros is only valid when spends_money is true")]
    UnexpectedCostLimit,
}

/// Aggregate root returned by task APIs.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Task {
    /// Stable task identifier.
    pub id: TaskId,
    /// Trace identifier shared by all receipts for the task.
    pub correlation_id: CorrelationId,
    /// Current durable state.
    pub state: TaskState,
    /// Classified risk tier.
    pub tier: RiskTier,
    /// Human-readable request summary.
    pub description: String,
    /// Strict action contract.
    pub action: ActionManifest,
    /// Latest verified receipt hash.
    pub evidence_hash: EvidenceHash,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn task_id_should_reject_missing_namespace() {
        let error = TaskId::new("task-1").expect_err("missing gc namespace must fail");

        assert!(matches!(error, IdentifierError::MissingPrefix { .. }));
    }

    #[test]
    fn strict_manifest_should_reject_unknown_fields() {
        let json = r#"{
            "action_type":"READ_ONLY",
            "targets":["repo/src"],
            "impact":{
                "writes_files":false,
                "external_network":false,
                "spends_money":false,
                "sends_messages":false,
                "customer_data":false,
                "accesses_secrets":false,
                "production":false,
                "destructive":false
            },
            "max_cost_micros":null,
            "idempotency_key":"request-0001",
            "untrusted":true
        }"#;

        let result = serde_json::from_str::<ActionManifest>(json);

        assert!(result.is_err(), "unknown fields must fail closed");
    }

    #[test]
    fn evidence_hash_should_reject_non_canonical_encoding() {
        let result = EvidenceHash::new("A".repeat(64));

        assert_eq!(result, Err(EvidenceHashError::InvalidEncoding));
    }
}
