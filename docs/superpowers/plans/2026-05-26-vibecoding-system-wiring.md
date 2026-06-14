# VibeCoding System Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild SIRINXDev/VibeCoding into one local-only system wiring contract that can be checked before any external activation.

**Architecture:** Use a machine-readable wiring map as the source of truth, a checker script as the enforcement layer, and a human-readable rebuild report for operators. Existing subsystems stay in place; this plan wires them by contract rather than moving runtime ownership.

**Tech Stack:** Node.js ESM scripts, pnpm workspace scripts, Markdown docs, Mermaid diagrams, existing SIRINX local control-plane packages and apps.

---

### Task 1: System Wiring Map

**Files:**
- Create: `docs/knowledge/system-wiring/sirinx-vibecoding-system-map.json`

- [x] **Step 1: Define lanes**

Create a JSON object with `version`, `mode`, `goal`, `stopPoint`, `blockedActions`, `requiredPackageScripts`, and `lanes`.

- [x] **Step 2: Include required lanes**

Include governance, command-center-api, command-center-ui, public-site-local, public-website-source, edge-router, hermes-inbox, policy-core, solar-intelligence, content-factory, clawforge-adapter, external-gates, obsidian-brain, and night-watch.

- [x] **Step 3: Add verification and approval gate per lane**

Every lane must define local paths, inputs, outputs, verification commands, and approval boundary.

### Task 2: Wiring Checker

**Files:**
- Create: `scripts/check-system-wiring.mjs`
- Modify: `package.json`
- Modify: `scripts/verify-workspace.mjs`

- [x] **Step 1: Add checker script**

The checker reads the JSON map, confirms paths exist, confirms blocked actions exist, and confirms required package scripts are present.

- [x] **Step 2: Add package script**

Add:

```json
"wiring:check": "node scripts/check-system-wiring.mjs"
```

- [x] **Step 3: Add checker to workspace verification**

Add `node scripts/check-system-wiring.mjs` to `scripts/verify-workspace.mjs`.

### Task 3: Operator Rebuild Report

**Files:**
- Create: `docs/knowledge/SIRINX_VIBECODING_SYSTEM_WIRING_REBUILD_2026-05-26.md`

- [x] **Step 1: Review old work**

Record what already exists and what remains approval-gated.

- [x] **Step 2: Add Mermaid flow**

Show the core flow from human goal to governance, policy, Hermes, API, dashboard, verification, approval packet, and stop.

- [x] **Step 3: Add known blocker**

Record the repeated `pnpm night-watch` pnpm fetch/network blocker as a separate health path that cannot be claimed passing until it completes.

### Task 4: Verification

**Files:**
- No new files unless a verification failure requires a narrow fix.

- [x] **Step 1: Syntax check**

Run:

```bash
node --check scripts/check-system-wiring.mjs
```

- [x] **Step 2: Wiring check**

Run:

```bash
node scripts/check-system-wiring.mjs
pnpm wiring:check
```

- [x] **Step 3: Workspace verification**

Run:

```bash
pnpm verify:workspace
pnpm audit:secrets
pnpm check
pnpm verify
pnpm exec vitest run
git diff --check
```

### Task 5: Stop

**Files:**
- Update final report only if verification results need recording.

- [x] **Step 1: Confirm no external action**

Confirm no deploy, push, publish, paid API, real MCP, external connector, production database write, or customer send was performed.

- [x] **Step 2: Report exact status**

End with:

```text
VIBECODING SYSTEM WIRING READY — LOCAL ONLY — WAITING FOR HUMAN APPROVAL
```
