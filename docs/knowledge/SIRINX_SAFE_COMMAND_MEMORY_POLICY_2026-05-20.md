# SIRINX Safe Command And Continuity Memory Policy

Date: 2026-05-20
Source repo: `/Users/sirinx/restore-sources/github-audit/oz-corp-omega-dual-node`
Target repo: `/Users/sirinx/sirinx-os`
Mode: docs-only policy mapping
External writes: none
Runtime changes: none
Secrets read or printed: none

## Purpose

Extract only the safe-command and continuity-memory ideas from `oz-corp-omega-dual-node` into SIRINX OS policy. This document does not create a command runner, does not start workers, and does not authorize external connectors.

## Reviewed Source Files

| Source file | Useful concept | SIRINX decision |
| --- | --- | --- |
| `services/hermes-agent/src/tools/safe-command-tool.ts` | A command runner that accepts named commands instead of arbitrary shell text. | Keep the allowlist concept; do not import runtime code. |
| `services/hermes-agent/src/memory/continuity.ts` | Tracks typed events and staged memory for carryover. | Keep field model as summary-only memory guidance. |
| `services/openclaw-worker/src/memory/continuity-manager.ts` | Adds last user intent, followup focus, and assistant commitment. | Keep as continuity schema proposal; do not run worker. |

## Safe Command Classes

SIRINX commands must be classified by risk before they can be exposed to Hermes, Command Center, Codex Mobile, thClaws-style jobs, or future agent profiles.

| Class | Examples | Default decision | Conditions |
| --- | --- | --- | --- |
| `read_only_local` | `git status --short`, `rg --files`, `pnpm dashboard:status`, local API GET smoke | allowed locally | Must not read `.env`, private keys, token files, keystores, customer credentials, or hidden system folders. |
| `local_validation` | `pnpm verify`, unit tests, Playwright local e2e, `git diff --check` | allowed locally | Must run against local repo or approved local dev server only. |
| `local_file_write` | Obsidian summary note, local evidence packet, docs update | approval required by task scope | Must be target-specific and must not store raw chat logs, secrets, or PII. |
| `external_read` | safe public GET, GitHub read-only metadata, official docs lookup | approval recommended if authenticated/private | Must not print credentials, private customer data, or sensitive repo files. |
| `external_write` | deploy, GitHub push/PR, Cloudflare mutation, Supabase write, ClickUp/Notion/Drive write, Telegram/LINE send | blocked until exact approval | Requires target, rollback, evidence, and smoke-test plan. |
| `secret_or_sensitive_read` | `.env`, API tokens, Solis credentials, signing material, private keys, passkeys | blocked | User approval alone is not enough if safe handling/storage is absent. |
| `destructive` | delete, reset, database migration, purge cache, revoke token, overwrite customer data | blocked | Requires exact target, backup/rollback, and human review. |

## Approved Named Local Commands

These names are policy labels, not executable API methods.

| Command label | Current local implementation | Risk class | Notes |
| --- | --- | --- | --- |
| `repo_status` | `git status --short` | `read_only_local` | Safe for current repo only. |
| `repo_diff_check` | `git diff --check` | `local_validation` | Whitespace/syntax hygiene before commit. |
| `operating_verify` | `pnpm verify` | `local_validation` | Local syntax and operating-file checks. |
| `dashboard_e2e` | `pnpm dashboard:e2e` | `local_validation` | Uses local dashboard/API. |
| `external_gate_check` | `pnpm external-gates:check` | `local_validation` | Does safe reads and reports blocked external gates. |
| `lead_audit_test` | `pnpm lead-event-audit:test` | `local_validation` | No CRM/Supabase/production writes. |
| `solar_ops_contract_test` | `pnpm solar-ops-contract:test` | `local_validation` | No Supabase/schema import. |
| `obsidian_digest_index` | local vault ingest script | `local_file_write` | Summary-only memory; no raw chat logs or secrets. |

## Prohibited Command Shapes

- Arbitrary shell text from a model, review bot, chat message, or external issue.
- Any command containing `rm -rf`, `git reset --hard`, forced checkout, database drop/truncate, secret printing, token echoing, or deploy without an exact gate.
- Any direct execution of old repo scripts such as deploy scripts, bot scripts, message senders, or worker deploy helpers.
- Any command that reads `.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, keystores, customer credentials, or Solis credentials.

## Continuity Memory Schema

SIRINX memory must be summary-first and evidence-oriented.

| Field | Required | Rule |
| --- | --- | --- |
| `type` | yes | One of `decision`, `verification`, `blocker`, `handoff`, `watchful_state`, `sensitive_event`. |
| `context_before` | yes | Short state summary before the event. |
| `event_core` | yes | What changed, what was tested, or what was blocked. |
| `immediate_result` | yes | Local result with commit/test/evidence if available. |
| `followup_focus` | yes | The next specific ordered task. |
| `evidence_refs` | recommended | Commit hash, local file path, endpoint, or test command. |
| `redaction_status` | yes | Must say `summary_only_no_secrets_no_raw_chat`. |

## Memory Storage Rules

- Store decisions, commands, test results, blockers, next actions, and commit IDs.
- Do not store raw chat logs.
- Do not store hidden chain-of-thought.
- Do not store `.env` values, API tokens, private keys, cookies, signing materials, Solis credentials, or customer private credentials.
- Do not store raw phone/email/customer records in Obsidian digest or Command Center summaries.
- Sensitive events should record that the gate exists and what evidence is missing, not the secret itself.

## Agent Responsibility Mapping

| Profile | Responsibility |
| --- | --- |
| `shogun` | Approves escalation class and keeps external-write gates explicit. |
| `planner` | Maintains ordered backlog and prevents task hopping. |
| `backend` | Owns local API contracts and prevents production writes from local previews. |
| `devops` | Owns Cloudflare/GitHub/deploy approval packets. |
| `qa` | Runs local validation commands and records results. |
| `data` | Reviews schema/RLS before Supabase or analytics writes. |
| `solis` | Keeps Solis telemetry blocked until consent and credential evidence exist. |
| `scribe` | Writes summary-only Obsidian memory and rejects raw chat/secrets. |

## Runtime Adoption Gate

Before implementing any runtime safe-command module:

1. Create a typed command registry with fixed command IDs and fixed argument schemas.
2. Enforce `externalWrites=false` by default.
3. Require a policy decision before execution.
4. Log only command ID, arguments classification, result status, and evidence path.
5. Add tests for allowed local commands, blocked secret reads, blocked destructive commands, and blocked external writes.
6. Confirm no command accepts arbitrary shell text.

## Acceptance

This policy is accepted only as documentation. It does not grant permission to run old `oz-corp-omega-dual-node` scripts, import its runtime, enable messaging, deploy workers, write SaaS, read secrets, or create autonomous memory.
