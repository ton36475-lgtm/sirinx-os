# SIRINX Subagent All-Node Runtime Config - 2026-05-28

Generated: 2026-05-28 02:34 +0700
Status: draft-only, not dispatched

## Purpose

Define every SIRINX agent node, skill binding, trigger, input, output, permission class, and stop condition for Hermes-driven work.

This is a configuration document only. It does not start agents, register MCP, call providers, install packages, send messages, deploy, push, or publish.

## Permission Classes

| Class | Meaning | Allowed now |
| --- | --- | --- |
| A0 | Read current repo docs and state | yes |
| A1 | Run local read-only status checks | yes |
| A2 | Write docs, reports, `.hermes/context.md`, `.hermes/state.json`, Obsidian notes | yes |
| A3 | Produce implementation packets and dry-run plans | yes |
| A4 | Modify source code for a named target | only after `APPROVE_IMPLEMENTATION for <target>` |
| A5 | Install, clone, register MCP, call provider, send, deploy, push, publish | no; exact gate-specific approval required |

## Node Registry

| Node | Lane | Trigger | Inputs | Outputs | Permission max now | Stop condition |
| --- | --- | --- | --- | --- | --- | --- |
| `hermes-orchestrator` | control | every operator command | prompt, state, reports | route decision, stop point | A3 | any A4/A5 request without exact approval |
| `policy-gate` | control | before any action | command, risk map | allow/block decision | A3 | ambiguous approval |
| `approval-gate` | control | before A4/A5 | approval phrase, target | approved target scope | A3 | missing exact target |
| `context-manager` | control | state drift | `.hermes/context.md`, `.hermes/state.json` | updated state | A2 | source edit required |
| `planner-node` | planning | broad goal | context, package scripts, reports | phase plan | A3 | implementation required |
| `grill-node` | planning | missing requirements | goal, blockers | acceptance criteria | A2 | user-only evidence needed |
| `spec-writer` | planning | approved spec need | docs 01-05, reports | requirements/spec/QA | A3 | code edit required |
| `environment-scanner` | runtime | status request | package scripts, ports, git | status evidence | A1 | install/start/restart required |
| `vibe-coding-agent` | build-planning | implementation request | spec, state, scripts | implementation card | A3 | source code edit required |
| `coder-agent` | build | exact implementation approval | implementation card | source patch | A4 only after approval | approval missing |
| `qa-guardrail` | verification | before success claim | tests, diff, reports | verification evidence | A2 | failing check |
| `validator-shield` | security | generated code or command packet | file paths | pass/fail findings | A2 | secret or dangerous pattern |
| `security-reviewer` | security | high-risk change | diff, policies, gates | risk review | A2 | credential/external mutation |
| `browser-qa` | verification | dashboard/UI change | localhost URL | screenshot/check result | A2 | authenticated/public external action |
| `runtime-devops` | runtime | service issue | ports, scripts, logs | local status/runbook | A2 | restart/install/gateway mutation |
| `n8n-workflow-architect` | workflow | n8n task | n8n policy docs | workflow draft/policy | A3 | workflow read/write/execute |
| `repo-intake-agent` | security | third-party repo candidate | URL, metadata | intake packet | A3 | clone/install/run |
| `knowledge-curator` | knowledge | decision/work update | reports, docs | Obsidian/digest note | A2 | raw chat/secrets |
| `reporter-node` | knowledge | end of work pass | changes, commands, checks | final report | A2 | unverified success claim |

## Skill Binding Matrix

| Work type | Primary skill | Secondary checks |
| --- | --- | --- |
| SIRINX source/runtime planning | `sirinx-spec-first-swarm` | `.hermes/context.md`, `.hermes/state.json` |
| Hermes project planning | `hermes-project-planning` | package scripts, dashboard/API status |
| Multi-step implementation plan | `writing-plans` | exact files, tests, stop rules |
| Completion claim | `verification-before-completion` | fresh command evidence |
| Local dashboard/browser QA | `website-browser-automation` or Browser plugin | localhost only |
| MCP design | `mcp-builder` | manifest plus permission mapping |
| Runtime start/debug | `start-run-debug` | no install/restart without approval |

## Routing Rules

1. Commands that inspect local state route to `environment-scanner`.
2. Commands that ask for "all old work" route to `planner-node`, `context-manager`, and `knowledge-curator`.
3. Commands that ask for coding route to `vibe-coding-agent` first.
4. Commands that include exact `APPROVE_IMPLEMENTATION for <target>` may route to `coder-agent`.
5. Commands that involve n8n route to `n8n-workflow-architect` and `policy-gate`.
6. Commands that involve external systems route to `external evidence gates` and stop unless evidence is ready.
7. Completion claims route to `qa-guardrail` and `reporter-node`.

## Required Verification Bundles

### Docs-only pass

```bash
git diff --check
pnpm audit:secrets
pnpm check
```

### Source implementation pass

```bash
pnpm audit:secrets
git diff --check
pnpm check
pnpm verify
pnpm verify:workspace
```

### External gate pass

```bash
pnpm external-gates:evidence-check
pnpm external-gates:runner
pnpm external-gates:check
```

## First Runnable Source Target After Approval

```text
APPROVE_IMPLEMENTATION for n8n permission policy display
```

Expected route:

1. `approval-gate`
2. `vibe-coding-agent`
3. `coder-agent`
4. `validator-shield`
5. `qa-guardrail`
6. `browser-qa`
7. `reporter-node`

Blocked even after this approval:

- MCP registration.
- n8n workflow read/write/execute.
- n8n credential access.
- external sends.
- deploy/push/publish.

