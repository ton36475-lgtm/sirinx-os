# A2A2A P095 Rust Selected Bundle Review Packet Export

## Status

PASS_LOCAL_SAFE_IMPLEMENTED

## Scope

P095 adds a read-only selected-bundle review packet export for the GhostClaw Rust migration core. It packages the current selected bundle, orchestrator status, freshness decision, and deterministic validation evidence into one local artifact for OpenCode review-only lanes.

## Files Changed

- `crates/ghostclaw_migration_core/src/adapters/review_packet.rs`
- `crates/ghostclaw_migration_core/src/adapters/mod.rs`
- `crates/ghostclaw_migration_core/tests/review_packet.rs`
- `crates/ghostclaw_migration_core/tests/fixtures/p095/selected_bundle_review_packet_ready.json`
- `crates/ghostclaw_migration_core/docs/REFACTOR_PLAN.md`
- `crates/ghostclaw_migration_core/docs/GHOSTCLAW_RUST_MIGRATION_OS_V1_INTEGRATION.md`
- `reports/mission/A2A2A_P095_RUST_SELECTED_BUNDLE_REVIEW_PACKET_EXPORT_20260705.md`

## Behavior Contract

- `ready_for_opencode_review`: selected bundle exists, freshness is `fresh`, validator result is `pass`, and every live-execution flag is false.
- `blocked_live_execution_flag`: any source artifact claims live execution.
- `blocked_validation_failed`: deterministic validation did not pass.
- `blocked_stale_status_evidence`: freshness guard is not `fresh`.
- `blocked_no_selected_bundle`: no selected bundle is available.
- `next_action` is advisory only and never invokes OpenCode or executes a worker.

## Validation

- `cargo test --test review_packet`: pass, 3 tests
- `cargo fmt --check`: pass
- `cargo clippy --all-targets --all-features -- -D warnings`: pass
- `cargo test`: pass, 53 tests
- `LEGACY_PYTHON_ORACLE=./scripts/legacy_oracle.py cargo test parity_against_python_oracle_when_configured`: pass
- scoped diff check: pass
- trailing whitespace scan: pass, no findings
- bounded secret scan: pass, no findings

## Safety Boundary

No live Telegram send, live Codex execution, OpenCode invocation, provider/model call, repo/customer-data external routing, secret read/print, install, commit, push, deploy, Cloudflare/R2 mutation, or production migration was performed.

## Next Safe Gate

P096_RUST_REVIEW_PACKET_STORE: add an append-only local review packet JSONL store and corruption-aware read report. Keep it local-only and require a separate exact gate before any review worker consumes packets.
