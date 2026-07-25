#!/usr/bin/env python3
"""Run a safe local-only A2A autopilot planning pass."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from build_codex_hermes_a2a_queue_status import (  # noqa: E402
    BLOCKED_ACTIONS,
    DEFAULT_QUEUE_ROOT,
    build_queue_status,
    relative_path,
)

RISKY_FLAGS = (
    "runtime_queue_execution",
    "provider_call",
    "deploy",
    "push",
    "cloud_mutation",
    "customer_send",
    "secret_read",
    "paid_provider_call",
    "telegram_live_send",
    "external_message_send",
    "merge_script_execution",
    "install",
    "migration",
    "state_mutation",
    "lane2_authorized",
    "final_packet_record",
)

SAFE_AUTO_OPERATIONS = (
    "read_packet",
    "write_local_report",
    "update_local_status_snapshot",
)

OBSERVE_OPERATIONS = (
    "read_packet",
    "write_local_report",
)

TOP_LEVEL_FLAGS = {
    "runtime_queue_execution": False,
    "queue_file_mutation": False,
    "provider_call": False,
    "deploy": False,
    "push": False,
    "cloud_mutation": False,
    "customer_send": False,
    "telegram_live_send": False,
    "secret_read": False,
    "paid_provider_call": False,
    "install": False,
    "migration": False,
    "merge_script_execution": False,
    "license_file_mutation": False,
}


def risky_blockers(packet: dict[str, Any]) -> list[str]:
    return [flag for flag in RISKY_FLAGS if bool(packet.get(flag, False))]


def classify_packet(packet: dict[str, Any], hermes_decision_recorded: bool) -> dict[str, Any]:
    blockers: list[str] = []
    risky = risky_blockers(packet)
    packet_id = str(packet.get("id", "unknown"))
    folder = str(packet.get("folder", "unknown"))
    risk = str(packet.get("risk", "unknown"))

    if bool(packet.get("approval_required", False)):
        blockers.append("approval_required")
    if packet_id == "packet_013" and not hermes_decision_recorded:
        blockers.append("hermes_decision_missing")
    if risk != "safe":
        blockers.append(f"risk_not_safe:{risk}")
    blockers.extend(risky)

    if risky:
        decision = "blocked_risky_flags"
        reason = "packet contains one or more risky action flags"
        allowed_operations = list(OBSERVE_OPERATIONS)
    elif blockers:
        decision = "blocked_requires_gate_specific_approval"
        reason = "packet requires a gate-specific approval or missing decision evidence"
        allowed_operations = list(OBSERVE_OPERATIONS)
    elif folder in ("inbox", "outbox"):
        decision = "auto_acknowledge_local_only"
        reason = "safe packet without approval requirement or risky flags"
        allowed_operations = list(SAFE_AUTO_OPERATIONS)
    elif folder == "working":
        decision = "observe_working_local_only"
        reason = "working packet is observed but not mutated by autopilot"
        allowed_operations = list(OBSERVE_OPERATIONS)
    elif folder == "done":
        decision = "already_done"
        reason = "done packet is indexed for audit only"
        allowed_operations = list(OBSERVE_OPERATIONS)
    else:
        decision = "observe_local_only"
        reason = "packet folder is not an auto-acknowledge lane"
        allowed_operations = list(OBSERVE_OPERATIONS)

    return {
        "id": packet_id,
        "folder": folder,
        "path": packet.get("path"),
        "title": packet.get("title"),
        "agent": packet.get("agent"),
        "risk": risk,
        "status": packet.get("status"),
        "approval_required": bool(packet.get("approval_required", False)),
        "autopilot_decision": decision,
        "reason": reason,
        "blockers": blockers,
        "allowed_operations": allowed_operations,
        "runtime_queue_execution": bool(packet.get("runtime_queue_execution", False)),
        "provider_call": bool(packet.get("provider_call", False)),
        "deploy": bool(packet.get("deploy", False)),
        "push": bool(packet.get("push", False)),
        "secret_read": bool(packet.get("secret_read", False)),
    }


def build_autopilot_status(
    queue_root: Path | str = DEFAULT_QUEUE_ROOT,
    root: Path = ROOT,
) -> dict[str, Any]:
    queue_status = build_queue_status(queue_root=queue_root, root=root)
    autopilot_packets = [
        classify_packet(packet, hermes_decision_recorded=bool(queue_status["hermes_decision_recorded"]))
        for packet in queue_status["packets"]
    ]
    decision_counts: dict[str, int] = {}
    for packet in autopilot_packets:
        decision = str(packet["autopilot_decision"])
        decision_counts[decision] = decision_counts.get(decision, 0) + 1

    return {
        "schema": "sirinx.a2a.local_autopilot_status.v1",
        "status": "local_autopilot_ready",
        "generated_at": "2026-06-29",
        "execution_mode": "safe_local_autopilot",
        "evidence_boundary": "local_file_bus_only",
        "queue_root": relative_path(Path(queue_root), root=root),
        "autonomous_local_coordination": True,
        "claims_goal_complete": False,
        "claims_all_chats_read": False,
        "current_actionable_packet": queue_status["current_actionable_packet"],
        "current_actionable_packet_folder": queue_status["current_actionable_packet_folder"],
        "packet_counts": queue_status["packet_counts"],
        "autopilot_counts": decision_counts,
        "autopilot_packets": autopilot_packets,
        "blocked_actions": dict(BLOCKED_ACTIONS),
        **TOP_LEVEL_FLAGS,
        "next_safe_action": (
            "Use safe local autopilot for queue visibility, local acknowledgements, and report generation only; "
            "create a gate-specific approval packet before any external or runtime action."
        ),
        "notes": (
            "Autopilot does not move queue files, execute Hermes runtime packets, call providers, read secrets, "
            "send messages, deploy, push, install, migrate, run merge scripts, or mutate license files."
        ),
    }


def missing_queue_payload(queue_root: Path) -> dict[str, Any]:
    return {
        "ok": False,
        "reason": "missing_queue_root",
        "queue_root": str(queue_root),
        "execution_mode": "fail_closed",
        "autonomous_local_coordination": False,
        **TOP_LEVEL_FLAGS,
    }


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--queue-root", default=str(DEFAULT_QUEUE_ROOT), help="Local _A2A_QUEUE root to index.")
    parser.add_argument("--output", help="Optional JSON output path.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    queue_root = Path(args.queue_root)
    if not queue_root.is_absolute():
        queue_root = ROOT / queue_root

    if not queue_root.exists() or not queue_root.is_dir():
        payload = missing_queue_payload(queue_root)
        print(json.dumps(payload, indent=2, sort_keys=True))
        return 2

    snapshot = build_autopilot_status(queue_root=queue_root)
    rendered = json.dumps(snapshot, indent=2, sort_keys=True)
    if args.output:
        output = Path(args.output)
        if not output.is_absolute():
            output = ROOT / output
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
