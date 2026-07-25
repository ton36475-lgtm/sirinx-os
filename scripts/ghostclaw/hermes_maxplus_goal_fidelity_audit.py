#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MISSION_ID = "MAXPLUS-HERMES-CHINESE-MODEL-20260630"
OBJECTIVE_PATH = Path("/Users/sirinx/.codex/attachments/9cdef84e-5f0a-423f-b97c-506139d80457/pasted-text-1.txt")
EVIDENCE_PATH = ROOT / ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.goal_fidelity_audit.json"
REPORT_PATH = ROOT / "docs/ghostclaw/MAXPLUS_HERMES_GOAL_FIDELITY_AUDIT.md"

SECRET_PATTERNS = [
    re.compile(r"\b(?:sk|ccsk|xai|ghp|hf)-[A-Za-z0-9_\-]{12,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY"),
]

REQUIREMENTS = [
    {
        "id": "objective_file_read_sanitized",
        "label": "Read pasted objective without exposing key material",
        "markers": ["Hermes Agent", "MaxPlus"],
        "status_when_present": "proven_local",
        "evidence": [str(OBJECTIVE_PATH)],
        "next_gate": None,
    },
    {
        "id": "hermes_cli_present",
        "label": "Hermes Agent CLI is installed and discoverable",
        "markers": ["Hermes Agent"],
        "status_when_present": "proven_local",
        "evidence": [".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.preflight.json"],
        "next_gate": None,
    },
    {
        "id": "maxplus_openai_chat_template",
        "label": "MaxPlus OpenAI-compatible provider template exists",
        "markers": ["openai_chat", "custom:maxplus-codex"],
        "status_when_present": "template_ready",
        "evidence": ["docs/ghostclaw/templates/hermes-maxplus-config.yaml.template"],
        "next_gate": "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1",
    },
    {
        "id": "model_aliases_documented",
        "label": "Chinese model aliases from source are documented",
        "markers": ["deepseek-v4-flash", "deepseek-v4-pro", "kimi-k2.6", "minimax-m3", "glm-5.2", "glm-5.1"],
        "status_when_present": "template_ready",
        "evidence": ["docs/ghostclaw/templates/hermes-maxplus-config.yaml.template"],
        "next_gate": "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1",
    },
    {
        "id": "owner_runtime_handoff",
        "label": "Owner terminal runtime handoff is ready without secret values",
        "markers": ["Hermes Agent", "MaxPlus"],
        "status_when_present": "handoff_ready",
        "evidence": [
            "docs/ghostclaw/MAXPLUS_HERMES_OWNER_RUNTIME_HANDOFF.md",
            ".ghostclaw_runtime/a2a2a/outbox/hermes/MAXPLUS-HERMES-CHINESE-MODEL-20260630.owner_runtime_handoff.md",
            ".ghostclaw_runtime/a2a2a/gates/MAXPLUS-HERMES-CHINESE-MODEL-20260630.owner_runtime_handoff.json",
            ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.owner_runtime_handoff.receipt.json",
        ],
        "next_gate": "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1",
    },
    {
        "id": "runtime_completion_verifier",
        "label": "Runtime completion verifier can audit post-gate evidence",
        "markers": ["Hermes Agent", "MaxPlus"],
        "status_when_present": "verifier_ready",
        "evidence": [
            "docs/ghostclaw/MAXPLUS_HERMES_RUNTIME_COMPLETION_VERIFIER.md",
            "scripts/ghostclaw/hermes_maxplus_runtime_completion_verifier.py",
            ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_completion_verification.json",
            ".ghostclaw_runtime/a2a2a/receipts/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_completion_verification.receipt.json",
        ],
        "next_gate": "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1",
    },
    {
        "id": "private_key_outside_repo",
        "label": "Private MaxPlus key stays outside repo and logs",
        "markers": ["~/.hermes/.env", "~/.hermes/config.yaml"],
        "status_when_present": "partially_proven_owner_action_required",
        "evidence": [
            "docs/ghostclaw/MAXPLUS_HERMES_SECRET_HANDLING_POLICY.md",
            "scripts/ghostclaw/apply_hermes_maxplus_private_config.py",
        ],
        "next_gate": "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1",
    },
    {
        "id": "private_hermes_config_written",
        "label": "Private ~/.hermes config and env are written",
        "markers": ["~/.hermes/config.yaml", "~/.hermes/.env"],
        "status_when_present": "incomplete_blocked",
        "evidence": [".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.private_config_apply_dry_run.json"],
        "next_gate": "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1",
    },
    {
        "id": "hermes_doctor_status_model",
        "label": "Hermes doctor/status/model checks run with redacted output",
        "markers": ["hermes doctor", "hermes status", "hermes model"],
        "status_when_present": "blocked_runtime_gate",
        "evidence": [
            "docs/ghostclaw/MAXPLUS_HERMES_ADVANCED_FEATURE_GATES.md",
            "docs/ghostclaw/MAXPLUS_HERMES_RUNTIME_GATE_EXECUTOR.md",
            ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_doctor.json",
            ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_status.json",
            ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_model_picker.json",
        ],
        "next_gate": "APPROVE_HERMES_DOCTOR_CONFIG_CHECK / APPROVE_HERMES_STATUS_CONFIG_CHECK / APPROVE_HERMES_MODEL_PICKER_CHECK",
    },
    {
        "id": "provider_smoke",
        "label": "One-turn MaxPlus provider smoke succeeds",
        "markers": ["provider"],
        "status_when_present": "blocked_provider_gate",
        "evidence": [
            ".ghostclaw_runtime/a2a2a/gates/MAXPLUS-HERMES-CHINESE-MODEL-20260630.provider_smoke_gate.json",
            ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_provider_smoke.json",
        ],
        "next_gate": "APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN",
    },
    {
        "id": "gateway",
        "label": "Hermes gateway live message system is set up",
        "markers": ["gateway"],
        "status_when_present": "blocked_live_send_system_gate",
        "evidence": [
            "docs/ghostclaw/MAXPLUS_HERMES_ADVANCED_FEATURE_GATES.md",
            ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_gateway_setup.json",
        ],
        "next_gate": "APPROVE_HERMES_GATEWAY_LOCAL_SETUP plus exact recipient/platform gate",
    },
    {
        "id": "cron",
        "label": "Hermes cron scheduler is configured safely",
        "markers": ["cron"],
        "status_when_present": "blocked_scheduler_gate",
        "evidence": [
            "docs/ghostclaw/MAXPLUS_HERMES_ADVANCED_FEATURE_GATES.md",
            ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_cron_dry_run.json",
        ],
        "next_gate": "APPROVE_HERMES_CRON_LOCAL_DRY_RUN",
    },
    {
        "id": "subagent",
        "label": "Hermes subagent one local task is exercised",
        "markers": ["subagent"],
        "status_when_present": "blocked_runtime_gate",
        "evidence": [
            "docs/ghostclaw/MAXPLUS_HERMES_ADVANCED_FEATURE_GATES.md",
            ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_subagent_local.json",
        ],
        "next_gate": "APPROVE_HERMES_SUBAGENT_ONE_LOCAL_TASK",
    },
    {
        "id": "mcp_servers",
        "label": "MCP server configuration is prepared without live mutation",
        "markers": ["mcp_servers"],
        "status_when_present": "blocked_connector_gate",
        "evidence": [
            "docs/ghostclaw/MAXPLUS_HERMES_ADVANCED_FEATURE_GATES.md",
            ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_mcp_connector.json",
        ],
        "next_gate": "CONNECTOR_SPECIFIC_MCP_GATE_REQUIRED",
    },
]


def read_objective() -> tuple[str, bool]:
    if not OBJECTIVE_PATH.exists():
        return "", False
    text = OBJECTIVE_PATH.read_text(encoding="utf-8", errors="replace")
    return text, any(pattern.search(text) for pattern in SECRET_PATTERNS)


def path_exists(rel_or_abs: str) -> bool:
    path = Path(rel_or_abs)
    if not path.is_absolute():
        path = ROOT / path
    return path.exists()


def run_preflight() -> dict:
    proc = subprocess.run(
        ["python3", "scripts/ghostclaw/hermes_maxplus_preflight.py"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    try:
        parsed = json.loads(proc.stdout)
    except json.JSONDecodeError:
        parsed = {"parse_error": True, "stdout_length": len(proc.stdout)}
    return {
        "exit_code": proc.returncode,
        "stdout_json": parsed,
        "stderr_length": len(proc.stderr),
    }


def requirement_status(req: dict, objective_text: str, preflight: dict) -> dict:
    markers = req["markers"]
    markers_found = [marker for marker in markers if marker in objective_text]
    evidence_found = [item for item in req["evidence"] if path_exists(item)]
    status = "not_in_objective"
    if markers_found:
        status = req["status_when_present"]
    if req["id"] == "hermes_cli_present":
        stdout_json = preflight.get("stdout_json", {})
        status = "proven_local" if stdout_json.get("hermes_present") else "incomplete_missing_cli"
    if req["id"] == "private_hermes_config_written":
        stdout_json = preflight.get("stdout_json", {})
        status = "proven_private_presence_only" if stdout_json.get("runtime_ready") else "incomplete_blocked"
    return {
        "id": req["id"],
        "label": req["label"],
        "markers_found": markers_found,
        "evidence_found": evidence_found,
        "evidence_missing": [item for item in req["evidence"] if item not in evidence_found],
        "status": status,
        "next_gate": req["next_gate"],
    }


def write_markdown(report: dict) -> None:
    rows = []
    for item in report["requirements"]:
        rows.append(
            "| {id} | {status} | {next_gate} | {evidence} |".format(
                id=item["id"],
                status=item["status"],
                next_gate=item["next_gate"] or "none",
                evidence=", ".join(item["evidence_found"]) or "missing",
            )
        )
    body = "\n".join(
        [
            "# MaxPlus Hermes Goal Fidelity Audit",
            "",
            f"Mission ID: `{MISSION_ID}`",
            f"Generated: `{report['generated_at']}`",
            "",
            "This audit is intentionally evidence-first. It does not print the pasted key, read private env values, call providers, start Hermes gateway, activate cron, or mutate MCP connectors.",
            "",
            "## Result",
            "",
            f"- Objective file present: `{report['objective_file_present']}`",
            f"- Objective contains secret-like text: `{report['objective_contains_secret_like_text']}`",
            f"- Overall status: `{report['overall_status']}`",
            "",
            "## Requirement Evidence",
            "",
            "| Requirement | Status | Next gate | Evidence |",
            "| --- | --- | --- | --- |",
            *rows,
            "",
            "## Policy Conclusion",
            "",
            "The repo-side local-safe setup is review-ready, but the full pasted objective remains incomplete until the owner opens the private config, runtime/provider smoke, gateway, cron, subagent, and connector gates one at a time.",
            "",
        ]
    )
    REPORT_PATH.write_text(body, encoding="utf-8")


def main() -> int:
    objective_text, contains_secret = read_objective()
    preflight = run_preflight()
    requirements = [requirement_status(req, objective_text, preflight) for req in REQUIREMENTS]
    incomplete = [
        item for item in requirements
        if item["status"].startswith("incomplete") or item["status"].startswith("blocked")
    ]
    report = {
        "mission_id": MISSION_ID,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "objective_path": str(OBJECTIVE_PATH),
        "objective_file_present": OBJECTIVE_PATH.exists(),
        "objective_size_bytes": len(objective_text.encode("utf-8")),
        "objective_contains_secret_like_text": contains_secret,
        "secret_values_printed": False,
        "private_env_values_read": False,
        "provider_call_executed": False,
        "gateway_started": False,
        "cron_activated": False,
        "mcp_mutated": False,
        "preflight": preflight,
        "requirements": requirements,
        "overall_status": "repo_side_review_ready_full_runtime_incomplete" if incomplete else "complete",
        "incomplete_requirement_ids": [item["id"] for item in incomplete],
    }
    EVIDENCE_PATH.parent.mkdir(parents=True, exist_ok=True)
    EVIDENCE_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    write_markdown(report)
    print(json.dumps({
        "ok": True,
        "overall_status": report["overall_status"],
        "incomplete_requirement_count": len(incomplete),
        "evidence_path": str(EVIDENCE_PATH.relative_to(ROOT)),
        "report_path": str(REPORT_PATH.relative_to(ROOT)),
    }, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
