#!/usr/bin/env python3
"""Verify GhostClaw A2A start entrypoints without launching agents.

The goal is to distinguish real local runners from docs, agent cards, dry-run
modules, manual-only launch gates, and probe fallbacks. This script is read-only
unless --write-receipt is passed, and it never starts Codex, Hermes, KOB, model
providers, MCP auth, package installs, or external services.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
RUNTIME_ROOT = REPO_ROOT / ".ghostclaw_runtime" / "a2a2a"
STATE_ROOT = RUNTIME_ROOT / "state"
RECEIPT_ROOT = RUNTIME_ROOT / "receipts"

BLOCKED_ACTIONS = (
    "codex_cli_launch",
    "paid_provider_model_call",
    "mcp_oauth_refresh",
    "secret_read_or_print",
    "package_install",
    "postinstall_execution",
    "global_plugin_write",
    "daemon_dashboard_launch",
    "deploy",
    "git_push",
    "cloud_mutation",
    "telegram_customer_live_send",
)

KNOWN_PATHS = {
    "hermes": (
        "services/hermes-api/src/inbox.mjs",
        "services/dev-control-api/src/hermes-agent-audit.mjs",
        "services/dev-control-api/src/agent-launch-gate.mjs",
        "GHOSTCLAW/agents/hermes-commander.md",
        ".hermes/agent-roles.md",
        ".claude/agents/hermes-project-planner.md",
        "scripts/ghostclaw_a2a_role_worker.py",
        "scripts/ghostclaw_a2a_sync_probe.py",
    ),
    "kob": (
        "GHOSTCLAW/agents/kob-validator.md",
        "_OBSIDIAN_GHOSTCLAW_BRAIN/06_KOB_VALIDATOR_DOCTRINE.md",
        "WORKSPACE_SCAFFOLD/scripts/validate_lane1_hermes_decision.py",
        "scripts/ghostclaw_a2a_role_worker.py",
        "scripts/ghostclaw_a2a_sync_probe.py",
    ),
    "a2a_sync": (
        "scripts/ghostclaw_a2a_bus_watcher.py",
        "GHOSTCLAW/a2a-hermes-codex-bridge/a2a-sync-runner.mjs",
        "WORKSPACE_SCAFFOLD/scripts/run_a2a_local_autopilot.py",
        "WORKSPACE_SCAFFOLD/scripts/queue_router.py",
        "scripts/ghostclaw_a2a_sync_probe.py",
    ),
}

STARTABLE_CLASSES = {"local_runner", "single_pass_sidecar"}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def configure_root(root: str | None) -> None:
    global REPO_ROOT, RUNTIME_ROOT, STATE_ROOT, RECEIPT_ROOT
    if root:
        candidate = Path(root).expanduser()
        if not candidate.is_absolute():
            candidate = (Path.cwd() / candidate).resolve()
        REPO_ROOT = candidate
    RUNTIME_ROOT = REPO_ROOT / ".ghostclaw_runtime" / "a2a2a"
    STATE_ROOT = RUNTIME_ROOT / "state"
    RECEIPT_ROOT = RUNTIME_ROOT / "receipts"


def read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def safe_read(path: Path, limit: int = 20000) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")[:limit]
    except FileNotFoundError:
        return ""


def load_package_scripts() -> dict[str, str]:
    data = read_json(REPO_ROOT / "package.json")
    if not isinstance(data, dict):
        return {}
    scripts = data.get("scripts")
    if not isinstance(scripts, dict):
        return {}
    return {str(name): str(command) for name, command in scripts.items()}


def classify_package_script(name: str, command: str) -> str:
    lowered = f"{name} {command}".lower()
    if any(token in lowered for token in ("test", "check", "dry-run", "audit", "status")):
        return "test_or_dry_run_script"
    if "deploy" in lowered or "wrangler deploy" in lowered:
        return "blocked_external_action"
    if any(token in lowered for token in ("dev", "start", "serve", "runner", "loop")):
        return "local_runner"
    return "ambiguous_script"


def classify_path(role: str, rel_path: str) -> dict[str, Any]:
    path = REPO_ROOT / rel_path
    exists = path.exists()
    text = safe_read(path)
    lowered = f"{rel_path}\n{text}".lower()

    classification = "missing"
    startable = False
    reason = "path does not exist"
    command_preview = None

    if exists:
        if rel_path.endswith(".md"):
            classification = "agent_card_or_doc"
            reason = "documentation or agent card, not a process entrypoint"
        elif "ghostclaw_a2a_role_worker" in rel_path:
            classification = "local_runner"
            startable = role in {"hermes", "kob"}
            reason = "deterministic local role worker that processes inbox packets and writes role-specific receipts"
            command_preview = f"python3 {rel_path} --root . --agent {role} --loop --interval 2"
        elif "ghostclaw_a2a_bus_watcher" in rel_path:
            classification = "local_runner"
            startable = role == "a2a_sync"
            reason = "deterministic local A2A sync loop that scans inbox mailboxes and writes bus ack receipts"
            command_preview = f"python3 {rel_path} --root . --loop --interval 2"
        elif "ghostclaw_a2a_sync_probe" in rel_path:
            classification = "probe_fallback"
            reason = "local mailbox ack worker only; marks receipts probe_only"
            command_preview = f"python3 {rel_path} --root . --agent {role} --loop --interval 2"
        elif rel_path.endswith("a2a-sync-runner.mjs"):
            classification = "single_pass_sidecar"
            startable = role == "a2a_sync"
            reason = "existing Codex Captain sidecar for _A2A_QUEUE; not a persistent all-mailbox loop by itself"
            command_preview = f"pnpm exec tsx {rel_path}"
        elif "launch-gate" in lowered:
            classification = "manual_only_launch_gate"
            reason = "explicitly records agent launches as manual-only and non-executable"
        elif "dry-run" in lowered or "dry_run" in lowered or "execution_disabled" in lowered:
            classification = "dry_run_module"
            reason = "policy/dry-run code path; does not provide live worker process"
        elif "validate" in rel_path.lower() or "validator" in rel_path.lower():
            classification = "validator_script"
            reason = "validates packets or decisions, not a resident worker"
        elif rel_path.endswith(".py") or rel_path.endswith(".mjs") or rel_path.endswith(".sh"):
            classification = "ambiguous_local_script"
            reason = "local script exists but was not identified as a safe resident worker"
        else:
            classification = "existing_file"
            reason = "file exists but no safe start semantics were identified"

    return {
        "path": rel_path,
        "exists": exists,
        "classification": classification,
        "startable_for_goal": startable and classification in STARTABLE_CLASSES,
        "command_preview": command_preview,
        "reason": reason,
    }


def package_candidates_for(role: str, scripts: dict[str, str]) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    role_token = "a2a" if role == "a2a_sync" else role
    for name, command in sorted(scripts.items()):
        lowered = f"{name} {command}".lower()
        if role_token not in lowered:
            continue
        classification = classify_package_script(name, command)
        candidates.append(
            {
                "name": name,
                "command_preview": command,
                "classification": classification,
                "startable_for_goal": classification == "local_runner",
                "reason": "package.json script matched role token",
            }
        )
    return candidates


def current_probe_state(role: str) -> dict[str, Any]:
    state_name = "a2a-sync" if role == "a2a_sync" else role
    state = read_json(STATE_ROOT / f"{state_name}.json") or {}
    pid_path = RUNTIME_ROOT / "pids" / f"{state_name}.pid"
    pid_or_session = safe_read(pid_path, limit=500).strip()
    return {
        "pid_or_session": pid_or_session or None,
        "state_path": str((STATE_ROOT / f"{state_name}.json").relative_to(REPO_ROOT)),
        "probe_only": bool(isinstance(state, dict) and state.get("probe_only") is True),
        "receipt_count": len(state.get("receipts", [])) if isinstance(state.get("receipts"), list) else 0,
        "last_timestamp": state.get("timestamp") if isinstance(state, dict) else None,
    }


def build_report() -> dict[str, Any]:
    scripts = load_package_scripts()
    candidates: dict[str, dict[str, Any]] = {}

    for role, paths in KNOWN_PATHS.items():
        package_candidates = package_candidates_for(role, scripts)
        path_candidates = [classify_path(role, rel_path) for rel_path in paths]
        startable = [candidate for candidate in [*package_candidates, *path_candidates] if candidate["startable_for_goal"]]
        candidates[role] = {
            "package_scripts": package_candidates,
            "paths": path_candidates,
            "current_probe_state": current_probe_state(role),
            "startable_candidates": startable,
            "real_entrypoint_found": bool(startable),
            "needs_entrypoint": role in {"hermes", "kob"} and not startable,
        }

    hermes_real = bool(candidates["hermes"]["startable_candidates"])
    kob_real = bool(candidates["kob"]["startable_candidates"])
    a2a_startable = bool(candidates["a2a_sync"]["startable_candidates"])
    status = "needs_entrypoint" if not (hermes_real and kob_real and a2a_startable) else "ready_for_live_start_review"

    return {
        "schema": "ghostclaw.a2a2a.entrypoint_verification.v1",
        "created_at": now_iso(),
        "repo": str(REPO_ROOT),
        "mode": "local_safe_read_only",
        "status": status,
        "summary": {
            "hermes_real_entrypoint_found": hermes_real,
            "kob_real_entrypoint_found": kob_real,
            "a2a_sync_startable_sidecar_found": a2a_startable,
            "current_sessions_are_probe_only": all(
                candidates[role]["current_probe_state"]["probe_only"] for role in ("hermes", "kob", "a2a_sync")
            ),
            "safe_to_claim_full_goal_complete": False,
        },
        "candidates": candidates,
        "blocked_actions_preserved": list(BLOCKED_ACTIONS),
        "next_safe_action": (
            "Provide or implement real local Hermes and KOB worker entrypoints that can process "
            ".ghostclaw_runtime/a2a2a inboxes without provider calls, secret reads, installs, "
            "or external writes; keep existing probe sessions as fallback until then."
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify GhostClaw A2A start entrypoints without launching agents.")
    parser.add_argument("--root", default=None, help="repo root")
    parser.add_argument("--write-receipt", action="store_true", help="write state/latest and timestamped receipt JSON")
    args = parser.parse_args()
    configure_root(args.root)

    report = build_report()
    if args.write_receipt:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S_%fZ")
        state_path = STATE_ROOT / "entrypoint-verification-latest.json"
        receipt_path = RECEIPT_ROOT / f"entrypoint_verification_{timestamp}.json"
        write_json(state_path, report)
        write_json(receipt_path, report)
        report["written"] = {
            "state": str(state_path.relative_to(REPO_ROOT)),
            "receipt": str(receipt_path.relative_to(REPO_ROOT)),
        }

    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
