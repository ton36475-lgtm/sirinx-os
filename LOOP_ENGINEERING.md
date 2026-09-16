# LOOP_ENGINEERING

## Daily Triage Loop

1. Ingest overnight messages/docs into `_A2A_QUEUE/inbox/`.
2. Classify risk with `WORKSPACE_SCAFFOLD/tests/test_risk_classifier.py`.
3. Route safe/medium packets to `working/`.
4. Execute and validate.
5. Update `PROJECT_STATE.md`, `NEXT_ACTIONS.md`, `AUTONOMOUS_RUN_LOG.md`.

## PR Babysitter Loop

- Watch open PRs for scope creep, secret leakage, failing checks.
- Update status board in `_OBSIDIAN_GHOSTCLAW_BRAIN/16_STATUS_BOARD.md`.

## Dependency Sweeper

- No-install policy: do not run `rm -rf node_modules && pnpm install` blindly.
- Create remediation plan first; continue other safe work.

## Memory Sync Loop

- At end of run, distill decisions into `_OBSIDIAN_GHOSTCLAW_BRAIN/15_DECISION_LOG.md`.
- Never store raw chat logs or secrets.
