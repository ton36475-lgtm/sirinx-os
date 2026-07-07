# A2A2A P086 Rust Adapter Extraction Dry Run

Status: `PASS_LOCAL_SAFE_RUST_ADAPTERS_CREATED`
Packet: `P086_RUST_ADAPTER_EXTRACTION_GATE`
Date: `2026-07-04`
Repo: `/Users/sirinx/sirinx-os`

## Objective

Add dry-run adapter boundaries around the P085 GhostClaw Rust migration core without changing live runtime behavior.

The Rust core remains deterministic and local-safe. P086 creates adapter seams for future Telegram, Codex, queue, validator, and file-lease integration while preserving the current hard gates.

## Files Added Or Updated

- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/src/adapters/telegram.rs`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/src/adapters/codex.rs`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/src/adapters/queue.rs`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/src/adapters/validator.rs`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/src/adapters/lease.rs`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/src/adapters/mod.rs`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/src/schema.rs`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/tests/adapter_behavior.rs`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/.gitignore`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/docs/REFACTOR_PLAN.md`
- `/Users/sirinx/sirinx-os/crates/ghostclaw_migration_core/docs/GHOSTCLAW_RUST_MIGRATION_OS_V1_INTEGRATION.md`

## Adapter Contract

| Adapter | Purpose | Live action |
|---|---|---|
| `telegram` | Convert non-secret Telegram-shaped input into `CommandEnvelope` | blocked |
| `codex` | Produce a Codex dry-run preview for a queued `RouteJob` | blocked |
| `queue` | Append and read route intent JSONL | no payload execution |
| `validator` | Represent deterministic validation checks and aggregate status | local only |
| `lease` | Evaluate repo-relative paths against allow/block patterns | local only |

## Validation Results

- `cargo fmt --check`: pass after formatting
- `cargo clippy --all-targets --all-features -- -D warnings`: pass
- `cargo test`: pass, 19 tests
- `LEGACY_PYTHON_ORACLE=./scripts/legacy_oracle.py cargo test parity_against_python_oracle_when_configured`: pass
- CLI smoke `/status`: returns local-safe status
- CLI smoke `/route backend_core scan repository safely`: queues local route intent
- CLI smoke `/route backend_core git push origin main`: blocked by policy guard
- `cargo clean` and `target/` absence check: pass

## Safety Boundary

No live Telegram send, live Codex execution, provider/model call, repo/customer-data external routing, secret read/print, install script, commit, push, deploy, Cloudflare/R2 mutation, production migration, or customer messaging was performed.

The adapter layer only prepares typed boundaries for future gates. Live execution remains blocked until an exact packet reopens it.

## Next Safe Gate

`P087_RUST_PERSISTENT_ADAPTER_PARITY`

Recommended scope:

- Add JSON fixtures for Telegram command envelopes, route jobs, validator results, and lease decisions.
- Add persistent queue corruption handling tests.
- Add a path-lease integration test against the current A2A2A lease policy.
- Keep all adapters dry-run and local-only.

Do not start live Telegram, live Codex, Cloudflare, deploy, push, or provider routing in P087.
