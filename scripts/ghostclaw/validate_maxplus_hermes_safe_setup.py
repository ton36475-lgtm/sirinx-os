#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MISSION_ID = "MAXPLUS-HERMES-CHINESE-MODEL-20260630"
REQUIRED_FILES = [
    "docs/ghostclaw/MAXPLUS_HERMES_CHINESE_MODEL_SAFE_SETUP.md",
    "docs/ghostclaw/MAXPLUS_HERMES_SECRET_HANDLING_POLICY.md",
    "docs/ghostclaw/MAXPLUS_HERMES_PROVIDER_CALL_GATE.md",
    "docs/ghostclaw/MAXPLUS_HERMES_COMPLETION_AUDIT.md",
    "docs/ghostclaw/MAXPLUS_HERMES_GOAL_FIDELITY_AUDIT.md",
    "docs/ghostclaw/MAXPLUS_HERMES_REQUIREMENT_EVIDENCE_MATRIX.md",
    "docs/ghostclaw/MAXPLUS_HERMES_ADVANCED_FEATURE_GATES.md",
    "docs/ghostclaw/MAXPLUS_HERMES_OPERATOR_RUNBOOK.md",
    "docs/ghostclaw/MAXPLUS_HERMES_ACTIVATION_CONTROLLER.md",
    "docs/ghostclaw/MAXPLUS_HERMES_OWNER_RUNTIME_HANDOFF.md",
    "docs/ghostclaw/MAXPLUS_HERMES_RUNTIME_COMPLETION_VERIFIER.md",
    "docs/ghostclaw/MAXPLUS_HERMES_RUNTIME_GATE_EXECUTOR.md",
    "docs/ghostclaw/templates/hermes-maxplus-config.yaml.template",
    "docs/ghostclaw/templates/hermes-maxplus-env.template",
    "scripts/launchers/hermes-maxplus-openai-chat-safe",
    "scripts/ghostclaw/apply_hermes_maxplus_private_config.py",
    "scripts/ghostclaw/hermes_maxplus_gate_runner.py",
    "scripts/ghostclaw/hermes_maxplus_goal_fidelity_audit.py",
    "scripts/ghostclaw/hermes_maxplus_runtime_gate_executor.py",
    "scripts/ghostclaw/hermes_maxplus_activation_controller.py",
    "scripts/ghostclaw/hermes_maxplus_runtime_handoff.py",
    "scripts/ghostclaw/hermes_maxplus_runtime_completion_verifier.py",
    "scripts/ghostclaw/hermes_cli_offline_preflight.py",
    "scripts/ghostclaw/hermes_maxplus_preflight.py",
    "scripts/ghostclaw/validate_maxplus_hermes_safe_setup.py",
    ".ghostclaw_runtime/a2a2a/blocked/MAXPLUS-HERMES-CHINESE-MODEL-20260630.blocked_actions.json",
    ".ghostclaw_runtime/a2a2a/gates/MAXPLUS-HERMES-CHINESE-MODEL-20260630.provider_smoke_gate.json",
    ".ghostclaw_runtime/a2a2a/gates/MAXPLUS-HERMES-CHINESE-MODEL-20260630.advanced_feature_gates.json",
    ".ghostclaw_runtime/a2a2a/gates/MAXPLUS-HERMES-CHINESE-MODEL-20260630.owner_runtime_handoff.json",
    ".ghostclaw_runtime/a2a2a/outbox/hermes/MAXPLUS-HERMES-CHINESE-MODEL-20260630.telegram_report_draft.md",
    ".ghostclaw_runtime/a2a2a/outbox/hermes/MAXPLUS-HERMES-CHINESE-MODEL-20260630.owner_runtime_handoff.md",
    ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.private_config_apply_dry_run.json",
    ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.gate_runner_all_dry_run.json",
    ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.hermes_cli_offline_preflight.json",
    ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.goal_fidelity_audit.json",
    ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.preflight.json",
    ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_cron_dry_run.json",
    ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_doctor.json",
    ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_gateway_setup.json",
    ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_mcp_connector.json",
    ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_model_picker.json",
    ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_provider_smoke.json",
    ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_status.json",
    ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_subagent_local.json",
    ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller_plan.json",
    ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller_status.json",
    ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_completion_verification.json",
    ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.goal_fidelity_receipt.json",
    ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller.receipt.json",
    ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.owner_runtime_handoff.receipt.json",
    ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_completion_verification.receipt.json",
    ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_cron_dry_run.receipt.json",
    ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_doctor.receipt.json",
    ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_gateway_setup.receipt.json",
    ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_mcp_connector.receipt.json",
    ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_model_picker.receipt.json",
    ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_provider_smoke.receipt.json",
    ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_status.receipt.json",
    ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_subagent_local.receipt.json",
    ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_executor_receipt.json",
    ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.safe_setup_receipt.json",
]

DYNAMIC_CHECKSUM_EXCLUDE = {
    ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.safe_setup_validation.json",
    ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.safe_setup_receipt.json",
}

REQUIRED_MARKERS = {
    "docs/ghostclaw/templates/hermes-maxplus-config.yaml.template": [
        "maxplus-codex",
        "transport: openai_chat",
        "api_mode: openai_chat",
        "deepseek-v4-flash",
        "glm-5.2",
        "custom:maxplus-codex",
    ],
    "docs/ghostclaw/templates/hermes-maxplus-env.template": [
        "REPLACE_WITH_PRIVATE_MAXPLUS_CODEX_KEY",
        "MAXPLUS_CODEX_API_KEY",
        "HERMES_INFERENCE_PROVIDER=custom:maxplus-codex",
    ],
    "docs/ghostclaw/MAXPLUS_HERMES_CHINESE_MODEL_SAFE_SETUP.md": [
        "does not copy the key",
        "does not write `~/.hermes/.env`",
        "provider-call gate",
        "scripts/launchers/hermes-maxplus-openai-chat-safe",
    ],
    "docs/ghostclaw/MAXPLUS_HERMES_PROVIDER_CALL_GATE.md": [
        "APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN",
        "Runtime provider smoke is still closed.",
        "one minimal non-private smoke prompt",
    ],
    "docs/ghostclaw/MAXPLUS_HERMES_COMPLETION_AUDIT.md": [
        "Requirement Matrix",
        "The full pasted objective is not complete",
        "Fresh Fidelity Evidence",
        "repo_side_review_ready_full_runtime_incomplete",
        "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1",
        "APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN",
    ],
    "docs/ghostclaw/MAXPLUS_HERMES_GOAL_FIDELITY_AUDIT.md": [
        "Goal Fidelity Audit",
        "secret-like text",
        "full pasted objective remains incomplete",
        "repo-side local-safe setup is review-ready",
    ],
    "docs/ghostclaw/MAXPLUS_HERMES_REQUIREMENT_EVIDENCE_MATRIX.md": [
        "repo_side_review_ready_full_runtime_incomplete",
        "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1",
        "APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN=1",
        "connector-specific MCP gate",
    ],
    "docs/ghostclaw/MAXPLUS_HERMES_ADVANCED_FEATURE_GATES.md": [
        "APPROVE_REVIEW_HERMES_INSTALLER_ONLY",
        "APPROVE_HERMES_GATEWAY_LOCAL_SETUP",
        "APPROVE_HERMES_CRON_LOCAL_DRY_RUN",
        "CONNECTOR_SPECIFIC_MCP_GATE_REQUIRED",
    ],
    "docs/ghostclaw/MAXPLUS_HERMES_OPERATOR_RUNBOOK.md": [
        "Activation Sequence",
        "python3 scripts/ghostclaw/hermes_maxplus_gate_runner.py --all --dry-run",
        "python3 scripts/ghostclaw/hermes_maxplus_runtime_gate_executor.py --all",
        "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1",
        "APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN",
        "python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --plan",
        "python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --status",
    ],
    "docs/ghostclaw/MAXPLUS_HERMES_ACTIVATION_CONTROLLER.md": [
        "Activation Controller",
        "--execute-stage",
        "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG",
        "APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN",
        "CONNECTOR_SPECIFIC_MCP_GATE_REQUIRED",
    ],
    "docs/ghostclaw/MAXPLUS_HERMES_OWNER_RUNTIME_HANDOFF.md": [
        "Owner Runtime Handoff",
        "ready_for_owner_terminal_gate",
        "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1",
        "activation_controller_runtime_status.json",
        "APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN=1",
    ],
    "docs/ghostclaw/MAXPLUS_HERMES_RUNTIME_COMPLETION_VERIFIER.md": [
        "Runtime Completion Verifier",
        "runtime_incomplete_waiting_for_owner_gate",
        "Dependency OK",
        "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1",
    ],
    "docs/ghostclaw/MAXPLUS_HERMES_RUNTIME_GATE_EXECUTOR.md": [
        "Runtime Gate Executor",
        "--execute",
        "APPROVE_HERMES_DOCTOR_CONFIG_CHECK",
        "APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN",
        "Plan-Only Gates",
    ],
    "scripts/launchers/hermes-maxplus-openai-chat-safe": [
        "--dry-run",
        "MAXPLUS_CODEX_API_KEY",
        "custom:maxplus-codex",
        "deepseek-v4-flash",
        "Secret value presence was checked but not printed.",
    ],
    "scripts/ghostclaw/hermes_maxplus_preflight.py": [
        "secret_files_read",
        "provider_calls_executed",
        "launcher_dry_run",
        "runtime_ready",
    ],
    "scripts/ghostclaw/apply_hermes_maxplus_private_config.py": [
        "--dry-run",
        "--write",
        "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG",
        "secret_value_printed",
    ],
    "scripts/ghostclaw/hermes_maxplus_gate_runner.py": [
        "--dry-run",
        "APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN",
        "provider_call_executed",
        "live_send_executed",
    ],
    "scripts/ghostclaw/hermes_maxplus_goal_fidelity_audit.py": [
        "OBJECTIVE_PATH",
        "objective_contains_secret_like_text",
        "repo_side_review_ready_full_runtime_incomplete",
        "provider_call_executed",
        "gateway_started",
        "cron_activated",
        "mcp_mutated",
    ],
    "scripts/ghostclaw/hermes_maxplus_runtime_gate_executor.py": [
        "GATES",
        "APPROVE_HERMES_DOCTOR_CONFIG_CHECK",
        "APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN",
        "secret_value_printed",
        "live_send_intended",
        "checksum",
    ],
    "scripts/ghostclaw/hermes_maxplus_activation_controller.py": [
        "STAGES",
        "private_config_write",
        "provider_smoke",
        "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG",
        "APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN",
        "private_env_values_read",
        "secret_value_printed",
        "checksum",
    ],
    "scripts/ghostclaw/hermes_maxplus_runtime_handoff.py": [
        "COMMAND_STEPS",
        "owner_runtime_handoff",
        "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1",
        "activation_controller_runtime_status.json",
        "secret_value_included",
        "checksum",
    ],
    "scripts/ghostclaw/hermes_maxplus_runtime_completion_verifier.py": [
        "REQUIRED_RUNTIME_STAGES",
        "runtime_incomplete_waiting_for_owner_gate",
        "runtime_complete_evidence_verified",
        "private_env_values_read",
        "provider_call_executed_by_verifier",
        "dependency_ok",
        "checksum",
    ],
    "scripts/ghostclaw/hermes_cli_offline_preflight.py": [
        "hermes --help",
        "hermes --version",
        "commands_skipped_by_policy",
        "provider_calls_executed",
    ],
}

SECRET_PATTERNS = [
    re.compile(r"ccsk-[A-Za-z0-9]{20,}"),
    re.compile(r"sk-[A-Za-z0-9]{20,}"),
    re.compile(r"AKIA[A-Z0-9]{16}"),
    re.compile(r"BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY"),
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    failures: list[str] = []
    passed: list[str] = []
    checksums: dict[str, str] = {}

    for rel in REQUIRED_FILES:
        path = ROOT / rel
        if not path.exists():
            failures.append(f"missing required file: {rel}")
            continue
        passed.append(f"exists: {rel}")
        if rel not in DYNAMIC_CHECKSUM_EXCLUDE:
            checksums[rel] = sha256(path)

    for rel, markers in REQUIRED_MARKERS.items():
        path = ROOT / rel
        if not path.exists():
            continue
        body = path.read_text(encoding="utf-8")
        for marker in markers:
            if marker in body:
                passed.append(f"marker present: {rel}: {marker}")
            else:
                failures.append(f"missing marker: {rel}: {marker}")

    for rel in REQUIRED_FILES:
        path = ROOT / rel
        if not path.exists() or path.suffix in {".pyc"}:
            continue
        body = path.read_text(encoding="utf-8", errors="replace")
        for pattern in SECRET_PATTERNS:
            if pattern.search(body):
                failures.append(f"secret-like literal found in {rel}: {pattern.pattern}")

    for rel in [
        ".ghostclaw_runtime/a2a2a/blocked/MAXPLUS-HERMES-CHINESE-MODEL-20260630.blocked_actions.json",
        ".ghostclaw_runtime/a2a2a/gates/MAXPLUS-HERMES-CHINESE-MODEL-20260630.advanced_feature_gates.json",
        ".ghostclaw_runtime/a2a2a/gates/MAXPLUS-HERMES-CHINESE-MODEL-20260630.provider_smoke_gate.json",
        ".ghostclaw_runtime/a2a2a/gates/MAXPLUS-HERMES-CHINESE-MODEL-20260630.owner_runtime_handoff.json",
        ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.gate_runner_all_dry_run.json",
        ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.goal_fidelity_audit.json",
        ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.private_config_apply_dry_run.json",
        ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.hermes_cli_offline_preflight.json",
        ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.preflight.json",
        ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_cron_dry_run.json",
        ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_doctor.json",
        ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_gateway_setup.json",
        ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_mcp_connector.json",
        ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_model_picker.json",
        ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_provider_smoke.json",
        ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_status.json",
        ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_subagent_local.json",
        ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller_plan.json",
        ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller_status.json",
        ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_completion_verification.json",
        ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.goal_fidelity_receipt.json",
        ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller.receipt.json",
        ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.owner_runtime_handoff.receipt.json",
        ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_completion_verification.receipt.json",
        ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_cron_dry_run.receipt.json",
        ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_doctor.receipt.json",
        ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_gateway_setup.receipt.json",
        ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_mcp_connector.receipt.json",
        ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_model_picker.receipt.json",
        ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_provider_smoke.receipt.json",
        ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_status.receipt.json",
        ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_subagent_local.receipt.json",
        ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_executor_receipt.json",
        ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.safe_setup_receipt.json",
    ]:
        path = ROOT / rel
        if path.exists():
            try:
                load_json(path)
                passed.append(f"json parses: {rel}")
            except json.JSONDecodeError as exc:
                failures.append(f"json parse failed: {rel}: {exc}")

    advanced_gate_path = ROOT / ".ghostclaw_runtime/a2a2a/gates/MAXPLUS-HERMES-CHINESE-MODEL-20260630.advanced_feature_gates.json"
    if advanced_gate_path.exists():
        gate_doc = load_json(advanced_gate_path)
        gate_items = gate_doc.get("gates", []) if isinstance(gate_doc, dict) else []
        if gate_items and all(item.get("default") == "closed" for item in gate_items):
            passed.append("advanced feature gates all default closed")
        else:
            failures.append("advanced feature gates must all default to closed")

    activation_status_path = ROOT / ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller_status.json"
    if activation_status_path.exists():
        status_doc = load_json(activation_status_path)
        if status_doc.get("mode") == "status" and status_doc.get("status") == "safe_status_recorded":
            passed.append("activation controller status evidence recorded")
        else:
            failures.append("activation controller status evidence must be mode=status and status=safe_status_recorded")
        policy = status_doc.get("policy", {}) if isinstance(status_doc, dict) else {}
        forbidden_policy_flags = [
            "secret_value_printed",
            "private_env_values_read",
            "provider_call_executed",
            "gateway_started",
            "cron_activated",
            "mcp_mutated",
        ]
        if all(policy.get(flag) is False for flag in forbidden_policy_flags):
            passed.append("activation controller status policy flags remain false")
        else:
            failures.append("activation controller status policy flags must all remain false")
        results = status_doc.get("results", []) if isinstance(status_doc, dict) else []
        expected_stages = {
            "private_config_dry_run",
            "preflight",
            "cli_offline_preflight",
            "runtime_gate_inventory",
        }
        result_by_stage = {
            item.get("stage"): item.get("result", {})
            for item in results
            if isinstance(item, dict)
        }
        missing_stages = expected_stages - set(result_by_stage)
        if missing_stages:
            failures.append(f"activation controller status missing stages: {sorted(missing_stages)}")
        elif all(result_by_stage[stage].get("exit_code") == 0 for stage in expected_stages):
            passed.append("activation controller status safe probes exit 0")
        else:
            failures.append("activation controller status safe probes must all exit 0")

    owner_handoff_path = ROOT / ".ghostclaw_runtime/a2a2a/gates/MAXPLUS-HERMES-CHINESE-MODEL-20260630.owner_runtime_handoff.json"
    if owner_handoff_path.exists():
        owner_handoff = load_json(owner_handoff_path)
        if owner_handoff.get("status") == "ready_for_owner_terminal_gate":
            passed.append("owner runtime handoff is ready for owner terminal gate")
        else:
            failures.append("owner runtime handoff status must be ready_for_owner_terminal_gate")
        policy = owner_handoff.get("policy", {}) if isinstance(owner_handoff, dict) else {}
        forbidden_policy_flags = [
            "secret_value_included",
            "private_env_values_read",
            "provider_call_executed",
            "gateway_started",
            "cron_activated",
            "subagent_started",
            "mcp_mutated",
            "push_executed",
            "deploy_executed",
        ]
        if all(policy.get(flag) is False for flag in forbidden_policy_flags):
            passed.append("owner runtime handoff policy flags remain false")
        else:
            failures.append("owner runtime handoff policy flags must all remain false")
        required_sequence = owner_handoff.get("required_owner_sequence", [])
        if len(required_sequence) == 6 and owner_handoff.get("next_gate") == "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1":
            passed.append("owner runtime handoff has expected six-step gate sequence")
        else:
            failures.append("owner runtime handoff must have six-step sequence and private-config next gate")
        plan_only = set(owner_handoff.get("plan_only_advanced_gates", []))
        if {"gateway_setup", "cron_dry_run", "subagent_local", "mcp_connector"}.issubset(plan_only):
            passed.append("owner runtime handoff keeps advanced gates plan-only")
        else:
            failures.append("owner runtime handoff must keep gateway/cron/subagent/mcp plan-only")

    runtime_completion_path = ROOT / ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_completion_verification.json"
    if runtime_completion_path.exists():
        runtime_completion = load_json(runtime_completion_path)
        if runtime_completion.get("overall_status") == "runtime_incomplete_waiting_for_owner_gate":
            passed.append("runtime completion verifier truthfully reports current runtime incomplete")
        else:
            failures.append("runtime completion verifier must report runtime_incomplete_waiting_for_owner_gate until owner gates run")
        if runtime_completion.get("runtime_complete") is False and runtime_completion.get("incomplete_stage_count") == 6:
            passed.append("runtime completion verifier tracks six incomplete owner-gated stages")
        else:
            failures.append("runtime completion verifier must track six incomplete stages before owner activation")
        policy = runtime_completion.get("policy", {}) if isinstance(runtime_completion, dict) else {}
        forbidden_policy_flags = [
            "secret_values_read",
            "private_env_values_read",
            "provider_call_executed_by_verifier",
            "gateway_started_by_verifier",
            "cron_activated_by_verifier",
            "mcp_mutated_by_verifier",
            "push_executed_by_verifier",
            "deploy_executed_by_verifier",
        ]
        if all(policy.get(flag) is False for flag in forbidden_policy_flags):
            passed.append("runtime completion verifier policy flags remain false")
        else:
            failures.append("runtime completion verifier policy flags must all remain false")
        stage_checks = runtime_completion.get("stage_checks", [])
        if len(stage_checks) == 6 and all("dependency_ok" in item for item in stage_checks):
            passed.append("runtime completion verifier records dependency status for all six stages")
        else:
            failures.append("runtime completion verifier must record dependency status for all six stages")

    report = {
        "mission_id": MISSION_ID,
        "ok": not failures,
        "passed": passed,
        "failures": failures,
        "checksum_manifest": checksums,
    }
    evidence_path = ROOT / ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.safe_setup_validation.json"
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({"ok": not failures, "pass_count": len(passed), "failure_count": len(failures)}, indent=2))
    if failures:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
