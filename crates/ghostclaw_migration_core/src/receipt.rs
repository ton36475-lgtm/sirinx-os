//! Receipt stores for append-only audit trails and tests.

use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};

use crate::error::Result;
use crate::schema::Receipt;

/// Corruption-aware result for an append-only receipt scan.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReceiptReadReport {
    /// Valid receipts in newest-first order, bounded by the requested limit.
    pub receipts: Vec<Receipt>,
    /// Non-empty lines that did not satisfy the receipt schema.
    pub invalid_lines: usize,
    /// Empty or whitespace-only lines skipped during the scan.
    pub skipped_empty_lines: usize,
}

/// Append-only receipt storage boundary.
pub trait ReceiptStore {
    /// Appends one receipt.
    fn append(&mut self, receipt: &Receipt) -> Result<()>;

    /// Returns recent receipts plus integrity metadata.
    fn recent_report(&self, limit: usize) -> Result<ReceiptReadReport>;

    /// Returns recent receipts in newest-first order.
    fn recent(&self, limit: usize) -> Result<Vec<Receipt>> {
        self.recent_report(limit).map(|report| report.receipts)
    }
}

/// File-backed JSONL receipt store.
#[derive(Clone, Debug)]
pub struct FileReceiptStore {
    path: PathBuf,
}

impl FileReceiptStore {
    /// Creates a file-backed receipt store.
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into() }
    }

    /// Returns the receipt path.
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Scans the append-only receipt file without hiding malformed records.
    pub fn read_report(&self, limit: usize) -> Result<ReceiptReadReport> {
        if !self.path.exists() {
            return Ok(ReceiptReadReport {
                receipts: Vec::new(),
                invalid_lines: 0,
                skipped_empty_lines: 0,
            });
        }
        let file = OpenOptions::new().read(true).open(&self.path)?;
        let reader = BufReader::new(file);
        let mut receipts = Vec::new();
        let mut invalid_lines = 0;
        let mut skipped_empty_lines = 0;
        for line in reader.lines() {
            let line = line?;
            if line.trim().is_empty() {
                skipped_empty_lines += 1;
            } else if let Ok(receipt) = Receipt::from_json_line(&line) {
                receipts.push(receipt);
            } else {
                invalid_lines += 1;
            }
        }
        receipts.reverse();
        receipts.truncate(limit);
        Ok(ReceiptReadReport {
            receipts,
            invalid_lines,
            skipped_empty_lines,
        })
    }
}

impl ReceiptStore for FileReceiptStore {
    fn append(&mut self, receipt: &Receipt) -> Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.path)?;
        writeln!(file, "{}", receipt.to_json_line())?;
        Ok(())
    }

    fn recent_report(&self, limit: usize) -> Result<ReceiptReadReport> {
        self.read_report(limit)
    }
}

/// In-memory receipt store for unit and parity tests.
#[derive(Clone, Debug, Default)]
pub struct MemoryReceiptStore {
    receipts: Vec<Receipt>,
}

impl MemoryReceiptStore {
    /// Returns an immutable view of stored receipts.
    pub fn all(&self) -> &[Receipt] {
        &self.receipts
    }
}

impl ReceiptStore for MemoryReceiptStore {
    fn append(&mut self, receipt: &Receipt) -> Result<()> {
        self.receipts.push(receipt.clone());
        Ok(())
    }

    fn recent_report(&self, limit: usize) -> Result<ReceiptReadReport> {
        let mut recent = self.receipts.clone();
        recent.reverse();
        recent.truncate(limit);
        Ok(ReceiptReadReport {
            receipts: recent,
            invalid_lines: 0,
            skipped_empty_lines: 0,
        })
    }
}
