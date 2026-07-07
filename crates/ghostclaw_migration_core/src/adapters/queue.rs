//! Persistent pending queue adapter.
//!
//! The queue is JSONL and append-only for P086. It stores route intent only and
//! does not execute queued jobs.

use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};

use crate::adapters::traits::QueueAdapter;
use crate::error::Result;
use crate::schema::{escape_json, now_millis, RouteJob};

/// Detailed read result for a pending queue scan.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct QueueReadReport {
    /// Valid jobs parsed from the queue.
    pub jobs: Vec<RouteJob>,
    /// Number of non-empty lines that failed route-job parsing.
    pub invalid_lines: usize,
    /// Number of empty or whitespace-only lines skipped.
    pub skipped_empty_lines: usize,
    /// Number of append-only clear markers applied.
    pub clear_events: usize,
}

/// File-backed pending queue for route intents.
#[derive(Clone, Debug)]
pub struct FilePendingQueue {
    path: PathBuf,
}

impl FilePendingQueue {
    /// Creates a file-backed route intent queue.
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into() }
    }

    /// Returns the queue file path.
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Appends one route job.
    pub fn append(&self, job: &RouteJob) -> Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.path)?;
        writeln!(file, "{}", job.to_json_line())?;
        Ok(())
    }

    /// Reads all valid route jobs in insertion order.
    pub fn read_all(&self) -> Result<Vec<RouteJob>> {
        self.read_report().map(|report| report.jobs)
    }

    /// Reads queue contents and reports malformed lines without executing jobs.
    pub fn read_report(&self) -> Result<QueueReadReport> {
        if !self.path.exists() {
            return Ok(QueueReadReport {
                jobs: Vec::new(),
                invalid_lines: 0,
                skipped_empty_lines: 0,
                clear_events: 0,
            });
        }
        let file = OpenOptions::new().read(true).open(&self.path)?;
        let reader = BufReader::new(file);
        let mut jobs = Vec::new();
        let mut invalid_lines = 0;
        let mut skipped_empty_lines = 0;
        let mut clear_events = 0;
        for line in reader.lines() {
            let line = line?;
            if line.trim().is_empty() {
                skipped_empty_lines += 1;
                continue;
            }
            if is_clear_marker(&line) {
                jobs.clear();
                clear_events += 1;
                continue;
            }
            if let Ok(job) = RouteJob::from_json_line(&line) {
                jobs.push(job);
            } else {
                invalid_lines += 1;
            }
        }
        Ok(QueueReadReport {
            jobs,
            invalid_lines,
            skipped_empty_lines,
            clear_events,
        })
    }

    /// Appends a local-only clear marker without truncating queue history.
    pub fn clear_local_only(&self, reason: &str) -> Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.path)?;
        writeln!(
            file,
            "{{\"type\":\"clear_pending_local_only\",\"reason\":\"{}\",\"created_at_ms\":{}}}",
            escape_json(reason),
            now_millis()
        )?;
        Ok(())
    }
}

impl QueueAdapter for FilePendingQueue {
    fn enqueue(&self, job: &RouteJob) -> Result<()> {
        self.append(job)
    }

    fn list(&self) -> Result<QueueReadReport> {
        self.read_report()
    }

    fn clear_pending_local_only(&self, reason: &str) -> Result<()> {
        self.clear_local_only(reason)
    }
}

fn is_clear_marker(line: &str) -> bool {
    line.contains("\"type\":\"clear_pending_local_only\"")
}
