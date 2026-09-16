# SIRINX R0 Gate-Specific Approval Contract

Status: `R0_GATE_SPECIFIC_APPROVAL_CONTRACT_NOT_APPROVAL`

Date: 2026-06-29

Mode: local-only contract, validator, no external writes

This contract is not approval.

Blanket approval is not executable approval.

Each external action requires one gate-specific packet.

secret_read is not authorized by this local contract.

## Purpose

This contract defines the local shape of a future R0 approval packet. It
exists to prevent broad approval text from being treated as permission to
deploy, push, mutate cloud resources, send customer messages, call paid
providers, or run wallet actions.

## Future Packet Path

```text
docs/knowledge/SIRINX_R0_GATE_APPROVAL_PACKET.md
```

The packet does not exist now. Missing packet status is a blocker, not success.

## Required Packet Fields

```text
SIRINX_R0_GATE_APPROVAL_PACKET
approval_packet_record=true
gate_id=R0-01
action=testnet_deploy
target=apps/pocket-hatchery
environment=testnet
rollback=apps/pocket-hatchery/ops/rollback_plan_review.md
evidence_path=apps/pocket-hatchery/ops/release_gate_evidence.md
approval_scope=single_gate_only
approved_by=Pitoon
approval_expires_at=2026-06-30T23:59:59+07:00
blanket_approval=false
approve_all=false
```

## Known Gates

| Gate | Action | Target |
| --- | --- | --- |
| `R0-01` | `testnet_deploy` | `apps/pocket-hatchery` |
| `R0-02` | `real_wallet_connector_implementation` | `apps/pocket-hatchery` |
| `R0-03` | `merge_staging_to_main` | `staging/godmode-master-os-v2` |

## Validator

```sh
python3 WORKSPACE_SCAFFOLD/scripts/validate_r0_gate_approval.py docs/knowledge/SIRINX_R0_GATE_APPROVAL_PACKET.md
```

Expected current result:

```text
ok=false
reason=missing_r0_approval_packet
```

## Non-Actions

No deploy, push, cloud mutation, customer send, secret read, paid/provider call, runtime queue execution, or wallet action was performed.

## Boundary

This contract and template only validate future approval packet shape. They do
not execute the approved action. Execution still requires a separate,
operator-triggered command in the correct environment after final verification.

task=R0 gate-specific approval contract
files=data/pathspecs/sirinx_r0_gate_specific_approval_contract_2026-06-29.json,WORKSPACE_SCAFFOLD/scripts/validate_r0_gate_approval.py,WORKSPACE_SCAFFOLD/templates/r0_gate_specific_approval_packet.template.json,docs/knowledge/SIRINX_R0_GATE_SPECIFIC_APPROVAL_CONTRACT_2026-06-29.md
approval_packet_record=false
blanket_approval_actionable=false
runtime_execution=false
deploy=false
push=false
