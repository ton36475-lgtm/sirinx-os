# SIRINX Ollama Agent Launch Gate - 2026-05-27

Status: implemented local-only

## What This Adds

SIRINXDev now has a deterministic local Agent Launch Gate for the Ollama Launch screen. It inventories the visible launch commands and turns them into a safe manual smoke-test registry.

## Locked Commands

| Agent | Command | Mode |
| --- | --- | --- |
| Claude Code | `ollama launch claude` | manual only |
| Codex App | `ollama launch codex-app` | manual only |
| Hermes Agent | `ollama launch hermes` | manual only, context-gated |
| OpenClaw | `ollama launch openclaw` | manual only |
| OpenCode | `ollama launch opencode` | manual only |
| Codex | `ollama launch codex` | manual only |
| Copilot CLI | `ollama launch copilot` | manual only |
| Droid | `ollama launch droid` | manual only |
| Pi | `ollama launch pi` | manual only |

## Safety Contract

- No API route executes `ollama launch`.
- No dashboard button starts an agent.
- No real MCP, connector activation, paid API, message send, secret read, deploy, push, or publish is allowed.
- Hermes routing remains blocked until context window is at least `64000`.
- Hermes launcher smoke is side-effectful; use direct Hermes status/help checks instead of `ollama launch hermes ... -- --help`.
- The first recommended manual smoke candidates are Codex App and Codex.

## Verification

```bash
pnpm agent-launch-gate:test
pnpm gateway-agent:test
pnpm verify:workspace
pnpm audit:secrets
pnpm check
```

## Stop Point

```text
OLLAMA AGENT LAUNCH GATE READY — LOCAL ONLY — WAITING FOR MANUAL SMOKE APPROVAL
```
