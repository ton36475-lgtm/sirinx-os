//! Fail-closed approval and sandbox-governance contracts.

use std::collections::{BTreeMap, BTreeSet};
use std::fmt;

use hermes_core::{
    canonical_json_bytes, hash_bytes, ActionTarget, ActorId, EvidenceHash, IdentifierError, TaskId,
};
use serde::{de, Deserialize, Deserializer, Serialize};

/// Maximum lifetime accepted for one approval grant (24 hours).
pub const MAX_APPROVAL_LIFETIME_MS: u64 = 24 * 60 * 60 * 1_000;

/// Validated one-time approval nonce.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize)]
#[serde(transparent)]
pub struct ApprovalNonce(String);

impl ApprovalNonce {
    /// Creates a bounded nonce in the `nonce-` namespace.
    pub fn new(value: impl Into<String>) -> Result<Self, IdentifierError> {
        let value = value.into();
        if !value.starts_with("nonce-") {
            return Err(IdentifierError::MissingPrefix {
                kind: "approval nonce",
                prefix: "nonce-",
            });
        }
        if value.len() > 128 {
            return Err(IdentifierError::TooLong {
                kind: "approval nonce",
                max: 128,
            });
        }
        if !value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b':'))
        {
            return Err(IdentifierError::InvalidCharacter {
                kind: "approval nonce",
            });
        }
        Ok(Self(value))
    }

    /// Returns the nonce as text.
    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for ApprovalNonce {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.0)
    }
}

impl<'de> Deserialize<'de> for ApprovalNonce {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        Self::new(value).map_err(de::Error::custom)
    }
}

/// Human approval bound to one task, exact action hash, and expiry.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct ApprovalGrant {
    /// One-time replay-prevention nonce.
    pub nonce: ApprovalNonce,
    /// Exact task being approved.
    pub task_id: TaskId,
    /// Digest of the complete action manifest.
    pub action_hash: EvidenceHash,
    /// Human or trusted operator identity.
    pub approved_by: ActorId,
    /// Grant issue time in Unix epoch milliseconds.
    pub issued_at_ms: u64,
    /// Exclusive expiry in Unix epoch milliseconds.
    pub expires_at_ms: u64,
    /// Optional spend ceiling in integer micro-units.
    pub max_cost_micros: Option<u64>,
}

impl ApprovalGrant {
    /// Returns a deterministic digest of all grant fields.
    pub fn evidence_hash(&self) -> Result<EvidenceHash, GovernanceError> {
        let value = serde_json::to_value(self)?;
        Ok(hash_bytes(
            b"hermes.approval-grant.v1",
            &[&canonical_json_bytes(&value)?],
        ))
    }
}

/// Opaque proof that a grant passed expiry, scope, and replay checks.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VerifiedApproval {
    task_id: TaskId,
    action_hash: EvidenceHash,
    grant_hash: EvidenceHash,
    max_cost_micros: Option<u64>,
}

impl VerifiedApproval {
    /// Returns the approved task.
    #[must_use]
    pub const fn task_id(&self) -> &TaskId {
        &self.task_id
    }

    /// Returns the exact approved action digest.
    #[must_use]
    pub const fn action_hash(&self) -> &EvidenceHash {
        &self.action_hash
    }

    /// Returns the immutable grant digest for transition evidence.
    #[must_use]
    pub const fn grant_hash(&self) -> &EvidenceHash {
        &self.grant_hash
    }

    /// Returns the optional maximum approved spend.
    #[must_use]
    pub const fn max_cost_micros(&self) -> Option<u64> {
        self.max_cost_micros
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
struct ConsumedNonce {
    nonce: ApprovalNonce,
    grant_hash: EvidenceHash,
    consumed_at_ms: u64,
    expires_at_ms: u64,
}

/// Bounded one-time nonce registry. Adapters should persist this map using an
/// atomic create-if-absent operation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct ApprovalRegistry {
    capacity: usize,
    consumed: BTreeMap<ApprovalNonce, ConsumedNonce>,
}

impl ApprovalRegistry {
    /// Creates an empty registry with a strict positive capacity.
    pub fn new(capacity: usize) -> Result<Self, GovernanceError> {
        if capacity == 0 {
            return Err(GovernanceError::InvalidCapacity);
        }
        Ok(Self {
            capacity,
            consumed: BTreeMap::new(),
        })
    }

    /// Verifies and atomically consumes an approval grant exactly once.
    pub fn verify_once(
        &mut self,
        grant: &ApprovalGrant,
        expected_task: &TaskId,
        expected_action_hash: &EvidenceHash,
        now_ms: u64,
    ) -> Result<VerifiedApproval, GovernanceError> {
        self.purge_expired(now_ms);
        if grant.issued_at_ms > now_ms {
            return Err(GovernanceError::NotYetValid);
        }
        if now_ms >= grant.expires_at_ms {
            return Err(GovernanceError::Expired);
        }
        let lifetime = grant
            .expires_at_ms
            .checked_sub(grant.issued_at_ms)
            .ok_or(GovernanceError::InvalidLifetime)?;
        if lifetime == 0 || lifetime > MAX_APPROVAL_LIFETIME_MS {
            return Err(GovernanceError::InvalidLifetime);
        }
        if &grant.task_id != expected_task || &grant.action_hash != expected_action_hash {
            return Err(GovernanceError::ScopeMismatch);
        }
        if self.consumed.contains_key(&grant.nonce) {
            return Err(GovernanceError::Replay);
        }
        if self.consumed.len() >= self.capacity {
            return Err(GovernanceError::CapacityExceeded);
        }
        let grant_hash = grant.evidence_hash()?;
        self.consumed.insert(
            grant.nonce.clone(),
            ConsumedNonce {
                nonce: grant.nonce.clone(),
                grant_hash: grant_hash.clone(),
                consumed_at_ms: now_ms,
                expires_at_ms: grant.expires_at_ms,
            },
        );
        Ok(VerifiedApproval {
            task_id: grant.task_id.clone(),
            action_hash: grant.action_hash.clone(),
            grant_hash,
            max_cost_micros: grant.max_cost_micros,
        })
    }

    /// Drops consumed nonces only after their grant can no longer be accepted.
    pub fn purge_expired(&mut self, now_ms: u64) -> usize {
        let before = self.consumed.len();
        self.consumed
            .retain(|_, consumed| now_ms < consumed.expires_at_ms);
        before - self.consumed.len()
    }
}

/// Network capability admitted to a sandbox.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "mode", content = "hosts", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum NetworkPolicy {
    /// No socket or fetch access.
    #[default]
    Deny,
    /// Only loopback hosts are admitted.
    LoopbackOnly,
    /// Exact normalized host allowlist.
    Allowlist(BTreeSet<String>),
}

/// Deny-by-default sandbox policy; paths and capabilities must be explicitly
/// present to be admitted.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct SandboxExecutionPolicy {
    /// Readable path scopes.
    pub readable_targets: BTreeSet<ActionTarget>,
    /// Writable path scopes.
    pub writable_targets: BTreeSet<ActionTarget>,
    /// Network access policy; default is [`NetworkPolicy::Deny`].
    pub network: NetworkPolicy,
    /// Exact secret names admitted to the sandbox; default is empty.
    pub secret_names: BTreeSet<String>,
    /// Maximum CPU time.
    pub max_cpu_ms: u64,
    /// Maximum memory.
    pub max_memory_mib: u32,
    /// Maximum combined output bytes.
    pub max_output_bytes: u64,
}

/// Capabilities requested by a sandboxed execution.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct SandboxExecutionRequest {
    /// Requested read scopes.
    pub readable_targets: BTreeSet<ActionTarget>,
    /// Requested write scopes.
    pub writable_targets: BTreeSet<ActionTarget>,
    /// Requested normalized network hosts.
    pub network_hosts: BTreeSet<String>,
    /// Requested secret identifiers, never secret values.
    pub secret_names: BTreeSet<String>,
    /// Requested CPU limit.
    pub cpu_ms: u64,
    /// Requested memory limit.
    pub memory_mib: u32,
    /// Requested output limit.
    pub output_bytes: u64,
}

/// Auditable capability record returned only for an admitted request.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct SandboxCapabilityRecord {
    /// Digest of the exact policy.
    pub policy_hash: EvidenceHash,
    /// Digest of the exact request.
    pub request_hash: EvidenceHash,
    /// Whether any network access was admitted.
    pub network_enabled: bool,
    /// Whether any secret identifier was admitted.
    pub secret_access_enabled: bool,
    /// Bounded CPU time.
    pub cpu_ms: u64,
    /// Bounded memory.
    pub memory_mib: u32,
    /// Bounded output size.
    pub output_bytes: u64,
}

impl SandboxExecutionPolicy {
    /// Validates an execution request against exact capability scopes.
    pub fn authorize(
        &self,
        request: &SandboxExecutionRequest,
    ) -> Result<SandboxCapabilityRecord, GovernanceError> {
        if !request.readable_targets.is_subset(&self.readable_targets) {
            return Err(GovernanceError::UnauthorizedReadTarget);
        }
        if !request.writable_targets.is_subset(&self.writable_targets) {
            return Err(GovernanceError::UnauthorizedWriteTarget);
        }
        validate_network_request(&self.network, &request.network_hosts)?;
        if !request.secret_names.is_subset(&self.secret_names) {
            return Err(GovernanceError::UnauthorizedSecret);
        }
        if request.cpu_ms == 0
            || request.memory_mib == 0
            || request.output_bytes == 0
            || request.cpu_ms > self.max_cpu_ms
            || request.memory_mib > self.max_memory_mib
            || request.output_bytes > self.max_output_bytes
        {
            return Err(GovernanceError::ResourceLimitExceeded);
        }
        let policy_value = serde_json::to_value(self)?;
        let request_value = serde_json::to_value(request)?;
        Ok(SandboxCapabilityRecord {
            policy_hash: hash_bytes(
                b"hermes.sandbox-policy.v1",
                &[&canonical_json_bytes(&policy_value)?],
            ),
            request_hash: hash_bytes(
                b"hermes.sandbox-request.v1",
                &[&canonical_json_bytes(&request_value)?],
            ),
            network_enabled: !request.network_hosts.is_empty(),
            secret_access_enabled: !request.secret_names.is_empty(),
            cpu_ms: request.cpu_ms,
            memory_mib: request.memory_mib,
            output_bytes: request.output_bytes,
        })
    }
}

fn validate_network_request(
    policy: &NetworkPolicy,
    requested_hosts: &BTreeSet<String>,
) -> Result<(), GovernanceError> {
    if requested_hosts.is_empty() {
        return Ok(());
    }
    match policy {
        NetworkPolicy::Deny => Err(GovernanceError::UnauthorizedNetwork),
        NetworkPolicy::LoopbackOnly => requested_hosts
            .iter()
            .all(|host| matches!(host.as_str(), "localhost" | "127.0.0.1" | "::1"))
            .then_some(())
            .ok_or(GovernanceError::UnauthorizedNetwork),
        NetworkPolicy::Allowlist(allowed) => requested_hosts
            .is_subset(allowed)
            .then_some(())
            .ok_or(GovernanceError::UnauthorizedNetwork),
    }
}

/// Approval or sandbox policy rejection.
#[derive(Debug, thiserror::Error)]
pub enum GovernanceError {
    /// Registry capacity must be positive.
    #[error("approval nonce registry capacity must be positive")]
    InvalidCapacity,
    /// Grant issue time is in the future.
    #[error("approval grant is not yet valid")]
    NotYetValid,
    /// Grant has reached its exclusive expiry.
    #[error("approval grant expired")]
    Expired,
    /// Lifetime is zero, inverted, or above the bounded maximum.
    #[error("approval grant lifetime is invalid")]
    InvalidLifetime,
    /// Grant is not bound to the expected task and action digest.
    #[error("approval grant scope mismatch")]
    ScopeMismatch,
    /// Nonce was already consumed.
    #[error("approval nonce replay detected")]
    Replay,
    /// Registry is full and fails closed rather than evicting live nonces.
    #[error("approval nonce registry capacity exceeded")]
    CapacityExceeded,
    /// Read target is outside the explicit sandbox policy.
    #[error("sandbox read target is not authorized")]
    UnauthorizedReadTarget,
    /// Write target is outside the explicit sandbox policy.
    #[error("sandbox write target is not authorized")]
    UnauthorizedWriteTarget,
    /// Requested network host is absent from the policy.
    #[error("sandbox network access is not authorized")]
    UnauthorizedNetwork,
    /// Requested secret identifier is absent from the policy.
    #[error("sandbox secret access is not authorized")]
    UnauthorizedSecret,
    /// Requested CPU, memory, or output budget exceeds policy.
    #[error("sandbox resource request exceeds policy")]
    ResourceLimitExceeded,
    /// Strict policy evidence serialization failed.
    #[error("governance evidence serialization failed: {0}")]
    Serialization(#[from] serde_json::Error),
}

#[cfg(test)]
mod tests {
    use super::*;

    fn action_hash() -> EvidenceHash {
        hash_bytes(b"test.action", &[b"manifest"])
    }

    fn grant(expires_at_ms: u64) -> ApprovalGrant {
        ApprovalGrant {
            nonce: ApprovalNonce::new("nonce-approval-0001").expect("valid nonce"),
            task_id: TaskId::new("gc-approval-test").expect("valid task id"),
            action_hash: action_hash(),
            approved_by: ActorId::new("operator").expect("valid operator"),
            issued_at_ms: 100,
            expires_at_ms,
            max_cost_micros: None,
        }
    }

    fn request() -> SandboxExecutionRequest {
        SandboxExecutionRequest {
            readable_targets: BTreeSet::new(),
            writable_targets: BTreeSet::new(),
            network_hosts: BTreeSet::new(),
            secret_names: BTreeSet::new(),
            cpu_ms: 100,
            memory_mib: 128,
            output_bytes: 1_024,
        }
    }

    fn local_policy() -> SandboxExecutionPolicy {
        SandboxExecutionPolicy {
            max_cpu_ms: 1_000,
            max_memory_mib: 512,
            max_output_bytes: 4_096,
            ..SandboxExecutionPolicy::default()
        }
    }

    #[test]
    fn approval_should_reject_expired_nonce() {
        let mut registry = ApprovalRegistry::new(4).expect("valid registry");
        let grant = grant(200);

        let error = registry
            .verify_once(&grant, &grant.task_id, &grant.action_hash, 200)
            .expect_err("expiry is exclusive");

        assert!(matches!(error, GovernanceError::Expired));
    }

    #[test]
    fn approval_should_reject_replayed_nonce() {
        let mut registry = ApprovalRegistry::new(4).expect("valid registry");
        let grant = grant(300);
        registry
            .verify_once(&grant, &grant.task_id, &grant.action_hash, 150)
            .expect("first verification should pass");

        let error = registry
            .verify_once(&grant, &grant.task_id, &grant.action_hash, 151)
            .expect_err("second verification must fail");

        assert!(matches!(error, GovernanceError::Replay));
    }

    #[test]
    fn sandbox_should_deny_network_by_default() {
        let policy = local_policy();
        let mut request = request();
        request.network_hosts.insert("example.com".to_owned());

        let error = policy
            .authorize(&request)
            .expect_err("default network policy must deny");

        assert!(matches!(error, GovernanceError::UnauthorizedNetwork));
    }

    #[test]
    fn sandbox_should_deny_secret_access_by_default() {
        let policy = local_policy();
        let mut request = request();
        request.secret_names.insert("API_TOKEN".to_owned());

        let error = policy
            .authorize(&request)
            .expect_err("default secret policy must deny");

        assert!(matches!(error, GovernanceError::UnauthorizedSecret));
    }

    #[test]
    fn sandbox_should_emit_capability_record_for_bounded_local_request() {
        let policy = local_policy();

        let record = policy
            .authorize(&request())
            .expect("bounded request should be admitted");

        assert!(!record.network_enabled && !record.secret_access_enabled);
    }
}
