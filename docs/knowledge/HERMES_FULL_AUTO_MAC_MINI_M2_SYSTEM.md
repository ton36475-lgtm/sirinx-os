# Hermes Full Auto Mac Mini M2 System

**Mission ID:** GC-HERMES-FULL-AUTO-MAC-MINI-M2-2026-06-30
**Date:** 2026-06-30T03:56:21.378461+00:00
**Host:** Mac mini M2
**Repo:** /Users/sirinx/sirinx-os
**Branch:** staging/godmode-master-os-v2

---

## System Components

### 1. A2A2A Adaptive Sync
- 3 tmux sessions: ghostclaw-hermes, ghostclaw-kob, ghostclaw-a2a-sync
- 18 workers registered (v3.0.0)
- 223+ receipts, 34 smoke test receipts
- Heartbeat: 300s, stale after 900s

### 2. Cronjob System
- 7 schedules defined in hermes-schedule.yaml
- 1 active job: ghostclaw-a2a-heartbeat (every 5m)
- launchd template created (not activated)

### 3. Kanban Board
- GHOSTCLAW/KANBAN.md (5 columns, 12 cards)
- Runtime: tasks.jsonl, task_graph.json, blocked_actions.md

### 4. Obsidian Brain
- 3 notes in _OBSIDIAN_GHOSTCLAW_BRAIN/
- brain_index.json with scan paths

### 5. Sup-Agent Team (12 agents)
- ChiefOfStaff, Scheduler, Kanban_Steward, Obsidian_Curator
- Policy_Guardian, Validator, Receipt_Auditor
- Codex_Bridge, ZCode_Bridge, MCP_Connector
- Dashboard_Watcher, Cost_Guard

### 6. Worker Registry (18 workers)
- Hermes Commander, Router, Planner, Mapper
- Policy_Guardian, File_Lease_Manager, Validator
- Codex_Builder, ZCode_GLM, ZAI_TUI
- Kai_Builder, GLM_Repo_Mapper, DeepSeek_Reasoner
- Opus_Critic, GitHub_Toptrend, EdgeOne_Readiness
- Receipt_Memory, Skill_Discovery

## Safety Invariants

- No push to remote
- No deploy
- No secret access
- No paid provider/model calls
- No model downloads
- No GPU inference
- No customer send
- No Telegram broadcast
- All mutations require: file lease + diff + validation + receipt + checksum

## Action Tiers

- A: Safe local read (auto-execute)
- B: Safe local mutation (auto-execute with evidence)
- C: Risky (dry-run only)
- D: Dangerous (auto-block + simulate)
- X: Prohibited (refuse)
