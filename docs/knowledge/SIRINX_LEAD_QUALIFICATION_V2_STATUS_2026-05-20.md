---
title: "SIRINX Lead Qualification V2 Status"
created: 2026-05-20
status: active
system: SIRINX
tags:
  - sirinx/lead-qualification
  - sirinx/marketing-crm
  - command-center
  - sales-engineering
---

# SIRINX Lead Qualification V2 Status

## Scope

Upgrade the local-only lead qualification model with controlled marketing/CRM learnings from the old GitHub repos while keeping every external write blocked.

## Implemented

- Model version changed to `2026-05-20.lead-qualification.v2`.
- Added deterministic `reasons` so sales can see why a lead was scored.
- Added `riskFlags` for missing contact channels, unknown device type, and test/preview/bot/localhost-like traffic.
- Added `trafficStatus` as `trusted`, `review`, or `suspicious`.
- Added `solarSegment` for SIRINX-specific segmentation:
  - `large-home-office-hybrid-bess`
  - `large-home-office-on-grid`
  - `high-load-home-hybrid`
  - `high-load-home-on-grid`
  - `residential-hybrid`
  - `residential-on-grid`
  - `starter-backup-hybrid`
  - `starter-on-grid`
- Added `attribution` fields for UTM/referrer/landing-page/device context without writing CRM data.

## Source Patterns Used

| Source repo | Pattern used | SIRINX rewrite |
| --- | --- | --- |
| `chokma-growth-os` | UTM-aware lead quality and risk flags | Rewritten for solar/ESS, no lottery/VIP/casino language. |
| `automated-marketing-agency` | Campaign and lead scoring separation | Kept as attribution and local scoring only. |
| Current `sirinx-os` | Package lanes, ESS intent, safety gates | Preserved and expanded. |

## Safety Boundary

- `externalWrites=false`.
- No CRM write.
- No Telegram/LINE send.
- No Supabase write.
- No production lead POST.
- No customer-visible claim or quote.
- No raw secrets or `.env` access.

## Validation

Local unit tests:

```bash
pnpm exec vitest run services/dev-control-api/src/lead-qualification.test.mjs
```

Expected coverage:

- high-bill hybrid assessment lead
- low-information education lead
- missing contact channel
- UTM-qualified high-load home office lead
- suspicious preview/bot-like traffic

## Next Phase

Expose `trafficStatus`, `riskFlags`, and `reasons` more visibly in Command Center sales/lead panels, then add a local lead-event proposal before any CRM write.
