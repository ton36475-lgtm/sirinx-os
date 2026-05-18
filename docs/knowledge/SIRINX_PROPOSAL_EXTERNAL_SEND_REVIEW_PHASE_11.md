---
title: "SIRINX Proposal External Send Review Phase 11"
status: implemented
system: SIRINX
phase: 11
tags:
  - sirinx/proposal
  - sirinx/review-gate
  - sirinx/command-center
---

# SIRINX Proposal External Send Review Phase 11

## Objective

Make the Command Center explicitly show whether a local proposal can move toward external send, CRM write, customer message, or production lead workflow.

## Scope

- Adds `GET /api/proposal-review`.
- Adds a Command Center `External Send Review` panel.
- Separates local workflow readiness from external-send readiness.
- Shows which items are complete and which still block external send.
- Keeps `externalWrites=false`, `productionWrites=false`, `customerVisible=false`, and `canSendExternally=false`.

## Checklist Categories

### Local Workflow Evidence

- Lead backend local self-test.
- Sales artifacts readiness.
- ROI preview readiness.
- Proposal draft preview readiness.

### External-Send Blockers

- Customer bill and load evidence.
- Site survey evidence.
- PEA Smartlist exact inverter verification.
- Proposal math review.
- CRM target approval.
- Customer message approval.
- Production lead POST smoke approval.

## Gate Behavior

The local workflow may be ready while external send stays blocked. This is intentional. The system must not infer customer-facing approval from local draft generation, broad operator approval, or a successful dashboard test.

## Test Matrix

- `pnpm verify`
- `GET /api/proposal-review` smoke test
- Dashboard smoke test
- Browser e2e desktop/mobile
- Strict secret scan
- Git diff check

## Next Phase

Add a local review packet writer that can generate a human-readable release packet in Obsidian. That packet should be used before any CRM write, customer send, production POST, or external SaaS mutation.
