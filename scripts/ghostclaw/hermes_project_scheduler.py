#!/usr/bin/env python3
"""
Hermes project-local scheduler runner.

This is a dry-run friendly scheduler surface for the repo. It never installs
cron/launchd jobs, never sends Telegram/customer messages, never reads secrets,
and never calls external providers.
"""

import argparse
import json
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
RUNTIME_ROOT = REPO_ROOT / ".ghostclaw_runtime"
STATUS_PATH = RUNTIME_ROOT / "scheduler" / "last_run.json"

SCHEDULES = {
    "a2a2a_heartbeat": {
        "cadence": "every_5_minutes",
        "tier": "A_SAFE_LOCAL",
        "mode": "local_status_only",
        "actions": [
            "inspect_queue_directories",
            "inspect_stale_lock_metadata",
            "write_local_status_snapshot"
        ],
    },
    "queue_reconcile": {
        "cadence": "every_15_minutes",
        "tier": "A_SAFE_LOCAL",
        "mode": "local_status_only",
        "actions": [
            "count_inbox_outbox_receipts",
            "summarize_blocked_packets",
            "write_local_status_snapshot"
        ],
    },
    "kanban_sync": {
        "cadence": "every_30_minutes",
        "tier": "B_SAFE_LOCAL",
        "mode": "local_draft_only",
        "actions": [
            "compare_runtime_tasks_to_kanban",
            "write_sync_recommendation",
            "do_not_send_external_messages"
        ],
    },
    "obsidian_brain_sync": {
        "cadence": "every_60_minutes",
        "tier": "B_SAFE_LOCAL",
        "mode": "local_project_brain_only",
        "actions": [
            "refresh_brain_index_metadata",
            "update_receipt_index_when_requested",
            "never_copy_secrets_or_large_logs"
        ],
    },
    "night_watch": {
        "cadence": "every_12_hours",
        "tier": "A_SAFE_LOCAL",
        "mode": "local_report_draft_only",
        "actions": [
            "repo_health_snapshot",
            "queue_health_snapshot",
            "write_report_draft_no_live_send"
        ],
    },
    "morning_report": {
        "cadence": "08:00_local",
        "tier": "B_SAFE_LOCAL",
        "mode": "local_report_draft_only",
        "actions": [
            "compile_commander_report_draft",
            "list_blocked_actions",
            "do_not_send_telegram"
        ],
    },
    "archive_closeout": {
        "cadence": "23:30_local",
        "tier": "B_SAFE_LOCAL",
        "mode": "local_archive_only",
        "actions": [
            "summarize_completed_receipts",
            "write_archive_plan",
            "do_not_delete_logs"
        ],
    },
}


def utc_now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def count_files(path: Path, pattern: str = "*") -> int:
    if not path.exists():
        return 0
    return sum(1 for item in path.glob(pattern) if item.is_file())


def build_snapshot(task: str) -> dict:
    a2a = RUNTIME_ROOT / "a2a2a"
    snapshot = {
        "schema": "ghostclaw.scheduler.local_run.v1",
        "task": task,
        "generated_at": utc_now(),
        "repo_root": str(REPO_ROOT),
        "dry_run_safe": True,
        "live_send_executed": False,
        "external_mutation_executed": False,
        "secret_access_executed": False,
        "schedule": SCHEDULES[task],
        "runtime_counts": {
            "inbox_files": count_files(a2a / "inbox"),
            "outbox_files": count_files(a2a / "outbox"),
            "receipt_files": count_files(a2a / "receipts", "*.json"),
            "blocked_files": count_files(a2a / "blocked", "*"),
        },
        "blocked_actions": [
            "launchd_load",
            "crontab_install",
            "telegram_live_send",
            "provider_call",
            "secret_read",
            "push",
            "deploy"
        ],
    }
    return snapshot


def main() -> int:
    parser = argparse.ArgumentParser(description="Run a local-safe Hermes scheduler task")
    parser.add_argument("--task", choices=sorted(SCHEDULES), default="a2a2a_heartbeat")
    parser.add_argument("--write-status", action="store_true", help="Write local scheduler status JSON")
    args = parser.parse_args()

    snapshot = build_snapshot(args.task)
    if args.write_status:
        STATUS_PATH.parent.mkdir(parents=True, exist_ok=True)
        STATUS_PATH.write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")

    print(json.dumps(snapshot, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
