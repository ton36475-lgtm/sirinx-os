# SIRINX Hermes Gateway Repair Approval Gate

Status: `HERMES_GATEWAY_REPAIR_APPROVAL_GATE_LOCAL_ONLY`

Packet: `packet_038`

Source packet: `packet_037`

Selected blocker: `BLOCK-HERMES-GATEWAY`

Approval scope: `approval_gate_request_not_approval`

## Boundary

This packet is not approval.

```text
approval_status=not_granted
approval_packet_record=false
execution_approval_required=true
claims_goal_complete=false
claims_all_chats_read=false
blocker_clearance=false
service_repair=false
service_restart=false
runtime_queue_execution=false
real_mcp_execution=false
line_webhook_activation=false
production_analytics=false
crm_customer_data_storage=false
lane2_authorized=false
```

## Current Evidence

- Source pathspec: `data/pathspecs/sirinx_active_goal_current_probe_refresh_2026-07-02.json`
- Source doc: `docs/knowledge/SIRINX_ACTIVE_GOAL_CURRENT_PROBE_REFRESH_2026-07-02.md`
- Probe report: `WORKSPACE_SCAFFOLD/reports/active_goal_read_only_probe_latest_2026-06-29.json`
- Hermes health URL: `http://127.0.0.1:9000/health`
- Hermes knowledge URL: `http://127.0.0.1:9000/knowledge/status`
- Probe result: `ConnectionRefusedError`
- Health exit code: `7`
- Knowledge status exit code: `7`
- No service repair or restart was attempted.

## Future Approval Phrase

Use this exact future phrase only if the operator wants Codex to perform a local stack repair attempt for this target:

```text
APPROVE_LOCAL_STACK_REPAIR_HERMES_GATEWAY_<target>_<date>
```

This narrows the prior matrix gate:

```text
APPROVE_LOCAL_STACK_REPAIR_<target>_<date>
```

## Required Approval Fields

- `target`
- `operator`
- `approved_at`
- `scope`
- `rollback_plan`
- `commands_allowed`
- `max_duration_minutes`
- `evidence_path`
- `stop_conditions`
- `no_secrets_confirmed`

## Allowed Only After Future Approval

- Verify current process status.
- Run documented local repair command for the named target only.
- Run read-only gateway health probe.
- Run read-only gateway knowledge/status probe.
- Write local repair evidence.

## Forbidden Without Gate

- service repair
- service restart
- install
- migration
- secret read
- real `.env` read
- deploy
- push
- provider call
- paid provider call
- runtime queue execution
- real MCP execution
- cloud mutation
- customer send
- Telegram or LINE live send
- LINE webhook activation
- production analytics
- CRM/customer data storage
- database write
- public tunnel
- final packet creation
- LANE_2 authorization
- blocker clearance
- goal completion claim

## Stop Conditions

Stop immediately if:

- Any command asks for a secret or real `.env` value.
- The repair target differs from the approved target.
- The command would install dependencies or mutate cloud resources.
- The command would deploy, push, migrate, or call providers.
- Read-only probes remain unavailable after the approved local repair window.

## Next Safe Action

Hermes/KOB/operator reviews `packet_038` locally. If repair is desired, provide the exact approval phrase plus all required fields. Until then, `BLOCK-HERMES-GATEWAY` stays open.
