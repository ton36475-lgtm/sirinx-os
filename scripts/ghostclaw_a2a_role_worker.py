#!/usr/bin/env python3
"""Local Hermes/KOB role workers for the GhostClaw A2A file bus.

These workers are deterministic local entrypoints. They process JSON envelopes
from `.ghostclaw_runtime/a2a2a/inbox/<agent>/`, write role-specific receipts and
outbox records, and keep all external actions disabled. They do not execute
packet payloads, call models/providers, read secrets, install packages, deploy,
push, or send messages.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
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
PROCESSED_STATE = STATE_ROOT / "role-worker-processed.json"

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

BLOCKED_WORDS = re.compile(
    r"\b("
    r"deploy|push|publish|production|cloud|supabase|cloudflare|telegram|line|email|customer|"
    r"secret|token|api[_-]?key|cookie|install|postinstall|npx|bunx|npm\s+install|pnpm\s+install|"
    r"delete|rm\s+-rf|destructive"
    r")\b",
    re.IGNORECASE,
)


def configure_paths(root: str | None, agent: str) -> None:
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
    safe_agent = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in agent)
    PROCESSED_STATE = STATE_ROOT / f"role-worker-processed-{safe_agent}.json"


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


def append_log(agent: str, event: dict[str, Any]) -> None:
    LOG_ROOT.mkdir(parents=True, exist_ok=True)
    payload = {"timestamp": now_iso(), "agent": agent, **event}
    with (LOG_ROOT / f"{agent}.log").open("a", encoding="utf-8") as handle:
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


def save_processed(agent: str, processed: set[str]) -> None:
    write_json(
        PROCESSED_STATE,
        {
            "schema": "ghostclaw.a2a2a.role_worker_state.v1",
            "agent": agent,
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


def string_values(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        values: list[str] = []
        for item in value:
            values.extend(string_values(item))
        return values
    if isinstance(value, dict):
        values: list[str] = []
        for item in value.values():
            values.extend(string_values(item))
        return values
    return []


def packet_text(data: dict[str, Any]) -> str:
    parts = [
        str(data.get("mission", "")),
        str(data.get("source", "")),
        str(data.get("target", "")),
        str(data.get("action", "")),
        str(data.get("action_requested", "")),
        *string_values(data.get("payload")),
    ]
    return " ".join(parts)


def blocked_reasons(data: dict[str, Any]) -> list[str]:
    reasons: list[str] = []
    if data.get("dangerous_actions_allowed") is True:
        reasons.append("dangerous_actions_requested")
    if data.get("secret_access_allowed") is True:
        reasons.append("secret_access_requested")
    if data.get("paid_model_calls_allowed") is True:
        reasons.append("paid_model_call_requested")
    if data.get("external_writes_allowed") is True or data.get("externalWrites") is True:
        reasons.append("external_write_requested")
    if BLOCKED_WORDS.search(packet_text(data)):
        reasons.append("blocked_keyword_detected")
    return sorted(set(reasons))


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


def make_packet_context(path: Path, data: dict[str, Any], raw: bytes) -> dict[str, Any]:
    return {
        "packet_id": str(data.get("id") or data.get("packet_id") or path.stem),
        "packet_path": str(path.relative_to(REPO_ROOT)),
        "packet_sha256": hashlib.sha256(raw).hexdigest(),
        "source": str(data.get("source") or data.get("from") or "unknown"),
        "target": str(data.get("target") or path.parent.name),
        "mission": str(data.get("mission") or "unknown"),
        "packet_created_at": str(data.get("created_at") or "unknown"),
    }


def write_outbox_record(agent: str, packet: dict[str, Any], body: dict[str, Any]) -> str:
    outbox_path = OUTBOX_ROOT / agent / f"{safe_id(body['record_id'])}.json"
    write_json(outbox_path, body)
    return str(outbox_path.relative_to(REPO_ROOT))


def process_hermes(path: Path, data: dict[str, Any], raw: bytes) -> dict[str, Any]:
    context = make_packet_context(path, data, raw)
    reasons = blocked_reasons(data)
    route_status = "route_blocked_by_local_safety" if reasons else "routed_local_only"
    route_target = "kob" if not reasons else "codex"
    route_record = {
        "schema": "ghostclaw.a2a2a.hermes_route_record.v1",
        "record_id": f"hermes_route_{context['packet_id']}",
        "created_at": now_iso(),
        "source_packet": context,
        "route_status": route_status,
        "route_target": route_target,
        "commander": "hermes-local-role-worker",
        "memory_update": {
            "write_large_raw_log": False,
            "write_secret": False,
            "summary": "Local Hermes worker observed packet and wrote route evidence only.",
        },
        "blocked_reasons": reasons,
        "external_actions": common_execution_record(),
    }
    outbox_path = write_outbox_record("hermes", data, route_record)
    receipt_id = f"hermes_route_{context['packet_id']}"
    return {
        "schema": "ghostclaw.a2a2a.hermes_route_receipt.v1",
        "status": route_status,
        "local_worker": True,
        "probe_only": False,
        "receipt_id": receipt_id,
        "acknowledged_by": "hermes-local-role-worker",
        "acknowledged_at": now_iso(),
        **context,
        "route": {
            "target": route_target,
            "outbox_record": outbox_path,
            "blocked_reasons": reasons,
        },
        "execution": common_execution_record(),
        "note": "Hermes local role worker routed the packet as deterministic local evidence; no model/provider/tool execution occurred.",
    }


def process_kob(path: Path, data: dict[str, Any], raw: bytes) -> dict[str, Any]:
    context = make_packet_context(path, data, raw)
    reasons = blocked_reasons(data)
    verdict = "blocked" if reasons else "allow_local_ack_only"
    verdict_record = {
        "schema": "ghostclaw.a2a2a.kob_verdict_record.v1",
        "record_id": f"kob_verdict_{context['packet_id']}",
        "created_at": now_iso(),
        "source_packet": context,
        "verdict": verdict,
        "keeper": "kob-local-role-worker",
        "blocked_reasons": reasons,
        "allowed_actions": ["write_receipt", "write_outbox_record"] if not reasons else ["write_blocked_receipt"],
        "external_actions": common_execution_record(),
    }
    outbox_path = write_outbox_record("kob", data, verdict_record)
    receipt_id = f"kob_verdict_{context['packet_id']}"
    return {
        "schema": "ghostclaw.a2a2a.kob_verdict_receipt.v1",
        "status": f"kob_{verdict}",
        "local_worker": True,
        "probe_only": False,
        "receipt_id": receipt_id,
        "acknowledged_by": "kob-local-role-worker",
        "acknowledged_at": now_iso(),
        **context,
        "verdict": {
            "decision": verdict,
            "outbox_record": outbox_path,
            "blocked_reasons": reasons,
        },
        "execution": common_execution_record(),
        "note": "KOB local role worker evaluated safety flags and wrote deterministic local verdict evidence only.",
    }


def process_packet(agent: str, path: Path, data: dict[str, Any], raw: bytes) -> dict[str, Any]:
    if agent == "hermes":
        return process_hermes(path, data, raw)
    if agent == "kob":
        return process_kob(path, data, raw)
    raise ValueError(f"unsupported agent: {agent}")


def scan_once(agent: str, packet_paths: list[str] | None = None) -> list[dict[str, Any]]:
    processed = load_processed()
    receipts: list[dict[str, Any]] = []
    inbox = INBOX_ROOT / agent
    if not inbox.exists():
        return receipts

    if packet_paths:
        paths: list[Path] = []
        for packet_path in packet_paths:
            resolved = resolve_packet_path(packet_path)
            if not is_under(resolved, inbox.resolve()):
                append_log(agent, {"event": "packet_outside_agent_inbox_skipped", "packet_path": str(packet_path)})
                continue
            if not resolved.is_file():
                append_log(agent, {"event": "missing_packet_skipped", "packet_path": str(packet_path)})
                continue
            paths.append(resolved)
    else:
        paths = sorted(inbox.glob("*.json"))

    for path in sorted(paths):
        raw = path.read_bytes()
        key = fingerprint(path, raw)
        if key in processed:
            continue
        try:
            data = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as exc:
            append_log(agent, {"event": "invalid_json_skipped", "packet_path": str(path.relative_to(REPO_ROOT)), "error": str(exc)})
            processed.add(key)
            continue
        if not is_task_envelope(data):
            append_log(agent, {"event": "non_task_skipped", "packet_path": str(path.relative_to(REPO_ROOT))})
            processed.add(key)
            continue

        receipt = process_packet(agent, path, data, raw)
        receipt_path = RECEIPT_ROOT / f"{safe_id(receipt['receipt_id'])}.json"
        write_json(receipt_path, receipt)
        append_log(
            agent,
            {
                "event": "role_worker_receipt_written",
                "packet_path": str(path.relative_to(REPO_ROOT)),
                "receipt_path": str(receipt_path.relative_to(REPO_ROOT)),
                "local_worker": True,
                "probe_only": False,
                "status": receipt["status"],
            },
        )
        processed.add(key)
        receipts.append(receipt)

    save_processed(agent, processed)
    return receipts


def write_agent_state(agent: str, receipts: list[dict[str, Any]], loop: bool) -> None:
    existing = {}
    state_path = STATE_ROOT / f"{agent}.json"
    if state_path.exists():
        try:
            existing = load_json(state_path)
        except json.JSONDecodeError:
            existing = {}
    previous_receipts = existing.get("receipts", []) if isinstance(existing.get("receipts"), list) else []
    next_receipts = previous_receipts + [str((RECEIPT_ROOT / f"{safe_id(receipt['receipt_id'])}.json").relative_to(REPO_ROOT)) for receipt in receipts]
    write_json(
        state_path,
        {
            "schema": "ghostclaw.a2a2a.local_role_worker_state.v1",
            "agent": agent,
            "worker": f"{agent}-local-role-worker",
            "local_worker": True,
            "probe_only": False,
            "loop": loop,
            "pid": os.getpid(),
            "updated_at": now_iso(),
            "receipts": sorted(set(next_receipts)),
            "receipt_count": len(set(next_receipts)),
            "blocked_actions": list(common_execution_record().keys()),
        },
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Local Hermes/KOB role worker for GhostClaw A2A.")
    parser.add_argument("--root", default=None, help="repo root")
    parser.add_argument("--agent", required=True, choices=("hermes", "kob"), help="role worker to run")
    parser.add_argument("--packet", action="append", default=[], help="process only this inbox packet path; can be repeated")
    parser.add_argument("--once", action="store_true", help="run once and exit")
    parser.add_argument("--loop", action="store_true", help="keep scanning until stopped")
    parser.add_argument("--interval", type=float, default=2.0, help="loop interval in seconds")
    parser.add_argument("--max-iterations", type=int, default=0, help="stop after N loop iterations; 0 means forever")
    args = parser.parse_args()
    configure_paths(args.root, args.agent)
    ensure_runtime_dirs()

    append_log(
        args.agent,
        {
            "event": "role_worker_started",
            "pid": os.getpid(),
            "loop": args.loop,
            "interval": args.interval,
            "local_worker": True,
            "probe_only": False,
        },
    )

    iterations = 0
    while True:
        receipts = scan_once(args.agent, args.packet)
        write_agent_state(args.agent, receipts, args.loop)
        summary = {
            "agent": args.agent,
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
