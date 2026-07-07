# A2A2A P090 Packet 042 Ack Readiness

Status: `ACK_ONLY_GATE_READY`

## Purpose

Prepare the next separate gate for current `packet_042` worker acknowledgement.
This packet does not run the role workers.

## Required Gate

`APPROVE_A2A2A_P090_PACKET042_LOCAL_ROLE_WORKER_ACK_ONLY`

## Target Envelopes

| Target | Envelope | SHA256 |
|---|---|---|
| Hermes | `.ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_042_hermes_20260703T053954_538903Z.json` | `3e99cac1ee19b86a5d554631170774ec229ac0c64f3e58d1b59501f536ad7147` |
| KOB | `.ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_042_kob_20260703T053954_538903Z.json` | `49336b3c0eb8cd053c084027155a2ea1f3c8c11b305a1a004c7c588ef70913de` |

## Post-Gate One-Shot Commands

```bash
python3 scripts/ghostclaw_a2a_role_worker.py --agent hermes --once --packet .ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_042_hermes_20260703T053954_538903Z.json
python3 scripts/ghostclaw_a2a_role_worker.py --agent kob --once --packet .ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_042_kob_20260703T053954_538903Z.json
```

## Expected Receipts After Approval

- `.ghostclaw_runtime/a2a2a/receipts/hermes_route_p004_local_dispatch_packet_042_hermes.json`
- `.ghostclaw_runtime/a2a2a/receipts/kob_verdict_p004_local_dispatch_packet_042_kob.json`

The receipts must reference the current envelope timestamp
`20260703T053954_538903Z`. Older packet 042 receipts from
`20260702T190501_733201Z` do not satisfy this gate.

Note: the local role worker uses deterministic receipt IDs. These receipt paths
already exist from an older packet 042 envelope and may be updated if this gate
is approved. The validation after P090 must confirm that each receipt points to
the current `20260703T053954_538903Z` envelope and matching SHA256.

## Policy

This gate allows one-shot local ack receipt writes only. It does not allow a
persistent worker loop, queue payload execution, Telegram live send,
provider/model call, external routing, install, commit, push, deploy,
secret read/print, or Cloudflare/R2 mutation.
