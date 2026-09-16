# A2A2A Hermes All Jobs Ready

Packet: `A2A2A-P023-HERMES-ALL-JOBS-READY-20260703`

Timestamp: `2026-07-03T04:44:30+0700`

## Summary

Hermes is configured for all-job readiness in local-safe mode. The system can now expose a consolidated readiness surface for Hermes, Codex, OpenCode review, A2A2A, Telegram preview, model-routing preview, Obsidian pulse policy, Cloudflare R2 gate preview, and validator lanes.

User requested `Telegram liveSend: true`. This was recorded as an external action request, but live Telegram send remains gated. The readiness surface reports:

- `telegramLiveSend.requested=true`
- `telegramLiveSend.status=exact_gate_required`
- `telegramLiveSend.canSendNow=false`
- required gate: `APPROVE_TELEGRAM_GATEWAY_LIVE_SEND_A019E53EE`

## Files Changed

- `AGENTS.md`
- `package.json`
- `configs/hermes_all_jobs_ready.config.json`
- `configs/hermes_telegram_gateway.config.json`
- `services/dev-control-api/server.mjs`
- `services/dev-control-api/src/hermes-all-jobs-readiness.mjs`
- `services/dev-control-api/src/hermes-all-jobs-readiness.test.mjs`
- `services/dev-control-api/src/telegram-command-router.mjs`
- `services/dev-control-api/src/telegram-command-router.test.mjs`

## API Added

- `GET /api/hermes/all-jobs-ready`

Supported query flags:

- `?liveSend=true`
- `?providerCall=true`
- `?cloudflareR2Write=true`
- `?push=true`
- `?deploy=true`
- `?install=true`

All flags are interpreted as exact-gate requests. They do not execute external actions.

## Telegram Command Added

- `/hermes all jobs ready`
- `/hermes all jobs ready liveSend true`
- callback: `cmd:hermes-all-jobs-ready`

The command is preview-only unless a separate live-send execution path is opened with exact gate and recipient evidence.

## Validation

- `node --check services/dev-control-api/src/hermes-all-jobs-readiness.mjs` passed.
- `node --check services/dev-control-api/src/hermes-all-jobs-readiness.test.mjs` passed.
- `node --check services/dev-control-api/src/telegram-command-router.mjs` passed.
- `node --check services/dev-control-api/server.mjs` passed.
- JSON parse passed for `configs/hermes_all_jobs_ready.config.json` and `configs/hermes_telegram_gateway.config.json`.
- Focused Vitest passed: `2` files, `18` tests.
- `git diff --check` passed for touched tracked files.
- Focused secret-like scan found no real key/token values in touched files.

## Safety Boundary

Still blocked by default:

- live Telegram send
- repo content external send
- customer data routing
- key printing
- secret reads
- provider calls by default
- install
- git push
- deploy
- Cloudflare/R2 mutation
- blanket full-auto external execution

## Next Safe Action

Use `GET /api/hermes/all-jobs-ready?liveSend=true` or `/hermes all jobs ready liveSend true` to inspect the gate preview. To actually send a Telegram message, provide the exact gate `APPROVE_TELEGRAM_GATEWAY_LIVE_SEND_A019E53EE` plus recipient evidence and message preview.
