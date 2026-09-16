//! Deterministic request idempotency primitives suitable for KV persistence.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use crate::{EvidenceHash, IdempotencyKey};

/// Lifecycle of an idempotency reservation.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum IdempotencyStatus {
    /// A caller owns the key but has not committed an effect.
    Reserved,
    /// One effect completed and its result hash is durable.
    Committed,
    /// The owning attempt failed without a committed effect.
    Failed,
}

/// Serializable idempotency record for a single request key.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct IdempotencyRecord {
    /// Client-supplied duplicate-suppression key.
    pub key: IdempotencyKey,
    /// Digest of the canonical request body.
    pub request_hash: EvidenceHash,
    /// Reservation lifecycle.
    pub status: IdempotencyStatus,
    /// Creation time in Unix epoch milliseconds.
    pub created_at_ms: u64,
    /// Exclusive expiry in Unix epoch milliseconds.
    pub expires_at_ms: u64,
    /// Digest of the single committed result.
    pub result_hash: Option<EvidenceHash>,
}

/// Outcome of reserving an idempotency key.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum IdempotencyDecision {
    /// The caller now owns a fresh reservation.
    Reserved,
    /// Another attempt still owns the reservation.
    InFlight,
    /// A prior attempt already committed the one admitted effect.
    DuplicateCommitted {
        /// Hash of the prior result returned from cache.
        result_hash: EvidenceHash,
    },
    /// A prior attempt failed; the caller must use a new key or explicit retry policy.
    PreviousFailure,
}

/// In-memory reference implementation of the KV idempotency contract.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct IdempotencyLedger {
    records: BTreeMap<IdempotencyKey, IdempotencyRecord>,
}

impl IdempotencyLedger {
    /// Creates an empty ledger.
    #[must_use]
    pub const fn new() -> Self {
        Self {
            records: BTreeMap::new(),
        }
    }

    /// Returns a record without mutating expiry state.
    #[must_use]
    pub fn get(&self, key: &IdempotencyKey) -> Option<&IdempotencyRecord> {
        self.records.get(key)
    }

    /// Atomically reserves a key or reports the prior attempt.
    pub fn reserve(
        &mut self,
        key: IdempotencyKey,
        request_hash: EvidenceHash,
        now_ms: u64,
        ttl_ms: u64,
    ) -> Result<IdempotencyDecision, IdempotencyError> {
        if ttl_ms == 0 {
            return Err(IdempotencyError::InvalidTimeToLive);
        }
        let expires_at_ms = now_ms
            .checked_add(ttl_ms)
            .ok_or(IdempotencyError::TimestampOverflow)?;
        if let Some(existing) = self.records.get(&key) {
            if now_ms < existing.expires_at_ms {
                if existing.request_hash != request_hash {
                    return Err(IdempotencyError::RequestConflict);
                }
                return match existing.status {
                    IdempotencyStatus::Reserved => Ok(IdempotencyDecision::InFlight),
                    IdempotencyStatus::Committed => existing
                        .result_hash
                        .clone()
                        .map(|result_hash| IdempotencyDecision::DuplicateCommitted { result_hash })
                        .ok_or(IdempotencyError::CorruptCommittedRecord),
                    IdempotencyStatus::Failed => Ok(IdempotencyDecision::PreviousFailure),
                };
            }
        }
        self.records.insert(
            key.clone(),
            IdempotencyRecord {
                key,
                request_hash,
                status: IdempotencyStatus::Reserved,
                created_at_ms: now_ms,
                expires_at_ms,
                result_hash: None,
            },
        );
        Ok(IdempotencyDecision::Reserved)
    }

    /// Commits the one admitted effect for an owned reservation.
    pub fn commit(
        &mut self,
        key: &IdempotencyKey,
        request_hash: &EvidenceHash,
        result_hash: EvidenceHash,
        now_ms: u64,
    ) -> Result<(), IdempotencyError> {
        let record = self
            .records
            .get_mut(key)
            .ok_or(IdempotencyError::UnknownKey)?;
        if &record.request_hash != request_hash {
            return Err(IdempotencyError::RequestConflict);
        }
        if now_ms >= record.expires_at_ms {
            return Err(IdempotencyError::Expired);
        }
        if record.status != IdempotencyStatus::Reserved {
            return Err(IdempotencyError::InvalidStatus {
                status: record.status,
            });
        }
        record.status = IdempotencyStatus::Committed;
        record.result_hash = Some(result_hash);
        Ok(())
    }

    /// Records a failed owning attempt without admitting an effect.
    pub fn fail(
        &mut self,
        key: &IdempotencyKey,
        request_hash: &EvidenceHash,
        now_ms: u64,
    ) -> Result<(), IdempotencyError> {
        let record = self
            .records
            .get_mut(key)
            .ok_or(IdempotencyError::UnknownKey)?;
        if &record.request_hash != request_hash {
            return Err(IdempotencyError::RequestConflict);
        }
        if now_ms >= record.expires_at_ms {
            return Err(IdempotencyError::Expired);
        }
        if record.status != IdempotencyStatus::Reserved {
            return Err(IdempotencyError::InvalidStatus {
                status: record.status,
            });
        }
        record.status = IdempotencyStatus::Failed;
        Ok(())
    }

    /// Removes expired records and returns the count removed.
    pub fn purge_expired(&mut self, now_ms: u64) -> usize {
        let before = self.records.len();
        self.records
            .retain(|_, record| now_ms < record.expires_at_ms);
        before - self.records.len()
    }
}

/// Idempotency contract error.
#[derive(Debug, Clone, Copy, PartialEq, Eq, thiserror::Error)]
pub enum IdempotencyError {
    /// A reservation must have a positive lifetime.
    #[error("idempotency ttl must be positive")]
    InvalidTimeToLive,
    /// Expiry arithmetic exceeded `u64`.
    #[error("idempotency expiry timestamp overflow")]
    TimestampOverflow,
    /// The same key was reused for different request bytes.
    #[error("idempotency key is already bound to a different request")]
    RequestConflict,
    /// A commit/failure referenced an absent key.
    #[error("idempotency key is not reserved")]
    UnknownKey,
    /// The reservation expired before completion.
    #[error("idempotency reservation expired")]
    Expired,
    /// The requested mutation is invalid in the current lifecycle.
    #[error("idempotency record has invalid status {status:?}")]
    InvalidStatus {
        /// Current durable status.
        status: IdempotencyStatus,
    },
    /// A committed record without a result cannot safely serve duplicates.
    #[error("committed idempotency record has no result hash")]
    CorruptCommittedRecord,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::hash_bytes;

    fn key() -> IdempotencyKey {
        IdempotencyKey::new("request-0001").expect("valid key")
    }

    fn request_hash(value: &[u8]) -> EvidenceHash {
        hash_bytes(b"test.request", &[value])
    }

    #[test]
    fn duplicate_delivery_should_return_one_committed_result() {
        let mut ledger = IdempotencyLedger::new();
        let request = request_hash(b"same");
        let result = request_hash(b"result");
        ledger
            .reserve(key(), request.clone(), 10, 100)
            .expect("reserve should pass");
        ledger
            .commit(&key(), &request, result.clone(), 11)
            .expect("commit should pass");

        let duplicate = ledger
            .reserve(key(), request, 12, 100)
            .expect("duplicate should be served");

        assert_eq!(
            duplicate,
            IdempotencyDecision::DuplicateCommitted {
                result_hash: result
            }
        );
    }

    #[test]
    fn reused_key_should_reject_different_request() {
        let mut ledger = IdempotencyLedger::new();
        ledger
            .reserve(key(), request_hash(b"first"), 10, 100)
            .expect("reserve should pass");

        let error = ledger
            .reserve(key(), request_hash(b"second"), 11, 100)
            .expect_err("key conflict must fail");

        assert_eq!(error, IdempotencyError::RequestConflict);
    }

    #[test]
    fn expired_key_should_admit_fresh_reservation() {
        let mut ledger = IdempotencyLedger::new();
        ledger
            .reserve(key(), request_hash(b"first"), 10, 5)
            .expect("reserve should pass");

        let decision = ledger
            .reserve(key(), request_hash(b"second"), 15, 5)
            .expect("expired reservation should be replaceable");

        assert_eq!(decision, IdempotencyDecision::Reserved);
    }

    #[test]
    fn second_commit_should_be_rejected() {
        let mut ledger = IdempotencyLedger::new();
        let request = request_hash(b"same");
        ledger
            .reserve(key(), request.clone(), 10, 100)
            .expect("reserve should pass");
        ledger
            .commit(&key(), &request, request_hash(b"result"), 11)
            .expect("first commit should pass");

        let error = ledger
            .commit(&key(), &request, request_hash(b"other"), 12)
            .expect_err("second commit must fail");

        assert!(matches!(
            error,
            IdempotencyError::InvalidStatus {
                status: IdempotencyStatus::Committed
            }
        ));
    }
}
