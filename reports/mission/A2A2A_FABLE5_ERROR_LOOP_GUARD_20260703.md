# A2A2A Fable5 Error Loop Guard - 2026-07-03

## Status

PASS: the local OpenRouter Fable5 smoke adapter now exposes an explicit no-retry contract for Hermes callers.

## Problem

Operator testing reported a provider failure/retry loop while trying to route Hermes jobs through Fable5. The safe local fix is to make the Fable5 smoke route fail closed and tell callers not to retry automatically.

## Changes

- Added a Fable5 smoke retry policy with `maxProviderAttempts: 1`.
- Added `providerAttemptCount` to blocked, failed, and successful smoke results.
- Added fail-stop `nextRecommendedAction` messages for provider HTTP failures and fetch/network errors.
- Added tests proving HTTP `5xx` and network failures call the provider exactly once.
- Updated the Fable5 knowledge note with the no-retry policy.

## Files

- `services/dev-control-api/src/openrouter-fable5-adapter.mjs`
- `services/dev-control-api/src/openrouter-fable5-adapter.test.mjs`
- `services/dev-control-api/server.mjs`
- `docs/knowledge/SIRINX_OPENROUTER_FABLE5_ADAPTER_V1.md`

## Verification

```bash
pnpm openrouter-fable5-adapter:test
pnpm telegram-command-router:test
node --check services/dev-control-api/src/openrouter-fable5-adapter.mjs
node --check services/dev-control-api/src/openrouter-fable5-adapter.test.mjs
node --check services/dev-control-api/server.mjs
```

Result:

- Fable5 adapter tests: 13 passed
- Telegram command router tests: 16 passed
- Syntax checks: passed

## Policy

No real OpenRouter provider call, no secret value read, no key printing, no Telegram live send, no install, no commit, no push, no deploy, and no Cloudflare/R2 mutation was performed.

## Next Safe Action

Run one bounded smoke only after the exact provider-call gate is intentionally reopened, then stop on any failure result instead of retrying.
