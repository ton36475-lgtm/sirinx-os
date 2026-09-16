# MaxPlus PATH Review Only Receipt

Date: 2026-07-09 11:18 +07

Gate: `APPROVE_MAXPLUS_PATH_REVIEW_ONLY_20260709`

Status: `COMPLETED_READ_ONLY`

Repository: `/Users/sirinx/sirinx-os`

Mode:

```text
path_review_only=true
config_write=false
installer_execution=false
auth_flow=false
provider_call=false
deploy=false
push=false
secret_read=false
secret_print=false
```

## Scope

This receipt records the local PATH and CLI resolution state only. It does not
approve or perform PATH rewrites, shell profile edits, config changes, installer
execution, Hermes update, GitHub auth, provider smoke tests, worker execution,
or external writes.

## Commands Performed

Read-only checks only:

- Shell and PATH entry listing.
- `type -a` resolution for AI/dev CLIs.
- Version checks for resolved CLIs.
- Symlink target checks for known CLI paths.
- Hermes local repository status checks.

No `.env`, auth file, provider config, browser cookie, or token file was read.

## PATH Findings

Current shell: `/bin/zsh`

Current working directory during review: `/Users/sirinx`

Important PATH order:

| Order | Path | Finding |
| --- | --- | --- |
| 4 | `/Users/sirinx/.local/bin` | Primary local CLI path. |
| 5 | `/Users/sirinx/.cargo/bin` | Present. |
| 6 | `/Users/sirinx/.local/bin` | Duplicate entry. |
| 7 | `/opt/homebrew/bin` | Homebrew CLI path. |
| 8 | `/opt/homebrew/sbin` | Homebrew sbin path. |
| 9 | `/Users/sirinx/.cargo/bin` | Duplicate entry. |
| 23 | `/Applications/Codex.app/Contents/Resources` | Codex app fallback path. |

Duplicate PATH entries observed:

```text
/Users/sirinx/.cargo/bin
/Users/sirinx/.local/bin
```

Assessment: PATH is usable, but it is not fully normalized. Duplicate entries
are low-risk cleanup candidates under a separate PATH wire gate.

## Tool Resolution Findings

| Tool | Resolution | Version/status | Notes |
| --- | --- | --- | --- |
| `codex` | `/Users/sirinx/.local/bin/codex` first, `/Applications/Codex.app/Contents/Resources/codex` fallback | `codex-cli 0.142.5` | Local symlink points to `../lib/node_modules/@openai/codex/bin/codex.js`. |
| `hermes` | `/Users/sirinx/.local/bin/hermes` | `Hermes Agent v0.18.2 (2026.7.7.2)` | Installed by git in `/Users/sirinx/.hermes/hermes-agent`. |
| `claude` | `/Users/sirinx/.local/bin/claude` first, `/opt/homebrew/bin/claude` fallback | Active PATH version `2.1.139`; Homebrew fallback `2.1.185` | Homebrew Claude Code is newer but shadowed by `.local/bin`. Do not switch without a separate gate. |
| `claudecode` | `/Users/sirinx/.local/bin/claudecode` | `2.1.139 (Claude Code)` | Alias symlink points to `/Users/sirinx/.local/bin/claude`. |
| `opencode` | `/Users/sirinx/.local/bin/opencode` first, `/opt/homebrew/bin/opencode` fallback | Active PATH version `1.17.15`; Homebrew fallback `1.17.11` | Active local version is newer than Homebrew fallback. |
| `gh` | `/opt/homebrew/bin/gh` | `gh version 2.92.0 (2026-04-28)` | Installed. Auth status was not checked because that is a separate gate. |
| `cowok` | Not found | Not installed/resolved | Treat as unknown/planned until a discovery or install gate is opened. |
| `antigravity2` / `gravity2` / `antigravity` / `gravity` | Not found | Not installed/resolved | Treat as planned until an install gate is opened. |
| `copilot` | Not found | Not installed/resolved | Treat as planned until a GitHub Copilot CLI gate is opened. |

## Hermes Repo Findings

Hermes install repo:

```text
/Users/sirinx/.hermes/hermes-agent
```

Remote:

```text
https://github.com/NousResearch/hermes-agent.git
```

Current branch:

```text
main
```

Current HEAD:

```text
88a58ff13 Merge pull request #61277 from NousResearch/bb/fix-desktop-tsx-electron40
```

Hermes CLI version output reports:

```text
Update available: 31 commits behind - run 'hermes update'
```

Current local git status still has local modifications and untracked files:

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

Assessment: do not run `hermes update`, `git pull`, reinstall, or PATH/config
rewire against Hermes until a separate Hermes dirty-repo backup/review gate is
opened.

## Decision

`PATH_REVIEW_COMPLETE_NO_MUTATION`

Current PATH is functional for the core tools:

- Codex resolves.
- Hermes resolves.
- Claude resolves.
- Claude Code alias resolves.
- OpenCode resolves.
- GitHub CLI resolves.

However, PATH is not clean:

- `.local/bin` appears twice.
- `.cargo/bin` appears twice.
- Claude Code has a newer Homebrew fallback shadowed by `.local/bin`.
- Hermes has local worktree changes and untracked files.

## Recommended Next Gates

Choose one exact next gate:

1. `APPROVE_MAXPLUS_PATH_WIRE_LOCAL_SHELL_<target>_20260709`
   - Only if the operator wants to normalize duplicate PATH entries or choose
     which Claude/OpenCode binary should win.
2. `APPROVE_HERMES_DIRTY_REPO_BACKUP_REVIEW_20260709`
   - Recommended before any Hermes update or reinstall.
3. `APPROVE_GH_AUTH_STATUS_REVIEW_20260709`
   - Only if GitHub auth state needs inspection.
4. `APPROVE_REVIEW_HERMES_INSTALLER_ONLY_20260709`
   - Only if reviewing the remote MaxPlus/Hermes installer text is still
     desired.

## Rollback

No runtime rollback is needed because this gate changed no PATH, config, repo,
secret, auth, provider, or external state.

Docs-only rollback:

```text
Remove /Users/sirinx/sirinx-os/docs/receipts/MAXPLUS_PATH_REVIEW_ONLY_20260709.md
```
