# Thaimart Automation Export Flow

Status: local specification
Date: 2026-07-09
Mode: future flow, not executed

## Flow Goal

Define the safe future path from a local product approval row to a local export
preview, then to a separately approved marketplace action.

## Phase 0: Source Intake

Inputs:

- Operator-provided workflow images.
- Existing local seed product.
- Existing local approval row.
- Future approved Thaimart source inventory.

Outputs:

- Spec pack.
- Image intake receipt.
- Source inventory.

Blocked:

- Unauthorized scraping.
- Credential inspection.
- Seller center mutation.
- API calls to Thaimart.

## Phase 1: Local Seed Verification

Input:

- `memory/live/products.json`
- `memory/live/approvals.json`

Validation:

- Product SKU exists.
- Approval row exists.
- Approval references an existing product.
- Product status is pending gate.
- Data is synthetic.

Current status: passed in prior local verification.

## Phase 2: Local Export Preview

Future command: not yet implemented.

Expected behavior:

1. Read synthetic product data.
2. Validate required fields.
3. Map SIRINX fields to Thaimart target fields.
4. Write local export preview files.
5. Write receipt.
6. Set `externalWrites=false`.

Proposed local output path:

```text
data/generated-assets/thaimart-export/<batchId>/
```

Proposed files:

```text
product-export.json
stock-export.json
mapping-report.json
validation-report.json
receipt.md
```

No real marketplace action is allowed in this phase.

## Phase 3: Operator Review

Review checklist:

- SKU and category mapping are correct.
- Price and stock are correct.
- Required product fields are present.
- No PII appears in export preview.
- No secret appears in logs or receipt.
- Rollback is documented.
- Target action is one SKU or one bounded batch.

## Phase 4: Exact Gate

The operator must provide one exact gate for one action.

Not acceptable:

```text
approve all
run everything
deploy all
push and production
```

Acceptable shape:

```text
APPROVE_THAIMART_EXPORT_DRY_RUN_LOCAL_20260709
Allowed command: <exact command with no placeholder>
Evidence: <receipt path>
Rollback owner: sirinx
Forbidden adjacent actions: <explicit blocked actions>
```

## Phase 5: Worker Execution

Future worker execution must:

- Match the exact allowed command.
- Fail closed if the gate does not match.
- Write a receipt.
- Avoid adjacent actions.
- Keep secret values redacted.
- Stop on unknown product mapping.

## Phase 6: Marketplace Mutation

Future marketplace publish or sync is a separate gate after local export preview
and human review. It must not be bundled with Telegram send, deploy, push, or
customer data storage.

## Phase 7: Telegram Or LINE Notification

Future notification is separate from worker execution.

Before any live send:

- Recipient evidence must be complete.
- Token ownership must be confirmed or rotated.
- Secret values must not be printed.
- One exact recipient and one exact command must be approved.

## Rollback Flow

Local dry-run rollback:

- Delete generated local output folder.
- Keep receipt as audit evidence.
- Reset local approval status to waiting if needed.

Marketplace rollback:

- Requires marketplace-specific rollback plan before mutation.
- Must include product unpublish/update/stock correction path.
- Must include operator verification and receipt.

Deploy rollback:

- Requires target-specific deploy rollback command.
- Must be separated from export/marketplace gates.
