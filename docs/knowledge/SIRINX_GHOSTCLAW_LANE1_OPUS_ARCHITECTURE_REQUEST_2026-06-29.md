# SIRINX GhostClaw LANE_1 Opus Architecture Request

Date: 2026-06-29
Mode: local-only, docs-only, architecture request
Repo: `/Users/sirinx/sirinx-os`

## Request Status

This packet prepares `LANE_1: OPUS_ARCHITECTURE_PACKET` for Hermes routing to
Opus. It is not the final Opus architecture packet and does not authorize
Codex to begin `LANE_2` build work.

## Mission Card

```text
Goal:
Produce the Opus architecture packet for GHOSTCLAW Hermes Commander A2A2A OS
v2.0 after LANE_0 local scaffold completion.

Constraints:
- Local-only and docs-only.
- No provider call unless separately approved.
- No deploy, push, cloud mutation, live send, install, model download, GPU
  runtime, database migration, external connector sync, or secret read.
- Do not mark LANE_1 complete until the architecture packet exists, Hermes
  reviews it, interface contracts are clear, data model changes are defined,
  risk assessment is complete, and the decision is recorded.
- Codex must not begin LANE_2 build work before Hermes routes an approved
  architecture packet.

File Scope:
Allowed:
- docs/knowledge/**
- docs/**
- _OBSIDIAN_GHOSTCLAW_BRAIN/**
- GHOSTCLAW/** for read-only references

Forbidden:
- .env, .env.*
- infra/cloudflare/**
- production deploy scripts
- database migration execution
- external connector registration
- runtime queue execution

Expected Result:
- Opus returns a complete architecture packet to Hermes.
- Hermes can approve, request revision, or escalate.
- Codex receives only the approved packet for LANE_2 planning.

Verification:
- Architecture packet includes goal, current state, proposed architecture,
  interface contracts, data model changes, lane assignments, risk assessment,
  dependencies, and rollback plan.
- _OBSIDIAN_GHOSTCLAW_BRAIN/17_ACCEPTANCE_CRITERIA.md Architecture Lane items
  can be checked against local evidence.
- git diff --check passes.

Report Format:
- Summary
- Architecture packet path
- Files read
- Decisions required
- Risks
- Blockers
- Next lane routing decision
```

## A2A2A Envelope For Hermes

```json
{
  "a2a2a_version": "2.0",
  "message_type": "mission_request",
  "mission_id": "M-2026-0629-GHOSTCLAW-LANE1-OPUS-ARCH",
  "correlation_id": "sirinx-ghostclaw-lane1-opus-20260629",
  "from": {
    "agent": "codex-local-worker",
    "role": "codex-build-captain"
  },
  "to": {
    "agent": "hermes-commander",
    "role": "mission-commander"
  },
  "requested_next_agent": {
    "agent": "opus-architect",
    "role": "chief-architect"
  },
  "lane_id": "LANE_1",
  "lane_name": "OPUS_ARCHITECTURE_PACKET",
  "depends_on": ["LANE_0"],
  "dependency_evidence": [
    "docs/knowledge/SIRINX_GHOSTCLAW_LANE0_STATUS_REFRESH_2026-06-29.md",
    "_OBSIDIAN_GHOSTCLAW_BRAIN/16_STATUS_BOARD.md",
    "_OBSIDIAN_GHOSTCLAW_BRAIN/17_ACCEPTANCE_CRITERIA.md"
  ],
  "action_requested": "route_to_opus_for_architecture_packet",
  "human_approval_required": false,
  "external_actions_allowed": false,
  "provider_call_allowed": false,
  "timestamp": "2026-06-29T05:07:00+07:00",
  "ttl_seconds": 3600
}
```

## Required Context For Opus

| Priority | File | Reason |
| --- | --- | --- |
| 1 | `AGENTS.md` | Root safety and MillerDev task protocol |
| 2 | `GHOSTCLAW/AGENTS.md` | GHOSTCLAW authority, ownership, and approval chain |
| 3 | `_OBSIDIAN_GHOSTCLAW_BRAIN/01_PROJECT_CONTRACT.md` | Project scope and hard constraints |
| 4 | `_OBSIDIAN_GHOSTCLAW_BRAIN/14_SOURCE_OF_TRUTH.md` | Source priority and conflict rules |
| 5 | `_OBSIDIAN_GHOSTCLAW_BRAIN/16_STATUS_BOARD.md` | Current lane status |
| 6 | `_OBSIDIAN_GHOSTCLAW_BRAIN/18_BUILD_LANES.md` | Lane definitions and dependencies |
| 7 | `_OBSIDIAN_GHOSTCLAW_BRAIN/17_ACCEPTANCE_CRITERIA.md` | Architecture lane definition of done |
| 8 | `docs/OPUS_ARCHITECTURE_FIRST_WORKFLOW.md` | Required Opus workflow and packet shape |
| 9 | `GHOSTCLAW/MASTER.md` | Master architecture |
| 10 | `GHOSTCLAW/FLEET_ORCHESTRATOR.md` | Fleet/Ship/Crew model |
| 11 | `GHOSTCLAW/COMMAND_BROKER.md` | Command-broker gate policy |
| 12 | `GHOSTCLAW/protocols/A2A2A_PROTOCOL.md` | Protocol and routing rules |
| 13 | `docs/knowledge/SIRINX_GHOSTCLAW_V3_3_MERGE_INTAKE_2026-06-29.md` | Pending v3.3 artifact-gated merge lane |

## Opus Output Template

```markdown
# Architecture Packet: GHOSTCLAW LANE_1

## Goal

## Current State

## Proposed Architecture

## Interface Contracts

## Data Model Changes

## Lane Assignments

## Risk Assessment

## Dependencies

## Rollback Plan

## Hermes Routing Recommendation
```

## Architecture Questions To Resolve

1. Should GhostClaw v3.3 Agentic OS backend integration remain a separate
   feature worktree until the exact merge artifact exists locally?
2. Which source tree owns future `agenticRouter` and `llmAnalysis` files:
   `sirinx-os` services, a separate app import, or a new GhostClaw service
   boundary?
3. Should Mission Control read v3.3 receipts from static repo fixtures first,
   with runtime queue integration deferred until after Command Broker review?
4. What database tables are required for architecture layers, tasks, R0 gates,
   agent status, security flags, notifications, metrics, and receipt ledgers?
5. Which actions stay permanently blocked in production unless a human opens
   an exact gate?

## Stop Gates

| Gate | Status |
| --- | --- |
| Build work before Opus packet | BLOCKED |
| LANE_2 route before Hermes approval | BLOCKED |
| v3.3 merge without exact artifact | BLOCKED |
| Feature branch or commit from dirty checkout | BLOCKED |
| Provider call for architecture | BLOCKED unless approved |
| Production deploy | BLOCKED |

## Next Safe Action

Hermes should route this request to Opus for a docs-only architecture packet.
Codex should wait for the approved packet before creating build plans, patches,
migrations, runtime queue integrations, or dashboard wiring.
