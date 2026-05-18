---
title: "SIRINX Local ROI Preview Phase 9"
status: implemented
system: SIRINX
phase: 9
tags:
  - sirinx/roi
  - sirinx/command-center
  - sirinx/sales-engineering
---

# SIRINX Local ROI Preview Phase 9

## Objective

Add a local ROI assumption preview to the Command Center so sales engineering can test monthly bill, daytime usage, backup priority, and phase assumptions before writing or sending any customer proposal.

## Scope

- Adds `GET /api/roi-preview` for the current local lead probe.
- Adds `POST /api/roi-preview` for local assumption recalculation.
- Adds a Command Center ROI panel with editable planning assumptions and weak/realistic/best savings cases.
- Keeps every calculation local with `externalWrites=false`, `productionWrites=false`, and `customerVisible=false`.

## Model Rules

- On-grid packages are selected when backup priority is not high/critical.
- Hybrid packages are selected when backup priority is high/critical.
- Large 3-phase hybrid leads route to H-15 or H-20 when the monthly bill is above standard H-10 range.
- Savings are shown as weak, realistic, and best cases instead of a single promise.
- Payback remains an estimate and requires bill/load/site verification before external use.

## Review Gates

- PEA Smartlist exact inverter verification before customer-facing proposal.
- Real customer bill and load profile before quote.
- Roof, shading, phase type, and load-panel survey before final design.
- Senior engineer or sales engineer review before sending ROI math externally.

## Test Matrix

- `pnpm verify`
- `GET /api/roi-preview` smoke test
- `POST /api/roi-preview` custom H-10 smoke test
- `pnpm dashboard:test`
- `pnpm dashboard:e2e`
- Strict secret scan
- Git diff check

## Next Phase

Use this ROI preview to enrich the local proposal draft file with a reviewed savings table. Keep proposal file writes local-only until CRM, customer messaging, and production lead gates are explicitly opened.
