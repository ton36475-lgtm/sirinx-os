# GhostClaw External Repo Install Risk Review

Date: 2026-06-30
Mode: local-only quarantine review
Status: install blocked pending explicit approval

## Scope

This review covers the two external repositories requested for GhostClaw A2A/Codex sidebar work:

- `Yeachan-Heo/oh-my-opencode-lite`
- `Yeachan-Heo/Agent-Blackbox`

Both repos are present only in quarantine under `.ghostclaw_runtime/a2a2a/external_repos/`. This review did not run package installation, `npx`, `bunx`, postinstall scripts, daemon startup, OpenCode plugin writes, provider/model calls, browser automation, deploys, pushes, or secret reads.

## Evidence Read

- `.ghostclaw_runtime/a2a2a/state/external_repo_intake_20260629T235649_695832Z.json`
- `.ghostclaw_runtime/a2a2a/external_repos/oh-my-opencode-lite/package.json`
- `.ghostclaw_runtime/a2a2a/external_repos/oh-my-opencode-lite/postinstall.mjs`
- `.ghostclaw_runtime/a2a2a/external_repos/oh-my-opencode-lite/docs/guide/installation.md`
- `.ghostclaw_runtime/a2a2a/external_repos/oh-my-opencode-lite/LICENSE.md`
- `.ghostclaw_runtime/a2a2a/external_repos/Agent-Blackbox/package.json`
- `.ghostclaw_runtime/a2a2a/external_repos/Agent-Blackbox/e2e/package.json`
- `.ghostclaw_runtime/a2a2a/external_repos/Agent-Blackbox/README.md`

## Repo 1: oh-my-opencode-lite

Quarantine path: `.ghostclaw_runtime/a2a2a/external_repos/oh-my-opencode-lite`

Observed metadata:

- Branch/head: `dev` / `35797ff`
- Package: `oh-my-opencode@4.3.1`
- License: `SUL-1.0`
- Runtime family: Bun/Node/OpenCode plugin ecosystem
- Postinstall script: present

Install risk findings:

- The installer guidance prefers `bunx oh-my-openagent install`.
- The install guide asks for subscription/provider choices and authentication planning.
- The install flow may register an OpenCode plugin and write OpenCode config.
- Anonymous telemetry is documented as enabled by default unless disabled by environment variables.
- `postinstall.mjs` runs during package install and shells out to `opencode --version` if OpenCode is present.
- Package scripts include build, prepare, postinstall, prepublish, test, typecheck, and binary build paths.
- Source references plugin config, MCP/runtime injection, model provider selection, OpenCode rules, and hook surfaces.

Required gate before install:

- `APPROVE_INSTALL_OH_MY_OPENCODE_LITE_QUARANTINE`

Minimum safe install conditions:

- Use an isolated throwaway directory, not the active repo root.
- Set telemetry-off environment variables before any package execution.
- Disable automatic provider auth and skip any live model/provider setup.
- Use no global OpenCode config write unless separately approved.
- Capture before/after file inventory for `~/.config/opencode`, project `.opencode`, and quarantine path.
- Run only read-only doctor/help checks first.
- Keep SUL-1.0 license constraints visible before any business or redistribution use.

Current decision:

`install_blocked_pending_gate`

## Repo 2: Agent-Blackbox

Quarantine path: `.ghostclaw_runtime/a2a2a/external_repos/Agent-Blackbox`

Observed metadata:

- Branch/head: `main` / `d1eb1d0`
- Package: `agent-blackbox-monorepo@0.0.0`
- License: no package/license metadata confirmed in root `package.json`
- Runtime family: Node/Vite/Vitest/daemon/dashboard/OpenCode and Claude Code adapters
- Postinstall script: none observed in root package metadata

Install risk findings:

- README quickstart uses `npx @taewooopark/agent-blackbox up`.
- The OpenCode path can write a recorder into OpenCode plugin locations.
- The daemon/dashboard path starts local services and opens a local UI.
- The Claude Code path tails existing transcript locations.
- The optimize path can write memory blocks into `CLAUDE.md` or `AGENTS.md`.
- The daemon writes local trace, baseline, optimization, and project rule artifacts.
- The e2e harness depends on Playwright and is intentionally outside the root workspace.

Required gate before install:

- `APPROVE_INSTALL_AGENT_BLACKBOX_QUARANTINE`

Minimum safe install conditions:

- Use `--project` or an isolated project-scoped path before any global OpenCode recorder.
- Use `--no-open` for first daemon smoke to avoid browser side effects.
- Keep optimize/apply features disabled until a separate memory-write approval exists.
- Capture exact ports and process IDs before and after daemon start.
- Confirm where transcript and event logs will be read/written.
- Confirm root license status before any redistribution or client-delivery use.
- Use no provider suggestion mode unless it is local-only and explicitly approved.

Current decision:

`install_blocked_pending_gate`

## Shared Policy Decision

Both repos remain useful candidates for GhostClaw A2A/Codex sidebar work, but neither should be installed from the active repo without a gate-specific approval packet.

Allowed now:

- Read-only metadata review
- Local quarantine inventory
- A2A intake packets
- Ack receipts
- Risk documentation

Blocked now:

- Package install
- `bunx`, `npx`, `npm install`, or equivalent execution
- Postinstall execution
- Global plugin write
- Provider/model auth
- Paid/free provider calls
- Secret reads
- Daemon/dashboard launch
- Browser automation
- Telegram/customer live send
- Deploy or push

## Next Safe Action

Create two gate-specific approval packets, one per repo, with exact command, exact working directory, telemetry setting, expected file writes, rollback plan, and stop conditions. Do not combine both installs into one broad approval.
