# Next Phase Master Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans after exact approval. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Advance SIRINX Godmode from local evidence/control-plane readiness into the next implementation phase without using exposed secrets or mutating external systems.

**Architecture:** The next phase is split into P0 containment, P1 local display, P2 evidence gates, P3 source implementation, and P4 external activation. Hermes remains the orchestrator, Validator Shield remains mandatory, and every live/external action remains approval-gated.

**Tech Stack:** pnpm workspace, Node.js local API, static dashboard, Vitest, Playwright, Hermes reports, Obsidian notes.

---

## File Structure

- `docs/knowledge/SIRINX_SECRET_EXPOSURE_ROTATION_RUNBOOK_2026-05-28.md` records secret exposure response without values.
- `.hermes/reports/NEXT_PHASE_MASTER_PLAN_2026-05-28.md` records the actionable next phase state.
- `docs/superpowers/plans/2026-05-28-next-phase-master-plan.md` is this execution plan.
- `.hermes/context.md` and `.hermes/state.json` track phase state.
- Obsidian continuation board and digest mirror the current stop point.

## Task 1: P0 Secret Exposure Containment

**Files:**
- Read: `docs/knowledge/SIRINX_SECRET_EXPOSURE_ROTATION_RUNBOOK_2026-05-28.md`
- Update only after human evidence: relevant external-gate evidence files under `docs/knowledge/external-gates/evidence/`

- [ ] **Step 1: Revoke exposed provider tokens**

Human action in provider dashboards. Do not use Codex to paste or test raw token values.

Expected: every exposed token is revoked or decommissioned.

- [ ] **Step 2: Record non-secret rotation evidence**

Allowed evidence format:

```text
Provider:
Old token revoked: yes
New token created: yes/no/not needed
Scope:
Storage path:
Owner:
Rotation timestamp:
Smoke test approved: no
```

Expected: no raw token values.

- [ ] **Step 3: Verify local repo is clean of stored secrets**

Run:

```bash
pnpm audit:secrets
```

Expected: `ok: true` and `findings: []`.

## Task 2: P1 Local n8n MCP Permission Display

**Approval required:**

```text
APPROVE_IMPLEMENTATION for n8n permission policy display
```

**Files after approval:**
- Modify: `services/dev-control-api/src/*`
- Modify: `services/dev-control-api/server.mjs`
- Modify: `apps/dev-dashboard/src/app.js`
- Modify: `apps/dev-dashboard/src/index.html`
- Modify: `apps/dev-dashboard/src/styles.css`
- Test: `services/dev-control-api/src/*test.mjs`
- Test: `tests/browser/dev-dashboard.spec.mjs`

- [ ] **Step 1: Add failing API test**

Expected API projection:

```json
{
  "id": "n8n-mcp-permission-policy",
  "status": "locked-local-only",
  "mcpRegistered": false,
  "canExecuteWorkflow": false,
  "canReadCredentials": false
}
```

- [ ] **Step 2: Implement minimal local API projection**

No n8n credentials, workflow reads, MCP registration, or network mutation.

- [ ] **Step 3: Add dashboard panel**

Display:

- `LOCKED / LOCAL-ONLY`
- allowed classes
- blocked classes
- exact approval phrases

- [ ] **Step 4: Verify**

Run:

```bash
pnpm audit:secrets
git diff --check
pnpm check
pnpm verify:workspace
```

Expected: all pass.

## Task 3: P2 External Evidence Gates

**Files:**
- Update: `docs/knowledge/external-gates/evidence/*.md`

- [ ] **Step 1: Pick one gate**

Recommended first gate:

```text
cloudflare-bot-management-review
```

Reason: latest evidence check shows only one missing item: zone and permission scope.

- [ ] **Step 2: Fill only non-secret evidence**

Do not add token values.

- [ ] **Step 3: Run evidence check**

```bash
pnpm external-gates:evidence-check
```

Expected: selected gate moves closer to `ready-for-human-review`.

## Task 4: P3 Agent Repo Lab Intake

**Approval required before clone:**

```text
APPROVE_AGENT_REPO_LAB_CLONE
```

- [ ] **Step 1: Create metadata intake packet**

Allowed before clone:

- repo URL
- purpose
- license
- language
- install files present from public metadata
- risk class

- [ ] **Step 2: Shallow clone after approval only**

Target:

```text
vendor/agent-lab
```

No installers. No third-party code execution.

## Task 5: P4 Monorepo Phase 0 Scaffold

**Approval required:**

```text
APPROVE_IMPLEMENTATION for monorepo phase 0 scaffold
```

- [ ] **Step 1: Re-run secret scan**

```bash
pnpm audit:secrets
```

- [ ] **Step 2: Create or update phase-0 inventory docs**

Required outputs:

- repo inventory
- dependency matrix
- migration decisions
- security audit

- [ ] **Step 3: Verify**

```bash
git diff --check
pnpm verify:workspace
```

## Stop Rules

- Stop on raw secret value.
- Stop on provider/API call request.
- Stop on MCP activation request.
- Stop on deploy/push/publish request.
- Stop on source change without exact `APPROVE_IMPLEMENTATION for <target>`.

