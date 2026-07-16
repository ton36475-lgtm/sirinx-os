# MaxPlus Hermes Codex Claude OpenCode Local Gate Packet

Date: 2026-07-09

Status: `LOCAL_GATE_PACKET_READY`

Repository: `/Users/sirinx/sirinx-os`

Branch observed: `feat/sirinx-web-line-trust-v1`

## Purpose

Create a local-safe decision packet before any PATH wiring, config write,
installer execution, Hermes update, GitHub auth, provider smoke test, or live
automation.

This packet is intentionally documentation-only. It records the current local
toolchain state and splits the next actions into separate gates so the operator
can decide one action at a time.

## Current Safety Boundary

The active boundary remains:

```text
dry_run=true
live_send=false
provider_call=false
external_message_send=false
deploy=false
push=false
remote_mutation=false
destructive_ops=false
secret_read=false
secret_print=false
installer_execution=false
```

## Read-Only Evidence Used

| Evidence | Result |
| --- | --- |
| MaxPlus Hermes guide, Chrome read-only inspection | Page describes Hermes Agent, Claude Code, Codex CLI, Claude Cowork, opencode, GitHub source, config files, and installer patterns. No installer was run. |
| Existing MaxPlus gate docs | `docs/ghostclaw/MAXPLUS_HERMES_PROVIDER_CALL_GATE.md`, `docs/ghostclaw/MAXPLUS_HERMES_RUNTIME_GATE_EXECUTOR.md`, and `docs/ghostclaw/MAXPLUS_HERMES_ADVANCED_FEATURE_GATES.md` preserve separate gates for installer review, config write, provider smoke, gateway, cron, subagents, and MCP. |
| Local CLI availability check | Tool binaries were checked by path/version only. |
| Hermes install repo check | Git remote, branch status, and HEAD were inspected without pull/update. |
| Secret handling | No `.env` values, API keys, tokens, browser cookies, or auth files were read or printed. |

## Local Toolchain Snapshot

| Tool | Observed path | Version/status | Gate interpretation |
| --- | --- | --- | --- |
| Codex CLI | `/Users/sirinx/.local/bin/codex` | `codex-cli 0.142.5` | Installed and PATH-resolved. No config or auth change performed. |
| Hermes | `/Users/sirinx/.local/bin/hermes` | `Hermes Agent v0.18.2 (2026.7.7.2)` | Installed and PATH-resolved. Update is still gated. |
| Hermes install repo | `/Users/sirinx/.hermes/hermes-agent` | `main...origin/main [behind 31]` with local modifications and untracked files | Dirty and behind. Do not run `hermes update`, `git pull`, or reinstall without a backup/review gate. |
| Hermes remote | `https://github.com/NousResearch/hermes-agent.git` | Fetch/push remote observed | Read-only evidence only. No GitHub write performed. |
| Hermes repo HEAD | `8e734810d fix(desktop): continue the selected stored session instead of minting a new one (#55578) (#60874)` | Local repo HEAD observed | Evidence only. |
| Claude Code | `/Users/sirinx/.local/bin/claude` | `2.1.139 (Claude Code)` | Installed and PATH-resolved. No auth/config write performed. |
| Claude Code alias | `/Users/sirinx/.local/bin/claudecode` | `2.1.139 (Claude Code)` | Installed alias. No auth/config write performed. |
| OpenCode | `/Users/sirinx/.local/bin/opencode` | `1.17.11` | Installed and PATH-resolved. No provider config or call performed. |
| GitHub CLI | `/opt/homebrew/bin/gh` | `gh version 2.92.0 (2026-04-28)` | Installed. Auth status and write actions remain gated. |
| `cowok` | Not found in PATH | No binary observed | Treat as planned/unknown until a separate discovery gate is opened. |

## Hermes Dirty Worktree Risk

Hermes local repo currently contains local modifications and untracked files:

```text
M hermes_cli/web_server.py
M plugins/platforms/line/adapter.py
?? .install_method
?? hermes_cli/web_server.py.orig
?? plugins/platforms/line/sirinx/
?? scripts/verify-runtime-local.sh
?? skills/create-voltagent/
?? skills/voltagent-best-practices/
?? skills/voltagent-core-reference/
?? skills/voltagent-docs-bundle/
?? tests/gateway/test_launchd_shutdown_guard.py
?? tests/gateway/test_sirinx_line_bot.py
?? tests/gateway/test_sirinx_line_webhook_dry_run.py
```

Because the repo is both dirty and behind upstream, a blind update could
overwrite or conflict with local SIRINX/Hermes work. Update and reinstall remain
closed until a dedicated review/backup gate exists.

## Explicit Non-Approvals

This packet does not approve:

- Running `curl | bash` installer commands.
- Running MaxPlus or Hermes one-line install scripts.
- Reading or writing `~/.hermes/.env`, `.env`, API keys, auth tokens, or browser cookies.
- Editing `~/.hermes/config.yaml`, `~/.claude/settings.json`, `~/.codex/config.toml`, `~/.codex/auth.json`, or OpenCode provider config.
- Running `hermes update`, `git pull`, reinstall, Homebrew install, or package install.
- Running a paid/provider smoke test.
- Running Telegram, LINE, Discord, Signal, worker, webhook, cron, or MCP live activation.
- Running GitHub auth, creating PRs/issues, pushing, merging, or deploying.

## Gate Matrix

| Gate | Default | Purpose | Required exact approval |
| --- | --- | --- | --- |
| PATH review | Closed | Inspect current shell PATH and tool resolution without editing files. | `APPROVE_MAXPLUS_PATH_REVIEW_ONLY_20260709` plus exact read-only command. |
| PATH wire | Closed | Persistently wire missing CLI paths into shell config. | `APPROVE_MAXPLUS_PATH_WIRE_LOCAL_SHELL_<target>_20260709` plus exact target file and exact command/patch. |
| Hermes config metadata review | Closed | Inspect whether config files exist and permissions are sane, without printing secret values. | `APPROVE_HERMES_CONFIG_METADATA_REVIEW_20260709` plus exact command. |
| Hermes private config write | Closed | Write or update private Hermes provider config. | `APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1` plus exact file targets and secret-loading plan. |
| MaxPlus installer read-only review | Closed | Download installer to a temp path, compute SHA-256, and inspect text without execution. | `APPROVE_REVIEW_HERMES_INSTALLER_ONLY_20260709` plus exact download/read commands. |
| MaxPlus installer execution | Closed | Execute installer after review. | `APPROVE_EXECUTE_HERMES_INSTALLER_AFTER_REVIEW_20260709` plus prior installer review, rotated local env key plan, and rollback owner. |
| Hermes dirty repo backup/review | Closed | Snapshot local Hermes modifications before update. | `APPROVE_HERMES_DIRTY_REPO_BACKUP_REVIEW_20260709` plus exact backup/read-only diff commands. |
| Hermes update | Closed | Update Hermes from upstream. | `APPROVE_HERMES_UPDATE_AFTER_BACKUP_20260709` plus exact update command and rollback plan. |
| Claude Code config review | Closed | Inspect config metadata only. | `APPROVE_CLAUDE_CODE_CONFIG_METADATA_REVIEW_20260709` plus exact command. |
| Codex config review | Closed | Inspect config metadata only. | `APPROVE_CODEX_CONFIG_METADATA_REVIEW_20260709` plus exact command. |
| OpenCode config review | Closed | Inspect provider config metadata only. | `APPROVE_OPENCODE_CONFIG_METADATA_REVIEW_20260709` plus exact command. |
| GitHub auth review | Closed | Check local GitHub CLI auth state. | `APPROVE_GH_AUTH_STATUS_REVIEW_20260709` plus exact command. |
| GitHub write | Closed | Issue/PR/push/merge write operations. | Separate exact GitHub gate naming target repo, branch, and command/action. |
| Provider smoke | Closed | One-turn MaxPlus/Hermes provider call. | `APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN` plus non-private prompt, budget/cost guard, and no-secret confirmation. |
| Worker/Telegram/export execution | Closed | Trigger live worker, Telegram, or export flow. | Separate exact gate naming platform, target, command, dry-run/live mode, and rollback owner. |

## Recommended Next Decision Order

1. Keep this packet as the baseline gate record.
2. Run a PATH review-only gate if the operator wants to normalize command
   resolution.
3. Run config metadata review gates before any config write.
4. Review the MaxPlus installer text to a temp file before any installer
   execution.
5. Create a Hermes dirty-repo backup/review packet before `hermes update`.
6. Only after steps 2-5, decide whether to wire PATH, write config, update
   Hermes, auth GitHub, or run one provider smoke test.

## Safe Next Gate Templates

### PATH Review Only

```text
APPROVE_MAXPLUS_PATH_REVIEW_ONLY_20260709
Allowed command: <exact read-only PATH/tool-resolution command>
Forbidden adjacent actions: config write, installer execution, auth, provider call, push, deploy
```

### Installer Read-Only Review

```text
APPROVE_REVIEW_HERMES_INSTALLER_ONLY_20260709
Allowed command: <exact command that downloads installer to temp path and prints checksum/summary only>
Forbidden adjacent actions: bash execution, secret use, config write, auth, provider call
```

### Hermes Dirty Repo Backup Review

```text
APPROVE_HERMES_DIRTY_REPO_BACKUP_REVIEW_20260709
Allowed command: <exact read-only diff/status/archive command>
Forbidden adjacent actions: git pull, hermes update, reset, checkout, delete, installer execution
```

### Provider Smoke

```text
APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN
Allowed command: <exact one-shot command>
Prompt: <non-private prompt>
Budget/cost cap: <explicit cap>
Forbidden adjacent actions: repo upload, customer data, recurring cron, gateway live send
```

## Rollback Plan

This packet is docs-only. Rollback is:

1. Remove `/Users/sirinx/sirinx-os/docs/receipts/MAXPLUS_HERMES_CODEX_CLAUDE_OPENCODE_LOCAL_GATE_20260709.md`.
2. Remove the matching Obsidian pulse if the operator explicitly asks.
3. No PATH, config, secret, provider, GitHub, or runtime state was changed by
   this packet.

## Completion Criteria

This packet is complete when:

- The local gate packet exists in `docs/receipts/`.
- It captures current read-only PATH/tool availability.
- It captures the dirty Hermes update risk.
- It separates PATH, config, install, update, auth, provider, GitHub, and live
  automation gates.
- It provides safe next gate templates.
- It is verified for formatting and no secret-like values.

## Current Packet Decision

`READY_FOR_OPERATOR_REVIEW`

Recommended next safe action:

```text
Choose one exact gate only: PATH review, config metadata review, installer read-only review, or Hermes dirty-repo backup review.
```
