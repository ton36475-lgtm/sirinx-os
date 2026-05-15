---
name: agent-team-orchestration
description: Launch a Claude Code team for larger SIRINX OS Hermes dashboard projects. Use manually when the user explicitly asks for a team or parallel agents.
disable-model-invocation: true
---

# Agent Team Orchestration

Use only when the user explicitly asks for a team or parallel work.

Recommended prompt:

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
