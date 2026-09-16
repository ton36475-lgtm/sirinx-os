#!/usr/bin/env python3
"""
SIRINX A2A Sync Runner (Python) — replaces a2a-sync-runner.mjs

Processes inbox packets through the tier resolver and command broker logic.
No external dependencies, no Node.js, no .ts module resolution issues.

Safety:
  - No real shell execution
  - No .env / secret path access
  - No production deploy / generic push auto-approval
  - Deny rules always outrank bypass
  - Every decision produces a receipt
"""

import json
import os
import sys
import time
import hashlib
import uuid
from datetime import datetime, timezone
from pathlib import Path

# ─── Paths ───
PROJECT_ROOT = Path(os.path.expanduser("~/sirinx-os"))
INBOX_DIR = PROJECT_ROOT / "_A2A_QUEUE" / "inbox"
STATUS_PATH = PROJECT_ROOT / ".ghostclaw_runtime" / "a2a-sync-status.json"
OUTBOX_DIR = PROJECT_ROOT / ".ghostclaw_runtime" / "a2a2a" / "outbox"
RECEIPT_DIR = PROJECT_ROOT / ".ghostclaw_runtime" / "a2a2a" / "receipt"

# ─── Hard Deny Actions (Tier X) ───
HARD_DENY_ACTIONS = {
    "jailbreak_execution",
    "policy_bypass_execution",
    "secret_access",
    "credential_dump",
    "recursive_codex_launch",
    "recursive_moa_launch",
    "kv_only_protocol",
    "ambiguous_instruction_execution",
}

# ─── Forbidden Path Prefixes ───
FORBIDDEN_PATH_PREFIXES = [
    ".env", ".env.", ".git/", "~/.ssh/", "~/.aws/", "~/.config/",
    "production/", "deploy/", "secrets/",
]

ALLOWED_MUTATION_PREFIXES = [
    "GHOSTCLAW/", "docs/", "tests/", ".ghostclaw_runtime/", ".hermes/",
    "apps/", "packages/", "services/", "scripts/", "WORKSPACE_SCAFFOLD/",
]

# ─── Tier Rules ───
TIER_RULES = {
    "READ": {"tier": "A", "behavior": "auto_execute", "human_required": False},
    "WRITE_LANE": {"tier": "B", "behavior": "auto_execute", "human_required": False},
    "VALIDATE": {"tier": "B", "behavior": "auto_execute", "human_required": False},
    "PLAN": {"tier": "B", "behavior": "auto_execute", "human_required": False},
    "INTEGRATE": {"tier": "C", "behavior": "agent_quorum_required", "human_required": False},
    "COMMIT": {"tier": "C", "behavior": "agent_quorum_required", "human_required": False},
    "EXTERNAL": {"tier": "D", "behavior": "auto_block_and_simulate", "human_required": False},
    "DESTROY": {"tier": "D", "behavior": "auto_block_and_simulate", "human_required": False},
    "PUSH": {"tier": "X", "behavior": "hard_block_and_simulate", "human_required": True},
    "DEPLOY": {"tier": "X", "behavior": "hard_block_and_simulate", "human_required": True},
}

# ─── Action → Class mapping ───
ACTION_TO_CLASS = {
    "file_read": "READ", "brain_query": "READ", "repo_scan": "READ",
    "static_analysis": "READ", "file_inventory": "READ", "schema_validation": "READ",
    "policy_lint": "READ", "github_public_read_only_research": "READ",
    "write_module": "WRITE_LANE", "fix_bug": "WRITE_LANE",
    "allowed_path_code_patch": "WRITE_LANE", "local_test_generation": "WRITE_LANE",
    "local_runtime_artifact_write": "WRITE_LANE", "governance_doc_write": "WRITE_LANE",
    "build_scaffold": "WRITE_LANE",
    "design_architecture": "PLAN", "review_design": "PLAN", "goal_define": "PLAN",
    "mission_create": "PLAN", "brainstorm_deliberate": "PLAN",
    "run_tests": "VALIDATE", "run_lint": "VALIDATE", "validate": "VALIDATE",
    "integrate_patches": "INTEGRATE", "stage_commit": "COMMIT",
    "build": "WRITE_LANE", "classify": "VALIDATE", "policy_enforce": "VALIDATE",
    "dependency_install": "EXTERNAL", "model_download": "EXTERNAL",
    "gpu_inference": "EXTERNAL", "external_network_write": "EXTERNAL",
    "generic_push": "PUSH", "generic_deploy": "DEPLOY",
    "production_deploy": "DEPLOY",
    "destructive_filesystem_mutation": "DESTROY",
    "broad_filesystem_mutation": "DESTROY",
}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def sha256(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def resolve_action_class(action: str, lane: str = "") -> str:
    base = ACTION_TO_CLASS.get(action, "EXTERNAL")
    if not lane:
        return base
    # Lane upgrades
    if lane.startswith(".hermes/hermes-agent/plugins/"):
        upgrades = {"build": "WRITE_LANE", "classify": "VALIDATE",
                     "verify": "VALIDATE", "policy_enforce": "VALIDATE"}
        if action in upgrades:
            return upgrades[action]
    if lane.startswith("tests/"):
        upgrades = {"verify": "VALIDATE", "build": "WRITE_LANE"}
        if action in upgrades:
            return upgrades[action]
    return base


def resolve_tier(action_class: str) -> dict:
    return TIER_RULES.get(action_class, {
        "tier": "X", "behavior": "hard_block_and_simulate", "human_required": True
    })


def path_is_in_scope(files: list) -> tuple:
    for f in files:
        normalized = f.lstrip("/")
        for prefix in FORBIDDEN_PATH_PREFIXES:
            if normalized.startswith(prefix) or normalized == ".env":
                return False, f"forbidden_path:{normalized}"
        if not any(normalized.startswith(p) for p in ALLOWED_MUTATION_PREFIXES):
            return False, f"out_of_lane_path:{normalized}"
    return True, None


def evaluate_command(msg: dict) -> dict:
    """Evaluate an A2A message through the command broker."""
    action = msg.get("action_requested", "")
    lane = msg.get("context", {}).get("lane", "")
    files = msg.get("context", {}).get("files", [])
    action_class = resolve_action_class(action, lane)
    tier_rule = resolve_tier(action_class)
    decision_id = f"D-{uuid.uuid4().hex[:8]}"

    # 1. Hard deny
    if action in HARD_DENY_ACTIONS:
        verdict = {
            "allowed": False, "tier": "X",
            "reason": f"hard_deny:{action}",
            "safe_replacement": "policy_bypass_attempt_classification",
        }
    # 2. Path scope check for writes
    elif action_class in ("WRITE_LANE", "INTEGRATE"):
        ok, reason = path_is_in_scope(files)
        if not ok:
            verdict = {
                "allowed": False, "tier": "X",
                "reason": reason,
                "safe_replacement": "dry_run_diff",
            }
        else:
            verdict = _apply_tier(tier_rule, action_class, decision_id)
    else:
        verdict = _apply_tier(tier_rule, action_class, decision_id)

    receipt = {
        "schema": "ghostclaw.receipt.v3_2",
        "decision_id": decision_id,
        "correlation_id": msg.get("correlation_id", ""),
        "mission_id": msg.get("mission_id", ""),
        "requester_agent": msg.get("from", {}).get("agent", ""),
        "approver_agent": msg.get("to", {}).get("agent", ""),
        "action_class": action_class,
        "final_tier": verdict["tier"],
        "decision_status": (
            "allowed" if verdict["allowed"]
            else "quorum_required" if verdict["tier"] == "C"
            else "simulated"
        ),
        "reason": verdict["reason"],
        "evidence_pack": {
            "action_requested": action,
            "lane": lane,
            "files": files,
            "safe_replacement": verdict.get("safe_replacement"),
        },
        "safe_replacement_action": verdict.get("safe_replacement"),
        "timestamp": now_iso(),
        "checksums": {
            "context_goal_sha256": sha256(msg.get("context", {}).get("goal", "")),
            "action_requested_sha256": sha256(action),
        },
    }
    return {"verdict": verdict, "receipt": receipt}


def _apply_tier(tier_rule, action_class, decision_id):
    behavior = tier_rule["behavior"]
    tier = tier_rule["tier"]
    if behavior == "auto_execute":
        return {
            "allowed": True, "tier": tier,
            "reason": f"auto_execute:{tier}:{action_class}",
            "safe_replacement": None,
        }
    elif behavior == "agent_quorum_required":
        return {
            "allowed": False, "tier": tier,
            "reason": f"quorum_required:{tier}:{action_class}",
            "safe_replacement": "agent_quorum_or_dry_run",
        }
    elif behavior == "auto_block_and_simulate":
        return {
            "allowed": False, "tier": tier,
            "reason": f"auto_block_and_simulate:{tier}:{action_class}",
            "safe_replacement": "lockfile_analysis" if tier == "D" else "staging_dry_run",
        }
    else:  # hard_block
        return {
            "allowed": False, "tier": "X",
            "reason": f"hard_block:{action_class}",
            "safe_replacement": "staging_dry_run",
        }


def process_inbox():
    """Process all inbox packets."""
    entries = []
    if INBOX_DIR.exists():
        entries = [f for f in INBOX_DIR.iterdir() if f.suffix == ".json"]

    results = []
    allowed = 0
    blocked = 0
    quorum = 0

    for file_path in entries:
        try:
            with open(file_path) as f:
                packet = json.load(f)
        except Exception as e:
            results.append({"file": file_path.name, "status": "skipped",
                            "reason": f"parse_error: {e}"})
            continue

        msg = packet.get("a2a2a_message")
        if not msg:
            # Try flat format (mission_id at top level)
            msg = {
                "a2a2a_version": "2.0",
                "mission_id": packet.get("mission_id", packet.get("mission", "")),
                "correlation_id": packet.get("correlation_id", ""),
                "from": {"agent": packet.get("source", "codex"), "role": ""},
                "to": {"agent": packet.get("target", "hermes"), "role": ""},
                "action_requested": packet.get("action_requested", "file_read"),
                "context": {
                    "goal": packet.get("payload", {}).get("summary", ""),
                    "lane": packet.get("payload", {}).get("changed_files", [""])[0] if packet.get("payload", {}).get("changed_files") else "",
                    "files": packet.get("payload", {}).get("changed_files", []),
                },
            }

        eval_result = evaluate_command(msg)
        verdict = eval_result["verdict"]
        receipt = eval_result["receipt"]

        # Write receipt
        RECEIPT_DIR.mkdir(parents=True, exist_ok=True)
        receipt_path = RECEIPT_DIR / f"receipt_{receipt['decision_id']}.json"
        with open(receipt_path, "w") as f:
            json.dump(receipt, f, indent=2)

        if verdict["allowed"]:
            allowed += 1
            decision = "ALLOWED"
        elif verdict["tier"] == "C":
            quorum += 1
            decision = "QUORUM_REQUIRED"
        else:
            blocked += 1
            decision = "BLOCKED"

        results.append({
            "file": file_path.name,
            "packet_id": receipt["decision_id"],
            "action": msg.get("action_requested", "?"),
            "tier": verdict["tier"],
            "decision": decision,
            "reason": verdict["reason"],
            "decision_id": receipt["decision_id"],
            "mission_id": msg.get("mission_id", ""),
            "correlation_id": msg.get("correlation_id", ""),
        })

    report = {
        "sync_run_id": f"SYNC-{uuid.uuid4().hex[:8]}",
        "timestamp": now_iso(),
        "project_root": str(PROJECT_ROOT),
        "inbox_count": len(entries),
        "allowed": allowed,
        "blocked": blocked,
        "quorum_required": quorum,
        "results": results,
    }

    # Write status report
    STATUS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(STATUS_PATH, "w") as f:
        json.dump(report, f, indent=2)

    return report


if __name__ == "__main__":
    report = process_inbox()
    print("=" * 60)
    print("A2A SYNC RUNNER — Python (replaces a2a-sync-runner.mjs)")
    print("=" * 60)
    print(f"Sync Run:   {report['sync_run_id']}")
    print(f"Timestamp:  {report['timestamp']}")
    print(f"Inbox pkts: {report['inbox_count']}")
    print(f"Allowed:    {report['allowed']} (Tier A/B)")
    print(f"Quorum:     {report['quorum_required']} (Tier C)")
    print(f"Blocked:    {report['blocked']} (Tier D/X)")
    print("-" * 60)
    for r in report["results"]:
        icon = "OK" if r["decision"] == "ALLOWED" else ("?" if r["decision"] == "QUORUM_REQUIRED" else "X")
        print(f"  [{icon}] [{r['tier']}] {r['action']} — {r['decision']}")
        print(f"     file: {r['file']}")
        print(f"     reason: {r['reason']}")
        print(f"     decision_id: {r['decision_id']}")
    print("-" * 60)
    print(f"Status report: {STATUS_PATH}")
    print("=" * 60)
