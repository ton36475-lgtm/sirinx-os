# A2A2A Local Commit Gate - 2026-07-03

## Status

Validated and review ready for the current active focus: `sirinx.co`, AGM AutoFlow, and the local-safe Telegram error-loop guard. No commit, push, deploy, provider call, live send, or cloud mutation has been performed.

## Purpose

The worktree is intentionally mixed and contains many unrelated older changes. This gate defines an explicit pathspec list for the operator-approved focus only so a later local commit can avoid `git add -A`.

Kusala and Phitsanulok News are paused/out-of-focus and intentionally excluded.

## Candidate Pathspecs

The machine-readable list lives in:

`reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json`

Use it as the source of truth for any later explicit-path staging.

## Evidence Required Before Commit

- Active focus scope: `reports/mission/A2A2A_ACTIVE_FOCUS_SCOPE_20260703.json`
- Commit gate check: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P057-LOCAL-COMMIT-GATE-CHECK-20260703.json`
- Commit helper dry-run: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P058-LOCAL-COMMIT-HELPER-DRY-RUN-20260703.json`
- Project app usability audit: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P059-PROJECT-APP-USABILITY-AUDIT-20260703.json`
- Active focus local preview UAT: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P062-ACTIVE-FOCUS-LOCAL-PREVIEW-UAT-20260703.json`
- Telegram error-loop A2A2A sync: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P063-TELEGRAM-ERROR-LOOP-A2A2A-SYNC-20260703.json`
- Telegram error-loop bus ack: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P064-TELEGRAM-ERROR-LOOP-BUS-ACK-20260703.json`
- Telegram error-loop readiness: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P065-TELEGRAM-ERROR-LOOP-READINESS-20260703.json`
- Active focus readiness: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P066-ACTIVE-FOCUS-READINESS-20260703.json`
- Active focus operator packet: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P067-ACTIVE-FOCUS-OPERATOR-PACKET-20260703.json`
- Active focus full local check: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P068-ACTIVE-FOCUS-FULL-LOCAL-CHECK-20260703.json`
- Active focus review-ready bundle: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P069-ACTIVE-FOCUS-REVIEW-READY-20260703.json`
- Active focus next-gates packet: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P070-ACTIVE-FOCUS-NEXT-GATES-20260703.json`
- Active focus operator status: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P071-ACTIVE-FOCUS-OPERATOR-STATUS-20260703.json`
- Active focus handoff bundle: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P072-ACTIVE-FOCUS-HANDOFF-BUNDLE-20260703.json`
- Active focus handoff index: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P073-ACTIVE-FOCUS-HANDOFF-INDEX-20260703.json`
- Active focus handoff verify: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P074-ACTIVE-FOCUS-HANDOFF-VERIFY-20260703.json`
- Active focus final local review: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P075-ACTIVE-FOCUS-FINAL-LOCAL-REVIEW-20260703.json`
- Active focus commit bundle manifest: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P076-ACTIVE-FOCUS-COMMIT-BUNDLE-MANIFEST-20260703.json`
- P061 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P061-ACTIVE-FOCUS-SCOPE-20260703.json`
- P057 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P057-LOCAL-COMMIT-GATE-20260703.json`
- P058 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P058-LOCAL-COMMIT-HELPER-DRY-RUN-20260703.json`
- P059 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P059-PROJECT-APP-USABILITY-AUDIT-20260703.json`
- P062 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P062-ACTIVE-FOCUS-LOCAL-PREVIEW-UAT-20260703.json`
- P063 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P063-TELEGRAM-ERROR-LOOP-A2A2A-SYNC-20260703.json`
- P064 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P064-TELEGRAM-ERROR-LOOP-BUS-ACK-20260703.json`
- P065 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P065-TELEGRAM-ERROR-LOOP-READINESS-20260703.json`
- P066 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P066-ACTIVE-FOCUS-READINESS-20260703.json`
- P067 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P067-ACTIVE-FOCUS-OPERATOR-PACKET-20260703.json`
- P068 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P068-ACTIVE-FOCUS-FULL-LOCAL-CHECK-20260703.json`
- P069 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P069-ACTIVE-FOCUS-REVIEW-READY-20260703.json`
- P070 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P070-ACTIVE-FOCUS-NEXT-GATES-20260703.json`
- P071 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P071-ACTIVE-FOCUS-OPERATOR-STATUS-20260703.json`
- P072 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P072-ACTIVE-FOCUS-HANDOFF-BUNDLE-20260703.json`
- P073 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P073-ACTIVE-FOCUS-HANDOFF-INDEX-20260703.json`
- P074 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P074-ACTIVE-FOCUS-HANDOFF-VERIFY-20260703.json`
- P075 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P075-ACTIVE-FOCUS-FINAL-LOCAL-REVIEW-20260703.json`
- P076 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P076-ACTIVE-FOCUS-COMMIT-BUNDLE-MANIFEST-20260703.json`
- Human report: `reports/mission/A2A2A_ACTIVE_FOCUS_SCOPE_20260703.md`

## Validation Commands

```bash
node scripts/ghostclaw_local_commit_gate_check.mjs --manifest reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json --json .ghostclaw_runtime/a2a2a/evidence/A2A2A-P057-LOCAL-COMMIT-GATE-CHECK-20260703.json
./node_modules/.bin/vitest run scripts/ghostclaw_local_commit_gate_check.test.mjs
git diff --check -- $(node scripts/ghostclaw_local_commit_gate_check.mjs --manifest reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json --print-pathspecs)
pnpm active-focus:commit-bundle
pnpm active-focus:commit-bundle:test
```

## Explicitly Excluded

- `.ghostclaw_runtime/**` runtime evidence and receipts.
- `.env`, `.env.*`, `secrets/**`, `customer-data/**`.
- dependency/build/cache outputs.
- Obsidian digest note outside the repo.

## Suggested Commit Message

`feat(ghostclaw): harden telegram and active focus local uat`

## Validation Result

- Commit gate check: PASS
- Candidate pathspecs: 66
- Git status lines in candidate scope: 117
- Ignored candidate pathspecs: 0
- Scoped secret-pattern scan: no matches
- Forbidden git-status line scan: no matches
- Telegram router regression: PASS, 17 tests
- A2A2A sync packet regression: PASS
- A2A2A local bus ack: PASS, 3 lane receipts
- A2A2A bus watcher regression: PASS, 2 tests
- A2A2A Telegram readiness verifier: PASS
- A2A2A active-focus readiness verifier: PASS
- A2A2A active-focus operator packet: PASS
- A2A2A active-focus full local check: PASS
- A2A2A active-focus review-ready bundle: PASS
- A2A2A active-focus next-gates packet: PASS
- A2A2A active-focus operator status: PASS
- A2A2A active-focus handoff bundle: PASS
- A2A2A active-focus handoff index: PASS
- A2A2A active-focus handoff verify: PASS
- A2A2A active-focus final local review: PASS
- A2A2A active-focus commit bundle manifest: PASS, 131 changed files hashed, 0 deleted
- Active focus local preview UAT: PASS

## Still Blocked

Push, deploy, Cloudflare/R2 mutation, provider calls, Telegram live send, secret/key printing, install, commit execution, and reactivating Kusala/Phitsanulok work all require separate gates.
