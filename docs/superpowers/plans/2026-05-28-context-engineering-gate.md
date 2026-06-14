# Context Engineering Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a context-first gate to SIRINX so agents produce durable context, non-goals, implementation plans, and verification evidence before source-code work starts.

**Architecture:** The first phase is documentation and governance only. Later implementation can add a local CLI/script that reads `.hermes/context.md`, asks context questions, writes reports, and refuses implementation without an exact approval phrase.

**Tech Stack:** Markdown docs, `.hermes` state/report files, pnpm verification scripts, existing SIRINX local-only guardrails.

---

### Task 1: Documentation Gate

**Files:**
- Create: `docs/knowledge/SIRINX_CONTEXT_ENGINEERING_GRILL_WITH_DOCS_2026-05-28.md`
- Create: `docs/grid/20-context-engineering-grill-with-docs.md`
- Modify: `docs/grid/README.md`

- [ ] **Step 1: Add knowledge document**

Create `docs/knowledge/SIRINX_CONTEXT_ENGINEERING_GRILL_WITH_DOCS_2026-05-28.md` with:

```markdown
# SIRINX Context Engineering Gate - Grill With Docs Pattern

Status: LOCAL-ONLY KNOWLEDGE INTEGRATION
Date: 2026-05-28
Source boundary: user-provided video analysis and screenshot prompt framework.

## Purpose

Convert the context.md lesson into a SIRINX operating pattern.
```

- [ ] **Step 2: Add grid document**

Create `docs/grid/20-context-engineering-grill-with-docs.md` with a node diagram and state machine. It must include `Context Grill`, `Context Writer`, `Non-goal Locker`, `Plan Writer`, `Approval Gate`, `Developer Worker`, `Validator Shield`, and `Evidence Scribe`.

- [ ] **Step 3: Link from README**

Modify `docs/grid/README.md` by adding grid 20 to the phase order, maintainer table, and migration notes.

- [ ] **Step 4: Verify docs links**

Run:

```bash
rg -n "20-context-engineering|SIRINX_CONTEXT_ENGINEERING" docs/grid/README.md docs/grid/20-context-engineering-grill-with-docs.md docs/knowledge/SIRINX_CONTEXT_ENGINEERING_GRILL_WITH_DOCS_2026-05-28.md
```

Expected: all three files are found.

### Task 2: Local State And Report

**Files:**
- Modify: `.hermes/context.md`
- Modify: `.hermes/state.json`
- Create: `.hermes/reports/CONTEXT_ENGINEERING_GRILL_WITH_DOCS_STATUS_2026-05-28.md`

- [ ] **Step 1: Update context snapshot**

Add a bullet to `.hermes/context.md` under the current snapshot:

```markdown
- Context Engineering Gate adopted from the user-provided MilerDev `context.md` video analysis: drafted at `docs/knowledge/SIRINX_CONTEXT_ENGINEERING_GRILL_WITH_DOCS_2026-05-28.md`, `docs/grid/20-context-engineering-grill-with-docs.md`, and `docs/superpowers/plans/2026-05-28-context-engineering-gate.md`. It is docs-only; no skill install, repo clone, external SaaS write, or source-code implementation occurred.
```

- [ ] **Step 2: Update state JSON**

Add these keys to `.hermes/state.json`:

```json
"latest_context_engineering_grill_with_docs": "docs/knowledge/SIRINX_CONTEXT_ENGINEERING_GRILL_WITH_DOCS_2026-05-28.md",
"latest_context_engineering_grill_with_docs_grid": "docs/grid/20-context-engineering-grill-with-docs.md",
"latest_context_engineering_grill_with_docs_plan": "docs/superpowers/plans/2026-05-28-context-engineering-gate.md",
"latest_context_engineering_grill_with_docs_report": ".hermes/reports/CONTEXT_ENGINEERING_GRILL_WITH_DOCS_STATUS_2026-05-28.md",
"context_engineering_gate_status": "active-docs-only"
```

- [ ] **Step 3: Create report**

Create `.hermes/reports/CONTEXT_ENGINEERING_GRILL_WITH_DOCS_STATUS_2026-05-28.md` with summary, changed files, verification commands, risk, approvals needed, and next action.

- [ ] **Step 4: Verify JSON**

Run:

```bash
node -e "JSON.parse(require('node:fs').readFileSync('.hermes/state.json','utf8')); console.log('state-json-ok')"
```

Expected: `state-json-ok`.

### Task 3: Verification

**Files:**
- No new files.

- [ ] **Step 1: Check whitespace and Markdown diff safety**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

- [ ] **Step 2: Run secret audit**

Run:

```bash
pnpm audit:secrets
```

Expected: exits 0, no new secret exposure reported.

- [ ] **Step 3: Run project check**

Run:

```bash
pnpm check
```

Expected: exits 0.

- [ ] **Step 4: Report status**

Final report must include changed files, commands run, verification result, risks, approval needed, and next action.

