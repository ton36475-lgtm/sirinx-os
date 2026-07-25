# Thaimart Approve To Export Gate Readiness

Date: 2026-07-09
Mode: local-safe readiness only
Status: blocked pending separate exact gates

## Scope

This receipt records the current local readiness for a future Thaimart
Approve -> export flow. It does not approve Telegram delivery, worker
execution, export generation, external API calls, deploy, push, provider calls,
or production mutation.

## Current Local State

- Seed script exists at `scripts/seed_test.mjs`.
- Seed data exists in ignored local runtime files:
  - `memory/live/products.json`
  - `memory/live/approvals.json`
- Seed validation passed with one `TEST-SEED-001` product and one
  `THAIMART_LIVE_PUBLISH` approval row.
- The approval row references the existing seeded product.
- `memory/live/` is local runtime data and is intentionally not tracked.

## Discovery Findings

- `THAIMART_LIVE_PUBLISH` currently appears only in the seed script.
- No dedicated Thaimart export worker command was found in `package.json`,
  `scripts/`, `services/`, `configs/`, or `docs/` during focused discovery.
- The existing external gate runner is readiness-only:
  - `canExecuteNow=false`
  - `externalWrites=false`
  - `productionWrites=false`
  - `customerVisible=false`
- Telegram gateway config is dry-run-first:
  - `defaultLiveSend=false`
  - `webhook.enabled=false`
  - `polling.enabled=false`
  - `queuePayloadExecution=false`
- Existing Telegram gates are closed:
  - `APPROVE_TELEGRAM_GATEWAY_LIVE_SEND_A019E53EE`
  - `APPROVE_TELEGRAM_GATEWAY_WEBHOOK_ACTIVATION_A019E53EE`
  - `APPROVE_HERMES_GATEWAY_RESTART_A019E53EE`
- External evidence gate `telegram-line-recipient-token` is still incomplete.

## Required Gate Separation

A real Approve -> export test must be split into separate gates. One broad
"approve" is not executable approval.

1. Local seed/readiness gate
   - Allowed: local JSON validation and receipt writing.
   - Current status: passed.

2. Telegram recipient/token evidence gate
   - Required before any Telegram smoke send or live approval button test.
   - Evidence file:
     `docs/knowledge/external-gates/evidence/telegram-line-recipient-token.md`
   - Current status: incomplete.

3. Telegram live-send gate
   - Existing gate phrase:
     `APPROVE_TELEGRAM_GATEWAY_LIVE_SEND_A019E53EE`
   - This still needs an exact allowed command and confirmed recipient.
   - No token value may be printed or written to repo docs.

4. Worker execution gate
   - Required before any queue payload execution, worker start, runtime restart,
     or real export worker run.
   - Current status: no dedicated Thaimart worker command found.
   - Gate must name the exact full command once the worker command exists.

5. Render/export gate
   - Required because `RENDER_EXPORT_ENABLED` controls render/export workflows.
   - Current status: not opened in this session.

## Future Exact Gate Template

Use this shape only after recipient evidence is complete and a real worker
command exists:

```text
APPROVE_THAIMART_APPROVE_EXPORT_WORKER_<target>_20260709
Allowed command: <exact executable command with no placeholder>
Evidence: /Users/sirinx/sirinx-os/docs/receipts/THAIMART_APPROVE_EXPORT_GATE_READINESS_20260709.md
Rollback owner: sirinx
Forbidden adjacent actions: production deploy, git push, provider call, secret print, customer broadcast, unrelated worker execution
```

The allowed command must be a full command line, not a placeholder. The command
must not read or print secret values. It must write only to an approved local
test output path unless a separate production/export approval exists.

## Safe Commands Verified

```text
node --check scripts/seed_test.mjs
node scripts/external-gate-evidence-check.mjs
node scripts/external-gate-runner.mjs
node -e "<local seed assertion>"
```

## Verification Results

- Seed syntax: pass.
- Seed local data assertion: pass.
- External gate evidence: blocked-evidence-incomplete.
- External gate runner: blocked-external-execution.
- Ready gates: 0 of 5.
- Unsafe evidence: 0.
- External writes: false.
- Production writes: false.
- Customer visible actions: false.

## Stop Rule

Stop before Telegram live send, worker execution, webhook activation, polling
start, queue payload execution, export generation, deploy, push, provider call,
secret read/print, or production/customer data mutation unless the relevant
separate exact gate is provided and verified.

## Next Safe Action

Complete non-secret Telegram/LINE recipient-token evidence, identify or build a
local-only Thaimart export worker under a separate spec, then request one exact
worker execution gate with the full command line.
