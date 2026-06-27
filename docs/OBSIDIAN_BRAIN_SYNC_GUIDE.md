# Obsidian Brain Sync Guide

**Version:** 2.0

---

## What is Brain Sync?

Brain sync ensures ALL agents share the same project context. No agent acts on stale information.

## When Brain Sync Happens

- After every lane completion
- Before agent starts a new task
- If mission runs > 30 minutes (auto-refresh)
- When STATUS_BOARD changes
- When DECISION_LOG is updated
- When loop guard triggers recovery

## Brain Sync Process

```
1. Hermes triggers sync signal
2. All agents pause current work (if new mission started)
3. Agent reads mandatory context pack:
   - 01_PROJECT_CONTRACT.md
   - 14_SOURCE_OF_TRUTH.md
   - 16_STATUS_BOARD.md
   - 11_TASK_PRIORITY_MATRIX.md
   - Role-specific doctrine file
4. Agent reconciles local state with Brain
5. Agent confirms sync complete
6. Hermes updates brain_integrity_check.json
```

## Brain Integrity Verification

```
1. Hermes compares brain_snapshot.json checksums
2. If mismatch → reconcile from source of truth
3. Update brain_snapshot.json
4. Record in brain_integrity_check.json
```

## Sync Failure Recovery

```
If Brain inaccessible:
  1. Use local brain_snapshot.json as fallback
  2. Mark lane as DEGRADED
  3. Notify Operator
  4. Retry sync every 5 minutes
```

## Brain Storage

```
Primary: _OBSIDIAN_GHOSTCLAW_BRAIN/ (repo root)
Runtime: .ghostclaw_runtime/obsidian_sync/ (state)
KMS: .thclaws/kms/sirinx-brain/ (agent-readable KMS)
```
