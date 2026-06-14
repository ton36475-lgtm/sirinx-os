# Gateway Agent Part 18: Hermes Spec-First Swarm

Hermes Spec-First Swarm is the live local project-state standard above future implementation work. It requires context, state, spec, environment scan, approval, smoke tests, QA, and release reporting before completion can be claimed.

## Local API

```text
GET /api/hermes-spec-first-swarm
POST /api/hermes-spec-first-swarm/plan/dry-run
```

## Source Of Truth
- `.hermes/context.md`
- `.hermes/state.json`
- `docs/03-technical-spec.md`
- `docs/05-qa-checklist.md`

## Blocked Without Approval
- source modification
- package install
- deploy, push, publish
- real MCP execution
- connector activation
- paid API call
- secret read or print
- message send
- agent auto-start

## Approval Phrase

```text
APPROVE_IMPLEMENTATION
```

## Verification

```bash
pnpm spec-first-swarm:test
pnpm dashboard:e2e
pnpm audit:secrets
```
