#!/usr/bin/env python3
"""SessionStart guard for the GhostClaw MaxPlus GLM-5.2 harness.

This hook records deterministic host-side identity evidence. It never performs
provider calls and never writes secret values into receipts.
"""

from __future__ import annotations

import datetime as _dt
import hashlib
import json
import os
import pathlib
import sys


ROOT = pathlib.Path(__file__).resolve().parents[2]
RECEIPT_DIR = ROOT / ".ghostclaw_runtime" / "receipts"


def _utc_now() -> str:
    return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _safe_bool_env(name: str) -> bool:
    return bool(os.environ.get(name))


def main() -> int:
    payload = sys.stdin.read()
    payload_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest() if payload else None

    receipt = {
        "schema": "ghostclaw.claude.session_guard_receipt.v1",
        "hook": "SessionStart",
        "mission_id": "GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001",
        "created_at": _utc_now(),
        "repo_root": str(ROOT),
        "expected_provider": os.environ.get("GHOSTCLAW_EXPECTED_PROVIDER", "maxplus"),
        "expected_model": os.environ.get("GHOSTCLAW_EXPECTED_MODEL", "glm-5.2"),
        "expected_identity": os.environ.get(
            "GHOSTCLAW_EXPECTED_IDENTITY",
            "glm-5.2 via MaxPlus proxy; not native Claude",
        ),
        "effort_cap": os.environ.get("CLAUDE_CODE_EFFORT_LEVEL")
        or os.environ.get("GHOSTCLAW_EFFORT_CAP", "high"),
        "identity_truth_source": [
            ".claude/settings.local.json",
            "launcher environment",
            ".ghostclaw_runtime/receipts/*.json",
            "canary output",
        ],
        "model_self_description_is_evidence": False,
        "provider_call_executed": False,
        "secret_values_recorded": False,
        "env_presence_only": {
            "MAXPLUS_API_KEY": _safe_bool_env("MAXPLUS_API_KEY"),
            "ANTHROPIC_BASE_URL": _safe_bool_env("ANTHROPIC_BASE_URL"),
            "ANTHROPIC_AUTH_TOKEN": _safe_bool_env("ANTHROPIC_AUTH_TOKEN"),
            "ANTHROPIC_API_KEY": _safe_bool_env("ANTHROPIC_API_KEY"),
        },
        "hook_payload_sha256": payload_hash,
    }

    RECEIPT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = _dt.datetime.now(_dt.timezone.utc).strftime("%Y%m%dT%H%M%S_%fZ")
    receipt_path = RECEIPT_DIR / f"maxplus_glm52_session_guard_{stamp}.json"
    latest_path = RECEIPT_DIR / "maxplus_glm52_session_guard_latest.json"
    encoded = json.dumps(receipt, indent=2, sort_keys=True) + "\n"
    receipt_path.write_text(encoded, encoding="utf-8")
    latest_path.write_text(encoded, encoding="utf-8")

    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "SessionStart",
                    "additionalContext": (
                        "GhostClaw MaxPlus GLM-5.2 safe harness is active. "
                        "Model identity must be reported from settings/env/receipt evidence only; "
                        "model self-description is not evidence."
                    ),
                }
            },
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
