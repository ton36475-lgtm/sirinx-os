# Hermes Single Inbox Router

Mission ID: `GC-CLICKUP-SINGLE-INBOX-WEEKLY-SYNC-20260630-002`

## Route

```text
Hermes Single Inbox
  -> A2A2A task graph
  -> .ghostclaw_runtime/a2a2a/outbox/codex
  -> .ghostclaw_runtime/a2a2a/outbox/opencode
  -> .ghostclaw_runtime/a2a2a/outbox/zcode
  -> .ghostclaw_runtime/a2a2a/outbox/zai_tui
  -> receipts, validation, evidence
  -> ClickUp mirror packet
```

## Parser Contract

The parser treats any message beginning with `RUN_MISSION:` as a mission
envelope. Slash commands are optional compatibility aliases only.

Required fields:

- `MISSION_NAME`
- `MISSION_ID`
- `REPO_ROOT`
- `MODE`
- `SOURCE_OF_TRUTH`
- `HARD_RULES`
- `WEEKLY_WORKSTREAMS_TO_MIRROR`

The parser must fail closed if the repo root is not `/Users/sirinx/sirinx-os`
or if a requested action includes push, deploy, secret read, secret print,
delete, paid provider/model call, global install, large model download, or
workspace-setting mutation.

## Dispatch Rules

- Hermes may create local packets and receipts.
- Codex may mutate approved local files only after the implementation gate.
- Review workers receive packets but do not mutate without a lease.
- ClickUp packets are generated locally first.
- Live ClickUp create/update is disabled unless live mode and token-presence
  checks pass without printing token values.
