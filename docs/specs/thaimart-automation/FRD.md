# Thaimart Automation FRD

Status: local specification from image intake
Date: 2026-07-09
Mode: documentation only

## Functional Requirements

| ID | Requirement | Priority | Source | Validation |
|---|---|---:|---|---|
| TA-FR-001 | Inventory all Thaimart source surfaces before implementation. | P0 | Image 1 | Source inventory doc exists |
| TA-FR-002 | Separate confirmed API endpoints from inferred UI/session flows. | P0 | Image 1 | Endpoint register marks status |
| TA-FR-003 | Build a local knowledge base from category, attribute, shipping, warehouse, product, variant, price, promotion, stock, order, invoice, return, refund, and chat rules. | P0 | Image 1 | Knowledge extraction checklist exists |
| TA-FR-004 | Define auth modes for API key/token, OAuth2 if available, session management, and rate limit handling. | P0 | Image 1 | Auth plan keeps secrets out of repo |
| TA-FR-005 | Map SIRINX product data to Thaimart product data. | P0 | Image 1 | Data contract table exists |
| TA-FR-006 | Map SIRINX stock data to Thaimart stock data. | P0 | Image 1 | Data contract table exists |
| TA-FR-007 | Map SIRINX order data to Thaimart order data. | P0 | Image 1 | Data contract table exists |
| TA-FR-008 | Map SIRINX customer data to Thaimart customer data with PII controls. | P0 | Image 1 | Redaction rules documented |
| TA-FR-009 | Create a future local export batch flow using synthetic data only. | P0 | Existing seed | Export flow spec exists |
| TA-FR-010 | Require approval before any export worker execution. | P0 | Governance | Gate plan exists |
| TA-FR-011 | Require recipient/token evidence before Telegram or LINE live send. | P0 | Governance | Evidence gate identified |
| TA-FR-012 | Provide an error handling and retry strategy for future sync workers. | P1 | Image 1 | Worker plan includes retry policy |
| TA-FR-013 | Provide queue, scheduler, and log boundaries for future automation. | P1 | Image 1 | Worker plan includes queue/logs |
| TA-FR-014 | Define logistics adapter boundaries for Flash, Kerry, and Thailand Post. | P1 | Image 1 | Adapter contracts marked future |
| TA-FR-015 | Define SEO and marketing integration outputs without auto-publishing. | P2 | Image 1 | Marketing outputs remain gated |
| TA-FR-016 | Define reporting dashboard outputs for sales and operations. | P2 | Image 1 | Report payload schema exists |

## Reverse Engineering Requirements

Before any implementation, the team must document:

- Allowed access method for Thaimart source review.
- Whether an official API exists and is permitted.
- Whether session-based automation is allowed by business/legal review.
- Source pages or API references that are allowed to be inspected.
- Rate limits, anti-bot restrictions, terms, and account risk.
- Data entities and required fields.
- Validation rules for product creation and stock updates.
- Failure modes and rollback behavior.

## Automation Engine Requirements

Future engine capabilities:

- Product sync.
- Stock sync.
- Order import.
- Price update.
- Promotion sync.
- Chat auto reply draft generation.
- Shipping sync.
- Invoice generation.
- Status update.
- Report dashboard export.

Current implementation status:

- Product and approval seed only.
- No real product sync worker found.
- No real stock/order/chat/shipment/invoice worker found.
- No real Thaimart API/session client found.

## Approval UX Requirements

Future operator approval flow:

1. Worker creates local dry-run preview.
2. Preview generates a receipt with changed entities, target channel, risk, and
   rollback.
3. Operator reviews preview.
4. Operator provides one exact approval gate for one action.
5. Worker executes only that action.
6. Worker writes a receipt.
7. Auditor verifies receipt and checks no adjacent action ran.

The current approval row in `memory/live/approvals.json` is not enough to run
Telegram, worker execution, export generation, push, deploy, or production
mutation.

## Non-Functional Requirements

- Local-first by default.
- Deterministic dry-run output.
- Idempotent seed and export test runs.
- No secret value in logs or docs.
- No real customer data in test fixtures.
- Rate-limit-aware future client.
- Retry with bounded attempts only.
- Structured audit events for every state transition.
- Rollback-ready output for every future mutation.
- Thai and English labels where customer or operator UI requires them.

## Acceptance Criteria For This Spec Phase

- BRD, FRD, data contract, worker/gate plan, export flow, and image intake
  receipt exist.
- The docs clearly mark current repo state as seed/readiness only.
- The docs do not approve live Telegram, worker execution, deploy, push, or
  production mutation.
- Future exact gate templates include target, command, evidence, rollback, and
  forbidden adjacent actions.
