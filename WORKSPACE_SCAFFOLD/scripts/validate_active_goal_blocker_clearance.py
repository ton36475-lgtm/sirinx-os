#!/usr/bin/env python3
"""Validate one proposed active-goal blocker clearance packet.

This validator checks local evidence shape only. It does not clear blockers,
approve external actions, mark the active goal complete, or execute runtime
queues.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PACKET_PATH = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_BLOCKER_CLEARANCE_PACKET.md"

ALLOWED_BLOCKERS = {
    "BLOCK-CHAT-EXPORT",
    "BLOCK-LANE1-OPUS-PACKET",
    "BLOCK-HERMES-GATEWAY",
    "BLOCK-V3-3-ARTIFACT",
    "BLOCK-R0-APPROVALS",
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
    def __init__(
        self,
        ok: bool,
        errors: list[str],
        blocker_id: str | None = None,
        status: str = "blocked",
        evidence_paths: list[str] | None = None,
        claims_goal_complete: bool = False,
    ):
        self.ok = ok
        self.errors = errors
        self.blocker_id = blocker_id
        self.status = status
        self.evidence_paths = evidence_paths or []
        self.claims_goal_complete = claims_goal_complete

    def to_dict(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "status": self.status,
            "blocker_id": self.blocker_id,
            "claims_goal_complete": self.claims_goal_complete,
            "evidence_paths": self.evidence_paths,
            "errors": self.errors,
        }


def is_secret_like_path(path_text: str) -> bool:
    path = Path(path_text)
    if path.name in SECRET_LIKE_NAMES:
        return True
    if set(path.parts) & SECRET_LIKE_NAMES:
        return True
    return path.name.endswith(SECRET_LIKE_SUFFIXES)


def load_packet(packet_path: Path) -> tuple[dict[str, Any] | None, list[str]]:
    try:
        payload = json.loads(packet_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return None, [f"invalid_clearance_packet_json: {exc}"]
    if not isinstance(payload, dict):
        return None, ["clearance packet must be a JSON object"]
    return payload, []


def parse_bool(payload: dict[str, Any], field: str, errors: list[str]) -> bool | None:
    value = payload.get(field)
    if isinstance(value, bool):
        return value
    errors.append(f"{field} must be boolean")
    return None


def resolve_evidence_paths(packet: dict[str, Any], root: Path, errors: list[str]) -> list[tuple[str, Path]]:
    evidence_paths = packet.get("evidence_paths")
    if not isinstance(evidence_paths, list) or not evidence_paths:
        errors.append("evidence_paths must be a non-empty list")
        return []

    root = root.resolve()
    resolved_paths: list[tuple[str, Path]] = []
    for raw_path in evidence_paths:
        if not isinstance(raw_path, str) or not raw_path.strip():
            errors.append("evidence_paths entries must be non-empty strings")
            continue
        path_text = raw_path.strip()
        if is_secret_like_path(path_text):
            errors.append(f"evidence path cannot be secret-like: {path_text}")
        path = Path(path_text)
        if path.is_absolute():
            errors.append(f"evidence path must be relative: {path_text}")
            continue
        resolved = (root / path).resolve()
        if root not in [resolved, *resolved.parents]:
            errors.append(f"evidence path escapes root: {path_text}")
            continue
        if not resolved.exists():
            errors.append(f"evidence path does not exist: {path_text}")
            continue
        resolved_paths.append((path_text, resolved))
    return resolved_paths


def load_json_if_possible(path: Path) -> dict[str, Any] | None:
    if path.suffix.lower() != ".json":
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def validate_chat_export_evidence(paths: list[tuple[str, Path]], errors: list[str]) -> None:
    for _, resolved in paths:
        payload = load_json_if_possible(resolved)
        if not payload:
            continue
        if payload.get("schema") != "sirinx.all_chat_export.intake_map.v1":
            continue
        if payload.get("real_export_loaded") is not True:
            errors.append("chat export intake map must have real_export_loaded=true")
        if payload.get("raw_chat_content_stored") is not False:
            errors.append("chat export intake map must have raw_chat_content_stored=false")
        records = payload.get("records")
        if not isinstance(records, list) or not records:
            errors.append("chat export intake map must include at least one record")
        return
    errors.append("BLOCK-CHAT-EXPORT requires sirinx.all_chat_export.intake_map.v1 evidence")


def validate_lane1_evidence(paths: list[tuple[str, Path]], errors: list[str]) -> None:
    names = {resolved.name for _, resolved in paths}
    if "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md" not in names:
        errors.append("BLOCK-LANE1-OPUS-PACKET requires final Opus architecture packet")
    if "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md" not in names:
        errors.append("BLOCK-LANE1-OPUS-PACKET requires Hermes review decision record")


def validate_gateway_evidence(paths: list[tuple[str, Path]], errors: list[str]) -> None:
    for _, resolved in paths:
        payload = load_json_if_possible(resolved)
        if payload and payload.get("hermes_gateway_available") is True:
            return
        if resolved.suffix.lower() in {".md", ".txt"}:
            text = resolved.read_text(encoding="utf-8")
            if "hermes_gateway_available=true" in text or '"hermes_gateway_available": true' in text:
                return
    errors.append("BLOCK-HERMES-GATEWAY requires read-only gateway available proof")


def validate_v3_artifact_evidence(paths: list[tuple[str, Path]], errors: list[str]) -> None:
    has_zip = any(resolved.name == "ghostclaw_repo_merge_kit_v3_3.zip" for _, resolved in paths)
    has_policy_pass = False
    for _, resolved in paths:
        if resolved.name == "ghostclaw_repo_merge_kit_v3_3.zip":
            continue
        text = resolved.read_text(encoding="utf-8", errors="ignore")
        if "fail: 0" in text or '"fail": 0' in text or "11 tests passed" in text:
            has_policy_pass = True
            break
    if not has_zip:
        errors.append("BLOCK-V3-3-ARTIFACT requires exact ghostclaw_repo_merge_kit_v3_3.zip")
    if not has_policy_pass:
        errors.append("BLOCK-V3-3-ARTIFACT requires bundled policy test pass evidence")


def validate_r0_evidence(paths: list[tuple[str, Path]], errors: list[str]) -> None:
    for _, resolved in paths:
        text = resolved.read_text(encoding="utf-8", errors="ignore")
        if (
            "SIRINX_R0_GATE_APPROVAL_PACKET" in text
            and "approval_packet_record=true" in text
            and "approval_scope=single_gate_only" in text
            and "blanket_approval=false" in text
            and "approve_all=false" in text
        ):
            return
    errors.append("BLOCK-R0-APPROVALS requires a valid single-gate R0 approval packet")


def validate_specific_blocker(blocker_id: str, paths: list[tuple[str, Path]], errors: list[str]) -> None:
    if blocker_id == "BLOCK-CHAT-EXPORT":
        validate_chat_export_evidence(paths, errors)
    elif blocker_id == "BLOCK-LANE1-OPUS-PACKET":
        validate_lane1_evidence(paths, errors)
    elif blocker_id == "BLOCK-HERMES-GATEWAY":
        validate_gateway_evidence(paths, errors)
    elif blocker_id == "BLOCK-V3-3-ARTIFACT":
        validate_v3_artifact_evidence(paths, errors)
    elif blocker_id == "BLOCK-R0-APPROVALS":
        validate_r0_evidence(paths, errors)


def validate_clearance_packet(packet_path: Path | str, root: Path | str = ROOT) -> ValidationResult:
    packet_path = Path(packet_path)
    root = Path(root)
    packet, errors = load_packet(packet_path)
    if packet is None:
        return ValidationResult(ok=False, errors=errors)

    if packet.get("schema") != "sirinx.active_goal.blocker_clearance_packet.v1":
        errors.append("schema must be sirinx.active_goal.blocker_clearance_packet.v1")
    if packet.get("status") != "proposed_clearance":
        errors.append("status must be proposed_clearance")
    if parse_bool(packet, "clearance_packet_record", errors) is not True:
        errors.append("clearance_packet_record must be true")

    blocker_id = packet.get("blocker_id")
    if not isinstance(blocker_id, str) or blocker_id not in ALLOWED_BLOCKERS:
        errors.append("blocker_id must name exactly one known blocker")

    if packet.get("clearance_scope") != "single_blocker_only":
        errors.append("clearance_scope must be single_blocker_only")

    claims_goal_complete = parse_bool(packet, "claims_goal_complete", errors)
    if claims_goal_complete is not False:
        errors.append("claims_goal_complete must remain false")
    if parse_bool(packet, "claims_all_chats_read", errors) is not False:
        errors.append("claims_all_chats_read must remain false")
    if parse_bool(packet, "operator_review_complete", errors) is not True:
        errors.append("operator_review_complete must be true")

    blocked_actions = packet.get("blocked_actions")
    if not isinstance(blocked_actions, dict):
        errors.append("blocked_actions must be an object")
        blocked_actions = {}
    for action in BLOCKED_ACTION_FIELDS:
        if blocked_actions.get(action) is not False:
            errors.append(f"{action} must remain false")

    resolved_paths = resolve_evidence_paths(packet, root, errors)
    if isinstance(blocker_id, str) and blocker_id in ALLOWED_BLOCKERS:
        validate_specific_blocker(blocker_id, resolved_paths, errors)

    status = "clearable" if not errors else "blocked"
    evidence_paths = [path_text for path_text, _ in resolved_paths]
    return ValidationResult(
        ok=not errors,
        errors=errors,
        blocker_id=blocker_id if isinstance(blocker_id, str) else None,
        status=status,
        evidence_paths=evidence_paths,
        claims_goal_complete=bool(claims_goal_complete),
    )


def main(argv: list[str] | None = None) -> int:
    argv = argv or sys.argv[1:]
    packet_path = Path(argv[0]) if argv else DEFAULT_PACKET_PATH
    if not packet_path.is_absolute():
        packet_path = ROOT / packet_path

    if not packet_path.exists():
        print(
            json.dumps(
                {
                    "ok": False,
                    "reason": "missing_clearance_packet",
                    "path": str(packet_path),
                },
                indent=2,
            )
        )
        return 2

    result = validate_clearance_packet(packet_path, ROOT)
    print(json.dumps(result.to_dict(), indent=2))
    return 0 if result.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
