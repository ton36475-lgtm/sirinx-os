# SIRINX Active Goal Blocker Clearance Validator

Status: `ACTIVE_GOAL_BLOCKER_CLEARANCE_VALIDATOR_LOCAL_ONLY`
Date: `2026-06-29`
Boundary: `local_evidence_only`

This validator does not clear any blocker by itself.

It checks one proposed blocker clearance packet and returns either `clearable`
or `blocked`. A clearable result is still only evidence for operator/Hermes
review; it is not a full active-goal completion claim.

```text
clearance_scope=single_blocker_only
claims_goal_complete=false
claims_all_chats_read=false
deploy=false
push=false
cloud_mutation=false
customer_send=false
secret_read=false
paid_provider_call=false
runtime_queue_execution=false
merge_script_execution=false
install=false
migration=false
```

## Tool

```bash
python3 WORKSPACE_SCAFFOLD/scripts/validate_active_goal_blocker_clearance.py \
  docs/knowledge/SIRINX_ACTIVE_GOAL_BLOCKER_CLEARANCE_PACKET.md
```

If the packet is missing, the tool exits fail-closed with code `2` and
`missing_clearance_packet`.

## Accepted Blockers

| Blocker | Required Evidence |
| --- | --- |
| `BLOCK-CHAT-EXPORT` | `sirinx.all_chat_export.intake_map.v1` JSON, `real_export_loaded=true`, `raw_chat_content_stored=false`, records present |
| `BLOCK-LANE1-OPUS-PACKET` | Final Opus architecture packet and Hermes review decision record |
| `BLOCK-HERMES-GATEWAY` | Read-only gateway evidence with `hermes_gateway_available=true` |
| `BLOCK-V3-3-ARTIFACT` | Exact `ghostclaw_repo_merge_kit_v3_3.zip` plus bundled policy test pass evidence |
| `BLOCK-R0-APPROVALS` | Valid single-gate `SIRINX_R0_GATE_APPROVAL_PACKET` |

## Non-Actions

No deploy, push, cloud mutation, customer send, secret read, paid/provider call, runtime queue execution, merge script, install, or migration is authorized.

The validator does not run provider calls, upload files, restart Hermes,
execute a runtime queue, run merge scripts, create approvals, or mark the active
goal complete.

## Verification

```bash
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_active_goal_blocker_clearance_validator -v
python3 -m json.tool data/pathspecs/sirinx_active_goal_blocker_clearance_validator_2026-06-29.json > /dev/null
python3 -m json.tool WORKSPACE_SCAFFOLD/templates/active_goal_blocker_clearance_packet.template.json > /dev/null
git diff --check
```
