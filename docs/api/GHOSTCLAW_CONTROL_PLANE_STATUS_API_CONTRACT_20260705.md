# GhostClaw Control Plane Status API Contract

Packet: `P103_API_CONTRACT_FOR_CONTROL_PLANE_STATUS`
Date: 2026-07-05
Mode: contract-first, local-safe, no handler implementation

## 1. Purpose

This contract defines the read-only response shape for the next GhostClaw control-plane dashboard API. It is intentionally created before route handlers so Hermes, Codex, OpenCode, Validator, and the dashboard can agree on data shape without widening into runtime execution.

The API aggregates local-safe status for:

- projects
- missions
- packets
- approval gates
- receipts
- dashboard summary
- safety guardrails

## 2. Route

| Field | Value |
|---|---|
| Method | `GET` |
| Path | `/api/ghostclaw/control-plane/status` |
| Mutation | none |
| Default mode | read-only local status |
| Source of truth | repo files, runtime artifacts, receipts, future DB index |
| Live execution | forbidden |

## 3. Query Parameters

| Query | Type | Required | Default | Notes |
|---|---:|---:|---|---|
| `project` | string | no | all | Filter by project slug such as `sirinx-core`, `ghostclaw`, `sirinx-co`, `agm-autoflow` |
| `include_receipts` | boolean | no | `false` | Include receipt metadata only, never raw receipt content |
| `include_paths` | boolean | no | `true` | Return local artifact paths; safe because no secret values are included |
| `limit` | integer | no | `20` | Limit packet/receipt rows |

## 4. Success Response

Status: `200`

Canonical schema:

- `/Users/sirinx/sirinx-os/schemas/ghostclaw/control-plane-status-response.schema.json`

Canonical example:

- `/Users/sirinx/sirinx-os/docs/api/examples/ghostclaw-control-plane-status-response.example.json`

Top-level fields:

| Field | Type | Meaning |
|---|---|---|
| `contract_id` | string | stable contract id |
| `status` | string | aggregate API status |
| `mode` | string | must be `read_only_control_plane_status` |
| `dry_run` | boolean | must be `true` |
| `live_execution` | boolean | must be `false` |
| `projects` | array | project registry summary |
| `missions` | array | active/recent mission summaries |
| `packets` | array | task packet summaries |
| `approval_gates` | array | exact gate summaries |
| `receipts` | array | receipt metadata only |
| `dashboard` | object | dashboard counters and next action |
| `guardrails` | object | blocked live action flags |
| `updated_at` | string | ISO timestamp |

## 5. Safety Invariants

Every valid response must satisfy:

```text
dry_run=true
live_execution=false
guardrails.live_telegram_send=false
guardrails.provider_call=false
guardrails.secret_read=false
guardrails.push=false
guardrails.deploy=false
guardrails.cloudflare_r2_mutation=false
```

Receipt rows must expose metadata only:

```json
{
  "receipt_id": "receipt-p102",
  "status": "written",
  "artifact_path": "reports/mission/A2A2A_P102_DATABASE_SCHEMA_PROPOSAL_20260705.md",
  "artifact_sha256": null,
  "redaction_status": "redacted_or_no_sensitive_data"
}
```

Forbidden response content:

- secret values
- raw `.env` contents
- API keys, tokens, private keys, browser cookies
- raw customer messages
- raw large logs
- provider request/response payloads

## 6. Error Shape

All error responses use the same envelope:

```json
{
  "error": {
    "code": "STATUS_UNAVAILABLE",
    "message": "Human-readable local-safe error.",
    "details": {},
    "request_id": null
  }
}
```

Allowed codes:

- `INVALID_QUERY`
- `STATUS_UNAVAILABLE`
- `POLICY_BLOCKED`
- `CONTRACT_VIOLATION`
- `SOURCE_NOT_READY`

## 7. Dashboard Mapping

| Dashboard widget | Response source |
|---|---|
| Active Projects | `projects[]` |
| Priority Map | `missions[].priority` and `packets[].lane` |
| Next Actions | `dashboard.next_safe_action` |
| Approval Queue | `approval_gates[]` |
| Receipt Trail | `receipts[]` |
| A2A2A Status | `packets[]`, `dashboard.active_packet_id` |
| Security Warnings | `dashboard.warnings[]`, `guardrails` |

## 8. Implementation Gate

This packet is contract-only. The next implementation gate must not skip directly to deploy or live runtime.

Next safe packet:

```text
P104_CONTROL_PLANE_STATUS_HANDLER_LOCAL_FIXTURE_ONLY
```

Allowed in P104:

- implement local route/function using fixture or file-backed read-only data
- add focused unit tests
- no DB migration
- no live worker execution
- no Telegram send
- no provider/model call
- no deploy/cloud mutation
