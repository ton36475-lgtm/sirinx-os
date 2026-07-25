#!/usr/bin/env python3
"""Execute local Hermes/KOB role-worker ack once after an exact ack gate.

Default behavior is non-executing. With the exact approval phrase this script can
dry-run the planned ack. With the exact approval phrase plus ``--execute`` it
runs only the existing local Hermes and KOB role workers once for the selected
packet envelopes. It never starts worker loops, executes queue payloads, sends
messages, calls providers, reads secrets, installs packages, pushes, deploys, or
mutates cloud resources.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
PACKET_ID = "A2A2A-P116-PACKET074-LOCAL-ROLE-WORKER-ACK-DISPATCH-20260703"
DEFAULT_ACK_CARD = ".ghostclaw_runtime/a2a2a/status/role_worker_ack_action_card.json"
DEFAULT_EVIDENCE = f".ghostclaw_runtime/a2a2a/evidence/{PACKET_ID}.json"
DEFAULT_RECEIPT = f".ghostclaw_runtime/a2a2a/receipts/{PACKET_ID}.json"
DEFAULT_DISPATCH_RECEIPT = f".ghostclaw_runtime/a2a2a/receipts/{PACKET_ID}-dispatch.json"


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


def safe_id(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "-_." else "_" for ch in value)[:180]


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")


def is_under(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


def _receipt_glob(root: Path, prefix: str, seq: str, target: str) -> Path | None:
    pattern = f".ghostclaw_runtime/a2a2a/receipts/{prefix}_p*_local_dispatch_packet_{seq}_{target}.json"
    candidates = sorted(root.glob(pattern))
    return candidates[-1] if candidates else None

def _hermes_receipt(root: Path, seq: str) -> Path | None:
    return _receipt_glob(root, "hermes_route", seq, "hermes")

def _kob_receipt(root: Path, seq: str) -> Path | None:
    return _receipt_glob(root, "kob_verdict", seq, "kob")

def expected_receipt_path(root: Path, sequence: str, target: str) -> Path | None:
    if target == "hermes":
        return _hermes_receipt(root, sequence)
    return _kob_receipt(root, sequence)


def card_envelope(card: dict[str, Any], target: str) -> str | None:
    envelopes = (card.get("worker_state") or {}).get("envelopes", {})
    values = envelopes.get(target)
    if isinstance(values, list) and values:
        return str(values[0])
    return None


def dispatch_packet_id(card: dict[str, Any]) -> str:
    sequence = str(card.get("selected_packet_sequence") or "unknown").strip() or "unknown"
    return f"A2A2A-PACKET{sequence}-LOCAL-ROLE-WORKER-ACK-DISPATCH-20260703"


def validate_card(root: Path, card: dict[str, Any], approval: str | None) -> tuple[list[dict[str, str]], list[str]]:
    issues: list[str] = []
    if card.get("schema") != "ghostclaw.a2a2a.role_worker_ack_action_card.v1":
        issues.append("ack_card_schema_mismatch")
    if card.get("status") != "ready_for_exact_ack_gate":
        issues.append("ack_card_not_ready")
    if card.get("issues"):
        issues.append("ack_card_has_issues")
    expected = card.get("exact_gate_phrase")
    if not expected:
        issues.append("ack_card_missing_exact_gate")
    if approval != expected:
        issues.append("exact_ack_approval_not_present")
    sequence = str(card.get("selected_packet_sequence") or "").strip()
    if not sequence:
        issues.append("selected_packet_sequence_missing")
    elif expected and sequence not in str(expected):
        issues.append("selected_packet_sequence_not_in_exact_gate")
    actions = card.get("external_actions_performed")
    if not isinstance(actions, dict):
        issues.append("external_actions_performed_missing")
    else:
        for key, value in actions.items():
            if value is not False:
                issues.append(f"external_action_not_false:{key}")
    blocked = card.get("blocked_actions_preserved")
    if not isinstance(blocked, dict):
        issues.append("blocked_actions_preserved_missing")
    else:
        for key, value in blocked.items():
            if value is not False:
                issues.append(f"blocked_action_not_preserved:{key}")

    planned: list[dict[str, str]] = []
    inbox_root = (root / ".ghostclaw_runtime/a2a2a/inbox").resolve()
    for target in ("hermes", "kob"):
        envelope = card_envelope(card, target)
        if not envelope:
            issues.append(f"missing_worker_envelope:{target}")
            continue
        envelope_path = resolve_under_root(root, envelope)
        if not is_under(envelope_path, inbox_root / target):
            issues.append(f"worker_envelope_outside_target_inbox:{target}")
            continue
        if not envelope_path.is_file():
            issues.append(f"worker_envelope_missing:{target}")
            continue
        receipt_path = expected_receipt_path(root, sequence, target)
        if receipt_path is not None:
            issues.append(f"ack_receipt_already_exists:{target}")
            continue
        envelope_payload = read_json(envelope_path)
        envelope_id = str(envelope_payload.get("id") or envelope_payload.get("packet_id") or envelope_path.stem)
        receipt_filename = f"hermes_route_{safe_id(envelope_id)}.json" if target == "hermes" else f"kob_verdict_{safe_id(envelope_id)}.json"
        planned_receipt_path = root / ".ghostclaw_runtime" / "a2a2a" / "receipts" / receipt_filename
        planned.append(
            {
                "target": target,
                "packet_path": rel(root, envelope_path),
                "expected_receipt": rel(root, planned_receipt_path),
            }
        )
    return planned, issues


def build_result(root: Path, card: dict[str, Any], card_path: str, approval: str | None, execute: bool, dry_run: bool) -> dict[str, Any]:
    planned, issues = validate_card(root, card, approval)
    if issues:
        status = "blocked_missing_or_invalid_exact_ack_gate"
    elif dry_run:
        status = "dry_run_ready_for_local_role_worker_ack_dispatch"
    elif execute:
        status = "ready_to_run_local_role_worker_ack_once"
    else:
        status = "ready_for_execute_flag_after_exact_ack_gate"
    return {
        "schema": "ghostclaw.a2a2a.local_role_worker_ack_dispatch.v1",
        "packet_id": dispatch_packet_id(card),
        "status": status,
        "mode": "exact_gate_required_local_role_worker_ack_dispatch",
        "created_at": now_iso(),
        "repo": str(root),
        "source_ack_action_card": card_path,
        "required_approval": card.get("exact_gate_phrase"),
        "approval_present": approval is not None,
        "approval_matches": approval == card.get("exact_gate_phrase"),
        "dry_run": dry_run,
        "execute_requested": execute,
        "issues": issues,
        "selected_packet": card.get("selected_packet"),
        "selected_packet_path": card.get("selected_packet_path"),
        "selected_packet_sequence": card.get("selected_packet_sequence"),
        "planned_ack_workers": planned,
        "summary": {
            "planned_ack_worker_count": len(planned),
            "workers_targeted": sorted({item["target"] for item in planned}),
            "workers_started": [],
            "worker_loops_started": [],
            "ack_receipts_written": [],
        },
        "blocked_actions_preserved": {
            "role_worker_ack_write": False,
            "worker_loop_start": False,
            "queue_payload_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "next_safe_action": (
            f"Provide the exact {card.get('exact_gate_phrase') or 'ack'} approval and --execute to write local Hermes/KOB ack receipts once."
            if issues
            else f"Dry-run passed. Use --execute with exact {card.get('exact_gate_phrase') or 'ack'} approval only if local ack receipts should be written."
            if dry_run
            else f"Use --execute with exact {card.get('exact_gate_phrase') or 'ack'} approval to write local ack receipts once."
            if not execute
            else "Inspect written ack receipts; do not start worker loops or execute queue payloads."
        ),
    }


def run_role_worker(root: Path, item: dict[str, str]) -> dict[str, Any]:
    command = [
        "python3",
        str(Path(__file__).resolve().with_name("ghostclaw_a2a_role_worker.py")),
        "--root",
        str(root),
        "--agent",
        item["target"],
        "--packet",
        item["packet_path"],
        "--once",
    ]
    completed = subprocess.run(command, cwd=root, text=True, capture_output=True, check=False)
    try:
        stdout_payload = json.loads(completed.stdout)
    except json.JSONDecodeError:
        stdout_payload = {"raw_stdout": completed.stdout}
    return {
        "target": item["target"],
        "packet_path": item["packet_path"],
        "expected_receipt": item["expected_receipt"],
        "command": " ".join(command[0:1] + command[1:]),
        "returncode": completed.returncode,
        "stdout": stdout_payload,
        "stderr_present": bool(completed.stderr.strip()),
    }


def execute_ack(root: Path, result: dict[str, Any]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for item in result["planned_ack_workers"]:
        record = run_role_worker(root, item)
        receipt_path = resolve_under_root(root, item["expected_receipt"])
        record["receipt_exists"] = receipt_path.is_file()
        if receipt_path.is_file():
            record["receipt_status"] = read_json(receipt_path).get("status")
        records.append(record)
    return records


def build_receipt(result: dict[str, Any], evidence_path: str, dispatch_receipt_path: str | None) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.local_role_worker_ack_dispatch_receipt.v1",
        "packet_id": result["packet_id"],
        "status": result["status"],
        "mode": result["mode"],
        "created_at": now_iso(),
        "repo": result["repo"],
        "evidence_path": evidence_path,
        "dispatch_receipt_path": dispatch_receipt_path,
        "selected_packet": result.get("selected_packet"),
        "summary": result["summary"],
        "issues": result["issues"],
        "blocked_actions_preserved": result["blocked_actions_preserved"],
        "completion_claim": "Local role-worker ack dispatch processed according to result status; no loop, payload, live, provider, deploy, push, secret, or cloud action performed.",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Exact-gated local Hermes/KOB ack dispatch executor.")
    parser.add_argument("--root", default=str(REPO_ROOT), help="repo root")
    parser.add_argument("--ack-card", default=DEFAULT_ACK_CARD, help="role worker ack action card JSON")
    parser.add_argument("--approval", default=None, help="exact ack approval phrase from the action card")
    parser.add_argument("--dry-run", action="store_true", help="validate planned ack without writing receipts")
    parser.add_argument("--execute", action="store_true", help="run Hermes/KOB role workers once after exact approval")
    parser.add_argument("--write", action="store_true", help="write evidence and receipt")
    parser.add_argument("--output", default=DEFAULT_EVIDENCE, help="evidence output path")
    parser.add_argument("--receipt", default=DEFAULT_RECEIPT, help="receipt output path")
    parser.add_argument("--dispatch-receipt", default=DEFAULT_DISPATCH_RECEIPT, help="dispatch receipt output path")
    args = parser.parse_args()

    if args.dry_run and args.execute:
        parser.error("--dry-run cannot be combined with --execute")

    root = Path(args.root).expanduser().resolve()
    card_path = resolve_under_root(root, args.ack_card)
    card = read_json(card_path)
    result = build_result(root, card, rel(root, card_path), args.approval, args.execute, args.dry_run)

    dispatch_records: list[dict[str, Any]] = []
    if result["status"] == "ready_to_run_local_role_worker_ack_once" and args.execute:
        dispatch_records = execute_ack(root, result)
        failures = [
            record
            for record in dispatch_records
            if record.get("returncode") != 0 or not record.get("receipt_exists")
        ]
        result["dispatch_records"] = dispatch_records
        result["summary"]["workers_started"] = [record["target"] for record in dispatch_records]
        result["summary"]["ack_receipts_written"] = [
            record["expected_receipt"] for record in dispatch_records if record.get("receipt_exists")
        ]
        result["status"] = "local_role_worker_ack_dispatched" if not failures else "role_worker_ack_dispatch_failed"
        result["issues"] = result["issues"] + [f"role_worker_failed:{record['target']}" for record in failures]

    if args.write:
        output_path = resolve_under_root(root, args.output)
        receipt_path = resolve_under_root(root, args.receipt)
        dispatch_receipt_path = resolve_under_root(root, args.dispatch_receipt)
        write_json(output_path, result)
        if dispatch_records:
            write_json(
                dispatch_receipt_path,
                {
                    "schema": "ghostclaw.a2a2a.local_role_worker_ack_dispatch_records.v1",
                    "packet_id": result["packet_id"],
                    "status": result["status"],
                    "created_at": now_iso(),
                    "records": dispatch_records,
                },
            )
        receipt = build_receipt(result, rel(root, output_path), rel(root, dispatch_receipt_path) if dispatch_records else None)
        write_json(receipt_path, receipt)
        result["evidence_path"] = rel(root, output_path)
        result["receipt_path"] = rel(root, receipt_path)
        if dispatch_records:
            result["dispatch_receipt_path"] = rel(root, dispatch_receipt_path)

    print(json.dumps(result, indent=2, ensure_ascii=False, sort_keys=True))
    return 2 if result["issues"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
