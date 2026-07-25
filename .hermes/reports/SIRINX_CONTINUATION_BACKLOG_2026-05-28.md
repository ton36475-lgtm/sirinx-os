# SIRINX Continuation Backlog - 2026-05-28

Generated: 2026-05-28 02:07:01 +0700
Mode: local-only, evidence-only, no external mutation
Workspace: /Users/sirinx/sirinx-os

## Purpose

This report refreshes the old pending work from prior chats into one current continuation surface.
It is based only on local evidence that is readable on this Mac and current command output from
the SIRINX workspace. It does not claim complete coverage of every ChatGPT chat unless a real
ChatGPT export or connector-backed source is provided later.

## Hard Stop Rules

- No full Mac scan.
- No secrets in chat, logs, Obsidian, reports, prompts, screenshots, or commits.
- No deploy, push, publish, provider call, connector activation, message send, or production mutation.
- No install, repo clone, MCP registration, or gateway restart without an exact approval packet.
- Source-code implementation remains gated by `APPROVE_IMPLEMENTATION`.
- External lanes are handled one gate at a time.

## Current Baseline

| Area | Current status | Evidence |
| --- | --- | --- |
| Primary system | SIRINXDev Unified Agent-Native Monorepo / Hermes Sovereign Orchestrator | `.hermes/context.md`, `.hermes/state.json`, docs/spec files |
| Hermes model policy | Host config set to OpenRouter `qwen/qwen3.7-max` with `model.context_length=1000000` | `.hermes/reports/MODEL_POLICY_STATUS.md` |
| Night Watch | Completed with `WARN`, exit code 0, log synced to Obsidian | `pnpm night-watch`, `.hermes/logs/night-watch-latest.md`, `.hermes/reports/NIGHT_WATCH_STATUS.md` |
| Telegram callback semantics | `OK`/`WARN` treated as non-blocking; `FAILED` remains failure | `.hermes/reports/NIGHT_WATCH_STATUS.md` |
| Validator Shield | Locked local validator exists and blocks hardcoded keys/dangerous actions | `.hermes/reports/VALIDATOR_SHIELD_STATUS.md` |
| Local dashboard/API | API online at `8711`; dashboard online at `8710`; solar/site previews offline | `pnpm stack:status`, `pnpm dashboard:status` |
| n8n | Port `5678` reachable through local runtime; `n8n` CLI missing | `.hermes/reports/N8N_MCP_STATUS.md` |
| n8n-mcp | Command available at `/opt/homebrew/bin/n8n-mcp`; not registered into Hermes | `.hermes/reports/N8N_MCP_STATUS.md` |
| External gates | 5 gates blocked by incomplete evidence; 0 executable now | `pnpm external-gates:evidence-check`, `pnpm external-gates:runner`, `pnpm external-gates:check` |
| Git state | `sirinx-os` has existing local changes/untracked work; public website worktree clean | `git status --short`, external gate readiness output |

## Research-Grade Addendum

Added 2026-05-28 02:22 +0700:

- `docs/research/HERMES_SOVEREIGN_ORCHESTRATOR_RESEARCH_EXECUTION_PACKET.md`
- `docs/research/N8N_MCP_EVALUATION_PROTOCOL.md`
- `docs/knowledge/external-gates/EVIDENCE_COLLECTION_PROTOCOL.md`
- `docs/agents/SIRINX_AGENT_TEAM_TOPOLOGY.md`
- `docs/agents/SIRINX_VIBE_CODING_AGENT_ROLE_CONFIG.md`
- `.hermes/agents/sirinx-agent-team.manifest.draft.json`
- `docs/knowledge/SIRINX_VIBE_CODING_GODMODE_COMMAND_LEDGER_2026-05-28.md`
- `docs/superpowers/plans/2026-05-28-vibe-coding-godmode-continuation.md`
- `.hermes/reports/VIBE_CODING_GODMODE_STATUS.md`
- `docs/knowledge/SIRINX_GODMODE_FULL_CONTINUATION_DOSSIER_2026-05-28.md`
- `docs/agents/SIRINX_SUBAGENT_ALL_NODE_RUNTIME_CONFIG_2026-05-28.md`
- `.hermes/reports/GODMODE_AUTONOMOUS_CONTINUATION_PASS_2026-05-28.md`

These artifacts define the automatic safe-work sequence, n8n MCP evaluation protocol, external evidence handling rules, and full SIRINX agent-team role topology without activating MCP, dispatching agents, or modifying source code.

## Vibe Coding Godmode Pass

Added 2026-05-28 02:27 +0700:

- Consolidated old commands into a command ledger covering Night Watch, Validator Shield, model policy, n8n status, external gates, and implementation approval gates.
- Created an approval-ready implementation plan for the first safe local source slice: `n8n permission policy display`.
- Updated `.hermes/state.json`, `.hermes/context.md`, the Obsidian continuation board, and the AI HQ digest.
- Source-code implementation remains blocked until exact `APPROVE_IMPLEMENTATION for n8n permission policy display`.

## Automatic Continuation Pass

Added 2026-05-28 02:34 +0700:

- Refreshed stack, dashboard, external gates, validator, secret scan, external readiness, and Night Watch command evidence.
- Created a full continuation dossier that reviews the old work from the current local evidence base.
- Created an all-node subagent runtime config covering control, planning, build, verification, runtime, workflow, security, and knowledge nodes.
- Confirmed API/dashboard are online, Night Watch is `WARN`, external gates remain blocked, and source implementation remains gated.

## Completed Since The Old Continuation Board

1. Night Watch is no longer the old pnpm fetch/hang blocker in the latest run. It now writes logs and exits 0 with `WARN`.
2. Night Watch callback classification is patched so `WARN` is a success-with-warning path.
3. Validator Shield is implemented locally and wired into workspace verification.
4. Hermes 1M-context configuration was applied for Qwen deep-planner/reviewer lanes with config backup.
5. Godmode Agent Lab v4 reports exist for audit, model policy, validator, n8n-mcp, local project index, and toolchain status.
6. External gate runner confirms all risky lanes are still blocked, which is the correct safe state.

## Priority Workstream Board

| Priority | Workstream | Status | Blocker | Allowed next action | Blocked actions |
| --- | --- | --- | --- | --- | --- |
| P0 | Codex Mobile QR/MFA pairing | Blocked by human evidence | Missing same ChatGPT account/workspace confirmation, Mac host online evidence, MFA/SSO/passkey completion | Operator completes official QR/MFA flow, then evidence file can be checked | Bypass QR/MFA, pair unknown host, assume workspace identity |
| P0 | GitHub publish target | Blocked by external target evidence | Missing owner/repo, remote URL, branch/base branch, PR title/body | Fill non-secret evidence labels only | `git remote add`, `git push`, `gh pr create` |
| P0 | Telegram/LINE recipient/token | Blocked by credential/recipient evidence | Missing token ownership/rotation, recipient, recipient joined/messaged bot, LINE scope | Record non-secret recipient/scope facts; keep token value out of files | Telegram smoke send, LINE send, role messaging enable |
| P0 | Solis read-only telemetry | Blocked by consent/scope evidence | Missing consent, credential storage path, station mapping, read-only smoke scope | Record consent and non-secret station mapping metadata | Solis login/API call, inverter control, battery dispatch |
| P0 | Cloudflare bot management review | Blocked by zone/permission evidence | Missing Cloudflare zone and permission scope | Record zone/scope, candidate rule, rollback, smoke matrix | WAF/Bot/DNS/Access/Pages mutation |
| P1 | n8n/n8n-mcp bridge | Permission policy and evaluation protocol drafted, not activated | `n8n` CLI missing; host Node is outside npm-supported n8n range; no register approval | Review draft policy/eval; optionally approve API/dashboard display only | Install n8n, register MCP, mutate workflows |
| P1 | Monorepo Phase 0 | Security audit packet created | Source-code work needs exact `APPROVE_IMPLEMENTATION`; repo is dirty | Select exact next implementation target or continue docs-only permission policy | Scaffold/refactor/source edits without exact approval |
| P1 | Agent Team / Vibe Coding | Draft topology and role config created | Live dispatch and source implementation still require exact approval | Review draft manifest; approve one display/API target if needed | Auto-dispatch agents, modify source, start MCP, call providers |
| P1 | Agent Repo Lab | Not cloned | Requires exact repo-lab approval and sandbox rules | Prepare candidate intake manifest only | Clone, install, run third-party repos |
| P1 | Solar Intelligence product lane | Deferred until control plane stable | Current external gates and local stack baselines first | Review existing API/UI status after gates | Deploy/publish/customer-visible changes |
| P2 | MySecondBrain A2A lane | Preview-first | Execution gates for Claude/A2A remain closed | Recheck status/endpoints read-only later | `--execute`, provider calls, external message sends |
| P2 | OZ-CORP-MONOREPO triage | Pending | Separate dirty-tree inventory needed | Read-only inventory and commit grouping later | Revert, delete, deploy, push |
| P2 | Public website lane | Public repo clean | Production mutation requires target approval | Read-only smoke/status only | Deploy/publish/DNS/Cloudflare mutation |

## Detailed Next Slices

### Slice 1 - External Evidence Gates

Goal: make one blocked gate ready for human review without exposing secrets or executing it.

Recommended order:

1. `codex-mobile-qr-mfa` because it unlocks mobile operator review.
2. `cloudflare-bot-management-review` because only one evidence item is missing.
3. `sirinx-os-github-publish` only after branch/remote/PR target is explicitly named.
4. `telegram-line-recipient-token` only after token ownership and recipient are confirmed without printing the token.
5. `solis-readonly-telemetry` only after customer/site consent and read-only scope are recorded.

Codex can update evidence files only from explicit non-secret facts provided by the operator.

### Slice 2 - n8n Capability Manifest

Goal: create a local read-only manifest for the available `n8n-mcp` bridge and current n8n reachability.

Status: completed as `.hermes/reports/N8N_CAPABILITY_MANIFEST_2026-05-28.md`.

Allowed:

- Read `n8n-mcp --help`.
- Read local HTTP headers/status from `127.0.0.1:5678`.
- Record tool/capability names and blocked actions.

Blocked:

- Installing n8n.
- Registering `n8n-mcp` into Hermes.
- Reading API keys.
- Mutating workflows.

### Slice 3 - Monorepo Phase 0 Security Freeze

Goal: convert current local reports into a phase-0 security audit packet.

Status: completed as `docs/migrations/SECURITY_AUDIT.md`.

Allowed:

- Docs-only consolidation.
- Secret-scan results summary.
- Dependency and permission matrix draft.
- Registry of existing local-only scripts and gate commands.

Blocked:

- Source-code implementation without `APPROVE_IMPLEMENTATION`.
- Importing external repos.
- GitHub push or PR creation.

### Slice 4 - Product Lanes

Resume after the control plane remains stable:

- Solar Intelligence quotation/ROI workflow.
- MySecondBrain local office/A2A preview.
- Public website evidence and CSP review.
- OZ-CORP dirty-tree triage.
- Media Evidence Factory and GhostClaws content lanes.

## Required Operator Decisions

| Decision | Exact input needed | Why |
| --- | --- | --- |
| Continue source implementation | `APPROVE_IMPLEMENTATION` plus one named target | Required by spec-first swarm gate |
| Clone Agent Repo Lab | Exact repo-lab approval plus candidate list | Avoid unbounded third-party code intake |
| Install n8n locally | Exact n8n install approval | Installs can mutate runtime/dependencies |
| Register n8n-mcp into Hermes | Exact MCP registration approval | MCP changes expand tool permissions |
| Send Telegram/LINE smoke | Recipient and token ownership evidence, then exact send approval | Prevent accidental external messaging |
| Push/publish/deploy | Repo/remote/branch/rollback evidence, then exact approval | Prevent production mutation |

## Research Sources Checked

- MCP Tools specification: tools can be discovered/called by models, should preserve human-in-loop, and annotations are untrusted unless from trusted servers.
- n8n official MCP docs: instance-level MCP can search, interact with, trigger/test, create/edit workflows/data tables; individual workflow exposure is required, but search previews may span accessible workflows.
- n8n-mcp README: n8n-mcp is useful for n8n node documentation/properties/operations, and production workflows should not be edited directly with AI.

## Commands Run In This Refresh

- `pnpm night-watch`
- `pnpm stack:status`
- `pnpm dashboard:status`
- `pnpm pending-work:check`
- `pnpm external-gates:evidence-check`
- `pnpm external-gates:runner`
- `pnpm external-gates:check`
- `git status --short`

## Result

The safe continuation state is healthy enough to continue locally, but not approved for any external mutation.
The next practical work item is either:

1. Have the operator complete Codex Mobile QR/MFA evidence, then update `docs/knowledge/external-gates/evidence/codex-mobile-qr-mfa.md`; or
2. Approve a local API/dashboard display of the n8n MCP permission policy with `APPROVE_IMPLEMENTATION for n8n permission policy display`; or
3. Fill the single missing Cloudflare zone/scope evidence item if the operator can provide non-secret zone/scope labels.
4. Choose a named target for `APPROVE_IMPLEMENTATION` if source/API/dashboard changes should resume.
