# SIRINX GhostClaw LANE_1 Architecture Input Worksheet

Date: 2026-06-29
Mode: local-only, docs-only, no provider call
Repo: `/Users/sirinx/sirinx-os`
Status: `OPUS_INPUT_READY_NOT_ARCHITECTURE_PACKET`

## Purpose

This worksheet consolidates verified local context for `LANE_1:
OPUS_ARCHITECTURE_PACKET`.

It is not the final Opus architecture packet, not Hermes approval, and not
authorization for Codex to begin `LANE_2`.

## Task Card

Goal:
Prepare the local evidence, constraints, interface questions, data-model
questions, and stop gates needed for Hermes to route a docs-only architecture
packet task to Opus.

Constraints:
- Local-only and docs-only.
- No provider call, live send, runtime queue execution, deploy, push, cloud
  mutation, install, migration execution, model download, GPU runtime, wallet
  action, or secret read.
- Do not create the final `SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md`
  unless Hermes/Opus review or an explicit Codex-as-recorder gate exists.
- Do not start `LANE_2`.
- Treat GhostClaw YOLO v3.3 review as merge intent only until exact artifacts
  exist locally.

File Scope:
Allowed:
- `docs/knowledge/**`
- `docs/superpowers/plans/**`
- `_OBSIDIAN_GHOSTCLAW_BRAIN/**` status/decision records
- root status docs

Forbidden:
- `.env`, `.env.*`, secrets, signing material
- `infra/cloudflare/**`
- production deploy scripts
- runtime queue execution
- database migrations
- backend v3.3 copy/merge paths before artifact gate

Expected Result:
Hermes can route `LANE_1` to Opus with enough local evidence to produce the
architecture packet without using stale chat assumptions.

Verification:
- Packet shape remains valid JSON.
- Architecture acceptance criteria remain unchecked until the final packet and
  Hermes review exist.
- `git diff --check` passes.

Report Format:
- Summary
- Files read
- Worksheet path
- Decisions needed
- Risks
- Next safe action

## Sources Read

| Source | Use |
| --- | --- |
| `_A2A_QUEUE/inbox/packet_011_ghostclaw_lane1_opus_architecture.json` | Current Hermes route packet |
| `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_REQUEST_2026-06-29.md` | Mission request and Opus output template |
| `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_ROUTE_DRAFT_2026-06-29.md` | Telegram-safe route draft |
| `_OBSIDIAN_GHOSTCLAW_BRAIN/17_ACCEPTANCE_CRITERIA.md` | Definition of done for architecture lane |
| `docs/OPUS_ARCHITECTURE_FIRST_WORKFLOW.md` | Design-first workflow |
| `GHOSTCLAW/AGENTS.md` | GHOSTCLAW authority chain and file ownership |
| `_OBSIDIAN_GHOSTCLAW_BRAIN/01_PROJECT_CONTRACT.md` | Hard constraints and autonomy levels |
| `_OBSIDIAN_GHOSTCLAW_BRAIN/14_SOURCE_OF_TRUTH.md` | Source priority and conflict rules |
| `_OBSIDIAN_GHOSTCLAW_BRAIN/18_BUILD_LANES.md` | Ordered lane dependencies |
| `GHOSTCLAW/MASTER.md` | Authority stack and master architecture |
| `GHOSTCLAW/FLEET_ORCHESTRATOR.md` | Fleet/Ship/Crew ownership and flow |
| `GHOSTCLAW/COMMAND_BROKER.md` | Command tiers and approval gates |
| `GHOSTCLAW/protocols/A2A2A_PROTOCOL.md` | Routing rules and action classes |
| `docs/knowledge/SIRINX_GHOSTCLAW_LANE0_STATUS_REFRESH_2026-06-29.md` | LANE_0 completion evidence |
| `docs/knowledge/SIRINX_GHOSTCLAW_V3_3_MERGE_INTAKE_2026-06-29.md` | Artifact-gated v3.3 merge lane |
| `docs/knowledge/SIRINX_GHOSTCLAW_V3_3_PREFLIGHT_RECHECK_2026-06-29.md` | Latest artifact absence proof |
| `/Users/sirinx/project-hermes/HERMES_AGENT_CODEX_CONTINUATION_BOARD_2026-05-30.md` | Local-only Hermes/Codex continuation boundary |

## Current Local Truth

| Area | Verified State |
| --- | --- |
| LANE_0 | Complete as local evidence scaffold |
| LANE_1 | Request and Hermes inbox route packet prepared; final architecture packet missing |
| LANE_2 | Blocked until Hermes approves the architecture packet |
| v3.3 merge kit | Exact artifact still missing locally |
| Current checkout | Dirty and ahead of origin; do not create merge commits from this state |
| External actions | Blocked by default |
| Full all-chat import | Incomplete without ChatGPT export or connector-backed source |

## Architecture Questions For Opus

1. Should the v3.3 Agentic OS backend merge remain a separate worktree until
   `ghostclaw_repo_merge_kit_v3_3.zip` exists and policy tests pass?
2. Which local boundary owns future `agenticRouter` and `llmAnalysis` work:
   `services/dev-control-api`, a new GhostClaw service, or a separate imported
   app boundary?
3. Should Mission Control consume v3.3 receipts from static repo fixtures first,
   with runtime queue integration deferred until Command Broker review?
4. Which data model belongs in the first architecture packet versus the later
   v3.3 merge lane?
5. Which actions stay permanently human-gated in production even if internal
   lanes become more autonomous?
6. How should Hermes record route acknowledgments without live Telegram send or
   provider calls?
7. What minimum KOB validation should block LANE_2 if the final architecture
   packet is incomplete?

## Proposed Architecture Boundaries To Review

| Boundary | Proposed Direction | Why |
| --- | --- | --- |
| Brain source | Obsidian digest plus repo docs remain source-of-truth memory | Matches brain-first architecture and avoids stale chat claims |
| Mission routing | `_A2A_QUEUE/inbox/*.json` for local packet evidence | Local, auditable, no live send |
| Architecture output | `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md` only after Opus/Hermes gate | Preserves Navigator-before-Engineer |
| Build planning | `docs/superpowers/plans/**` only after Hermes approval | Prevents Codex from starting LANE_2 early |
| Mission Control evidence | Static repo fixtures first | Avoids browser-side runtime file reads or command execution |
| Runtime queue | Deferred | Needs Command Broker and lane ownership review |
| v3.3 backend | Separate artifact-gated worktree | Current checkout is dirty and exact artifact is missing |

## Interface Contracts Needed

| Contract | Minimum Fields |
| --- | --- |
| A2A2A mission request | `mission_id`, `correlation_id`, `from`, `to`, `lane_id`, `action_requested`, gate flags |
| Hermes route record | packet path, status, route decision, blocker, next step, dry-run flags |
| Opus architecture packet | goal, current state, proposed architecture, interface contracts, data model changes, lane assignments, risks, dependencies, rollback |
| Codex build handoff | approved architecture path, allowed file scopes, forbidden paths, tests, rollback plan |
| Command Broker action request | command class, lane, tier, approval requirement, owner, stop condition |
| Mission Control evidence item | source path, status, confidence, last verified time, external action flag |

## Data Model Topics For Opus

No migration is approved in this lane. These are design topics only:

| Entity | Purpose |
| --- | --- |
| `fleet_ships` | Fleet/Ship/Crew ownership |
| `ship_crew` | Co-worker role assignment |
| `fleet_missions` | Mission lifecycle |
| `lane_assignments` | File-scope ownership |
| `a2a2a_messages` | Route packet ledger |
| `command_broker_decisions` | Allow/hold/block audit |
| `r0_gates` | R0 approval state |
| `agent_status` | Agent readiness and lane status |
| `security_flags` | Safety findings and stop gates |
| `notifications` | Local operator notices with ownership guard |
| `receipt_ledger` | Merge/test/review evidence receipts |

## Risk Assessment Inputs

| Risk | Current Handling |
| --- | --- |
| Codex impersonates Opus | Do not create final Opus packet without gate |
| No-Ask becomes approve-all | Keep action gates explicit and blocked by default |
| Missing v3.3 artifact | Keep merge lane blocked on exact artifact |
| Dirty checkout | Avoid feature branch/commit from current tree |
| Runtime queue execution | Keep packet as local evidence only |
| Provider cost/privacy | No provider call without explicit approval |
| Secret exposure | No `.env` or secret reads |
| Cross-lane writes | Record file scopes before build |
| Incomplete all-chat import | Label output as local-evidence-only |
| pnpm no-TTY blocker | Prefer direct local commands for verification |

## Acceptance Criteria Status

| Architecture Lane Item | Current Status |
| --- | --- |
| Architecture packet from Opus | Missing |
| Hermes review + approval | Missing |
| Lane definitions clear with file scopes | Partially prepared in this worksheet |
| Data model defined | Candidate topics listed; not approved |
| Interface contracts written | Draft contract list prepared; not approved |
| Risk assessment complete | Inputs prepared; final assessment pending Opus |
| Recorded in DECISION_LOG | Boundary decision recorded separately |

## Next Safe Action

Hermes should route this worksheet plus the existing request packet to Opus for
the final docs-only architecture packet. Codex must keep `LANE_2` blocked until
Hermes approves that packet.
