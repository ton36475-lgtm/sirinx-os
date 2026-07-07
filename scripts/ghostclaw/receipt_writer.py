#!/usr/bin/env python3
"""
GHOSTCLAW Receipt Writer
========================

Writes A2A2A receipts with SHA-256 checksum for integrity verification.
Can be used standalone or imported by the dispatcher.

Usage:
  python3 scripts/ghostclaw/receipt_writer.py --correlation-id CID \\
      --source-agent hermes --target-agent codex \\
      --action-tier B --requested-action "Write file X" \\
      --status auto-approved --reason "Tier B evidence-verified" \\
      [--mission-id MISSION] [--task-id TASK] [--evidence '{"files_changed": ["X"]}]'

MISSION_ID: GC-FULLAUTO-HERMES-SUBAGENT-SWARM-2026-06-30-V5
"""

import argparse
import hashlib
import json
import os
import sys
import time
from pathlib import Path

SCHEMA_VERSION = "ghostclaw.receipt.v5"
DEFAULT_RUNTIME = Path(__file__).resolve().parents[1] / ".." / ".ghostclaw_runtime" / "a2a2a"
DEFAULT_RUNTIME = DEFAULT_RUNTIME.resolve()

VALID_STATUSES = [
    "approved",
    "auto-approved",
    "blocked",
    "refused",
    "dry-run",
    "simulated",
    "validation-failed",
    "scope-fail",
]

VALID_TIERS = ["A", "B", "C", "D", "X"]


def utc_now():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def sha256_hex(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def compute_receipt_checksum(receipt: dict) -> str:
    """Compute checksum of receipt body (excluding the checksum field)."""
    body = {k: v for k, v in receipt.items() if k != "checksum"}
    return sha256_hex(json.dumps(body, sort_keys=True))


def generate_receipt_id(correlation_id: str) -> str:
    ts = int(time.time() * 1000)
    short_hash = sha256_hex(correlation_id)[:8]
    return f"rcp_{ts}_{short_hash}"


def write_receipt(
    correlation_id: str,
    source_agent: str,
    target_agent: str,
    action_tier: str,
    requested_action: str,
    status: str,
    reason: str = "",
    mission_id: str = "GC-FULLAUTO-HERMES-SUBAGENT-SWARM-2026-06-30-V5",
    task_id: str = "",
    decision_id: str = "",
    approver_agent: str = "gc-policy-guardian",
    file_lease: dict = None,
    evidence: dict = None,
    runtime_dir: Path = None,
) -> dict:
    """
    Build and write a receipt to the runtime receipts directory.
    Returns the receipt dict.
    """
    if action_tier not in VALID_TIERS:
        raise ValueError(f"Invalid action_tier '{action_tier}'. Must be one of {VALID_TIERS}")
    if status not in VALID_STATUSES:
        raise ValueError(f"Invalid status '{status}'. Must be one of {VALID_STATUSES}")

    if runtime_dir is None:
        runtime_dir = DEFAULT_RUNTIME

    receipts_dir = runtime_dir / "receipts"
    receipts_dir.mkdir(parents=True, exist_ok=True)

    receipt = {
        "schema": SCHEMA_VERSION,
        "receipt_id": generate_receipt_id(correlation_id),
        "mission_id": mission_id,
        "task_id": task_id or "",
        "correlation_id": correlation_id,
        "decision_id": decision_id or None,
        "source_agent": source_agent,
        "target_agent": target_agent,
        "approver_agent": approver_agent,
        "action_tier": action_tier,
        "status": status,
        "requested_action": requested_action,
        "file_lease": file_lease,
        "evidence": evidence,
        "reason": reason,
        "checksum": None,
        "timestamp": utc_now(),
    }

    receipt["checksum"] = compute_receipt_checksum(receipt)

    filename = f"receipt_{receipt['receipt_id']}.json"
    receipt_path = receipts_dir / filename
    with open(receipt_path, "w") as f:
        json.dump(receipt, f, indent=2)

    print(f"Receipt written: {receipt_path}")
    return receipt


def verify_receipt_checksum(receipt_path: Path) -> bool:
    """Verify a receipt's checksum matches its body."""
    with open(receipt_path, "r") as f:
        receipt = json.load(f)

    stored_checksum = receipt.get("checksum")
    body = {k: v for k, v in receipt.items() if k != "checksum"}
    computed = sha256_hex(json.dumps(body, sort_keys=True))
    return stored_checksum == computed


def main():
    parser = argparse.ArgumentParser(description="GHOSTCLAW Receipt Writer")
    parser.add_argument("--correlation-id", required=True, help="Correlation ID linking to envelope")
    parser.add_argument("--source-agent", required=True, help="Source agent name")
    parser.add_argument("--target-agent", required=True, help="Target agent name")
    parser.add_argument("--action-tier", required=True, choices=VALID_TIERS, help="Action tier A/B/C/D/X")
    parser.add_argument("--requested-action", required=True, help="Action description")
    parser.add_argument("--status", required=True, choices=VALID_STATUSES, help="Receipt status")
    parser.add_argument("--reason", default="", help="Reason/justification")
    parser.add_argument("--mission-id", default="GC-FULLAUTO-HERMES-SUBAGENT-SWARM-2026-06-30-V5")
    parser.add_argument("--task-id", default="")
    parser.add_argument("--decision-id", default="")
    parser.add_argument("--approver-agent", default="gc-policy-guardian")
    parser.add_argument("--evidence", default=None, help="JSON string of evidence dict")
    parser.add_argument("--runtime-dir", default=str(DEFAULT_RUNTIME), help="Runtime directory")

    args = parser.parse_args()

    evidence = None
    if args.evidence:
        try:
            evidence = json.loads(args.evidence)
        except json.JSONDecodeError as e:
            print(f"Error parsing --evidence JSON: {e}", file=sys.stderr)
            return 1

    runtime_dir = Path(args.runtime_dir).resolve()

    receipt = write_receipt(
        correlation_id=args.correlation_id,
        source_agent=args.source_agent,
        target_agent=args.target_agent,
        action_tier=args.action_tier,
        requested_action=args.requested_action,
        status=args.status,
        reason=args.reason,
        mission_id=args.mission_id,
        task_id=args.task_id,
        decision_id=args.decision_id,
        approver_agent=args.approver_agent,
        evidence=evidence,
        runtime_dir=runtime_dir,
    )

    print(f"Receipt ID:     {receipt['receipt_id']}")
    print(f"Checksum:       {receipt['checksum']}")
    print(f"Status:         {receipt['status']}")
    print(f"Action Tier:    {receipt['action_tier']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())