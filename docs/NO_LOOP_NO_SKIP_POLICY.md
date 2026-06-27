# No Loop. No Skip. No Drift. Policy

**Version:** 2.0
**Enforced by:** Loop Guard + Command Broker

---

## No Loop

```
Rule: Same worker, same error → max 2 attempts
Rule: Same file, same rewrite → max 2 attempts
Rule: Total retries per task → max 3
Rule: KOB reruns same command → max 3

On loop detection:
  1. STOP worker
  2. Hash error pattern
  3. Mark task BLOCKED
  4. Opus diagnoses
  5. Hermes decides
```

## No Skip

```
Rule: No task skips a dependency
Rule: Architecture before build (Opus → Codex)
Rule: Validation before commit (KOB → Codex)
Rule: Lane N only after Lane N-1 COMPLETED

On skip detection:
  1. BLOCK task immediately
  2. Notify Hermes
  3. Identify missing dependency
  4. Route missing dependency first
```

## No Drift

```
Rule: Every agent reads Brain before acting
Rule: Every agent writes Brain after completing
Rule: STATUS_BOARD always reflects current state
Rule: Context refresh if mission > 30 minutes

On drift detection:
  1. Hermes triggers Brain sync
  2. Agent re-reads context pack
  3. STATUS_BOARD reconciled
  4. DECISION_LOG recorded
```

## Escalation Path

```
Worker stuck → Codex (1 min)
Codex stuck → Opus (2 min)
Opus stuck → Hermes (3 min)
Hermes stuck → Human Operator (5 min)
```
