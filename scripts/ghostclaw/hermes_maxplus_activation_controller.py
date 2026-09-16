#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MISSION_ID = "MAXPLUS-HERMES-CHINESE-MODEL-20260630"
EVIDENCE_DIR = ROOT / ".ghostclaw_runtime/a2a2a/evidence"
RECEIPT_DIR = ROOT / ".ghostclaw_runtime/a2a2a/receipts"
KEY_ENV = "MAXPLUS_CODEX_API_KEY"

SECRET_PATTERNS = [
    re.compile(r"\b(?:sk|ccsk|xai|ghp|hf)-[A-Za-z0-9_.\-]{12,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY"),
    re.compile(r"TELEGRAM[_-]?BOT[_-]?TOKEN[=:][^\s]+", re.IGNORECASE),
]

STAGES = [
    {
        "name": "private_config_dry_run",
        "order": 10,
        "action_tier": "A",
        "description": "Check private config template readiness without writing home files.",
        "command": ["python3", "scripts/ghostclaw/apply_hermes_maxplus_private_config.py", "--dry-run"],
        "safe_auto": True,
        "timeout_seconds": 20,
    },
    {
        "name": "private_config_write",
        "order": 20,
        "action_tier": "C",
        "description": "Write ~/.hermes/config.yaml and ~/.hermes/.env from repo templates.",
        "command": ["python3", "scripts/ghostclaw/apply_hermes_maxplus_private_config.py", "--write"],
        "gate_env": "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG",
        "requires_key_env": KEY_ENV,
        "timeout_seconds": 20,
    },
    {
        "name": "preflight",
        "order": 30,
        "action_tier": "A",
        "description": "Run presence-only Hermes MaxPlus preflight.",
        "command": ["python3", "scripts/ghostclaw/hermes_maxplus_preflight.py"],
        "safe_auto": True,
        "timeout_seconds": 20,
    },
    {
        "name": "cli_offline_preflight",
        "order": 40,
        "action_tier": "A",
        "description": "Probe Hermes CLI help/version only, with provider calls skipped.",
        "command": ["python3", "scripts/ghostclaw/hermes_cli_offline_preflight.py"],
        "safe_auto": True,
        "timeout_seconds": 20,
    },
    {
        "name": "runtime_gate_inventory",
        "order": 50,
        "action_tier": "B",
        "description": "Refresh dry-run runtime gate evidence for all Hermes checks.",
        "command": ["python3", "scripts/ghostclaw/hermes_maxplus_runtime_gate_executor.py", "--all"],
        "safe_auto": True,
        "timeout_seconds": 30,
    },
    {
        "name": "doctor",
        "order": 60,
        "action_tier": "C",
        "description": "Run hermes doctor through the runtime gate executor.",
        "runtime_gate": "doctor",
        "gate_env": "APPROVE_HERMES_DOCTOR_CONFIG_CHECK",
        "timeout_seconds": 35,
    },
    {
        "name": "status",
        "order": 70,
        "action_tier": "C",
        "description": "Run hermes status through the runtime gate executor.",
        "runtime_gate": "status",
        "gate_env": "APPROVE_HERMES_STATUS_CONFIG_CHECK",
        "timeout_seconds": 35,
    },
    {
        "name": "model_picker",
        "order": 80,
        "action_tier": "C",
        "description": "Open the interactive Hermes model picker through the runtime gate executor.",
        "runtime_gate": "model_picker",
        "gate_env": "APPROVE_HERMES_MODEL_PICKER_CHECK",
        "requires_allow_interactive": True,
        "timeout_seconds": 30,
    },
    {
        "name": "provider_smoke",
        "order": 90,
        "action_tier": "C",
        "description": "Run one minimal MaxPlus provider smoke through Hermes.",
        "runtime_gate": "provider_smoke",
        "gate_env": "APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN",
        "requires_key_env": KEY_ENV,
        "provider_call": True,
        "timeout_seconds": 75,
    },
    {
        "name": "gateway_setup",
        "order": 100,
        "action_tier": "C",
        "description": "Create gateway setup evidence only; live gateway remains blocked.",
        "runtime_gate": "gateway_setup",
        "gate_env": "APPROVE_HERMES_GATEWAY_LOCAL_SETUP",
        "plan_only": True,
        "timeout_seconds": 30,
    },
    {
        "name": "cron_dry_run",
        "order": 110,
        "action_tier": "C",
        "description": "Create cron dry-run evidence only; recurring activation remains blocked.",
        "runtime_gate": "cron_dry_run",
        "gate_env": "APPROVE_HERMES_CRON_LOCAL_DRY_RUN",
        "plan_only": True,
        "timeout_seconds": 30,
    },
    {
        "name": "subagent_local",
        "order": 120,
        "action_tier": "C",
        "description": "Create one local subagent task plan only.",
        "runtime_gate": "subagent_local",
        "gate_env": "APPROVE_HERMES_SUBAGENT_ONE_LOCAL_TASK",
        "plan_only": True,
        "timeout_seconds": 40,
    },
    {
        "name": "mcp_connector",
        "order": 130,
        "action_tier": "C",
        "description": "Create connector-specific MCP plan only.",
        "runtime_gate": "mcp_connector",
        "gate_env": "CONNECTOR_SPECIFIC_MCP_GATE_REQUIRED",
        "plan_only": True,
        "timeout_seconds": 30,
    },
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def redact(text: str) -> str:
    redacted = text
    for pattern in SECRET_PATTERNS:
        redacted = pattern.sub("[REDACTED_SECRET]", redacted)
    return redacted


def relative(path: Path) -> str:
    return str(path.relative_to(ROOT))


def command_for_stage(stage: dict, execute: bool, allow_interactive: bool) -> list[str]:
    if stage.get("runtime_gate"):
        command = [
            "python3",
            "scripts/ghostclaw/hermes_maxplus_runtime_gate_executor.py",
            "--gate",
            stage["runtime_gate"],
        ]
        if execute:
            command.append("--execute")
        if stage.get("requires_allow_interactive") and allow_interactive:
            command.append("--allow-interactive")
        return command
    return list(stage["command"])


def gate_open(stage: dict) -> bool | None:
    env_name = stage.get("gate_env")
    if not env_name:
        return None
    return os.environ.get(env_name) == "1"


def key_present(stage: dict) -> bool | None:
    env_name = stage.get("requires_key_env")
    if not env_name:
        return None
    return bool(os.environ.get(env_name))


def stage_plan(stage: dict) -> dict:
    default_status = "auto_safe_available" if stage.get("safe_auto") else "closed_until_exact_gate"
    if stage.get("plan_only"):
        default_status = "plan_only_until_exact_gate"
    return {
        "name": stage["name"],
        "order": stage["order"],
        "action_tier": stage["action_tier"],
        "description": stage["description"],
        "default_status": default_status,
        "safe_auto": bool(stage.get("safe_auto")),
        "plan_only": bool(stage.get("plan_only")),
        "provider_call": bool(stage.get("provider_call")),
        "gate_env": stage.get("gate_env"),
        "gate_open_in_environment": gate_open(stage),
        "requires_key_env": stage.get("requires_key_env"),
        "key_present_in_environment": key_present(stage),
        "requires_allow_interactive": bool(stage.get("requires_allow_interactive")),
        "command_redacted": command_for_stage(stage, execute=not stage.get("safe_auto"), allow_interactive=False),
    }


def run_command(command: list[str], timeout_seconds: int) -> dict:
    if not shutil.which(command[0]):
        return {
            "executed": False,
            "available": False,
            "exit_code": None,
            "stdout_length": 0,
            "stderr_length": 0,
            "stdout_preview_redacted": "",
            "stderr_preview_redacted": f"{command[0]} not found",
        }
    try:
        proc = subprocess.run(
            command,
            cwd=ROOT,
            text=True,
            capture_output=True,
            timeout=timeout_seconds,
            check=False,
        )
        return {
            "executed": True,
            "available": True,
            "exit_code": proc.returncode,
            "stdout_length": len(proc.stdout),
            "stderr_length": len(proc.stderr),
            "stdout_preview_redacted": redact(proc.stdout[:2000]),
            "stderr_preview_redacted": redact(proc.stderr[:2000]),
        }
    except subprocess.TimeoutExpired as exc:
        return {
            "executed": True,
            "available": True,
            "timed_out": True,
            "exit_code": None,
            "stdout_length": len(exc.stdout or ""),
            "stderr_length": len(exc.stderr or ""),
            "stdout_preview_redacted": redact((exc.stdout or "")[:2000]),
            "stderr_preview_redacted": redact((exc.stderr or "")[:2000]),
        }


def build_plan_report() -> dict:
    return {
        "mission_id": MISSION_ID,
        "mode": "plan",
        "status": "plan_recorded",
        "generated_at": now_iso(),
        "objective": "Sequence Hermes MaxPlus activation without secret printing or unapproved runtime gates.",
        "policy": {
            "secret_value_printed": False,
            "private_env_values_read": False,
            "provider_call_executed": False,
            "gateway_started": False,
            "cron_activated": False,
            "subagent_started": False,
            "mcp_mutated": False,
            "push_executed": False,
            "deploy_executed": False,
        },
        "stages": [stage_plan(stage) for stage in STAGES],
        "next_safe_command": "python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --status",
    }


def build_status_report(allow_interactive: bool) -> dict:
    safe_stage_names = {
        "private_config_dry_run",
        "preflight",
        "cli_offline_preflight",
        "runtime_gate_inventory",
    }
    results = []
    for stage in STAGES:
        if stage["name"] not in safe_stage_names:
            continue
        command = command_for_stage(stage, execute=False, allow_interactive=allow_interactive)
        result = run_command(command, timeout_seconds=stage["timeout_seconds"])
        results.append({
            "stage": stage["name"],
            "command_redacted": command,
            "result": result,
        })
    return {
        "mission_id": MISSION_ID,
        "mode": "status",
        "status": "safe_status_recorded",
        "generated_at": now_iso(),
        "policy": {
            "secret_value_printed": False,
            "private_env_values_read": False,
            "provider_call_executed": False,
            "gateway_started": False,
            "cron_activated": False,
            "mcp_mutated": False,
        },
        "results": results,
    }


def execute_stage(stage_name: str, allow_interactive: bool) -> dict:
    stage = next((item for item in STAGES if item["name"] == stage_name), None)
    if stage is None:
        raise ValueError(f"unknown stage: {stage_name}")

    report = {
        "mission_id": MISSION_ID,
        "mode": "execute_stage",
        "stage": stage_name,
        "action_tier": stage["action_tier"],
        "generated_at": now_iso(),
        "policy": {
            "secret_value_printed": False,
            "private_env_values_read": False,
            "provider_call_intended": bool(stage.get("provider_call")),
            "live_send_intended": False,
        },
    }

    if not stage.get("safe_auto"):
        if gate_open(stage) is False:
            report.update({
                "status": "blocked_gate_env_missing",
                "executed": False,
                "blocked_reason": f"{stage['gate_env']} must equal 1.",
            })
            return report
        if key_present(stage) is False:
            report.update({
                "status": "blocked_key_env_missing",
                "executed": False,
                "blocked_reason": f"{stage['requires_key_env']} must be present in process env; the value is never printed.",
            })
            return report
        if stage.get("requires_allow_interactive") and not allow_interactive:
            report.update({
                "status": "blocked_interactive_not_allowed",
                "executed": False,
                "blocked_reason": "Pass --allow-interactive from a terminal after opening the exact model picker gate.",
            })
            return report

    command = command_for_stage(stage, execute=not stage.get("safe_auto"), allow_interactive=allow_interactive)
    result = run_command(command, timeout_seconds=stage["timeout_seconds"])
    report.update({
        "status": "executed_redacted" if result.get("exit_code") == 0 else "executed_redacted_nonzero",
        "executed": bool(result.get("executed")),
        "command_redacted": command,
        "result": result,
    })
    return report


def receipt_status(report: dict) -> str:
    status = report["status"]
    if status in {"plan_recorded", "safe_status_recorded"}:
        return "dry-run"
    if status == "executed_redacted":
        return "auto-approved" if report.get("action_tier") in {"A", "B"} else "approved"
    if status.startswith("blocked"):
        return "blocked"
    return "validation-failed"


def action_tier_for_report(report: dict) -> str:
    if "action_tier" in report:
        return str(report["action_tier"])
    if report["mode"] == "status":
        return "B"
    return "B"


def write_artifacts(report: dict) -> tuple[Path, Path]:
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    RECEIPT_DIR.mkdir(parents=True, exist_ok=True)
    if report["mode"] == "plan":
        evidence_path = EVIDENCE_DIR / f"{MISSION_ID}.activation_controller_plan.json"
    elif report["mode"] == "status":
        evidence_path = EVIDENCE_DIR / f"{MISSION_ID}.activation_controller_status.json"
    else:
        stage_slug = "runtime_status" if report["stage"] == "status" else report["stage"]
        evidence_path = EVIDENCE_DIR / f"{MISSION_ID}.activation_controller_{stage_slug}.json"
    receipt_path = RECEIPT_DIR / f"{MISSION_ID}.activation_controller.receipt.json"

    evidence_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    receipt = {
        "receipt_id": f"{MISSION_ID}-activation-controller",
        "mission_id": MISSION_ID,
        "task_id": f"activation-controller-{report['mode']}",
        "decision_id": f"decision-{MISSION_ID}-activation-controller",
        "agent": "Codex_Builder",
        "action_tier": action_tier_for_report(report),
        "status": receipt_status(report),
        "activation_controller_status": report["status"],
        "files_touched": [relative(evidence_path)],
        "validation_result": "recorded",
        "blocked_actions": [
            "secret_value_print",
            "private_env_value_read",
            "unapproved_provider_call",
            "unapproved_live_send",
            "unapproved_gateway_start",
            "unapproved_cron_activation",
            "unapproved_subagent_runtime",
            "unapproved_mcp_mutation",
            "push",
            "deploy",
        ],
        "created_at": report["generated_at"],
    }
    receipt["checksum"] = hashlib.sha256(json.dumps(receipt, sort_keys=True).encode("utf-8")).hexdigest()
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    return evidence_path, receipt_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Local-safe Hermes MaxPlus activation sequence controller.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--plan", action="store_true", help="Write the activation sequence plan. This is the default.")
    mode.add_argument("--status", action="store_true", help="Run only local-safe status probes and write evidence.")
    mode.add_argument("--execute-stage", choices=[stage["name"] for stage in STAGES], help="Execute one stage only when its exact gate allows it.")
    parser.add_argument("--allow-interactive", action="store_true", help="Allow an interactive stage such as model_picker.")
    args = parser.parse_args()

    try:
        if args.status:
            report = build_status_report(allow_interactive=args.allow_interactive)
        elif args.execute_stage:
            report = execute_stage(args.execute_stage, allow_interactive=args.allow_interactive)
        else:
            report = build_plan_report()
        evidence_path, receipt_path = write_artifacts(report)
    except ValueError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    print(json.dumps({
        "ok": not str(report["status"]).startswith("blocked") and report["status"] != "executed_redacted_nonzero",
        "mode": report["mode"],
        "status": report["status"],
        "evidence_path": relative(evidence_path),
        "receipt_path": relative(receipt_path),
    }, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
