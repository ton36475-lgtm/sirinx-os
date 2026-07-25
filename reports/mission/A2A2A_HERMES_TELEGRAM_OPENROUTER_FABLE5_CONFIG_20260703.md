# A2A2A P020 Hermes Telegram OpenRouter Fable5 Config - 2026-07-03

Packet: `A2A2A-P020-HERMES-TELEGRAM-OPENROUTER-FABLE5-CONFIG-20260703`
Status: `PASS_LOCAL_SAFE_CONFIG_PREVIEW_ONLY`
Mode: local config, request preview, no provider call

## Summary

Configured Hermes Telegram local surfaces to expose OpenRouter Fable5 as a
preview-only high-reasoning route.

## What Changed

- Added `OpenRouter Fable5 Adapter` with request-preview and policy-only APIs.
- Added Telegram command `/fable5 preview` and callback `cmd:fable5-preview`.
- Added config validation for OpenRouter Fable5 model-routing fields.
- Updated model-router registry/config/docs with `fable5_orchestrator`.
- Changed `hermes/config_gate_run.sh` so the proposed Codex `fable5` profile
  uses `openrouter_direct`, not `ninerouter_local`.
- Hardened `hermes/hermes_command_center_config_gate_safe.py` so live Fable5
  execution is blocked unless `HERMES_ALLOW_FABLE5_PROVIDER_CALL=1` and
  `OPENROUTER_API_KEY` presence are set.

## Guardrails

- No OpenRouter provider call.
- No Fable5 model call.
- No Telegram live send.
- No token value read or printed.
- No `.env` read.
- No install, push, deploy, Cloudflare mutation, or R2 write.

## Validation

- `node --check` for changed JS modules/server: passed
- `python3 -m json.tool` for changed JSON configs/examples: passed
- `bash -n hermes/config_gate_run.sh`: passed
- `python3 -m py_compile hermes/hermes_command_center_config_gate_safe.py`: passed
- Focused tests:
  `./node_modules/.bin/vitest run services/dev-control-api/src/openrouter-fable5-adapter.test.mjs services/dev-control-api/src/telegram-command-router.test.mjs services/dev-control-api/src/telegram-gateway-config.test.mjs --reporter=dot`
  passed with 3 files / 26 tests.

## Next Safe Action

Use `/fable5 preview` for local request preview only. Before any real provider
call, verify model availability, confirm budget, confirm `OPENROUTER_API_KEY`
presence only, then open exactly:

```text
APPROVE_OPENROUTER_FABLE5_PROVIDER_CALL_A019E53EE
```
