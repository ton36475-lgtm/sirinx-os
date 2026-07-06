//! Read-only orchestrator status view for local A2A2A handoff.

use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};

use crate::adapters::bundle::{select_next_ready_bundle, BundleReadReport, BundleSelection};
use crate::adapters::lease::LeaseDecision;
use crate::adapters::queue::QueueReadReport;
use crate::error::Result;
use crate::schema::escape_json;

/// Compact queue status derived from a local pending-queue read report.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct QueueStatusSummary {
    /// Number of valid route jobs found.
    pub valid_jobs: usize,
    /// Number of malformed non-empty lines found.
    pub invalid_lines: usize,
    /// Number of empty lines skipped.
    pub skipped_empty_lines: usize,
}

impl QueueStatusSummary {
    /// Builds a status summary without executing queued jobs.
    pub fn from_report(report: &QueueReadReport) -> Self {
        Self {
            valid_jobs: report.jobs.len(),
            invalid_lines: report.invalid_lines,
            skipped_empty_lines: report.skipped_empty_lines,
        }
    }

    /// Serializes the queue summary to compact JSON.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"valid_jobs\":{},\"invalid_lines\":{},\"skipped_empty_lines\":{}}}",
            self.valid_jobs, self.invalid_lines, self.skipped_empty_lines
        )
    }
}

/// Compact lease status for candidate paths inspected by the orchestrator.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LeaseStatusSummary {
    /// Number of allowed candidate paths.
    pub allowed_count: usize,
    /// Number of blocked candidate paths.
    pub blocked_count: usize,
    /// Individual lease decisions.
    pub decisions: Vec<LeaseDecision>,
}

impl LeaseStatusSummary {
    /// Builds a lease summary from deterministic lease decisions.
    pub fn new(decisions: Vec<LeaseDecision>) -> Self {
        let allowed_count = decisions.iter().filter(|decision| decision.allowed).count();
        let blocked_count = decisions.len() - allowed_count;
        Self {
            allowed_count,
            blocked_count,
            decisions,
        }
    }

    /// Serializes the lease summary to compact JSON.
    pub fn to_json(&self) -> String {
        let decisions = self
            .decisions
            .iter()
            .map(LeaseDecision::to_json)
            .collect::<Vec<_>>()
            .join(",");
        format!(
            "{{\"allowed_count\":{},\"blocked_count\":{},\"decisions\":[{}]}}",
            self.allowed_count, self.blocked_count, decisions
        )
    }
}

/// Local read-only status view for Hermes/OpenCode/Codex coordination.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OrchestratorStatusView {
    /// Stable status id for reports and fixtures.
    pub status_id: String,
    /// Human- and machine-readable aggregate status.
    pub status: String,
    /// Status generation is always dry-run.
    pub dry_run: bool,
    /// Status generation never performs live execution.
    pub live_execution: bool,
    /// Bundle selection decision.
    pub bundle_selection: BundleSelection,
    /// Pending queue summary.
    pub queue_status: QueueStatusSummary,
    /// Lease decision summary.
    pub lease_status: LeaseStatusSummary,
    /// Next local-safe action for the orchestrator.
    pub next_action: String,
}

impl OrchestratorStatusView {
    /// Builds a local-only orchestrator status view from read reports.
    pub fn new(
        status_id: impl Into<String>,
        bundle_report: &BundleReadReport,
        queue_report: &QueueReadReport,
        lease_decisions: Vec<LeaseDecision>,
    ) -> Self {
        let bundle_selection = select_next_ready_bundle(bundle_report);
        let queue_status = QueueStatusSummary::from_report(queue_report);
        let lease_status = LeaseStatusSummary::new(lease_decisions);
        let status = aggregate_status(&bundle_selection);
        let next_action = next_safe_action(&bundle_selection, &queue_status, &lease_status);
        Self {
            status_id: status_id.into(),
            status,
            dry_run: true,
            live_execution: false,
            bundle_selection,
            queue_status,
            lease_status,
            next_action,
        }
    }

    /// Serializes the status view to compact JSON.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"status_id\":\"{}\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"bundle_selection\":{},\"queue_status\":{},\"lease_status\":{},\"next_action\":\"{}\"}}",
            escape_json(&self.status_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            self.bundle_selection.to_json(),
            self.queue_status.to_json(),
            self.lease_status.to_json(),
            escape_json(&self.next_action)
        )
    }
}

/// Compact persisted status snapshot metadata.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PersistedOrchestratorStatusSummary {
    /// Stable status id.
    pub status_id: String,
    /// Aggregate status.
    pub status: String,
    /// Whether the persisted status was dry-run only.
    pub dry_run: bool,
    /// Whether the persisted status claims live execution happened.
    pub live_execution: bool,
    /// Next local-safe action.
    pub next_action: String,
}

impl PersistedOrchestratorStatusSummary {
    /// Builds a persisted-safe summary from the current status view.
    pub fn from_status_view(status: &OrchestratorStatusView) -> Self {
        Self {
            status_id: status.status_id.clone(),
            status: status.status.clone(),
            dry_run: status.dry_run,
            live_execution: status.live_execution,
            next_action: status.next_action.clone(),
        }
    }

    /// Parses stable top-level fields from a persisted status snapshot.
    pub fn from_json_line(line: &str) -> Option<Self> {
        Some(Self {
            status_id: extract_string(line, "status_id")?,
            status: extract_string(line, "status")?,
            dry_run: extract_bool(line, "dry_run")?,
            live_execution: extract_bool(line, "live_execution")?,
            next_action: extract_string(line, "next_action")?,
        })
    }

    /// Serializes the summary to compact JSON.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"status_id\":\"{}\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"next_action\":\"{}\"}}",
            escape_json(&self.status_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            escape_json(&self.next_action)
        )
    }
}

/// Read-only freshness decision comparing persisted status to current status.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StatusFreshnessDecision {
    /// `fresh`, `stale`, or `missing`.
    pub status: String,
    /// Summary derived from the current read-only status view.
    pub current: PersistedOrchestratorStatusSummary,
    /// Latest valid persisted snapshot, when one exists.
    pub latest_snapshot: Option<PersistedOrchestratorStatusSummary>,
    /// Number of non-empty malformed snapshot lines observed.
    pub invalid_lines: usize,
    /// Number of empty snapshot lines skipped.
    pub skipped_empty_lines: usize,
    /// Stable machine-readable decision reason.
    pub reason: String,
}

impl StatusFreshnessDecision {
    /// Serializes the freshness decision to compact JSON.
    pub fn to_json(&self) -> String {
        let latest_snapshot = self.latest_snapshot.as_ref().map_or_else(
            || "null".to_string(),
            PersistedOrchestratorStatusSummary::to_json,
        );
        format!(
            "{{\"status\":\"{}\",\"current\":{},\"latest_snapshot\":{},\"invalid_lines\":{},\"skipped_empty_lines\":{},\"reason\":\"{}\"}}",
            escape_json(&self.status),
            self.current.to_json(),
            latest_snapshot,
            self.invalid_lines,
            self.skipped_empty_lines,
            escape_json(&self.reason)
        )
    }
}

/// Read result for a persisted status snapshot JSONL scan.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StatusSnapshotReadReport {
    /// Valid status summaries parsed from storage.
    pub snapshots: Vec<PersistedOrchestratorStatusSummary>,
    /// Number of non-empty malformed lines.
    pub invalid_lines: usize,
    /// Number of empty or whitespace-only lines skipped.
    pub skipped_empty_lines: usize,
}

impl StatusSnapshotReadReport {
    /// Serializes the read report to compact JSON.
    pub fn to_json(&self) -> String {
        let snapshots = self
            .snapshots
            .iter()
            .map(PersistedOrchestratorStatusSummary::to_json)
            .collect::<Vec<_>>()
            .join(",");
        format!(
            "{{\"snapshots\":[{}],\"invalid_lines\":{},\"skipped_empty_lines\":{}}}",
            snapshots, self.invalid_lines, self.skipped_empty_lines
        )
    }
}

/// Compares the latest persisted status snapshot with the current status view.
pub fn evaluate_status_freshness(
    report: &StatusSnapshotReadReport,
    current: &OrchestratorStatusView,
) -> StatusFreshnessDecision {
    let current = PersistedOrchestratorStatusSummary::from_status_view(current);
    let latest_snapshot = report.snapshots.last().cloned();
    let (status, reason) = match latest_snapshot.as_ref() {
        Some(snapshot) if snapshot == &current => {
            ("fresh", "latest_snapshot_matches_current_status")
        }
        Some(_) => ("stale", "latest_snapshot_differs_from_current_status"),
        None if report.invalid_lines > 0 => ("missing", "invalid_snapshot_lines_present"),
        None => ("missing", "no_snapshot_available"),
    };

    StatusFreshnessDecision {
        status: status.to_string(),
        current,
        latest_snapshot,
        invalid_lines: report.invalid_lines,
        skipped_empty_lines: report.skipped_empty_lines,
        reason: reason.to_string(),
    }
}

/// File-backed JSONL store for local orchestrator status snapshots.
#[derive(Clone, Debug)]
pub struct FileOrchestratorStatusStore {
    path: PathBuf,
}

impl FileOrchestratorStatusStore {
    /// Creates a file-backed status snapshot store.
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into() }
    }

    /// Returns the snapshot store path.
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Appends one local status snapshot.
    pub fn append(&self, status: &OrchestratorStatusView) -> Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.path)?;
        writeln!(file, "{}", status.to_json())?;
        Ok(())
    }

    /// Reads all valid status snapshot summaries in insertion order.
    pub fn read_all(&self) -> Result<Vec<PersistedOrchestratorStatusSummary>> {
        self.read_report().map(|report| report.snapshots)
    }

    /// Reads status snapshots and reports malformed lines without executing work.
    pub fn read_report(&self) -> Result<StatusSnapshotReadReport> {
        if !self.path.exists() {
            return Ok(StatusSnapshotReadReport {
                snapshots: Vec::new(),
                invalid_lines: 0,
                skipped_empty_lines: 0,
            });
        }
        let file = OpenOptions::new().read(true).open(&self.path)?;
        let reader = BufReader::new(file);
        let mut snapshots = Vec::new();
        let mut invalid_lines = 0;
        let mut skipped_empty_lines = 0;
        for line in reader.lines() {
            let line = line?;
            if line.trim().is_empty() {
                skipped_empty_lines += 1;
                continue;
            }
            if let Some(summary) = PersistedOrchestratorStatusSummary::from_json_line(&line) {
                snapshots.push(summary);
            } else {
                invalid_lines += 1;
            }
        }
        Ok(StatusSnapshotReadReport {
            snapshots,
            invalid_lines,
            skipped_empty_lines,
        })
    }
}

fn aggregate_status(selection: &BundleSelection) -> String {
    if selection.selected.is_some() {
        "ready_for_review_bundle_available".to_string()
    } else {
        "no_ready_bundle_available".to_string()
    }
}

fn next_safe_action(
    selection: &BundleSelection,
    queue_status: &QueueStatusSummary,
    lease_status: &LeaseStatusSummary,
) -> String {
    if selection.selected.is_some() {
        return "route_selected_bundle_to_opencode_review".to_string();
    }
    if selection.invalid_lines > 0 || queue_status.invalid_lines > 0 {
        return "inspect_malformed_local_lines".to_string();
    }
    if lease_status.blocked_count > 0 {
        return "inspect_blocked_lease_decisions".to_string();
    }
    "wait_for_ready_bundle".to_string()
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
