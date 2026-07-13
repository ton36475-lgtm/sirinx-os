use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};

use ghostclaw_migration_core::adapters::bundle::{
    AdapterResponseBundle, FileBundleStore, PersistedBundleSummary,
};
use ghostclaw_migration_core::adapters::codex::preview_codex_dry_run;
use ghostclaw_migration_core::adapters::lease::LeaseDecision;
use ghostclaw_migration_core::adapters::telegram::preview_telegram_reply;
use ghostclaw_migration_core::adapters::validator::{ValidationCheck, ValidatorResult};
use ghostclaw_migration_core::{Lane, Receipt, RouteJob};

static NEXT_TEMP_ID: AtomicUsize = AtomicUsize::new(0);

#[test]
fn persisted_bundle_summary_should_parse_p089_pass_fixture() {
    let summary =
        PersistedBundleSummary::from_json_line(include_str!("fixtures/p089/pass_bundle.json"))
            .unwrap();

    assert_eq!(summary.packet_id, "packet-p089");
    assert_eq!(summary.status, "ready_for_review");
    assert!(!summary.live_execution);
}

#[test]
fn file_bundle_store_should_append_and_read_bundle_summaries() {
    let path = unique_temp_bundle_path();
    let store = FileBundleStore::new(&path);

    store.append(&build_pass_bundle()).unwrap();
    store.append(&build_fail_bundle()).unwrap();

    let bundles = store.read_all().unwrap();
    fs::remove_file(path).ok();

    assert_eq!(bundles.len(), 2);
    assert_eq!(bundles[1].status, "blocked_or_failed");
}

#[test]
fn file_bundle_store_read_report_should_match_p090_fixture() {
    let path = unique_temp_bundle_path();
    fs::write(
        &path,
        include_str!("fixtures/p090/bundle_store_with_corrupt_lines.jsonl"),
    )
    .unwrap();
    let store = FileBundleStore::new(&path);

    let report = store.read_report().unwrap();
    let strict_read = store.read_all();
    fs::remove_file(path).ok();

    assert_eq!(
        report.to_json(),
        include_str!("fixtures/p090/bundle_read_report.json").trim()
    );
    assert!(matches!(
        strict_read,
        Err(ghostclaw_migration_core::MigrationError::CorruptStore {
            store: "bundle",
            invalid_lines: 2
        })
    ));
}

#[test]
fn file_bundle_store_should_report_empty_when_missing() {
    let store = FileBundleStore::new(unique_temp_bundle_path());

    let report = store.read_report().unwrap();

    assert!(report.bundles.is_empty());
    assert_eq!(report.invalid_lines, 0);
    assert_eq!(report.skipped_empty_lines, 0);
}

fn build_pass_bundle() -> AdapterResponseBundle {
    let route_job = RouteJob {
        id: "route-p090-001".to_string(),
        lane: Lane::Review,
        task: "persist bundle locally".to_string(),
        status: "queued_local_safe_no_execution".to_string(),
        created_at_ms: 1_780_000_000_010,
    };
    let receipt = Receipt {
        id: "rcpt-p090-pass".to_string(),
        command_kind: "route".to_string(),
        status: "queued".to_string(),
        redacted_command: "/route review persist bundle locally".to_string(),
        lane: Some("review".to_string()),
        task: Some("persist bundle locally".to_string()),
        reason: None,
        created_at_ms: 1_780_000_000_011,
    };

    AdapterResponseBundle::new(
        "packet-p090",
        route_job.clone(),
        LeaseDecision {
            path: "crates/ghostclaw_migration_core/src/adapters/bundle.rs".to_string(),
            allowed: true,
            reason: "allowed_path_pattern".to_string(),
        },
        preview_codex_dry_run(&route_job),
        preview_telegram_reply("home-channel", "P090 ready for review"),
        ValidatorResult::from_checks(
            "packet-p090",
            vec![ValidationCheck {
                name: "bundle_writer".to_string(),
                passed: true,
                evidence: Some("local".to_string()),
            }],
        ),
        &receipt,
    )
}

fn build_fail_bundle() -> AdapterResponseBundle {
    let route_job = RouteJob {
        id: "route-p090-002".to_string(),
        lane: Lane::BackendCore,
        task: "blocked bundle path".to_string(),
        status: "queued_local_safe_no_execution".to_string(),
        created_at_ms: 1_780_000_000_012,
    };
    let receipt = Receipt {
        id: "rcpt-p090-fail".to_string(),
        command_kind: "blocked".to_string(),
        status: "blocked".to_string(),
        redacted_command: "/route backend_core blocked bundle path".to_string(),
        lane: None,
        task: None,
        reason: Some("blocked_path_pattern".to_string()),
        created_at_ms: 1_780_000_000_013,
    };

    AdapterResponseBundle::new(
        "packet-p090",
        route_job.clone(),
        LeaseDecision {
            path: "cloudflare/wrangler.toml".to_string(),
            allowed: false,
            reason: "blocked_path_pattern".to_string(),
        },
        preview_codex_dry_run(&route_job),
        preview_telegram_reply("home-channel", "P090 blocked before live action"),
        ValidatorResult::from_checks(
            "packet-p090",
            vec![ValidationCheck {
                name: "bundle_writer".to_string(),
                passed: false,
                evidence: Some("blocked_path_pattern".to_string()),
            }],
        ),
        &receipt,
    )
}

fn unique_temp_bundle_path() -> PathBuf {
    let mut path = std::env::temp_dir();
    let id = NEXT_TEMP_ID.fetch_add(1, Ordering::Relaxed);
    path.push(format!(
        "ghostclaw-migration-core-p090-bundle-test-{}-{}-{}.jsonl",
        std::process::id(),
        id,
        ghostclaw_migration_core::schema::now_millis()
    ));
    path
}
