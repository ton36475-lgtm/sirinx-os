#!/usr/bin/env python3
"""Validate a future GhostClaw LANE_1 Hermes decision markdown file.

The validator is intentionally local-only. It checks a decision artifact's
shape and safety flags; it does not create decisions or open gates.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DECISION_PATH = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"

ALLOWED_DECISIONS = {"route_to_opus", "request_revision", "open_codex_recorder_gate", "block"}
REQUIRED_FIELDS = {
    "decision",
    "decision_record",
    "codex_recorder_gate_open",
    "lane2_authorized",
    "approval_scope",
    "reviewed_evidence_paths",
}
BLOCKED_ACTION_FIELDS = [
    "deploy",
    "push",
    "cloud_mutation",
    "customer_send",
    "secret_read",
    "paid_provider_call",
    "runtime_queue_execution",
    "merge_script_execution",
    "install",
    "migration",
]
SECRET_LIKE_NAMES = {".env", ".env.local", ".env.production", ".npmrc"}
SECRET_LIKE_SUFFIXES = (".pem", ".key", ".p12")


class ValidationResult:
    def __init__(self, ok, errors, decision=None, evidence_paths=None):
        self.ok = ok
        self.errors = errors
        self.decision = decision
        self.evidence_paths = evidence_paths or []

    def to_dict(self):
        return {
            "ok": self.ok,
            "decision": self.decision,
            "errors": self.errors,
            "evidence_paths": self.evidence_paths,
        }


def parse_key_value_lines(text):
    fields = {}
    for raw_line in text.splitlines():
        line = raw_line.strip()
        match = re.fullmatch(r"([A-Za-z0-9_]+)=(.*)", line)
        if match:
            fields[match.group(1)] = match.group(2).strip()
    return fields


def parse_bool(value, field, errors):
    if value == "true":
        return True
    if value == "false":
        return False
    errors.append(f"{field} must be true or false")
    return None


def split_evidence_paths(value):
    return [item.strip() for item in value.split(",") if item.strip()]


def is_secret_like_path(path_text):
    path = Path(path_text)
    parts = set(path.parts)
    if parts & SECRET_LIKE_NAMES:
        return True
    if path.name in SECRET_LIKE_NAMES:
        return True
    return path.name.endswith(SECRET_LIKE_SUFFIXES)


def validate_decision_text(text, root=ROOT):
    errors = []
    if "HERMES_REVIEW_DECISION_RECORD" not in text:
        errors.append("missing HERMES_REVIEW_DECISION_RECORD marker")

    fields = parse_key_value_lines(text)
    missing = sorted(REQUIRED_FIELDS - set(fields))
    for field in missing:
        errors.append(f"missing required field: {field}")

    decision = fields.get("decision")
    if decision and decision not in ALLOWED_DECISIONS:
        errors.append("decision must be one of route_to_opus, request_revision, open_codex_recorder_gate, or block")

    bools = {}
    for field in ["decision_record", "codex_recorder_gate_open", "lane2_authorized", *BLOCKED_ACTION_FIELDS]:
        if field in fields:
            bools[field] = parse_bool(fields[field], field, errors)
        elif field in BLOCKED_ACTION_FIELDS:
            errors.append(f"missing required field: {field}")

    if bools.get("decision_record") is not True:
        errors.append("decision_record must be true")
    if bools.get("lane2_authorized") is not False:
        errors.append("lane2_authorized must remain false")

    gate_open = bools.get("codex_recorder_gate_open")
    if decision == "open_codex_recorder_gate":
        if gate_open is not True:
            errors.append("codex_recorder_gate_open must be true when decision=open_codex_recorder_gate")
    elif gate_open is True:
        errors.append("codex_recorder_gate_open must be false unless decision=open_codex_recorder_gate")

    if fields.get("approval_scope") != "local_decision_only":
        errors.append("approval_scope must be local_decision_only")

    for field in BLOCKED_ACTION_FIELDS:
        if bools.get(field) is not False:
            errors.append(f"{field} must be false")

    evidence_paths = split_evidence_paths(fields.get("reviewed_evidence_paths", ""))
    if len(evidence_paths) < 3:
        errors.append("reviewed_evidence_paths must include at least three local evidence paths")

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

    return ValidationResult(ok=not errors, errors=errors, decision=decision, evidence_paths=evidence_paths)


def main(argv=None):
    argv = argv or sys.argv[1:]
    decision_path = Path(argv[0]) if argv else DEFAULT_DECISION_PATH
    if not decision_path.is_absolute():
        decision_path = ROOT / decision_path

    if not decision_path.exists():
        print(
            json.dumps(
                {
                    "ok": False,
                    "reason": "missing_decision_file",
                    "path": str(decision_path),
                },
                indent=2,
            )
        )
        return 2

    result = validate_decision_text(decision_path.read_text(encoding="utf-8"), ROOT)
    print(json.dumps(result.to_dict(), indent=2))
    return 0 if result.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
