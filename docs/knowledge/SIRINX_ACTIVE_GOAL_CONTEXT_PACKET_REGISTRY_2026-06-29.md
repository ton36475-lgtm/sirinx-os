# SIRINX Active Goal Context Packet Registry

Status: `ACTIVE_GOAL_CONTEXT_PACKET_REGISTRY_LOCAL_ONLY`

Date: 2026-06-29
Mode: local-only, context engineering registry, no external writes
Repo: `/Users/sirinx/sirinx-os`

## Boundary

```text
claims_goal_complete=false
claims_all_chats_read=false
evidence_boundary=local_evidence_only
external_action_authorized=false
```

This registry turns the active local source set into context packets with the
metadata required by `AGENTS.md`:

```text
source | owner | freshness | permission | confidence | relevance | expiry
```

It does not import unavailable ChatGPT chats, does not claim Hermes runtime is
healthy, and does not clear any R0 gate.

## Core Packets

| ID | Source | Owner | Freshness | Permission | Confidence | Relevance | Expiry |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ctx-agents-root` | `AGENTS.md` | Operator / SIRINX | current repo instruction | local_read_only | high | operating protocol and safety gates | until changed or superseded |
| `ctx-project-state` | `PROJECT_STATE.md` | Codex local worker | current worktree state doc | local_read_only | high | current local truth and gates | next meaningful state change |
| `ctx-next-actions` | `NEXT_ACTIONS.md` | Codex local worker | current queue doc | local_read_only | high | ordered queue and evidence | queue change or blocker clear |
| `ctx-active-goal-index` | `data/pathspecs/sirinx_active_goal_systematic_work_index_2026-06-29.json` | Codex local worker | generated and updated 2026-06-29 | local_read_only | high | workstream and blocker index | active objective changes or blockers clear |
| `ctx-codex-hermes-queue` | `data/pathspecs/sirinx_codex_hermes_execution_queue_2026-06-29.json` | Codex / Hermes | generated and updated 2026-06-29 | local_read_only | high | ordered Codex/Hermes queue | Hermes decision or blocker clear |
| `ctx-codex-hermes-a2a-queue-status` | `data/pathspecs/sirinx_codex_hermes_a2a_queue_status_2026-06-29.json` | Codex / Hermes | generated from current `_A2A_QUEUE` files | local_read_only | high | file-bus packet counts and non-execution boundary | queue move or Hermes decision |
| `ctx-hermes-a2a-codex-sync-all-jobs-packet` | `data/pathspecs/sirinx_hermes_a2a_codex_sync_all_jobs_packet_2026-06-29.json` | Hermes / Codex local worker | generated from packet_024 and command-intents bridge evidence | local_read_only | high | local `/goal` command packet for sync-all-jobs coordination, not runtime execution or license claim | packet_024 superseded, packet_013 decision exists, or LICENSE added through approval |
| `ctx-a2a-adaptive-sync-control-status` | `data/pathspecs/sirinx_a2a_adaptive_sync_control_status_2026-06-29.json` | Codex / Hermes review | generated from current A2A file-bus queue status and packet_020 evidence | local_read_only | high | current local A2A adaptive sync control status, not runtime execution or approval | queue state changes or a blocker clearance validates |
| `ctx-a2a-next-safe-action-sequencer` | `data/pathspecs/sirinx_a2a_next_safe_action_sequencer_2026-06-29.json` | Codex / Hermes review | generated from packet_021 control status and current execution queue | local_read_only | high | next safe action sequence, not a decision or approval | Hermes decision, blocker clearance, or queue state change |
| `ctx-hermes-gateway-current-recheck-packet` | `data/pathspecs/sirinx_hermes_gateway_current_recheck_packet_2026-06-29.json` | Codex / Hermes runtime | generated from current localhost probes after packet_022 | local_read_only | high | current gateway blocker proof, not restart/decision/execution | current gateway health proof or operator starts gateway |
| `ctx-blocker-recheck` | `data/pathspecs/sirinx_active_goal_blocker_recheck_2026-06-29.json` | Codex local worker | current probe snapshot | local_read_only | high | current blocker proof | after contradicting proof exists |
| `ctx-read-only-probe-runner` | `WORKSPACE_SCAFFOLD/scripts/probe_active_goal_blockers.py` | Codex local worker | reusable runner plus latest report | local_read_only | high | reproducible filename/TCP blocker probe | probe scope or blocker set changes |
| `ctx-completion-audit` | `docs/knowledge/SIRINX_ACTIVE_GOAL_COMPLETION_AUDIT_2026-06-29.md` | Codex local worker | current audit doc | local_read_only | high | requirement completion audit | blocker clear or new source import |
| `ctx-project-hermes-board` | `/Users/sirinx/project-hermes/HERMES_AGENT_CODEX_CONTINUATION_BOARD_2026-05-30.md` | Hermes / prior Codex lane | stale for health claims | local_read_only | medium | routing patterns and commands | expired for runtime health |
| `ctx-obsidian-digest` | `/Users/sirinx/Documents/Obsidian Vault/SIRINX/AI HQ Knowledge Digest.md` | Operator / Codex pulses | append-only pulse stream | local_read_only | medium | durable memory pulses | when repo artifacts contradict older pulse |
| `ctx-all-chat-contract` | `data/pathspecs/sirinx_all_chat_export_intake_contract_2026-06-29.json` | Codex / Operator input required | current intake contract | operator_required | high | future all-chat import mapping | export source provided or schema changes |
| `ctx-all-chat-export-request-packet` | `data/pathspecs/sirinx_all_chat_export_request_packet_2026-06-29.json` | Codex / Operator input required | request packet generated 2026-06-29 | operator_required | high | request for operator-supplied ChatGPT export path or authorized read-only connector scope | export source provided or request superseded |
| `ctx-hermes-gateway-recheck` | `data/pathspecs/sirinx_hermes_gateway_recheck_2026-06-29.json` | Codex / Hermes runtime | prior and current recheck | local_read_only | high | live routing blocker evidence | health proof exists |
| `ctx-v3-html-recheck` | `data/pathspecs/sirinx_hermes_codex_a2a_godmode_v3_html_recheck_2026-06-29.json` | Codex local worker | current HTML recheck | local_read_only | high | topology evidence only | exact v3.3 artifact exists |
| `ctx-v3-3-merge-plan` | `docs/superpowers/plans/2026-06-29-ghostclaw-yolo-v3-3-staging-merge.md` | Codex local worker | current staging plan | blocked | medium | v3.3 merge procedure after artifact gate | exact artifact changes paths |
| `ctx-lane1-decision-inbox` | `data/pathspecs/ghostclaw_lane1_hermes_decision_inbox_2026-06-29.json` | Hermes / Codex local worker | current local inbox index | local_read_only | high | packet_013 decision gate | Hermes decision artifact exists |
| `ctx-lane1-hermes-decision-intake-handoff` | `data/pathspecs/ghostclaw_lane1_hermes_decision_intake_handoff_2026-06-29.json` | Codex / Hermes review | generated from validator, template, and transition guard evidence | local_read_only | high | reproducible handoff for recording the separate packet_013 Hermes decision | Hermes decision artifact exists or packet_013 changes |
| `ctx-lane1-hermes-decision-handoff-packet-016` | `_A2A_QUEUE/outbox/packet_016_ghostclaw_lane1_hermes_decision_intake_handoff.json` | Codex / Hermes review | created from decision intake handoff evidence | local_read_only | high | outbox pointer to the packet_013 decision intake handoff, not a decision or gate unlock | Hermes decision artifact exists or packet_013 changes |
| `ctx-lane1-hermes-decision-preflight-audit` | `data/pathspecs/ghostclaw_lane1_hermes_decision_preflight_audit_2026-06-29.json` | Codex / Hermes review | generated from packet_013 handoff, validator, transition guard, and model-choice evidence | local_read_only | high | preflight audit proving local review evidence is ready, not a decision or gate unlock | Hermes decision artifact exists or packet_013 changes |
| `ctx-lane1-opus-architecture-packet-gate` | `data/pathspecs/ghostclaw_lane1_opus_architecture_packet_gate_2026-06-29.json` | Codex / Hermes and Opus review | generated from current missing-final-packet state | local_read_only | high | fail-closed validator for a future final Opus packet, not a final packet or gate unlock | Hermes/Opus final packet and Hermes decision exist |
| `ctx-ghostclaw-lane1-opus-authoring-bundle` | `data/pathspecs/ghostclaw_lane1_opus_authoring_bundle_2026-06-29.json` | Codex / Hermes and Opus review | generated from packet_018 gate and packet_013 evidence | local_read_only | high | authoring input bundle for a future final Opus packet, not a final packet or gate unlock | Hermes/Opus final packet and Hermes decision exist |
| `ctx-lane1-packet013-decision-draft` | `data/pathspecs/ghostclaw_lane1_packet013_decision_draft_2026-06-29.json` | Codex / Hermes review | generated from readiness and workbench | local_read_only | high | draft-only route_to_opus decision aid | Hermes decision artifact exists |
| `ctx-lane1-hermes-decision-transition-guard` | `data/pathspecs/ghostclaw_lane1_hermes_decision_transition_guard_2026-06-29.json` | Codex / Hermes review | generated from current missing-decision state | local_read_only | high | fail-closed transition guard for future validated Hermes decision | Hermes decision artifact exists or packet_013 changes |

## Non-Actions

No deploy, push, cloud mutation, customer send, secret read, provider call, runtime queue execution, merge script, install, or migration was performed.

## Next Safe Action

Use this registry to choose source refreshes by freshness and confidence:

1. Trust current repo files over older memory when they conflict.
2. Treat the `project-hermes` continuation board as stale for health claims.
3. Run or inspect the read-only probe runner before refreshing blocker
   snapshots from older evidence.
4. Use the all-chat intake contract only after an operator-provided export or
   connector-backed source exists.
5. Keep v3.3 merge planning blocked until the exact zip exists.
6. Keep packet_013 blocked until Hermes records a decision artifact.
7. Treat packet_023 as gateway blocker evidence only; it does not restart
   Hermes or prove live routing.
8. Treat packet_024 as a local `/goal` command only; it does not execute Codex,
   call a provider, or claim the repo is MIT licensed while no `LICENSE` file
   exists.
9. After a separate Hermes decision artifact and final Opus packet exist, run
   the Opus packet gate validator and transition guard before any recorder-gate,
   Opus-packet state, or LANE_2 state change.
