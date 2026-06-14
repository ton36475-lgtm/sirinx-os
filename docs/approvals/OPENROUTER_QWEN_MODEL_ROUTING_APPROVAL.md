# OpenRouter Qwen Model Routing Approval

Status: READY LOCAL-ONLY

Stop point: OPENROUTER QWEN MODEL ROUTING APPROVAL READY - NO PROVIDER CALL TAKEN

## Purpose

This approval packet prepares a future one-shot OpenRouter Qwen smoke test. It does not approve or perform the provider call.

## Locked Model Routing

- Provider: OpenRouter
- Primary model: `qwen/qwen3.7-max`
- Fallback model: `qwen/qwen3-max`
- Adapter evidence: `docs/knowledge/SIRINX_OPENROUTER_QWEN_ADAPTER_V1.md`

## Evidence Checklist

- `model_slug_locked`: `qwen/qwen3.7-max`
- `fallback_slug_locked`: `qwen/qwen3-max`
- `paid_api_blocked`: `canCallPaidApi=false`
- `key_value_never_printed`: no key value is printed or returned
- `zdr_policy_reviewed`: sensitive tasks require `provider.zdr=true`
- `json_policy_reviewed`: JSON mode uses `response_format: { "type": "json_object" }`
- `cache_policy_reviewed`: cache preview accepts stable non-secret context only
- `one_future_smoke_requires_approval`: no non-dry-run provider route exists in v1

## Future Approval Phrase

```text
Approve exactly one OpenRouter Qwen 3.7 Max read-only smoke after confirming budget, key presence, ZDR/json/cache policy, and prompt scope.
```

## Blocked Until Separate Approval

- OpenRouter provider call
- OpenRouter API key read or print
- provider credit spend
- paid API smoke
- MCP startup
- deploy, push, publish
- Telegram, LINE, email, SMS, or customer message send

## Verification

```bash
pnpm model-routing-approval:test
pnpm openrouter-qwen-adapter:test
pnpm dashboard:e2e
pnpm audit:secrets
```

## Guardrail

This packet is local approval evidence only. It is not approval to call OpenRouter, read secrets, spend credits, send messages, deploy, push, publish, install packages, or start external connectors.
