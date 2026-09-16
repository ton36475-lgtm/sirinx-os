# Brainstorm — Hermes Full Auto Mac Mini M2

**Mission ID:** GC-HERMES-FULL-AUTO-MAC-MINI-M2-2026-06-30
**Date:** 2026-06-30T03:56:21.378461+00:00

---

## Components

1. A2A2A Adaptive Sync (envelope schema, heartbeat, file lease)
2. Sup-Agent Team (12 agents with defined roles)
3. Worker Registry (18 workers)
4. Kanban Board (5 columns, rules)
5. Obsidian Brain (3 notes, scan paths, do-not-scan list)
6. Cronjob System (7 schedules, launchd + cron templates)
7. MCP Connector Map
8. Codex/ZCode/Z.ai worker lanes
9. Validation system (JSON, YAML, py_compile, git diff)
10. Local commit gate (no push, no deploy)
11. Safety invariants (no secrets, no paid calls, no model downloads)
12. Final report + archive

## Tier Classification

- Tier A: all read-only inspection
- Tier B: all file creation, kanban, obsidian, scheduler templates
- Tier C: none (no dependency install, no staging deploy)
- Tier D: BLOCKED (push, deploy, paid calls)
- Tier X: BLOCKED (credential theft, bypass, malware)
