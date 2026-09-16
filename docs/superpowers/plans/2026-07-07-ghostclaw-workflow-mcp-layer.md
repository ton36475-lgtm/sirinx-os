# GhostClaw Workflow MCP Layer Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task-by-task. This plan is local-safe and does not approve install, login, push, deploy, provider calls, or live LINE traffic.

**Goal:** Add a governed workflow/MCP layer for `P092_LINE_OA_AUTOMATION_UPGRADE` that uses `ai-auto-work` as a process model, `codex-mcp-server` as a Codex review bridge, and `@line/line-bot-mcp-server` as a disabled operator-only LINE tool. Keep production LINE traffic on the existing SIRINX webhook path with dry-run guards.

**Architecture:** Document the Workflow -> Executor -> Reviewer -> LINE Operator -> LINE Production split. Store OpenCode MCP settings as a template only. Enforce that LINE MCP cannot send production messages automatically and that live customer traffic remains gated through `https://www.sirinx.co/api/line/webhook`.

**Tech Stack:** Markdown governance docs, JSON config template, YAML policy, existing local validators. No package install or MCP server execution in this packet.

---

### Task 1: Workflow MCP Architecture

**Files:**
- Create: `docs/architecture/GHOSTCLAW_WORKFLOW_MCP_LAYER_V1.md`

- [ ] **Step 1: Define the layer map**

Document the role of `ai-auto-work`, OpenCode/Claude executor lanes, `codex-mcp-server`, disabled LINE MCP operator tooling, and the SIRINX webhook production path.

- [ ] **Step 2: Define control flow**

Add the required sequence:

```text
Research -> Plan -> Develop -> Review -> Test -> Commit gate
```

Commit remains a separate approval gate. Deploy and live sends remain blocked.

- [ ] **Step 3: Define blocked surfaces**

Explicitly block installs, MCP live startup, provider/model calls, push, deploy, Cloudflare/DNS mutation, secret reads, and live LINE/Telegram/email/customer sends.

### Task 2: OpenCode MCP Template

**Files:**
- Create: `config/opencode.mcp.sirinx.template.json`

- [ ] **Step 1: Add Codex reviewer bridge template**

Add `codex-cli` as an enabled local MCP template that points at `codex-mcp-server`. This is template-only and must not run `npx`.

- [ ] **Step 2: Add disabled LINE operator template**

Add `line-bot` as `enabled: false` with environment placeholders only. Keep `line-bot.broadcast*` and `line-bot.push*` disabled.

- [ ] **Step 3: Validate JSON**

Run `python3 -m json.tool config/opencode.mcp.sirinx.template.json`.

### Task 3: LINE MCP Operator Policy

**Files:**
- Create: `policy/line-mcp-operator-policy.yaml`

- [ ] **Step 1: Define allowed use**

Allow documentation, local dry-run planning, Flex payload preview, rich-menu planning, and manual operator testing after explicit gate only.

- [ ] **Step 2: Define blocked use**

Block LINE broadcast, push, multicast, narrowcast, webhook activation, production customer routing, secret reads/prints, and automatic sends.

- [ ] **Step 3: Define required controls**

Require dry-run mode, env-only credentials, no secret logging, receipts, human approval for live LINE, and the SIRINX webhook as the only production customer path.

### Task 4: P092 Runbook And Receipt

**Files:**
- Create: `docs/runbooks/P092_LINE_OA_AUTOMATION_UPGRADE.md`
- Create: `reports/mission/A2A2A_P092_LINE_OA_AUTOMATION_UPGRADE_WORKFLOW_MCP_LAYER_20260707.md`

- [ ] **Step 1: Add the operator runbook**

Document `/auto-work P092_LINE_OA_AUTOMATION_UPGRADE` with dry-run env locks and validation commands.

- [ ] **Step 2: Add the mission receipt**

Record created files, validation, blocked actions, and next safe gate.

- [ ] **Step 3: Append Obsidian pulse**

Append one concise digest entry with evidence path and next safe action. Do not include secrets or raw logs.

## Self-Review

- Config is template-only and not written to a live OpenCode config.
- LINE MCP is disabled by default and cannot approve production sends.
- Production LINE path remains `https://www.sirinx.co/api/line/webhook`.
- `SIRINX_LINE_MODE=dry-run` and `SIRINX_LINE_AUTO_REPLY_APPROVED=false` remain the required default.
- No install, login, push, deploy, Cloudflare mutation, provider call, secret read/print, or live send is approved by this plan.
