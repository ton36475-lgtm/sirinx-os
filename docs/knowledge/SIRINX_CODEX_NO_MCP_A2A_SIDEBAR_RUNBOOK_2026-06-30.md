# SIRINX Codex No-MCP A2A Sidebar Runbook

Date: 2026-06-30
Status: local-safe run path, not a replacement for MCP auth refresh
Repo: `/Users/sirinx/sirinx-os`

## Why This Exists

The current Codex MCP list shows Figma, Linear, and Notion enabled but not logged in. That can slow or block sidebar work when the goal only needs local Codex, Hermes, KOB, opencode, and A2A file-bus coordination.

This runbook gives a no-MCP local Codex path without editing the real Codex config and without reading or refreshing auth tokens.

## Current Decision

Use an isolated `CODEX_HOME` for local A2A work when MCP auth is expired:

```bash
scripts/codex_no_mcp_a2a_sidebar.sh --probe
scripts/codex_no_mcp_a2a_sidebar.sh --print-launch
```

The probe command writes:

```text
.ghostclaw_runtime/a2a2a/state/codex-no-mcp-sidebar-probe.json
.ghostclaw_runtime/a2a2a/state/codex-no-mcp-mcp-list.txt
.ghostclaw_runtime/a2a2a/logs/codex-no-mcp-sidebar.log
```

Success means the isolated `CODEX_HOME` reports:

```text
No MCP servers configured yet.
```

## Launch Shape

The launch command printed by the helper is:

```bash
CODEX_HOME="/Users/sirinx/sirinx-os/.ghostclaw_runtime/codex-no-mcp-home" codex --cd "/Users/sirinx/sirinx-os" --sandbox danger-full-access --ask-for-approval never --no-alt-screen "/ghostclaw-a2a-sync-start local_safe_autonomous codex_sidebar_runtime no_mcp"
```

Use this as a local CLI/sidebar lane only. It does not fix the current desktop app thread's MCP auth state.

## Safety Boundary

Allowed:

- inspect repo state
- run local A2A probe helpers
- write `.ghostclaw_runtime/a2a2a` receipts, state, and logs
- run local smoke tests
- keep external repo intake in quarantine

Blocked:

- reading or printing auth tokens
- refreshing MCP OAuth without explicit user action
- package install, `npx`, `bunx`, postinstall execution
- global OpenCode plugin writes
- provider/model calls
- deploy, push, cloud mutation, customer send, Telegram live send
- claiming Hermes/KOB are real authenticated agents from probe receipts alone

## Relation To External Repo Intake

The two requested repos remain quarantined:

- `.ghostclaw_runtime/a2a2a/external_repos/oh-my-opencode-lite`
- `.ghostclaw_runtime/a2a2a/external_repos/Agent-Blackbox`

Before any install, use:

```text
docs/knowledge/GHOSTCLAW_EXTERNAL_REPO_INSTALL_RISK_REVIEW_20260630.md
```

and create a gate-specific approval packet with exact command, working directory, expected writes, telemetry settings, rollback plan, and stop conditions.

## Evidence

- Current A2A receipt: `.ghostclaw_runtime/a2a2a/receipts/a2a_sync_start_20260630T000010_126013Z.json`
- No-MCP probe state: `.ghostclaw_runtime/a2a2a/state/codex-no-mcp-sidebar-probe.json`
- Probe helper: `scripts/codex_no_mcp_a2a_sidebar.sh`
- A2A probe runner: `scripts/ghostclaw_a2a_sync_probe.py`

## Next Safe Action

Run the no-MCP probe, then either use the printed command for local Codex-only sidebar work or separately refresh Linear, Notion, and Figma MCP auth through Codex MCP login flows.
