# SIRINX Codex Hermes Execution Queue

Status: `CODEX_HERMES_EXECUTION_QUEUE_LOCAL_ONLY`
Date: `2026-06-29`
Boundary: `local_evidence_only`

This queue is not a completion claim.

It consolidates the current local Codex/Hermes work order from repo evidence only.
It does not claim all chats were read, does not create the final LANE_1 Opus packet,
does not record a Hermes decision, and does not approve LANE_2.

## Guardrails

- `claims_all_chats_read=false`
- `evidence_boundary=local_evidence_only`
- `lane2_authorized=false`
- `runtime_queue_execution=false`
- `deploy=false`
- `push=false`
- `cloud_mutation=false`
- `customer_send=false`
- `secret_read=false`
- `paid_provider_call=false`
- `telegram_live_send=false`

## Ordered Queue

| Order | Queue ID | Owner | Status | Gate | Next Safe Action |
| --- | --- | --- | --- | --- | --- |
| 1 | `LANE1-HERMES-DECISION-PACKET-013` | Hermes | `waiting_for_decision` | `codex_recorder_gate_closed` | Record a separate local Hermes decision: `route_to_opus`, `request_revision`, `open_codex_recorder_gate`, or `block`. |
| 2 | `LANE1-HERMES-DECISION-DRAFT-PACKET-015` | Codex | `draft_for_hermes_review_not_decision` | `hermes_decision_required` | Review the draft-only `route_to_opus` aid; Hermes must still record a separate validated decision before Codex recorder or LANE_2 action. |
| 3 | `LANE1-HERMES-DECISION-HANDOFF-PACKET-016` | Codex | `handoff_packet_ready_not_decision` | `hermes_decision_record_required` | Use packet_016 as the local outbox pointer to the decision intake handoff; Hermes still records the separate decision artifact before any state change. |
| 4 | `LANE1-HERMES-DECISION-PREFLIGHT-PACKET-017` | Codex | `ready_for_hermes_decision_review_not_decision` | `hermes_decision_record_required` | Use packet_017 as the local preflight audit proving review evidence is ready; Hermes still records the separate validated decision before any state change. |
| 5 | `LANE1-OPUS-ARCHITECTURE-PACKET-GATE-PACKET-018` | Codex | `validator_ready_final_packet_missing` | `hermes_decision_and_final_packet_required` | Use packet_018 to validate a future final Opus packet; do not create the final packet until Hermes/Opus decision evidence exists. |
| 6 | `LANE1-OPUS-AUTHORING-BUNDLE-PACKET-019` | Codex | `authoring_bundle_ready_not_final_packet` | `hermes_decision_and_final_packet_required` | Use packet_019 as local evidence for Hermes/Opus authoring only; it is not the final packet and cannot open LANE_2. |
| 7 | `LANE1-HERMES-DECISION-TRANSITION-GUARD` | Codex | `blocked_missing_hermes_decision` | `validated_hermes_decision_required` | After Hermes records a separate decision, rerun the guard before any recorder-gate, Opus-packet, or LANE_2 state change. |
| 8 | `ALL-CHAT-EXPORT-INTAKE` | Operator | `blocked_export_missing` | `chat_export_required` | Use the local intake contract and mapper, then provide a ChatGPT export or connector-backed source before all-chat coverage can be claimed. |
| 9 | `ALL-CHAT-EXPORT-REQUEST-PACKET-020` | Codex | `request_packet_ready_no_export_loaded` | `chat_export_required` | Use packet_020 to request an operator-supplied ChatGPT export path or authorized read-only connector scope; do not claim all chats were read until metadata mapping is reviewed. |
| 10 | `A2A-ADAPTIVE-SYNC-CONTROL-STATUS-PACKET-021` | Codex | `a2a_adaptive_sync_control_status_ready_local_only` | `local_read_only_status_review` | Review packet_021 as the current local A2A adaptive sync control status; choose one separate gated blocker-clearing lane. |
| 11 | `A2A-NEXT-SAFE-ACTION-SEQUENCER-PACKET-022` | Codex | `a2a_next_safe_action_sequencer_ready_local_only` | `local_read_only_next_lane_review` | Review packet_022 as a deterministic local sequencer; Hermes still records a separate packet_013 decision before any state change. |
| 12 | `HERMES-GATEWAY-CURRENT-RECHECK-PACKET-023` | Codex | `hermes_gateway_current_recheck_ready_local_only` | `local_read_only_gateway_status_review` | Review packet_023 as current localhost gateway evidence; Hermes/operator must start or verify the gateway separately before live routing or packet_013 decision claims. |
| 13 | `GHOSTCLAW-V3-3-ARTIFACT-INTAKE` | Codex | `blocked_exact_artifact_missing` | `exact_artifact_required` | Re-run metadata-only artifact intake after the exact `ghostclaw_repo_merge_kit_v3_3.zip` path exists. |
| 14 | `R0-GATE-SPECIFIC-APPROVALS` | Operator | `blocked_approval_missing` | `r0_gate_specific_approval_required` | Approve one named R0 gate with target, environment, rollback, and evidence path before external action. |
| 15 | `ACTIVE-GOAL-BLOCKER-RECHECK` | Codex | `done_current_state` | `local_read_only_probe_only` | Run or inspect the read-only probe runner output before claiming completion or choosing the next safe lane. |
| 16 | `MISSION-CONTROL-READONLY-EVIDENCE` | Codex | `done_local_readonly` | `no_runtime_gate_unlock` | Keep panels sourced from static evidence unless a runtime integration gate is approved. |
| 17 | `CODEX-HERMES-A2A-QUEUE-STATUS` | Codex | `local_queue_indexed_not_executed` | `local_file_bus_only` | Use the `_A2A_QUEUE` status snapshot for local coordination only; do not execute queue items. |
| 18 | `COMPLETION-REQUIREMENTS-MATRIX` | Codex | `requirements_mapped_not_complete` | `no_completion_claim_without_requirement_proof` | Use requirement-level evidence before any active-goal completion claim. |
| 19 | `SOURCE-FILE-RECEIPT` | Codex | `current_local_scan_partial` | `local_file_evidence_only` | Use the source-file receipt to separate current local files from user-message summaries before any all-files-read claim. |
| 20 | `CODEX-HERMES-WORK-REPORT-DRAFT` | Codex | `telegram_draft_ready` | `telegram_live_send_gate_closed` | Use the local Telegram-safe draft and `packet_014` outbox evidence for operator review; live Telegram delivery requires `APPROVE_TELEGRAM_WORK_REPORT_SEND`. |
| 21 | `OBSIDIAN-BRAIN-SYNC-PULSE` | Codex | `active_after_meaningful_work` | `no_secrets_no_raw_logs` | Append concise memory pulses after verified local work. |
| 22 | `LOCAL-EVIDENCE-DURABILITY` | Codex | `done_local_manifest` | `no_force_add_ignored_data` | Use the manifest and docs mirror as the review surface for ignored `data/pathspecs` artifacts. |

## Current Actionable Packet

- `current_actionable_packet=packet_013`
- Packet path: `_A2A_QUEUE/inbox/packet_013_ghostclaw_lane1_codex_recorder_gate_request.json`
- Decision inbox index: `data/pathspecs/ghostclaw_lane1_hermes_decision_inbox_2026-06-29.json`
- Packet 013 decision workbench: `data/pathspecs/ghostclaw_lane1_packet013_decision_workbench_2026-06-29.json`
- Packet 013 readiness scorecard: `data/pathspecs/ghostclaw_lane1_packet013_decision_readiness_2026-06-29.json`
- Hermes model-choice boundary: `data/pathspecs/ghostclaw_lane1_hermes_model_choice_boundary_2026-06-29.json`
- Hermes model-choice boundary doc: `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_MODEL_CHOICE_BOUNDARY_2026-06-29.md`
- Draft-only Hermes decision aid: `data/pathspecs/ghostclaw_lane1_packet013_decision_draft_2026-06-29.json`
- Draft-only Hermes decision aid doc: `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_PACKET013_DECISION_DRAFT_2026-06-29.md`
- Draft-only outbox packet: `_A2A_QUEUE/outbox/packet_015_ghostclaw_lane1_hermes_decision_draft.json`
- Decision intake outbox packet: `_A2A_QUEUE/outbox/packet_016_ghostclaw_lane1_hermes_decision_intake_handoff.json`
- Decision intake handoff: `data/pathspecs/ghostclaw_lane1_hermes_decision_intake_handoff_2026-06-29.json`
- Decision intake handoff doc: `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_INTAKE_HANDOFF_2026-06-29.md`
- Decision preflight audit packet: `_A2A_QUEUE/outbox/packet_017_ghostclaw_lane1_hermes_decision_preflight_audit.json`
- Decision preflight audit: `data/pathspecs/ghostclaw_lane1_hermes_decision_preflight_audit_2026-06-29.json`
- Decision preflight audit doc: `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_PREFLIGHT_AUDIT_2026-06-29.md`
- Opus packet gate packet: `_A2A_QUEUE/outbox/packet_018_ghostclaw_lane1_opus_architecture_packet_gate.json`
- Opus packet gate: `data/pathspecs/ghostclaw_lane1_opus_architecture_packet_gate_2026-06-29.json`
- Opus packet gate doc: `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET_GATE_2026-06-29.md`
- Opus packet validator: `WORKSPACE_SCAFFOLD/scripts/validate_lane1_opus_architecture_packet.py`
- Opus authoring bundle packet: `_A2A_QUEUE/outbox/packet_019_ghostclaw_lane1_opus_authoring_bundle.json`
- Opus authoring bundle: `data/pathspecs/ghostclaw_lane1_opus_authoring_bundle_2026-06-29.json`
- Opus authoring bundle doc: `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_AUTHORING_BUNDLE_2026-06-29.md`
- All-chat export request packet: `_A2A_QUEUE/outbox/packet_020_sirinx_all_chat_export_request.json`
- All-chat export request JSON: `data/pathspecs/sirinx_all_chat_export_request_packet_2026-06-29.json`
- All-chat export request doc: `docs/knowledge/SIRINX_ALL_CHAT_EXPORT_REQUEST_PACKET_2026-06-29.md`
- A2A adaptive sync control status packet: `_A2A_QUEUE/outbox/packet_021_sirinx_a2a_adaptive_sync_control_status.json`
- A2A adaptive sync control status JSON: `data/pathspecs/sirinx_a2a_adaptive_sync_control_status_2026-06-29.json`
- A2A adaptive sync control status doc: `docs/knowledge/SIRINX_A2A_ADAPTIVE_SYNC_CONTROL_STATUS_2026-06-29.md`
- A2A next safe action sequencer packet: `_A2A_QUEUE/outbox/packet_022_sirinx_a2a_next_safe_action_sequencer.json`
- A2A next safe action sequencer JSON: `data/pathspecs/sirinx_a2a_next_safe_action_sequencer_2026-06-29.json`
- A2A next safe action sequencer doc: `docs/knowledge/SIRINX_A2A_NEXT_SAFE_ACTION_SEQUENCER_2026-06-29.md`
- Hermes gateway current recheck packet: `_A2A_QUEUE/outbox/packet_023_sirinx_hermes_gateway_current_recheck.json`
- Hermes gateway current recheck JSON: `data/pathspecs/sirinx_hermes_gateway_current_recheck_packet_2026-06-29.json`
- Hermes gateway current recheck doc: `docs/knowledge/SIRINX_HERMES_GATEWAY_CURRENT_RECHECK_PACKET_2026-06-29.md`
- Decision transition guard: `data/pathspecs/ghostclaw_lane1_hermes_decision_transition_guard_2026-06-29.json`
- Decision transition guard doc: `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_TRANSITION_GUARD_2026-06-29.md`
- Decision validator: `data/pathspecs/ghostclaw_lane1_hermes_decision_validator_2026-06-29.json`
- Hermes gateway recheck: `data/pathspecs/sirinx_hermes_gateway_recheck_2026-06-29.json`
- Decision doc: `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_INBOX_INDEX_2026-06-29.md`

Hermes must record a separate decision artifact before Codex can act as recorder.
Until then, the Codex recorder gate remains closed.

## Source Evidence

- `data/pathspecs/sirinx_active_goal_systematic_work_index_2026-06-29.json`
- `data/pathspecs/ghostclaw_lane1_hermes_decision_inbox_2026-06-29.json`
- `data/pathspecs/sirinx_hermes_gateway_recheck_2026-06-29.json`
- `data/pathspecs/sirinx_all_chat_export_intake_contract_2026-06-29.json`
- `data/pathspecs/sirinx_all_chat_export_intake_mapper_2026-06-29.json`
- `data/pathspecs/sirinx_all_chat_export_request_packet_2026-06-29.json`
- `docs/knowledge/SIRINX_ALL_CHAT_EXPORT_REQUEST_PACKET_2026-06-29.md`
- `_A2A_QUEUE/outbox/packet_020_sirinx_all_chat_export_request.json`
- `data/pathspecs/sirinx_a2a_adaptive_sync_control_status_2026-06-29.json`
- `docs/knowledge/SIRINX_A2A_ADAPTIVE_SYNC_CONTROL_STATUS_2026-06-29.md`
- `_A2A_QUEUE/outbox/packet_021_sirinx_a2a_adaptive_sync_control_status.json`
- `data/pathspecs/sirinx_a2a_next_safe_action_sequencer_2026-06-29.json`
- `docs/knowledge/SIRINX_A2A_NEXT_SAFE_ACTION_SEQUENCER_2026-06-29.md`
- `_A2A_QUEUE/outbox/packet_022_sirinx_a2a_next_safe_action_sequencer.json`
- `data/pathspecs/sirinx_hermes_gateway_current_recheck_packet_2026-06-29.json`
- `docs/knowledge/SIRINX_HERMES_GATEWAY_CURRENT_RECHECK_PACKET_2026-06-29.md`
- `_A2A_QUEUE/outbox/packet_023_sirinx_hermes_gateway_current_recheck.json`
- `data/pathspecs/sirinx_hermes_codex_a2a_godmode_v3_html_recheck_2026-06-29.json`
- `data/pathspecs/sirinx_active_goal_blocker_recheck_2026-06-29.json`
- `data/pathspecs/sirinx_active_goal_blocker_clearance_validator_2026-06-29.json`
- `WORKSPACE_SCAFFOLD/scripts/probe_active_goal_blockers.py`
- `data/pathspecs/sirinx_active_goal_read_only_probe_runner_2026-06-29.json`
- `docs/knowledge/SIRINX_ACTIVE_GOAL_READ_ONLY_PROBE_RUNNER_2026-06-29.md`
- `WORKSPACE_SCAFFOLD/reports/active_goal_read_only_probe_latest_2026-06-29.json`
- `data/pathspecs/sirinx_active_goal_completion_requirements_matrix_2026-06-29.json`
- `docs/knowledge/SIRINX_ACTIVE_GOAL_COMPLETION_REQUIREMENTS_MATRIX_2026-06-29.md`
- `data/pathspecs/sirinx_codex_hermes_a2a_queue_status_2026-06-29.json`
- `docs/knowledge/SIRINX_CODEX_HERMES_A2A_QUEUE_STATUS_2026-06-29.md`
- `WORKSPACE_SCAFFOLD/reports/codex_hermes_a2a_queue_status_latest_2026-06-29.json`
- `WORKSPACE_SCAFFOLD/scripts/build_codex_hermes_a2a_queue_status.py`
- `data/pathspecs/sirinx_codex_hermes_work_report_contract_2026-06-29.json`
- `docs/knowledge/SIRINX_CODEX_HERMES_WORK_REPORT_DRAFT_2026-06-29.md`
- `_A2A_QUEUE/outbox/packet_014_codex_hermes_work_report_draft.json`
- `docs/knowledge/SIRINX_CODEX_HERMES_WORK_REPORT_PACKET_2026-06-29.md`
- `data/pathspecs/sirinx_active_goal_current_blocker_refresh_2026-06-29.json`
- `data/pathspecs/sirinx_active_goal_context_packet_registry_2026-06-29.json`
- `data/pathspecs/sirinx_active_goal_source_file_receipt_2026-06-29.json`
- `docs/knowledge/SIRINX_ACTIVE_GOAL_SOURCE_FILE_RECEIPT_2026-06-29.md`
- `data/pathspecs/ghostclaw_lane1_packet013_decision_workbench_2026-06-29.json`
- `data/pathspecs/ghostclaw_lane1_packet013_decision_readiness_2026-06-29.json`
- `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_PACKET013_DECISION_READINESS_2026-06-29.md`
- `data/pathspecs/ghostclaw_lane1_hermes_model_choice_boundary_2026-06-29.json`
- `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_MODEL_CHOICE_BOUNDARY_2026-06-29.md`
- `data/pathspecs/ghostclaw_lane1_hermes_decision_validator_2026-06-29.json`
- `WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_draft.py`
- `data/pathspecs/ghostclaw_lane1_packet013_decision_draft_2026-06-29.json`
- `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_PACKET013_DECISION_DRAFT_2026-06-29.md`
- `_A2A_QUEUE/outbox/packet_015_ghostclaw_lane1_hermes_decision_draft.json`
- `_A2A_QUEUE/outbox/packet_016_ghostclaw_lane1_hermes_decision_intake_handoff.json`
- `_A2A_QUEUE/outbox/packet_017_ghostclaw_lane1_hermes_decision_preflight_audit.json`
- `_A2A_QUEUE/outbox/packet_018_ghostclaw_lane1_opus_architecture_packet_gate.json`
- `data/pathspecs/ghostclaw_lane1_opus_authoring_bundle_2026-06-29.json`
- `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_AUTHORING_BUNDLE_2026-06-29.md`
- `_A2A_QUEUE/outbox/packet_019_ghostclaw_lane1_opus_authoring_bundle.json`
- `WORKSPACE_SCAFFOLD/tests/test_lane1_opus_authoring_bundle.py`
- `WORKSPACE_SCAFFOLD/tests/test_lane1_hermes_decision_handoff_packet.py`
- `WORKSPACE_SCAFFOLD/tests/test_lane1_hermes_decision_preflight_audit.py`
- `WORKSPACE_SCAFFOLD/tests/test_lane1_opus_architecture_packet_gate.py`
- `WORKSPACE_SCAFFOLD/tests/test_lane1_packet013_decision_draft.py`
- `WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_intake_handoff.py`
- `WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_preflight_audit.py`
- `data/pathspecs/ghostclaw_lane1_hermes_decision_preflight_audit_2026-06-29.json`
- `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_PREFLIGHT_AUDIT_2026-06-29.md`
- `WORKSPACE_SCAFFOLD/scripts/validate_lane1_opus_architecture_packet.py`
- `data/pathspecs/ghostclaw_lane1_opus_architecture_packet_gate_2026-06-29.json`
- `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET_GATE_2026-06-29.md`
- `data/pathspecs/ghostclaw_lane1_hermes_decision_intake_handoff_2026-06-29.json`
- `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_INTAKE_HANDOFF_2026-06-29.md`
- `WORKSPACE_SCAFFOLD/tests/test_lane1_hermes_decision_intake_handoff.py`
- `WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_transition_guard.py`
- `data/pathspecs/ghostclaw_lane1_hermes_decision_transition_guard_2026-06-29.json`
- `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_TRANSITION_GUARD_2026-06-29.md`
- `WORKSPACE_SCAFFOLD/tests/test_lane1_hermes_decision_transition_guard.py`
- `data/pathspecs/sirinx_r0_gate_specific_approval_contract_2026-06-29.json`
- `WORKSPACE_SCAFFOLD/manifests/active_goal_local_evidence_durability_2026-06-29.json`
- `docs/knowledge/SIRINX_ACTIVE_GOAL_LOCAL_EVIDENCE_DURABILITY_MANIFEST_2026-06-29.md`
- `PROJECT_STATE.md`
- `NEXT_ACTIONS.md`
- `_OBSIDIAN_GHOSTCLAW_BRAIN/16_STATUS_BOARD.md`

## Verification

```bash
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_codex_hermes_execution_queue -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_codex_hermes_work_report -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_codex_hermes_work_report_packet -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_active_goal_blocker_recheck -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_active_goal_blocker_clearance_validator -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_active_goal_read_only_probe_runner -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_active_goal_current_blocker_refresh -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_active_goal_completion_requirements_matrix -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_active_goal_context_packet_registry -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_active_goal_source_file_receipt -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_active_goal_local_evidence_durability_manifest -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_codex_hermes_a2a_queue_status -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_lane1_hermes_decision_handoff_packet -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_lane1_hermes_decision_preflight_audit -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_lane1_opus_architecture_packet_gate -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_lane1_opus_authoring_bundle -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_lane1_packet013_decision_draft -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_lane1_hermes_decision_intake_handoff -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_lane1_hermes_decision_transition_guard -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_lane1_packet013_decision_workbench -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_lane1_packet013_decision_readiness -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_lane1_hermes_model_choice_boundary -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_hermes_codex_a2a_godmode_html_recheck -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_all_chat_export_intake_mapper -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_all_chat_export_request_packet -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_a2a_adaptive_sync_control_status_packet -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_a2a_next_safe_action_sequencer_packet -v
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_r0_gate_specific_approval_contract -v
python3 -m json.tool data/pathspecs/sirinx_codex_hermes_execution_queue_2026-06-29.json > /dev/null
node scripts/check-operating-files.mjs
git diff --check
```

## Non-Actions

No provider call, runtime queue execution, merge script, feature branch, commit,
push, deploy, cloud mutation, install, migration, wallet action, live send, or
secret read is authorized by this queue.

The work-report lane creates a Telegram-safe draft only. It does not send a
Telegram message unless the separate `APPROVE_TELEGRAM_WORK_REPORT_SEND` gate is
recorded.

The `LOCAL-EVIDENCE-DURABILITY` item does not force-add ignored `data/`
artifacts. It only records the current local pathspec evidence and doc mirrors
for review.

The `CODEX-HERMES-A2A-QUEUE-STATUS` item indexes the local file-bus only. It
does not move packets, execute queue items, record a Hermes decision, open the
Codex recorder gate, or authorize LANE_2.

The `LANE1-HERMES-DECISION-DRAFT-PACKET-015` item is only a draft decision aid.
It does not record a Hermes decision, call a provider, execute the runtime
queue, open the Codex recorder gate, or authorize LANE_2.

The decision intake handoff records the exact future decision path, required
fields, evidence paths, and local validation commands. It does not create a
decision file, mutate queue state, open the Codex recorder gate, call providers,
execute runtime queues, or authorize LANE_2.

The `LANE1-HERMES-DECISION-HANDOFF-PACKET-016` item is an outbox pointer to the
same handoff. It is not a Hermes decision, does not call providers, does not
execute runtime queues, and does not authorize deploy, push, cloud mutation,
customer send, secret read, paid/provider calls, or LANE_2.

The `LANE1-HERMES-DECISION-PREFLIGHT-PACKET-017` item confirms local review
evidence is ready for Hermes. It is not a Hermes decision, does not call
providers, does not execute runtime queues, does not create the final Opus
packet, and does not authorize deploy, push, cloud mutation, customer send,
secret read, paid/provider calls, state mutation, or LANE_2.

The `LANE1-OPUS-ARCHITECTURE-PACKET-GATE-PACKET-018` item validates a future
final Opus packet only after separate Hermes/Opus evidence exists. It does not
create the final Opus packet, record a Hermes decision, mutate state, execute
runtime queues, or authorize LANE_2.

The `LANE1-OPUS-AUTHORING-BUNDLE-PACKET-019` item gives Hermes/Opus local
authoring evidence and instructions only. It is not the final packet, not a
Hermes decision, does not call providers, does not execute runtime queues, and
does not authorize deploy, push, cloud mutation, customer send, secret read,
paid/provider calls, state mutation, or LANE_2.

The `LANE1-HERMES-DECISION-TRANSITION-GUARD` item does not create a decision
record, mutate queue state, open the Codex recorder gate, call providers,
execute runtime queues, or authorize LANE_2. It currently fails closed because
the separate Hermes decision artifact is missing.

The `ALL-CHAT-EXPORT-REQUEST-PACKET-020` item only requests an operator-supplied
ChatGPT export path or explicitly authorized read-only connector scope. It does
not load raw chat content, perform a connector read, call a provider, execute a
queue item, or claim all chats were read.

The `A2A-ADAPTIVE-SYNC-CONTROL-STATUS-PACKET-021` item is a read-only control
status snapshot. It does not execute queue items, record a Hermes decision,
load chat exports, call providers, mutate state, authorize LANE_2, or claim
completion.

The `A2A-NEXT-SAFE-ACTION-SEQUENCER-PACKET-022` item is a read-only sequencer.
It selects `record_hermes_packet_013_decision` as the next review lane but does
not record a Hermes decision, execute queue items, mutate state, open the Codex
recorder gate, authorize LANE_2, or clear blockers.

The `SOURCE-FILE-RECEIPT` item does not claim the missing user-named source
files were read. It only records which named files currently exist under the
local scan roots and which remain user-message-summary-only evidence.

The `COMPLETION-REQUIREMENTS-MATRIX` item does not mark the goal complete. It
keeps completion blocked until each requirement has direct current evidence.
