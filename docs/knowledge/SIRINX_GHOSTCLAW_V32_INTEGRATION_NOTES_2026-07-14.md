# GHOSTCLAW HERMES V3.1/V3.2 Integration Notes
**Date:** 2026-07-14
**Status:** SUPERSEDED BY HERMES V5 - LEGACY REFERENCE ONLY

## Spec Received

### V3.1 - Build Masterprompt
- **Language:** Rust Cargo workspace (P099)
- **Crates:** hermes-core, hermes-worker, hermes-governance, hermes-lock, hermes-router, hermes-dispatch
- **D1 Schema:** tasks, transitions (hash chain), approvals, cost_ledger
- **State Machine:** INTAKE → TRIAGE → MAKER ⇄ CHECKER → GUARD → dispatch
- **Tiers:** LOW (auto), MED (15min abort), HIGH (human gate)
- **Build Phases:** P1-P6

### V3.2 - Fullstack Upgrade
- **Part A:** Telegram inline keyboards (2-tap HIGH approve), rich status
- **Part B:** Web Mission Control dashboard (Cloudflare Pages + DO FeedHub)
- **Part C:** Hardening (idempotency, outbox, circuit breakers, rate limits)
- **Part D:** Build phases P7-P11

## Current Artifacts Status

| Component | Status | File Location |
|-----------|--------|-------------|
| Phase 5A Orchestration | Archived prototype | `legacy/langgraph-nodes/` |
| Durable Object Mutex | Archived prototype | `legacy/StateLockerDo.ts` |
| Local Bridge Daemon | Archived prototype | `legacy/local_bridge_daemon.py` |
| Telegram Gateway Node | Archived prototype | `legacy/telegram-telemetry-gateway.ts` |

## Historical Next Steps

- Do not execute this V3.2 plan. Use
  `docs/plans/GHOSTCLAW_HERMES_V5_MIGRATION_PHASES.md`.
- **Dashboard:** Create Cloudflare Pages static site
- **Outbox Pattern:** Add to D1 schema
- **Inline Keyboards:** Implement 2-tap approval flow

---

**Safety Constraints Maintained:**
- No deploy/push without approval
- No cloud mutation without approval
- Tier B/C work only (docs, templates, local infrastructure)
