# OpenSpec Workflow Review Runbook

Applies to `Fission-AI/OpenSpec`-style spec-first workflows.

## Workflow

1. Explore current repo state.
2. Write proposal before implementation.
3. Convert proposal into scoped spec.
4. Generate task list from the approved spec.
5. Apply only under file lease.
6. Validate and write receipt.

## Controls

- GhostClaw policy overrides generated specs.
- No install or template import by default.
- No source mutation before approval and lease.
- Keep specs concise and packet-scoped.
