# GhostClaw A2A Sync Start Completion Audit - 2026-06-30

Status: `pass` / `LOCAL_SAFE_A2A_SYNC_STARTED`

Scope: `/ghostclaw-a2a-sync-start` for `/Users/sirinx/sirinx-os`.

Audit timestamp: `2026-06-30T00:23:41Z`.

This audit records what can be claimed from local evidence after the Codex-side
local worker run. The local file-bus path is started and verified for safe
runtime coordination. This does not open external/provider/MCP/install gates.

## Completion Decision

Full local-safe objective status: PASS.

Do not extend this pass to production, provider-backed agents, live connectors,
external repository installs, deploy, push, or customer-send behavior.

Hermes and KOB now run deterministic local role workers in tmux and write
role-specific receipts. A2A Sync now runs a deterministic local bus watcher in
tmux and writes bus-level ack receipts. The Codex desktop current session was
the control surface; no recursive Codex CLI/provider launch was performed.

## Requirement Audit

| Requirement | Current status | Evidence | Limitation |
| --- | --- | --- | --- |
| Active goal read | PASS | `/Users/sirinx/.codex/attachments/abf0881e-5fff-4ef9-9b02-4c95067de0d8/goal-objective.md` | None. |
| Preflight and dirty repo observed | PASS | `git status --short --branch` showed branch `staging/godmode-master-os-v2` with existing dirty/untracked files | Dirty files were preserved; no unrelated revert was attempted. |
| Runtime folders normalized | PASS | `.ghostclaw_runtime/a2a2a/inbox/`, `outbox/`, `receipts/`, `logs/`, `pids/`, `state/` | File-bus folders only; no cloud or provider runtime. |
| Hermes worker started | PASS | tmux session `ghostclaw-hermes`; command `python3 scripts/ghostclaw_a2a_role_worker.py --root . --agent hermes --loop --interval 2`; `.ghostclaw_runtime/a2a2a/state/hermes.json` has `local_worker=true` and `probe_only=false` | Deterministic local commander/router only; no provider-backed intelligence. |
| KOB worker started | PASS | tmux session `ghostclaw-kob`; command `python3 scripts/ghostclaw_a2a_role_worker.py --root . --agent kob --loop --interval 2`; `.ghostclaw_runtime/a2a2a/state/kob.json` has `local_worker=true` and `probe_only=false` | Deterministic local safety-verdict worker only; no provider-backed intelligence. |
| A2A sync loop started | PASS | tmux session `ghostclaw-a2a-sync`; command `python3 scripts/ghostclaw_a2a_bus_watcher.py --root . --loop --interval 2`; `.ghostclaw_runtime/a2a2a/state/a2a-sync.json` has `local_worker=true` and `probe_only=false` | Acknowledges JSON envelopes only; does not execute payloads. |
| Ping packets sent | PASS | `.ghostclaw_runtime/a2a2a/inbox/hermes/A_codex_to_hermes_20260629T235002.549637Z.json`, `.ghostclaw_runtime/a2a2a/inbox/kob/B_codex_to_kob_20260629T235002.549637Z.json`, `.ghostclaw_runtime/a2a2a/inbox/codex/C_hermes_to_codex_20260629T235002.549637Z.json`, `.ghostclaw_runtime/a2a2a/inbox/opencode/E_codex_to_sidebar_opencode_20260629T235002.549637Z.json` | Packets prove local file writes, not real sidebar intelligence. |
| Ack receipts observed | PASS | `.ghostclaw_runtime/a2a2a/receipts/hermes_route_A_codex_to_hermes_buswatcher_20260630T004445_889087Z.json`, `.ghostclaw_runtime/a2a2a/receipts/kob_verdict_B_codex_to_kob_buswatcher_20260630T004445_889087Z.json`, `.ghostclaw_runtime/a2a2a/receipts/bus_ack_opencode_E_codex_to_sidebar_opencode_buswatcher_20260630T004445_889087Z.json` | Receipts are local-only and do not execute payloads. |
| Required final receipt written | PASS | `.ghostclaw_runtime/a2a2a/receipts/a2a_sync_start_20260630T004643_947615Z.json` has `status: pass` and `mode: LOCAL_SAFE_A2A_SYNC_STARTED` | Pass is scoped to local-safe runtime only. |
| Codex no-MCP path verified | PASS, partial | `scripts/codex_no_mcp_a2a_sidebar.sh`; `.ghostclaw_runtime/a2a2a/receipts/codex_no_mcp_sidebar_20260630T001124_796529Z.json`; `.ghostclaw_runtime/a2a2a/state/codex-no-mcp-sidebar-probe.json` | Verifies isolated `CODEX_HOME` has no MCP servers; does not fix this desktop thread. |
| External repos reviewed | PASS, quarantine only | `.ghostclaw_runtime/a2a2a/external_repos/oh-my-opencode-lite`, `.ghostclaw_runtime/a2a2a/external_repos/Agent-Blackbox`, `docs/knowledge/GHOSTCLAW_EXTERNAL_REPO_INSTALL_RISK_REVIEW_20260630.md` | Installs remain blocked pending explicit approval gates. |

## Follow-Up Entrypoint Verification

Latest verifier state: `.ghostclaw_runtime/a2a2a/state/entrypoint-verification-latest.json`.

Latest sync-start state: `.ghostclaw_runtime/a2a2a/state/a2a-sync-start-latest.json`.

Verifier script: `scripts/ghostclaw_a2a_entrypoint_verifier.py`.

Test coverage: `WORKSPACE_SCAFFOLD/tests/test_ghostclaw_a2a_entrypoint_verifier.py`.

Fallback probe retained: `scripts/ghostclaw_a2a_sync_probe.py`.

Current verifier result:

- `status=ready_for_live_start_review`
- `hermes_real_entrypoint_found=true`
- `kob_real_entrypoint_found=true`
- `a2a_sync_startable_sidecar_found=true`
- `current_sessions_are_probe_only=false`

This moves the earlier blocker to a local receipt-backed pass for the local-safe
runtime lane.

## External Repo Install Boundary

The requested repositories were handled as local quarantine intake only:

- `oh-my-opencode-lite`: shallow clone recorded under `.ghostclaw_runtime/a2a2a/external_repos/oh-my-opencode-lite`; install not executed.
- `Agent-Blackbox`: shallow clone recorded under `.ghostclaw_runtime/a2a2a/external_repos/Agent-Blackbox`; install not executed.

Current install state: `install_blocked_pending_gate`.

Required explicit approval gates before any package install, postinstall,
global plugin write, daemon launch, or provider-backed run:

- `APPROVE_INSTALL_OH_MY_OPENCODE_LITE_QUARANTINE`
- `APPROVE_INSTALL_AGENT_BLACKBOX_QUARANTINE`

## Verified Safe Behavior

- Local A2A role workers and bus watcher write receipts with `local_worker=true`
  and `probe_only=false`.
- Worker receipts record no payload execution, paid model calls, secret access,
  cloud mutation, external message send, package install, git push, or deploy.
- No-MCP helper uses an isolated `CODEX_HOME` and does not mutate global Codex
  MCP configuration.
- Existing dirty user/workspace files were left in place.

## Current Blockers

- Linear, Notion, and Figma MCP auth remains unresolved in the normal Codex
  environment.
- The no-MCP launch command was printed and verified as a path, but the
  interactive Codex sidebar session was not launched automatically.
- Provider-backed external agent intelligence was not launched; the pass is for
  deterministic local file-bus coordination only.
- Third-party repo installation is still blocked pending explicit approval gates
  and license/postinstall review.

## Next Safe Action

Choose one lane:

1. Use the local workers as the Codex-side A2A sync runtime for safe local queue
   coordination.
2. Refresh Linear/Notion/Figma MCP auth only if connector-backed work is needed.
3. Approve one exact quarantine install gate if the next step is to inspect and
   install either external repository locally.
