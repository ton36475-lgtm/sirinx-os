# Agent Launch Gate

Status: local-only manual command registry

## Purpose

The Agent Launch Gate inventories the Ollama Launch screen without starting agents. It records the available `ollama launch ...` commands, classifies each agent, and returns the next safe manual smoke step.

## Local API

```text
GET /api/agent-launch-gate
POST /api/agent-launch-gate/plan/dry-run
```

Both routes return JSON only. They do not execute commands, start per-profile gateways, read secrets, call paid APIs, activate MCP, or connect external services.

## Registered Agents

```text
ollama launch claude
ollama launch codex-app
ollama launch hermes
ollama launch openclaw
ollama launch opencode
ollama launch codex
ollama launch copilot
ollama launch droid
ollama launch pi
```

## Runtime Rules

- Every agent is `manual_only`.
- `autoExecute`, `canExecuteNow`, and `canLaunchAutomatically` must remain `false`.
- Hermes routing is blocked when the observed context window is below `64000`.
- Hermes launcher smoke is not side-effect-free: `ollama launch hermes ... -- --help` can refresh or restart the local Hermes messaging gateway. Use direct Hermes status/help checks for no-side-effect smoke.
- Requested `:cloud` model overrides are dry-run only and blocked until paid API approval, provider auth review, and Hermes launcher side effects are approved.
- Codex App and Codex are the first recommended manual smoke candidates.
- The dashboard may display commands, badges, and health gates; it must not launch commands.

## Stop Point

```text
OLLAMA AGENT LAUNCH GATE READY — LOCAL ONLY — WAITING FOR MANUAL SMOKE APPROVAL
```
