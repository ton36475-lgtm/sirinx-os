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
    /// The provider may have applied the effect, so automatic retry is unsafe.
    EffectUnknown,
}

/// Closed failure classes used to decide whether delivery may be retried.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum OutboxFailureClass {
    /// The failure is known not to have applied the effect and may be retried.
    Transient,
    /// The failure is terminal and must be inspected in the dead-letter queue.
    Fatal,
    /// The effect outcome cannot be proven; automatic retry is forbidden.
    EffectUnknown,
}

const FIRST_RETRY_DELAY_MS: u64 = 5_000;
const LATER_RETRY_DELAY_MS: u64 = 30_000;

/// Serializable outbox entry. Persistence adapters must compare-and-swap the
/// `version` field when claiming or completing a delivery.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct OutboxMessage {
    /// Stable message identity.
    id: OutboxMessageId,
    /// Task responsible for the event.
    task_id: TaskId,
    /// Key used to suppress duplicate enqueue requests.
    idempotency_key: IdempotencyKey,
    /// Closed event name admitted by the consumer contract.
    event_type: String,
    /// Complete message body.
    payload: serde_json::Value,
    /// Digest of the canonical payload.
    payload_hash: EvidenceHash,
    /// Delivery lifecycle.
    status: OutboxStatus,
    /// Number of completed failed delivery attempts.
    attempts: u16,
    /// Maximum failed attempts before dead-lettering.
    max_attempts: u16,
    /// Optimistic-concurrency version.
    version: u64,
    /// Creation time in Unix epoch milliseconds.
    created_at_ms: u64,
    /// Last mutation time in Unix epoch milliseconds.
    updated_at_ms: u64,
    /// Current claimant, when leased.
    claimed_by: Option<ActorId>,
    /// Exclusive claim expiry in Unix epoch milliseconds.
    claim_expires_at_ms: Option<u64>,
    /// Delivery result hash, never raw provider output.
    result_hash: Option<EvidenceHash>,
    /// Sanitized error code from the last failed attempt.
    last_error_code: Option<String>,
    /// Closed classification of the last failure.
    #[serde(default)]
    last_failure_class: Option<OutboxFailureClass>,
    /// Earliest time a transiently failed message may be claimed again.
    #[serde(default)]
    retry_not_before_ms: Option<u64>,
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
            last_failure_class: None,
            retry_not_before_ms: None,
        })
    }

    /// Returns the immutable message identity.
    #[must_use]
    pub const fn id(&self) -> &OutboxMessageId {
        &self.id
    }

    /// Returns the task responsible for this event.
    #[must_use]
    pub const fn task_id(&self) -> &TaskId {
        &self.task_id
    }

    /// Returns the duplicate-suppression key.
    #[must_use]
    pub const fn idempotency_key(&self) -> &IdempotencyKey {
        &self.idempotency_key
    }

    /// Returns the admitted event type.
    #[must_use]
    pub fn event_type(&self) -> &str {
        &self.event_type
    }

    /// Returns the immutable message body.
    #[must_use]
    pub const fn payload(&self) -> &serde_json::Value {
        &self.payload
    }

    /// Returns the digest of the canonical message body.
    #[must_use]
    pub const fn payload_hash(&self) -> &EvidenceHash {
        &self.payload_hash
    }

    /// Returns the current delivery lifecycle.
    #[must_use]
    pub const fn status(&self) -> OutboxStatus {
        self.status
    }

    /// Returns the number of completed failed attempts.
    #[must_use]
    pub const fn attempts(&self) -> u16 {
        self.attempts
    }

    /// Returns the configured failed-attempt bound.
    #[must_use]
    pub const fn max_attempts(&self) -> u16 {
        self.max_attempts
    }

    /// Returns the optimistic-concurrency version.
    #[must_use]
    pub const fn version(&self) -> u64 {
        self.version
    }

    /// Returns the creation time in Unix epoch milliseconds.
    #[must_use]
    pub const fn created_at_ms(&self) -> u64 {
        self.created_at_ms
    }

    /// Returns the last mutation time in Unix epoch milliseconds.
    #[must_use]
    pub const fn updated_at_ms(&self) -> u64 {
        self.updated_at_ms
    }

    /// Returns the current claimant, if any.
    #[must_use]
    pub const fn claimed_by(&self) -> Option<&ActorId> {
        self.claimed_by.as_ref()
    }

    /// Returns the current exclusive claim expiry.
    #[must_use]
    pub const fn claim_expires_at_ms(&self) -> Option<u64> {
        self.claim_expires_at_ms
    }

    /// Returns the delivery result digest, if delivered.
    #[must_use]
    pub const fn result_hash(&self) -> Option<&EvidenceHash> {
        self.result_hash.as_ref()
    }

    /// Returns the sanitized last error code.
    #[must_use]
    pub fn last_error_code(&self) -> Option<&str> {
        self.last_error_code.as_deref()
    }

    /// Returns the closed last-failure classification.
    #[must_use]
    pub const fn last_failure_class(&self) -> Option<OutboxFailureClass> {
        self.last_failure_class
    }

    /// Returns the earliest allowed retry time.
    #[must_use]
    pub const fn retry_not_before_ms(&self) -> Option<u64> {
        self.retry_not_before_ms
    }

    /// Claims pending work.
    ///
    /// An expired claim is never reclaimed automatically because the provider
    /// effect may already have happened. It must first be quarantined for
    /// explicit reconciliation with [`Self::quarantine_expired_claim`].
    fn claim(&mut self, worker: ActorId, now_ms: u64, lease_ms: u64) -> Result<(), OutboxError> {
        self.verify_state_invariants()?;
        self.validate_transition_time(now_ms)?;
        if lease_ms == 0 {
            return Err(OutboxError::InvalidLease);
        }
        if self.status == OutboxStatus::Claimed
            && self
                .claim_expires_at_ms
                .is_some_and(|expires_at| now_ms >= expires_at)
        {
            return Err(OutboxError::ClaimReconciliationRequired);
        }
        if self.status != OutboxStatus::Pending {
            return Err(OutboxError::InvalidStatus {
                status: self.status,
            });
        }
        if let Some(retry_at) = self.retry_not_before_ms {
            if now_ms < retry_at {
                return Err(OutboxError::RetryNotReady {
                    retry_not_before_ms: retry_at,
                });
            }
        }
        let claim_expires_at_ms = now_ms
            .checked_add(lease_ms)
            .ok_or(OutboxError::TimestampOverflow)?;
        let next_version = self
            .version
            .checked_add(1)
            .ok_or(OutboxError::VersionOverflow)?;
        self.status = OutboxStatus::Claimed;
        self.claimed_by = Some(worker);
        self.claim_expires_at_ms = Some(claim_expires_at_ms);
        self.retry_not_before_ms = None;
        self.updated_at_ms = now_ms;
        self.version = next_version;
        Ok(())
    }

    /// Quarantines an expired claim whose provider effect cannot be proven.
    ///
    /// This is terminal and intentionally has no redrive transition. A future
    /// human reconciliation workflow must create a new, independently approved
    /// action rather than rewriting this record.
    fn quarantine_expired_claim(
        &mut self,
        error_code: impl Into<String>,
        now_ms: u64,
    ) -> Result<(), OutboxError> {
        self.verify_state_invariants()?;
        self.validate_transition_time(now_ms)?;
        if self.status != OutboxStatus::Claimed {
            return Err(OutboxError::InvalidStatus {
                status: self.status,
            });
        }
        let expires_at = self
            .claim_expires_at_ms
            .ok_or(OutboxError::InvalidStateInvariant)?;
        if now_ms < expires_at {
            return Err(OutboxError::ClaimStillActive {
                claim_expires_at_ms: expires_at,
            });
        }
        let error_code = error_code.into();
        validate_error_code(&error_code)?;
        let next_attempts = self
            .attempts
            .checked_add(1)
            .ok_or(OutboxError::AttemptOverflow)?;
        if next_attempts > self.max_attempts {
            return Err(OutboxError::InvalidStateInvariant);
        }
        let next_version = self
            .version
            .checked_add(1)
            .ok_or(OutboxError::VersionOverflow)?;

        self.attempts = next_attempts;
        self.status = OutboxStatus::EffectUnknown;
        self.claimed_by = None;
        self.claim_expires_at_ms = None;
        self.last_error_code = Some(error_code);
        self.last_failure_class = Some(OutboxFailureClass::EffectUnknown);
        self.retry_not_before_ms = None;
        self.updated_at_ms = now_ms;
        self.version = next_version;
        Ok(())
    }

    /// Marks a claimed message delivered by the current owner.
    fn mark_delivered(
        &mut self,
        worker: &ActorId,
        result_hash: EvidenceHash,
        now_ms: u64,
    ) -> Result<(), OutboxError> {
        self.verify_state_invariants()?;
        self.validate_transition_time(now_ms)?;
        self.validate_active_claim(worker, now_ms)?;
        let next_version = self
            .version
            .checked_add(1)
            .ok_or(OutboxError::VersionOverflow)?;
        self.status = OutboxStatus::Delivered;
        self.result_hash = Some(result_hash);
        self.claimed_by = None;
        self.claim_expires_at_ms = None;
        self.last_error_code = None;
        self.last_failure_class = None;
        self.retry_not_before_ms = None;
        self.updated_at_ms = now_ms;
        self.version = next_version;
        Ok(())
    }

    /// Records a classified delivery failure with bounded retry behavior.
    ///
    /// Transient failures are delayed before another claim. Fatal failures are
    /// dead-lettered immediately. An unknown effect outcome enters a terminal
    /// state that deliberately has no automatic redrive operation.
    fn record_failure(
        &mut self,
        worker: &ActorId,
        failure_class: OutboxFailureClass,
        error_code: impl Into<String>,
        now_ms: u64,
    ) -> Result<(), OutboxError> {
        self.verify_state_invariants()?;
        self.validate_transition_time(now_ms)?;
        self.validate_active_claim(worker, now_ms)?;
        let error_code = error_code.into();
        validate_error_code(&error_code)?;
        let next_attempts = self
            .attempts
            .checked_add(1)
            .ok_or(OutboxError::AttemptOverflow)?;
        let (status, retry_not_before_ms) = match failure_class {
            OutboxFailureClass::Transient if next_attempts < self.max_attempts => {
                let delay_ms = if next_attempts == 1 {
                    FIRST_RETRY_DELAY_MS
                } else {
                    LATER_RETRY_DELAY_MS
                };
                (
                    OutboxStatus::Pending,
                    Some(
                        now_ms
                            .checked_add(delay_ms)
                            .ok_or(OutboxError::TimestampOverflow)?,
                    ),
                )
            }
            OutboxFailureClass::Transient | OutboxFailureClass::Fatal => {
                (OutboxStatus::DeadLetter, None)
            }
            OutboxFailureClass::EffectUnknown => (OutboxStatus::EffectUnknown, None),
        };
        let next_version = self
            .version
            .checked_add(1)
            .ok_or(OutboxError::VersionOverflow)?;
        self.attempts = next_attempts;
        self.status = status;
        self.claimed_by = None;
        self.claim_expires_at_ms = None;
        self.last_error_code = Some(error_code);
        self.last_failure_class = Some(failure_class);
        self.retry_not_before_ms = retry_not_before_ms;
        self.updated_at_ms = now_ms;
        self.version = next_version;
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

    fn verify_state_invariants(&self) -> Result<(), OutboxError> {
        self.verify_payload_hash()?;
        validate_event_type(&self.event_type)?;
        if let Some(error_code) = &self.last_error_code {
            validate_error_code(error_code)?;
        }
        if self.max_attempts == 0
            || self.attempts > self.max_attempts
            || self.version == 0
            || self.updated_at_ms < self.created_at_ms
            || self
                .retry_not_before_ms
                .is_some_and(|retry_at| retry_at < self.updated_at_ms)
        {
            return Err(OutboxError::InvalidStateInvariant);
        }

        let has_claim = self.claimed_by.is_some() && self.claim_expires_at_ms.is_some();
        let has_partial_claim = self.claimed_by.is_some() != self.claim_expires_at_ms.is_some();
        if has_partial_claim {
            return Err(OutboxError::InvalidStateInvariant);
        }

        let failure_fields_match =
            self.last_error_code.is_some() == self.last_failure_class.is_some();
        let valid = match self.status {
            OutboxStatus::Pending => {
                !has_claim
                    && self.result_hash.is_none()
                    && failure_fields_match
                    && match self.last_failure_class {
                        None => self.attempts == 0 && self.retry_not_before_ms.is_none(),
                        Some(OutboxFailureClass::Transient) => {
                            self.attempts > 0
                                && self.attempts < self.max_attempts
                                && self.retry_not_before_ms.is_some()
                        }
                        Some(OutboxFailureClass::Fatal | OutboxFailureClass::EffectUnknown) => {
                            false
                        }
                    }
            }
            OutboxStatus::Claimed => {
                has_claim
                    && self.attempts < self.max_attempts
                    && self
                        .claim_expires_at_ms
                        .is_some_and(|expires_at| expires_at > self.updated_at_ms)
                    && self.result_hash.is_none()
                    && failure_fields_match
                    && match self.last_failure_class {
                        None => self.attempts == 0,
                        Some(OutboxFailureClass::Transient) => self.attempts > 0,
                        Some(OutboxFailureClass::Fatal | OutboxFailureClass::EffectUnknown) => {
                            false
                        }
                    }
                    && self.retry_not_before_ms.is_none()
            }
            OutboxStatus::Delivered => {
                !has_claim
                    && self.result_hash.is_some()
                    && self.last_error_code.is_none()
                    && self.last_failure_class.is_none()
                    && self.retry_not_before_ms.is_none()
            }
            OutboxStatus::DeadLetter => {
                !has_claim
                    && self.attempts > 0
                    && self.result_hash.is_none()
                    && self.last_error_code.is_some()
                    && matches!(
                        self.last_failure_class,
                        Some(OutboxFailureClass::Transient | OutboxFailureClass::Fatal)
                    )
                    && self.retry_not_before_ms.is_none()
            }
            OutboxStatus::EffectUnknown => {
                !has_claim
                    && self.attempts > 0
                    && self.result_hash.is_none()
                    && self.last_error_code.is_some()
                    && self.last_failure_class == Some(OutboxFailureClass::EffectUnknown)
                    && self.retry_not_before_ms.is_none()
            }
        };
        if valid {
            Ok(())
        } else {
            Err(OutboxError::InvalidStateInvariant)
        }
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

    fn validate_transition_time(&self, now_ms: u64) -> Result<(), OutboxError> {
        if now_ms < self.updated_at_ms {
            Err(OutboxError::NonMonotonicTimestamp)
        } else {
            Ok(())
        }
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
        self.verify_integrity()?;
        message.verify_state_invariants()?;
        if message.status != OutboxStatus::Pending
            || message.attempts != 0
            || message.last_failure_class.is_some()
            || message.retry_not_before_ms.is_some()
        {
            return Err(OutboxError::InvalidEnqueueState);
        }
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

    /// Claims a pending message through the closed lifecycle API.
    pub fn claim(
        &mut self,
        id: &OutboxMessageId,
        worker: ActorId,
        now_ms: u64,
        lease_ms: u64,
    ) -> Result<(), OutboxError> {
        self.verify_integrity()?;
        self.message_mut(id)?.claim(worker, now_ms, lease_ms)
    }

    /// Completes a claimed message through the closed lifecycle API.
    pub fn mark_delivered(
        &mut self,
        id: &OutboxMessageId,
        worker: &ActorId,
        result_hash: EvidenceHash,
        now_ms: u64,
    ) -> Result<(), OutboxError> {
        self.verify_integrity()?;
        self.message_mut(id)?
            .mark_delivered(worker, result_hash, now_ms)
    }

    /// Records a classified delivery failure through the closed lifecycle API.
    pub fn record_failure(
        &mut self,
        id: &OutboxMessageId,
        worker: &ActorId,
        failure_class: OutboxFailureClass,
        error_code: impl Into<String>,
        now_ms: u64,
    ) -> Result<(), OutboxError> {
        self.verify_integrity()?;
        self.message_mut(id)?
            .record_failure(worker, failure_class, error_code, now_ms)
    }

    /// Quarantines an expired, outcome-ambiguous claim.
    pub fn quarantine_expired_claim(
        &mut self,
        id: &OutboxMessageId,
        error_code: impl Into<String>,
        now_ms: u64,
    ) -> Result<(), OutboxError> {
        self.verify_integrity()?;
        self.message_mut(id)?
            .quarantine_expired_claim(error_code, now_ms)
    }

    fn message_mut(&mut self, id: &OutboxMessageId) -> Result<&mut OutboxMessage, OutboxError> {
        self.messages
            .get_mut(id)
            .ok_or(OutboxError::MessageNotFound)
    }

    /// Verifies every message and the complete idempotency secondary index.
    pub fn verify_integrity(&self) -> Result<(), OutboxError> {
        if self.messages.len() != self.idempotency_index.len() {
            return Err(OutboxError::CorruptIndex);
        }
        for (message_id, message) in &self.messages {
            if message_id != &message.id {
                return Err(OutboxError::CorruptMessageKey);
            }
            message.verify_state_invariants()?;
            if self.idempotency_index.get(&message.idempotency_key) != Some(message_id) {
                return Err(OutboxError::CorruptIndex);
            }
        }
        for (key, message_id) in &self.idempotency_index {
            let message = self
                .messages
                .get(message_id)
                .ok_or(OutboxError::CorruptIndex)?;
            if &message.idempotency_key != key {
                return Err(OutboxError::CorruptIndex);
            }
        }
        Ok(())
    }

    /// Iterates pending messages in stable identifier order.
    pub fn pending(&self) -> impl Iterator<Item = &OutboxMessage> {
        self.messages
            .values()
            .filter(|message| message.status == OutboxStatus::Pending)
    }

    /// Iterates pending messages whose retry delay has elapsed.
    pub fn pending_ready(&self, now_ms: u64) -> impl Iterator<Item = &OutboxMessage> {
        self.messages.values().filter(move |message| {
            message.status == OutboxStatus::Pending
                && message
                    .retry_not_before_ms
                    .is_none_or(|retry_at| now_ms >= retry_at)
        })
    }
}

/// Restricted mutation surface used by durable persistence adapters.
///
/// The wrapped [`Outbox`] is deliberately private: callers cannot replace it,
/// deserialize an arbitrary lifecycle, or obtain a mutable message reference.
/// Only closed transitions that preserve terminal states are exposed.
pub struct OutboxTransaction<'a> {
    outbox: &'a mut Outbox,
}

impl<'a> OutboxTransaction<'a> {
    pub(crate) const fn new(outbox: &'a mut Outbox) -> Self {
        Self { outbox }
    }

    /// Enqueues one new logical event or returns its existing identity.
    pub fn enqueue(&mut self, message: OutboxMessage) -> Result<EnqueueDecision, OutboxError> {
        self.outbox.enqueue(message)
    }

    /// Claims a pending message.
    pub fn claim(
        &mut self,
        id: &OutboxMessageId,
        worker: ActorId,
        now_ms: u64,
        lease_ms: u64,
    ) -> Result<(), OutboxError> {
        self.outbox.claim(id, worker, now_ms, lease_ms)
    }

    /// Marks an active claim delivered.
    pub fn mark_delivered(
        &mut self,
        id: &OutboxMessageId,
        worker: &ActorId,
        result_hash: EvidenceHash,
        now_ms: u64,
    ) -> Result<(), OutboxError> {
        self.outbox.mark_delivered(id, worker, result_hash, now_ms)
    }

    /// Records one classified delivery failure.
    pub fn record_failure(
        &mut self,
        id: &OutboxMessageId,
        worker: &ActorId,
        failure_class: OutboxFailureClass,
        error_code: impl Into<String>,
        now_ms: u64,
    ) -> Result<(), OutboxError> {
        self.outbox
            .record_failure(id, worker, failure_class, error_code, now_ms)
    }

    /// Quarantines an expired claim rather than redriving it.
    pub fn quarantine_expired_claim(
        &mut self,
        id: &OutboxMessageId,
        error_code: impl Into<String>,
        now_ms: u64,
    ) -> Result<(), OutboxError> {
        self.outbox.quarantine_expired_claim(id, error_code, now_ms)
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
    /// Lifecycle mutations may not move the durable clock backwards.
    #[error("outbox mutation timestamp precedes the current record timestamp")]
    NonMonotonicTimestamp,
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
    /// Expired claims may have applied their provider effect and require
    /// explicit quarantine/reconciliation instead of automatic redrive.
    #[error("outbox expired claim requires effect reconciliation")]
    ClaimReconciliationRequired,
    /// A claim cannot be quarantined before its exclusive lease expires.
    #[error("outbox claim remains active until {claim_expires_at_ms}")]
    ClaimStillActive {
        /// Exclusive lease expiry in Unix epoch milliseconds.
        claim_expires_at_ms: u64,
    },
    /// A transient failure is still inside its retry delay.
    #[error("outbox retry is not ready before {retry_not_before_ms}")]
    RetryNotReady {
        /// Earliest claim time in Unix epoch milliseconds.
        retry_not_before_ms: u64,
    },
    /// One idempotency key cannot identify different logical events.
    #[error("outbox idempotency key conflicts with an existing message")]
    IdempotencyConflict,
    /// Message identities are immutable and unique.
    #[error("outbox message id already exists")]
    MessageIdConflict,
    /// Enqueue only admits a newly constructed pristine pending record.
    #[error("outbox enqueue requires a pristine pending message")]
    InvalidEnqueueState,
    /// A closed lifecycle operation referenced an absent message.
    #[error("outbox message was not found")]
    MessageNotFound,
    /// The secondary index points to an absent message.
    #[error("outbox idempotency index is corrupt")]
    CorruptIndex,
    /// The primary map key differs from the stored immutable message id.
    #[error("outbox primary message key is corrupt")]
    CorruptMessageKey,
    /// Serialized lifecycle fields do not form an admitted state.
    #[error("outbox message state invariant is invalid")]
    InvalidStateInvariant,
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
    fn enqueue_should_reject_a_preclaimed_or_rewritten_lifecycle() {
        let mut preclaimed = message("outbox-1", "request-0001", json!({}));
        preclaimed
            .claim(worker(), 11, 10)
            .expect("fixture claim should pass");
        let mut outbox = Outbox::new();

        let error = outbox
            .enqueue(preclaimed)
            .expect_err("enqueue must only admit a pristine pending record");

        assert!(matches!(error, OutboxError::InvalidEnqueueState));
        assert!(outbox
            .get(&OutboxMessageId::new("outbox-1").expect("valid id"))
            .is_none());
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
            .record_failure(
                &worker(),
                OutboxFailureClass::Transient,
                "UPSTREAM_TIMEOUT",
                12,
            )
            .expect("first failure should requeue");
        let early_error = message
            .claim(worker(), 5_011, 10)
            .expect_err("retry must wait for the bounded delay");
        assert!(matches!(early_error, OutboxError::RetryNotReady { .. }));
        message
            .claim(worker(), 5_012, 10)
            .expect("second claim should pass");
        message
            .record_failure(
                &worker(),
                OutboxFailureClass::Transient,
                "UPSTREAM_TIMEOUT",
                5_013,
            )
            .expect("second failure should dead-letter");

        assert_eq!(message.status, OutboxStatus::DeadLetter);
        assert_eq!(
            message.last_failure_class,
            Some(OutboxFailureClass::Transient)
        );
        assert_eq!(message.retry_not_before_ms, None);
    }

    #[test]
    fn later_transient_retry_should_wait_thirty_seconds() {
        let mut message = OutboxMessage::new(
            OutboxMessageId::new("outbox-later-retry").expect("valid message id"),
            TaskId::new("gc-outbox-test").expect("valid task id"),
            IdempotencyKey::new("request-later-retry").expect("valid idempotency key"),
            "TASK_READY",
            json!({}),
            3,
            10,
        )
        .expect("valid outbox message");
        message.claim(worker(), 11, 10).expect("claim should pass");
        message
            .record_failure(
                &worker(),
                OutboxFailureClass::Transient,
                "UPSTREAM_TIMEOUT",
                12,
            )
            .expect("first failure should requeue");
        message
            .claim(worker(), 5_012, 10)
            .expect("first retry should pass after five seconds");
        message
            .record_failure(
                &worker(),
                OutboxFailureClass::Transient,
                "UPSTREAM_TIMEOUT",
                5_013,
            )
            .expect("second failure should requeue");

        assert!(matches!(
            message.claim(worker(), 35_012, 10),
            Err(OutboxError::RetryNotReady { .. })
        ));
        message
            .claim(worker(), 35_013, 10)
            .expect("later retry should pass after thirty seconds");
    }

    #[test]
    fn fatal_failure_should_dead_letter_without_retry() {
        let mut message = message("outbox-1", "request-0001", json!({}));
        message.claim(worker(), 11, 10).expect("claim should pass");

        message
            .record_failure(&worker(), OutboxFailureClass::Fatal, "POLICY_REJECTED", 12)
            .expect("fatal failure should be recorded");

        assert_eq!(message.status, OutboxStatus::DeadLetter);
        assert_eq!(message.attempts, 1);
        assert_eq!(message.retry_not_before_ms, None);
        assert!(matches!(
            message.claim(worker(), 13, 10),
            Err(OutboxError::InvalidStatus {
                status: OutboxStatus::DeadLetter
            })
        ));
    }

    #[test]
    fn effect_unknown_should_never_retry_automatically() {
        let mut message = message("outbox-1", "request-0001", json!({}));
        message.claim(worker(), 11, 10).expect("claim should pass");

        message
            .record_failure(
                &worker(),
                OutboxFailureClass::EffectUnknown,
                "ACK_TIMEOUT",
                12,
            )
            .expect("unknown effect should be recorded");

        assert_eq!(message.status, OutboxStatus::EffectUnknown);
        assert_eq!(message.retry_not_before_ms, None);
        assert!(matches!(
            message.claim(worker(), u64::MAX - 1, 1),
            Err(OutboxError::InvalidStatus {
                status: OutboxStatus::EffectUnknown
            })
        ));
    }

    #[test]
    fn pending_ready_should_hide_delayed_retries() {
        let mut outbox = Outbox::new();
        let id = OutboxMessageId::new("outbox-1").expect("valid id");
        outbox
            .enqueue(message("outbox-1", "request-0001", json!({})))
            .expect("enqueue should pass");
        outbox
            .claim(&id, worker(), 11, 10)
            .expect("claim should pass");
        outbox
            .record_failure(
                &id,
                &worker(),
                OutboxFailureClass::Transient,
                "UPSTREAM_TIMEOUT",
                12,
            )
            .expect("transient failure should requeue");

        assert_eq!(outbox.pending().count(), 1);
        assert_eq!(outbox.pending_ready(5_011).count(), 0);
        assert_eq!(outbox.pending_ready(5_012).count(), 1);
    }

    #[test]
    fn integrity_check_should_reject_corrupt_secondary_index() {
        let mut outbox = Outbox::new();
        outbox
            .enqueue(message("outbox-1", "request-0001", json!({})))
            .expect("enqueue should pass");
        outbox.idempotency_index.clear();

        let error = outbox
            .verify_integrity()
            .expect_err("missing index entry must fail closed");

        assert!(matches!(error, OutboxError::CorruptIndex));
    }

    #[test]
    fn expired_claim_should_require_terminal_effect_reconciliation() {
        let mut message = message("outbox-1", "request-0001", json!({}));
        message
            .claim(worker(), 10, 5)
            .expect("first claim should pass");

        let early_error = message
            .quarantine_expired_claim("LEASE_EXPIRED_UNKNOWN_EFFECT", 14)
            .expect_err("an active claim must not be quarantined");
        assert!(matches!(early_error, OutboxError::ClaimStillActive { .. }));
        let reclaim_error = message
            .claim(ActorId::new("worker-2").expect("valid worker"), 15, 5)
            .expect_err("an expired claim must not be redriven");
        assert!(matches!(
            reclaim_error,
            OutboxError::ClaimReconciliationRequired
        ));

        message
            .quarantine_expired_claim("LEASE_EXPIRED_UNKNOWN_EFFECT", 15)
            .expect("expired claim should enter terminal quarantine");

        assert_eq!(message.status, OutboxStatus::EffectUnknown);
        assert_eq!(message.attempts, 1);
        assert!(matches!(
            message.claim(worker(), 16, 5),
            Err(OutboxError::InvalidStatus {
                status: OutboxStatus::EffectUnknown
            })
        ));
    }

    #[test]
    fn restricted_transaction_should_preserve_terminal_effect_unknown() {
        let id = OutboxMessageId::new("outbox-terminal").expect("valid id");
        let mut outbox = Outbox::new();
        outbox
            .enqueue(message("outbox-terminal", "request-terminal", json!({})))
            .expect("enqueue should pass");
        outbox
            .claim(&id, worker(), 11, 10)
            .expect("claim should pass");
        outbox
            .record_failure(
                &id,
                &worker(),
                OutboxFailureClass::EffectUnknown,
                "ACK_TIMEOUT",
                12,
            )
            .expect("unknown effect should be recorded");

        let mut transaction = OutboxTransaction::new(&mut outbox);
        let error = transaction
            .claim(&id, worker(), 13, 10)
            .expect_err("terminal state must have no redrive transition");

        assert!(matches!(
            error,
            OutboxError::InvalidStatus {
                status: OutboxStatus::EffectUnknown
            }
        ));
        assert_eq!(
            outbox.get(&id).expect("message should remain").status(),
            OutboxStatus::EffectUnknown
        );
    }

    #[test]
    fn duplicate_enqueue_should_not_replace_terminal_effect_unknown() {
        let id = OutboxMessageId::new("outbox-terminal").expect("valid id");
        let mut outbox = Outbox::new();
        outbox
            .enqueue(message(
                "outbox-terminal",
                "request-terminal",
                json!({"effect": "one"}),
            ))
            .expect("enqueue should pass");
        outbox
            .claim(&id, worker(), 11, 10)
            .expect("claim should pass");
        outbox
            .record_failure(
                &id,
                &worker(),
                OutboxFailureClass::EffectUnknown,
                "ACK_TIMEOUT",
                12,
            )
            .expect("unknown effect should be recorded");

        let decision = outbox
            .enqueue(message(
                "outbox-replacement",
                "request-terminal",
                json!({"effect": "one"}),
            ))
            .expect("same logical event should deduplicate");

        assert_eq!(
            decision,
            EnqueueDecision::Duplicate {
                message_id: id.clone()
            }
        );
        assert_eq!(
            outbox
                .get(&id)
                .expect("terminal message should remain")
                .status(),
            OutboxStatus::EffectUnknown
        );
        assert!(outbox
            .get(&OutboxMessageId::new("outbox-replacement").expect("valid id"))
            .is_none());
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

    #[test]
    fn claim_overflow_should_not_partially_mutate_message() {
        let mut message = message("outbox-1", "request-0001", json!({}));
        let before = message.clone();

        let error = message
            .claim(worker(), u64::MAX, 1)
            .expect_err("overflowing lease must fail");

        assert!(matches!(error, OutboxError::TimestampOverflow));
        assert_eq!(message, before);
    }

    #[test]
    fn retry_overflow_should_not_partially_mutate_message() {
        let mut message = message("outbox-1", "request-0001", json!({}));
        message
            .claim(worker(), u64::MAX - 3, 3)
            .expect("bounded claim should pass");
        let before = message.clone();

        let error = message
            .record_failure(
                &worker(),
                OutboxFailureClass::Transient,
                "UPSTREAM_TIMEOUT",
                u64::MAX - 2,
            )
            .expect_err("overflowing retry delay must fail");

        assert!(matches!(error, OutboxError::TimestampOverflow));
        assert_eq!(message, before);
    }

    #[test]
    fn version_overflow_should_not_partially_complete_message() {
        let mut message = message("outbox-1", "request-0001", json!({}));
        message.claim(worker(), 11, 10).expect("claim should pass");
        message.version = u64::MAX;
        let before = message.clone();

        let error = message
            .mark_delivered(&worker(), EvidenceHash::genesis(), 12)
            .expect_err("overflowing version must fail");

        assert!(matches!(error, OutboxError::VersionOverflow));
        assert_eq!(message, before);
    }
}
