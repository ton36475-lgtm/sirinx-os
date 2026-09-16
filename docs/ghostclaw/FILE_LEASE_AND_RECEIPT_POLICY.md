# File Lease and Receipt Policy

**Date:** 2026-06-30

---

## File Lease

- TTL: 900 seconds (15 minutes)
- Lock dir: .ghostclaw_runtime/a2a2a/locks
- Rules: one mutating agent per file, lease required before patch, expired lease releasable, denied lease creates conflict receipt, all leases archived after completion

## Receipt Schema

Required fields: receipt_id, mission_id, task_id, decision_id, agent, action_tier, files_touched, file_lease_id, git_diff_stat, validation_commands, validation_result, checksum, blocked_actions, created_at

## Checksum Policy

- SHA-256 for created/modified files
- SHA-256 for receipt itself
- Record before/after checksums when possible
