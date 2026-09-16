# MaxPlus GLM-5.2 Phase 1 Approval Packet

Mission ID: `GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001`
Packet ID: `P01-maxplus-glm52-safe-harness`

## Purpose

Open the first mutating packet for the MaxPlus GLM-5.2 safe harness only.

This packet does not approve backend, service, API, frontend, page, UAT, commit,
push, deploy, install, migration, provider batch call, model download, GPU-heavy
work, or secret access.

## Required Approval Phrase

```text
APPROVE_IMPLEMENTATION
```

## Proposed File Lease Scope

- `.gitignore`
- `.claude/settings.json`
- `.claude/settings.local.json`
- `.claude/hooks/maxplus-session-guard.py`
- `.claude/hooks/ghostclaw-pretool-guard.py`
- `scripts/launchers/claude-glm52-maxplus-safe`
- `docs/ghostclaw/MAXPLUS_GLM52_SAFE_HARNESS.md`
- `docs/ghostclaw/CLAUDE_CODE_IDENTITY_TRUTH_POLICY.md`
- `.ghostclaw_runtime/receipts/*`

## Required Sequence After Approval

1. Re-read each target file or confirm it is missing.
2. Check current git diff for each target path.
3. Acquire a file lease from `.ghostclaw_runtime/a2a2a/templates/maxplus_glm52_harness_file_lease.template.json`.
4. Add `.claude/settings.local.json` to `.gitignore` before writing local settings.
5. Create shared `.claude/settings.json` without secrets.
6. Create `.claude/settings.local.json` with provider/model identifiers only; no token values.
7. Create Python guards and launcher.
8. Run JSON validation, Python compile, launcher executable check, pretool blocked-action canary, no-secret scan, and diff check.
9. Write receipt with checksums.

## Required Validation

- `python3 -m json.tool .claude/settings.json`
- `python3 -m json.tool .claude/settings.local.json`
- `python3 -m py_compile .claude/hooks/maxplus-session-guard.py .claude/hooks/ghostclaw-pretool-guard.py`
- `test -x scripts/launchers/claude-glm52-maxplus-safe`
- blocked git push canary must be denied by guard logic
- identity canary prompt prepared without provider call unless separately approved
- no secret-like token values in settings, hooks, launcher, docs, or receipts
- `git diff --check`

## Exit Criteria

- harness files exist
- local settings are ignored
- shared settings contain no secrets
- hooks compile
- launcher is executable and exports high effort cap
- push/deploy/install/migration/secret/network shell commands are blocked
- receipt with checksums exists

## Non-Approval

This approval packet is not itself approval. It is a review packet that makes
the next exact gate explicit.
