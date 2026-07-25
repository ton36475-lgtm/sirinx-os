# GhostClaw Dirty Tree Acceptance Queue - 2026-06-30

Status: local-safe inspection and commit queue only
Repo: `/Users/sirinx/sirinx-os`
Branch: `staging/godmode-master-os-v2`
Observed head: `aa66f26`
Observed ahead of origin: 33 commits
Observed at: `2026-06-30T13:25:10+0700`

## Purpose

This report converts the current mixed worktree into a reviewable acceptance
queue before any additional staging. It exists because the active GhostClaw
objective allows local work and scoped commits, but blocks broad staging,
push, deploy, provider calls, secret reads, global installs, and live sends.

## Current Worktree Counts

- Total changed paths: 85
- Modified or staged paths: 34
- Untracked paths: 51
- Approved-scope paths: 22
- Conditional-scope paths: 1
- Observed-only outside approved scope: 62
- Staged paths at inspection time: 0

## Approved Scope Queue

These paths are inside the objective's approved path rules. They still need
focused validation before they should be committed as product/runtime work.

Modified approved paths:

- `AUTONOMOUS_RUN_LOG.md`
- `GHOSTCLAW/workers/registry/worker-registry.json`
- `NEXT_ACTIONS.md`
- `PROJECT_STATE.md`
- `docs/knowledge/GHOSTCLAWS_SUB_AGENT_TEAM.md`
- `docs/knowledge/KIMI_K2_7_CODE_GHOSTCLAW_WORKER.md`
- `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_PREFLIGHT_AUDIT_2026-06-29.md`
- `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_TRANSITION_GUARD_2026-06-29.md`
- `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md`
- `docs/knowledge/SIRINX_LATENTMAS_GHOSTCLAW_INTEGRATION.md`

Untracked approved paths:

- `GHOSTCLAW/KANBAN.md`
- `GHOSTCLAW/merch_automation_dashboard_v1/`
- `docs/knowledge/GHOSTCLAW_A2A_QUEUE_COORDINATION_RUN_20260630.md`
- `docs/knowledge/GHOSTCLAW_A2A_SYNC_START_COMPLETION_AUDIT_20260630.md`
- `docs/knowledge/GHOSTCLAW_EXTERNAL_REPO_A2A_SYNC_RUN_20260630.md`
- `docs/knowledge/GHOSTCLAW_SKILL_IMPORT_POLICY.md`
- `docs/knowledge/HERMES_FULL_AUTO_MAC_MINI_M2_SYSTEM.md`
- `docs/knowledge/KREA2_OPEN_WEIGHTS_WORKFLOW.md`
- `docs/knowledge/KREA2_RAW_TO_LORA_TO_TURBO.md`
- `docs/knowledge/SIRINX_CODEX_NO_MCP_A2A_SIDEBAR_RUNBOOK_2026-06-30.md`
- `docs/knowledge/TAURI_FOR_GHOSTCLAW_LOCAL_CONTROL_APP.md`
- `docs/knowledge/merch_automation_dashboard_v1/`

## Conditional Scope

- `pnpm-workspace.yaml`

This file is conditionally approved only if the diff is already present,
required for existing tests, and does not introduce a new dependency without
lockfile-bound justification. It must be reviewed separately before staging.

## Observed-Only Groups

These groups are not in the active objective's approved path list. They must
not be staged by broad commands until a separate gate explicitly covers them.

- `WORKSPACE_SCAFFOLD/tests/**`: local test harness changes and new tests.
- `_A2A_QUEUE/**`: queue packets, outbox items, and a push-gate packet.
- root-level planning files such as `PLAN_*`, `FINAL_REPORT_*`, `MODEL_ROUTER.md`, and `SUP_AGENTS.md`.
- `_OBSIDIAN_GHOSTCLAW_BRAIN/**`: brain mirror artifacts, separate from the canonical Obsidian digest.
- `docs/ghostclaw/**`: new GhostClaw docs outside the approved `docs/knowledge/**` path.
- `scripts/**` and `scripts/ghostclaw/**`: executable/support scripts outside the approved script scope.

## Gate Notes

- `GATE-PUSH-004-20260630-001.json` was observed, but push remains hard-blocked.
- No install, curl-pipe-bash, provider call, secret read, model download, GPU inference, deploy, push, Telegram live send, customer send, or cloud mutation was authorized by this report.
- This report is safe to commit with its receipt because it is governance documentation plus local receipt evidence only.

## Validation For This Report

- `python3 -m json.tool` passed for the dirty-tree receipt and final receipt.
- Scoped `git diff --check` passed for this report, its receipt, and the final receipt refresh.
- Scoped secret-pattern scan returned no matches.
- `GHOSTCLAW/receipts/final-receipt-validator.mjs` returned `ok: true`.
- AutoApproveEngine approved scoped local commit as Tier B with decision receipt `.ghostclaw_runtime/a2a2a/receipt_decision-local-commit-dirty-tree-acceptance-queue-20260630-001.json`.

## Next Safe Bundle Order

1. Commit this acceptance queue and receipt only.
2. Review the approved modified GhostClaw docs/registry bundle with focused diff checks and JSON validation.
3. Review the approved untracked docs bundle separately, starting with the smaller Markdown-only files.
4. Hold `pnpm-workspace.yaml`, `_A2A_QUEUE/**`, `WORKSPACE_SCAFFOLD/**`, root planning files, and scripts for separate gates.
5. Keep push/deploy/provider/secret/install/live-send gates closed.
