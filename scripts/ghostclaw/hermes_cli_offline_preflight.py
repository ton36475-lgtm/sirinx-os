#!/usr/bin/env python3
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MISSION_ID = "MAXPLUS-HERMES-CHINESE-MODEL-20260630"
REPORT_PATH = ROOT / ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.hermes_cli_offline_preflight.json"


def run_safe_probe(args: list[str]) -> dict:
    if not shutil.which(args[0]):
        return {
            "command": args,
            "available": False,
            "exit_code": None,
            "stdout_length": 0,
            "stderr_length": 0,
            "secret_value_printed": False,
        }
    proc = subprocess.run(
        args,
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=12,
        check=False,
    )
    return {
        "command": args,
        "available": True,
        "exit_code": proc.returncode,
        "stdout_length": len(proc.stdout),
        "stderr_length": len(proc.stderr),
        "stdout_preview_redacted": proc.stdout[:160].replace("\n", " "),
        "secret_value_printed": False,
    }


def main() -> int:
    # Intentionally avoid `hermes doctor`, `hermes status`, and live TUI startup.
    # Those can touch private config/provider state and belong behind runtime gates.
    # Offline probes are limited to hermes --help and hermes --version.
    probes = [
        run_safe_probe(["hermes", "--help"]),
        run_safe_probe(["hermes", "--version"]),
    ]
    report = {
        "mission_id": MISSION_ID,
        "local_only": True,
        "provider_calls_executed": False,
        "secret_files_read": False,
        "live_gateway_started": False,
        "commands_skipped_by_policy": [
            "hermes doctor",
            "hermes status",
            "hermes model",
            "hermes gateway install",
            "hermes TUI prompt",
        ],
        "probes": probes,
        "hermes_cli_available": bool(shutil.which("hermes")),
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "ok": True,
        "hermes_cli_available": report["hermes_cli_available"],
        "probe_count": len(probes),
    }, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
