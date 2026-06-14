# Vibe Coding Godmode Continuation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use execution planning, test-driven implementation, systematic debugging, and verification before completion. Do not execute source changes unless the exact approval phrase is present.

Generated: 2026-05-28 02:27 +0700
Status: approval-ready, local-only, not implemented

## Goal

Turn the current SIRINX Godmode/Vibe Coding command surface into a local operator-visible control plane without activating MCP, n8n workflows, providers, external messages, deploys, pushes, or third-party installers.

## Architecture

The safe first source-code slice is a display-only policy surface:

- `docs/integrations/N8N_MCP_PERMISSION_POLICY.md` remains the source policy document.
- Local API reads or references policy status from repo-local data only.
- Local dashboard renders the policy state as `LOCKED / LOCAL-ONLY`.
- External gates remain blocked and visible.
- Validator Shield and secret scan run before completion.

## Tech Stack

- Node.js local API.
- Static dev dashboard.
- pnpm scripts.
- Vitest for API logic.
- Playwright or existing dashboard smoke test for UI.

## Approval Required

No source implementation is allowed until the operator gives:

```text
APPROVE_IMPLEMENTATION for n8n permission policy display
```

## Implementation Tasks After Approval

### Task 1 - Add API Policy Projection

Files:

- `services/dev-control-api/src/*`
- `services/dev-control-api/server.mjs`
- Existing API tests in `services/dev-control-api/src/*test.mjs`

Expected contract:

```json
{
  "id": "n8n-mcp-permission-policy",
  "status": "locked-local-only",
  "mcpRegistered": false,
  "allowedBeforeApproval": [
    "local status checks",
    "capability manifest",
    "docs lookup"
  ],
  "blockedBeforeApproval": [
    "workflow read",
    "workflow write",
    "workflow execute",
    "credential access",
    "Hermes MCP registration"
  ],
  "approvalPhrases": [
    "APPROVE_HERMES_N8N_MCP_REGISTER",
    "APPROVE_N8N_LOCAL_INSTALL"
  ]
}
```

Stop rules:

- Stop if implementation requires n8n credentials.
- Stop if implementation requires live workflow reads.
- Stop if implementation requires Hermes MCP config writes.

### Task 2 - Add Dashboard Display

Files:

- `apps/dev-dashboard/src/app.js`
- `apps/dev-dashboard/src/index.html`
- `apps/dev-dashboard/src/styles.css`
- `tests/browser/dev-dashboard.spec.mjs`

Expected UI:

- A compact panel titled `n8n MCP Policy`.
- A visible `LOCKED / LOCAL-ONLY` status.
- Allowed classes and blocked classes.
- Approval phrases shown as literal text.
- No token, key, URL credential, or workflow credential values.

Stop rules:

- Stop if UI tries to connect to n8n directly.
- Stop if UI tries to activate MCP.
- Stop if UI asks for or stores credentials.

### Task 3 - Verification

Commands:

```bash
pnpm audit:secrets
git diff --check
pnpm check
pnpm verify
pnpm verify:workspace
```

Optional targeted commands if existing scripts expose them:

```bash
pnpm n8n-policy:test
pnpm dashboard:test
```

Expected result:

- Secret scan passes.
- Diff whitespace check passes.
- Unit tests pass.
- Workspace verification passes.
- Dashboard/API display remains local-only and blocked for execution.

## Rollback Plan

Because this is display-only, rollback is limited to the files changed in Tasks 1 and 2. Do not revert unrelated user changes in the same files; instead create a narrow patch or ask for operator direction if unrelated edits conflict.

## Reporter Handoff

Final output must include:

- Summary.
- Changed files.
- Commands run.
- Verification.
- Risk.
- Approval needed.
- Next action.

