#!/usr/bin/env python3
"""Build a local-only transition guard for a future LANE_1 Hermes decision.

This script maps a validated Hermes decision to the next local transition, but
it does not create the decision, mutate queue state, or open runtime gates.
"""
import argparse
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VALIDATOR = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "validate_lane1_hermes_decision.py"
DEFAULT_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"
DEFAULT_JSON = ROOT / "data" / "pathspecs" / "ghostclaw_lane1_hermes_decision_transition_guard_2026-06-29.json"
DEFAULT_DOC = (
    ROOT
    / "docs"
    / "knowledge"
    / "SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_TRANSITION_GUARD_2026-06-29.md"
)

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

TRANSITION_MATRIX = {
    "route_to_opus": "await_opus_architecture_packet",
    "request_revision": "return_to_codex_draft_revision",
    "open_codex_recorder_gate": "codex_recorder_draft_allowed_local_docs_only",
    "block": "record_blocker_and_keep_lane1_closed",
}


def repo_path(path: Path) -> str:
    path = Path(path)
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path)


def load_validator_module():
    spec = importlib.util.spec_from_file_location("lane1_decision_validator", VALIDATOR)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def base_guard(decision_path: Path) -> dict:
    return {
        "schema": "ghostclaw.lane1.hermes_decision_transition_guard.v1",
        "generated_at": "2026-06-29",
        "current_actionable_packet": "packet_013",
        "decision_path": repo_path(decision_path),
        "validator": [repo_path(VALIDATOR)],
        "decision_record": False,
        "validated_decision": None,
        "transition_allowed": False,
        "next_transition": "wait_for_hermes_decision",
        "codex_recorder_gate_open": False,
        "lane2_authorized": False,
        "state_mutation_performed": False,
        "runtime_queue_execution": False,
        "provider_call": False,
        "blocked_actions": dict(BLOCKED_ACTIONS),
        "allowed_transitions": dict(TRANSITION_MATRIX),
        "errors": [],
        "evidence_paths": [],
        "notes": "Local transition guard only. It does not create a Hermes decision, mutate queue state, or authorize external action.",
    }


def build_transition_guard(decision_path: Path = DEFAULT_DECISION) -> dict:
    decision_path = Path(decision_path)
    if not decision_path.is_absolute():
        decision_path = ROOT / decision_path

    guard = base_guard(decision_path)
    if not decision_path.exists():
        guard["status"] = "blocked_missing_hermes_decision"
        guard["errors"] = ["missing_hermes_decision"]
        return guard

    validator = load_validator_module()
    result = validator.validate_decision_text(decision_path.read_text(encoding="utf-8"), ROOT)
    guard["validated_decision"] = result.decision
    guard["evidence_paths"] = result.evidence_paths

    if not result.ok:
        guard["status"] = "blocked_invalid_hermes_decision"
        guard["errors"] = result.errors
        return guard

    decision = result.decision
    guard["status"] = "validated_decision_transition_ready"
    guard["decision_record"] = True
    guard["transition_allowed"] = True
    guard["next_transition"] = TRANSITION_MATRIX[decision]
    guard["codex_recorder_gate_open"] = decision == "open_codex_recorder_gate"
    guard["errors"] = []
    return guard


def render_markdown(guard: dict, json_output: Path) -> str:
    action_line = (
        "No deploy, push, cloud mutation, customer send, secret read, paid/provider call, "
        "provider call, runtime queue execution, Telegram live send, external message send, "
        "merge script, install, or migration is authorized."
    )
    transitions = "\n".join(
        f"- `{decision}` -> `{transition}`" for decision, transition in guard["allowed_transitions"].items()
    )
    errors = ", ".join(guard["errors"]) if guard["errors"] else "none"
    evidence = "\n".join(f"- `{path}`" for path in guard.get("evidence_paths", [])) or "- none"
    return "\n".join(
        [
            "# SIRINX GhostClaw LANE_1 Hermes Decision Transition Guard",
            "",
            "Status: `HERMES_DECISION_TRANSITION_GUARD_NOT_DECISION`",
            "Date: `2026-06-29`",
            "Mode: local-only transition guard, no state mutation",
            "",
            "This guard is not a Hermes decision and not a final Opus architecture packet.",
            "It only maps a future validated Hermes decision to the next local transition.",
            "",
            "```text",
            f"status={guard['status']}",
            f"current_actionable_packet={guard['current_actionable_packet']}",
            f"validated_decision={guard['validated_decision']}",
            f"transition_allowed={str(guard['transition_allowed']).lower()}",
            f"next_transition={guard['next_transition']}",
            f"decision_record={str(guard['decision_record']).lower()}",
            f"codex_recorder_gate_open={str(guard['codex_recorder_gate_open']).lower()}",
            f"lane2_authorized={str(guard['lane2_authorized']).lower()}",
            f"runtime_queue_execution={str(guard['runtime_queue_execution']).lower()}",
            f"provider_call={str(guard['provider_call']).lower()}",
            "```",
            "",
            "## Machine-Readable Guard",
            "",
            "```text",
            repo_path(json_output),
            repo_path(VALIDATOR),
            "```",
            "",
            "## Transition Matrix",
            "",
            transitions,
            "",
            "## Reviewed Evidence",
            "",
            evidence,
            "",
            "## Errors",
            "",
            f"`{errors}`",
            "",
            "## Non-Actions",
            "",
            "No Hermes decision is created by this guard.",
            "",
            action_line,
            "",
            "A validated `open_codex_recorder_gate` decision can only make a local docs-only",
            "Codex recorder transition ready. It still does not authorize LANE_2, provider",
            "calls, runtime queue execution, deploy, push, cloud mutation, or customer send.",
            "",
            "## Verification",
            "",
            "```bash",
            "python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_lane1_hermes_decision_transition_guard -v",
            "python3 -m json.tool data/pathspecs/ghostclaw_lane1_hermes_decision_transition_guard_2026-06-29.json > /dev/null",
            "git diff --check",
            "```",
            "",
        ]
    )


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Build a local-only Hermes decision transition guard")
    parser.add_argument("--decision", default=str(DEFAULT_DECISION))
    parser.add_argument("--json-output", default=str(DEFAULT_JSON))
    parser.add_argument("--markdown-output", default=str(DEFAULT_DOC))
    args = parser.parse_args(argv)

    guard = build_transition_guard(Path(args.decision))
    json_output = Path(args.json_output)
    markdown_output = Path(args.markdown_output)
    write_json(json_output, guard)
    markdown_output.parent.mkdir(parents=True, exist_ok=True)
    markdown_output.write_text(render_markdown(guard, json_output), encoding="utf-8")
    print(json.dumps(guard, indent=2, sort_keys=True))

    if guard["status"] == "blocked_missing_hermes_decision":
        return 2
    if guard["status"] == "blocked_invalid_hermes_decision":
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
