# EdgeOne Agent Runtime Checklist

**Part of:** GHOSTCLAW EdgeOne Readiness Worker
**Status:** ACTIVE — R3 Readiness Only

---

## 1. Pre-Deploy Readiness

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
[ ] project_id set
[ ] environment = preview (not production)
[ ] revision = valid commit hash
[ ] readiness_checks all passed
[ ] approval_mode = agent_quorum_approval
[ ] rollback_plan present
```

## 3. Smoke Test

```
[ ] Open preview URL
[ ] HTTP 200 check
[ ] Console error capture
[ ] Page error capture
[ ] Response time recorded
[ ] Smoke receipt written
```

## 4. Production Gate (R5)

```
[ ] All R4 preview checks passed
[ ] Explicit human/operator gate approval
[ ] Rollback plan verified
[ ] No auto-deploy
[ ] Receipt archived
```

## 5. Hard Stop Conditions

- Test failure → stop, fix, rerun
- Secret detected → hard block
- .env in staging → hard block
- No rollback plan → block deploy
- Missing deploy packet → block deploy
