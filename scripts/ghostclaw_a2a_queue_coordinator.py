#!/usr/bin/env python3
"""Coordinate _A2A_QUEUE through local GhostClaw A2A workers.

This is a local-safe coordinator. It reads queue packet metadata, dispatches
safe packets to Hermes and KOB local worker inboxes, and records approval-gated
lanes separately. It never moves queue files, executes packet payloads, refreshes
MCP auth, installs packages, calls providers, reads secrets, deploys, pushes, or
sends messages.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
QUEUE_ROOT = REPO_ROOT / "_A2A_QUEUE"
RUNTIME_ROOT = REPO_ROOT / ".ghostclaw_runtime" / "a2a2a"
INBOX_ROOT = RUNTIME_ROOT / "inbox"
PROJECT_QUEUE_ROOT = RUNTIME_ROOT / "project_queues"
RECEIPT_ROOT = RUNTIME_ROOT / "receipts"
STATE_ROOT = RUNTIME_ROOT / "state"
GATE_ROOT = RUNTIME_ROOT / "gates"

QUEUE_FOLDERS = ("inbox", "outbox", "working", "done", "blocked", "approvals")
SAFE_DISPATCH_FOLDERS = {"inbox", "outbox"}
REDACT_PATTERNS: list[tuple[str, str]] = [
    (r"(sk-[A-Za-z0-9_-]{8,})", "<masked-sk>"),
    (r"(kob_[A-Za-z0-9_-]{8,})", "<masked-kob>"),
    (r"(gh[opu]_)[A-Za-z0-9_]{20,}", r"\1<masked>"),
    (r"(hf_)[A-Za-z0-9_]{20,}", r"\1<masked>"),
    (r"(Bearer\s+)[A-Za-z0-9._-]+", r"\1<masked>"),
    (r"((?:KEY|TOKEN|SECRET|PASSWORD|API_KEY)[A-Za-z0-9_]*\s*=\s*)[^\s\"']+", r"\1<masked>"),
    (r"(postgres(?:ql)?:\/\/)[^@\s]+@", r"\1<masked>@"),
    (r"(redis:\/\/:)[^@\s]+@", r"\1<masked>@"),
]


def redact_dict(value: Any) -> Any:
    if isinstance(value, str):
        result = value
        for pattern_str, replacement in REDACT_PATTERNS:
            match = re.search(pattern_str, result, re.IGNORECASE)
            if match:
                result = re.sub(pattern_str, replacement, result, flags=re.IGNORECASE)
        return result
    if isinstance(value, dict):
        return {k: redact_dict(v) for k, v in value.items()}
    if isinstance(value, list):
        return [redact_dict(v) for v in value]
    return value


def redact_report(report: dict[str, Any]) -> dict[str, Any]:
    return redact_dict(report)


RISKY_FLAGS = (
    "runtime_queue_execution",
    "provider_call",
    "external_message_send",
    "deploy",
    "push",
    "cloud_mutation",
    "customer_send",
    "secret_read",
    "paid_provider_call",
    "telegram_live_send",
    "install",
    "migration",
    "merge_script_execution",
    "state_mutation",
    "lane2_authorized",
    "license_file_mutation",
)
MCP_KEYWORDS = ("mcp", "oauth", "linear", "notion", "figma", "connector", "auth refresh")
INSTALL_KEYWORDS = (
    "external repo",
    "install",
    "postinstall",
    "npx",
    "bunx",
    "global plugin",
    "oh-my-opencode",
    "agent-blackbox",
)
GATE_INTENT_FIELDS = (
    "id",
    "title",
    "action",
    "action_requested",
    "approval_scope",
    "next_action",
)

MCP_AUTH_GATES = (
    "APPROVE_MCP_AUTH_REFRESH_LINEAR",
    "APPROVE_MCP_AUTH_REFRESH_NOTION",
    "APPROVE_MCP_AUTH_REFRESH_FIGMA",
)
EXTERNAL_REPO_INSTALL_GATES = (
    "APPROVE_INSTALL_OH_MY_OPENCODE_LITE_QUARANTINE",
    "APPROVE_INSTALL_AGENT_BLACKBOX_QUARANTINE",
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def configure_root(root: str | None) -> None:
    global REPO_ROOT, QUEUE_ROOT, RUNTIME_ROOT, INBOX_ROOT, PROJECT_QUEUE_ROOT, RECEIPT_ROOT, STATE_ROOT, GATE_ROOT
    if root:
        candidate = Path(root).expanduser()
        if not candidate.is_absolute():
            candidate = (Path.cwd() / candidate).resolve()
        REPO_ROOT = candidate
    QUEUE_ROOT = REPO_ROOT / "_A2A_QUEUE"
    RUNTIME_ROOT = REPO_ROOT / ".ghostclaw_runtime" / "a2a2a"
    INBOX_ROOT = RUNTIME_ROOT / "inbox"
    PROJECT_QUEUE_ROOT = RUNTIME_ROOT / "project_queues"
    RECEIPT_ROOT = RUNTIME_ROOT / "receipts"
    STATE_ROOT = RUNTIME_ROOT / "state"
    GATE_ROOT = RUNTIME_ROOT / "gates"


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


def safe_id(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "-_." else "_" for ch in value)[:180]


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def ensure_runtime_dirs() -> None:
    for agent in ("hermes", "kob", "codex"):
        (INBOX_ROOT / agent).mkdir(parents=True, exist_ok=True)
    for folder in (RECEIPT_ROOT, STATE_ROOT, GATE_ROOT):
        folder.mkdir(parents=True, exist_ok=True)


def packet_files() -> list[tuple[str, Path]]:
    files: list[tuple[str, Path]] = []
    for folder in QUEUE_FOLDERS:
        root = QUEUE_ROOT / folder
        if not root.exists():
            continue
        for path in sorted(root.glob("*.json")):
            if path.name.startswith("."):
                continue
            files.append((folder, path))
    return files


def project_inbox_files() -> list[Path]:
    if not INBOX_ROOT.exists():
        return []
    return sorted(path for path in INBOX_ROOT.rglob("*.json") if path.is_file() and not path.name.startswith("."))


def parse_route_defaults() -> dict[str, dict[str, str]]:
    route_path = REPO_ROOT / ".ghostclaw" / "registry" / "route-matrix.v1.yaml"
    if not route_path.exists():
        return {}
    routes: dict[str, dict[str, str]] = {}
    current: dict[str, str] | None = None
    for line in route_path.read_text(encoding="utf-8").splitlines():
        start = line.strip().startswith("- route_id:")
        if start:
            if current and current.get("task_type"):
                routes[current["task_type"]] = current
            current = {"route_id": line.split(":", 1)[1].strip().strip("\"'")}
            continue
        if current is None:
            continue
        field = re_match_simple_yaml_field(line)
        if field and field[0] in {"task_type", "primary_agent", "reviewer_agent", "validator_agent", "tier"}:
            current[field[0]] = field[1]
    if current and current.get("task_type"):
        routes[current["task_type"]] = current
    return routes


def re_match_simple_yaml_field(line: str) -> tuple[str, str] | None:
    stripped = line.strip()
    if ":" not in stripped or stripped.startswith("- "):
        return None
    key, value = stripped.split(":", 1)
    key = key.strip()
    value = value.strip().strip("\"'")
    if not key:
        return None
    return key, value


def extract_project_task(packet: dict[str, Any]) -> dict[str, Any] | None:
    candidates = [packet]
    payload = packet.get("payload")
    if isinstance(payload, dict):
        candidates.append(payload)
        task = payload.get("task")
        if isinstance(task, dict):
            candidates.append(task)
        mission = payload.get("mission")
        if isinstance(mission, dict):
            candidates.append(mission)

    for candidate in candidates:
        if not isinstance(candidate, dict):
            continue
        mission_id = candidate.get("mission_id") or candidate.get("id")
        project_id = candidate.get("project_id")
        task_type = candidate.get("task_type")
        if mission_id and project_id and task_type:
            return {
                "mission_id": str(mission_id),
                "project_id": str(project_id),
                "task_type": str(task_type),
                "tier": str(candidate.get("tier") or ""),
                "primary_agent": str(candidate.get("primary_agent") or ""),
                "reviewer_agent": str(candidate.get("reviewer_agent") or ""),
                "validator_agent": str(candidate.get("validator_agent") or ""),
                "priority": str(candidate.get("priority") or "medium"),
                "summary": str(candidate.get("summary") or candidate.get("title") or "A2A2A inbox routed task"),
                "allowed_files": candidate.get("allowed_files") if isinstance(candidate.get("allowed_files"), list) else [],
                "forbidden_files": candidate.get("forbidden_files") if isinstance(candidate.get("forbidden_files"), list) else [],
                "constraints": candidate.get("constraints") if isinstance(candidate.get("constraints"), list) else [],
                "deliverables": candidate.get("deliverables") if isinstance(candidate.get("deliverables"), list) else [],
                "verification": candidate.get("verification") if isinstance(candidate.get("verification"), list) else [],
            }
    return None


def project_queue_dir(project_id: str) -> Path:
    exact = PROJECT_QUEUE_ROOT / safe_id(project_id)
    normalized = PROJECT_QUEUE_ROOT / safe_id(project_id.replace("-", "_"))
    if exact.exists():
        return exact
    if normalized.exists():
        return normalized
    return normalized


def project_task_path(task: dict[str, Any]) -> Path:
    return project_queue_dir(task["project_id"]) / f"TASK-{safe_id(task['mission_id'])}.yaml"


def existing_project_queue_mission_paths(mission_id: str) -> list[str]:
    if not PROJECT_QUEUE_ROOT.exists():
        return []
    needle = f"mission_id: {mission_id}"
    quoted = f'mission_id: "{mission_id}"'
    matches: list[str] = []
    for path in PROJECT_QUEUE_ROOT.rglob("*.yaml"):
        try:
            raw = path.read_text(encoding="utf-8")
        except OSError:
            continue
        if needle in raw or quoted in raw:
            matches.append(rel(path))
    return sorted(matches)


def yaml_scalar(value: Any) -> str:
    text = str(value or "").replace("\n", " ").strip()
    if text == "":
        return '""'
    if any(ch in text for ch in [":", "#", "[", "]", "{", "}", '"', "'"]) or text.lower() in {"true", "false", "null"}:
        return json.dumps(text, ensure_ascii=False)
    return text


def yaml_list(key: str, values: list[Any]) -> list[str]:
    lines = [f"{key}:"]
    if not values:
        lines.append("  []")
        return lines
    for value in values:
        lines.append(f"  - {yaml_scalar(value)}")
    return lines


def render_project_task_yaml(task: dict[str, Any], route_defaults: dict[str, str], source_path: Path) -> str:
    tier = task.get("tier") or route_defaults.get("tier") or "A"
    primary_agent = task.get("primary_agent") or route_defaults.get("primary_agent") or "codex"
    reviewer_agent = task.get("reviewer_agent") or route_defaults.get("reviewer_agent") or ""
    validator_agent = task.get("validator_agent") or route_defaults.get("validator_agent") or ""
    lines = [
        f"mission_id: {yaml_scalar(task['mission_id'])}",
        f"project_id: {yaml_scalar(task['project_id'])}",
        f"task_type: {yaml_scalar(task['task_type'])}",
        f"tier: {yaml_scalar(tier)}",
        f"primary_agent: {yaml_scalar(primary_agent)}",
        f"reviewer_agent: {yaml_scalar(reviewer_agent)}",
        f"validator_agent: {yaml_scalar(validator_agent)}",
        "status: pending",
        f"created_at: {json.dumps(now_iso())}",
        f"priority: {yaml_scalar(task.get('priority') or 'medium')}",
        "",
        "summary: >",
        f"  {str(task.get('summary') or 'A2A2A inbox routed task').replace(chr(10), ' ')}",
        "",
        f"source_inbox_path: {yaml_scalar(rel(source_path))}",
        "routed_by: ghostclaw_a2a_queue_coordinator",
        f"routed_at: {json.dumps(now_iso())}",
        "",
    ]
    for key in ("allowed_files", "forbidden_files", "constraints", "deliverables", "verification"):
        lines.extend(yaml_list(key, task.get(key) if isinstance(task.get(key), list) else []))
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def coordinate_project_queues(mode: str = "off") -> dict[str, Any]:
    if mode == "off":
        return {
            "mode": "off",
            "candidate_count": 0,
            "written_count": 0,
            "collision_count": 0,
            "skipped_count": 0,
            "candidates": [],
            "written": [],
            "collisions": [],
            "skipped": [],
        }
    route_defaults_by_task = parse_route_defaults()
    candidates: list[dict[str, Any]] = []
    written: list[dict[str, Any]] = []
    collisions: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []

    for path in project_inbox_files():
        try:
            packet = read_json(path)
            if not isinstance(packet, dict):
                raise ValueError("packet JSON must be an object")
        except (OSError, json.JSONDecodeError, ValueError) as exc:
            skipped.append({"path": rel(path), "reason": exc.__class__.__name__})
            continue
        task = extract_project_task(packet)
        if task is None:
            skipped.append({"path": rel(path), "reason": "not_project_queue_task"})
            continue
        dest = project_task_path(task)
        duplicate_paths = existing_project_queue_mission_paths(task["mission_id"])
        candidate = {
            "mission_id": task["mission_id"],
            "project_id": task["project_id"],
            "task_type": task["task_type"],
            "source_path": rel(path),
            "destination_path": rel(dest),
            "route_id": route_defaults_by_task.get(task["task_type"], {}).get("route_id"),
        }
        candidates.append(candidate)
        if dest.exists() or duplicate_paths:
            collisions.append({**candidate, "reason": "project_queue_item_exists", "existing_paths": duplicate_paths or [rel(dest)]})
            continue
        if mode == "write":
            route_defaults = route_defaults_by_task.get(task["task_type"], {})
            write_text(dest, render_project_task_yaml(task, route_defaults, path))
            written.append(candidate)

    return {
        "mode": "project_queue_write" if mode == "write" else "project_queue_dry_run",
        "candidate_count": len(candidates),
        "written_count": len(written),
        "collision_count": len(collisions),
        "skipped_count": len(skipped),
        "skipped_omitted_count": max(0, len(skipped) - 25),
        "candidates": candidates,
        "written": written,
        "collisions": collisions,
        "skipped": skipped[:25],
    }


def project_queue_only_report(mode: str) -> dict[str, Any]:
    dispatch = coordinate_project_queues(mode)
    return {
        "schema": "ghostclaw.a2a2a.project_queue_only_run.v1",
        "status": "pass",
        "mode": dispatch["mode"],
        "created_at": now_iso(),
        "repo": str(REPO_ROOT),
        "project_queue_dispatch": dispatch,
        "legacy_queue_dispatch": False,
        "worker_packets_written": 0,
        "gate_records_written": 0,
        "blocked_actions_preserved": {
            "runtime_queue_execution": False,
            "queue_payload_execution": False,
            "provider_call": False,
            "secret_read": False,
            "deploy": False,
            "push": False,
            "live_send": False,
        },
        "next_safe_action": "Review project_queue_dispatch before opening any worker execution or live-send gate.",
    }


def packet_fingerprint(path: Path) -> str:
    raw = path.read_bytes()
    return hashlib.sha256(raw).hexdigest()


def packet_text(packet: dict[str, Any]) -> str:
    try:
        return json.dumps(packet, ensure_ascii=False, sort_keys=True).lower()
    except TypeError:
        return str(packet).lower()


def gate_intent_text(packet: dict[str, Any]) -> str:
    values: list[str] = []
    for field in GATE_INTENT_FIELDS:
        value = packet.get(field)
        if isinstance(value, str):
            values.append(value)
        elif isinstance(value, list):
            values.extend(str(item) for item in value)
    return " ".join(values).lower()


def bool_field(packet: dict[str, Any], field: str) -> bool:
    return bool(packet.get(field, False))


def risky_flags(packet: dict[str, Any]) -> list[str]:
    return [field for field in RISKY_FLAGS if bool_field(packet, field)]


def gate_lane(packet: dict[str, Any], folder: str) -> str | None:
    text = gate_intent_text(packet)
    if folder == "approvals":
        return "approval_packet_present"
    if any(keyword in text for keyword in MCP_KEYWORDS):
        return "mcp_auth_refresh"
    if any(keyword in text for keyword in INSTALL_KEYWORDS):
        return "external_repo_install"
    return None


def classify_packet(folder: str, path: Path, packet: dict[str, Any]) -> dict[str, Any]:
    flags = risky_flags(packet)
    lane = gate_lane(packet, folder)
    approval_required = bool(packet.get("approval_required", False)) or folder == "approvals"
    risk = str(packet.get("risk", "unknown")).lower()
    packet_id = str(packet.get("id") or path.stem)
    blockers: list[str] = []

    if approval_required:
        blockers.append("approval_required")
    if flags:
        blockers.extend(flags)
    if risk not in {"safe", "low"} and folder in SAFE_DISPATCH_FOLDERS:
        blockers.append(f"risk_not_safe:{risk}")
    if lane:
        blockers.append(f"gate_lane:{lane}")

    if folder in SAFE_DISPATCH_FOLDERS and not blockers:
        decision = "dispatch_to_local_workers"
    elif folder == "done":
        decision = "observe_done_only"
    elif folder == "working":
        decision = "observe_working_only"
    else:
        decision = "gate_or_observe_only"

    return {
        "id": packet_id,
        "folder": folder,
        "path": rel(path),
        "title": str(packet.get("title", path.name)),
        "agent": str(packet.get("agent", "unknown")),
        "risk": risk,
        "status": str(packet.get("status", folder)),
        "decision": decision,
        "approval_required": approval_required,
        "gate_lane": lane,
        "blockers": sorted(set(blockers)),
        "fingerprint": packet_fingerprint(path),
    }


def load_processed() -> set[str]:
    state_path = STATE_ROOT / "queue-coordinator-processed.json"
    if not state_path.exists():
        return set()
    try:
        data = read_json(state_path)
    except json.JSONDecodeError:
        return set()
    return set(data.get("processed", []))


def save_processed(processed: set[str]) -> None:
    write_json(
        STATE_ROOT / "queue-coordinator-processed.json",
        {
            "schema": "ghostclaw.a2a2a.queue_coordinator_processed.v1",
            "updated_at": now_iso(),
            "processed": sorted(processed),
        },
    )


def make_worker_envelope(summary: dict[str, Any], target: str, run_id: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.task.v1",
        "id": f"queue_coord_{summary['id']}_{target}_{run_id}",
        "mission": "a2a_queue_coordination",
        "source": "codex",
        "target": target,
        "requires_ack": True,
        "requires_receipt": True,
        "dangerous_actions_allowed": False,
        "secret_access_allowed": False,
        "paid_model_calls_allowed": False,
        "created_at": now_iso(),
        "payload": {
            "message": "coordinate safe queue packet",
            "queue_packet": {
                "id": summary["id"],
                "path": summary["path"],
                "title": summary["title"],
                "agent": summary["agent"],
                "risk": summary["risk"],
            },
            "expected_behavior": "write local role receipt only",
            "runtime_queue_execution": False,
            "provider_call": False,
            "external_message_send": False,
            "deploy": False,
            "push": False,
            "secret_read": False,
        },
    }


def dispatch_packet(summary: dict[str, Any], run_id: str) -> list[str]:
    written: list[str] = []
    for target in ("hermes", "kob"):
        envelope = make_worker_envelope(summary, target, run_id)
        path = INBOX_ROOT / target / f"{safe_id(envelope['id'])}.json"
        write_json(path, envelope)
        written.append(rel(path))
    return written


def gate_record(summary: dict[str, Any], run_id: str) -> dict[str, Any]:
    lane = summary.get("gate_lane") or "approval_required"
    required_gates: list[str]
    if lane == "mcp_auth_refresh":
        required_gates = list(MCP_AUTH_GATES)
    elif lane == "external_repo_install":
        required_gates = list(EXTERNAL_REPO_INSTALL_GATES)
    else:
        required_gates = ["APPROVE_GATE_SPECIFIC_ACTION"]
    return {
        "schema": "ghostclaw.a2a2a.queue_gate_record.v1",
        "created_at": now_iso(),
        "run_id": run_id,
        "queue_packet": summary,
        "lane": lane,
        "status": "approval_gated_not_executed",
        "required_gates": required_gates,
        "executed": False,
        "provider_call": False,
        "mcp_auth_refreshed": False,
        "external_repo_installed": False,
        "secret_read": False,
        "deploy": False,
        "push": False,
        "next_safe_action": "Create or approve an exact gate-specific packet before any external action.",
    }


def planned_worker_packets(summary: dict[str, Any], run_id: str) -> list[str]:
    paths: list[str] = []
    for target in ("hermes", "kob"):
        envelope = make_worker_envelope(summary, target, run_id)
        paths.append(rel(INBOX_ROOT / target / f"{safe_id(envelope['id'])}.json"))
    return paths


def coordinate(write_receipt: bool = False, dry_run: bool = False, project_queue_mode: str = "off") -> dict[str, Any]:
    if not dry_run:
        ensure_runtime_dirs()
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S_%fZ")
    processed = load_processed()
    packets: list[dict[str, Any]] = []
    dispatched: list[dict[str, Any]] = []
    gated: list[dict[str, Any]] = []
    would_dispatch: list[dict[str, Any]] = []
    would_gate: list[dict[str, Any]] = []
    observed: list[dict[str, Any]] = []

    for folder, path in packet_files():
        try:
            packet = read_json(path)
            if not isinstance(packet, dict):
                raise ValueError("packet JSON must be an object")
        except (OSError, json.JSONDecodeError, ValueError) as exc:
            summary = {
                "id": path.stem,
                "folder": folder,
                "path": rel(path),
                "decision": "gate_or_observe_only",
                "blockers": [exc.__class__.__name__],
                "fingerprint": packet_fingerprint(path),
            }
        else:
            summary = classify_packet(folder, path, packet)
        packets.append(summary)
        processed_key = f"{summary['path']}:{summary['fingerprint']}:dispatch-v2"

        if summary["decision"] == "dispatch_to_local_workers":
            if processed_key in processed:
                observed.append({**summary, "coordination": "already_dispatched"})
                continue
            if dry_run:
                would_dispatch.append({**summary, "coordination": "would_dispatch", "worker_packets": planned_worker_packets(summary, run_id)})
                continue
            worker_packets = dispatch_packet(summary, run_id)
            processed.add(processed_key)
            dispatched.append({**summary, "worker_packets": worker_packets})
        elif summary["decision"] == "gate_or_observe_only" and summary.get("blockers"):
            record = gate_record(summary, run_id)
            gate_path = GATE_ROOT / f"{safe_id(summary['id'])}_{safe_id(summary.get('gate_lane') or 'approval')}.json"
            if dry_run:
                would_gate.append({**summary, "coordination": "would_write_gate_record", "gate_record": rel(gate_path), "required_gates": record["required_gates"]})
                continue
            write_json(gate_path, record)
            gated.append({**summary, "gate_record": rel(gate_path), "required_gates": record["required_gates"]})
        else:
            observed.append(summary)

    if not dry_run:
        save_processed(processed)
    project_queue_dispatch = coordinate_project_queues(project_queue_mode)
    report = {
        "schema": "ghostclaw.a2a2a.queue_coordination_run.v1",
        "status": "pass",
        "mode": "dry_run_reconcile_only" if dry_run else "local_safe_queue_coordination",
        "dry_run": dry_run,
        "run_id": run_id,
        "created_at": now_iso(),
        "repo": str(REPO_ROOT),
        "queue_root": rel(QUEUE_ROOT),
        "workers_used": [] if dry_run else ["hermes-local-role-worker", "kob-local-role-worker", "a2a-local-bus-watcher"],
        "workers_planned": ["hermes-local-role-worker", "kob-local-role-worker", "a2a-local-bus-watcher"],
        "packet_counts": {
            "total": len(packets),
            "dispatched": len(dispatched),
            "gated": len(gated),
            "would_dispatch": len(would_dispatch),
            "would_gate": len(would_gate),
            "observed": len(observed),
        },
        "dispatched": dispatched,
        "gated": gated,
        "would_dispatch": would_dispatch,
        "would_gate": would_gate,
        "observed": observed,
        "project_queue_dispatch": project_queue_dispatch,
        "blocked_actions_preserved": {
            "mcp_auth_refresh": False,
            "external_repo_install": False,
            "provider_call": False,
            "secret_read": False,
            "deploy": False,
            "push": False,
            "live_send": False,
            "queue_file_mutation": False,
            "queue_payload_execution": False,
        },
        "next_safe_action": (
            "Review dry-run reconcile output before any worker restart or queue mutation."
            if dry_run
            else "Let local workers acknowledge dispatched packets, then inspect role/bus receipts. "
            "MCP auth refresh and external repo installs remain separate approval-gated lanes."
        ),
    }
    if not dry_run:
        write_json(STATE_ROOT / "queue-coordination-latest.json", report)
    if write_receipt and not dry_run:
        receipt_path = RECEIPT_ROOT / f"queue_coordination_{run_id}.json"
        write_json(receipt_path, report)
        report["receipt"] = rel(receipt_path)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Coordinate _A2A_QUEUE through local GhostClaw A2A workers.")
    parser.add_argument("--root", default=None, help="repo root")
    parser.add_argument("--dry-run", action="store_true", help="reconcile queue state without writing runtime artifacts")
    parser.add_argument("--write-receipt", action="store_true", help="write timestamped receipt under runtime receipts")
    parser.add_argument(
        "--project-queue-mode",
        choices=("off", "dry-run", "write"),
        default="off",
        help="route runtime inbox project tasks into .ghostclaw_runtime/a2a2a/project_queues",
    )
    parser.add_argument(
        "--project-queue-only",
        action="store_true",
        help="run only the runtime inbox to project-queue dispatcher; skip legacy _A2A_QUEUE coordination",
    )
    args = parser.parse_args()
    if args.dry_run and args.write_receipt:
        parser.error("--write-receipt cannot be combined with --dry-run")
    if args.dry_run and args.project_queue_mode == "write":
        parser.error("--project-queue-mode write cannot be combined with --dry-run")
    if args.project_queue_only and args.project_queue_mode == "off":
        parser.error("--project-queue-only requires --project-queue-mode dry-run or write")
    configure_root(args.root)
    if args.project_queue_only:
        report = project_queue_only_report(args.project_queue_mode)
    else:
        report = coordinate(
            write_receipt=args.write_receipt,
            dry_run=args.dry_run,
            project_queue_mode=args.project_queue_mode,
        )
    redacted = redact_report(report)
    print(json.dumps(redacted, indent=2, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
