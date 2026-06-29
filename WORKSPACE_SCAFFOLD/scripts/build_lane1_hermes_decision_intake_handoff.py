#!/usr/bin/env python3
"""Build a local-only handoff for recording a future LANE_1 Hermes decision.

The handoff tells Hermes/operator exactly where to record the decision and how
Codex will validate it. It never creates the decision file or mutates queue
state.
"""
import argparse
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VALIDATOR = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "validate_lane1_hermes_decision.py"
TRANSITION_GUARD = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "build_lane1_hermes_decision_transition_guard.py"
DECISION_PATH = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"
DOC_TEMPLATE = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION_TEMPLATE_2026-06-29.md"
JSON_TEMPLATE = ROOT / "WORKSPACE_SCAFFOLD" / "templates" / "ghostclaw_lane1_hermes_review_decision.template.json"
DEFAULT_JSON = ROOT / "data" / "pathspecs" / "ghostclaw_lane1_hermes_decision_intake_handoff_2026-06-29.json"
DEFAULT_DOC = (
    ROOT
    / "docs"
    / "knowledge"
    / "SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_INTAKE_HANDOFF_2026-06-29.md"
)

RECOMMENDED_EVIDENCE = [
    "_A2A_QUEUE/inbox/packet_013_ghostclaw_lane1_codex_recorder_gate_request.json",
    "data/pathspecs/ghostclaw_lane1_packet013_decision_workbench_2026-06-29.json",
    "data/pathspecs/ghostclaw_lane1_packet013_decision_readiness_2026-06-29.json",
    "data/pathspecs/ghostclaw_lane1_packet013_decision_draft_2026-06-29.json",
    "data/pathspecs/ghostclaw_lane1_hermes_decision_transition_guard_2026-06-29.json",
    "data/pathspecs/sirinx_codex_hermes_execution_queue_2026-06-29.json",
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
        return str(Path(path).resolve().relative_to(ROOT))
    except ValueError:
        return str(path)


def load_validator_module():
    spec = importlib.util.spec_from_file_location("lane1_decision_validator", VALIDATOR)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def build_handoff() -> dict:
    validator = load_validator_module()
    required_fields = sorted(validator.REQUIRED_FIELDS | set(validator.BLOCKED_ACTION_FIELDS))
    allowed_decisions = sorted(validator.ALLOWED_DECISIONS)
    validation_command = (
        "python3 WORKSPACE_SCAFFOLD/scripts/validate_lane1_hermes_decision.py "
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"
    )
    transition_command = (
        "python3 WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_transition_guard.py "
        "--decision docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"
    )

    return {
        "schema": "ghostclaw.lane1.hermes_decision_intake_handoff.v1",
        "status": "awaiting_hermes_decision_record",
        "generated_at": "2026-06-29",
        "current_actionable_packet": "packet_013",
        "decision_path": repo_path(DECISION_PATH),
        "template_paths": [repo_path(DOC_TEMPLATE), repo_path(JSON_TEMPLATE)],
        "validator": repo_path(VALIDATOR),
        "transition_guard": repo_path(TRANSITION_GUARD),
        "allowed_decisions": allowed_decisions,
        "required_fields": required_fields,
        "recommended_reviewed_evidence_paths": RECOMMENDED_EVIDENCE,
        "validation_commands": [validation_command, transition_command],
        "decision_record": False,
        "codex_recorder_gate_open": False,
        "lane2_authorized": False,
        "state_mutation_performed": False,
        "runtime_queue_execution": False,
        "provider_call": False,
        "blocked_actions": dict(BLOCKED_ACTIONS),
        "next_safe_action": (
            "Hermes records a separate local decision artifact, then Codex validates "
            "it and reruns the transition guard before any gate state change."
        ),
        "notes": "Handoff only. It does not create the Hermes decision file or authorize external action.",
    }


def render_markdown(handoff: dict, json_output: Path) -> str:
    decisions = "\n".join(f"- `{decision}`" for decision in handoff["allowed_decisions"])
    fields = "\n".join(f"- `{field}`" for field in handoff["required_fields"])
    evidence = "\n".join(f"- `{path}`" for path in handoff["recommended_reviewed_evidence_paths"])
    commands = "\n".join(handoff["validation_commands"])
    templates = "\n".join(f"- `{path}`" for path in handoff["template_paths"])
    return "\n".join(
        [
            "# SIRINX GhostClaw LANE_1 Hermes Decision Intake Handoff",
            "",
            "Status: `HERMES_DECISION_INTAKE_HANDOFF_LOCAL_ONLY`",
            "Date: `2026-06-29`",
            "Mode: local-only handoff, no decision record, no state mutation",
            "",
            "This handoff is not a Hermes decision.",
            "It only makes the missing `packet_013` decision step reproducible.",
            "",
            "```text",
            f"status={handoff['status']}",
            f"current_actionable_packet={handoff['current_actionable_packet']}",
            f"decision_path={handoff['decision_path']}",
            f"decision_record={str(handoff['decision_record']).lower()}",
            f"state_mutation_performed={str(handoff['state_mutation_performed']).lower()}",
            f"codex_recorder_gate_open={str(handoff['codex_recorder_gate_open']).lower()}",
            f"lane2_authorized={str(handoff['lane2_authorized']).lower()}",
            f"runtime_queue_execution={str(handoff['runtime_queue_execution']).lower()}",
            f"provider_call={str(handoff['provider_call']).lower()}",
            "```",
            "",
            "## Machine-Readable Handoff",
            "",
            "```text",
            repo_path(json_output),
            "```",
            "",
            "## Decision Templates",
            "",
            templates,
            "",
            "## Allowed Decisions",
            "",
            decisions,
            "",
            "## Required Fields",
            "",
            fields,
            "",
            "## Recommended Reviewed Evidence",
            "",
            evidence,
            "",
            "## Validation Commands",
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
            "gate opening, or LANE_2 authorization is performed by this handoff.",
            "",
            "## Next Safe Action",
            "",
            handoff["next_safe_action"],
            "",
        ]
    )


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Build local-only Hermes decision intake handoff")
    parser.add_argument("--json-output", default=str(DEFAULT_JSON))
    parser.add_argument("--markdown-output", default=str(DEFAULT_DOC))
    args = parser.parse_args(argv)

    handoff = build_handoff()
    json_output = Path(args.json_output)
    markdown_output = Path(args.markdown_output)
    write_json(json_output, handoff)
    markdown_output.parent.mkdir(parents=True, exist_ok=True)
    markdown_output.write_text(render_markdown(handoff, json_output), encoding="utf-8")
    print(json.dumps(handoff, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
