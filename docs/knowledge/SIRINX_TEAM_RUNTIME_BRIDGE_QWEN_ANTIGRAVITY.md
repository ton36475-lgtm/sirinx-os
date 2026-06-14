# SIRINX Team Runtime Bridge: Qwen + Antigravity

Status: READY LOCAL-ONLY

Stop point: TEAM RUNTIME BRIDGE READY - LOCAL ONLY - WAITING FOR MODEL ROUTING APPROVAL

## Purpose

This bridge connects the SIRINX AI Team Pairing contract to three runtime candidates without activating them:

- Hermes Agent team routing
- Qwen 3.7 Max through OpenRouter
- Antigravity CLI watch lane

It is a planning, evidence, and approval surface only. It does not start agents, install CLIs, read secrets, call providers, start MCP servers, send messages, push, deploy, or publish.

## API Surface

- `GET /api/team-runtime-bridge`
- `POST /api/team-runtime-bridge/plan/dry-run`

The dry-run endpoint returns JSON only and never executes shell commands or provider calls.

## Qwen 3.7 Max Lane

Provider: OpenRouter

Model id: `qwen/qwen3.7-max`

Mode: manual approval lane

Use:

- large-context code review
- synthesis across local evidence packets
- team-routing planning
- approval packet drafting

Blocked:

- reading `OPENROUTER_API_KEY`
- printing secrets
- calling OpenRouter
- spending paid API credits
- using Qwen output as production authority without review

Adapter gate:

- `GET /api/openrouter-qwen-adapter`
- `POST /api/openrouter-qwen-adapter/plan/dry-run`
- evidence: `docs/knowledge/SIRINX_OPENROUTER_QWEN_ADAPTER_V1.md`
- status is summarized under `/api/team-runtime-bridge` as `openRouterQwenAdapter`

Source verification:

- OpenRouter Qwen API page lists `qwen/qwen3.7-max`
- OpenRouter marks it as a text input/output model with a 1M context window
- Pricing must be rechecked before any paid call

## Hermes Team Lane

Mode: manual only

Rule:

Hermes team routing stays blocked until the active Hermes model context window is at least 64000.

Current default contract value:

- observed context: 8192
- required context: 64000

Allowed now:

- local planning
- status evidence
- manual smoke packet drafting

Blocked now:

- `hermes --tui` as automatic team router
- per-profile gateway start
- MCP startup
- customer messaging

## Antigravity CLI Lane

Mode: watch only

Antigravity CLI is treated as a source-required runtime candidate, not an active tool.

Allowed now:

- document official docs
- map command surface
- create migration watch notes
- run Repo Intake Gate against install sources

Blocked now:

- `brew install --cask antigravity`
- CLI launch
- plugin/MCP activation
- repo mutation by Antigravity
- automatic migration from Gemini CLI

## A2A2A Contract

Handshake:

1. goal
2. role-map
3. model-lane
4. dry-run
5. evidence
6. approval
7. manual-activation

Evidence path:

`docs/knowledge/SIRINX_TEAM_RUNTIME_BRIDGE_QWEN_ANTIGRAVITY.md`

## Blocked Actions

- deploy
- push
- publish
- external connector activation
- real MCP execution
- paid API call
- secret read or print
- customer message send
- production database write
- Telegram send
- LINE send
- package install
- Antigravity CLI auto-run
- OpenRouter provider call
- Hermes team auto-start

## Verification

Commands:

```bash
pnpm team-runtime-bridge:test
pnpm ai-team-pairing:test
pnpm check
pnpm audit:secrets
git diff --check
```

Expected:

- Qwen lane reports `qwen/qwen3.7-max`
- provider call is false
- command execution is false
- secret read is false
- Antigravity execution is false
- Hermes team routing is blocked until 64k context
