# Draft Architecture Packet: GHOSTCLAW LANE_1

Date: 2026-06-29
Mode: local-only, docs-only, Codex recorder draft for Hermes review
Repo: `/Users/sirinx/sirinx-os`
Status: `DRAFT_FOR_HERMES_REVIEW_NOT_FINAL_OPUS_PACKET`

## Boundary Notice

This is a Codex recorder draft prepared from local evidence so Hermes and Opus
can review the LANE_1 architecture packet faster.

It is not the final Opus architecture packet, not Hermes approval, and not
authorization for `LANE_2`; specifically, it is not authorization for `LANE_2`.

Non-actions preserved:

```text
No deploy.
No push.
No provider call.
No runtime queue execution.
No database migration.
No v3.3 backend merge until exact artifact exists.
No LANE_2 build until Hermes approval.
No secret read.
```

## Goal

Produce the architecture direction for `GHOSTCLAW Hermes Commander A2A2A OS
v2.0` after `LANE_0` local scaffold completion, with enough specificity for
Hermes to decide whether Codex may later create the `LANE_2` build plan.

The architecture must preserve the chain:

```text
Human Operator -> Hermes -> Opus -> Hermes -> Codex -> KOB -> Command Broker -> Mission Control
```

The draft goal is narrower: prepare reviewable architecture content without
executing any build, merge, migration, provider, runtime, deploy, wallet, or
live-send action.

## Current State

| Area | State |
| --- | --- |
| LANE_0 scaffold | Complete as local evidence |
| LANE_1 request | Prepared at `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_REQUEST_2026-06-29.md` |
| LANE_1 inbox packet | Queued locally at `_A2A_QUEUE/inbox/packet_011_ghostclaw_lane1_opus_architecture.json` |
| LANE_1 worksheet | Prepared at `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_ARCHITECTURE_INPUT_WORKSHEET_2026-06-29.md` |
| LANE_1 route receipt | Prepared at `_A2A_QUEUE/outbox/packet_011_ghostclaw_lane1_hermes_route_receipt.json` |
| Hermes gateway | Not reachable on `127.0.0.1:9000` during latest rehydrate |
| Final Opus packet | Missing |
| LANE_2 | Blocked |
| v3.3 merge kit | Missing exact local artifact |
| Current checkout | Dirty and ahead of origin; no branch/commit action allowed from this state |

## Proposed Architecture

### 1. Brain-First Control Plane

Obsidian digest and repo docs remain the durable memory/control plane. Chat
summaries are routing hints only until a local export or connector-backed source
exists.

Authoritative state should flow through:

```text
AGENTS.md
PROJECT_STATE.md
NEXT_ACTIONS.md
_OBSIDIAN_GHOSTCLAW_BRAIN/**
docs/knowledge/**
_A2A_QUEUE/**
```

### 2. A2A2A File-Bus First

Until Hermes gateway health is proven, `LANE_1` routing should remain local
file-bus evidence:

```text
_A2A_QUEUE/inbox/packet_011_ghostclaw_lane1_opus_architecture.json
_A2A_QUEUE/outbox/packet_011_ghostclaw_lane1_hermes_route_receipt.json
```

This gives Hermes/Opus a verifiable packet trail without live Telegram send,
provider call, or runtime queue execution.

### 3. Architecture Before Build

`LANE_2` stays blocked until one of these is true:

1. Opus produces `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md`
   and Hermes approves it.
2. The operator explicitly opens a Codex-as-recorder gate and Hermes records the
   resulting decision.

### 4. v3.3 Merge As Separate Artifact-Gated Worktree

The v3.3 Agentic OS backend merge should stay separate from LANE_1 architecture
until the exact local artifact exists:

```text
/Users/sirinx/Downloads/ghostclaw_repo_merge_kit_v3_3.zip
```

Only after artifact gate passes should Codex create an isolated feature
worktree and apply TDD fixes for `agentic.ts`, `llmAnalysis.ts`, notification
ownership guards, `db.ts`, migrations, and policy tests.

### 5. Mission Control Read-Only First

Mission Control should continue consuming static repo fixtures and receipts
first. Runtime queue integration remains deferred until Command Broker and KOB
validation prove the path safe.

## Interface Contracts

| Contract | Required Fields | Current Source |
| --- | --- | --- |
| A2A2A mission request | `mission_id`, `correlation_id`, `from`, `to`, `lane_id`, `action_requested`, gate flags | `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_REQUEST_2026-06-29.md` |
| Local inbox packet | `id`, `project`, `priority`, `title`, `agent`, `status`, `risk`, `input`, `output`, `approval_required` | `_A2A_QUEUE/inbox/packet_011_ghostclaw_lane1_opus_architecture.json` |
| Route receipt | route decision, gate flags, blocked actions, next action | `_A2A_QUEUE/outbox/packet_011_ghostclaw_lane1_hermes_route_receipt.json` |
| Final architecture packet | goal, current state, proposed architecture, interface contracts, data model changes, lane assignments, risk, dependencies, rollback, Hermes recommendation | Missing |
| Codex build handoff | approved packet path, allowed file scopes, forbidden paths, validation commands, rollback plan | Blocked until Hermes approval |
| Command Broker action request | command class, tier, owner, approval requirement, lane, stop condition | Future LANE_4 |
| Mission Control evidence | source path, status, confidence, last verified time, external action flag | Current read-only fixtures |

## Data Model Changes

No database migration is approved by this draft.

Design-only entities for Opus/Hermes review:

| Entity | Purpose | Lane |
| --- | --- | --- |
| `fleet_ships` | Fleet/Ship ownership | Future data lane |
| `ship_crew` | Co-worker role assignment | Future data lane |
| `fleet_missions` | Mission lifecycle | Future data lane |
| `lane_assignments` | File pattern ownership and lane locks | Future data lane |
| `a2a2a_messages` | File-bus and future runtime route ledger | Future A2A2A lane |
| `command_broker_decisions` | Allow/hold/block audit | Future Command Broker lane |
| `r0_gates` | R0 approval state | Future release-gate lane |
| `agent_status` | Agent readiness and route state | Future Mission Control lane |
| `security_flags` | Safety issues and hard blockers | Future QA/Sentinel lane |
| `notifications` | Local operator notifications with ownership guard | v3.3 merge lane |
| `receipt_ledger` | Test, review, merge, and route receipts | Future Mission Control lane |

## Lane Assignments

| Lane | Owner | Scope | Current Decision |
| --- | --- | --- | --- |
| LANE_0 | Codex under Hermes | Scaffold, docs, runtime directories | Done local evidence |
| LANE_1 | Opus/Hermes | Architecture packet and review | This draft is input only; final packet missing |
| LANE_2 | Codex | Build plan from approved packet | Blocked |
| LANE_3 | Codex | Model router and department workers | Pending |
| LANE_4 | Codex / Command Broker | Command broker policies and standing approval | Pending |
| LANE_5 | Codex | A2A2A task router/state machine | Pending |
| LANE_6 | Hermes | Obsidian brain integrity | Prefight evidence exists; formal lane pending dependencies |
| v3.3 merge lane | Codex in isolated worktree | Backend/dashboard/policy merge | Blocked on exact artifact |

## Risk Assessment

| Risk | Severity | Control |
| --- | --- | --- |
| Codex draft is mistaken for Opus approval | High | Draft file name and status say not final; tests enforce disclaimer |
| LANE_2 starts early | High | Route receipt and draft state `lane2_authorized=false` / blocked |
| v3.3 merge proceeds from review text only | High | Artifact gate remains required |
| Hermes gateway absence is hidden | Medium | Route receipt records gateway unreachable and no restart |
| Runtime queue execution leaks into docs lane | High | Runtime execution flag remains false |
| Secret or `.env` exposure | High | Secret reads remain blocked |
| Dirty checkout causes unsafe branch/commit | Medium | Feature branch/commit from current checkout remains blocked |
| Mission Control executes commands | High | Read-only fixture model remains required |
| All-chat claim overreaches local evidence | Medium | Active audit keeps `BLOCK-CHAT-EXPORT` open |

## Dependencies

| Dependency | Status | Needed For |
| --- | --- | --- |
| Final Opus architecture packet | Missing | LANE_2 build planning |
| Hermes approval decision | Missing | Any LANE_2 authorization |
| Hermes gateway proof or accepted file-bus mode | Missing live proof; file-bus mode recorded | Live routing claims |
| Exact v3.3 merge kit | Missing | v3.3 backend integration |
| ChatGPT export or connector source | Missing | Full all-chat consolidation |
| R0 approvals | Missing | Pocket Hatchery testnet, wallet connector, merge-to-main |

## Rollback Plan

Because this draft is docs-only, rollback is file-scope removal or revision:

```text
docs/knowledge/SIRINX_GHOSTCLAW_LANE1_ARCHITECTURE_PACKET_DRAFT_FOR_HERMES_REVIEW_2026-06-29.md
WORKSPACE_SCAFFOLD/tests/test_lane1_architecture_draft.py
```

Do not use destructive git commands. If rollback is needed, remove or revise
only the scoped draft/test files with explicit operator instruction, and keep
the route receipt/audit history intact.

## Hermes Routing Recommendation

Recommended route:

```text
status=READY_FOR_HERMES_REVIEW_DRAFT_ONLY
task=Review Codex recorder draft for GhostClaw LANE_1 architecture
files=docs/knowledge/SIRINX_GHOSTCLAW_LANE1_ARCHITECTURE_PACKET_DRAFT_FOR_HERMES_REVIEW_2026-06-29.md
blocker=Final Opus architecture packet and Hermes approval still missing
next_step=Hermes either routes to Opus for final packet, requests revision, or explicitly opens Codex-as-recorder gate
dry_run=true
live_send=false
provider_call=false
runtime_queue_execution=false
deploy=false
push=false
lane2_authorized=false
```

Hermes should not route Codex to `LANE_2` from this draft alone.
