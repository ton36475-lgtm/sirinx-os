# EdgeOne Makers Deployment Strategy

**Part of:** GHOSTCLAW EdgeOne Readiness Worker (Phase 12)
**Status:** ACTIVE — Readiness Only (R3)

---

## 1. Overview

EdgeOne Makers deployment is tracked as a readiness-only status. No deployment, push, or cloud mutation is performed. The EdgeOne live API is never called.

This document defines the deployment levels, gates, and blocked actions for EdgeOne Makers.

## 2. Deployment Levels

| Level | Name | Action | Gate |
|-------|------|--------|------|
| R3 | Readiness | Check preparation, produce readiness report | Auto (read-only) |
| R4 | Preview Deploy | Deploy to preview environment | Requires deploy packet + separate gate |
| R5 | Production Deploy | Deploy to production environment | Explicit production gate only |

**Current level: R3 (Readiness Only)**

## 3. R3 — Readiness Checklist

- [ ] Project builds successfully (no-install validation)
- [ ] All tests pass
- [ ] No secrets in code
- [ ] No .env files staged
- [ ] EdgeOne project config exists
- [ ] Deploy packet template ready
- [ ] Smoke test template ready
- [ ] Rollback plan documented

R3 is a **read-only** check. It produces a readiness report and receipt. It does not deploy, push, or call any EdgeOne API.

## 4. R4 — Preview Deploy (Requires Deploy Packet + Separate Gate)

Preview deploy requires:

- Deploy packet (`edgeone-deploy-packet.json`) completed and validated
- All R3 readiness checks passed
- Validation results recorded
- Approval mode: `agent_quorum_approval` (Tier C)
- **Separate gate approval** — R3 readiness passing does NOT auto-trigger R4
- Smoke test receipt from preview environment

R4 is **not authorized** at this time. No deploy packet has been submitted for gate review.

## 5. R5 — Production Deploy (Explicit Production Gate Only)

Production deploy requires:

- All R4 preview checks passed
- Explicit human/operator **production gate** approval
- Rollback plan verified
- No auto-deploy under any mode
- Production gate is a separate, explicit approval — R4 preview passing does NOT auto-trigger R5

R5 is **not authorized** at this time.

## 6. Blocked Actions

- **Do NOT deploy now**
- **Do NOT push to production**
- **Do NOT mutate cloud resources**
- **Do NOT call EdgeOne live API**
- **Do NOT read secrets or tokens**

These blocks are immutable and cannot be overridden by policy gate, MoA vote, or autonomy escalation.

## 7. EdgeOne Deployment Packet

Template: `.ghostclaw_runtime/a2a2a/templates/edgeone-deploy-packet.json`

Fields:
- `schema` — `ghostclaw.edgeone.deploy_packet.v1`
- `project_id` — EdgeOne project identifier
- `environment` — `preview` | `production`
- `revision` — git commit hash
- `readiness_checks` — all R3 checks (build, tests, no secrets, no env files, EdgeOne config)
- `approval_mode` — `agent_quorum_approval`
- `approval_tier` — `C`
- `rollback_plan` — strategy, rollback revision, tested flag
- `smoke_test_receipt_path` — path to smoke test receipt
- `timestamp` — ISO timestamp

The deploy packet template is a **template only**. It is not pre-filled with live data and does not trigger deployment.

## 8. EdgeOne Smoke Test Receipt

Template: `.ghostclaw_runtime/a2a2a/templates/edgeone-smoke-test-receipt.json`

Fields:
- `schema` — `ghostclaw.edgeone.smoke_test_receipt.v1`
- `project_id` — EdgeOne project identifier
- `environment` — `preview` | `production`
- `url` — preview/production URL
- `http_status` — HTTP response status code
- `response_time_ms` — response time in milliseconds
- `console_errors` — array of console error strings
- `page_errors` — array of page error strings
- `timestamp` — ISO timestamp
- `passed` — boolean pass/fail

The smoke test receipt template is a **template only**. No live smoke test has been run.

## 9. EdgeOne Readiness Worker

The readiness worker is implemented in `GHOSTCLAW/workers/edgeone/edgeone-readiness-worker.mjs`.

It operates at R3 (readiness only) and:

- Checks all readiness fields from project config
- Produces a readiness receipt JSON
- Stores receipt in `.ghostclaw_runtime/a2a2a/receipt/`
- Returns status `ready` or `not_ready`
- Sets `do_not_deploy: true` in all receipts
- Never calls EdgeOne live API
- Never deploys or pushes

## 10. Canonical Terminology

- `brainstorm` = canonical
- `beststorm` = deprecated legacy alias
- `beststrom` = invalid typo