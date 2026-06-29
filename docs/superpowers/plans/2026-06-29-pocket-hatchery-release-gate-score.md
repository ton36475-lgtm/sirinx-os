# Pocket Hatchery Release Gate Score Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Pocket Hatchery Task 2.6 by raising the local release gate score to at least 80 only after required local evidence exists.

**Architecture:** Treat the score as derived local evidence, not approval for deploy. Add Python unittest coverage that requires wallet flow evidence, metadata permission audit, rollback review, and contract action test evidence before the score can pass. Update only local docs/config/state; no testnet deploy, wallet connector, push, cloud mutation, or external send.

**Tech Stack:** Python unittest, JSON release gate config, Markdown evidence docs.

---

### Task 1: Release Evidence Gate Test

**Files:**
- Create: `WORKSPACE_SCAFFOLD/tests/test_release_gate_score.py`

- [x] **Step 1: Write failing test**

Write a unittest that requires:
- `WORKSPACE_SCAFFOLD/config/pocket_hatchery_release_gate.json` score >= 80.
- Evidence files exist under `apps/pocket-hatchery/ops/`.
- Evidence files contain local-only/no-deploy/no-real-wallet-write boundaries.
- Required evidence ids in config match evidence docs.

- [x] **Step 2: Run test and observe RED**

Run: `python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_release_gate_score -v`
Expected: FAIL because score is still 34 and evidence files are missing.

### Task 2: Evidence Docs And Score Config

**Files:**
- Create: `apps/pocket-hatchery/ops/wallet_flow_evidence.md`
- Create: `apps/pocket-hatchery/ops/metadata_permission_audit.md`
- Create: `apps/pocket-hatchery/ops/rollback_plan_review.md`
- Modify: `WORKSPACE_SCAFFOLD/config/pocket_hatchery_release_gate.json`
- Modify: `apps/pocket-hatchery/ops/release_gate_evidence.md`
- Modify: `NEXT_ACTIONS.md`
- Modify: `PROJECT_STATE.md`
- Modify: `AUTONOMOUS_RUN_LOG.md`

- [x] **Step 1: Create evidence docs**

Write concise local evidence docs that cite current files and verification commands. Do not claim real wallet transaction, testnet deploy, or production readiness.

- [x] **Step 2: Update config score**

Set `score` to `84`, add `evidence_files`, and keep all blocked flags false. Keep `production_deploy=false`.

- [x] **Step 3: Update state docs**

Mark Task 2.6 complete while keeping R0 deployment gates blocked.

### Task 3: Verification

**Files:**
- All files above.

- [x] **Step 1: Run release gate test**

Run: `python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_release_gate_score -v`
Expected: PASS.

- [x] **Step 2: Run full workspace scaffold tests**

Run: `python3 -m unittest discover -s WORKSPACE_SCAFFOLD/tests -v`
Expected: PASS.

- [x] **Step 3: Run local status report and diff checks**

Run: `python3 WORKSPACE_SCAFFOLD/scripts/status_report.py --root .`
Expected: reports score 84.

Run: `git diff --check`
Expected: no output and exit 0.
