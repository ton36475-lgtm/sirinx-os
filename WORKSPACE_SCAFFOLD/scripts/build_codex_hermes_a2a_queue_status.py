#!/usr/bin/env python3
"""Build a local-only Codex/Hermes A2A file-bus queue status snapshot."""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_QUEUE_ROOT = ROOT / "_A2A_QUEUE"
QUEUE_FOLDERS = ("inbox", "outbox", "working", "done", "blocked")
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
HERMES_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"

BLOCKED_ACTIONS = {
    "deploy": False,
    "push": False,
    "cloud_mutation": False,
    "customer_send": False,
    "secret_read": False,
    "paid_provider_call": False,
    "runtime_queue_execution": False,
    "telegram_live_send": False,
    "external_message_send": False,
    "merge_script_execution": False,
    "install": False,
    "migration": False,
}


def relative_path(path: Path, root: Path = ROOT) -> str:
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)


def packet_id_from_filename(path: Path) -> str:
    match = re.match(r"(packet_\d+)", path.stem)
    return match.group(1) if match else path.stem


def bool_field(payload: dict[str, Any], key: str) -> bool:
    return bool(payload.get(key, False))


def load_packet(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("packet JSON must be an object")
        return payload
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        return {
            "id": packet_id_from_filename(path),
            "title": path.name,
            "status": "unreadable",
            "risk": "unknown",
            "parse_error": exc.__class__.__name__,
        }


def packet_summary(path: Path, folder: str, root: Path = ROOT) -> dict[str, Any]:
    payload = load_packet(path)
    packet_id = str(payload.get("id") or packet_id_from_filename(path))
    return {
        "id": packet_id,
        "folder": folder,
        "path": relative_path(path, root=root),
        "project": str(payload.get("project", "unknown")),
        "priority": str(payload.get("priority", "unknown")),
        "title": str(payload.get("title", path.name)),
        "agent": str(payload.get("agent", "unknown")),
        "status": str(payload.get("status", folder)),
        "risk": str(payload.get("risk", "unknown")),
        "approval_required": bool_field(payload, "approval_required"),
        "runtime_queue_execution": bool_field(payload, "runtime_queue_execution"),
        "provider_call": bool_field(payload, "provider_call"),
        "external_message_send": bool_field(payload, "external_message_send"),
        "deploy": bool_field(payload, "deploy"),
        "push": bool_field(payload, "push"),
        "cloud_mutation": bool_field(payload, "cloud_mutation"),
        "customer_send": bool_field(payload, "customer_send"),
        "secret_read": bool_field(payload, "secret_read"),
        "paid_provider_call": bool_field(payload, "paid_provider_call"),
        "telegram_live_send": bool_field(payload, "telegram_live_send"),
        "lane2_authorized": bool_field(payload, "lane2_authorized"),
        "decision_record": bool_field(payload, "decision_record"),
        "state_mutation": bool_field(payload, "state_mutation"),
        "final_packet_record": bool_field(payload, "final_packet_record"),
    }


def iter_packet_files(queue_root: Path) -> list[tuple[str, Path]]:
    packet_files: list[tuple[str, Path]] = []
    for folder in QUEUE_FOLDERS:
        folder_root = queue_root / folder
        if not folder_root.exists():
            continue
        for path in sorted(folder_root.glob("*.json")):
            if path.is_file():
                packet_files.append((folder, path))
    return packet_files


def build_queue_status(queue_root: Path | str = DEFAULT_QUEUE_ROOT, root: Path = ROOT) -> dict[str, Any]:
    queue_root = Path(queue_root)
    root = Path(root)
    packets = [packet_summary(path, folder, root=root) for folder, path in iter_packet_files(queue_root)]
    packet_counts = {folder: 0 for folder in QUEUE_FOLDERS}
    for packet in packets:
        packet_counts[packet["folder"]] += 1
    packet_counts["total"] = len(packets)

    current = next((packet for packet in packets if packet["id"] == "packet_013"), None)
    return {
        "schema": "sirinx.codex_hermes.a2a_queue_status.v1",
        "status": "local_queue_indexed_not_executed",
        "generated_at": "2026-06-29",
        "evidence_boundary": "local_file_bus_only",
        "local_read_only": True,
        "claims_goal_complete": False,
        "claims_all_chats_read": False,
        "runtime_queue_execution": False,
        "lane2_authorized": False,
        "hermes_decision_recorded": HERMES_DECISION.exists(),
        "final_lane1_packet_present": FINAL_PACKET.exists(),
        "queue_root": relative_path(queue_root, root=root),
        "current_actionable_packet": current["id"] if current else None,
        "current_actionable_packet_folder": current["folder"] if current else None,
        "packet_counts": packet_counts,
        "packets": packets,
        "blocked_actions": dict(BLOCKED_ACTIONS),
        "next_safe_action": (
            "Use this file-bus snapshot for local Codex/Hermes coordination only; "
            "Hermes still needs a separate packet_013 decision before Codex recorder work."
        ),
        "notes": "Read-only JSON packet index. No queue item was executed and no external action is authorized.",
    }


def missing_queue_payload(queue_root: Path) -> dict[str, Any]:
    return {
        "ok": False,
        "reason": "missing_queue_root",
        "queue_root": str(queue_root),
        "runtime_queue_execution": False,
        "lane2_authorized": False,
        "hermes_decision_recorded": False,
        "blocked_actions": dict(BLOCKED_ACTIONS),
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

    snapshot = build_queue_status(queue_root=queue_root)
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
