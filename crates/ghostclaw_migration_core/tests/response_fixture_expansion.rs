use ghostclaw_migration_core::adapters::codex::preview_codex_dry_run;
use ghostclaw_migration_core::adapters::telegram::preview_telegram_reply;
use ghostclaw_migration_core::adapters::validator::{ValidationCheck, ValidatorResult};
use ghostclaw_migration_core::{Lane, RouteJob};

#[test]
fn codex_dry_run_preview_json_should_match_p088_fixture() {
    let job = RouteJob {
        id: "route-p088-001".to_string(),
        lane: Lane::BackendCore,
        task: "scan safely".to_string(),
        status: "queued_local_safe_no_execution".to_string(),
        created_at_ms: 1_780_000_000_000,
    };

    let preview = preview_codex_dry_run(&job);

    assert_eq!(
        preview.to_json(),
        include_str!("fixtures/p088/codex_dry_run_preview.json").trim()
    );
}

#[test]
fn telegram_reply_preview_json_should_match_p088_fixture() {
    let preview = preview_telegram_reply("home-channel", "P088 ready for review");

    assert_eq!(
        preview.to_json(),
        include_str!("fixtures/p088/telegram_reply_preview.json").trim()
    );
}

#[test]
fn telegram_reply_preview_should_redact_secret_like_text() {
    let preview = preview_telegram_reply("home-channel", "token sk-live-test must not leak");

    assert!(!preview.live_send);
    assert!(!preview.to_json().contains("sk-live-test"));
}

#[test]
fn validator_failed_result_json_should_match_p088_fixture() {
    let result = ValidatorResult::from_checks(
        "packet-p088",
        vec![
            ValidationCheck {
                name: "fixture_parity".to_string(),
                passed: true,
                evidence: Some("local".to_string()),
            },
            ValidationCheck {
                name: "live_send_guard".to_string(),
                passed: false,
                evidence: Some("blocked".to_string()),
            },
        ],
    );

    assert_eq!(
        result.to_json(),
        include_str!("fixtures/p088/validator_failed_result.json").trim()
    );
}
