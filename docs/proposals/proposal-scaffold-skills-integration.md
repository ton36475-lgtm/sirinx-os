# Proposal Scaffold: Skills Integration

**Date:** 2026-07-15  
**Origin:** user_request  
**Status:** `DRAFT`  
**Tier:** A5 - External Action Required

---

## Gate Structure

| Gate | Requirement | Approved |
|------|-------------|----------|
| Gate 1 | Safety check pass | ✅ (awaiting approval) |
| Gate 2 | Code review | ⏸️ |
| Gate 3 | Test pass | ⏸️ |
| Gate 4 | Approval signature | ⏸️ |

---

## Evidence Required

```yaml
evidence:
  safety_scan: "scripts/secret-scan.mjs pass"
  code_review: "codex-worker review required"
  tests: "vitest run services/skills-api/src/
  implementation: "skills-kit fully integrated"
```

---

## Approval Commands

```
/approve skills-websocket     # Approve Part A
/approve skills-deploy        # Approve Part B
/approve skills-integration   # Approve All (Part A + B)
```

---

## Rollback Plan

```bash
# Revert WebSocket
git revert [commit-hash]

# Revert GitHub Actions
rm .github/workflows/skills-kit-deploy.yml
git checkout HEAD~1 -- .github/workflows/
```

---

## Implementation Branches

```
Proposed Branches:
- feature/skills-websocket
- feature/skills-deploy-actions
```

---

**Blockers:** 
- รอ approval ก่อนทำ Part A/B จริง
- MCP integration ยังอยู่ใน dry-run mode

**Next Action:** รอ `/approve` command จากผู้ใช้