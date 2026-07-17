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


# ─── Safety Gates (TypeScript broker equivalent) ───

# Hard-deny patterns — never execute
FORBIDDEN_PATTERNS = [
    r"\.env\b", r"AUTH|TOKEN|SECRET|PASSWORD|API_KEY", r"credentials?",
    r"rm\s+-rf\s+/", r"git\s+push\s+--force", r"mkfs",
    r"DROP\s+TABLE|DELETE\s+FROM", r"eval\s*\(|exec\s*\(",
    r"curl.*\|\s*(bash|sh|python)", r"wget.*\|\s*(bash|sh)",
]

# Tier C actions — require human approval
TIER_C_KEYWORDS = [
    "deploy", "push", "release", "publish", "cloudflare",
    "customer", "send.*message", "external.*api", "payment"
]

import re as _re
def safety_scan(prompt: str, cli: str) -> dict:
    """Evaluate command before dispatch. Returns {allowed, tier, reason}."""
    prompt_lower = prompt.lower()

    # Check forbidden patterns
    for pattern in FORBIDDEN_PATTERNS:
        if _re.search(pattern, prompt, _re.IGNORECASE):
            return {"allowed": False, "tier": "X", "reason": f"FORBIDDEN pattern matched: {pattern}"}

    # Check Tier C (requires approval)
    for kw in TIER_C_KEYWORDS:
        if _re.search(kw, prompt_lower):
            return {"allowed": False, "tier": "C", "reason": f"Tier C action detected: {kw}"}

    # Determine tier
    tier = "A"
    if any(w in prompt_lower for w in ["write", "create", "modify", "edit", "fix", "build"]):
        tier = "B"

    return {"allowed": True, "tier": tier, "reason": "safe"}

def mask_secrets(text: str) -> str:
    """Redact secrets from output before logging"""
    patterns = [
        (r"(?i)(api[_-]?key|token|secret|password)\s*[=:]\s*\S+", r"\1=***REDACTED***"),
        (r"(?i)(sk-[a-zA-Z0-9]{20,})", r"sk-***REDACTED***"),
        (r"(?i)(Bearer\s+[a-zA-Z0-9\-._~+\/]+)", r"Bearer ***REDACTED***"),
        (r"(?i)(ghp_[a-zA-Z0-9]{36})", r"ghp_***REDACTED***"),
        (r"(?i)(AKIA[A-Z0-9]{16})", r"AKIA***REDACTED***"),
    ]
    for pattern, replacement in patterns:
        text = _re.sub(pattern, replacement, text)
    return text


def cli_prompt_flags(cli: str, prompt: str) -> list[str]:
    """Build CLI invocation args for each tool."""
    if cli == "hermes":
        return ["chat", "-q", prompt]
    elif cli == "codex":
        return [prompt]
    elif cli in ("claude", "claude-code"):
        return ["-p", prompt]
    elif cli == "opencode":
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

    # ─── Safety Gate: scan before dispatch ───
    gate = safety_scan(goal, cli_name)
    if not gate["allowed"]:
        log.warning("SAFETY GATE BLOCKED: tier=%s reason=%s", gate["tier"], gate["reason"])
        receipt = build_receipt(msg, "blocked", f"SAFETY: {gate['reason']}")
        result = {
            "mission_id": mission_id,
            "correlation_id": correlation_id,
            "agent_dispatched": cli_name,
            "return_code": -10,
            "safety_gate": gate,
            "receipt": receipt,
            "processed_at": now_iso(),
        }
        out_path = QUEUE_ROOT / "blocked" / f"bridge_{correlation_id}_{uuid.uuid4().hex[:8]}.json"
        out_path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
        return result

    lane = msg.get("context", {}).get("lane", "")
    workdir = str(PROJECT_ROOT / lane) if lane and (PROJECT_ROOT / lane).exists() else None

    log.info("Dispatching agent=%s → cli=%s | tier=%s | mission=%s | goal=%.60s", to_agent, cli_name, gate["tier"], mission_id, goal)

    rc, stdout, stderr = run_cli(cli_path, goal, workdir)

    # ─── Post-dispatch: mask secrets in output ───
    stdout_masked = mask_secrets(stdout[:2000])
    stderr_masked = mask_secrets(stderr[:1000])

    receipt = build_receipt(msg, "completed" if rc == 0 else "failed", stderr_masked[:500] if stderr_masked else "")
    result = {
        "mission_id": mission_id,
        "correlation_id": correlation_id,
        "agent_dispatched": cli_name,
        "safety_tier": gate["tier"],
        "return_code": rc,
        "stdout_truncated": stdout_masked,
        "stderr_truncated": stderr_masked,
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
