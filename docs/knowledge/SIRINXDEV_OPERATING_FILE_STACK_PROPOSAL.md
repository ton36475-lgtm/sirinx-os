# SIRINXDev Operating File Stack Proposal

Date: 2026-05-20
Status: proposal only; not active canonical policy

## Purpose

This proposal maps the user-provided Unified Project OS file stack into the current `sirinx-os` repository without overwriting the active `AGENTS.md`.

## Active Canonical File

Current canonical protocol:

- `/Users/sirinx/sirinx-os/AGENTS.md`

Any new root-level operating file must be derived from this protocol and reviewed before activation.

## Proposed Root Files

| File | Proposed role | Activation condition |
| --- | --- | --- |
| `PROJECT_STATE.md` | current environment, active services, release status | schema reviewed and Command Center source agreed |
| `NEXT_ACTIONS.md` | strict ordered queue | generated from backlog docs or maintained by operator |
| `RULES_FOR_CODEX.md` | Codex coding/verification rules | no contradiction with `AGENTS.md` |
| `MCP_MAP.md` | local MCP/tool access map | no secrets, no public exposure |
| `SKILLS_REGISTRY.md` | reusable skill registry | verified local skill paths only |
| `TOOLS_REGISTRY.md` | local tools, commands, access levels | each tool has safe/blocked mode |

## Proposed `PROJECT_STATE.md` Schema

```markdown
# PROJECT_STATE

Date:
Repo:
Branch:
Runtime Mode:
Public Website Source:
Control Plane Source:

## Services

| Service | URL/Port | Status | External Writes | Notes |
| --- | --- | --- | --- | --- |

## Current Gates

| Gate | Status | Evidence File | Next Action |
| --- | --- | --- | --- |

## Dirty Worktrees

| Repo | Status | Rule |
| --- | --- | --- |

## Last Verified

- `pnpm verify`:
- `pnpm dashboard:e2e`:
- `pnpm external-gates:check`:
- `pnpm external-gates:evidence-check`:
```

## Proposed `NEXT_ACTIONS.md` Schema

```markdown
# NEXT_ACTIONS

## Immediate

- [ ] Task:
  - Goal:
  - File scope:
  - Verification:
  - Stop rule:

## Scheduled

- [ ] Task:

## Backlog

- [ ] Task:
```

## Proposed `RULES_FOR_CODEX.md` Scope

Include only:

- read `AGENTS.md` first
- inspect before edit
- no deploy/push/cloud mutation without exact approval
- no `.env` reads
- `pnpm verify` and relevant tests required
- use local patterns
- report files/tests/risks

Avoid:

- claims about unverified models
- unconditional “always Rust backend” rules that conflict with existing Node services
- secret-manager instructions without implementation

## Proposed `MCP_MAP.md` Scope

Minimum columns:

| Server | Transport | Purpose | Access | External write policy |
| --- | --- | --- | --- | --- |

Every MCP entry must specify:

- allowed paths/domains
- secret behavior
- destructive action policy
- audit record

## Proposed Registry Rules

Skill/tool registry entries should be factual and testable:

- local path or command exists
- safe check command exists
- external write behavior is known
- owner is assigned
- rollback/disable path exists

