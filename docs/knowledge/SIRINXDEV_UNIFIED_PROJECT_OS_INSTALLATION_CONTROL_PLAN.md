# SIRINXDev Unified Project OS Installation Control Plan

Date: 2026-05-20
Status: controlled installation plan
Scope: docs-first implementation path for Unified Project OS

## Purpose

This plan converts the Unified Project OS architecture into safe, sequential implementation work. It prevents the team from skipping into production-like changes before the local control plane, evidence intake, and release gates prove readiness.

## Non-Negotiable Controls

- `www.sirinx.co` remains the public company website.
- Internal dashboards remain local or Access-protected.
- No Cloudflare, DNS, GitHub push, database migration, Telegram/LINE send, SolisCloud call, or paid API call without exact approval.
- No `.env` reads.
- No secret values in docs, Obsidian, test output, or commits.
- No raw chain-of-thought storage.
- All external gates must have evidence under `docs/knowledge/external-gates/evidence/`.

## Phase 0 - Baseline Freeze

Goal:

- Confirm current state before new architecture work.

Commands:

```bash
cd /Users/sirinx/sirinx-os
git status --short --branch
pnpm verify
pnpm dashboard:e2e
pnpm external-gates:check
pnpm external-gates:evidence-check
```

Expected:

- `sirinx-os` clean before changes
- public website repo clean
- external gate hard failures `0`
- evidence check has `unsafe=0`

## Phase 1 - Docs-First File Stack

Goal:

- Draft the proposed operating files without replacing canonical `AGENTS.md`.

Outputs:

- `docs/knowledge/SIRINXDEV_PROJECT_STATE_SCHEMA.md`
- `docs/knowledge/SIRINXDEV_NEXT_ACTIONS_QUEUE_SCHEMA.md`
- `docs/knowledge/SIRINXDEV_CODEX_RULES_PROJECTION.md`
- `docs/knowledge/SIRINXDEV_MCP_MAP_PROJECTION.md`
- `docs/knowledge/SIRINXDEV_SKILLS_AND_TOOLS_REGISTRY_PROPOSAL.md`

Exit:

- docs pass review
- no runtime changes

## Phase 2 - Hermes Inbox Design

Goal:

- Define Hermes intent ingress before implementation.

Outputs:

- route contract: `POST /hermes/inbox`
- request/response schema
- HMAC/signature strategy
- audit event schema
- local dry-run test plan

Blocked until:

- Telegram/LINE evidence is ready for real channel tests

## Phase 3 - thClaws Adapter Verification

Goal:

- Verify real thClaws capabilities before building around assumptions.

Required evidence:

- installed binary path
- version command output
- dry-run health command
- network behavior
- sandbox behavior
- log/audit output

Outputs:

- adapter contract
- runtime capability matrix
- disabled-by-default config

## Phase 4 - Async Core

Goal:

- Build local async job primitives only after runtime behavior is known.

Minimum primitives:

- idempotency key
- bounded retries
- timeout
- cancellation
- signed callback
- structured audit event

Tests:

- duplicate request returns same job reference
- failed job retries within bounds
- cancelled job stops
- callback signature validation fails closed

## Phase 5 - Release Gate 00-10 Dashboard

Goal:

- Render the 10-gate release model in Command Center.

Rules:

- gate 09 remains human-only
- external writes remain disabled
- current four external gates remain separate and visible

Tests:

- desktop E2E
- mobile E2E
- offline fallback
- no public production endpoints exposed

## Phase 6 - SOC Local Event Trail

Goal:

- Record local events for approvals, denied actions, dry-run checks, and gate results.

Start with:

- local JSON/markdown audit events
- no external SOC database
- no third-party scanning

## Phase 7 - Controlled Integrations

Order:

1. Codex Mobile QR/MFA evidence
2. Telegram recipient/token evidence
3. LINE OA evidence if in scope
4. Solis consent/station mapping evidence
5. Cloudflare Bot/WAF permission evidence

Only one integration should move from blocked to ready at a time.

## Phase 8 - Staging And Production Review

Before any production-like action:

- all relevant tests pass
- rollback plan exists
- evidence intake ready
- human approval recorded
- no secret appears in diff or logs

## Standard Validation Command Set

```bash
cd /Users/sirinx/sirinx-os
pnpm verify
pnpm dashboard:e2e
pnpm external-gates:check
pnpm external-gates:evidence-check
pnpm external-gates:write
git diff --check
```

## Current Stop Condition

The architecture is documented and locally controllable, but real external execution remains blocked until the evidence files for the four current gates are completed:

- Codex Mobile QR/MFA
- Telegram/LINE recipient/token
- Solis read-only telemetry consent and mapping
- Cloudflare Bot Management review

