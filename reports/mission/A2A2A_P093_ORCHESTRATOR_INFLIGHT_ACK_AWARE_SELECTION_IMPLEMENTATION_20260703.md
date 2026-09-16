# A2A2A P093 Orchestrator In-Flight Ack-Aware Selection Implementation

Status: `IMPLEMENTED_AND_VERIFIED`

## Approval Consumed

`APPROVE_IMPLEMENTATION A2A2A_P091_ORCHESTRATOR_INFLIGHT_ACK_AWARE_SELECTION`

## Scope

Applied the prevalidated P091 patch preview to the local orchestrator selector
and its focused test file.

Changed files:

- `scripts/ghostclaw_a2a_agent_orchestrator.py`
- `WORKSPACE_SCAFFOLD/tests/test_ghostclaw_a2a_agent_orchestrator.py`

## Behavior Implemented

The selector now detects a packet whose latest Hermes/KOB worker envelopes
exist but whose deterministic role-worker receipts do not point to those latest
envelopes. That packet stays visible, but it is no longer re-dispatched:

- lane status: `worker_envelopes_inflight_ack_pending`
- `can_prepare_local_packet=false`
- blocker: `worker_envelopes_inflight_ack_pending`

## Current Result

After applying the fix to the real repo:

- `summary.next_packet=packet_043`
- `packet_042.lane_status=worker_envelopes_inflight_ack_pending`
- `packet_042.can_prepare_local_packet=false`
- `packet_042.pending_targets=hermes,kob`

Packet 042 latest envelope proof:

- Hermes: `.ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_042_hermes_20260703T053954_538903Z.json`
  - SHA256: `3e99cac1ee19b86a5d554631170774ec229ac0c64f3e58d1b59501f536ad7147`
- KOB: `.ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_042_kob_20260703T053954_538903Z.json`
  - SHA256: `49336b3c0eb8cd053c084027155a2ea1f3c8c11b305a1a004c7c588ef70913de`

## Verification

- `git apply --check --whitespace=error-all` passed before applying.
- `python3 -m py_compile scripts/ghostclaw_a2a_agent_orchestrator.py` passed.
- `python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_ghostclaw_a2a_agent_orchestrator` passed 6 tests.
- `python3 scripts/ghostclaw_a2a_agent_orchestrator.py --top 8` selected `packet_043`.
- `python3 scripts/ghostclaw_a2a_agent_orchestrator.py --top 100` showed `packet_042` as `worker_envelopes_inflight_ack_pending`.
- Bounded secret scan passed with no findings.
- Target source files have no trailing whitespace.

## Notes

The target orchestrator/test files are currently untracked in this worktree, so
tracked `git diff` does not show their hunk content. The applied patch is still
captured in the P091 patch preview, and the source markers, focused tests, and
selector output prove the current file contents.

## Policy

No role worker run, persistent loop, queue payload execution, Telegram live
send, provider/model call, external routing, install, commit, push, deploy,
secret read/print, or Cloudflare/R2 mutation was performed.

## Next Safe Action

Create the scoped local lease and worker-envelope write gate for `packet_043`,
or run the already prepared `packet_042` ack-only gate if the current packet 042
envelopes should be acknowledged first.
