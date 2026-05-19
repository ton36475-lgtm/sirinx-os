---
title: "SIRINX Lead Qualification Status Phase 4"
created: 2026-05-19
status: active
system: SIRINX
tags:
  - sirinx/lead-qualification
  - command-center
  - sales-engineering
---

# SIRINX Lead Qualification Status Phase 4

## Scope

Add a local-only lead qualification model that maps incoming lead payloads into workflow lane, priority, package lane, and next action.

## Implemented

- `services/dev-control-api/src/lead-qualification.mjs` classifies leads without CRM writes or customer sends.
- `services/dev-control-api/src/lead-health.mjs` runs the qualification model against the local mock lead probe and exposes it in `GET /api/lead-health`.
- `apps/dev-dashboard/src/app.js` renders qualification status in Capture Health.
- `services/dev-control-api/src/lead-qualification.test.mjs` verifies high-intent, nurture, and missing-contact cases.
- `package.json` `verify` now syntax-checks the qualification module.

## Model Version

Superseded by `2026-05-20.lead-qualification.v2`.

See `SIRINX_LEAD_QUALIFICATION_V2_STATUS_2026-05-20.md`.

## Output Fields

- `score`
- `priority`
- `workflowLane`
- `packageLane`
- `monthlyBill`
- `wantsBackupOrBattery`
- `contactChannelCount`
- `trafficStatus`
- `solarSegment`
- `attribution`
- `reasons`
- `riskFlags`
- `nextAction`
- `reviewGates`

## Safety Boundary

- `externalWrites` is always `false`.
- CRM writes remain blocked until target workspace/list approval.
- Customer messages remain blocked until recipient and send approval are explicit.
- Qualification is not a quote; PEA inverter verification and site assumptions are still required before proposal release.

## Next Phase

Wire local lead qualification into the 47 Ronin profile lanes and Obsidian sales dashboard without writing to external CRM.
