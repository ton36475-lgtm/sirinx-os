# OpenCode MaxPlus Hermes Runbook

Status: safe local integration runbook
Repo: `/Users/sirinx/sirinx-os`
Last verified: `2026-06-30T14:34:56+0700`

## Current Binding

Use these roles for the GhostClaw lane:

- OpenCode: Builder UI
- MaxPlus: Model provider
- Hermes: Commander and router
- Codex: repo worker and validator
- GhostClaw receipts: audit trail

Observed local checks from Codex:

- OpenCode config exists at `~/.config/opencode/opencode.json`.
- Config JSON parses successfully.
- Config model label: `maxplus-cmax-lite/claude-opus-4-8`.
- Config small model label: `maxplus-cmax-lite/claude-opus-4-8`.
- Config includes MaxPlus provider entries and a base URL.
- Config uses `MAXPLUS_API_KEY` as an environment reference.
- Codex shell currently reports `MAXPLUS_API_KEY` as missing.
- `opencode --version` returns `1.17.11`.

The screenshot/UI can show the provider loaded while this Codex shell still
reports the env var as missing. Standardize Hermes/OpenCode launch through one
environment path so the key is present without printing or storing it in repo.

## Safety Boundary

Allowed without extra approval:

- inspect repo and git status
- validate JSON/YAML/TS
- read non-secret config shape
- check whether `MAXPLUS_API_KEY` is present without printing the value
- create docs, local receipts, templates, and implementation plans
- run existing local tests if dependencies already exist

Blocked without separate explicit approval:

- git push
- deploy
- dependency install
- migrations
- paid provider batch calls
- reading or printing secret values
- editing real `.env`
- deleting files
- merging branches
- live Telegram/customer messages

## Local Check Command

Run from macOS terminal when validating the local environment:

```bash
cd /Users/sirinx/sirinx-os

echo "=== OpenCode config ==="
python3 -m json.tool ~/.config/opencode/opencode.json >/dev/null && echo "OK: opencode config valid"

echo "=== API key env ==="
test -n "${MAXPLUS_API_KEY:-}" && echo "OK: MAXPLUS_API_KEY is set" || echo "MISSING: MAXPLUS_API_KEY"

echo "=== git dirty check ==="
git status --short

echo "=== opencode version ==="
opencode --version
```

Do not print the key value. Only check presence.

## Read-Only OpenCode Smoke Prompt

Use this inside the active OpenCode session:

```text
Do a read-only smoke test.

Tasks:
1. Confirm the current repository path.
2. Read package.json if it exists.
3. List the available scripts.
4. Do not modify files.
5. Do not run install, push, deploy, provider calls, or secret reads.
6. Return a concise evidence report.
```

Expected result: OpenCode can inspect `/Users/sirinx/sirinx-os`, list scripts
from `package.json`, and return evidence without modifying files.

## Hermes Launcher Template

Use a home-directory launcher. Do not put the API key in this repo.

```bash
mkdir -p ~/bin

cat > ~/bin/opencode-maxplus <<'SH'
#!/usr/bin/env bash
set -euo pipefail

cd /Users/sirinx/sirinx-os

if [ -z "${MAXPLUS_API_KEY:-}" ]; then
  echo "ERROR: MAXPLUS_API_KEY is not set"
  exit 1
fi

exec opencode
SH

chmod +x ~/bin/opencode-maxplus
```

Test command:

```bash
~/bin/opencode-maxplus
```

## Hermes Command Packet

```text
Run local OpenCode MaxPlus smoke validation.

Scope:
- repo: /Users/sirinx/sirinx-os
- model/provider already selected in OpenCode: Claude Opus 4.8 via MaxPlus
- mode: evidence-first
- mutation: read-only except optional receipt file under .ghostclaw_runtime/receipts/
- do not read secret values
- do not print environment values
- do not push
- do not deploy
- do not install dependencies
- do not run paid/provider calls except the existing active OpenCode session

Required checks:
1. Verify git status.
2. Verify OpenCode config file exists and JSON parses.
3. Verify MAXPLUS_API_KEY presence only, not value.
4. Verify OpenCode can inspect repo.
5. Generate a short receipt with timestamp, selected model label, git status summary, and pass/fail.

Output:
- PASS/FAIL
- evidence list
- next recommended command
```

## Current Receipt

Receipt for this Codex-side runbook pass:

`/Users/sirinx/sirinx-os/.ghostclaw_runtime/receipts/opencode_maxplus_hermes_safe_local_20260630T143456_0700.json`

Provider smoke from Codex was not run in this pass because it could spend a
provider call outside the existing OpenCode UI session.
