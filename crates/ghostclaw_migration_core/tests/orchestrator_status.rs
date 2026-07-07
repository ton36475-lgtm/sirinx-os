use ghostclaw_migration_core::adapters::bundle::{BundleReadReport, FileBundleStore};
use ghostclaw_migration_core::adapters::lease::{LeaseDecision, PathLeaseChecker};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};

use ghostclaw_migration_core::adapters::orchestrator_status::{
    evaluate_status_freshness, FileOrchestratorStatusStore, OrchestratorStatusView,
    PersistedOrchestratorStatusSummary, StatusSnapshotReadReport,
};
use ghostclaw_migration_core::adapters::queue::{FilePendingQueue, QueueReadReport};

static NEXT_TEMP_ID: AtomicUsize = AtomicUsize::new(0);

#[test]
fn orchestrator_status_should_match_p092_ready_fixture() {
    let status = p092_ready_status();

    assert_eq!(
        status.to_json(),
        include_str!("fixtures/p092/orchestrator_status_ready.json").trim()
    );
}

#[test]
fn orchestrator_status_should_inspect_malformed_lines_when_no_bundle_is_ready() {
    let bundle_report = BundleReadReport {
        bundles: Vec::new(),
        invalid_lines: 1,
        skipped_empty_lines: 0,
    };
    let queue_report = QueueReadReport {
        jobs: Vec::new(),
        invalid_lines: 0,
        skipped_empty_lines: 0,
        clear_events: 0,
    };

    let status =
        OrchestratorStatusView::new("p092-malformed", &bundle_report, &queue_report, Vec::new());

    assert_eq!(status.status, "no_ready_bundle_available");
    assert_eq!(status.next_action, "inspect_malformed_local_lines");
    assert!(!status.live_execution);
}

#[test]
fn orchestrator_status_should_surface_blocked_lease_when_queue_and_bundles_are_clean() {
    let bundle_report = BundleReadReport {
        bundles: Vec::new(),
        invalid_lines: 0,
        skipped_empty_lines: 0,
    };
    let queue_report = QueueReadReport {
        jobs: Vec::new(),
        invalid_lines: 0,
        skipped_empty_lines: 0,
        clear_events: 0,
    };
    let lease_decisions = vec![LeaseDecision {
        path: ".env.production".to_string(),
        allowed: false,
        reason: "blocked_path_pattern".to_string(),
    }];

    let status = OrchestratorStatusView::new(
        "p092-blocked",
        &bundle_report,
        &queue_report,
        lease_decisions,
    );

    assert_eq!(status.next_action, "inspect_blocked_lease_decisions");
    assert_eq!(status.lease_status.blocked_count, 1);
}

#[test]
fn status_snapshot_store_should_append_and_read_status_summaries() {
    let path = unique_temp_status_path();
    let store = FileOrchestratorStatusStore::new(&path);
    let status = p092_ready_status();

    store.append(&status).unwrap();
    let snapshots = store.read_all().unwrap();
    std::fs::remove_file(path).ok();

    assert_eq!(snapshots.len(), 1);
    assert_eq!(snapshots[0].status_id, "p092-status");
    assert!(!snapshots[0].live_execution);
}

#[test]
fn status_snapshot_store_read_report_should_match_p093_fixture() {
    let store = FileOrchestratorStatusStore::new(fixture_path(
        "p093",
        "status_snapshot_with_corrupt_lines.jsonl",
    ));

    let report = store.read_report().unwrap();

    assert_eq!(
        report.to_json(),
        include_str!("fixtures/p093/status_snapshot_read_report.json").trim()
    );
}

#[test]
fn status_snapshot_store_should_report_empty_when_missing() {
    let store = FileOrchestratorStatusStore::new(unique_temp_status_path());

    let report = store.read_report().unwrap();

    assert!(report.snapshots.is_empty());
    assert_eq!(report.invalid_lines, 0);
    assert_eq!(report.skipped_empty_lines, 0);
}

#[test]
fn status_freshness_guard_should_mark_latest_snapshot_fresh() {
    let status = p092_ready_status();
    let report = StatusSnapshotReadReport {
        snapshots: vec![PersistedOrchestratorStatusSummary::from_status_view(
            &status,
        )],
        invalid_lines: 0,
        skipped_empty_lines: 0,
    };

    let freshness = evaluate_status_freshness(&report, &status);

    assert_eq!(
        freshness.to_json(),
        include_str!("fixtures/p094/status_freshness_fresh.json").trim()
    );
}

#[test]
fn status_freshness_guard_should_mark_stale_when_latest_snapshot_differs() {
    let status = p092_ready_status();
    let report = StatusSnapshotReadReport {
        snapshots: vec![PersistedOrchestratorStatusSummary {
            status_id: "p092-status".to_string(),
            status: "no_ready_bundle_available".to_string(),
            dry_run: true,
            live_execution: false,
            next_action: "wait_for_ready_bundle".to_string(),
        }],
        invalid_lines: 0,
        skipped_empty_lines: 0,
    };

    let freshness = evaluate_status_freshness(&report, &status);

    assert_eq!(freshness.status, "stale");
}

#[test]
fn status_freshness_guard_should_report_missing_when_no_snapshot_exists() {
    let status = p092_ready_status();
    let report = StatusSnapshotReadReport {
        snapshots: Vec::new(),
        invalid_lines: 0,
        skipped_empty_lines: 0,
    };

    let freshness = evaluate_status_freshness(&report, &status);

    assert_eq!(freshness.reason, "no_snapshot_available");
}

#[test]
fn status_freshness_guard_should_report_invalid_lines_when_no_valid_snapshot_exists() {
    let status = p092_ready_status();
    let report = StatusSnapshotReadReport {
        snapshots: Vec::new(),
        invalid_lines: 2,
        skipped_empty_lines: 1,
    };

    let freshness = evaluate_status_freshness(&report, &status);

    assert_eq!(freshness.reason, "invalid_snapshot_lines_present");
}

fn bundle_report_from_fixture(name: &str) -> BundleReadReport {
    let store = FileBundleStore::new(fixture_path("p091", name));
    store.read_report().unwrap()
}

fn queue_report_from_fixture(name: &str) -> QueueReadReport {
    let queue = FilePendingQueue::new(fixture_path("p087", name));
    queue.read_report().unwrap()
}

fn p092_ready_status() -> OrchestratorStatusView {
    let bundle_report = bundle_report_from_fixture("bundle_selection_mixed.jsonl");
    let queue_report = queue_report_from_fixture("queue_with_corrupt_lines.jsonl");
    let checker = p092_lease_checker();
    let lease_decisions = vec![
        checker.check("crates/ghostclaw_migration_core/src/adapters/orchestrator_status.rs"),
        checker.check("cloudflare/wrangler.toml"),
    ];

    OrchestratorStatusView::new(
        "p092-status",
        &bundle_report,
        &queue_report,
        lease_decisions,
    )
}

fn p092_lease_checker() -> PathLeaseChecker {
    PathLeaseChecker::new(
        vec!["crates/ghostclaw_migration_core/**".to_string()],
        vec![
            ".env*".to_string(),
            "secrets/**".to_string(),
            "cloudflare/**".to_string(),
            "workers/**".to_string(),
            "wrangler.toml".to_string(),
        ],
    )
}

fn fixture_path(group: &str, name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join(group)
        .join(name)
}

fn unique_temp_status_path() -> PathBuf {
    let mut path = std::env::temp_dir();
    let id = NEXT_TEMP_ID.fetch_add(1, Ordering::Relaxed);
    path.push(format!(
        "ghostclaw-migration-core-p093-status-test-{}-{}-{}.jsonl",
        std::process::id(),
        id,
        ghostclaw_migration_core::schema::now_millis()
    ));
    path
}
