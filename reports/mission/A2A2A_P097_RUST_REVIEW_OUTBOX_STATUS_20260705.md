# A2A2A P097 Rust Review Outbox Status

## Status

PASS_LOCAL_SAFE_IMPLEMENTED

## Scope

P097 adds a read-only review outbox status evaluator for the GhostClaw Rust migration core. It lets Hermes/Codex/OpenCode inspect persisted review packet readiness without consuming packets, invoking OpenCode, or executing workers.

## Files Changed

- `crates/ghostclaw_migration_core/src/adapters/review_packet.rs`
- `crates/ghostclaw_migration_core/tests/review_packet.rs`
- `crates/ghostclaw_migration_core/tests/fixtures/p097/review_outbox_status_ready.json`
- `crates/ghostclaw_migration_core/docs/REFACTOR_PLAN.md`
- `crates/ghostclaw_migration_core/docs/GHOSTCLAW_RUST_MIGRATION_OS_V1_INTEGRATION.md`
- `reports/mission/A2A2A_P097_RUST_REVIEW_OUTBOX_STATUS_20260705.md`

## Behavior Contract

- `ReviewOutboxStatus` serializes a compact advisory status JSON.
- `evaluate_review_outbox_status()` counts valid packets, ready packets, blocked packets, malformed lines, and skipped empty lines.
- Live-execution flags block the outbox before any consume preview.
- Malformed non-empty lines return `review_outbox_needs_repair` before a ready packet can be consumed.
- Empty outboxes return `empty_review_outbox` and wait for a review packet export.

## Validation

- `cargo fmt --check`: pass
- `cargo test --test review_packet`: pass, 11 tests
- `cargo clippy --all-targets --all-features -- -D warnings`: pass
- `cargo test`: pass, 61 tests
- `LEGACY_PYTHON_ORACLE=./scripts/legacy_oracle.py cargo test parity_against_python_oracle_when_configured`: pass
- scoped diff check: pass
- trailing whitespace scan: pass, no findings
- bounded secret scan: pass, no findings
- cargo target cleanup check: pass, no target directory remains in the crate

## Safety Boundary

No live Telegram send, live Codex execution, OpenCode invocation, provider/model call, repo/customer-data external routing, secret read/print, install, commit, push, deploy, Cloudflare/R2 mutation, or production migration was performed.

## Next Safe Gate

P098_RUST_REVIEW_PACKET_CONSUME_PREVIEW: add a dry-run consume preview that selects one ready review packet for OpenCode handoff without invoking OpenCode or mutating any live lane.
