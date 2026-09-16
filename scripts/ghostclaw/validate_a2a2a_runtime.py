#!/usr/bin/env python3
"""
GHOSTCLAW A2A2A Runtime Validator
=================================

Validates the runtime folder structure, schema files, and receipt checksums.

Checks:
  1. Required directories exist (inbox, outbox, receipts, schemas, etc.)
  2. Required schema files exist and are valid JSON
  3. All receipts have valid SHA-256 checksums
  4. Receipt statuses are within the allowed enum
  5. No X-tier actions have approved receipts (safety audit)
  6. Worker mailbox directories exist

Usage:
  python3 scripts/ghostclaw/validate_a2a2a_runtime.py [--runtime-dir PATH]

Exit codes:
  0 = all checks passed
  1 = one or more checks failed

MISSION_ID: GC-FULLAUTO-HERMES-SUBAGENT-SWARM-2026-06-30-V5
"""

import argparse
import hashlib
import json
import os
import sys
import time
from pathlib import Path

DEFAULT_RUNTIME = Path(__file__).resolve().parents[1] / ".." / ".ghostclaw_runtime" / "a2a2a"
DEFAULT_RUNTIME = DEFAULT_RUNTIME.resolve()

REQUIRED_DIRS = [
    "inbox",
    "outbox",
    "receipts",
    "schemas",
    "gates",
    "tasks",
    "tasks/pending",
    "tasks/running",
    "tasks/completed",
    "tasks/blocked",
    "tasks/failed",
    "tasks/waiting_review",
    "state",
    "logs",
]

REQUIRED_SCHEMAS = [
    "schemas/envelope.schema.json",
    "schemas/receipt.schema.json",
    "schemas/decision_gate.schema.json",
    "schemas/worker_registry.schema.json",
    "schemas/status.schema.json",
]

REQUIRED_MAILBOXES = [
    "inbox/hermes",
    "inbox/codex",
    "inbox/kob",
    "inbox/opus",
    "inbox/glm",
    "inbox/deepseek",
    "inbox/kimi",
    "inbox/browser",
    "inbox/vibe",
    "inbox/opencode",
]

EXPECTED_MAILBOXES = [
    "inbox/zcode",
    "inbox/zai_tui",
    "outbox/zcode",
    "outbox/zai_tui",
]

VALID_RECEIPT_STATUSES = [
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


def sha256_hex(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def check_dir(runtime: Path, relpath: str, errors: list, warnings: list):
    """Check if a required directory exists."""
    path = runtime / relpath
    if not path.exists():
        errors.append(f"Missing required directory: {relpath}")
    elif not path.is_dir():
        errors.append(f"Path is not a directory: {relpath}")


def check_schema(runtime: Path, relpath: str, errors: list, warnings: list):
    """Check if a schema file exists and is valid JSON with $schema key."""
    path = runtime / relpath
    if not path.exists():
        errors.append(f"Missing required schema: {relpath}")
        return
    try:
        with open(path, "r") as f:
            data = json.load(f)
        if "$schema" not in data:
            warnings.append(f"Schema {relpath} missing $schema key")
        if "type" not in data and "properties" not in data:
            warnings.append(f"Schema {relpath} appears incomplete (no type/properties)")
    except json.JSONDecodeError as e:
        errors.append(f"Schema {relpath} is not valid JSON: {e}")
    except IOError as e:
        errors.append(f"Cannot read schema {relpath}: {e}")


def check_receipts(runtime: Path, errors: list, warnings: list):
    """Validate all receipts in the receipts directory."""
    receipts_dir = runtime / "receipts"
    if not receipts_dir.exists():
        warnings.append("Receipts directory does not exist")
        return

    total = 0
    checksum_ok = 0
    checksum_failed = 0
    x_tier_approved = 0

    for filepath in sorted(receipts_dir.glob("*.json")):
        total += 1
        try:
            with open(filepath, "r") as f:
                receipt = json.load(f)
        except json.JSONDecodeError as e:
            errors.append(f"Receipt {filepath.name} is not valid JSON: {e}")
            continue

        # Verify checksum
        stored = receipt.get("checksum")
        if stored is None:
            warnings.append(f"Receipt {filepath.name} has no checksum")
            checksum_failed += 1
            continue

        body = {k: v for k, v in receipt.items() if k != "checksum"}
        computed = sha256_hex(json.dumps(body, sort_keys=True))
        if computed != stored:
            errors.append(f"Receipt {filepath.name} checksum mismatch (stored={stored[:12]}... computed={computed[:12]}...)")
            checksum_failed += 1
        else:
            checksum_ok += 1

        # Check status is valid
        status = receipt.get("status", "")
        if status not in VALID_RECEIPT_STATUSES:
            warnings.append(f"Receipt {filepath.name} has unknown status: {status}")

        # Safety audit: X-tier should never have approved/auto-approved
        tier = receipt.get("action_tier", "")
        if tier == "X" and "approved" in status:
            errors.append(f"Receipt {filepath.name} is X-tier but status is '{status}' — SAFETY VIOLATION")
            x_tier_approved += 1

    return {
        "total": total,
        "checksum_ok": checksum_ok,
        "checksum_failed": checksum_failed,
        "x_tier_approved": x_tier_approved,
    }


def check_status_file(runtime: Path, errors: list, warnings: list):
    """Validate the current mission status file."""
    status_path = runtime / "status" / "current_mission.json"
    if not status_path.exists():
        warnings.append("No current_mission.json in status/")
        return
    try:
        with open(status_path, "r") as f:
            status = json.load(f)
        required = ["mission_id", "phase", "overall_status", "workers", "updated_at"]
        for key in required:
            if key not in status:
                warnings.append(f"Status file missing key: {key}")
    except json.JSONDecodeError as e:
        errors.append(f"Status file is not valid JSON: {e}")


def main():
    parser = argparse.ArgumentParser(description="GHOSTCLAW A2A2A Runtime Validator")
    parser.add_argument("--runtime-dir", type=str, default=str(DEFAULT_RUNTIME), help="Runtime directory")
    args = parser.parse_args()

    runtime = Path(args.runtime_dir).resolve()

    print("=" * 60)
    print("GHOSTCLAW A2A2A Runtime Validator")
    print("=" * 60)
    print(f"Runtime: {runtime}")
    print()

    errors = []
    warnings = []

    # 1. Check directories
    print("[1/5] Checking required directories...")
    for d in REQUIRED_DIRS:
        check_dir(runtime, d, errors, warnings)
    if not errors:
        print(f"  ✓ All {len(REQUIRED_DIRS)} required directories exist")
    else:
        print(f"  ✗ {len([e for e in errors if 'directory' in e])} missing directories")

    # 2. Check schemas
    print("[2/5] Checking schema files...")
    for s in REQUIRED_SCHEMAS:
        check_schema(runtime, s, errors, warnings)
    if not any("schema" in e for e in errors):
        print(f"  ✓ All {len(REQUIRED_SCHEMAS)} required schemas valid")
    else:
        schema_errors = [e for e in errors if "schema" in e]
        print(f"  ✗ {len(schema_errors)} schema errors")

    # 3. Check mailboxes
    print("[3/5] Checking agent mailboxes...")
    for mb in REQUIRED_MAILBOXES:
        check_dir(runtime, mb, errors, warnings)
    for mb in EXPECTED_MAILBOXES:
        path = runtime / mb
        if not path.exists():
            warnings.append(f"Expected new mailbox (will be created on demand): {mb}")

    missing_required = [mb for mb in REQUIRED_MAILBOXES if not (runtime / mb).exists()]
    if not missing_required:
        print(f"  ✓ All {len(REQUIRED_MAILBOXES)} required mailboxes exist")
    else:
        print(f"  ✗ {len(missing_required)} missing mailboxes")

    # 4. Validate receipts
    print("[4/5] Validating receipts...")
    receipt_stats = check_receipts(runtime, errors, warnings)
    if receipt_stats:
        print(f"  Total receipts:     {receipt_stats['total']}")
        print(f"  Checksum OK:        {receipt_stats['checksum_ok']}")
        print(f"  Checksum FAILED:    {receipt_stats['checksum_failed']}")
        print(f"  X-tier approved:    {receipt_stats['x_tier_approved']} (should be 0)")
    else:
        print("  No receipts to validate")

    # 5. Check status file
    print("[5/5] Checking mission status file...")
    check_status_file(runtime, errors, warnings)
    if not any("status file" in e.lower() for e in errors):
        print("  ✓ Status file present and valid")

    # Summary
    print()
    print("=" * 60)
    if errors:
        print(f"RESULT: FAIL — {len(errors)} errors, {len(warnings)} warnings")
        print()
        for e in errors:
            print(f"  ERROR: {e}")
        for w in warnings:
            print(f"  WARN:  {w}")
        return 1
    else:
        print(f"RESULT: PASS — 0 errors, {len(warnings)} warnings")
        if warnings:
            print()
            for w in warnings:
                print(f"  WARN: {w}")
        return 0


if __name__ == "__main__":
    sys.exit(main())