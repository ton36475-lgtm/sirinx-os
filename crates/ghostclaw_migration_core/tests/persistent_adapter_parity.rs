use std::fs;
use std::path::PathBuf;

use ghostclaw_migration_core::adapters::lease::PathLeaseChecker;
use ghostclaw_migration_core::adapters::queue::FilePendingQueue;
use ghostclaw_migration_core::adapters::telegram::TelegramCommand;
use ghostclaw_migration_core::adapters::validator::{ValidationCheck, ValidatorResult};
use ghostclaw_migration_core::{Lane, RouteJob};

#[test]
fn telegram_command_json_should_match_p087_fixture() {
    let command = TelegramCommand {
        chat_ref: "home-channel".to_string(),
        sender_ref: "operator".to_string(),
        text: "/route review inspect packet locally".to_string(),
    };

    assert_eq!(
        command.to_json(),
        include_str!("fixtures/p087/telegram_command.json").trim()
    );
}

#[test]
fn route_job_jsonl_should_match_p087_fixture() {
    let job = RouteJob {
        id: "route-p087-001".to_string(),
        lane: Lane::Review,
        task: "inspect packet locally".to_string(),
        status: "queued_local_safe_no_execution".to_string(),
        created_at_ms: 1_780_000_000_000,
    };

    assert_eq!(
        job.to_json_line(),
        include_str!("fixtures/p087/route_job.jsonl").trim()
    );
}

#[test]
fn validator_result_json_should_match_p087_fixture() {
    let result = ValidatorResult::from_checks(
        "packet-p087",
        vec![
            ValidationCheck {
                name: "diff_check".to_string(),
                passed: true,
                evidence: Some("local".to_string()),
            },
            ValidationCheck {
                name: "secret_scan".to_string(),
                passed: true,
                evidence: Some("no findings".to_string()),
            },
        ],
    );

    assert_eq!(
        result.to_json(),
        include_str!("fixtures/p087/validator_result.json").trim()
    );
}

#[test]
fn lease_decision_json_should_match_p087_fixture() {
    let checker = p087_lease_checker();
    let decision = checker.check("crates/ghostclaw_migration_core/src/adapters/queue.rs");

    assert_eq!(
        decision.to_json(),
        include_str!("fixtures/p087/lease_decision.json").trim()
    );
}

#[test]
fn pending_queue_report_should_count_corrupt_lines_without_executing_jobs() {
    let path = unique_temp_queue_path();
    fs::write(
        &path,
        include_str!("fixtures/p087/queue_with_corrupt_lines.jsonl"),
    )
    .unwrap();
    let queue = FilePendingQueue::new(&path);

    let report = queue.read_report().unwrap();
    let strict_read = queue.read_all();
    fs::remove_file(path).ok();

    assert_eq!(report.jobs.len(), 2);
    assert_eq!(report.invalid_lines, 2);
    assert_eq!(report.skipped_empty_lines, 1);
    assert!(matches!(
        strict_read,
        Err(ghostclaw_migration_core::MigrationError::CorruptStore {
            store: "pending_queue",
            invalid_lines: 2
        })
    ));
}

#[test]
fn a2a2a_path_lease_policy_fixture_should_keep_live_actions_disabled() {
    let policy = include_str!("fixtures/p087/a2a2a_path_lease_policy.json");

    assert!(policy.contains("\"telegram_send\": false"));
    assert!(policy.contains("\"codex_execution\": false"));
    assert!(policy.contains("\"cloudflare_mutation\": false"));
}

#[test]
fn a2a2a_path_lease_checker_should_block_cloudflare_worker_and_env_paths() {
    let checker = p087_lease_checker();

    assert!(!checker.check(".env.production").allowed);
    assert!(!checker.check("cloudflare/wrangler.toml").allowed);
    assert!(!checker.check("workers/live-router.ts").allowed);
}

fn p087_lease_checker() -> PathLeaseChecker {
    PathLeaseChecker::new(
        vec![
            "crates/ghostclaw_migration_core/**".to_string(),
            "reports/mission/A2A2A_P087_RUST_PERSISTENT_ADAPTER_PARITY_20260705.md".to_string(),
        ],
        vec![
            ".env*".to_string(),
            "secrets/**".to_string(),
            "cloudflare/**".to_string(),
            "workers/**".to_string(),
            "wrangler.toml".to_string(),
        ],
    )
}

fn unique_temp_queue_path() -> PathBuf {
    let mut path = std::env::temp_dir();
    path.push(format!(
        "ghostclaw-migration-core-p087-queue-test-{}-{}.jsonl",
        std::process::id(),
        ghostclaw_migration_core::schema::now_millis()
    ));
    path
}
