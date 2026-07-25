# A2A2A P094 Rust Status Freshness Guard

## Status

PASS_LOCAL_SAFE_IMPLEMENTED

## Scope

P094 adds a read-only freshness guard for the GhostClaw Rust migration core. The guard compares the latest valid persisted orchestrator status snapshot against the current `OrchestratorStatusView` and reports whether local evidence is `fresh`, `stale`, or `missing`.

## Files Changed

- `crates/ghostclaw_migration_core/src/adapters/orchestrator_status.rs`
- `crates/ghostclaw_migration_core/tests/orchestrator_status.rs`
- `crates/ghostclaw_migration_core/tests/fixtures/p094/status_freshness_fresh.json`
- `crates/ghostclaw_migration_core/docs/REFACTOR_PLAN.md`
- `crates/ghostclaw_migration_core/docs/GHOSTCLAW_RUST_MIGRATION_OS_V1_INTEGRATION.md`
- `reports/mission/A2A2A_P094_RUST_STATUS_FRESHNESS_GUARD_20260705.md`

## Behavior Contract

- `fresh`: latest valid snapshot summary exactly matches the current status summary.
- `stale`: latest valid snapshot exists but differs from the current status summary.
- `missing`: no valid snapshot exists.
- `invalid_lines` and `skipped_empty_lines` are preserved in the decision output.
- `next_action` remains advisory only and is never executed by this guard.

## Validation

- `cargo fmt --check`: pass
- `cargo test --test orchestrator_status`: pass, 10 tests
- `cargo clippy --all-targets --all-features -- -D warnings`: pass
- `cargo test`: pass, 50 tests
- `LEGACY_PYTHON_ORACLE=./scripts/legacy_oracle.py cargo test parity_against_python_oracle_when_configured`: pass

## Safety Boundary

No live Telegram send, live Codex execution, provider/model call, repo/customer-data external routing, secret read/print, install, commit, push, deploy, Cloudflare/R2 mutation, or production migration was performed.

## Next Safe Gate

P095_RUST_SELECTED_BUNDLE_REVIEW_PACKET_EXPORT: create a read-only OpenCode review packet that combines selected bundle metadata, current orchestrator status, freshness decision, and validation evidence.
