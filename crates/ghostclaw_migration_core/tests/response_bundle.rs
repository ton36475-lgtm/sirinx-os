use ghostclaw_migration_core::adapters::bundle::AdapterResponseBundle;
use ghostclaw_migration_core::adapters::codex::preview_codex_dry_run;
use ghostclaw_migration_core::adapters::lease::LeaseDecision;
use ghostclaw_migration_core::adapters::telegram::preview_telegram_reply;
use ghostclaw_migration_core::adapters::validator::{ValidationCheck, ValidatorResult};
use ghostclaw_migration_core::{Lane, Receipt, RouteJob};

#[test]
fn adapter_response_bundle_should_match_p089_pass_fixture() {
    let bundle = build_pass_bundle();

    assert_eq!(
        bundle.to_json(),
        include_str!("fixtures/p089/pass_bundle.json").trim()
    );
}

#[test]
fn adapter_response_bundle_should_match_p089_fail_fixture() {
    let bundle = build_fail_bundle();

    assert_eq!(
        bundle.to_json(),
        include_str!("fixtures/p089/fail_bundle.json").trim()
    );
}

#[test]
fn adapter_response_bundle_should_never_mark_live_preview_ready() {
    let mut bundle = build_pass_bundle();
    bundle.telegram_reply_preview.live_send = true;
    let rebuilt = AdapterResponseBundle::new(
        bundle.packet_id,
        bundle.route_job,
        bundle.lease_decision,
        bundle.codex_preview,
        bundle.telegram_reply_preview,
        bundle.validator_result,
        &Receipt {
            id: "rcpt-p089-live".to_string(),
            command_kind: "route".to_string(),
            status: "queued".to_string(),
            redacted_command: "/route review inspect bundle locally".to_string(),
            lane: Some("review".to_string()),
            task: Some("inspect bundle locally".to_string()),
            reason: None,
            created_at_ms: 1_780_000_000_004,
        },
    );

    assert_eq!(rebuilt.status, "blocked_or_failed");
    assert!(rebuilt.live_execution);
}

fn build_pass_bundle() -> AdapterResponseBundle {
    let route_job = RouteJob {
        id: "route-p089-001".to_string(),
        lane: Lane::Review,
        task: "inspect bundle locally".to_string(),
        status: "queued_local_safe_no_execution".to_string(),
        created_at_ms: 1_780_000_000_000,
    };
    let receipt = Receipt {
        id: "rcpt-p089-pass".to_string(),
        command_kind: "route".to_string(),
        status: "queued".to_string(),
        redacted_command: "/route review inspect bundle locally".to_string(),
        lane: Some("review".to_string()),
        task: Some("inspect bundle locally".to_string()),
        reason: None,
        created_at_ms: 1_780_000_000_001,
    };

    AdapterResponseBundle::new(
        "packet-p089",
        route_job.clone(),
        LeaseDecision {
            path: "crates/ghostclaw_migration_core/src/adapters/bundle.rs".to_string(),
            allowed: true,
            reason: "allowed_path_pattern".to_string(),
        },
        preview_codex_dry_run(&route_job),
        preview_telegram_reply("home-channel", "P089 ready for review"),
        ValidatorResult::from_checks(
            "packet-p089",
            vec![
                ValidationCheck {
                    name: "fixture_bundle".to_string(),
                    passed: true,
                    evidence: Some("local".to_string()),
                },
                ValidationCheck {
                    name: "live_action_guard".to_string(),
                    passed: true,
                    evidence: Some("blocked".to_string()),
                },
            ],
        ),
        &receipt,
    )
}

fn build_fail_bundle() -> AdapterResponseBundle {
    let route_job = RouteJob {
        id: "route-p089-002".to_string(),
        lane: Lane::BackendCore,
        task: "attempt live telegram send".to_string(),
        status: "queued_local_safe_no_execution".to_string(),
        created_at_ms: 1_780_000_000_002,
    };
    let receipt = Receipt {
        id: "rcpt-p089-fail".to_string(),
        command_kind: "blocked".to_string(),
        status: "blocked".to_string(),
        redacted_command: "/route backend_core live telegram send".to_string(),
        lane: None,
        task: None,
        reason: Some("hard_gate_term:live telegram".to_string()),
        created_at_ms: 1_780_000_000_003,
    };

    AdapterResponseBundle::new(
        "packet-p089",
        route_job.clone(),
        LeaseDecision {
            path: "cloudflare/wrangler.toml".to_string(),
            allowed: false,
            reason: "blocked_path_pattern".to_string(),
        },
        preview_codex_dry_run(&route_job),
        preview_telegram_reply("home-channel", "P089 blocked before live send"),
        ValidatorResult::from_checks(
            "packet-p089",
            vec![
                ValidationCheck {
                    name: "lease_guard".to_string(),
                    passed: false,
                    evidence: Some("blocked_path_pattern".to_string()),
                },
                ValidationCheck {
                    name: "live_action_guard".to_string(),
                    passed: true,
                    evidence: Some("blocked".to_string()),
                },
            ],
        ),
        &receipt,
    )
}
