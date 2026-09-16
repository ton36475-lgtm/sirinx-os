//! Local adapter response bundles for review packets.
//!
//! A bundle combines the dry-run artifacts created by adapter boundaries. It is
//! a review surface only and does not execute queued work.

use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};

use crate::adapters::codex::CodexDryRunPreview;
use crate::adapters::lease::LeaseDecision;
use crate::adapters::telegram::TelegramReplyPreview;
use crate::adapters::validator::ValidatorResult;
use crate::error::{MigrationError, Result};
use crate::schema::{escape_json, Receipt, RouteJob};

/// Receipt metadata included in adapter response bundles.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReceiptMetadata {
    /// Receipt id.
    pub id: String,
    /// Command kind recorded by the core engine.
    pub command_kind: String,
    /// Receipt status.
    pub status: String,
    /// Unix timestamp in milliseconds.
    pub created_at_ms: u128,
}

impl ReceiptMetadata {
    /// Copies non-sensitive receipt metadata into a bundle-safe shape.
    pub fn from_receipt(receipt: &Receipt) -> Self {
        Self {
            id: receipt.id.clone(),
            command_kind: receipt.command_kind.clone(),
            status: receipt.status.clone(),
            created_at_ms: receipt.created_at_ms,
        }
    }

    /// Serializes receipt metadata to compact JSON.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"id\":\"{}\",\"command_kind\":\"{}\",\"status\":\"{}\",\"created_at_ms\":{}}}",
            escape_json(&self.id),
            escape_json(&self.command_kind),
            escape_json(&self.status),
            self.created_at_ms
        )
    }
}

/// Compact summary of a bundle read from JSONL storage.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PersistedBundleSummary {
    /// Packet id for the A2A2A gate.
    pub packet_id: String,
    /// Bundle status.
    pub status: String,
    /// Whether the stored bundle claims live execution happened.
    pub live_execution: bool,
}

impl PersistedBundleSummary {
    /// Parses the stable top-level fields from a bundle JSON line.
    pub fn from_json_line(line: &str) -> Option<Self> {
        if !line.contains("\"bundle_kind\":\"adapter_response_bundle\"") {
            return None;
        }
        Some(Self {
            packet_id: extract_string(line, "packet_id")?,
            status: extract_string(line, "status")?,
            live_execution: extract_bool(line, "live_execution")?,
        })
    }

    /// Serializes the summary to compact JSON.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"packet_id\":\"{}\",\"status\":\"{}\",\"live_execution\":{}}}",
            escape_json(&self.packet_id),
            escape_json(&self.status),
            self.live_execution
        )
    }
}

/// Detailed read result for a persisted bundle JSONL scan.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BundleReadReport {
    /// Valid bundle summaries parsed from storage.
    pub bundles: Vec<PersistedBundleSummary>,
    /// Number of non-empty malformed lines.
    pub invalid_lines: usize,
    /// Number of empty or whitespace-only lines skipped.
    pub skipped_empty_lines: usize,
}

impl BundleReadReport {
    /// Serializes the read report to compact JSON.
    pub fn to_json(&self) -> String {
        let bundles = self
            .bundles
            .iter()
            .map(PersistedBundleSummary::to_json)
            .collect::<Vec<_>>()
            .join(",");
        format!(
            "{{\"bundles\":[{}],\"invalid_lines\":{},\"skipped_empty_lines\":{}}}",
            bundles, self.invalid_lines, self.skipped_empty_lines
        )
    }
}

/// Read-only result for choosing the next safe review bundle.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BundleSelection {
    /// Selection status.
    pub status: String,
    /// Selected bundle summary, if any.
    pub selected: Option<PersistedBundleSummary>,
    /// Valid bundles rejected before selection or because none were ready.
    pub rejected_count: usize,
    /// Malformed lines observed during the source read.
    pub invalid_lines: usize,
    /// Empty lines observed during the source read.
    pub skipped_empty_lines: usize,
    /// Stable machine-readable reason for the decision.
    pub reason: String,
}

impl BundleSelection {
    /// Serializes the selection decision to compact JSON.
    pub fn to_json(&self) -> String {
        let selected = self
            .selected
            .as_ref()
            .map(PersistedBundleSummary::to_json)
            .unwrap_or_else(|| "null".to_string());
        format!(
            "{{\"status\":\"{}\",\"selected\":{},\"rejected_count\":{},\"invalid_lines\":{},\"skipped_empty_lines\":{},\"reason\":\"{}\"}}",
            escape_json(&self.status),
            selected,
            self.rejected_count,
            self.invalid_lines,
            self.skipped_empty_lines,
            escape_json(&self.reason)
        )
    }
}

/// Selects the first ready bundle that did not perform live execution.
pub fn select_next_ready_bundle(report: &BundleReadReport) -> BundleSelection {
    let mut rejected_count = 0;
    for bundle in &report.bundles {
        if bundle.status == "ready_for_review" && !bundle.live_execution {
            return BundleSelection {
                status: "selected".to_string(),
                selected: Some(bundle.clone()),
                rejected_count,
                invalid_lines: report.invalid_lines,
                skipped_empty_lines: report.skipped_empty_lines,
                reason: "ready_for_review_bundle_found".to_string(),
            };
        }
        rejected_count += 1;
    }

    BundleSelection {
        status: "none_ready".to_string(),
        selected: None,
        rejected_count,
        invalid_lines: report.invalid_lines,
        skipped_empty_lines: report.skipped_empty_lines,
        reason: no_selection_reason(report),
    }
}

fn no_selection_reason(report: &BundleReadReport) -> String {
    if report.bundles.is_empty() && report.invalid_lines > 0 {
        "invalid_lines_present".to_string()
    } else {
        "no_ready_bundle".to_string()
    }
}

/// File-backed JSONL store for local adapter response bundles.
#[derive(Clone, Debug)]
pub struct FileBundleStore {
    path: PathBuf,
}

impl FileBundleStore {
    /// Creates a file-backed bundle store.
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into() }
    }

    /// Returns the bundle store path.
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Appends one local review bundle.
    pub fn append(&self, bundle: &AdapterResponseBundle) -> Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.path)?;
        writeln!(file, "{}", bundle.to_json())?;
        Ok(())
    }

    /// Reads all bundle summaries, failing closed when malformed records exist.
    pub fn read_all(&self) -> Result<Vec<PersistedBundleSummary>> {
        let report = self.read_report()?;
        if report.invalid_lines > 0 {
            return Err(MigrationError::CorruptStore {
                store: "bundle",
                invalid_lines: report.invalid_lines,
            });
        }
        Ok(report.bundles)
    }

    /// Reads bundle storage and reports malformed lines without executing work.
    pub fn read_report(&self) -> Result<BundleReadReport> {
        if !self.path.exists() {
            return Ok(BundleReadReport {
                bundles: Vec::new(),
                invalid_lines: 0,
                skipped_empty_lines: 0,
            });
        }
        let file = OpenOptions::new().read(true).open(&self.path)?;
        let reader = BufReader::new(file);
        let mut bundles = Vec::new();
        let mut invalid_lines = 0;
        let mut skipped_empty_lines = 0;
        for line in reader.lines() {
            let line = line?;
            if line.trim().is_empty() {
                skipped_empty_lines += 1;
                continue;
            }
            if let Some(summary) = PersistedBundleSummary::from_json_line(&line) {
                bundles.push(summary);
            } else {
                invalid_lines += 1;
            }
        }
        Ok(BundleReadReport {
            bundles,
            invalid_lines,
            skipped_empty_lines,
        })
    }
}

fn extract_string(line: &str, key: &str) -> Option<String> {
    let needle = format!("\"{key}\":\"");
    let start = line.find(&needle)? + needle.len();
    read_json_string_at(line, start)
}

fn extract_bool(line: &str, key: &str) -> Option<bool> {
    let needle = format!("\"{key}\":");
    let start = line.find(&needle)? + needle.len();
    let tail = &line[start..];
    if tail.starts_with("true") {
        Some(true)
    } else if tail.starts_with("false") {
        Some(false)
    } else {
        None
    }
}

fn read_json_string_at(line: &str, start: usize) -> Option<String> {
    let mut escaped = false;
    let mut output = String::new();
    for ch in line[start..].chars() {
        if escaped {
            match ch {
                'n' => output.push('\n'),
                'r' => output.push('\r'),
                't' => output.push('\t'),
                '\\' => output.push('\\'),
                '"' => output.push('"'),
                other => output.push(other),
            }
            escaped = false;
            continue;
        }
        match ch {
            '\\' => escaped = true,
            '"' => return Some(output),
            other => output.push(other),
        }
    }
    None
}

/// Review bundle assembled from local adapter outputs.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdapterResponseBundle {
    /// Packet id for the A2A2A gate.
    pub packet_id: String,
    /// Bundle status.
    pub status: String,
    /// Whether this bundle is dry-run only.
    pub dry_run: bool,
    /// Whether any live execution happened.
    pub live_execution: bool,
    /// Queued route intent.
    pub route_job: RouteJob,
    /// Path lease decision.
    pub lease_decision: LeaseDecision,
    /// Codex dry-run preview.
    pub codex_preview: CodexDryRunPreview,
    /// Telegram reply preview.
    pub telegram_reply_preview: TelegramReplyPreview,
    /// Deterministic validator result.
    pub validator_result: ValidatorResult,
    /// Receipt metadata.
    pub receipt: ReceiptMetadata,
}

impl AdapterResponseBundle {
    /// Creates a local review bundle from adapter outputs.
    pub fn new(
        packet_id: impl Into<String>,
        route_job: RouteJob,
        lease_decision: LeaseDecision,
        codex_preview: CodexDryRunPreview,
        telegram_reply_preview: TelegramReplyPreview,
        validator_result: ValidatorResult,
        receipt: &Receipt,
    ) -> Self {
        let live_execution = codex_preview.executed_live || telegram_reply_preview.live_send;
        let status =
            if lease_decision.allowed && validator_result.status == "pass" && !live_execution {
                "ready_for_review"
            } else {
                "blocked_or_failed"
            };

        Self {
            packet_id: packet_id.into(),
            status: status.to_string(),
            dry_run: true,
            live_execution,
            route_job,
            lease_decision,
            codex_preview,
            telegram_reply_preview,
            validator_result,
            receipt: ReceiptMetadata::from_receipt(receipt),
        }
    }

    /// Serializes the bundle to compact JSON for fixture parity and receipts.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"packet_id\":\"{}\",\"bundle_kind\":\"adapter_response_bundle\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"route_job\":{},\"lease_decision\":{},\"codex_preview\":{},\"telegram_reply_preview\":{},\"validator_result\":{},\"receipt\":{}}}",
            escape_json(&self.packet_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            self.route_job.to_json_line(),
            self.lease_decision.to_json(),
            self.codex_preview.to_json(),
            self.telegram_reply_preview.to_json(),
            self.validator_result.to_json(),
            self.receipt.to_json()
        )
    }
}
