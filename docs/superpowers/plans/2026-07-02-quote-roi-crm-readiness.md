# Quote ROI CRM Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local-only future-readiness specifications for quote form, ROI calculator, CRM handoff, proposal generation, LINE automation, UAT, Trust Center, product catalog, and project proof CMS without enabling any production integration.

**Architecture:** Keep this as docs and verification only. New specs live under `docs/specs/quote-roi-crm-readiness/`, and `apps/sirinx-site/scripts/check.mjs` enforces their presence and safety snippets alongside existing website and LINE governance docs.

**Tech Stack:** Markdown specs, existing Node static checker, existing pnpm site build/check, existing Playwright UAT.

---

### Task 1: Future-Readiness Spec Pack

**Files:**
- Create: `docs/specs/quote-roi-crm-readiness/BRD.md`
- Create: `docs/specs/quote-roi-crm-readiness/FRD.md`
- Create: `docs/specs/quote-roi-crm-readiness/UI_FLOW.md`
- Create: `docs/specs/quote-roi-crm-readiness/DATA_CONTRACT.md`
- Create: `docs/specs/quote-roi-crm-readiness/FUTURE_ARCHITECTURE.md`
- Create: `docs/specs/quote-roi-crm-readiness/TEST_CASES.md`
- Create: `docs/specs/quote-roi-crm-readiness/ROLLBACK_PLAN.md`

- [ ] **Step 1: Create the spec directory**

Run: `mkdir -p docs/specs/quote-roi-crm-readiness`
Expected: directory exists and no production state changes.

- [ ] **Step 2: Add business requirements**

Create `BRD.md` with local-only goals for quote form, ROI calculator, CRM handoff, proposal preparation, LINE automation readiness, Trust Center, product catalog, and project proof CMS.

- [ ] **Step 3: Add functional requirements**

Create `FRD.md` with explicit blocked gates for CRM writes, customer data storage, LINE webhook, production analytics, PDF proposal generation, and CRUD verifier execution.

- [ ] **Step 4: Add UI flow and data contract**

Create `UI_FLOW.md` and `DATA_CONTRACT.md` covering future quote and ROI fields as synthetic/local schema only.

- [ ] **Step 5: Add future architecture notes**

Create `FUTURE_ARCHITECTURE.md` mapping quote, ROI, CRM, PDF proposal, LINE rich menu, LINE message automation, LINE webhook, Stagehand UAT, CRUD verifier, Trust Center, product catalog, and project proof CMS.

- [ ] **Step 6: Add tests and rollback**

Create `TEST_CASES.md` and `ROLLBACK_PLAN.md` with exact local commands and no external rollback requirements.

### Task 2: Static Checker Governance Coverage

**Files:**
- Modify: `apps/sirinx-site/scripts/check.mjs`

- [ ] **Step 1: Add the new spec files to `requiredSpecFiles`**

Update the array to include all seven `docs/specs/quote-roi-crm-readiness/*.md` files.

- [ ] **Step 2: Add required snippet checks**

Update `requiredSpecSnippets` so the checker proves the docs mention the future systems and closed approval gates.

- [ ] **Step 3: Run the checker**

Run: `pnpm --filter @sirinx/site build && pnpm --filter @sirinx/site check`
Expected: `sirinx-site check passed for 13 files`.

### Task 3: Audit And Brain Sync

**Files:**
- Modify: `docs/website/SIRINX_WEBSITE_QUALITY_AUDIT.md`
- Modify: `/Users/sirinx/Documents/Obsidian Vault/SIRINX/AI HQ Knowledge Digest.md`

- [ ] **Step 1: Update audit evidence**

Add the new future-readiness spec pack to the governance artifact list and test evidence.

- [ ] **Step 2: Run local verification**

Run:

```bash
pnpm --filter @sirinx/site build && pnpm --filter @sirinx/site check
pnpm --filter @sirinx/site test:line
git diff --check
```

Expected:
- Static check passes.
- Browser UAT remains `28 passed`.
- Diff hygiene passes.

- [ ] **Step 3: Run Night Watch observation**

Run: `pnpm night-watch`
Expected: read `.hermes/logs/night-watch-latest.md`; if status is `WARN`, record diagnosis and do not restart services.

- [ ] **Step 4: Append Obsidian pulse**

Append one concise note with source paths, verification evidence, and next safe action. Do not include secrets or raw logs.

## Self-Review

- Spec coverage: covers all Phase 13 future-ready items named in the website mission.
- Placeholder scan: no red-flag placeholder language is used.
- Type consistency: all spec paths use `docs/specs/quote-roi-crm-readiness/` and checker paths match that directory.
