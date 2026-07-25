# GhostClaw Hermes V5 Migration Phases

**Status:** `PREFLIGHT_READY_EXECUTION_BLOCKED`
**Execution gate:** Tony must issue the exact `/approve` command before P1.
**Source:** `GHOSTCLAW_HERMES_GODMODE_UNIFIED_MASTERPROMPT_V5.md`, Part 10

This is the canonical V5 migration plan. The current checker lane validates
structure and safety only; it does not create crates, deploy, push, or start a
runtime.

## P1 - Workspace Bootstrap and Schema

- Target: `wasm32-unknown-unknown`
- Deliverable: create the planned Rust crates and enroll them in the workspace.
- Gate: active preflight manifest is valid and the explicit P1 approval exists.

## P2 - State Machine and Hash Chain

- Deliverable: bounded transition model and verifiable receipt chain.
- Gate: transition coverage and chain verification pass.

## P3 - Telegram Read-Only Commands

- Scope: status, queue, cost, logs, and audit previews.
- Gate: webhook authenticity and owner allowlist tests pass.

## P4 - Dispatch Engine

- LOW: policy-bounded execution.
- MED: Cloudflare Workflows v2 with sleep and event-wait steps.
- HIGH: explicit approval remains mandatory.

## P5 - AI Gateway Routing

- Scope: model ladder, cost caps, and route receipts.
- Gate: escalation and budget tests pass.

## P6 - Hardening

- No panic or unchecked unwrap on request paths.
- Secret scanning and static analysis are clean.
- Mission Control access uses Cloudflare Access.

## P7 - Telegram UX

- Scope: inline controls and two-step HIGH approval.
- Gate: nonce and replay protection pass.

## P8 - Outbox and Idempotency

- Scope: Workers KV idempotency keys and durable outbox records.
- Gate: duplicate delivery produces one effect.

## P9 - Read-Only Mission Control

- Target: Cloudflare Pages preview.
- Gate: non-owner access is rejected.

## P10 - Sandboxes Execution Lane

- Scope: R2 artifacts, Vectorize retrieval, and sandboxed code outputs.
- Gate: no unauthorized network or secret access.

## P11 - Preview Release Candidate

- Target: tag `hermes-v5.0.0-preview`.
- Gate: full local validation passes and the preview receipt is complete.
- Boundary: P11 ends at the preview tag. Production deployment is a separate
  gate and is not authorized by this plan.

## V5 Rebase Decisions

- Workflows v2 replaces the AbortWindow prototype.
- Cloudflare Access replaces the Telegram Login Widget proposal.
- AI Gateway, Analytics Engine, Vectorize, and Sandboxes are explicit lanes.
- Archived TypeScript and Python prototypes are compatibility evidence only.
- P1-P11 remain blocked until Tony issues the exact approval command.
