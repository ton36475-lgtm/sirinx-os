# Hermes Command Compatibility

Mission ID: `GC-CLICKUP-SINGLE-INBOX-WEEKLY-SYNC-20260630-002`

## Problem

Hermes terminal did not register `/ghostclaw-run`, so the terminal returned an
unknown command result. That is a compatibility problem, not a mission-plan
failure.

## Decision

Use a plain-message mission envelope as the canonical control-plane input:

```text
RUN_MISSION:
MISSION_NAME: CLICKUP_BRIDGE_SINGLE_INBOX_WEEKLY_SYNC_HERMES_A2A2A
```

The `/ghostclaw-run` name is retained only as a proposed future alias at:

`.ghostclaw_runtime/hermes/command_aliases/ghostclaw-run.alias.yaml`

## Guardrails

- Do not require slash-command support.
- Do not ask the operator to paste prompts into every sidebar.
- Hermes routes work by local A2A2A outbox packets.
- Codex is the primary mutating builder after approval gates.
- OpenCode, ZCode, and Z.ai remain review-only until lease and policy gates open.
- ClickUp is a mirror only; the repo remains source of truth.
- No push, deploy, paid provider/model call, secret read, or secret print.
