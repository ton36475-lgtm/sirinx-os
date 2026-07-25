//! Hash-chained, append-only call receipts (P098 Rev D, M3.5).
//!
//! One JSON object per line, following the existing append-only JSONL receipt
//! convention. Each record commits to its predecessor, so a deleted or edited
//! line breaks verification.
//!
//! Receipts carry no secrets: there is no field for an API key, and the request
//! body is never recorded — only the metadata M3.5 requires.

use std::fs::OpenOptions;
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

/// Genesis predecessor for the first receipt in a log.
pub const GENESIS_HASH: &str = "0000000000000000000000000000000000000000000000000000000000000000";

/// Terminal state of a single provider call.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Outcome {
    Ok,
    /// HTTP 200 with empty content after the single M2.4 retry.
    Empty,
    Error,
    Timeout,
    /// Blocked before egress by the redaction gate.
    DeniedRedaction,
    /// Refused because the pool breaker was open.
    BreakerOpen,
}

/// One provider call, committed to the chain.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Receipt {
    pub seq: u64,
    pub ts: String,
    pub provider: String,
    pub model_id: String,
    pub pool: String,
    pub tokens: u32,
    pub latency_ms: u64,
    pub outcome: Outcome,
    pub prev_hash: String,
    pub hash: String,
}

impl Receipt {
    /// Canonical pre-image: every field except `hash`, in a fixed order.
    fn preimage(&self) -> String {
        format!(
            "{}|{}|{}|{}|{}|{}|{}|{:?}|{}",
            self.seq,
            self.ts,
            self.provider,
            self.model_id,
            self.pool,
            self.tokens,
            self.latency_ms,
            self.outcome,
            self.prev_hash
        )
    }

    /// The hash this receipt's contents imply.
    pub fn compute_hash(&self) -> String {
        let mut h = Sha256::new();
        h.update(self.preimage().as_bytes());
        format!("{:x}", h.finalize())
    }

    /// Whether `hash` matches the contents.
    pub fn is_self_consistent(&self) -> bool {
        self.hash == self.compute_hash()
    }
}

/// What a call is asking to be recorded. `seq`, `prev_hash`, and `hash` are
/// assigned by the log, not the caller.
#[derive(Clone, Debug)]
pub struct ReceiptDraft {
    pub provider: String,
    pub model_id: String,
    pub pool: String,
    pub tokens: u32,
    pub latency_ms: u64,
    pub outcome: Outcome,
}

/// Append-only, hash-chained receipt log backed by a JSONL file.
#[derive(Debug)]
pub struct ReceiptLog {
    path: PathBuf,
    write_lock: Mutex<()>,
}

impl ReceiptLog {
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into(), write_lock: Mutex::new(()) }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Appends `draft`, chaining it to the current tail. Returns the committed receipt.
    pub fn append(&self, draft: ReceiptDraft) -> std::io::Result<Receipt> {
        let _guard = self.write_lock.lock().expect("receipt mutex poisoned");

        let tail = self.read_all()?.pop();
        let (seq, prev_hash) = match tail {
            Some(prev) => (prev.seq + 1, prev.hash),
            None => (0, GENESIS_HASH.to_string()),
        };

        let mut receipt = Receipt {
            seq,
            ts: now_iso8601(),
            provider: draft.provider,
            model_id: draft.model_id,
            pool: draft.pool,
            tokens: draft.tokens,
            latency_ms: draft.latency_ms,
            outcome: draft.outcome,
            prev_hash,
            hash: String::new(),
        };
        receipt.hash = receipt.compute_hash();

        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let mut f = OpenOptions::new().create(true).append(true).open(&self.path)?;
        writeln!(f, "{}", serde_json::to_string(&receipt)?)?;

        Ok(receipt)
    }

    /// All receipts, oldest first. Missing file reads as an empty log.
    pub fn read_all(&self) -> std::io::Result<Vec<Receipt>> {
        let f = match std::fs::File::open(&self.path) {
            Ok(f) => f,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
            Err(e) => return Err(e),
        };
        let mut out = Vec::new();
        for line in BufReader::new(f).lines() {
            let line = line?;
            if line.trim().is_empty() {
                continue;
            }
            match serde_json::from_str::<Receipt>(&line) {
                Ok(r) => out.push(r),
                Err(e) => tracing::warn!(error = %e, "skipping malformed receipt line"),
            }
        }
        Ok(out)
    }

    /// Verifies sequence, linkage, and per-record hashes end to end.
    pub fn verify_chain(&self) -> std::io::Result<Result<usize, ChainBreak>> {
        let receipts = self.read_all()?;
        let mut expected_prev = GENESIS_HASH.to_string();

        for (i, r) in receipts.iter().enumerate() {
            if r.seq != i as u64 {
                return Ok(Err(ChainBreak::Sequence { at: i, found: r.seq }));
            }
            if r.prev_hash != expected_prev {
                return Ok(Err(ChainBreak::Linkage { at: i }));
            }
            if !r.is_self_consistent() {
                return Ok(Err(ChainBreak::Tampered { at: i }));
            }
            expected_prev = r.hash.clone();
        }
        Ok(Ok(receipts.len()))
    }
}

/// Why a chain failed verification.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ChainBreak {
    /// A receipt's `seq` is out of order — a line was inserted or removed.
    Sequence { at: usize, found: u64 },
    /// A receipt does not point at its predecessor's hash.
    Linkage { at: usize },
    /// A receipt's contents no longer match its own hash.
    Tampered { at: usize },
}

fn now_iso8601() -> String {
    chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn draft(model: &str, outcome: Outcome) -> ReceiptDraft {
        ReceiptDraft {
            provider: "maxplus".into(),
            model_id: model.into(),
            pool: "VERIFY AT RUN TIME".into(),
            tokens: 64,
            latency_ms: 3610,
            outcome,
        }
    }

    fn temp_log(name: &str) -> ReceiptLog {
        let mut p = std::env::temp_dir();
        p.push(format!("ghostclaw-receipt-test-{name}-{}.jsonl", std::process::id()));
        let _ = std::fs::remove_file(&p);
        ReceiptLog::new(p)
    }

    #[test]
    fn first_receipt_chains_to_genesis() {
        let log = temp_log("genesis");
        let r = log.append(draft("glm-5.2", Outcome::Ok)).unwrap();
        assert_eq!(r.seq, 0);
        assert_eq!(r.prev_hash, GENESIS_HASH);
        assert!(r.is_self_consistent());
    }

    #[test]
    fn each_receipt_commits_to_its_predecessor() {
        let log = temp_log("chain");
        let a = log.append(draft("glm-5.2", Outcome::Ok)).unwrap();
        let b = log.append(draft("kimi-k3", Outcome::Ok)).unwrap();
        assert_eq!(b.seq, 1);
        assert_eq!(b.prev_hash, a.hash);
        assert_eq!(log.verify_chain().unwrap(), Ok(2));
    }

    #[test]
    fn receipts_carry_the_m3_5_fields() {
        let log = temp_log("fields");
        let r = log.append(draft("deepseek-v4-pro", Outcome::Empty)).unwrap();
        assert_eq!(r.model_id, "deepseek-v4-pro");
        assert_eq!(r.pool, "VERIFY AT RUN TIME");
        assert_eq!(r.tokens, 64);
        assert_eq!(r.latency_ms, 3610);
        assert_eq!(r.outcome, Outcome::Empty);
    }

    #[test]
    fn tampering_with_a_committed_receipt_breaks_verification() {
        let log = temp_log("tamper");
        log.append(draft("glm-5.2", Outcome::Ok)).unwrap();
        log.append(draft("kimi-k3", Outcome::Error)).unwrap();

        // Rewrite the second record's outcome, leaving its hash untouched.
        let mut all = log.read_all().unwrap();
        all[1].outcome = Outcome::Ok;
        let rewritten: Vec<String> =
            all.iter().map(|r| serde_json::to_string(r).unwrap()).collect();
        std::fs::write(log.path(), rewritten.join("\n") + "\n").unwrap();

        assert_eq!(log.verify_chain().unwrap(), Err(ChainBreak::Tampered { at: 1 }));
    }

    #[test]
    fn deleting_a_line_breaks_the_chain() {
        let log = temp_log("delete");
        log.append(draft("glm-5.2", Outcome::Ok)).unwrap();
        log.append(draft("kimi-k3", Outcome::Ok)).unwrap();
        log.append(draft("hy3", Outcome::Ok)).unwrap();

        let all = log.read_all().unwrap();
        // Drop the middle receipt.
        let kept = vec![
            serde_json::to_string(&all[0]).unwrap(),
            serde_json::to_string(&all[2]).unwrap(),
        ];
        std::fs::write(log.path(), kept.join("\n") + "\n").unwrap();

        assert!(log.verify_chain().unwrap().is_err(), "a removed line must not verify");
    }

    #[test]
    fn empty_log_verifies_as_zero() {
        let log = temp_log("empty");
        assert_eq!(log.verify_chain().unwrap(), Ok(0));
    }
}
