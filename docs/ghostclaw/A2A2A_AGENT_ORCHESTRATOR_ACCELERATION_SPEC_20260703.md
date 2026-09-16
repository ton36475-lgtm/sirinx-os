# A2A2A Agent Orchestrator Acceleration Spec

Packet: `A2A2A-P077-AGENT-ORCHESTRATOR-ACCELERATION-PLAN-20260703`
Status: `IMPLEMENTED_LOCAL_SAFE_DRY_RUN_ORCHESTRATOR`
Updated: `2026-07-03T11:49:00+07:00`

## Objective

Accelerate the GhostClaw A2A2A adaptive sync control plane with an agent
orchestrator that coordinates Hermes, Codex, OpenCode, KOB, and local role
workers without widening the safety boundary.

P077B now implements the local dry-run orchestrator only. It does not start
workers, mutate queues, call providers, send Telegram messages, push, deploy, or
touch Cloudflare/R2.

## Active Focus

| Lane | Status | Rule |
|---|---|---|
| `sirinx.co` | active | priority project queue |
| `AGM AutoFlow` | active | priority project queue |
| `Kusala` | paused | do not route new work |
| `Phitsanulok News` | paused | do not route new work |

## Current Local Evidence

Read-only dry-run command:

```bash
python3 scripts/ghostclaw_a2a_queue_coordinator.py --dry-run --project-queue-mode dry-run
```

Observed summary:

| Metric | Value |
|---|---:|
| total packets | 85 |
| would dispatch | 5 |
| would gate | 48 |
| observed only | 32 |
| dispatched | 0 |
| gated | 0 |

The coordinator preserved blocked actions: no provider call, no live send, no
secret read, no push, no deploy, no external install, no queue file mutation, and
no payload execution.

## Orchestrator Contract

The orchestrator is a local control-plane layer, not an autonomous live agent.
Its job is to rank, lease, route, validate, and report packets.

Required behaviors:

- read current queue/project state before every routing decision
- prioritize `sirinx_site` and `agm` project queues
- keep paused project queues visible but unrouted
- issue one active mutation lease at a time per file/layer/page
- route Codex as the only source-mutating builder after approval
- route OpenCode as read-only reviewer one packet behind Codex
- route Hermes as controller/status/receipt owner
- route KOB as planner/context compressor only
- stop when a packet requires external action, secret, provider call, install,
  push, deploy, live send, or Cloudflare/R2 mutation
- write a receipt for each packet state transition after implementation approval

## Acceleration Model

Acceleration comes from reducing idle coordination time, not bypassing gates.

| Mechanism | Effect | Safety boundary |
|---|---|---|
| priority scoring | active-focus packets rise first | no queue mutation before gate |
| stale packet triage | old packets become gate/observe candidates | no auto-delete |
| reviewer lag | OpenCode reviews packet N-1 while Codex prepares N | OpenCode remains read-only |
| lease manifest | prevents file/path/page collision | one mutation lane |
| receipt index | makes handoff auditable | no receipt equals no done claim |
| blocked-action classifier | high-risk packets stop early | exact gate required |

## Required Implementation Gate

The task-specific source implementation gate was provided for P077B:

```text
APPROVE_IMPLEMENTATION A2A2A_AGENT_ORCHESTRATOR_ACCELERATION_P077
```

This gate allowed only local source implementation for the dry-run orchestrator
slice. It did not authorize provider calls, Telegram live sends, push, deploy,
install, Cloudflare/R2 mutation, worker execution, queue mutation, or secret
reads.

## Implemented Local Source Slice

- `scripts/ghostclaw_a2a_agent_orchestrator.py`
- `WORKSPACE_SCAFFOLD/tests/test_ghostclaw_a2a_agent_orchestrator.py`

Latest evidence:

- `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P077-AGENT-ORCHESTRATOR-ACCELERATION-IMPLEMENTATION-20260703.json`
- `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P077-AGENT-ORCHESTRATOR-ACCELERATION-IMPLEMENTATION-20260703.json`

## Acceptance Criteria For A Later Approved Implementation

- local status surface shows active-focus queues and paused queues separately
- orchestrator dry-run returns deterministic routing decisions
- file lease policy is enforced before Codex mutations
- OpenCode review packets are read-only and receipt-backed
- blocked actions remain blocked by default
- focused tests pass without installing dependencies
- `git diff --check` passes for scoped changes
- receipt and evidence JSON parse successfully
