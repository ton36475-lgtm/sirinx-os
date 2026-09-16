#!/usr/bin/env python3
"""Build a local-only preflight audit for the LANE_1 Hermes decision gate.

The audit verifies that local review evidence is present for Hermes, while
keeping the decision, recorder gate, final Opus packet, and LANE_2 blocked.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "build_lane1_hermes_decision_preflight_audit.py"
DEFAULT_JSON = ROOT / "data" / "pathspecs" / "ghostclaw_lane1_hermes_decision_preflight_audit_2026-06-29.json"
DEFAULT_DOC = (
    ROOT
    / "docs"
    / "knowledge"
    / "SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_PREFLIGHT_AUDIT_2026-06-29.md"
)
DEFAULT_PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_017_ghostclaw_lane1_hermes_decision_preflight_audit.json"
HERMES_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"

REQUIRED_REVIEW_EVIDENCE = [
    "_A2A_QUEUE/inbox/packet_013_ghostclaw_lane1_codex_recorder_gate_request.json",
    "_A2A_QUEUE/outbox/packet_015_ghostclaw_lane1_hermes_decision_draft.json",
    "_A2A_QUEUE/outbox/packet_016_ghostclaw_lane1_hermes_decision_intake_handoff.json",
    "WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_draft.py",
    "WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_intake_handoff.py",
    "WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_transition_guard.py",
    "WORKSPACE_SCAFFOLD/scripts/validate_lane1_hermes_decision.py",
    "WORKSPACE_SCAFFOLD/templates/ghostclaw_lane1_hermes_review_decision.template.json",
    "data/pathspecs/ghostclaw_lane1_hermes_decision_inbox_2026-06-29.json",
    "data/pathspecs/ghostclaw_lane1_hermes_decision_intake_handoff_2026-06-29.json",
    "data/pathspecs/ghostclaw_lane1_hermes_decision_transition_guard_2026-06-29.json",
    "data/pathspecs/ghostclaw_lane1_hermes_decision_validator_2026-06-29.json",
    "data/pathspecs/ghostclaw_lane1_hermes_model_choice_boundary_2026-06-29.json",
    "data/pathspecs/ghostclaw_lane1_packet013_decision_draft_2026-06-29.json",
    "data/pathspecs/ghostclaw_lane1_packet013_decision_readiness_2026-06-29.json",
    "data/pathspecs/ghostclaw_lane1_packet013_decision_workbench_2026-06-29.json",
    "data/pathspecs/sirinx_codex_hermes_a2a_queue_status_2026-06-29.json",
    "data/pathspecs/sirinx_codex_hermes_execution_queue_2026-06-29.json",
    "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_INTAKE_HANDOFF_2026-06-29.md",
    "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_TRANSITION_GUARD_2026-06-29.md",
    "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_MODEL_CHOICE_BOUNDARY_2026-06-29.md",
    "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION_TEMPLATE_2026-06-29.md",
    "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_PACKET013_DECISION_DRAFT_2026-06-29.md",
    "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_PACKET013_DECISION_READINESS_2026-06-29.md",
]

ALLOWED_DECISIONS = [
    "block",
    "open_codex_recorder_gate",
    "request_revision",
    "route_to_opus",
]

BLOCKED_ACTIONS = {
    "cloud_mutation": False,
    "customer_send": False,
    "deploy": False,
    "external_message_send": False,
    "install": False,
    "merge_script_execution": False,
    "migration": False,
    "paid_provider_call": False,
    "provider_call": False,
    "push": False,
    "runtime_queue_execution": False,
    "secret_read": False,
    "telegram_live_send": False,
}


def repo_path(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path)


def existing(pathspec: str) -> bool:
    return (ROOT / pathspec).exists()


def build_preflight_audit() -> dict:
    missing_review_evidence = [pathspec for pathspec in REQUIRED_REVIEW_EVIDENCE if not existing(pathspec)]
    missing_gate_artifacts = [
        repo_path(path)
        for path in (HERMES_DECISION, FINAL_PACKET)
        if not path.exists()
    ]
    review_evidence_complete = not missing_review_evidence

    return {
        "schema": "ghostclaw.lane1.hermes_decision_preflight_audit.v1",
        "status": (
            "ready_for_hermes_decision_review_not_decision"
            if review_evidence_complete
            else "blocked_missing_review_evidence"
        ),
        "generated_at": "2026-06-29",
        "evidence_boundary": "local_evidence_only",
        "current_actionable_packet": "packet_013",
        "decision_path": repo_path(HERMES_DECISION),
        "final_packet_path": repo_path(FINAL_PACKET),
        "allowed_decisions": list(ALLOWED_DECISIONS),
        "review_evidence_paths": list(REQUIRED_REVIEW_EVIDENCE),
        "missing_review_evidence": missing_review_evidence,
        "review_evidence_complete": review_evidence_complete,
        "missing_gate_artifacts": missing_gate_artifacts,
        "ready_for_hermes_decision_review": review_evidence_complete,
        "decision_record": False,
        "hermes_decision_recorded": HERMES_DECISION.exists(),
        "codex_recorder_gate_open": False,
        "ready_for_codex_recorder": False,
        "lane2_authorized": False,
        "ready_for_lane2": False,
        "state_mutation_performed": False,
        "runtime_queue_execution": False,
        "provider_call": False,
        "model_assistance_scope": "any_model_allowed_for_vibe_coding_drafts_only_no_gate_approval",
        "validation_commands": [
            "python3 WORKSPACE_SCAFFOLD/scripts/validate_lane1_hermes_decision.py "
            "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md",
            "python3 WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_transition_guard.py "
            "--decision docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md",
        ],
        "blocked_actions": dict(BLOCKED_ACTIONS),
        "next_safe_action": (
            "Hermes records a separate local decision artifact, then Codex validates it "
            "and reruns the transition guard before any recorder-gate, final-packet, or LANE_2 action."
        ),
        "notes": (
            "Preflight audit only. It confirms local evidence readiness for Hermes review, "
            "but does not create a decision record or clear any execution gate."
        ),
    }


def build_packet(audit: dict, json_output: Path, markdown_output: Path, packet_output: Path) -> dict:
    return {
        "id": "packet_017",
        "project": "ghostclaw",
        "priority": "P0",
        "agent": "codex",
        "title": "Hermes decision preflight audit for LANE_1 packet_013",
        "status": "outbox",
        "risk": "safe",
        "approval_required": True,
        "approval_scope": "hermes_decision_review_only",
        "current_actionable_packet": audit["current_actionable_packet"],
        "ready_for_hermes_decision_review": audit["ready_for_hermes_decision_review"],
        "decision_path": audit["decision_path"],
        "decision_record": False,
        "codex_recorder_gate_open": False,
        "lane2_authorized": False,
        "dry_run": True,
        "live_send": False,
        "input": [
            repo_path(json_output),
            repo_path(markdown_output),
            repo_path(SCRIPT),
            "_A2A_QUEUE/outbox/packet_016_ghostclaw_lane1_hermes_decision_intake_handoff.json",
            "data/pathspecs/ghostclaw_lane1_hermes_decision_intake_handoff_2026-06-29.json",
            "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_INTAKE_HANDOFF_2026-06-29.md",
            "data/pathspecs/ghostclaw_lane1_hermes_decision_transition_guard_2026-06-29.json",
            "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_TRANSITION_GUARD_2026-06-29.md",
            "data/pathspecs/ghostclaw_lane1_hermes_model_choice_boundary_2026-06-29.json",
        ],
        "output": [
            repo_path(packet_output),
            audit["decision_path"],
        ],
        "next_validation_commands": list(audit["validation_commands"]),
        "blocked_by": [
            "BLOCK-LANE1-OPUS-PACKET",
            "BLOCK-HERMES-GATEWAY",
        ],
        "notes": (
            "Preflight audit only. This packet does not create a Hermes decision, "
            "does not open the Codex recorder gate, does not execute a queue item, "
            "and does not authorize LANE_2 or any external action."
        ),
        **dict(BLOCKED_ACTIONS),
    }


def render_markdown(audit: dict, json_output: Path, packet_output: Path) -> str:
    evidence = "\n".join(f"- `{path}`" for path in audit["review_evidence_paths"])
    missing_gate_artifacts = "\n".join(f"- `{path}`" for path in audit["missing_gate_artifacts"])
    decisions = "\n".join(f"- `{decision}`" for decision in audit["allowed_decisions"])
    commands = "\n".join(audit["validation_commands"])
    return "\n".join(
        [
            "# SIRINX GhostClaw LANE_1 Hermes Decision Preflight Audit",
            "",
            "Status: `GHOSTCLAW_LANE1_HERMES_DECISION_PREFLIGHT_AUDIT_LOCAL_ONLY`",
            "Date: `2026-06-29`",
            "Mode: local-only review readiness, no decision record, no state mutation",
            "",
            "This preflight audit is not a Hermes decision.",
            "It only confirms local evidence readiness before Hermes records a separate decision.",
            "",
            "```text",
            f"status={audit['status']}",
            f"current_actionable_packet={audit['current_actionable_packet']}",
            f"review_evidence_complete={str(audit['review_evidence_complete']).lower()}",
            f"ready_for_hermes_decision_review={str(audit['ready_for_hermes_decision_review']).lower()}",
            f"decision_record={str(audit['decision_record']).lower()}",
            f"hermes_decision_recorded={str(audit['hermes_decision_recorded']).lower()}",
            f"codex_recorder_gate_open={str(audit['codex_recorder_gate_open']).lower()}",
            f"ready_for_codex_recorder={str(audit['ready_for_codex_recorder']).lower()}",
            f"lane2_authorized={str(audit['lane2_authorized']).lower()}",
            f"ready_for_lane2={str(audit['ready_for_lane2']).lower()}",
            f"runtime_queue_execution={str(audit['runtime_queue_execution']).lower()}",
            f"provider_call={str(audit['provider_call']).lower()}",
            f"model_assistance_scope={audit['model_assistance_scope']}",
            "```",
            "",
            "## Machine-Readable Audit",
            "",
            "```text",
            repo_path(json_output),
            repo_path(packet_output),
            "```",
            "",
            "## Allowed Decision Values",
            "",
            decisions,
            "",
            "## Review Evidence Checked",
            "",
            evidence,
            "",
            "## Gate Artifacts Still Missing",
            "",
            missing_gate_artifacts,
            "",
            "## Validation Commands After Hermes Records A Decision",
            "",
            "```bash",
            commands,
            "```",
            "",
            "## Non-Actions",
            "",
            "No deploy, push, cloud mutation, customer send, secret read, paid/provider call,",
            "provider call, runtime queue execution, Telegram live send, external message send,",
            "merge script, install, migration, decision record, state mutation, Codex recorder",
            "gate opening, final Opus packet creation, or LANE_2 authorization is performed by this audit.",
            "",
            "## Next Safe Action",
            "",
            audit["next_safe_action"],
            "",
        ]
    )


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json-output", default=str(DEFAULT_JSON))
    parser.add_argument("--markdown-output", default=str(DEFAULT_DOC))
    parser.add_argument("--packet-output", default=str(DEFAULT_PACKET))
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    json_output = Path(args.json_output)
    markdown_output = Path(args.markdown_output)
    packet_output = Path(args.packet_output)

    audit = build_preflight_audit()
    packet = build_packet(audit, json_output, markdown_output, packet_output)
    write_json(json_output, audit)
    markdown_output.parent.mkdir(parents=True, exist_ok=True)
    markdown_output.write_text(render_markdown(audit, json_output, packet_output), encoding="utf-8")
    write_json(packet_output, packet)
    print(json.dumps(audit, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
