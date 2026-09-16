# Validation Report: Layered Backend API Frontend

Mission ID: `GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001`

## Current Result

The layered lock manifests were refreshed for the active MaxPlus/GLM-5.2
mission. Phase 0 is complete. Phase 1 harness is ready for review. Phase 2 was
repaired for the current layered mission mode. Phase 3 backend service logic and
Phase 4 API contract freeze and Phase 5 API route handler have local review
pass. Phase 6 API client wiring, Phase 7 frontend state hooks, and Phase 8
frontend components and the locked Phase 9 page have local review pass. Phase
10 local model UAT has evidence, but browser/localhost UAT is blocked because
the page model is not mounted into a runnable localhost route. Phase 11 review
validation is WARN, and the commit gate remains gated.

Latest operator gate audit: `P01-backend-domain-schema` was rechecked against
its lease and receipt. Codex did not mutate source files in this audit, and no
next layer was opened from the audit.

## Evidence

- `.ghostclaw_runtime/a2a2a/evidence/layered_observe.json`
- `.ghostclaw_runtime/a2a2a/status/layer_sequence_status.json`
- `.ghostclaw_runtime/a2a2a/status/page_sequence_manifest.json`
- `.ghostclaw_runtime/a2a2a/status/file_ownership_manifest.json`
- `docs/ghostclaw/LAYERED_BACKEND_API_FRONTEND_BUILD_ORDER.md`
- `docs/ghostclaw/NO_CROSS_PAGE_FILE_LEASE_POLICY.md`
- `.ghostclaw_runtime/a2a2a/receipts/P01-maxplus-glm52-safe-harness.receipt.json`
- `.ghostclaw_runtime/a2a2a/receipts/P01-backend-domain-schema-gate-audit-20260630T103912Z.json`
- `.ghostclaw_runtime/a2a2a/receipts/P02-layered-backend-domain-schema.receipt.json`
- `.ghostclaw_runtime/a2a2a/receipts/P03-backend-service-logic.receipt.json`
- `.ghostclaw_runtime/a2a2a/reviews/P03-backend-service-logic.local-review.json`
- `.ghostclaw_runtime/a2a2a/receipts/P04-api-contract-freeze.receipt.json`
- `.ghostclaw_runtime/a2a2a/reviews/P04-api-contract-freeze.local-review.json`
- `.ghostclaw_runtime/a2a2a/receipts/P05-api-route-handler.receipt.json`
- `.ghostclaw_runtime/a2a2a/reviews/P05-api-route-handler.local-review.json`
- `.ghostclaw_runtime/a2a2a/receipts/P06-api-client-wiring.receipt.json`
- `.ghostclaw_runtime/a2a2a/reviews/P06-api-client-wiring.local-review.json`
- `.ghostclaw_runtime/a2a2a/receipts/P07-frontend-state-hooks.receipt.json`
- `.ghostclaw_runtime/a2a2a/reviews/P07-frontend-state-hooks.local-review.json`
- `.ghostclaw_runtime/a2a2a/receipts/P08-frontend-components.receipt.json`
- `.ghostclaw_runtime/a2a2a/reviews/P08-frontend-components.local-review.json`
- `.ghostclaw_runtime/a2a2a/receipts/P09-layered-build-status-page.receipt.json`
- `.ghostclaw_runtime/a2a2a/reviews/P09-layered-build-status-page.local-review.json`
- `.ghostclaw_runtime/a2a2a/receipts/P10-local-uat.receipt.json`
- `.ghostclaw_runtime/a2a2a/receipts/P11-review-validation.receipt.json`

## Carry-Forward Evidence

A previous backend-domain schema packet exists:

- `.ghostclaw_runtime/a2a2a/locks/P01-backend-domain-schema.lease.json`
- `.ghostclaw_runtime/a2a2a/receipts/P01-backend-domain-schema.receipt.json`
- `schemas/ghostclaw/parallel-3lane-domain.schema.json`
- `types/ghostclaw/parallel-3lane-domain.d.ts`

It was recorded as carry-forward review evidence only, but local review found a
blocking mode mismatch: the carried-forward schema described
`full_auto_safe_local_parallel_lanes`, not
`full_auto_safe_local_layered_sequence`.

The current mission schema now exists at:

- `schemas/ghostclaw/maxplus-glm52-layered-build-lock.schema.json`
- `types/ghostclaw/maxplus-glm52-layered-build-lock.d.ts`

## Phase 3 Service Logic Evidence

- `src/lib/server/ghostclaw/layered-build-service.mjs`
- `src/lib/server/ghostclaw/layered-build-service.test.mjs`

Validation:

- `node --check` passed for service and test files.
- `node --test src/lib/server/ghostclaw/layered-build-service.test.mjs` passed with 7 tests and 0 failures.
- Scope check confirmed no API, frontend, component, or page files changed for Phase 3.

## Phase 4 API Contract Evidence

- `src/lib/api/contracts/ghostclaw-layered-build-contract.mjs`
- `src/lib/api/contracts/ghostclaw-layered-build-contract.test.mjs`
- `docs/api/GHOSTCLAW_LAYERED_BUILD_CONTRACT.md`
- `.ghostclaw_runtime/api_contracts/ghostclaw-layered-build.contract.json`

Validation:

- `node --check` passed for the contract module and test file.
- `node --test src/lib/api/contracts/ghostclaw-layered-build-contract.test.mjs` passed with 5 tests and 0 failures.
- JSON parse passed for the runtime contract sample and P04 receipt/lease/status files.
- Scope check confirmed no route handler, client, frontend, component, or page files changed for Phase 4.
- P05 API route handler remains blocked until P04 review passes.

## Phase 5 API Route Handler Evidence

- `src/api/ghostclaw/layered-build-status-route.mjs`
- `src/api/ghostclaw/layered-build-status-route.test.mjs`

Validation:

- `node --check` passed for the route handler and test file.
- `node --test src/api/ghostclaw/layered-build-status-route.test.mjs` passed with 6 tests and 0 failures.
- The route imports the frozen contract and backend service layer.
- The route normalizes invalid query, unsafe method, and unavailable status errors into the frozen error shape.
- Scope check confirmed no API client, frontend, component, or page files changed for Phase 5.
- P06 API client wiring remains blocked until P05 review passes.

## Phase 6 API Client Evidence

- `src/lib/api/ghostclaw/layered-build-status-client.mjs`
- `src/lib/api/ghostclaw/layered-build-status-client.test.mjs`

Validation:

- `node --check` passed for the client and test file.
- `node --test src/lib/api/ghostclaw/layered-build-status-client.test.mjs` passed with 6 tests and 0 failures.
- The client imports the frozen API contract and does not import backend service or route handler files.
- The client supports injected fetch and explicit mock fallback for local UI/hook packets without network calls.
- Scope check confirmed no API route, frontend hook, component, or page files changed for Phase 6.
- P06 local review passed without provider/OpenCode invocation.

## Phase 7 Frontend State Hooks Evidence

- `src/hooks/ghostclaw/use-layered-build-status.mjs`
- `src/hooks/ghostclaw/use-layered-build-status.test.mjs`

Validation:

- `node --check` passed for the hook/state module and test file.
- `node --test src/hooks/ghostclaw/use-layered-build-status.test.mjs` passed with 6 tests and 0 failures.
- The hook/state layer uses the P06 API client through default construction or injection.
- It exposes idle, loading, success, empty, and error states plus a component-safe view model.
- Scope check confirmed no API route, API client, component, or page files changed for Phase 7.
- P07 local review passed without provider/OpenCode invocation.

## Phase 8 Frontend Components Evidence

- `src/components/ghostclaw/layered-build-status-panel.mjs`
- `src/components/ghostclaw/layered-build-status-panel.test.mjs`

Validation:

- `node --check` passed for the component module and test file.
- `node --test src/components/ghostclaw/layered-build-status-panel.test.mjs` passed with 6 tests and 0 failures.
- The component consumes hook snapshot/view-model props and performs no data fetch.
- It exposes loading, error, empty, idle, and success panel variants.
- Scope check confirmed no hook, API, page, or route files changed for Phase 8.
- P08 local review passed without provider/OpenCode invocation.

## Phase 9 Frontend Page Evidence

- `src/pages/ghostclaw/layered-build-status-page.mjs`
- `src/pages/ghostclaw/layered-build-status-page.test.mjs`

Validation:

- `node --check` passed for the locked page module and test file.
- `node --test src/pages/ghostclaw/layered-build-status-page.test.mjs` passed with 6 tests and 0 failures.
- The page model wires the P07 hook state and P08 component panel.
- Page sequence manifest confirms only `ghostclaw-layered-build-status` was locked for this packet.
- Scope check confirmed no second page, hook, component, API, or route files changed for Phase 9.
- P09 local review passed without provider/OpenCode invocation.

## Phase 10 Local UAT Evidence

- `.ghostclaw_runtime/a2a2a/receipts/P10-local-uat.receipt.json`

Validation:

- Local model UAT used `node --test src/pages/ghostclaw/layered-build-status-page.test.mjs` and passed with 6 tests and 0 failures.
- Browser/localhost UAT was not claimed. It is blocked because the page output is a local page model under `src/pages/ghostclaw`, not a mounted app route served on localhost.
- No dev server was started, and no screenshot or browser console evidence was produced.

## Phase 11 Review Validation Evidence

- `.ghostclaw_runtime/a2a2a/receipts/P11-review-validation.receipt.json`

Validation:

- Focused Node test suite passed with 42 tests and 0 failures across backend service, API contract, route, client, hook, component, and page packets.
- JSON audit passed for 14 receipt/status files.
- `git diff --check` passed for scoped layered build files.
- Review status is WARN because browser/localhost UAT has not run.

## Blocks Preserved

- no push
- no deploy
- no install
- no migration
- no provider/model call
- no model download
- no GPU-heavy job
- no secret read or print
- no backend/frontend mixed packet
- no cross-page edit
- browser/localhost UAT remains blocked until the page is mounted into a runnable local route
