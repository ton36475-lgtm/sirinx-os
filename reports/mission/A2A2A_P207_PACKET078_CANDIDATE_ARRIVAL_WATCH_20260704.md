# A2A2A P207 Packet 078 Candidate Arrival Watch

Status: `waiting_for_opencode_candidate`

## Purpose

P207 adds a bounded local watcher for the `packet_078` OpenCode candidate handoff. It checks whether OpenCode has written the P185 candidate file. If the candidate exists, P207 refreshes the P206 post-candidate reconcile bundle so the operator can immediately see whether the exact P193 copy gate is ready.

P207 is local-safe. It does not create the OpenCode candidate, real review result, queue packet, P193 guard, worker envelope, provider call, Telegram send, commit, push, deploy, or Cloudflare/R2 mutation.

## Command

```bash
python3 scripts/ghostclaw_a2a_agent_orchestrator.py \
  --write \
  --packet078-candidate-arrival-watch \
  --packet078-candidate-watch-attempts 1 \
  --packet078-candidate-watch-interval 0 \
  --compact-output .ghostclaw_runtime/a2a2a/status/A2A2A-P204-CURRENT-COMPACT-STATUS-20260704.json \
  --compact-receipt-output .ghostclaw_runtime/a2a2a/receipts/A2A2A-P204-CURRENT-COMPACT-STATUS-20260704.json \
  --compact-freshness-output .ghostclaw_runtime/a2a2a/status/A2A2A-P205-COMPACT-SNAPSHOT-FRESHNESS-20260704.json \
  --compact-freshness-receipt-output .ghostclaw_runtime/a2a2a/receipts/A2A2A-P205-COMPACT-SNAPSHOT-FRESHNESS-20260704.json
```

## Current Result

- P207 status: `waiting_for_opencode_candidate`
- Attempts used: `1`
- Candidate exists: `false`
- P206 refreshed: `false`
- Real review result exists: `false`
- `packet_078` exists: `false`
- P193 guard exists: `false`
- Recommended next action: `paste_p195_prompt_into_opencode`

## Artifacts

- P207 status: `.ghostclaw_runtime/a2a2a/status/A2A2A-P207-PACKET078-CANDIDATE-ARRIVAL-WATCH-20260704.json`
- P207 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P207-PACKET078-CANDIDATE-ARRIVAL-WATCH-20260704.json`

## Verification

- P207 targeted tests passed:
  - candidate absent -> wait without P206 refresh
  - candidate present -> refresh P206 and surface exact P193 readiness
- `python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_ghostclaw_a2a_agent_orchestrator WORKSPACE_SCAFFOLD.tests.test_ghostclaw_loop_harness_validate WORKSPACE_SCAFFOLD.tests.test_ghostclaw_a2a_role_worker` passed: 146 tests.
- `python3 -m py_compile scripts/ghostclaw_a2a_agent_orchestrator.py` passed.
- `node scripts/secret-scan.mjs` passed with no findings.
- `git diff --check -- scripts/ghostclaw_a2a_agent_orchestrator.py WORKSPACE_SCAFFOLD/tests/test_ghostclaw_a2a_agent_orchestrator.py reports/mission/A2A2A_P207_PACKET078_CANDIDATE_ARRIVAL_WATCH_20260704.md` passed.
- JSON parse checks passed for P207 status and receipt.
- Absence checks passed for P185 candidate, P175 real result, `packet_078`, and P193 guard.

## Blocked Actions Preserved

No candidate review result write by Codex, real review-result write, queue write, guard script write, worker envelope write, worker execution, live Telegram send, provider/model call, repo/customer-data external routing, secret read/print, install, commit, push, deploy, or Cloudflare/R2 mutation was performed.

## Next Safe Action

Paste the P195 prompt into OpenCode so OpenCode can write only:

`.ghostclaw_runtime/a2a2a/reviews/A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-20260704.json`

Then rerun P207 with bounded attempts. If the candidate is valid, P207 should refresh P206 and surface `candidate_arrived_reconcile_ready_for_exact_p193_gate`; the real result path still requires the exact P193 gate.
