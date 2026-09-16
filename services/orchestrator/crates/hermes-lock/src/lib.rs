//! Expiring task leases for single-writer orchestration scopes.
//!
//! Hermes V5 uses durable workflow events for delayed work rather than an
//! in-memory cancellation timer.

use std::collections::BTreeMap;
use std::fmt;

use hermes_core::{ActionTarget, ActorId, IdentifierError, TaskId};
use serde::{de, Deserialize, Deserializer, Serialize};

/// Validated lease identifier.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize)]
#[serde(transparent)]
pub struct LeaseId(String);

impl LeaseId {
    /// Creates a bounded identifier in the `lease-` namespace.
    pub fn new(value: impl Into<String>) -> Result<Self, IdentifierError> {
        let value = value.into();
        if !value.starts_with("lease-") {
            return Err(IdentifierError::MissingPrefix {
                kind: "lease id",
                prefix: "lease-",
            });
        }
        if value.len() > 128 {
            return Err(IdentifierError::TooLong {
                kind: "lease id",
                max: 128,
            });
        }
        if !value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b':'))
        {
            return Err(IdentifierError::InvalidCharacter { kind: "lease id" });
        }
        Ok(Self(value))
    }

    /// Returns the lease identifier as text.
    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for LeaseId {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.0)
    }
}

impl<'de> Deserialize<'de> for LeaseId {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        Self::new(value).map_err(de::Error::custom)
    }
}

/// Serializable exclusive lease. Persistence adapters must compare-and-swap
/// `version` on renew/release.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Lease {
    /// Stable lease identity.
    pub id: LeaseId,
    /// Task owning the work.
    pub task_id: TaskId,
    /// Exact mutation scope.
    pub scope: ActionTarget,
    /// Current worker owner.
    pub owner: ActorId,
    /// Grant time in Unix epoch milliseconds.
    pub acquired_at_ms: u64,
    /// Exclusive expiry in Unix epoch milliseconds.
    pub expires_at_ms: u64,
    /// Optimistic-concurrency version.
    pub version: u64,
}

/// In-memory reference implementation of the durable lease table.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct LeaseTable {
    by_scope: BTreeMap<ActionTarget, Lease>,
}

impl LeaseTable {
    /// Creates an empty lease table.
    #[must_use]
    pub const fn new() -> Self {
        Self {
            by_scope: BTreeMap::new(),
        }
    }

    /// Acquires an exact scope after removing expired ownership.
    pub fn acquire(
        &mut self,
        id: LeaseId,
        task_id: TaskId,
        scope: ActionTarget,
        owner: ActorId,
        now_ms: u64,
        ttl_ms: u64,
    ) -> Result<Lease, LeaseError> {
        if ttl_ms == 0 {
            return Err(LeaseError::InvalidTimeToLive);
        }
        self.purge_expired(now_ms);
        if self.by_scope.contains_key(&scope) {
            return Err(LeaseError::ScopeAlreadyLeased);
        }
        let lease = Lease {
            id,
            task_id,
            scope: scope.clone(),
            owner,
            acquired_at_ms: now_ms,
            expires_at_ms: now_ms
                .checked_add(ttl_ms)
                .ok_or(LeaseError::TimestampOverflow)?,
            version: 1,
        };
        self.by_scope.insert(scope, lease.clone());
        Ok(lease)
    }

    /// Renews a live lease only for its current task and owner.
    pub fn renew(
        &mut self,
        scope: &ActionTarget,
        task_id: &TaskId,
        owner: &ActorId,
        expected_version: u64,
        now_ms: u64,
        ttl_ms: u64,
    ) -> Result<Lease, LeaseError> {
        if ttl_ms == 0 {
            return Err(LeaseError::InvalidTimeToLive);
        }
        let lease = self.by_scope.get_mut(scope).ok_or(LeaseError::NotFound)?;
        validate_owner(lease, task_id, owner, expected_version, now_ms)?;
        lease.expires_at_ms = now_ms
            .checked_add(ttl_ms)
            .ok_or(LeaseError::TimestampOverflow)?;
        lease.version = lease
            .version
            .checked_add(1)
            .ok_or(LeaseError::VersionOverflow)?;
        Ok(lease.clone())
    }

    /// Releases a live lease only for its current task and owner.
    pub fn release(
        &mut self,
        scope: &ActionTarget,
        task_id: &TaskId,
        owner: &ActorId,
        expected_version: u64,
        now_ms: u64,
    ) -> Result<Lease, LeaseError> {
        let lease = self.by_scope.get(scope).ok_or(LeaseError::NotFound)?;
        validate_owner(lease, task_id, owner, expected_version, now_ms)?;
        self.by_scope.remove(scope).ok_or(LeaseError::NotFound)
    }

    /// Returns a live lease for a scope.
    #[must_use]
    pub fn get(&self, scope: &ActionTarget, now_ms: u64) -> Option<&Lease> {
        self.by_scope
            .get(scope)
            .filter(|lease| now_ms < lease.expires_at_ms)
    }

    /// Removes expired leases and returns the count removed.
    pub fn purge_expired(&mut self, now_ms: u64) -> usize {
        let before = self.by_scope.len();
        self.by_scope
            .retain(|_, lease| now_ms < lease.expires_at_ms);
        before - self.by_scope.len()
    }
}

fn validate_owner(
    lease: &Lease,
    task_id: &TaskId,
    owner: &ActorId,
    expected_version: u64,
    now_ms: u64,
) -> Result<(), LeaseError> {
    if now_ms >= lease.expires_at_ms {
        return Err(LeaseError::Expired);
    }
    if &lease.task_id != task_id || &lease.owner != owner {
        return Err(LeaseError::OwnerMismatch);
    }
    if lease.version != expected_version {
        return Err(LeaseError::VersionConflict);
    }
    Ok(())
}

/// Lease validation or optimistic-concurrency error.
#[derive(Debug, Clone, Copy, PartialEq, Eq, thiserror::Error)]
pub enum LeaseError {
    /// Lease duration must be positive.
    #[error("lease ttl must be positive")]
    InvalidTimeToLive,
    /// Scope already has an unexpired owner.
    #[error("scope already has an active lease")]
    ScopeAlreadyLeased,
    /// Scope has no stored lease.
    #[error("lease not found")]
    NotFound,
    /// Lease has reached its exclusive expiry.
    #[error("lease expired")]
    Expired,
    /// Task or actor does not own the lease.
    #[error("lease owner mismatch")]
    OwnerMismatch,
    /// Compare-and-swap version differs from current state.
    #[error("lease version conflict")]
    VersionConflict,
    /// Expiry arithmetic overflowed.
    #[error("lease timestamp overflow")]
    TimestampOverflow,
    /// Version arithmetic overflowed.
    #[error("lease version overflow")]
    VersionOverflow,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scope() -> ActionTarget {
        ActionTarget::new("repo/src").expect("valid scope")
    }

    fn task() -> TaskId {
        TaskId::new("gc-lease-test").expect("valid task")
    }

    fn owner() -> ActorId {
        ActorId::new("worker-1").expect("valid owner")
    }

    #[test]
    fn acquire_should_reject_second_live_owner() {
        let mut table = LeaseTable::new();
        table
            .acquire(
                LeaseId::new("lease-1").expect("valid id"),
                task(),
                scope(),
                owner(),
                10,
                100,
            )
            .expect("first lease should pass");

        let error = table
            .acquire(
                LeaseId::new("lease-2").expect("valid id"),
                TaskId::new("gc-other-task").expect("valid task"),
                scope(),
                ActorId::new("worker-2").expect("valid owner"),
                11,
                100,
            )
            .expect_err("second owner must fail");

        assert_eq!(error, LeaseError::ScopeAlreadyLeased);
    }

    #[test]
    fn acquire_should_replace_expired_lease() {
        let mut table = LeaseTable::new();
        table
            .acquire(
                LeaseId::new("lease-1").expect("valid id"),
                task(),
                scope(),
                owner(),
                10,
                5,
            )
            .expect("first lease should pass");

        let result = table.acquire(
            LeaseId::new("lease-2").expect("valid id"),
            TaskId::new("gc-other-task").expect("valid task"),
            scope(),
            ActorId::new("worker-2").expect("valid owner"),
            15,
            5,
        );

        assert!(result.is_ok());
    }

    #[test]
    fn renew_should_require_current_version() {
        let mut table = LeaseTable::new();
        table
            .acquire(
                LeaseId::new("lease-1").expect("valid id"),
                task(),
                scope(),
                owner(),
                10,
                100,
            )
            .expect("lease should pass");

        let error = table
            .renew(&scope(), &task(), &owner(), 2, 11, 100)
            .expect_err("wrong version must fail");

        assert_eq!(error, LeaseError::VersionConflict);
    }
}
