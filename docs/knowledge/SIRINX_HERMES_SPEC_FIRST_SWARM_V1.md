# SIRINX Hermes Spec-First Swarm v1

Date: 2026-05-27
Status: live local project-state standard

## Purpose
Hermes Spec-First Swarm turns future AI work into a controlled engineering flow:

```text
Prompt -> Requirement -> Context Memory -> Spec -> Approval -> Code -> Test -> Report
```

It explicitly rejects direct prompt-to-code execution.

## Live State
- `.hermes/context.md`
- `.hermes/state.json`
- `.hermes/agent-roles.md`
- `.hermes/approval-log.md`
- `.hermes/decision-log.md`
- `.hermes/risk-register.md`

## Workflow Docs
- `docs/00-project-brief.md`
- `docs/01-requirements.md`
- `docs/02-design-direction.md`
- `docs/03-technical-spec.md`
- `docs/04-implementation-plan.md`
- `docs/05-qa-checklist.md`
- `docs/06-release-report.md`

## API

```text
GET /api/hermes-spec-first-swarm
POST /api/hermes-spec-first-swarm/plan/dry-run
```

Both routes are local-only. They do not modify source, install packages, start MCP, call providers, send messages, deploy, push, or publish.

## Approval

```text
APPROVE_IMPLEMENTATION
```

This phrase is required before future source-code implementation work starts.

## Stop Point

```text
HERMES SPEC-FIRST SWARM READY - LIVE LOCAL STATE - WAITING FOR APPROVE_IMPLEMENTATION
```
