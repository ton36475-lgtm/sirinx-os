# Part 19 - Hermes Adaptive Command Gateway

Status: local-only dry-run contract
API:

```text
GET /api/hermes-adaptive-command-gateway
POST /api/hermes-adaptive-command-gateway/telegram/dry-run
```

## Role In Gateway Agent

Part 19 sits above the Telegram gateway and below the Hermes/Codex/Antigravity worker lanes. It converts raw Telegram command text into one of three outcomes:

- immediate fast ACK for simple local commands,
- rejected syntax with recommended structured commands,
- queued long-job preview with an approval-gated mission object.

## Why It Exists

The previous slow path made Telegram wait while Hermes or a model interpreted long commands. This gate changes the runtime contract:

```text
Telegram Command
-> Fast ACK
-> Job ID
-> Queue preview
-> Hermes/Codex/Antigravity worker lane after approval only
-> Progress callback preview
```

## Parser Rules

- `/clear` aliases to `/reset`.
- `/kanban` must use `boards list` or `boards switch <slug>`.
- Mission creation and routing are separate operations unless the structured `/hermes mission create --field value` syntax is used.
- Overloaded commands are rejected and replaced with structured recommendations.

## Safety Rules

- No command execution.
- No provider calls.
- No Telegram send.
- No secret reads.
- No package installs.
- No MCP start.
- No deploy, push, or publish.
- No Codex or Antigravity worker start.

## Stop Point

```text
HERMES ADAPTIVE COMMAND GATEWAY V0.2 READY - FAST ACK QUEUE DRY-RUN - WAITING FOR GATEWAY RELOAD APPROVAL
```
