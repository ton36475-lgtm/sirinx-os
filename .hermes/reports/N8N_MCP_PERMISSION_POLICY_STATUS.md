# n8n MCP Permission Policy Status

Generated: 2026-05-28 02:14 +0700
Status: draft-only, local-only

## Files

- Policy: `docs/integrations/N8N_MCP_PERMISSION_POLICY.md`
- Capability manifest: `.hermes/reports/N8N_CAPABILITY_MANIFEST_2026-05-28.md`
- n8n status: `.hermes/reports/N8N_MCP_STATUS.md`

## Current Decision

Do not register n8n-mcp into Hermes yet.

Allowed now:

- Local reachability checks.
- Command path checks.
- Docs-only policy drafting.
- Secret scan and diff checks.

Blocked:

- Install n8n.
- Start or register MCP.
- Read workflows.
- Read credentials.
- Execute workflows.
- Mutate workflows.
- Send external messages.

## Approval Required

- `APPROVE_HERMES_N8N_MCP_REGISTER` for any Hermes MCP registration.
- `APPROVE_N8N_LOCAL_INSTALL` for any n8n install/change.
- Specific workflow approval phrases for workflow read/write/execute.

## Verification

Final verification in current turn:

- `node -e "JSON.parse(require('fs').readFileSync('.hermes/state.json','utf8'))"`: passed
- `git diff --check`: passed
- `pnpm audit:secrets`: passed, no findings
- `pnpm external-gates:evidence-check`: passed as local evidence check; status remains `blocked-evidence-incomplete`
