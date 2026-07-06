use std::path::Path;

use ghostclaw_migration_core::adapters::bundle::{
    select_next_ready_bundle, BundleReadReport, FileBundleStore, PersistedBundleSummary,
};

#[test]
fn bundle_selection_should_pick_first_ready_non_live_bundle() {
    let store = FileBundleStore::new(fixture_path("bundle_selection_mixed.jsonl"));
    let report = store.read_report().unwrap();

    let selection = select_next_ready_bundle(&report);

    assert_eq!(
        selection.to_json(),
        include_str!("fixtures/p091/bundle_selection_result.json").trim()
    );
}

#[test]
fn bundle_selection_should_reject_live_ready_bundle() {
    let report = BundleReadReport {
        bundles: vec![PersistedBundleSummary {
            packet_id: "packet-p091-live".to_string(),
            status: "ready_for_review".to_string(),
            live_execution: true,
        }],
        invalid_lines: 0,
        skipped_empty_lines: 0,
    };

    let selection = select_next_ready_bundle(&report);

    assert_eq!(selection.status, "none_ready");
    assert_eq!(selection.rejected_count, 1);
    assert_eq!(selection.reason, "no_ready_bundle");
    assert!(selection.selected.is_none());
}

#[test]
fn bundle_selection_should_report_invalid_lines_when_no_valid_bundle_exists() {
    let report = BundleReadReport {
        bundles: Vec::new(),
        invalid_lines: 2,
        skipped_empty_lines: 1,
    };

    let selection = select_next_ready_bundle(&report);

    assert_eq!(selection.status, "none_ready");
    assert_eq!(selection.invalid_lines, 2);
    assert_eq!(selection.reason, "invalid_lines_present");
    assert!(selection.selected.is_none());
}

fn fixture_path(name: &str) -> String {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join("p091")
        .join(name)
        .to_string_lossy()
        .into_owned()
}
