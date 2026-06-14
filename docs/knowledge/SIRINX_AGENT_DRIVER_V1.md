# SIRINX Agent Driver v1

Date: 2026-05-27
Status: local-only smoke driver ready
Scope: Codex, Claude Code, Hermes direct checks, and blocked Ollama agent launch lanes

## Purpose

Agent Driver v1 is the safety layer above the Ollama Agent Launch Gate. It turns the Launch Gate registry and manual smoke evidence into deterministic local status, dry-run smoke packets, dashboard visibility, and a strict no-real-agent-work boundary.

## Local API

```text
GET /api/agent-driver
POST /api/agent-driver/smoke/dry-run
```

Both routes return JSON only. The dry-run route does not execute shell commands and does not write evidence from the API. It returns the local evidence packet that an operator can record after a separately approved manual smoke.

## Driver Classifications

| Agent | Classification | Approved read-only smoke |
| --- | --- | --- |
| Codex | passed | `ollama launch codex --model qwen3.6:latest -- --help` |
| Claude Code | passed | `ollama launch claude --model qwen3.6:latest -- --help` |
| Hermes Agent | side_effectful | `hermes --version`, `hermes status`, `hermes --help` |
| Codex App | missing | no automatic launch |
| OpenClaw | needs_install | no install attempted |
| OpenCode | needs_install | no install attempted |
| Copilot CLI | needs_install | no install or auth expansion attempted |
| Droid | needs_install | no install attempted |
| Pi | needs_install | no install attempted |

Hermes remains `side_effectful` for the Ollama launcher because `ollama launch hermes ... -- --help` can refresh or restart the local Hermes messaging gateway. Future smoke checks for Hermes must use direct `hermes --version`, `hermes status`, and `hermes --help` only.

## Blocked Work

Agent Driver v1 blocks:

- file edits by agents
- MCP server starts
- package installs
- message sends
- deploys
- git pushes
- publishes/uploads/submissions
- external connector activation
- paid API calls
- secret reads or token printing
- real agent work
- automatic Ollama launch execution

## Next Driving Order

```text
codex -> claude-code -> hermes-agent direct status/version/help only
```

## Evidence Rule

Evidence is local-only under `docs/knowledge`. API dry-runs return evidence packets with `didWriteFromApi: false`; any real evidence update must be a local file change reviewed in the workspace.

## Stop Point

```text
AGENT DRIVER READY — LOCAL ONLY — WAITING FOR MANUAL SMOKE APPROVAL
```
