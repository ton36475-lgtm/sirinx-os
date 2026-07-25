# SIRINX OpenRouter Fable5 Adapter v1

Stop point: OPENROUTER FABLE5 ADAPTER READY - LOCAL ONLY - WAITING FOR EXPLICIT PROVIDER CALL GATE

This adapter records the safe request-preview contract for routing Hermes
Telegram high-reasoning tasks to OpenRouter Fable5. It does not call
OpenRouter, read `OPENROUTER_API_KEY`, send Telegram messages, install
packages, push, deploy, or mutate cloud resources.

## Route

- Provider: OpenRouter
- Endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Model: `anthropic/claude-fable-5`
- Codex profile: `fable5`
- Telegram command: `/fable5 preview`
- API status: `GET /api/openrouter-fable5-adapter`
- API dry-run: `POST /api/openrouter-fable5-adapter/plan/dry-run`
- API bounded smoke: `POST /api/openrouter-fable5-adapter/smoke`

## Gate

Provider execution remains closed until this exact gate is opened:

```text
APPROVE_OPENROUTER_FABLE5_PROVIDER_CALL_A019E53EE
```

Before opening the gate, verify model availability, budget, OpenRouter key
presence only, and the intended task category.

## Allowed Uses

- founder-level architecture
- product or business strategy
- complex debugging synthesis
- final decision review after cheaper/local lanes produce evidence

## Blocked Uses

- heartbeat LLM polling
- repeated status checks
- routine summaries
- formatting or bulk documentation
- retries after provider failure without diagnosis
- Telegram live send
- secret reads or key printing

## Current Boundary

Hermes Telegram can preview the Fable5 request body and show the next gate.
Bounded smoke is available only after the exact provider-call gate and must not
be reused as polling or default routing.

## Retry / Error-Loop Policy

Fable5 smoke is a high-cost gated route, so the runtime must not retry provider
failures automatically.

- `maxProviderAttempts`: `1`
- `retryAllowed`: `false`
- `repeatedRetryBlocked`: `true`
- `retryAfterFailure`: `false`

Every blocked, failed, or successful smoke result includes `providerAttemptCount`
and `retryPolicy`. On HTTP `5xx`, network errors, timeout, rate limit, billing,
or model slug failure, Hermes must stop and ask the operator to inspect budget,
model availability, gateway logs, and the exact approval state before another
single bounded smoke is attempted.

Verified locally:

```bash
pnpm openrouter-fable5-adapter:test
pnpm telegram-command-router:test
node --check services/dev-control-api/src/openrouter-fable5-adapter.mjs
node --check services/dev-control-api/src/openrouter-fable5-adapter.test.mjs
node --check services/dev-control-api/server.mjs
```
