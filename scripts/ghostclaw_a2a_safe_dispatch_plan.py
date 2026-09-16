#!/usr/bin/env python3
"""Build a safe local dispatch plan from A2A2A dry-run evidence.

This planner does not dispatch queue packets, start workers, send Telegram
messages, call providers, read secrets, install dependencies, deploy, or push.
It converts the current dry-run reconcile view plus Telegram config into a
reviewable gate matrix for the next operator decision.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
PACKET_ID = "A2A2A-P002-SAFE-LOCAL-DISPATCH-PLAN-20260703"
DEFAULT_TELEGRAM_CONFIG = "configs/hermes_telegram_gateway.config.json"
DEFAULT_EVIDENCE_PATH = f".ghostclaw_runtime/a2a2a/evidence/{PACKET_ID}.json"
DEFAULT_RECEIPT_PATH = f".ghostclaw_runtime/a2a2a/receipts/{PACKET_ID}.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def resolve_under_root(root: Path, value: str) -> Path:
    path = Path(value).expanduser()
    if not path.is_absolute():
        path = root / path
    return path.resolve()


def rel(root: Path, path: Path) -> str:
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")


def validate_telegram_config(config: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    if config.get("$schema") != "ghostclaw.hermes.telegram_gateway.config.v1":
        issues.append("telegram_config_schema_mismatch")
    if config.get("gateway", {}).get("defaultLiveSend") is not False:
        issues.append("telegram_default_live_send_not_false")
    if config.get("gateway", {}).get("webhook", {}).get("enabled") is not False:
        issues.append("telegram_webhook_not_disabled")
    if config.get("gateway", {}).get("polling", {}).get("enabled") is not False:
        issues.append("telegram_polling_not_disabled")
    if config.get("routing", {}).get("queuePayloadExecution") is not False:
        issues.append("telegram_queue_payload_execution_not_false")
    if config.get("credentials", {}).get("storeValuesInRepo") is not False:
        issues.append("telegram_credentials_store_values_not_false")
    if config.get("credentials", {}).get("printValues") is not False:
        issues.append("telegram_credentials_print_values_not_false")
    if config.get("gates", {}).get("liveSend", {}).get("status") != "closed":
        issues.append("telegram_live_send_gate_not_closed")
    if config.get("gates", {}).get("webhookActivation", {}).get("status") != "closed":
        issues.append("telegram_webhook_gate_not_closed")
    if config.get("gates", {}).get("runtimeRestart", {}).get("status") != "closed":
        issues.append("telegram_runtime_restart_gate_not_closed")
    return issues


def load_current_dry_run(root: Path) -> dict[str, Any]:
    script_path = root / "scripts" / "ghostclaw_a2a_queue_coordinator.py"
    spec = importlib.util.spec_from_file_location("ghostclaw_a2a_queue_coordinator", script_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load coordinator from {script_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.configure_root(str(root))
    return module.coordinate(write_receipt=False, dry_run=True)


def compact_item(item: dict[str, Any]) -> dict[str, Any]:
    result = {
        "id": item.get("id"),
        "path": item.get("path"),
        "title": item.get("title"),
        "agent": item.get("agent"),
        "risk": item.get("risk"),
        "decision": item.get("decision"),
        "blockers": item.get("blockers", []),
    }
    if item.get("gate_lane"):
        result["gate_lane"] = item.get("gate_lane")
    if item.get("required_gates"):
        result["required_gates"] = item.get("required_gates")
    if item.get("worker_packets"):
        result["planned_worker_packets"] = item.get("worker_packets")
    return result


def build_gate_matrix(telegram_config: dict[str, Any]) -> list[dict[str, Any]]:
    gates = telegram_config.get("gates", {})
    return [
        {
            "gate": "safe_local_dispatch_plan",
            "status": "open_for_plan_only",
            "allows": ["write_plan_evidence", "write_plan_receipt", "review_local_candidates"],
            "blocks": ["write_worker_packets", "execute_queue_payloads", "start_or_restart_workers"],
        },
        {
            "gate": "telegram_live_send",
            "status": gates.get("liveSend", {}).get("status", "unknown"),
            "required_approval": gates.get("liveSend", {}).get("requiredApproval"),
            "allowed_now": False,
        },
        {
            "gate": "telegram_webhook_activation",
            "status": gates.get("webhookActivation", {}).get("status", "unknown"),
            "required_approval": gates.get("webhookActivation", {}).get("requiredApproval"),
            "allowed_now": False,
        },
        {
            "gate": "hermes_gateway_restart",
            "status": gates.get("runtimeRestart", {}).get("status", "unknown"),
            "required_approval": gates.get("runtimeRestart", {}).get("requiredApproval"),
            "allowed_now": False,
        },
        {"gate": "provider_or_paid_model_call", "status": "closed", "allowed_now": False},
        {"gate": "install_or_migration", "status": "closed", "allowed_now": False},
        {"gate": "push_or_deploy", "status": "closed", "allowed_now": False},
        {"gate": "secret_or_env_value_read", "status": "closed", "allowed_now": False},
    ]


def build_plan(root: Path, dry_run_report: dict[str, Any], telegram_config: dict[str, Any], source_paths: dict[str, str]) -> dict[str, Any]:
    telegram_issues = validate_telegram_config(telegram_config)
    would_dispatch = dry_run_report.get("would_dispatch", [])
    would_gate = dry_run_report.get("would_gate", [])
    observed = dry_run_report.get("observed", [])
    packet_counts = dry_run_report.get("packet_counts", {})

    status = "ready_for_safe_local_review_not_live_dispatch"
    if telegram_issues:
        status = "blocked_invalid_telegram_gateway_config"
    elif not dry_run_report.get("dry_run"):
        status = "blocked_missing_dry_run_reconcile_source"

    plan = {
        "schema": "ghostclaw.a2a2a.safe_dispatch_plan.v1",
        "packet_id": PACKET_ID,
        "status": status,
        "mode": "safe_local_dispatch_plan_no_execution",
        "created_at": now_iso(),
        "repo": str(root),
        "source_paths": source_paths,
        "summary": {
            "dry_run_status": dry_run_report.get("status"),
            "dry_run_mode": dry_run_report.get("mode"),
            "total_packets": packet_counts.get("total", 0),
            "safe_local_dispatch_candidates": len(would_dispatch),
            "approval_gated_candidates": len(would_gate),
            "observed_packets": len(observed),
            "workers_planned": dry_run_report.get("workers_planned", []),
            "workers_used": [],
        },
        "telegram_gateway": {
            "config_id": telegram_config.get("config_id"),
            "status": telegram_config.get("status"),
            "mode": telegram_config.get("mode"),
            "approval_reference": telegram_config.get("approval_reference"),
            "default_live_send": telegram_config.get("gateway", {}).get("defaultLiveSend"),
            "webhook_enabled": telegram_config.get("gateway", {}).get("webhook", {}).get("enabled"),
            "polling_enabled": telegram_config.get("gateway", {}).get("polling", {}).get("enabled"),
            "queue_payload_execution": telegram_config.get("routing", {}).get("queuePayloadExecution"),
            "issues": telegram_issues,
        },
        "planned_safe_local_dispatch": [compact_item(item) for item in would_dispatch],
        "approval_gate_queue": [compact_item(item) for item in would_gate],
        "gate_matrix": build_gate_matrix(telegram_config),
        "blocked_actions_preserved": {
            "write_worker_packets": False,
            "write_gate_records": False,
            "runtime_queue_execution": False,
            "queue_payload_execution": False,
            "tmux_start_stop_restart": False,
            "telegram_live_send": False,
            "telegram_webhook_activation": False,
            "telegram_polling_start": False,
            "provider_call": False,
            "paid_model_call": False,
            "install": False,
            "migration": False,
            "push": False,
            "deploy": False,
            "cloud_mutation": False,
            "secret_read": False,
            "env_value_read": False,
        },
        "next_safe_action": "Review this plan, then decide whether to open a separate exact gate for local worker-packet dispatch only.",
    }
    return plan


def build_receipt(plan: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.safe_dispatch_plan_receipt.v1",
        "packet_id": PACKET_ID,
        "status": plan["status"],
        "mode": plan["mode"],
        "created_at": now_iso(),
        "repo": plan["repo"],
        "evidence_path": evidence_path,
        "summary": plan["summary"],
        "telegram_gateway": plan["telegram_gateway"],
        "gate_matrix": plan["gate_matrix"],
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": plan["next_safe_action"],
        "completion_claim": "P002 safe local dispatch plan written; no live dispatch or external action performed",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Build an A2A2A safe local dispatch plan.")
    parser.add_argument("--root", default=str(REPO_ROOT), help="repo root")
    parser.add_argument("--dry-run-report", default=None, help="existing dry-run reconcile JSON; if omitted, run coordinator dry-run")
    parser.add_argument("--telegram-config", default=DEFAULT_TELEGRAM_CONFIG, help="Telegram gateway config JSON")
    parser.add_argument("--output", default=DEFAULT_EVIDENCE_PATH, help="plan evidence path")
    parser.add_argument("--receipt", default=DEFAULT_RECEIPT_PATH, help="receipt path")
    parser.add_argument("--write", action="store_true", help="write plan evidence and receipt")
    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    telegram_path = resolve_under_root(root, args.telegram_config)
    if args.dry_run_report:
        dry_run_path = resolve_under_root(root, args.dry_run_report)
        dry_run_report = read_json(dry_run_path)
        dry_run_source = rel(root, dry_run_path)
    else:
        dry_run_report = load_current_dry_run(root)
        dry_run_source = "current_coordinator_dry_run"

    telegram_config = read_json(telegram_path)
    output_path = resolve_under_root(root, args.output)
    receipt_path = resolve_under_root(root, args.receipt)
    source_paths = {
        "dry_run_report": dry_run_source,
        "telegram_config": rel(root, telegram_path),
    }
    plan = build_plan(root, dry_run_report, telegram_config, source_paths)
    if plan["status"].startswith("blocked_"):
        print(json.dumps(plan, indent=2, ensure_ascii=False, sort_keys=True))
        return 2

    if args.write:
        write_json(output_path, plan)
        receipt = build_receipt(plan, rel(root, output_path))
        write_json(receipt_path, receipt)
        plan["receipt_path"] = rel(root, receipt_path)

    print(json.dumps(plan, indent=2, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
