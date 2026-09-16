# A2A2A P205 Compact Snapshot Freshness Guard

Status: `FRESHNESS_GUARD_READY_WAITING_FOR_OPENCODE_CANDIDATE`

## What Changed

- Added `--compact-snapshot-freshness` to inspect whether a durable compact snapshot still matches packet_078 filesystem state.
- Added `--compact-freshness-output` and `--compact-freshness-receipt-output`.
- The guard detects the stale case where a compact snapshot still says `waiting_for_opencode_candidate` after the P185 candidate appears.

## Current State

- P204 compact snapshot freshness: `fresh_waiting_for_opencode_candidate`
- P185 candidate: absent
- P175 real review result: absent
- `packet_078`: absent
- P193 guard: absent

## Safety Boundary

The freshness guard is read-only against packet_078 state. It does not write candidate review results, real review results, queue packets, guard scripts, worker envelopes, live Telegram sends, provider calls, secrets, installs, commits, pushes, deploys, or Cloudflare/R2 mutations.

## Verification

- TDD red/green:
  - `test_compact_snapshot_freshness_guard_marks_waiting_snapshot_fresh_when_candidate_absent`
  - `test_compact_snapshot_freshness_guard_marks_waiting_snapshot_stale_after_candidate_arrives`
- Focused validation: `142 tests` passed across orchestrator, loop harness, and role worker suites.
- Syntax: `python3 -m py_compile scripts/ghostclaw_a2a_agent_orchestrator.py` passed.
- Secret scan: `node scripts/secret-scan.mjs` passed with no findings.
- Scoped diff check: passed for touched source/test/report files.
- JSON parse checks: P205 status and receipts parsed successfully.
- Absence checks: P185, P175, `packet_078`, and P193 guard remain absent.

## Next Safe Action

Keep P204 compact snapshot as current. Paste P195 into OpenCode manually, then rerun P205/P204/P201 after the candidate appears.
