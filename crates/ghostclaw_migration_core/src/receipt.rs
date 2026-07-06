//! Receipt stores for append-only audit trails and tests.

use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};

use crate::error::Result;
use crate::schema::Receipt;

/// Append-only receipt storage boundary.
pub trait ReceiptStore {
    /// Appends one receipt.
    fn append(&mut self, receipt: &Receipt) -> Result<()>;

    /// Returns recent receipts in newest-first order.
    fn recent(&self, limit: usize) -> Result<Vec<Receipt>>;
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

    fn recent(&self, limit: usize) -> Result<Vec<Receipt>> {
        if !self.path.exists() {
            return Ok(Vec::new());
        }
        let file = OpenOptions::new().read(true).open(&self.path)?;
        let reader = BufReader::new(file);
        let mut receipts = Vec::new();
        for line in reader.lines() {
            let line = line?;
            if let Ok(receipt) = Receipt::from_json_line(&line) {
                receipts.push(receipt);
            }
        }
        receipts.reverse();
        receipts.truncate(limit);
        Ok(receipts)
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

    fn recent(&self, limit: usize) -> Result<Vec<Receipt>> {
        let mut recent = self.receipts.clone();
        recent.reverse();
        recent.truncate(limit);
        Ok(recent)
    }
}
