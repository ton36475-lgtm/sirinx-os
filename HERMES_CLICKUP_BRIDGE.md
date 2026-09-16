# Hermes ClickUp Bridge

Mission: `CLICKUP_BRIDGE_SINGLE_INBOX_WEEKLY_SYNC_HERMES_A2A2A`
Mission ID: `GC-CLICKUP-SINGLE-INBOX-WEEKLY-SYNC-20260630-002`
Previous packet mission ID: `GC-CLICKUP-BRIDGE-SYNC-20260630-001`
Repo: `/Users/sirinx/sirinx-os`
Mode: safe local bridge with ClickUp as mirror

## Purpose

Convert a plain `RUN_MISSION:` envelope into the Hermes Single Inbox flow:

```text
Hermes Single Inbox
  -> A2A2A task graph
  -> outbox/codex, outbox/opencode, outbox/zcode, outbox/zai_tui
  -> receipts and validation
  -> ClickUp mirror packets
```

The flow wires local Hermes/GhostClaw Kanban, A2A2A queue, receipts, Obsidian
Brain, cronjob scheduler, Codex lane, OpenCode review lane, and ZCode/Z.ai
review lanes into the existing ClickUp folder:

`GhostClaw Hermes A2A2A Control`

The local repo remains the source of truth. ClickUp is a project-management
mirror only.

## Canonical ClickUp IDs

- Workspace: `90182671966`
- Space: `901810869933`
- Folder: `901814909496`
- Document: `2kzmwqjy-198`

Canonical lists:

- Intake Telegram/Hermes: `901819113973`
- A2A2A Queue Sync: `901819113985`
- Codex Build Lane: `901819113995`
- ZCode/Z.ai Worker Lane: `901819114001`
- Obsidian Brain Memory: `901819114009`
- Kanban Board Automation: `901819114015`
- Cronjob Scheduler: `901819114025`
- Validation Receipts Evidence: `901819114030`

## Local Artifacts

- `.ghostclaw_runtime/hermes/command_aliases/ghostclaw-run.alias.yaml`
- `.ghostclaw_runtime/clickup/clickup-bridge.config.yaml`
- `.ghostclaw_runtime/clickup/clickup-list-map.json`
- `.ghostclaw_runtime/clickup/clickup-sync-policy.yaml`
- `.ghostclaw_runtime/clickup/clickup-sync.receipt.schema.json`
- `.ghostclaw_runtime/clickup/clickup-weekly-workstreams.json`
- `.ghostclaw_runtime/clickup/clickup-sync-dry-run.mjs`
- `.ghostclaw_runtime/clickup/clickup-cron.template`
- `.ghostclaw_runtime/clickup/README_CLICKUP_BRIDGE.md`
- `.ghostclaw_runtime/a2a2a/outbox/codex/GC-CODEX-CLICKUP-BRIDGE-PACKET.md`
- `.ghostclaw_runtime/a2a2a/outbox/opencode/GC-OPENCODE-REVIEW-PACKET.md`
- `.ghostclaw_runtime/a2a2a/outbox/zcode/GC-ZCODE-CLICKUP-REVIEW-PACKET.md`
- `.ghostclaw_runtime/a2a2a/outbox/zai_tui/GC-ZAI-TUI-CLICKUP-PACKET.md`

## Current Local Observations

- Kanban task file contains 12 local task cards.
- `_A2A_QUEUE` counts: inbox 5, outbox 20, working 1, done 8, blocked 0, approvals 4.
- `.ghostclaw_runtime/a2a2a` counts: inbox 146, outbox 61, receipt 10, receipts 383, gates 20, blocked 1, evidence 2.
- `GHOSTCLAW/KANBAN.md` has TODO, IN_PROGRESS, BLOCKED, REVIEW, and DONE sections.
- `HERMES_CRONJOB_SYSTEM.md` defines seven schedule lanes and marks external network calls and secret access blocked.

## Safe Command

```bash
cd /Users/sirinx/sirinx-os
node .ghostclaw_runtime/clickup/clickup-sync-dry-run.mjs
```

This generates a local ClickUp mirror packet and receipt only. It does not call
the ClickUp API.

The current dry-run generator still emits the previous packet mission ID until
the executable bridge script lane is separately approved. The active policy and
worker packets use `GC-CLICKUP-SINGLE-INBOX-WEEKLY-SYNC-20260630-002`.

## Generated Dry-Run Evidence

Latest generated local packet from this run:

`.ghostclaw_runtime/clickup/outbox/clickup-sync-packet-20260630T083819Z.json`

Latest generated local receipt from this run:

`.ghostclaw_runtime/clickup/receipts/clickup-sync-receipt-20260630T083819Z.json`

The packet contains 12 planned task mirror actions across six canonical ClickUp
lists. `live_clickup_mutation` is `false`.

## Live Sync Gate

Before live ClickUp create/update:

1. confirm the target list ID is one of the canonical list IDs above
2. confirm the payload contains no secrets or private file attachments
3. confirm duplicate detection or a known ClickUp task ID exists
4. write a local packet and receipt first
5. create/update tasks only; do not delete or move objects

Blocked actions:

- delete ClickUp task/list/folder/doc
- move objects outside folder `901814909496`
- change workspace settings
- invite users
- attach private files
- read or print secrets
- push
- deploy
- production mutation

## Telegram Commander Draft

```text
MISSION:
CLICKUP_BRIDGE_SYNC_HERMES_A2A2A_KANBAN

STATUS:
LOCAL_PACKET_READY

SOURCE OF TRUTH:
/Users/sirinx/sirinx-os

CLICKUP:
Mirror only. Canonical folder and list IDs are recorded.

NEXT:
Review generated packet under .ghostclaw_runtime/clickup/outbox before any live
ClickUp create/update.

BLOCKS:
No slash-command dependency, no delete, no move outside folder, no secret
read/print, no push, no deploy, no paid provider/model call.
```
