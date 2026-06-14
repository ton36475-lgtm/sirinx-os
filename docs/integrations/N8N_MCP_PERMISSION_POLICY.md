# n8n MCP Permission Policy

Generated: 2026-05-28 02:14 +0700
Status: draft-only, local-only, not registered
Owner: Hermes Runtime Gatekeeper

## Decision

Do not register n8n or n8n-mcp into Hermes yet.

The only currently approved activity is local documentation and capability planning. The system may record
non-secret local reachability and command metadata, but it must not read workflows, read credentials, execute
workflows, mutate workflows, install packages, or activate an MCP server.

## Source Signals

- Official n8n docs state that instance-level MCP access can search workflows, interact with MCP-enabled workflows, trigger/test exposed workflows, and create/edit workflows.
- Official n8n docs distinguish instance-level MCP access from an MCP Server Trigger node; the trigger-node pattern can expose tools only from one workflow.
- Official MCP Tools specification defines `tools/list`, `tools/call`, input schemas, output schemas, structured content, and tool annotations; tool annotations must not be trusted unless the server is trusted.
- The `czlonkowski/n8n-mcp` README describes n8n-MCP as a documentation/node-knowledge bridge and warns not to edit production workflows directly with AI.

## Current Local Discovery

| Item | Status |
| --- | --- |
| `http://127.0.0.1:5678` | reachable |
| `http://127.0.0.1:5678/healthz` | returns `{"status":"ok"}` |
| `n8n` host CLI | missing |
| `n8n-mcp` command | `/opt/homebrew/bin/n8n-mcp` |
| `n8n-mcp` Homebrew path | `/opt/homebrew/Cellar/n8n-mcp/2.56.0/bin/n8n-mcp` |
| Hermes registration | not approved, not performed |
| Credentials/API keys | not read, not written |

## Capability Classes

### Class D0 - Allowed Now: Local Evidence Only

These actions do not require MCP registration and remain safe:

- Check `command -v n8n`.
- Check `command -v n8n-mcp`.
- Check localhost status with `curl -fsSI http://127.0.0.1:5678`.
- Check localhost health with `curl -fsS http://127.0.0.1:5678/healthz`.
- Inspect binary path metadata with `ls`, `file`, and `readlink`.
- Write local reports under `.hermes/reports/` and docs under `docs/`.

### Class D1 - Candidate Future Allow: Documentation Lookup Only

This class may be allowed only after explicit approval to register a read-only MCP surface.

Candidate tool intent:

| Tool intent | Proposed status | Required constraints |
| --- | --- | --- |
| MCP tool documentation lookup | Candidate allow | read-only, no workflow access, no credentials |
| n8n node search | Candidate allow | docs/index only, no live workflow list |
| n8n node info/docs | Candidate allow | static node metadata only |
| n8n operation/property schemas | Candidate allow | schema/documentation only |
| examples/templates lookup | Candidate allow | public/static examples only; no local workflow data |

If implemented later, every allowed tool must be explicitly named in a manifest and marked:

```json
{
  "readOnlyHint": true,
  "destructiveHint": false,
  "idempotentHint": true,
  "openWorldHint": false
}
```

The annotations are policy hints only. They do not replace a trusted local allowlist.

### Class D2 - Blocked Until Separate Workflow-Read Approval

These actions may expose private automation metadata and remain blocked:

- List local workflows.
- Read workflow definitions.
- Read execution history.
- Read workflow variables.
- Read data tables.
- Read tags, projects, users, credentials references, or endpoint URLs.
- Fetch workflow JSON from n8n API.

### Class D3 - Blocked Until Separate Mutation Approval

These actions can change behavior or trigger side effects and remain blocked:

- Create workflows.
- Edit/update workflows.
- Delete workflows.
- Enable/disable workflows.
- Execute workflows.
- Test exposed workflows.
- Trigger webhooks.
- Create/edit/delete credentials.
- Change workflow access or MCP exposure settings.

### Class D4 - Blocked Always For Chat/Reports

These must never be printed or written into chat/reports:

- n8n API keys.
- MCP bearer tokens.
- Webhook secrets.
- Credential values.
- OAuth refresh/access tokens.
- Passwords.
- `.env` values.
- Customer-private workflow payloads.

## Required Approval Phrases

| Action | Required phrase |
| --- | --- |
| Install or replace n8n | `APPROVE_N8N_LOCAL_INSTALL` |
| Register n8n-mcp into Hermes | `APPROVE_HERMES_N8N_MCP_REGISTER` |
| Read a workflow definition | `APPROVE_N8N_WORKFLOW_READ:<workflow-id-or-name>` |
| Create/update workflow draft | `APPROVE_N8N_WORKFLOW_DRAFT:<workflow-id-or-name>` |
| Execute/test workflow | `APPROVE_N8N_WORKFLOW_EXECUTE:<workflow-id-or-name>` |
| Send or trigger any external message/API | gate-specific approval from external gate ledger |

An approval phrase must be paired with a named target and a rollback/stop rule.

## Registration Preconditions

Before any Hermes MCP registration:

1. `docs/integrations/N8N_MCP_PERMISSION_POLICY.md` reviewed.
2. `.hermes/reports/N8N_CAPABILITY_MANIFEST_2026-05-28.md` reviewed.
3. Exact tool allowlist written.
4. Credentials storage path approved, if credentials are needed.
5. No credential value appears in chat, docs, reports, git diff, or Obsidian.
6. Validator Shield passes.
7. `pnpm audit:secrets` passes.
8. External gate ledger still reports no unintended executable gate.

## Proposed Read-Only Manifest Shape

This is a draft manifest shape only; it is not an active Hermes config.

```json
{
  "id": "n8n-mcp-docs-readonly",
  "status": "draft",
  "transport": "blocked-until-approved",
  "scope": "n8n documentation and node metadata only",
  "allowed_tool_intents": [
    "tools_documentation",
    "search_nodes",
    "get_node_info",
    "get_node_docs",
    "get_operation_schema"
  ],
  "blocked_tool_intents": [
    "list_workflows",
    "read_workflow",
    "create_workflow",
    "update_workflow",
    "delete_workflow",
    "execute_workflow",
    "read_credentials",
    "write_credentials",
    "trigger_webhook"
  ],
  "secrets_policy": "never-print-never-commit-local-secret-file-only",
  "external_writes": false,
  "production_writes": false,
  "customer_visible": false
}
```

## Verification Commands

Safe commands:

```bash
pnpm audit:secrets
pnpm external-gates:evidence-check
git diff --check
```

Blocked commands without approval:

```bash
hermes mcp add ...
hermes config set ...n8n...
n8n
npx n8n
npm install -g n8n
curl .../api/v1/workflows...
curl .../webhook...
```

## Next Action

Keep this policy in draft state. The next safe action is either:

1. Fill one external gate evidence file with operator-provided non-secret facts; or
2. Request exact approval to implement a local API/dashboard view that displays this policy without activating MCP.

