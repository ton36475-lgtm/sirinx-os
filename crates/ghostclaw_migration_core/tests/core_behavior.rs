use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};

use ghostclaw_migration_core::{
    parse_command, CommandEnvelope, Engine, FileReceiptStore, Lane, MemoryReceiptStore,
    MigrationError, ParsedCommand, ReceiptStore,
};

#[test]
fn parse_command_should_parse_status() {
    assert_eq!(parse_command("/status").unwrap(), ParsedCommand::Status);
}

#[test]
fn parse_command_should_parse_route_lane_and_task() {
    assert_eq!(
        parse_command("/route backend_core scan repository safely").unwrap(),
        ParsedCommand::Route {
            lane: Lane::BackendCore,
            task: "scan repository safely".to_string()
        }
    );
}

#[test]
fn parse_command_should_reject_route_without_task() {
    assert!(parse_command("/route backend_core").is_err());
}

#[test]
fn parse_command_should_reject_extra_arguments_for_fixed_commands() {
    assert!(parse_command("/status unexpected").is_err());
    assert!(parse_command("/receipts 5 unexpected").is_err());
}

#[test]
fn parse_command_should_reject_invalid_or_unbounded_receipt_limits() {
    assert!(parse_command("/receipts not-a-number").is_err());
    assert!(parse_command("/receipts 101").is_err());
    assert_eq!(
        parse_command("/receipts 100").unwrap(),
        ParsedCommand::Receipts { limit: 100 }
    );
}

#[test]
fn lane_should_accept_aliases() {
    assert_eq!(Lane::parse("db-schema").unwrap(), Lane::DatabaseSchema);
}

#[test]
fn engine_should_write_receipt_for_status() {
    let mut engine = Engine::new(MemoryReceiptStore::default());
    let response = engine.handle(&CommandEnvelope::cli("/status")).unwrap();
    let store = engine.into_store();

    assert_eq!(response.status, "ok");
    assert_eq!(store.all().len(), 1);
}

#[test]
fn engine_should_queue_route_without_live_execution() {
    let mut engine = Engine::new(MemoryReceiptStore::default());
    let response = engine
        .handle(&CommandEnvelope::cli(
            "/route backend_core scan repository safely",
        ))
        .unwrap();

    assert_eq!(response.status, "queued");
    assert_eq!(engine.pending().len(), 1);
}

#[test]
fn engine_should_block_git_push_and_still_write_receipt() {
    let mut engine = Engine::new(MemoryReceiptStore::default());
    let response = engine
        .handle(&CommandEnvelope::cli(
            "/route backend_core git push origin main",
        ))
        .unwrap();
    let store = engine.into_store();

    assert_eq!(response.status, "blocked");
    assert_eq!(store.all().len(), 1);
}

#[test]
fn engine_should_block_customer_send_email() {
    let mut engine = Engine::new(MemoryReceiptStore::default());
    let response = engine
        .handle(&CommandEnvelope::cli(
            "/route review send email to customer",
        ))
        .unwrap();

    assert_eq!(response.status, "blocked");
}

#[test]
fn receipts_should_redact_secret_like_tokens() {
    let mut engine = Engine::new(MemoryReceiptStore::default());
    let response = engine
        .handle(&CommandEnvelope::cli(
            "/route backend_core inspect token=abc123",
        ))
        .unwrap();
    let store = engine.into_store();

    assert_eq!(response.status, "blocked");
    assert!(store.all()[0]
        .redacted_command
        .contains("[REDACTED_SECRET]"));
}

#[test]
fn file_receipt_store_should_round_trip_recent_receipts() {
    let path = unique_temp_receipt_path();
    let mut store = FileReceiptStore::new(&path);
    let mut engine = Engine::new(store.clone());
    engine.handle(&CommandEnvelope::cli("/status")).unwrap();
    store = engine.into_store();

    let receipts = store.recent(1).unwrap();
    fs::remove_file(path).ok();

    assert_eq!(receipts.len(), 1);
}

#[test]
fn file_receipt_store_should_report_corrupt_and_empty_lines() {
    let path = unique_temp_receipt_path();
    let mut store = FileReceiptStore::new(&path);
    let first = ghostclaw_migration_core::Receipt::new("first", "ok", "/status", None, None, None);
    let second =
        ghostclaw_migration_core::Receipt::new("second", "ok", "/status", None, None, None);
    store.append(&first).unwrap();
    fs::write(
        &path,
        format!(
            "{}\nnot-json\n\n{}\n",
            first.to_json_line(),
            second.to_json_line()
        ),
    )
    .unwrap();

    let report = store.read_report(1).unwrap();
    let strict_read = store.recent(1);
    fs::remove_file(path).ok();

    assert_eq!(report.receipts, vec![second]);
    assert_eq!(report.invalid_lines, 1);
    assert_eq!(report.skipped_empty_lines, 1);
    assert!(matches!(
        strict_read,
        Err(MigrationError::CorruptStore {
            store: "receipt",
            invalid_lines: 1
        })
    ));
}

#[test]
fn engine_should_surface_receipt_store_corruption() {
    let path = unique_temp_receipt_path();
    fs::write(&path, "malformed receipt line\n").unwrap();
    let store = FileReceiptStore::new(&path);
    let mut engine = Engine::new(store);

    let response = engine
        .handle(&CommandEnvelope::cli("/receipts 10"))
        .unwrap();
    fs::remove_file(path).ok();

    assert_eq!(response.status, "error");
    assert_eq!(
        response.reason.as_deref(),
        Some("receipt_store_corrupt:invalid_lines=1")
    );
}

fn unique_temp_receipt_path() -> PathBuf {
    static NEXT_TEMP_ID: AtomicU64 = AtomicU64::new(1);

    let mut path = std::env::temp_dir();
    path.push(format!(
        "ghostclaw-migration-core-test-{}-{}-{}.jsonl",
        std::process::id(),
        ghostclaw_migration_core::schema::now_millis(),
        NEXT_TEMP_ID.fetch_add(1, Ordering::Relaxed)
    ));
    path
}
