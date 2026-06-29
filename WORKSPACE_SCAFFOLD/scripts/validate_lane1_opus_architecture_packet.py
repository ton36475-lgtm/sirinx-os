#!/usr/bin/env python3
"""Validate a future GhostClaw LANE_1 Opus architecture packet.

The validator is intentionally local-only. It checks the shape and safety
flags of a separately produced final packet; it does not create the packet,
record a Hermes decision, or open LANE_2.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "validate_lane1_opus_architecture_packet.py"
DEFAULT_PACKET_PATH = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
DEFAULT_DECISION_PATH = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"
DEFAULT_GATE_JSON = ROOT / "data" / "pathspecs" / "ghostclaw_lane1_opus_architecture_packet_gate_2026-06-29.json"
DEFAULT_GATE_DOC = (
    ROOT
    / "docs"
    / "knowledge"
    / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET_GATE_2026-06-29.md"
)
DEFAULT_PACKET_018 = ROOT / "_A2A_QUEUE" / "outbox" / "packet_018_ghostclaw_lane1_opus_architecture_packet_gate.json"

FINAL_MARKER = "GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET_FINAL"
REQUIRED_SECTIONS = [
    "Goal",
    "Current State",
    "Proposed Architecture",
    "Interface Contracts",
    "Data Model Changes",
    "Lane Assignments",
    "Risk Assessment",
    "Dependencies",
    "Rollback Plan",
    "Hermes Review Decision",
    "Gate Status",
    "Verification",
]
REQUIRED_TRUE_FIELDS = [
    "final_opus_packet",
    "hermes_decision_recorded",
]
REQUIRED_FALSE_FIELDS = [
    "lane2_authorized",
    "deploy",
    "push",
    "cloud_mutation",
    "customer_send",
    "secret_read",
    "paid_provider_call",
    "provider_call",
    "runtime_queue_execution",
    "merge_script_execution",
    "install",
    "migration",
]
REQUIRED_FIELDS = {
    "decision_path",
    "reviewed_evidence_paths",
    *REQUIRED_TRUE_FIELDS,
    *REQUIRED_FALSE_FIELDS,
}
SECRET_LIKE_NAMES = {".env", ".env.local", ".env.production", ".npmrc"}
SECRET_LIKE_SUFFIXES = (".pem", ".key", ".p12")
BLOCKED_ACTIONS = {
    "cloud_mutation": False,
    "customer_send": False,
    "deploy": False,
    "install": False,
    "merge_script_execution": False,
    "migration": False,
    "paid_provider_call": False,
    "provider_call": False,
    "push": False,
    "runtime_queue_execution": False,
    "secret_read": False,
}


class ValidationResult:
    def __init__(self, ok: bool, errors: list[str], fields: dict[str, str] | None = None, evidence_paths=None):
        self.ok = ok
        self.errors = errors
        self.fields = fields or {}
        self.evidence_paths = evidence_paths or []

    def to_dict(self) -> dict:
        return {
            "ok": self.ok,
            "errors": self.errors,
            "fields": self.fields,
            "evidence_paths": self.evidence_paths,
        }


def repo_path(path: Path, root: Path = ROOT) -> str:
    try:
        return str(path.resolve().relative_to(root.resolve()))
    except ValueError:
        return str(path)


def parse_key_value_lines(text: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    for raw_line in text.splitlines():
        line = raw_line.strip()
        match = re.fullmatch(r"([A-Za-z0-9_]+)=(.*)", line)
        if match:
            fields[match.group(1)] = match.group(2).strip()
    return fields


def split_evidence_paths(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def is_secret_like_path(path_text: str) -> bool:
    path = Path(path_text)
    parts = set(path.parts)
    if parts & SECRET_LIKE_NAMES:
        return True
    if path.name in SECRET_LIKE_NAMES:
        return True
    return path.name.endswith(SECRET_LIKE_SUFFIXES)


def validate_bool_value(fields: dict[str, str], field: str, expected: str, errors: list[str]) -> None:
    value = fields.get(field)
    if value not in {"true", "false"}:
        errors.append(f"{field} must be true or false")
        return
    if value != expected:
        errors.append(f"{field} must be {expected}")


def validate_opus_packet_text(text: str, root: Path = ROOT) -> ValidationResult:
    errors: list[str] = []
    if FINAL_MARKER not in text:
        errors.append(f"missing {FINAL_MARKER} marker")

    for section in REQUIRED_SECTIONS:
        if f"## {section}" not in text:
            errors.append(f"missing required section: {section}")

    fields = parse_key_value_lines(text)
    missing = sorted(REQUIRED_FIELDS - set(fields))
    for field in missing:
        errors.append(f"missing required field: {field}")

    for field in REQUIRED_TRUE_FIELDS:
        if field in fields:
            validate_bool_value(fields, field, "true", errors)

    for field in REQUIRED_FALSE_FIELDS:
        if field in fields:
            validate_bool_value(fields, field, "false", errors)

    decision_path = fields.get("decision_path")
    if decision_path and decision_path != repo_path(DEFAULT_DECISION_PATH):
        errors.append(f"decision_path must be {repo_path(DEFAULT_DECISION_PATH)}")

    evidence_paths = split_evidence_paths(fields.get("reviewed_evidence_paths", ""))
    if len(evidence_paths) < 5:
        errors.append("reviewed_evidence_paths must include at least five local evidence paths")

    root = Path(root).resolve()
    for path_text in evidence_paths:
        if is_secret_like_path(path_text):
            errors.append(f"reviewed_evidence_paths cannot include secret-like path: {path_text}")
        path = Path(path_text)
        if path.is_absolute():
            errors.append(f"reviewed evidence path must be relative: {path_text}")
            continue
        resolved = (root / path).resolve()
        if root not in [resolved, *resolved.parents]:
            errors.append(f"reviewed evidence path escapes repo: {path_text}")
            continue
        if not resolved.exists():
            errors.append(f"reviewed evidence path does not exist: {path_text}")

    return ValidationResult(ok=not errors, errors=errors, fields=fields, evidence_paths=evidence_paths)


def validate_opus_packet_path(path: Path, root: Path = ROOT) -> ValidationResult:
    packet_path = Path(path)
    if not packet_path.is_absolute():
        packet_path = Path(root) / packet_path
    if not packet_path.exists():
        return ValidationResult(ok=False, errors=["missing_opus_architecture_packet"])
    return validate_opus_packet_text(packet_path.read_text(encoding="utf-8"), root=root)


def build_gate_contract() -> dict:
    return {
        "schema": "ghostclaw.lane1.opus_architecture_packet_gate.v1",
        "status": "validator_ready_final_packet_missing",
        "generated_at": "2026-06-29",
        "evidence_boundary": "local_evidence_only",
        "current_actionable_packet": "packet_013",
        "validator_path": repo_path(SCRIPT),
        "final_packet_path": repo_path(DEFAULT_PACKET_PATH),
        "decision_path": repo_path(DEFAULT_DECISION_PATH),
        "required_marker": FINAL_MARKER,
        "required_sections": list(REQUIRED_SECTIONS),
        "required_fields": sorted(REQUIRED_FIELDS),
        "final_packet_present": DEFAULT_PACKET_PATH.exists(),
        "final_packet_record": False,
        "hermes_decision_recorded": DEFAULT_DECISION_PATH.exists(),
        "decision_record": False,
        "lane2_authorized": False,
        "ready_for_lane2": False,
        "state_mutation_performed": False,
        "runtime_queue_execution": False,
        "provider_call": False,
        "blocked_by": [
            "BLOCK-LANE1-OPUS-PACKET",
            "BLOCK-HERMES-GATEWAY",
        ],
        "blocked_actions": dict(BLOCKED_ACTIONS),
        "validation_commands": [
            "python3 WORKSPACE_SCAFFOLD/scripts/validate_lane1_opus_architecture_packet.py "
            "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
        ],
        "next_safe_action": (
            "Use this validator only after Hermes/Opus produces a separate final packet "
            "and a separate validated Hermes decision exists; do not create either artifact from this gate."
        ),
        "notes": (
            "Validator gate only. It does not create the final Opus packet, record a Hermes decision, "
            "open the Codex recorder gate, execute a queue item, or authorize LANE_2."
        ),
    }


def build_packet_018(contract: dict, json_output: Path, markdown_output: Path, packet_output: Path) -> dict:
    return {
        "id": "packet_018",
        "project": "ghostclaw",
        "priority": "P0",
        "agent": "codex",
        "title": "Opus architecture packet gate validator for LANE_1",
        "status": "outbox",
        "risk": "safe",
        "approval_required": True,
        "approval_scope": "opus_architecture_packet_validation_only",
        "current_actionable_packet": contract["current_actionable_packet"],
        "final_packet_path": contract["final_packet_path"],
        "decision_path": contract["decision_path"],
        "final_packet_record": False,
        "decision_record": False,
        "codex_recorder_gate_open": False,
        "lane2_authorized": False,
        "dry_run": True,
        "live_send": False,
        "runtime_queue_execution": False,
        "provider_call": False,
        "input": [
            repo_path(json_output),
            repo_path(markdown_output),
            repo_path(SCRIPT),
            "_A2A_QUEUE/outbox/packet_017_ghostclaw_lane1_hermes_decision_preflight_audit.json",
            "data/pathspecs/ghostclaw_lane1_hermes_decision_preflight_audit_2026-06-29.json",
            "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_PREFLIGHT_AUDIT_2026-06-29.md",
        ],
        "output": [
            repo_path(packet_output),
            contract["final_packet_path"],
        ],
        "blocked_by": list(contract["blocked_by"]),
        "next_validation_commands": list(contract["validation_commands"]),
        "notes": (
            "Validator packet only. This packet does not create a final Opus packet, "
            "does not create a Hermes decision, does not execute a queue item, and does not authorize LANE_2."
        ),
        **dict(BLOCKED_ACTIONS),
    }


def render_gate_markdown(contract: dict, json_output: Path, packet_output: Path) -> str:
    sections = "\n".join(f"- `{section}`" for section in contract["required_sections"])
    fields = "\n".join(f"- `{field}`" for field in contract["required_fields"])
    commands = "\n".join(contract["validation_commands"])
    return "\n".join(
        [
            "# SIRINX GhostClaw LANE_1 Opus Architecture Packet Gate",
            "",
            "Status: `GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET_GATE_LOCAL_ONLY`",
            "Date: `2026-06-29`",
            "Mode: local-only validator readiness, no final packet creation, no decision record",
            "",
            "This gate validates a future final Opus architecture packet.",
            "It is not the final packet and is not a Hermes decision.",
            "",
            "```text",
            f"status={contract['status']}",
            f"current_actionable_packet={contract['current_actionable_packet']}",
            f"final_packet_path={contract['final_packet_path']}",
            f"decision_path={contract['decision_path']}",
            f"final_packet_present={str(contract['final_packet_present']).lower()}",
            f"final_packet_record={str(contract['final_packet_record']).lower()}",
            f"hermes_decision_recorded={str(contract['hermes_decision_recorded']).lower()}",
            f"decision_record={str(contract['decision_record']).lower()}",
            f"lane2_authorized={str(contract['lane2_authorized']).lower()}",
            f"ready_for_lane2={str(contract['ready_for_lane2']).lower()}",
            f"runtime_queue_execution={str(contract['runtime_queue_execution']).lower()}",
            f"provider_call={str(contract['provider_call']).lower()}",
            "```",
            "",
            "## Machine-Readable Gate",
            "",
            "```text",
            repo_path(json_output),
            repo_path(packet_output),
            "```",
            "",
            "## Required Final Packet Marker",
            "",
            f"`{contract['required_marker']}`",
            "",
            "## Required Sections",
            "",
            sections,
            "",
            "## Required Fields",
            "",
            fields,
            "",
            "## Validation Command",
            "",
            "```bash",
            commands,
            "```",
            "",
            "## Non-Actions",
            "",
            "No deploy, push, cloud mutation, customer send, secret read, paid/provider call,",
            "provider call, runtime queue execution, merge script, install, migration, decision record,",
            "state mutation, final Opus packet creation, Codex recorder gate opening, or LANE_2 authorization",
            "is performed by this gate.",
            "",
            "## Next Safe Action",
            "",
            contract["next_safe_action"],
            "",
        ]
    )


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_gate_artifacts(json_output: Path, markdown_output: Path, packet_output: Path) -> dict:
    contract = build_gate_contract()
    packet = build_packet_018(contract, json_output, markdown_output, packet_output)
    write_json(json_output, contract)
    markdown_output.parent.mkdir(parents=True, exist_ok=True)
    markdown_output.write_text(render_gate_markdown(contract, json_output, packet_output), encoding="utf-8")
    write_json(packet_output, packet)
    return contract


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("packet", nargs="?", default=str(DEFAULT_PACKET_PATH))
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--write-gate-artifacts", action="store_true")
    parser.add_argument("--json-output", default=str(DEFAULT_GATE_JSON))
    parser.add_argument("--markdown-output", default=str(DEFAULT_GATE_DOC))
    parser.add_argument("--packet-output", default=str(DEFAULT_PACKET_018))
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.write_gate_artifacts:
        contract = write_gate_artifacts(Path(args.json_output), Path(args.markdown_output), Path(args.packet_output))
        print(json.dumps(contract, indent=2, sort_keys=True))
        return 0

    packet_path = Path(args.packet)
    root = Path(args.root)
    result = validate_opus_packet_path(packet_path, root=root)
    if not result.ok and "missing_opus_architecture_packet" in result.errors:
        print(
            json.dumps(
                {
                    "ok": False,
                    "reason": "missing_opus_architecture_packet",
                    "path": str(packet_path if packet_path.is_absolute() else root / packet_path),
                    "errors": result.errors,
                },
                indent=2,
            )
        )
        return 2

    print(json.dumps(result.to_dict(), indent=2, sort_keys=True))
    return 0 if result.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
