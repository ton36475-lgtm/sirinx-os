# GHOSTCLAW Obsidian Brain — Master Index

**Version:** 2.0
**Authority:** Hermes Commander A2A2A OS
**Last Updated:** 2026-06-27

---

## Brain Architecture

This is the **shared project brain** for GHOSTCLAW Hermes Commander A2A2A OS v2.0.
Every agent reads from this brain before acting. Every agent writes decisions back to this brain after acting.

## File Map

| # | File | Purpose | Owner |
|---|---|---|---|
| 00 | INDEX.md | This index | Hermes |
| 01 | PROJECT_CONTRACT.md | Scope, constraints, safety rules | Hermes |
| 02 | HERMES_COMMANDER_DOCTRINE.md | Hermes role, authority, boundaries | Hermes |
| 03 | OPUS_ARCHITECTURE_DOCTRINE.md | Opus role, design process, outputs | Opus |
| 04 | CODEX_BUILD_CAPTAIN.md | Codex role, repo integration, git rules | Codex |
| 05 | GLM_DEEPSEEK_WORKER_DOCTRINE.md | Worker agents, lane scoping, outputs | GLM/DeepSeek |
| 06 | KOB_VALIDATOR_DOCTRINE.md | KOB validation, allowlist, command rules | KOB |
| 07 | A2A2A_SYNC_PROTOCOL.md | Agent→Agent→Action protocol | Hermes |
| 08 | COMMAND_BROKER_POLICY.md | Command tiers, approval gates | Broker |
| 09 | MODEL_ROUTING_MATRIX.md | Which model for which task | Hermes |
| 10 | DEPARTMENT_WORKER_MAP.md | Workers mapped to 5 departments | Hermes |
| 11 | TASK_PRIORITY_MATRIX.md | Task ordering and dependency rules | Hermes |
| 12 | LOOP_GUARD_AND_RECOVERY.md | Anti-loop rules, circuit breaker | Hermes |
| 13 | CONTEXT_PACK.md | What every agent must load before acting | Hermes |
| 14 | SOURCE_OF_TRUTH.md | Canonical source files and priority | Hermes |
| 15 | DECISION_LOG.md | Record of all architectural decisions | All |
| 16 | STATUS_BOARD.md | Current mission/lane/task status | Hermes |
| 17 | ACCEPTANCE_CRITERIA.md | What "done" means per lane | Hermes |
| 18 | BUILD_LANES.md | Lane definitions and ordering | Hermes |
| 19 | FIRST_BUILD_PROMPT.md | The master prompt for Codex | Hermes |
| 20 | RUNTIME_HANDOFF.md | How agents hand off between lanes | Hermes |

## Reading Order for New Agents

1. `01_PROJECT_CONTRACT.md` — know the rules
2. `13_CONTEXT_PACK.md` — load context
3. Your role's doctrine file (02-06)
4. `07_A2A2A_SYNC_PROTOCOL.md` — how to communicate
5. `11_TASK_PRIORITY_MATRIX.md` — what to work on
6. `16_STATUS_BOARD.md` — current state

## Brain Sync Rule

Every agent MUST:
- Read Brain before acting
- Write Brain after completing a lane
- Update STATUS_BOARD after state change
- Log decisions to DECISION_LOG
