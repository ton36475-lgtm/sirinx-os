# MaxPlus Hermes Owner Runtime Handoff

Mission ID: `MAXPLUS-HERMES-CHINESE-MODEL-20260630`
Generated: `2026-06-30T11:54:24.315031+00:00`
Status: `ready_for_owner_terminal_gate`

This is a Telegram-safe and Codex-safe handoff for moving from the local-safe setup pack to real Hermes + MaxPlus runtime activation. It contains no private key value and does not execute any provider, gateway, cron, subagent, MCP, push, or deploy action.

## Precondition

- Run this only from the owner terminal.
- Put the private MaxPlus key in `MAXPLUS_CODEX_API_KEY` outside the repo.
- Do not paste the private key into Codex, Telegram, receipts, docs, or logs.
- Keep each gate one-shot; stop if any command prints a token or private value.

## Current Local-Safe Evidence

- Activation controller: `scripts/ghostclaw/hermes_maxplus_activation_controller.py`
- Latest safe status evidence: `.ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller_status.json`
- Full runtime status: `repo_side_review_ready_full_runtime_incomplete`

## Owner Gate Sequence

| Step | Stage | Gate | Scope | Expected evidence |
| --- | --- | --- | --- | --- |
| 1 | `private_config_write` | `APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1` | owner terminal | `.ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller_private_config_write.json` |
| 2 | `safe_status_after_private_write` | `none` | local-safe | `.ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller_status.json` |
| 3 | `doctor` | `APPROVE_HERMES_DOCTOR_CONFIG_CHECK=1` | owner terminal | `.ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller_doctor.json` |
| 4 | `status` | `APPROVE_HERMES_STATUS_CONFIG_CHECK=1` | owner terminal | `.ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller_runtime_status.json` |
| 5 | `model_picker` | `APPROVE_HERMES_MODEL_PICKER_CHECK=1` | owner terminal | `.ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller_model_picker.json` |
| 6 | `provider_smoke` | `APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN=1` | owner terminal | `.ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller_provider_smoke.json` |

## Commands

Set the private key only in the owner terminal:

```bash
export MAXPLUS_CODEX_API_KEY="<private value outside repo>"
```

Then run one stage at a time:

```bash
APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1 python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --execute-stage private_config_write
python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --status
APPROVE_HERMES_DOCTOR_CONFIG_CHECK=1 python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --execute-stage doctor
APPROVE_HERMES_STATUS_CONFIG_CHECK=1 python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --execute-stage status
APPROVE_HERMES_MODEL_PICKER_CHECK=1 python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --execute-stage model_picker --allow-interactive
APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN=1 python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --execute-stage provider_smoke
```

## Plan-Only Advanced Gates

These remain plan-only in this harness until a separate exact gate exists:

- `gateway_setup`
- `cron_dry_run`
- `subagent_local`
- `mcp_connector`

## Stop Conditions

- Any command prints a token or private key.
- Any provider call is not the explicit one-turn smoke.
- Any gateway action sends a live Telegram/Discord/Signal message.
- Any cron action becomes recurring without a scheduler and cost gate.
- Any MCP action writes connector credentials into the repo.
