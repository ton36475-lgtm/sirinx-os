# Hermes Kanban System

**Date:** 2026-06-30

---

## Board

**File:** GHOSTCLAW/KANBAN.md
**Runtime:** .ghostclaw_runtime/kanban/tasks.jsonl
**Graph:** .ghostclaw_runtime/kanban/task_graph.json
**Blocked:** .ghostclaw_runtime/kanban/blocked_actions.md

## Columns

1. TODO — new mission cards
2. IN_PROGRESS — active work with receipt links
3. BLOCKED — blocked_reason + safe_alternative + next_safe_action
4. REVIEW — pending validation
5. DONE — validation evidence attached

## Rules

- Every mission packet creates/updates a Kanban card
- Every mutation links to receipt_id
- BLOCKED cards include: blocked_reason, safe_alternative, next_safe_action
- DONE cards include: validation evidence

## Current Cards

- 12 total cards: 9 DONE, 3 IN_PROGRESS, 0 BLOCKED
