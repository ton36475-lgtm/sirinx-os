# A2A2A P096 Rust Review Packet Store

## Status

PASS_LOCAL_SAFE_IMPLEMENTED

## Scope

P096 adds append-only local JSONL persistence for selected-bundle review packets in the GhostClaw Rust migration core. The store gives Hermes/Codex/OpenCode a durable local review outbox without invoking OpenCode or executing workers.

## Files Changed

- `crates/ghostclaw_migration_core/src/adapters/review_packet.rs`
- `crates/ghostclaw_migration_core/tests/review_packet.rs`
- `crates/ghostclaw_migration_core/tests/fixtures/p096/review_packet_store_with_corrupt_lines.jsonl`
- `crates/ghostclaw_migration_core/tests/fixtures/p096/review_packet_read_report.json`
- `crates/ghostclaw_migration_core/docs/REFACTOR_PLAN.md`
- `crates/ghostclaw_migration_core/docs/GHOSTCLAW_RUST_MIGRATION_OS_V1_INTEGRATION.md`
- `reports/mission/A2A2A_P096_RUST_REVIEW_PACKET_STORE_20260705.md`

## Behavior Contract

- `FileReviewPacketStore::append()` writes one review packet as JSONL.
- `read_all()` returns only valid persisted packet summaries.
- `read_report()` preserves valid packet summaries plus `invalid_lines` and `skipped_empty_lines`.
- Missing stores return an empty read report.
- Review packet reads never execute packet payloads or invoke reviewers.

## Debug Finding Closed

Focused P096 tests initially exposed a parser bug: duplicated nested `next_action` fields caused summary parsing to read `status_view.next_action` instead of the top-level review-packet `next_action`. The parser now uses the final packet-level `next_action`, and fixture-backed tests cover it.

## Validation

- `cargo fmt --check`: pass
- `cargo test --test review_packet`: pass, 7 tests
- `cargo clippy --all-targets --all-features -- -D warnings`: pass
- `cargo test`: pass, 57 tests
- `LEGACY_PYTHON_ORACLE=./scripts/legacy_oracle.py cargo test parity_against_python_oracle_when_configured`: pass
- scoped diff check: pass
- trailing whitespace scan: pass, no findings
- bounded secret scan: pass, no findings

## Safety Boundary

No live Telegram send, live Codex execution, OpenCode invocation, provider/model call, repo/customer-data external routing, secret read/print, install, commit, push, deploy, Cloudflare/R2 mutation, or production migration was performed.

## Next Safe Gate

P097_RUST_REVIEW_OUTBOX_STATUS: add a read-only review-outbox status that summarizes persisted review packets, stale/corrupt evidence, and next safe action without consuming packets.
