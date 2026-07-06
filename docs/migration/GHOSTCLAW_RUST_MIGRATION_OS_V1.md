# GhostClaw Rust Migration OS V1

Status: `P100_RUST_MIGRATION_CORE_VALIDATED_LOCAL_UNCOMMITTED`
Updated: `2026-07-07T02:31:21+07:00`

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

Fresh P100 validation from `crates/ghostclaw_migration_core`:

```text
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
cargo build
```

Result:

- `cargo fmt --check`: passed
- `cargo clippy --all-targets --all-features -- -D warnings`: passed
- `cargo test`: passed, 161 tests total, 0 failed
- `cargo build`: passed

## Git State

The crate is currently local and untracked:

```text
?? crates/ghostclaw_migration_core/
```

This is intentional evidence state for the next gate. Do not use `git add -A`. A scoped human commit gate must explicitly name the crate and P090E/P100 evidence files before these artifacts are committed.

## Next Gate

Recommended next gate:

```text
P100A_SCOPED_RUST_CORE_COMMIT_GATE
```

Allowed after explicit human approval:

- scoped add/commit for `crates/ghostclaw_migration_core/**`
- scoped add/commit for P090E/P100 evidence artifacts

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
