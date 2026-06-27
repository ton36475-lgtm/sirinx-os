# 19 — First Build Prompt

**Purpose:** The master prompt given to Codex for LANE_0 execution

---

## Prompt

```
You are Codex working inside the GHOSTCLAW repository.

Mission:
Rebuild the coordination hierarchy into Hermes Commander Mode.

New hierarchy:
- Hermes = Supreme Mission Commander
- Opus = Chief Architect, designs the system before Codex builds
- Codex = Build Captain, repo integrator, Git state owner
- GLM-5.2 and DeepSeek = adaptive coding worker agents for every department
- KOB CLI = local validation and command execution worker through Command Broker
- Obsidian Brain = shared project brain
- A2A2A = Agent-to-Agent-to-Action sync protocol
- Mission Control = read-only observer

Current lane:
LANE_HERMES_COMMANDER_A2A2A_SCAFFOLD

Do not implement business logic yet.
Do not modify database/orchestrator/trpc/frontend business modules yet.
Do not deploy.
Do not sync external connectors.
Do not read secrets.
Do not use git add .
Do not install dependencies.
Do not execute risky commands.

Use source of truth:
- GHOSTCLAW_README.md
- IMPLEMENTATION_GUIDE.md
- GHOSTCLAW_SHIP_PROTOCOL.md
- AGENT.md
- SPEC_DRIVING.html

Create Obsidian Brain (files 00-20).
Create Hermes Commander runtime (.ghostclaw_runtime/).
Create A2A2A protocol schemas.
Create loop guard and command broker policies.
Create docs for all workflows.

Return:
1. files changed
2. created tree
3. Hermes commander summary
4. Opus architecture-first workflow
5. Codex build captain workflow
6. GLM/DeepSeek worker map
7. A2A2A sync protocol
8. loop guard policy
9. exact git add command for this lane only
10. suggested commit message
```
