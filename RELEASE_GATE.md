# RELEASE_GATE

Date: 2026-06-28
Mode: local release gate checklist
External writes: blocked by default

## Additional Pocket Hatchery Gates

| Gate | Requirement | Evidence |
| --- | --- | --- |
| 11 No gambling | No paid randomness / loot box / cash-out / real-money prize pool | `apps/pocket-hatchery/contracts/contract_actions.md` |
| 12 Public signer | `waxwing` remains office-internal | `apps/pocket-hatchery/web/wallet_flow.md` |
| 13 Testnet first | Deploy only to testnet before mainnet | `apps/pocket-hatchery/ops/release_gate_evidence.md` |
| 14 Pause/unpause | Emergency stop documented and tested | `WORKSPACE_SCAFFOLD/tests/test_pause_unpause.py` |

## Purpose

This file defines the minimum release gate before any SIRINX OS change can move from local work into an external target such as GitHub, Cloudflare, Supabase, Telegram, LINE, Solis, Notion, ClickUp, Google Drive, or production website routes.

## Gate Order

| Gate | Requirement | Evidence |
| --- | --- | --- |
| 01 Scope | Exact target and allowed paths are known | Task text, changed files |
| 02 Safety | No `.env`, token, key, credential, keystore, raw chat, or customer private data | Secret scan, review |
| 03 Local tests | Relevant unit/API/UI checks pass | Test command output |
| 04 Diff review | Changed files match scope | `git status`, `git diff --check` |
| 05 External preflight | External gates remain blocked or explicitly approved | `pnpm external-gates:check` |
| 06 Obsidian memory | Summary-only note recorded when work affects operating process | Digest entry |
| 07 Commit | Atomic local commit exists | Commit hash |
| 08 External approval | Exact target approval exists | Approval packet |
| 09 External execution | Mutation is run only after Gate 08 | Command log |
| 10 Smoke/rollback | External result and rollback path are verified | Smoke test and rollback note |

## Absolute Stops

- No deploy, push, DNS, Cloudflare mutation, Supabase write, CRM write, Telegram/LINE send, Solis call, production lead POST, migration, or customer-visible message without exact target approval.
- No secret or private credential may be printed into logs, docs, Obsidian, Command Center, or chat.
- Broad approval does not override missing target evidence.
