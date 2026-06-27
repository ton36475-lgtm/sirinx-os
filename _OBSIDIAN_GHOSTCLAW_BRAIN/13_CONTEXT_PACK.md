# 13 — Context Pack

**Purpose:** Minimum context every agent MUST load before acting

---

## Mandatory Read (Every Agent, Every Task)

| # | File | Why |
|---|---|---|
| 1 | `_OBSIDIAN_GHOSTCLAW_BRAIN/01_PROJECT_CONTRACT.md` | Know the rules |
| 2 | `_OBSIDIAN_GHOSTCLAW_BRAIN/14_SOURCE_OF_TRUTH.md` | Know canonical sources |
| 3 | `_OBSIDIAN_GHOSTCLAW_BRAIN/16_STATUS_BOARD.md` | Know current state |
| 4 | `_OBSIDIAN_GHOSTCLAW_BRAIN/11_TASK_PRIORITY_MATRIX.md` | Know what's next |
| 5 | Your role's doctrine file (02-06) | Know your boundaries |

## Role-Specific Context

| Role | Additional Reads |
|---|---|
| Hermes | 07_A2A2A, 08_COMMAND_BROKER, 09_MODEL_ROUTING, 10_DEPARTMENT_MAP |
| Opus | 09_MODEL_ROUTING, 18_BUILD_LANES, 14_SOURCE_OF_TRUTH |
| Codex | 18_BUILD_LANES, 19_FIRST_BUILD_PROMPT, GHOSTCLAW/AGENTS.md |
| GLM/DeepSeek | 10_DEPARTMENT_MAP, 18_BUILD_LANES |
| KOB | 08_COMMAND_BROKER, command allowlist |

## Source of Truth Priority

```
1. Current user instruction
2. AGENTS.md (root)
3. GHOSTCLAW/AGENTS.md
4. _OBSIDIAN_GHOSTCLAW_BRAIN/ (this brain)
5. PROJECT_STATE.md
6. Relevant source files
7. GHOSTCLAW/MASTER.md
```

## Context Refresh Rule

If mission runs > 30 minutes, reload STATUS_BOARD before next action.
