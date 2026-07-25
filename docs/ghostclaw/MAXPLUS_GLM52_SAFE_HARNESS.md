# MaxPlus GLM-5.2 Safe Harness

Mission ID: `GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001`

## Status

Phase 1 local-safe harness files are implemented and ready for review. The
harness was created under a Hermes file lease and no provider call, push, deploy,
install, migration, secret read, or model download was executed.

## Target

Configure Claude Code CLI to run through the MaxPlus/provider route with
effective model identity:

```text
glm-5.2 via MaxPlus proxy; not native Claude
```

Runtime identity truth must come from configuration, launcher environment,
receipts, and canary output. A model self-description is not evidence.

## Implemented Files

- `.claude/settings.json`
- `.claude/settings.local.json`
- `.claude/hooks/maxplus-session-guard.py`
- `.claude/hooks/ghostclaw-pretool-guard.py`
- `scripts/launchers/claude-glm52-maxplus-safe`

## Required Guardrails

- no API keys or secret values in settings
- `.claude/settings.local.json` must be gitignored before creation
- block push, deploy, install, migration, secret access, and network shell calls
- effort cap is `high`
- provider batch calls stay blocked
- identity receipts must report config/env truth only

## Validation Evidence

- `.ghostclaw_runtime/a2a2a/locks/P01-maxplus-glm52-safe-harness.lease.json`
- `.ghostclaw_runtime/a2a2a/receipts/P01-maxplus-glm52-safe-harness.receipt.json`
- `.ghostclaw_runtime/receipts/maxplus_glm52_session_guard_latest.json`
- `.ghostclaw_runtime/receipts/ghostclaw_pretool_guard_latest.json`
- `VALIDATION_REPORT_MAXPLUS_GLM52_SAFE_HARNESS.md`

## Current Gate

The next implementation layer remains closed until the harness review and
carried-forward backend-domain schema review pass. Push, deploy, provider calls,
model download, install, migration, and secret reads remain separately blocked.
