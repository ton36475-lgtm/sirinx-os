# P2 Observability And Audit Trail

Status: plan ready
Date: 2026-05-16
Runtime impact: none

## Purpose

Define the local audit trail needed before staging or production approval.

## Audit Event Schema

```text
event_id:
timestamp:
actor:
source:
action:
target:
risk_level:
approval_status:
kill_switch_status:
external_writes:
result:
evidence:
```

## Events To Record

- Dry-run action requested.
- Kill switch blocked action.
- Approval queue item created.
- Approval queue item approved, rejected, or blocked.
- Release gate evaluated.
- Connector write preflight requested.
- Connector write completed after approval.

## Never Log

- `.env` values.
- API keys.
- Tokens.
- Passwords.
- Private keys.
- Customer private data unless explicitly sanitized.
- Raw chat logs.

## Current Local Evidence

- Dashboard event log exists in the browser UI.
- Control API dry-run responses include `externalWrites: false`.
- Kill switches block risky dry-run actions.
- Approval queue models pending, approved, rejected, and blocked states.

## Next Implementation Step

Add a local in-memory or file-backed audit endpoint only after operator approval:

- `GET /api/audit-events`
- `POST` is not required publicly; audit writes should happen inside local API handlers.

## Staging Gate

Staging remains blocked until audit events are captured outside the transient browser event log.
