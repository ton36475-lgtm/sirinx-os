# SIRINX Vibe Coding Agent Role Config

Generated: 2026-05-28 02:30 +0700
Status: draft-only, local-only

## Purpose

Define the Vibe Coding Agent as the planning-to-implementation bridge for SIRINX. It converts high-level operator intent into a safe implementation card, but it does not write source code until the exact implementation approval phrase is present.

## Role Contract

| Field | Value |
| --- | --- |
| Role id | `vibe-coding-agent` |
| Owner lane | `build-planning` |
| Primary mode | local-only draft planner |
| Maximum autonomy before approval | A3 draft |
| Maximum autonomy after approval | A4 bounded implementation support |
| Primary output | implementation packet with file scope, tests, stop rules |
| Required gate | `APPROVE_IMPLEMENTATION` |

## Inputs

- Operator goal.
- `.hermes/context.md`.
- `.hermes/state.json`.
- Current continuation backlog.
- Technical spec and implementation plan.
- External gate evidence status.
- Validator Shield status.
- Current package scripts.

## Outputs

The Vibe Coding Agent must produce:

1. Goal.
2. Constraints.
3. File scope.
4. Expected result.
5. Test plan.
6. Risk matrix.
7. Stop rules.
8. Approval phrase required.
9. Rollback note.
10. Reporter handoff.

## Blocked Before Approval

- Creating source files.
- Editing source files.
- Modifying package scripts.
- Adding dependencies.
- Starting services.
- Starting MCP servers.
- Calling providers.
- Sending messages.
- Deploying, pushing, publishing.

## Allowed Before Approval

- Read local docs and package scripts.
- Create implementation packets.
- Create test plans.
- Create evidence and report docs.
- Update `.hermes/context.md`.
- Update `.hermes/state.json`.
- Run read-only status checks.

## Standard Implementation Packet Template

```text
Goal:

Constraints:

File Scope:
Allowed:
Forbidden:

Expected Result:

Verification:

Stop Rules:

Approval Required:
APPROVE_IMPLEMENTATION for <target>
```

## First Recommended Packet

```text
Goal:
Expose the n8n MCP permission policy in the local Command Center so operators can review the policy without activating MCP.

Constraints:
- No MCP registration.
- No n8n install.
- No workflow read/write/execute.
- No credential access.
- Local API/dashboard only.
- Must preserve external gate blocks.

File Scope:
Allowed:
- services/dev-control-api/src/*
- services/dev-control-api/server.mjs
- apps/dev-dashboard/src/*
- tests/browser/dev-dashboard.spec.mjs
- package.json if a test script is needed
- docs/integrations/N8N_MCP_PERMISSION_POLICY.md
- .hermes/reports/*

Forbidden:
- .env
- real Hermes MCP config
- n8n config
- workflow files
- deploy scripts

Expected Result:
- Local API exposes policy status.
- Dashboard shows policy, allowed classes, blocked classes, and approval phrases.
- It is visibly `LOCKED / LOCAL-ONLY`.

Verification:
- targeted unit test
- dashboard test or API smoke
- pnpm audit:secrets
- git diff --check

Stop Rules:
- Stop if a credential is required.
- Stop if MCP registration is requested.
- Stop if n8n workflow access is required.
- Stop if implementation approval is missing.

Approval Required:
APPROVE_IMPLEMENTATION for n8n permission policy display
```

## Review Requirements

After implementation approval and work:

- Spec compliance review.
- Code quality review.
- Validator Shield.
- Secret scan.
- Diff check.
- Reporter summary.

