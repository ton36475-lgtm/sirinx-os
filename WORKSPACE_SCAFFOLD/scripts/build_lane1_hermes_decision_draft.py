#!/usr/bin/env python3
"""Build a draft-only Hermes decision packet for GhostClaw LANE_1 packet_013."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_READINESS = ROOT / "data" / "pathspecs" / "ghostclaw_lane1_packet013_decision_readiness_2026-06-29.json"
DEFAULT_WORKBENCH = ROOT / "data" / "pathspecs" / "ghostclaw_lane1_packet013_decision_workbench_2026-06-29.json"

BLOCKED_ACTIONS = {
    "deploy": False,
    "push": False,
    "cloud_mutation": False,
    "customer_send": False,
    "secret_read": False,
    "paid_provider_call": False,
    "provider_call": False,
    "runtime_queue_execution": False,
    "merge_script_execution": False,
    "install": False,
    "migration": False,
    "telegram_live_send": False,
    "external_message_send": False,
}


def load_json(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return payload


def choose_draft_option(readiness: dict[str, Any]) -> dict[str, Any]:
    options = readiness.get("decision_readiness", [])
    if not isinstance(options, list):
        options = []

    for decision_name in ("route_to_opus", "request_revision", "block"):
        for option in options:
            if option.get("decision") == decision_name and option.get("readiness") == "reviewable_local_only":
                return option

    return {
        "decision": "block",
        "readiness": "fallback_local_only",
        "evidence": [],
        "required_before_action": ["Hermes records a separate blocking decision with evidence paths."],
    }


def draft_reason(decision: str) -> str:
    if decision == "route_to_opus":
        return "route_to_opus is reviewable from local evidence while the Codex recorder gate remains closed."
    if decision == "request_revision":
        return "request_revision is reviewable from local evidence and keeps the Codex recorder gate closed."
    if decision == "block":
        return "No reviewable route/revision option was available, so the safe draft is block."
    return "Draft decision requires Hermes review before any gate state changes."


def build_decision_draft(readiness_path: Path | str = DEFAULT_READINESS, workbench_path: Path | str = DEFAULT_WORKBENCH) -> dict[str, Any]:
    readiness_path = Path(readiness_path)
    workbench_path = Path(workbench_path)
    readiness = load_json(readiness_path)
    workbench = load_json(workbench_path)
    selected = choose_draft_option(readiness)
    decision = str(selected.get("decision", "block"))
    evidence = [str(item) for item in selected.get("evidence", []) if str(item).strip()]
    required_before_action = [str(item) for item in selected.get("required_before_action", []) if str(item).strip()]
    required_before_action.append("WORKSPACE_SCAFFOLD/scripts/validate_lane1_hermes_decision.py")

    return {
        "schema": "ghostclaw.lane1.packet013_decision_draft.v1",
        "status": "draft_for_hermes_review_not_decision",
        "generated_at": "2026-06-29",
        "current_actionable_packet": str(readiness.get("current_actionable_packet", "packet_013")),
        "draft_decision": decision,
        "draft_reason": draft_reason(decision),
        "decision_record": False,
        "codex_recorder_gate_open": False,
        "lane2_authorized": False,
        "claims_final_opus_packet": False,
        "approval_scope": "hermes_decision_review_only",
        "source_readiness": str(readiness_path.relative_to(ROOT)) if readiness_path.is_absolute() and ROOT in readiness_path.parents else str(readiness_path),
        "source_workbench": str(workbench_path.relative_to(ROOT)) if workbench_path.is_absolute() and ROOT in workbench_path.parents else str(workbench_path),
        "reviewed_evidence_paths": evidence,
        "required_before_action": required_before_action,
        "current_blockers": list(workbench.get("current_blockers", [])),
        "blocked_actions": dict(BLOCKED_ACTIONS),
        "notes": "Draft-only Hermes-facing decision aid. This is not a decision record, not a final packet, and not a gate unlock.",
    }


def render_markdown(draft: dict[str, Any]) -> str:
    evidence = "\n".join(f"- `{path}`" for path in draft.get("reviewed_evidence_paths", [])) or "- none"
    blockers = "\n".join(f"- `{blocker}`" for blocker in draft.get("current_blockers", [])) or "- none"
    required = "\n".join(f"- `{item}`" for item in draft.get("required_before_action", [])) or "- none"
    blocked = draft["blocked_actions"]

    return f"""# SIRINX GhostClaw LANE 1 Packet 013 Hermes Decision Draft

Status: `HERMES_REVIEW_DECISION_DRAFT_NOT_RECORD`
Date: `2026-06-29`
Mode: local-only draft, no Hermes decision recorded

```text
decision={draft["draft_decision"]}
decision_record=false
codex_recorder_gate_open=false
lane2_authorized=false
approval_scope=hermes_decision_review_only
runtime_queue_execution=false
provider_call=false
```

{draft["draft_reason"]}

No Hermes decision is recorded by this draft.

## Reviewed Evidence

{evidence}

## Required Before Action

{required}

## Current Blockers

{blockers}

## Non-Actions

No deploy, push, cloud mutation, customer send, secret read, paid/provider call, runtime queue execution, Telegram live send, external message send, merge script, install, or migration is authorized.

```text
deploy={str(blocked["deploy"]).lower()}
push={str(blocked["push"]).lower()}
cloud_mutation={str(blocked["cloud_mutation"]).lower()}
customer_send={str(blocked["customer_send"]).lower()}
secret_read={str(blocked["secret_read"]).lower()}
paid_provider_call={str(blocked["paid_provider_call"]).lower()}
provider_call={str(blocked["provider_call"]).lower()}
runtime_queue_execution={str(blocked["runtime_queue_execution"]).lower()}
telegram_live_send={str(blocked["telegram_live_send"]).lower()}
external_message_send={str(blocked["external_message_send"]).lower()}
merge_script_execution={str(blocked["merge_script_execution"]).lower()}
install={str(blocked["install"]).lower()}
migration={str(blocked["migration"]).lower()}
```

## Validator Boundary

This draft intentionally omits the final Hermes decision record marker and
sets `decision_record=false`, so
`WORKSPACE_SCAFFOLD/scripts/validate_lane1_hermes_decision.py` must reject it as
a final decision record.
"""


def render_packet(draft: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": "packet_015",
        "project": "ghostclaw",
        "priority": "P0",
        "title": "Draft-only Hermes decision aid for LANE_1 packet_013",
        "agent": "codex",
        "status": "outbox",
        "risk": "safe",
        "input": [
            "data/pathspecs/ghostclaw_lane1_packet013_decision_draft_2026-06-29.json",
            "data/pathspecs/ghostclaw_lane1_packet013_decision_readiness_2026-06-29.json",
            "data/pathspecs/ghostclaw_lane1_packet013_decision_workbench_2026-06-29.json",
        ],
        "output": [
            "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_PACKET013_DECISION_DRAFT_2026-06-29.md",
            "_A2A_QUEUE/outbox/packet_015_ghostclaw_lane1_hermes_decision_draft.json",
        ],
        "approval_required": True,
        "approval_scope": "hermes_decision_review_only",
        "draft_decision": draft["draft_decision"],
        "decision_record": False,
        "codex_recorder_gate_open": False,
        "lane2_authorized": False,
        "dry_run": True,
        "live_send": False,
        "provider_call": False,
        "external_message_send": False,
        "runtime_queue_execution": False,
        "deploy": False,
        "push": False,
        "cloud_mutation": False,
        "customer_send": False,
        "secret_read": False,
        "paid_provider_call": False,
        "telegram_live_send": False,
        "notes": "Local outbox draft only. Hermes must record a separate final decision file before any gate state changes.",
    }


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--readiness", default=str(DEFAULT_READINESS))
    parser.add_argument("--workbench", default=str(DEFAULT_WORKBENCH))
    parser.add_argument("--json-output", help="Optional JSON draft output path.")
    parser.add_argument("--markdown-output", help="Optional Markdown draft output path.")
    parser.add_argument("--packet-output", help="Optional A2A packet output path.")
    return parser.parse_args(argv)


def write_text(path_text: str | None, content: str) -> None:
    if not path_text:
        return
    path = Path(path_text)
    if not path.is_absolute():
        path = ROOT / path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def write_json(path_text: str | None, payload: dict[str, Any]) -> None:
    if not path_text:
        return
    write_text(path_text, json.dumps(payload, indent=2, sort_keys=True) + "\n")


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    try:
        draft = build_decision_draft(args.readiness, args.workbench)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(
            json.dumps(
                {
                    "ok": False,
                    "reason": "decision_draft_build_failed",
                    "error": str(exc),
                    "decision_record": False,
                    "lane2_authorized": False,
                    "runtime_queue_execution": False,
                    "blocked_actions": dict(BLOCKED_ACTIONS),
                },
                indent=2,
            )
        )
        return 1

    write_json(args.json_output, draft)
    write_text(args.markdown_output, render_markdown(draft))
    write_json(args.packet_output, render_packet(draft))
    print(json.dumps({"ok": True, **draft}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
