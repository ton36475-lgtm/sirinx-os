//! Canonical SHA-256 receipt chaining.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::{ActorId, CorrelationId, EvidenceHash, TaskId, TaskState};

/// Current transition-receipt wire schema.
pub const RECEIPT_SCHEMA_VERSION: &str = "hermes.transition-receipt.v1";

/// Computes a domain-separated SHA-256 digest over length-prefixed fields.
///
/// Length framing prevents ambiguous concatenations such as `(ab, c)` and
/// `(a, bc)` from sharing a preimage.
#[must_use]
pub fn hash_bytes(domain: &[u8], fields: &[&[u8]]) -> EvidenceHash {
    let mut hasher = Sha256::new();
    update_framed(&mut hasher, domain);
    for field in fields {
        update_framed(&mut hasher, field);
    }
    EvidenceHash::from_bytes(hasher.finalize().into())
}

fn update_framed(hasher: &mut Sha256, value: &[u8]) {
    hasher.update((value.len() as u64).to_be_bytes());
    hasher.update(value);
}

/// Produces deterministic JSON bytes by recursively ordering object keys.
///
/// The representation is used exclusively for internal receipt hashing. It is
/// stable across host and `wasm32` targets and includes the complete payload.
pub fn canonical_json_bytes(value: &serde_json::Value) -> Result<Vec<u8>, serde_json::Error> {
    let mut output = Vec::new();
    write_canonical_json(value, &mut output)?;
    Ok(output)
}

fn write_canonical_json(
    value: &serde_json::Value,
    output: &mut Vec<u8>,
) -> Result<(), serde_json::Error> {
    match value {
        serde_json::Value::Null => output.extend_from_slice(b"null"),
        serde_json::Value::Bool(value) => output.extend_from_slice(value.to_string().as_bytes()),
        serde_json::Value::Number(value) => {
            output.extend_from_slice(value.to_string().as_bytes());
        }
        serde_json::Value::String(value) => {
            serde_json::to_writer(&mut *output, value)?;
        }
        serde_json::Value::Array(values) => {
            output.push(b'[');
            for (index, item) in values.iter().enumerate() {
                if index > 0 {
                    output.push(b',');
                }
                write_canonical_json(item, output)?;
            }
            output.push(b']');
        }
        serde_json::Value::Object(values) => {
            output.push(b'{');
            let ordered: BTreeMap<&str, &serde_json::Value> = values
                .iter()
                .map(|(key, value)| (key.as_str(), value))
                .collect();
            for (index, (key, item)) in ordered.iter().enumerate() {
                if index > 0 {
                    output.push(b',');
                }
                serde_json::to_writer(&mut *output, key)?;
                output.push(b':');
                write_canonical_json(item, output)?;
            }
            output.push(b'}');
        }
    }
    Ok(())
}

#[derive(Serialize)]
#[serde(deny_unknown_fields)]
struct UnsignedTransitionReceipt<'a> {
    schema_version: &'a str,
    sequence: u64,
    task_id: &'a TaskId,
    correlation_id: &'a CorrelationId,
    from_state: TaskState,
    to_state: TaskState,
    actor: &'a ActorId,
    occurred_at_ms: u64,
    previous_hash: &'a EvidenceHash,
    payload: &'a serde_json::Value,
}

/// Immutable evidence for one task-state transition.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct TransitionReceipt {
    /// Wire schema used to derive the hash.
    pub schema_version: String,
    /// One-based position within a task receipt chain.
    pub sequence: u64,
    /// Task that changed state.
    pub task_id: TaskId,
    /// Correlation identifier shared by the task.
    pub correlation_id: CorrelationId,
    /// State before the transition.
    pub from_state: TaskState,
    /// State after the transition.
    pub to_state: TaskState,
    /// Actor responsible for the transition.
    pub actor: ActorId,
    /// Caller-supplied Unix epoch timestamp in milliseconds.
    pub occurred_at_ms: u64,
    /// Digest of the preceding receipt, or the domain genesis digest.
    pub previous_hash: EvidenceHash,
    /// Complete canonicalized transition payload.
    pub payload: serde_json::Value,
    /// SHA-256 digest of every preceding field.
    pub evidence_hash: EvidenceHash,
}

impl TransitionReceipt {
    /// Creates and hashes an immutable transition receipt.
    #[expect(
        clippy::too_many_arguments,
        reason = "receipt fields form the audited wire contract"
    )]
    pub fn new(
        sequence: u64,
        task_id: TaskId,
        correlation_id: CorrelationId,
        from_state: TaskState,
        to_state: TaskState,
        actor: ActorId,
        occurred_at_ms: u64,
        previous_hash: EvidenceHash,
        payload: serde_json::Value,
    ) -> Result<Self, ReceiptError> {
        if sequence == 0 {
            return Err(ReceiptError::InvalidSequence { sequence });
        }
        let mut receipt = Self {
            schema_version: RECEIPT_SCHEMA_VERSION.to_owned(),
            sequence,
            task_id,
            correlation_id,
            from_state,
            to_state,
            actor,
            occurred_at_ms,
            previous_hash,
            payload,
            evidence_hash: EvidenceHash::genesis(),
        };
        receipt.evidence_hash = receipt.compute_hash()?;
        Ok(receipt)
    }

    /// Recomputes the receipt digest from the canonical unsigned payload.
    pub fn compute_hash(&self) -> Result<EvidenceHash, ReceiptError> {
        if self.schema_version != RECEIPT_SCHEMA_VERSION {
            return Err(ReceiptError::UnsupportedSchema {
                found: self.schema_version.clone(),
            });
        }
        let unsigned = UnsignedTransitionReceipt {
            schema_version: &self.schema_version,
            sequence: self.sequence,
            task_id: &self.task_id,
            correlation_id: &self.correlation_id,
            from_state: self.from_state,
            to_state: self.to_state,
            actor: &self.actor,
            occurred_at_ms: self.occurred_at_ms,
            previous_hash: &self.previous_hash,
            payload: &self.payload,
        };
        let value = serde_json::to_value(unsigned).map_err(ReceiptError::Serialization)?;
        Ok(hash_bytes(
            b"hermes.transition-receipt.v1",
            &[&canonical_json_bytes(&value).map_err(ReceiptError::Serialization)?],
        ))
    }

    /// Verifies that the stored digest matches all receipt fields.
    pub fn verify_hash(&self) -> Result<(), ReceiptError> {
        let computed = self.compute_hash()?;
        if computed != self.evidence_hash {
            return Err(ReceiptError::HashMismatch {
                sequence: self.sequence,
            });
        }
        Ok(())
    }
}

/// Append-only transition receipt chain for one task.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct ReceiptChain {
    receipts: Vec<TransitionReceipt>,
}

impl ReceiptChain {
    /// Creates an empty chain.
    #[must_use]
    pub const fn new() -> Self {
        Self {
            receipts: Vec::new(),
        }
    }

    /// Returns all receipts in chain order.
    #[must_use]
    pub fn receipts(&self) -> &[TransitionReceipt] {
        &self.receipts
    }

    /// Returns the digest to use as the predecessor of the next receipt.
    #[must_use]
    pub fn head_hash(&self) -> EvidenceHash {
        self.receipts
            .last()
            .map_or_else(EvidenceHash::genesis, |receipt| {
                receipt.evidence_hash.clone()
            })
    }

    /// Returns the next one-based sequence number.
    #[must_use]
    pub fn next_sequence(&self) -> u64 {
        self.receipts.len() as u64 + 1
    }

    /// Appends a receipt only when its sequence, predecessor, identity, and
    /// digest match the existing chain.
    pub fn append(&mut self, receipt: TransitionReceipt) -> Result<(), ReceiptError> {
        receipt.verify_hash()?;
        let expected_sequence = self.next_sequence();
        if receipt.sequence != expected_sequence {
            return Err(ReceiptError::UnexpectedSequence {
                expected: expected_sequence,
                actual: receipt.sequence,
            });
        }
        let expected_previous = self.head_hash();
        if receipt.previous_hash != expected_previous {
            return Err(ReceiptError::PreviousHashMismatch {
                sequence: receipt.sequence,
            });
        }
        if let Some(first) = self.receipts.first() {
            if receipt.task_id != first.task_id || receipt.correlation_id != first.correlation_id {
                return Err(ReceiptError::IdentityMismatch {
                    sequence: receipt.sequence,
                });
            }
        }
        if let Some(previous) = self.receipts.last() {
            if receipt.occurred_at_ms < previous.occurred_at_ms {
                return Err(ReceiptError::TimestampRegression {
                    sequence: receipt.sequence,
                });
            }
            if receipt.from_state != previous.to_state {
                return Err(ReceiptError::StateDiscontinuity {
                    sequence: receipt.sequence,
                });
            }
        }
        self.receipts.push(receipt);
        Ok(())
    }

    /// Verifies every receipt and cascade link from genesis to head.
    pub fn verify(&self) -> Result<(), ReceiptError> {
        let mut previous_hash = EvidenceHash::genesis();
        let mut previous_receipt: Option<&TransitionReceipt> = None;
        for (index, receipt) in self.receipts.iter().enumerate() {
            let expected_sequence = index as u64 + 1;
            if receipt.sequence != expected_sequence {
                return Err(ReceiptError::UnexpectedSequence {
                    expected: expected_sequence,
                    actual: receipt.sequence,
                });
            }
            if receipt.previous_hash != previous_hash {
                return Err(ReceiptError::PreviousHashMismatch {
                    sequence: receipt.sequence,
                });
            }
            receipt.verify_hash()?;
            if let Some(previous) = previous_receipt {
                if receipt.task_id != previous.task_id
                    || receipt.correlation_id != previous.correlation_id
                {
                    return Err(ReceiptError::IdentityMismatch {
                        sequence: receipt.sequence,
                    });
                }
                if receipt.from_state != previous.to_state {
                    return Err(ReceiptError::StateDiscontinuity {
                        sequence: receipt.sequence,
                    });
                }
                if receipt.occurred_at_ms < previous.occurred_at_ms {
                    return Err(ReceiptError::TimestampRegression {
                        sequence: receipt.sequence,
                    });
                }
            }
            previous_hash = receipt.evidence_hash.clone();
            previous_receipt = Some(receipt);
        }
        Ok(())
    }
}

/// Receipt construction and integrity error.
#[derive(Debug, thiserror::Error)]
pub enum ReceiptError {
    /// Sequence zero is never valid.
    #[error("invalid receipt sequence {sequence}")]
    InvalidSequence { sequence: u64 },
    /// The stored schema is not understood by this implementation.
    #[error("unsupported receipt schema `{found}`")]
    UnsupportedSchema { found: String },
    /// Serialization of the strict unsigned receipt failed.
    #[error("failed to serialize transition receipt: {0}")]
    Serialization(serde_json::Error),
    /// The receipt contents were altered after hashing.
    #[error("receipt hash mismatch at sequence {sequence}")]
    HashMismatch { sequence: u64 },
    /// Receipt order contains a gap or duplicate.
    #[error("expected receipt sequence {expected}, received {actual}")]
    UnexpectedSequence { expected: u64, actual: u64 },
    /// A receipt does not reference the current chain head.
    #[error("previous hash mismatch at sequence {sequence}")]
    PreviousHashMismatch { sequence: u64 },
    /// A chain contains receipts for different task identities.
    #[error("task or correlation identity mismatch at sequence {sequence}")]
    IdentityMismatch { sequence: u64 },
    /// Receipt time moved backwards.
    #[error("receipt timestamp regressed at sequence {sequence}")]
    TimestampRegression { sequence: u64 },
    /// Adjacent receipts do not form a continuous state history.
    #[error("state discontinuity at sequence {sequence}")]
    StateDiscontinuity { sequence: u64 },
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn receipt(
        sequence: u64,
        from_state: TaskState,
        to_state: TaskState,
        previous_hash: EvidenceHash,
        payload: serde_json::Value,
    ) -> TransitionReceipt {
        TransitionReceipt::new(
            sequence,
            TaskId::new("gc-hash-test").expect("valid task id"),
            CorrelationId::new("corr-hash-test").expect("valid correlation id"),
            from_state,
            to_state,
            ActorId::new("checker").expect("valid actor"),
            sequence * 100,
            previous_hash,
            payload,
        )
        .expect("valid receipt")
    }

    #[test]
    fn canonical_json_should_ignore_object_insertion_order() {
        let left = json!({"z": 2, "a": {"y": 1, "b": 0}});
        let right = json!({"a": {"b": 0, "y": 1}, "z": 2});

        assert_eq!(
            canonical_json_bytes(&left).expect("left should serialize"),
            canonical_json_bytes(&right).expect("right should serialize")
        );
    }

    #[test]
    fn receipt_hash_should_include_complete_payload() {
        let previous = EvidenceHash::genesis();
        let first = receipt(
            1,
            TaskState::Intake,
            TaskState::Triage,
            previous.clone(),
            json!({"scope": ["a"]}),
        );
        let second = receipt(
            1,
            TaskState::Intake,
            TaskState::Triage,
            previous,
            json!({"scope": ["b"]}),
        );

        assert_ne!(first.evidence_hash, second.evidence_hash);
    }

    #[test]
    fn chain_should_detect_payload_tampering() {
        let mut chain = ReceiptChain::new();
        let mut first = receipt(
            1,
            TaskState::Intake,
            TaskState::Triage,
            EvidenceHash::genesis(),
            json!({"approved": false}),
        );
        first.payload = json!({"approved": true});

        let error = chain.append(first).expect_err("tampering must fail");

        assert!(matches!(error, ReceiptError::HashMismatch { sequence: 1 }));
    }

    #[test]
    fn chain_should_detect_cascade_break_after_previous_receipt_changes() {
        let first = receipt(
            1,
            TaskState::Intake,
            TaskState::Triage,
            EvidenceHash::genesis(),
            json!({}),
        );
        let second = receipt(
            2,
            TaskState::Triage,
            TaskState::Maker,
            first.evidence_hash.clone(),
            json!({}),
        );
        let mut chain = ReceiptChain::new();
        chain.append(first).expect("first receipt should append");
        chain.append(second).expect("second receipt should append");
        chain.receipts[0].actor = ActorId::new("tampered").expect("valid actor");

        let error = chain.verify().expect_err("cascade tampering must fail");

        assert!(matches!(error, ReceiptError::HashMismatch { sequence: 1 }));
    }

    #[test]
    fn chain_should_reject_wrong_predecessor() {
        let mut chain = ReceiptChain::new();
        let first = receipt(
            1,
            TaskState::Intake,
            TaskState::Triage,
            EvidenceHash::genesis(),
            json!({}),
        );
        chain.append(first).expect("first receipt should append");
        let second = receipt(
            2,
            TaskState::Triage,
            TaskState::Maker,
            EvidenceHash::genesis(),
            json!({}),
        );

        let error = chain
            .append(second)
            .expect_err("wrong predecessor must fail");

        assert!(matches!(
            error,
            ReceiptError::PreviousHashMismatch { sequence: 2 }
        ));
    }
}
