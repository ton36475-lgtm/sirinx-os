#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MISSION_ID = "MAXPLUS-HERMES-CHINESE-MODEL-20260630"
OUTBOX_DIR = ROOT / ".ghostclaw_runtime/a2a2a/outbox/hermes"
GATE_DIR = ROOT / ".ghostclaw_runtime/a2a2a/gates"
RECEIPT_DIR = ROOT / ".ghostclaw_runtime/a2a2a/receipts"
DOC_PATH = ROOT / "docs/ghostclaw/MAXPLUS_HERMES_OWNER_RUNTIME_HANDOFF.md"
HANDOFF_PATH = OUTBOX_DIR / f"{MISSION_ID}.owner_runtime_handoff.md"
GATE_PATH = GATE_DIR / f"{MISSION_ID}.owner_runtime_handoff.json"
RECEIPT_PATH = RECEIPT_DIR / f"{MISSION_ID}.owner_runtime_handoff.receipt.json"


SAFE_STATUS_EVIDENCE = ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller_status.json"
ACTIVATION_CONTROLLER = "scripts/ghostclaw/hermes_maxplus_activation_controller.py"


COMMAND_STEPS = [
    {
        "step": 1,
        "name": "private_config_write",
        "gate": "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1",
        "command": "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1 python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --execute-stage private_config_write",
        "owner_terminal_only": True,
        "requires_private_key_env": "MAXPLUS_CODEX_API_KEY",
        "evidence": ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller_private_config_write.json",
    },
    {
        "step": 2,
        "name": "safe_status_after_private_write",
        "gate": "none",
        "command": "python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --status",
        "owner_terminal_only": False,
        "evidence": SAFE_STATUS_EVIDENCE,
    },
    {
        "step": 3,
        "name": "doctor",
        "gate": "APPROVE_HERMES_DOCTOR_CONFIG_CHECK=1",
        "command": "APPROVE_HERMES_DOCTOR_CONFIG_CHECK=1 python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --execute-stage doctor",
        "owner_terminal_only": True,
        "evidence": ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller_doctor.json",
    },
    {
        "step": 4,
        "name": "status",
        "gate": "APPROVE_HERMES_STATUS_CONFIG_CHECK=1",
        "command": "APPROVE_HERMES_STATUS_CONFIG_CHECK=1 python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --execute-stage status",
        "owner_terminal_only": True,
        "evidence": ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller_runtime_status.json",
    },
    {
        "step": 5,
        "name": "model_picker",
        "gate": "APPROVE_HERMES_MODEL_PICKER_CHECK=1",
        "command": "APPROVE_HERMES_MODEL_PICKER_CHECK=1 python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --execute-stage model_picker --allow-interactive",
        "owner_terminal_only": True,
        "interactive": True,
        "evidence": ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller_model_picker.json",
    },
    {
        "step": 6,
        "name": "provider_smoke",
        "gate": "APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN=1",
        "command": "APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN=1 python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --execute-stage provider_smoke",
        "owner_terminal_only": True,
        "requires_private_key_env": "MAXPLUS_CODEX_API_KEY",
        "provider_call": True,
        "evidence": ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller_provider_smoke.json",
    },
]


PLAN_ONLY_STEPS = [
    "gateway_setup",
    "cron_dry_run",
    "subagent_local",
    "mcp_connector",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


def build_markdown(generated_at: str) -> str:
    rows = []
    for item in COMMAND_STEPS:
        owner_scope = "owner terminal" if item.get("owner_terminal_only") else "local-safe"
        rows.append(
            f"| {item['step']} | `{item['name']}` | `{item['gate']}` | {owner_scope} | `{item['evidence']}` |"
        )
    return "\n".join(
        [
            "# MaxPlus Hermes Owner Runtime Handoff",
            "",
            f"Mission ID: `{MISSION_ID}`",
            f"Generated: `{generated_at}`",
            "Status: `ready_for_owner_terminal_gate`",
            "",
            "This is a Telegram-safe and Codex-safe handoff for moving from the local-safe setup pack to real Hermes + MaxPlus runtime activation. It contains no private key value and does not execute any provider, gateway, cron, subagent, MCP, push, or deploy action.",
            "",
            "## Precondition",
            "",
            "- Run this only from the owner terminal.",
            "- Put the private MaxPlus key in `MAXPLUS_CODEX_API_KEY` outside the repo.",
            "- Do not paste the private key into Codex, Telegram, receipts, docs, or logs.",
            "- Keep each gate one-shot; stop if any command prints a token or private value.",
            "",
            "## Current Local-Safe Evidence",
            "",
            f"- Activation controller: `{ACTIVATION_CONTROLLER}`",
            f"- Latest safe status evidence: `{SAFE_STATUS_EVIDENCE}`",
            "- Full runtime status: `repo_side_review_ready_full_runtime_incomplete`",
            "",
            "## Owner Gate Sequence",
            "",
            "| Step | Stage | Gate | Scope | Expected evidence |",
            "| --- | --- | --- | --- | --- |",
            *rows,
            "",
            "## Commands",
            "",
            "Set the private key only in the owner terminal:",
            "",
            "```bash",
            'export MAXPLUS_CODEX_API_KEY="<private value outside repo>"',
            "```",
            "",
            "Then run one stage at a time:",
            "",
            "```bash",
            *(item["command"] for item in COMMAND_STEPS),
            "```",
            "",
            "## Plan-Only Advanced Gates",
            "",
            "These remain plan-only in this harness until a separate exact gate exists:",
            "",
            *(f"- `{name}`" for name in PLAN_ONLY_STEPS),
            "",
            "## Stop Conditions",
            "",
            "- Any command prints a token or private key.",
            "- Any provider call is not the explicit one-turn smoke.",
            "- Any gateway action sends a live Telegram/Discord/Signal message.",
            "- Any cron action becomes recurring without a scheduler and cost gate.",
            "- Any MCP action writes connector credentials into the repo.",
            "",
        ]
    )


def build_gate_packet(generated_at: str, markdown_sha: str) -> dict:
    return {
        "schema": "ghostclaw.maxplus.owner_runtime_handoff.v1",
        "mission_id": MISSION_ID,
        "generated_at": generated_at,
        "status": "ready_for_owner_terminal_gate",
        "control_plane": "Telegram-safe draft only; not live-sent by Codex",
        "source_doc": rel(DOC_PATH),
        "outbox_handoff": rel(HANDOFF_PATH),
        "markdown_sha256": markdown_sha,
        "policy": {
            "secret_value_included": False,
            "private_env_values_read": False,
            "provider_call_executed": False,
            "gateway_started": False,
            "cron_activated": False,
            "subagent_started": False,
            "mcp_mutated": False,
            "push_executed": False,
            "deploy_executed": False,
        },
        "required_owner_sequence": COMMAND_STEPS,
        "plan_only_advanced_gates": PLAN_ONLY_STEPS,
        "next_gate": "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1",
    }


def write_receipt(generated_at: str, markdown_sha: str, gate_packet_sha: str) -> dict:
    receipt = {
        "receipt_id": f"{MISSION_ID}-owner-runtime-handoff",
        "mission_id": MISSION_ID,
        "task_id": "owner-runtime-handoff",
        "decision_id": f"decision-{MISSION_ID}-owner-runtime-handoff",
        "agent": "Codex_Builder",
        "action_tier": "B",
        "status": "auto-approved",
        "files_touched": [
            rel(HANDOFF_PATH),
            rel(GATE_PATH),
        ],
        "validation_result": "recorded",
        "blocked_actions": [
            "secret_value_print",
            "private_env_value_read",
            "unapproved_provider_call",
            "unapproved_live_send",
            "unapproved_gateway_start",
            "unapproved_cron_activation",
            "unapproved_subagent_runtime",
            "unapproved_mcp_mutation",
            "push",
            "deploy",
        ],
        "checksums": {
            rel(HANDOFF_PATH): markdown_sha,
            rel(GATE_PATH): gate_packet_sha,
        },
        "created_at": generated_at,
    }
    receipt["checksum"] = hashlib.sha256(json.dumps(receipt, sort_keys=True).encode("utf-8")).hexdigest()
    return receipt


def main() -> int:
    generated_at = now_iso()
    for directory in [OUTBOX_DIR, GATE_DIR, RECEIPT_DIR, DOC_PATH.parent]:
        directory.mkdir(parents=True, exist_ok=True)
    markdown = build_markdown(generated_at)
    markdown_sha = sha256_text(markdown)
    gate_packet = build_gate_packet(generated_at, markdown_sha)
    gate_text = json.dumps(gate_packet, indent=2) + "\n"
    gate_packet_sha = sha256_text(gate_text)
    receipt = write_receipt(generated_at, markdown_sha, gate_packet_sha)

    DOC_PATH.write_text(markdown, encoding="utf-8")
    HANDOFF_PATH.write_text(markdown, encoding="utf-8")
    GATE_PATH.write_text(gate_text, encoding="utf-8")
    RECEIPT_PATH.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({
        "ok": True,
        "status": "ready_for_owner_terminal_gate",
        "doc_path": rel(DOC_PATH),
        "handoff_path": rel(HANDOFF_PATH),
        "gate_path": rel(GATE_PATH),
        "receipt_path": rel(RECEIPT_PATH),
        "next_gate": "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1",
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
