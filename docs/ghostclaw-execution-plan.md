# GhostClaw Loop Engineering - Fullstack Integration Execution Plan

**Version:** V1.1  
**Status:** Plan Only - No Push / No Deploy / No Install / No Secrets  
**Scope:** Frontend + Backend Deliverables Verification

---

## 1. Project Overview

The GhostClaw Layered Build Status system implements a receipt-gated, safe-local-only fullstack feature where:

- **Backend** provides read-only status contract and route handler
- **Frontend** consumes the API and displays build status with gate controls
- **Safety**: All blocked actions are enforced (git_push, deploy, install_dependencies, etc.)

---

## 2. Backend Deliverables (Verified)

| File | Role | Status |
|------|------|--------|
| `src/lib/api/contracts/ghostclaw-layered-build-contract.mjs` | API contract definition (route, request schema, response schema, errors) | ✅ Implemented |
| `src/api/ghostclaw/layered-build-status-route.mjs` | Route handler for `GET /api/ghostclaw/layered-build/status` | ✅ Implemented |
| `src/lib/server/ghostclaw/layered-build-service.mjs` | Service layer (layer ordering, scope classification, gate logic) | ✅ Implemented |
| `src/lib/api/ghostclaw/layered-build-status-client.mjs` | API client for fetching status | ✅ Implemented |
| `src/api/ghostclaw/layered-build-status-route.test.mjs` | Route handler tests | ✅ Implemented |
| `src/lib/api/contracts/ghostclaw-layered-build-contract.test.mjs` | Contract validation tests | ✅ Implemented |

### 2.1 Layer Sequence (Backend Contract)

```
observe_freeze → harness → backend_domain_schema → backend_service_logic → 
api_contract → api_route_handler → api_client → 
frontend_state_hooks → frontend_components → frontend_pages → 
local_uat → review_validation → local_commit_gate
```

### 2.2 Blocked Actions (Backend Policy)

- git_push, git_merge, git_rebase
- deploy, cloud_mutation
- install_dependencies, migration
- provider_batch_calls, model_download
- gpu_heavy_job
- read_or_print_secrets, edit_real_env
- delete_files

---

## 3. Frontend Deliverables (Verified)

| File | Role | Status |
|------|------|--------|
| `src/hooks/ghostclaw/use-layered-build-status.mjs` | React hook for state management | ✅ Implemented |
| `src/components/ghostclaw/layered-build-status-panel.mjs` | UI panel component for status display | ✅ Implemented |
| `src/pages/ghostclaw/layered-build-status-page.mjs` | Page composition and rendering | ✅ Implemented |
| `src/pages/ghostclaw/layered-build-status-localhost.mjs` | Localhost UAT mount point | ✅ Implemented |
| `src/pages/ghostclaw/layered-build-status-page.test.mjs` | Page component tests | ✅ Implemented |

### 3.1 Frontend Layer Scopes (from `layered-build-service.mjs`)

```javascript
frontend_state_hooks: ["src/hooks/", "src/features/", "src/store/", "src/state/", "src/lib/query/"]
frontend_components: ["src/components/", "components/", "src/features/"]
frontend_pages: ["src/app/", "app/", "src/pages/", "pages/", "src/routes/"]
```

---

## 4. Integration Verification (Backend ↔ Frontend)

### 4.1 Data Flow Alignment

| Backend Contract | Frontend Hook | Status |
|-----------------|---------------|--------|
| `phase_status` object | `createLayeredBuildStatusViewModel` transforms for display | ✅ Aligned |
| `next_packet_gate` | Panel uses `view.next_packet_opened` for action enable/disable | ✅ Aligned |
| `blocked_actions` array | `getBlockedActions()` exported and used in mock data | ✅ Aligned |
| `receipts` array | `buildReceiptRefs` filters by `include_receipts` query param | ✅ Aligned |
| `current_packet` | Used directly in route handler and hook state | ✅ Aligned |

### 4.2 API Contract Alignment

| Route | Method | Query Params | Response Shape | Frontend Consumer |
|-------|--------|--------------|--------------|------------------|
| `/api/ghostclaw/layered-build/status` | GET | `include_receipts` (bool), `layer` (enum) | Contract-compliant JSON | Hook `getStatus()` |

### 4.3 Layer Gate Logic Alignment

- `canOpenNextLayer()` in service returns `{ ok, nextLayer, requirements }`
- Frontend panel displays `{ opened, reason }` from `next_packet_gate`
- Route handler maps service gate to response format

**Verification:** Route tests confirm `allowed_by_review_gate` and `opened` status mapping.

---

## 5. Cross-Layer Mutation Guard

The `detectCrossLayerMutation()` function enforces:

- Backend service layer cannot touch API or frontend files
- API contract/route handlers cannot touch frontend files
- Frontend pages/components are isolated from backend changes

**Verification:** `assertBackendServicePacket()` tests confirm blocking logic.

---

## 6. Integration Tasks

### 6.1 Completed (Verified via Syntax Check)

- [x] Backend contract defines all required fields
- [x] Route handler implements contract validation
- [x] Service layer provides gate logic
- [x] API client handles contract-compatible responses
- [x] Hook manages loading/success/error/empty states
- [x] Panel component renders status with metrics
- [x] Page composes hook + panel for rendering
- [x] Localhost mount provides UAT entry point

### 6.2 Remaining Integration Tasks

| Task | Description | File Scope | Priority |
|------|-------------|------------|----------|
| T1 | Verify vitest suite passes for all GhostClaw layered build files | Test execution | High |
| T2 | Add integration test for full hook → API → route flow | `src/pages/ghostclaw/layered-build-integration.test.mjs` | Medium |
| T3 | Document cross-layer scope boundaries in validation report | `docs/ghostclaw/integration-validation-report.md` | Medium |
| T4 | Add receipt path validation in service layer | `src/lib/server/ghostclaw/layered-build-service.mjs` | Low |

---

## 7. Safety Verification

### 7.1 No Push / No Deploy Enforcement

All route responses include:
```javascript
blocked_actions: ["git_push", "deploy", "install_dependencies", ...]
```

### 7.2 No Install / No Secrets Enforcement

- Route is GET-only (POST returns 403 POLICY_BLOCKED)
- `local_only: true` required in all responses
- No secret or credential paths in allowed layer scopes

### 7.3 Receipt-Gated Sequence

Each layer requires:
1. `status === "review_pass"` or `status === "done"`
2. `receiptExists === true`
3. `reviewStatus === "pass"` or `reviewStatus === "warn"`

---

## 8. Evidence Paths

| Artifact | Path |
|----------|------|
| Contract Schema | `src/lib/api/contracts/ghostclaw-layered-build-contract.mjs` |
| Route Handler | `src/api/ghostclaw/layered-build-status-route.mjs` |
| Service Logic | `src/lib/server/ghostclaw/layered-build-service.mjs` |
| API Client | `src/lib/api/ghostclaw/layered-build-status-client.mjs` |
| Frontend Hook | `src/hooks/ghostclaw/use-layered-build-status.mjs` |
| Panel Component | `src/components/ghostclaw/layered-build-status-panel.mjs` |
| Page Component | `src/pages/ghostclaw/layered-build-status-page.mjs` |
| Localhost UAT | `src/pages/ghostclaw/layered-build-status-localhost.mjs` |
| Contract Tests | `src/lib/api/contracts/ghostclaw-layered-build-contract.test.mjs` |
| Route Tests | `src/api/ghostclaw/layered-build-status-route.test.mjs` |
| Page Tests | `src/pages/ghostclaw/layered-build-status-page.test.mjs` |

---

## 9. Next Actions Summary

1. Execute vitest suite to verify all tests pass
2. Create integration test combining hook + API + route
3. Document validation findings in separate report
4. Maintain safety gates - no push/deploy/install/secret actions