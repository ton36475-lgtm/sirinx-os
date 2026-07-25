# A2A2A P130 Orchestrator Current-Gate Compact Overlay

Status: `PASS_COMPACT_AND_OPERATOR_CARD_SURFACE_CURRENT_P129_GATE`

Created: `2026-07-04T00:52:38+07:00`

## Purpose

Debug/accelerate A2A2A adaptive sync control by preventing compact/sidebar status and operator action cards from hiding the persisted current exact gate after the queue is drained.

Before this packet, `--compact` could report only:

`queue_drained_no_actionable_packet`

while `.ghostclaw_runtime/a2a2a/status/current_next_gate.json` already contained:

`APPROVE_A2A2A_P129_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY`

That made Hermes/Codex/OpenCode handoff slower and ambiguous.

## What Changed

- Added `current_gate_overlay` to compact status.
- Compact status now surfaces the current persisted exact gate from `current_next_gate.json`.
- When the queue is drained but a current exact gate exists, compact status reports:

`queue_drained_waiting_for_current_exact_gate`

- `--operator-action-card` now recognizes queue-replenish gates as a separate local-safe action type instead of treating them as worker-envelope writes.
- P129 operator action card now reports `ready_for_exact_gate` with action kind `write_one_local_active_focus_queue_packet` and `would_execute=false`.
- Added regression test:

`test_compact_output_surfaces_current_persisted_gate_when_queue_is_drained`

`test_operator_action_card_supports_queue_replenish_gate_without_execution`

## Files Changed

- `scripts/ghostclaw_a2a_agent_orchestrator.py`
- `WORKSPACE_SCAFFOLD/tests/test_ghostclaw_a2a_agent_orchestrator.py`

Runtime receipt:

`.ghostclaw_runtime/a2a2a/receipts/A2A2A-P130-ORCHESTRATOR-CURRENT-GATE-COMPACT-OVERLAY-20260704.json`

## Repo Smoke Result

Current compact status now surfaces:

- queue status: `queue_drained_waiting_for_current_exact_gate`
- next gate: `APPROVE_A2A2A_P129_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY`
- selected path: `_A2A_QUEUE/outbox/packet_076_sirinx_agm_next_local_task_card.json`
- operator action card: `ready_for_exact_gate`
- operator action kind: `write_one_local_active_focus_queue_packet`
- operator action execution flag: `would_execute=false`

## Validation

- `python3 -m py_compile scripts/ghostclaw_a2a_agent_orchestrator.py WORKSPACE_SCAFFOLD/tests/test_ghostclaw_a2a_agent_orchestrator.py` — PASS
- `python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_ghostclaw_a2a_agent_orchestrator -v` — PASS, 47 tests
- repo compact smoke — PASS, P129 gate surfaced
- repo operator action-card smoke — PASS, P129 ready without execution

## Safety

No queue packet was written.

No P129 gate execution was performed.

No live Telegram send, provider/model call, install, commit, push, deploy, secret read/print, repo/customer-data external routing, worker loop/start, queue payload execution, or Cloudflare/R2 mutation was performed.

## Next Safe Action

If the operator wants to write the next local active-focus queue packet, provide:

`APPROVE_A2A2A_P129_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY`

Otherwise keep using compact status as review-only sidebar truth.
