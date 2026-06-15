# SIRINX Real Runtime Foundation v1

## Purpose

Real Runtime Foundation turns the previous placeholder/dry-run checks into a safe runtime readiness layer for Hermes, Telegram, OpenRouter, Cloudflare, Codex local tasks, and the agent-loop runtime.

## Rule

Never source the Hermes profile env file in a shell.

The runtime reads only exact `KEY=value` lines with a bounded parser. It reports whether required keys are present and non-empty, but never returns or prints secret values.

## API

- `GET /api/runtime-foundation`
- `POST /api/runtime-foundation/audit`
- `POST /api/openrouter-fusion-router/smoke`
- `GET /api/telegram-command-router`
- `POST /api/telegram-command-router/run`
- `GET /api/codex-task-runner`
- `POST /api/codex-task-runner/run`
- `GET /api/agent-loop-runtime`
- `POST /api/agent-loop-runtime/run`

## Runtime Gates

| Gate | Ready when | Action when blocked |
|---|---|---|
| OpenRouter | `OPENROUTER_API_KEY` is present and non-empty | Fill the Hermes profile env file, then rerun smoke |
| Telegram | bot token and chat target are present and non-empty | Fill the approved Telegram env keys |
| Cloudflare | account ID and API token are present and non-empty | Re-auth or fill approved deploy credentials |

## Safety Boundary

Allowed:

- local status checks
- local test runs through allowlisted tasks
- bounded OpenRouter Fusion smoke when key is ready
- approved Telegram status/menu send
- local agent-loop execution over allowlisted tasks

Blocked:

- arbitrary shell from Telegram
- deploy
- push
- publish
- production database write
- customer message blast
- printing secret values

## Verification

```bash
pnpm runtime-foundation:test
pnpm telegram-command-router:test
pnpm codex-task-runner:test
pnpm agent-loop-runtime:test
pnpm openrouter-fusion-router:test
pnpm audit:secrets
```
