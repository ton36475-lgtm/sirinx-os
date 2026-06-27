# 01 — Project Contract

**Version:** 2.0
**Authority:** GHOSTCLAW Hermes Commander A2A2A OS

---

## Project Scope

Build the GHOSTCLAW Hermes Commander A2A2A OS v2.0 — a hierarchical agent operating system where:

- Hermes commands missions
- Opus designs architecture
- Codex builds and integrates
- GLM/DeepSeek write code
- KOB validates
- Obsidian Brain remembers
- A2A2A synchronizes
- Command Broker controls execution
- Mission Control observes

## Hard Constraints

### DO:
- Read repo freely
- Write within assigned lane
- Generate docs and scaffolds
- Create test fixtures
- Run lint, typecheck, unit tests
- Write audit logs
- Write brain updates

### DO NOT:
- Deploy
- Git push (without human approval)
- Git add . (use explicit paths)
- Read .env or secrets
- Sync external connectors
- Install dependencies (without approval)
- Execute risky/destructive commands
- Modify auth, payment, security policy
- Disable logging or audit trail
- Bypass Command Broker
- Skip dependency in task chain
- Retry same error > 2 times

## Safety Inheritance

All rules from root `AGENTS.md` and `GHOSTCLAW/AGENTS.md` apply.

## Autonomy Classification

| Role | Max Level | Scope |
|---|---|---|
| Hermes | A5 | Mission routing, lane assignment |
| Opus | A3 | Architecture design only |
| Codex | A4 | Repo integration, no push |
| GLM/DeepSeek | A3 | Module writing within lane |
| KOB | A2 | Validation only |
| Command Broker | A5 gate | Execute only approved |

## Current Lane

```
LANE_HERMES_COMMANDER_A2A2A_SCAFFOLD
```

**Goal:** Create brain, runtime, protocols. No business logic yet.

## Approval Required For

- Git push → Human
- Git merge → Human
- Deploy → Human
- Cloud mutation → Human
- External API write → Human
- Database migration → Human
- Dependency install → Hermes
- Cross-lane write → Hermes
