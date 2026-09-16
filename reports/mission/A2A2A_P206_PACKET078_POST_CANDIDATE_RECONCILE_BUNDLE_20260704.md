# A2A2A P206 Packet 078 Post-Candidate Reconcile Bundle

Status: `waiting_for_opencode_candidate`

## Purpose

P206 adds a single local-safe reconcile command for the `packet_078` OpenCode candidate handoff. It refreshes the P201 post-handoff router, P204 durable compact snapshot, P205 freshness guard, and a P206 status/receipt in one run.

This is an acceleration layer only. It does not create the OpenCode candidate, real review result, queue packet, P193 guard, worker envelope, provider call, Telegram send, commit, push, deploy, or Cloudflare/R2 mutation.

## Command

```bash
python3 scripts/ghostclaw_a2a_agent_orchestrator.py \
  --write \
  --packet078-post-candidate-reconcile-bundle \
  --compact-output .ghostclaw_runtime/a2a2a/status/A2A2A-P204-CURRENT-COMPACT-STATUS-20260704.json \
  --compact-receipt-output .ghostclaw_runtime/a2a2a/receipts/A2A2A-P204-CURRENT-COMPACT-STATUS-20260704.json \
  --compact-freshness-output .ghostclaw_runtime/a2a2a/status/A2A2A-P205-COMPACT-SNAPSHOT-FRESHNESS-20260704.json \
  --compact-freshness-receipt-output .ghostclaw_runtime/a2a2a/receipts/A2A2A-P205-COMPACT-SNAPSHOT-FRESHNESS-20260704.json
```

## Current Result

- P206 status: `waiting_for_opencode_candidate`
- Recommended next action: `paste_p195_prompt_into_opencode`
- Candidate exists: `false`
- Real review result exists: `false`
- `packet_078` exists: `false`
- P193 guard exists: `false`

## Artifacts

- P201 router: `.ghostclaw_runtime/a2a2a/status/A2A2A-P201-PACKET078-OPENCODE-POST-HANDOFF-ROUTER-20260704.json`
- P201 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P201-PACKET078-OPENCODE-POST-HANDOFF-ROUTER-20260704.json`
- P204 compact snapshot: `.ghostclaw_runtime/a2a2a/status/A2A2A-P204-CURRENT-COMPACT-STATUS-20260704.json`
- P204 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P204-CURRENT-COMPACT-STATUS-20260704.json`
- P205 freshness: `.ghostclaw_runtime/a2a2a/status/A2A2A-P205-COMPACT-SNAPSHOT-FRESHNESS-20260704.json`
- P205 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P205-COMPACT-SNAPSHOT-FRESHNESS-20260704.json`
- P206 status: `.ghostclaw_runtime/a2a2a/status/A2A2A-P206-PACKET078-POST-CANDIDATE-RECONCILE-BUNDLE-20260704.json`
- P206 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P206-PACKET078-POST-CANDIDATE-RECONCILE-BUNDLE-20260704.json`

## Verification

- `python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_ghostclaw_a2a_agent_orchestrator.GhostClawA2AAgentOrchestratorTest.test_packet078_post_candidate_reconcile_bundle_waits_without_writing_blocked_artifacts WORKSPACE_SCAFFOLD.tests.test_ghostclaw_a2a_agent_orchestrator.GhostClawA2AAgentOrchestratorTest.test_packet078_post_candidate_reconcile_bundle_surfaces_exact_p193_gate_after_candidate` passed.
- `python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_ghostclaw_a2a_agent_orchestrator WORKSPACE_SCAFFOLD.tests.test_ghostclaw_loop_harness_validate WORKSPACE_SCAFFOLD.tests.test_ghostclaw_a2a_role_worker` passed: 144 tests.
- `python3 -m py_compile scripts/ghostclaw_a2a_agent_orchestrator.py` passed.
- `node scripts/secret-scan.mjs` passed with no findings.
- `git diff --check -- scripts/ghostclaw_a2a_agent_orchestrator.py WORKSPACE_SCAFFOLD/tests/test_ghostclaw_a2a_agent_orchestrator.py reports/mission/A2A2A_P206_PACKET078_POST_CANDIDATE_RECONCILE_BUNDLE_20260704.md` passed.
- JSON parse checks passed for P201/P204/P205/P206 status and receipt artifacts.
- Absence checks passed for P185 candidate, P175 real result, `packet_078`, and P193 guard.

## Blocked Actions Preserved

No candidate review result write by Codex, real review-result write, queue write, guard script write, worker envelope write, worker execution, live Telegram send, provider/model call, repo/customer-data external routing, secret read/print, install, commit, push, deploy, or Cloudflare/R2 mutation was performed.

## Next Safe Action

Paste the P195 prompt into OpenCode so OpenCode can write only:

`.ghostclaw_runtime/a2a2a/reviews/A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-20260704.json`

After that, rerun P206. If the candidate is valid, P206 should surface `ready_for_exact_p193_candidate_copy_gate`; the real result path still requires the exact P193 gate.
