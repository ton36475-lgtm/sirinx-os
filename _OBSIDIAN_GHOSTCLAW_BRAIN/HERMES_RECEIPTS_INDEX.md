# Hermes Receipts Index — 2026-06-30

## A2A2A Smoke Test Receipts (34 verified)
- Schema: ghostclaw.a2a2a.hermes_route_receipt.v1
- Schema: ghostclaw.a2a2a.kob_verdict_receipt.v1
- Schema: ghostclaw.a2a2a.bus_ack_receipt.v1

### Key Receipts
| Receipt | Status | Source → Target | Mission |
|---|---|---|---|
| hermes_route_smoke_codex_to_hermes | routed_local_only | codex → hermes | a2a_sync_smoke_test |
| kob_verdict_smoke_codex_to_kob | kob_allow_local_ack_only | codex → kob | a2a_sync_smoke_test |
| bus_ack_opus_smoke_codex_to_opus | acknowledged_local_bus_sync | codex → opus | a2a_sync_smoke_test |
| a2a_sync_start_2026-06-30T005004 | pass | system | ghostclaw_a2a_sync_start |

### Safety Verification
- All execution flags: false
- No paid model calls
- No secret access
- No cloud mutation
- No git push
- No deploy
- No payload executed
- probe_only: false (role workers active)