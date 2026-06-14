# SIRINX OpenRouter Qwen Adapter v1

Status: READY LOCAL-ONLY

Stop point: OPENROUTER QWEN ADAPTER READY - LOCAL ONLY - WAITING FOR MODEL ROUTING APPROVAL

## Purpose

This adapter gate captures the server-side OpenRouter Qwen 3.7 Max contract for Hermes without calling the provider.

It provides:

- model policy
- request preview
- JSON mode policy
- ZDR policy
- explicit prompt-cache eligibility rules
- OpenRouter error classification
- local-only dashboard/API evidence

It does not read `OPENROUTER_API_KEY`, call OpenRouter, install SDKs, spend credits, start MCP servers, send messages, deploy, push, or publish.

## API Surface

- `GET /api/openrouter-qwen-adapter`
- `POST /api/openrouter-qwen-adapter/plan/dry-run`

Dry-run output is JSON only. It returns `providerCalled:false`, `secretsRead:false`, `canCallPaidApi:false`, and `commandExecuted:false`.

## Model Policy

Provider: OpenRouter

Endpoint: `https://openrouter.ai/api/v1/chat/completions`

Primary model: `qwen/qwen3.7-max`

Fallback model: `qwen/qwen3-max`

Default policy:

- temperature: `0.2`
- max tokens: `4096`
- stream: `false`

JSON strict policy:

- temperature: `0.05`
- max tokens: `3000`
- `response_format: { "type": "json_object" }`

Sensitive policy:

- applies to internal repo analysis, client strategy, and security reports
- `provider.zdr: true`

## Prompt Cache Policy

Allowed for stable non-secret blocks:

- Hermes master system prompt
- project rules
- repo map
- architecture brief
- agent role definitions

Rejected:

- latest user command
- tokens
- secrets
- runtime logs
- temporary error traces
- credentials

## Error Classification

- `401`: `AUTH_ERROR_INVALID_KEY`
- `402`: `BILLING_ERROR_NO_CREDIT`
- `403`: `POLICY_OR_PROVIDER_FORBIDDEN`
- `404`: `MODEL_NOT_FOUND_OR_BAD_SLUG`
- `429`: `RATE_LIMITED`
- `500+`: `PROVIDER_OR_GATEWAY_ERROR`

## Source Anchors

- `https://openrouter.ai/qwen/qwen3.7-max/api`
- `https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request`
- `https://openrouter.ai/docs/guides/routing/model-fallbacks`
- `https://openrouter.ai/docs/guides/features/zdr`
- `https://openrouter.ai/docs/organization-management`

## Verification

```bash
pnpm openrouter-qwen-adapter:test
pnpm team-runtime-bridge:test
pnpm gateway-agent:test
pnpm check
pnpm verify:workspace
pnpm audit:secrets
pnpm dashboard:e2e
git diff --check
```
