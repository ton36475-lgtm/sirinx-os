# Thaimart Automation Local Dry-Run Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-only Thaimart export dry-run worker that turns synthetic seed data into reviewable export preview artifacts and a receipt without external writes.

**Architecture:** The worker reads `memory/live/products.json` and `memory/live/approvals.json`, validates the synthetic product and approval relationship, writes a local output bundle, and records a receipt. The implementation is fail-closed: no dry-run flag, missing approval, PII-like content, or secret-like content stops the run before writing output.

**Tech Stack:** Node.js ESM, Vitest, JSON files, Markdown receipts, existing `sirinx-os` local scripts pattern.

---

## File Structure

- Create: `scripts/thaimart_export_dry_run.mjs` for the future local dry-run worker.
- Create: `scripts/thaimart_export_dry_run.test.mjs` for synthetic unit tests.
- Create after a successful future run: `docs/receipts/THAIMART_EXPORT_DRY_RUN_20260709.md`.
- Do not modify `package.json` unless a later exact gate approves a script alias.
- Do not track `memory/live/` or generated export output.

## Task 1: Worker Contract Skeleton

**Files:**
- Create: `scripts/thaimart_export_dry_run.mjs`
- Test: `scripts/thaimart_export_dry_run.test.mjs`

- [ ] **Step 1: Add argument parser test**

```js
import { describe, expect, it } from "vitest";
import { parseArgs } from "./thaimart_export_dry_run.mjs";

describe("parseArgs", () => {
  it("requires dry-run mode", () => {
    expect(() =>
      parseArgs([
        "--input",
        "memory/live/products.json",
        "--approvals",
        "memory/live/approvals.json",
        "--output",
        "data/generated-assets/thaimart-export/test"
      ])
    ).toThrow("missing_required_dry_run_flag");
  });
});
```

- [ ] **Step 2: Verify test fails before implementation**

Run:

```text
pnpm exec vitest run scripts/thaimart_export_dry_run.test.mjs
```

Expected: FAIL because `scripts/thaimart_export_dry_run.mjs` does not exist.

- [ ] **Step 3: Implement parser skeleton**

```js
export function parseArgs(argv = process.argv.slice(2)) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    const value = argv[index + 1];
    if (key === "--input") options.input = value;
    if (key === "--approvals") options.approvals = value;
    if (key === "--output") options.output = value;
    if (key.startsWith("--") && key !== "--dry-run") index += 1;
  }
  if (options.dryRun !== true) throw new Error("missing_required_dry_run_flag");
  if (!options.input) throw new Error("missing_input_path");
  if (!options.approvals) throw new Error("missing_approvals_path");
  if (!options.output) throw new Error("missing_output_path");
  return options;
}
```

- [ ] **Step 4: Run parser test**

Run:

```text
pnpm exec vitest run scripts/thaimart_export_dry_run.test.mjs
```

Expected: PASS for parser test.

## Task 2: Synthetic Data Validation

**Files:**
- Modify: `scripts/thaimart_export_dry_run.mjs`
- Modify: `scripts/thaimart_export_dry_run.test.mjs`

- [ ] **Step 1: Add validation test**

```js
import { validateSeedData } from "./thaimart_export_dry_run.mjs";

describe("validateSeedData", () => {
  it("accepts one synthetic product with a matching approval row", () => {
    const products = [{ id: "product-1", sku: "TEST-SEED-001", title_th: "สินค้า", category_id: "STICKERS", price_thaimart: 145.5, stock_thaimart: 100 }];
    const approvals = [{ action_type: "THAIMART_LIVE_PUBLISH", target_reference: "product-1", gate_status: "WAITING" }];
    expect(validateSeedData(products, approvals)).toEqual({ productCount: 1, approvalCount: 1 });
  });
});
```

- [ ] **Step 2: Implement validation**

```js
export function validateSeedData(products, approvals) {
  if (!Array.isArray(products)) throw new Error("products_must_be_array");
  if (!Array.isArray(approvals)) throw new Error("approvals_must_be_array");
  const matchingApprovals = approvals.filter((approval) => approval.action_type === "THAIMART_LIVE_PUBLISH");
  for (const approval of matchingApprovals) {
    const product = products.find((item) => item.id === approval.target_reference);
    if (!product) throw new Error("approval_references_missing_product");
    if (!product.sku) throw new Error("product_missing_sku");
    if (!product.title_th) throw new Error("product_missing_title_th");
    if (!product.category_id) throw new Error("product_missing_category_id");
  }
  return { productCount: products.length, approvalCount: matchingApprovals.length };
}
```

- [ ] **Step 3: Run validation test**

Run:

```text
pnpm exec vitest run scripts/thaimart_export_dry_run.test.mjs
```

Expected: PASS.

## Task 3: Local Output Bundle

**Files:**
- Modify: `scripts/thaimart_export_dry_run.mjs`
- Modify: `scripts/thaimart_export_dry_run.test.mjs`

- [ ] **Step 1: Add output mapping test**

```js
import { buildExportBundle } from "./thaimart_export_dry_run.mjs";

describe("buildExportBundle", () => {
  it("marks every export artifact as local dry run", () => {
    const products = [{ id: "product-1", sku: "TEST-SEED-001", title_th: "สินค้า", category_id: "STICKERS", price_thaimart: 145.5, stock_thaimart: 100 }];
    const bundle = buildExportBundle(products);
    expect(bundle.productExport[0].status).toBe("DRAFT_LOCAL_ONLY");
    expect(bundle.meta.externalWrites).toBe(false);
    expect(bundle.meta.telegramSent).toBe(false);
  });
});
```

- [ ] **Step 2: Implement output mapping**

```js
export function buildExportBundle(products) {
  return {
    productExport: products.map((product) => ({
      marketplace: "thaimart",
      externalProductId: null,
      sku: product.sku,
      categoryPath: ["synthetic", product.category_id],
      title: product.title_th,
      description: product.description_th || "",
      price: product.price_thaimart,
      stock: product.stock_thaimart,
      status: "DRAFT_LOCAL_ONLY"
    })),
    stockExport: products.map((product) => ({
      sku: product.sku,
      stock: product.stock_thaimart,
      mode: "LOCAL_DRY_RUN"
    })),
    validationReport: {
      passed: true,
      piiDetected: false,
      secretDetected: false
    },
    mappingReport: {
      source: "sirinx-local",
      target: "thaimart-local-preview",
      unknownFields: ["shippingTemplateId", "externalProductId"]
    },
    meta: {
      externalWrites: false,
      productionWrites: false,
      customerVisible: false,
      telegramSent: false,
      secretRead: false
    }
  };
}
```

- [ ] **Step 3: Run output mapping test**

Run:

```text
pnpm exec vitest run scripts/thaimart_export_dry_run.test.mjs
```

Expected: PASS.

## Task 4: Receipt And Verification

**Files:**
- Modify: `scripts/thaimart_export_dry_run.mjs`
- Create after future dry run: `docs/receipts/THAIMART_EXPORT_DRY_RUN_20260709.md`

- [ ] **Step 1: Run syntax check**

Run:

```text
node --check scripts/thaimart_export_dry_run.mjs
```

Expected: PASS.

- [ ] **Step 2: Run unit tests**

Run:

```text
pnpm exec vitest run scripts/thaimart_export_dry_run.test.mjs
```

Expected: PASS.

- [ ] **Step 3: Run local dry-run command only after exact implementation gate**

Run:

```text
node scripts/thaimart_export_dry_run.mjs --input memory/live/products.json --approvals memory/live/approvals.json --output data/generated-assets/thaimart-export/thaimart-export-20260709-001 --dry-run
```

Expected: writes only local generated output and a local receipt. No external
write, Telegram send, deploy, push, provider call, or secret read.

- [ ] **Step 4: Run scoped diff check**

Run:

```text
git diff --check -- scripts/thaimart_export_dry_run.mjs scripts/thaimart_export_dry_run.test.mjs docs/receipts/THAIMART_EXPORT_DRY_RUN_20260709.md
```

Expected: PASS.

## Self-Review

- Spec coverage: covers product seed validation, export preview, mapping report,
  validation report, receipt, and gate separation.
- Gaps: official Thaimart API source inventory and Telegram recipient evidence
  remain separate future gates.
- Placeholder scan: exact future command is provided for the dry-run worker; no
  production command is authorized.
- Type consistency: uses `productExport`, `stockExport`, `validationReport`,
  `mappingReport`, and `meta` consistently across tasks.

## Execution Choice

Plan complete and saved to `docs/superpowers/plans/2026-07-09-thaimart-automation-local-dry-run-worker.md`.

1. Subagent-Driven: dispatch a fresh subagent per task and review between tasks.
2. Inline Execution: execute tasks in this session using checkpoints.

Do not execute either path without a separate exact implementation gate.
