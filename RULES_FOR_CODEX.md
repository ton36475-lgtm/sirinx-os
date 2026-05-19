# RULES_FOR_CODEX

Status: active helper rules subordinate to `AGENTS.md`
Date: 2026-05-20

## Required Start

Every Codex task in this repo starts by reading:

1. `AGENTS.md`
2. `PROJECT_STATE.md`
3. `NEXT_ACTIONS.md`
4. relevant source files

If these files conflict, use the stricter safety rule.

## Default Workflow

```text
Inspect -> Plan -> Implement -> Verify -> Report -> Commit Ready
```

Do not skip inspection. Do not implement from memory when local files can be read.

## File Safety

- Do not read `.env` values.
- Do not print secrets.
- Do not read or copy keystore/signing material.
- Do not touch unrelated dirty files.
- Do not revert user changes unless explicitly requested.
- Use `apply_patch` for manual edits.
- Keep runtime changes scoped to the requested module.

## External Action Safety

These require exact approval for the specific target:

- deploy
- GitHub push or PR
- Cloudflare DNS/route/secret/write
- database migration or production write
- Telegram/LINE/customer message
- Solis API credential use or telemetry call
- paid API call

## Verification Baseline

Use the smallest relevant test set, then run broader checks when shared behavior changes:

```bash
pnpm project-os:check
pnpm verify
pnpm dashboard:e2e
pnpm external-gates:check
git diff --check
```

For public website changes, work in `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx`, not this control-plane repo, unless the task explicitly says otherwise.

## Reporting

Final reports must include:

- what changed
- files changed
- verification commands and results
- risks or blocked gates
- whether public website, production, secrets, or external services were touched

Do not claim production readiness unless the verification evidence exists.
