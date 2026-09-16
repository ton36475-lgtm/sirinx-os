# MaxPlus GLM-5.2 Phase 1 Harness Canary Audit

Mission ID: `GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001`
Audit timestamp UTC: `2026-06-30T10:22:24Z`
Repo: `/Users/sirinx/sirinx-os`

## Verdict

Phase 1 harness files are now present in the current worktree, but Phase 1 is
not complete.

The local harness passes JSON parse, hook compile, launcher syntax, launcher
executable, identity receipt, git-push block, dependency-install block, and
token-like scan checks. It fails the `.env` read canary: the PreToolUse guard
allowed a simulated `sed -n 1,20p .env` command. That must be fixed before the
safe harness can be considered complete.

This audit did not create or modify the harness files. It only inspected and
validated the current worktree state.

## Current Harness Files

| Path | Current state |
|---|---|
| `.gitignore` | Modified; includes `.claude/settings.local.json` ignore rule |
| `.claude/settings.json` | Present and untracked |
| `.claude/settings.local.json` | Present and ignored |
| `.claude/hooks/maxplus-session-guard.py` | Present and untracked |
| `.claude/hooks/ghostclaw-pretool-guard.py` | Present and untracked |
| `scripts/launchers/claude-glm52-maxplus-safe` | Present, executable, and untracked |
| `.claude/hooks/__pycache__/*.pyc` | Generated local compile artifacts; do not stage |

## Local Claude Code

- Binary: `/Users/sirinx/.local/bin/claude`
- Version: `2.1.139 (Claude Code)`
- Install command was not run.

## Canary Results

| Check | Result | Evidence |
|---|---|---|
| `.claude/settings.json` JSON parse | PASS | local parser check |
| `.claude/settings.local.json` JSON parse | PASS | local parser check, values not printed |
| Expected model/provider/effort markers present | PASS | `glm-5.2`, `maxplus`, `high` detected |
| Python hooks compile | PASS | `python3 -m py_compile` exit 0 |
| Launcher is executable | PASS | `test -x` exit 0 |
| Launcher shell syntax | PASS | `bash -n` exit 0 |
| Token-like values in scoped harness files | PASS | no filenames returned by scoped scan |
| SessionStart identity receipt | PASS | `.ghostclaw_runtime/receipts/maxplus_glm52_session_guard_latest.json` |
| `git push` PreToolUse canary | PASS blocked | `.ghostclaw_runtime/receipts/ghostclaw_pretool_guard_20260630T102202_339617Z.json` |
| `pnpm install` PreToolUse canary | PASS blocked | `.ghostclaw_runtime/receipts/ghostclaw_pretool_guard_20260630T102202_571867Z.json` |
| `.env` read PreToolUse canary | FAIL allowed | `.ghostclaw_runtime/receipts/ghostclaw_pretool_guard_20260630T102202_597742Z.json` |

## Blocking Issue

The deterministic PreToolUse guard must block `.env` reads for commands like:

```text
sed -n 1,20p .env
```

The current guard blocks some `.env` patterns but misses this relative-path
case. Do not mark Phase 1 complete until this canary is blocked and a new
receipt proves the fix.

## Next Safe Action

Open exact `APPROVE_IMPLEMENTATION` for the narrow guard fix and Phase 1
receipt update, or keep the mission in local evidence/status refresh mode.

