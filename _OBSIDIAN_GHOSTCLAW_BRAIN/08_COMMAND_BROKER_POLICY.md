# 08 — Command Broker Policy

**Authority:** A5 execution gate
**Position:** Between KOB Validator and Mission Control

---

## Purpose

Command Broker is the **final execution gate**. No command reaches the system without passing all safety checks.

## Command Tiers

### T0 — Always Allowed
```
file_read, git_status, git_diff, git_log, brain_query, kms_read, agent_status, mission_status
```

### T1 — Lane-Scoped (No Approval)
```
file_write (lane only), file_delete (lane only), git_add (lane only),
test_run, lint_run, typecheck_run, build_run (lane only), brain_write, kms_write
```

### T2 — Hermes Approval Required
```
git_commit, git_branch_create, git_stash, file_move_cross_lane, cross_lane_write,
dependency_install, new_file_outside_lane
```

### T3 — Human Approval Required
```
git_push, git_merge, git_rebase, deploy, cloud_mutation, external_api_write,
customer_message_send, paid_api_call, package_publish, database_migration
```

### T4 — Prohibited
```
rm_rf_outside_workspace, sudo, system_shutdown, network_scan_external,
credential_extraction, bypass_approval
```

## Standing Approval (Auto-Approved)

```yaml
auto_approved:
  - read repo
  - read Obsidian Brain
  - write Obsidian Brain
  - write runtime state
  - write task envelopes
  - generate docs
  - create non-destructive scaffold
  - create test fixtures
  - run lint
  - run typecheck
  - run unit tests
  - read A2A2A inbox/outbox
  - write audit logs
  - generate patch proposal
```

## Human Gate (Always Blocked Without Approval)

```yaml
human_gate:
  - secret access
  - external sync
  - production deploy
  - git push
  - database migration (real)
  - dependency install
  - delete files
  - modify auth
  - modify payment
  - modify security policy
  - modify audit trail
  - disable logging
  - approve all actions
  - bypass access control
```

## Rate Limiting

```yaml
rate_limits:
  file_writes_per_minute: 30
  git_operations_per_minute: 10
  test_runs_per_minute: 5
  brain_writes_per_minute: 10
  a2a2a_messages_per_minute: 20
```
