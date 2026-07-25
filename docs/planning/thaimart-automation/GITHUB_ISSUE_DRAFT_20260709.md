# GitHub Issue Draft: Thaimart Automation Local Dry-Run Worker

Status: local draft only, not created in GitHub
Date: 2026-07-09
Source spec: `docs/specs/thaimart-automation/`
Safety mode: local-safe, no remote write

## Issue Title

feat(thaimart): plan local dry-run export worker and gated operator review flow

## Labels

- `feature`
- `thaimart`
- `local-safe`
- `dry-run`
- `approval-gated`
- `needs-review`

## Problem

The Thaimart automation spec pack defines a future product automation pipeline,
but the repo currently has only synthetic seed data and readiness receipts. No
dedicated Thaimart export worker command was found. A local dry-run worker slice
is needed before any Telegram notification, marketplace publish, production
deploy, Git push, or worker execution gate can be considered.

## Current Evidence

- `docs/specs/thaimart-automation/BRD.md`
- `docs/specs/thaimart-automation/FRD.md`
- `docs/specs/thaimart-automation/DATA_CONTRACT.md`
- `docs/specs/thaimart-automation/WORKER_GATE_PLAN.md`
- `docs/specs/thaimart-automation/EXPORT_FLOW.md`
- `docs/receipts/THAIMART_IMAGE_INTAKE_20260709.md`
- `docs/receipts/THAIMART_APPROVE_EXPORT_GATE_READINESS_20260709.md`
- `scripts/seed_test.mjs`

## Proposed Scope

Create a local-only `thaimart-export-dry-run` worker in a later implementation
gate. The worker should:

- Read synthetic local products.
- Read synthetic local approval rows.
- Validate required fields.
- Map SIRINX product and stock fields to Thaimart target preview fields.
- Write local output artifacts.
- Write a receipt.
- Prove no external writes, no Telegram send, no production mutation, and no
  secret reads.

## Out Of Scope

- GitHub issue creation from this draft.
- Git push or merge.
- Production deploy.
- Telegram or LINE live send.
- Worker execution without exact local gate.
- Thaimart seller center mutation.
- Official API call or session-based automation.
- Customer data storage.
- Secret read or print.
- Provider or paid API call.

## Candidate Files For Future Implementation

These are candidates for a future exact implementation gate, not files to edit
from this planning issue:

- Create `scripts/thaimart_export_dry_run.mjs`.
- Create `scripts/thaimart_export_dry_run.test.mjs`.
- Create `docs/receipts/THAIMART_EXPORT_DRY_RUN_20260709.md` after execution.
- Update `package.json` only if a script alias is explicitly approved.

## Expected Local Output

```text
data/generated-assets/thaimart-export/thaimart-export-20260709-001/
  product-export.json
  stock-export.json
  mapping-report.json
  validation-report.json
  receipt.md
```

## Acceptance Criteria

- Worker runs only in dry-run mode.
- Worker fails if the input files are missing.
- Worker fails if product SKU is missing.
- Worker fails if approval references no existing product.
- Worker writes all expected local output artifacts.
- Receipt records:
  - `externalWrites=false`
  - `productionWrites=false`
  - `customerVisible=false`
  - `telegramSent=false`
  - `secretRead=false`
- Tests use synthetic data only.
- No real customer data is added to docs, tests, logs, or output.

## Suggested Test Plan For Future Implementation

```text
node --check scripts/thaimart_export_dry_run.mjs
pnpm exec vitest run scripts/thaimart_export_dry_run.test.mjs
node scripts/thaimart_export_dry_run.mjs --input memory/live/products.json --approvals memory/live/approvals.json --output data/generated-assets/thaimart-export/thaimart-export-20260709-001 --dry-run
git diff --check -- scripts/thaimart_export_dry_run.mjs scripts/thaimart_export_dry_run.test.mjs docs/receipts/THAIMART_EXPORT_DRY_RUN_20260709.md
```

Do not run these until a separate implementation gate exists and the command is
reviewed.

## Future Exact Implementation Gate

```text
APPROVE_IMPLEMENT_THAIMART_EXPORT_DRY_RUN_LOCAL_20260709
Allowed files: scripts/thaimart_export_dry_run.mjs, scripts/thaimart_export_dry_run.test.mjs, docs/receipts/THAIMART_EXPORT_DRY_RUN_20260709.md
Evidence: /Users/sirinx/sirinx-os/docs/planning/thaimart-automation/GITHUB_ISSUE_DRAFT_20260709.md
Rollback owner: sirinx
Forbidden adjacent actions: git push, deploy, Telegram live send, marketplace mutation, customer data storage, secret print
```

## External Creation Gate

To create this issue in GitHub later, use a separate gate with this shape:

```text
APPROVE_GITHUB_CREATE_THAIMART_DRY_RUN_ISSUE_20260709
Allowed action: create one GitHub issue from /Users/sirinx/sirinx-os/docs/planning/thaimart-automation/GITHUB_ISSUE_DRAFT_20260709.md
Target: one approved GitHub owner/repo
Evidence: /Users/sirinx/sirinx-os/docs/planning/thaimart-automation/GITHUB_ISSUE_DRAFT_20260709.md
Rollback owner: sirinx
Forbidden adjacent actions: git push, PR creation, deploy, worker execution, Telegram send, marketplace mutation, secret print
```
