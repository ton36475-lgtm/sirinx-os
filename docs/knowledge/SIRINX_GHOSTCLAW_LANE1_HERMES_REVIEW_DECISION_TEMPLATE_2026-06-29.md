# SIRINX GhostClaw LANE_1 Hermes Review Decision Template

Date: 2026-06-29
Mode: local-only, decision template, no external writes
Repo: `/Users/sirinx/sirinx-os`
Status: `DECISION_TEMPLATE_NOT_DECISION`

## Boundary Notice

This template is not a Hermes decision.

It does not approve the Codex recorder draft, does not create the final Opus
architecture packet, and does not authorize `LANE_2`.

Default gate state:

```text
decision=pending
decision_record=false
lane2_authorized=false
provider_call=false
runtime_queue_execution=false
deploy=false
push=false
```

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

## Hermes Model-Choice Addendum

Hermes may choose any model to help create vibe coding drafts.

This model-choice permission does not authorize deploy, push, cloud mutation, customer send, secret read, or runtime queue execution.

The permission is limited to draft assistance, architecture wording, and local
review preparation. A separate action gate is still required for any external
write, paid-provider execution path, runtime worker action, or production lane.

Boundary evidence:

```text
data/pathspecs/ghostclaw_lane1_hermes_model_choice_boundary_2026-06-29.json
docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_MODEL_CHOICE_BOUNDARY_2026-06-29.md
```

## External Action Approval Boundary

Blanket approval is not executable approval.

Each external or paid action still requires gate-specific approval with target, environment, rollback, and evidence path.

Blocked without gate-specific approval:

```text
deploy
push
cloud mutation
customer send
secret read
paid/provider call
```

## Machine-Readable Template

```text
WORKSPACE_SCAFFOLD/templates/ghostclaw_lane1_hermes_review_decision.template.json
```

## Required Inputs

| Input | Purpose |
| --- | --- |
| `_A2A_QUEUE/inbox/packet_012_ghostclaw_lane1_hermes_draft_review.json` | Review request packet |
| `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DRAFT_REVIEW_REQUEST_2026-06-29.md` | Review request details |
| `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_ARCHITECTURE_PACKET_DRAFT_FOR_HERMES_REVIEW_2026-06-29.md` | Codex recorder draft |
| `docs/knowledge/SIRINX_ACTIVE_GOAL_COMPLETION_AUDIT_2026-06-29.md` | Current blockers and evidence boundary |
| `_OBSIDIAN_GHOSTCLAW_BRAIN/17_ACCEPTANCE_CRITERIA.md` | Architecture lane definition of done |

## Allowed Decisions

| Decision | Meaning | LANE_2 State |
| --- | --- | --- |
| `route_to_opus` | Hermes routes the draft/context to Opus for the final architecture packet | Still blocked |
| `request_revision` | Hermes asks Codex to revise the draft | Still blocked |
| `open_codex_recorder_gate` | Hermes explicitly permits Codex to convert the draft into a final packet as recorder | Still blocked until final packet is recorded and reviewed |
| `block` | Hermes blocks LANE_1 until missing evidence is available | Blocked |

## Required Decision Output

If Hermes actually decides, record it separately at:

```text
docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md
```

That decision file must include:

| Field | Requirement |
| --- | --- |
| `decision` | One of the four allowed decisions |
| `decided_by` | Hermes or operator-authorized recorder |
| `evidence_read` | Exact files reviewed |
| `lane2_authorized` | Must remain false unless final architecture packet and Hermes approval both exist |
| `blocked_actions_preserved` | Deploy, push, provider, runtime queue, migration, install, live send, secret read |
| `model_selection_scope` | Hermes may choose any model for vibe coding draft assistance only |
| `external_action_approval` | Blanket approvals are not executable; use gate-specific approval only |
| `next_safe_action` | One concrete next step |

## Stop Conditions

- Stop if the reviewer tries to authorize `LANE_2` without a final Opus packet.
- Stop if the reviewer tries to merge v3.3 without the exact artifact.
- Stop if provider call, runtime queue execution, deploy, push, cloud mutation,
  install, migration, wallet action, live send, or secret read is requested.
- Stop if the decision cannot cite local evidence paths.

## Telegram-Safe Draft

```text
status=DECISION_TEMPLATE_NOT_DECISION
task=Hermes review decision template for GhostClaw LANE_1 draft
audit=local-only
files=WORKSPACE_SCAFFOLD/templates/ghostclaw_lane1_hermes_review_decision.template.json,docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION_TEMPLATE_2026-06-29.md
tests=template guard tests pending or passing locally
blocker=No actual Hermes decision recorded yet
next_step=Hermes records route_to_opus, request_revision, open_codex_recorder_gate, or block in a separate decision file
dry_run=true
live_send=false
provider_call=false
runtime_queue_execution=false
deploy=false
push=false
lane2_authorized=false
decision_record=false
```

This draft was not live-sent.
