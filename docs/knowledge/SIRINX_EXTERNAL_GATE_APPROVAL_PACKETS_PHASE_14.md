---
title: "SIRINX External Gate Approval Packets Phase 14"
status: implemented
system: SIRINX
phase: 14
tags:
  - sirinx/external-gates
  - sirinx/approval-phrases
  - sirinx/command-center
---

# SIRINX External Gate Approval Packets Phase 14

## Objective

Generate exact approval phrases and action packets for every external gate before any external write can run.

## Scope

- Adds `GET /api/external-gate-packets`.
- Adds `POST /api/external-gate-packets/write`.
- Adds a Command Center `Approval Phrase Packets` panel.
- Writes local packet evidence only under `/Users/sirinx/Documents/Obsidian Vault/SIRINX/06_OPERATIONS/External Gate Approval Packets`.
- Keeps `externalWrites=false`, `productionWrites=false`, `customerVisible=false`, and `canExecuteNow=false`.

## Packet Set

- Gate 1: GitHub push and PR update.
- Gate 2: CodeRabbit review and autofix.
- Gate 3A: Cloudflare preview only.
- Gate 3B: Cloudflare production deploy.
- Gate 4: Codex Mobile QR/MFA pairing.
- Gate 5: Telegram/LINE target setup.
- Gate 6: OpenAI API key for Hermes/thClaws.
- Gate 7: Supabase/Postgres schema draft.
- Gate 8: Solis read-only telemetry.

## Required Fields

Each packet includes:

- target
- exact approval phrase
- action
- rollback
- verification commands
- stop rule

## Guardrail

These packets do not execute anything. They are local evidence and approval language only. Broad approval remains insufficient for external writes.

## Test Matrix

- `pnpm verify`
- `GET /api/external-gate-packets` smoke test
- `POST /api/external-gate-packets/write` dry-run
- One local Obsidian write smoke test
- `pnpm dashboard:test`
- `pnpm dashboard:e2e`
- Strict secret scan
- Git diff check

## Next Phase

Connect each external gate packet to a local audit preflight entry so a packet can be marked reviewed, blocked, or ready-for-targeted-approval without executing the external action.
