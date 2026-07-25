# MaxPlus GLM-5.2 PreTool Guard Env Read Fix Packet

Mission ID: `GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001`
Created UTC: `2026-06-30T10:29:15Z`
Repo: `/Users/sirinx/sirinx-os`
Status: `waiting_for_APPROVE_IMPLEMENTATION`

## Purpose

Prepare the narrow source change required to finish Phase 1 of the
MaxPlus GLM-5.2 safe harness without applying it before the implementation
gate is opened.

## Current Evidence

- Current hook: `.claude/hooks/ghostclaw-pretool-guard.py`
- Fresh canary command payload: `sed -n 1,20p .env`
- Fresh result: `allow`
- Fresh receipt:
  `.ghostclaw_runtime/receipts/ghostclaw_pretool_guard_20260630T102854_121169Z.json`
- Control canary: `git push origin staging/godmode-master-os-v2`
- Control result: `block`
- Control receipt:
  `.ghostclaw_runtime/receipts/ghostclaw_pretool_guard_20260630T102854_121196Z.json`
- Control canary: `pnpm install`
- Control result: `block`
- Control receipt:
  `.ghostclaw_runtime/receipts/ghostclaw_pretool_guard_20260630T102854_197063Z.json`

No `.env` file was read. The failing command was passed to the hook as a
simulated PreToolUse payload string only.

## Root Cause

The guard has a secret path detector for structured tool paths, but a Bash
command does not expose `.env` as a structured path field. The Bash-specific
secret-read regex currently requires either the start of the whole command or a
slash immediately before `.env`:

```text
(^|/)\.env(\.|$)
```

That misses a bare relative `.env` argument after command flags, for example:

```text
sed -n 1,20p .env
```

## Proposed Source Change

After exact `APPROVE_IMPLEMENTATION`, patch only
`.claude/hooks/ghostclaw-pretool-guard.py`.

Recommended minimal behavior:

- Detect read-like shell tools: `cat`, `sed`, `awk`, `grep`, `rg`, `less`,
  `more`, `head`, `tail`.
- Detect secret-like path arguments anywhere in the command string, including:
  `.env`, `.env.local`, `./.env`, `../.env`, `/path/.env`, `secrets/`,
  `.pem`, `.p12`, `.pfx`, and `.key`.
- Keep the receipt redaction behavior unchanged.
- Keep mutation lease behavior unchanged.
- Do not broaden provider, install, push, deploy, migration, or secret access.

Patch shape:

```python
SECRET_READ_COMMAND_RE = re.compile(
    r"(^|[\s;&|()])(cat|sed|awk|grep|rg|less|more|head|tail)\b",
    re.IGNORECASE,
)
SECRET_READ_PATH_RE = re.compile(
    r"(^|[\s;&|()<>])("
    r"\.env(\.[^\s;&|()<>]+)?"
    r"|[^\s;&|()<>]*/\.env(\.[^\s;&|()<>]+)?"
    r"|(?:[^\s;&|()<>]*/)?secrets?/[^\s;&|()<>]+"
    r"|[^\s;&|()<>]+\.(pem|p12|pfx|key)"
    r")(?=$|[\s;&|()<>])",
    re.IGNORECASE,
)

def _command_reads_secret_path(command: str) -> bool:
    return bool(
        SECRET_READ_COMMAND_RE.search(command)
        and SECRET_READ_PATH_RE.search(command)
    )
```

Then replace the existing Bash `.env` read condition with:

```python
if _command_reads_secret_path(command):
    reasons.append("reading secret-like files is blocked")
```

## Required Canary Matrix After Patch

These canaries must run against the patched hook before Phase 1 can be marked
complete:

| Payload command | Expected result |
|---|---|
| `sed -n 1,20p .env` | block |
| `cat .env.local` | block |
| `rg TOKEN ./.env` | block |
| `head -20 secrets/prod.txt` | block |
| `cat certs/private.pem` | block |
| `tail ../.env` | block |
| `less /tmp/project/.env.production` | block |
| `awk '{print}' ./secrets/local.token` | block |
| `git push origin staging/godmode-master-os-v2` | block |
| `pnpm install` | block |
| `echo safe-local-check` | allow |

Dry-run proof on `2026-06-30T10:39:12Z` showed the first proposed
`secrets?/` detector was too narrow for `secrets/prod.txt`. The proposal above
was tightened to cover nested secret directory reads before any source patch is
applied.

## Validation Required

Run the scoped validation after the patch:

```text
python3 -m py_compile .claude/hooks/ghostclaw-pretool-guard.py
python3 .claude/hooks/ghostclaw-pretool-guard.py < simulated canary payloads
python3 -m json.tool <new status file>
python3 -m json.tool <new receipt file>
git diff --check
rg -l <token-shaped-value-scan> <scoped harness files>
```

## Gate

Do not apply the source patch until the operator provides the exact gate:

```text
APPROVE_IMPLEMENTATION
```

## Blocked Actions Preserved

- No install
- No provider call
- No secret read or print
- No push
- No deploy
- No migration
- No model download
- No GPU-heavy job
- No destructive command
