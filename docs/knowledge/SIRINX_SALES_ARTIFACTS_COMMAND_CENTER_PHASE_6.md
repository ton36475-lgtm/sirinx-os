---
title: "SIRINX Sales Artifacts Command Center Phase 6"
created: 2026-05-19
status: active
system: SIRINX
tags:
  - sirinx/sales-artifacts
  - command-center
  - obsidian
---

# SIRINX Sales Artifacts Command Center Phase 6

## Scope

Expose local Obsidian sales artifacts and proposal draft readiness inside the Command Center.

## Implemented

- `services/dev-control-api/src/sales-artifacts.mjs` inspects required local Obsidian sales artifacts.
- `GET /api/sales-artifacts` returns artifact readiness, proposal draft readiness, review gates, and next actions with `externalWrites=false`.
- `apps/dev-dashboard/src/index.html` adds the Sales Artifacts panel.
- `apps/dev-dashboard/src/app.js` renders artifact readiness, proposal draft status, and local next actions.
- Playwright coverage verifies the panel and API contract.

## Required Local Artifacts

- Sales Engineering Dashboard
- Lead Qualification Lane Database
- Residential Solar ESS Proposal Template
- Residential ESS Proposal Workflow
- Residential ESS Sales Qualification Workflow
- Solar ROI Assumption Database

## Safety Boundary

- No CRM write.
- No customer message.
- No production lead POST.
- No Cloudflare deploy.
- No Supabase/Solis/Telegram/LINE action.
- No secrets read.

## Next Phase

Add a local proposal draft builder that combines `/api/lead-health`, `/api/sales-artifacts`, and the Obsidian proposal template into a local markdown draft only.
