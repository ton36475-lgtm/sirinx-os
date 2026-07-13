use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};

use ghostclaw_migration_core::adapters::bundle::{BundleReadReport, FileBundleStore};
use ghostclaw_migration_core::adapters::lease::PathLeaseChecker;
use ghostclaw_migration_core::adapters::orchestrator_status::{
    evaluate_status_freshness, OrchestratorStatusView, PersistedOrchestratorStatusSummary,
    StatusSnapshotReadReport,
};
use ghostclaw_migration_core::adapters::queue::{FilePendingQueue, QueueReadReport};
use ghostclaw_migration_core::adapters::review_packet::{
    create_review_handoff_bundle_manifest, create_review_handoff_operator_card,
    create_review_result_transition_gate, create_review_worker_handoff_envelope,
    create_transition_apply_execution_gate_preview, create_transition_apply_gate_preview,
    evaluate_human_transition_decision_intake_status, evaluate_review_candidate_intake_status,
    evaluate_review_handoff_bundle_manifest_status, evaluate_review_outbox_status,
    evaluate_review_result_transition_gate_status, evaluate_review_worker_handoff_status,
    evaluate_transition_apply_approval_intake_status,
    evaluate_transition_apply_execution_approval_intake_status,
    plan_transition_apply_execution_no_mutation,
    prepare_transition_apply_execution_packet_no_mutation, preview_review_packet_consume,
    preview_review_result_transition, preview_transition_execution_no_mutation,
    FileHumanTransitionDecisionStore, FileReviewCandidateStore,
    FileReviewHandoffBundleManifestStore, FileReviewPacketStore,
    FileReviewResultTransitionGateStore, FileReviewWorkerHandoffStore,
    FileTransitionApplyApprovalStore, FileTransitionApplyExecutionApprovalStore,
    HumanTransitionDecision, HumanTransitionDecisionReadReport, ManualReviewCandidate,
    PersistedReviewHandoffBundleManifestSummary, PersistedReviewPacketSummary,
    PersistedReviewResultTransitionGateSummary, PersistedReviewWorkerHandoffSummary,
    ReviewCandidateReadReport, ReviewHandoffBundleManifestReadReport, ReviewPacketReadReport,
    SelectedBundleReviewPacket, TransitionApplyApproval, TransitionApplyApprovalReadReport,
    TransitionApplyExecutionApproval, TransitionApplyExecutionApprovalReadReport,
    TransitionApplyExecutionGatePreview, TransitionApplyExecutionPacketNoMutation,
    TransitionApplyExecutionPlan,
};
use ghostclaw_migration_core::adapters::validator::{ValidationCheck, ValidatorResult};

static NEXT_TEMP_ID: AtomicUsize = AtomicUsize::new(0);

#[test]
fn selected_bundle_review_packet_should_match_p095_ready_fixture() {
    let status = p092_ready_status();
    let freshness = fresh_decision_for(&status);
    let packet =
        SelectedBundleReviewPacket::new("packet-p095", &status, &freshness, pass_validator());

    assert_eq!(
        packet.to_json(),
        include_str!("fixtures/p095/selected_bundle_review_packet_ready.json").trim()
    );
}

#[test]
fn selected_bundle_review_packet_should_block_stale_status_evidence() {
    let status = p092_ready_status();
    let freshness = stale_decision_for(&status);
    let packet =
        SelectedBundleReviewPacket::new("packet-p095", &status, &freshness, pass_validator());

    assert_eq!(packet.status, "blocked_stale_status_evidence");
    assert_eq!(packet.next_action, "refresh_status_snapshot_before_review");
}

#[test]
fn selected_bundle_review_packet_should_block_live_selected_bundle() {
    let mut status = p092_ready_status();
    let Some(selected) = status.bundle_selection.selected.as_mut() else {
        panic!("expected selected bundle in fixture status");
    };
    selected.live_execution = true;
    let freshness = fresh_decision_for(&status);
    let packet =
        SelectedBundleReviewPacket::new("packet-p095", &status, &freshness, pass_validator());

    assert_eq!(packet.status, "blocked_live_execution_flag");
}

#[test]
fn persisted_review_packet_summary_should_parse_p095_ready_fixture() {
    let summary = PersistedReviewPacketSummary::from_json_line(include_str!(
        "fixtures/p095/selected_bundle_review_packet_ready.json"
    ))
    .unwrap();

    assert_eq!(summary.next_action, "export_to_opencode_review_only");
}

#[test]
fn review_packet_store_should_append_and_read_summaries() {
    let path = unique_temp_review_packet_path();
    let store = FileReviewPacketStore::new(&path);
    let status = p092_ready_status();
    let freshness = fresh_decision_for(&status);
    let packet =
        SelectedBundleReviewPacket::new("packet-p095", &status, &freshness, pass_validator());

    store.append(&packet).unwrap();
    let packets = store.read_all().unwrap();
    std::fs::remove_file(path).ok();

    assert_eq!(packets.len(), 1);
}

#[test]
fn review_packet_store_read_report_should_match_p096_fixture() {
    let store = FileReviewPacketStore::new(fixture_path(
        "p096",
        "review_packet_store_with_corrupt_lines.jsonl",
    ));

    let report = store.read_report().unwrap();
    let strict_read = store.read_all();

    assert_eq!(
        report.to_json(),
        include_str!("fixtures/p096/review_packet_read_report.json").trim()
    );
    assert!(matches!(
        strict_read,
        Err(ghostclaw_migration_core::MigrationError::CorruptStore {
            store: "review_packet",
            invalid_lines: 1
        })
    ));
}

#[test]
fn review_packet_store_should_report_empty_when_missing() {
    let store = FileReviewPacketStore::new(unique_temp_review_packet_path());

    let report = store.read_report().unwrap();

    assert!(report.packets.is_empty());
}

#[test]
fn review_outbox_status_should_mark_ready_packet_available() {
    let summary = PersistedReviewPacketSummary::from_json_line(include_str!(
        "fixtures/p095/selected_bundle_review_packet_ready.json"
    ))
    .unwrap();
    let report = ReviewPacketReadReport {
        packets: vec![summary],
        invalid_lines: 0,
        skipped_empty_lines: 0,
    };

    let status = evaluate_review_outbox_status("p097-ready", &report);

    assert_eq!(
        status.to_json(),
        include_str!("fixtures/p097/review_outbox_status_ready.json").trim()
    );
}

#[test]
fn review_outbox_status_should_surface_corrupt_lines_before_consume() {
    let store = FileReviewPacketStore::new(fixture_path(
        "p096",
        "review_packet_store_with_corrupt_lines.jsonl",
    ));
    let report = store.read_report().unwrap();

    let status = evaluate_review_outbox_status("p097-corrupt", &report);

    assert_eq!(status.status, "review_outbox_needs_repair");
}

#[test]
fn review_outbox_status_should_block_live_packet() {
    let report = ReviewPacketReadReport {
        packets: vec![PersistedReviewPacketSummary {
            packet_id: "packet-live".to_string(),
            status: "ready_for_opencode_review".to_string(),
            dry_run: true,
            live_execution: true,
            next_action: "export_to_opencode_review_only".to_string(),
        }],
        invalid_lines: 0,
        skipped_empty_lines: 0,
    };

    let status = evaluate_review_outbox_status("p097-live", &report);

    assert_eq!(status.status, "blocked_live_execution_flag");
}

#[test]
fn review_outbox_status_should_wait_when_empty() {
    let report = ReviewPacketReadReport {
        packets: Vec::new(),
        invalid_lines: 0,
        skipped_empty_lines: 0,
    };

    let status = evaluate_review_outbox_status("p097-empty", &report);

    assert_eq!(status.status, "empty_review_outbox");
}

#[test]
fn review_packet_consume_preview_should_select_ready_packet_without_consuming() {
    let summary = PersistedReviewPacketSummary::from_json_line(include_str!(
        "fixtures/p095/selected_bundle_review_packet_ready.json"
    ))
    .unwrap();
    let report = ReviewPacketReadReport {
        packets: vec![summary],
        invalid_lines: 0,
        skipped_empty_lines: 0,
    };

    let preview = preview_review_packet_consume("p098-ready", "p098-outbox", &report);

    assert_eq!(
        preview.to_json(),
        include_str!("fixtures/p098/review_packet_consume_preview_ready.json").trim()
    );
}

#[test]
fn review_packet_consume_preview_should_block_corrupt_outbox() {
    let store = FileReviewPacketStore::new(fixture_path(
        "p096",
        "review_packet_store_with_corrupt_lines.jsonl",
    ));
    let report = store.read_report().unwrap();

    let preview = preview_review_packet_consume("p098-corrupt", "p098-outbox", &report);

    assert_eq!(preview.status, "blocked_outbox_needs_repair");
}

#[test]
fn review_packet_consume_preview_should_block_live_packet() {
    let report = ReviewPacketReadReport {
        packets: vec![PersistedReviewPacketSummary {
            packet_id: "packet-live".to_string(),
            status: "ready_for_opencode_review".to_string(),
            dry_run: true,
            live_execution: true,
            next_action: "export_to_opencode_review_only".to_string(),
        }],
        invalid_lines: 0,
        skipped_empty_lines: 0,
    };

    let preview = preview_review_packet_consume("p098-live", "p098-outbox", &report);

    assert_eq!(preview.status, "blocked_live_execution_flag");
}

#[test]
fn review_packet_consume_preview_should_wait_when_empty() {
    let report = ReviewPacketReadReport {
        packets: Vec::new(),
        invalid_lines: 0,
        skipped_empty_lines: 0,
    };

    let preview = preview_review_packet_consume("p098-empty", "p098-outbox", &report);

    assert_eq!(preview.status, "blocked_empty_review_outbox");
}

#[test]
fn review_worker_handoff_envelope_should_match_ready_fixture() {
    let summary = PersistedReviewPacketSummary::from_json_line(include_str!(
        "fixtures/p095/selected_bundle_review_packet_ready.json"
    ))
    .unwrap();
    let report = ReviewPacketReadReport {
        packets: vec![summary],
        invalid_lines: 0,
        skipped_empty_lines: 0,
    };
    let preview = preview_review_packet_consume("p098-ready", "p098-outbox", &report);

    let envelope =
        create_review_worker_handoff_envelope("p099-ready", "opencode_review_only", &preview);

    assert_eq!(
        envelope.to_json(),
        include_str!("fixtures/p099/review_worker_handoff_envelope_ready.json").trim()
    );
}

#[test]
fn review_worker_handoff_envelope_should_block_corrupt_preview() {
    let store = FileReviewPacketStore::new(fixture_path(
        "p096",
        "review_packet_store_with_corrupt_lines.jsonl",
    ));
    let report = store.read_report().unwrap();
    let preview = preview_review_packet_consume("p098-corrupt", "p098-outbox", &report);

    let envelope =
        create_review_worker_handoff_envelope("p099-corrupt", "opencode_review_only", &preview);

    assert_eq!(envelope.status, "blocked_outbox_needs_repair");
}

#[test]
fn review_worker_handoff_envelope_should_block_live_preview() {
    let report = ReviewPacketReadReport {
        packets: vec![PersistedReviewPacketSummary {
            packet_id: "packet-live".to_string(),
            status: "ready_for_opencode_review".to_string(),
            dry_run: true,
            live_execution: true,
            next_action: "export_to_opencode_review_only".to_string(),
        }],
        invalid_lines: 0,
        skipped_empty_lines: 0,
    };
    let preview = preview_review_packet_consume("p098-live", "p098-outbox", &report);

    let envelope =
        create_review_worker_handoff_envelope("p099-live", "opencode_review_only", &preview);

    assert_eq!(envelope.status, "blocked_live_execution_flag");
}

#[test]
fn review_worker_handoff_store_should_write_local_json_artifact() {
    let path = unique_temp_handoff_envelope_path();
    let store = FileReviewWorkerHandoffStore::new(&path);
    let summary = PersistedReviewPacketSummary::from_json_line(include_str!(
        "fixtures/p095/selected_bundle_review_packet_ready.json"
    ))
    .unwrap();
    let report = ReviewPacketReadReport {
        packets: vec![summary],
        invalid_lines: 0,
        skipped_empty_lines: 0,
    };
    let preview = preview_review_packet_consume("p098-ready", "p098-outbox", &report);
    let envelope =
        create_review_worker_handoff_envelope("p099-ready", "opencode_review_only", &preview);

    store.write(&envelope).unwrap();
    let stored = std::fs::read_to_string(&path).unwrap();
    std::fs::remove_file(path).ok();

    assert_eq!(stored, envelope.to_json());
}

#[test]
fn persisted_review_worker_handoff_summary_should_parse_p099_fixture() {
    let summary = PersistedReviewWorkerHandoffSummary::from_json(include_str!(
        "fixtures/p099/review_worker_handoff_envelope_ready.json"
    ))
    .unwrap();

    assert_eq!(
        summary.next_action,
        "manual_opencode_review_only_no_invocation"
    );
}

#[test]
fn review_worker_handoff_store_read_report_should_match_ready_fixture() {
    let path = unique_temp_handoff_envelope_path();
    let store = FileReviewWorkerHandoffStore::new(&path);
    let envelope = ready_handoff_envelope();

    store.write(&envelope).unwrap();
    let report = store.read_report().unwrap();
    std::fs::remove_file(path).ok();

    assert_eq!(
        report.to_json(),
        include_str!("fixtures/p100/review_worker_handoff_read_report_ready.json").trim()
    );
}

#[test]
fn review_worker_handoff_status_should_match_ready_fixture() {
    let envelope = PersistedReviewWorkerHandoffSummary::from_json(include_str!(
        "fixtures/p099/review_worker_handoff_envelope_ready.json"
    ))
    .unwrap();
    let report = ghostclaw_migration_core::adapters::review_packet::ReviewWorkerHandoffReadReport {
        envelope: Some(envelope),
        missing: false,
        invalid: false,
    };

    let status = evaluate_review_worker_handoff_status("p100-ready", &report);

    assert_eq!(
        status.to_json(),
        include_str!("fixtures/p100/review_worker_handoff_status_ready.json").trim()
    );
}

#[test]
fn review_worker_handoff_status_should_wait_when_envelope_missing() {
    let store = FileReviewWorkerHandoffStore::new(unique_temp_handoff_envelope_path());
    let report = store.read_report().unwrap();

    let status = evaluate_review_worker_handoff_status("p100-missing", &report);

    assert_eq!(status.status, "missing_handoff_envelope");
}

#[test]
fn review_worker_handoff_status_should_block_invalid_envelope() {
    let path = unique_temp_handoff_envelope_path();
    std::fs::write(&path, "not-json").unwrap();
    let store = FileReviewWorkerHandoffStore::new(&path);
    let report = store.read_report().unwrap();
    std::fs::remove_file(path).ok();

    let status = evaluate_review_worker_handoff_status("p100-invalid", &report);

    assert_eq!(status.status, "blocked_invalid_handoff_envelope");
}

#[test]
fn review_worker_handoff_status_should_block_live_envelope() {
    let report = ghostclaw_migration_core::adapters::review_packet::ReviewWorkerHandoffReadReport {
        envelope: Some(PersistedReviewWorkerHandoffSummary {
            envelope_id: "p100-live".to_string(),
            status: "ready_for_manual_opencode_review".to_string(),
            dry_run: true,
            live_execution: true,
            handoff_target: "opencode_review_only".to_string(),
            next_action: "manual_opencode_review_only_no_invocation".to_string(),
        }),
        missing: false,
        invalid: false,
    };

    let status = evaluate_review_worker_handoff_status("p100-live", &report);

    assert_eq!(status.status, "blocked_live_execution_flag");
}

#[test]
fn review_handoff_bundle_manifest_should_match_ready_fixture() {
    let preview = ready_consume_preview();
    let status = ready_handoff_status();

    let manifest = create_review_handoff_bundle_manifest("p101-ready", &preview, &status);

    assert_eq!(
        manifest.to_json(),
        include_str!("fixtures/p101/review_handoff_bundle_manifest_ready.json").trim()
    );
}

#[test]
fn review_handoff_bundle_manifest_should_block_live_preview() {
    let report = ReviewPacketReadReport {
        packets: vec![PersistedReviewPacketSummary {
            packet_id: "packet-live".to_string(),
            status: "ready_for_opencode_review".to_string(),
            dry_run: true,
            live_execution: true,
            next_action: "export_to_opencode_review_only".to_string(),
        }],
        invalid_lines: 0,
        skipped_empty_lines: 0,
    };
    let preview = preview_review_packet_consume("p098-live", "p098-outbox", &report);
    let status = ready_handoff_status();

    let manifest = create_review_handoff_bundle_manifest("p101-live", &preview, &status);

    assert_eq!(manifest.status, "blocked_live_execution_flag");
}

#[test]
fn review_handoff_bundle_manifest_should_block_missing_handoff_status() {
    let preview = ready_consume_preview();
    let report = ghostclaw_migration_core::adapters::review_packet::ReviewWorkerHandoffReadReport {
        envelope: None,
        missing: true,
        invalid: false,
    };
    let status = evaluate_review_worker_handoff_status("p100-missing", &report);

    let manifest = create_review_handoff_bundle_manifest("p101-missing", &preview, &status);

    assert_eq!(manifest.status, "blocked_handoff_status_not_ready");
}

#[test]
fn review_handoff_bundle_manifest_store_should_write_local_json_artifact() {
    let path = unique_temp_handoff_manifest_path();
    let store = FileReviewHandoffBundleManifestStore::new(&path);
    let preview = ready_consume_preview();
    let status = ready_handoff_status();
    let manifest = create_review_handoff_bundle_manifest("p101-ready", &preview, &status);

    store.write(&manifest).unwrap();
    let stored = std::fs::read_to_string(&path).unwrap();
    std::fs::remove_file(path).ok();

    assert_eq!(stored, manifest.to_json());
}

#[test]
fn persisted_review_handoff_bundle_manifest_summary_should_parse_p101_fixture() {
    let summary = PersistedReviewHandoffBundleManifestSummary::from_json(include_str!(
        "fixtures/p101/review_handoff_bundle_manifest_ready.json"
    ))
    .unwrap();

    assert_eq!(summary.selected_packet_id.as_deref(), Some("packet-p095"));
}

#[test]
fn review_handoff_bundle_manifest_store_read_report_should_match_ready_fixture() {
    let path = unique_temp_handoff_manifest_path();
    let store = FileReviewHandoffBundleManifestStore::new(&path);
    let preview = ready_consume_preview();
    let status = ready_handoff_status();
    let manifest = create_review_handoff_bundle_manifest("p101-ready", &preview, &status);

    store.write(&manifest).unwrap();
    let report = store.read_report().unwrap();
    std::fs::remove_file(path).ok();

    assert_eq!(
        report.to_json(),
        include_str!("fixtures/p102/review_handoff_bundle_manifest_read_report_ready.json").trim()
    );
}

#[test]
fn review_handoff_bundle_manifest_status_should_match_ready_fixture() {
    let report = ready_handoff_manifest_read_report();

    let status = evaluate_review_handoff_bundle_manifest_status("p102-ready", &report);

    assert_eq!(
        status.to_json(),
        include_str!("fixtures/p102/review_handoff_bundle_manifest_status_ready.json").trim()
    );
}

#[test]
fn review_handoff_bundle_manifest_status_should_wait_when_manifest_missing() {
    let store = FileReviewHandoffBundleManifestStore::new(unique_temp_handoff_manifest_path());
    let report = store.read_report().unwrap();

    let status = evaluate_review_handoff_bundle_manifest_status("p102-missing", &report);

    assert_eq!(status.status, "missing_handoff_manifest");
}

#[test]
fn review_handoff_bundle_manifest_status_should_block_invalid_manifest() {
    let path = unique_temp_handoff_manifest_path();
    let store = FileReviewHandoffBundleManifestStore::new(&path);
    std::fs::write(&path, "not-json").unwrap();

    let report = store.read_report().unwrap();
    let status = evaluate_review_handoff_bundle_manifest_status("p102-invalid", &report);
    std::fs::remove_file(path).ok();

    assert_eq!(status.status, "blocked_invalid_handoff_manifest");
}

#[test]
fn review_handoff_bundle_manifest_status_should_block_live_manifest() {
    let report = ReviewHandoffBundleManifestReadReport {
        manifest: Some(PersistedReviewHandoffBundleManifestSummary {
            manifest_id: "p101-live".to_string(),
            status: "ready_for_manual_review_handoff_manifest".to_string(),
            dry_run: true,
            live_execution: true,
            review_only: true,
            selected_packet_id: Some("packet-p095".to_string()),
            next_action: "manual_opencode_review_only_no_invocation".to_string(),
        }),
        missing: false,
        invalid: false,
    };

    let status = evaluate_review_handoff_bundle_manifest_status("p102-live", &report);

    assert_eq!(status.status, "blocked_live_execution_flag");
}

#[test]
fn review_handoff_operator_card_should_match_ready_fixture() {
    let report = ready_handoff_manifest_read_report();
    let status = evaluate_review_handoff_bundle_manifest_status("p102-ready", &report);

    let card = create_review_handoff_operator_card("p102-card-ready", &status);

    assert_eq!(
        card.to_json(),
        include_str!("fixtures/p102/review_handoff_operator_card_ready.json").trim()
    );
}

#[test]
fn review_handoff_operator_card_should_block_non_ready_manifest_status() {
    let report = ReviewHandoffBundleManifestReadReport {
        manifest: None,
        missing: true,
        invalid: false,
    };
    let status = evaluate_review_handoff_bundle_manifest_status("p102-missing", &report);

    let card = create_review_handoff_operator_card("p102-card-missing", &status);

    assert_eq!(card.status, "blocked_manifest_not_review_ready");
}

#[test]
fn manual_review_candidate_should_match_ready_fixture() {
    let candidate = ready_review_candidate();

    assert_eq!(
        candidate.to_json(),
        include_str!("fixtures/p103/manual_review_candidate_pass.json").trim()
    );
}

#[test]
fn review_candidate_store_read_report_should_match_ready_fixture() {
    let path = unique_temp_review_candidate_path();
    let store = FileReviewCandidateStore::new(&path);
    let candidate = ready_review_candidate();

    store.write(&candidate).unwrap();
    let report = store.read_report().unwrap();
    std::fs::remove_file(path).ok();

    assert_eq!(
        report.to_json(),
        include_str!("fixtures/p103/review_candidate_read_report_ready.json").trim()
    );
}

#[test]
fn review_candidate_intake_status_should_match_pass_fixture() {
    let card = ready_operator_card();
    let report = ready_review_candidate_read_report();

    let status = evaluate_review_candidate_intake_status("p103-pass", &card, &report);

    assert_eq!(
        status.to_json(),
        include_str!("fixtures/p103/review_candidate_intake_status_pass.json").trim()
    );
}

#[test]
fn review_candidate_intake_status_should_wait_when_candidate_missing() {
    let card = ready_operator_card();
    let store = FileReviewCandidateStore::new(unique_temp_review_candidate_path());
    let report = store.read_report().unwrap();

    let status = evaluate_review_candidate_intake_status("p103-missing", &card, &report);

    assert_eq!(status.status, "missing_review_candidate");
}

#[test]
fn review_candidate_intake_status_should_block_invalid_candidate() {
    let path = unique_temp_review_candidate_path();
    let store = FileReviewCandidateStore::new(&path);
    std::fs::write(&path, "not-json").unwrap();
    let card = ready_operator_card();

    let report = store.read_report().unwrap();
    let status = evaluate_review_candidate_intake_status("p103-invalid", &card, &report);
    std::fs::remove_file(path).ok();

    assert_eq!(status.status, "blocked_invalid_review_candidate");
}

#[test]
fn review_candidate_intake_status_should_block_source_card_mismatch() {
    let card = ready_operator_card();
    let mut candidate = ready_review_candidate();
    candidate.source_card_id = "wrong-card".to_string();
    let report = ReviewCandidateReadReport {
        candidate: Some(candidate),
        missing: false,
        invalid: false,
    };

    let status = evaluate_review_candidate_intake_status("p103-mismatch", &card, &report);

    assert_eq!(status.status, "blocked_candidate_card_mismatch");
}

#[test]
fn review_candidate_intake_status_should_block_live_candidate() {
    let card = ready_operator_card();
    let mut candidate = ready_review_candidate();
    candidate.live_execution = true;
    let report = ReviewCandidateReadReport {
        candidate: Some(candidate),
        missing: false,
        invalid: false,
    };

    let status = evaluate_review_candidate_intake_status("p103-live", &card, &report);

    assert_eq!(status.status, "blocked_live_execution_flag");
}

#[test]
fn review_candidate_intake_status_should_block_candidate_with_blocking_issue() {
    let card = ready_operator_card();
    let mut candidate = ready_review_candidate();
    candidate.blocking_issue = true;
    candidate.verdict = "fail".to_string();
    let report = ReviewCandidateReadReport {
        candidate: Some(candidate),
        missing: false,
        invalid: false,
    };

    let status = evaluate_review_candidate_intake_status("p103-blocking", &card, &report);

    assert_eq!(status.status, "blocked_review_candidate_blocking_issue");
}

#[test]
fn review_result_transition_preview_should_match_pass_fixture() {
    let status = ready_review_candidate_intake_status();

    let preview = preview_review_result_transition("p104-transition-pass", &status);

    assert_eq!(
        preview.to_json(),
        include_str!("fixtures/p104/review_result_transition_preview_pass.json").trim()
    );
}

#[test]
fn review_result_transition_preview_should_surface_warn_for_human_decision() {
    let card = ready_operator_card();
    let mut candidate = ready_review_candidate();
    candidate.verdict = "warn".to_string();
    let report = ReviewCandidateReadReport {
        candidate: Some(candidate),
        missing: false,
        invalid: false,
    };
    let status = evaluate_review_candidate_intake_status("p103-warn", &card, &report);

    let preview = preview_review_result_transition("p104-transition-warn", &status);

    assert_eq!(preview.status, "ready_for_human_review_decision_preview");
}

#[test]
fn review_result_transition_preview_should_block_live_candidate_status() {
    let mut status = ready_review_candidate_intake_status();
    status.live_execution = true;

    let preview = preview_review_result_transition("p104-transition-live", &status);

    assert_eq!(preview.status, "blocked_live_execution_flag");
}

#[test]
fn review_result_transition_preview_should_block_non_ready_candidate_status() {
    let card = ready_operator_card();
    let report = ReviewCandidateReadReport {
        candidate: None,
        missing: true,
        invalid: false,
    };
    let status = evaluate_review_candidate_intake_status("p103-missing", &card, &report);

    let preview = preview_review_result_transition("p104-transition-missing", &status);

    assert_eq!(preview.status, "blocked_candidate_status_not_ready");
}

#[test]
fn review_result_transition_gate_should_match_ready_fixture() {
    let preview = ready_review_result_transition_preview();

    let gate = create_review_result_transition_gate("p105-gate-ready", &preview);

    assert_eq!(
        gate.to_json(),
        include_str!("fixtures/p105/review_result_transition_gate_ready.json").trim()
    );
}

#[test]
fn review_result_transition_gate_should_surface_warn_decision() {
    let card = ready_operator_card();
    let mut candidate = ready_review_candidate();
    candidate.verdict = "warn".to_string();
    let report = ReviewCandidateReadReport {
        candidate: Some(candidate),
        missing: false,
        invalid: false,
    };
    let status = evaluate_review_candidate_intake_status("p103-warn", &card, &report);
    let preview = preview_review_result_transition("p104-transition-warn", &status);

    let gate = create_review_result_transition_gate("p105-gate-warn", &preview);

    assert_eq!(gate.status, "ready_for_human_warn_decision_gate");
}

#[test]
fn review_result_transition_gate_should_block_live_preview() {
    let mut preview = ready_review_result_transition_preview();
    preview.live_execution = true;

    let gate = create_review_result_transition_gate("p105-gate-live", &preview);

    assert_eq!(gate.status, "blocked_live_execution_flag");
}

#[test]
fn review_result_transition_gate_should_block_non_ready_preview() {
    let card = ready_operator_card();
    let report = ReviewCandidateReadReport {
        candidate: None,
        missing: true,
        invalid: false,
    };
    let status = evaluate_review_candidate_intake_status("p103-missing", &card, &report);
    let preview = preview_review_result_transition("p104-transition-missing", &status);

    let gate = create_review_result_transition_gate("p105-gate-missing", &preview);

    assert_eq!(gate.status, "blocked_transition_preview_not_ready");
}

#[test]
fn persisted_review_result_transition_gate_summary_should_parse_p105_fixture() {
    let summary = PersistedReviewResultTransitionGateSummary::from_json(include_str!(
        "fixtures/p105/review_result_transition_gate_ready.json"
    ))
    .unwrap();

    assert_eq!(
        summary.next_action,
        "wait_for_explicit_human_transition_decision"
    );
}

#[test]
fn review_result_transition_gate_store_read_report_should_match_ready_fixture() {
    let path = unique_temp_result_transition_gate_path();
    let store = FileReviewResultTransitionGateStore::new(&path);
    let gate = ready_review_result_transition_gate();

    store.write(&gate).unwrap();
    let report = store.read_report().unwrap();
    std::fs::remove_file(path).ok();

    assert_eq!(
        report.to_json(),
        include_str!("fixtures/p106/review_result_transition_gate_read_report_ready.json").trim()
    );
}

#[test]
fn review_result_transition_gate_status_should_match_ready_fixture() {
    let gate = PersistedReviewResultTransitionGateSummary::from_json(include_str!(
        "fixtures/p105/review_result_transition_gate_ready.json"
    ))
    .unwrap();
    let report =
        ghostclaw_migration_core::adapters::review_packet::ReviewResultTransitionGateReadReport {
            gate: Some(gate),
            missing: false,
            invalid: false,
        };

    let status = evaluate_review_result_transition_gate_status("p106-ready", &report);

    assert_eq!(
        status.to_json(),
        include_str!("fixtures/p106/review_result_transition_gate_status_ready.json").trim()
    );
}

#[test]
fn review_result_transition_gate_status_should_wait_when_gate_missing() {
    let store = FileReviewResultTransitionGateStore::new(unique_temp_result_transition_gate_path());
    let report = store.read_report().unwrap();

    let status = evaluate_review_result_transition_gate_status("p106-missing", &report);

    assert_eq!(status.status, "missing_result_transition_gate");
}

#[test]
fn review_result_transition_gate_status_should_block_invalid_gate() {
    let path = unique_temp_result_transition_gate_path();
    let store = FileReviewResultTransitionGateStore::new(&path);
    std::fs::write(&path, "not-json").unwrap();

    let report = store.read_report().unwrap();
    let status = evaluate_review_result_transition_gate_status("p106-invalid", &report);
    std::fs::remove_file(path).ok();

    assert_eq!(status.status, "blocked_invalid_result_transition_gate");
}

#[test]
fn review_result_transition_gate_status_should_block_live_gate() {
    let mut gate = ready_result_transition_gate_summary();
    gate.live_execution = true;
    let report =
        ghostclaw_migration_core::adapters::review_packet::ReviewResultTransitionGateReadReport {
            gate: Some(gate),
            missing: false,
            invalid: false,
        };

    let status = evaluate_review_result_transition_gate_status("p106-live", &report);

    assert_eq!(status.status, "blocked_live_execution_flag");
}

#[test]
fn review_result_transition_gate_status_should_block_mutating_gate() {
    let mut gate = ready_result_transition_gate_summary();
    gate.queue_consumption_allowed = true;
    let report =
        ghostclaw_migration_core::adapters::review_packet::ReviewResultTransitionGateReadReport {
            gate: Some(gate),
            missing: false,
            invalid: false,
        };

    let status = evaluate_review_result_transition_gate_status("p106-mutating", &report);

    assert_eq!(status.status, "blocked_transition_gate_mutation_enabled");
}

#[test]
fn human_transition_decision_should_match_accept_fixture() {
    let decision = ready_human_transition_decision();

    assert_eq!(
        decision.to_json(),
        include_str!("fixtures/p107/human_transition_decision_accept.json").trim()
    );
}

#[test]
fn human_transition_decision_store_read_report_should_match_ready_fixture() {
    let path = unique_temp_human_transition_decision_path();
    let store = FileHumanTransitionDecisionStore::new(&path);
    let decision = ready_human_transition_decision();

    store.write(&decision).unwrap();
    let report = store.read_report().unwrap();
    std::fs::remove_file(path).ok();

    assert_eq!(
        report.to_json(),
        include_str!("fixtures/p107/human_transition_decision_read_report_ready.json").trim()
    );
}

#[test]
fn human_transition_decision_intake_status_should_match_accept_fixture() {
    let gate_status = ready_result_transition_gate_status();
    let report = ready_human_transition_decision_read_report();

    let status =
        evaluate_human_transition_decision_intake_status("p107-accept", &gate_status, &report);

    assert_eq!(
        status.to_json(),
        include_str!("fixtures/p107/human_transition_decision_intake_status_accept.json").trim()
    );
}

#[test]
fn human_transition_decision_intake_status_should_wait_when_decision_missing() {
    let gate_status = ready_result_transition_gate_status();
    let store = FileHumanTransitionDecisionStore::new(unique_temp_human_transition_decision_path());
    let report = store.read_report().unwrap();

    let status =
        evaluate_human_transition_decision_intake_status("p107-missing", &gate_status, &report);

    assert_eq!(status.status, "missing_human_transition_decision");
}

#[test]
fn human_transition_decision_intake_status_should_block_invalid_decision() {
    let path = unique_temp_human_transition_decision_path();
    let store = FileHumanTransitionDecisionStore::new(&path);
    std::fs::write(&path, "not-json").unwrap();
    let gate_status = ready_result_transition_gate_status();

    let report = store.read_report().unwrap();
    let status =
        evaluate_human_transition_decision_intake_status("p107-invalid", &gate_status, &report);
    std::fs::remove_file(path).ok();

    assert_eq!(status.status, "blocked_invalid_human_transition_decision");
}

#[test]
fn human_transition_decision_intake_status_should_block_gate_mismatch() {
    let gate_status = ready_result_transition_gate_status();
    let mut decision = ready_human_transition_decision();
    decision.source_gate_id = "wrong-gate".to_string();
    let report = HumanTransitionDecisionReadReport {
        decision: Some(decision),
        missing: false,
        invalid: false,
    };

    let status =
        evaluate_human_transition_decision_intake_status("p107-mismatch", &gate_status, &report);

    assert_eq!(status.status, "blocked_decision_gate_mismatch");
}

#[test]
fn human_transition_decision_intake_status_should_block_mutating_decision() {
    let gate_status = ready_result_transition_gate_status();
    let mut decision = ready_human_transition_decision();
    decision.queue_consumption_allowed = true;
    let report = HumanTransitionDecisionReadReport {
        decision: Some(decision),
        missing: false,
        invalid: false,
    };

    let status =
        evaluate_human_transition_decision_intake_status("p107-mutating", &gate_status, &report);

    assert_eq!(status.status, "blocked_decision_mutation_enabled");
}

#[test]
fn human_transition_decision_intake_status_should_accept_reject_and_hold() {
    let gate_status = ready_result_transition_gate_status();

    let mut reject = ready_human_transition_decision();
    reject.decision_id = "p107-decision-reject".to_string();
    reject.decision_kind = "reject".to_string();
    let reject_report = HumanTransitionDecisionReadReport {
        decision: Some(reject),
        missing: false,
        invalid: false,
    };
    let reject_status = evaluate_human_transition_decision_intake_status(
        "p107-reject",
        &gate_status,
        &reject_report,
    );
    assert_eq!(
        reject_status.status,
        "ready_for_rejected_human_transition_decision"
    );

    let mut hold = ready_human_transition_decision();
    hold.decision_id = "p107-decision-hold".to_string();
    hold.decision_kind = "hold".to_string();
    let hold_report = HumanTransitionDecisionReadReport {
        decision: Some(hold),
        missing: false,
        invalid: false,
    };
    let hold_status =
        evaluate_human_transition_decision_intake_status("p107-hold", &gate_status, &hold_report);
    assert_eq!(
        hold_status.status,
        "ready_for_held_human_transition_decision"
    );
}

#[test]
fn transition_execution_preview_should_match_accept_fixture() {
    let status = ready_human_transition_decision_intake_status();

    let preview = preview_transition_execution_no_mutation("p108-accept-preview", &status);

    assert_eq!(
        preview.to_json(),
        include_str!("fixtures/p108/transition_execution_preview_accept.json").trim()
    );
}

#[test]
fn transition_execution_preview_should_preview_reject_and_hold_without_mutation() {
    let gate_status = ready_result_transition_gate_status();

    let mut reject = ready_human_transition_decision();
    reject.decision_id = "p107-decision-reject".to_string();
    reject.decision_kind = "reject".to_string();
    let reject_report = HumanTransitionDecisionReadReport {
        decision: Some(reject),
        missing: false,
        invalid: false,
    };
    let reject_status = evaluate_human_transition_decision_intake_status(
        "p107-reject",
        &gate_status,
        &reject_report,
    );
    let reject_preview =
        preview_transition_execution_no_mutation("p108-reject-preview", &reject_status);
    assert_eq!(
        reject_preview.status,
        "ready_for_transition_rejection_preview"
    );
    assert!(!reject_preview.queue_consumption_allowed);
    assert!(!reject_preview.source_mutation_allowed);
    assert!(!reject_preview.state_mutation_allowed);

    let mut hold = ready_human_transition_decision();
    hold.decision_id = "p107-decision-hold".to_string();
    hold.decision_kind = "hold".to_string();
    let hold_report = HumanTransitionDecisionReadReport {
        decision: Some(hold),
        missing: false,
        invalid: false,
    };
    let hold_status =
        evaluate_human_transition_decision_intake_status("p107-hold", &gate_status, &hold_report);
    let hold_preview = preview_transition_execution_no_mutation("p108-hold-preview", &hold_status);
    assert_eq!(hold_preview.status, "ready_for_transition_hold_preview");
    assert!(!hold_preview.queue_consumption_allowed);
    assert!(!hold_preview.source_mutation_allowed);
    assert!(!hold_preview.state_mutation_allowed);
}

#[test]
fn transition_execution_preview_should_block_live_decision_status() {
    let mut status = ready_human_transition_decision_intake_status();
    status.live_execution = true;

    let preview = preview_transition_execution_no_mutation("p108-live-preview", &status);

    assert_eq!(preview.status, "blocked_live_execution_flag");
}

#[test]
fn transition_execution_preview_should_block_non_ready_decision_status() {
    let gate_status = ready_result_transition_gate_status();
    let report = HumanTransitionDecisionReadReport {
        decision: None,
        missing: true,
        invalid: false,
    };
    let status =
        evaluate_human_transition_decision_intake_status("p107-missing", &gate_status, &report);

    let preview = preview_transition_execution_no_mutation("p108-missing-preview", &status);

    assert_eq!(preview.status, "blocked_human_decision_not_ready");
    assert_eq!(preview.transition_action, "do_not_transition");
}

#[test]
fn transition_apply_gate_preview_should_match_accept_fixture() {
    let preview = ready_transition_execution_preview();

    let gate = create_transition_apply_gate_preview("p109-apply-gate-accept", &preview);

    assert_eq!(
        gate.to_json(),
        include_str!("fixtures/p109/transition_apply_gate_preview_accept.json").trim()
    );
}

#[test]
fn transition_apply_gate_preview_should_surface_reject_and_hold_gates() {
    let gate_status = ready_result_transition_gate_status();

    let mut reject = ready_human_transition_decision();
    reject.decision_id = "p107-decision-reject".to_string();
    reject.decision_kind = "reject".to_string();
    let reject_report = HumanTransitionDecisionReadReport {
        decision: Some(reject),
        missing: false,
        invalid: false,
    };
    let reject_status = evaluate_human_transition_decision_intake_status(
        "p107-reject",
        &gate_status,
        &reject_report,
    );
    let reject_preview =
        preview_transition_execution_no_mutation("p108-reject-preview", &reject_status);
    let reject_gate = create_transition_apply_gate_preview("p109-reject-gate", &reject_preview);
    assert_eq!(
        reject_gate.status,
        "ready_for_transition_rejection_apply_gate_preview"
    );
    assert!(reject_gate.exact_approval_required);
    assert!(!reject_gate.queue_consumption_allowed);

    let mut hold = ready_human_transition_decision();
    hold.decision_id = "p107-decision-hold".to_string();
    hold.decision_kind = "hold".to_string();
    let hold_report = HumanTransitionDecisionReadReport {
        decision: Some(hold),
        missing: false,
        invalid: false,
    };
    let hold_status =
        evaluate_human_transition_decision_intake_status("p107-hold", &gate_status, &hold_report);
    let hold_preview = preview_transition_execution_no_mutation("p108-hold-preview", &hold_status);
    let hold_gate = create_transition_apply_gate_preview("p109-hold-gate", &hold_preview);
    assert_eq!(
        hold_gate.status,
        "ready_for_transition_hold_apply_gate_preview"
    );
    assert!(hold_gate.exact_approval_required);
    assert!(!hold_gate.state_mutation_allowed);
}

#[test]
fn transition_apply_gate_preview_should_block_live_preview() {
    let mut preview = ready_transition_execution_preview();
    preview.live_execution = true;

    let gate = create_transition_apply_gate_preview("p109-live-gate", &preview);

    assert_eq!(gate.status, "blocked_live_execution_flag");
    assert!(!gate.exact_approval_required);
}

#[test]
fn transition_apply_gate_preview_should_block_mutating_preview() {
    let mut preview = ready_transition_execution_preview();
    preview.state_mutation_allowed = true;

    let gate = create_transition_apply_gate_preview("p109-mutating-gate", &preview);

    assert_eq!(gate.status, "blocked_transition_preview_mutation_enabled");
    assert_eq!(gate.operator_action, "do_not_apply_transition");
}

#[test]
fn transition_apply_gate_preview_should_block_non_ready_preview() {
    let gate_status = ready_result_transition_gate_status();
    let report = HumanTransitionDecisionReadReport {
        decision: None,
        missing: true,
        invalid: false,
    };
    let status =
        evaluate_human_transition_decision_intake_status("p107-missing", &gate_status, &report);
    let preview = preview_transition_execution_no_mutation("p108-missing-preview", &status);

    let gate = create_transition_apply_gate_preview("p109-missing-gate", &preview);

    assert_eq!(gate.status, "blocked_transition_preview_not_ready");
    assert_eq!(gate.operator_action, "do_not_apply_transition");
}

#[test]
fn transition_apply_approval_should_match_apply_fixture() {
    let approval = ready_transition_apply_approval();

    assert_eq!(
        approval.to_json(),
        include_str!("fixtures/p110/transition_apply_approval_apply.json").trim()
    );
}

#[test]
fn transition_apply_approval_store_read_report_should_match_ready_fixture() {
    let path = unique_temp_transition_apply_approval_path();
    let store = FileTransitionApplyApprovalStore::new(&path);
    let approval = ready_transition_apply_approval();

    store.write(&approval).unwrap();
    let report = store.read_report().unwrap();
    std::fs::remove_file(path).ok();

    assert_eq!(
        report.to_json(),
        include_str!("fixtures/p110/transition_apply_approval_read_report_ready.json").trim()
    );
}

#[test]
fn transition_apply_approval_intake_status_should_match_apply_fixture() {
    let gate = ready_transition_apply_gate_preview();
    let report = ready_transition_apply_approval_read_report();

    let status = evaluate_transition_apply_approval_intake_status("p110-apply", &gate, &report);

    assert_eq!(
        status.to_json(),
        include_str!("fixtures/p110/transition_apply_approval_intake_status_apply.json").trim()
    );
}

#[test]
fn transition_apply_approval_intake_status_should_wait_when_missing() {
    let gate = ready_transition_apply_gate_preview();
    let store = FileTransitionApplyApprovalStore::new(unique_temp_transition_apply_approval_path());
    let report = store.read_report().unwrap();

    let status = evaluate_transition_apply_approval_intake_status("p110-missing", &gate, &report);

    assert_eq!(status.status, "missing_transition_apply_approval");
}

#[test]
fn transition_apply_approval_intake_status_should_block_invalid_approval() {
    let path = unique_temp_transition_apply_approval_path();
    let store = FileTransitionApplyApprovalStore::new(&path);
    std::fs::write(&path, "not-json").unwrap();
    let gate = ready_transition_apply_gate_preview();

    let report = store.read_report().unwrap();
    let status = evaluate_transition_apply_approval_intake_status("p110-invalid", &gate, &report);
    std::fs::remove_file(path).ok();

    assert_eq!(status.status, "blocked_invalid_transition_apply_approval");
}

#[test]
fn transition_apply_approval_intake_status_should_block_gate_mismatch() {
    let gate = ready_transition_apply_gate_preview();
    let mut approval = ready_transition_apply_approval();
    approval.source_gate_id = "wrong-gate".to_string();
    let report = TransitionApplyApprovalReadReport {
        approval: Some(approval),
        missing: false,
        invalid: false,
    };

    let status = evaluate_transition_apply_approval_intake_status("p110-mismatch", &gate, &report);

    assert_eq!(status.status, "blocked_approval_gate_mismatch");
}

#[test]
fn transition_apply_approval_intake_status_should_block_non_exact_text() {
    let gate = ready_transition_apply_gate_preview();
    let mut approval = ready_transition_apply_approval();
    approval.approval_text = "APPROVE_TRANSITION_APPLY".to_string();
    let report = TransitionApplyApprovalReadReport {
        approval: Some(approval),
        missing: false,
        invalid: false,
    };

    let status =
        evaluate_transition_apply_approval_intake_status("p110-wrong-text", &gate, &report);

    assert_eq!(status.status, "blocked_approval_text_mismatch");
}

#[test]
fn transition_apply_approval_intake_status_should_block_mutating_approval() {
    let gate = ready_transition_apply_gate_preview();
    let mut approval = ready_transition_apply_approval();
    approval.state_mutation_allowed = true;
    let report = TransitionApplyApprovalReadReport {
        approval: Some(approval),
        missing: false,
        invalid: false,
    };

    let status = evaluate_transition_apply_approval_intake_status("p110-mutating", &gate, &report);

    assert_eq!(status.status, "blocked_approval_mutation_enabled");
}

#[test]
fn transition_apply_approval_intake_status_should_accept_reject_and_hold_approvals() {
    let reject_gate = reject_transition_apply_gate_preview();
    let reject_report = TransitionApplyApprovalReadReport {
        approval: Some(reject_transition_apply_approval()),
        missing: false,
        invalid: false,
    };
    let reject_status = evaluate_transition_apply_approval_intake_status(
        "p110-reject",
        &reject_gate,
        &reject_report,
    );
    assert_eq!(
        reject_status.status,
        "ready_for_rejection_record_approval_intake"
    );

    let hold_gate = hold_transition_apply_gate_preview();
    let hold_report = TransitionApplyApprovalReadReport {
        approval: Some(hold_transition_apply_approval()),
        missing: false,
        invalid: false,
    };
    let hold_status =
        evaluate_transition_apply_approval_intake_status("p110-hold", &hold_gate, &hold_report);
    assert_eq!(hold_status.status, "ready_for_hold_record_approval_intake");
}

#[test]
fn transition_apply_execution_plan_should_match_apply_fixture() {
    let plan = ready_transition_apply_execution_plan();

    assert_eq!(
        plan.to_json(),
        include_str!("fixtures/p111/transition_apply_execution_plan_apply.json").trim()
    );
}

#[test]
fn transition_apply_execution_plan_should_preview_reject_and_hold_without_mutation() {
    let reject_status = reject_transition_apply_approval_intake_status();
    let reject_plan =
        plan_transition_apply_execution_no_mutation("p111-reject-plan", &reject_status);
    assert_eq!(reject_plan.status, "ready_for_rejection_record_plan");
    assert_eq!(
        reject_plan.planned_transition,
        "plan_record_review_result_rejected"
    );
    assert!(reject_plan.plan_only);
    assert!(reject_plan.apply_requires_next_gate);
    assert!(!reject_plan.queue_consumption_allowed);
    assert!(!reject_plan.state_mutation_allowed);

    let hold_status = hold_transition_apply_approval_intake_status();
    let hold_plan = plan_transition_apply_execution_no_mutation("p111-hold-plan", &hold_status);
    assert_eq!(hold_plan.status, "ready_for_hold_record_plan");
    assert_eq!(
        hold_plan.planned_transition,
        "plan_record_review_result_hold"
    );
    assert!(hold_plan.plan_only);
    assert!(hold_plan.apply_requires_next_gate);
    assert!(!hold_plan.queue_consumption_allowed);
    assert!(!hold_plan.state_mutation_allowed);
}

#[test]
fn transition_apply_execution_plan_should_block_live_approval_status() {
    let mut status = ready_transition_apply_approval_intake_status();
    status.live_execution = true;

    let plan = plan_transition_apply_execution_no_mutation("p111-live-plan", &status);

    assert_eq!(plan.status, "blocked_live_execution_flag");
    assert!(!plan.apply_requires_next_gate);
    assert_eq!(plan.planned_transition, "do_not_apply_transition");
}

#[test]
fn transition_apply_execution_plan_should_block_non_ready_approval_status() {
    let gate = ready_transition_apply_gate_preview();
    let store = FileTransitionApplyApprovalStore::new(unique_temp_transition_apply_approval_path());
    let report = store.read_report().unwrap();
    let status = evaluate_transition_apply_approval_intake_status("p110-missing", &gate, &report);

    let plan = plan_transition_apply_execution_no_mutation("p111-missing-plan", &status);

    assert_eq!(plan.status, "blocked_apply_approval_not_ready");
    assert!(!plan.apply_requires_next_gate);
}

#[test]
fn transition_apply_execution_plan_should_block_mutating_approval_status() {
    let mut status = ready_transition_apply_approval_intake_status();
    status.state_mutation_allowed = true;

    let plan = plan_transition_apply_execution_no_mutation("p111-mutating-plan", &status);

    assert_eq!(plan.status, "blocked_apply_approval_mutation_enabled");
    assert!(!plan.apply_requires_next_gate);
    assert!(!plan.state_mutation_allowed);
}

#[test]
fn transition_apply_execution_gate_preview_should_match_apply_fixture() {
    let gate = ready_transition_apply_execution_gate_preview();

    assert_eq!(
        gate.to_json(),
        include_str!("fixtures/p112/transition_apply_execution_gate_preview_apply.json").trim()
    );
}

#[test]
fn transition_apply_execution_gate_preview_should_surface_reject_and_hold_gates() {
    let reject_plan = reject_transition_apply_execution_plan();
    let reject_gate =
        create_transition_apply_execution_gate_preview("p112-reject-execution-gate", &reject_plan);
    assert_eq!(
        reject_gate.status,
        "ready_for_rejection_record_execution_gate_preview"
    );
    assert_eq!(
        reject_gate.operator_action,
        "request_exact_rejection_record_execution_approval"
    );
    assert!(reject_gate.exact_execution_approval_required);
    assert!(!reject_gate.queue_consumption_allowed);
    assert!(!reject_gate.state_mutation_allowed);

    let hold_plan = hold_transition_apply_execution_plan();
    let hold_gate =
        create_transition_apply_execution_gate_preview("p112-hold-execution-gate", &hold_plan);
    assert_eq!(
        hold_gate.status,
        "ready_for_hold_record_execution_gate_preview"
    );
    assert_eq!(
        hold_gate.operator_action,
        "request_exact_hold_record_execution_approval"
    );
    assert!(hold_gate.exact_execution_approval_required);
    assert!(!hold_gate.queue_consumption_allowed);
    assert!(!hold_gate.state_mutation_allowed);
}

#[test]
fn transition_apply_execution_gate_preview_should_block_live_plan() {
    let mut plan = ready_transition_apply_execution_plan();
    plan.live_execution = true;

    let gate = create_transition_apply_execution_gate_preview("p112-live-gate", &plan);

    assert_eq!(gate.status, "blocked_live_execution_flag");
    assert!(!gate.exact_execution_approval_required);
    assert_eq!(gate.operator_action, "do_not_execute_transition");
}

#[test]
fn transition_apply_execution_gate_preview_should_block_mutating_plan() {
    let mut plan = ready_transition_apply_execution_plan();
    plan.state_mutation_allowed = true;

    let gate = create_transition_apply_execution_gate_preview("p112-mutating-gate", &plan);

    assert_eq!(
        gate.status,
        "blocked_transition_apply_plan_mutation_enabled"
    );
    assert!(!gate.exact_execution_approval_required);
    assert_eq!(gate.operator_action, "do_not_execute_transition");
}

#[test]
fn transition_apply_execution_gate_preview_should_block_non_ready_plan() {
    let gate_preview = ready_transition_apply_gate_preview();
    let store = FileTransitionApplyApprovalStore::new(unique_temp_transition_apply_approval_path());
    let report = store.read_report().unwrap();
    let approval_status =
        evaluate_transition_apply_approval_intake_status("p110-missing", &gate_preview, &report);
    let plan = plan_transition_apply_execution_no_mutation("p111-missing-plan", &approval_status);

    let gate = create_transition_apply_execution_gate_preview("p112-missing-gate", &plan);

    assert_eq!(gate.status, "blocked_transition_apply_plan_not_ready");
    assert!(!gate.exact_execution_approval_required);
}

#[test]
fn transition_apply_execution_approval_should_match_apply_fixture() {
    let approval = ready_transition_apply_execution_approval();

    assert_eq!(
        approval.to_json(),
        include_str!("fixtures/p113/transition_apply_execution_approval_apply.json").trim()
    );
}

#[test]
fn transition_apply_execution_approval_store_read_report_should_match_ready_fixture() {
    let path = unique_temp_transition_apply_execution_approval_path();
    let store = FileTransitionApplyExecutionApprovalStore::new(&path);
    let approval = ready_transition_apply_execution_approval();

    store.write(&approval).unwrap();
    let report = store.read_report().unwrap();
    std::fs::remove_file(path).ok();

    assert_eq!(
        report.to_json(),
        include_str!("fixtures/p113/transition_apply_execution_approval_read_report_ready.json")
            .trim()
    );
}

#[test]
fn transition_apply_execution_approval_intake_status_should_match_apply_fixture() {
    let gate = ready_transition_apply_execution_gate_preview();
    let report = ready_transition_apply_execution_approval_read_report();

    let status =
        evaluate_transition_apply_execution_approval_intake_status("p113-apply", &gate, &report);

    assert_eq!(
        status.to_json(),
        include_str!("fixtures/p113/transition_apply_execution_approval_intake_status_apply.json")
            .trim()
    );
}

#[test]
fn transition_apply_execution_approval_intake_status_should_wait_when_missing() {
    let gate = ready_transition_apply_execution_gate_preview();
    let store = FileTransitionApplyExecutionApprovalStore::new(
        unique_temp_transition_apply_execution_approval_path(),
    );
    let report = store.read_report().unwrap();

    let status =
        evaluate_transition_apply_execution_approval_intake_status("p113-missing", &gate, &report);

    assert_eq!(status.status, "missing_transition_apply_execution_approval");
}

#[test]
fn transition_apply_execution_approval_intake_status_should_block_invalid_approval() {
    let path = unique_temp_transition_apply_execution_approval_path();
    let store = FileTransitionApplyExecutionApprovalStore::new(&path);
    std::fs::write(&path, "not-json").unwrap();
    let gate = ready_transition_apply_execution_gate_preview();

    let report = store.read_report().unwrap();
    let status =
        evaluate_transition_apply_execution_approval_intake_status("p113-invalid", &gate, &report);
    std::fs::remove_file(path).ok();

    assert_eq!(
        status.status,
        "blocked_invalid_transition_apply_execution_approval"
    );
}

#[test]
fn transition_apply_execution_approval_intake_status_should_block_gate_mismatch() {
    let gate = ready_transition_apply_execution_gate_preview();
    let mut approval = ready_transition_apply_execution_approval();
    approval.source_gate_id = "wrong-execution-gate".to_string();
    let report = TransitionApplyExecutionApprovalReadReport {
        approval: Some(approval),
        missing: false,
        invalid: false,
    };

    let status =
        evaluate_transition_apply_execution_approval_intake_status("p113-mismatch", &gate, &report);

    assert_eq!(status.status, "blocked_execution_approval_gate_mismatch");
}

#[test]
fn transition_apply_execution_approval_intake_status_should_block_non_exact_text() {
    let gate = ready_transition_apply_execution_gate_preview();
    let mut approval = ready_transition_apply_execution_approval();
    approval.approval_text = "APPROVE_TRANSITION_APPLY_EXECUTION".to_string();
    let report = TransitionApplyExecutionApprovalReadReport {
        approval: Some(approval),
        missing: false,
        invalid: false,
    };

    let status = evaluate_transition_apply_execution_approval_intake_status(
        "p113-wrong-text",
        &gate,
        &report,
    );

    assert_eq!(status.status, "blocked_execution_approval_text_mismatch");
}

#[test]
fn transition_apply_execution_approval_intake_status_should_block_mutating_approval() {
    let gate = ready_transition_apply_execution_gate_preview();
    let mut approval = ready_transition_apply_execution_approval();
    approval.state_mutation_allowed = true;
    let report = TransitionApplyExecutionApprovalReadReport {
        approval: Some(approval),
        missing: false,
        invalid: false,
    };

    let status =
        evaluate_transition_apply_execution_approval_intake_status("p113-mutating", &gate, &report);

    assert_eq!(status.status, "blocked_execution_approval_mutation_enabled");
}

#[test]
fn transition_apply_execution_approval_intake_status_should_block_live_approval() {
    let gate = ready_transition_apply_execution_gate_preview();
    let mut approval = ready_transition_apply_execution_approval();
    approval.live_execution = true;
    let report = TransitionApplyExecutionApprovalReadReport {
        approval: Some(approval),
        missing: false,
        invalid: false,
    };

    let status =
        evaluate_transition_apply_execution_approval_intake_status("p113-live", &gate, &report);

    assert_eq!(status.status, "blocked_live_execution_flag");
}

#[test]
fn transition_apply_execution_approval_intake_status_should_accept_reject_and_hold_approvals() {
    let reject_gate = create_transition_apply_execution_gate_preview(
        "p112-reject-execution-gate",
        &reject_transition_apply_execution_plan(),
    );
    let reject_report = TransitionApplyExecutionApprovalReadReport {
        approval: Some(reject_transition_apply_execution_approval()),
        missing: false,
        invalid: false,
    };
    let reject_status = evaluate_transition_apply_execution_approval_intake_status(
        "p113-reject",
        &reject_gate,
        &reject_report,
    );
    assert_eq!(
        reject_status.status,
        "ready_for_rejection_record_execution_approval_intake"
    );

    let hold_gate = create_transition_apply_execution_gate_preview(
        "p112-hold-execution-gate",
        &hold_transition_apply_execution_plan(),
    );
    let hold_report = TransitionApplyExecutionApprovalReadReport {
        approval: Some(hold_transition_apply_execution_approval()),
        missing: false,
        invalid: false,
    };
    let hold_status = evaluate_transition_apply_execution_approval_intake_status(
        "p113-hold",
        &hold_gate,
        &hold_report,
    );
    assert_eq!(
        hold_status.status,
        "ready_for_hold_record_execution_approval_intake"
    );
}

#[test]
fn transition_apply_execution_packet_should_match_apply_fixture() {
    let packet = ready_transition_apply_execution_packet_no_mutation();

    assert_eq!(
        packet.to_json(),
        include_str!("fixtures/p114/transition_apply_execution_packet_apply.json").trim()
    );
}

#[test]
fn transition_apply_execution_packet_should_prepare_reject_and_hold_without_mutation() {
    let reject_status = reject_transition_apply_execution_approval_intake_status();
    let reject_packet =
        prepare_transition_apply_execution_packet_no_mutation("p114-reject-packet", &reject_status);
    assert_eq!(
        reject_packet.status,
        "ready_for_rejection_record_execution_packet_no_mutation"
    );
    assert_eq!(
        reject_packet.transition_action,
        "packet_record_review_result_rejected"
    );
    assert!(reject_packet.packet_only);
    assert!(reject_packet.mutation_requires_next_gate);
    assert!(!reject_packet.queue_consumption_allowed);
    assert!(!reject_packet.state_mutation_allowed);

    let hold_status = hold_transition_apply_execution_approval_intake_status();
    let hold_packet =
        prepare_transition_apply_execution_packet_no_mutation("p114-hold-packet", &hold_status);
    assert_eq!(
        hold_packet.status,
        "ready_for_hold_record_execution_packet_no_mutation"
    );
    assert_eq!(
        hold_packet.transition_action,
        "packet_record_review_result_hold"
    );
    assert!(hold_packet.packet_only);
    assert!(hold_packet.mutation_requires_next_gate);
    assert!(!hold_packet.queue_consumption_allowed);
    assert!(!hold_packet.state_mutation_allowed);
}

#[test]
fn transition_apply_execution_packet_should_block_live_approval_status() {
    let mut status = ready_transition_apply_execution_approval_intake_status();
    status.live_execution = true;

    let packet = prepare_transition_apply_execution_packet_no_mutation("p114-live-packet", &status);

    assert_eq!(packet.status, "blocked_live_execution_flag");
    assert!(!packet.mutation_requires_next_gate);
    assert_eq!(packet.transition_action, "do_not_apply_transition");
}

#[test]
fn transition_apply_execution_packet_should_block_mutating_approval_status() {
    let mut status = ready_transition_apply_execution_approval_intake_status();
    status.state_mutation_allowed = true;

    let packet =
        prepare_transition_apply_execution_packet_no_mutation("p114-mutating-packet", &status);

    assert_eq!(packet.status, "blocked_execution_approval_mutation_enabled");
    assert!(!packet.mutation_requires_next_gate);
    assert!(!packet.state_mutation_allowed);
}

#[test]
fn transition_apply_execution_packet_should_block_non_ready_approval_status() {
    let gate = ready_transition_apply_execution_gate_preview();
    let store = FileTransitionApplyExecutionApprovalStore::new(
        unique_temp_transition_apply_execution_approval_path(),
    );
    let report = store.read_report().unwrap();
    let status =
        evaluate_transition_apply_execution_approval_intake_status("p113-missing", &gate, &report);

    let packet =
        prepare_transition_apply_execution_packet_no_mutation("p114-missing-packet", &status);

    assert_eq!(packet.status, "blocked_execution_approval_not_ready");
    assert!(!packet.mutation_requires_next_gate);
}

fn pass_validator() -> ValidatorResult {
    ValidatorResult::from_checks(
        "packet-p095",
        vec![
            ValidationCheck {
                name: "freshness_guard".to_string(),
                passed: true,
                evidence: Some("fresh".to_string()),
            },
            ValidationCheck {
                name: "selected_bundle_present".to_string(),
                passed: true,
                evidence: Some("packet-p091-ready".to_string()),
            },
            ValidationCheck {
                name: "review_only".to_string(),
                passed: true,
                evidence: Some("no_live_execution".to_string()),
            },
        ],
    )
}

fn fresh_decision_for(
    status: &OrchestratorStatusView,
) -> ghostclaw_migration_core::adapters::orchestrator_status::StatusFreshnessDecision {
    let report = StatusSnapshotReadReport {
        snapshots: vec![PersistedOrchestratorStatusSummary::from_status_view(status)],
        invalid_lines: 0,
        skipped_empty_lines: 0,
    };
    evaluate_status_freshness(&report, status)
}

fn stale_decision_for(
    status: &OrchestratorStatusView,
) -> ghostclaw_migration_core::adapters::orchestrator_status::StatusFreshnessDecision {
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
    evaluate_status_freshness(&report, status)
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

fn unique_temp_review_packet_path() -> PathBuf {
    let mut path = std::env::temp_dir();
    let id = NEXT_TEMP_ID.fetch_add(1, Ordering::Relaxed);
    path.push(format!(
        "ghostclaw-migration-core-p096-review-packet-test-{}-{}-{}.jsonl",
        std::process::id(),
        id,
        ghostclaw_migration_core::schema::now_millis()
    ));
    path
}

fn unique_temp_handoff_envelope_path() -> PathBuf {
    let mut path = std::env::temp_dir();
    let id = NEXT_TEMP_ID.fetch_add(1, Ordering::Relaxed);
    path.push(format!(
        "ghostclaw-migration-core-p099-handoff-envelope-test-{}-{}-{}.json",
        std::process::id(),
        id,
        ghostclaw_migration_core::schema::now_millis()
    ));
    path
}

fn unique_temp_handoff_manifest_path() -> PathBuf {
    let mut path = std::env::temp_dir();
    let id = NEXT_TEMP_ID.fetch_add(1, Ordering::Relaxed);
    path.push(format!(
        "ghostclaw-migration-core-p101-handoff-manifest-test-{}-{}-{}.json",
        std::process::id(),
        id,
        ghostclaw_migration_core::schema::now_millis()
    ));
    path
}

fn unique_temp_review_candidate_path() -> PathBuf {
    let mut path = std::env::temp_dir();
    let id = NEXT_TEMP_ID.fetch_add(1, Ordering::Relaxed);
    path.push(format!(
        "ghostclaw-migration-core-p103-review-candidate-test-{}-{}-{}.json",
        std::process::id(),
        id,
        ghostclaw_migration_core::schema::now_millis()
    ));
    path
}

fn unique_temp_result_transition_gate_path() -> PathBuf {
    let mut path = std::env::temp_dir();
    let id = NEXT_TEMP_ID.fetch_add(1, Ordering::Relaxed);
    path.push(format!(
        "ghostclaw-migration-core-p106-result-transition-gate-test-{}-{}-{}.json",
        std::process::id(),
        id,
        ghostclaw_migration_core::schema::now_millis()
    ));
    path
}

fn unique_temp_human_transition_decision_path() -> PathBuf {
    let mut path = std::env::temp_dir();
    let id = NEXT_TEMP_ID.fetch_add(1, Ordering::Relaxed);
    path.push(format!(
        "ghostclaw-migration-core-p107-human-transition-decision-test-{}-{}-{}.json",
        std::process::id(),
        id,
        ghostclaw_migration_core::schema::now_millis()
    ));
    path
}

fn ready_handoff_envelope(
) -> ghostclaw_migration_core::adapters::review_packet::ReviewWorkerHandoffEnvelope {
    let summary = PersistedReviewPacketSummary::from_json_line(include_str!(
        "fixtures/p095/selected_bundle_review_packet_ready.json"
    ))
    .unwrap();
    let report = ReviewPacketReadReport {
        packets: vec![summary],
        invalid_lines: 0,
        skipped_empty_lines: 0,
    };
    let preview = preview_review_packet_consume("p098-ready", "p098-outbox", &report);
    create_review_worker_handoff_envelope("p099-ready", "opencode_review_only", &preview)
}

fn ready_consume_preview(
) -> ghostclaw_migration_core::adapters::review_packet::ReviewPacketConsumePreview {
    let summary = PersistedReviewPacketSummary::from_json_line(include_str!(
        "fixtures/p095/selected_bundle_review_packet_ready.json"
    ))
    .unwrap();
    let report = ReviewPacketReadReport {
        packets: vec![summary],
        invalid_lines: 0,
        skipped_empty_lines: 0,
    };
    preview_review_packet_consume("p098-ready", "p098-outbox", &report)
}

fn ready_handoff_status(
) -> ghostclaw_migration_core::adapters::review_packet::ReviewWorkerHandoffStatus {
    let envelope = PersistedReviewWorkerHandoffSummary::from_json(include_str!(
        "fixtures/p099/review_worker_handoff_envelope_ready.json"
    ))
    .unwrap();
    let report = ghostclaw_migration_core::adapters::review_packet::ReviewWorkerHandoffReadReport {
        envelope: Some(envelope),
        missing: false,
        invalid: false,
    };
    evaluate_review_worker_handoff_status("p100-ready", &report)
}

fn ready_handoff_manifest_read_report() -> ReviewHandoffBundleManifestReadReport {
    let manifest = PersistedReviewHandoffBundleManifestSummary::from_json(include_str!(
        "fixtures/p101/review_handoff_bundle_manifest_ready.json"
    ))
    .unwrap();
    ReviewHandoffBundleManifestReadReport {
        manifest: Some(manifest),
        missing: false,
        invalid: false,
    }
}

fn ready_operator_card(
) -> ghostclaw_migration_core::adapters::review_packet::ReviewHandoffOperatorCard {
    let report = ready_handoff_manifest_read_report();
    let status = evaluate_review_handoff_bundle_manifest_status("p102-ready", &report);
    create_review_handoff_operator_card("p102-card-ready", &status)
}

fn ready_review_candidate() -> ManualReviewCandidate {
    ManualReviewCandidate {
        candidate_id: "p103-candidate-pass".to_string(),
        source_card_id: "p102-card-ready".to_string(),
        status: "review_candidate_ready".to_string(),
        dry_run: true,
        live_execution: false,
        review_only: true,
        verdict: "pass".to_string(),
        blocking_issue: false,
        next_action: "prepare_review_result_transition_no_execution".to_string(),
    }
}

fn ready_review_candidate_read_report() -> ReviewCandidateReadReport {
    ReviewCandidateReadReport {
        candidate: Some(ready_review_candidate()),
        missing: false,
        invalid: false,
    }
}

fn ready_review_candidate_intake_status(
) -> ghostclaw_migration_core::adapters::review_packet::ReviewCandidateIntakeStatus {
    let card = ready_operator_card();
    let report = ready_review_candidate_read_report();
    evaluate_review_candidate_intake_status("p103-pass", &card, &report)
}

fn ready_review_result_transition_preview(
) -> ghostclaw_migration_core::adapters::review_packet::ReviewResultTransitionPreview {
    let status = ready_review_candidate_intake_status();
    preview_review_result_transition("p104-transition-pass", &status)
}

fn ready_review_result_transition_gate(
) -> ghostclaw_migration_core::adapters::review_packet::ReviewResultTransitionGate {
    let preview = ready_review_result_transition_preview();
    create_review_result_transition_gate("p105-gate-ready", &preview)
}

fn ready_result_transition_gate_summary() -> PersistedReviewResultTransitionGateSummary {
    PersistedReviewResultTransitionGateSummary::from_json(include_str!(
        "fixtures/p105/review_result_transition_gate_ready.json"
    ))
    .unwrap()
}

fn ready_result_transition_gate_status(
) -> ghostclaw_migration_core::adapters::review_packet::ReviewResultTransitionGateStatus {
    let gate = ready_result_transition_gate_summary();
    let report =
        ghostclaw_migration_core::adapters::review_packet::ReviewResultTransitionGateReadReport {
            gate: Some(gate),
            missing: false,
            invalid: false,
        };
    evaluate_review_result_transition_gate_status("p106-ready", &report)
}

fn ready_human_transition_decision() -> HumanTransitionDecision {
    HumanTransitionDecision {
        decision_id: "p107-decision-accept".to_string(),
        source_gate_id: "p105-gate-ready".to_string(),
        decision_kind: "accept".to_string(),
        status: "human_transition_decision_ready".to_string(),
        dry_run: true,
        live_execution: false,
        queue_consumption_allowed: false,
        source_mutation_allowed: false,
        operator_notes: "accept_review_result_transition_preview".to_string(),
        next_action: "prepare_transition_execution_preview_no_mutation".to_string(),
    }
}

fn ready_human_transition_decision_read_report() -> HumanTransitionDecisionReadReport {
    HumanTransitionDecisionReadReport {
        decision: Some(ready_human_transition_decision()),
        missing: false,
        invalid: false,
    }
}

fn ready_human_transition_decision_intake_status(
) -> ghostclaw_migration_core::adapters::review_packet::HumanTransitionDecisionIntakeStatus {
    let gate_status = ready_result_transition_gate_status();
    let report = ready_human_transition_decision_read_report();
    evaluate_human_transition_decision_intake_status("p107-accept", &gate_status, &report)
}

fn ready_transition_execution_preview(
) -> ghostclaw_migration_core::adapters::review_packet::TransitionExecutionPreview {
    let status = ready_human_transition_decision_intake_status();
    preview_transition_execution_no_mutation("p108-accept-preview", &status)
}

fn unique_temp_transition_apply_approval_path() -> PathBuf {
    let mut path = std::env::temp_dir();
    let id = NEXT_TEMP_ID.fetch_add(1, Ordering::Relaxed);
    path.push(format!(
        "ghostclaw-migration-core-p110-transition-apply-approval-test-{}-{}-{}.json",
        std::process::id(),
        id,
        ghostclaw_migration_core::schema::now_millis()
    ));
    path
}

fn unique_temp_transition_apply_execution_approval_path() -> PathBuf {
    let mut path = std::env::temp_dir();
    let id = NEXT_TEMP_ID.fetch_add(1, Ordering::Relaxed);
    path.push(format!(
        "ghostclaw-migration-core-p113-transition-apply-execution-approval-test-{}-{}-{}.json",
        std::process::id(),
        id,
        ghostclaw_migration_core::schema::now_millis()
    ));
    path
}

fn ready_transition_apply_gate_preview(
) -> ghostclaw_migration_core::adapters::review_packet::TransitionApplyGatePreview {
    create_transition_apply_gate_preview(
        "p109-apply-gate-accept",
        &ready_transition_execution_preview(),
    )
}

fn ready_transition_apply_approval() -> TransitionApplyApproval {
    TransitionApplyApproval {
        approval_id: "p110-approval-apply".to_string(),
        source_gate_id: "p109-apply-gate-accept".to_string(),
        approval_type: "apply".to_string(),
        approval_text: "APPROVE_TRANSITION_APPLY:p109-apply-gate-accept".to_string(),
        status: "transition_apply_approval_ready".to_string(),
        dry_run: true,
        live_execution: false,
        queue_consumption_allowed: false,
        source_mutation_allowed: false,
        state_mutation_allowed: false,
        operator_notes: "operator_confirmed_exact_apply_gate_preview".to_string(),
        next_action: "prepare_transition_apply_execution_plan_no_mutation".to_string(),
    }
}

fn ready_transition_apply_approval_read_report() -> TransitionApplyApprovalReadReport {
    TransitionApplyApprovalReadReport {
        approval: Some(ready_transition_apply_approval()),
        missing: false,
        invalid: false,
    }
}

fn ready_transition_apply_approval_intake_status(
) -> ghostclaw_migration_core::adapters::review_packet::TransitionApplyApprovalIntakeStatus {
    let gate = ready_transition_apply_gate_preview();
    let report = ready_transition_apply_approval_read_report();
    evaluate_transition_apply_approval_intake_status("p110-apply", &gate, &report)
}

fn ready_transition_apply_execution_plan() -> TransitionApplyExecutionPlan {
    let status = ready_transition_apply_approval_intake_status();
    plan_transition_apply_execution_no_mutation("p111-apply-plan", &status)
}

fn ready_transition_apply_execution_gate_preview() -> TransitionApplyExecutionGatePreview {
    create_transition_apply_execution_gate_preview(
        "p112-apply-execution-gate",
        &ready_transition_apply_execution_plan(),
    )
}

fn ready_transition_apply_execution_approval() -> TransitionApplyExecutionApproval {
    TransitionApplyExecutionApproval {
        approval_id: "p113-execution-approval-apply".to_string(),
        source_gate_id: "p112-apply-execution-gate".to_string(),
        approval_type: "apply".to_string(),
        approval_text: "APPROVE_TRANSITION_APPLY_EXECUTION:p112-apply-execution-gate".to_string(),
        status: "transition_apply_execution_approval_ready".to_string(),
        dry_run: true,
        live_execution: false,
        queue_consumption_allowed: false,
        source_mutation_allowed: false,
        state_mutation_allowed: false,
        operator_notes: "operator_confirmed_exact_apply_execution_gate_preview".to_string(),
        next_action: "prepare_transition_apply_execution_packet_no_mutation".to_string(),
    }
}

fn ready_transition_apply_execution_approval_read_report(
) -> TransitionApplyExecutionApprovalReadReport {
    TransitionApplyExecutionApprovalReadReport {
        approval: Some(ready_transition_apply_execution_approval()),
        missing: false,
        invalid: false,
    }
}

fn ready_transition_apply_execution_approval_intake_status(
) -> ghostclaw_migration_core::adapters::review_packet::TransitionApplyExecutionApprovalIntakeStatus
{
    let gate = ready_transition_apply_execution_gate_preview();
    let report = ready_transition_apply_execution_approval_read_report();
    evaluate_transition_apply_execution_approval_intake_status("p113-apply", &gate, &report)
}

fn ready_transition_apply_execution_packet_no_mutation() -> TransitionApplyExecutionPacketNoMutation
{
    let status = ready_transition_apply_execution_approval_intake_status();
    prepare_transition_apply_execution_packet_no_mutation("p114-apply-packet", &status)
}

fn reject_transition_apply_gate_preview(
) -> ghostclaw_migration_core::adapters::review_packet::TransitionApplyGatePreview {
    let gate_status = ready_result_transition_gate_status();
    let report = HumanTransitionDecisionReadReport {
        decision: Some(HumanTransitionDecision {
            decision_id: "p107-decision-reject".to_string(),
            source_gate_id: "p105-gate-ready".to_string(),
            decision_kind: "reject".to_string(),
            status: "human_transition_decision_ready".to_string(),
            dry_run: true,
            live_execution: false,
            queue_consumption_allowed: false,
            source_mutation_allowed: false,
            operator_notes: "reject_review_result_transition_preview".to_string(),
            next_action: "prepare_transition_rejection_preview_no_mutation".to_string(),
        }),
        missing: false,
        invalid: false,
    };
    let status =
        evaluate_human_transition_decision_intake_status("p107-reject", &gate_status, &report);
    let preview = preview_transition_execution_no_mutation("p108-reject-preview", &status);
    create_transition_apply_gate_preview("p109-reject-gate", &preview)
}

fn reject_transition_apply_approval() -> TransitionApplyApproval {
    TransitionApplyApproval {
        approval_id: "p110-approval-reject".to_string(),
        source_gate_id: "p109-reject-gate".to_string(),
        approval_type: "reject".to_string(),
        approval_text: "APPROVE_TRANSITION_REJECTION_RECORD:p109-reject-gate".to_string(),
        status: "transition_apply_approval_ready".to_string(),
        dry_run: true,
        live_execution: false,
        queue_consumption_allowed: false,
        source_mutation_allowed: false,
        state_mutation_allowed: false,
        operator_notes: "operator_confirmed_exact_rejection_record_gate_preview".to_string(),
        next_action: "prepare_rejection_record_plan_no_mutation".to_string(),
    }
}

fn reject_transition_apply_approval_intake_status(
) -> ghostclaw_migration_core::adapters::review_packet::TransitionApplyApprovalIntakeStatus {
    let gate = reject_transition_apply_gate_preview();
    let report = TransitionApplyApprovalReadReport {
        approval: Some(reject_transition_apply_approval()),
        missing: false,
        invalid: false,
    };
    evaluate_transition_apply_approval_intake_status("p110-reject", &gate, &report)
}

fn reject_transition_apply_execution_plan() -> TransitionApplyExecutionPlan {
    let status = reject_transition_apply_approval_intake_status();
    plan_transition_apply_execution_no_mutation("p111-reject-plan", &status)
}

fn reject_transition_apply_execution_approval() -> TransitionApplyExecutionApproval {
    TransitionApplyExecutionApproval {
        approval_id: "p113-execution-approval-reject".to_string(),
        source_gate_id: "p112-reject-execution-gate".to_string(),
        approval_type: "reject".to_string(),
        approval_text: "APPROVE_TRANSITION_REJECTION_RECORD_EXECUTION:p112-reject-execution-gate"
            .to_string(),
        status: "transition_apply_execution_approval_ready".to_string(),
        dry_run: true,
        live_execution: false,
        queue_consumption_allowed: false,
        source_mutation_allowed: false,
        state_mutation_allowed: false,
        operator_notes: "operator_confirmed_exact_rejection_record_execution_gate_preview"
            .to_string(),
        next_action: "prepare_rejection_record_execution_packet_no_mutation".to_string(),
    }
}

fn reject_transition_apply_execution_approval_intake_status(
) -> ghostclaw_migration_core::adapters::review_packet::TransitionApplyExecutionApprovalIntakeStatus
{
    let gate = create_transition_apply_execution_gate_preview(
        "p112-reject-execution-gate",
        &reject_transition_apply_execution_plan(),
    );
    let report = TransitionApplyExecutionApprovalReadReport {
        approval: Some(reject_transition_apply_execution_approval()),
        missing: false,
        invalid: false,
    };
    evaluate_transition_apply_execution_approval_intake_status("p113-reject", &gate, &report)
}

fn hold_transition_apply_gate_preview(
) -> ghostclaw_migration_core::adapters::review_packet::TransitionApplyGatePreview {
    let gate_status = ready_result_transition_gate_status();
    let report = HumanTransitionDecisionReadReport {
        decision: Some(HumanTransitionDecision {
            decision_id: "p107-decision-hold".to_string(),
            source_gate_id: "p105-gate-ready".to_string(),
            decision_kind: "hold".to_string(),
            status: "human_transition_decision_ready".to_string(),
            dry_run: true,
            live_execution: false,
            queue_consumption_allowed: false,
            source_mutation_allowed: false,
            operator_notes: "hold_review_result_transition_preview".to_string(),
            next_action: "prepare_transition_hold_preview_no_mutation".to_string(),
        }),
        missing: false,
        invalid: false,
    };
    let status =
        evaluate_human_transition_decision_intake_status("p107-hold", &gate_status, &report);
    let preview = preview_transition_execution_no_mutation("p108-hold-preview", &status);
    create_transition_apply_gate_preview("p109-hold-gate", &preview)
}

fn hold_transition_apply_approval() -> TransitionApplyApproval {
    TransitionApplyApproval {
        approval_id: "p110-approval-hold".to_string(),
        source_gate_id: "p109-hold-gate".to_string(),
        approval_type: "hold".to_string(),
        approval_text: "APPROVE_TRANSITION_HOLD_RECORD:p109-hold-gate".to_string(),
        status: "transition_apply_approval_ready".to_string(),
        dry_run: true,
        live_execution: false,
        queue_consumption_allowed: false,
        source_mutation_allowed: false,
        state_mutation_allowed: false,
        operator_notes: "operator_confirmed_exact_hold_record_gate_preview".to_string(),
        next_action: "prepare_hold_record_plan_no_mutation".to_string(),
    }
}

fn hold_transition_apply_approval_intake_status(
) -> ghostclaw_migration_core::adapters::review_packet::TransitionApplyApprovalIntakeStatus {
    let gate = hold_transition_apply_gate_preview();
    let report = TransitionApplyApprovalReadReport {
        approval: Some(hold_transition_apply_approval()),
        missing: false,
        invalid: false,
    };
    evaluate_transition_apply_approval_intake_status("p110-hold", &gate, &report)
}

fn hold_transition_apply_execution_plan() -> TransitionApplyExecutionPlan {
    let status = hold_transition_apply_approval_intake_status();
    plan_transition_apply_execution_no_mutation("p111-hold-plan", &status)
}

fn hold_transition_apply_execution_approval() -> TransitionApplyExecutionApproval {
    TransitionApplyExecutionApproval {
        approval_id: "p113-execution-approval-hold".to_string(),
        source_gate_id: "p112-hold-execution-gate".to_string(),
        approval_type: "hold".to_string(),
        approval_text: "APPROVE_TRANSITION_HOLD_RECORD_EXECUTION:p112-hold-execution-gate"
            .to_string(),
        status: "transition_apply_execution_approval_ready".to_string(),
        dry_run: true,
        live_execution: false,
        queue_consumption_allowed: false,
        source_mutation_allowed: false,
        state_mutation_allowed: false,
        operator_notes: "operator_confirmed_exact_hold_record_execution_gate_preview".to_string(),
        next_action: "prepare_hold_record_execution_packet_no_mutation".to_string(),
    }
}

fn hold_transition_apply_execution_approval_intake_status(
) -> ghostclaw_migration_core::adapters::review_packet::TransitionApplyExecutionApprovalIntakeStatus
{
    let gate = create_transition_apply_execution_gate_preview(
        "p112-hold-execution-gate",
        &hold_transition_apply_execution_plan(),
    );
    let report = TransitionApplyExecutionApprovalReadReport {
        approval: Some(hold_transition_apply_execution_approval()),
        missing: false,
        invalid: false,
    };
    evaluate_transition_apply_execution_approval_intake_status("p113-hold", &gate, &report)
}
