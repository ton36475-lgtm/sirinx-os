# A2A2A P085 Orchestrator Completion-Aware Selection Gate

- Packet: `A2A2A-P085-ORCHESTRATOR-COMPLETION-AWARE-SELECTION-GATE-20260703`
- Updated: `2026-07-03T12:31:00+07:00`
- Repo: `/Users/sirinx/sirinx-os`
- Mode: `implementation_gate_ready_source_mutation_blocked`
- Status: `READY_FOR_EXACT_IMPLEMENTATION_APPROVAL`

## Why This Exists

P084 proved the local orchestrator still selects `packet_041` after P083 wrote current Hermes/KOB receiver-side ack proof for the P079 `packet_041` envelopes.

The next real acceleration step is to make `scripts/ghostclaw_a2a_agent_orchestrator.py` completion-aware so it can skip already acknowledged/safety-blocked packet-envelope groups and advance to `packet_042` or the next unacknowledged active packet.

## Baseline Read

Inspected:

- `scripts/ghostclaw_a2a_agent_orchestrator.py`
- `WORKSPACE_SCAFFOLD/tests/test_ghostclaw_a2a_agent_orchestrator.py`

Baseline validation:

```bash
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_ghostclaw_a2a_agent_orchestrator
```

Result:

```text
Ran 4 tests in 0.193s
OK
```

The current tests verify active-focus ranking, approval-gated exclusion, dry-run non-write behavior, and evidence/receipt write behavior. They do not verify skipping packets that already have current receiver-side ack proof.

## Proposed Source Mutation Scope

Allowed only after this exact gate:

```text
APPROVE_IMPLEMENTATION A2A2A_P084_ORCHESTRATOR_COMPLETION_AWARE_SELECTION
```

Allowed source paths:

- `scripts/ghostclaw_a2a_agent_orchestrator.py`
- `WORKSPACE_SCAFFOLD/tests/test_ghostclaw_a2a_agent_orchestrator.py`

Allowed evidence paths:

- `reports/mission/A2A2A_P086_ORCHESTRATOR_COMPLETION_AWARE_SELECTION_IMPLEMENTATION_20260703.md`
- `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P086-ORCHESTRATOR-COMPLETION-AWARE-SELECTION-IMPLEMENTATION-20260703.json`
- `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P086-ORCHESTRATOR-COMPLETION-AWARE-SELECTION-IMPLEMENTATION-20260703.json`

Blocked:

- queue source mutation under `_A2A_QUEUE/**`
- new worker envelope write under `.ghostclaw_runtime/a2a2a/inbox/**`
- worker loop/start/restart
- queue payload execution
- Telegram/LINE/customer live send
- provider/model call
- repo/customer-data external routing
- install
- commit, push, deploy
- secret read/print
- Cloudflare/R2 mutation

## Implementation Shape

Recommended minimal patch:

1. Add helper to extract queue packet number from ids/paths such as `packet_041`.
2. Add helper to read receiver ack receipts:
   - `.ghostclaw_runtime/a2a2a/receipts/hermes_route_p004_local_dispatch_packet_041_hermes.json`
   - `.ghostclaw_runtime/a2a2a/receipts/kob_verdict_p004_local_dispatch_packet_041_kob.json`
3. Treat both current statuses as consumed/safe-blocked proof:
   - Hermes: `route_blocked_by_local_safety`
   - KOB: `kob_blocked`
4. Mark completed packets with a non-build lane status such as `already_acknowledged_local_safety_blocked`.
5. Keep them visible in `ranked_packets`, but set `can_prepare_local_packet=false`.
6. Select the next ready active packet after filtering completed packet-envelope groups.

## Required Test

Add a focused test that creates two active SIRINX packets:

- `packet_041` with current Hermes/KOB ack receipts
- `packet_042` without ack receipts

Expected:

- `summary.next_packet.id == "packet_042"`
- `packet_041.can_prepare_local_packet == false`
- `packet_041.lane_status == "already_acknowledged_local_safety_blocked"`
- blocked action flags remain false
- default run still writes no evidence/receipt

## Patch Preview

Patch preview is stored separately:

- `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P085-ORCHESTRATOR-COMPLETION-AWARE-SELECTION-PATCH-PREVIEW-20260703.diff`

This preview is advisory only. It was not applied to source.

## Next Safe Command After Approval

After the exact implementation gate is provided, apply the scoped patch and run:

```bash
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_ghostclaw_a2a_agent_orchestrator
python3 scripts/ghostclaw_a2a_agent_orchestrator.py --top 30
git diff --check -- scripts/ghostclaw_a2a_agent_orchestrator.py WORKSPACE_SCAFFOLD/tests/test_ghostclaw_a2a_agent_orchestrator.py
node scripts/secret-scan.mjs
```

Expected dry-run after fix:

- `packet_041` remains visible as already acknowledged/safety-blocked.
- `summary.next_packet.id` advances to `packet_042` or the next unacknowledged active packet.

## Non-Actions

- No source mutation was performed.
- No test file mutation was performed.
- No queue mutation was performed.
- No worker envelope was written.
- No worker loop or persistent worker was started.
- No queue payload execution was performed.
- No Telegram/LINE/customer live send was performed.
- No provider/model call was performed.
- No repo/customer data external routing was performed.
- No install was performed.
- No commit, push, or deploy was performed.
- No secret read/print was performed.
- No Cloudflare/R2 mutation was performed.
