# BROWSER_USE GHOSTCLAW Worker

**Phase:** 4 — Browser Use Worker
**Status:** Active (local dashboard smoke testing only)
**Autonomy Level:** A4 (Bounded agent)
**Owner:** Hermes Commander
**Policy:** `GHOSTCLAW/workers/browser-use/browser-use.policy.yaml`
**Parent Policy:** `GHOSTCLAW/policies/autonomous-safe-execution-v3.yaml`

---

## 1. Overview

The Browser Use Worker is a bounded browser automation agent within the GHOSTCLAW system. It performs smoke testing against the local GHOSTCLAW dashboard at `http://127.0.0.1:8721` using Playwright or the `browser-use` Python package.

The worker follows the A2A2A authority chain: it reports to the Codex Build Captain, which reports to the Hermes Commander. It does not communicate directly with other workers.

### Canonical Terminology

| Term | Status |
|---|---|
| brainstorm | **Canonical** — use in all outputs |
| beststorm | Legacy alias — accepted inbound, normalized to `brainstorm` |
| beststrom | **Invalid typo** — rejected on inbound |

---

## 2. Architecture

```
┌─────────────────────────────────┐
│       Vibe Agent Router         │
│          (Phase 5)              │
└──────────┬──────────────────────┘
           │ routes browser task
           ▼
┌─────────────────────────────────┐
│     Browser Use Worker          │
│  browser-use-worker.mjs         │
│                                 │
│  1. Detect browser-use          │
│  2. Detect Playwright           │
│  3. Validate action vs policy   │
│  4. Run smoke workflow          │
│  5. Write receipt               │
│  6. Append AUTONOMOUS_RUN_LOG   │
└──────────┬──────────────────────┘
           │ receipt
           ▼
┌─────────────────────────────────┐
│     Receipts Directory           │
│  GHOSTCLAW/workers/browser-use/  │
│  receipts/                       │
│  receipts/screenshots/           │
└─────────────────────────────────┘
```

---

## 3. Files

| File | Purpose |
|---|---|
| `GHOSTCLAW/workers/browser-use/browser-use-worker.mjs` | Main worker module — detects deps, validates actions, runs smoke, writes receipts |
| `GHOSTCLAW/workers/browser-use/browser-use.policy.yaml` | Policy file — allowed and blocked actions, dependency rules |
| `GHOSTCLAW/workers/browser-use/browser-use-smoke.mjs` | Standalone smoke test script targeting `http://127.0.0.1:8721` |

---

## 4. Dependencies

The worker checks for two browser automation packages. Neither is auto-installed.

### Playwright (Node.js or Python)

```bash
# Node.js
pnpm add -D playwright
npx playwright install chromium

# Python
pip install playwright
playwright install chromium
```

### browser-use (Python)

```bash
pip install browser-use
# Requires Python 3.10+
```

### Missing Dependencies

If neither package is available:
- Worker status is set to `setup_required`
- Setup instructions are written to the receipt
- No installation is performed
- AUTONOMOUS_RUN_LOG.md is updated with the setup requirement

---

## 5. Allowed Actions

| Action | Tier | Description |
|---|---|---|
| `open_url` | A | Navigate to a local dashboard URL |
| `capture_page` | A | Take a screenshot |
| `safe_click` | B | Click on body or non-sensitive elements |
| `visible_text_check` | A | Extract and verify visible text |
| `console_error_capture` | A | Capture browser console errors |
| `write_smoke_receipt` | B | Write receipt JSON |
| `append_run_log` | B | Append to AUTONOMOUS_RUN_LOG.md |
| `detect_dependencies` | A | Check for browser-use and Playwright |
| `generate_setup_instructions` | A | Generate setup instructions for missing deps |

---

## 6. Blocked Actions

| Action | Tier | Reason |
|---|---|---|
| `login_with_credentials` | X | Credentials must never be entered by automation |
| `payment` | X | Payments require human approval and execution |
| `security_setting_change` | X | Settings changes can lock out or expose system |
| `private_data_scraping` | X | PII must never be extracted by automation |
| `captcha_bypass` | X | Anti-abuse bypass is prohibited |
| `rate_limit_bypass` | X | Anti-abuse bypass is prohibited |
| `customer_send_flow` | X | External communication requires human approval |
| `telegram_live_send` | X | External communication requires human approval |

Every blocked action produces a receipt with:
- `status: "blocked"`
- `reason` explaining the block
- `safe_replacement` action recommendation

---

## 7. Smoke Workflow

The smoke workflow runs the following steps sequentially:

1. **Detect dependencies** — Check for Playwright and browser-use
2. **Launch browser** — Headless Chromium
3. **Open URL** — Navigate to `http://127.0.0.1:8721`
4. **Capture screenshot** — Full-page PNG saved to `receipts/screenshots/`
5. **Safe click** — Click on `body` element (non-destructive)
6. **Visible text check** — Extract and verify text content exists
7. **Console error capture** — Collect any console errors during the session
8. **Write receipt** — JSON receipt with all step results
9. **Append run log** — Summary line in AUTONOMOUS_RUN_LOG.md

### Receipt Statuses

| Status | Meaning |
|---|---|
| `ready` | Dependencies available, worker ready |
| `running` | Smoke workflow in progress |
| `completed` | Smoke workflow finished (check overall) |
| `pass` | All steps passed |
| `pass_with_warnings` | All steps passed but warnings exist (e.g., console errors) |
| `failed` | One or more steps failed |
| `blocked` | Action was blocked by policy |
| `setup_required` | Dependencies missing — setup instructions written |
| `partial` | Some dependencies available but not all |

---

## 8. Usage

### Via Import

```javascript
import { main, checkWorkerStatus, runSmokeWorkflow } from './browser-use-worker.mjs';

// Check status
const status = await checkWorkerStatus();

// Run smoke test
const result = await main({ url: 'http://127.0.0.1:8721' });

// Dry run
const dryRun = await main({ dryRun: true });
```

### Via CLI

```bash
# Run smoke test against default dashboard
node GHOSTCLAW/workers/browser-use/browser-use-worker.mjs

# Run against specific URL
node GHOSTCLAW/workers/browser-use/browser-use-worker.mjs --url http://127.0.0.1:3000

# Dry run (check status only)
node GHOSTCLAW/workers/browser-use/browser-use-worker.mjs --dry-run

# Run standalone smoke script
node GHOSTCLAW/workers/browser-use/browser-use-smoke.mjs
```

---

## 9. Safety Inheritance

This worker inherits all safety rules from:

- `AGENTS.md` (root) — no deploy, no push, no secrets, no cloud mutation
- `GHOSTCLAW/AGENTS.md` — no cross-lane writes, no worker-to-worker direct comms
- `GHOSTCLAW/policies/autonomous-safe-execution-v3.yaml` — Tier A/B auto-execute, Tier X hard-block

Additional worker-specific rules:
- Only local dashboard URLs permitted (127.0.0.1, localhost)
- Headless mode required
- No browser cookies or sessions persisted between runs
- Screenshots stored locally only
- No external transmission of any captured data

---

## 10. Integration with Vibe Agent (Phase 5)

The Vibe Agent Router can route browser-related tasks to the Browser Use Worker. The router checks:

1. Task graph contains a `browser_smoke` or `dashboard_verify` task type
2. Action validation passes against `browser-use.policy.yaml`
3. Dependencies are available (status = `ready` or `partial`)

If dependencies are missing, the Vibe Agent receives the `setup_required` receipt and can surface it to the human operator.

---

## 11. Audit Trail

Every smoke run produces:
- A JSON receipt in `GHOSTCLAW/workers/browser-use/receipts/`
- A screenshot in `GHOSTCLAW/workers/browser-use/receipts/screenshots/`
- A summary line in `AUTONOMOUS_RUN_LOG.md`

Receipts contain:
- `receipt_id` / `smoke_id` — unique identifier
- `worker_id` / `worker_version` — worker identification
- `timestamp` — ISO 8601
- `status` / `overall` — result summary
- `steps` — per-step results
- `console_errors` — captured errors
- `autonomy_level` — A4