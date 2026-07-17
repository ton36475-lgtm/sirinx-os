#!/usr/bin/env python3
"""A2A Async Bridge — routes inbox packets to opencode, claude-code, codex CLI.

Monitors _A2A_QUEUE/inbox/ and dispatches to the appropriate tool based on
the `to.agent` field in the A2A2A message envelope.

Agent routing:
  codex-captain     → codex
  claude-architect  → claude (--dangerously-skip-permissions)
  opencode-reviewer → opencode
  hermes-commander  → Hermes TUI (hermes)
  opus-architect    → claude (read-only)
  deepseek-worker   → opencode
  kob-validator     → local validation (no CLI)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import shlex
import signal
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("a2a-bridge")

QUEUE_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = QUEUE_ROOT.parent

AGENT_TO_CLI: dict[str, str] = {
    "codex-captain": "codex",
    "codex": "codex",
    "claude-architect": "claude",
    "claude": "claude",
    "opencode-reviewer": "opencode",
    "opencode": "opencode",
    "copilot-agent": "copilot",
    "copilot": "copilot",
    "cline-agent": "cline",
    "cline": "cline",
    "hermes-commander": "hermes",
    "hermes": "hermes",
    "opus-architect": "claude",
    "deepseek-worker": "opencode",
    "glm-worker": "kimi",
    "manus-agent": "opencode",
    "line-operator-mcp": "opencode",
}

CLI_FLAGS: dict[str, list[str]] = {
    # Codex Rust CLI: use exec subcommand for non-interactive, sandbox=workspace-write
    "codex": ["exec", "-s", "workspace-write"],
    "claude": ["--dangerously-skip-permissions"],
    "opencode": [],
    "copilot": [],
    "cline": [],
    "hermes": [],
    "kimi": [],
}


def stable_hash(value: dict[str, Any]) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(payload).hexdigest()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_receipt(msg: dict[str, Any], status: str, reason: str) -> dict[str, Any]:
    receipt = {
        "schema": "a2a-bridge.receipt.v1",
        "decision_id": str(uuid.uuid4()),
        "correlation_id": msg.get("correlation_id", "unknown"),
        "mission_id": msg.get("mission_id", "unknown"),
        "requester_agent": msg.get("from", {}).get("agent", "unknown"),
        "approver_agent": msg.get("to", {}).get("agent", "unknown"),
        "action_class": "EXECUTE",
        "final_tier": "B",
        "decision_status": status,
        "reason": reason,
        "evidence_pack": {"goal": msg.get("context", {}).get("goal", "")},
        "timestamp": now_iso(),
        "checksums": {},
    }
    receipt["checksums"]["receipt_hash"] = stable_hash(receipt)
    return receipt


def find_cli(cli_name: str) -> str | None:
    candidates = [
        cli_name,
        f"/Users/sirinx/.local/bin/{cli_name}",
    ]
    # Search PATH for the tool (skip cmux shim dirs)
    path_dirs = os.environ.get("PATH", "").split(":")
    for d in path_dirs:
        if "cmux-cli-shims" in d:
            continue
        p = os.path.join(d, cli_name)
        if os.access(p, os.X_OK):
            candidates.append(p)
    for candidate in candidates:
        if candidate and os.access(candidate, os.X_OK):
            return candidate
    # Try via `which`
    import shutil
    return shutil.which(cli_name)


def cli_prompt_flags(cli: str, prompt: str) -> list[str]:
    """Build CLI invocation args for each tool."""
    if cli == "hermes":
        # Hermes: hermes chat -q "prompt"
        return ["chat", "-q", prompt]
    elif cli == "codex":
        # Codex (Rust): codex exec -s workspace-write "prompt"
        # (exec subcommand already in CLI_FLAGS, prompt is positional)
        return [prompt]
    elif cli in ("claude", "claude-code"):
        # Claude Code: claude -p "prompt"
        return ["-p", prompt]
    elif cli == "opencode":
        # OpenCode: opencode -p "prompt"
        return ["-p", prompt]
    else:
        return [prompt]

def run_cli(cli: str, prompt: str, workdir: str | None = None) -> tuple[int, str, str]:
    cmd = [cli] + CLI_FLAGS.get(cli, []) + cli_prompt_flags(cli, prompt)
    log.info("Running: %s", shlex.join(cmd))
    try:
        r = subprocess.run(
            cmd,
            cwd=workdir or str(PROJECT_ROOT),
            capture_output=True,
            text=True,
            timeout=300,
        )
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "TIMEOUT after 300s"
    except FileNotFoundError:
        return -2, "", f"CLI not found: {cli}"
    except Exception as e:
        return -3, "", str(e)


def process_packet(packet_path: Path) -> dict[str, Any]:
    raw = packet_path.read_text("utf-8")
    try:
        packet = json.loads(raw)
    except json.JSONDecodeError as e:
        return {"error": f"invalid JSON: {e}", "packet": str(packet_path)}

    msg = packet.get("a2a2a_message", packet)
    to_agent = msg.get("to", {}).get("agent", "")
    goal = msg.get("context", {}).get("goal", "")
    mission_id = msg.get("mission_id", "unknown")
    correlation_id = msg.get("correlation_id", "unknown")

    if not goal:
        return {"error": "no goal in message", "packet": str(packet_path), "correlation_id": correlation_id}

    cli_name = AGENT_TO_CLI.get(to_agent)
    if not cli_name:
        log.warning("No CLI mapped for agent=%s, skipping", to_agent)
        return {
            "skipped": True,
            "reason": f"no CLI mapped for agent={to_agent}",
            "correlation_id": correlation_id,
        }

    cli_path = find_cli(cli_name)
    if not cli_path:
        return {"error": f"CLI not found: {cli_name}", "correlation_id": correlation_id}

    lane = msg.get("context", {}).get("lane", "")
    workdir = str(PROJECT_ROOT / lane) if lane and (PROJECT_ROOT / lane).exists() else None

    log.info("Dispatching agent=%s → cli=%s | mission=%s | goal=%.60s", to_agent, cli_name, mission_id, goal)

    rc, stdout, stderr = run_cli(cli_path, goal, workdir)

    receipt = build_receipt(msg, "completed" if rc == 0 else "failed", stderr[:500] if stderr else "")
    result = {
        "mission_id": mission_id,
        "correlation_id": correlation_id,
        "agent_dispatched": cli_name,
        "return_code": rc,
        "stdout_truncated": stdout[:2000],
        "stderr_truncated": stderr[:1000],
        "receipt": receipt,
        "processed_at": now_iso(),
    }

    status_dir = "done" if rc == 0 else "blocked"
    out_path = QUEUE_ROOT / status_dir / f"bridge_{correlation_id}_{uuid.uuid4().hex[:8]}.json"
    out_path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")

    return result


def watch_loop(interval: float = 5.0, once: bool = False) -> None:
    inbox = QUEUE_ROOT / "inbox"
    processed: set[str] = set()

    log.info("A2A Bridge watching %s (interval=%ss)", inbox, interval)
    log.info("Agent→CLI mappings:")
    for agent, cli in sorted(AGENT_TO_CLI.items()):
        log.info("  %-22s → %s", agent, cli)

    try:
        while True:
            if not inbox.exists():
                log.warning("inbox dir not found: %s", inbox)
                if once:
                    break
                time.sleep(interval)
                continue

            for f in sorted(inbox.iterdir()):
                if not f.name.endswith(".json") or f.name in processed:
                    continue
                processed.add(f.name)
                log.info("Processing: %s", f.name)
                result = process_packet(f)
                if "error" in result:
                    log.error("Error: %s", result["error"])

            if once:
                break
            time.sleep(interval)
    except KeyboardInterrupt:
        log.info("Shutdown")


def health_check() -> dict[str, Any]:
    cli_status = {}
    for agent, cli in sorted(set(AGENT_TO_CLI.items())):
        path = find_cli(cli)
        cli_status[cli] = {
            "found": path is not None,
            "path": path,
        }

    queue_dirs = {d.name: len(list(d.iterdir())) for d in QUEUE_ROOT.iterdir() if d.is_dir()}

    return {
        "status": "ok",
        "queue_root": str(QUEUE_ROOT),
        "project_root": str(PROJECT_ROOT),
        "cli_tools": cli_status,
        "queue_counts": queue_dirs,
        "timestamp": now_iso(),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="A2A Async Bridge — routes tasks to opencode/claude/codex")
    parser.add_argument("--watch", "-w", action="store_true", help="Watch inbox continuously")
    parser.add_argument("--once", action="store_true", help="Process existing inbox packets once")
    parser.add_argument("--interval", type=float, default=5.0, help="Poll interval (default: 5s)")
    parser.add_argument("--health", action="store_true", help="Print health check")
    parser.add_argument("--process", type=str, help="Process a specific packet file")

    args = parser.parse_args()

    if args.health:
        print(json.dumps(health_check(), indent=2))
        return 0

    if args.process:
        result = process_packet(Path(args.process))
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0 if result.get("return_code") == 0 else 1

    if args.watch or args.once:
        watch_loop(interval=args.interval, once=args.once)
        return 0

    parser.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
