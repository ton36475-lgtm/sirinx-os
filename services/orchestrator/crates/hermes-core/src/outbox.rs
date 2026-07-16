//! Durable outbox records with bounded retries and duplicate suppression.

use std::collections::BTreeMap;
use std::fmt;

use serde::{de, Deserialize, Deserializer, Serialize};

use crate::{
    canonical_json_bytes, hash_bytes, ActorId, EvidenceHash, IdempotencyKey, IdentifierError,
    TaskId,
};

/// Validated outbox message identifier.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize)]
#[serde(transparent)]
pub struct OutboxMessageId(String);

impl OutboxMessageId {
    /// Creates a message identifier in the `outbox-` namespace.
    pub fn new(value: impl Into<String>) -> Result<Self, IdentifierError> {
        let value = value.into();
        if !value.starts_with("outbox-") {
            return Err(IdentifierError::MissingPrefix {
                kind: "outbox message id",
                prefix: "outbox-",
            });
        }
        if value.len() > 128 {
            return Err(IdentifierError::TooLong {
                kind: "outbox message id",
                max: 128,
            });
        }
        if !value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b':'))
        {
            return Err(IdentifierError::InvalidCharacter {
                kind: "outbox message id",
            });
        }
        Ok(Self(value))
    }

    /// Returns the message identifier as text.
    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for OutboxMessageId {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.0)
    }
}

impl<'de> Deserialize<'de> for OutboxMessageId {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        Self::new(value).map_err(de::Error::custom)
    }
}

/// Durable delivery lifecycle.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum OutboxStatus {
    /// Waiting for a worker claim.
    Pending,
    /// Temporarily owned by one worker.
    Claimed,
    /// Effect and acknowledgement are complete.
    Delivered,
    /// Retry limit was exhausted.
    DeadLetter,
}

/// Serializable outbox entry. Persistence adapters must compare-and-swap the
/// `version` field when claiming or completing a delivery.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct OutboxMessage {
    /// Stable message identity.
    pub id: OutboxMessageId,
    /// Task responsible for the event.
    pub task_id: TaskId,
    /// Key used to suppress duplicate enqueue requests.
    pub idempotency_key: IdempotencyKey,
    /// Closed event name admitted by the consumer contract.
    pub event_type: String,
    /// Complete message body.
    pub payload: serde_json::Value,
    /// Digest of the canonical payload.
    pub payload_hash: EvidenceHash,
    /// Delivery lifecycle.
    pub status: OutboxStatus,
    /// Number of completed failed delivery attempts.
    pub attempts: u16,
    /// Maximum failed attempts before dead-lettering.
    pub max_attempts: u16,
    /// Optimistic-concurrency version.
    pub version: u64,
    /// Creation time in Unix epoch milliseconds.
    pub created_at_ms: u64,
    /// Last mutation time in Unix epoch milliseconds.
    pub updated_at_ms: u64,
    /// Current claimant, when leased.
    pub claimed_by: Option<ActorId>,
    /// Exclusive claim expiry in Unix epoch milliseconds.
    pub claim_expires_at_ms: Option<u64>,
    /// Delivery result hash, never raw provider output.
    pub result_hash: Option<EvidenceHash>,
    /// Sanitized error code from the last failed attempt.
    pub last_error_code: Option<String>,
}

impl OutboxMessage {
    /// Creates a pending message and hashes its complete canonical payload.
    pub fn new(
        id: OutboxMessageId,
        task_id: TaskId,
        idempotency_key: IdempotencyKey,
        event_type: impl Into<String>,
        payload: serde_json::Value,
        max_attempts: u16,
        created_at_ms: u64,
    ) -> Result<Self, OutboxError> {
        let event_type = event_type.into();
        validate_event_type(&event_type)?;
        if max_attempts == 0 {
            return Err(OutboxError::InvalidAttemptLimit);
        }
        let payload_hash = hash_bytes(
            b"hermes.outbox-payload.v1",
            &[&canonical_json_bytes(&payload).map_err(OutboxError::Serialization)?],
        );
        Ok(Self {
            id,
            task_id,
            idempotency_key,
            event_type,
            payload,
            payload_hash,
            status: OutboxStatus::Pending,
            attempts: 0,
            max_attempts,
            version: 1,
            created_at_ms,
            updated_at_ms: created_at_ms,
            claimed_by: None,
            claim_expires_at_ms: None,
            result_hash: None,
            last_error_code: None,
        })
    }

    /// Claims pending work, or reclaims an expired lease.
    pub fn claim(
        &mut self,
        worker: ActorId,
        now_ms: u64,
        lease_ms: u64,
    ) -> Result<(), OutboxError> {
        self.verify_payload_hash()?;
        if lease_ms == 0 {
            return Err(OutboxError::InvalidLease);
        }
        let claim_expired = self
            .claim_expires_at_ms
            .is_some_and(|expires_at| now_ms >= expires_at);
        if self.status != OutboxStatus::Pending
            && !(self.status == OutboxStatus::Claimed && claim_expired)
        {
            return Err(OutboxError::InvalidStatus {
                status: self.status,
            });
        }
        self.status = OutboxStatus::Claimed;
        self.claimed_by = Some(worker);
        self.claim_expires_at_ms = Some(
            now_ms
                .checked_add(lease_ms)
                .ok_or(OutboxError::TimestampOverflow)?,
        );
        self.updated_at_ms = now_ms;
        self.version = self
            .version
            .checked_add(1)
            .ok_or(OutboxError::VersionOverflow)?;
        Ok(())
    }

    /// Marks a claimed message delivered by the current owner.
    pub fn mark_delivered(
        &mut self,
        worker: &ActorId,
        result_hash: EvidenceHash,
        now_ms: u64,
    ) -> Result<(), OutboxError> {
        self.verify_payload_hash()?;
        self.validate_active_claim(worker, now_ms)?;
        self.status = OutboxStatus::Delivered;
        self.result_hash = Some(result_hash);
        self.claimed_by = None;
        self.claim_expires_at_ms = None;
        self.last_error_code = None;
        self.updated_at_ms = now_ms;
        self.version = self
            .version
            .checked_add(1)
            .ok_or(OutboxError::VersionOverflow)?;
        Ok(())
    }

    /// Records a failed claimed attempt and either requeues or dead-letters it.
    pub fn mark_failed(
        &mut self,
        worker: &ActorId,
        error_code: impl Into<String>,
        now_ms: u64,
    ) -> Result<(), OutboxError> {
        self.verify_payload_hash()?;
        self.validate_active_claim(worker, now_ms)?;
        let error_code = error_code.into();
        validate_error_code(&error_code)?;
        self.attempts = self
            .attempts
            .checked_add(1)
            .ok_or(OutboxError::AttemptOverflow)?;
        self.status = if self.attempts >= self.max_attempts {
            OutboxStatus::DeadLetter
        } else {
            OutboxStatus::Pending
        };
        self.claimed_by = None;
        self.claim_expires_at_ms = None;
        self.last_error_code = Some(error_code);
        self.updated_at_ms = now_ms;
        self.version = self
            .version
            .checked_add(1)
            .ok_or(OutboxError::VersionOverflow)?;
        Ok(())
    }

    /// Verifies that the stored payload matches its immutable digest.
    pub fn verify_payload_hash(&self) -> Result<(), OutboxError> {
        let computed = hash_bytes(
            b"hermes.outbox-payload.v1",
            &[&canonical_json_bytes(&self.payload).map_err(OutboxError::Serialization)?],
        );
        if computed != self.payload_hash {
            return Err(OutboxError::PayloadHashMismatch);
        }
        Ok(())
    }

    fn validate_active_claim(&self, worker: &ActorId, now_ms: u64) -> Result<(), OutboxError> {
        if self.status != OutboxStatus::Claimed {
            return Err(OutboxError::InvalidStatus {
                status: self.status,
            });
        }
        if self.claimed_by.as_ref() != Some(worker) {
            return Err(OutboxError::ClaimOwnerMismatch);
        }
        if self
            .claim_expires_at_ms
            .is_none_or(|expires_at| now_ms >= expires_at)
        {
            return Err(OutboxError::ClaimExpired);
        }
        Ok(())
    }
}

/// Outcome of enqueueing by idempotency key.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EnqueueDecision {
    /// A new pending message was stored.
    Enqueued,
    /// The exact same logical message was already stored.
    Duplicate {
        /// Existing message identity.
        message_id: OutboxMessageId,
    },
}

/// In-memory reference implementation of a durable outbox table.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Outbox {
    messages: BTreeMap<OutboxMessageId, OutboxMessage>,
    idempotency_index: BTreeMap<IdempotencyKey, OutboxMessageId>,
}

impl Outbox {
    /// Creates an empty outbox.
    #[must_use]
    pub const fn new() -> Self {
        Self {
            messages: BTreeMap::new(),
            idempotency_index: BTreeMap::new(),
        }
    }

    /// Stores one logical event or returns its existing identity.
    pub fn enqueue(&mut self, message: OutboxMessage) -> Result<EnqueueDecision, OutboxError> {
        message.verify_payload_hash()?;
        if let Some(existing_id) = self.idempotency_index.get(&message.idempotency_key) {
            let existing = self
                .messages
                .get(existing_id)
                .ok_or(OutboxError::CorruptIndex)?;
            if existing.payload_hash != message.payload_hash
                || existing.event_type != message.event_type
                || existing.task_id != message.task_id
            {
                return Err(OutboxError::IdempotencyConflict);
            }
            return Ok(EnqueueDecision::Duplicate {
                message_id: existing_id.clone(),
            });
        }
        if self.messages.contains_key(&message.id) {
            return Err(OutboxError::MessageIdConflict);
        }
        self.idempotency_index
            .insert(message.idempotency_key.clone(), message.id.clone());
        self.messages.insert(message.id.clone(), message);
        Ok(EnqueueDecision::Enqueued)
    }

    /// Looks up a message by stable identity.
    #[must_use]
    pub fn get(&self, id: &OutboxMessageId) -> Option<&OutboxMessage> {
        self.messages.get(id)
    }

    /// Mutably looks up a message for persistence-adapter operations.
    pub fn get_mut(&mut self, id: &OutboxMessageId) -> Option<&mut OutboxMessage> {
        self.messages.get_mut(id)
    }

    /// Iterates pending messages in stable identifier order.
    pub fn pending(&self) -> impl Iterator<Item = &OutboxMessage> {
        self.messages
            .values()
            .filter(|message| message.status == OutboxStatus::Pending)
    }
}

fn validate_event_type(value: &str) -> Result<(), OutboxError> {
    if value.is_empty() || value.len() > 128 {
        return Err(OutboxError::InvalidEventType);
    }
    if !value
        .bytes()
        .all(|byte| byte.is_ascii_uppercase() || byte.is_ascii_digit() || byte == b'_')
    {
        return Err(OutboxError::InvalidEventType);
    }
    Ok(())
}

fn validate_error_code(value: &str) -> Result<(), OutboxError> {
    if value.is_empty() || value.len() > 128 {
        return Err(OutboxError::InvalidErrorCode);
    }
    if !value
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-' | b'.'))
    {
        return Err(OutboxError::InvalidErrorCode);
    }
    Ok(())
}

/// Outbox state, integrity, or validation error.
#[derive(Debug, thiserror::Error)]
pub enum OutboxError {
    /// Retry limit must admit at least one attempt.
    #[error("outbox max_attempts must be positive")]
    InvalidAttemptLimit,
    /// Claim leases must be positive.
    #[error("outbox claim lease must be positive")]
    InvalidLease,
    /// Event types use a bounded uppercase wire vocabulary.
    #[error("invalid outbox event type")]
    InvalidEventType,
    /// Stored error codes must be bounded and sanitized.
    #[error("invalid outbox error code")]
    InvalidErrorCode,
    /// Time arithmetic overflowed.
    #[error("outbox timestamp overflow")]
    TimestampOverflow,
    /// Optimistic version arithmetic overflowed.
    #[error("outbox version overflow")]
    VersionOverflow,
    /// Attempt counter arithmetic overflowed.
    #[error("outbox attempt counter overflow")]
    AttemptOverflow,
    /// The lifecycle does not admit the requested operation.
    #[error("outbox message has invalid status {status:?}")]
    InvalidStatus {
        /// Current status.
        status: OutboxStatus,
    },
    /// Only the active claimant can complete an attempt.
    #[error("outbox claim owner mismatch")]
    ClaimOwnerMismatch,
    /// The active claim is no longer valid.
    #[error("outbox claim expired")]
    ClaimExpired,
    /// One idempotency key cannot identify different logical events.
    #[error("outbox idempotency key conflicts with an existing message")]
    IdempotencyConflict,
    /// Message identities are immutable and unique.
    #[error("outbox message id already exists")]
    MessageIdConflict,
    /// The secondary index points to an absent message.
    #[error("outbox idempotency index is corrupt")]
    CorruptIndex,
    /// Stored payload bytes no longer match the immutable digest.
    #[error("outbox payload hash mismatch")]
    PayloadHashMismatch,
    /// Canonical payload serialization failed.
    #[error("failed to serialize outbox payload: {0}")]
    Serialization(serde_json::Error),
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn message(id: &str, key: &str, payload: serde_json::Value) -> OutboxMessage {
        OutboxMessage::new(
            OutboxMessageId::new(id).expect("valid message id"),
            TaskId::new("gc-outbox-test").expect("valid task id"),
            IdempotencyKey::new(key).expect("valid idempotency key"),
            "TASK_READY",
            payload,
            2,
            10,
        )
        .expect("valid outbox message")
    }

    fn worker() -> ActorId {
        ActorId::new("worker-1").expect("valid worker")
    }

    #[test]
    fn duplicate_enqueue_should_return_existing_message() {
        let mut outbox = Outbox::new();
        outbox
            .enqueue(message("outbox-1", "request-0001", json!({"a": 1})))
            .expect("first enqueue should pass");

        let result = outbox
            .enqueue(message("outbox-2", "request-0001", json!({"a": 1})))
            .expect("same logical message should deduplicate");

        assert_eq!(
            result,
            EnqueueDecision::Duplicate {
                message_id: OutboxMessageId::new("outbox-1").expect("valid id")
            }
        );
    }

    #[test]
    fn duplicate_key_should_reject_different_payload() {
        let mut outbox = Outbox::new();
        outbox
            .enqueue(message("outbox-1", "request-0001", json!({"a": 1})))
            .expect("first enqueue should pass");

        let error = outbox
            .enqueue(message("outbox-2", "request-0001", json!({"a": 2})))
            .expect_err("conflicting payload must fail");

        assert!(matches!(error, OutboxError::IdempotencyConflict));
    }

    #[test]
    fn wrong_worker_should_not_complete_claim() {
        let mut message = message("outbox-1", "request-0001", json!({}));
        message.claim(worker(), 11, 10).expect("claim should pass");

        let error = message
            .mark_delivered(
                &ActorId::new("worker-2").expect("valid worker"),
                EvidenceHash::genesis(),
                12,
            )
            .expect_err("wrong worker must fail");

        assert!(matches!(error, OutboxError::ClaimOwnerMismatch));
    }

    #[test]
    fn failed_attempts_should_dead_letter_at_bound() {
        let mut message = message("outbox-1", "request-0001", json!({}));
        message
            .claim(worker(), 11, 10)
            .expect("first claim should pass");
        message
            .mark_failed(&worker(), "UPSTREAM_TIMEOUT", 12)
            .expect("first failure should requeue");
        message
            .claim(worker(), 13, 10)
            .expect("second claim should pass");
        message
            .mark_failed(&worker(), "UPSTREAM_TIMEOUT", 14)
            .expect("second failure should dead-letter");

        assert_eq!(message.status, OutboxStatus::DeadLetter);
    }

    #[test]
    fn expired_claim_should_be_reclaimable() {
        let mut message = message("outbox-1", "request-0001", json!({}));
        message
            .claim(worker(), 10, 5)
            .expect("first claim should pass");

        let result = message.claim(ActorId::new("worker-2").expect("valid worker"), 15, 5);

        assert!(result.is_ok());
    }

    #[test]
    fn claim_should_reject_tampered_payload() {
        let mut message = message("outbox-1", "request-0001", json!({"safe": true}));
        message.payload = json!({"safe": false});

        let error = message
            .claim(worker(), 11, 10)
            .expect_err("tampered payload must fail");

        assert!(matches!(error, OutboxError::PayloadHashMismatch));
    }
}
