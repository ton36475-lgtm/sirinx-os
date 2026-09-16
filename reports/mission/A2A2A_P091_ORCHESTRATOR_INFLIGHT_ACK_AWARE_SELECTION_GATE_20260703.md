# A2A2A P091 Orchestrator In-Flight Ack-Aware Selection Gate

Status: `READY_FOR_EXACT_IMPLEMENTATION_APPROVAL`

## Finding

Current repo evidence shows `packet_042` has local Hermes/KOB worker envelopes
already written:

- `.ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_042_hermes_20260703T053954_538903Z.json`
- `.ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_042_kob_20260703T053954_538903Z.json`

Current packet 042 ack receipts are still pending. The deterministic receipt
paths exist only for an older `20260702T190501_733201Z` envelope. The current
selector still reports `packet_042` as `ready_for_local_worker_plan`, which can
regenerate duplicate worker envelopes while the current pair is waiting for
ack.

## Proposed Fix

Add in-flight ack awareness to
`scripts/ghostclaw_a2a_agent_orchestrator.py`.

Behavior after approval:

- if latest Hermes/KOB worker envelopes exist for a packet;
- and the deterministic role-worker receipts do not point to those latest
  envelopes;
- then mark the packet as
  `worker_envelopes_inflight_ack_pending`;
- keep it visible in ranked output;
- set `can_prepare_local_packet=false`;
- select the next active packet, normally `packet_043`.

## Patch Preview

`.ghostclaw_runtime/a2a2a/evidence/A2A2A-P091-ORCHESTRATOR-INFLIGHT-ACK-AWARE-SELECTION-PATCH-PREVIEW-20260703.diff`

Validation:

- `git apply --check` passed against the current worktree.
- `git apply --check --whitespace=error-all` passed against the current worktree.
- Baseline focused orchestrator test passed before source mutation.
- Bounded secret scan passed with no findings.
- Source files remain unmodified by this packet.

## Required Approval

`APPROVE_IMPLEMENTATION A2A2A_P091_ORCHESTRATOR_INFLIGHT_ACK_AWARE_SELECTION`

## Policy

No source mutation was performed in this packet. No role worker was run. No
queue payload execution, Telegram live send, provider/model call, external
routing, install, commit, push, deploy, secret read/print, or Cloudflare/R2
mutation was performed.
