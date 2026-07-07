# ClickUp Bridge Sync Policy

Mission ID: `GC-CLICKUP-SINGLE-INBOX-WEEKLY-SYNC-20260630-002`

## Authority

`/Users/sirinx/sirinx-os` is the source of truth. ClickUp is only a project
management mirror for the canonical folder and list IDs recorded in:

`.ghostclaw_runtime/clickup/clickup-list-map.json`

## Default Mode

Default mode is dry-run packet generation. Live create/update is blocked unless
all policy checks pass.

Allowed live operations after gate:

- scan tasks from canonical lists
- create a task inside a canonical list
- update a known task by ClickUp task ID
- add a safe comment to a known task

Blocked operations:

- delete task, list, folder, or doc
- move a task outside folder `901814909496`
- change workspace settings
- invite users
- attach private files
- read or print secrets
- push or deploy
- paid provider/model calls

## Idempotency

Use `GC_SYNC_KEY` inside safe task metadata or description text. Before create,
scan the canonical list for the same key. If found, update only safe fields.
If no duplicate check is available, prepare a local packet only.

## Rate Limit

Limit bridge traffic to 60 requests per minute per token with exponential
backoff on rate-limit responses.
