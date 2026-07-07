#!/usr/bin/env python3
"""
GHOSTCLAW A2A2A Safe Dispatcher
================================

Reads inbox mailboxes, routes envelopes to worker lanes, writes receipts.
NO live execution — this is a safe, read-only routing engine.

Safety:
  - No subprocess execution
  - No file writes outside the .ghostclaw_runtime/a2a2a/ directory
  - All receipts include SHA-256 checksum
  - X-tier actions are auto-refused with a blocked receipt

Usage:
  python3 scripts/ghostclaw/a2a2a_dispatcher_safe.py [--dry-run] [--inbox-dir PATH]

Author: GHOSTCLAW Full Auto Hermes Agent Team
MISSION_ID: GC-FULLAUTO-HERMES-SUBAGENT-SWARM-2026-06-30-V5
"""

import argparse
import hashlib
import json
import os
import sys
import time
from pathlib import Path

# --- Constants ---
DEFAULT_RUNTIME = Path(__file__).resolve().parents[1] / ".." / ".ghostclaw_runtime" / "a2a2a"
DEFAULT_RUNTIME = DEFAULT_RUNTIME.resolve()

SCHEMA_VERSION = "ghostclaw.receipt.v5"
MISSION_ID = "GC-FULLAUTO-HERMES-SUBAGENT-SWARM-2026-06-30-V5"

# X-tier (refuse) patterns — never allow these
X_TIER_PATTERNS = [
    "git push",
    "deploy",
    "gpu inference",
    "model download",
    "secret access",
    ".env",
    "paid api",
    "cloud mutation",
    "rm -rf",
    "sudo ",
]

# D-tier (block + simulate) patterns
D_TIER_PATTERNS = [
    "install",
    "pip install",
    "npm install",
    "brew install",
    "docker run",
    "curl ",
    "wget ",
]


def utc_now():
    """Return ISO 8601 UTC timestamp."""
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def sha256_hex(data: str) -> str:
    """Compute SHA-256 hex digest of a string."""
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def compute_receipt_checksum(receipt: dict) -> str:
    """Compute checksum of receipt body (excluding the checksum field itself)."""
    body = {k: v for k, v in receipt.items() if k != "checksum"}
    return sha256_hex(json.dumps(body, sort_keys=True))


def evaluate_tier(action: str, declared_tier: str) -> tuple:
    """
    Evaluate the action against safety patterns.
    Returns (effective_tier, verdict, reason).
    """
    action_lower = action.lower()

    # X-tier: hard refuse
    for pattern in X_TIER_PATTERNS:
        if pattern in action_lower:
            return ("X", "refused", f"Action matches blocked pattern: {pattern}")

    # D-tier: block + simulate
    for pattern in D_TIER_PATTERNS:
        if pattern in action_lower:
            return ("D", "blocked", f"Action matches install/network pattern: {pattern}")

    # Respect declared tier if no overrides
    if declared_tier == "X":
        return ("X", "refused", "Tier X declared")
    if declared_tier == "D":
        return ("D", "blocked", "Tier D declared")

    # A and B tiers pass through
    if declared_tier == "A":
        return ("A", "auto-approved", "Read-only auto-approve")
    if declared_tier == "B":
        return ("B", "auto-approved", "Auto-approve with evidence required")
    if declared_tier == "C":
        return ("C", "dry-run", "Dry-run only")

    return (declared_tier, "auto-approved", "Default auto-approve")


def generate_receipt_id(correlation_id: str) -> str:
    """Generate a unique receipt ID."""
    ts = int(time.time() * 1000)
    short_hash = sha256_hex(correlation_id)[:8]
    return f"rcp_{ts}_{short_hash}"


def process_envelope(envelope: dict, runtime_dir: Path, dry_run: bool = False) -> dict:
    """
    Process a single A2A2A envelope.
    Returns the receipt dict (and writes it unless dry-run).
    """
    corr_id = envelope.get("correlation_id", "unknown")
    source = envelope.get("source_agent", "unknown")
    target = envelope.get("target_agent", "unknown")
    action = envelope.get("requested_action", "unknown")
    tier = envelope.get("action_tier", "C")
    mission_id = envelope.get("mission_id", MISSION_ID)
    task_id = envelope.get("task_id", "unknown")

    # Evaluate safety
    effective_tier, verdict, reason = evaluate_tier(action, tier)

    receipt = {
        "schema": SCHEMA_VERSION,
        "receipt_id": generate_receipt_id(corr_id),
        "mission_id": mission_id,
        "task_id": task_id,
        "correlation_id": corr_id,
        "decision_id": envelope.get("decision_id"),
        "source_agent": source,
        "target_agent": target,
        "approver_agent": envelope.get("approver_agent", "gc-policy-guardian"),
        "action_tier": effective_tier,
        "status": verdict,
        "requested_action": action,
        "file_lease": envelope.get("file_lease"),
        "evidence": None,
        "reason": reason,
        "checksum": None,
        "timestamp": utc_now(),
    }

    # Compute checksum
    receipt["checksum"] = compute_receipt_checksum(receipt)

    # Write receipt
    if not dry_run:
        receipts_dir = runtime_dir / "receipts"
        receipts_dir.mkdir(parents=True, exist_ok=True)
        filename = f"receipt_{receipt['receipt_id']}.json"
        receipt_path = receipts_dir / filename
        with open(receipt_path, "w") as f:
            json.dump(receipt, f, indent=2)
        print(f"  [receipt] Written: {receipt_path}")

    return receipt


def scan_inbox(inbox_dir: Path):
    """
    Scan all agent mailboxes in the inbox directory.
    Yield (mailbox_name, filepath, json_content) for each .json envelope.
    """
    if not inbox_dir.exists():
        return

    for mailbox in sorted(inbox_dir.iterdir()):
        if not mailbox.is_dir():
            continue
        for filepath in sorted(mailbox.glob("*.json")):
            try:
                with open(filepath, "r") as f:
                    data = json.load(f)
                yield (mailbox.name, str(filepath), data)
            except (json.JSONDecodeError, IOError) as e:
                print(f"  [WARN] Cannot read {filepath}: {e}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description="GHOSTCLAW A2A2A Safe Dispatcher")
    parser.add_argument(
        "--runtime-dir",
        type=str,
        default=str(DEFAULT_RUNTIME),
        help="Path to .ghostclaw_runtime/a2a2a/",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Process envelopes but do not write receipts",
    )
    parser.add_argument(
        "--inbox-dir",
        type=str,
        default=None,
        help="Override inbox directory (defaults to runtime/inbox)",
    )
    args = parser.parse_args()

    runtime_dir = Path(args.runtime_dir).resolve()
    inbox_dir = Path(args.inbox_dir).resolve() if args.inbox_dir else runtime_dir / "inbox"

    print(f"GHOSTCLAW A2A2A Safe Dispatcher")
    print(f"  Runtime: {runtime_dir}")
    print(f"  Inbox:   {inbox_dir}")
    print(f"  Dry-run: {args.dry_run}")
    print(f"  Mission: {MISSION_ID}")
    print()

    # Validate runtime structure
    required_dirs = ["inbox", "outbox", "receipts", "schemas"]
    for d in required_dirs:
        expected = runtime_dir / d
        if not expected.exists():
            print(f"  [WARN] Missing directory: {expected}", file=sys.stderr)

    # Scan inbox
    processed = 0
    approved = 0
    blocked = 0
    refused = 0

    for mailbox_name, filepath, envelope in scan_inbox(inbox_dir):
        source_agent = envelope.get("source_agent", "?")
        target_agent = envelope.get("target_agent", "?")
        action = envelope.get("requested_action", "?")
        tier = envelope.get("action_tier", "?")

        print(f"  [{mailbox_name}] {source_agent}→{target_agent} (tier {tier}): {action[:80]}")

        receipt = process_envelope(envelope, runtime_dir, dry_run=args.dry_run)
        status = receipt["status"]

        if "approved" in status:
            approved += 1
        elif status == "blocked":
            blocked += 1
        elif status == "refused":
            refused += 1

        processed += 1

    print()
    print(f"Summary: {processed} processed, {approved} approved, {blocked} blocked, {refused} refused")
    return 0


if __name__ == "__main__":
    sys.exit(main())