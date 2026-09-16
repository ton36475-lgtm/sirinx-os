# A2A2A P021 OpenRouter Fable5 Live Smoke - 2026-07-03

Packet: `A2A2A-P021-OPENROUTER-FABLE5-LIVE-SMOKE-20260703`
Gate: `APPROVE_OPENROUTER_FABLE5_PROVIDER_CALL_A019E53EE`
Status: `PASS_PROVIDER_SMOKE_HTTP_200`
Mode: bounded provider smoke

## Summary

Ran exactly one bounded OpenRouter Fable5 smoke test after the explicit provider
call gate was provided. The smoke prompt contained no repo content, no customer
data, and no secrets.

## Result

- Provider: OpenRouter
- Requested model: `anthropic/claude-fable-5`
- Resolved model: `anthropic/claude-5-fable-20260609`
- HTTP status: `200`
- Finish reason: `stop`
- Usage: `154` total tokens
- Response preview: `{"status":"ok","route":"openrouter_fable5","smoke":"bounded"}`

## Guardrails

- Provider call: yes, one bounded smoke only
- Telegram live send: no
- Repo content sent: no
- Customer data sent: no
- Secret value printed: no
- `.env` edited: no
- Install/push/deploy/cloud mutation: no

The runtime used the configured OpenRouter credential internally to authorize
the request. The key value was not printed, logged into the report, or written
to Obsidian.

## Validation

Before the live smoke, focused local validation passed:

```text
./node_modules/.bin/vitest run services/dev-control-api/src/openrouter-fable5-adapter.test.mjs services/dev-control-api/src/telegram-command-router.test.mjs services/dev-control-api/src/telegram-gateway-config.test.mjs --reporter=dot
```

Result: `3` test files passed, `30` tests passed.

## Next Safe Action

Keep Fable5 behind explicit high-reasoning gates. Do not use it for heartbeat
polling, repeated status checks, routine summaries, or bulk docs.
