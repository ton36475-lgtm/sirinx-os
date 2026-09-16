# Local Commit Gate

**Date:** 2026-06-30

---

## Commit Policy

- Enabled: true
- Only if: validation passes, git_status_before collected, no hard blocks, changed files within approved paths
- Commit message convention: `feat(scope): description`
- No push: true
- No deploy: true

## Guards

1. git_status_reviewed
2. diff_reviewed
3. validation_report_exists
4. receipts_complete
5. no_secret_access
6. no_D_or_X_action
7. no_push
8. no_deploy
