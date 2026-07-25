# MaxPlus Hermes Operator Runbook

Mission ID: `MAXPLUS-HERMES-CHINESE-MODEL-20260630`

## Goal

Move from local-safe repo setup to a real Hermes Agent + MaxPlus runtime without
ever exposing the private key in repo files, Codex logs, Telegram drafts, or
receipts.

## Current Proven State

- Hermes CLI is present.
- `~/.hermes` exists.
- Repo templates define `custom:maxplus-codex` with `transport: openai_chat`.
- Repo artifacts contain no live-looking key literal.
- Current Codex shell does not have `MAXPLUS_CODEX_API_KEY`.
- `hermes_maxplus_activation_controller.py --status` records the local-safe
  probes without reading secret values or executing provider/runtime gates.
- No provider call, gateway live send, cron provider job, subagent runtime, MCP
  mutation, remote installer execution, push, or deploy has run.

## Safe Local Commands

These commands do not read private env content and do not call a provider:

```bash
python3 scripts/ghostclaw/hermes_maxplus_preflight.py
python3 scripts/ghostclaw/hermes_cli_offline_preflight.py
python3 scripts/ghostclaw/apply_hermes_maxplus_private_config.py --dry-run
python3 scripts/ghostclaw/hermes_maxplus_gate_runner.py --all --dry-run
python3 scripts/ghostclaw/hermes_maxplus_runtime_gate_executor.py --all
python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --plan
python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --status
python3 scripts/ghostclaw/hermes_maxplus_runtime_handoff.py
python3 scripts/ghostclaw/hermes_maxplus_runtime_completion_verifier.py
python3 scripts/ghostclaw/validate_maxplus_hermes_safe_setup.py
```

## Activation Sequence

Start with the single sequence controller. It records readiness without reading
or printing secrets:

```bash
python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --plan
```

1. Private config write:

   ```bash
   export MAXPLUS_CODEX_API_KEY="<private value outside repo>"
   APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1 \
   python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --execute-stage private_config_write
   ```

2. Rerun presence-only preflight:

   ```bash
   python3 scripts/ghostclaw/hermes_maxplus_preflight.py
   scripts/launchers/hermes-maxplus-openai-chat-safe --dry-run
   ```

3. Config checks, one gate at a time:

   ```text
   APPROVE_HERMES_DOCTOR_CONFIG_CHECK
   APPROVE_HERMES_STATUS_CONFIG_CHECK
   APPROVE_HERMES_MODEL_PICKER_CHECK
   ```

   Execute with the runtime gate executor, one gate at a time:

   ```bash
   APPROVE_HERMES_DOCTOR_CONFIG_CHECK=1 \
   python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --execute-stage doctor

   APPROVE_HERMES_STATUS_CONFIG_CHECK=1 \
   python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --execute-stage status
   ```

4. Provider smoke, one turn only:

   ```text
   APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN
   ```

   Use `scripts/ghostclaw/hermes_maxplus_runtime_gate_executor.py --gate provider_smoke --execute`.
   Or use the sequence controller:

   ```bash
   APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN=1 \
   python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --execute-stage provider_smoke
   ```

5. Advanced features only after runtime smoke:

   ```text
   APPROVE_HERMES_GATEWAY_LOCAL_SETUP
   APPROVE_HERMES_CRON_LOCAL_DRY_RUN
   APPROVE_HERMES_SUBAGENT_ONE_LOCAL_TASK
   CONNECTOR_SPECIFIC_MCP_GATE_REQUIRED
   ```

## Stop Conditions

- Any command prints a key or token.
- Any command tries to send a live Telegram/Discord/Signal message without an
  exact recipient gate.
- Any command starts recurring provider calls without a budget gate.
- Any config file writes secret content into the repo.
- Any remote installer command runs before review.

## Reporting

Use the local Telegram draft only. Do not live-send it from Codex:

`/.ghostclaw_runtime/a2a2a/outbox/hermes/MAXPLUS-HERMES-CHINESE-MODEL-20260630.telegram_report_draft.md`
