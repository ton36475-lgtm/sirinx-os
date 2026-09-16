#!/usr/bin/env python3
"""Probe-only GhostClaw A2A sync runner.

This script acknowledges JSON task envelopes in `.ghostclaw_runtime/a2a2a/inbox/*`
by writing receipt files. It never executes packet payloads, calls providers,
reads secrets, installs packages, mutates cloud resources, or sends messages.
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
RECEIPT_ROOT = RUNTIME_ROOT / "receipts"
LOG_ROOT = RUNTIME_ROOT / "logs"
STATE_ROOT = RUNTIME_ROOT / "state"
PROCESSED_STATE = STATE_ROOT / "probe-processed.json"
PROBE_ID = "ghostclaw-a2a-sync-probe"
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


def configure_paths(root: str | None, agent: str) -> None:
    global REPO_ROOT, RUNTIME_ROOT, INBOX_ROOT, RECEIPT_ROOT, LOG_ROOT, STATE_ROOT, PROCESSED_STATE

    if root:
        candidate = Path(root).expanduser()
        if not candidate.is_absolute():
            candidate = (Path.cwd() / candidate).resolve()
        REPO_ROOT = candidate

    RUNTIME_ROOT = REPO_ROOT / ".ghostclaw_runtime" / "a2a2a"
    INBOX_ROOT = RUNTIME_ROOT / "inbox"
    RECEIPT_ROOT = RUNTIME_ROOT / "receipts"
    LOG_ROOT = RUNTIME_ROOT / "logs"
    STATE_ROOT = RUNTIME_ROOT / "state"
    safe_agent = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in agent)
    PROCESSED_STATE = STATE_ROOT / f"probe-processed-{safe_agent}.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def ensure_runtime_dirs() -> None:
    for folder in ("inbox", "outbox"):
        for agent in AGENT_MAILBOXES:
            (RUNTIME_ROOT / folder / agent).mkdir(parents=True, exist_ok=True)
    for folder in (RECEIPT_ROOT, LOG_ROOT, STATE_ROOT, RUNTIME_ROOT / "pids"):
        folder.mkdir(parents=True, exist_ok=True)


def append_log(event: dict[str, Any]) -> None:
    LOG_ROOT.mkdir(parents=True, exist_ok=True)
    with (LOG_ROOT / "a2a-sync.log").open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, ensure_ascii=False) + "\n")


def fingerprint(path: Path, raw: bytes) -> str:
    digest = hashlib.sha256(raw).hexdigest()[:16]
    return f"{path.relative_to(REPO_ROOT)}:{digest}"


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
            "schema": "ghostclaw.a2a2a.probe_state.v1",
            "probe_id": PROBE_ID,
            "updated_at": now_iso(),
            "processed": sorted(processed),
        },
    )


def write_agent_state(agent: str, scan_all: bool, receipts: list[dict[str, Any]]) -> None:
    state_path = STATE_ROOT / f"{agent}.json"
    existing = {}
    if state_path.exists():
        try:
            existing = load_json(state_path)
        except json.JSONDecodeError:
            existing = {}
    previous_receipts = existing.get("receipts", []) if isinstance(existing.get("receipts"), list) else []
    next_receipts = previous_receipts + [
        str((RECEIPT_ROOT / f"{receipt['receipt_id']}.json").relative_to(REPO_ROOT)) for receipt in receipts
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
            "schema": "ghostclaw.a2a2a.probe_runtime_state.v1",
            "agent": agent,
            "probe_only": True,
            "local_worker": False,
            "scan_all": scan_all,
            "updated_at": now_iso(),
            "processed_count": processed_count,
            "receipts": sorted(set(next_receipts)),
            "receipt_count": len(set(next_receipts)),
        },
    )


def is_task_envelope(data: Any) -> bool:
    if not isinstance(data, dict):
        return False
    if data.get("schema") == "ghostclaw.a2a2a.task.v1":
        return True
    required_flags = ["requires_ack", "requires_receipt", "dangerous_actions_allowed"]
    return all(flag in data for flag in required_flags)


def make_receipt(path: Path, data: dict[str, Any], raw: bytes) -> dict[str, Any]:
    source = str(data.get("source") or data.get("from") or "unknown")
    target = str(data.get("target") or path.parent.name)
    created_at = str(data.get("created_at") or "unknown")
    packet_id = str(data.get("id") or data.get("packet_id") or path.stem)

    return {
        "schema": "ghostclaw.a2a2a.ack_receipt.v1",
        "status": "acknowledged_probe_only",
        "probe_only": True,
        "receipt_id": f"ack_{target}_{packet_id}",
        "packet_id": packet_id,
        "packet_path": str(path.relative_to(REPO_ROOT)),
        "packet_sha256": hashlib.sha256(raw).hexdigest(),
        "source": source,
        "target": target,
        "packet_created_at": created_at,
        "acknowledged_at": now_iso(),
        "acknowledged_by": PROBE_ID,
        "execution": {
            "payload_executed": False,
            "paid_model_calls": False,
            "secret_access": False,
            "cloud_mutation": False,
            "external_message_send": False,
            "package_install": False,
            "git_push": False,
            "deploy": False,
        },
        "safety": {
            "dangerous_actions_allowed": bool(data.get("dangerous_actions_allowed", False)),
            "secret_access_allowed": bool(data.get("secret_access_allowed", False)),
            "paid_model_calls_allowed": bool(data.get("paid_model_calls_allowed", False)),
        },
        "note": "Probe acknowledged file-bus packet only; no real agent intelligence or install execution occurred.",
    }


def scan_once(agent: str, scan_all: bool) -> list[dict[str, Any]]:
    processed = load_processed()
    receipts: list[dict[str, Any]] = []

    if not INBOX_ROOT.exists():
        return receipts

    pattern = "*/*.json" if scan_all else f"{agent}/*.json"
    for path in sorted(INBOX_ROOT.glob(pattern)):
        raw = path.read_bytes()
        key = fingerprint(path, raw)
        if key in processed:
            continue
        try:
            data = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as exc:
            append_log(
                {
                    "timestamp": now_iso(),
                    "event": "invalid_json_skipped",
                    "packet_path": str(path.relative_to(REPO_ROOT)),
                    "error": str(exc),
                }
            )
            processed.add(key)
            continue

        if not is_task_envelope(data):
            append_log(
                {
                    "timestamp": now_iso(),
                    "event": "non_task_skipped",
                    "packet_path": str(path.relative_to(REPO_ROOT)),
                }
            )
            processed.add(key)
            continue

        receipt = make_receipt(path, data, raw)
        receipt_path = RECEIPT_ROOT / f"{receipt['receipt_id']}.json"
        write_json(receipt_path, receipt)
        append_log(
            {
                "timestamp": now_iso(),
                "event": "ack_receipt_written",
                "packet_path": str(path.relative_to(REPO_ROOT)),
                "receipt_path": str(receipt_path.relative_to(REPO_ROOT)),
                "probe_only": True,
            }
        )
        processed.add(key)
        receipts.append(receipt)

    save_processed(processed)
    return receipts


def main() -> int:
    parser = argparse.ArgumentParser(description="Probe-only GhostClaw A2A sync runner.")
    parser.add_argument("--root", default=None, help="repo root; accepted for compatibility with existing tmux sessions")
    parser.add_argument("--agent", default="a2a-sync", help="agent mailbox to scan when --scan-all is not set")
    parser.add_argument("--scan-all", action="store_true", help="scan every inbox mailbox")
    parser.add_argument("--once", action="store_true", help="run once and exit; compatibility alias for default mode")
    parser.add_argument("--loop", action="store_true", help="keep scanning until stopped")
    parser.add_argument("--interval", type=float, default=2.0, help="loop interval in seconds")
    parser.add_argument("--max-iterations", type=int, default=0, help="stop after N loop iterations; 0 means forever")
    args = parser.parse_args()
    configure_paths(args.root, args.agent)

    ensure_runtime_dirs()

    append_log(
        {
            "timestamp": now_iso(),
            "event": "probe_started",
            "probe_id": PROBE_ID,
            "agent": args.agent,
            "scan_all": args.scan_all,
            "loop": args.loop,
            "interval": args.interval,
            "pid": os.getpid(),
        }
    )

    iterations = 0
    while True:
        receipts = scan_once(args.agent, args.scan_all)
        write_agent_state(args.agent, args.scan_all, receipts)
        summary = {
            "agent": args.agent,
            "parse_errors": 0,
            "probe_only": True,
            "receipts": [receipt["receipt_id"] for receipt in receipts],
            "scan_all": args.scan_all,
            "scanned_packets": len(receipts),
            "timestamp": now_iso(),
        }
        if not args.loop:
            print(json.dumps(summary, indent=2, ensure_ascii=False))
            return 0
        iterations += 1
        if args.max_iterations and iterations >= args.max_iterations:
            summary["iterations"] = iterations
            print(json.dumps(summary, indent=2, ensure_ascii=False))
            return 0
        print(json.dumps(summary, ensure_ascii=False), flush=True)
        time.sleep(args.interval)


if __name__ == "__main__":
    raise SystemExit(main())
