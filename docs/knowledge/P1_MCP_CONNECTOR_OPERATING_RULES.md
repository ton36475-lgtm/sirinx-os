# P1 MCP And Connector Operating Rules

Status: completed
Date: 2026-05-16
Runtime impact: none

## Purpose

Define how SIRINX OS uses local MCP servers and Codex connectors without accidentally mutating external systems.

## Action Classes

### Read-Only

Allowed without extra approval when scoped to the task:

- Inspect local files.
- Read public docs.
- Read connector metadata.
- Read GitHub issue or PR metadata.
- Read Supabase schema metadata.
- Read Notion, Google Drive, ClickUp, Figma, or Canva metadata when required for the task.

### Write Or Export

Requires explicit operator approval:

- GitHub issue creation, PR creation, branch push, workflow rerun, or comment.
- Supabase insert, update, delete, migration, storage write, or Auth mutation.
- Notion page/database/task creation or update.
- Google Drive Docs/Sheets/Slides creation, edit, share, move, or delete.
- ClickUp task, doc, status, assignee, or automation changes.
- Figma file edit, design system generation, export, or publish.
- Canva design creation, edit, resize, translate, or export.

### Destructive Or Production-Sensitive

Requires explicit approval and a dedicated safety gate:

- Delete operations.
- Permission or sharing changes.
- Cloud resource mutation.
- Production deployment.
- Customer-facing send.
- Paid API call.
- Database migration.
- Credential, token, key, SSO, MFA, or access policy changes.

## Connector-Specific Defaults

- Browser: local preview and QA only unless approved.
- Chrome: use only when authenticated browser state is required; do not paste secrets into browser flows.
- Computer Use: use for UI actions only when no safer API/tool path exists.
- GitHub: read-only by default; push/PR/issue/comment/workflow rerun requires approval.
- Supabase: read-only by default; writes and migrations require approval.
- Notion: read-only by default; page/database writes require approval.
- Google Drive: read-only by default; create/edit/share/delete requires approval.
- ClickUp: read-only by default; task/doc/workflow changes require approval.
- Figma: read-only by default; edits/exports require approval.
- Canva: read-only by default; edits/exports require approval.
- OpenAI Developers: API key creation and paid usage require explicit approval and secure handling.

## Required Preflight Before Any Connector Write

1. State the connector.
2. State the exact object or project being changed.
3. State the write action.
4. State whether the action is reversible.
5. State whether external users can see the result.
6. State whether paid usage can occur.
7. State whether secrets or private data are involved.
8. Wait for operator approval.

## Required Post-Action Report

```text
Connector:
Action:
Object changed:
External visibility:
Paid usage:
Secrets touched:
Result:
Rollback path:
Evidence:
```

## Daily Connector Usage Summary

```text
Date:
Read-only connector actions:
Write/export actions:
Approvals received:
External visibility:
Paid usage:
Failures:
Risks:
Next approvals needed:
```

## Current Decision

No connector writes, exports, pushes, SaaS mutations, database writes, or deployments are approved by this document. It only defines operating rules.
