# A2A2A P089 Rust Adapter Response Bundle Packet

Status: `PASS_LOCAL_SAFE_RESPONSE_BUNDLE_PACKET_CREATED`
Packet: `P089_RUST_ADAPTER_RESPONSE_BUNDLE_PACKET`
Date: `2026-07-05`
Repo: `/Users/sirinx/sirinx-os`

## Objective

Create a local-only adapter response bundle that combines route intent, path lease decision, Codex dry-run preview, Telegram reply preview, validator result, and receipt metadata into one reviewable packet.

This improves A2A2A adaptive sync control by giving Hermes/Codex/OpenCode a single deterministic packet surface before any future live execution gate.

## Files Added Or Updated

- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/src/adapters/bundle.rs`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/src/adapters/mod.rs`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/tests/response_bundle.rs`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/tests/fixtures/p089/pass_bundle.json`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/tests/fixtures/p089/fail_bundle.json`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/docs/REFACTOR_PLAN.md`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/docs/GHOSTCLAW_RUST_MIGRATION_OS_V1_INTEGRATION.md`

## Contract Added

- `ReceiptMetadata::from_receipt()` copies non-sensitive receipt metadata into bundle shape.
- `AdapterResponseBundle::new()` calculates bundle status from lease, validator, and live flags.
- `AdapterResponseBundle::to_json()` emits compact fixture-backed JSON.
- Bundle status is `ready_for_review` only when:
  - path lease is allowed
  - validator status is `pass`
  - Codex preview did not execute live
  - Telegram preview did not send live
- Any live flag, blocked lease, or failed validator produces `blocked_or_failed`.

## Validation Results

- `cargo fmt --check`: pass after formatting
- `cargo clippy --all-targets --all-features -- -D warnings`: pass
- `cargo test`: pass, 33 tests
- `LEGACY_PYTHON_ORACLE=./scripts/legacy_oracle.py cargo test parity_against_python_oracle_when_configured`: pass
- CLI smoke `/status`: returns local-safe status
- CLI smoke `/route review inspect local bundle packet`: queues local route intent
- CLI smoke `/route backend_core live telegram send message now`: blocked by policy guard

## Safety Boundary

No live Telegram send, live Codex execution, provider/model call, repo/customer-data external routing, secret read/print, install script, commit, push, deploy, Cloudflare/R2 mutation, production migration, or customer messaging was performed.

## Next Safe Gate

`P090_RUST_BUNDLE_WRITER_AND_READ_REPORT`

Recommended scope:

- Add a local JSONL bundle writer under an explicit runtime path.
- Add bundle read reports that count malformed lines.
- Add pass/fail fixture parity for persisted bundles.
- Keep all live execution blocked.
