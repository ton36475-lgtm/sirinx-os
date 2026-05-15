# P2 Observability And Audit Trail

Status: implemented locally
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
- Local API audit trail exists at `GET /api/audit-events`.
- Dry-run actions record audit events in local API memory.
- Dashboard renders recent local API audit events.

## Implemented Endpoint

The local control API exposes:

- `GET /api/audit-events`

Audit writes happen inside local API handlers only. There is no public `POST` endpoint for arbitrary audit insertion.

## Implemented Results

The audit trail records:

- `simulated_only`
- `queued_for_approval`
- `blocked_by_kill_switch`
- `invalid_json`
- `unknown_action`

Every recorded dry-run event includes `external_writes: false`.

## Verification

Required checks:

```bash
node --check services/dev-control-api/src/audit-events.mjs
pnpm verify
pnpm dashboard:e2e
```

## Staging Gate

Staging remains blocked until this local in-memory audit trail is upgraded to a reviewed durable local store or approved staging-safe store.
