# Requirements

## Functional Requirements
- Maintain live `.hermes` state files for project context, state, roles, approvals, decisions, and risks.
- Maintain workflow documents from project brief through release report.
- Expose local-only status and dry-run planning through the dev control API.
- Display current phase, approval phrase, state files, roles, blocked actions, and stop point in the dashboard.
- Keep all execution capabilities disabled until a future explicit approval lane.

## Guardrail Requirements
- Do not deploy, push, publish, install packages, call providers, start MCP, activate connectors, send messages, read secrets, or auto-start agents.
- Dry-run APIs must return JSON only.
- Invalid dry-run JSON must fail closed.

## Success Criteria
- `pnpm spec-first-swarm:test` passes.
- Dashboard e2e verifies the panel and no executable buttons.
- Workspace verification includes the new module, docs, and secret scan roots.
