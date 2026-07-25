#!/usr/bin/env python3
"""Validate a future SIRINX R0 gate-specific approval packet.

This validator checks packet shape only. It does not approve, deploy, push, or
execute any external action.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PACKET_PATH = ROOT / "docs" / "knowledge" / "SIRINX_R0_GATE_APPROVAL_PACKET.md"

ALLOWED_GATE_IDS = {"R0-01", "R0-02", "R0-03"}
ALLOWED_ACTIONS = {
    "testnet_deploy",
    "real_wallet_connector_implementation",
    "merge_staging_to_main",
}
NEVER_AUTHORIZED = {"secret_read"}
REQUIRED_FIELDS = {
    "approval_packet_record",
    "gate_id",
    "action",
    "target",
    "environment",
    "rollback",
    "evidence_path",
    "approval_scope",
    "approved_by",
    "approval_expires_at",
    "blanket_approval",
    "approve_all",
}
SECRET_LIKE_NAMES = {".env", ".env.local", ".env.production", ".npmrc"}
SECRET_LIKE_SUFFIXES = (".pem", ".key", ".p12")


class ValidationResult:
    def __init__(self, ok, errors, gate_id=None, action=None):
        self.ok = ok
        self.errors = errors
        self.gate_id = gate_id
        self.action = action

    def to_dict(self):
        return {
            "ok": self.ok,
            "gate_id": self.gate_id,
            "action": self.action,
            "errors": self.errors,
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


def is_secret_like_path(path_text):
    path = Path(path_text)
    if path.name in SECRET_LIKE_NAMES:
        return True
    if set(path.parts) & SECRET_LIKE_NAMES:
        return True
    return path.name.endswith(SECRET_LIKE_SUFFIXES)


def validate_existing_relative_path(field, path_text, root, errors):
    if is_secret_like_path(path_text):
        errors.append(f"{field} cannot include secret-like path: {path_text}")
    path = Path(path_text)
    if path.is_absolute():
        errors.append(f"{field} must be relative: {path_text}")
        return
    resolved = (root / path).resolve()
    if root not in [resolved, *resolved.parents]:
        errors.append(f"{field} escapes repo: {path_text}")
        return
    if not resolved.exists():
        errors.append(f"{field} does not exist: {path_text}")


def validate_approval_text(text, root=ROOT):
    errors = []
    if "SIRINX_R0_GATE_APPROVAL_PACKET" not in text:
        errors.append("missing SIRINX_R0_GATE_APPROVAL_PACKET marker")

    fields = parse_key_value_lines(text)
    for field in sorted(REQUIRED_FIELDS - set(fields)):
        errors.append(f"missing required field: {field}")

    approval_record = parse_bool(fields.get("approval_packet_record", ""), "approval_packet_record", errors)
    if approval_record is not True:
        errors.append("approval_packet_record must be true")

    gate_id = fields.get("gate_id")
    if gate_id not in ALLOWED_GATE_IDS:
        errors.append("gate_id must be one of R0-01, R0-02, or R0-03")

    action = fields.get("action", "")
    actions = [item.strip() for item in action.split(",") if item.strip()]
    if len(actions) != 1 or actions[0] not in ALLOWED_ACTIONS:
        errors.append("action must name exactly one allowed R0 action")
    if any(item in NEVER_AUTHORIZED for item in actions):
        errors.append("secret_read is never authorized by this local contract")

    if fields.get("approval_scope") != "single_gate_only":
        errors.append("approval_scope must be single_gate_only")

    if parse_bool(fields.get("blanket_approval", ""), "blanket_approval", errors) is not False:
        errors.append("blanket_approval must be false")
    if parse_bool(fields.get("approve_all", ""), "approve_all", errors) is not False:
        errors.append("approve_all must be false")

    for field in ("target", "environment", "approved_by", "approval_expires_at"):
        if not fields.get(field, "").strip():
            errors.append(f"{field} must be non-empty")

    root = Path(root).resolve()
    if "rollback" in fields:
        validate_existing_relative_path("rollback", fields["rollback"], root, errors)
    if "evidence_path" in fields:
        validate_existing_relative_path("evidence_path", fields["evidence_path"], root, errors)

    return ValidationResult(ok=not errors, errors=errors, gate_id=gate_id, action=actions[0] if actions else action)


def main(argv=None):
    argv = argv or sys.argv[1:]
    packet_path = Path(argv[0]) if argv else DEFAULT_PACKET_PATH
    if not packet_path.is_absolute():
        packet_path = ROOT / packet_path

    if not packet_path.exists():
        print(
            json.dumps(
                {
                    "ok": False,
                    "reason": "missing_r0_approval_packet",
                    "path": str(packet_path),
                },
                indent=2,
            )
        )
        return 2

    result = validate_approval_text(packet_path.read_text(encoding="utf-8"), ROOT)
    print(json.dumps(result.to_dict(), indent=2))
    return 0 if result.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
