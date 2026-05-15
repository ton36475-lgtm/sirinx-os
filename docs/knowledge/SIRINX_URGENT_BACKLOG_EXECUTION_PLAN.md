# SIRINX Urgent Backlog Execution Plan

Status: pre-execution plan
Created: 2026-05-16
Repo root: `/Users/sirinx/sirinx-os`
Latest known commit: `9bad43c docs: add Level 1 self-learning timeline and policies`
Runtime impact: none

## Purpose

This document organizes the remaining SIRINX OS work before any broad implementation continues. It turns the current repo state, existing runbooks, and `AGENTS.md` roadmap into a prioritized execution plan.

This file is a planning artifact only. It does not approve deployment, Git push, cloud mutation, customer messaging, paid API calls, real secret access, migrations, or runtime configuration changes.

## Current Observed State

- `AGENTS.md` is the canonical operating protocol.
- The current mode from project docs is `Production Hardening -> Safety Gates -> Dry-run Integration -> Staging -> Production Approval`.
- Level 1 self-learning docs and policies are committed in `9bad43c`.
- Git currently tracks only the Level 1 artifact set from that commit.
- Many existing project files are still untracked, including root docs, app scaffolds, services, scripts, tests, package metadata, and local tool folders.
- The local dashboard is documented at `http://127.0.0.1:8710`.
- The local control API is documented at `http://127.0.0.1:8711`.
- The project has local verification commands in `package.json`, including `pnpm verify`, `pnpm dashboard:run`, and `pnpm dashboard:e2e`.

## Non-Negotiable Safety Rules

- Do not deploy without explicit human approval.
- Do not push Git without explicit human approval.
- Do not mutate cloud resources without explicit human approval.
- Do not read, print, copy, summarize, upload, or transform real secret files.
- Do not edit real `.env` files.
- Only update `.env.example` when explicitly scoped.
- Do not install dependencies unless the task explicitly approves dependency work.
- Do not run migrations unless the task explicitly approves migration work.
- Do not send customer-facing messages.
- Do not trigger paid APIs.
- Do not expose local AI, admin routes, MCP servers, databases, n8n, Grafana, Ollama, or vLLM publicly.
- Do not treat raw chat logs as memory.

## Immediate Risk Summary

### Risk 1: Git Baseline Is Not Established

The repo has a valid Level 1 commit, but most existing project files are untracked. This makes future diffs harder to review because new changes can be mixed with pre-existing untracked work.

Required response:

- Classify untracked files into track, ignore, archive, or delete-review buckets.
- Update `.gitignore` only after review.
- Create a clean baseline commit for approved scaffold files.
- Never use `git add .` until the baseline classification is complete.

### Risk 2: Runtime Verification Has Not Been Reconfirmed After Baseline

Docs indicate the dashboard and API have verification commands, but the current task did not run the full local dashboard stack or browser QA.

Required response:

- Run local syntax checks first.
- Start dashboard/API only when the scope is verification.
- Run e2e only after local services are confirmed.
- Record evidence in a doc or work summary.

### Risk 3: External Connector Surface Is Broad

Codex has access to plugins/connectors such as GitHub, Supabase, Notion, Google Drive, ClickUp, Figma, Canva, Browser, Chrome, and Computer Use.

Required response:

- Use local repo actions first.
- Use external connectors only for explicit tasks.
- Ask for approval before any connector write, export, issue creation, PR creation, database mutation, or SaaS update.

### Risk 4: Product Backlog Contains Production-Sensitive Work

The roadmap includes kill switches, approval queue, production AI backend, MySQL/Redis, external adapters, local AI runtime, cost guard, observability, and backup/restore.

Required response:

- Execute in readiness order.
- Keep everything local and dry-run until safety gates pass.
- Treat production integration as blocked until explicit approval.

## Priority Model

- P0: Must be completed before broad implementation continues.
- P1: Must be completed before dry-run integration or staging.
- P2: Important next work after P0/P1 gates are clean.
- P3: Expansion work after stable local baseline and safety gates.

## P0 Workstream 1: Establish Git And Repo Baseline

Goal:

Create a clean, reviewable repository baseline so future changes are visible and auditable.

Why urgent:

Most project files are untracked. Without a baseline, future diffs cannot clearly separate old scaffold from new work.

Scope:

- Root metadata: `AGENTS.md`, `CLAUDE.md`, `README.md`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `playwright.config.mjs`
- Existing docs under `docs/`
- App scaffolds under `apps/`
- Service scaffold under `services/`
- Shared packages under `packages/`
- Scripts under `scripts/`
- Tests under `tests/`
- Devtool docs under `devtools/`

Do not include:

- `.env` files
- real secrets
- `node_modules/`
- logs
- pids
- test reports
- browser reports
- `.thclaws/` unless separately approved
- local-only caches

Detailed steps:

1. Inspect current untracked file list.
2. Review `.gitignore` rules without reading secret values.
3. Decide which folders are source/docs and which are generated/local state.
4. Stage only approved baseline files.
5. Run `git diff --cached --name-status`.
6. Confirm no secret files, logs, generated reports, or dependency folders are staged.
7. Commit baseline with a message such as `chore: establish SIRINX OS local scaffold baseline`.

Verification:

- `git status --short --branch`
- `git diff --cached --name-status`
- targeted secret-pattern scan on staged files
- no source/runtime behavior changed during classification

Exit criteria:

- Git has a clean tracked baseline for approved project files.
- Generated and local-only files are ignored or left unstaged by policy.

## P0 Workstream 2: Confirm Codex Mobile Host Control

Goal:

Confirm the phone can command, review, and approve while the Mac host performs repo work.

Why urgent:

The intended operating model depends on mobile review and approval while Codex runs on the host.

Detailed steps:

1. Keep Codex App open on the Mac host.
2. Confirm the same ChatGPT account and workspace are used on mobile and host.
3. Use Codex App mobile setup QR flow.
4. Confirm the host appears in ChatGPT mobile Codex.
5. Send a read-only mobile prompt: `Show repo root and latest commit. Do not edit files.`
6. Confirm the mobile response sees `/Users/sirinx/sirinx-os` and latest commit `9bad43c` or newer.
7. Keep Mac awake while remote control is needed.

Verification:

- Host online
- Codex App running
- ChatGPT mobile connected
- Read-only mobile command succeeds

Exit criteria:

- Mobile can inspect active repo state without edits.

## P0 Workstream 3: Safety Gate Freeze

Goal:

Freeze the safety posture before implementation resumes.

Why urgent:

Roadmap work includes external adapters, approval queues, cloud/staging paths, paid APIs, and customer-facing flows.

Detailed steps:

1. Confirm `.env.example` has placeholders only.
2. Confirm real `.env` files are ignored.
3. Confirm no public deploy target is configured for internal services.
4. Confirm dashboard/control API actions are dry-run only.
5. Confirm no script performs cloud mutation by default.
6. Confirm no customer messaging integration is enabled.
7. Confirm connector writes require human approval.

Verification:

- `.gitignore` review
- targeted secret-pattern scan
- script review
- dry-run action review

Exit criteria:

- Safety gate checklist is documented as pass, warn, or blocked.

## P0 Workstream 4: Local Verification Baseline

Goal:

Prove the existing local dashboard and control API are runnable before adding new features.

Why urgent:

Feature work is unsafe if the local baseline is not verified first.

Detailed steps:

1. Run syntax verification with `pnpm verify`.
2. Start local stack with `pnpm dashboard:run`.
3. Check status with `pnpm dashboard:status`.
4. Confirm API health at `http://127.0.0.1:8711/health`.
5. Open dashboard at `http://127.0.0.1:8710`.
6. Run `pnpm dashboard:e2e`.
7. Stop stack with `pnpm dashboard:stop`.
8. Record results in a dated work summary.

Verification:

- syntax checks pass
- API health returns OK
- dashboard loads
- browser e2e passes or failures are logged
- no external writes occur

Exit criteria:

- A dated verification summary exists.

## P1 Workstream 5: Developer Command Center Hardening

Goal:

Harden `apps/dev-dashboard` and `services/dev-control-api` as the local command center.

Dependencies:

- P0 Git baseline complete
- P0 local verification complete

Detailed tasks:

1. Confirm dashboard loading state, error state, empty state, and fallback mode.
2. Confirm release gates render pass, warn, and block states.
3. Confirm dry-run buttons append audit events only.
4. Confirm no real external action is available from UI.
5. Confirm mobile layout readability.
6. Confirm console is clean.
7. Confirm no public production endpoint is referenced.

Verification:

- Browser QA checklist in `devtools/chrome-mcp-dev-dashboard-qa.md`
- `pnpm dashboard:e2e`
- screenshots for desktop and mobile

Exit criteria:

- Dashboard is stable as a local-only operator surface.

## P1 Workstream 6: Kill Switch Design And Implementation

Goal:

Add safety kill switches before external integrations expand.

Dependencies:

- P0 baseline
- P0 safety freeze
- P1 dashboard hardening

Detailed tasks:

1. Define kill switch policy in docs first.
2. List switch categories: external send, cloud mutation, paid API, customer messaging, render/export, local AI public exposure.
3. Add dry-run switch state to control API.
4. Display switch state in dashboard.
5. Block risky dry-run actions when switch is off.
6. Add tests for blocked states.

Forbidden without approval:

- real external action blocking against production services
- deployment configuration changes
- cloud resource mutation

Verification:

- unit checks
- dashboard e2e
- manual dry-run blocked action test

Exit criteria:

- Kill switches exist locally and are test-covered.

## P1 Workstream 7: Human Approval Queue

Goal:

Create a local approval queue for risky or customer-facing actions.

Dependencies:

- kill switch design
- dashboard hardening

Detailed tasks:

1. Write approval queue spec.
2. Define queue item fields: id, source, action, risk level, status, requested by, approved by, timestamps, reason, evidence.
3. Add mock/local queue storage only.
4. Add dashboard approval queue view.
5. Require approval before any simulated customer-facing action.
6. Add tests for pending, approved, rejected, and blocked states.

Forbidden without approval:

- real customer messaging
- real CRM/LINE/YouTube sends
- database migrations
- production persistence

Verification:

- local tests
- browser e2e
- diff review for external calls

Exit criteria:

- Approval queue is functional in local dry-run mode.

## P1 Workstream 8: Solar Claim Guard

Goal:

Protect Solar Intelligence outputs from overclaiming savings, ROI, compliance, or approval status.

Dependencies:

- P0 baseline
- current solar app tests reviewed

Detailed tasks:

1. Review `docs/solar-energy-intelligence-phase-1.md`.
2. Review `apps/solar-intelligence` assumptions and blockers.
3. Add or confirm claim guard rules for ROI, PEA approval, anti-islanding, export limitation, BMS compatibility, and final quote status.
4. Ensure proposals label assumptions clearly.
5. Ensure final quotes require refreshed official sources and engineer sign-off.

Forbidden without approval:

- official-source scraping that violates terms
- customer-facing quote sending
- production pricing promises

Verification:

- `pnpm solar:check`
- `pnpm solar:test`
- targeted content review for forbidden claims

Exit criteria:

- Solar app cannot present assumptions as verified production facts.

## P1 Workstream 9: MCP And Connector Operating Rules

Goal:

Convert the connector map into enforceable operating guidance.

Dependencies:

- safety freeze

Detailed tasks:

1. Review `docs/mcp-and-connector-map.md`.
2. Define read-only, write, export, and destructive action classes.
3. Require explicit approval for GitHub PR/issue creation, Supabase writes, Notion/ClickUp/Drive writes, Figma/Canva exports, and browser actions involving authenticated workflows.
4. Add daily connector usage summary format.

Verification:

- policy review
- no connector writes during this task

Exit criteria:

- Connector usage is documented with clear approval gates.

## P2 Workstream 10: Level 2 Self-Evaluation Artifacts

Goal:

Create Level 2 self-evaluation docs from Level 1 artifacts without source code changes.

Dependencies:

- Level 1 commit complete
- baseline classification not blocked

Target files:

- `docs/knowledge/LEVEL_2_SELF_EVALUATION.md`
- `docs/knowledge/SUCCESS_PATTERNS.md`
- `docs/knowledge/FAILED_PATTERNS.md`
- `docs/knowledge/AGENTS_RULE_PROPOSALS.md`
- `brain/self-learning/evaluation-scorecard.md`

Verification:

- Markdown review
- no source code changes
- no runtime behavior changes
- no secrets included

Exit criteria:

- Level 2 docs exist and are safe to commit.

## P2 Workstream 11: Observability And Audit Trail

Goal:

Prepare local observability before staging or production approval.

Dependencies:

- dashboard hardening
- approval queue
- kill switches

Detailed tasks:

1. Define audit event schema.
2. Log dry-run actions locally.
3. Track release gate checks.
4. Track approval decisions.
5. Add dashboard view for recent audit events.
6. Document what must never be logged: secrets, raw customer private data, unmasked tokens.

Verification:

- local event tests
- no secret-like values in logs
- dashboard e2e

Exit criteria:

- Local audit trail exists for dry-run operations.

## P2 Workstream 12: Backup, Restore, Rollback Plan

Goal:

Document and test local rollback before staging.

Dependencies:

- baseline commit
- dashboard/API verification

Detailed tasks:

1. Document rollback steps for dashboard and API.
2. Document how to stop local stack.
3. Document how to disable risky actions.
4. Define backup scope for docs, configs, and local data.
5. Define restore verification.

Verification:

- stop/start test
- rollback doc review
- no secret archive committed

Exit criteria:

- Backup/restore/rollback process is documented and locally testable.

## P3 Workstreams: Expansion After Safety Gates

These are not first-line urgent tasks. Start only after P0/P1 gates pass.

- Production AI backend
- MySQL and Redis foundation
- n8n dry-run workflows
- Codex/Hermes auth isolation
- Image Gateway mock provider
- Local AI runtime gateway
- Creative Automation Studio
- After Effects MCP dry-run adapter
- MCP tool policy and audit log hardening
- GPU research lab and benchmark templates
- Cost guard
- Defensive security scan governance
- Ads/growth readiness dashboard
- Staging release
- Production approval gate

## Execution Order

1. P0 Workstream 1: Establish Git And Repo Baseline
2. P0 Workstream 2: Confirm Codex Mobile Host Control
3. P0 Workstream 3: Safety Gate Freeze
4. P0 Workstream 4: Local Verification Baseline
5. P1 Workstream 5: Developer Command Center Hardening
6. P1 Workstream 6: Kill Switch Design And Implementation
7. P1 Workstream 7: Human Approval Queue
8. P1 Workstream 8: Solar Claim Guard
9. P1 Workstream 9: MCP And Connector Operating Rules
10. P2 Workstream 10: Level 2 Self-Evaluation Artifacts
11. P2 Workstream 11: Observability And Audit Trail
12. P2 Workstream 12: Backup, Restore, Rollback Plan
13. P3 expansion work only after explicit approval

## Required Task Card Template

Every implementation task must start with:

```text
Goal:
Constraints:
File Scope:
Expected Result:
Verification:
Report Format:
```

## Required Report Format

Every task must end with:

```text
Summary:
Files changed:
Commands run:
Checks passed:
Checks failed:
Source code changes:
Runtime config changes:
Secrets included:
External actions:
Risks:
Next task:
Commit readiness:
```

## Approval Required Before Starting

The operator must explicitly approve before any of these actions:

- staging baseline files into a commit
- modifying source code
- editing `.gitignore`
- installing dependencies
- running migrations
- starting external services
- using SaaS connectors for writes
- creating GitHub PRs/issues
- pushing Git
- deploying
- using real credentials
- sending customer-facing messages
- triggering paid APIs

## Recommended Next Prompt

Use this prompt before the next implementation step:

```text
Read AGENTS.md first.

Mission:
Start P0 Workstream 1 from docs/knowledge/SIRINX_URGENT_BACKLOG_EXECUTION_PLAN.md.

Operate in inspect-and-plan mode first.
Do not modify files yet.
Do not read .env values.
Do not install dependencies.
Do not run migrations.
Do not stage or commit yet.

Output:
1. untracked file classification
2. files recommended to track
3. files recommended to ignore
4. files requiring operator review
5. exact safe baseline commit plan
```

## Current Recommendation

Do not start feature implementation yet. The urgent next action is to classify and baseline the existing untracked project files so future work can be reviewed safely.
