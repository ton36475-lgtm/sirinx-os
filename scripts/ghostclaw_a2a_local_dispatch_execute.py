#!/usr/bin/env python3
"""Execute the local worker-packet dispatch only after the exact P003 gate.

Default behavior is non-executing: write evidence and receipt that the exact
gate is missing. Use ``--dry-run`` with the exact approval phrase to verify the
planned local worker envelope writes without writing them. With the exact
approval phrase and ``--execute``, this script writes only the planned local
worker envelope files listed by P003. It never starts workers, executes queue
payloads, sends Telegram messages, calls providers, reads secrets, installs
packages, pushes, deploys, or mutates cloud resources.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
PACKET_ID = "A2A2A-P004-LOCAL-WORKER-DISPATCH-EXECUTE-20260703"
P003_GATE_PATH = ".ghostclaw_runtime/a2a2a/gates/A2A2A-P003-LOCAL-WORKER-DISPATCH-GATE-20260703.json"
DEFAULT_EVIDENCE_PATH = f".ghostclaw_runtime/a2a2a/evidence/{PACKET_ID}.json"
DEFAULT_RECEIPT_PATH = f".ghostclaw_runtime/a2a2a/receipts/{PACKET_ID}.json"
DEFAULT_DISPATCH_RECEIPT_PATH = f".ghostclaw_runtime/a2a2a/receipts/{PACKET_ID}-dispatch.json"


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


def target_from_worker_path(path: str) -> str:
    parts = Path(path).parts
    if "inbox" in parts:
        inbox_index = parts.index("inbox")
        if len(parts) > inbox_index + 1:
            return parts[inbox_index + 1]
    return "unknown"


def validate_gate(gate: dict[str, Any], approval: str | None) -> list[str]:
    issues: list[str] = []
    if gate.get("schema") != "ghostclaw.a2a2a.local_dispatch_gate.v1":
        issues.append("gate_schema_mismatch")
    if gate.get("packet_id") != "A2A2A-P003-LOCAL-WORKER-DISPATCH-GATE-20260703":
        issues.append("gate_packet_id_mismatch")
    if gate.get("status") not in {
        "awaiting_exact_local_dispatch_gate",
        "exact_local_dispatch_gate_ready_for_separate_execute_command",
    }:
        issues.append("gate_status_not_dispatch_eligible")
    required_approval = gate.get("required_approval")
    if not required_approval:
        issues.append("gate_missing_required_approval")
    if approval != required_approval:
        issues.append("exact_approval_not_present")
    if gate.get("plan_issues"):
        issues.append("gate_plan_has_issues")
    if gate.get("summary", {}).get("workers_used"):
        issues.append("workers_already_used")
    if not gate.get("dispatch_manifest"):
        issues.append("dispatch_manifest_empty")
    blocked = gate.get("blocked_actions_preserved", {})
    for key in (
        "runtime_queue_execution",
        "queue_payload_execution",
        "tmux_start_stop_restart",
        "telegram_live_send",
        "telegram_webhook_activation",
        "telegram_polling_start",
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


def build_worker_envelope(candidate: dict[str, Any], target: str, source_gate: str) -> dict[str, Any]:
    packet_id = candidate.get("queue_packet_id")
    return {
        "schema": "ghostclaw.a2a2a.task.v1",
        "id": f"p004_local_dispatch_{packet_id}_{target}",
        "mission": "a2a2a_safe_local_worker_packet_dispatch",
        "source": "codex",
        "target": target,
        "requires_ack": True,
        "requires_receipt": True,
        "dangerous_actions_allowed": False,
        "secret_access_allowed": False,
        "paid_model_calls_allowed": False,
        "created_at": now_iso(),
        "payload": {
            "message": "Review safe local queue packet metadata only.",
            "source_gate": source_gate,
            "queue_packet": {
                "id": packet_id,
                "path": candidate.get("queue_packet_path"),
                "title": candidate.get("title"),
                "risk": candidate.get("risk"),
            },
            "expected_behavior": "write local role receipt only",
            "runtime_queue_execution": False,
            "queue_payload_execution": False,
            "provider_call": False,
            "external_message_send": False,
            "telegram_live_send": False,
            "deploy": False,
            "push": False,
            "secret_read": False,
        },
    }


def planned_writes(root: Path, gate: dict[str, Any]) -> tuple[list[dict[str, Any]], list[str]]:
    writes: list[dict[str, Any]] = []
    issues: list[str] = []
    for candidate in gate.get("dispatch_manifest", []):
        for worker_path in candidate.get("planned_worker_packets", []):
            absolute = resolve_under_root(root, worker_path)
            if not str(absolute).startswith(str((root / ".ghostclaw_runtime" / "a2a2a" / "inbox").resolve())):
                issues.append(f"worker_path_outside_inbox:{worker_path}")
                continue
            target = target_from_worker_path(worker_path)
            if target not in {"hermes", "kob"}:
                issues.append(f"unsupported_worker_target:{worker_path}")
                continue
            if absolute.exists():
                issues.append(f"worker_packet_already_exists:{worker_path}")
                continue
            writes.append(
                {
                    "queue_packet_id": candidate.get("queue_packet_id"),
                    "target": target,
                    "path": rel(root, absolute),
                    "envelope": build_worker_envelope(candidate, target, gate.get("packet_id", "unknown")),
                }
            )
    return writes, issues


def build_result(root: Path, gate: dict[str, Any], gate_path: str, approval: str | None, execute: bool, dry_run: bool) -> dict[str, Any]:
    gate_issues = validate_gate(gate, approval)
    writes, write_issues = planned_writes(root, gate)
    issues = gate_issues + write_issues
    if issues:
        status = "blocked_missing_or_invalid_exact_gate"
    elif dry_run:
        status = "dry_run_ready_for_local_worker_packet_dispatch"
    elif execute:
        status = "ready_to_write_local_worker_packets"
    else:
        status = "ready_for_execute_flag_after_exact_gate"

    return {
        "schema": "ghostclaw.a2a2a.local_dispatch_execute.v1",
        "packet_id": PACKET_ID,
        "status": status,
        "mode": "exact_gate_required_local_worker_packet_dispatch",
        "created_at": now_iso(),
        "repo": str(root),
        "source_gate": gate_path,
        "required_approval": gate.get("required_approval"),
        "approval_present": approval is not None,
        "approval_matches": approval == gate.get("required_approval"),
        "dry_run": dry_run,
        "execute_requested": execute,
        "issues": issues,
        "summary": {
            "planned_worker_packets": len(writes),
            "safe_local_dispatch_candidates": gate.get("summary", {}).get("safe_local_dispatch_candidates", 0),
            "workers_targeted": sorted({item["target"] for item in writes}),
            "workers_started": [],
            "workers_used": [],
        },
        "planned_writes": [
            {
                "queue_packet_id": item["queue_packet_id"],
                "target": item["target"],
                "path": item["path"],
            }
            for item in writes
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
            "Provide the exact P003 approval and --execute to write local worker envelopes only."
            if issues
            else "Dry-run passed. Use --execute with the exact P003 approval only if local worker envelopes should be written."
            if dry_run
            else "Use --execute with the exact P003 approval to write local worker envelopes only."
            if not execute
            else "Inspect local worker acknowledgements and receipts; do not start workers or open live gates."
        ),
        "_writes": writes,
    }


def execute_writes(root: Path, result: dict[str, Any]) -> list[str]:
    written: list[str] = []
    for item in result.pop("_writes", []):
        path = resolve_under_root(root, item["path"])
        write_json(path, item["envelope"])
        written.append(rel(root, path))
    return written


def build_receipt(result: dict[str, Any], evidence_path: str, dispatch_receipt_path: str | None) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.local_dispatch_execute_receipt.v1",
        "packet_id": PACKET_ID,
        "status": result["status"],
        "mode": result["mode"],
        "created_at": now_iso(),
        "repo": result["repo"],
        "evidence_path": evidence_path,
        "dispatch_receipt_path": dispatch_receipt_path,
        "required_approval": result["required_approval"],
        "approval_matches": result["approval_matches"],
        "dry_run": result.get("dry_run", False),
        "execute_requested": result["execute_requested"],
        "summary": result["summary"],
        "planned_writes": result["planned_writes"],
        "blocked_actions_preserved": result["blocked_actions_preserved"],
        "next_safe_action": result["next_safe_action"],
        "completion_claim": "P004 local dispatch executor checked gate; worker envelopes written only if exact gate and execute were both present",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Execute local worker-packet dispatch after exact P003 gate.")
    parser.add_argument("--root", default=str(REPO_ROOT), help="repo root")
    parser.add_argument("--gate", default=P003_GATE_PATH, help="P003 gate path")
    parser.add_argument("--approval", default=None, help="exact P003 approval phrase")
    parser.add_argument("--dry-run", action="store_true", help="verify exact gate and planned writes without writing worker envelopes")
    parser.add_argument("--execute", action="store_true", help="write planned local worker envelope files")
    parser.add_argument("--write", action="store_true", help="write evidence and receipt")
    parser.add_argument("--output", default=DEFAULT_EVIDENCE_PATH, help="evidence path")
    parser.add_argument("--receipt", default=DEFAULT_RECEIPT_PATH, help="receipt path")
    parser.add_argument("--dispatch-receipt", default=DEFAULT_DISPATCH_RECEIPT_PATH, help="dispatch receipt path used only when executing")
    args = parser.parse_args()
    if args.dry_run and args.execute:
        parser.error("--dry-run cannot be combined with --execute")

    root = Path(args.root).expanduser().resolve()
    gate_path = resolve_under_root(root, args.gate)
    gate = read_json(gate_path)
    result = build_result(root, gate, rel(root, gate_path), args.approval, args.execute, args.dry_run)

    dispatch_receipt_rel = None
    if result["status"] == "ready_to_write_local_worker_packets" and args.execute:
        written = execute_writes(root, result)
        result["status"] = "local_worker_packets_dispatched"
        result["written_worker_packets"] = written
        result["summary"]["worker_packets_written"] = len(written)
        dispatch_receipt_rel = args.dispatch_receipt
    else:
        result.pop("_writes", None)

    if args.write:
        output_path = resolve_under_root(root, args.output)
        receipt_path = resolve_under_root(root, args.receipt)
        write_json(output_path, result)
        if dispatch_receipt_rel:
            dispatch_path = resolve_under_root(root, args.dispatch_receipt)
            write_json(dispatch_path, result)
            dispatch_receipt_rel = rel(root, dispatch_path)
        receipt = build_receipt(result, rel(root, output_path), dispatch_receipt_rel)
        write_json(receipt_path, receipt)
        result["receipt_path"] = rel(root, receipt_path)

    print(json.dumps(result, indent=2, ensure_ascii=False, sort_keys=True))
    return 2 if result["status"].startswith("blocked_") else 0


if __name__ == "__main__":
    raise SystemExit(main())
