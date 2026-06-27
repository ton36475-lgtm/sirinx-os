# 18 — Build Lanes

**Purpose:** Lane definitions with file scopes and dependencies

---

## Lane Definitions

### LANE_0: HERMES_COMMANDER_A2A2A_SCAFFOLD ← CURRENT
```
Scope:
  - _OBSIDIAN_GHOSTCLAW_BRAIN/**
  - .ghostclaw_runtime/**
  - docs/HERMES_COMMANDER_A2A2A_SYSTEM.md
  - docs/OPUS_ARCHITECTURE_FIRST_WORKFLOW.md
  - docs/CODEX_BUILD_CAPTAIN_WORKFLOW.md
  - docs/GLM_DEEPSEEK_DEPARTMENT_WORKERS.md
  - docs/A2A2A_SYNC_PROTOCOL.md
  - docs/NO_LOOP_NO_SKIP_POLICY.md
  - docs/OBSIDIAN_BRAIN_SYNC_GUIDE.md

Forbidden:
  - No business logic
  - No database changes
  - No deploy
  - No external sync
```

### LANE_1: OPUS_ARCHITECTURE_PACKET
```
Depends on: LANE_0
Assignee: Opus
Scope: Architecture design only
Output: architecture packet → Hermes
```

### LANE_2: CODEX_BUILD_PLAN_FROM_OPUS
```
Depends on: LANE_1
Assignee: Codex
Scope: Build plan from architecture
Output: build plan + scaffold
```

### LANE_3: MODEL_ROUTER_DEPARTMENT_WORKERS
```
Depends on: LANE_2
Assignee: Codex
Scope: Model registry + department worker config
```

### LANE_4: COMMAND_BROKER_FINALIZE
```
Depends on: LANE_3
Assignee: Codex
Scope: Command broker policies + standing approval
```

### LANE_5: A2A2A_TASK_ROUTER
```
Depends on: LANE_4
Assignee: Codex
Scope: A2A2A message routing + task state machine
```

### LANE_6: OBSIDIAN_BRAIN_INTEGRITY_CHECK
```
Depends on: LANE_5
Assignee: Hermes
Scope: Verify all brain files, runtime state, consistency
```

### LANES 7–16
```
Depends on sequential completion
Details in GHOSTCLAW/FLEET_ORCHESTRATOR.md
```

---

## Lane Rules

```
1. No task skips a dependency
2. Architecture before build (Opus → Codex)
3. Validation before commit (KOB → Codex)
4. No parallel writes to same file
5. Lane N starts only after Lane N-1 COMPLETED
```
