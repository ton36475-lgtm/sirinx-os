# 12 — Loop Guard and Recovery

**Purpose:** Prevent infinite loops, repeated failures, and task deadlocks

---

## Hard Rules

| Rule | Limit | Action on Breach |
|---|---|---|
| Same worker, same error | 2 attempts | STOP worker, escalate to Codex |
| Same file, same rewrite | 2 attempts | Block file, escalate to Opus |
| Task without dependency completion | 0 | BLOCK immediately |
| Hermes marks complete without worker output | 0 | REJECT, require evidence |
| Codex stages without KOB validation | 0 | BLOCK stage |
| KOB reruns command without limit | 3 max | STOP KOB, escalate to Hermes |
| Worker resolves merge conflict without Codex | 0 | REVERT, escalate |
| Total retries per task | 3 | Mark FAILED, escalate |

## Loop Guard Policy

```yaml
loop_guard:
  max_attempts_per_task: 3
  same_error_hash_limit: 2
  same_file_rewrite_limit: 2
  worker_timeout_seconds: 300
  task_skip_allowed: false
  dependency_bypass_allowed: false
  auto_escalate_after_failures: 2
  escalation_order:
    - worker
    - codex_build_captain
    - opus_architect
    - hermes_commander
  on_loop_detected:
    - stop_worker
    - write_failure_report
    - hash_error
    - mark_task_blocked
    - request_opus_diagnosis
    - wait_for_hermes_decision
```

## Circuit Breaker

```
Failure threshold: 3
Scope: per_agent
Cooldown: 300 seconds (5 minutes)
Action: STOP agent, notify Hermes
```

## Recovery Flow

```
1. Loop detected → STOP worker
2. Hash error pattern
3. Check if seen before → if yes, escalate immediately
4. Mark task BLOCKED
5. Opus diagnoses root cause
6. Hermes decides: retry / reassign / escalate to Human
7. Record in recovery_log.jsonl
```
