# Telegram Gateway Config First - 2026-07-03

Objective: `codex task build ai OS create a2a2a adaptive sync auto complete full gate a019e53ee-d979-70d0-9951-fe7cc20887ecd approve Telegram gateway config first`

Mode: local-safe config-first
Generated: `2026-07-03T01:59:14+0700`

## Verdict

Status: `TELEGRAM_GATEWAY_CONFIG_READY_LOCAL_SAFE`

Telegram gateway config is now present as a non-secret local policy/config file.
The command router is hardened so command handling previews by default and live
send requires an explicit `liveSend=true` option. Live Telegram send, webhook
activation, and Hermes gateway restart remain closed behind gate-specific
approval.

## Created

- `configs/hermes_telegram_gateway.config.json`
- `services/dev-control-api/src/telegram-gateway-config.mjs`
- `services/dev-control-api/src/telegram-gateway-config.test.mjs`
- `.ghostclaw_runtime/a2a2a/evidence/TELEGRAM-GATEWAY-CONFIG-FIRST-A019E53EE-20260703.json`
- `.ghostclaw_runtime/a2a2a/receipts/TELEGRAM-GATEWAY-CONFIG-FIRST-A019E53EE-20260703.json`

## Modified

- `services/dev-control-api/src/telegram-command-router.mjs`
- `services/dev-control-api/src/telegram-command-router.test.mjs`
- `docs/ghostclaw/HERMES_TELEGRAM_CONTROL_PLANE.md`

## Config Boundary

The config stores only key names and policy:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_HOME_CHANNEL`
- `TELEGRAM_CHAT_ID`

It does not store token values, chat IDs, cookies, customer data, or webhook
secrets. The config keeps these default states:

```text
defaultLiveSend=false
webhook.enabled=false
polling.enabled=false
queuePayloadExecution=false
liveSendGate=closed
webhookActivationGate=closed
runtimeRestartGate=closed
```

## A2A2A Fit

The config points Telegram control output at local A2A2A paths:

- `.ghostclaw_runtime/a2a2a/inbox/telegram`
- `.ghostclaw_runtime/a2a2a/outbox/telegram`
- `.ghostclaw_runtime/a2a2a/receipts`

This is only a policy/config surface. It does not start Telegram polling,
activate a webhook, execute queue payloads, or send messages.

## Validation

- `node --check` for Telegram config/router modules and tests passed.
- `pnpm exec vitest run services/dev-control-api/src/telegram-gateway-config.test.mjs services/dev-control-api/src/telegram-command-router.test.mjs` passed with `2` test files and `8` tests.
- `python3 -m json.tool configs/hermes_telegram_gateway.config.json` passed.
- Receipt and evidence JSON parsed successfully.
- `git diff --check` for the scoped Telegram gateway files passed.
- Scoped secret-pattern scan returned no matches.

## Closed Gates

- Live Telegram send: `APPROVE_TELEGRAM_GATEWAY_LIVE_SEND_A019E53EE`
- Webhook activation: `APPROVE_TELEGRAM_GATEWAY_WEBHOOK_ACTIVATION_A019E53EE`
- Hermes gateway restart: `APPROVE_HERMES_GATEWAY_RESTART_A019E53EE`

## Next Safe Packet

`A2A2A-P002-SAFE-LOCAL-DISPATCH-PLAN-20260703`

Recommended next action: use the Telegram config and P001 dry-run reconcile
output to draft local A2A2A dispatch plans only. Keep live Telegram, webhook,
restart, provider calls, install, push, deploy, and secret reads closed.
