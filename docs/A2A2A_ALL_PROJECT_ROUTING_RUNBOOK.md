# A2A2A All-Project Routing Runbook

## Overview

A2A2A (Adaptive Asynchronous Agent-to-Agent) is the task routing protocol for GhostClaw. It ensures every task has a clear owner, audit trail, lease, and receipt. All queue operations are file-based — no in-memory state.

## Queue Structure

| Path | Purpose |
|------|---------|
| `.ghostclaw_runtime/a2a2a/inbox/` | New tasks arrive here from Telegram, CLI, or manual entry |
| `.ghostclaw_runtime/a2a2a/project_queues/{project_id}/` | Per-project queue lanes |
| `.ghostclaw_runtime/a2a2a/receipts/` | Completed task receipts |
| `.ghostclaw_runtime/a2a2a/archive/` | Closed queue items moved here after receipt |

Current queue items are YAML files named `TASK-*.yaml`. Older JSON examples remain useful for field semantics, but the active local project queues under `.ghostclaw_runtime/a2a2a/project_queues/` are YAML.

## Queue Item Format

```json
{
  "mission_id": "mis-20260703-001",
  "parent_mission_id": null,
  "project_id": "sirinx-solar-carport",
  "task_type": "public_site_ui",
  "tier": "B",
  "primary_agent": "codex",
  "status": "pending",
  "created_at": "2026-07-03T10:00:00Z",
  "lease": null,
  "receipt": null,
  "metadata": {
    "source": "telegram",
    "requester": "sirinx"
  }
}
```

Status values: `pending`, `active`, `done`, `blocked`, `failed`.

## Routing Flow

1. **Task arrives in inbox** — from Telegram command, CLI invocation, or manual file placement in `.ghostclaw_runtime/a2a2a/inbox/`
2. **Hermes identifies task type and project** — reads route matrix at `.ghostclaw/registry/route-matrix.v1.yaml` to map task_type to the correct route
3. **Hermes creates queue item** in the appropriate project queue at `.ghostclaw_runtime/a2a2a/project_queues/{project_id}/{mission_id}.queue.json`
4. **Primary agent picks up task** — agent reads its assigned project queue, finds pending items matching its role
5. **Agent creates lease** at `.ghostclaw_runtime/a2a2a/locks/{mission_id}.lease.json` with file scope and expiration
6. **Agent executes within tier constraints** — only actions permitted by the action tier
7. **Agent writes receipt** at `.ghostclaw_runtime/receipts/{mission_id}.receipt.json` with actions taken, files changed, validation status
8. **Reviewer validates** — OpenCode reads the receipt, validates the lease is closed, and verifies the work
9. **Receipt goes to receipts folder** — validated receipt remains in receipts/ for audit trail
10. **Queue item marked done** — status changes to `done`; item moves to archive after 24 hours

## Lane Isolation Rules

- `requester_agent` must never equal `approver_agent` — this is enforced at the queue level.
- Codex is the only mutating builder for code/script tasks. No other agent may mutate source files without a separate, explicit lease.
- Hermes handles routing, queue management, and reporting. Hermes never mutates source files.
- OpenCode handles review and validation only. OpenCode never mutates source files.
- Policy Guardian handles policy enforcement and D-tier gate approval. Policy Guardian never executes tasks.
- Validator handles schema, lint, and receipt validation. Validator never builds or mutates.
- If an agent is unavailable, the task stays `pending` until the agent comes back. No automatic reassignment.

## Local Control-Plane Dry-Run API

The current local control-plane implementation is exposed through the dev-control API:

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/ghostclaw/control-plane` | Read registry status, route count, agent count, and safety guardrails |
| `POST` | `/api/ghostclaw/control-plane/dispatch/dry-run` | Preview task routing, policy classification, file-lease status, receipt validity, and OpenCode read-only review dispatch |

These routes are dry-run only. They do not execute workers, call providers, send Telegram/LINE/email messages, install packages, push, deploy, mutate cloud resources, read secrets, or print key values.

Literal route handles for verification:

- `GET /api/ghostclaw/control-plane`
- `POST /api/ghostclaw/control-plane/dispatch/dry-run`

Current registry source paths:

- `.ghostclaw/registry/agent-registry.v1.yaml`
- `.ghostclaw/registry/route-matrix.v1.yaml`

Current highest-priority repo architecture route:

| Route | Task Type | Tier | Primary | Reviewer | Validator |
|-------|-----------|------|---------|----------|-----------|
| `route-repo-arch` | `repo_or_architecture` | C | Codex | OpenCode | Validator |

## All-Route Reference

| # | Task Type | Tier | Primary | Reviewer | Architect | Validator |
|---|-----------|------|---------|----------|-----------|-----------|
| 1 | `project_bootstrap` | B | Hermes | OpenCode | Opus | Validator |
| 2 | `research_reverse_engineering` | A | Researcher | OpenCode | Opus | Validator |
| 3 | `architecture_design` | B | Opus | OpenCode | — | Validator |
| 4 | `spec_writing` | B | Hermes | OpenCode | Opus | Validator |
| 5 | `frontend_ui` | C | Codex | OpenCode | Opus | Validator |
| 6 | `backend_api` | C | Codex | OpenCode | Opus | Validator |
| 7 | `public_site_ui` | C | Codex | OpenCode | Opus | Validator |
| 8 | `dashboard_ui` | C | Codex | OpenCode | Opus | Validator |
| 9 | `documentation` | B | Hermes | OpenCode | — | Validator |
| 10 | `policy_config` | B | Policy Guardian | OpenCode | — | Validator |
| 11 | `queue_operation` | B | Hermes | OpenCode | — | Validator |
| 12 | `code_review` | A | OpenCode | — | — | Validator |
| 13 | `data_migration` | D | Codex | OpenCode | Opus | Validator |
| 14 | `incident_response` | B | Hermes | Policy Guardian | Opus | Validator |

## Emergency Read-Only Procedure

When you need to inspect the system without triggering any mutations:

1. Navigate to `.ghostclaw/registries/` and read the relevant registry files.
2. Read the knowledge vault index but do not retrieve vault files unless necessary.
3. Read queue items from `.ghostclaw_runtime/a2a2a/` for status inspection.
4. Read receipts from `.ghostclaw_runtime/receipts/` for audit.
5. Do NOT create any files, write any leases, or update any queue items.
6. This is a Tier A operation — no lease or receipt required.

## Error Handling

- **Queue item stuck in `pending` for > 1 hour**: Hermes should investigate and either reassign or mark as `blocked`.
- **Lease expired before completion**: Work is invalidated. Agent must re-acquire lease and restart.
- **Receipt missing `validated: true`**: Work is not considered complete. Reviewer must flag and agent must re-validate.
- **Tier violation detected**: Policy Guardian is notified; queue item is marked `blocked`; incident report written to `.ghostclaw_runtime/incidents/`.
