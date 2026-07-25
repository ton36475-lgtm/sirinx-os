# A2A2A P096 Orchestrator Drain-Mode Next Action Gate

Status: `READY_FOR_EXACT_IMPLEMENTATION_APPROVAL_AFTER_P094`

## Purpose

P096 adds a `queue_drain` section to the A2A2A orchestrator output. This prevents the control plane from becoming ambiguous when all ready active packets have been drained.

The new section distinguishes:

- ready active packet available
- current ack reconciliation required
- active gate review required
- support packet available
- queue drained with no actionable packet

## Patch Preview

`.ghostclaw_runtime/a2a2a/evidence/A2A2A-P096-ORCHESTRATOR-DRAIN-MODE-NEXT-ACTION-PATCH-PREVIEW-20260703.diff`

This patch is intentionally sequenced after P094 because P094 also edits the focused orchestrator test file.

## Simulation

Temp workspace:

`/tmp/a2a2a-p096-sequence-sim.dU3BbT`

Simulation order:

1. Apply P094 patch preview.
2. Apply P096 patch preview.
3. Run focused tests.
4. Run selector before P090 ack.
5. Run temp P090 packet 042 one-shot ack.
6. Run selector after P090 ack.

Result:

- Focused patched test suite passed: 10 tests.
- Before P090 ack: `queue_drain.status=ack_reconcile_required`.
- After P090 ack: `queue_drain.status=active_gate_review_required`.
- After P090 ack: `queue_drain.next_gate_packet=packet_020`.
- After P090 ack: `ready_active_packets=0`.

## Required Gate Order

1. `APPROVE_IMPLEMENTATION A2A2A_P094_ORCHESTRATOR_SAFE_ACK_COMPLETION_AWARE_SELECTION`
2. `APPROVE_IMPLEMENTATION A2A2A_P096_ORCHESTRATOR_DRAIN_MODE_NEXT_ACTION`
3. `APPROVE_A2A2A_P090_PACKET042_LOCAL_ROLE_WORKER_ACK_ONLY`

## Not Performed

No source mutation, real packet 042 receipt overwrite, role worker run against the real repo, queue payload execution, live Telegram send, provider/model call, external routing, install, commit, push, deploy, secret read/print, or Cloudflare/R2 mutation was performed.
