# SIRINX Hermes Desktop Safe Config

Date: 2026-05-27

Scope: Local Hermes Desktop / Hermes Agent host configuration for SIRINXDev.

## Applied

- Confirmed Hermes Desktop is in Local mode.
- Disabled anonymous usage analytics in the Hermes Desktop UI.
- Backed up host config before editing: `/Users/sirinx/.hermes/config.yaml.bak.codex-20260527_210307`.
- Set OpenRouter/Qwen runtime context gate to `64000`.
- Set `agent.max_turns` to `60`.
- Set `compression.threshold` to `0.15`.
- Set `session_reset.mode` to `context_only`.
- Set `session_reset.idle_minutes` to `60`.
- Disabled lazy installs.
- Set LSP install strategy to `manual`.
- Disabled Kanban gateway auto-dispatch and auto-decompose.
- Disabled the local `sirinx-files` MCP server until explicit MCP approval.
- Disabled external `google_meet` and `spotify` plugins.
- Disabled Bitwarden auto-install.
- Added Hermes-discoverable skill: `/Users/sirinx/.agents/skills/sirinx-spec-first-swarm/SKILL.md`.
- Updated `/Users/sirinx/.agents/skills/agent-team-orchestration/SKILL.md` to prefer the SIRINX Spec-First Swarm lane.

## Not Applied

- No gateway restart.
- No agent dispatch.
- No package install.
- No provider call.
- No MCP start.
- No external connector activation.
- No message send.
- No deploy, push, or publish.

## Active Stop Point

`HERMES SPEC-FIRST SWARM READY - LIVE LOCAL STATE - WAITING FOR APPROVE_IMPLEMENTATION`
