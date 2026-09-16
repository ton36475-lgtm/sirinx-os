#!/usr/bin/env python3
"""Audit the current A2A2A gate lock without dispatching worker envelopes.

This script is intentionally non-executing. It verifies that the selected queue
packet is ready, the operator action card and current next gate agree, the
local-dispatch preflight stays blocked without the exact approval phrase, and no
planned worker envelope already exists. With ``--write`` it writes only
evidence, receipt, status, and a Markdown report.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import shlex
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
PACKET_ID = "A2A2A-P125-GATE-LOCK-AUDIT-CLI-20260703"
DEFAULT_CURRENT_NEXT_GATE = ".ghostclaw_runtime/a2a2a/status/current_next_gate.json"
DEFAULT_OPERATOR_CARD = ".ghostclaw_runtime/a2a2a/status/operator_action_card.json"
DEFAULT_OUTPUT = f".ghostclaw_runtime/a2a2a/evidence/{PACKET_ID}.json"
DEFAULT_RECEIPT = f".ghostclaw_runtime/a2a2a/receipts/{PACKET_ID}.json"
DEFAULT_STATUS_OUTPUT = ".ghostclaw_runtime/a2a2a/status/gate_lock_status.json"
DEFAULT_REPORT = "reports/mission/A2A2A_P125_GATE_LOCK_AUDIT_CLI_20260703.md"

UNSAFE_COMMAND_TOKENS = (
    " curl ",
    "| bash",
    "git push",
    "wrangler",
    "cloudflare",
    "deploy",
    "npm install",
    "pnpm install",
    "yarn add",
    "telegram",
    "openrouter",
    ".env",
    "secret",
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def resolve_under_root(root: Path, value: str) -> Path:
    path = Path(value).expanduser()
    if not path.is_absolute():
        path = root / path
    return path.resolve()


def rel(root: Path, path: Path) -> str:
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_local_dispatch_module():
    script_path = Path(__file__).resolve().with_name("ghostclaw_a2a_local_dispatch_execute.py")
    spec = importlib.util.spec_from_file_location("ghostclaw_a2a_local_dispatch_execute", script_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load local dispatch executor from {script_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def command_issues(command: str | None, exact_gate: str | None, *, kind: str) -> list[str]:
    issues: list[str] = []
    if not command:
        return [f"command_missing:{kind}"]
    if not command.startswith("python3 scripts/ghostclaw_a2a_local_dispatch_execute.py --gate "):
        issues.append(f"command_not_local_dispatch:{kind}")
    normalized = f" {command.lower()} "
    for token in UNSAFE_COMMAND_TOKENS:
        if token in normalized:
            issues.append(f"command_unsafe_token:{kind}:{token.strip()}")
    if kind == "safety_check_without_approval" and "--approval" in command:
        issues.append("safety_check_should_not_include_approval")
    if kind == "dry_run_after_gate":
        if "--dry-run" not in command:
            issues.append("dry_run_command_missing_dry_run_flag")
        if "--execute" in command:
            issues.append("dry_run_command_must_not_execute")
        if exact_gate and exact_gate not in command:
            issues.append("dry_run_command_missing_exact_gate")
    if kind == "write_after_gate":
        if "--execute" not in command or "--write" not in command:
            issues.append("write_command_missing_execute_write_flags")
        if exact_gate and exact_gate not in command:
            issues.append("write_command_missing_exact_gate")
    return issues


def extract_gate_path(command: str | None) -> str | None:
    if not command:
        return None
    try:
        parts = shlex.split(command)
    except ValueError:
        return None
    if "--gate" not in parts:
        return None
    index = parts.index("--gate")
    if index + 1 >= len(parts):
        return None
    return parts[index + 1]


def packet_sequence(value: str | None) -> str | None:
    if not value:
        return None
    import re

    match = re.search(r"packet[_-](\d+)", value)
    return match.group(1) if match else None


def false_map_issues(payload: dict[str, Any], field: str) -> list[str]:
    value = payload.get(field)
    if not isinstance(value, dict):
        return [f"{field}_missing"]
    return [f"{field}_not_false:{key}" for key, item in sorted(value.items()) if item is not False]


def build_audit(root: Path, current_next_gate_path: str, operator_card_path: str) -> dict[str, Any]:
    current_path = resolve_under_root(root, current_next_gate_path)
    operator_path = resolve_under_root(root, operator_card_path)
    current = read_json(current_path)
    operator = read_json(operator_path)

    current_gate = current.get("current_next_gate") if isinstance(current.get("current_next_gate"), dict) else {}
    exact_gate = current.get("next_exact_gate") or current_gate.get("exact_phrase")
    operator_exact_gate = operator.get("exact_gate_phrase")
    selected_packet = current.get("current_orchestrator", {}).get("selected_packet") or operator.get("selected_packet")
    selected_packet_path = (
        current.get("current_orchestrator", {}).get("selected_packet_path") or operator.get("selected_packet_path")
    )
    selected_sequence = packet_sequence(str(selected_packet_path or selected_packet or ""))

    command_preview = current.get("command_preview", {}) if isinstance(current.get("command_preview"), dict) else {}
    safety_command = command_preview.get("safety_check_without_approval") or operator.get("preflight_command")
    dry_run_command = command_preview.get("dry_run_after_gate") or operator.get("dry_run_command")
    write_command = command_preview.get("write_after_gate") or operator.get("action_after_exact_gate", {}).get("command")
    gate_path_value = extract_gate_path(safety_command or write_command)

    issues: list[str] = []
    if current.get("status") != "ready_for_exact_gate":
        issues.append("current_next_gate_not_ready")
    if operator.get("status") != "ready_for_exact_gate":
        issues.append("operator_card_not_ready")
    if operator.get("gate_readiness_status") != "ready_for_exact_gate":
        issues.append("operator_gate_readiness_not_ready")
    if not exact_gate:
        issues.append("missing_exact_gate")
    if exact_gate and operator_exact_gate and exact_gate != operator_exact_gate:
        issues.append("current_operator_exact_gate_mismatch")
    if selected_sequence and exact_gate and selected_sequence not in str(exact_gate):
        issues.append("exact_gate_does_not_reference_selected_packet_sequence")
    if not selected_packet_path:
        issues.append("missing_selected_packet_path")

    selected_path = resolve_under_root(root, str(selected_packet_path)) if selected_packet_path else None
    selected_sha = None
    if selected_path:
        if selected_path.is_file():
            selected_sha = sha256_file(selected_path)
        else:
            issues.append("selected_packet_path_missing")

    issues.extend(command_issues(safety_command, str(exact_gate) if exact_gate else None, kind="safety_check_without_approval"))
    issues.extend(command_issues(dry_run_command, str(exact_gate) if exact_gate else None, kind="dry_run_after_gate"))
    issues.extend(command_issues(write_command, str(exact_gate) if exact_gate else None, kind="write_after_gate"))
    issues.extend(false_map_issues(current, "blocked_actions_preserved"))
    issues.extend(false_map_issues(current, "external_actions_performed"))
    issues.extend(false_map_issues(operator, "external_actions_performed"))

    approval_less_check: dict[str, Any] = {
        "status": "not_run",
        "issues": [],
        "planned_writes": [],
        "source_gate": gate_path_value,
    }
    if not gate_path_value:
        issues.append("missing_gate_path_in_command_preview")
    else:
        gate_path = resolve_under_root(root, gate_path_value)
        if not gate_path.is_file():
            issues.append("compatibility_gate_missing")
        else:
            dispatch = load_local_dispatch_module()
            gate = read_json(gate_path)
            preflight = dispatch.build_result(
                root,
                gate,
                rel(root, gate_path),
                approval=None,
                execute=False,
                dry_run=False,
            )
            approval_less_check = {
                "status": preflight.get("status"),
                "issues": preflight.get("issues", []),
                "planned_writes": preflight.get("planned_writes", []),
                "required_approval": preflight.get("required_approval"),
                "approval_matches": preflight.get("approval_matches"),
                "source_gate": rel(root, gate_path),
            }
            if preflight.get("status") != "blocked_missing_or_invalid_exact_gate":
                issues.append("approval_less_preflight_not_blocked")
            if "exact_approval_not_present" not in preflight.get("issues", []):
                issues.append("approval_less_preflight_missing_exact_approval_issue")
            if exact_gate and preflight.get("required_approval") != exact_gate:
                issues.append("dispatch_gate_required_approval_mismatch")
            if any(str(issue).startswith("worker_packet_already_exists:") for issue in preflight.get("issues", [])):
                issues.append("worker_envelope_already_written_for_selected_packet")

    worker_files = []
    for item in approval_less_check.get("planned_writes", []):
        item_path = item.get("path")
        if not item_path:
            continue
        absolute = resolve_under_root(root, str(item_path))
        if absolute.exists():
            worker_files.append(rel(root, absolute))
    if worker_files and "worker_envelope_already_written_for_selected_packet" not in issues:
        issues.append("worker_envelope_already_written_for_selected_packet")

    status = "PASS_GATE_LOCK_HELD_READY_FOR_EXACT_GATE" if not issues else "FAIL_GATE_LOCK_AUDIT_ISSUES"
    return {
        "schema": "ghostclaw.a2a2a.gate_lock_audit.v2",
        "packet_id": PACKET_ID,
        "status": status,
        "mode": "local_safe_gate_lock_audit_no_dispatch",
        "created_at": now_iso(),
        "repo": str(root),
        "active_focus": current.get("active_focus", []),
        "paused_focus": current.get("paused_focus", []),
        "selected_packet": selected_packet,
        "selected_packet_path": selected_packet_path,
        "selected_packet_sequence": selected_sequence,
        "selected_packet_sha256": selected_sha,
        "current_next_gate": exact_gate,
        "operator_exact_gate": operator_exact_gate,
        "current_next_gate_status": current.get("status"),
        "operator_action_card_status": operator.get("status"),
        "operator_gate_readiness": operator.get("gate_readiness_status"),
        "approval_less_executor_check": approval_less_check,
        "worker_envelope_files_present": worker_files,
        "worker_envelope_written": False,
        "queue_payload_executed": False,
        "issues": issues,
        "command_preview": {
            "safety_check_without_approval": safety_command,
            "dry_run_after_gate": dry_run_command,
            "write_after_gate": write_command,
        },
        "source_artifacts": {
            "current_next_gate": rel(root, current_path),
            "operator_action_card": rel(root, operator_path),
            "compatibility_gate": approval_less_check.get("source_gate"),
        },
        "external_actions_performed": current.get("external_actions_performed", {}),
        "blocked_actions_preserved": current.get("blocked_actions_preserved", {}),
        "telegram_safe_draft": (
            f"Gate-lock audit: {selected_packet} status={status}; next gate={exact_gate}. "
            "No live send/provider/deploy/cloud/worker execution performed."
        ),
        "next_safe_action": (
            f"Wait for exact gate `{exact_gate}` before writing local worker envelopes."
            if status.startswith("PASS_")
            else "Fix gate-lock audit issues before any worker-envelope write."
        ),
    }


def build_receipt(audit: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.gate_lock_audit_receipt.v2",
        "packet_id": audit["packet_id"],
        "status": audit["status"],
        "mode": audit["mode"],
        "created_at": now_iso(),
        "repo": audit["repo"],
        "evidence_path": evidence_path,
        "selected_packet": audit.get("selected_packet"),
        "current_next_gate": audit.get("current_next_gate"),
        "issues": audit.get("issues", []),
        "worker_envelope_written": False,
        "queue_payload_executed": False,
        "blocked_actions_preserved": audit.get("blocked_actions_preserved", {}),
        "completion_claim": "Gate-lock audit completed; no worker envelopes or queue payloads were executed.",
        "next_safe_action": audit.get("next_safe_action"),
    }


def render_report(audit: dict[str, Any], evidence_path: str, receipt_path: str) -> str:
    issues = audit.get("issues", [])
    issue_lines = "\n".join(f"- `{issue}`" for issue in issues) if issues else "- none"
    return f"""# A2A2A Gate-Lock Audit CLI

- Packet: `{audit["packet_id"]}`
- Status: `{audit["status"]}`
- Selected packet: `{audit.get("selected_packet")}`
- Current next gate: `{audit.get("current_next_gate")}`
- Worker envelopes present: `{len(audit.get("worker_envelope_files_present", []))}`

## Evidence

- Evidence: `{evidence_path}`
- Receipt: `{receipt_path}`
- Current next gate: `{audit["source_artifacts"].get("current_next_gate")}`
- Operator card: `{audit["source_artifacts"].get("operator_action_card")}`
- Compatibility gate: `{audit["source_artifacts"].get("compatibility_gate")}`

## Issues

{issue_lines}

## Result

No worker envelope write, worker execution, queue payload execution, live send,
provider/model call, install, commit, push, deploy, secret read/print, or
Cloudflare/R2 mutation was performed.

## Next Safe Action

{audit.get("next_safe_action")}
"""


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit the A2A2A gate lock without dispatching workers.")
    parser.add_argument("--root", default=str(REPO_ROOT), help="repo root")
    parser.add_argument("--current-next-gate", default=DEFAULT_CURRENT_NEXT_GATE, help="current next gate JSON")
    parser.add_argument("--operator-card", default=DEFAULT_OPERATOR_CARD, help="operator action card JSON")
    parser.add_argument("--output", default=DEFAULT_OUTPUT, help="evidence output path")
    parser.add_argument("--receipt", default=DEFAULT_RECEIPT, help="receipt output path")
    parser.add_argument("--status-output", default=DEFAULT_STATUS_OUTPUT, help="status output path")
    parser.add_argument("--report", default=DEFAULT_REPORT, help="Markdown report output path")
    parser.add_argument("--write", action="store_true", help="write evidence, receipt, status, and report")
    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    audit = build_audit(root, args.current_next_gate, args.operator_card)

    if args.write:
        output_path = resolve_under_root(root, args.output)
        receipt_path = resolve_under_root(root, args.receipt)
        status_path = resolve_under_root(root, args.status_output)
        report_path = resolve_under_root(root, args.report)
        write_json(output_path, audit)
        receipt = build_receipt(audit, rel(root, output_path))
        write_json(receipt_path, receipt)
        write_json(status_path, audit)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(render_report(audit, rel(root, output_path), rel(root, receipt_path)), encoding="utf-8")
        audit["evidence_path"] = rel(root, output_path)
        audit["receipt_path"] = rel(root, receipt_path)
        audit["status_path"] = rel(root, status_path)
        audit["report_path"] = rel(root, report_path)

    print(json.dumps(audit, indent=2, ensure_ascii=False, sort_keys=True))
    return 0 if audit["status"].startswith("PASS_") else 2


if __name__ == "__main__":
    raise SystemExit(main())
