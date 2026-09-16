# A2A2A Scoped Diff Review

Packet: `A2A2A-P030-SCOPED-DIFF-REVIEW-20260703`

Timestamp: `2026-07-03T05:05:00+0700`

## Scope

Reviewed only the Hermes all-jobs / Telegram / OpenRouter Fable5 commit candidate. The full 409-entry dirty tree remains out of scope.

## Finding Fixed During Review

The HTTP endpoint `POST /api/openrouter-fable5-adapter/smoke` could attempt a live provider smoke when called directly. It now fails closed unless the request body includes the exact approval:

```text
APPROVE_OPENROUTER_FABLE5_PROVIDER_CALL_A019E53EE
```

Blocked direct calls now return `blocked-openrouter-fable5-live-smoke` without reading secrets and without calling the provider.

## Current Review Result

Status: `PASS_SCOPED_COMMIT_CANDIDATE_READY`

No blocking issue remains in the scoped candidate after route hardening and focused validation.

## Validated Commands

```bash
node --check services/dev-control-api/src/openrouter-fable5-adapter.mjs
node --check services/dev-control-api/server.mjs
node --check services/dev-control-api/src/telegram-command-router.mjs
node --check services/dev-control-api/src/hermes-all-jobs-readiness.mjs
./node_modules/.bin/vitest run services/dev-control-api/src/hermes-all-jobs-readiness.test.mjs services/dev-control-api/src/telegram-command-router.test.mjs services/dev-control-api/src/openrouter-fable5-adapter.test.mjs
git diff --check -- <scoped candidate files>
```

Result: 3 test files passed, 29 tests passed.

## Commit Candidate

- `package.json`
- `configs/hermes_all_jobs_ready.config.json`
- `configs/hermes_telegram_gateway.config.json`
- `services/dev-control-api/server.mjs`
- `services/dev-control-api/src/hermes-all-jobs-readiness.mjs`
- `services/dev-control-api/src/hermes-all-jobs-readiness.test.mjs`
- `services/dev-control-api/src/openrouter-fable5-adapter.mjs`
- `services/dev-control-api/src/openrouter-fable5-adapter.test.mjs`
- `services/dev-control-api/src/telegram-command-router.mjs`
- `services/dev-control-api/src/telegram-command-router.test.mjs`
- `reports/mission/A2A2A_USABLE_STATE_AUDIT_20260703.md`
- `reports/mission/A2A2A_LOCAL_COMMIT_GATE_REVIEW_20260703.md`
- `reports/mission/A2A2A_SCOPED_DIFF_REVIEW_20260703.md`

## Not Included

- Full dirty tree review.
- Git commit.
- Git push.
- Deploy.
- Cloudflare/R2 write.
- Install.
- Provider call.
- Repo/customer data routing.

## Next Safe Action

Open an exact local commit gate for this scoped candidate only, or continue splitting the remaining dirty worktree into separate review packets.
