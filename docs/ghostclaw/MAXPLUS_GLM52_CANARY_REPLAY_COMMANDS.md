# MaxPlus GLM-5.2 Canary Replay Commands

Mission ID: `GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001`
Created UTC: `2026-06-30T11:05:53Z`
Repo: `/Users/sirinx/sirinx-os`
Status: `waiting_for_APPROVE_IMPLEMENTATION`

## Purpose

Make the Phase 1 post-approval canary replay deterministic after the
PreToolUse env-read guard patch is applied.

This document does not approve or apply the source patch.

## Inputs

- Patch preview:
  `.ghostclaw_runtime/a2a2a/evidence/maxplus_glm52_pretool_guard_env_fix_patch_preview_20260630T104202Z.diff`
- Lease request:
  `.ghostclaw_runtime/a2a2a/locks/P01-pretool-env-read-guard-fix.lease.request.json`
- Payload bundle:
  `.ghostclaw_runtime/a2a2a/templates/maxplus_glm52_pretool_guard_canary_payloads_20260630T110222Z.json`
- Current baseline:
  `.ghostclaw_runtime/a2a2a/evidence/maxplus_glm52_pretool_guard_canary_payload_baseline_20260630T110255Z.json`

## Safety Notes

- The payload bundle contains command strings, but replay feeds those strings
  into `.claude/hooks/ghostclaw-pretool-guard.py` as JSON.
- Replay must not execute the shell commands inside the payloads.
- Do not read `.env`, secret files, browser cookies, tokens, private keys, or
  provider credentials.
- Do not install, push, deploy, migrate, call providers, download models, run
  GPU-heavy jobs, or delete files.

## Post-Approval Patch Step

Run only after exact `APPROVE_IMPLEMENTATION`:

```bash
git apply .ghostclaw_runtime/a2a2a/evidence/maxplus_glm52_pretool_guard_env_fix_patch_preview_20260630T104202Z.diff
```

Then compile the hook:

```bash
python3 -m py_compile .claude/hooks/ghostclaw-pretool-guard.py
```

## Replay Command

This command feeds the payload bundle into the hook one item at a time. It does
not execute the shell strings inside the payloads.

```bash
python3 - <<'PY'
import json
import subprocess
import sys
from pathlib import Path

bundle_path = Path(".ghostclaw_runtime/a2a2a/templates/maxplus_glm52_pretool_guard_canary_payloads_20260630T110222Z.json")
bundle = json.loads(bundle_path.read_text())
rows = []

for item in bundle["payloads"]:
    raw_payload = json.dumps(item["payload"])
    proc = subprocess.run(
        [sys.executable, ".claude/hooks/ghostclaw-pretool-guard.py"],
        input=raw_payload,
        text=True,
        capture_output=True,
        check=False,
    )
    stdout = proc.stdout.strip()
    try:
        output = json.loads(stdout)
    except json.JSONDecodeError:
        output = {"raw_stdout": stdout}
    observed = output.get("decision") or (
        "block" if proc.returncode == 2 else "allow" if proc.returncode == 0 else f"exit_{proc.returncode}"
    )
    expected = item["expected_decision_after_patch"]
    rows.append(
        {
            "id": item["id"],
            "command": item["payload"]["tool_input"]["command"],
            "expected_decision_after_patch": expected,
            "observed_decision": observed,
            "pass": observed == expected,
            "receipt_path": output.get("receipt_path"),
            "reason": output.get("reason"),
        }
    )

result = {
    "schema": "ghostclaw.a2a2a.evidence.maxplus_glm52_pretool_guard_canary_replay_result.v1",
    "mission_id": "GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001",
    "payload_bundle": str(bundle_path),
    "all_pass": all(row["pass"] for row in rows),
    "rows": rows,
}
print(json.dumps(result, indent=2))
PY
```

## Expected Result After Patch

- `all_pass` must be `true`.
- Every secret-read payload must return `block`.
- `git push` and `pnpm install` must still return `block`.
- `echo safe-local-check` must return `allow`.
- Every run must write guard receipts under `.ghostclaw_runtime/receipts/`.

## Final Validation

After replay passes, run:

```bash
python3 -m json.tool <new replay result file>
python3 -m json.tool <new phase1 completion status file>
python3 -m json.tool <new phase1 completion receipt file>
git diff --check
rg -l <token-shaped-value-scan> <scoped harness files>
```

Then update the Phase 1 receipt only if all checks pass and no blocked action
was executed.

