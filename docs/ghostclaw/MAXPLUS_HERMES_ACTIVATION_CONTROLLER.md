# MaxPlus Hermes Activation Controller

Mission ID: `MAXPLUS-HERMES-CHINESE-MODEL-20260630`

## Purpose

`scripts/ghostclaw/hermes_maxplus_activation_controller.py` is the single
sequence controller for the Hermes + MaxPlus setup lane. It does not replace
the smaller gate scripts; it calls them in a controlled order and records which
stage is safe, blocked, or waiting for an exact owner gate.

Default behavior is plan-only:

```bash
python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --plan
```

The controller never prints secret values, reads private `.env` values, sends
Telegram/customer messages, activates cron, starts gateway messaging, mutates
MCP connectors, pushes, deploys, or runs provider calls unless a single exact
gate is opened for one stage.

## Local-Safe Status

This command runs only the local-safe probes and dry-run inventories:

```bash
python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --status
```

Included safe probes:

- `private_config_dry_run`
- `preflight`
- `cli_offline_preflight`
- `runtime_gate_inventory`

## Gated Stage Execution

Every non-safe stage must be opened one at a time. The controller checks the
same gate names as the underlying runtime gate executor.

Private config write:

```bash
export MAXPLUS_CODEX_API_KEY="<private value outside repo>"
APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1 \
python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --execute-stage private_config_write
```

Hermes config checks:

```bash
APPROVE_HERMES_DOCTOR_CONFIG_CHECK=1 \
python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --execute-stage doctor

APPROVE_HERMES_STATUS_CONFIG_CHECK=1 \
python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --execute-stage status
```

Interactive model picker:

```bash
APPROVE_HERMES_MODEL_PICKER_CHECK=1 \
python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --execute-stage model_picker --allow-interactive
```

One-turn provider smoke:

```bash
export MAXPLUS_CODEX_API_KEY="<private value outside repo>"
APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN=1 \
python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --execute-stage provider_smoke
```

## Plan-Only Advanced Stages

These stages remain plan-only in this harness because they can create live,
recurring, or connector side effects:

- `gateway_setup`
- `cron_dry_run`
- `subagent_local`
- `mcp_connector`

The exact gates are still recorded so Hermes can route a future owner-approved
task:

- `APPROVE_HERMES_GATEWAY_LOCAL_SETUP`
- `APPROVE_HERMES_CRON_LOCAL_DRY_RUN`
- `APPROVE_HERMES_SUBAGENT_ONE_LOCAL_TASK`
- `CONNECTOR_SPECIFIC_MCP_GATE_REQUIRED`

## Evidence

- Plan evidence: `.ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller_plan.json`
- Status evidence: `.ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller_status.json`
- Stage evidence: `.ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller_<stage>.json`
- Runtime status stage evidence uses `activation_controller_runtime_status.json` so it never overwrites the safe `--status` evidence.
- Receipt: `.ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller.receipt.json`

## Stop Conditions

- Any output contains a token, key, private key block, or bot token.
- Any command tries to send live messages without a recipient-specific gate.
- Any provider call is not the explicitly approved one-turn smoke.
- Any scheduler action becomes recurring.
- Any MCP connector action stores credentials in the repo.
