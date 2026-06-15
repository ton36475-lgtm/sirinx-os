# OpenRouter Fusion Router Approval

Status: READY LOCAL-ONLY

Stop point: OPENROUTER FUSION ROUTER APPROVAL READY - NO PROVIDER CALL TAKEN

## Purpose

This approval packet prepares a future one-shot OpenRouter Fusion Router smoke test. It does not approve or perform the provider call.

## Locked Routing

- Provider: OpenRouter
- Router model: `openrouter/fusion`
- Panel limit: max `8` analysis models
- Default judge: `~openai/gpt-latest`
- Adapter evidence: `docs/knowledge/SIRINX_OPENROUTER_FUSION_ROUTER_V1.md`

## Evidence Checklist

- `fusion_model_locked`: `openrouter/fusion`
- `panel_count_within_limit`: max `8`
- `judge_model_configured`: default judge is present
- `max_tool_calls_bounded`: default `8`, bounded `1-16`
- `paid_api_blocked`: `canCallPaidApi=false`
- `key_value_never_printed`: no key value is printed or returned
- `provider_call_route_absent`: non-dry-run provider route is not implemented
- `thclaws_upgrade_required`: local observed thClaws version is not yet `0.61.0`
- `one_future_smoke_requires_approval`: no smoke can run from this packet alone

## Future Approval Phrase

```text
Approve exactly one OpenRouter Fusion Router read-only smoke after confirming budget, key presence, panel models, judge model, max_tool_calls, and prompt scope.
```

## Blocked Until Separate Approval

- OpenRouter provider call
- OpenRouter API key read or print
- provider credit spend
- paid API smoke
- recursive Fusion
- unbounded panel
- MCP startup
- deploy, push, publish
- Telegram, LINE, email, SMS, or customer message send
- package install

## thClaws Runtime Gate

thClaws `0.61.0` support is treated as a runtime requirement, not as a confirmed local state.

Before any live thClaws Fusion use:

1. Verify official thClaws release source.
2. Upgrade or install thClaws in a separate lane.
3. Record `thclaws --version`.
4. Run local dry-run status.
5. Request separate provider smoke approval.

## Verification

```bash
pnpm openrouter-fusion-router:test
pnpm audit:secrets
git diff --check
```

## Guardrail

This packet is local approval evidence only. It is not approval to call OpenRouter, read secrets, spend credits, send messages, deploy, push, publish, install packages, or start external connectors.
