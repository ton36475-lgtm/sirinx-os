# Claude Code Context: SIRINX OS Hermes Dashboard

Follow `AGENTS.md` as the canonical operating protocol for this repository.

## Default Workflow

Use:

```text
Inspect -> Plan -> Implement -> Verify -> Report -> Commit Ready
```

Do not deploy, push, mutate cloud resources, send customer messages, expose local AI services publicly, or change real secrets without explicit human approval.

## Hermes Dashboard Targets

- Dashboard app: `apps/dev-dashboard`
- Control API: `services/dev-control-api`
- Dashboard URL: `http://127.0.0.1:8710`
- API health: `http://127.0.0.1:8711/health`

## Start And Verify

```bash
pnpm dashboard:run
pnpm dashboard:status
pnpm dashboard:e2e
pnpm dashboard:stop
```

Detailed runbook: `docs/hermes-coding-team-runbook.md`.

## Recommended Agent Roles

Use these personal Claude Code subagents when helpful:

- `hermes-project-planner`
- `hermes-frontend-builder`
- `hermes-backend-integrator`
- `hermes-browser-automator`
- `hermes-devops-runner`
- `hermes-code-reviewer`

For bigger work, create an agent team with planner, frontend, backend, browser, devops, and reviewer teammates. Require plan approval before implementation and split work by file ownership.
