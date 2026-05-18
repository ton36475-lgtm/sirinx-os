---
title: "SIRINX Lead Intake Schema Status Phase 3"
created: 2026-05-19
status: active
system: SIRINX
tags:
  - sirinx/lead-backend
  - command-center
  - schema
---

# SIRINX Lead Intake Schema Status Phase 3

## Scope

Expose the public website lead intake contract as a read-only schema in the local Command Center.

## Implemented

- `infra/cloudflare/main-router/src/worker.js` now exports `getLeadIntakeSchema()`.
- `services/dev-control-api/src/lead-health.mjs` includes schema version, accepted payload shapes, required fields, contact channel fields, PII field count, DB columns, and review gates in `GET /api/lead-health`.
- `apps/dev-dashboard/src/app.js` renders lead schema status in the Capture Health panel.
- Browser and Worker tests assert the schema contract.

## Safety Boundary

- No production POST is added.
- Command Center still performs safe GET probes only.
- No D1 writes, Cloudflare deploys, DNS edits, Supabase calls, Solis calls, Telegram/LINE sends, or customer-visible actions are performed by this phase.

## Lead Schema Version

`2026-05-19.lead-intake.v1`

## Required Fields

- `name`
- one of `phone`, `email`, or `lineUserId`

## Accepted Payload Shapes

- plain JSON
- tRPC array batch
- tRPC numeric-keyed batch
- `input.json`

## Next Phase

Create a local-only lead qualification status model that maps lead source, monthly bill, system interest, and backup priority into sales workflow lanes without writing to production CRM.
