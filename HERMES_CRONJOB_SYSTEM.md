# Hermes Cronjob System

**Date:** 2026-06-30
**Host:** Mac mini M2

---

## Defined Schedules (7)

These are project-local scheduler definitions and templates. They are not
installed into launchd or crontab by this document.

| Schedule | Interval | Action | Tier | Deliver |
|---|---|---|---|---|
| a2a2a_heartbeat | every 5m | Check worker heartbeats, stale tasks, lock expiry | A_SAFE | local |
| queue_reconcile | every 15m | Reconcile inbox/outbox/status/receipts | A_SAFE | local |
| kanban_sync | every 30m | Sync runtime tasks into KANBAN.md and Obsidian | B_SAFE | local |
| obsidian_brain_sync | every 60m | Update brain index, memory map, receipt index | B_SAFE | local |
| night_watch | every 12h | Repo health, queue health, validation drift | A_SAFE | local report draft |
| morning_report | 08:00 | Daily Hermes report for commander | B_SAFE | local report draft |
| archive_closeout | 23:30 | Archive complete receipts, compact status | B_SAFE | local |

## Template Job

- Job ID: template-only
- Name: ghostclaw-a2a-heartbeat
- Schedule: 5m
- Script: scripts/ghostclaw/hermes_project_scheduler.py --task a2a2a_heartbeat --write-status
- Mode: local status only, no live Telegram/customer send

## Safety

- Templates only — launchd NOT activated until validator passes
- No external network calls
- No secret access
- No live Telegram delivery; reports remain local drafts until a separate exact gate is granted
