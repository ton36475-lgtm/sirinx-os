# 11 — Task Priority Matrix

**Purpose:** Task ordering rules and dependency enforcement

---

## Lane Priority (Fixed Order)

```
LANE_0: HERMES_COMMANDER_A2A2A_SCAFFOLD        ← CURRENT
LANE_1: OPUS_ARCHITECTURE_PACKET
LANE_2: CODEX_BUILD_PLAN_FROM_OPUS
LANE_3: MODEL_ROUTER_DEPARTMENT_WORKERS
LANE_4: COMMAND_BROKER_FINALIZE
LANE_5: A2A2A_TASK_ROUTER
LANE_6: OBSIDIAN_BRAIN_INTEGRITY_CHECK
LANE_7: MISSION_CONTROL_READONLY_UI
LANE_8: DATABASE_INFRASTRUCTURE
LANE_9: FLEET_ORCHESTRATOR
LANE_10: SHIP_PROTOCOL_MESSAGING
LANE_11: COWORKER_MANAGEMENT
LANE_12: WORKFLOW_ENGINE
LANE_13: VAULT_MONITORING
LANE_14: TRPC_ROUTER
LANE_15: E2E_TESTING
LANE_16: DEPLOYMENT_GATE_NO_DEPLOY
```

## Dependency Rules

| Rule | Enforcement |
|---|---|
| No task skips a dependency | Hard block |
| Lane N depends on Lane N-1 completion | Hard block |
| Architecture before build | Hard block (Opus → Codex) |
| Validation before commit | Hard block (KOB → Codex) |
| No parallel writes to same file | Lock |
| No cross-lane writes without routing | Hard block |
| No worker bypasses Codex | Hard block |

## Priority Within a Lane

```
1. Critical (blocking other lanes)
2. High (mission success depends on it)
3. Normal (standard task)
4. Low (nice-to-have, can defer)
```

## Escalation on Blocked Tasks

```
Task blocked > 5 minutes → Notify Hermes
Task blocked > 15 minutes → Notify Operator
Task blocked > 60 minutes → Flag mission at risk
```
