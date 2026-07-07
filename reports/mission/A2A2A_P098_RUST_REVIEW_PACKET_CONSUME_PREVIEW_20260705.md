# A2A2A P098 Rust Review Packet Consume Preview

## Status

PASS_LOCAL_SAFE_IMPLEMENTED

## Scope

P098 adds a dry-run review packet consume preview for the GhostClaw Rust migration core. It selects a ready review packet for a future OpenCode review-only handoff without mutating the review packet store or invoking a reviewer.

## Files Changed

- `crates/ghostclaw_migration_core/src/adapters/review_packet.rs`
- `crates/ghostclaw_migration_core/tests/review_packet.rs`
- `crates/ghostclaw_migration_core/tests/fixtures/p098/review_packet_consume_preview_ready.json`
- `crates/ghostclaw_migration_core/docs/REFACTOR_PLAN.md`
- `crates/ghostclaw_migration_core/docs/GHOSTCLAW_RUST_MIGRATION_OS_V1_INTEGRATION.md`
- `reports/mission/A2A2A_P098_RUST_REVIEW_PACKET_CONSUME_PREVIEW_20260705.md`

## Behavior Contract

- `ReviewPacketConsumePreview` serializes a compact dry-run consume decision.
- `preview_review_packet_consume()` nests the P097 outbox status and selects the first ready non-live packet.
- Corrupt review packet stores return `blocked_outbox_needs_repair`.
- Live-flagged packets return `blocked_live_execution_flag`.
- Empty outboxes return `blocked_empty_review_outbox`.
- The preview does not remove or modify review packet JSONL records.

## Validation

- `cargo fmt --check`: pass
- `cargo test --test review_packet`: pass, 15 tests
- `cargo clippy --all-targets --all-features -- -D warnings`: pass
- `cargo test`: pass, 65 tests
- `LEGACY_PYTHON_ORACLE=./scripts/legacy_oracle.py cargo test parity_against_python_oracle_when_configured`: pass
- scoped diff check: pass
- trailing whitespace scan: pass, no findings
- bounded secret scan: pass, no findings
- cargo target cleanup check: pass, no target directory remains in the crate

## Safety Boundary

No live Telegram send, live Codex execution, OpenCode invocation, provider/model call, repo/customer-data external routing, secret read/print, install, commit, push, deploy, Cloudflare/R2 mutation, or production migration was performed.

## Next Safe Gate

P099_RUST_REVIEW_WORKER_HANDOFF_ENVELOPE: write a local JSON envelope from the selected consume preview for manual OpenCode review, without invoking OpenCode or any live worker.
