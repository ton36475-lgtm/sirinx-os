# Final Report: ClickUp Bridge Single Inbox Weekly Sync

Mission ID: `GC-CLICKUP-SINGLE-INBOX-WEEKLY-SYNC-20260630-002`
Repo: `/Users/sirinx/sirinx-os`
Mode: local-safe dry-run

## Outcome

The `/ghostclaw-run` slash-command dependency was replaced with a plain-message
Hermes Single Inbox contract. The local file-bus route now has specs, worker
packets, ClickUp mirror policy, weekly workstream mapping, and validation
evidence.

ClickUp is still a mirror only. The repo remains source of truth.

## Created Or Updated

- command alias proposal for future `/ghostclaw-run` compatibility
- Hermes command compatibility doc
- Hermes Single Inbox router doc
- ClickUp bridge sync policy doc
- Codex sidebar distribution model
- computer-use last-mile policy
- weekly ClickUp workstream map
- A2A2A `queue`, `locks`, and `archive` runtime markers
- Codex, OpenCode, ZCode, and Z.ai worker packets
- observe evidence JSON
- validation report

## Dry-Run Evidence

Local dry-run packet:

`.ghostclaw_runtime/clickup/outbox/clickup-sync-packet-20260630T083819Z.json`

Local dry-run receipt:

`.ghostclaw_runtime/clickup/receipts/clickup-sync-receipt-20260630T083819Z.json`

The dry-run planned 12 mirror actions and did not call ClickUp.

## Validation Evidence

Validation summary is recorded in:

`VALIDATION_REPORT_CLICKUP_BRIDGE_SYNC.md`

Validated:

- JSON artifacts parse.
- YAML artifacts parse.
- existing dry-run generator syntax parses.
- `git diff --check` passes.
- scoped bridge files do not contain a token-like `pk_` value.

## Push Gate Packet

Status: prepared only, not executed.

Required before any future push:

1. Confirm the exact commit scope in a dirty worktree.
2. Confirm whether ignored runtime files should be staged or left as evidence only.
3. Re-run validation after any executable bridge script changes.
4. Obtain a fresh push gate for the current branch and remote target.

Push remains blocked in this mission.

## Implementation Gate Packet

Deferred files until explicit `APPROVE_IMPLEMENTATION`:

- `scripts/ghostclaw/clickup_sync_safe.py`
- `scripts/ghostclaw/clickup_sync_dry_run.py`
- `scripts/ghostclaw/build_clickup_packets_from_kanban.py`
- updates to executable `.ghostclaw_runtime/clickup/clickup-sync-dry-run.mjs`

Reason: those are executable bridge implementation changes, not only planning
docs or runtime packets.

## Blocked Actions

- no live ClickUp API mutation
- no secret read or print
- no ClickUp delete or move
- no invite or workspace settings change
- no private file attachment
- no paid provider/model call
- no global install
- no push
- no deploy
