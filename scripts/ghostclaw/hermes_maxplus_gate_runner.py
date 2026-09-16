#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MISSION_ID = "MAXPLUS-HERMES-CHINESE-MODEL-20260630"
EVIDENCE_DIR = ROOT / ".ghostclaw_runtime/a2a2a/evidence"

GATES = {
    "installer_review": {
        "gate": "APPROVE_REVIEW_HERMES_INSTALLER_ONLY",
        "type": "review_only",
        "next_command": "download installer to temp path, hash it, inspect first lines; do not execute",
    },
    "installer_execute": {
        "gate": "APPROVE_EXECUTE_HERMES_INSTALLER_AFTER_REVIEW",
        "type": "dangerous_install",
        "next_command": "execute only a reviewed installer with rollback notes",
    },
    "private_config_write": {
        "gate": "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1",
        "type": "home_config_mutation",
        "next_command": "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1 python3 scripts/ghostclaw/apply_hermes_maxplus_private_config.py --write",
    },
    "doctor": {
        "gate": "APPROVE_HERMES_DOCTOR_CONFIG_CHECK",
        "type": "config_check",
        "next_command": "run hermes doctor and capture redacted output",
    },
    "status": {
        "gate": "APPROVE_HERMES_STATUS_CONFIG_CHECK",
        "type": "config_check",
        "next_command": "run hermes status and capture redacted output",
    },
    "model_picker": {
        "gate": "APPROVE_HERMES_MODEL_PICKER_CHECK",
        "type": "config_check",
        "next_command": "open hermes model picker without sending a prompt",
    },
    "provider_smoke": {
        "gate": "APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN",
        "type": "paid_provider_call",
        "next_command": "send one non-private smoke prompt and write receipt",
    },
    "gateway_setup": {
        "gate": "APPROVE_HERMES_GATEWAY_LOCAL_SETUP",
        "type": "gateway_setup",
        "next_command": "configure local gateway with live sends disabled",
    },
    "cron_dry_run": {
        "gate": "APPROVE_HERMES_CRON_LOCAL_DRY_RUN",
        "type": "scheduler_dry_run",
        "next_command": "create dry-run schedule only, no provider loop",
    },
    "subagent_local": {
        "gate": "APPROVE_HERMES_SUBAGENT_ONE_LOCAL_TASK",
        "type": "local_runtime_task",
        "next_command": "run one local non-secret subagent task",
    },
    "mcp_connector": {
        "gate": "CONNECTOR_SPECIFIC_MCP_GATE_REQUIRED",
        "type": "connector_config",
        "next_command": "prepare connector-specific config diff without secrets",
    },
}


def current_preflight() -> dict:
    proc = subprocess.run(
        ["python3", "scripts/ghostclaw/hermes_maxplus_preflight.py"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    try:
        parsed = json.loads(proc.stdout)
    except json.JSONDecodeError:
        parsed = {"parse_error": True, "stdout_length": len(proc.stdout)}
    return {
        "exit_code": proc.returncode,
        "stdout_json": parsed,
        "stderr_length": len(proc.stderr),
    }


def gate_state(name: str, dry_run: bool) -> dict:
    spec = GATES[name]
    env_name = spec["gate"].split("=")[0]
    gate_open = os.environ.get(env_name) == "1" if "=" in spec["gate"] else os.environ.get(env_name) == "1"
    return {
        "mission_id": MISSION_ID,
        "gate_name": name,
        "gate": spec["gate"],
        "type": spec["type"],
        "dry_run": dry_run,
        "gate_open_in_environment": gate_open,
        "would_execute": False,
        "executed": False,
        "next_command": spec["next_command"],
        "policy": {
            "secret_value_printed": False,
            "provider_call_executed": False,
            "live_send_executed": False,
            "home_config_mutated": False,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Dry-run Hermes MaxPlus gate runner.")
    parser.add_argument("--gate", choices=sorted(GATES), help="One gate to inspect.")
    parser.add_argument("--all", action="store_true", help="Inspect all gates.")
    parser.add_argument("--dry-run", action="store_true", help="Required; do not execute gates.")
    args = parser.parse_args()

    if not args.dry_run:
        print("ERROR: this runner currently supports --dry-run only", file=sys.stderr)
        return 2
    if not args.all and not args.gate:
        print("ERROR: specify --all or --gate <name>", file=sys.stderr)
        return 2

    names = sorted(GATES) if args.all else [args.gate]
    report = {
        "mission_id": MISSION_ID,
        "dry_run": True,
        "preflight": current_preflight(),
        "gates": [gate_state(name, dry_run=True) for name in names if name],
    }
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    if args.all:
        evidence_name = "MAXPLUS-HERMES-CHINESE-MODEL-20260630.gate_runner_all_dry_run.json"
    else:
        evidence_name = f"MAXPLUS-HERMES-CHINESE-MODEL-20260630.gate_runner_{args.gate}_dry_run.json"
    path = EVIDENCE_DIR / evidence_name
    path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "ok": True,
        "dry_run": True,
        "gate_count": len(report["gates"]),
        "evidence_path": str(path.relative_to(ROOT)),
    }, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
