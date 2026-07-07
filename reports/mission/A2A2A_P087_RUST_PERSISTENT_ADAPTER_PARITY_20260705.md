# A2A2A P087 Rust Persistent Adapter Parity

Status: `PASS_LOCAL_SAFE_PERSISTENT_ADAPTER_PARITY`
Packet: `P087_RUST_PERSISTENT_ADAPTER_PARITY`
Date: `2026-07-05`
Repo: `/Users/sirinx/sirinx-os`

## Objective

Strengthen the P086 dry-run adapter layer with fixture-backed parity tests, queue corruption reporting, and A2A2A path lease regression checks.

This packet improves A2A2A adaptive sync control by making adapter drift visible before any future live integration gate.

## Files Added Or Updated

- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/src/adapters/telegram.rs`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/src/adapters/lease.rs`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/src/adapters/queue.rs`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/tests/persistent_adapter_parity.rs`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/tests/fixtures/p087/telegram_command.json`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/tests/fixtures/p087/route_job.jsonl`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/tests/fixtures/p087/validator_result.json`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/tests/fixtures/p087/lease_decision.json`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/tests/fixtures/p087/queue_with_corrupt_lines.jsonl`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/tests/fixtures/p087/a2a2a_path_lease_policy.json`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/docs/REFACTOR_PLAN.md`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/docs/GHOSTCLAW_RUST_MIGRATION_OS_V1_INTEGRATION.md`

## Contract Added

- `TelegramCommand::to_json()` serializes non-secret adapter input with `live_send=false`.
- `LeaseDecision::to_json()` serializes path lease decisions for receipts and fixtures.
- `FilePendingQueue::read_report()` returns valid jobs plus malformed-line and empty-line counts.
- `FilePendingQueue::read_all()` remains compatibility-safe and returns only valid jobs.

## Validation Results

- `cargo fmt --check`: pass after formatting
- `cargo clippy --all-targets --all-features -- -D warnings`: pass
- `cargo test`: pass, 26 tests
- `LEGACY_PYTHON_ORACLE=./scripts/legacy_oracle.py cargo test parity_against_python_oracle_when_configured`: pass
- CLI smoke `/status`: returns local-safe status
- CLI smoke `/route review inspect packet locally`: queues local route intent
- CLI smoke `/route backend_core live telegram send message now`: blocked by policy guard

## Safety Boundary

No live Telegram send, live Codex execution, provider/model call, repo/customer-data external routing, secret read/print, install script, commit, push, deploy, Cloudflare/R2 mutation, production migration, or customer messaging was performed.

## Next Safe Gate

`P088_RUST_ADAPTER_RESPONSE_FIXTURE_EXPANSION`

Recommended scope:

- Add dry-run Codex preview response fixture parity.
- Add Telegram reply-preview fixture parity without sending messages.
- Add validator receipt fixture parity for failed checks.
- Keep live execution blocked.
