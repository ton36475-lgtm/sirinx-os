#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MISSION_ID = "MAXPLUS-HERMES-CHINESE-MODEL-20260630"
EVIDENCE_DIR = ROOT / ".ghostclaw_runtime/a2a2a/evidence"
RECEIPT_DIR = ROOT / ".ghostclaw_runtime/a2a2a/receipts"
REPORT_PATH = ROOT / "docs/ghostclaw/MAXPLUS_HERMES_RUNTIME_COMPLETION_VERIFIER.md"
EVIDENCE_PATH = EVIDENCE_DIR / f"{MISSION_ID}.runtime_completion_verification.json"
RECEIPT_PATH = RECEIPT_DIR / f"{MISSION_ID}.runtime_completion_verification.receipt.json"

SECRET_PATTERNS = [
    re.compile(r"\b(?:sk|ccsk|xai|ghp|hf)-[A-Za-z0-9_.\-]{12,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY"),
    re.compile(r"TELEGRAM[_-]?BOT[_-]?TOKEN[=:][^\s]+", re.IGNORECASE),
]

REQUIRED_RUNTIME_STAGES = [
    {
        "stage": "private_config_write",
        "evidence": EVIDENCE_DIR / f"{MISSION_ID}.activation_controller_private_config_write.json",
        "acceptable_statuses": {"executed_redacted"},
        "required_policy_false": ["secret_value_printed", "private_env_values_read"],
    },
    {
        "stage": "safe_status_after_private_write",
        "evidence": EVIDENCE_DIR / f"{MISSION_ID}.activation_controller_status.json",
        "acceptable_statuses": {"safe_status_recorded"},
        "depends_on": ["private_config_write"],
        "required_policy_false": [
            "secret_value_printed",
            "private_env_values_read",
            "provider_call_executed",
            "gateway_started",
            "cron_activated",
            "mcp_mutated",
        ],
    },
    {
        "stage": "doctor",
        "evidence": EVIDENCE_DIR / f"{MISSION_ID}.activation_controller_doctor.json",
        "acceptable_statuses": {"executed_redacted"},
        "depends_on": ["private_config_write", "safe_status_after_private_write"],
        "required_policy_false": ["secret_value_printed", "private_env_values_read", "live_send_intended"],
    },
    {
        "stage": "runtime_status",
        "evidence": EVIDENCE_DIR / f"{MISSION_ID}.activation_controller_runtime_status.json",
        "acceptable_statuses": {"executed_redacted"},
        "depends_on": ["doctor"],
        "required_policy_false": ["secret_value_printed", "private_env_values_read", "live_send_intended"],
    },
    {
        "stage": "model_picker",
        "evidence": EVIDENCE_DIR / f"{MISSION_ID}.activation_controller_model_picker.json",
        "acceptable_statuses": {"executed_redacted"},
        "depends_on": ["runtime_status"],
        "required_policy_false": ["secret_value_printed", "private_env_values_read", "live_send_intended"],
    },
    {
        "stage": "provider_smoke",
        "evidence": EVIDENCE_DIR / f"{MISSION_ID}.activation_controller_provider_smoke.json",
        "acceptable_statuses": {"executed_redacted"},
        "depends_on": ["model_picker"],
        "required_policy_false": ["secret_value_printed", "private_env_values_read", "live_send_intended"],
        "provider_call_expected": True,
    },
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def contains_secret_like_text(path: Path) -> bool:
    text = path.read_text(encoding="utf-8", errors="replace")
    return any(pattern.search(text) for pattern in SECRET_PATTERNS)


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def nested_exit_code_ok(document: dict) -> bool:
    result = document.get("result", {})
    if isinstance(result, dict) and "exit_code" in result:
        return result.get("exit_code") == 0
    if document.get("mode") == "status":
        results = document.get("results", [])
        return bool(results) and all(item.get("result", {}).get("exit_code") == 0 for item in results)
    return False


def check_stage(stage: dict) -> dict:
    path = stage["evidence"]
    check = {
        "stage": stage["stage"],
        "evidence": rel(path),
        "present": path.exists(),
        "status": "missing",
        "exit_code_ok": False,
        "policy_ok": False,
        "secret_scan_ok": False,
        "provider_call_expected": bool(stage.get("provider_call_expected")),
        "depends_on": list(stage.get("depends_on", [])),
        "dependency_ok": True,
        "complete": False,
    }
    if not path.exists():
        return check
    check["secret_scan_ok"] = not contains_secret_like_text(path)
    try:
        document = load_json(path)
    except json.JSONDecodeError as exc:
        check["status"] = "json_parse_failed"
        check["error"] = str(exc)
        return check

    check["status"] = document.get("status")
    check["exit_code_ok"] = nested_exit_code_ok(document)
    policy = document.get("policy", {})
    check["policy_ok"] = all(policy.get(flag) is False for flag in stage["required_policy_false"])
    if stage.get("provider_call_expected"):
        check["provider_call_intended"] = policy.get("provider_call_intended")
    check["sha256"] = sha256_file(path)
    check["complete"] = (
        check["status"] in stage["acceptable_statuses"]
        and check["exit_code_ok"]
        and check["policy_ok"]
        and check["secret_scan_ok"]
    )
    return check


def build_report() -> dict:
    stage_checks = [check_stage(stage) for stage in REQUIRED_RUNTIME_STAGES]
    checks_by_stage = {item["stage"]: item for item in stage_checks}
    for item in stage_checks:
        dependencies = item.get("depends_on", [])
        if dependencies:
            item["dependency_ok"] = all(checks_by_stage.get(dep, {}).get("complete") for dep in dependencies)
            item["complete"] = item["complete"] and item["dependency_ok"]
    complete_stages = [item["stage"] for item in stage_checks if item["complete"]]
    incomplete_stages = [item["stage"] for item in stage_checks if not item["complete"]]
    overall_status = "runtime_complete_evidence_verified" if not incomplete_stages else "runtime_incomplete_waiting_for_owner_gate"
    return {
        "mission_id": MISSION_ID,
        "generated_at": now_iso(),
        "overall_status": overall_status,
        "runtime_complete": not incomplete_stages,
        "complete_stage_count": len(complete_stages),
        "incomplete_stage_count": len(incomplete_stages),
        "complete_stages": complete_stages,
        "incomplete_stages": incomplete_stages,
        "policy": {
            "secret_values_read": False,
            "private_env_values_read": False,
            "provider_call_executed_by_verifier": False,
            "gateway_started_by_verifier": False,
            "cron_activated_by_verifier": False,
            "mcp_mutated_by_verifier": False,
            "push_executed_by_verifier": False,
            "deploy_executed_by_verifier": False,
        },
        "stage_checks": stage_checks,
        "next_gate": "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1" if incomplete_stages else "review runtime completion report",
    }


def write_markdown(report: dict) -> str:
    rows = []
    for item in report["stage_checks"]:
        rows.append(
            f"| `{item['stage']}` | `{item['status']}` | `{item['present']}` | `{item['exit_code_ok']}` | `{item['policy_ok']}` | `{item['secret_scan_ok']}` | `{item['dependency_ok']}` | `{item['complete']}` |"
        )
    body = "\n".join(
        [
            "# MaxPlus Hermes Runtime Completion Verifier",
            "",
            f"Mission ID: `{MISSION_ID}`",
            f"Generated: `{report['generated_at']}`",
            f"Overall status: `{report['overall_status']}`",
            "",
            "This verifier reads only local runtime evidence JSON files. It does not read `~/.hermes/.env`, print secrets, run Hermes commands, call providers, start gateway, activate cron, mutate MCP connectors, push, or deploy.",
            "",
            "## Runtime Stage Checks",
            "",
            "| Stage | Status | Evidence present | Exit code OK | Policy OK | Secret scan OK | Dependency OK | Complete |",
            "| --- | --- | --- | --- | --- | --- | --- | --- |",
            *rows,
            "",
            "## Next Gate",
            "",
            f"`{report['next_gate']}`",
            "",
        ]
    )
    REPORT_PATH.write_text(body, encoding="utf-8")
    return body


def write_receipt(report: dict, report_sha: str) -> dict:
    receipt = {
        "receipt_id": f"{MISSION_ID}-runtime-completion-verification",
        "mission_id": MISSION_ID,
        "task_id": "runtime-completion-verification",
        "decision_id": f"decision-{MISSION_ID}-runtime-completion-verification",
        "agent": "Validator_Worker",
        "action_tier": "B",
        "status": "auto-approved",
        "runtime_completion_status": report["overall_status"],
        "files_touched": [
            rel(EVIDENCE_PATH),
            rel(REPORT_PATH),
        ],
        "validation_result": report["overall_status"],
        "blocked_actions": [
            "secret_value_print",
            "private_env_value_read",
            "provider_call",
            "gateway_start",
            "cron_activation",
            "mcp_mutation",
            "push",
            "deploy",
        ],
        "checksums": {
            rel(EVIDENCE_PATH): sha256_file(EVIDENCE_PATH),
            rel(REPORT_PATH): report_sha,
        },
        "created_at": report["generated_at"],
    }
    receipt["checksum"] = hashlib.sha256(json.dumps(receipt, sort_keys=True).encode("utf-8")).hexdigest()
    return receipt


def main() -> int:
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    RECEIPT_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    report = build_report()
    EVIDENCE_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    markdown = write_markdown(report)
    receipt = write_receipt(report, hashlib.sha256(markdown.encode("utf-8")).hexdigest())
    RECEIPT_PATH.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "ok": True,
        "overall_status": report["overall_status"],
        "runtime_complete": report["runtime_complete"],
        "complete_stage_count": report["complete_stage_count"],
        "incomplete_stage_count": report["incomplete_stage_count"],
        "evidence_path": rel(EVIDENCE_PATH),
        "report_path": rel(REPORT_PATH),
        "receipt_path": rel(RECEIPT_PATH),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
