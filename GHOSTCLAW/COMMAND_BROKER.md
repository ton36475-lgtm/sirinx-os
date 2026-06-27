# Command Broker Policy

**Part of:** GHOSTCLAW Hermes Commander A2A2A OS v2.0
**Authority:** A5 gate (executes only approved commands)
**Status:** ACTIVE

---

## 1. Purpose

Command Broker is the **final execution gate** in the A2A2A chain. It sits between KOB Validator and Mission Control, ensuring that no command reaches the system without passing all safety checks.

---

## 2. Command Classification

### 2.1 Tier 0 — Always Allowed (no approval)

```yaml
T0_commands:
  - file_read
  - git_status
  - git_diff
  - git_log
  - brain_query
  - kms_read
  - agent_status
  - mission_status
```

### 2.2 Tier 1 — Allowed Within Lane (no approval, scoped)

```yaml
T1_commands:
  - file_write          # within assigned lane only
  - file_delete         # within assigned lane only
  - git_add             # within assigned lane only
  - test_run            # any lane
  - lint_run            # any lane
  - typecheck_run       # any lane
  - build_run           # within assigned lane
  - brain_write         # Scribe role only
  - kms_write           # Brain Curator only
```

### 2.3 Tier 2 — Requires Hermes Approval

```yaml
T2_commands:
  - git_commit
  - git_branch_create
  - git_stash
  - file_move            # cross-lane
  - cross_lane_write
  - dependency_install
  - new_file_outside_lane
```

### 2.4 Tier 3 — Requires Human Approval

```yaml
T3_commands:
  - git_push
  - git_merge
  - git_rebase
  - deploy
  - cloud_mutation
  - external_api_write
  - customer_message_send
  - paid_api_call
  - package_publish
  - database_migration
  - env_read
  - secret_access
```

### 2.5 Tier 4 — Prohibited (never allowed)

```yaml
T4_commands:
  - rm_rf_outside_workspace
  - sudo
  - system_shutdown
  - network_scan_external
  - credential_extraction
  - bypass_approval
  - raw_shell_unrestricted
```

---

## 3. Command Execution Flow

```
KOB Validator
      │
      │ proposed command
      ▼
┌─────────────────┐
│ COMMAND BROKER  │
│                 │
│ 1. Classify cmd │
│ 2. Check tier   │
│ 3. Check lane   │
│ 4. Check budget │
│ 5. Check loops  │
│ 6. Check rate   │
│                 │
│  ┌──────┐ ┌─────┐┌────────┐
│  │ALLOW │ │HOLD ││ BLOCK  │
│  └──┬───┘ └──┬──┘└───┬────┘
└─────┼────────┼───────┼─────
      │        │       │
      ▼        ▼       ▼
   Execute  Queue   Notify
            for      Hermes
           Human
```

---

## 4. Loop Guard

```yaml
loop_guard:
  max_consecutive_retries: 2
  max_total_retries_per_mission: 5
  max_task_runtime_minutes: 60
  circuit_breaker_after_n_failures: 3
  cooldown_after_breaker_seconds: 300

  loop_detection:
    - same_command_same_args: block after 2
    - same_agent_same_error: block after 2
    - cyclical_routing_A_B_A: block immediately
```

---

## 5. Cost Guard

```yaml
cost_guard:
  max_spend_per_task_usd: 5
  max_spend_per_mission_usd: 20
  max_api_calls_per_minute: 10
  token_budget_per_agent_turn: 4096

  overage_action: BLOCK_AND_NOTIFY
```

---

## 6. Rate Limiting

```yaml
rate_limits:
  file_writes_per_minute: 30
  git_operations_per_minute: 10
  test_runs_per_minute: 5
  brain_writes_per_minute: 10
  a2a2a_messages_per_minute: 20
```

---

## 7. Approval Queue

When a command requires human approval:

```json
{
  "approval_id": "APR-2026-0627-001",
  "mission_id": "M-2026-0627-001",
  "command": "git_push",
  "requested_by": "codex-captain",
  "tier": "T3",
  "risk": "MEDIUM",
  "details": {
    "branch": "feature/ghostclaw-v2",
    "remote": "origin",
    "files_changed": 12,
    "diff_summary": "Added GHOSTCLAW/ directory structure"
  },
  "status": "PENDING_HUMAN",
  "created_at": "2026-06-27T00:00:00Z",
  "ttl_hours": 24
}
```

---

## 8. Emergency Stop

```yaml
emergency_stop:
  triggers:
    - human_stop_command
    - circuit_breaker_tripped
    - cost_guard_breach
    - security_scan_positive
    - unauthorized_external_access

  on_stop:
    - halt_all_active_commands
    - set_all_missions_PAUSED
    - notify_hermes
    - notify_operator
    - log_full_state_to_audit
```
