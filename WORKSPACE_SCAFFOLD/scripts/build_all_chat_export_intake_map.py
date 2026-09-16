#!/usr/bin/env python3
"""Build a metadata-only intake map from an operator-supplied ChatGPT export."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import date
from pathlib import Path
from typing import Any

MAPPER_CONTRACT = "data/pathspecs/sirinx_all_chat_export_intake_mapper_2026-06-29.json"
INTAKE_CONTRACT = "data/pathspecs/sirinx_all_chat_export_intake_contract_2026-06-29.json"
MAPPER_DOC = "docs/knowledge/SIRINX_ALL_CHAT_EXPORT_INTAKE_MAPPER_2026-06-29.md"

SENSITIVE_TITLE_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"[\w.\-+]+@[\w.\-]+\.\w+",
        r"\b(api[_-]?key|access[_-]?key|secret|token|password|passwd|bearer)\b",
        r"\b(customer|client|private|credential|cookie|session)\b",
    )
]


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def load_conversations(export_path: Path) -> list[dict[str, Any]]:
    """Load common ChatGPT export shapes without normalizing message bodies to disk."""
    try:
        payload = json.loads(export_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"invalid_export_json: {exc}") from exc

    if isinstance(payload, list):
        conversations = payload
    elif isinstance(payload, dict) and isinstance(payload.get("conversations"), list):
        conversations = payload["conversations"]
    else:
        raise ValueError("invalid_export_shape: expected list or {conversations: []}")

    normalized = []
    for item in conversations:
        if isinstance(item, dict):
            normalized.append(item)
    return normalized


def redact_title(title: str) -> str:
    normalized = " ".join(str(title or "Untitled").split())
    if any(pattern.search(normalized) for pattern in SENSITIVE_TITLE_PATTERNS):
        return "[REDACTED_TITLE]"
    return normalized[:120] if normalized else "Untitled"


def collect_strings(value: Any, output: list[str], limit: int = 300) -> None:
    """Collect enough text for routing while bounding memory work for large exports."""
    if len(output) >= limit:
        return
    if isinstance(value, str):
        output.append(value)
        return
    if isinstance(value, list):
        for item in value:
            collect_strings(item, output, limit)
            if len(output) >= limit:
                return
        return
    if isinstance(value, dict):
        for key in ("title", "content", "parts", "text", "message", "messages", "mapping"):
            if key in value:
                collect_strings(value[key], output, limit)
                if len(output) >= limit:
                    return
        return


def routing_for_text(text: str) -> dict[str, Any]:
    lowered = text.lower()
    blockers: list[str] = []
    paths: list[str] = []
    next_actions: list[str] = []

    if (
        "packet_013" in lowered
        or "lane_1" in lowered
        or "lane 1" in lowered
        or "opus" in lowered
        or "hermes decision" in lowered
    ):
        blockers.append("BLOCK-LANE1-OPUS-PACKET")
        paths.append("docs/knowledge/SIRINX_GHOSTCLAW_LANE1_PACKET013_DECISION_WORKBENCH_2026-06-29.md")
        next_actions.append("Hermes/operator records packet_013 decision before any recorder gate change.")

    if "v3.3" in lowered or "merge kit" in lowered or "ghostclaw_repo_merge_kit_v3_3.zip" in lowered:
        blockers.append("BLOCK-V3-3-ARTIFACT")
        paths.append("docs/knowledge/SIRINX_GHOSTCLAW_V3_3_PREFLIGHT_RECHECK_2026-06-29.md")
        next_actions.append("Place or point to exact ghostclaw_repo_merge_kit_v3_3.zip before staging merge intake.")

    if "r0" in lowered or "testnet" in lowered or "approval" in lowered:
        blockers.append("BLOCK-R0-APPROVALS")
        paths.append("docs/knowledge/SIRINX_R0_GATE_SPECIFIC_APPROVAL_CONTRACT_2026-06-29.md")
        next_actions.append("Record one named R0 gate-specific approval packet before external action.")

    if "chatgpt export" in lowered or "all chats" in lowered or "all-chat" in lowered:
        blockers.append("BLOCK-CHAT-EXPORT")
        paths.append("docs/knowledge/SIRINX_ALL_CHAT_EXPORT_INTAKE_CONTRACT_2026-06-29.md")
        next_actions.append("Map operator-supplied export records before claiming all-chat coverage.")

    if not blockers:
        return {
            "status": "needs_human_review",
            "blockers": [],
            "paths": ["docs/knowledge/SIRINX_ACTIVE_GOAL_COMPLETION_AUDIT_2026-06-29.md"],
            "next_action": "Review this redacted source row and map it to a specific repo path or blocker.",
            "confidence": "low",
        }

    return {
        "status": "blocked",
        "blockers": list(dict.fromkeys(blockers)),
        "paths": list(dict.fromkeys(paths)),
        "next_action": " ".join(next_actions),
        "confidence": "medium",
    }


def build_record(
    conversation: dict[str, Any],
    index: int,
    export_path: Path,
    source_id: str,
    source_kind: str,
    repo: str,
) -> dict[str, Any]:
    conversation_id = str(
        conversation.get("id")
        or conversation.get("conversation_id")
        or conversation.get("uuid")
        or f"{source_id}:{index:04d}"
    )
    title = str(conversation.get("title") or conversation.get("name") or "Untitled")
    strings: list[str] = [title]
    collect_strings(conversation, strings)
    routing = routing_for_text(" ".join(strings))

    return {
        "source_id": f"{source_id}:{index:04d}",
        "source_kind": source_kind,
        "conversation_id_hash": sha256_text(conversation_id),
        "title_redacted": redact_title(title),
        "source_path": str(export_path),
        "repo": repo,
        "paths": routing["paths"],
        "status": routing["status"],
        "blockers": routing["blockers"],
        "next_action": routing["next_action"],
        "evidence": [MAPPER_CONTRACT, INTAKE_CONTRACT],
        "permission": "operator_supplied_local_file_required",
        "freshness": "derived_from_source_at_runtime",
        "confidence": routing["confidence"],
    }


def build_intake_map(
    export_path: Path | str,
    source_id: str,
    source_kind: str = "chatgpt_export",
    repo: str | None = None,
) -> dict[str, Any]:
    export_path = Path(export_path)
    conversations = load_conversations(export_path)
    repo_path = repo or str(Path.cwd())

    records = [
        build_record(
            conversation=conversation,
            index=index,
            export_path=export_path,
            source_id=source_id,
            source_kind=source_kind,
            repo=repo_path,
        )
        for index, conversation in enumerate(conversations, start=1)
    ]

    return {
        "schema": "sirinx.all_chat_export.intake_map.v1",
        "generated_at": date.today().isoformat(),
        "source_id": source_id,
        "source_kind": source_kind,
        "source_path": str(export_path),
        "repo": repo_path,
        "claims_all_chats_read": False,
        "raw_chat_content_stored": False,
        "real_export_loaded": True,
        "safety_flags": {
            "provider_call": False,
            "external_upload": False,
            "deploy": False,
            "push": False,
            "cloud_mutation": False,
            "customer_send": False,
            "runtime_queue_execution": False,
            "secret_read": False,
        },
        "records": records,
        "notes": "Metadata-only routing map. Message bodies are used only in memory for routing and are not written to output.",
    }


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--export", required=True, help="Operator-supplied local conversations.json path.")
    parser.add_argument("--source-id", required=True, help="Stable local source id for generated records.")
    parser.add_argument("--source-kind", default="chatgpt_export", choices=("chatgpt_export", "connector_backed_source"))
    parser.add_argument("--repo", default=str(Path.cwd()), help="Repo path to place in generated metadata records.")
    parser.add_argument("--output", help="Optional path for metadata-only JSON output.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    export_path = Path(args.export)
    if not export_path.exists():
        sys.stderr.write(f"missing_export_file: {export_path}\n")
        return 2
    if not export_path.is_file():
        sys.stderr.write(f"invalid_export_file: {export_path}\n")
        return 2

    try:
        result = build_intake_map(
            export_path=export_path,
            source_id=args.source_id,
            source_kind=args.source_kind,
            repo=args.repo,
        )
    except ValueError as exc:
        sys.stderr.write(f"{exc}\n")
        return 2

    serialized = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        Path(args.output).write_text(serialized, encoding="utf-8")
    else:
        sys.stdout.write(serialized)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
