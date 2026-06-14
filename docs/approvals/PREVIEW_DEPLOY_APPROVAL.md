# Preview Deploy Approval

Status: pending approval.

## Scope

Approve only deployment of a non-production preview for SIRINXDev review.

## Required Evidence Before Approval

- `pnpm verify:workspace`
- `pnpm audit:secrets`
- `pnpm check`
- `pnpm run demo`
- Environment preflight showing preview resources only, with names but no secret values.

## Blocked Until Approved

- Production deploy.
- Production database, queue, AI Gateway, or worker bindings.
- Public campaign publish.

## Approval Phrase

```text
Approve Part 8 preview deploy only.
```
