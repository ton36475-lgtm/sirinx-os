# MaxPlus GLM-5.2 Post-Approval Guard Fix Runbook

Mission ID: `GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001`
Created UTC: `2026-06-30T10:47:10Z`
Repo: `/Users/sirinx/sirinx-os`
Status: `waiting_for_APPROVE_IMPLEMENTATION`

## Purpose

Define the exact, narrow execution path for the remaining Phase 1 blocker after
the operator provides the exact implementation gate.

This runbook does not approve or apply the source patch.

## Required Gate

The only gate phrase that opens this source edit is:

```text
APPROVE_IMPLEMENTATION
```

Allowed scope after that gate:

- Apply only the patch preview at:
  `.ghostclaw_runtime/a2a2a/evidence/maxplus_glm52_pretool_guard_env_fix_patch_preview_20260630T104202Z.diff`
- Target only:
  `.claude/hooks/ghostclaw-pretool-guard.py`
- Rerun only the Phase 1 guard canary matrix and scoped validation.

Everything else remains blocked: install, provider calls, secret reads, push,
deploy, migration, model download, GPU-heavy work, destructive commands, backend
mutation, frontend mutation, page mutation, and real `.env` edits.

## Current Pre-Approval Evidence

These are simulated PreToolUse payloads only. No `.env` file was read and no
blocked shell command was executed.

| Payload command | Current decision | Receipt |
|---|---|---|
| `sed -n 1,20p .env` | `allow` | `.ghostclaw_runtime/receipts/ghostclaw_pretool_guard_20260630T104710_621758Z.json` |
| `git push origin staging/godmode-master-os-v2` | `block` | `.ghostclaw_runtime/receipts/ghostclaw_pretool_guard_20260630T104710_621795Z.json` |
| `pnpm install` | `block` | `.ghostclaw_runtime/receipts/ghostclaw_pretool_guard_20260630T104710_684466Z.json` |

## Post-Approval Execution Sequence

Run these steps only after the exact gate is present:

```text
git apply .ghostclaw_runtime/a2a2a/evidence/maxplus_glm52_pretool_guard_env_fix_patch_preview_20260630T104202Z.diff
python3 -m py_compile .claude/hooks/ghostclaw-pretool-guard.py
python3 .claude/hooks/ghostclaw-pretool-guard.py < simulated canary payloads
python3 -m json.tool <new status file>
python3 -m json.tool <new receipt file>
git diff --check
rg -l <token-shaped-value-scan> <scoped harness files>
```

## Required Canary Matrix After Patch

| Payload command | Expected decision |
|---|---|
| `sed -n 1,20p .env` | `block` |
| `cat .env.local` | `block` |
| `rg TOKEN ./.env` | `block` |
| `head -20 secrets/prod.txt` | `block` |
| `cat certs/private.pem` | `block` |
| `tail ../.env` | `block` |
| `less /tmp/project/.env.production` | `block` |
| `awk '{print}' ./secrets/local.token` | `block` |
| `git push origin staging/godmode-master-os-v2` | `block` |
| `pnpm install` | `block` |
| `echo safe-local-check` | `allow` |

## Release Criteria

Phase 1 can advance only when all of these are true:

- Patch is applied under the exact gate.
- Hook compiles.
- Canary matrix passes.
- New receipt records all canaries and no raw secret values.
- `git diff --check` passes.
- Scoped token-shaped value scan returns no files.
- No install, provider call, secret read/print, push, deploy, migration, model
  download, GPU-heavy job, or destructive command occurred.

