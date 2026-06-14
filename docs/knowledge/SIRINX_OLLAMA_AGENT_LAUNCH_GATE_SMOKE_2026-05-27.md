# SIRINX Ollama Agent Launch Gate Smoke Evidence - 2026-05-27

Status: local-only manual smoke completed

## Approval Scope

The user approved a narrow manual smoke for the Ollama Agent Launch Gate. This approval did not authorize deploy, push, publish, connector activation, real MCP execution, paid API calls, secret reads, customer messages, production writes, or autonomous agent work.

## Preflight Evidence

- Ollama API base checked: `http://127.0.0.1:11434/api`
- Local model inventory endpoint checked: `GET /api/tags`
- Local models observed: 9
- Launch Gate API checked: `GET /api/agent-launch-gate`
- Launch Gate status: `local-launch-gate-ready`
- Launch Gate auto executable agents: 0
- Hermes context gate: `blocked-context-too-small`

## Manual Smoke Attempts

| Command | Result | Notes |
| --- | --- | --- |
| `ollama launch codex-app` | failed | Launcher reported Codex App is not installed. No install was attempted. |
| `ollama launch codex` | failed safe | Launcher required interactive model selection. |
| `ollama launch codex --model qwen3.6:latest -- --help` | passed | Printed Codex CLI help and exited with code 0. No prompt, file edit, MCP, connector, external write, or repo work was executed. |

## Second Approval Smoke

The user approved a second manual local smoke pass. No install, deploy, push, publish, connector activation, real MCP run, paid API call, secret read, customer message, production write, or repo work was authorized.

| Command shape | Result | Notes |
| --- | --- | --- |
| `ollama launch <integration> --help` | passed for listed integrations | This only printed the Ollama launcher help and did not verify each integration runtime. |
| `ollama launch claude --model qwen3.6:latest -- --help` | passed | Printed Claude CLI help and exited. |
| `ollama launch hermes --model qwen3.6:latest -- --help` | passed with local side effect | Printed Hermes help, but the launcher first refreshed/restarted the local Hermes messaging gateway. Do not use this command as a no-side-effect smoke check. |
| `ollama launch openclaw --model qwen3.6:latest -- --help` | failed safe | OpenClaw is not installed and requires confirmation to install. No install was attempted. |
| `ollama launch opencode --model qwen3.6:latest -- --help` | failed safe | opencode is not installed. No install was attempted. |
| `ollama launch codex --model qwen3.6:latest -- --help` | passed | Printed Codex CLI help and exited. |
| `ollama launch copilot --model qwen3.6:latest -- --help` | failed safe | Copilot CLI is not installed. No install was attempted. |
| `ollama launch droid --model qwen3.6:latest -- --help` | failed safe | Droid is not installed. No install was attempted. |
| `ollama launch pi --model qwen3.6:latest -- --help` | failed safe | Pi is not installed and requires confirmation to install. No install was attempted. |

## Updated Smoke Rule

Hermes launcher smoke is not side-effect-free. For Hermes, prefer direct read-only commands such as `hermes --help`, `hermes --version`, or approved status checks instead of `ollama launch hermes ... -- --help`.

## Decision

Codex CLI and Claude CLI are the first confirmed smoke-pass paths for the Ollama Launch Gate. Codex App remains blocked until installed by the operator. Hermes remains blocked for routing until a profile/model with context window at least `64000` is reviewed, and Hermes launcher smoke is marked as side-effectful because it restarts the local messaging gateway.

## Stop Point

```text
OLLAMA AGENT LAUNCH GATE SMOKE COMPLETE — LOCAL ONLY — WAITING FOR NEXT APPROVAL
```
