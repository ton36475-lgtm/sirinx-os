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

PROVIDER = "custom:maxplus-codex"
DEFAULT_MODEL = "deepseek-v4-flash"
DEFAULT_SMOKE_PROMPT = 'Reply with exactly this JSON and no extra text: {"ok": true, "source": "hermes-maxplus-smoke"}'

SECRET_PATTERNS = [
    re.compile(r"\b(?:sk|ccsk|xai|ghp|hf)-[A-Za-z0-9_\-]{12,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY"),
    re.compile(r"TELEGRAM[_-]?BOT[_-]?TOKEN[=:][^\s]+", re.IGNORECASE),
]

GATES = {
    "doctor": {
        "env": "APPROVE_HERMES_DOCTOR_CONFIG_CHECK",
        "kind": "runtime_config_check",
        "command": ["hermes", "doctor"],
        "timeout_seconds": 25,
        "provider_call": False,
        "live_send": False,
    },
    "status": {
        "env": "APPROVE_HERMES_STATUS_CONFIG_CHECK",
        "kind": "runtime_config_check",
        "command": ["hermes", "status"],
        "timeout_seconds": 25,
        "provider_call": False,
        "live_send": False,
    },
    "model_picker": {
        "env": "APPROVE_HERMES_MODEL_PICKER_CHECK",
        "kind": "interactive_config_check",
        "command": ["hermes", "model"],
        "timeout_seconds": 20,
        "provider_call": False,
        "live_send": False,
        "requires_allow_interactive": True,
    },
    "provider_smoke": {
        "env": "APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN",
        "kind": "one_turn_provider_smoke",
        "command_template": ["hermes", "-z", "{prompt}", "--provider", PROVIDER, "-m", "{model}"],
        "timeout_seconds": 60,
        "provider_call": True,
        "live_send": False,
        "requires_key_presence": True,
    },
    "gateway_setup": {
        "env": "APPROVE_HERMES_GATEWAY_LOCAL_SETUP",
        "kind": "gateway_plan_only",
        "command_template": ["hermes", "gateway", "status"],
        "timeout_seconds": 20,
        "provider_call": False,
        "live_send": False,
        "plan_only_reason": "Gateway setup can create live messaging surfaces; this harness writes an execution plan only.",
    },
    "cron_dry_run": {
        "env": "APPROVE_HERMES_CRON_LOCAL_DRY_RUN",
        "kind": "scheduler_plan_only",
        "command_template": ["hermes", "cron", "dry-run"],
        "timeout_seconds": 20,
        "provider_call": False,
        "live_send": False,
        "plan_only_reason": "Scheduler activation is recurring automation; this harness writes a dry-run plan only.",
    },
    "subagent_local": {
        "env": "APPROVE_HERMES_SUBAGENT_ONE_LOCAL_TASK",
        "kind": "subagent_plan_only",
        "command_template": ["hermes", "subagent", "run", "local-smoke"],
        "timeout_seconds": 30,
        "provider_call": False,
        "live_send": False,
        "plan_only_reason": "Subagent command shape is host/runtime-specific; this harness writes a single-task plan only.",
    },
    "mcp_connector": {
        "env": "CONNECTOR_SPECIFIC_MCP_GATE_REQUIRED",
        "kind": "connector_plan_only",
        "command_template": ["hermes", "mcp", "list"],
        "timeout_seconds": 20,
        "provider_call": False,
        "live_send": False,
        "plan_only_reason": "MCP mutation must be connector-specific and must not store secrets in repo.",
    },
}


def redact(text: str) -> str:
    redacted = text
    for pattern in SECRET_PATTERNS:
        redacted = pattern.sub("[REDACTED_SECRET]", redacted)
    return redacted


def gate_is_open(env_name: str) -> bool:
    return os.environ.get(env_name) == "1"


def render_command(name: str, spec: dict, prompt: str, model: str) -> list[str]:
    if "command" in spec:
        return list(spec["command"])
    command = []
    for part in spec["command_template"]:
        command.append(part.format(prompt=prompt, model=model))
    return command


def run_command(command: list[str], timeout_seconds: int) -> dict:
    if not shutil.which(command[0]):
        return {
            "executed": False,
            "available": False,
            "exit_code": None,
            "stdout_length": 0,
            "stderr_length": 0,
            "stdout_preview_redacted": "",
            "stderr_preview_redacted": "",
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


def build_gate_report(name: str, args: argparse.Namespace) -> dict:
    spec = GATES[name]
    command = render_command(
        name,
        spec,
        prompt=os.environ.get("MAXPLUS_HERMES_SMOKE_PROMPT", DEFAULT_SMOKE_PROMPT),
        model=os.environ.get("MAXPLUS_HERMES_CODEX_MODEL", DEFAULT_MODEL),
    )
    open_state = gate_is_open(spec["env"])
    key_present = bool(os.environ.get("MAXPLUS_CODEX_API_KEY"))
    report = {
        "mission_id": MISSION_ID,
        "gate_name": name,
        "gate_env": spec["env"],
        "kind": spec["kind"],
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "dry_run": not args.execute,
        "gate_open_in_environment": open_state,
        "key_present": key_present,
        "command_redacted": [
            "[PROMPT_REDACTED]" if part == os.environ.get("MAXPLUS_HERMES_SMOKE_PROMPT", DEFAULT_SMOKE_PROMPT) else part
            for part in command
        ],
        "policy": {
            "secret_value_printed": False,
            "private_env_values_read": False,
            "provider_call_intended": bool(spec.get("provider_call")),
            "live_send_intended": bool(spec.get("live_send")),
            "repo_mutation_intended": False,
        },
    }

    if not args.execute:
        report.update({
            "executed": False,
            "status": "dry_run_only",
            "next_step": f"Set {spec['env']}=1 and pass --execute only when this exact gate is approved.",
        })
        return report
    if not open_state:
        report.update({
            "executed": False,
            "status": "blocked_gate_env_missing",
            "blocked_reason": f"{spec['env']} must equal 1",
        })
        return report
    if spec.get("requires_key_presence") and not key_present:
        report.update({
            "executed": False,
            "status": "blocked_key_env_missing",
            "blocked_reason": "MAXPLUS_CODEX_API_KEY must be present in process env; value is never printed.",
        })
        return report
    if spec.get("requires_allow_interactive") and not args.allow_interactive:
        report.update({
            "executed": False,
            "status": "blocked_interactive_not_allowed",
            "blocked_reason": "Pass --allow-interactive from a terminal if this UI gate is intentionally opened.",
        })
        return report
    if spec.get("plan_only_reason"):
        report.update({
            "executed": False,
            "status": "plan_only",
            "blocked_reason": spec["plan_only_reason"],
            "manual_command_template": command,
        })
        return report

    result = run_command(command, timeout_seconds=spec["timeout_seconds"])
    report.update({
        "status": "executed_redacted",
        "result": result,
    })
    return report


def write_report(name: str, report: dict) -> tuple[Path, Path]:
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    RECEIPT_DIR.mkdir(parents=True, exist_ok=True)
    evidence_path = EVIDENCE_DIR / f"{MISSION_ID}.runtime_gate_{name}.json"
    receipt_path = RECEIPT_DIR / f"{MISSION_ID}.runtime_gate_{name}.receipt.json"
    evidence_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    receipt_status = {
        "dry_run_only": "dry-run",
        "plan_only": "simulated",
        "executed_redacted": "approved",
    }.get(report["status"], "blocked" if report["status"].startswith("blocked") else "dry-run")
    receipt = {
        "receipt_id": f"{MISSION_ID}-runtime-gate-{name}",
        "mission_id": MISSION_ID,
        "task_id": f"runtime-gate-{name}",
        "decision_id": f"decision-{MISSION_ID}-runtime-gate-{name}",
        "agent": "Codex_Builder",
        "action_tier": "B" if report["status"] == "dry_run_only" else "C",
        "status": receipt_status,
        "runtime_gate_status": report["status"],
        "files_touched": [str(evidence_path.relative_to(ROOT))],
        "validation_result": "recorded",
        "blocked_actions": [
            "secret_value_print",
            "private_env_value_read",
            "unapproved_provider_call",
            "unapproved_live_send",
            "unapproved_gateway_start",
            "unapproved_cron_activation",
            "unapproved_mcp_mutation",
        ],
        "created_at": report["generated_at"],
    }
    receipt["checksum"] = hashlib.sha256(json.dumps(receipt, sort_keys=True).encode("utf-8")).hexdigest()
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    return evidence_path, receipt_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Owner-gated Hermes MaxPlus runtime gate executor.")
    parser.add_argument("--gate", choices=sorted(GATES), help="Gate to inspect or execute.")
    parser.add_argument("--all", action="store_true", help="Dry-run all gates.")
    parser.add_argument("--execute", action="store_true", help="Execute a single gate only when its exact env gate is open.")
    parser.add_argument("--allow-interactive", action="store_true", help="Allow an interactive config command such as hermes model.")
    args = parser.parse_args()

    if args.all and args.execute:
        print("ERROR: --all is dry-run only; execute one gate at a time", file=sys.stderr)
        return 2
    if not args.all and not args.gate:
        print("ERROR: specify --all or --gate <name>", file=sys.stderr)
        return 2

    names = sorted(GATES) if args.all else [args.gate]
    summary = []
    for name in names:
        report = build_gate_report(name, args)
        evidence_path, receipt_path = write_report(name, report)
        summary.append({
            "gate": name,
            "status": report["status"],
            "executed": report.get("executed", False),
            "evidence_path": str(evidence_path.relative_to(ROOT)),
            "receipt_path": str(receipt_path.relative_to(ROOT)),
        })
    print(json.dumps({
        "ok": True,
        "execute": args.execute,
        "gate_count": len(summary),
        "summary": summary,
    }, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
