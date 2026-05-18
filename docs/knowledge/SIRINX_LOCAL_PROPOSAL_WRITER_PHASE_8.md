---
title: "SIRINX Local Proposal Writer Phase 8"
status: implemented
system: SIRINX
phase: 8
tags:
  - sirinx/command-center
  - sirinx/proposal-writer
  - sirinx/obsidian
---

# SIRINX Local Proposal Writer Phase 8

## Objective

Enable the Command Center to write a customer-proposal draft as a local Obsidian markdown file after an explicit local-write confirmation.

## Scope

- Adds `POST /api/proposal-draft/write`.
- Writes only under `/Users/sirinx/Documents/Obsidian Vault/SIRINX/05_PROJECTS/Proposal Drafts`.
- Uses exclusive file creation so an existing proposal draft is never overwritten.
- Keeps `externalWrites=false`, `productionWrites=false`, and `customerVisible=false`.
- Leaves the public website, live background graphics, Cloudflare config, CRM, Telegram, LINE, Supabase, and Solis untouched.

## Gate Model

1. `GET /api/proposal-draft` produces a local preview.
2. `POST /api/proposal-draft/write` with `{ "dryRun": true }` returns the target path and byte count without writing.
3. `POST /api/proposal-draft/write` with `{ "confirmLocalWrite": true }` creates the local markdown draft.
4. Customer-facing quote, CRM write, customer message, and production lead POST remain separate approval gates.

## Test Matrix

- Syntax verification through `pnpm verify`.
- Dashboard smoke verification through `pnpm dashboard:test`.
- Browser e2e verification through `pnpm dashboard:e2e`.
- API dry-run verification for `/api/proposal-draft/write`.
- One local write smoke test to Obsidian proposal drafts.
- Secret scan on touched files before commit.

## Next Phase

Wire the local proposal draft to a reviewed ROI calculation input form. The form must remain local-only until production lead write, CRM sync, and customer messaging gates are separately approved.
