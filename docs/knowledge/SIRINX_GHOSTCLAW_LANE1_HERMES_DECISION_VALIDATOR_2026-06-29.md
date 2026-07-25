# SIRINX GhostClaw LANE_1 Hermes Decision Validator

Status: `HERMES_DECISION_VALIDATOR_NOT_DECISION`

Date: 2026-06-29

Mode: local-only validator, no external writes

This validator is not a Hermes decision.

It does not authorize deploy, push, cloud mutation, customer send, secret read, paid provider call, runtime queue execution, or LANE_2.

Hermes may use any model for vibe coding draft help only.

Blanket approval is not executable approval.

Each external or paid action requires gate-specific approval.

## Purpose

`WORKSPACE_SCAFFOLD/scripts/validate_lane1_hermes_decision.py` validates a
future decision artifact at:

```text
docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md
```

The validator checks shape and safety boundaries only. It does not create the
decision file, does not call Hermes gateway, does not call a provider, and does
not mutate runtime queues.

## Required Decision Fields

An actual decision file must include line-oriented fields:

```text
HERMES_REVIEW_DECISION_RECORD
decision=route_to_opus|request_revision|open_codex_recorder_gate|block
decision_record=true
codex_recorder_gate_open=true|false
lane2_authorized=false
approval_scope=local_decision_only
reviewed_evidence_paths=relative/path/one,relative/path/two,relative/path/three
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

## Decision Rules

| Field | Rule |
| --- | --- |
| `decision` | Must be `route_to_opus`, `request_revision`, `open_codex_recorder_gate`, or `block` |
| `decision_record` | Must be `true` only in an actual decision file |
| `codex_recorder_gate_open` | Can be `true` only when `decision=open_codex_recorder_gate` |
| `lane2_authorized` | Must remain `false` |
| `approval_scope` | Must be `local_decision_only` |
| `reviewed_evidence_paths` | Must include at least three relative local paths and no secret-like paths |
| blocked action flags | Must all remain `false` |

## Commands

The missing decision file is treated as blocked, not success:

```sh
python3 WORKSPACE_SCAFFOLD/scripts/validate_lane1_hermes_decision.py docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md
```

Expected current result:

```text
ok=false
reason=missing_decision_file
```

## Boundary

This file and its JSON contract are validation scaffolding only. `packet_013`
remains a request until Hermes or the operator records a separate decision file.

task=GhostClaw LANE_1 Hermes decision validator
files=WORKSPACE_SCAFFOLD/scripts/validate_lane1_hermes_decision.py,data/pathspecs/ghostclaw_lane1_hermes_decision_validator_2026-06-29.json,docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_VALIDATOR_2026-06-29.md
decision_record=false
codex_recorder_gate_open=false
lane2_authorized=false
next_step=Hermes or operator records and validates a separate packet_013 decision file
