# A2A2A Telegram Error Loop Bus Ack - 2026-07-03

## Status

PASS_LOCAL_BUS_ACK_COMPLETE: the P063 handoff packets for Codex, Hermes, and OpenCode were acknowledged by the local A2A2A file bus.

## What This Proves

- Codex inbox packet exists and has a local bus ack receipt.
- Hermes inbox packet exists and has a local bus ack receipt.
- OpenCode inbox packet exists and has a local bus ack receipt.
- The bus watcher only acknowledged packet presence and wrote receipts.

## What This Does Not Prove

- It does not prove a live Telegram send occurred.
- It does not prove a provider/model call occurred.
- It does not prove an external Hermes process executed the task.
- It does not prove an OpenCode model session reviewed the diff.

## Source Packets

- Codex: `.ghostclaw_runtime/a2a2a/inbox/codex/A2A2A-P063-CODEX-TELEGRAM-ERROR-LOOP-HANDOFF-20260703.json`
- Hermes: `.ghostclaw_runtime/a2a2a/inbox/hermes/A2A2A-P063-HERMES-TELEGRAM-ERROR-LOOP-ROUTE-20260703.json`
- OpenCode: `.ghostclaw_runtime/a2a2a/inbox/opencode/A2A2A-P063-OPENCODE-TELEGRAM-ERROR-LOOP-REVIEW-20260703.json`

## Ack Receipts

- `.ghostclaw_runtime/a2a2a/receipts/bus_ack_codex_A2A2A-P063-CODEX-TELEGRAM-ERROR-LOOP-HANDOFF-20260703.json`
- `.ghostclaw_runtime/a2a2a/receipts/bus_ack_hermes_A2A2A-P063-HERMES-TELEGRAM-ERROR-LOOP-ROUTE-20260703.json`
- `.ghostclaw_runtime/a2a2a/receipts/bus_ack_opencode_A2A2A-P063-OPENCODE-TELEGRAM-ERROR-LOOP-REVIEW-20260703.json`

## Aggregate Evidence

- Evidence: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P064-TELEGRAM-ERROR-LOOP-BUS-ACK-20260703.json`
- Receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P064-TELEGRAM-ERROR-LOOP-BUS-ACK-20260703.json`

## Re-run Locally

Use the safe one-shot watcher to acknowledge currently unprocessed local inbox packets:

```bash
pnpm ghostclaw-a2a:bus-watch
```

Run its regression tests:

```bash
pnpm ghostclaw-a2a:bus-watch:test
```

For targeted P063 replay, pass explicit packet paths to the underlying script:

```bash
python3 scripts/ghostclaw_a2a_bus_watcher.py \
  --packet .ghostclaw_runtime/a2a2a/inbox/codex/A2A2A-P063-CODEX-TELEGRAM-ERROR-LOOP-HANDOFF-20260703.json \
  --packet .ghostclaw_runtime/a2a2a/inbox/hermes/A2A2A-P063-HERMES-TELEGRAM-ERROR-LOOP-ROUTE-20260703.json \
  --packet .ghostclaw_runtime/a2a2a/inbox/opencode/A2A2A-P063-OPENCODE-TELEGRAM-ERROR-LOOP-REVIEW-20260703.json \
  --once
```

## Closed Gates

- `telegram_live_send`
- `provider_call`
- `paid_model_call`
- `repo_content_external_routing`
- `customer_data_external_routing`
- `secret_read`
- `secret_value_print`
- `install`
- `commit`
- `push`
- `deploy`
- `cloudflare_r2_mutation`

## Next Safe Action

Run focused local validation and keep live Telegram send and provider calls closed unless reopened with a separate exact gate.
