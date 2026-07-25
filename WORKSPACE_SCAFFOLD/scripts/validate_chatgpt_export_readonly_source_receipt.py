#!/usr/bin/env python3
"""Validate ChatGPT export source receipt metadata without loading the source."""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

SCHEMA = "sirinx.chatgpt_export.readonly_source_receipt_validator.v1"
APPROVAL_PREFIX = "APPROVE_CHATGPT_EXPORT_READONLY_MAPPING_"
APPROVAL_PATTERN = re.compile(r"^APPROVE_CHATGPT_EXPORT_READONLY_MAPPING_(?P<target>.+)_(?P<date>\d{4}-?\d{2}-?\d{2})$")
ALLOWED_SOURCE_KINDS = {"chatgpt_export", "connector_backed_source"}
ALLOWED_CONFIDENCE = {"low", "medium", "high"}
RAW_CONTENT_KEYS = {
    "raw_chat",
    "raw_chats",
    "raw_chat_content",
    "raw_message",
    "raw_messages",
    "message_body",
    "message_bodies",
    "message_text",
    "messages",
    "conversation",
    "conversations",
    "transcript",
    "transcripts",
    "content",
    "parts",
    "text",
}
FORBIDDEN_TRUE_FLAGS = (
    "raw_chat_content_stored",
    "claims_all_chats_read",
    "connector_read_performed",
    "real_export_loaded",
    "external_upload",
    "provider_call",
    "runtime_queue_execution",
    "secret_read",
    "deploy",
    "push",
)


def load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"invalid_receipt_json: {exc}") from exc

    if not isinstance(value, dict):
        raise ValueError("invalid_receipt_shape: expected JSON object")
    return value


def walk_raw_content_keys(value: Any, path: str = "$") -> list[str]:
    hits: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            key_text = str(key)
            child_path = f"{path}.{key_text}"
            if key_text.lower() in RAW_CONTENT_KEYS:
                hits.append(child_path)
            hits.extend(walk_raw_content_keys(child, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            hits.extend(walk_raw_content_keys(child, f"{path}[{index}]"))
    return hits


def bool_field(receipt: dict[str, Any], key: str) -> bool:
    return receipt.get(key) is True


def validate_approval_phrase(value: Any) -> list[str]:
    errors: list[str] = []
    phrase = str(value or "")
    match = APPROVAL_PATTERN.match(phrase)
    if not match:
        return ["approval_phrase_missing_or_invalid"]
    if "<" in phrase or ">" in phrase:
        errors.append("approval_phrase_placeholder_not_allowed")
    if not match.group("target").strip():
        errors.append("approval_phrase_target_missing")
    return errors


def validate_receipt(receipt: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []

    required_fields = [
        "source_kind",
        "local_path_or_connector_scope",
        "operator_supplied",
        "read_only",
        "source_hash_or_query_id",
        "redaction_confirmed",
        "raw_chat_content_stored",
        "claims_all_chats_read",
        "permission",
        "freshness",
        "confidence",
        "approval_phrase",
    ]
    for field in required_fields:
        if field not in receipt:
            errors.append(f"missing_required_field:{field}")

    source_kind = receipt.get("source_kind")
    if source_kind not in ALLOWED_SOURCE_KINDS:
        errors.append("source_kind_not_allowed")

    if not str(receipt.get("local_path_or_connector_scope") or "").strip():
        errors.append("local_path_or_connector_scope_missing")

    if receipt.get("operator_supplied") is not True:
        errors.append("operator_supplied_must_be_true")

    if receipt.get("read_only") is not True:
        errors.append("read_only_must_be_true")

    if receipt.get("redaction_confirmed") is not True:
        errors.append("redaction_confirmed_must_be_true")

    for flag in FORBIDDEN_TRUE_FLAGS:
        if bool_field(receipt, flag):
            errors.append(f"forbidden_true_flag:{flag}")

    if not str(receipt.get("source_hash_or_query_id") or "").strip():
        errors.append("source_hash_or_query_id_missing")

    if not str(receipt.get("permission") or "").strip():
        errors.append("permission_missing")

    if not str(receipt.get("freshness") or "").strip():
        errors.append("freshness_missing")

    if receipt.get("confidence") not in ALLOWED_CONFIDENCE:
        errors.append("confidence_not_allowed")

    errors.extend(validate_approval_phrase(receipt.get("approval_phrase")))

    raw_key_hits = walk_raw_content_keys(receipt)
    if raw_key_hits:
        errors.extend([f"raw_content_field_not_allowed:{hit}" for hit in raw_key_hits])

    if source_kind == "chatgpt_export" and str(receipt.get("local_path_or_connector_scope") or "").startswith("connector:"):
        warnings.append("chatgpt_export_scope_looks_like_connector")
    if source_kind == "connector_backed_source" and "/" in str(receipt.get("local_path_or_connector_scope") or ""):
        warnings.append("connector_scope_looks_like_path")

    return {
        "schema": SCHEMA,
        "status": "valid" if not errors else "invalid",
        "valid": not errors,
        "errors": errors,
        "warnings": warnings,
        "source_kind": source_kind,
        "source_loaded": False,
        "connector_read_performed": False,
        "raw_chat_content_stored": False,
        "claims_all_chats_read": False,
        "next_safe_action": (
            "Receipt metadata is valid; operator may separately authorize source loading and metadata-only mapping."
            if not errors
            else "Fix receipt metadata before any export load, connector read, or metadata-only mapping."
        ),
    }


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--receipt", required=True, help="Path to operator-supplied receipt metadata JSON.")
    parser.add_argument("--json", action="store_true", help="Print machine-readable validation result.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    receipt_path = Path(args.receipt)
    if not receipt_path.exists():
        result = {
            "schema": SCHEMA,
            "status": "invalid",
            "valid": False,
            "errors": [f"receipt_file_missing:{receipt_path}"],
            "source_loaded": False,
            "connector_read_performed": False,
            "raw_chat_content_stored": False,
            "claims_all_chats_read": False,
        }
    elif not receipt_path.is_file():
        result = {
            "schema": SCHEMA,
            "status": "invalid",
            "valid": False,
            "errors": [f"receipt_path_not_file:{receipt_path}"],
            "source_loaded": False,
            "connector_read_performed": False,
            "raw_chat_content_stored": False,
            "claims_all_chats_read": False,
        }
    else:
        try:
            result = validate_receipt(load_json(receipt_path))
        except ValueError as exc:
            result = {
                "schema": SCHEMA,
                "status": "invalid",
                "valid": False,
                "errors": [str(exc)],
                "source_loaded": False,
                "connector_read_performed": False,
                "raw_chat_content_stored": False,
                "claims_all_chats_read": False,
            }

    if args.json:
        sys.stdout.write(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    elif result["valid"]:
        sys.stdout.write("valid_chatgpt_export_readonly_source_receipt\n")
    else:
        sys.stderr.write("\n".join(result["errors"]) + "\n")
    return 0 if result["valid"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
