//! Append-only, cursor-based Hermes event feed.
//!
//! Transport adapters may expose these records over WebSockets, but this crate
//! contains no socket or network behavior.

use hermes_core::{canonical_json_bytes, hash_bytes, ActorId, EvidenceHash, TaskId};
use serde::{Deserialize, Serialize};

/// One immutable feed event linked to the preceding event hash.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct FeedEvent {
    /// One-based global feed sequence.
    pub sequence: u64,
    /// Related task.
    pub task_id: TaskId,
    /// Bounded uppercase event vocabulary.
    pub event_type: String,
    /// Actor emitting the event.
    pub actor: ActorId,
    /// Unix epoch timestamp in milliseconds.
    pub occurred_at_ms: u64,
    /// Complete event body.
    pub payload: serde_json::Value,
    /// Previous event digest, or feed genesis.
    pub previous_hash: EvidenceHash,
    /// Digest of all preceding fields.
    pub event_hash: EvidenceHash,
}

#[derive(Serialize)]
#[serde(deny_unknown_fields)]
struct UnsignedFeedEvent<'a> {
    sequence: u64,
    task_id: &'a TaskId,
    event_type: &'a str,
    actor: &'a ActorId,
    occurred_at_ms: u64,
    payload: &'a serde_json::Value,
    previous_hash: &'a EvidenceHash,
}

impl FeedEvent {
    /// Recomputes the event digest.
    pub fn compute_hash(&self) -> Result<EvidenceHash, FeedError> {
        validate_event_type(&self.event_type)?;
        let unsigned = UnsignedFeedEvent {
            sequence: self.sequence,
            task_id: &self.task_id,
            event_type: &self.event_type,
            actor: &self.actor,
            occurred_at_ms: self.occurred_at_ms,
            payload: &self.payload,
            previous_hash: &self.previous_hash,
        };
        let value = serde_json::to_value(unsigned)?;
        Ok(hash_bytes(
            b"hermes.feed-event.v1",
            &[&canonical_json_bytes(&value)?],
        ))
    }

    /// Verifies the stored event digest.
    pub fn verify_hash(&self) -> Result<(), FeedError> {
        if self.compute_hash()? != self.event_hash {
            return Err(FeedError::HashMismatch {
                sequence: self.sequence,
            });
        }
        Ok(())
    }
}

/// Stable cursor returned to feed clients.
#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct FeedCursor {
    /// Last sequence already observed; zero means genesis.
    pub after_sequence: u64,
}

/// Bounded page of events and the continuation cursor.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct FeedPage {
    /// Events in ascending sequence order.
    pub events: Vec<FeedEvent>,
    /// Cursor to use for the next page.
    pub next_cursor: FeedCursor,
}

/// In-memory reference implementation of the append-only feed.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Feed {
    events: Vec<FeedEvent>,
}

impl Feed {
    /// Maximum page size admitted by the domain contract.
    pub const MAX_PAGE_SIZE: usize = 200;

    /// Creates an empty feed.
    #[must_use]
    pub const fn new() -> Self {
        Self { events: Vec::new() }
    }

    /// Appends and hashes one event.
    pub fn append(
        &mut self,
        task_id: TaskId,
        event_type: impl Into<String>,
        actor: ActorId,
        occurred_at_ms: u64,
        payload: serde_json::Value,
    ) -> Result<FeedEvent, FeedError> {
        self.verify()?;
        let event_type = event_type.into();
        validate_event_type(&event_type)?;
        if let Some(previous) = self.events.last() {
            if occurred_at_ms < previous.occurred_at_ms {
                return Err(FeedError::TimestampRegression);
            }
        }
        let mut event = FeedEvent {
            sequence: self.events.len() as u64 + 1,
            task_id,
            event_type,
            actor,
            occurred_at_ms,
            payload,
            previous_hash: self
                .events
                .last()
                .map_or_else(feed_genesis, |event| event.event_hash.clone()),
            event_hash: feed_genesis(),
        };
        event.event_hash = event.compute_hash()?;
        self.events.push(event.clone());
        Ok(event)
    }

    /// Returns a bounded page after the supplied cursor.
    pub fn page(&self, cursor: FeedCursor, limit: usize) -> Result<FeedPage, FeedError> {
        if limit == 0 || limit > Self::MAX_PAGE_SIZE {
            return Err(FeedError::InvalidPageLimit);
        }
        if cursor.after_sequence > self.events.len() as u64 {
            return Err(FeedError::CursorOutOfRange);
        }
        let events: Vec<_> = self
            .events
            .iter()
            .skip(cursor.after_sequence as usize)
            .take(limit)
            .cloned()
            .collect();
        let next_cursor = FeedCursor {
            after_sequence: events
                .last()
                .map_or(cursor.after_sequence, |event| event.sequence),
        };
        Ok(FeedPage {
            events,
            next_cursor,
        })
    }

    /// Verifies sequence, time, predecessor, and every event hash.
    pub fn verify(&self) -> Result<(), FeedError> {
        let mut previous_hash = feed_genesis();
        let mut previous_time = 0;
        for (index, event) in self.events.iter().enumerate() {
            let expected_sequence = index as u64 + 1;
            if event.sequence != expected_sequence {
                return Err(FeedError::UnexpectedSequence {
                    expected: expected_sequence,
                    actual: event.sequence,
                });
            }
            if event.previous_hash != previous_hash {
                return Err(FeedError::PreviousHashMismatch {
                    sequence: event.sequence,
                });
            }
            if event.occurred_at_ms < previous_time {
                return Err(FeedError::TimestampRegression);
            }
            event.verify_hash()?;
            previous_hash = event.event_hash.clone();
            previous_time = event.occurred_at_ms;
        }
        Ok(())
    }
}

fn feed_genesis() -> EvidenceHash {
    hash_bytes(b"hermes.feed.genesis.v1", &[])
}

fn validate_event_type(value: &str) -> Result<(), FeedError> {
    if value.is_empty()
        || value.len() > 128
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_uppercase() || byte.is_ascii_digit() || byte == b'_')
    {
        return Err(FeedError::InvalidEventType);
    }
    Ok(())
}

/// Feed integrity or cursor validation error.
#[derive(Debug, thiserror::Error)]
pub enum FeedError {
    /// Event type is outside the bounded wire vocabulary.
    #[error("invalid feed event type")]
    InvalidEventType,
    /// Event time moved backwards.
    #[error("feed timestamp regressed")]
    TimestampRegression,
    /// Page size is zero or above the bounded maximum.
    #[error("feed page limit is invalid")]
    InvalidPageLimit,
    /// Cursor points beyond the current feed head.
    #[error("feed cursor is out of range")]
    CursorOutOfRange,
    /// Feed sequence contains a gap or duplicate.
    #[error("expected feed sequence {expected}, found {actual}")]
    UnexpectedSequence {
        /// Expected position.
        expected: u64,
        /// Stored position.
        actual: u64,
    },
    /// Feed cascade does not reference the current head.
    #[error("feed previous hash mismatch at sequence {sequence}")]
    PreviousHashMismatch {
        /// Broken sequence.
        sequence: u64,
    },
    /// Stored event hash does not match its fields.
    #[error("feed event hash mismatch at sequence {sequence}")]
    HashMismatch {
        /// Altered sequence.
        sequence: u64,
    },
    /// Strict event serialization failed.
    #[error("failed to serialize feed evidence: {0}")]
    Serialization(#[from] serde_json::Error),
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn task() -> TaskId {
        TaskId::new("gc-feed-test").expect("valid task")
    }

    fn actor() -> ActorId {
        ActorId::new("feed-worker").expect("valid actor")
    }

    #[test]
    fn feed_should_verify_append_only_chain() {
        let mut feed = Feed::new();
        feed.append(task(), "TASK_CREATED", actor(), 10, json!({}))
            .expect("first event should append");
        feed.append(task(), "TASK_READY", actor(), 11, json!({"ready": true}))
            .expect("second event should append");

        assert!(feed.verify().is_ok());
    }

    #[test]
    fn feed_should_detect_payload_tampering() {
        let mut feed = Feed::new();
        feed.append(task(), "TASK_CREATED", actor(), 10, json!({}))
            .expect("event should append");
        feed.events[0].payload = json!({"tampered": true});

        let error = feed.verify().expect_err("tampering must fail");

        assert!(matches!(error, FeedError::HashMismatch { sequence: 1 }));
    }

    #[test]
    fn feed_page_should_use_stable_cursor() {
        let mut feed = Feed::new();
        feed.append(task(), "TASK_CREATED", actor(), 10, json!({}))
            .expect("first event should append");
        feed.append(task(), "TASK_READY", actor(), 11, json!({}))
            .expect("second event should append");

        let page = feed
            .page(FeedCursor::default(), 1)
            .expect("page should pass");

        assert_eq!(page.next_cursor.after_sequence, 1);
    }

    #[test]
    fn feed_should_reject_unbounded_page() {
        let feed = Feed::new();

        let error = feed
            .page(FeedCursor::default(), Feed::MAX_PAGE_SIZE + 1)
            .expect_err("oversized page must fail");

        assert!(matches!(error, FeedError::InvalidPageLimit));
    }
}
