# Thaimart Automation Worker And Gate Plan

Status: local specification
Date: 2026-07-09
Mode: no execution in this phase

## Current Position

The repo currently has a local seed script and approval/readiness receipts, but
no dedicated Thaimart export worker command was found during focused discovery.

This plan defines the future worker boundaries and gates. It does not create or
run a worker.

## Proposed Worker Roles

| Worker | Purpose | Default Mode | External Writes |
|---|---|---|---|
| `thaimart-knowledge-extract` | Convert approved source observations into local KB records. | read-only/local | false |
| `thaimart-export-dry-run` | Generate local export preview from synthetic product data. | local dry-run | false |
| `thaimart-product-publish` | Publish approved product payload to Thaimart. | blocked | true |
| `thaimart-stock-sync` | Update marketplace stock. | blocked | true |
| `thaimart-order-import` | Import order data from approved source. | blocked | maybe |
| `thaimart-shipping-sync` | Sync carrier and tracking status. | blocked | true |
| `thaimart-chat-draft` | Draft support replies for review. | local draft | false |
| `thaimart-chat-send` | Send chat replies. | blocked | true |
| `thaimart-report-export` | Build local report from synthetic or approved data. | local dry-run | false |

## Gate Matrix

| Gate | Required Before | Current Status | Exact Approval Required |
|---|---|---|---|
| Local image/spec intake | Writing this spec pack | passed | not required for docs |
| Local seed validation | Reading `memory/live` seed data | passed | not required for local validation |
| Telegram/LINE recipient-token evidence | Any live message smoke | incomplete | yes |
| Telegram live send | Any Telegram send | closed | yes |
| Worker execution | Any queue payload or worker command | closed | yes |
| Render/export | Any real export generation | closed | yes |
| Marketplace mutation | Product/stock/order/chat/shipment mutation | closed | yes |
| Production deploy | Deploying website/worker/cloud infra | closed | yes |
| Git push/merge | Remote repository mutation | closed | yes |
| Customer data storage | Any real PII/customer record storage | closed | yes |

## Kill Switches And Controls

Future execution must respect these controls:

- `CUSTOMER_MESSAGE_SEND_ENABLED` for customer-facing sends.
- `RENDER_EXPORT_ENABLED` for render/export workflows.
- `CLOUDFLARE_MUTATION_ENABLED` for cloud writes.
- `PAID_API_CALLS_ENABLED` for paid/provider calls.
- `PUBLIC_AI_EXPOSURE_ENABLED` for public AI exposure.
- `DESTRUCTIVE_MCP_TOOLS_ENABLED` for destructive MCP actions.

If a switch is not enabled and verified, the worker must stop.

## Worker Execution Contract

Every future worker command must produce:

- request id
- worker id
- input path
- output path
- dry-run flag
- approval gate id
- exact allowed command
- external write flag
- production write flag
- customer visible flag
- secret read flag
- result status
- receipt path
- rollback note

Minimal future result shape:

```json
{
  "workerId": "thaimart-export-dry-run",
  "requestId": "thaimart-export-20260709-001",
  "status": "completed-local-dry-run",
  "dryRun": true,
  "inputPath": "memory/live/products.json",
  "outputPath": "data/generated-assets/thaimart-export/thaimart-export-20260709-001",
  "externalWrites": false,
  "productionWrites": false,
  "customerVisible": false,
  "telegramSent": false,
  "secretRead": false,
  "receiptPath": "docs/receipts/THAIMART_EXPORT_DRY_RUN_20260709.md"
}
```

## Future Exact Gate Templates

### Local Export Dry-Run Worker

```text
APPROVE_THAIMART_EXPORT_DRY_RUN_LOCAL_20260709
Allowed command: <exact local worker command>
Evidence: /Users/sirinx/sirinx-os/docs/specs/thaimart-automation/WORKER_GATE_PLAN.md
Rollback owner: sirinx
Forbidden adjacent actions: Telegram live send, marketplace publish, deploy, push, secret print, production data mutation
```

### Telegram Live Send Smoke

```text
APPROVE_THAIMART_TELEGRAM_SMOKE_SEND_<recipient>_20260709
Allowed command: <exact Telegram send command>
Evidence: /Users/sirinx/sirinx-os/docs/knowledge/external-gates/evidence/telegram-line-recipient-token.md
Rollback owner: sirinx
Forbidden adjacent actions: broadcast, marketplace mutation, worker queue execution, deploy, push, secret print
```

### Marketplace Publish

```text
APPROVE_THAIMART_PRODUCT_PUBLISH_<sku>_20260709
Allowed command: <exact publish command>
Evidence: <dry-run receipt path>
Rollback owner: sirinx
Forbidden adjacent actions: bulk publish, price change beyond approved SKU, stock mutation beyond approved SKU, customer message, deploy, push
```

### Production Deploy

```text
APPROVE_THAIMART_AUTOMATION_DEPLOY_<target>_20260709
Allowed command: <exact deploy command>
Evidence: <build and UAT evidence path>
Rollback owner: sirinx
Forbidden adjacent actions: webhook activation, Telegram live send, marketplace mutation, customer data storage, secret print
```

### Git Push

```text
APPROVE_THAIMART_AUTOMATION_PUSH_<remote>_<branch>_20260709
Allowed command: git push <remote> <branch>
Evidence: <verification receipt path>
Rollback owner: sirinx
Forbidden adjacent actions: deploy, merge, production mutation, marketplace mutation, live send
```

## Stop Conditions

Stop immediately if:

- The allowed command has a placeholder.
- The target recipient, branch, deploy target, SKU, or output path is missing.
- Evidence file is missing or incomplete.
- A command reads or prints secrets.
- A command touches production without production gate.
- A worker tries to process real customer data without data storage approval.
- A worker performs adjacent actions not listed in the gate.
