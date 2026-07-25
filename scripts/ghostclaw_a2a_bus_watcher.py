#!/usr/bin/env python3
"""Local GhostClaw A2A bus watcher.

This is a deterministic local sync loop for the `.ghostclaw_runtime/a2a2a`
file bus. It scans every inbox mailbox and writes bus-level ack receipts without
executing packet payloads or calling any external system.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
RUNTIME_ROOT = REPO_ROOT / ".ghostclaw_runtime" / "a2a2a"
INBOX_ROOT = RUNTIME_ROOT / "inbox"
OUTBOX_ROOT = RUNTIME_ROOT / "outbox"
RECEIPT_ROOT = RUNTIME_ROOT / "receipts"
LOG_ROOT = RUNTIME_ROOT / "logs"
STATE_ROOT = RUNTIME_ROOT / "state"
PID_ROOT = RUNTIME_ROOT / "pids"
PROCESSED_STATE = STATE_ROOT / "bus-watcher-processed-a2a-sync.json"

AGENT_MAILBOXES = (
    "hermes",
    "kob",
    "codex",
    "opus",
    "glm",
    "deepseek",
    "kimi",
    "browser",
    "vibe",
    "opencode",
)


def configure_root(root: str | None) -> None:
    global REPO_ROOT, RUNTIME_ROOT, INBOX_ROOT, OUTBOX_ROOT, RECEIPT_ROOT, LOG_ROOT, STATE_ROOT, PID_ROOT, PROCESSED_STATE
    if root:
        candidate = Path(root).expanduser()
        if not candidate.is_absolute():
            candidate = (Path.cwd() / candidate).resolve()
        REPO_ROOT = candidate.resolve()
    RUNTIME_ROOT = REPO_ROOT / ".ghostclaw_runtime" / "a2a2a"
    INBOX_ROOT = RUNTIME_ROOT / "inbox"
    OUTBOX_ROOT = RUNTIME_ROOT / "outbox"
    RECEIPT_ROOT = RUNTIME_ROOT / "receipts"
    LOG_ROOT = RUNTIME_ROOT / "logs"
    STATE_ROOT = RUNTIME_ROOT / "state"
    PID_ROOT = RUNTIME_ROOT / "pids"
    PROCESSED_STATE = STATE_ROOT / "bus-watcher-processed-a2a-sync.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def safe_id(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "-_." else "_" for ch in value)[:180]


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")


def ensure_runtime_dirs() -> None:
    for folder in ("inbox", "outbox"):
        for agent in AGENT_MAILBOXES:
            (RUNTIME_ROOT / folder / agent).mkdir(parents=True, exist_ok=True)
    for folder in (RECEIPT_ROOT, LOG_ROOT, STATE_ROOT, PID_ROOT):
        folder.mkdir(parents=True, exist_ok=True)


def append_log(event: dict[str, Any]) -> None:
    LOG_ROOT.mkdir(parents=True, exist_ok=True)
    payload = {"timestamp": now_iso(), "agent": "a2a-sync", **event}
    with (LOG_ROOT / "a2a-sync.log").open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False, sort_keys=True) + "\n")


def fingerprint(path: Path, raw: bytes) -> str:
    digest = hashlib.sha256(raw).hexdigest()[:16]
    return f"{path.relative_to(REPO_ROOT)}:{digest}"


def resolve_packet_path(value: str) -> Path:
    path = Path(value).expanduser()
    if not path.is_absolute():
        path = REPO_ROOT / path
    return path.resolve()


def is_under(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


def load_processed() -> set[str]:
    if not PROCESSED_STATE.exists():
        return set()
    try:
        data = load_json(PROCESSED_STATE)
    except json.JSONDecodeError:
        return set()
    return set(data.get("processed", []))


def save_processed(processed: set[str]) -> None:
    write_json(
        PROCESSED_STATE,
        {
            "schema": "ghostclaw.a2a2a.bus_watcher_state.v1",
            "agent": "a2a-sync",
            "updated_at": now_iso(),
            "processed": sorted(processed),
        },
    )


def is_task_envelope(data: Any) -> bool:
    if not isinstance(data, dict):
        return False
    if data.get("schema") == "ghostclaw.a2a2a.task.v1":
        return True
    required_flags = ["requires_ack", "requires_receipt", "dangerous_actions_allowed"]
    return all(flag in data for flag in required_flags)


def common_execution_record() -> dict[str, bool]:
    return {
        "payload_executed": False,
        "paid_model_calls": False,
        "secret_access": False,
        "cloud_mutation": False,
        "external_message_send": False,
        "package_install": False,
        "git_push": False,
        "deploy": False,
    }


def make_receipt(path: Path, data: dict[str, Any], raw: bytes) -> dict[str, Any]:
    target = str(data.get("target") or path.parent.name)
    packet_id = str(data.get("id") or data.get("packet_id") or path.stem)
    return {
        "schema": "ghostclaw.a2a2a.bus_ack_receipt.v1",
        "status": "acknowledged_local_bus_sync",
        "local_worker": True,
        "probe_only": False,
        "receipt_id": f"bus_ack_{target}_{packet_id}",
        "packet_id": packet_id,
        "packet_path": str(path.relative_to(REPO_ROOT)),
        "packet_sha256": hashlib.sha256(raw).hexdigest(),
        "source": str(data.get("source") or data.get("from") or "unknown"),
        "target": target,
        "packet_created_at": str(data.get("created_at") or "unknown"),
        "acknowledged_at": now_iso(),
        "acknowledged_by": "a2a-local-bus-watcher",
        "execution": common_execution_record(),
        "note": "A2A local bus watcher acknowledged packet presence only; no payload execution occurred.",
    }


def scan_once(packet_paths: list[str] | None = None) -> list[dict[str, Any]]:
    processed = load_processed()
    receipts: list[dict[str, Any]] = []
    if not INBOX_ROOT.exists():
        return receipts

    if packet_paths:
        paths: list[Path] = []
        for packet_path in packet_paths:
            resolved = resolve_packet_path(packet_path)
            if not is_under(resolved, INBOX_ROOT.resolve()):
                append_log({"event": "packet_outside_inbox_skipped", "packet_path": str(packet_path)})
                continue
            if not resolved.is_file():
                append_log({"event": "missing_packet_skipped", "packet_path": str(packet_path)})
                continue
            paths.append(resolved)
    else:
        paths = sorted(INBOX_ROOT.glob("*/*.json"))

    for path in sorted(paths):
        raw = path.read_bytes()
        key = fingerprint(path, raw)
        if key in processed:
            continue
        try:
            data = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as exc:
            append_log({"event": "invalid_json_skipped", "packet_path": str(path.relative_to(REPO_ROOT)), "error": str(exc)})
            processed.add(key)
            continue
        if not is_task_envelope(data):
            append_log({"event": "non_task_skipped", "packet_path": str(path.relative_to(REPO_ROOT))})
            processed.add(key)
            continue

        receipt = make_receipt(path, data, raw)
        receipt_path = RECEIPT_ROOT / f"{safe_id(receipt['receipt_id'])}.json"
        write_json(receipt_path, receipt)
        append_log(
            {
                "event": "bus_ack_receipt_written",
                "packet_path": str(path.relative_to(REPO_ROOT)),
                "receipt_path": str(receipt_path.relative_to(REPO_ROOT)),
                "local_worker": True,
                "probe_only": False,
            }
        )
        processed.add(key)
        receipts.append(receipt)

    save_processed(processed)
    return receipts


def write_state(receipts: list[dict[str, Any]], loop: bool) -> None:
    state_path = STATE_ROOT / "a2a-sync.json"
    existing = {}
    if state_path.exists():
        try:
            existing = load_json(state_path)
        except json.JSONDecodeError:
            existing = {}
    previous_receipts = existing.get("receipts", []) if isinstance(existing.get("receipts"), list) else []
    next_receipts = previous_receipts + [
        str((RECEIPT_ROOT / f"{safe_id(receipt['receipt_id'])}.json").relative_to(REPO_ROOT)) for receipt in receipts
    ]
    processed_count = 0
    if PROCESSED_STATE.exists():
        try:
            processed_count = len(load_json(PROCESSED_STATE).get("processed", []))
        except json.JSONDecodeError:
            processed_count = 0
    write_json(
        state_path,
        {
            "schema": "ghostclaw.a2a2a.local_bus_watcher_state.v1",
            "agent": "a2a-sync",
            "worker": "a2a-local-bus-watcher",
            "local_worker": True,
            "probe_only": False,
            "loop": loop,
            "pid": os.getpid(),
            "updated_at": now_iso(),
            "processed_count": processed_count,
            "receipts": sorted(set(next_receipts)),
            "receipt_count": len(set(next_receipts)),
        },
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Local GhostClaw A2A bus watcher.")
    parser.add_argument("--root", default=None, help="repo root")
    parser.add_argument("--packet", action="append", default=[], help="process only this inbox packet path; can be repeated")
    parser.add_argument("--once", action="store_true", help="run once and exit")
    parser.add_argument("--loop", action="store_true", help="keep scanning until stopped")
    parser.add_argument("--interval", type=float, default=2.0, help="loop interval in seconds")
    parser.add_argument("--max-iterations", type=int, default=0, help="stop after N loop iterations; 0 means forever")
    args = parser.parse_args()
    configure_root(args.root)
    ensure_runtime_dirs()
    append_log({"event": "bus_watcher_started", "pid": os.getpid(), "loop": args.loop, "interval": args.interval})

    iterations = 0
    while True:
        receipts = scan_once(args.packet)
        write_state(receipts, args.loop)
        summary = {
            "agent": "a2a-sync",
            "local_worker": True,
            "probe_only": False,
            "receipts": [receipt["receipt_id"] for receipt in receipts],
            "scanned_packets": len(receipts),
            "timestamp": now_iso(),
        }
        if not args.loop:
            print(json.dumps(summary, indent=2, ensure_ascii=False, sort_keys=True))
            return 0
        iterations += 1
        if args.max_iterations and iterations >= args.max_iterations:
            summary["iterations"] = iterations
            print(json.dumps(summary, indent=2, ensure_ascii=False, sort_keys=True))
            return 0
        print(json.dumps(summary, ensure_ascii=False, sort_keys=True), flush=True)
        time.sleep(args.interval)


if __name__ == "__main__":
    raise SystemExit(main())
