# Layered Backend API Frontend Build Order

Mission ID: `GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001`

## Order

1. Observe and freeze
2. MaxPlus GLM-5.2 safe harness
3. Backend domain schema
4. Backend service logic
5. API contract freeze
6. API route/handler
7. API client wiring
8. Frontend state/hooks
9. Frontend components
10. Frontend pages, one page at a time
11. Local UAT
12. Review and validation
13. Local commit gate

## Current State

Phase 0 is recorded in:

`.ghostclaw_runtime/a2a2a/evidence/layered_observe.json`

Phase 1 harness is now ready for review and recorded in:

`.ghostclaw_runtime/a2a2a/receipts/P01-maxplus-glm52-safe-harness.receipt.json`

A previous backend-domain schema packet exists and is carried forward as review
evidence only. Backend service logic, API, frontend, page, UAT, and commit layers
remain closed until the harness review and schema review gates pass.

## Invariants

- Codex is the only mutating builder.
- Hermes controls file leases and phase gates.
- OpenCode is review-only.
- GLM-5.2 lane is read-only until identity smoke passes.
- Do not edit backend and frontend in the same packet.
- Do not edit API contract and page files in the same packet.
- Do not move to the next layer without receipt and validation.
