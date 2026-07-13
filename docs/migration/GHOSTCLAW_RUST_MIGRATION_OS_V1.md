# GhostClaw Rust Migration OS V1

Status: `P101_ADAPTER_EXTRACTION_COMMITTED_VALIDATED_LOCAL`
Updated: `2026-07-14T03:31:14+07:00`

## Purpose

`crates/ghostclaw_migration_core` is the deterministic Rust control-plane core for GhostClaw/Hermes migration. It is intended to move safety-critical, repeatable behavior out of Python runtime glue while preserving the Python module as the behavior oracle until adapter parity is approved.

## Current Scope

The crate currently covers the P100 immediate scope:

- command parser
- policy guard
- lane router / route intent model
- receipt store
- redaction
- validation result model
- local-safe adapter previews
- review handoff/status models

## Explicitly Not Live

The Rust crate does not:

- start live Telegram
- execute Codex live
- call model/provider APIs
- deploy
- mutate Cloudflare, DNS, R2, D1, or KV
- send Telegram/LINE/email/customer messages
- read or print secrets
- execute rollback

## Source Contract

Python source reference:

```text
hermes/hermes_command_center_config_gate_safe.py
```

Prior intake report:

```text
reports/mission/A2A2A_P081_HERMES_PYTHON_MODULE_INTAKE_AND_CONTRACT_20260706.md
```

Rust crate:

```text
crates/ghostclaw_migration_core/
```

## Validation Baseline

Fresh local validation from the repository root:

```text
cargo fmt --check --manifest-path crates/ghostclaw_migration_core/Cargo.toml
cargo clippy --offline --locked --manifest-path crates/ghostclaw_migration_core/Cargo.toml --all-targets --all-features -- -D warnings
cargo test --offline --locked --manifest-path crates/ghostclaw_migration_core/Cargo.toml
cargo build --offline --locked --manifest-path crates/ghostclaw_migration_core/Cargo.toml
```

Result:

- `cargo fmt --check`: passed
- `cargo clippy --all-targets --all-features -- -D warnings`: passed
- `cargo test`: passed, 167 tests total, 0 failed
- `cargo build`: passed

## Git State

The P100 core and P101 adapter extraction are committed:

```text
125a15e feat(ghostclaw): validate Rust migration core after production launch
bd8cbf2 chore: bulk-track all dirty files across sirinx-os
```

The Rust migration path is clean in the current worktree. Unrelated dirty lanes
remain outside this scope and were not modified, staged, or committed by this
validation.

Current evidence:

- `reports/mission/A2A2A_RUST_MIGRATION_CURRENT_VALIDATION_20260714.md`
- `reports/review/p101/rust_migration_current_validation_20260714.json`

## Next Gate

Recommended next gate:

```text
P101_OPENCODE_REVIEW_RUST_ADAPTER_EXTRACTION
```

Allowed in the current local-safe lane:

- read-only review of P101 adapter contracts and fixtures
- repeatable offline format, lint, test, and build validation
- scoped evidence updates

Still blocked:

- deploy rerun
- rollback execution
- DNS mutation
- R2/D1/KV mutation
- LINE webhook activation
- CRM/customer storage write
- live messaging
- provider/model calls
- secret read/print
- broad dirty-tree cleanup
- `git add -A`
