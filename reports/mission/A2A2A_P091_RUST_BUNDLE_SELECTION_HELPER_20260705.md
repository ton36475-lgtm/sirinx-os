# A2A2A P091 Rust Bundle Selection Helper

Status: `PASS_LOCAL_SAFE_BUNDLE_SELECTION_HELPER_CREATED`
Packet: `P091_RUST_BUNDLE_SELECTION_HELPER`
Date: `2026-07-05`
Repo: `/Users/sirinx/sirinx-os`

## Objective

Add a read-only orchestrator-facing helper that selects the next safe adapter response bundle from local JSONL read reports.

The helper must select only review-ready bundles that did not perform live execution.

## Files Added Or Updated

- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/src/adapters/bundle.rs`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/tests/bundle_selection.rs`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/tests/fixtures/p091/bundle_selection_mixed.jsonl`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/tests/fixtures/p091/bundle_selection_result.json`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/docs/REFACTOR_PLAN.md`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/docs/GHOSTCLAW_RUST_MIGRATION_OS_V1_INTEGRATION.md`

## Contract Added

- `select_next_ready_bundle()` chooses the first valid persisted bundle where `status == "ready_for_review"` and `live_execution == false`.
- `BundleSelection` records `status`, selected summary, rejected count, malformed-line count, empty-line count, and stable decision reason.
- Live-flagged ready bundles are rejected.
- Malformed and empty lines remain visible in the selection result through the source read report.
- Selection is read-only and never executes queued payloads.

## Validation Results

- `cargo fmt --check`: pass
- `cargo test --test bundle_selection`: pass, 3 tests
- `cargo clippy --all-targets --all-features -- -D warnings`: pass
- `cargo test`: pass, 40 tests
- `LEGACY_PYTHON_ORACLE=./scripts/legacy_oracle.py cargo test parity_against_python_oracle_when_configured`: pass
- scoped diff check before report: pass
- `node scripts/secret-scan.mjs`: pass, no findings

## Safety Boundary

No live Telegram send, live Codex execution, provider/model call, repo/customer-data external routing, secret read/print, install script, commit, push, deploy, Cloudflare/R2 mutation, production migration, or customer messaging was performed.

## Next Safe Gate

`P092_RUST_ORCHESTRATOR_STATUS_VIEW`

Recommended scope:

- Combine bundle selection, pending queue read reports, and lease status into one local read-only orchestrator status view.
- Keep status generation local-only.
- Do not introduce worker execution until a separate explicit execution gate is opened.
