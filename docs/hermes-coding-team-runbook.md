# Hermes Coding Team Runbook

This runbook is the start-and-run setup for the SIRINX OS Hermes Developer Command Center.

## Local Dashboard

```bash
pnpm dashboard:run
pnpm dashboard:status
open http://127.0.0.1:8710
```

Stop it with:

```bash
pnpm dashboard:stop
```

The stack runs in local `tmux` sessions:

- `sirinx-dev-control-api`
- `sirinx-dev-dashboard`

Logs live in:

- `ops/logs/dev-control-api.log`
- `ops/logs/dev-dashboard.log`

## Verification

```bash
pnpm verify
pnpm dashboard:e2e
```

Browser automation covers:

- Dashboard load
- API online state
- Release gate rendering
- Dry-run action event logging
- Desktop Chromium
- Mobile Chrome layout
- Console error checks

## VS Code

Open the project:

```bash
code /Users/sirinx/sirinx-os
```

Installed/recommended extensions:

- `Anthropic.claude-code`
- `ms-playwright.playwright`

Useful tasks from `Terminal > Run Task...`:

- `Hermes: Start Dashboard`
- `Hermes: Stop Dashboard`
- `Hermes: Dashboard Status`
- `Hermes: Verify`
- `Hermes: Browser Automation`
- `Hermes: Open Dashboard`

## Claude Code Roles

Project-local agents live in `.claude/agents/`.

- `hermes-project-planner`
- `hermes-frontend-builder`
- `hermes-backend-integrator`
- `hermes-browser-automator`
- `hermes-devops-runner`
- `hermes-code-reviewer`

Project-local skills live in `.claude/skills/`.

- `hermes-project-planning`
- `website-browser-automation`
- `start-run-debug`
- `agent-team-orchestration`

## Agent Team Prompt

Use this inside Claude Code when you want the full team:

```text
Create an agent team for the SIRINX OS Hermes dashboard.
Use these teammate roles:
- planner using hermes-project-planner
- frontend using hermes-frontend-builder
- backend using hermes-backend-integrator
- browser using hermes-browser-automator
- devops using hermes-devops-runner
- reviewer using hermes-code-reviewer

First inspect AGENTS.md, CLAUDE.md, package.json, apps/dev-dashboard, services/dev-control-api, and tests/browser.
Create a shared task list.
Require plan approval before implementation.
Keep each teammate in a separate ownership area.
Verify with pnpm verify and pnpm dashboard:e2e.
Do not deploy, push, mutate cloud resources, send customer messages, or touch real secrets.
```

## Safety

This dashboard is local-only and dry-run by default.

Never do these without explicit human approval:

- Deploy
- Push Git changes
- Mutate cloud resources
- Send customer messages
- Trigger paid APIs
- Expose local AI services publicly
- Read, print, copy, or upload real secrets
