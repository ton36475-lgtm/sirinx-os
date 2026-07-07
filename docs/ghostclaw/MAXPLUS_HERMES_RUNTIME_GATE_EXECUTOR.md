# MaxPlus Hermes Runtime Gate Executor

Mission ID: `MAXPLUS-HERMES-CHINESE-MODEL-20260630`

## Purpose

`scripts/ghostclaw/hermes_maxplus_runtime_gate_executor.py` is the bridge from
the local-safe setup pack to real runtime checks. It is deliberately separate
from the dry-run inventory runner.

Default behavior is dry-run. Runtime execution requires both:

1. `--execute`
2. the exact gate environment variable set to `1`

The executor writes redacted evidence and receipts. It does not print secret
values, read private env file contents, send live messages, activate recurring
cron jobs, mutate MCP connectors, push, or deploy.

## Dry-Run All Gates

```bash
python3 scripts/ghostclaw/hermes_maxplus_runtime_gate_executor.py --all
```

## Config Check Gates

These can run only after the owner has written private config safely.

```bash
APPROVE_HERMES_DOCTOR_CONFIG_CHECK=1 \
python3 scripts/ghostclaw/hermes_maxplus_runtime_gate_executor.py --gate doctor --execute

APPROVE_HERMES_STATUS_CONFIG_CHECK=1 \
python3 scripts/ghostclaw/hermes_maxplus_runtime_gate_executor.py --gate status --execute
```

The model picker is interactive and needs a terminal:

```bash
APPROVE_HERMES_MODEL_PICKER_CHECK=1 \
python3 scripts/ghostclaw/hermes_maxplus_runtime_gate_executor.py --gate model_picker --execute --allow-interactive
```

## One-Turn Provider Smoke

This is a paid/provider call and must stay one-shot.

```bash
export MAXPLUS_CODEX_API_KEY="<private value outside repo>"
export MAXPLUS_HERMES_SMOKE_PROMPT='Reply with exactly this JSON and no extra text: {"ok": true, "source": "hermes-maxplus-smoke"}'

APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN=1 \
python3 scripts/ghostclaw/hermes_maxplus_runtime_gate_executor.py --gate provider_smoke --execute
```

## Plan-Only Gates

These remain plan-only in this harness because they can create live or recurring
side effects:

- `gateway_setup`
- `cron_dry_run`
- `subagent_local`
- `mcp_connector`

They still write evidence and receipts, but do not execute the live action.

## Evidence Paths

- Evidence: `.ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_<gate>.json`
- Receipt: `.ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_<gate>.receipt.json`

## Stop Conditions

- Any command prints a token or private key.
- Any command tries to send a Telegram/Discord/Signal message without an exact
  recipient gate.
- Any provider call is not one-shot.
- Any scheduler action becomes recurring.
- Any MCP config diff contains secrets.
