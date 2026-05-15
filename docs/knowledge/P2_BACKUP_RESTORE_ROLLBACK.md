# P2 Backup Restore Rollback

Status: plan ready
Date: 2026-05-16
Runtime impact: none

## Purpose

Define local backup, restore, and rollback expectations before staging.

## Backup Scope

Track in Git:

- Source code.
- Tests.
- Docs.
- Policy files.
- Example config files.

Do not commit:

- Real `.env` files.
- Secrets.
- `node_modules/`.
- Logs.
- PIDs.
- Browser reports.
- Generated test results.
- Local private state.
- Archive binaries unless explicitly reviewed.

## Local Stop Procedure

```bash
pnpm dashboard:stop
```

Expected result:

- Dashboard port `8710` stops listening.
- Control API port `8711` stops listening.

## Local Restore Procedure

```bash
pnpm dashboard:run
pnpm dashboard:status
pnpm verify
pnpm dashboard:e2e
```

Expected result:

- API health returns `dryRunOnly: true`.
- Dashboard loads.
- E2E passes.

## Git Rollback Procedure

Use non-destructive review first:

```bash
git log --oneline
git show --stat HEAD
git diff HEAD~1..HEAD
```

Only revert with an explicit operator-approved revert commit.

## Emergency Safety Controls

- Keep `.env` dangerous toggles false.
- Keep kill switches off by default.
- Keep customer messaging disabled.
- Keep cloud mutation disabled.
- Keep paid API usage disabled.
- Keep public AI exposure disabled.

## Staging Gate

Staging remains blocked until:

- rollback procedure is tested,
- audit trail exists outside transient browser state,
- approval queue is reviewed,
- no public internal endpoint exposure is present,
- operator records explicit approval.
