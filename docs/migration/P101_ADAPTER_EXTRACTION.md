# P101 Adapter Extraction

Status: `LOCAL_IMPLEMENTATION_READY_FOR_REVIEW`

Baseline:
- `P100C_REVIEW_PASS_READY_FOR_P101_ADAPTER_EXTRACTION`
- Commit `125a15ecf1e92723a38f41f382e006756965c94b` exists on `origin/staging/godmode-master-os-v2`.

## Scope

P101 adds local-only adapter boundaries around `crates/ghostclaw_migration_core`.
It does not start live Telegram, execute Codex, mutate Cloudflare, deploy, push,
read secrets, or touch the SIRINX site.

Allowed paths used:
- `crates/ghostclaw_migration_core/**`
- `docs/migration/P101_ADAPTER_EXTRACTION.md`
- `reports/mission/A2A2A_P101_ADAPTER_EXTRACTION_20260707.md`
- `reports/review/p101/**`

Blocked paths preserved:
- `apps/sirinx-site/**`
- `hermes_command_center.py`
- `.env*`
- `secrets/**`
- `target/**`
- Cloudflare config and deploy paths

## Implemented Boundaries

### Adapter Traits

`src/adapters/traits.rs` defines:
- `WorkerAdapter`
- `ValidatorAdapter`
- `ReceiptAdapter`
- `QueueAdapter`

The traits expose preview, validation, receipt, and queue boundaries while
defaulting to local-only behavior. `executed_live()` returns `false` unless a
future explicitly gated adapter overrides it.

### Codex Dry-Run Adapter

`CodexDryRunAdapter` wraps the existing `preview_codex_dry_run` behavior. It
returns command previews only and never spawns Codex.

### Persistent Pending Queue

`FilePendingQueue` now implements `QueueAdapter`.

Queue clearing is append-only: `clear_local_only()` writes a
`clear_pending_local_only` marker and `read_report()` treats jobs before the
latest clear marker as drained. The queue file is not truncated.

### Validator Adapter

`StaticValidatorAdapter` adapts already-collected deterministic checks into a
`ValidatorResult`. It does not run live external checks.

### Python Oracle Fixtures

`src/python_oracle.rs` defines the fixture contract for future parity against
pure functions from `hermes_command_center.py`.

It does not import Python, run Telegram, or execute Codex. It only normalizes
expected fixture values and redacts secret-like inputs.

## Tests Added

`tests/p101_adapter_extraction.rs` covers:
- worker adapter dry-run preview behavior
- append-only queue clear marker behavior
- receipt adapter wrapping existing receipt stores
- deterministic validator adapter behavior
- Python oracle fixture contract and redaction
- fixture normalization

## Still Blocked

- Live Telegram start
- Live Codex execution
- Editing `hermes_command_center.py`
- `apps/sirinx-site/**`
- Deploy / preview deploy / production deploy
- Cloudflare/R2/D1/KV/DNS mutation
- LINE webhook activation
- CRM/customer storage
- Live Telegram/LINE/email/customer send
- Provider/model API call from scripts
- Secret read/print
- Git push

## Next Gate

`P101_OPENCODE_REVIEW_RUST_ADAPTER_EXTRACTION`

Review should verify the adapter layer remains local-only, Codex remains dry-run,
queue clearing is append-only, Python oracle fixtures do not execute Python, and
PolicyGuard still blocks risky actions.
