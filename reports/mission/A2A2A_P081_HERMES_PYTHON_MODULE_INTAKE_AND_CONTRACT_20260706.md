# P081 Hermes Python Module Intake And Contract - 2026-07-06

Status: `P081_CONTRACT_AND_FILE_LEASE_READY_FOR_APPROVAL`

Mode: `READ_ONLY_CONTRACT_EXTRACTION_NO_MUTATION`

Source module: `hermes/hermes_command_center_config_gate_safe.py`

## Module Summary

`hermes_command_center_config_gate_safe.py` is a safe-gated Telegram control-plane module for Hermes. It defaults to dry-run mode, requires explicit live environment gates, classifies tasks into model profiles, flags risky requests for approval, redacts secrets in receipts, and optionally dispatches Codex CLI commands.

The module was read and compiled only. The Python source was not edited.

## Public API Map

| Symbol | Type | Contract |
| --- | --- | --- |
| `ModelChoice` | dataclass | model route result with `profile`, `label`, `reason` |
| `redact(text)` | function | replace secret-like strings with `[REDACTED_SECRET]` |
| `require_live_gate()` | function | validate live runtime prerequisites and return `(message, code)` |
| `classify_model(task_text)` | function | select model profile from task text |
| `is_risky(task_text)` | function | detect risky/deploy/secret/send/delete patterns |
| `check_fable5_quota()` | function | optional quota endpoint probe; returns `unknown`, `near_limit`, or `ok` |
| `write_receipt(task_id, payload)` | function | write redacted JSON receipt to `~/.ghostclaw/receipts` |
| `run_codex(task_text, profile, cwd=None)` | function | dry-run or invoke Codex CLI under profile with safety gates |
| `cmd_start(update, context)` | async handler | Telegram `/start` status response |
| `cmd_quota(update, context)` | async handler | Telegram `/quota` response |
| `handle_task(update, context)` | async handler | classify task, queue approval, or dry-run dispatch |
| `handle_approval(update, context)` | async handler | process inline approve/deny callback |
| `main()` | function | live Telegram bot entrypoint after live gate validation |

## Input And Output Schema

### Inputs

- Telegram text messages
- Telegram callback data: `approve:<task_id>` or `deny:<task_id>`
- Environment:
  - `GHOSTCLAW_REPO`
  - `HERMES_DRY_RUN_ONLY`
  - `HERMES_ALLOW_LIVE`
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_ADMIN_CHAT_ID`
  - `HERMES_ALLOW_FABLE5_PROVIDER_CALL`
  - `OPENROUTER_API_KEY`
  - `FABLE5_QUOTA_URL` or `NINEROUTER_QUOTA_URL`
- Config receipt: `~/.ghostclaw/receipts/config_gate_v1.json`

### Outputs

- Telegram replies
- Redacted JSON receipts in `~/.ghostclaw/receipts`
- Dry-run string if `HERMES_DRY_RUN_ONLY` is active
- Bounded Codex CLI output if live execution is enabled and allowed
- Process exit code from `main()`

## Behavior Contract

1. Live Telegram runtime must not start unless `HERMES_ALLOW_LIVE=1`, config receipt exists and passes, and required Telegram env vars are present.
2. Default execution is dry-run because `HERMES_DRY_RUN_ONLY` defaults to true.
3. Risky patterns must be routed to approval instead of automatic execution.
4. Receipts must redact secret-like task/output content.
5. Fable5 provider dispatch requires both `HERMES_ALLOW_FABLE5_PROVIDER_CALL=1` and `OPENROUTER_API_KEY` presence.
6. Codex output is truncated to 3500 characters before receipt/message use.
7. Non-admin Telegram chats are denied.

## Mutable State Map

| State | Location | Notes |
| --- | --- | --- |
| Runtime pending tasks | module global `PENDING` | in-memory only, lost on restart |
| Receipts | `~/.ghostclaw/receipts/*.json` | write side effect |
| Config gate receipt | `~/.ghostclaw/receipts/config_gate_v1.json` | read side effect |
| Repo root | `GHOSTCLAW_REPO` or `/Users/sirinx/sirinx-os` | used as Codex cwd |

## External Dependencies

- `python-telegram-bot` imports from `telegram` and `telegram.ext`
- `codex` CLI on `PATH` for non-dry-run execution
- Optional quota endpoint through `urllib.request`
- Local file system for receipts and config gate
- Telegram network only when live runtime is started

## Risk Notes

- `handle_approval()` can execute risky tasks after inline approval when not in dry-run mode.
- `run_codex()` can call provider-backed Codex profiles when dry-run is disabled.
- `PENDING` is not durable and has no replay/expiry protection.
- Callback `approve:<task_id>` trusts the current in-memory task payload.
- Receipt paths are in the user home directory, not repo-scoped.
- Risk detection is regex-based and should be treated as conservative but incomplete.

## Rust Migration Strategy

1. Freeze command and receipt contract first.
2. Port deterministic functions into Rust:
   - redaction
   - model classification
   - risky-action classification
   - live-gate validation model
   - receipt schema
3. Keep Telegram and Codex subprocess adapters outside the first Rust core.
4. Add Python parity tests before replacing runtime paths.
5. Add durable pending queue only after schema approval.

## Test Plan

- Unit tests for `redact()` against token/key/password examples.
- Unit tests for `classify_model()` profile selection.
- Unit tests for `is_risky()` across deploy/push/secret/live-send/delete patterns.
- Contract tests for `require_live_gate()` under missing env/config receipt states.
- Receipt tests proving task/output redaction and output truncation.
- Dry-run tests for `run_codex()` without invoking external Codex.
- Approval handler tests using fake Telegram update/context objects.

## File Lease Proposal

Proposed only. Not approved.

Allowed for next P081 implementation gate:

- `crates/ghostclaw_migration_core/**`
- `tests/hermes_contract/**`
- `reports/mission/A2A2A_P081_*`
- `schemas/hermes/**`

Blocked until explicit approval:

- `hermes/hermes_command_center_config_gate_safe.py`
- any real `.env`
- live Telegram bot startup
- Codex live execution
- provider/model calls
- deploy/push/cloud/DNS/live-send

## Validation Evidence

- `python3 -m py_compile hermes/hermes_command_center_config_gate_safe.py`: passed
- AST inventory completed for classes/functions/imports
- No Python source mutation was performed
