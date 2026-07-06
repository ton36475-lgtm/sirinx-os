use std::fs;
use std::path::PathBuf;

use ghostclaw_migration_core::adapters::codex::preview_codex_dry_run;
use ghostclaw_migration_core::adapters::lease::PathLeaseChecker;
use ghostclaw_migration_core::adapters::queue::FilePendingQueue;
use ghostclaw_migration_core::adapters::telegram::TelegramCommand;
use ghostclaw_migration_core::adapters::validator::{ValidationCheck, ValidatorResult};
use ghostclaw_migration_core::{CommandEnvelope, Engine, Lane, MemoryReceiptStore, RouteJob};

#[test]
fn telegram_adapter_should_create_envelope_without_live_send() {
    let command = TelegramCommand {
        chat_ref: "home-channel".to_string(),
        sender_ref: "operator".to_string(),
        text: "/status".to_string(),
    };

    let envelope = command.into_envelope();

    assert_eq!(envelope.source, "telegram:home-channel");
    assert_eq!(envelope.requester, "telegram:operator");
    assert_eq!(envelope.raw, "/status");
}

#[test]
fn codex_dry_run_adapter_should_preview_without_live_execution() {
    let job = RouteJob::new(
        "route-001".to_string(),
        Lane::BackendCore,
        "scan repository safely",
    );

    let preview = preview_codex_dry_run(&job);

    assert!(!preview.executed_live);
    assert!(preview.command_preview.contains("--dry-run"));
}

#[test]
fn pending_queue_should_round_trip_route_job_without_execution() {
    let path = unique_temp_queue_path();
    let queue = FilePendingQueue::new(&path);
    let job = RouteJob::new(
        "route-002".to_string(),
        Lane::ApiContract,
        "freeze response contract",
    );

    queue.append(&job).unwrap();
    let jobs = queue.read_all().unwrap();
    fs::remove_file(path).ok();

    assert_eq!(jobs, vec![job]);
}

#[test]
fn lease_checker_should_allow_scoped_crate_path() {
    let checker = PathLeaseChecker::new(
        vec!["crates/ghostclaw_migration_core/**".to_string()],
        vec![".env*".to_string(), "secrets/**".to_string()],
    );

    let decision = checker.check("crates/ghostclaw_migration_core/src/adapters/codex.rs");

    assert!(decision.allowed);
}

#[test]
fn lease_checker_should_block_secret_like_path() {
    let checker = PathLeaseChecker::new(
        vec!["crates/ghostclaw_migration_core/**".to_string()],
        vec![".env*".to_string(), "secrets/**".to_string()],
    );

    let decision = checker.check(".env.production");

    assert!(!decision.allowed);
}

#[test]
fn validator_result_should_fail_when_any_check_fails() {
    let result = ValidatorResult::from_checks(
        "packet-001",
        vec![
            ValidationCheck {
                name: "diff_check".to_string(),
                passed: true,
                evidence: Some("local".to_string()),
            },
            ValidationCheck {
                name: "secret_scan".to_string(),
                passed: false,
                evidence: None,
            },
        ],
    );

    assert_eq!(result.status, "failed");
}

#[test]
fn adapter_flow_should_route_telegram_command_into_core_without_live_execution() {
    let command = TelegramCommand {
        chat_ref: "home-channel".to_string(),
        sender_ref: "operator".to_string(),
        text: "/route review inspect packet locally".to_string(),
    };
    let envelope: CommandEnvelope = command.into_envelope();
    let mut engine = Engine::new(MemoryReceiptStore::default());

    let response = engine.handle(&envelope).unwrap();

    assert_eq!(response.status, "queued");
    assert_eq!(engine.pending().len(), 1);
}

fn unique_temp_queue_path() -> PathBuf {
    let mut path = std::env::temp_dir();
    path.push(format!(
        "ghostclaw-migration-core-queue-test-{}-{}.jsonl",
        std::process::id(),
        ghostclaw_migration_core::schema::now_millis()
    ));
    path
}
