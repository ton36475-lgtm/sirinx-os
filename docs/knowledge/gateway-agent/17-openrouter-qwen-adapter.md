# Gateway Agent 17: OpenRouter Qwen Adapter

Status: READY LOCAL-ONLY

The OpenRouter Qwen Adapter is a request-preview and policy gate for Hermes model routing.

## Contract

- primary model: `qwen/qwen3.7-max`
- fallback model: `qwen/qwen3-max`
- endpoint: `https://openrouter.ai/api/v1/chat/completions`
- no provider execution in v1
- no API key read or print
- no SDK install
- no paid credit spend

## Gateway Use

The Gateway may surface adapter status and dry-run request previews. It must not call OpenRouter until a separate model-routing approval creates a non-dry-run path.

## Blocked

- `openrouter_provider_call`
- `openrouter_api_key_read`
- `provider_credit_spend`
- `paid_api_call`
- `real_mcp_execution`
- deploy, push, publish
- Telegram, LINE, email, SMS, or customer message send

## Stop Point

OPENROUTER QWEN ADAPTER READY - LOCAL ONLY - WAITING FOR MODEL ROUTING APPROVAL
