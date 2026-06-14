# Agent Driver

Status: local-only smoke driver

## Purpose

Agent Driver sits above the Ollama Agent Launch Gate. It does not launch agents. It classifies local smoke readiness, returns approved read-only smoke commands, and blocks all real agent work unless a separate approval creates a non-dry-run path.

## Local API

```text
GET /api/agent-driver
POST /api/agent-driver/smoke/dry-run
```

## Classification Rules

- `passed`: a read-only help smoke has already passed.
- `missing`: the app/integration is not installed.
- `side_effectful`: the launcher path has observable side effects and is not safe for Driver execution.
- `blocked`: the requested goal includes file edits, MCP start, install, message send, deploy, push, or publish.
- `needs_install`: the target cannot be tested without an install or external auth expansion.

## Current Driver Matrix

```text
codex: passed
claude-code: passed
hermes-agent: side_effectful for ollama launch hermes; direct hermes checks only
codex-app: missing
openclaw: needs_install
opencode: needs_install
copilot-cli: needs_install
droid: needs_install
pi: needs_install
```

## Safety Contract

- `commandExecuted` must remain `false`.
- `canEditFiles` must remain `false`.
- `canStartMcp` must remain `false`.
- `canInstallPackages` must remain `false`.
- `canSendMessages` must remain `false`.
- `canDeploy` must remain `false`.
- Dashboard panels must not include launch or execute buttons.

## Verification

```bash
pnpm agent-driver:test
pnpm agent-launch-gate:test
pnpm gateway-agent:test
pnpm dashboard:e2e
pnpm audit:secrets
```

## Stop Point

```text
AGENT DRIVER READY — LOCAL ONLY — WAITING FOR MANUAL SMOKE APPROVAL
```
