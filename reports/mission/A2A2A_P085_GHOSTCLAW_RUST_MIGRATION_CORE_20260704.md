# A2A2A P085 GhostClaw Rust Migration Core

Generated: 2026-07-04T23:50:18+0700

## Status

PASS_LOCAL_SAFE_RUST_CORE_CREATED

## Objective

Create the P085 GhostClaw Rust Migration OS V1 core crate as a deterministic local-safe control-plane kernel. The crate preserves the command, policy, route-intent, redaction, and receipt contract without starting live Telegram, executing Codex, mutating Cloudflare/R2, pushing Git, deploying, or reading secrets.

## Created Crate

Path:

- `crates/ghostclaw_migration_core`

Core modules:

- `src/schema.rs` — `CommandEnvelope`, `Lane`, `RouteJob`, `Receipt`
- `src/command.rs` — `/status`, `/quota`, `/pending`, `/receipts`, `/route`
- `src/policy.rs` — hard gate policy
- `src/redaction.rs` — secret-like token redaction
- `src/receipt.rs` — `ReceiptStore`, `FileReceiptStore`, `MemoryReceiptStore`
- `src/engine.rs` — parse -> policy -> route/receipt -> response
- `src/adapters/cli.rs` — local CLI boundary
- `src/python_compat.rs` — future Python compatibility seam
- `tests/core_behavior.rs` — core behavior regression tests
- `tests/parity.rs` — opt-in Python oracle parity harness
- `scripts/legacy_oracle.py` — placeholder non-live oracle

Docs:

- `README.md`
- `docs/GHOSTCLAW_RUST_MIGRATION_OS_V1_INTEGRATION.md`
- `docs/BEHAVIOR_CONTRACT.md`
- `docs/FILE_LEASE_PROPOSAL.md`
- `docs/REFACTOR_PLAN.md`

## Behavior Verified

- `/status` returns local-safe status and writes receipt.
- `/route backend_core scan repository safely` queues route intent only.
- `/route backend_core git push origin main` is blocked by policy.
- Secret-like command fragments are redacted before receipt storage.
- File-backed receipt store round-trips recent receipts.
- Python parity harness runs only when `LEGACY_PYTHON_ORACLE` is explicitly set.

## Validation

Commands run from `crates/ghostclaw_migration_core`:

- `cargo fmt --check` — PASS
- `cargo clippy --all-targets --all-features -- -D warnings` — PASS
- `cargo test` — PASS, 12 tests passed
- `LEGACY_PYTHON_ORACLE=./scripts/legacy_oracle.py cargo test parity_against_python_oracle_when_configured` — PASS
- CLI smoke `/status` — PASS
- CLI smoke safe route — PASS
- CLI smoke blocked route — PASS

Build artifacts were cleaned with `cargo clean` after validation.

## Safety Boundary

Blocked actions preserved:

- live Telegram send/start
- live Codex execution
- provider/model call
- repo/customer-data external routing
- secret read/print
- install script execution
- git push
- deploy
- Cloudflare/R2 mutation
- production migration
- customer messaging

## Notes

This is a zero-external-dependency crate so validation does not require downloading Rust crates. The `python` feature is a placeholder seam for a future PyO3/adapter packet; it does not import Python or pull dependencies in P085.

## Next Gate

P086: Rust adapter extraction.

Recommended scoped additions:

- `codex_dry_run_adapter`
- `telegram_command_adapter`
- `persistent_pending_queue`
- `validator_result_model`
- `path_lease_checker`
- JSON fixtures for command/receipt parity

Still blocked in P086 unless separately approved:

- live Telegram runtime
- live Codex execution
- Cloudflare/R2 mutation
- production deploy
- git push
- secret read/print
