# EdgeOne Makers Deployment Strategy

**Part of:** GHOSTCLAW EdgeOne Readiness Worker
**Status:** ACTIVE — Readiness Only

---

## 1. Deployment Levels

| Level | Name | Action | Gate |
|-------|------|--------|------|
| R3 | Readiness | Check preparation, produce readiness report | Auto (read-only) |
| R4 | Preview Deploy | Deploy to preview environment | Requires deploy packet |
| R5 | Production Deploy | Deploy to production environment | Explicit gate only |

**Current level: R3 (Readiness Only)**

## 2. R3 — Readiness Checklist

- [ ] Project builds successfully (no-install validation)
- [ ] All tests pass
- [ ] No secrets in code
- [ ] No .env files staged
- [ ] EdgeOne project config exists
- [ ] Deploy packet template ready
- [ ] Smoke test template ready
- [ ] Rollback plan documented

## 3. R4 — Preview Deploy (Requires Deploy Packet)

Preview deploy requires:
- Deploy packet (`edgeone-deploy-packet.json`)
- All R3 readiness checks passed
- Validation results recorded
- Approval mode: `agent_quorum_approval` (Tier C)

## 4. R5 — Production Deploy (Explicit Gate Only)

Production deploy requires:
- All R4 preview checks passed
- Explicit human/operator gate approval
- Rollback plan verified
- No auto-deploy under any mode

## 5. Blocked Actions

- Do NOT deploy now
- Do NOT push to production
- Do NOT mutate cloud resources
- Do NOT read secrets or tokens

## 6. EdgeOne Deployment Packet

Template: `.ghostclaw_runtime/a2a2a/templates/edgeone-deploy-packet.json`

Fields:
- `project_id`
- `environment` (preview | production)
- `revision` (git commit hash)
- `readiness_checks` (all R3 checks)
- `approval_mode`
- `rollback_plan`
- `smoke_test_receipt`

## 7. EdgeOne Smoke Test Receipt

Template: `.ghostclaw_runtime/a2a2a/templates/edgeone-smoke-test-receipt.json`

Fields:
- `project_id`
- `environment`
- `url`
- `http_status`
- `response_time_ms`
- `console_errors`
- `page_errors`
- `timestamp`

## 8. Canonical Terminology

- `brainstorm` = canonical
- `beststorm` = deprecated legacy alias
- `beststrom` = invalid typo
