---
title: "SIRINX Local Proposal Draft Phase 7"
created: 2026-05-19
status: active
system: SIRINX
tags:
  - sirinx/proposal-draft
  - command-center
  - sales-engineering
---

# SIRINX Local Proposal Draft Phase 7

## Scope

Create a read-only local proposal draft preview from Command Center readiness data.

## Implemented

- `services/dev-control-api/src/proposal-draft.mjs` combines `/api/lead-health`, `/api/sales-artifacts`, and the Obsidian proposal template into a local markdown preview.
- `GET /api/proposal-draft` returns draft markdown, readiness, review gates, and next actions with `externalWrites=false`.
- `apps/dev-dashboard/src/index.html` adds the Draft Preview panel.
- `apps/dev-dashboard/src/app.js` renders the local markdown preview and draft readiness summary.
- Playwright coverage verifies the panel and API contract.

## Safety Boundary

- The endpoint is read-only.
- No proposal file is written automatically.
- No CRM write.
- No customer message.
- No production lead POST.
- No Cloudflare deploy.
- No Supabase/Solis/Telegram/LINE action.

## Required Review Before External Use

- PEA Smartlist exact inverter verification.
- Customer bill/load evidence.
- Site survey assumptions.
- Proposal math review.
- Explicit target path approval before writing a local proposal file.

## Next Phase

Add an operator-gated local file writer for proposal drafts after target path confirmation.
