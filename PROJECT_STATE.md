# PROJECT_STATE

Date: 2026-07-02
Last Update: GHOSTCLAW-KNOWLEDGE-INTEGRATION-20260702-001
Repo: `/Users/sirinx/sirinx-os`
Branch: `staging/godmode-master-os-v2`
Runtime mode: local control plane, dry-run only
Canonical protocol: `AGENTS.md`
Last verified baseline: `28b8ea1 chore(staging): GhostClaws GodMode Mission Control integration`

## Current Truth

- `www.sirinx.co` remains the protected public company website.
- **Pocket Hatchery is the flagship MVP** under GhostClaws Agent Factory v4.
- Public wallet path: WAX Cloud Wallet / My Cloud Wallet.
- `waxwing` signer remains office-internal only during Sprint 1.
- No gambling, paid random loot box, cash-out, or real-money prize pool mechanics.
- Public website source is `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx`.
- Command Center source is this repo: `/Users/sirinx/sirinx-os`.
- GitHub repo integration inventory is local-only through `GET /api/github-integration`.
- Lead qualification is local-only through `GET /api/lead-health` and model `2026-05-20.lead-qualification.v2`.
- Lead event audit preview is local-only through `GET /api/lead-event-audit` and `POST /api/lead-event-audit/preview`; it stores no raw contact values and performs no CRM/Supabase/production writes.
- Lead CRM handoff comparison is local-only through `GET /api/lead-crm-contract`; database/CRM writes remain disabled.
- Solar ops entity mapping from `sirinx-solar-energy` is local-only through `GET /api/solar-ops-contract`; it does not apply Supabase schema, copy mock PII, or deploy Cloudflare workers.
- `oz-corp-omega-dual-node` safe-command and continuity-memory ideas are mapped as docs-only policy; no runtime command runner or worker is imported.
- Policy decision status is local-only through `GET /api/policy-core` and engine `2026-05-20.policy-core.v1`.
- Hermes inbox dry-run preview is local-only through `POST /api/hermes-inbox/dry-run`.
- Hermes inbox `approval_required` decisions are queued locally in `GET /api/approval-queue`.
- Approval queue evidence snapshots are local-only through `GET /api/approval-evidence` and `POST /api/approval-evidence/write`.
- Pending work ledger is local-only through `GET /api/pending-work` and `pnpm pending-work:check`; it reports `hiddenBacklog=false`, strict gate order, and `externalWrites=false`.
- Command Center displays Hermes inbox policy dry-run results through the `Policy Dry-Run Preview` panel.
- Command Center displays lead event audit lane, risk flags, external handoff blocks, and evidence checklist inside the Lead Backend panel.
- Pocket Hatchery read-only viewer is available locally at `/pocket-hatchery` through `apps/centerbrain-shell/app/pocket-hatchery/page.tsx`; it performs no wallet mutation, no external write, and no paid randomness.
- Pocket Hatchery public signer exposure evidence is stored at `WORKSPACE_SCAFFOLD/security_scan_waxwing.json`; public scan paths remain `apps/pocket-hatchery/web` and `docs`.
- Pocket Hatchery local release evidence score is `84/100`; this does not approve testnet deploy, production release, real wallet connector, push, or cloud mutation.
- GodMode Mission Control exposes Pocket Hatchery release evidence as a read-only R0 panel sourced from static repo data; it does not read runtime files or execute commands.
- Unified Codex + Hermes continuation is indexed at `docs/knowledge/SIRINX_CODEX_HERMES_UNIFIED_CONTINUATION_2026-06-29.md`; it is local-evidence-only and not a full ChatGPT export import.
- GhostClaw `LANE_0` Hermes Commander A2A2A scaffold is complete as local evidence; `LANE_1` Opus architecture packet is the next safe docs-only lane. Evidence is indexed at `docs/knowledge/SIRINX_GHOSTCLAW_LANE0_STATUS_REFRESH_2026-06-29.md`.
- GhostClaw `LANE_1` Opus architecture request is prepared at `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_REQUEST_2026-06-29.md`; this is a routing/request artifact only and does not mark the Opus architecture packet complete.
- GhostClaw `LANE_1` request is queued locally for Hermes routing at `_A2A_QUEUE/inbox/packet_011_ghostclaw_lane1_opus_architecture.json`; no live send, provider call, worker runtime, or LANE_2 build has run.
- GhostClaw `LANE_1` local input worksheet and Hermes route review are prepared at `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_ARCHITECTURE_INPUT_WORKSHEET_2026-06-29.md` and `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_LOCAL_REVIEW_2026-06-29.md`; these are not the final Opus architecture packet and do not authorize LANE_2.
- GhostClaw `LANE_1` local Hermes route receipt is recorded at `_A2A_QUEUE/outbox/packet_011_ghostclaw_lane1_hermes_route_receipt.json` and `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_ROUTE_RECEIPT_2026-06-29.md`; Hermes gateway on `127.0.0.1:9000` was not reachable during rehydrate, so this is a file-bus NO-OP receipt only.
- GhostClaw `LANE_1` Codex recorder draft architecture packet is prepared for Hermes review at `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_ARCHITECTURE_PACKET_DRAFT_FOR_HERMES_REVIEW_2026-06-29.md`; it is not the final Opus packet, not Hermes approval, and does not authorize LANE_2.
- GhostClaw `LANE_1` Hermes draft review request is queued locally at `_A2A_QUEUE/inbox/packet_012_ghostclaw_lane1_hermes_draft_review.json`; it requests a Hermes decision but is not itself a decision, final Opus packet, live dispatch, or LANE_2 approval.
- GhostClaw `LANE_1` Hermes review decision template is prepared at `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION_TEMPLATE_2026-06-29.md` and `WORKSPACE_SCAFFOLD/templates/ghostclaw_lane1_hermes_review_decision.template.json`; it defaults to `decision=pending`, `decision_record=false`, and `lane2_authorized=false`.
- Hermes is allowed to choose any model to help create vibe coding drafts for `LANE_1`; this is draft assistance only and does not authorize deploy, push, cloud mutation, customer send, secret read, runtime queue execution, paid/provider calls, or production work. The boundary is recorded at `data/pathspecs/ghostclaw_lane1_hermes_model_choice_boundary_2026-06-29.json` and `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_MODEL_CHOICE_BOUNDARY_2026-06-29.md`.
- Broad or blanket approval text is not executable approval for deploy, push, cloud mutation, customer send, secret read, or paid/provider calls; those actions still require gate-specific approval with target, environment, rollback, and evidence path.
- R0 gate-specific approval contract is recorded at `data/pathspecs/sirinx_r0_gate_specific_approval_contract_2026-06-29.json`, `WORKSPACE_SCAFFOLD/scripts/validate_r0_gate_approval.py`, `WORKSPACE_SCAFFOLD/templates/r0_gate_specific_approval_packet.template.json`, and `docs/knowledge/SIRINX_R0_GATE_SPECIFIC_APPROVAL_CONTRACT_2026-06-29.md`; it validates a future single-gate approval packet but is not approval and does not execute any external action.
- GhostClaw `LANE_1` Hermes review decision is recorded at `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md`, `_A2A_QUEUE/inbox/packet_013_ghostclaw_lane1_codex_recorder_gate_request.json`, and `_A2A_QUEUE/outbox/packet_026_ghostclaw_lane1_hermes_decision_route_to_opus.json`; decision is `route_to_opus`, `codex_recorder_gate_open=false`, `lane2_authorized=false`, `decision_record=true`, final Opus architecture packet still required before any build authorization.
- GhostClaw `LANE_1` decision receipt is recorded at `_A2A_QUEUE/outbox/packet_026_ghostclaw_lane1_hermes_decision_route_to_opus.json`; it is local file-bus evidence only and does not open the Codex recorder gate, authorize LANE_2, execute queues, call providers, send external messages, deploy, push, or mutate cloud resources.
- Guarded A2A Go-Live Bundle is integrated locally under `.ghostclaw/policies/a2a-gate-policy.v1.yaml`, `.ghostclaw_runtime/queue/hermes/inbox/hermes-a2a-safe-boot-queue.json`, `.ghostclaw_runtime/audit/blocked-blanket-approval-20260630-001.json`, `scripts/ghostclaw_a2a_safe_autorun.sh`, and `docs/knowledge/GUARDED_A2A_GO_LIVE_BUNDLE_20260630.md`; it enables local-safe autonomous execution and stops before push, deploy, cloud mutation, customer send, Telegram live send, secret read, paid provider call, install, migration, merge script, and license-file mutation.
- GhostClaw `LANE_1` Hermes decision inbox index is recorded at `data/pathspecs/ghostclaw_lane1_hermes_decision_inbox_2026-06-29.json` and `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_INBOX_INDEX_2026-06-29.md`; it makes `packet_013` the current actionable local packet but is not a decision or approval.
- GhostClaw `LANE_1` packet 013 decision workbench is recorded at `data/pathspecs/ghostclaw_lane1_packet013_decision_workbench_2026-06-29.json` and `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_PACKET013_DECISION_WORKBENCH_2026-06-29.md`; it bundles offline decision evidence and allowed decisions but is not a Hermes decision, does not open the Codex recorder gate, and does not authorize `LANE_2`.
- GhostClaw `LANE_1` packet 013 decision readiness scorecard is recorded at `data/pathspecs/ghostclaw_lane1_packet013_decision_readiness_2026-06-29.json` and `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_PACKET013_DECISION_READINESS_2026-06-29.md`; it marks `route_to_opus`, `request_revision`, and `block` reviewable from local evidence while keeping `open_codex_recorder_gate` blocked pending a separate validated Hermes decision.
- GhostClaw `LANE_1` Hermes decision validator is recorded at `WORKSPACE_SCAFFOLD/scripts/validate_lane1_hermes_decision.py`, `data/pathspecs/ghostclaw_lane1_hermes_decision_validator_2026-06-29.json`, and `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_VALIDATOR_2026-06-29.md`; it validates a future decision artifact locally but is not a decision, approval, provider call, or gate unlock.
- GhostClaw `LANE_1` packet 013 Hermes decision draft is recorded at `data/pathspecs/ghostclaw_lane1_packet013_decision_draft_2026-06-29.json`, `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_PACKET013_DECISION_DRAFT_2026-06-29.md`, and `_A2A_QUEUE/outbox/packet_015_ghostclaw_lane1_hermes_decision_draft.json`; it proposes `route_to_opus` for Hermes review only, keeps `decision_record=false`, keeps the Codex recorder gate closed, and does not authorize provider calls, runtime queue execution, external sends, deploy, push, cloud mutation, secret read, install, migration, or LANE_2.
- GhostClaw `LANE_1` Hermes decision intake handoff is recorded at `WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_intake_handoff.py`, `data/pathspecs/ghostclaw_lane1_hermes_decision_intake_handoff_2026-06-29.json`, and `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_INTAKE_HANDOFF_2026-06-29.md`; it records the exact future decision path, required fields, evidence paths, validator command, and transition-guard command, but is not a Hermes decision and does not mutate queue state or authorize LANE_2.
- GhostClaw `LANE_1` Hermes decision handoff outbox packet is recorded at `_A2A_QUEUE/outbox/packet_016_ghostclaw_lane1_hermes_decision_intake_handoff.json`; it points Hermes/operator to the decision intake handoff, keeps `decision_record=false`, keeps the Codex recorder gate closed, and does not authorize provider calls, runtime queue execution, external sends, deploy, push, cloud mutation, customer send, secret read, install, migration, or LANE_2.
- GhostClaw `LANE_1` Hermes decision preflight audit is recorded at `WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_preflight_audit.py`, `data/pathspecs/ghostclaw_lane1_hermes_decision_preflight_audit_2026-06-29.json`, `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_PREFLIGHT_AUDIT_2026-06-29.md`, and `_A2A_QUEUE/outbox/packet_017_ghostclaw_lane1_hermes_decision_preflight_audit.json`; it confirms local review evidence is ready for Hermes decision review while keeping `decision_record=false`, the Codex recorder gate closed, final Opus packet missing, and LANE_2 unauthorized.
- GhostClaw `LANE_1` Opus architecture packet gate is recorded at `WORKSPACE_SCAFFOLD/scripts/validate_lane1_opus_architecture_packet.py`, `data/pathspecs/ghostclaw_lane1_opus_architecture_packet_gate_2026-06-29.json`, `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET_GATE_2026-06-29.md`, and `_A2A_QUEUE/outbox/packet_018_ghostclaw_lane1_opus_architecture_packet_gate.json`; it validates a future final packet only, keeps `final_packet_record=false`, keeps `decision_record=false`, does not create the final Opus packet, and does not authorize LANE_2 or external actions.
- GhostClaw `LANE_1` Opus authoring bundle is recorded at `data/pathspecs/ghostclaw_lane1_opus_authoring_bundle_2026-06-29.json`, `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_AUTHORING_BUNDLE_2026-06-29.md`, and `_A2A_QUEUE/outbox/packet_019_ghostclaw_lane1_opus_authoring_bundle.json`; it gives Hermes/Opus a local evidence bundle for future authoring only, keeps `final_packet_record=false`, keeps `decision_record=false`, does not create the final Opus packet, and does not authorize LANE_2 or external actions.
- GhostClaw `LANE_1` Hermes decision transition guard is recorded at `WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_transition_guard.py`, `data/pathspecs/ghostclaw_lane1_hermes_decision_transition_guard_2026-06-29.json`, and `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_TRANSITION_GUARD_2026-06-29.md`; it fails closed while the separate Hermes decision artifact is missing, does not create a decision record, does not mutate queue state, and does not authorize provider calls, runtime queue execution, deploy, push, cloud mutation, customer send, secret read, install, migration, or LANE_2.
- Hermes gateway read-only recheck is recorded at `data/pathspecs/sirinx_hermes_gateway_recheck_2026-06-29.json` and `docs/knowledge/SIRINX_HERMES_GATEWAY_RECHECK_2026-06-29.md`; `127.0.0.1:9000` was unreachable, no restart was attempted, no runtime queue was executed, and `BLOCK-HERMES-GATEWAY` remains open.
- All-chat export intake contract is recorded at `data/pathspecs/sirinx_all_chat_export_intake_contract_2026-06-29.json` and `docs/knowledge/SIRINX_ALL_CHAT_EXPORT_INTAKE_CONTRACT_2026-06-29.md`; it prepares `repo/path/status/blocker/next_action/source` mapping without loading raw chats, calling providers, uploading externally, or claiming all chats were read.
- All-chat export intake mapper is recorded at `WORKSPACE_SCAFFOLD/scripts/build_all_chat_export_intake_map.py`, `data/pathspecs/sirinx_all_chat_export_intake_mapper_2026-06-29.json`, and `docs/knowledge/SIRINX_ALL_CHAT_EXPORT_INTAKE_MAPPER_2026-06-29.md`; it can map a future operator-supplied export into redacted metadata only, but no real export has been loaded and `BLOCK-CHAT-EXPORT` remains open.
- All-chat export request packet is recorded at `data/pathspecs/sirinx_all_chat_export_request_packet_2026-06-29.json`, `docs/knowledge/SIRINX_ALL_CHAT_EXPORT_REQUEST_PACKET_2026-06-29.md`, and `_A2A_QUEUE/outbox/packet_020_sirinx_all_chat_export_request.json`; it requests an operator-supplied ChatGPT export path or explicitly authorized read-only connector scope, but no raw chat content was loaded, no connector read was performed, and all-chat coverage remains unclaimed.
- A2A adaptive sync control status is recorded at `data/pathspecs/sirinx_a2a_adaptive_sync_control_status_2026-06-29.json`, `docs/knowledge/SIRINX_A2A_ADAPTIVE_SYNC_CONTROL_STATUS_2026-06-29.md`, and `_A2A_QUEUE/outbox/packet_021_sirinx_a2a_adaptive_sync_control_status.json`; it summarizes current local Codex/Hermes file-bus state for review only and does not execute queue items, read connectors, call providers, mutate state, authorize LANE_2, or claim all chats were read.
- A2A next-safe-action sequencer is recorded at `data/pathspecs/sirinx_a2a_next_safe_action_sequencer_2026-06-29.json`, `docs/knowledge/SIRINX_A2A_NEXT_SAFE_ACTION_SEQUENCER_2026-06-29.md`, and `_A2A_QUEUE/outbox/packet_022_sirinx_a2a_next_safe_action_sequencer.json`; it is historical local sequencer evidence now superseded by the recorded packet_013 decision in `packet_026`, and it does not mutate state, execute queues, call providers, authorize LANE_2, or claim completion.
- Hermes gateway current recheck packet is recorded at `data/pathspecs/sirinx_hermes_gateway_current_recheck_packet_2026-06-29.json`, `docs/knowledge/SIRINX_HERMES_GATEWAY_CURRENT_RECHECK_PACKET_2026-06-29.md`, and `_A2A_QUEUE/outbox/packet_023_sirinx_hermes_gateway_current_recheck.json`; fresh read-only curls to `127.0.0.1:9000` still failed with exit code 7, no restart was attempted, and `BLOCK-HERMES-GATEWAY` remains open.
- A2A Hermes-Codex Bridge v2 is integrated under `GHOSTCLAW/a2a-hermes-codex-bridge/` with `packet-bus.ts`, `manifest-store.ts`, `codex-sidecar.ts`, and `integration.test.ts`; the bridge passes 21/21 vitest tests and TypeScript `--noEmit`; it writes packets only to `_A2A_QUEUE/` and simulation manifests only to `.ghostclaw_runtime/manifests/`, performs no real Codex CLI execution by default, blocks Tier D/X actions, and produces dry-run previews plus A2A evidence for every routing decision.
- Bridge v2 Tier A/B actions produce `allowed_dry_run` outbox packets and simulation manifests even when `allowRealExec=true`; real Codex CLI execution remains a separate runtime gate outside the sidecar contract.
- Bridge v2 Tier D/X actions produce `blocked_simulated` outbox packets with `safe_replacement_action`, `rollback_commands`, and zero-hash snapshots; no filesystem mutation, install, deploy, push, cloud mutation, secret read, customer send, or paid/provider call occurs.
- Hermes/Codex/A2A Godmode v3 HTML source was read from `/Users/sirinx/Downloads/hermes_codex_a2a_godmode_integration_v3/project_hermes_codex_a2a_godmode_integration_v3.html` and captured at `data/pathspecs/sirinx_hermes_codex_a2a_godmode_v3_html_recheck_2026-06-29.json` plus `docs/knowledge/SIRINX_HERMES_CODEX_A2A_GODMODE_V3_HTML_RECHECK_2026-06-29.md`; it confirms topology and No-Ask boundary but is not the v3.3 merge kit.
- GhostClaw YOLO v3.3 artifact gate validator is recorded at `WORKSPACE_SCAFFOLD/scripts/validate_ghostclaw_v3_3_artifact_gate.py`, `data/pathspecs/sirinx_ghostclaw_v3_3_artifact_gate_validator_2026-06-29.json`, and `docs/knowledge/SIRINX_GHOSTCLAW_V3_3_ARTIFACT_GATE_VALIDATOR_2026-06-29.md`; it validates exact artifact basename, required archive entries, and local policy pass/fail evidence but does not prove the artifact exists, extract files, run tests, create a branch, or execute a merge script.
- Active-goal blocker recheck is recorded at `data/pathspecs/sirinx_active_goal_blocker_recheck_2026-06-29.json` and `docs/knowledge/SIRINX_ACTIVE_GOAL_BLOCKER_RECHECK_2026-06-29.md`; current probes still show Hermes gateway exit code 7, no exact v3.3 artifact/export candidates, stale `project-hermes` board health versus current curl, and all completion blockers open.
- Active-goal blocker clearance validator is recorded at `WORKSPACE_SCAFFOLD/scripts/validate_active_goal_blocker_clearance.py`, `data/pathspecs/sirinx_active_goal_blocker_clearance_validator_2026-06-29.json`, and `docs/knowledge/SIRINX_ACTIVE_GOAL_BLOCKER_CLEARANCE_VALIDATOR_2026-06-29.md`; it validates one proposed blocker clearance packet but does not clear blockers, mark the goal complete, or authorize external actions.
- Active-goal read-only probe runner is recorded at `WORKSPACE_SCAFFOLD/scripts/probe_active_goal_blockers.py`, `data/pathspecs/sirinx_active_goal_read_only_probe_runner_2026-06-29.json`, and `docs/knowledge/SIRINX_ACTIVE_GOAL_READ_ONLY_PROBE_RUNNER_2026-06-29.md`; latest report `WORKSPACE_SCAFFOLD/reports/active_goal_read_only_probe_latest_2026-06-29.json` still shows no exact v3.3 artifact candidate, no ChatGPT export candidate, and Hermes gateway `ConnectionRefusedError`.
- Active-goal completion requirements matrix is recorded at `data/pathspecs/sirinx_active_goal_completion_requirements_matrix_2026-06-29.json` and `docs/knowledge/SIRINX_ACTIVE_GOAL_COMPLETION_REQUIREMENTS_MATRIX_2026-06-29.md`; it maps the active objective to requirement-level evidence and keeps completion blocked until all-chat export, final LANE_1 packet, Hermes gateway proof, v3.3 artifact, and R0 approvals exist.
- Active-goal current blocker refresh is recorded at `data/pathspecs/sirinx_active_goal_current_blocker_refresh_2026-06-29.json` and `docs/knowledge/SIRINX_ACTIVE_GOAL_CURRENT_BLOCKER_REFRESH_2026-06-29.md`; fresh read-only probes still show Hermes gateway exit code 7, no exact v3.3 artifact candidate, no ChatGPT export candidate, and all completion blockers open.
- Active-goal context packet registry is recorded at `data/pathspecs/sirinx_active_goal_context_packet_registry_2026-06-29.json` and `docs/knowledge/SIRINX_ACTIVE_GOAL_CONTEXT_PACKET_REGISTRY_2026-06-29.md`; it maps current source packets to owner, freshness, permission, confidence, relevance, and expiry without claiming all chats were read.
- Active-goal source-file receipt is recorded at `data/pathspecs/sirinx_active_goal_source_file_receipt_2026-06-29.json` and `docs/knowledge/SIRINX_ACTIVE_GOAL_SOURCE_FILE_RECEIPT_2026-06-29.md`; it maps user-named files to current local scan evidence, finds only the equivalent HTML topology source, and marks backend/PDF/SKILL/TODO/zip inputs as current-local missing rather than read.
- Active-goal local evidence durability manifest is recorded at `WORKSPACE_SCAFFOLD/manifests/active_goal_local_evidence_durability_2026-06-29.json` and `docs/knowledge/SIRINX_ACTIVE_GOAL_LOCAL_EVIDENCE_DURABILITY_MANIFEST_2026-06-29.md`; it inventories current ignored `data/pathspecs/*.json` evidence and doc mirrors without force-adding ignored data or claiming completion.
- Active goal systematic work index is recorded at `data/pathspecs/sirinx_active_goal_systematic_work_index_2026-06-29.json` and `docs/knowledge/SIRINX_ACTIVE_GOAL_SYSTEMATIC_WORK_INDEX_2026-06-29.md`; it keeps the objective `in_progress_not_complete` and maps current local workstreams, blockers, and next safe action without claiming all chats were read.
- GodMode Mission Control exposes the active-goal systematic work index as read-only static data through `GOD_MODE_ACTIVE_GOAL_INDEX`; it does not read runtime files, execute commands, or unlock any gate.
- Codex/Hermes execution queue is recorded at `data/pathspecs/sirinx_codex_hermes_execution_queue_2026-06-29.json` and `docs/knowledge/SIRINX_CODEX_HERMES_EXECUTION_QUEUE_2026-06-29.md`; it orders `packet_013`, draft-only `packet_015`, handoff-only `packet_016`, preflight-only `packet_017`, Opus packet gate `packet_018`, authoring-bundle-only `packet_019`, transition guard, all-chat export intake, all-chat export request `packet_020`, A2A adaptive sync control status `packet_021`, next-safe-action sequencer `packet_022`, Hermes gateway current recheck `packet_023`, sync-all-jobs command `packet_024`, Browser Use candidate lane `packet_025`, v3.3 artifact intake, R0 approvals, Mission Control read-only evidence, and Obsidian pulse work without claiming completion or opening runtime gates.
- Codex/Hermes A2A queue status is recorded at `data/pathspecs/sirinx_codex_hermes_a2a_queue_status_2026-06-29.json`, `docs/knowledge/SIRINX_CODEX_HERMES_A2A_QUEUE_STATUS_2026-06-29.md`, and `WORKSPACE_SCAFFOLD/reports/codex_hermes_a2a_queue_status_latest_2026-06-29.json`; it indexes `_A2A_QUEUE` as local file-bus evidence only with `packet_013` still the current actionable inbox packet, `packet_024_sirinx_hermes_a2a_codex_sync_all_jobs` added as a local `/goal` inbox command, `packet_025_sirinx_browser_use_candidate_lane` added as local Browser Use candidate evidence, packet_026 through packet_040 added as local outbox evidence, counts `inbox=5 outbox=34 working=1 done=8 blocked=0 total=48`, excludes pending `approval_gate_*.json` artifacts from packet counts, Hermes packet_013 decision is recorded, final LANE_1 packet is still absent, no runtime queue execution, no all-chat export import, no Browser Use install/execution, no local stack repair/restart, no LANE_2 authorization, no deploy/webhook/production analytics/CRM/customer storage approval from packet_040, and no MIT license claim because no root `LICENSE`/`COPYING` file exists.
- Hermes A2A Codex sync-all-jobs packet 024 is recorded at `data/pathspecs/sirinx_hermes_a2a_codex_sync_all_jobs_packet_2026-06-29.json`, `docs/knowledge/SIRINX_HERMES_A2A_CODEX_SYNC_ALL_JOBS_PACKET_2026-06-29.md`, and `_A2A_QUEUE/inbox/packet_024_sirinx_hermes_a2a_codex_sync_all_jobs.json`; it is `goal_command_inbox_ready_local_only`, forbids real Codex CLI execution, runtime queue execution, provider calls, external sends, deploy/push/cloud/customer/secret actions, and treats `requested_license=MIT` as only a requested-license intent because no root `LICENSE`/`COPYING` file exists.
- The A2A Sync Hermes checkpoint (`packet_024`, command-intents, a2a-message extensions, tier-resolver, safe local autopilot, and tests) was pushed to `origin/staging/godmode-master-os-v2` via `GATE-PUSH-001-20260629-001` with result `0a1d892..eb664e4`; `GATE-PUSH-001-20260629-001` is now consumed and a new gate-specific approval packet is required for any further push.
- Push evidence receipt is recorded at `_A2A_QUEUE/outbox/receipt_gate_push_001_2026-06-29.json` with correlation ID `sirinx-a2a2a-push-20260629-001`.
- Browser Use candidate lane packet 025 is recorded at `data/pathspecs/sirinx_browser_use_candidate_lane_2026-06-29.json`, `docs/knowledge/SIRINX_BROWSER_USE_CANDIDATE_LANE_2026-06-29.md`, and `_A2A_QUEUE/outbox/packet_025_sirinx_browser_use_candidate_lane.json`; it records public Browser Use metadata and local policy only, with no package install, browser execution, Browser Use Cloud, profile sync, cookie access, form submit, provider call, paid call, secret read, or external send.
- Codex/Hermes work report draft is recorded at `data/pathspecs/sirinx_codex_hermes_work_report_contract_2026-06-29.json` and `docs/knowledge/SIRINX_CODEX_HERMES_WORK_REPORT_DRAFT_2026-06-29.md`; it renders a Telegram-safe local draft from the execution queue and does not live-send, call providers, execute queue items, or authorize external actions.
- Codex/Hermes work report `packet_014` is recorded at `_A2A_QUEUE/outbox/packet_014_codex_hermes_work_report_draft.json` and `docs/knowledge/SIRINX_CODEX_HERMES_WORK_REPORT_PACKET_2026-06-29.md`; it is local outbox evidence only and does not send Telegram, create a Hermes decision, open the Codex recorder gate, or authorize `LANE_2`.
- GodMode Mission Control exposes the Codex/Hermes execution queue and work-report draft lane as read-only static data through `GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE`; it does not read runtime files, execute queue items, create a Hermes decision, send Telegram messages, or unlock `LANE_2`.
- GhostClaw YOLO v3.3 merge review is captured at `docs/knowledge/SIRINX_GHOSTCLAW_V3_3_MERGE_INTAKE_2026-06-29.md`; a follow-up preflight recheck at `docs/knowledge/SIRINX_GHOSTCLAW_V3_3_PREFLIGHT_RECHECK_2026-06-29.md` still did not find the exact v3.3 merge kit locally, so no merge script, branch creation, commit, deploy, push, provider call, cloud mutation, install, or secret read has been performed.
- Active goal completion audit is captured at `docs/knowledge/SIRINX_ACTIVE_GOAL_COMPLETION_AUDIT_2026-06-29.md`; the goal remains `IN_PROGRESS_NOT_COMPLETE` because all-chat export, final LANE_1 Opus packet, Hermes gateway proof, v3.3 artifact, and R0 approvals are still missing.
- External writes remain blocked by default.
- Release/handoff/live-start/known-issues docs are locked locally at root for future operators.
- Root operating files are subordinate to `AGENTS.md`; if they conflict, the stricter safety rule applies.

## Services

| Service | URL/Port | Status | External Writes | Notes |
| --- | --- | --- | --- | --- |
| dev-control-api | `http://127.0.0.1:8711` | local when `pnpm dashboard:run` is active | blocked | API reports `dryRunOnly=true` and `externalWrites=false`. |
| dev-dashboard | `http://127.0.0.1:8710` | local when `pnpm dashboard:run` is active | blocked | Command Center UI for local review. |
| pocket-hatchery | `apps/pocket-hatchery/` | local scaffold | blocked | Testnet-first; no real signer or randomness. |
| public website | `https://www.sirinx.co` | production site, protected | approval required | Do not change from this repo without exact public-site task. |
| Hermes gateway | local runtime | readable through external gate check | approval required for messages | Pairing/send gates remain manual. |
| Solis telemetry | not active | blocked | blocked | Requires consent, credential storage, and station mapping. |

## Current Gates

| Gate | Status | Evidence | Next Action |
| --- | --- | --- | --- |
| Codex Mobile QR/MFA | blocked manual | `docs/knowledge/external-gates/evidence/codex-mobile-qr-mfa.md` expected | Human operator pairs Mac host with phone. |
| SIRINX OS GitHub publish | **pushed to `staging/godmode-master-os-v2`** | commit `28b8ea1` | Await PR/merge approval. |
| Telegram/LINE | blocked credential/recipient | evidence template under `docs/knowledge/external-gates/evidence/` | Confirm recipient/channel and rotate/store token before smoke send. |
| Solis API | blocked consent/credential | evidence template under `docs/knowledge/external-gates/evidence/` | Confirm consent, read-only credentials, and station mapping. |
| Cloudflare Bot Management | optional official review | current CSP mitigation documented | Review dashboard/API rule only if replacing CSP mitigation. |
| Pocket Hatchery testnet deploy | blocked R0 | `apps/pocket-hatchery/ops/release_gate_evidence.md` | Approve R0 gate individually. |

## Current Integration Workstreams

| Workstream | Status | Source |
| --- | --- | --- |
| GitHub repo inventory | done local | `services/dev-control-api/src/github-integration.mjs` |
| **GhostClaws GodMode Mission Control** | **pushed to staging** | `apps/centerbrain-shell/`, `services/dev-control-api/src/centerbrain-hub.mjs` |
| **Pocket Hatchery MVP scaffold** | **done local** | `apps/pocket-hatchery/`, `WORKSPACE_SCAFFOLD/` |
| Pocket Hatchery read-only viewer | done local | `apps/centerbrain-shell/app/pocket-hatchery/page.tsx`, `apps/centerbrain-shell/src/lib/pocket-hatchery.ts` |
| Pocket Hatchery signer exposure evidence | done local | `WORKSPACE_SCAFFOLD/security_scan_waxwing.json`, `WORKSPACE_SCAFFOLD/tests/test_public_signer_exposure.py` |
| Pocket Hatchery local release evidence score | done local | `WORKSPACE_SCAFFOLD/config/pocket_hatchery_release_gate.json`, `apps/pocket-hatchery/ops/release_gate_evidence.md` |
| Pocket Hatchery Mission Control evidence panel | done local | `apps/centerbrain-shell/src/lib/god-mode-master-os.ts`, `apps/centerbrain-shell/app/ui/GodModeMasterOS.tsx` |
| Codex + Hermes unified continuation | done local | `docs/knowledge/SIRINX_CODEX_HERMES_UNIFIED_CONTINUATION_2026-06-29.md` |
| GhostClaw LANE_0 status refresh | done local | `docs/knowledge/SIRINX_GHOSTCLAW_LANE0_STATUS_REFRESH_2026-06-29.md`, `_OBSIDIAN_GHOSTCLAW_BRAIN/16_STATUS_BOARD.md` |
| GhostClaw LANE_1 architecture request | request ready | `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_REQUEST_2026-06-29.md`, `_OBSIDIAN_GHOSTCLAW_BRAIN/16_STATUS_BOARD.md` |
| GhostClaw LANE_1 Hermes route packet | queued local | `_A2A_QUEUE/inbox/packet_011_ghostclaw_lane1_opus_architecture.json`, `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_ROUTE_DRAFT_2026-06-29.md` |
| GhostClaw LANE_1 architecture input worksheet | ready for Opus | `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_ARCHITECTURE_INPUT_WORKSHEET_2026-06-29.md`, `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_LOCAL_REVIEW_2026-06-29.md`, `docs/superpowers/plans/2026-06-29-ghostclaw-lane1-opus-architecture-packet.md` |
| GhostClaw LANE_1 Hermes route receipt | ready to route local-only | `_A2A_QUEUE/outbox/packet_011_ghostclaw_lane1_hermes_route_receipt.json`, `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_ROUTE_RECEIPT_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_lane1_route_receipt.py` |
| GhostClaw LANE_1 architecture draft | draft for Hermes review | `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_ARCHITECTURE_PACKET_DRAFT_FOR_HERMES_REVIEW_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_lane1_architecture_draft.py` |
| GhostClaw LANE_1 Hermes review request | queued local | `_A2A_QUEUE/inbox/packet_012_ghostclaw_lane1_hermes_draft_review.json`, `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DRAFT_REVIEW_REQUEST_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_lane1_hermes_review_request.py` |
| GhostClaw LANE_1 Hermes decision template | template, not decision | `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION_TEMPLATE_2026-06-29.md`, `WORKSPACE_SCAFFOLD/templates/ghostclaw_lane1_hermes_review_decision.template.json`, `WORKSPACE_SCAFFOLD/tests/test_lane1_hermes_decision_template.py` |
| GhostClaw LANE_1 Hermes vibe coding model-choice policy | draft-assist only | `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION_TEMPLATE_2026-06-29.md`, `WORKSPACE_SCAFFOLD/templates/ghostclaw_lane1_hermes_review_decision.template.json` |
| External action approval boundary | gate-specific only | `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION_TEMPLATE_2026-06-29.md`, `WORKSPACE_SCAFFOLD/templates/ghostclaw_lane1_hermes_review_decision.template.json` |
| R0 gate-specific approval contract | local contract, not approval | `data/pathspecs/sirinx_r0_gate_specific_approval_contract_2026-06-29.json`, `WORKSPACE_SCAFFOLD/scripts/validate_r0_gate_approval.py`, `WORKSPACE_SCAFFOLD/templates/r0_gate_specific_approval_packet.template.json`, `docs/knowledge/SIRINX_R0_GATE_SPECIFIC_APPROVAL_CONTRACT_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_r0_gate_specific_approval_contract.py` |
| GhostClaw LANE_1 Codex recorder gate request | queued local, gate closed | `_A2A_QUEUE/inbox/packet_013_ghostclaw_lane1_codex_recorder_gate_request.json`, `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_CODEX_RECORDER_GATE_REQUEST_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_lane1_codex_recorder_gate_request.py` |
| GhostClaw LANE_1 Hermes decision inbox index | local index, not decision | `data/pathspecs/ghostclaw_lane1_hermes_decision_inbox_2026-06-29.json`, `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_INBOX_INDEX_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_lane1_hermes_decision_inbox_index.py` |
| GhostClaw LANE_1 packet 013 decision workbench | offline workbench, not decision | `data/pathspecs/ghostclaw_lane1_packet013_decision_workbench_2026-06-29.json`, `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_PACKET013_DECISION_WORKBENCH_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_lane1_packet013_decision_workbench.py` |
| GhostClaw LANE_1 packet 013 decision readiness | readiness scorecard, not decision | `data/pathspecs/ghostclaw_lane1_packet013_decision_readiness_2026-06-29.json`, `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_PACKET013_DECISION_READINESS_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_lane1_packet013_decision_readiness.py` |
| GhostClaw LANE_1 Hermes decision validator | local validator, not decision | `WORKSPACE_SCAFFOLD/scripts/validate_lane1_hermes_decision.py`, `data/pathspecs/ghostclaw_lane1_hermes_decision_validator_2026-06-29.json`, `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_VALIDATOR_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_lane1_hermes_decision_validator.py` |
| GhostClaw LANE_1 packet 013 Hermes decision draft | draft aid, not decision | `WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_draft.py`, `data/pathspecs/ghostclaw_lane1_packet013_decision_draft_2026-06-29.json`, `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_PACKET013_DECISION_DRAFT_2026-06-29.md`, `_A2A_QUEUE/outbox/packet_015_ghostclaw_lane1_hermes_decision_draft.json`, `WORKSPACE_SCAFFOLD/tests/test_lane1_packet013_decision_draft.py` |
| GhostClaw LANE_1 Hermes decision intake handoff | handoff ready, not decision | `WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_intake_handoff.py`, `data/pathspecs/ghostclaw_lane1_hermes_decision_intake_handoff_2026-06-29.json`, `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_INTAKE_HANDOFF_2026-06-29.md`, `_A2A_QUEUE/outbox/packet_016_ghostclaw_lane1_hermes_decision_intake_handoff.json`, `WORKSPACE_SCAFFOLD/tests/test_lane1_hermes_decision_intake_handoff.py`, `WORKSPACE_SCAFFOLD/tests/test_lane1_hermes_decision_handoff_packet.py` |
| GhostClaw LANE_1 Hermes decision preflight audit | review-ready, not decision | `WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_preflight_audit.py`, `data/pathspecs/ghostclaw_lane1_hermes_decision_preflight_audit_2026-06-29.json`, `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_PREFLIGHT_AUDIT_2026-06-29.md`, `_A2A_QUEUE/outbox/packet_017_ghostclaw_lane1_hermes_decision_preflight_audit.json`, `WORKSPACE_SCAFFOLD/tests/test_lane1_hermes_decision_preflight_audit.py` |
| GhostClaw LANE_1 Opus architecture packet gate | validator ready, final packet missing | `WORKSPACE_SCAFFOLD/scripts/validate_lane1_opus_architecture_packet.py`, `data/pathspecs/ghostclaw_lane1_opus_architecture_packet_gate_2026-06-29.json`, `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET_GATE_2026-06-29.md`, `_A2A_QUEUE/outbox/packet_018_ghostclaw_lane1_opus_architecture_packet_gate.json`, `WORKSPACE_SCAFFOLD/tests/test_lane1_opus_architecture_packet_gate.py` |
| GhostClaw LANE_1 Opus authoring bundle | authoring bundle ready, not final packet | `data/pathspecs/ghostclaw_lane1_opus_authoring_bundle_2026-06-29.json`, `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_AUTHORING_BUNDLE_2026-06-29.md`, `_A2A_QUEUE/outbox/packet_019_ghostclaw_lane1_opus_authoring_bundle.json`, `WORKSPACE_SCAFFOLD/tests/test_lane1_opus_authoring_bundle.py` |
| GhostClaw LANE_1 Hermes decision transition guard | validated route_to_opus transition, final packet missing | `WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_transition_guard.py`, `data/pathspecs/ghostclaw_lane1_hermes_decision_transition_guard_2026-06-29.json`, `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_TRANSITION_GUARD_2026-06-29.md`, `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md`, `WORKSPACE_SCAFFOLD/tests/test_lane1_hermes_decision_transition_guard.py` |
| Hermes gateway read-only recheck | unreachable, blocker open | `data/pathspecs/sirinx_hermes_gateway_recheck_2026-06-29.json`, `docs/knowledge/SIRINX_HERMES_GATEWAY_RECHECK_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_hermes_gateway_recheck.py` |
| Hermes gateway current recheck packet | unreachable, blocker open | `data/pathspecs/sirinx_hermes_gateway_current_recheck_packet_2026-06-29.json`, `docs/knowledge/SIRINX_HERMES_GATEWAY_CURRENT_RECHECK_PACKET_2026-06-29.md`, `_A2A_QUEUE/outbox/packet_023_sirinx_hermes_gateway_current_recheck.json`, `WORKSPACE_SCAFFOLD/tests/test_hermes_gateway_current_recheck_packet.py` |
| All-chat export intake contract | contract ready, export missing | `data/pathspecs/sirinx_all_chat_export_intake_contract_2026-06-29.json`, `docs/knowledge/SIRINX_ALL_CHAT_EXPORT_INTAKE_CONTRACT_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_all_chat_export_intake_contract.py` |
| All-chat export intake mapper | mapper ready, export missing | `WORKSPACE_SCAFFOLD/scripts/build_all_chat_export_intake_map.py`, `data/pathspecs/sirinx_all_chat_export_intake_mapper_2026-06-29.json`, `docs/knowledge/SIRINX_ALL_CHAT_EXPORT_INTAKE_MAPPER_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_all_chat_export_intake_mapper.py` |
| All-chat export request packet | request packet ready, export missing | `data/pathspecs/sirinx_all_chat_export_request_packet_2026-06-29.json`, `docs/knowledge/SIRINX_ALL_CHAT_EXPORT_REQUEST_PACKET_2026-06-29.md`, `_A2A_QUEUE/outbox/packet_020_sirinx_all_chat_export_request.json`, `WORKSPACE_SCAFFOLD/tests/test_all_chat_export_request_packet.py` |
| A2A adaptive sync control status | status ready, local-only | `data/pathspecs/sirinx_a2a_adaptive_sync_control_status_2026-06-29.json`, `docs/knowledge/SIRINX_A2A_ADAPTIVE_SYNC_CONTROL_STATUS_2026-06-29.md`, `_A2A_QUEUE/outbox/packet_021_sirinx_a2a_adaptive_sync_control_status.json`, `WORKSPACE_SCAFFOLD/tests/test_a2a_adaptive_sync_control_status_packet.py` |
| A2A local autopilot | ready, local-only auto coordination | `WORKSPACE_SCAFFOLD/scripts/run_a2a_local_autopilot.py`, `data/pathspecs/sirinx_a2a_local_autopilot_status_2026-06-29.json`, `WORKSPACE_SCAFFOLD/reports/a2a_local_autopilot_status_latest_2026-06-29.json`, `docs/knowledge/SIRINX_A2A_LOCAL_AUTOPILOT_STATUS_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_a2a_local_autopilot.py` |
| GhostClaw YOLO v3.3 artifact gate validator | validator ready, artifact missing | `WORKSPACE_SCAFFOLD/scripts/validate_ghostclaw_v3_3_artifact_gate.py`, `data/pathspecs/sirinx_ghostclaw_v3_3_artifact_gate_validator_2026-06-29.json`, `docs/knowledge/SIRINX_GHOSTCLAW_V3_3_ARTIFACT_GATE_VALIDATOR_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_ghostclaw_v3_3_artifact_gate_validator.py` |
| Hermes/Codex/A2A Godmode v3 HTML recheck | source read local-only | `data/pathspecs/sirinx_hermes_codex_a2a_godmode_v3_html_recheck_2026-06-29.json`, `docs/knowledge/SIRINX_HERMES_CODEX_A2A_GODMODE_V3_HTML_RECHECK_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_hermes_codex_a2a_godmode_html_recheck.py` |
| Active goal blocker recheck | blockers confirmed current-state | `data/pathspecs/sirinx_active_goal_blocker_recheck_2026-06-29.json`, `docs/knowledge/SIRINX_ACTIVE_GOAL_BLOCKER_RECHECK_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_active_goal_blocker_recheck.py` |
| Active goal blocker clearance validator | validator ready, no active clearance packet | `WORKSPACE_SCAFFOLD/scripts/validate_active_goal_blocker_clearance.py`, `data/pathspecs/sirinx_active_goal_blocker_clearance_validator_2026-06-29.json`, `docs/knowledge/SIRINX_ACTIVE_GOAL_BLOCKER_CLEARANCE_VALIDATOR_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_active_goal_blocker_clearance_validator.py` |
| Active goal read-only probe runner | runner ready, blockers still open | `WORKSPACE_SCAFFOLD/scripts/probe_active_goal_blockers.py`, `data/pathspecs/sirinx_active_goal_read_only_probe_runner_2026-06-29.json`, `WORKSPACE_SCAFFOLD/reports/active_goal_read_only_probe_latest_2026-06-29.json`, `WORKSPACE_SCAFFOLD/tests/test_active_goal_read_only_probe_runner.py` |
| Active goal completion requirements matrix | requirements mapped, not complete | `data/pathspecs/sirinx_active_goal_completion_requirements_matrix_2026-06-29.json`, `docs/knowledge/SIRINX_ACTIVE_GOAL_COMPLETION_REQUIREMENTS_MATRIX_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_active_goal_completion_requirements_matrix.py` |
| Active goal current blocker refresh | blockers still open | `data/pathspecs/sirinx_active_goal_current_blocker_refresh_2026-06-29.json`, `docs/knowledge/SIRINX_ACTIVE_GOAL_CURRENT_BLOCKER_REFRESH_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_active_goal_current_blocker_refresh.py` |
| Active goal context packet registry | active local context registry | `data/pathspecs/sirinx_active_goal_context_packet_registry_2026-06-29.json`, `docs/knowledge/SIRINX_ACTIVE_GOAL_CONTEXT_PACKET_REGISTRY_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_active_goal_context_packet_registry.py` |
| Active goal source-file receipt | current local scan partial | `data/pathspecs/sirinx_active_goal_source_file_receipt_2026-06-29.json`, `docs/knowledge/SIRINX_ACTIVE_GOAL_SOURCE_FILE_RECEIPT_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_active_goal_source_file_receipt.py` |
| Active goal local evidence durability manifest | ignored pathspecs manifested, not completion | `WORKSPACE_SCAFFOLD/manifests/active_goal_local_evidence_durability_2026-06-29.json`, `docs/knowledge/SIRINX_ACTIVE_GOAL_LOCAL_EVIDENCE_DURABILITY_MANIFEST_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_active_goal_local_evidence_durability_manifest.py` |
| Active goal systematic work index | local index, not complete | `data/pathspecs/sirinx_active_goal_systematic_work_index_2026-06-29.json`, `docs/knowledge/SIRINX_ACTIVE_GOAL_SYSTEMATIC_WORK_INDEX_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_active_goal_systematic_work_index.py` |
| Active goal Mission Control panel | read-only local UI data | `apps/centerbrain-shell/src/lib/god-mode-master-os.ts`, `apps/centerbrain-shell/app/ui/GodModeMasterOS.tsx`, `apps/centerbrain-shell/src/lib/god-mode-master-os.test.ts` |
| Codex/Hermes execution queue | local queue, not complete | `data/pathspecs/sirinx_codex_hermes_execution_queue_2026-06-29.json`, `docs/knowledge/SIRINX_CODEX_HERMES_EXECUTION_QUEUE_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_codex_hermes_execution_queue.py` |
| Codex/Hermes A2A queue status | local file-bus indexed, not executed | `data/pathspecs/sirinx_codex_hermes_a2a_queue_status_2026-06-29.json`, `docs/knowledge/SIRINX_CODEX_HERMES_A2A_QUEUE_STATUS_2026-06-29.md`, `WORKSPACE_SCAFFOLD/reports/codex_hermes_a2a_queue_status_latest_2026-06-29.json`, `_A2A_QUEUE/outbox/packet_016_ghostclaw_lane1_hermes_decision_intake_handoff.json`, `_A2A_QUEUE/outbox/packet_017_ghostclaw_lane1_hermes_decision_preflight_audit.json`, `_A2A_QUEUE/outbox/packet_018_ghostclaw_lane1_opus_architecture_packet_gate.json`, `_A2A_QUEUE/outbox/packet_019_ghostclaw_lane1_opus_authoring_bundle.json`, `_A2A_QUEUE/outbox/packet_020_sirinx_all_chat_export_request.json`, `_A2A_QUEUE/outbox/packet_021_sirinx_a2a_adaptive_sync_control_status.json`, `_A2A_QUEUE/outbox/packet_022_sirinx_a2a_next_safe_action_sequencer.json`, `_A2A_QUEUE/outbox/packet_023_sirinx_hermes_gateway_current_recheck.json`, `WORKSPACE_SCAFFOLD/tests/test_codex_hermes_a2a_queue_status.py`, `WORKSPACE_SCAFFOLD/tests/test_a2a_adaptive_sync_control_status_packet.py`, `WORKSPACE_SCAFFOLD/tests/test_a2a_next_safe_action_sequencer_packet.py`, `WORKSPACE_SCAFFOLD/tests/test_hermes_gateway_current_recheck_packet.py` |
| Codex/Hermes work report draft | local Telegram draft, not sent | `WORKSPACE_SCAFFOLD/scripts/build_codex_hermes_work_report.py`, `data/pathspecs/sirinx_codex_hermes_work_report_contract_2026-06-29.json`, `docs/knowledge/SIRINX_CODEX_HERMES_WORK_REPORT_DRAFT_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_codex_hermes_work_report.py` |
| Codex/Hermes work report packet | local outbox packet, not sent | `_A2A_QUEUE/outbox/packet_014_codex_hermes_work_report_draft.json`, `docs/knowledge/SIRINX_CODEX_HERMES_WORK_REPORT_PACKET_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_codex_hermes_work_report_packet.py` |
| Codex/Hermes queue Mission Control panel | read-only local UI data | `apps/centerbrain-shell/src/lib/god-mode-master-os.ts`, `apps/centerbrain-shell/app/ui/GodModeMasterOS.tsx`, `apps/centerbrain-shell/src/lib/god-mode-master-os.test.ts` |
| GhostClaw YOLO v3.3 merge intake | blocked on exact artifact | `docs/knowledge/SIRINX_GHOSTCLAW_V3_3_MERGE_INTAKE_2026-06-29.md`, `docs/knowledge/SIRINX_GHOSTCLAW_V3_3_PREFLIGHT_RECHECK_2026-06-29.md`, `docs/superpowers/plans/2026-06-29-ghostclaw-yolo-v3-3-staging-merge.md` |
| Active goal completion audit | in progress, not complete | `docs/knowledge/SIRINX_ACTIVE_GOAL_COMPLETION_AUDIT_2026-06-29.md`, `WORKSPACE_SCAFFOLD/tests/test_active_goal_completion_audit.py` |
| Solar ops extraction | contract locked | `SIRINX_SOLAR_OPS_EXTRACTION_PLAN_2026-05-20.md`, `SIRINX_SOLAR_OPS_ENTITY_CONTRACT_2026-05-20.md` |
| Agent runtime extraction | docs locked | `SIRINX_AGENT_RUNTIME_EXTRACTION_PLAN_2026-05-20.md` |
| Safe command and memory policy | docs locked | `SIRINX_SAFE_COMMAND_MEMORY_POLICY_2026-05-20.md` |
| Marketing/CRM schema comparison | contract locked | `SIRINX_MARKETING_CRM_SCHEMA_COMPARISON_2026-05-20.md`, `SIRINX_LEAD_CRM_HANDOFF_CONTRACT_2026-05-20.md` |
| Lead qualification v2 | done local | `services/dev-control-api/src/lead-qualification.mjs` |
| Lead event audit preview | done local | `services/dev-control-api/src/lead-event-audit.mjs`, `GET /api/lead-event-audit` |
| Lead audit Command Center view | done local | `apps/dev-dashboard/src/app.js`, `apps/dev-dashboard/src/index.html` |
| Lead CRM handoff contract | done local | `services/dev-control-api/src/lead-crm-contract.mjs`, `GET /api/lead-crm-contract` |
| Solar ops entity contract | done local | `services/dev-control-api/src/solar-ops-contract.mjs`, `GET /api/solar-ops-contract` |
| policy-core v1 | done local | `packages/policy-core/src/index.mjs`, `GET /api/policy-core` |
| Hermes inbox contract | design locked | `docs/knowledge/SIRINX_HERMES_INBOX_CONTRACT_2026-05-20.md` |
| Hermes inbox dry-run normalizer | done local | `services/hermes-api/src/inbox.mjs`, `POST /api/hermes-inbox/dry-run` |
| Approval evidence snapshots | done local | `services/dev-control-api/src/approval-evidence.mjs`, `pnpm approval-evidence:dry-run` |
| Pending work ledger | done local | `services/dev-control-api/src/pending-work.mjs`, `GET /api/pending-work`, `pnpm pending-work:check` |
| Hermes external adapters | blocked | connector evidence required before any adapter execution |

## Verification Commands

Use these before commit-ready status:

```bash
pnpm verify
pnpm exec vitest run services/dev-control-api/src/lead-qualification.test.mjs
pnpm lead-event-audit:test
pnpm lead-crm-contract:test
pnpm solar-ops-contract:test
pnpm policy-core:test
pnpm policy-core:api-test
pnpm hermes-inbox:test
pnpm approval-evidence:test
pnpm pending-work:test
pnpm pending-work:check
pnpm dashboard:e2e
pnpm external-gates:check
python3 -m unittest discover -s WORKSPACE_SCAFFOLD/tests -v
python3 WORKSPACE_SCAFFOLD/scripts/status_report.py --root .
git diff --check
```

## Stop Rules

- Stop before deploy, DNS route, Cloudflare write, database migration, GitHub push, Telegram/LINE send, Solis API use, or production lead creation unless exact approval exists.
- Do not read `.env` values.
- Do not read or copy keystore/signing material.
- Do not write raw chat logs into memory.
- Do not treat this file as permission to bypass `AGENTS.md`.

## Merch Automation Dashboard v1 - Local Factory Added 2026-06-30

- Mission `MERCH-DASH-V1-AUTO-20260630-001` created a local-first Amazon Merch on Demand planning dashboard under `docs/knowledge/merch_automation_dashboard_v1`.
- The package includes schemas, CSV templates, disabled n8n import workflow, static dashboard UI, prompt pack, QC checklist, 30-day calendar, validator, dispatch packet, and receipts.
- Live Amazon publish, scraping/bypass, fake reviews/traffic, paid provider calls, secrets, push, deploy, and external sends remain blocked.

## MaxPlus Hermes Chinese Model Safe Setup - Local Pack Added 2026-06-30

- Mission `MAXPLUS-HERMES-CHINESE-MODEL-20260630` added redacted Hermes MaxPlus OpenAI-chat templates and validation under `docs/ghostclaw/` and `scripts/ghostclaw/`.
- The pasted live credential was not copied into repo artifacts, and private Hermes config/env files were not read or modified.
- Provider calls, gateway live sends, remote installer execution, push, deploy, and secret reads remain blocked pending separate gates.

## MaxPlus Hermes Preflight - 2026-06-30

- Presence-only preflight for mission `MAXPLUS-HERMES-CHINESE-MODEL-20260630` confirms Hermes is installed and `~/.hermes` exists, but runtime activation remains blocked because `MAXPLUS_CODEX_API_KEY` is not present in the current Codex shell and the provider-call gate is closed.
- Evidence is recorded at `.ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.preflight.json` and `.ghostclaw_runtime/a2a2a/gates/MAXPLUS-HERMES-CHINESE-MODEL-20260630.provider_smoke_gate.json`.

## Hermes MaxPlus Private Config Applicator - 2026-06-30

- Mission `MAXPLUS-HERMES-CHINESE-MODEL-20260630` now includes a manual-gated private config applicator that can write `~/.hermes/config.yaml` and `~/.hermes/.env` from templates when the owner supplies private env outside repo.
- Codex ran only dry-run mode; no home config was written, no secret file was read, and no provider call was executed.

## Hermes MaxPlus Completion Audit - 2026-06-30

- Mission `MAXPLUS-HERMES-CHINESE-MODEL-20260630` now has a requirement matrix proving repo-side safe setup is ready for review while full Hermes runtime completion remains gated.
- Offline CLI preflight confirms Hermes CLI availability without running `doctor`, `status`, provider calls, gateway, cron, or TUI prompts.

## Hermes MaxPlus Advanced Feature Gates - 2026-06-30

- Mission `MAXPLUS-HERMES-CHINESE-MODEL-20260630` now has advanced feature gates for every non-local-safe Hermes feature named in the pasted setup source.
- All gates default closed and the Telegram report remains a local draft only.

## Hermes MaxPlus Gate Runner - 2026-06-30

- Mission `MAXPLUS-HERMES-CHINESE-MODEL-20260630` now has a dry-run gate runner and operator runbook for all remaining runtime gates.
- The current repo evidence proves dry-run routing only; no provider, live message, or home config write has executed.

## GhostClaw Knowledge Integration - 2026-07-02

- Mission `GHOSTCLAW-KNOWLEDGE-INTEGRATION-20260702-001` completed.
- Parent mission `GHOSTCLAW-A2A2A-ADAPTIVE-SYNC-20260702-001` integrated.
- Created canonical registry system under `.ghostclaw/registry/`:
  - `project-registry.v1.yaml` — 28 projects across 6 domain categories
  - `agent-registry.v1.yaml` — 15 agent roles with lane isolation
  - `knowledge-vault-index.v1.yaml` — 32 knowledge artifact pointers
  - `route-matrix.v1.yaml` — 10 task-type routing entries
  - `domain-pack-index.v1.yaml` — 12 project domain packs
- Created 4 JSON schemas under `.ghostclaw/schemas/`.
- Created 5 unified OS docs under `docs/`.
- Created `scripts/ghostclaw_registry_validate.py` validator.
- Created 10 project queue lanes under `.ghostclaw_runtime/a2a2a/project_queues/`.
- Created A2A2A inbox queue item for mission tracking.
- No forbidden actions executed. All work local-safe B tier (doc config).

## Mac mini M2 AI CLI Install Gate Packet - 2026-07-02

- Mission `GHOSTCLAW-MAC-M2-AI-CLI-INTEGRATION-20260702-001` doc-only phase completed.
- Created install gate packet: `docs/MAC_M2_AI_CLI_INSTALL_UPDATE_RECEIPT.md` (D-tier, pending human approval).
- Created operator runbook: `docs/AI_CLI_TUI_OPERATOR_RUNBOOK.md`.
- Created workflow doc: `docs/CODEX_CLAUDE_CODE_LOCAL_WORKFLOW.md`.
- Install/update of Codex CLI and Claude Code CLI remains behind `GATE-INSTALL-001-20260702-001` and requires explicit human execution on the Mac mini.
- No install, home-directory mutation, or multi-repo scanner executed. All doc/config work remained inside `/Users/sirinx/sirinx-os`.

## Codex Task Queue Seeding - 2026-07-02

- Mission `GHOSTCLAW-CODEX-TASK-QUEUE-SEED-20260702-001` completed.
- Created 13 high-level Codex task queue items across 10 project lanes:
  - `ghostclaw_os/`: 4 tasks (core control plane, registry validator enhancement, knowledge retrieval worker, A2A2A queue coordinator)
  - `sirinx_site/`: 2 tasks (public guardian, ROI calculator)
  - `agm/`: 1 task (creative media platform)
  - `ads_andromeda/`: 1 task (campaign asset factory)
  - `kusala/`: 1 task (funeral platform)
  - `phitsanulok_news/`: 1 task (news automation)
  - `merch_dashboard/`: 2 tasks (automation dashboard, QC checklist validator)
  - `creative_assets/`: 1 task (education carousel pack)
  - `local_business/`: 1 task (promo asset pack)
  - `research/`: 2 tasks (reverse engineering workflow, competitor research pipeline)
- Each task includes skill level, allowed/forbidden files, constraints, deliverables, verification, and context retrieval pointers.
- No code executed; only queue item YAML files created. All work local-safe B tier.

## GhostClaw Coding Model Router Pack V2.1 Install - 2026-07-02

- Mission `GHOSTCLAW-MODEL-ROUTER-V2-1-INSTALL-001` completed.
- Installed 27 files from `ghostclaw_coding_model_integration_pack_v2_1.zip` into repo with backups.
- Key additions:
  - `AGENTS_MODEL_ROUTER_ADDENDUM.md` and `CLAUDE_MODEL_ROUTER_ADDENDUM.md` (linked from root AGENTS.md and CLAUDE.md)
  - `config/model-router/` — registry, Hermes config, LiteLLM example, OpenRouter examples
  - `docs/model-routing/` — MODEL_REGISTRY, ROUTING_MATRIX, PROVIDER_POLICY, OPENROUTER_SETUP, PROJECT_APPLY_MAP, PACK_README, NEXT_ACTIONS_MODEL_ROUTER
  - `schemas/ghostclaw/model_router_receipt.schema.json`
  - `skills/coding-model-router/SKILL.md`
  - `.claude/agents/*.md` — 6 subagent definitions
  - `.codex/config.toml.example`
  - `scripts/validate_model_router_pack.py` and `scripts/model_router_dry_run.py`
  - `commands/model-router/`
  - `.env.example` appended with model router env template
- Updated validator paths to match repo structure (`config/model-router/`, `schemas/ghostclaw/`).
- Validation passed:
  - `python3 scripts/validate_model_router_pack.py` → OK
  - `python3 scripts/model_router_dry_run.py --tier T1 --project ghostclaw --task "test model router"` → dry_run allowed, lane=laguna_free_coder
- No real paid calls, no provider calls, no secret read/print, no deploy, no push.
- Backup stored at `.ghostclaw_runtime/backups/model_router_pack_v2_1_20260703_005925/`.

## Vibe Coding Sidebar System - 2026-07-12 ✅ DONE

**Status:** FULLY OPERATIONAL

**Completed:**
- 3-lane parallel system deployed: Codex (backend) + OpenCode (frontend) + Hermes Control
- Isolated git worktrees for each lane
- Sidebars component at `apps/dev-dashboard/components/VibeCodingSidebar.tsx`
- Guardian component at `apps/sirinx-site/public-guardian/Guard.tsx`
- GhostClaw controller at `services/orchestrator/ghostclaw-controller.ts`

**Next:** Continue dispatching GhostClaw tasks via `hermes skill view vibe-coding-sidebar`
