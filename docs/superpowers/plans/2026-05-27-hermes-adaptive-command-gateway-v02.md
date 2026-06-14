# Hermes Adaptive Command Gateway v0.2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-only Telegram command gateway contract with fast ACK, deterministic job IDs, command parsing, secret redaction, queue preview, mission objects, and approval gates.

**Architecture:** Add a focused Hermes API module for command parsing and dry-run queue planning, then expose it through the existing dev-control-api and dashboard. The implementation stays dry-run only: no Telegram send, provider call, worker execution, MCP start, package install, deploy, push, or publish.

**Tech Stack:** Node.js ESM, Vitest, existing dev-control-api HTTP server, static dashboard, local Markdown evidence docs.

---

### Task 1: Adaptive Command Gateway Core

**Files:**
- Create: `services/hermes-api/src/adaptive-command-gateway.test.mjs`
- Create: `services/hermes-api/src/adaptive-command-gateway.mjs`

- [x] **Step 1: Write failing tests**

Cover `/clear` alias, secret redaction, `/kanban boards switch <slug>`, malformed `/kanban ...` guidance, `/mission create`, `/mission route`, `/hermes mission create --...`, and blocked dangerous execution terms.

- [x] **Step 2: Run red test**

Run: `pnpm exec vitest run services/hermes-api/src/adaptive-command-gateway.test.mjs`

Expected: fail because the module does not exist yet.

- [x] **Step 3: Implement minimal module**

Export:
- `getAdaptiveCommandGatewayStatus()`
- `createAdaptiveCommandDryRun(body, options)`
- `parseAdaptiveCommand(command)`
- `detectSecretLikeText(text)`
- `redactSecretLikeText(text)`

- [x] **Step 4: Run green test**

Run: `pnpm adaptive-command-gateway:test`

Expected: all tests pass.

### Task 2: Local API Routes

**Files:**
- Modify: `services/dev-control-api/server.mjs`
- Extend: `services/hermes-api/src/adaptive-command-gateway.test.mjs`

- [x] **Step 1: Add API tests**

Cover:
- `GET /api/hermes-adaptive-command-gateway`
- `POST /api/hermes-adaptive-command-gateway/telegram/dry-run`
- invalid JSON fail-closed.

- [x] **Step 2: Wire routes**

Import the module and add dry-run/status routes. Invalid JSON must return all capability flags false and `requiresHumanApproval: true`.

### Task 3: Dashboard Evidence Panel

**Files:**
- Modify: `apps/dev-dashboard/src/index.html`
- Modify: `apps/dev-dashboard/src/app.js`
- Modify: `apps/dev-dashboard/src/styles.css`
- Modify: `tests/browser/dev-dashboard.spec.mjs`

- [x] **Step 1: Add visible panel**

Show model split, queue status, command registry, blocked actions, and stop point.

- [x] **Step 2: Verify no executable buttons**

The panel must contain zero `Run`, `Send`, `Execute`, `Provider Call`, `Dispatch`, or `Start Agent` buttons.

### Task 4: Docs and Verification Wiring

**Files:**
- Create: `docs/knowledge/SIRINX_HERMES_ADAPTIVE_COMMAND_GATEWAY_V0_2.md`
- Create: `docs/knowledge/gateway-agent/19-adaptive-command-gateway.md`
- Modify: `docs/knowledge/gateway-agent/00-index.md`
- Modify: `package.json`
- Modify: `scripts/check-skeleton.mjs`
- Modify: `scripts/verify-workspace.mjs`
- Modify: `scripts/secret-scan.mjs`

- [x] **Step 1: Add docs**

Document Fast ACK, queue, parser, model split, PC/mobile sync policy, approval gate, and no-execution boundary.

- [x] **Step 2: Wire scripts**

Add `pnpm adaptive-command-gateway:test`; include it in workspace verification and skeleton/secret checks.

### Task 5: Verification

- [x] Run `pnpm adaptive-command-gateway:test`
- [x] Run `pnpm hermes-inbox:test`
- [x] Run `pnpm check`
- [x] Run `pnpm audit:secrets`
- [x] Run `pnpm dashboard:e2e`
- [x] Run `pnpm verify:workspace`
- [x] Run `git diff --check`

Stop point:

`HERMES ADAPTIVE COMMAND GATEWAY V0.2 READY - FAST ACK QUEUE DRY-RUN - WAITING FOR GATEWAY RELOAD APPROVAL`
