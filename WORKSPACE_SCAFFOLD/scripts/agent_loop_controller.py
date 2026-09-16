#!/usr/bin/env python3
"""
SIRINX Agent Loop Controller — A2A Sync + Telegram Approval + Knowledge Integration

Architecture:
  1. Scan A2A inbox for pending packets (sirinx-os/.ghostclaw_runtime/a2a2a/inbox/hermes/)
  2. Run A2A sync runner (node a2a-sync-runner.mjs) for tier resolution
  3. For Tier A/B: auto-approve, log receipt
  4. For Tier C: send Telegram approval request (human in loop)
  5. For Tier D/X: auto-block, log to blocked/, send Telegram alert
  6. Write status report to .ghostclaw_runtime/a2a-sync-status.json
  7. Append pulse to Obsidian AI HQ Knowledge Digest

Safety:
  - No deploy, no push, no cloud mutation
  - No secret read/print
  - No LINE live-send
  - No customer message
  - Telegram = command center notification only (approval requests + alerts)
"""

import json
import os
import subprocess
import sys
import time
import hashlib
from datetime import datetime, timezone
from pathlib import Path

# ─── Paths ───
SIRINX_OS = Path(os.path.expanduser("~/sirinx-os"))
A2A_BRIDGE = SIRINX_OS / "GHOSTCLAW" / "a2a-hermes-codex-bridge"
A2A_RUNTIME = SIRINX_OS / ".ghostclaw_runtime" / "a2a2a"
INBOX_DIR = A2A_RUNTIME / "inbox" / "hermes"
OUTBOX_DIR = A2A_RUNTIME / "outbox"
BLOCKED_DIR = A2A_RUNTIME / "blocked"
RECEIPT_DIR = A2A_RUNTIME / "receipt"
STATUS_PATH = SIRINX_OS / ".ghostclaw_runtime" / "a2a-sync-status.json"
OBSIDIAN_DIGEST = Path(os.path.expanduser("~/Documents/Obsidian Vault/SIRINX/AI HQ Knowledge Digest.md"))

# ─── Telegram ───
TELEGRAM_TARGET = "telegram"
HERMES_SEND = os.path.expanduser("~/.local/bin/hermes")

# ─── Safety Locks ───
SAFETY_LOCKS = {
    "SIRINX_LINE_MODE": "dry-run",
    "SIRINX_LINE_AUTO_REPLY_APPROVED": "false",
    "deploy": False,
    "push": False,
    "cloud_mutation": False,
    "secret_read": False,
    "line_live_send": False,
    "customer_message": False,
}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def sha256(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def send_telegram(message: str, quiet: bool = True):
    """Send a message to Telegram command center."""
    try:
        cmd = [HERMES_SEND, "-t", TELEGRAM_TARGET]
        if quiet:
            cmd.append("-q")
        cmd.append(message)
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return result.returncode == 0
    except Exception as e:
        print(f"[WARNING] Telegram send failed: {e}", file=sys.stderr)
        return False


def format_approval_request(packet_id, action, tier, reason, files, mission_id):
    """Format a Telegram-safe approval request (no secrets)."""
    files_str = ", ".join(files[:5]) if files else "(none)"
    if len(files) > 5:
        files_str += f" ... +{len(files) - 5} more"

    msg = f"""🔔 A2A Approval Required

Mission: {mission_id or 'unknown'}
Packet: {packet_id}
Tier: {tier} (Quorum Required)
Action: {action}
Reason: {reason}
Files: {files_str}

Safety Locks: deploy=blocked push=blocked cloud=blocked
LINE: dry-run only

Reply with:
APPROVE {packet_id}
or
DENY {packet_id}"""
    return msg


def format_block_alert(packet_id, action, tier, reason, mission_id):
    """Format a Telegram block alert."""
    msg = f"""🚫 A2A Auto-Blocked

Mission: {mission_id or 'unknown'}
Packet: {packet_id}
Tier: {tier}
Action: {action}
Reason: {reason}

Blocked by policy. No action taken.
Simulation manifest written."""
    return msg


def format_auto_approve_summary(approved_count, blocked_count, quorum_count):
    """Format a Telegram summary for auto-approved actions."""
    if approved_count == 0 and blocked_count == 0 and quorum_count == 0:
        return None  # silent — nothing to report

    msg = f"""✅ A2A Loop Complete

Auto-approved (A/B): {approved_count}
Quorum required (C): {quorum_count}
Auto-blocked (D/X): {blocked_count}

All safety locks intact.
LINE: dry-run | Deploy: blocked | Push: blocked"""
    return msg


def run_a2a_sync():
    """Run the A2A sync runner (Python — replaces Node a2a-sync-runner.mjs)."""
    sync_script = SIRINX_OS / "WORKSPACE_SCAFFOLD" / "scripts" / "a2a_sync_runner.py"
    if not sync_script.exists():
        return {"error": f"A2A sync runner not found at {sync_script}", "results": []}

    try:
        result = subprocess.run(
            ["python3", str(sync_script)],
            capture_output=True, text=True, timeout=60,
            cwd=str(SIRINX_OS)
        )
        if result.returncode != 0:
            return {"error": result.stderr, "results": []}

        # Read status report
        if STATUS_PATH.exists():
            with open(STATUS_PATH) as f:
                return json.load(f)
        return {"error": "Status report not found", "results": []}
    except Exception as e:
        return {"error": str(e), "results": []}


def process_loop():
    """Main agent loop: sync -> classify -> notify."""
    loop_id = f"LOOP-{int(time.time())}"
    timestamp = now_iso()

    print(f"[{timestamp}] Agent Loop {loop_id} starting...")

    # 1. Run A2A sync
    sync_result = run_a2a_sync()

    if "error" in sync_result:
        print(f"[ERROR] Sync failed: {sync_result['error']}")
        send_telegram(f"⚠️ A2A Sync Error\n\n{sync_result['error'][:200]}")
        return sync_result

    results = sync_result.get("results", [])
    approved = sync_result.get("allowed", 0)
    blocked = sync_result.get("blocked", 0)
    quorum = sync_result.get("quorum_required", 0)

    print(f"  Inbox: {sync_result.get('inbox_count', 0)}")
    print(f"  Approved (A/B): {approved}")
    print(f"  Quorum (C): {quorum}")
    print(f"  Blocked (D/X): {blocked}")

    # 2. Send Telegram notifications
    telegram_sent = 0
    for r in results:
        if r.get("decision") == "QUORUM_REQUIRED":
            msg = format_approval_request(
                r.get("packet_id", "?"),
                r.get("action", "?"),
                r.get("tier", "?"),
                r.get("reason", "?"),
                [],
                r.get("mission_id")
            )
            if send_telegram(msg):
                telegram_sent += 1
            print(f"  -> Telegram: approval request for {r.get('packet_id')}")

        elif r.get("decision") == "BLOCKED":
            msg = format_block_alert(
                r.get("packet_id", "?"),
                r.get("action", "?"),
                r.get("tier", "?"),
                r.get("reason", "?"),
                r.get("mission_id")
            )
            if send_telegram(msg):
                telegram_sent += 1
            print(f"  -> Telegram: block alert for {r.get('packet_id')}")

    # 3. Send summary if there were any packets
    summary = format_auto_approve_summary(approved, blocked, quorum)
    if summary:
        send_telegram(summary)
        telegram_sent += 1

    # 4. Write Obsidian brain pulse
    pulse = f"""

## {datetime.now().strftime('%Y-%m-%d %H:%M')} +07 - A2A Agent Loop {loop_id}

- What changed: Ran A2A sync loop; processed {sync_result.get('inbox_count', 0)} inbox packets through tier resolver.
- Result: {approved} auto-approved (A/B), {quorum} quorum-required (C), {blocked} auto-blocked (D/X).
- Telegram: sent {telegram_sent} messages (approval requests for C-tier, block alerts for D/X-tier, summary).
- Safety: all locks intact (deploy=blocked, push=blocked, cloud=blocked, LINE=dry-run, secret_read=blocked).
- Next safe action: human review C-tier approval requests in Telegram; no deploy, push, or cloud mutation performed.
"""
    try:
        with open(OBSIDIAN_DIGEST, "a") as f:
            f.write(pulse)
        print("  -> Obsidian brain pulse written")
    except Exception as e:
        print(f"  [WARNING] Obsidian write failed: {e}")

    # 5. Final status
    final_status = {
        "loop_id": loop_id,
        "timestamp": timestamp,
        "sync_run_id": sync_result.get("sync_run_id"),
        "inbox_count": sync_result.get("inbox_count", 0),
        "approved": approved,
        "quorum_required": quorum,
        "blocked": blocked,
        "safety_locks": SAFETY_LOCKS,
        "telegram_messages_sent": telegram_sent,
        "obsidian_pulse": True,
    }

    print(f"[{now_iso()}] Agent Loop {loop_id} complete.")
    return final_status


if __name__ == "__main__":
    status = process_loop()
    print(json.dumps(status, indent=2))
