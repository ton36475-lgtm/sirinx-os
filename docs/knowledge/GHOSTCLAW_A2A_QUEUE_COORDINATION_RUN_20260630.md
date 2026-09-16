# GhostClaw A2A Queue Coordination Run

Date: 2026-06-30
Mode: local-safe Codex-side A2A queue coordination
Status: passed for local queue coordination; MCP auth refresh and external repo install remain approval-gated

## Scope

This run promotes the existing local Hermes, KOB, and A2A Sync workers from
smoke-only runtime evidence into safe `_A2A_QUEUE` coordination. The coordinator
reads queue metadata, dispatches safe packets into runtime inboxes, and writes
gate records for packets that require explicit approval.

It does not mutate `_A2A_QUEUE` files and does not execute packet payloads.

## Local Runtime

Active local worker sessions:

- `ghostclaw-hermes`
- `ghostclaw-kob`
- `ghostclaw-a2a-sync`

Current state files:

- `.ghostclaw_runtime/a2a2a/state/hermes.json`
- `.ghostclaw_runtime/a2a2a/state/kob.json`
- `.ghostclaw_runtime/a2a2a/state/a2a-sync.json`
- `.ghostclaw_runtime/a2a2a/state/queue-coordination-latest.json`

The latest state confirms all three workers are `local_worker=true` and
`probe_only=false`.

## Coordinator

Script:

```bash
python3 scripts/ghostclaw_a2a_queue_coordinator.py --root . --write-receipt
```

Latest receipt:

```text
.ghostclaw_runtime/a2a2a/receipts/queue_coordination_20260630T012045_865970Z.json
```

Packet result:

- total packets scanned: 38
- safe packets dispatched to local workers: 9
- approval-gated packets recorded: 20
- observed-only packets: 9

Safe dispatched packets included:

- `_A2A_QUEUE/inbox/packet_010_creature_viewer.json`
- `_A2A_QUEUE/inbox/packet_011_ghostclaw_lane1_opus_architecture.json`
- `_A2A_QUEUE/inbox/packet_012_ghostclaw_lane1_hermes_draft_review.json`
- `_A2A_QUEUE/inbox/packet_024_sirinx_hermes_a2a_codex_sync_all_jobs.json`
- `_A2A_QUEUE/outbox/outbox_61547c54.json`
- `_A2A_QUEUE/outbox/outbox_76e32cce.json`
- `_A2A_QUEUE/outbox/outbox_90f8193e.json`
- `_A2A_QUEUE/outbox/outbox_e499b98e.json`
- `_A2A_QUEUE/outbox/packet_026_ghostclaw_lane1_hermes_decision_route_to_opus.json`

## Worker Receipt Proof

Representative Hermes receipt:

```text
.ghostclaw_runtime/a2a2a/receipts/hermes_route_queue_coord_packet_024_sirinx_hermes_a2a_codex_sync_all_jobs_hermes_20260630T012045_865970Z.json
```

Result: `status=routed_local_only`, no blocked reasons, payload not executed.

Representative KOB receipt:

```text
.ghostclaw_runtime/a2a2a/receipts/kob_verdict_queue_coord_packet_024_sirinx_hermes_a2a_codex_sync_all_jobs_kob_20260630T012045_865970Z.json
```

Result: `status=kob_allow_local_ack_only`, no blocked reasons, payload not
executed.

The role worker was also corrected to avoid false-positive blocking from JSON
keys such as `secret_read=false` or `deploy=false`. It now scans string payload
values for risky command text while preserving explicit boolean safety checks.

## Approval-Gated Lanes

MCP auth refresh packets are recorded only as gate records and require:

```text
APPROVE_MCP_AUTH_REFRESH_LINEAR
APPROVE_MCP_AUTH_REFRESH_NOTION
APPROVE_MCP_AUTH_REFRESH_FIGMA
```

External repo install packets are recorded only as gate records and require:

```text
APPROVE_INSTALL_OH_MY_OPENCODE_LITE_QUARANTINE
APPROVE_INSTALL_AGENT_BLACKBOX_QUARANTINE
```

Generic approval packets continue to require:

```text
APPROVE_GATE_SPECIFIC_ACTION
```

## Blocked Actions Preserved

- queue file mutation
- MCP auth refresh
- external repo install
- package install
- postinstall execution
- secret read
- provider or model call
- Telegram, LINE, email, or customer live send
- deploy
- git push
- cloud mutation
- destructive cleanup

## Verification

Commands completed:

```bash
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_ghostclaw_a2a_queue_coordinator WORKSPACE_SCAFFOLD.tests.test_ghostclaw_a2a_role_worker WORKSPACE_SCAFFOLD.tests.test_ghostclaw_a2a_bus_watcher WORKSPACE_SCAFFOLD.tests.test_ghostclaw_a2a_entrypoint_verifier WORKSPACE_SCAFFOLD.tests.test_ghostclaw_a2a_sync_start_completion_audit WORKSPACE_SCAFFOLD.tests.test_codex_no_mcp_sidebar_runbook WORKSPACE_SCAFFOLD.tests.test_ghostclaw_a2a_sync_probe -v
python3 -m py_compile scripts/ghostclaw_a2a_queue_coordinator.py scripts/ghostclaw_a2a_role_worker.py scripts/ghostclaw_a2a_bus_watcher.py scripts/ghostclaw_a2a_entrypoint_verifier.py scripts/ghostclaw_a2a_sync_probe.py
git diff --check -- scripts/ghostclaw_a2a_queue_coordinator.py scripts/ghostclaw_a2a_role_worker.py WORKSPACE_SCAFFOLD/tests/test_ghostclaw_a2a_queue_coordinator.py WORKSPACE_SCAFFOLD/tests/test_ghostclaw_a2a_role_worker.py
```

Result:

- 20 tests passed
- Python syntax compile passed
- scoped whitespace diff check passed
- latest coordinator and worker JSON receipts parsed successfully

## Next Safe Action

Continue using the local workers for safe Codex-side queue coordination. If the
operator wants MCP auth refresh or external repo install, open exactly one
matching approval-gated lane first.
