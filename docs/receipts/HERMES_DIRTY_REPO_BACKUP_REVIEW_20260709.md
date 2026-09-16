# Hermes Dirty Repo Backup Review Receipt

Date: 2026-07-09 11:43 +07

Gate: `APPROVE_HERMES_DIRTY_REPO_BACKUP_REVIEW_20260709`

Status: `COMPLETED_LOCAL_BACKUP_REVIEW`

Hermes repo: `/Users/sirinx/.hermes/hermes-agent`

Backup root:
`/Users/sirinx/.hermes/backups/HERMES_DIRTY_REPO_BACKUP_REVIEW_20260709_20260709T114316+0700`

## Safety Boundary

```text
backup_local_only=true
git_pull=false
hermes_update=false
installer_execution=false
config_write=false
auth_flow=false
provider_call=false
external_send=false
deploy=false
push=false
secret_print=false
```

No `hermes update`, `git pull`, installer, auth flow, provider call, push,
deploy, webhook, live message, config write, or secret read/print was
performed.

## Current Hermes State

| Field | Value |
| --- | --- |
| Branch | `main` |
| Remote | `https://github.com/NousResearch/hermes-agent.git` |
| HEAD | `88a58ff13 Merge pull request #61277 from NousResearch/bb/fix-desktop-tsx-electron40` |
| Tracked modified files | `2` |
| Untracked files | `710` |
| Git upstream ahead/behind | `0 0` from `HEAD...@{u}` |
| Hermes CLI update status | CLI reports update available / 31 commits behind |

Note: Git tracking reported `0 0` while the Hermes CLI still reported an
available update. Treat this as a version/update-check discrepancy until a
separate Hermes update preflight gate resolves it.

## Backup Artifacts

| Artifact | Purpose |
| --- | --- |
| `modified-tracked.patch` | Binary-capable patch for tracked modifications. |
| `modified-tracked-files.tgz` | Archive copy of tracked modified files. |
| `untracked-files.tgz` | Archive copy of all untracked files. |
| `git-status-short-all.txt` | Full dirty worktree status with untracked files. |
| `git-status-porcelain-all.txt` | Machine-readable dirty status. |
| `modified-tracked.diffstat.txt` | Tracked diff summary. |
| `modified-tracked.diffcheck.txt` | `git diff --check` result. |
| `dirty-files.txt` | Combined modified/untracked file manifest. |
| `secret-scan-filenames.txt` | Filename-only secret-pattern hit list. |
| `SHA256SUMS.txt` | Checksums for the core backup artifacts. |
| `summary.txt` | Backup summary metadata. |

Backup size:

```text
1.8M
```

Summary:

```text
modified_tracked_count=2
untracked_count=710
secret_scan_filename_hits=13
modified_patch_bytes=9768
modified_archive_bytes=192418
untracked_archive_bytes=1431502
```

## Checksums

```text
f5a653501fdd5fd80d808d3cb0680f974da73b8f01ea82db00cb870b4d09a90b  modified-tracked.patch
d72fa9b2007f7f5e7cd8967df491348cd7b9025a61c6b13ddb28965813b9a104  modified-tracked-files.tgz
c1b8c04103338089c897940fc1c9c3ee3e6d2a20dbf461b0ac3349afd4f76d69  untracked-files.tgz
f4f03fd77fa5a2fdf8fe237a572f5e9564b550ee39dace38ef9b0ee37b2224af  git-status-short-all.txt
852a73d009f94cc44e55976c9b92f05fdc2867f5d58d1d3fc1b985a82085bee7  dirty-files.txt
```

## Secret-Pattern Filename Hits

The backup review ran filename-only secret-pattern scanning over dirty files.
It did not print matching line content or secret values.

Files with secret-like pattern hits:

```text
plugins/platforms/line/adapter.py
hermes_cli/web_server.py
apps/desktop/src/app/settings/providers-settings.js
apps/desktop/src/i18n/en.js
apps/desktop/src/i18n/zh-hant.js
apps/desktop/src/lib/provider-setup-errors.js
apps/desktop/src/i18n/ja.js
apps/desktop/src/components/onboarding/index.js
tests/gateway/test_sirinx_line_webhook_dry_run.py
apps/desktop/src/store/prompts.test.js
apps/desktop/src/i18n/zh.js
hermes_cli/web_server.py.orig
skills/create-voltagent/SKILL.md
```

Interpretation:

- These are filename-level hits only, not confirmed leaked secrets.
- Some hits may be expected test strings or UI copy.
- Do not push, upload, share, or attach the backup archive before a separate
  local secret review gate confirms it is safe.

## Restore Notes

Do not restore automatically. If a future gate approves restore, the local
artifacts can be used as follows:

```text
git -C /Users/sirinx/.hermes/hermes-agent apply /Users/sirinx/.hermes/backups/HERMES_DIRTY_REPO_BACKUP_REVIEW_20260709_20260709T114316+0700/modified-tracked.patch
tar -C /Users/sirinx/.hermes/hermes-agent -xzf /Users/sirinx/.hermes/backups/HERMES_DIRTY_REPO_BACKUP_REVIEW_20260709_20260709T114316+0700/untracked-files.tgz
```

Restore remains closed until explicitly approved.

## Decision

`HERMES_DIRTY_BACKUP_REVIEW_COMPLETE_UPDATE_STILL_CLOSED`

The dirty Hermes state is now locally backed up, but update is still blocked
because:

- Dirty worktree remains present.
- Secret-pattern filename hits require review before sharing artifacts.
- Hermes CLI update status conflicts with the Git upstream ahead/behind result.
- No exact update command/rollback gate has been approved.

## Recommended Next Gates

Choose one exact next gate only:

1. `APPROVE_HERMES_DIRTY_SECRET_FILENAME_REVIEW_20260709`
   - Review filename-hit files locally without printing secret values.
2. `APPROVE_HERMES_UPDATE_PREFLIGHT_AFTER_BACKUP_20260709`
   - Compare Hermes CLI update status against Git tracking before any update.
3. `APPROVE_HERMES_UPDATE_AFTER_BACKUP_20260709`
   - Only after the secret filename review and update preflight are accepted.

## Rollback

Docs-only rollback:

```text
Remove /Users/sirinx/sirinx-os/docs/receipts/HERMES_DIRTY_REPO_BACKUP_REVIEW_20260709.md
```

Backup artifact rollback:

```text
Remove /Users/sirinx/.hermes/backups/HERMES_DIRTY_REPO_BACKUP_REVIEW_20260709_20260709T114316+0700
```

Do not remove backup artifacts until the operator confirms they are no longer
needed.
