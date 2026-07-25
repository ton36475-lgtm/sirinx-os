#!/usr/bin/env python3
"""Verify the exact gate for local A2A2A worker-packet dispatch.

This script never writes worker inbox packets and never starts runtime workers.
It turns the P002 safe dispatch plan into a gate request that can be reviewed
before a separate local-only dispatch command is allowed.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
PACKET_ID = "A2A2A-P003-LOCAL-WORKER-DISPATCH-GATE-20260703"
REQUIRED_APPROVAL = "APPROVE_A2A2A_P003_LOCAL_WORKER_PACKET_DISPATCH_ONLY_A019E53EE"
DEFAULT_PLAN_PATH = ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P002-SAFE-LOCAL-DISPATCH-PLAN-20260703.json"
DEFAULT_EVIDENCE_PATH = f".ghostclaw_runtime/a2a2a/evidence/{PACKET_ID}.json"
DEFAULT_RECEIPT_PATH = f".ghostclaw_runtime/a2a2a/receipts/{PACKET_ID}.json"
DEFAULT_GATE_PATH = f".ghostclaw_runtime/a2a2a/gates/{PACKET_ID}.json"


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


def validate_plan(plan: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    if plan.get("schema") != "ghostclaw.a2a2a.safe_dispatch_plan.v1":
        issues.append("plan_schema_mismatch")
    if plan.get("status") != "ready_for_safe_local_review_not_live_dispatch":
        issues.append("plan_status_not_ready")
    summary = plan.get("summary", {})
    if summary.get("safe_local_dispatch_candidates", 0) < 1:
        issues.append("no_safe_local_dispatch_candidates")
    if summary.get("workers_used"):
        issues.append("workers_already_used_in_plan")
    telegram = plan.get("telegram_gateway", {})
    if telegram.get("default_live_send") is not False:
        issues.append("telegram_live_send_not_false")
    if telegram.get("webhook_enabled") is not False:
        issues.append("telegram_webhook_not_false")
    if telegram.get("polling_enabled") is not False:
        issues.append("telegram_polling_not_false")
    if telegram.get("queue_payload_execution") is not False:
        issues.append("queue_payload_execution_not_false")
    if telegram.get("issues"):
        issues.append("telegram_config_has_issues")
    blocked = plan.get("blocked_actions_preserved", {})
    for key in (
        "runtime_queue_execution",
        "queue_payload_execution",
        "tmux_start_stop_restart",
        "telegram_live_send",
        "telegram_webhook_activation",
        "provider_call",
        "install",
        "push",
        "deploy",
        "secret_read",
        "env_value_read",
    ):
        if blocked.get(key) is not False:
            issues.append(f"blocked_action_not_preserved:{key}")
    return issues


def build_dispatch_manifest(plan: dict[str, Any]) -> list[dict[str, Any]]:
    manifest: list[dict[str, Any]] = []
    for item in plan.get("planned_safe_local_dispatch", []):
        manifest.append(
            {
                "queue_packet_id": item.get("id"),
                "queue_packet_path": item.get("path"),
                "title": item.get("title"),
                "risk": item.get("risk"),
                "planned_worker_packets": item.get("planned_worker_packets", []),
                "dispatch_allowed_now": False,
            }
        )
    return manifest


def build_gate(root: Path, plan: dict[str, Any], plan_path: str, approval: str | None) -> dict[str, Any]:
    issues = validate_plan(plan)
    approval_matches = approval == REQUIRED_APPROVAL
    dispatch_manifest = build_dispatch_manifest(plan)
    if issues:
        status = "blocked_invalid_p002_plan"
    elif approval_matches:
        status = "exact_local_dispatch_gate_ready_for_separate_execute_command"
    else:
        status = "awaiting_exact_local_dispatch_gate"

    return {
        "schema": "ghostclaw.a2a2a.local_dispatch_gate.v1",
        "packet_id": PACKET_ID,
        "status": status,
        "mode": "gate_verification_only_no_dispatch",
        "created_at": now_iso(),
        "repo": str(root),
        "source_plan": plan_path,
        "required_approval": REQUIRED_APPROVAL,
        "approval_present": approval is not None,
        "approval_matches": approval_matches,
        "plan_issues": issues,
        "summary": {
            "safe_local_dispatch_candidates": len(dispatch_manifest),
            "approval_gated_candidates": plan.get("summary", {}).get("approval_gated_candidates", 0),
            "workers_planned": plan.get("summary", {}).get("workers_planned", []),
            "workers_used": [],
        },
        "dispatch_manifest": dispatch_manifest,
        "allowed_if_exact_gate_is_used": [
            "write local worker envelope files for the listed safe candidates only",
            "write local dispatch receipt",
            "preserve Telegram live-send/webhook/polling gates as closed",
        ],
        "still_blocked": [
            "execute queue payloads",
            "start or restart tmux workers",
            "live Telegram send",
            "Telegram webhook activation",
            "Telegram polling start",
            "provider or paid model calls",
            "install or migration",
            "push or deploy",
            "cloud mutation",
            "secret or env value reads",
        ],
        "blocked_actions_preserved": {
            "write_worker_packets": False,
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
        "next_safe_action": (
            "Run a separate local-dispatch command only with the exact P003 approval phrase."
            if approval_matches and not issues
            else f"Use exact approval phrase `{REQUIRED_APPROVAL}` if local worker-packet dispatch should proceed."
        ),
    }


def build_receipt(gate: dict[str, Any], evidence_path: str, gate_path: str | None) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.local_dispatch_gate_receipt.v1",
        "packet_id": PACKET_ID,
        "status": gate["status"],
        "mode": gate["mode"],
        "created_at": now_iso(),
        "repo": gate["repo"],
        "evidence_path": evidence_path,
        "gate_path": gate_path,
        "required_approval": gate["required_approval"],
        "approval_matches": gate["approval_matches"],
        "summary": gate["summary"],
        "blocked_actions_preserved": gate["blocked_actions_preserved"],
        "next_safe_action": gate["next_safe_action"],
        "completion_claim": "P003 local dispatch gate verified; no worker packets or live actions executed",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify the local A2A2A worker dispatch gate.")
    parser.add_argument("--root", default=str(REPO_ROOT), help="repo root")
    parser.add_argument("--plan", default=DEFAULT_PLAN_PATH, help="P002 plan evidence path")
    parser.add_argument("--approval", default=None, help="exact approval phrase for local worker-packet dispatch")
    parser.add_argument("--output", default=DEFAULT_EVIDENCE_PATH, help="gate evidence path")
    parser.add_argument("--receipt", default=DEFAULT_RECEIPT_PATH, help="receipt path")
    parser.add_argument("--gate-record", default=DEFAULT_GATE_PATH, help="gate record path")
    parser.add_argument("--write", action="store_true", help="write evidence, receipt, and gate record")
    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    plan_path = resolve_under_root(root, args.plan)
    plan = read_json(plan_path)
    gate = build_gate(root, plan, rel(root, plan_path), args.approval)

    if args.write:
        output_path = resolve_under_root(root, args.output)
        receipt_path = resolve_under_root(root, args.receipt)
        gate_path = resolve_under_root(root, args.gate_record)
        write_json(output_path, gate)
        write_json(gate_path, gate)
        receipt = build_receipt(gate, rel(root, output_path), rel(root, gate_path))
        write_json(receipt_path, receipt)
        gate["receipt_path"] = rel(root, receipt_path)
        gate["gate_path"] = rel(root, gate_path)

    print(json.dumps(gate, indent=2, ensure_ascii=False, sort_keys=True))
    return 2 if gate["status"].startswith("blocked_") else 0


if __name__ == "__main__":
    raise SystemExit(main())
