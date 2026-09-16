#!/usr/bin/env python3
"""Local-only GhostClaw A2A sidebar sidecar.

This runner proves the file-bus contract without LLM inference. It routes task
packets from outbox to inbox, acknowledges inbox packets, starts probe-only
sidebar sessions, and writes receipts. It never executes packet payloads, reads
secrets, calls providers, installs packages, deploys, pushes, or mutates cloud
resources.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shlex
import shutil
import subprocess
import sys
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
GITHUB_INTAKE_ROOT = REPO_ROOT / ".ghostclaw_runtime" / "github_intake"

MODE = "probe_only_no_model"
SIDEBAR_TARGETS = (
    "hermes",
    "kob",
    "codex",
    "opus",
    "glm",
    "deepseek",
    "kimi",
    "browser",
    "vibe",
)
MAILBOXES = SIDEBAR_TARGETS + ("opencode", "glm52")
SESSION_NAMES = (
    "ghostclaw-a2a-sync",
    "ghostclaw-hermes-a2a",
    "ghostclaw-kob-a2a",
    "ghostclaw-codex-a2a",
    "ghostclaw-opus-a2a",
    "ghostclaw-glm-a2a",
    "ghostclaw-deepseek-a2a",
    "ghostclaw-kimi-a2a",
    "ghostclaw-browser-a2a",
    "ghostclaw-vibe-a2a",
)
RISK_PATTERNS = (
    "curl",
    "wget",
    "bash",
    "sudo",
    "rm -rf",
    "chmod +x",
    "eval",
    "base64",
    "launchctl",
    "crontab",
    "ssh",
    "token",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "GITHUB_TOKEN",
    "npm install -g",
    "pip install",
    "postinstall",
    "preinstall",
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def timestamp_slug() -> str:
    return now_iso().replace("-", "").replace(":", "").replace(".", "_").replace("Z", "Z")


def safe_id(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in value)


def configure_root(root: str | None) -> None:
    global REPO_ROOT, RUNTIME_ROOT, INBOX_ROOT, OUTBOX_ROOT, RECEIPT_ROOT, LOG_ROOT, STATE_ROOT, PID_ROOT, GITHUB_INTAKE_ROOT
    if root:
        candidate = Path(root).expanduser()
        if not candidate.is_absolute():
            candidate = (Path.cwd() / candidate).resolve()
        REPO_ROOT = candidate

    RUNTIME_ROOT = REPO_ROOT / ".ghostclaw_runtime" / "a2a2a"
    INBOX_ROOT = RUNTIME_ROOT / "inbox"
    OUTBOX_ROOT = RUNTIME_ROOT / "outbox"
    RECEIPT_ROOT = RUNTIME_ROOT / "receipts"
    LOG_ROOT = RUNTIME_ROOT / "logs"
    STATE_ROOT = RUNTIME_ROOT / "state"
    PID_ROOT = RUNTIME_ROOT / "pids"
    GITHUB_INTAKE_ROOT = REPO_ROOT / ".ghostclaw_runtime" / "github_intake"


def ensure_runtime_dirs() -> None:
    for root in (INBOX_ROOT, OUTBOX_ROOT):
        for name in MAILBOXES:
            (root / name).mkdir(parents=True, exist_ok=True)
    for root in (RECEIPT_ROOT, LOG_ROOT, STATE_ROOT, PID_ROOT, GITHUB_INTAKE_ROOT):
        root.mkdir(parents=True, exist_ok=True)


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def append_jsonl(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False) + "\n")


def append_log(agent: str, event: dict[str, Any]) -> None:
    event = {"timestamp": now_iso(), "mode": MODE, **event}
    append_jsonl(LOG_ROOT / "a2a-sync.log", event)
    append_jsonl(LOG_ROOT / f"{safe_id(agent)}-a2a.log", event)


def sha256_bytes(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def file_fingerprint(path: Path) -> str:
    raw = path.read_bytes()
    return f"{path.relative_to(REPO_ROOT)}:{sha256_bytes(raw)}"


def state_path(agent: str) -> Path:
    return STATE_ROOT / f"sidecar-processed-{safe_id(agent)}.json"


def load_processed(agent: str) -> set[str]:
    path = state_path(agent)
    if not path.exists():
        return set()
    try:
        data = read_json(path)
    except json.JSONDecodeError:
        return set()
    return set(data.get("processed", []))


def save_processed(agent: str, processed: set[str]) -> None:
    write_json(
        state_path(agent),
        {
            "schema": "ghostclaw.a2a2a.sidecar_state.v1",
            "agent": agent,
            "mode": MODE,
            "updated_at": now_iso(),
            "processed": sorted(processed),
        },
    )


def is_task_packet(data: Any) -> bool:
    if not isinstance(data, dict):
        return False
    if data.get("schema") == "ghostclaw.a2a2a.task.v1":
        return True
    return bool(data.get("requires_ack") or data.get("requires_receipt"))


def packet_id(path: Path, data: dict[str, Any]) -> str:
    return str(data.get("id") or data.get("packet_id") or data.get("task_id") or path.stem)


def packet_target(path: Path, data: dict[str, Any]) -> str:
    target = str(data.get("target") or data.get("to") or path.parent.name)
    return safe_id(target.lower())


def packet_source(data: dict[str, Any]) -> str:
    return safe_id(str(data.get("source") or data.get("from") or "unknown").lower())


def route_outbox_once(agent: str, scan_all: bool) -> list[dict[str, Any]]:
    processed = load_processed(f"{agent}-route")
    routed: list[dict[str, Any]] = []
    pattern = "*/*.json" if scan_all else f"{agent}/*.json"
    for path in sorted(OUTBOX_ROOT.glob(pattern)):
        key = file_fingerprint(path)
        if key in processed:
            continue
        raw = path.read_bytes()
        try:
            data = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as exc:
            append_log(agent, {"event": "route_invalid_json_skipped", "path": str(path.relative_to(REPO_ROOT)), "error": str(exc)})
            processed.add(key)
            continue
        if not isinstance(data, dict):
            append_log(agent, {"event": "route_non_object_skipped", "path": str(path.relative_to(REPO_ROOT))})
            processed.add(key)
            continue
        target = packet_target(path, data)
        if target not in MAILBOXES:
            append_log(agent, {"event": "route_unknown_target_skipped", "path": str(path.relative_to(REPO_ROOT)), "target": target})
            processed.add(key)
            continue
        destination = INBOX_ROOT / target / path.name
        if not destination.exists():
            destination.write_bytes(raw)
        receipt = {
            "schema": "ghostclaw.a2a2a.route_receipt.v1",
            "status": "routed_probe_only",
            "mode": MODE,
            "packet_id": packet_id(path, data),
            "source": packet_source(data),
            "target": target,
            "outbox_path": str(path.relative_to(REPO_ROOT)),
            "inbox_path": str(destination.relative_to(REPO_ROOT)),
            "packet_sha256": sha256_bytes(raw),
            "routed_at": now_iso(),
            "execution": safe_execution_flags(),
        }
        routed.append(receipt)
        write_json(RECEIPT_ROOT / f"route_{target}_{safe_id(receipt['packet_id'])}_{sha256_bytes(raw)[:12]}.json", receipt)
        append_log(agent, {"event": "packet_routed", "outbox": receipt["outbox_path"], "inbox": receipt["inbox_path"]})
        processed.add(key)
    save_processed(f"{agent}-route", processed)
    return routed


def safe_execution_flags() -> dict[str, bool]:
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


def ack_inbox_once(agent: str, scan_all: bool) -> list[dict[str, Any]]:
    processed = load_processed(f"{agent}-ack")
    receipts: list[dict[str, Any]] = []
    pattern = "*/*.json" if scan_all else f"{agent}/*.json"
    for path in sorted(INBOX_ROOT.glob(pattern)):
        key = file_fingerprint(path)
        if key in processed:
            continue
        raw = path.read_bytes()
        try:
            data = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as exc:
            append_log(agent, {"event": "ack_invalid_json_skipped", "path": str(path.relative_to(REPO_ROOT)), "error": str(exc)})
            processed.add(key)
            continue
        if not is_task_packet(data):
            append_log(agent, {"event": "ack_non_task_skipped", "path": str(path.relative_to(REPO_ROOT))})
            processed.add(key)
            continue
        target = packet_target(path, data)
        source = packet_source(data)
        pid = packet_id(path, data)
        receipt = {
            "schema": "ghostclaw.a2a2a.ack_receipt.v1",
            "status": "acknowledged_probe_only",
            "mode": MODE,
            "probe_only": True,
            "ack_agent": path.parent.name,
            "receipt_id": f"ack_{path.parent.name}_{safe_id(pid)}",
            "packet_id": pid,
            "packet_path": str(path.relative_to(REPO_ROOT)),
            "packet_sha256": sha256_bytes(raw),
            "packet_source": source,
            "packet_target": target,
            "requires_ack": bool(data.get("requires_ack", True)),
            "requires_receipt": bool(data.get("requires_receipt", True)),
            "payload_executed": False,
            "paid_model_calls_executed": False,
            "secret_access_executed": False,
            "acknowledged_at": now_iso(),
            "execution": safe_execution_flags(),
            "safety": {
                "dangerous_actions_allowed": bool(data.get("dangerous_actions_allowed", False)),
                "secret_access_allowed": bool(data.get("secret_access_allowed", False)),
                "paid_model_calls_allowed": bool(data.get("paid_model_calls_allowed", False)),
            },
            "note": "A2A packet acknowledged only. No model inference, command execution, install, secret read, deploy, push, or external send occurred.",
        }
        receipt_file = RECEIPT_ROOT / f"{receipt['receipt_id']}_{sha256_bytes(raw)[:12]}.json"
        write_json(receipt_file, receipt)
        append_log(path.parent.name, {"event": "ack_receipt_written", "packet": receipt["packet_path"], "receipt": str(receipt_file.relative_to(REPO_ROOT))})
        processed.add(key)
        receipts.append(receipt)
    save_processed(f"{agent}-ack", processed)
    return receipts


def send_smoke_packets() -> list[str]:
    created: list[str] = []
    stamp = timestamp_slug()
    for target in SIDEBAR_TARGETS:
        packet = {
            "schema": "ghostclaw.a2a2a.task.v1",
            "mission": "a2a_sync_smoke_test",
            "source": "codex",
            "target": target,
            "task_id": f"smoke_codex_to_{target}_{stamp}",
            "created_at": now_iso(),
            "requires_ack": True,
            "requires_receipt": True,
            "dangerous_actions_allowed": False,
            "secret_access_allowed": False,
            "paid_model_calls_allowed": False,
            "payload": {
                "message": "ping",
                "expected_behavior": "route packet and write ack receipt only",
            },
        }
        path = OUTBOX_ROOT / "codex" / f"{packet['task_id']}.json"
        write_json(path, packet)
        created.append(str(path.relative_to(REPO_ROOT)))
    append_log("codex", {"event": "smoke_packets_created", "count": len(created), "packets": created})
    return created


def git_status_short() -> list[str]:
    result = subprocess.run(["git", "status", "--short"], cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    return [line for line in result.stdout.splitlines() if line.strip()]


def tmux_available() -> bool:
    return shutil.which("tmux") is not None


def tmux_has_session(name: str) -> bool:
    if not tmux_available():
        return False
    result = subprocess.run(["tmux", "has-session", "-t", name], text=True, capture_output=True, check=False)
    return result.returncode == 0


def start_sidebar_sessions() -> list[dict[str, Any]]:
    sessions: list[dict[str, Any]] = []
    script = REPO_ROOT / "scripts" / "ghostclaw_a2a_sidecar.py"
    role_map = {
        "ghostclaw-a2a-sync": ("a2a-sync", True),
        "ghostclaw-hermes-a2a": ("hermes", False),
        "ghostclaw-kob-a2a": ("kob", False),
        "ghostclaw-codex-a2a": ("codex", False),
        "ghostclaw-opus-a2a": ("opus", False),
        "ghostclaw-glm-a2a": ("glm", False),
        "ghostclaw-deepseek-a2a": ("deepseek", False),
        "ghostclaw-kimi-a2a": ("kimi", False),
        "ghostclaw-browser-a2a": ("browser", False),
        "ghostclaw-vibe-a2a": ("vibe", False),
    }
    for session_name in SESSION_NAMES:
        agent, scan_all = role_map[session_name]
        log_path = LOG_ROOT / f"{safe_id(agent)}-a2a.log"
        command = [
            sys.executable,
            str(script),
            "--root",
            str(REPO_ROOT),
            "--agent",
            agent,
            "--loop",
            "--interval",
            "2",
        ]
        if scan_all:
            command.append("--scan-all")
        if tmux_available():
            if tmux_has_session(session_name):
                status = "already_running"
                session_live = True
            else:
                shell_command = f"exec {shlex.join(command)} >> {shlex.quote(str(log_path))} 2>&1"
                result = subprocess.run(
                    ["tmux", "new-session", "-d", "-s", session_name, "-c", str(REPO_ROOT), shell_command],
                    text=True,
                    capture_output=True,
                    check=False,
                )
                time.sleep(0.2)
                session_live = tmux_has_session(session_name)
                status = "started" if result.returncode == 0 and session_live else "failed_exited"
                if result.returncode != 0:
                    append_log(
                        agent,
                        {
                            "event": "session_start_failed",
                            "session": session_name,
                            "stderr_tail": result.stderr[-1000:],
                        },
                    )
            pid = f"tmux:{session_name}"
        else:
            output = log_path.open("a", encoding="utf-8")
            process = subprocess.Popen(command, cwd=REPO_ROOT, stdout=output, stderr=output, start_new_session=True)
            status = "started"
            session_live = process.poll() is None
            pid = f"pid:{process.pid}"
            write_json(PID_ROOT / f"{session_name}.json", {"session": session_name, "pid": process.pid, "agent": agent, "started_at": now_iso()})
        sessions.append(
            {
                "session": session_name,
                "agent": agent,
                "scan_all": scan_all,
                "status": status,
                "session_live": session_live,
                "pid_or_session": pid,
                "log": str(log_path.relative_to(REPO_ROOT)),
                "command": " ".join(command),
                "mode": MODE,
            }
        )
    append_log("a2a-sync", {"event": "sessions_start_requested", "sessions": sessions})
    return sessions


def run_once(agent: str, scan_all: bool) -> dict[str, Any]:
    routed = route_outbox_once(agent, scan_all)
    receipts = ack_inbox_once(agent, scan_all)
    return {
        "agent": agent,
        "scan_all": scan_all,
        "mode": MODE,
        "routed_packets": [item["inbox_path"] for item in routed],
        "ack_receipts": [item["receipt_id"] for item in receipts],
        "routed_count": len(routed),
        "ack_count": len(receipts),
        "timestamp": now_iso(),
    }


def clone_or_update_repo(url: str, name: str) -> dict[str, Any]:
    target = GITHUB_INTAKE_ROOT / name
    if target.exists():
        return {"name": name, "url": url, "path": str(target.relative_to(REPO_ROOT)), "clone_status": "already_exists"}
    result = subprocess.run(["git", "clone", "--depth", "1", url, str(target)], cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    return {
        "name": name,
        "url": url,
        "path": str(target.relative_to(REPO_ROOT)),
        "clone_status": "cloned" if result.returncode == 0 else "failed",
        "exit_code": result.returncode,
        "stderr_tail": result.stderr[-1000:],
    }


def scan_file_for_risks(path: Path) -> dict[str, Any]:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        return {"path": str(path.relative_to(REPO_ROOT)), "error": str(exc), "matches": []}
    lowered = text.lower()
    matches = [pattern for pattern in RISK_PATTERNS if pattern.lower() in lowered]
    return {
        "path": str(path.relative_to(REPO_ROOT)),
        "size_bytes": path.stat().st_size,
        "matches": matches,
    }


def audit_repo(name: str) -> dict[str, Any]:
    root = GITHUB_INTAKE_ROOT / name
    if not root.exists():
        return {"name": name, "status": "missing", "files": []}
    candidates: list[Path] = []
    for pattern in ("README*", "package.json", "*.sh", "*.py", "*.mjs", "*.js", "install*", "scripts/*"):
        candidates.extend(path for path in root.glob(pattern) if path.is_file())
    unique = sorted(set(candidates))
    files = [scan_file_for_risks(path) for path in unique[:120]]
    return {
        "name": name,
        "status": "audited",
        "path": str(root.relative_to(REPO_ROOT)),
        "files_scanned": len(files),
        "risk_hits": [item for item in files if item.get("matches")],
        "files": files,
        "install_executed": False,
    }


def github_intake() -> dict[str, Any]:
    repos = [
        ("oh-my-opencode-lite", "https://github.com/Yeachan-Heo/oh-my-opencode-lite"),
        ("Agent-Blackbox", "https://github.com/Yeachan-Heo/Agent-Blackbox"),
    ]
    clones = [clone_or_update_repo(url, name) for name, url in repos]
    audits = [audit_repo(name) for name, _url in repos]
    report = {
        "schema": "ghostclaw.github_intake.v1",
        "created_at": now_iso(),
        "mode": "intake_only_no_install",
        "intake_root": str(GITHUB_INTAKE_ROOT.relative_to(REPO_ROOT)),
        "repos": clones,
        "audits": audits,
        "blocked_actions": [
            "install",
            "npm install",
            "npm install -g",
            "npx execution",
            "curl pipe bash",
            "chmod random binaries",
            "provider calls",
            "secret reads",
        ],
    }
    path = RECEIPT_ROOT / f"github_intake_{timestamp_slug()}.json"
    write_json(path, report)
    append_log("a2a-sync", {"event": "github_intake_written", "receipt": str(path.relative_to(REPO_ROOT))})
    report["receipt_path"] = str(path.relative_to(REPO_ROOT))
    return report


def latest_paths(glob_pattern: str) -> list[str]:
    return [str(path.relative_to(REPO_ROOT)) for path in sorted(RECEIPT_ROOT.glob(glob_pattern))]


def write_final_receipt(
    git_dirty_before: bool,
    sessions: list[dict[str, Any]],
    smoke_packets: list[str],
    scan_summary: dict[str, Any],
    intake_report: dict[str, Any] | None,
) -> dict[str, Any]:
    ack_receipts = latest_paths("ack_*.json")
    smoke_ids = {Path(path).stem for path in smoke_packets}
    smoke_ack_receipts = [
        path for path in ack_receipts if any(smoke_id in Path(path).stem for smoke_id in smoke_ids)
    ]
    all_smoke_acked = bool(smoke_packets) and len(smoke_ack_receipts) >= len(smoke_packets)
    sidebars_online = [item["session"] for item in sessions if item.get("session_live")]
    all_sidebars_online = len(sidebars_online) == len(SESSION_NAMES)
    status = "partial"
    if all_smoke_acked and all_sidebars_online:
        status = "pass"
    if not smoke_ack_receipts:
        status = "blocked"
    receipt = {
        "schema": "ghostclaw.a2a2a.sidebars_start_receipt.v1",
        "mission": "ghostclaw_a2a_sidebars_start",
        "status": status,
        "mode": MODE,
        "repo": str(REPO_ROOT),
        "created_at": now_iso(),
        "git_dirty_before": git_dirty_before,
        "git_dirty_after": bool(git_status_short()),
        "sessions_started": sessions,
        "packets_sent": smoke_packets,
        "acks_received": ack_receipts,
        "smoke_ack_receipts": smoke_ack_receipts,
        "smoke_ack_count": len(smoke_ack_receipts),
        "sidebars_discovered": list(SIDEBAR_TARGETS),
        "sidebars_online": sidebars_online,
        "sidebars_online_count": len(sidebars_online),
        "model_blockers": [
            "kimi-k2.7-code via opencode-go: blocked by HTTP 401 insufficient balance",
            "local llama3.2:3b via 127.0.0.1:11434/v1: blocked because endpoint connection failed",
            "A2A receipt sync continues in no-model mode",
        ],
        "github_intake_status": "intake_only" if intake_report else "not_started",
        "github_intake_receipt": intake_report.get("receipt_path") if intake_report else None,
        "blocked_actions": [
            "paid model calls",
            "secret printing",
            "provider calls",
            "external installs",
            "deploy",
            "push",
            "cloud mutation",
            "packet payload execution",
        ],
        "known_limitations": [
            "Sidebars are probe-only file-bus sessions, not proof of real model intelligence.",
            "Receipts prove queue, route, ack, and status behavior only.",
            "Model configuration remains blocked until provider auth/billing and local endpoint are fixed.",
        ],
        "next_safe_action": [
            "Review final receipt and intake report.",
            "Map oh-my-opencode model aliases to Hermes/Codex after no-model A2A receipt flow is accepted.",
            "Run model smoke tests only after explicit provider/local endpoint gate is reopened.",
        ],
        "scan_summary": scan_summary,
        "truthfulness": {
            "provider_call_executed": False,
            "secret_read_executed": False,
            "install_executed": False,
            "deploy_executed": False,
            "push_executed": False,
        },
    }
    path = RECEIPT_ROOT / f"a2a_sidebars_start_{timestamp_slug()}.json"
    write_json(path, receipt)
    append_log("a2a-sync", {"event": "final_sidebars_receipt_written", "receipt": str(path.relative_to(REPO_ROOT)), "status": status})
    receipt["receipt_path"] = str(path.relative_to(REPO_ROOT))
    return receipt


def recover_now(run_github_intake: bool) -> dict[str, Any]:
    ensure_runtime_dirs()
    git_dirty_before = bool(git_status_short())
    sessions = start_sidebar_sessions()
    smoke_packets = send_smoke_packets()
    scan_summary = run_once("a2a-sync", True)
    intake_report = github_intake() if run_github_intake else None
    if intake_report:
        run_once("a2a-sync", True)
    return write_final_receipt(git_dirty_before, sessions, smoke_packets, scan_summary, intake_report)


def main() -> int:
    parser = argparse.ArgumentParser(description="Local-only GhostClaw A2A sidebar sidecar.")
    parser.add_argument("--root", default=None)
    parser.add_argument("--agent", default="a2a-sync")
    parser.add_argument("--scan-all", action="store_true")
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--loop", action="store_true")
    parser.add_argument("--interval", type=float, default=2.0)
    parser.add_argument("--max-iterations", type=int, default=0)
    parser.add_argument("--send-smoke", action="store_true")
    parser.add_argument("--start-sessions", action="store_true")
    parser.add_argument("--github-intake", action="store_true")
    parser.add_argument("--recover-now", action="store_true")
    args = parser.parse_args()

    configure_root(args.root)
    ensure_runtime_dirs()

    if args.recover_now:
        result = recover_now(run_github_intake=args.github_intake)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0

    output: dict[str, Any] = {"mode": MODE, "timestamp": now_iso(), "agent": args.agent}
    if args.start_sessions:
        output["sessions"] = start_sidebar_sessions()
    if args.send_smoke:
        output["smoke_packets"] = send_smoke_packets()
    if args.github_intake:
        output["github_intake"] = github_intake()

    iterations = 0
    while True:
        output["scan"] = run_once(args.agent, args.scan_all)
        if not args.loop:
            print(json.dumps(output, indent=2, ensure_ascii=False))
            return 0
        iterations += 1
        if args.max_iterations and iterations >= args.max_iterations:
            output["iterations"] = iterations
            print(json.dumps(output, indent=2, ensure_ascii=False))
            return 0
        print(json.dumps(output["scan"], ensure_ascii=False), flush=True)
        time.sleep(args.interval)


if __name__ == "__main__":
    raise SystemExit(main())
