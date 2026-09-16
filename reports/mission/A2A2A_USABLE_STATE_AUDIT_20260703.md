# A2A2A Usable State Audit

Packet: `A2A2A-P028-USABLE-STATE-AUDIT-20260703`

Timestamp: `2026-07-03T04:57:40+0700`

## Current Usable Surface

- Hermes all-jobs readiness is usable in local-safe mode.
- `getHermesAllJobsReadiness()` returned `hermes-all-jobs-ready-local-safe`.
- Local-safe readiness checks passed with no failed checks.
- Telegram gateway live-send path has one proven bounded send receipt from P025.
- OpenRouter Fable5 provider route has one proven bounded smoke receipt from P027.
- OpenRouter resolved `anthropic/claude-fable-5` to `anthropic/claude-5-fable-20260609`.

## Validation

- `node --check services/dev-control-api/src/hermes-all-jobs-readiness.mjs` passed.
- `node --check services/dev-control-api/src/openrouter-fable5-adapter.mjs` passed.
- `node --check services/dev-control-api/src/telegram-command-router.mjs` passed.
- `./node_modules/.bin/vitest run services/dev-control-api/src/hermes-all-jobs-readiness.test.mjs services/dev-control-api/src/telegram-command-router.test.mjs services/dev-control-api/src/openrouter-fable5-adapter.test.mjs` passed: 3 files, 29 tests.

## Completed Gate Receipts

- `A2A2A-P023-HERMES-ALL-JOBS-READY-20260703`
- `A2A2A-P024-TELEGRAM-LIVE-SEND-GATE-PREFLIGHT-20260703`
- `A2A2A-P025-TELEGRAM-LIVE-SEND-EXECUTED-20260703`
- `A2A2A-P026-OPENROUTER-FABLE5-PROVIDER-CALL-PREFLIGHT-20260703`
- `A2A2A-P027-OPENROUTER-FABLE5-PROVIDER-CALL-EXECUTED-20260703`

## Not Yet Usable Without New Exact Gates

- Cloudflare/R2 mutation: target bucket/object path, content scope, rollback/evidence path still required.
- Git push: exact remote, branch, commit scope, and final diff review still required.
- Deploy: exact target, environment, rollback path, and evidence path still required.
- Install: exact package/source/version and reason still required.
- Repo-content provider routing: exact file scope, prompt scope, model, budget, and redaction policy still required.
- Customer data external routing: exact dataset, recipient/provider, retention policy, and owner approval still required.
- Secret/key value printing: remains blocked.

## Worktree Risk

`git status --short` currently reports 409 entries. This audit does not claim the full dirty worktree is reviewed, committed, pushed, or deploy-ready.

## Next Safe Action

Run a local commit-gate review packet before any push/deploy/R2 write. The review should inventory changed files, split unrelated work, run focused validation, and produce a commit scope with rollback notes.
