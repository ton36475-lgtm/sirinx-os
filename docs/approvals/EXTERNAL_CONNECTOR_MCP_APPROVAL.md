# External Connector / MCP Activation Approval

Status: pending approval.

## Scope

Approve activation of a named external connector, MCP server, or SaaS integration.

## Required Evidence Before Approval

- Connector name and purpose.
- Required scopes.
- Data classes accessed.
- Secret storage plan.
- Rate-limit and cost policy.
- Rollback plan.

## Blocked Until Approved

- Real MCP execution.
- SaaS writes.
- Production tokens.
- External API mutation.
- Broad connector activation without named scope.

## Approval Phrase

```text
Approve Part 8 external connector activation for <connector-name> only.
```
