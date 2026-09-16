# Validation Report: MaxPlus GLM-5.2 Safe Harness

Mission ID: `GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001`

## Current Result

Phase 0 observe/freeze is complete. Phase 1 harness implementation is complete
for local-safe review. No live provider call was executed.

## Evidence

- `.ghostclaw_runtime/a2a2a/evidence/layered_observe.json`
- `.ghostclaw_runtime/a2a2a/status/layer_sequence_status.json`
- `.ghostclaw_runtime/a2a2a/status/file_ownership_manifest.json`
- `docs/ghostclaw/MAXPLUS_GLM52_SAFE_HARNESS.md`
- `docs/ghostclaw/CLAUDE_CODE_IDENTITY_TRUTH_POLICY.md`
- `.ghostclaw_runtime/a2a2a/locks/P01-maxplus-glm52-safe-harness.lease.json`
- `.ghostclaw_runtime/a2a2a/receipts/P01-maxplus-glm52-safe-harness.receipt.json`
- `.ghostclaw_runtime/receipts/maxplus_glm52_session_guard_latest.json`
- `.ghostclaw_runtime/receipts/ghostclaw_pretool_guard_latest.json`

## Observed Harness State

- `.claude/settings.json`: present
- `.claude/settings.local.json`: present and gitignored
- `.claude/hooks/maxplus-session-guard.py`: present and executable
- `.claude/hooks/ghostclaw-pretool-guard.py`: present and executable
- `scripts/launchers/claude-glm52-maxplus-safe`: present and executable
- `.claude/mcp.json`: present
- `.claude/agents`: present
- `.claude/skills`: present

## Validation Status

- JSON settings validate.
- Python hooks compile.
- Launcher syntax validates with `bash -n`.
- Launcher and hooks are executable.
- `.claude/settings.local.json` is gitignored.
- Secret literal scan found no token/private-key literal patterns in harness files.
- Session identity canary wrote a local receipt and did not call a provider.
- PreToolUse `git push` canary blocked with exit code `2`.
- PreToolUse `.env` read canary blocked with exit code `2`.
- PreToolUse read-only `git status --short` canary allowed with exit code `0`.
- No provider call executed.
- No secret read or print executed.

## Next Gate

Run OpenCode or reviewer read-only review against the P01 harness receipt and
diff. Do not open backend service logic until harness review and carried-forward
backend-domain schema review pass.
