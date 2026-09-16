# A2A2A P095 P094 + P090 Sequence Simulation

Status: `SEQUENCE_SIMULATION_PASS`

## Purpose

This packet proves the fastest safe next sequence for the A2A2A orchestrator lane without mutating real source or real packet 042 receipts.

The correct order is:

1. Apply P094 so the selector counts safe local ack receipts only when they match latest Hermes/KOB worker envelopes.
2. Run P090 one-shot local role-worker ack for current packet 042 envelopes.
3. Re-run the selector.

## Current Real State

The current unpatched selector still chooses `packet_043`.

Packet 042 has current worker envelopes:

| Target | Envelope | SHA256 |
|---|---|---|
| Hermes | `.ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_042_hermes_20260703T053954_538903Z.json` | `3e99cac1ee19b86a5d554631170774ec229ac0c64f3e58d1b59501f536ad7147` |
| KOB | `.ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_042_kob_20260703T053954_538903Z.json` | `49336b3c0eb8cd053c084027155a2ea1f3c8c11b305a1a004c7c588ef70913de` |

Existing deterministic packet 042 receipts still point to older `20260702T190501_733201Z` envelopes.

## Simulation

Temp workspace:

`/tmp/a2a2a-p095-sequence-sim.jZH3DW`

Simulation steps:

- Copied orchestrator, coordinator, role worker, focused tests, packet 042-045 queue files, current worker envelopes, and deterministic receipts into the temp workspace.
- Applied the P094 patch preview inside the temp workspace.
- Ran the P090 Hermes one-shot ack against the temp packet 042 current envelope.
- Ran the P090 KOB one-shot ack against the temp packet 042 current envelope.
- Ran the patched selector against the temp workspace.

## Result

After simulated P094 + P090:

- `summary.next_packet`: `null`
- `ready_active_packets`: `0`
- `packet_042`: `already_acknowledged_local_safety_blocked`, receipts match latest worker envelopes.
- `packet_043`: `already_acknowledged_local_safety_blocked`, receipts match latest worker envelopes.
- `packet_044`: `already_acknowledged_local_safety_blocked`, receipts match latest worker envelopes.
- `packet_045`: `already_acknowledged_local_safety_blocked`, receipts match latest worker envelopes.

This confirms the sequence closes the duplicate-selection loop rather than generating more local worker envelopes.

## Required Gates

Run these in order:

1. `APPROVE_IMPLEMENTATION A2A2A_P094_ORCHESTRATOR_SAFE_ACK_COMPLETION_AWARE_SELECTION`
2. `APPROVE_A2A2A_P090_PACKET042_LOCAL_ROLE_WORKER_ACK_ONLY`

## Not Performed

No real source mutation, real packet 042 receipt overwrite, role worker run against the real repo, queue payload execution, live Telegram send, provider/model call, external routing, install, commit, push, deploy, secret read/print, or Cloudflare/R2 mutation was performed.
