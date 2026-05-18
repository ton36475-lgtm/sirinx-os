---
title: "SIRINX ROI Enriched Proposal Draft Phase 10"
status: implemented
system: SIRINX
phase: 10
tags:
  - sirinx/proposal
  - sirinx/roi
  - sirinx/obsidian
---

# SIRINX ROI Enriched Proposal Draft Phase 10

## Objective

Close the local sales-engineering loop by embedding ROI preview evidence directly into the local proposal draft markdown.

## Scope

- `GET /api/proposal-draft` now reads `/api/roi-preview` logic internally.
- Proposal draft markdown includes a local ROI planning section.
- The draft includes weak, realistic, and best savings cases with self-consumption, captured kWh, monthly savings, and simple payback.
- The response exposes `roiPreview` metadata for dashboard and tests.
- Local proposal file writing remains gated through `confirmLocalWrite=true`.

## Guardrails

- ROI values are planning estimates, not guarantees.
- Customer-facing use still requires bill evidence, load profile, roof and shading survey, phase/load-panel verification, export-limit review, PEA Smartlist exact inverter verification, and senior review.
- No production lead POST, CRM write, customer message, Cloudflare write, Supabase write, Solis action, Telegram/LINE send, or external SaaS write is allowed in this phase.

## Test Matrix

- `pnpm verify`
- `GET /api/proposal-draft` smoke test for ROI metadata
- `POST /api/proposal-draft/write` dry run
- One local Obsidian write smoke test
- `pnpm dashboard:test`
- `pnpm dashboard:e2e`
- Strict secret scan
- Git diff check

## Next Phase

Add a local proposal review checklist that records whether ROI evidence, site-survey evidence, PEA approval evidence, and customer-message approval are complete before any external send.
