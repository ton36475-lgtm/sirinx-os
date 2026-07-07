# A2A2A P097 Orchestrator Exact-Gate Suggestion Gate

Status: `READY_FOR_EXACT_IMPLEMENTATION_APPROVAL_AFTER_P094_P096`

## Purpose

P097 adds deterministic, review-only exact gate suggestions to the A2A2A
orchestrator. This reduces ambiguity when the coordinator emits the generic
`APPROVE_GATE_SPECIFIC_ACTION` gate.

The patch does not approve anything automatically. It only reports:

- `recommended_gate` on ranked and compact gate packets
- `queue_drain.recommended_next_gate_phrase`
- preserved existing exact gates such as MCP auth refresh gates
- generated exact phrases for generic approval gates

## Patch Preview

`.ghostclaw_runtime/a2a2a/evidence/A2A2A-P097-ORCHESTRATOR-EXACT-GATE-SUGGESTION-PATCH-PREVIEW-20260703.diff`

This patch is intentionally sequenced after P094 and P096 because it extends the
P096 `queue_drain` section and uses P094 completion semantics during simulation.

## Simulation

Temp workspace:

`/tmp/a2a2a-p097-applycheck.rOARgy`

Simulation order:

1. Apply P094 patch preview.
2. Apply P096 patch preview.
3. Apply P097 patch preview.
4. Run Python compile.
5. Run focused orchestrator tests.
6. Run the temp patched orchestrator against the real repo queue in read-only mode.

Result:

- P094 then P096 then P097 apply-check passed.
- P097 whitespace error check passed.
- Temp patched focused test suite passed 11 tests.
- Real queue read-only simulation returned `ready_active_packets=0`.
- Real queue read-only simulation returned `queue_drain.status=ack_reconcile_required`.
- Current blocker remains packet 042 ack reconciliation.
- Existing exact gate preserved: `APPROVE_MCP_AUTH_REFRESH_LINEAR`.
- Generic gate examples surfaced:
  - `APPROVE_A2A2A_PACKET_021_A2A_ADAPTIVE_SYNC_CONTROL_STATUS`
  - `APPROVE_A2A2A_PACKET_022_A2A_NEXT_SAFE_ACTION_SEQUENCER`
  - `APPROVE_A2A2A_PACKET_023_HERMES_GATEWAY_CURRENT_RECHECK`

## Required Gate Order

1. `APPROVE_IMPLEMENTATION A2A2A_P094_ORCHESTRATOR_SAFE_ACK_COMPLETION_AWARE_SELECTION`
2. `APPROVE_IMPLEMENTATION A2A2A_P096_ORCHESTRATOR_DRAIN_MODE_NEXT_ACTION`
3. `APPROVE_IMPLEMENTATION A2A2A_P097_ORCHESTRATOR_EXACT_GATE_SUGGESTION`
4. `APPROVE_A2A2A_P090_PACKET042_LOCAL_ROLE_WORKER_ACK_ONLY`

## Not Performed

No source mutation, real packet 042 receipt overwrite, role worker run against
the real repo, queue payload execution, live Telegram send, provider/model call,
external routing, install, commit, push, deploy, secret read/print, or
Cloudflare/R2 mutation was performed.
