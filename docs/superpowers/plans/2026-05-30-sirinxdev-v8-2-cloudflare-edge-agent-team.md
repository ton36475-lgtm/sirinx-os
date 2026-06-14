# SIRINXDev v8.2 Cloudflare Edge Agent Team Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock SIRINXDev Unified Agent-Native OS v8.2 as an M2-first control node with a Cloudflare Edge Agent Team behind approval gates.

**Architecture:** Mac mini M2 owns command, memory, approvals, local queue, evidence, and scoped filesystem. Cloudflare is introduced as a private edge execution layer only after `PRE_APPROVAL_PACKET_CLOUDFLARE_DEV` is approved.

**Tech Stack:** Markdown governance docs, Cloudflare Workers/Agents SDK planning skeleton, Durable Objects, Workflows, Queues, D1, R2, Vectorize, AI Gateway, Access, Remote MCP design, pnpm verification.

---

### Task 1: Lock v8.2 Plan

**Files:**
- Create: `docs/knowledge/SIRINXDEV_UNIFIED_AGENT_NATIVE_OS_V8_2_CLOUDFLARE_EDGE_PLAN_2026-05-30.md`
- Create: `docs/grid/21-cloudflare-edge-agent-team-v8-2.md`
- Modify: `docs/grid/README.md`

- [ ] Add the v8.2 knowledge packet with architecture, phase lock, official Cloudflare docs anchors, node policy, and guardrails.
- [ ] Add the grid with Mermaid node topology and phase matrix.
- [ ] Link grid 21 from the grid README.

### Task 2: Add Cloudflare Planning Pack

**Files:**
- Create: `docs/cloudflare/CLOUDFLARE_AGENT_TEAM_RESEARCH.md`
- Create: `docs/cloudflare/CLOUDFLARE_SERVICE_MAP.md`
- Create: `docs/cloudflare/ACCESS_POLICY_PLAN.md`
- Create: `docs/cloudflare/MCP_PERMISSION_MATRIX.md`
- Create: `docs/cloudflare/CLOUDFLARE_RISK_REGISTER.md`
- Create: `docs/cloudflare/DEPLOYMENT_APPROVAL_RUNBOOK.md`
- Create: `00_COMMAND_CENTER/PRE_APPROVAL_PACKET_CLOUDFLARE_DEV.md`

- [ ] Add the research packet and service map.
- [ ] Add Access, MCP, risk, and deployment approval docs.
- [ ] Add the draft approval packet with `NOT APPROVED` status.

### Task 3: Add Non-deployable Skeleton

**Files:**
- Create: `apps/cloudflare-agent-team/README.md`
- Create: `apps/cloudflare-agent-team/SECURITY.md`
- Create: `apps/cloudflare-agent-team/wrangler.toml.example`
- Create: `apps/cloudflare-agent-team/src/index.ts`
- Create: `apps/cloudflare-agent-team/src/db/schema.sql`
- Create: readmes under `src/agents`, `src/workflows`, `src/queues`, and `src/mcp`

- [ ] Add a placeholder Worker returning HTTP 501.
- [ ] Keep Wrangler config as `.example` only.
- [ ] Add schema draft with `agent_runs`, `approval_requests`, `audit_events`, `evidence_objects`, `memory_chunks`, and `cost_ledger`.

### Task 4: Update Local State

**Files:**
- Modify: `.hermes/context.md`
- Modify: `.hermes/state.json`
- Create: `.hermes/reports/SIRINXDEV_V8_2_CLOUDFLARE_EDGE_STATUS_2026-05-30.md`
- Modify: `/Users/sirinx/Documents/Obsidian Vault/SIRINX/AI HQ Knowledge Digest.md`

- [ ] Add v8.2 snapshot and state pointers.
- [ ] Record local-only status and blocked actions.
- [ ] Append concise Obsidian digest note.

### Task 5: Verify

Run:

```bash
node -e "JSON.parse(require('node:fs').readFileSync('.hermes/state.json','utf8')); console.log('state-json-ok')"
node --check apps/cloudflare-agent-team/src/index.ts
git diff --check
pnpm audit:secrets
pnpm check
```

Expected:

- State JSON parses.
- Placeholder Worker syntax checks.
- Diff has no whitespace errors.
- Secret scan returns no findings.
- Skeleton check returns ok.

