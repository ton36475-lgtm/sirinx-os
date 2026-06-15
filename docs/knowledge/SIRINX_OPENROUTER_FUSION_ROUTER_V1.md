# SIRINX OpenRouter Fusion Router v1

Status: READY LOCAL-ONLY

Stop point: OPENROUTER FUSION ROUTER READY - LOCAL ONLY - NO PROVIDER CALL TAKEN

## Purpose

This gate captures the OpenRouter Fusion Router contract for SIRINX, Hermes, thClaws, and GhostClaw model-council work without calling OpenRouter.

It provides:

- Fusion request preview
- panel model policy with the 8-model OpenRouter limit
- judge model policy
- plugin and server-tool request shapes
- bounded Fusion parameters
- approval evidence for a future one-shot smoke
- thClaws readiness note

It does not read `OPENROUTER_API_KEY`, call OpenRouter, install SDKs, spend credits, start MCP servers, send Telegram/LINE messages, deploy, push, or publish.

## API Surface

- `GET /api/openrouter-fusion-router`
- `POST /api/openrouter-fusion-router/plan/dry-run`

Dry-run output is JSON only. It returns `providerCalled:false`, `secretsRead:false`, `canCallPaidApi:false`, `keyValuePrinted:false`, and `commandExecuted:false`.

## Fusion Contract

Provider: OpenRouter

Endpoint: `https://openrouter.ai/api/v1/chat/completions`

Router model: `openrouter/fusion`

Default analysis panel:

- `~anthropic/claude-opus-latest`
- `~openai/gpt-latest`
- `~google/gemini-pro-latest`
- `deepseek/deepseek-v3.2`
- `~moonshotai/kimi-latest`

Default judge model:

- `~openai/gpt-latest`

Default parameters:

- `max_tool_calls: 8`
- panel count: max `8`
- stream: `false`

Expected judge analysis fields:

- `consensus`
- `contradictions`
- `partial_coverage`
- `unique_insights`
- `blind_spots`

## Supported Request Preview Modes

### Plugin mode

Uses `model: "openrouter/fusion"` and a `plugins` array with `id: "fusion"`.

This is the preferred local preview for thClaws/Hermes routing policy because the router is visible as the selected model.

### Server-tool mode

Uses a normal outer model plus an OpenRouter Fusion server tool:

```json
{
  "type": "openrouter:fusion"
}
```

This preview is useful for clients that expose Fusion as a tool rather than a model/plugin alias.

## thClaws Readiness

Target runtime: thClaws `0.61.0`

Local observation in this work lane: thClaws `0.8.8`.

Result: local SIRINX policy can prepare Fusion Router configs now, but live thClaws Fusion support must not be claimed until thClaws is upgraded and verified in a separate lane.

Next gate:

```text
APPROVE_THCLAWS_0_61_0_UPGRADE_AND_FUSION_DRY_RUN_LOCAL_ONLY
```

## Use Cases

Use Fusion for:

- deep research
- architecture review
- model-council critique
- high-impact product decisions
- safety/risk comparisons
- complex Thai-English planning

Avoid Fusion for:

- short captions
- formatting
- one-file minor edits
- low-risk tactical prompts
- cheap local classification

## Blocked Actions

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

## Source Anchors

- `https://openrouter.ai/docs/guides/routing/routers/fusion-router`
- `https://openrouter.ai/docs/guides/features/plugins/fusion`
- `https://openrouter.ai/docs/guides/features/server-tools/fusion`
- `https://openrouter.ai/openrouter/fusion`
- `https://thclaws.ai/downloads.html`

## Verification

```bash
pnpm openrouter-fusion-router:test
node --check services/dev-control-api/src/openrouter-fusion-router.mjs
node --check services/dev-control-api/src/openrouter-fusion-router.test.mjs
pnpm audit:secrets
git diff --check
```
