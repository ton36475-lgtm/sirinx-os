# Skills Registry — SIRINX OS Unified

## Overview

This registry is **path-backed** — every skill entry maps to a real directory on disk with a `SKILL.md`. The registry **does not authorize external writes** or any Tier C action.

- JSON registry: `config/unified-skills-registry.json`
- Generated: 2026-07-17

## Unified Skill Counts

| Agent | Skills Installed |
|-------|-----------------|
| Hermes (solis) | 156 (143 native + 13 synced from Codex) |
| Codex | 59 |
| Claude Code | 15 |
| OpenCode | 7 |
| GhostClaw Core | 7 (shared across ALL agents) |
| **Total Unique** | **188** |

## GhostClaw Core (7 — installed to Hermes, Codex, Claude, OpenCode, Repo, GHOSTCLAW)

| Skill | Purpose | Installed To |
|-------|---------|--------------|
| ghostclaw-master-orchestrator | Master control of all subsystems | All 5 systems |
| autonomous-loop-engineering | Auto Tier A/B execution, cron 5m | All 5 systems |
| ghostclaw-engineering-loop | Full pipeline P000A→P010 | All 5 systems |
| ghostclaw-governance-contracts | Tier/Capability/Lease/Approval/Receipt | All 5 systems |
| ghostclaw-agent-delegation | Parallel agent dispatch pattern | All 5 systems |
| ghostclaw-integration-onboarding | External tool integration checklist | All 5 systems |
| thaimart-k15-workflow | K01-K15 + ThaiMart spec + QA gates | All 5 systems |

## Synced Skills (13 — Codex → Hermes)

frontend-design, brand-guidelines, canvas-design, docx, pdf, pptx, xlsx, web-artifacts-builder, webapp-testing, skill-creator, cloudflare-web-perf, browserbase-cli, coderabbitai-autofix

## New Skills (1 — created this session)

| Skill | Purpose |
|-------|---------|
| telegram-approval-workflow | Unified approval routing for Telegram command center |

## Agent Roles (AGENT_ROSTER.md)
- **Hermes**: Commander — orchestrate, dispatch, approve Tier A/B
- **Codex**: Builder — write code, fix bugs, run tests
- **Claude Code**: Architect — design, review architecture
- **OpenCode**: Reviewer — security audit, code review
- **Auto-Loop**: Autonomous executor — Tier A/B every 5m

## Safety Notice

This registry is path-backed and read-only. It does not authorize external writes, does not grant Tier C permissions, and does not bypass the human gate.
