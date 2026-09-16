# EdgeOne Agent Runtime Checklist

**Part of:** GHOSTCLAW EdgeOne Readiness Worker (Phase 12)
**Status:** ACTIVE — R3 Readiness Only

---

## 1. Pre-Deploy Readiness (R3)

```
[ ] Project builds locally (no-install validation)
[ ] All tests pass (pnpm vitest run)
[ ] No .env files in staging area
[ ] No secrets/tokens in code
[ ] No unexpected root workspace config change
[ ] EdgeOne project config exists
[ ] Deploy packet template ready
[ ] Smoke test template ready
[ ] Rollback plan documented
[ ] Receipt path verified
```

## 2. Deploy Packet Verification

```
[ ] edgeone-deploy-packet.json exists
[ ] schema = ghostclaw.edgeone.deploy_packet.v1
[ ] project_id set
[ ] environment = preview (not production)
[ ] revision = valid commit hash
[ ] readiness_checks all passed
[ ] approval_mode = agent_quorum_approval
[ ] approval_tier = C
[ ] rollback_plan present and tested
[ ] smoke_test_receipt_path set
```

## 3. Smoke Test

```
[ ] Open preview URL
[ ] HTTP 200 check
[ ] Console error capture
[ ] Page error capture
[ ] Response time recorded
[ ] Smoke receipt written
[ ] passed = true required before R4 gate
```

## 4. Preview Gate (R4)

```
[ ] All R3 readiness checks passed
[ ] Deploy packet validated
[ ] Smoke test passed
[ ] Separate gate approval (not auto from R3)
[ ] Agent quorum approval (Tier C)
[ ] No EdgeOne live API call during readiness
[ ] Receipt archived
```

## 5. Production Gate (R5)

```
[ ] All R4 preview checks passed
[ ] Explicit human/operator production gate approval
[ ] Rollback plan verified
[ ] No auto-deploy
[ ] Production gate is separate from R4 gate
[ ] Receipt archived
```

## 6. Hard Stop Conditions

- Test failure → stop, fix, rerun
- Secret detected → hard block
- .env in staging → hard block
- No rollback plan → block deploy
- Missing deploy packet → block deploy
- EdgeOne live API call attempted → hard block
- Cloud mutation attempted → hard block
- Deploy/push without explicit gate → hard block

## 7. Immutable Safety Flags

```
do_not_deploy          = true
do_not_push             = true
do_not_mutate_cloud    = true
do_not_call_live_api   = true
do_not_read_secrets     = true
```

## 8. Canonical Terminology

- `brainstorm` = canonical
- `beststorm` = deprecated legacy alias
- `beststrom` = invalid typo