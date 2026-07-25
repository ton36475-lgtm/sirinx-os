use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};

use ghostclaw_migration_core::adapters::codex::CodexDryRunAdapter;
use ghostclaw_migration_core::adapters::queue::FilePendingQueue;
use ghostclaw_migration_core::adapters::traits::{
    QueueAdapter, ReceiptAdapter, ValidatorAdapter, WorkerAdapter,
};
use ghostclaw_migration_core::adapters::validator::{StaticValidatorAdapter, ValidationCheck};
use ghostclaw_migration_core::python_oracle::{
    default_hermes_command_center_fixtures, normalize_python_oracle_value,
};
use ghostclaw_migration_core::{Lane, MemoryReceiptStore, Receipt, RouteJob};

#[test]
fn worker_adapter_should_preview_codex_without_live_execution() {
    let adapter = CodexDryRunAdapter;
    let job = RouteJob::new(
        "route-p101-001".to_string(),
        Lane::BackendCore,
        "inspect adapter extraction",
    );

    let preview = adapter.preview(&job).unwrap();

    assert!(!preview.executed_live);
    assert!(!adapter.executed_live());
    assert!(preview.command_preview.contains("--dry-run"));
}

#[test]
fn queue_adapter_should_clear_with_append_only_marker() {
    let path = unique_temp_queue_path();
    let queue = FilePendingQueue::new(&path);
    let job = RouteJob::new(
        "route-p101-002".to_string(),
        Lane::ApiContract,
        "freeze adapter trait contract",
    );

    queue.enqueue(&job).unwrap();
    queue
        .clear_pending_local_only("p101 local operator reset")
        .unwrap();
    let report = queue.list().unwrap();
    let contents = fs::read_to_string(&path).unwrap();
    fs::remove_file(path).ok();

    assert!(report.jobs.is_empty());
    assert_eq!(report.clear_events, 1);
    assert!(contents.contains("clear_pending_local_only"));
}

#[test]
fn malformed_clear_marker_should_not_discard_pending_jobs() {
    let path = unique_temp_queue_path();
    let queue = FilePendingQueue::new(&path);
    let job = RouteJob::new(
        "route-p101-forged-clear".to_string(),
        Lane::ApiContract,
        "preserve this pending job",
    );
    queue.enqueue(&job).unwrap();
    let mut file = OpenOptions::new().append(true).open(&path).unwrap();
    writeln!(
        file,
        "{{\"type\":\"clear_pending_local_only\",\"reason\":\"missing timestamp\"}}"
    )
    .unwrap();

    let report = queue.list().unwrap();
    fs::remove_file(path).ok();

    assert_eq!(report.jobs, vec![job]);
    assert_eq!(report.clear_events, 0);
    assert_eq!(report.invalid_lines, 1);
}

#[test]
fn clear_marker_reason_should_be_redacted_before_persistence() {
    let path = unique_temp_queue_path();
    let queue = FilePendingQueue::new(&path);
    queue.clear_pending_local_only("api_key abc123").unwrap();
    let contents = fs::read_to_string(&path).unwrap();
    fs::remove_file(path).ok();

    assert!(contents.contains("[REDACTED_SECRET]"));
    assert!(!contents.contains("abc123"));
}

#[test]
fn receipt_adapter_should_wrap_existing_receipt_store_trait() {
    let mut store = MemoryReceiptStore::default();
    let receipt = Receipt::new("p101", "ok", "/status", None, None, None);

    store.append_receipt(&receipt).unwrap();

    assert_eq!(store.recent_receipts(1).unwrap().len(), 1);
}

#[test]
fn validator_adapter_should_return_deterministic_local_status() {
    let adapter = StaticValidatorAdapter::new(vec![ValidationCheck {
        name: "secret_scan".to_string(),
        passed: true,
        evidence: Some("no findings".to_string()),
    }]);

    let result = adapter.validate("p101").unwrap();

    assert_eq!(result.status, "pass");
    assert!(!adapter.executed_live());
}

#[test]
fn python_oracle_fixtures_should_be_contract_only_and_redacted() {
    let fixtures = default_hermes_command_center_fixtures();
    let json = fixtures.to_json();

    assert!(!fixtures.executed_live);
    assert!(json.contains("fixture_contract_only_no_python_execution"));
    assert!(json.contains("[REDACTED_SECRET]"));
}

#[test]
fn python_oracle_normalizer_should_collapse_whitespace_and_redact() {
    let normalized = normalize_python_oracle_value("  token=abc123   provider   failed  ");

    assert_eq!(normalized, "token=[REDACTED_SECRET] provider failed");
}

fn unique_temp_queue_path() -> PathBuf {
    static NEXT_TEMP_ID: AtomicU64 = AtomicU64::new(1);

    let mut path = std::env::temp_dir();
    path.push(format!(
        "ghostclaw-migration-core-p101-queue-test-{}-{}-{}.jsonl",
        std::process::id(),
        ghostclaw_migration_core::schema::now_millis(),
        NEXT_TEMP_ID.fetch_add(1, Ordering::Relaxed)
    ));
    path
}
