# GhostClaw Layered Build API Contract

Mission ID: `GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001`

This document freezes the read-only API contract before any route handler,
client wiring, frontend hook, component, or page work begins.

## Route

- Method: `GET`
- Path: `/api/ghostclaw/layered-build/status`
- Purpose: expose local-safe layered build status for dashboards and validators.
- Mutation: none.

## Query

| Field | Type | Required | Default | Notes |
|---|---|---:|---|---|
| `include_receipts` | boolean | no | `false` | May include receipt paths only, never receipt contents. |
| `layer` | string | no | none | Optional filter for one known layer id. |

## Success Response

Status: `200`

Required fields:

- `mission_id`: string
- `mission_name`: string
- `mode`: string
- `current_packet`: object with `packet_id`, `layer`, `status`, `active_file_lease`, and `packet_receipt`
- `phase_status`: object keyed by phase id
- `next_packet_gate`: object with `next_packet_id`, `opened`, and `reason`
- `blocked_actions`: string array
- `receipts`: array of `{ packet_id, path, status }`
- `updated_at`: ISO-8601 timestamp
- `local_only`: must be `true`

## Error Shape

All errors use this body:

```json
{
  "error": {
    "code": "POLICY_BLOCKED",
    "message": "Human-readable local-safe error.",
    "details": {},
    "request_id": null
  }
}
```

Codes:

- `INVALID_QUERY`
- `STATUS_UNAVAILABLE`
- `POLICY_BLOCKED`
- `CONTRACT_VIOLATION`

## Safety Rules

- Do not expose secret values, environment values, private customer data, or raw logs.
- Do not trigger provider calls, installs, deploys, migrations, or git push.
- Receipt references are paths only; reading full receipt contents remains a separate local action.
- `local_only` must stay `true`.
- Route implementation remains blocked until the P04 receipt and review gate pass.

## Mock Response

The canonical mock lives at:

`.ghostclaw_runtime/api_contracts/ghostclaw-layered-build.contract.json`
