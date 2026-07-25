# Hermes A2A Gate-Specific Permission Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the operator's broad permission request into auditable, gate-specific approval packets without granting blanket automatic execution.

**Architecture:** A single `APPROVE_ALL_AUTO` string is treated as a planning input, not an executable approval. Each risky lane must become one signed approval packet with exact target, scope, rollback, cost cap, branch, environment, recipient, resource id, preflight evidence, and stop condition.

**Tech Stack:** Local SIRINX OS docs, Hermes/Codex A2A queue packets, existing Python unittest gates, Vitest gates, git diff checks, Obsidian pulse records.

---

## Task Card

Goal:
Create a safe approval roadmap for deploy, push, cloud mutation, customer send, Telegram live send, secret read, provider/model/paid call, Hermes runtime queue execution, install, migration, merge script, and license-file mutation.

Constraints:
- This plan does not grant approval.
- No live action can be executed from this plan alone.
- No blanket approval is valid.
- Every action needs one target, one scope, one rollback path, one verification command, and one human-readable stop condition.
- Secret read approval cannot include printing, copying, summarizing, or exporting secret values.
- Customer/Telegram send approval cannot include broad audience sends.
- Provider/model/paid call approval must specify data class, model/provider, max spend, and whether private repo data can leave the machine.

File Scope:
Allowed:
- `docs/superpowers/plans/2026-06-29-hermes-a2a-gate-specific-permission-plan.md`
- Future approval packet docs under `docs/knowledge/`
- Future A2A approval packets under `_A2A_QUEUE/inbox/` or `_A2A_QUEUE/outbox/`

Forbidden:
- `.env`
- secret stores
- cloud control planes
- customer messaging surfaces
- live provider calls
- production deploy scripts
- runtime queue execution

Expected Result:
The operator can choose one gate-specific approval at a time. Codex/Hermes can verify, execute only that narrow lane, record evidence, and stop before the next risky lane.

Verification:
- `git diff --check`
- Parse any future approval JSON packet.
- Run relevant unit tests for the target lane before and after execution.
- Record evidence in `AUTONOMOUS_RUN_LOG.md` and Obsidian only after local verification.

Report Format:
- Summary
- Approved gate id
- Target
- Scope
- Verification
- Rollback
- Cost
- Blocked actions
- Next safe action

## Non-Negotiable Decision

`APPROVE_ALL_AUTO` is not a valid execution approval.

Valid status for this request:

```json
{
  "blanket_approval": false,
  "auto_execute_all": false,
  "plan_created": true,
  "requires_gate_specific_packets": true
}
```

## Gate Matrix

| Gate id | Requested permission | Default status | Earliest valid environment | Resource id rule |
|---|---|---:|---|---|
| `GATE-PUSH-001` | Git push | blocked | staging branch only | repo path, remote, branch, commit sha |
| `GATE-DEPLOY-001` | Deploy | blocked | staging only | deploy target, build id, commit sha |
| `GATE-CLOUD-001` | Cloud mutation | blocked | staging sandbox only | provider, account/project id, resource id |
| `GATE-CUSTOMER-SEND-001` | Customer send | blocked | dry-run recipient first | channel, recipient id, message id |
| `GATE-TELEGRAM-LIVE-001` | Telegram live send | blocked | private operator chat first | bot profile, chat id, message hash |
| `GATE-SECRET-READ-001` | Secret read | blocked | local verification only | secret name, purpose, no-value-output rule |
| `GATE-PROVIDER-001` | Provider/model/paid call | blocked | low-cost staging eval | provider, model, max spend, data class |
| `GATE-HERMES-RUNTIME-001` | Hermes runtime queue execution | blocked | single packet dry-run then staging | packet id, queue id, worker id |
| `GATE-INSTALL-001` | Install | blocked | local dev only | package, version, lockfile effect |
| `GATE-MIGRATION-001` | Migration | blocked | staging database only | migration id, database id, backup id |
| `GATE-MERGE-SCRIPT-001` | Merge script | blocked | feature branch only | script path, input artifact hash |
| `GATE-LICENSE-001` | License-file mutation | blocked | repo docs only | license file path, copyright holder |

## Known Safe Defaults

```json
{
  "repo": "/Users/sirinx/sirinx-os",
  "branch": "staging/godmode-master-os-v2",
  "primary_packet": "_A2A_QUEUE/inbox/packet_024_sirinx_hermes_a2a_codex_sync_all_jobs.json",
  "current_actionable_packet": "packet_013",
  "execution_mode": "local_plan_only",
  "deploy": false,
  "push": false,
  "cloud_mutation": false,
  "customer_send": false,
  "telegram_live_send": false,
  "secret_read": false,
  "provider_call": false,
  "paid_call": false,
  "hermes_runtime_queue_execution": false,
  "install": false,
  "migration": false,
  "merge_script": false,
  "license_file_mutation": false
}
```

## Approval Packet Schema

Every future approval packet must use this shape:

```json
{
  "approval_id": "GATE-PUSH-001-20260629-001",
  "requested_by": "sirinx",
  "approved_by": "sirinx",
  "created_at": "2026-06-29T00:00:00+07:00",
  "expires_at": "2026-06-29T23:59:59+07:00",
  "single_use": true,
  "gate": "GATE-PUSH-001",
  "target": {
    "repo": "/Users/sirinx/sirinx-os",
    "environment": "staging",
    "branch": "staging/godmode-master-os-v2",
    "resource_id": "origin/staging/godmode-master-os-v2"
  },
  "scope": {
    "allowed_files": [
      "GHOSTCLAW/a2a-hermes-codex-bridge/**",
      "_A2A_QUEUE/inbox/packet_024_sirinx_hermes_a2a_codex_sync_all_jobs.json",
      "docs/knowledge/SIRINX_HERMES_A2A_CODEX_SYNC_ALL_JOBS_PACKET_2026-06-29.md",
      "docs/superpowers/plans/2026-06-29-hermes-a2a-gate-specific-permission-plan.md"
    ],
    "forbidden_files": [
      ".env",
      ".env.*",
      "memory/private/**",
      "infra/cloudflare/**"
    ],
    "allowed_actions": [
      "verify",
      "commit",
      "push_this_branch_only"
    ],
    "forbidden_actions": [
      "force_push",
      "tag_release",
      "deploy",
      "secret_read",
      "customer_send"
    ]
  },
  "cost_cap": {
    "max_usd": 0,
    "paid_provider_calls": false
  },
  "preflight": [
    "git status --short --branch",
    "git diff --check",
    "python3 -m unittest discover -s WORKSPACE_SCAFFOLD/tests -v",
    "./node_modules/.bin/vitest run GHOSTCLAW/a2a-hermes-codex-bridge/*.test.ts apps/centerbrain-shell/src/lib/*.test.ts services/dev-control-api/src/centerbrain-hub.test.mjs"
  ],
  "rollback": {
    "strategy": "revert_commit",
    "command": "git revert <commit-sha>",
    "requires_human_confirmation": true
  },
  "stop_conditions": [
    "dirty tree contains unrelated files",
    "tests fail",
    "target branch differs",
    "secret-like diff appears",
    "approval packet expired"
  ]
}
```

## Gate-Specific Approval Templates

### `GATE-PUSH-001`

Valid command text:

```text
APPROVE_PUSH
repo=/Users/sirinx/sirinx-os
remote=origin
branch=staging/godmode-master-os-v2
scope=packet024 local evidence changes only
force=false
expires=2026-06-29T23:59:59+07:00
```

Preflight:

```bash
git status --short --branch
git diff --check
git log origin/staging/godmode-master-os-v2..HEAD --oneline
```

Rollback:

```bash
git revert <pushed-commit-sha>
git push origin staging/godmode-master-os-v2
```

### `GATE-DEPLOY-001`

Valid command text:

```text
APPROVE_STAGING_DEPLOY
repo=/Users/sirinx/sirinx-os
environment=staging
target=<exact deploy target from repo config>
commit=<verified commit sha>
customer_send=false
paid_api=false
rollback=redeploy previous verified staging build
expires=2026-06-29T23:59:59+07:00
```

This gate remains non-executable until the exact deploy target and previous known-good build id are recorded in an approval packet.

### `GATE-CLOUD-001`

Valid command text:

```text
APPROVE_STAGING_CLOUD_MUTATION
provider=<cloud provider>
account_or_project_id=<exact id>
resource_id=<exact resource id>
mutation=<single mutation>
environment=staging
rollback=<exact rollback mutation>
max_blast_radius=single resource
expires=2026-06-29T23:59:59+07:00
```

Forbidden under this gate:

```text
production mutation
wildcard resource mutation
account-wide changes
secret listing
permission escalation
```

### `GATE-CUSTOMER-SEND-001`

Valid command text:

```text
APPROVE_CUSTOMER_SEND
channel=<LINE|email|CRM>
recipient_id=<single recipient id>
message_artifact=<local reviewed message file>
message_hash=<sha256>
human_reviewed=true
max_recipients=1
expires=2026-06-29T23:59:59+07:00
```

Rollback:
Customer sends cannot be truly rolled back. The rollback plan must be a follow-up correction message reviewed by the operator before send.

### `GATE-TELEGRAM-LIVE-001`

Valid command text:

```text
APPROVE_TELEGRAM_LIVE_SEND
bot_profile=<exact bot/profile>
chat_id=<single operator chat id>
message_artifact=<local reviewed report file>
message_hash=<sha256>
max_messages=1
expires=2026-06-29T23:59:59+07:00
```

Default first target:

```text
private operator chat only
```

### `GATE-SECRET-READ-001`

Valid command text:

```text
APPROVE_SECRET_PRESENCE_CHECK
secret_name=<exact secret name>
purpose=<verification purpose>
allowed_output=present_or_missing_only
print_value=false
copy_value=false
summarize_value=false
upload_value=false
expires=2026-06-29T23:59:59+07:00
```

This gate does not allow exposing secret values in logs, chat, Obsidian, screenshots, or test output.

### `GATE-PROVIDER-001`

Valid command text:

```text
APPROVE_PROVIDER_CALL
provider=<provider>
model=<model>
purpose=<single purpose>
data_class=<public|repo_metadata|private_repo>
private_data_allowed=<true|false>
max_usd=<number>
max_requests=<number>
expires=2026-06-29T23:59:59+07:00
```

Default cost cap for first staging smoke:

```json
{
  "max_usd": 1,
  "max_requests": 3,
  "private_data_allowed": false
}
```

### `GATE-HERMES-RUNTIME-001`

Valid command text:

```text
APPROVE_HERMES_RUNTIME_QUEUE_EXECUTION
packet_id=<single packet id>
queue_id=<exact queue id>
worker_id=<exact worker id>
dry_run_first=true
max_runtime_minutes=10
provider_call=false
external_send=false
expires=2026-06-29T23:59:59+07:00
```

For current repo state, this should target `packet_013` only after Hermes decision evidence exists. `packet_024` is a goal-command evidence packet, not the actionable runtime packet.

### `GATE-INSTALL-001`

Valid command text:

```text
APPROVE_INSTALL
package_manager=<pnpm|npm|brew|pip>
package=<exact package>
version=<exact version>
repo=/Users/sirinx/sirinx-os
lockfile_allowed=<true|false>
postinstall_allowed=false
expires=2026-06-29T23:59:59+07:00
```

Rollback:

```bash
git diff -- package.json pnpm-lock.yaml
```

Then revert only the package metadata change if the install fails verification.

### `GATE-MIGRATION-001`

Valid command text:

```text
APPROVE_STAGING_MIGRATION
database=<staging database id>
migration_id=<exact migration id>
backup_id=<verified backup id>
dry_run_sql_reviewed=true
production=false
expires=2026-06-29T23:59:59+07:00
```

Production migration is a separate gate and is not covered by staging migration approval.

### `GATE-MERGE-SCRIPT-001`

Valid command text:

```text
APPROVE_MERGE_SCRIPT
script=scripts/merge_ghostclaw_yolo_v3_3.sh
input_artifact=<exact zip path>
input_sha256=<sha256>
target_repo=/Users/sirinx/sirinx-os
target_branch=feature/ghostclaw-yolo-v3-3
commit=false
expires=2026-06-29T23:59:59+07:00
```

Default first run must be `commit=false` unless a separate commit gate exists.

### `GATE-LICENSE-001`

Valid command text:

```text
APPROVE_LICENSE_FILE_MUTATION
repo=/Users/sirinx/sirinx-os
license=MIT
file=LICENSE
copyright_holder=<legal owner>
year=2026
scope=repository root license file only
expires=2026-06-29T23:59:59+07:00
```

This gate is blocked until the copyright holder is explicit.

## Execution Order

- [ ] Step 1: choose exactly one gate id.
- [ ] Step 2: create one approval packet for that gate.
- [ ] Step 3: run preflight verification.
- [ ] Step 4: execute only the approved action.
- [ ] Step 5: run postflight verification.
- [ ] Step 6: record evidence in the run log.
- [ ] Step 7: stop and request the next gate-specific approval.

## Stop Conditions

Stop immediately if any of these happen:

```text
unrelated dirty files are mixed into target scope
tests fail
target environment is production when approval says staging
resource id is wildcard or missing
secret value would be printed
customer recipient is more than one recipient
provider cost cap is missing
rollback command is missing
Hermes packet id is not exact
license owner is not explicit
```

## Self-Review

Spec coverage:
- Deploy, push, cloud mutation, customer send, Telegram live send, secret read, provider/model/paid call, Hermes runtime queue execution, install, migration, merge script, and license-file mutation each have a separate gate.
- Target, scope, rollback, cost cap, branch, environment, recipient, and resource id requirements are represented in the approval packet schema.
- Blanket auto approval remains blocked.

Placeholder scan:
- Any value shown in angle brackets is not executable. It marks a required operator-provided value. A packet containing angle brackets must fail validation.

Type consistency:
- Gate ids in the matrix match the gate ids in the templates.
- The current repo and branch match the local Codex workspace state at plan creation time.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-29-hermes-a2a-gate-specific-permission-plan.md`.

Two execution options:

1. Subagent-Driven: dispatch a fresh subagent per chosen gate and review between gates.
2. Inline Execution: execute one chosen gate in this session with explicit checkpointing.

Execution remains blocked until the operator provides one valid gate-specific approval packet or command.
