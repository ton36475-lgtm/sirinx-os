# ClickUp Task Draft: Thaimart Automation Local Dry-Run Worker

Status: local draft only, not created in ClickUp
Date: 2026-07-09
Source spec: `docs/specs/thaimart-automation/`
Safety mode: local-safe, no external writes

## Task Title

Build local-only Thaimart export dry-run worker and operator review packet

## Task Type

Feature planning and local implementation candidate

## Priority

P0 - prerequisite before any Telegram send, marketplace publish, production
deploy, push, or worker execution gate.

## Owners

- Hermes Commander: approval routing, gate state, receipts.
- Codex Builder: local worker design and implementation in a later exact gate.
- OpenCode Auditor: read-only review, diff audit, safety verification.
- Operator: confirms business mapping and decides future exact gates.

## Description

Convert the Thaimart automation spec pack into a bounded local dry-run worker
slice. The worker must read synthetic local product data, validate the mapping
contract, generate local preview artifacts, and write a receipt. It must not
publish to Thaimart, send Telegram/LINE messages, run production automation,
read secrets, deploy, push, or store real customer data.

The current scope is planning only. This ClickUp draft is not an external task
creation and does not authorize any connector write.

## Source Documents

- `docs/specs/thaimart-automation/BRD.md`
- `docs/specs/thaimart-automation/FRD.md`
- `docs/specs/thaimart-automation/DATA_CONTRACT.md`
- `docs/specs/thaimart-automation/WORKER_GATE_PLAN.md`
- `docs/specs/thaimart-automation/EXPORT_FLOW.md`
- `docs/receipts/THAIMART_IMAGE_INTAKE_20260709.md`
- `docs/receipts/THAIMART_APPROVE_EXPORT_GATE_READINESS_20260709.md`

## Deliverables

- Local dry-run worker plan.
- Local synthetic input validation.
- Local output schema for product export, stock export, mapping report,
  validation report, and receipt.
- Operator review checklist.
- Exact gate template for a future worker run.
- Verification commands that do not require install, deploy, provider calls,
  secret reads, or external writes.

## Subtasks

1. Confirm local seed data shape.
   - Read `memory/live/products.json`.
   - Read `memory/live/approvals.json`.
   - Confirm one synthetic `TEST-SEED-001` product.
   - Confirm the approval row references the product.
   - Do not stage or track runtime data.

2. Define local worker command shape.
   - Candidate command name: `node scripts/thaimart_export_dry_run.mjs`.
   - Required flags:
     - `--input memory/live/products.json`
     - `--approvals memory/live/approvals.json`
     - `--output data/generated-assets/thaimart-export/thaimart-export-20260709-001`
     - `--dry-run`
   - Command must fail if `--dry-run` is absent.

3. Define output artifacts.
   - `product-export.json`
   - `stock-export.json`
   - `mapping-report.json`
   - `validation-report.json`
   - `receipt.md`

4. Define validation rules.
   - Product has `sku`, Thai title, category id, price, stock, and sync status.
   - Approval status is `WAITING` or equivalent local pending state.
   - No PII fields appear in output.
   - No secret-like value appears in output.
   - External writes remain false.

5. Define receipt rules.
   - Record input paths.
   - Record output paths.
   - Record item count.
   - Record `externalWrites=false`.
   - Record `telegramSent=false`.
   - Record `productionWrites=false`.
   - Record `secretRead=false`.
   - Record rollback step for local generated files.

6. Prepare future exact gate.
   - Gate name: `APPROVE_THAIMART_EXPORT_DRY_RUN_LOCAL_20260709`.
   - Allowed command must be the exact full command.
   - Evidence must point to this planning pack and the readiness receipt.
   - Forbidden adjacent actions must include Telegram live send, marketplace
     publish, deploy, push, secret print, and production data mutation.

## Acceptance Criteria

- A future worker can be implemented without changing this safety boundary.
- The worker command is local-only and dry-run-only by default.
- Generated output uses synthetic data only.
- Output includes mapping and validation reports.
- Receipt proves no external write or live send happened.
- Any production or marketplace action remains a separate exact gate.

## Blocked Actions

- Do not create the task in ClickUp from this draft without a separate exact
  external-write gate.
- Do not send Telegram or LINE messages.
- Do not execute a worker from this planning task.
- Do not publish to Thaimart.
- Do not deploy.
- Do not push or merge.
- Do not read or print secrets.
- Do not store real customer data.

## Suggested Future ClickUp Metadata

- Space: SIRINXDev or GhostClaw OS
- Folder: Thaimart Automation
- List: Local-Safe Planning
- Status: Ready for review
- Tags: `thaimart`, `local-safe`, `dry-run`, `worker-gate`, `no-production`
- Estimate: 1 focused implementation slice after exact local implementation
  approval

## External Creation Gate

To create this in ClickUp later, use a separate gate with this shape:

```text
APPROVE_CLICKUP_CREATE_THAIMART_DRY_RUN_TASK_20260709
Allowed action: create one ClickUp task from /Users/sirinx/sirinx-os/docs/planning/thaimart-automation/CLICKUP_TASK_DRAFT_20260709.md
Target: one approved ClickUp workspace/list
Evidence: /Users/sirinx/sirinx-os/docs/planning/thaimart-automation/CLICKUP_TASK_DRAFT_20260709.md
Rollback owner: sirinx
Forbidden adjacent actions: worker execution, Telegram send, deploy, push, marketplace mutation, secret print
```
