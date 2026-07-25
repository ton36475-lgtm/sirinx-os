#!/usr/bin/env python3
"""Build a local-safe A2A2A agent-orchestrator routing plan.

This orchestrator accelerates coordination by ranking packets and assigning the
next review/build/control lanes. It never executes queue payloads, starts
workers, sends messages, calls providers, reads secrets, installs dependencies,
pushes, deploys, or mutates Cloudflare/R2. With ``--write`` it writes only the
requested evidence and receipt files.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import re
import shlex
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
PACKET_ID = "A2A2A-P077-AGENT-ORCHESTRATOR-ACCELERATION-IMPLEMENTATION-20260703"
DEFAULT_OUTPUT = f".ghostclaw_runtime/a2a2a/evidence/{PACKET_ID}.json"
DEFAULT_RECEIPT = f".ghostclaw_runtime/a2a2a/receipts/{PACKET_ID}.json"
DEFAULT_COMPACT_OUTPUT = ".ghostclaw_runtime/a2a2a/status/current_compact_status.json"
DEFAULT_COMPACT_RECEIPT_OUTPUT = ".ghostclaw_runtime/a2a2a/receipts/current_compact_status.json"
DEFAULT_COMPACT_FRESHNESS_OUTPUT = ".ghostclaw_runtime/a2a2a/status/current_compact_freshness.json"
DEFAULT_COMPACT_FRESHNESS_RECEIPT_OUTPUT = ".ghostclaw_runtime/a2a2a/receipts/current_compact_freshness.json"
DEFAULT_HANDOFF_OUTPUT = ".ghostclaw_runtime/a2a2a/status/sidebar_handoff_capsule.json"
DEFAULT_CURRENT_NEXT_GATE = ".ghostclaw_runtime/a2a2a/status/current_next_gate.json"
DEFAULT_ACTION_CARD_OUTPUT = ".ghostclaw_runtime/a2a2a/status/operator_action_card.json"
DEFAULT_OPERATOR_BRIEF_OUTPUT = ".ghostclaw_runtime/a2a2a/status/operator_action_brief.md"
DEFAULT_APPROVAL_CHECK_OUTPUT = ".ghostclaw_runtime/a2a2a/status/operator_approval_check.json"
DEFAULT_ACK_ACTION_CARD_OUTPUT = ".ghostclaw_runtime/a2a2a/status/role_worker_ack_action_card.json"
DEFAULT_ACK_BRIEF_OUTPUT = ".ghostclaw_runtime/a2a2a/status/role_worker_ack_brief.md"
DEFAULT_ACK_GATE_OUTPUT = ".ghostclaw_runtime/a2a2a/gates/A2A2A-P114-PACKET074-LOCAL-ROLE-WORKER-ACK.gate.json"
DEFAULT_ACK_APPROVAL_CHECK_OUTPUT = ".ghostclaw_runtime/a2a2a/status/role_worker_ack_approval_check.json"
DEFAULT_ACK_RECONCILE_OUTPUT = ".ghostclaw_runtime/a2a2a/status/role_worker_ack_reconcile.json"
DEFAULT_ACK_DEBUG_OUTPUT = ".ghostclaw_runtime/a2a2a/status/role_worker_ack_debug.json"
DEFAULT_PHASE_GUARD_SUMMARY_OUTPUT = ".ghostclaw_runtime/a2a2a/status/phase_guard_summary.json"
DEFAULT_WORKER_ENVELOPE_PHASE_GUARD_OUTPUT = ".ghostclaw_runtime/a2a2a/status/worker_envelope_phase_guard.json"
DEFAULT_PHASE_NEXT_ACTION_SELECTOR_OUTPUT = ".ghostclaw_runtime/a2a2a/status/phase_next_action_selector.json"
DEFAULT_LOOP_HARNESS_EVIDENCE = (
    ".ghostclaw_runtime/a2a2a/evidence/"
    "A2A2A-P154-LOOP-HARNESS-MANIFEST-VALIDATOR-20260704.json"
)
DEFAULT_LOOP_HARNESS_RECEIPT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P154-LOOP-HARNESS-MANIFEST-VALIDATOR-20260704.json"
)
DEFAULT_LOOP_HARNESS_REVIEW = (
    ".ghostclaw_runtime/a2a2a/reviews/"
    "A2A2A-P154-LOOP-HARNESS-OPENCODE-REVIEW-PACKET-20260704.json"
)
DEFAULT_LOOP_HARNESS_STATUS_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P155-LOOP-HARNESS-STATUS-SURFACE-20260704.json"
)
DEFAULT_LOOP_HARNESS_STATUS_RECEIPT_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P155-LOOP-HARNESS-STATUS-SURFACE-20260704.json"
)
DEFAULT_QUEUE_REPLENISH_PREVIEW_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/evidence/"
    "A2A2A-P131-P129-QUEUE-REPLENISH-PACKET-PREVIEW-20260704.json"
)
DEFAULT_QUEUE_REPLENISH_COMMAND_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/commands/"
    "A2A2A-P131-P129-QUEUE-WRITE-CHECKSUM-GUARD-20260704.sh"
)
DEFAULT_QUEUE_REPLENISH_RECEIPT_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P131-P129-QUEUE-REPLENISH-GUARD-PREVIEW-20260704.json"
)
DEFAULT_QUEUE_REPLENISH_STATUS_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P132-P129-QUEUE-REPLENISH-GUARD-STATUS-20260704.json"
)
DEFAULT_QUEUE_REPLENISH_STATUS_RECEIPT_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P132-P129-QUEUE-REPLENISH-GUARD-STATUS-20260704.json"
)
DEFAULT_QUEUE_REPLENISH_TEAM_HANDOFF_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P133-P129-TEAM-HANDOFF-BUNDLE-20260704.json"
)
DEFAULT_QUEUE_REPLENISH_TEAM_HANDOFF_RECEIPT_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P133-P129-TEAM-HANDOFF-BUNDLE-20260704.json"
)
DEFAULT_QUEUE_REPLENISH_TARGET_RECONCILE_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P134-P129-TARGET-RECONCILE-20260704.json"
)
DEFAULT_QUEUE_REPLENISH_TARGET_RECONCILE_RECEIPT_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P134-P129-TARGET-RECONCILE-20260704.json"
)
DEFAULT_PACKET076_WORKER_ENVELOPE_PREVIEW_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/evidence/"
    "A2A2A-P136-PACKET076-WORKER-ENVELOPE-PREVIEW-20260704.json"
)
DEFAULT_PACKET076_WORKER_ENVELOPE_COMMAND_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/commands/"
    "A2A2A-P136-PACKET076-WORKER-ENVELOPE-WRITE-GUARD-20260704.sh"
)
DEFAULT_PACKET076_WORKER_ENVELOPE_RECEIPT_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P136-PACKET076-WORKER-ENVELOPE-GATE-PREVIEW-20260704.json"
)
DEFAULT_PACKET076_WORKER_ENVELOPE_GATE = "APPROVE_A2A2A_P136_PACKET076_LOCAL_WORKER_ENVELOPE_WRITE_ONLY"
DEFAULT_PACKET077_WORKER_ENVELOPE_PREVIEW_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/evidence/"
    "A2A2A-P156-PACKET077-WORKER-ENVELOPE-PREVIEW-20260704.json"
)
DEFAULT_PACKET077_WORKER_ENVELOPE_COMMAND_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/commands/"
    "A2A2A-P156-PACKET077-WORKER-ENVELOPE-WRITE-GUARD-20260704.sh"
)
DEFAULT_PACKET077_WORKER_ENVELOPE_RECEIPT_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P156-PACKET077-WORKER-ENVELOPE-GATE-PREVIEW-20260704.json"
)
DEFAULT_PACKET077_WORKER_ENVELOPE_GATE = "APPROVE_A2A2A_P156_PACKET077_LOCAL_WORKER_ENVELOPE_WRITE_ONLY"
DEFAULT_PACKET078_WORKER_ENVELOPE_PREVIEW_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/evidence/"
    "A2A2A-P173-PACKET078-WORKER-ENVELOPE-PREVIEW-20260704.json"
)
DEFAULT_PACKET078_WORKER_ENVELOPE_COMMAND_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/commands/"
    "A2A2A-P173-PACKET078-WORKER-ENVELOPE-WRITE-GUARD-20260704.sh"
)
DEFAULT_PACKET078_WORKER_ENVELOPE_RECEIPT_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P173-PACKET078-WORKER-ENVELOPE-GATE-PREVIEW-20260704.json"
)
DEFAULT_PACKET078_WORKER_ENVELOPE_GATE = "APPROVE_A2A2A_P173_PACKET078_LOCAL_WORKER_ENVELOPE_WRITE_ONLY"
DEFAULT_PACKET078_OPENCODE_REVIEW_RESULT_TEMPLATE_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/reviews/"
    "A2A2A-P177-PACKET078-OPENCODE-REVIEW-RESULT-TEMPLATE-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_REVIEW_HANDOFF_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/reviews/"
    "A2A2A-P178-PACKET078-OPENCODE-REVIEW-HANDOFF-CAPSULE-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_REVIEW_STATUS_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P179-PACKET078-OPENCODE-REVIEW-STATUS-SURFACE-20260704.json"
)
DEFAULT_PACKET078_P167_DEFERRED_APPROVAL_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P180-PACKET078-P167-DEFERRED-APPROVAL-ESCROW-20260704.json"
)
DEFAULT_PACKET078_P167_ESCROW_RELEASE_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P181-PACKET078-P167-ESCROW-RELEASE-READINESS-20260704.json"
)
DEFAULT_PACKET078_P167_RELEASE_WATCH_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P182-PACKET078-P167-RELEASE-WATCH-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_REVIEW_CANDIDATE = (
    ".ghostclaw_runtime/a2a2a/reviews/"
    "A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_REVIEW_CANDIDATE_PREFLIGHT_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-PREFLIGHT-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_REVIEW_CANDIDATE_PREFLIGHT_RECEIPT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-PREFLIGHT-20260704.json"
)
PACKET078_OPENCODE_REVIEW_CANDIDATE_SCHEMA = (
    "ghostclaw.a2a2a.packet078_opencode_review_candidate_result.v1"
)
PACKET078_OPENCODE_REVIEW_CANDIDATE_PACKET_ID = (
    "A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-20260704"
)
PACKET078_TRANSITION_REVIEW_RESULT_SCHEMA = (
    "ghostclaw.a2a2a.packet078_transition_opencode_review_result.v1"
)
PACKET078_TRANSITION_REVIEW_RESULT_PACKET_ID = (
    "A2A2A-P175-PACKET078-TRANSITION-OPENCODE-REVIEW-20260704"
)
DEFAULT_PACKET078_CANDIDATE_CALL_STATUS = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P187-PACKET078-CANDIDATE-CALL-STATUS-20260704.json"
)
DEFAULT_PACKET078_CANDIDATE_POLL_STATUS = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P191-PACKET078-CANDIDATE-POLL-20260704.json"
)
DEFAULT_PACKET078_CANDIDATE_COPY_GATE = "APPROVE_A2A2A_P193_PACKET078_CANDIDATE_TO_REAL_REVIEW_RESULT_COPY_ONLY"
DEFAULT_PACKET078_CANDIDATE_COPY_COMMAND_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/commands/"
    "A2A2A-P193-PACKET078-CANDIDATE-TO-REAL-REVIEW-RESULT-COPY-20260704.sh"
)
DEFAULT_PACKET078_SEQUENCE_STATUS_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P194-PACKET078-SEQUENCE-STATUS-20260704.json"
)
DEFAULT_PACKET078_SEQUENCE_STATUS_RECEIPT_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P194-PACKET078-SEQUENCE-STATUS-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_CANDIDATE_CALL_PACKET = (
    ".ghostclaw_runtime/a2a2a/reviews/"
    "A2A2A-P186-PACKET078-OPENCODE-CANDIDATE-CALL-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_CANDIDATE_PASTE_PROMPT_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/reviews/"
    "A2A2A-P195-PACKET078-OPENCODE-CANDIDATE-PASTE-PROMPT-20260704.txt"
)
DEFAULT_PACKET078_OPENCODE_CANDIDATE_PASTE_PACK_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P195-PACKET078-OPENCODE-CANDIDATE-PASTE-PACK-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_CANDIDATE_PASTE_PACK_RECEIPT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P195-PACKET078-OPENCODE-CANDIDATE-PASTE-PACK-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_CANDIDATE_STALL_GUARD_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P196-PACKET078-OPENCODE-CANDIDATE-STALL-GUARD-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_CANDIDATE_STALL_GUARD_RECEIPT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P196-PACKET078-OPENCODE-CANDIDATE-STALL-GUARD-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_CANDIDATE_TEMPLATE_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/reviews/"
    "A2A2A-P197-PACKET078-OPENCODE-CANDIDATE-RESULT-TEMPLATE-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_CANDIDATE_TEMPLATE_PACK_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P197-PACKET078-OPENCODE-CANDIDATE-TEMPLATE-PACK-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_CANDIDATE_TEMPLATE_PACK_RECEIPT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P197-PACKET078-OPENCODE-CANDIDATE-TEMPLATE-PACK-20260704.json"
)
DEFAULT_PACKET078_UNFILLED_TEMPLATE_GUARD_STATUS = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P198-PACKET078-UNFILLED-TEMPLATE-FALSE-PASS-GUARD-20260704.json"
)
DEFAULT_PACKET078_P195_PROMPT_CANONICALIZATION_STATUS = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P199-PACKET078-P195-PROMPT-CANONICALIZATION-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_HANDOFF_READINESS_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P200-PACKET078-OPENCODE-HANDOFF-READINESS-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_HANDOFF_READINESS_RECEIPT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P200-PACKET078-OPENCODE-HANDOFF-READINESS-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_POST_HANDOFF_ROUTER_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P201-PACKET078-OPENCODE-POST-HANDOFF-ROUTER-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_POST_HANDOFF_ROUTER_RECEIPT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P201-PACKET078-OPENCODE-POST-HANDOFF-ROUTER-20260704.json"
)
DEFAULT_PACKET078_POST_CANDIDATE_RECONCILE_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P206-PACKET078-POST-CANDIDATE-RECONCILE-BUNDLE-20260704.json"
)
DEFAULT_PACKET078_POST_CANDIDATE_RECONCILE_RECEIPT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P206-PACKET078-POST-CANDIDATE-RECONCILE-BUNDLE-20260704.json"
)
DEFAULT_PACKET078_CANDIDATE_ARRIVAL_WATCH_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P207-PACKET078-CANDIDATE-ARRIVAL-WATCH-20260704.json"
)
DEFAULT_PACKET078_CANDIDATE_ARRIVAL_WATCH_RECEIPT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P207-PACKET078-CANDIDATE-ARRIVAL-WATCH-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_OPERATOR_HANDOFF_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P208-PACKET078-OPENCODE-OPERATOR-HANDOFF-PACK-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_OPERATOR_HANDOFF_RECEIPT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P208-PACKET078-OPENCODE-OPERATOR-HANDOFF-PACK-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_OPERATOR_HANDOFF_COMMAND = (
    ".ghostclaw_runtime/a2a2a/commands/"
    "A2A2A-P208-PACKET078-OPENCODE-OPERATOR-HANDOFF-20260704.sh"
)
DEFAULT_PACKET078_OPENCODE_OPERATOR_HANDOFF_STATUS_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P209-PACKET078-OPENCODE-OPERATOR-HANDOFF-STATUS-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_OPERATOR_HANDOFF_STATUS_RECEIPT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P209-PACKET078-OPENCODE-OPERATOR-HANDOFF-STATUS-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_OPERATOR_STATUS_BRIEF_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P210-PACKET078-OPENCODE-OPERATOR-STATUS-BRIEF-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_OPERATOR_STATUS_BRIEF_RECEIPT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P210-PACKET078-OPENCODE-OPERATOR-STATUS-BRIEF-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_CLIPBOARD_LOAD_STATUS = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P220-PACKET078-P195-CLIPBOARD-LOAD-STATUS-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_CLIPBOARD_LOAD_RECEIPT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P220-PACKET078-P195-CLIPBOARD-LOAD-RECEIPT-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_MANUAL_PASTE_PENDING_STATUS_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P221-PACKET078-OPENCODE-MANUAL-PASTE-PENDING-STATUS-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_MANUAL_PASTE_PENDING_STATUS_RECEIPT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P221-PACKET078-OPENCODE-MANUAL-PASTE-PENDING-STATUS-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_MANUAL_PASTE_ACTION_CARD_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P223-PACKET078-OPENCODE-MANUAL-PASTE-ACTION-CARD-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_MANUAL_PASTE_ACTION_CARD_RECEIPT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P223-PACKET078-OPENCODE-MANUAL-PASTE-ACTION-CARD-20260704.json"
)
DEFAULT_PACKET078_POST_P185_ACCELERATOR_STATUS_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P225-PACKET078-POST-P185-ACCELERATOR-STATUS-20260704.json"
)
DEFAULT_PACKET078_POST_P185_ACCELERATOR_STATUS_RECEIPT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P225-PACKET078-POST-P185-ACCELERATOR-STATUS-20260704.json"
)
DEFAULT_PACKET078_CLIPBOARD_FRESHNESS_GUARD_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P227-PACKET078-CLIPBOARD-FRESHNESS-GUARD-20260704.json"
)
DEFAULT_PACKET078_CLIPBOARD_FRESHNESS_GUARD_RECEIPT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P227-PACKET078-CLIPBOARD-FRESHNESS-GUARD-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_WATCH_STALL_STATUS_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/status/"
    "A2A2A-P213-PACKET078-OPENCODE-WATCH-STALL-STATUS-20260704.json"
)
DEFAULT_PACKET078_OPENCODE_WATCH_STALL_STATUS_RECEIPT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P213-PACKET078-OPENCODE-WATCH-STALL-STATUS-20260704.json"
)


def packet078_p208_post_paste_refresh_chain() -> list[dict[str, str]]:
    return [
        {
            "step": "P207_candidate_arrival_watch",
            "artifact": DEFAULT_PACKET078_CANDIDATE_ARRIVAL_WATCH_OUTPUT,
        },
        {
            "step": "P185_candidate_preflight",
            "artifact": DEFAULT_PACKET078_OPENCODE_REVIEW_CANDIDATE_PREFLIGHT_OUTPUT,
        },
        {
            "step": "P210_operator_status_brief",
            "artifact": DEFAULT_PACKET078_OPENCODE_OPERATOR_STATUS_BRIEF_OUTPUT,
        },
        {
            "step": "P213_watch_stall_status",
            "artifact": DEFAULT_PACKET078_OPENCODE_WATCH_STALL_STATUS_OUTPUT,
        },
    ]


def packet078_p208_post_paste_refresh_steps() -> list[str]:
    return [item["step"] for item in packet078_p208_post_paste_refresh_chain()]


DEFAULT_PACKET077_WORKER_ENVELOPE_EXECUTION_AUDIT_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/evidence/"
    "A2A2A-P159-PACKET077-WORKER-ENVELOPE-EXECUTION-AUDIT-20260704.json"
)
DEFAULT_PACKET077_POST_WRITE_ACK_GATE = "APPROVE_A2A2A_P162_PACKET077_LOCAL_ROLE_WORKER_ACK_ONLY"
DEFAULT_CURRENT_NEXT_GATE_ADVANCE_BACKUP = (
    ".ghostclaw_runtime/a2a2a/status/current_next_gate.before-p157-20260704.json"
)
DEFAULT_POST_ACK_CURRENT_GATE_COMPLETE_BACKUP = (
    ".ghostclaw_runtime/a2a2a/status/current_next_gate.before-p164-post-ack-20260704.json"
)
DEFAULT_QUEUE_DRAIN_REFRESH_GATE = "APPROVE_A2A2A_P167_ACTIVE_FOCUS_QUEUE_REFRESH_WRITE_ONLY"
DEFAULT_QUEUE_DRAIN_REFRESH_CURRENT_GATE_BACKUP = (
    ".ghostclaw_runtime/a2a2a/status/current_next_gate.before-p167-queue-refresh-20260704.json"
)


def worker_envelope_gate_for_sequence(sequence: str | None) -> str | None:
    """Return the exact worker-envelope gate for known packet sequences only."""
    if sequence == "076":
        return DEFAULT_PACKET076_WORKER_ENVELOPE_GATE
    if sequence == "077":
        return DEFAULT_PACKET077_WORKER_ENVELOPE_GATE
    if sequence == "078":
        return DEFAULT_PACKET078_WORKER_ENVELOPE_GATE
    return None


def worker_envelope_command_output_for_sequence(sequence: str | None) -> str | None:
    """Return the write-guard command path for known worker-envelope packets only."""
    if sequence == "076":
        return DEFAULT_PACKET076_WORKER_ENVELOPE_COMMAND_OUTPUT
    if sequence == "077":
        return DEFAULT_PACKET077_WORKER_ENVELOPE_COMMAND_OUTPUT
    if sequence == "078":
        return DEFAULT_PACKET078_WORKER_ENVELOPE_COMMAND_OUTPUT
    return None
DEFAULT_ACK_GATE_LOCK_AUDIT_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/evidence/"
    "A2A2A-P138-PACKET076-ACK-GATE-LOCK-AUDIT-20260704.json"
)
DEFAULT_ACK_GATE_LOCK_AUDIT_RECEIPT_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P138-PACKET076-ACK-GATE-LOCK-AUDIT-20260704.json"
)
DEFAULT_ACK_EXECUTION_GUARD_PREVIEW_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/evidence/"
    "A2A2A-P139-PACKET076-ACK-EXECUTION-GUARD-PREVIEW-20260704.json"
)
DEFAULT_ACK_EXECUTION_GUARD_COMMAND_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/commands/"
    "A2A2A-P139-PACKET076-ACK-EXECUTION-GUARD-20260704.sh"
)
DEFAULT_ACK_EXECUTION_GUARD_RECEIPT_OUTPUT = (
    ".ghostclaw_runtime/a2a2a/receipts/"
    "A2A2A-P139-PACKET076-ACK-EXECUTION-GUARD-PREVIEW-20260704.json"
)
ROLE_WORKER_ACK_GATE_BY_SEQUENCE = {
    "074": "P114",
    "075": "P127",
    "076": "P137",
    "077": "P162",
}

ACTIVE_FOCUS = {
    "sirinx.co": {"sirinx", "sirinx.co", "sirinx_site", "sirinx-site", "apps/sirinx-site"},
    "AGM AutoFlow": {"agm", "agm_autoflow", "agm-autoflow", "agm auto", "agm autoflow"},
}
PAUSED_FOCUS = {
    "Kusala": {"kusala", "apps/kusala-site"},
    "Phitsanulok News": {"phitsanulok", "phitsanulok_news", "phitsanulok-news", "apps/phitsanulok-news"},
}
BLOCKED_ACTIONS = {
    "provider_call": False,
    "paid_model_call": False,
    "telegram_live_send": False,
    "repo_or_customer_data_external_routing": False,
    "secret_read": False,
    "key_printing": False,
    "install": False,
    "queue_payload_execution": False,
    "worker_start_or_restart": False,
    "commit": False,
    "push": False,
    "deploy": False,
    "cloudflare_or_r2_mutation": False,
}
UNSAFE_COMMAND_TOKENS = (
    " curl ",
    "| bash",
    "git push",
    "wrangler",
    "cloudflare",
    "deploy",
    "npm install",
    "pnpm install",
    "yarn add",
    "telegram",
    "openrouter",
    ".env",
    "secret",
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def resolve_under_root(root: Path, value: str) -> Path:
    path = Path(value).expanduser()
    if not path.is_absolute():
        path = root / path
    return path.resolve()


def rel(root: Path, path: Path) -> str:
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(to_json_text(payload), encoding="utf-8")


def to_json_text(payload: Any) -> str:
    return json.dumps(payload, indent=2, ensure_ascii=False, sort_keys=True) + "\n"


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def local_safe_external_actions() -> dict[str, bool]:
    return {
        "queue_file_write": False,
        "queue_payload_execution": False,
        "worker_envelope_write": False,
        "worker_execution": False,
        "role_worker_ack_write": False,
        "telegram_live_send": False,
        "provider_call": False,
        "repo_or_customer_data_external_routing": False,
        "secret_read_or_print": False,
        "install": False,
        "commit": False,
        "push": False,
        "deploy": False,
        "cloudflare_or_r2_mutation": False,
    }


def safe_receipt_id(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "-_." else "_" for ch in value)[:180]


ACKED_HERMES_STATUSES = {"route_blocked_by_local_safety", "routed_local_only"}
ACKED_KOB_STATUSES = {"kob_blocked", "kob_allow_local_ack_only"}


def packet_sequence(item: dict[str, Any]) -> str | None:
    text = " ".join(str(item.get(key) or "") for key in ("id", "path"))
    match = re.search(r"packet[_-](\d+)", text)
    return match.group(1) if match else None


def packet_label_from_path(value: Any) -> str:
    sequence = packet_sequence({"path": str(value or "")})
    return f"packet_{sequence}" if sequence else "target packet"


def next_outbox_packet_sequence(root: Path) -> str:
    sequences: list[int] = []
    for path in (root / "_A2A_QUEUE" / "outbox").glob("packet_*.json"):
        sequence = packet_sequence({"path": rel(root, path)})
        if sequence and sequence.isdigit():
            sequences.append(int(sequence))
    next_sequence = max(sequences, default=0) + 1
    return str(next_sequence).zfill(3)


def queue_refresh_artifact_paths(sequence: str) -> dict[str, str]:
    return {
        "target": f"_A2A_QUEUE/outbox/packet_{sequence}_sirinx_agm_next_local_task_card.json",
        "preview": (
            ".ghostclaw_runtime/a2a2a/evidence/"
            f"A2A2A-P167-PACKET{sequence}-QUEUE-REFRESH-PREVIEW-20260704.json"
        ),
        "command": (
            ".ghostclaw_runtime/a2a2a/commands/"
            f"A2A2A-P167-PACKET{sequence}-QUEUE-REFRESH-WRITE-GUARD-20260704.sh"
        ),
        "guard_receipt": (
            ".ghostclaw_runtime/a2a2a/receipts/"
            f"A2A2A-P167-PACKET{sequence}-QUEUE-REFRESH-GUARD-20260704.json"
        ),
    }


def latest_worker_packet(root: Path, seq: str, target: str) -> Path | None:
    inbox = root / f".ghostclaw_runtime/a2a2a/inbox/{target}"
    worker_packets = sorted(inbox.glob(f"queue_coord_packet_{seq}_{target}_*.json"))
    if not worker_packets:
        return None
    return worker_packets[-1]


def _receipt_glob(root: Path, prefix: str, seq: str, target: str) -> Path | None:
    pattern = f".ghostclaw_runtime/a2a2a/receipts/{prefix}_p*_local_dispatch_packet_{seq}_{target}.json"
    candidates = sorted(root.glob(pattern))
    return candidates[-1] if candidates else None

def _hermes_receipt(root: Path, seq: str) -> Path | None:
    return _receipt_glob(root, "hermes_route", seq, "hermes")

def _kob_receipt(root: Path, seq: str) -> Path | None:
    return _receipt_glob(root, "kob_verdict", seq, "kob")

def receiver_ack_status(root: Path, item: dict[str, Any]) -> dict[str, Any] | None:
    seq = packet_sequence(item)
    if not seq:
        return None
    hermes = _hermes_receipt(root, seq)
    kob = _kob_receipt(root, seq)
    if hermes is None or kob is None:
        return None
    try:
        hermes_payload = read_json(hermes)
        kob_payload = read_json(kob)
    except (json.JSONDecodeError, OSError):
        return None
    hermes_ok = hermes_payload.get("status") in ACKED_HERMES_STATUSES
    kob_ok = kob_payload.get("status") in ACKED_KOB_STATUSES
    if not (hermes_ok and kob_ok):
        return None
    latest_hermes_packet = latest_worker_packet(root, seq, "hermes")
    latest_kob_packet = latest_worker_packet(root, seq, "kob")
    hermes_matches_latest_packet = (
        latest_hermes_packet is None or receipt_matches_packet(root, hermes_payload, latest_hermes_packet)
    )
    kob_matches_latest_packet = (
        latest_kob_packet is None or receipt_matches_packet(root, kob_payload, latest_kob_packet)
    )
    if not (hermes_matches_latest_packet and kob_matches_latest_packet):
        return None
    return {
        "packet_sequence": seq,
        "hermes_receipt": rel(root, hermes),
        "kob_receipt": rel(root, kob),
        "hermes_status": hermes_payload.get("status"),
        "kob_status": kob_payload.get("status"),
        "hermes_latest_worker_packet": rel(root, latest_hermes_packet) if latest_hermes_packet else None,
        "kob_latest_worker_packet": rel(root, latest_kob_packet) if latest_kob_packet else None,
        "hermes_receipt_matches_latest_packet": hermes_matches_latest_packet,
        "kob_receipt_matches_latest_packet": kob_matches_latest_packet,
        "hermes_latest_worker_packet_sha256": (
            hashlib.sha256(latest_hermes_packet.read_bytes()).hexdigest() if latest_hermes_packet else None
        ),
        "kob_latest_worker_packet_sha256": (
            hashlib.sha256(latest_kob_packet.read_bytes()).hexdigest() if latest_kob_packet else None
        ),
    }


def receipt_packet_paths(payload: dict[str, Any]) -> list[str]:
    paths: list[str] = []
    direct = payload.get("packet_path")
    if isinstance(direct, str):
        paths.append(direct)
    source_packet = payload.get("source_packet")
    if isinstance(source_packet, dict) and isinstance(source_packet.get("packet_path"), str):
        paths.append(source_packet["packet_path"])
    return paths


def receipt_matches_packet(root: Path, payload: dict[str, Any], packet_path: Path) -> bool:
    packet_rel = rel(root, packet_path)
    return any(candidate == packet_rel for candidate in receipt_packet_paths(payload))


def worker_receipt_path_for_packet(root: Path, packet_path: Path, target: str) -> Path:
    packet_id = packet_path.stem
    try:
        payload = read_json(packet_path)
        if isinstance(payload, dict):
            packet_id = str(payload.get("id") or payload.get("packet_id") or packet_path.stem)
    except (json.JSONDecodeError, OSError):
        pass
    prefix = "hermes_route" if target == "hermes" else "kob_verdict"
    return root / f".ghostclaw_runtime/a2a2a/receipts/{safe_receipt_id(f'{prefix}_{packet_id}')}.json"


def worker_receipt_path(root: Path, seq: str, target: str, packet_path: Path | None = None) -> Path | None:
    if packet_path is not None:
        return worker_receipt_path_for_packet(root, packet_path, target)
    if target == "hermes":
        return _hermes_receipt(root, seq)
    return _kob_receipt(root, seq)


def inflight_ack_status(root: Path, item: dict[str, Any]) -> dict[str, Any] | None:
    seq = packet_sequence(item)
    if not seq:
        return None
    latest_worker_packets: list[dict[str, Any]] = []
    pending_targets: list[dict[str, Any]] = []
    for target in ("hermes", "kob"):
        inbox = root / f".ghostclaw_runtime/a2a2a/inbox/{target}"
        worker_packets = sorted(inbox.glob(f"queue_coord_packet_{seq}_{target}_*.json"))
        if not worker_packets:
            continue
        packet_path = worker_packets[-1]
        receipt_path = worker_receipt_path(root, seq, target, packet_path)
        receipt_status = "missing"
        receipt_packet_path = None
        receipt_matches_latest_packet = False
        if receipt_path is not None and receipt_path.is_file():
            try:
                receipt_payload = read_json(receipt_path)
                receipt_status = str(receipt_payload.get("status") or "unknown")
                receipt_paths = receipt_packet_paths(receipt_payload)
                receipt_packet_path = receipt_paths[0] if receipt_paths else None
                receipt_matches_latest_packet = receipt_matches_packet(root, receipt_payload, packet_path)
            except (json.JSONDecodeError, OSError):
                receipt_status = "invalid_json"
        record = {
            "target": target,
            "packet_path": rel(root, packet_path),
            "packet_sha256": hashlib.sha256(packet_path.read_bytes()).hexdigest(),
            "expected_receipt": rel(root, receipt_path) if receipt_path else None,
            "receipt_status": receipt_status,
            "receipt_packet_path": receipt_packet_path,
            "receipt_matches_latest_packet": receipt_matches_latest_packet,
        }
        latest_worker_packets.append(record)
        if not receipt_matches_latest_packet:
            pending_targets.append(record)
    if not pending_targets:
        return None
    return {
        "packet_sequence": seq,
        "status": "waiting_for_role_worker_ack",
        "latest_worker_packets": latest_worker_packets,
        "pending_targets": pending_targets,
    }


def load_current_dry_run(root: Path) -> dict[str, Any]:
    script_path = Path(__file__).resolve().with_name("ghostclaw_a2a_queue_coordinator.py")
    spec = importlib.util.spec_from_file_location("ghostclaw_a2a_queue_coordinator", script_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load coordinator from {script_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.configure_root(str(root))
    return module.coordinate(write_receipt=False, dry_run=True, project_queue_mode="dry-run")


def normalize(value: Any) -> str:
    return str(value or "").replace("_", " ").replace("-", " ").lower()


def item_text(item: dict[str, Any]) -> str:
    fields = [
        item.get("id"),
        item.get("path"),
        item.get("title"),
        item.get("agent"),
        item.get("folder"),
        item.get("status"),
        item.get("gate_lane"),
        " ".join(item.get("blockers", []) if isinstance(item.get("blockers"), list) else []),
    ]
    return normalize(" ".join(str(field or "") for field in fields))


def focus_for_item(item: dict[str, Any]) -> tuple[str, str]:
    text = item_text(item)
    for label, needles in ACTIVE_FOCUS.items():
        if any(normalize(needle) in text for needle in needles):
            return "active", label
    for label, needles in PAUSED_FOCUS.items():
        if any(normalize(needle) in text for needle in needles):
            return "paused", label
    return "support", "support"


def priority_value(item: dict[str, Any]) -> int:
    text = item_text(item)
    if "highest" in text or "urgent" in text:
        return 30
    if "high" in text:
        return 20
    if "low" in text:
        return -10
    return 0


def classify_source(source: str, item: dict[str, Any]) -> tuple[str, int]:
    if source == "would_dispatch":
        return "ready_for_local_worker_plan", 20
    if source == "would_gate":
        return "approval_gate_required", -100
    if item.get("decision") == "observe_done_only":
        return "closed_done", -80
    if item.get("decision") == "observe_working_only":
        return "observe_working", -20
    return "observe_only", 0


def score_item(root: Path, source: str, item: dict[str, Any]) -> dict[str, Any]:
    focus_state, focus_label = focus_for_item(item)
    lane_status, lane_score = classify_source(source, item)
    focus_score = 50 if focus_state == "active" else -200 if focus_state == "paused" else 0
    blockers = list(item.get("blockers", []) if isinstance(item.get("blockers"), list) else [])
    completion_ack = receiver_ack_status(root, item)
    inflight_ack = inflight_ack_status(root, item)
    if completion_ack and lane_status == "ready_for_local_worker_plan":
        lane_status = "already_acknowledged_local_safety_blocked"
        lane_score = -120
        blockers.append("already_acknowledged_local_safety_blocked")
    elif inflight_ack and lane_status == "ready_for_local_worker_plan":
        lane_status = "worker_envelopes_inflight_ack_pending"
        lane_score = -110
        blockers.append("worker_envelopes_inflight_ack_pending")
    score = focus_score + lane_score + priority_value(item)
    can_prepare_local_packet = focus_state == "active" and lane_status == "ready_for_local_worker_plan" and not blockers
    return {
        "id": item.get("id"),
        "path": item.get("path"),
        "title": item.get("title"),
        "agent": item.get("agent"),
        "risk": item.get("risk"),
        "source_bucket": source,
        "focus_state": focus_state,
        "focus_label": focus_label,
        "lane_status": lane_status,
        "score": score,
        "blockers": blockers,
        "gate_lane": item.get("gate_lane"),
        "required_gates": item.get("required_gates", []),
        "planned_worker_packets": item.get("worker_packets", []),
        "can_prepare_local_packet": can_prepare_local_packet,
        "source_mutation_allowed": False,
        "external_action_allowed": False,
        "completion_ack": completion_ack,
        "inflight_ack": inflight_ack,
    }


def ranked_packets(root: Path, dry_run_report: dict[str, Any], limit: int) -> list[dict[str, Any]]:
    packets: list[dict[str, Any]] = []
    for source in ("would_dispatch", "would_gate", "observed"):
        for item in dry_run_report.get(source, []):
            if isinstance(item, dict):
                scored = score_item(root, source, item)
                scored["recommended_gate"] = gate_recommendation(scored)
                packets.append(scored)
    packets.sort(
        key=lambda item: (
            -int(item["can_prepare_local_packet"]),
            -int(item["score"]),
            normalize(item.get("focus_label")),
            normalize(item.get("id")),
        )
    )
    return packets[:limit]


GENERIC_GATE = "APPROVE_GATE_SPECIFIC_ACTION"


def gate_slug(value: Any, max_len: int = 96) -> str:
    slug = re.sub(r"[^A-Za-z0-9]+", "_", str(value or "").upper())
    slug = re.sub(r"_+", "_", slug).strip("_")
    return (slug or "UNKNOWN")[:max_len].rstrip("_")


def suggested_gate_phrase(item: dict[str, Any]) -> str:
    packet_id = gate_slug(item.get("id"), max_len=40)
    label = gate_slug(item.get("title") or item.get("path") or item.get("gate_lane"), max_len=96)
    prefix = f"APPROVE_A2A2A_{packet_id}_"
    return prefix + label[: max(8, 140 - len(prefix))].rstrip("_")


def gate_recommendation(item: dict[str, Any]) -> dict[str, Any] | None:
    required_gates = [str(gate) for gate in item.get("required_gates", []) if gate]
    if not required_gates:
        return None
    base = {
        "requires_human_approval": True,
        "source_required_gates": required_gates,
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }
    if required_gates != [GENERIC_GATE]:
        return {
            **base,
            "type": "existing_required_gates",
            "phrases": required_gates,
            "reason": "Coordinator already emitted exact required gates; preserve them unchanged.",
        }
    return {
        **base,
        "type": "suggested_exact_gate_for_generic_gate",
        "phrases": [suggested_gate_phrase(item)],
        "reason": "Generic gate converted into a deterministic review-only approval phrase for the operator.",
    }


def compact_packet(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": item.get("id"),
        "path": item.get("path"),
        "title": item.get("title"),
        "focus_state": item.get("focus_state"),
        "focus_label": item.get("focus_label"),
        "lane_status": item.get("lane_status"),
        "blockers": item.get("blockers", []),
        "required_gates": item.get("required_gates", []),
        "recommended_gate": item.get("recommended_gate") or gate_recommendation(item),
        "gate_lane": item.get("gate_lane"),
        "can_prepare_local_packet": item.get("can_prepare_local_packet"),
    }


def build_queue_drain_status(items: list[dict[str, Any]]) -> dict[str, Any]:
    ready_active = [item for item in items if item["can_prepare_local_packet"] and item.get("focus_state") == "active"]
    active_inflight = [
        item
        for item in items
        if item.get("focus_state") == "active" and item.get("lane_status") == "worker_envelopes_inflight_ack_pending"
    ]
    active_gates = [
        item
        for item in items
        if item.get("focus_state") == "active" and item.get("lane_status") == "approval_gate_required"
    ]
    support_ready = [item for item in items if item["can_prepare_local_packet"] and item.get("focus_state") == "support"]
    if ready_active:
        status = "ready_active_packet_available"
        next_safe_action = "dispatch_ready_active_packet_after_scoped_lease"
    elif active_inflight:
        status = "ack_reconcile_required"
        next_safe_action = "reconcile_current_worker_ack_receipts_before_new_dispatch"
    elif active_gates:
        status = "active_gate_review_required"
        next_safe_action = "review_active_focus_gate_candidates_before_queue_replenish"
    elif support_ready:
        status = "support_packet_available"
        next_safe_action = "optionally_promote_support_packet_after_active_focus_review"
    else:
        status = "queue_drained_no_actionable_packet"
        next_safe_action = "create_new_active_focus_packet_or_refresh_queue"
    next_gate_packet = compact_packet(active_gates[0]) if active_gates else None
    recommended_next_gate = None
    if next_gate_packet and next_gate_packet.get("recommended_gate"):
        recommended_next_gate = next_gate_packet["recommended_gate"]["phrases"][0]
    return {
        "status": status,
        "ready_active_count": len(ready_active),
        "active_inflight_ack_pending_count": len(active_inflight),
        "active_gate_count": len(active_gates),
        "support_ready_count": len(support_ready),
        "next_ack_reconcile_packet": compact_packet(active_inflight[0]) if active_inflight else None,
        "next_gate_packet": next_gate_packet,
        "recommended_next_gate_phrase": recommended_next_gate,
        "next_support_packet": compact_packet(support_ready[0]) if support_ready else None,
        "active_gate_candidates": [compact_packet(item) for item in active_gates[:5]],
        "active_inflight_candidates": [compact_packet(item) for item in active_inflight[:5]],
        "next_safe_action": next_safe_action,
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }


def count_where(items: list[dict[str, Any]], key: str, value: str) -> int:
    return sum(1 for item in items if item.get(key) == value)


def build_lane_assignments(items: list[dict[str, Any]]) -> dict[str, Any]:
    next_ready = next((item for item in items if item["can_prepare_local_packet"]), None)
    next_gate = next((item for item in items if item["lane_status"] == "approval_gate_required"), None)
    queue_drain = build_queue_drain_status(items)
    control_next_action = (
        "review_ranked_packets_and_issue_lease_for_next_ready_packet"
        if next_ready
        else queue_drain["next_safe_action"]
    )
    return {
        "queue_drain": queue_drain,
        "hermes_orchestrator": {
            "role": "control",
            "next_action": control_next_action,
            "selected_packet": next_ready["id"] if next_ready else None,
        },
        "codex_builder": {
            "role": "local_builder_after_file_lease",
            "next_action": "prepare_scoped_local_packet_only_after_file_lease",
            "selected_packet": next_ready["id"] if next_ready else None,
            "source_mutation_allowed_now": False,
        },
        "opencode_reviewer": {
            "role": "read_only_review",
            "next_action": "review_previous_completed_packet_or_current_plan_snapshot",
            "source_mutation_allowed_now": False,
        },
        "kob_context_router": {
            "role": "context_compression",
            "next_action": "compress_active_focus_context_for_selected_packet" if next_ready else "standby",
            "selected_packet": next_ready["id"] if next_ready else None,
        },
        "validator": {
            "role": "evidence",
            "next_action": "validate_json_diff_and_blocked_actions_for_selected_packet" if next_ready else "validate_gate_records",
            "selected_packet": next_ready["id"] if next_ready else next_gate["id"] if next_gate else None,
        },
    }


def build_orchestrator_plan(root: Path, dry_run_report: dict[str, Any], limit: int = 20) -> dict[str, Any]:
    if dry_run_report.get("dry_run") is not True:
        raise ValueError("orchestrator requires a dry-run coordinator report")
    items = ranked_packets(root, dry_run_report, limit)
    next_ready = next((item for item in items if item["can_prepare_local_packet"]), None)
    queue_drain = build_queue_drain_status(items)
    packet_counts = dry_run_report.get("packet_counts", {})
    return {
        "schema": "ghostclaw.a2a2a.agent_orchestrator.v1",
        "packet_id": PACKET_ID,
        "status": "pass",
        "mode": "local_safe_orchestrator_dry_run_no_execution",
        "created_at": now_iso(),
        "repo": str(root),
        "active_focus": list(ACTIVE_FOCUS.keys()),
        "paused_focus": list(PAUSED_FOCUS.keys()),
        "summary": {
            "total_packets": packet_counts.get("total", 0),
            "would_dispatch": packet_counts.get("would_dispatch", 0),
            "would_gate": packet_counts.get("would_gate", 0),
            "observed": packet_counts.get("observed", 0),
            "active_ranked_packets": count_where(items, "focus_state", "active"),
            "paused_ranked_packets": count_where(items, "focus_state", "paused"),
            "support_ranked_packets": count_where(items, "focus_state", "support"),
            "ready_active_packets": sum(1 for item in items if item["can_prepare_local_packet"]),
            "next_packet": next_ready,
        },
        "lane_assignments": build_lane_assignments(items),
        "queue_drain": queue_drain,
        "ranked_packets": items,
        "guardrails": {
            "source_mutation": False,
            "queue_file_mutation": False,
            "worker_execution": False,
            "provider_call": False,
            "live_send": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloud_mutation": False,
            "secret_read": False,
            "key_printing": False,
        },
        "blocked_actions_preserved": BLOCKED_ACTIONS,
        "next_safe_action": (
            "Create a scoped local packet, file lease, and validation command list for summary.next_packet; "
            "external actions remain separately gated."
            if next_ready
            else queue_drain["next_safe_action"]
        ),
    }


def build_compact_plan(plan: dict[str, Any]) -> dict[str, Any]:
    """Return sidebar-safe status without the heavy ranked packet list."""
    queue_drain = plan["queue_drain"]
    next_gate_packet = queue_drain.get("next_gate_packet")
    next_gate_phrases: list[str] = []
    if isinstance(next_gate_packet, dict):
        recommended_gate = next_gate_packet.get("recommended_gate")
        if isinstance(recommended_gate, dict):
            next_gate_phrases = [str(phrase) for phrase in recommended_gate.get("phrases", [])]
    next_packet = plan["summary"].get("next_packet")
    lane_next_actions = {
        name: {
            "next_action": lane.get("next_action"),
            "selected_packet": lane.get("selected_packet"),
            "source_mutation_allowed_now": bool(lane.get("source_mutation_allowed_now", False)),
        }
        for name, lane in plan["lane_assignments"].items()
        if name != "queue_drain" and isinstance(lane, dict)
    }
    compact = {
        "schema": "ghostclaw.a2a2a.agent_orchestrator.compact.v1",
        "packet_id": plan["packet_id"],
        "status": plan["status"],
        "mode": "local_safe_orchestrator_compact_status_no_execution",
        "created_at": plan["created_at"],
        "repo": plan["repo"],
        "active_focus": plan["active_focus"],
        "paused_focus": plan["paused_focus"],
        "summary": {
            "total_packets": plan["summary"].get("total_packets", 0),
            "would_dispatch": plan["summary"].get("would_dispatch", 0),
            "would_gate": plan["summary"].get("would_gate", 0),
            "observed": plan["summary"].get("observed", 0),
            "ready_active_packets": plan["summary"].get("ready_active_packets", 0),
            "next_packet": compact_packet(next_packet) if isinstance(next_packet, dict) else None,
        },
        "queue_drain": {
            "status": queue_drain.get("status"),
            "ready_active_count": queue_drain.get("ready_active_count", 0),
            "active_inflight_ack_pending_count": queue_drain.get("active_inflight_ack_pending_count", 0),
            "active_gate_count": queue_drain.get("active_gate_count", 0),
            "support_ready_count": queue_drain.get("support_ready_count", 0),
            "next_ack_reconcile_packet": queue_drain.get("next_ack_reconcile_packet"),
            "next_gate_packet": next_gate_packet,
            "next_gate_phrases": next_gate_phrases,
            "recommended_next_gate_phrase": queue_drain.get("recommended_next_gate_phrase"),
            "next_safe_action": queue_drain.get("next_safe_action"),
            "external_action_allowed": False,
            "source_mutation_allowed_now": False,
        },
        "lane_next_actions": lane_next_actions,
        "guardrails": plan["guardrails"],
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": plan["next_safe_action"],
    }
    if plan.get("receipt_path"):
        compact["receipt_path"] = plan["receipt_path"]
    return compact


def build_compact_status_receipt(compact: dict[str, Any], compact_path: str, evidence_path: str | None) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.compact_status_receipt.v1",
        "packet_id": compact.get("packet_id"),
        "status": "recorded_compact_status_snapshot",
        "created_at": now_iso(),
        "repo": compact.get("repo"),
        "compact_status_path": compact_path,
        "full_evidence_path": evidence_path,
        "compact_status": compact.get("status"),
        "queue_drain_status": (compact.get("queue_drain") or {}).get("status"),
        "opencode_post_handoff_router_status": (compact.get("opencode_post_handoff_router_status") or {}).get("status"),
        "next_safe_action": compact.get("next_safe_action"),
        "external_actions_performed": {
            "candidate_review_result_write": False,
            "real_review_result_write": False,
            "queue_file_write": False,
            "queue_payload_execution": False,
            "guard_script_write": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
    }


def build_compact_snapshot_freshness(root: Path, compact_input: str | None) -> dict[str, Any]:
    external_actions = {
        **local_safe_external_actions(),
        "candidate_review_result_write": False,
        "real_review_result_write": False,
        "guard_script_write": False,
    }
    compact_path, compact = load_optional_json(root, compact_input)
    issues: list[str] = []
    if not isinstance(compact, dict):
        return {
            "schema": "ghostclaw.a2a2a.compact_snapshot_freshness.v1",
            "packet_id": "A2A2A-P205-COMPACT-SNAPSHOT-FRESHNESS-GUARD-20260704",
            "status": "compact_snapshot_missing",
            "created_at": now_iso(),
            "repo": str(root),
            "compact_status_path": rel(root, compact_path) if compact_path else compact_input,
            "issues": ["compact_snapshot_missing_or_invalid"],
            "recommended_next_action": "rerun_compact_snapshot",
            "external_actions_performed": external_actions,
        }
    post = compact.get("opencode_post_handoff_router_status")
    if not isinstance(post, dict):
        issues.append("opencode_post_handoff_router_status_missing")
        post = {}
    candidate_path = str(post.get("candidate_review_result_path") or DEFAULT_PACKET078_OPENCODE_REVIEW_CANDIDATE)
    real_result_path = str(
        post.get("real_review_result_path")
        or ".ghostclaw_runtime/a2a2a/reviews/A2A2A-P175-PACKET078-TRANSITION-OPENCODE-REVIEW-RESULT-20260704.json"
    )
    target_queue_path = str(post.get("target_queue_path") or "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json")
    p193_guard_path = str(post.get("p193_guard_path") or DEFAULT_PACKET078_CANDIDATE_COPY_COMMAND_OUTPUT)
    candidate_exists = resolve_under_root(root, candidate_path).is_file()
    real_result_exists = resolve_under_root(root, real_result_path).exists()
    target_queue_exists = resolve_under_root(root, target_queue_path).exists()
    p193_guard_exists = resolve_under_root(root, p193_guard_path).exists()
    snapshot_status = str(post.get("status") or "")
    if issues:
        status = "compact_snapshot_incomplete"
        recommended_next_action = "rerun_compact_snapshot"
    elif snapshot_status == "waiting_for_opencode_candidate" and candidate_exists:
        status = "stale_refresh_required_candidate_arrived"
        recommended_next_action = "rerun_compact_snapshot_and_p201_router"
    elif snapshot_status == "waiting_for_opencode_candidate" and not candidate_exists and not real_result_exists and not target_queue_exists:
        status = "fresh_waiting_for_opencode_candidate"
        recommended_next_action = "paste_p195_prompt_into_opencode"
    elif snapshot_status == "ready_for_exact_p193_candidate_copy_gate" and candidate_exists and not real_result_exists and not target_queue_exists:
        status = "fresh_ready_for_exact_p193_candidate_copy_gate"
        recommended_next_action = "request_exact_p193_candidate_copy_gate"
    elif real_result_exists or target_queue_exists or p193_guard_exists:
        status = "stale_refresh_required_downstream_artifact_exists"
        recommended_next_action = "rerun_sequence_status_and_compact_snapshot"
    else:
        status = "compact_snapshot_state_unknown_refresh_required"
        recommended_next_action = "rerun_compact_snapshot"
    return {
        "schema": "ghostclaw.a2a2a.compact_snapshot_freshness.v1",
        "packet_id": "A2A2A-P205-COMPACT-SNAPSHOT-FRESHNESS-GUARD-20260704",
        "status": status,
        "created_at": now_iso(),
        "repo": str(root),
        "compact_status_path": rel(root, compact_path) if compact_path else compact_input,
        "snapshot_status": snapshot_status or None,
        "candidate_review_result_path": candidate_path,
        "candidate_review_result_exists": candidate_exists,
        "real_review_result_path": real_result_path,
        "real_review_result_path_exists": real_result_exists,
        "target_queue_path": target_queue_path,
        "target_queue_path_exists": target_queue_exists,
        "p193_guard_path": p193_guard_path,
        "p193_guard_exists": p193_guard_exists,
        "issues": issues,
        "recommended_next_action": recommended_next_action,
        "external_actions_performed": external_actions,
    }


def build_compact_snapshot_freshness_receipt(freshness: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.compact_snapshot_freshness_receipt.v1",
        "packet_id": freshness["packet_id"],
        "status": "recorded_compact_snapshot_freshness",
        "freshness_status": freshness["status"],
        "created_at": now_iso(),
        "repo": freshness["repo"],
        "evidence_path": evidence_path,
        "compact_status_path": freshness.get("compact_status_path"),
        "candidate_review_result_exists": freshness.get("candidate_review_result_exists"),
        "real_review_result_path_exists": freshness.get("real_review_result_path_exists"),
        "target_queue_path_exists": freshness.get("target_queue_path_exists"),
        "p193_guard_exists": freshness.get("p193_guard_exists"),
        "external_actions_performed": freshness["external_actions_performed"],
        "next_safe_action": freshness["recommended_next_action"],
    }


def build_packet078_post_candidate_reconcile_bundle_status(
    root: Path,
    plan: dict[str, Any],
    router: dict[str, Any],
    compact: dict[str, Any],
    freshness: dict[str, Any],
    router_path: str,
    compact_path: str,
    freshness_path: str,
) -> dict[str, Any]:
    """Summarize the refreshed packet_078 post-candidate local-safe surfaces."""
    freshness_status = str(freshness.get("status") or "")
    if freshness_status == "fresh_ready_for_exact_p193_candidate_copy_gate":
        status = "ready_for_exact_p193_candidate_copy_gate"
        recommended_next_action = "request_exact_p193_candidate_copy_gate"
    elif freshness_status == "fresh_waiting_for_opencode_candidate":
        status = "waiting_for_opencode_candidate"
        recommended_next_action = "paste_p195_prompt_into_opencode"
    else:
        status = "reconcile_refresh_required_or_blocked"
        recommended_next_action = str(freshness.get("recommended_next_action") or "inspect_p206_reconcile_bundle")
    return {
        "schema": "ghostclaw.a2a2a.packet078_post_candidate_reconcile_bundle.v1",
        "packet_id": "A2A2A-P206-PACKET078-POST-CANDIDATE-RECONCILE-BUNDLE-20260704",
        "status": status,
        "mode": "local_safe_packet078_post_candidate_reconcile_no_result_queue_or_guard_write",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "active_focus": plan["active_focus"],
        "paused_focus": plan["paused_focus"],
        "selected_packet": "packet_078",
        "router_status_path": router_path,
        "router_status": router.get("status"),
        "compact_status_path": compact_path,
        "compact_snapshot_status": compact.get("status"),
        "freshness_status_path": freshness_path,
        "freshness_status": freshness_status,
        "candidate_review_result_path": router.get("candidate_review_result_path"),
        "candidate_review_result_exists": bool(router.get("candidate_review_result_exists")),
        "candidate_ready_for_real_result_path": bool(router.get("candidate_ready_for_real_result_path")),
        "real_review_result_path": router.get("real_review_result_path"),
        "real_review_result_path_exists": bool(router.get("real_review_result_path_exists")),
        "target_queue_path": router.get("target_queue_path"),
        "target_queue_path_exists": bool(router.get("target_queue_path_exists")),
        "p173_guard_path": router.get("p173_guard_path"),
        "p173_guard_exists": bool(router.get("p173_guard_exists")),
        "p193_guard_path": router.get("p193_guard_path"),
        "p193_guard_exists": bool(router.get("p193_guard_exists")),
        "candidate_copy_command_after_exact_gate": router.get("candidate_copy_command_after_exact_gate"),
        "post_copy_intake_command": router.get("post_copy_intake_command"),
        "issues": {
            "router": router.get("issues", []),
            "freshness": freshness.get("issues", []),
        },
        "must_not": [
            "do_not_write_candidate_review_result_from_codex",
            "do_not_write_real_review_result_path",
            "do_not_write_packet_078",
            "do_not_execute_p167_guard",
            "do_not_create_or_run_p173_or_p193_guard",
            "do_not_write_worker_envelope",
            "do_not_call_provider",
            "do_not_send_live_message",
            "do_not_commit_push_deploy",
            "do_not_mutate_cloudflare_or_r2",
        ],
        "external_actions_performed": {
            "candidate_review_result_write": False,
            "real_review_result_write": False,
            "queue_file_write": False,
            "queue_payload_execution": False,
            "guard_script_write": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "recommended_next_action": recommended_next_action,
        "next_safe_action": (
            "Open exact P193 candidate-copy gate before any real review-result path write."
            if status == "ready_for_exact_p193_candidate_copy_gate"
            else "Paste the P195 prompt into OpenCode so OpenCode can write the P185 candidate only."
            if status == "waiting_for_opencode_candidate"
            else "Inspect P206 router/compact/freshness surfaces before advancing packet_078."
        ),
    }


def build_packet078_post_candidate_reconcile_bundle_receipt(
    bundle: dict[str, Any], evidence_path: str
) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_post_candidate_reconcile_bundle_receipt.v1",
        "packet_id": bundle["packet_id"],
        "status": "recorded_packet078_post_candidate_reconcile_bundle",
        "bundle_status": bundle["status"],
        "created_at": now_iso(),
        "repo": bundle["repo"],
        "evidence_path": evidence_path,
        "router_status_path": bundle.get("router_status_path"),
        "compact_status_path": bundle.get("compact_status_path"),
        "freshness_status_path": bundle.get("freshness_status_path"),
        "candidate_review_result_exists": bundle.get("candidate_review_result_exists"),
        "real_review_result_path_exists": bundle.get("real_review_result_path_exists"),
        "target_queue_path_exists": bundle.get("target_queue_path_exists"),
        "p193_guard_exists": bundle.get("p193_guard_exists"),
        "external_actions_performed": bundle["external_actions_performed"],
        "blocked_actions_preserved": bundle["blocked_actions_preserved"],
        "completion_claim": "P206 post-candidate reconcile bundle recorded; no candidate result, real review result, packet_078, guard script, worker envelope, live send, provider call, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": bundle["next_safe_action"],
    }


def build_packet078_candidate_arrival_watch_status(
    root: Path,
    plan: dict[str, Any],
    candidate_input: str,
    result_input: str,
    attempts_used: int,
    attempts_configured: int,
    interval_seconds: float,
    reconcile_bundle: dict[str, Any] | None,
) -> dict[str, Any]:
    candidate_path = resolve_under_root(root, candidate_input)
    real_result_path = resolve_under_root(root, result_input)
    target_queue_path = resolve_under_root(root, "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json")
    p193_guard_path = resolve_under_root(root, DEFAULT_PACKET078_CANDIDATE_COPY_COMMAND_OUTPUT)
    candidate_exists = candidate_path.is_file()
    reconcile_status = reconcile_bundle.get("status") if isinstance(reconcile_bundle, dict) else None
    if candidate_exists and reconcile_status == "ready_for_exact_p193_candidate_copy_gate":
        status = "candidate_arrived_reconcile_ready_for_exact_p193_gate"
        recommended_next_action = "request_exact_p193_candidate_copy_gate"
    elif candidate_exists:
        status = "candidate_arrived_reconcile_blocked_or_not_ready"
        recommended_next_action = "inspect_p206_reconcile_bundle"
    else:
        status = "waiting_for_opencode_candidate"
        recommended_next_action = "paste_p195_prompt_into_opencode"
    return {
        "schema": "ghostclaw.a2a2a.packet078_candidate_arrival_watch.v1",
        "packet_id": "A2A2A-P207-PACKET078-CANDIDATE-ARRIVAL-WATCH-20260704",
        "status": status,
        "mode": "local_safe_bounded_candidate_arrival_watch_no_result_queue_or_guard_write",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "active_focus": plan["active_focus"],
        "paused_focus": plan["paused_focus"],
        "selected_packet": "packet_078",
        "attempts_used": attempts_used,
        "attempts_configured": attempts_configured,
        "interval_seconds": interval_seconds,
        "candidate_review_result_path": candidate_input,
        "candidate_review_result_exists": candidate_exists,
        "real_review_result_path": result_input,
        "real_review_result_path_exists": real_result_path.exists(),
        "target_queue_path": rel(root, target_queue_path),
        "target_queue_path_exists": target_queue_path.exists(),
        "p193_guard_path": rel(root, p193_guard_path),
        "p193_guard_exists": p193_guard_path.exists(),
        "reconcile_bundle_refreshed": isinstance(reconcile_bundle, dict),
        "reconcile_bundle_status": reconcile_status,
        "reconcile_bundle_path": reconcile_bundle.get("reconcile_bundle_path") if isinstance(reconcile_bundle, dict) else None,
        "candidate_copy_command_after_exact_gate": (
            reconcile_bundle.get("candidate_copy_command_after_exact_gate")
            if isinstance(reconcile_bundle, dict)
            else None
        ),
        "external_actions_performed": {
            "candidate_review_result_write": False,
            "real_review_result_write": False,
            "queue_file_write": False,
            "queue_payload_execution": False,
            "guard_script_write": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "recommended_next_action": recommended_next_action,
        "next_safe_action": (
            "Open exact P193 candidate-copy gate before any real review-result path write."
            if status == "candidate_arrived_reconcile_ready_for_exact_p193_gate"
            else "Paste the P195 prompt into OpenCode so OpenCode can write the P185 candidate only."
            if status == "waiting_for_opencode_candidate"
            else "Inspect P206 reconcile output before advancing packet_078."
        ),
    }


def build_packet078_candidate_arrival_watch_receipt(
    watch: dict[str, Any], evidence_path: str
) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_candidate_arrival_watch_receipt.v1",
        "packet_id": watch["packet_id"],
        "status": "recorded_packet078_candidate_arrival_watch",
        "watch_status": watch["status"],
        "created_at": now_iso(),
        "repo": watch["repo"],
        "evidence_path": evidence_path,
        "candidate_review_result_exists": watch.get("candidate_review_result_exists"),
        "real_review_result_path_exists": watch.get("real_review_result_path_exists"),
        "target_queue_path_exists": watch.get("target_queue_path_exists"),
        "p193_guard_exists": watch.get("p193_guard_exists"),
        "attempts_used": watch.get("attempts_used"),
        "reconcile_bundle_refreshed": watch.get("reconcile_bundle_refreshed"),
        "reconcile_bundle_status": watch.get("reconcile_bundle_status"),
        "external_actions_performed": watch["external_actions_performed"],
        "blocked_actions_preserved": watch["blocked_actions_preserved"],
        "completion_claim": "P207 candidate arrival watch recorded; no candidate result, real review result, packet_078, guard script, worker envelope, live send, provider call, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": watch["next_safe_action"],
    }


def render_packet078_opencode_operator_handoff_script(
    root: Path,
    prompt_path: str,
    prompt_sha256: str,
    candidate_input: str,
    result_input: str,
    command_output: str,
    compact_output: str,
    compact_receipt_output: str,
    freshness_output: str,
    freshness_receipt_output: str,
    reconcile_output: str,
    reconcile_receipt_output: str,
    watch_output: str,
    watch_receipt_output: str,
    operator_status_brief_output: str,
    operator_status_brief_receipt_output: str,
    watch_stall_status_output: str,
    watch_stall_status_receipt_output: str,
    attempts: int,
    interval: float,
) -> str:
    return f"""#!/usr/bin/env bash
# P208 local-safe OpenCode operator handoff helper.
# Usage:
#   bash {command_output} --copy
#   bash {command_output} --copy-with-receipt
#   bash {command_output} --watch-after-paste
set -euo pipefail

REPO={shlex.quote(str(root))}
PROMPT=\"$REPO/{prompt_path}\"
EXPECTED_PROMPT_SHA256={shlex.quote(prompt_sha256)}
MODE=\"${{1:---copy}}\"

if [[ ! -f \"$PROMPT\" ]]; then
  echo \"ERROR: P195 prompt missing: $PROMPT\" >&2
  exit 2
fi

ACTUAL_PROMPT_SHA256=\"$(shasum -a 256 \"$PROMPT\" | awk '{{print $1}}')\"
if [[ \"$ACTUAL_PROMPT_SHA256\" != \"$EXPECTED_PROMPT_SHA256\" ]]; then
  echo \"ERROR: P195 prompt checksum mismatch\" >&2
  exit 3
fi

case \"$MODE\" in
  --copy)
    pbcopy < \"$PROMPT\"
    echo \"P208: P195 prompt copied to clipboard. Paste it into OpenCode, then run: bash {command_output} --watch-after-paste\"
    ;;
  --copy-with-receipt)
    pbcopy < \"$PROMPT\"
    cd \"$REPO\"
    python3 - \"$REPO\" \"$PROMPT\" \"$ACTUAL_PROMPT_SHA256\" {shlex.quote(DEFAULT_PACKET078_OPENCODE_CLIPBOARD_LOAD_STATUS)} {shlex.quote(DEFAULT_PACKET078_OPENCODE_CLIPBOARD_LOAD_RECEIPT)} <<'PY'
import json
import sys
import time
from pathlib import Path

repo = Path(sys.argv[1])
prompt_path = Path(sys.argv[2])
prompt_sha256 = sys.argv[3]
status_rel = sys.argv[4]
receipt_rel = sys.argv[5]
status_path = repo / status_rel
receipt_path = repo / receipt_rel
status_path.parent.mkdir(parents=True, exist_ok=True)
receipt_path.parent.mkdir(parents=True, exist_ok=True)
created_at = time.strftime("%Y-%m-%dT%H:%M:%S%z")
payload = dict(
    schema="ghostclaw.a2a2a.packet078_p195_clipboard_load_status.v1",
    packet_id="A2A2A-P220-PACKET078-P195-CLIPBOARD-LOAD-STATUS-20260704",
    status="copied_to_local_clipboard_operator_must_paste_manually",
    mode="local_clipboard_only_no_external_send",
    created_at=created_at,
    repo=str(repo),
    prompt_path=str(prompt_path.relative_to(repo)),
    prompt_sha256=prompt_sha256,
    next_safe_action="Paste the P195 prompt into OpenCode manually, wait for P185 only, then run P208 --watch-after-paste.",
    external_actions_performed=dict(
        local_clipboard_write=True,
        opencode_paste=False,
        candidate_review_result_write=False,
        real_review_result_write=False,
        queue_file_write=False,
        p193_guard_write=False,
        telegram_live_send=False,
        provider_call=False,
        repo_or_customer_data_external_routing=False,
        secret_read_or_print=False,
        install=False,
        commit=False,
        push=False,
        deploy=False,
        cloudflare_or_r2_mutation=False,
    ),
)
receipt = dict(
    schema="ghostclaw.a2a2a.packet078_p195_clipboard_load_receipt.v1",
    packet_id="A2A2A-P220-PACKET078-P195-CLIPBOARD-LOAD-RECEIPT-20260704",
    status="recorded_local_clipboard_load",
    created_at=created_at,
    repo=str(repo),
    source_status_path=status_rel,
    prompt_path=payload["prompt_path"],
    prompt_sha256=prompt_sha256,
    external_actions_performed=payload["external_actions_performed"],
    completion_claim="P195 prompt copied to local clipboard only; operator must paste into OpenCode manually. No candidate, real result, queue, guard, live send, provider call, commit, push, deploy, or cloud mutation was performed.",
    next_safe_action=payload["next_safe_action"],
)
status_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\\n", encoding="utf-8")
receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\\n", encoding="utf-8")
print("P220: P195 prompt copied to local clipboard; receipt written:", receipt_rel)
PY
    ;;
  --watch-after-paste)
    cd \"$REPO\"
    python3 scripts/ghostclaw_a2a_agent_orchestrator.py \\
      --write \\
      --packet078-candidate-arrival-watch \\
      --packet078-candidate-watch-attempts {attempts} \\
      --packet078-candidate-watch-interval {interval} \\
      --packet078-opencode-review-candidate {shlex.quote(candidate_input)} \\
      --packet078-opencode-review-result {shlex.quote(result_input)} \\
      --packet078-candidate-copy-command-output {shlex.quote(DEFAULT_PACKET078_CANDIDATE_COPY_COMMAND_OUTPUT)} \\
      --compact-output {shlex.quote(compact_output)} \\
      --compact-receipt-output {shlex.quote(compact_receipt_output)} \\
      --compact-freshness-output {shlex.quote(freshness_output)} \\
      --compact-freshness-receipt-output {shlex.quote(freshness_receipt_output)} \\
      --packet078-post-candidate-reconcile-output {shlex.quote(reconcile_output)} \\
      --packet078-post-candidate-reconcile-receipt-output {shlex.quote(reconcile_receipt_output)} \\
      --packet078-candidate-arrival-watch-output {shlex.quote(watch_output)} \\
      --packet078-candidate-arrival-watch-receipt-output {shlex.quote(watch_receipt_output)}
    python3 scripts/ghostclaw_a2a_agent_orchestrator.py \\
      --write \\
      --packet078-opencode-review-candidate-preflight \\
      --packet078-opencode-review-candidate {shlex.quote(candidate_input)} \\
      --packet078-opencode-review-result {shlex.quote(result_input)} \\
      --output {shlex.quote(DEFAULT_PACKET078_OPENCODE_REVIEW_CANDIDATE_PREFLIGHT_OUTPUT)} \\
      --receipt {shlex.quote(DEFAULT_PACKET078_OPENCODE_REVIEW_CANDIDATE_PREFLIGHT_RECEIPT)}
    python3 scripts/ghostclaw_a2a_agent_orchestrator.py \\
      --write \\
      --packet078-opencode-operator-status-brief \\
      --packet078-opencode-operator-handoff-status-output {shlex.quote(DEFAULT_PACKET078_OPENCODE_OPERATOR_HANDOFF_STATUS_OUTPUT)} \\
      --packet078-opencode-operator-status-brief-output {shlex.quote(operator_status_brief_output)} \\
      --packet078-opencode-operator-status-brief-receipt-output {shlex.quote(operator_status_brief_receipt_output)} \\
      --packet078-opencode-candidate-paste-prompt-output {shlex.quote(prompt_path)} \\
      --packet078-opencode-operator-handoff-command-output {shlex.quote(command_output)} \\
      --packet078-opencode-review-candidate {shlex.quote(candidate_input)} \\
      --packet078-opencode-review-result {shlex.quote(result_input)} \\
      --packet078-candidate-copy-command-output {shlex.quote(DEFAULT_PACKET078_CANDIDATE_COPY_COMMAND_OUTPUT)}
    python3 scripts/ghostclaw_a2a_agent_orchestrator.py \\
      --write \\
      --packet078-opencode-watch-stall-status \\
      --packet078-candidate-arrival-watch-output {shlex.quote(watch_output)} \\
      --packet078-opencode-operator-status-brief-output {shlex.quote(operator_status_brief_output)} \\
      --packet078-opencode-watch-stall-status-output {shlex.quote(watch_stall_status_output)} \\
      --packet078-opencode-watch-stall-status-receipt-output {shlex.quote(watch_stall_status_receipt_output)} \\
      --packet078-opencode-review-candidate {shlex.quote(candidate_input)} \\
      --packet078-opencode-review-result {shlex.quote(result_input)} \\
      --packet078-candidate-copy-command-output {shlex.quote(DEFAULT_PACKET078_CANDIDATE_COPY_COMMAND_OUTPUT)}
    ;;
  *)
    echo \"Usage: bash {command_output} [--copy|--copy-with-receipt|--watch-after-paste]\" >&2
    exit 4
    ;;
esac
"""


def build_packet078_opencode_operator_handoff_pack(
    root: Path,
    plan: dict[str, Any],
    prompt_input: str,
    command_output: str,
    candidate_input: str,
    result_input: str,
    attempts: int,
    interval: float,
) -> dict[str, Any]:
    prompt_path = resolve_under_root(root, prompt_input)
    candidate_path = resolve_under_root(root, candidate_input)
    result_path = resolve_under_root(root, result_input)
    target_queue_path = resolve_under_root(root, "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json")
    p193_guard_path = resolve_under_root(root, DEFAULT_PACKET078_CANDIDATE_COPY_COMMAND_OUTPUT)
    issues: list[str] = []
    prompt_exists = prompt_path.is_file()
    prompt_sha256 = sha256_file(prompt_path) if prompt_exists else None
    if not prompt_exists:
        issues.append("p195_prompt_missing")
    if candidate_path.exists():
        issues.append("candidate_review_result_already_exists")
    if result_path.exists():
        issues.append("real_review_result_already_exists")
    if target_queue_path.exists():
        issues.append("packet_078_already_exists")
    if p193_guard_path.exists():
        issues.append("p193_guard_already_exists")
    status = "ready_for_manual_paste_and_bounded_watch" if not issues else "blocked_prompt_missing" if "p195_prompt_missing" in issues else "blocked_or_not_ready"
    command_preview = f"bash {command_output} --copy && bash {command_output} --watch-after-paste"
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_operator_handoff_pack.v1",
        "packet_id": "A2A2A-P208-PACKET078-OPENCODE-OPERATOR-HANDOFF-PACK-20260704",
        "status": status,
        "mode": "local_safe_operator_handoff_pack_no_candidate_result_queue_or_guard_write",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "active_focus": plan["active_focus"],
        "paused_focus": plan["paused_focus"],
        "selected_packet": "packet_078",
        "prompt_path": prompt_input,
        "prompt_path_exists": prompt_exists,
        "prompt_sha256": prompt_sha256,
        "command_path": command_output if status == "ready_for_manual_paste_and_bounded_watch" else None,
        "clipboard_load_command": f"bash {command_output} --copy" if status == "ready_for_manual_paste_and_bounded_watch" else None,
        "clipboard_load_with_receipt_command": f"bash {command_output} --copy-with-receipt" if status == "ready_for_manual_paste_and_bounded_watch" else None,
        "clipboard_load_status_path": DEFAULT_PACKET078_OPENCODE_CLIPBOARD_LOAD_STATUS,
        "clipboard_load_receipt_path": DEFAULT_PACKET078_OPENCODE_CLIPBOARD_LOAD_RECEIPT,
        "watch_after_manual_paste_command": f"bash {command_output} --watch-after-paste" if status == "ready_for_manual_paste_and_bounded_watch" else None,
        "watch_after_manual_paste_refreshes": packet078_p208_post_paste_refresh_steps(),
        "post_paste_refresh_chain": packet078_p208_post_paste_refresh_chain(),
        "command_preview": command_preview if status == "ready_for_manual_paste_and_bounded_watch" else None,
        "candidate_review_result_path": candidate_input,
        "candidate_review_result_exists": candidate_path.exists(),
        "real_review_result_path": result_input,
        "real_review_result_path_exists": result_path.exists(),
        "target_queue_path": rel(root, target_queue_path),
        "target_queue_path_exists": target_queue_path.exists(),
        "p193_guard_path": rel(root, p193_guard_path),
        "p193_guard_exists": p193_guard_path.exists(),
        "issues": issues,
        "external_actions_performed": {
            "candidate_review_result_write": False,
            "real_review_result_write": False,
            "queue_file_write": False,
            "queue_payload_execution": False,
            "guard_script_write": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "local_artifacts_written_when_write_enabled": [
            command_output,
        ]
        if status == "ready_for_manual_paste_and_bounded_watch"
        else [],
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            f"Run `bash {command_output} --copy-with-receipt`, paste into OpenCode, then run `bash {command_output} --watch-after-paste`."
            if status == "ready_for_manual_paste_and_bounded_watch"
            else "Regenerate P195 prompt before creating the OpenCode operator handoff command."
        ),
    }


def build_packet078_opencode_operator_handoff_pack_receipt(
    pack: dict[str, Any], evidence_path: str
) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_operator_handoff_pack_receipt.v1",
        "packet_id": pack["packet_id"],
        "status": "recorded_packet078_opencode_operator_handoff_pack",
        "pack_status": pack["status"],
        "created_at": now_iso(),
        "repo": pack["repo"],
        "evidence_path": evidence_path,
        "prompt_path": pack.get("prompt_path"),
        "prompt_sha256": pack.get("prompt_sha256"),
        "command_path": pack.get("command_path"),
        "clipboard_load_status_path": pack.get("clipboard_load_status_path"),
        "clipboard_load_receipt_path": pack.get("clipboard_load_receipt_path"),
        "clipboard_load_with_receipt_command": pack.get("clipboard_load_with_receipt_command"),
        "watch_after_manual_paste_refreshes": pack.get("watch_after_manual_paste_refreshes", []),
        "post_paste_refresh_chain": pack.get("post_paste_refresh_chain", []),
        "candidate_review_result_exists": pack.get("candidate_review_result_exists"),
        "real_review_result_path_exists": pack.get("real_review_result_path_exists"),
        "target_queue_path_exists": pack.get("target_queue_path_exists"),
        "p193_guard_exists": pack.get("p193_guard_exists"),
        "issues": pack.get("issues", []),
        "external_actions_performed": pack["external_actions_performed"],
        "blocked_actions_preserved": pack["blocked_actions_preserved"],
        "completion_claim": "P208 OpenCode operator handoff pack recorded; no candidate result, real review result, packet_078, P193 guard, worker envelope, live send, provider call, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": pack["next_safe_action"],
    }


def build_packet078_opencode_operator_handoff_status_surface(
    root: Path,
    plan: dict[str, Any],
    p208_status_input: str,
    prompt_input: str,
    command_input: str,
    candidate_input: str,
    result_input: str,
    p193_guard_input: str,
) -> dict[str, Any]:
    p208_path, p208_status = load_optional_json(root, p208_status_input)
    if isinstance(p208_status, dict):
        prompt_input = str(p208_status.get("prompt_path") or prompt_input)
        command_input = str(p208_status.get("command_path") or command_input)
        candidate_input = str(p208_status.get("candidate_review_result_path") or candidate_input)
        result_input = str(p208_status.get("real_review_result_path") or result_input)
        p193_guard_input = str(p208_status.get("p193_guard_path") or p193_guard_input)
    prompt_path = resolve_under_root(root, prompt_input)
    command_path = resolve_under_root(root, command_input)
    candidate_path = resolve_under_root(root, candidate_input)
    result_path = resolve_under_root(root, result_input)
    target_queue_path = resolve_under_root(root, "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json")
    p193_guard_path = resolve_under_root(root, p193_guard_input)

    prompt_exists = prompt_path.is_file()
    command_exists = command_path.is_file()
    candidate_exists = candidate_path.is_file()
    result_exists = result_path.exists()
    target_queue_exists = target_queue_path.exists()
    p193_guard_exists = p193_guard_path.exists()
    issues: list[str] = []
    p208_pack_status = p208_status.get("status") if isinstance(p208_status, dict) else None
    post_paste_refresh_chain = (
        p208_status.get("post_paste_refresh_chain")
        if isinstance(p208_status, dict) and isinstance(p208_status.get("post_paste_refresh_chain"), list)
        else packet078_p208_post_paste_refresh_chain()
    )
    watch_after_manual_paste_refreshes = (
        p208_status.get("watch_after_manual_paste_refreshes")
        if isinstance(p208_status, dict) and isinstance(p208_status.get("watch_after_manual_paste_refreshes"), list)
        else [step.get("step") for step in post_paste_refresh_chain if isinstance(step, dict)]
    )
    clipboard_load_with_receipt_command = (
        p208_status.get("clipboard_load_with_receipt_command")
        if isinstance(p208_status, dict) and isinstance(p208_status.get("clipboard_load_with_receipt_command"), str)
        else f"bash {command_input} --copy-with-receipt" if command_input else None
    )

    if not isinstance(p208_status, dict):
        issues.append("p208_status_missing_or_invalid")
    elif p208_pack_status != "ready_for_manual_paste_and_bounded_watch":
        issues.append(f"p208_status_not_ready:{p208_pack_status}")
    if not prompt_exists:
        issues.append("p195_prompt_missing")
    if not command_exists:
        issues.append("p208_command_missing")
    if candidate_exists:
        issues.append("candidate_review_result_already_exists")
    if result_exists:
        issues.append("real_review_result_already_exists")
    if target_queue_exists:
        issues.append("packet_078_already_exists")
    if p193_guard_exists:
        issues.append("p193_guard_already_exists")

    if candidate_exists:
        status = "stale_candidate_already_arrived"
        next_action = "run_p207_watch_or_p206_reconcile"
        next_safe_action = "Run the P207 candidate-arrival watcher or P206 post-candidate reconcile; do not paste P195 again."
    elif not issues:
        status = "ready_for_manual_paste_and_bounded_watch"
        next_action = "manual_paste_p195_then_run_p207_watch"
        next_safe_action = (
            f"Run `bash {command_input} --copy-with-receipt`, paste the P195 prompt into OpenCode, then run `bash {command_input} --watch-after-paste`."
        )
    elif "p195_prompt_missing" in issues:
        status = "blocked_prompt_missing"
        next_action = "regenerate_p195_prompt"
        next_safe_action = "Regenerate P195 before asking OpenCode to produce the candidate review result."
    else:
        status = "blocked_or_not_ready"
        next_action = "inspect_p209_issues"
        next_safe_action = "Inspect P209 issues before advancing packet_078."

    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_operator_handoff_status.v1",
        "packet_id": "A2A2A-P209-PACKET078-OPENCODE-OPERATOR-HANDOFF-STATUS-20260704",
        "status": status,
        "mode": "local_safe_operator_handoff_status_no_candidate_result_queue_or_guard_write",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "active_focus": plan["active_focus"],
        "paused_focus": plan["paused_focus"],
        "selected_packet": "packet_078",
        "source_p208_status_path": rel(root, p208_path) if p208_path else p208_status_input,
        "source_p208_status": p208_pack_status,
        "prompt_path": prompt_input,
        "prompt_path_exists": prompt_exists,
        "prompt_sha256": sha256_file(prompt_path) if prompt_exists else None,
        "command_path": command_input,
        "command_path_exists": command_exists,
        "clipboard_load_command": f"bash {command_input} --copy" if command_exists else None,
        "clipboard_load_with_receipt_command": clipboard_load_with_receipt_command if command_exists else None,
        "clipboard_load_status_path": (
            p208_status.get("clipboard_load_status_path")
            if isinstance(p208_status, dict) and isinstance(p208_status.get("clipboard_load_status_path"), str)
            else DEFAULT_PACKET078_OPENCODE_CLIPBOARD_LOAD_STATUS
        ),
        "clipboard_load_receipt_path": (
            p208_status.get("clipboard_load_receipt_path")
            if isinstance(p208_status, dict) and isinstance(p208_status.get("clipboard_load_receipt_path"), str)
            else DEFAULT_PACKET078_OPENCODE_CLIPBOARD_LOAD_RECEIPT
        ),
        "watch_after_manual_paste_command": f"bash {command_input} --watch-after-paste" if command_exists else None,
        "watch_after_manual_paste_refreshes": watch_after_manual_paste_refreshes,
        "post_paste_refresh_chain": post_paste_refresh_chain,
        "candidate_review_result_path": candidate_input,
        "candidate_review_result_exists": candidate_exists,
        "real_review_result_path": result_input,
        "real_review_result_path_exists": result_exists,
        "target_queue_path": rel(root, target_queue_path),
        "target_queue_path_exists": target_queue_exists,
        "p193_guard_path": rel(root, p193_guard_path),
        "p193_guard_exists": p193_guard_exists,
        "issues": issues,
        "next_action": next_action,
        "next_safe_action": next_safe_action,
        "external_actions_performed": {
            "candidate_review_result_write": False,
            "real_review_result_write": False,
            "queue_file_write": False,
            "queue_payload_execution": False,
            "guard_script_write": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
    }


def build_packet078_opencode_operator_handoff_status_receipt(
    status: dict[str, Any], evidence_path: str
) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_operator_handoff_status_receipt.v1",
        "packet_id": status["packet_id"],
        "status": "recorded_packet078_opencode_operator_handoff_status",
        "surface_status": status["status"],
        "created_at": now_iso(),
        "repo": status["repo"],
        "evidence_path": evidence_path,
        "source_p208_status_path": status.get("source_p208_status_path"),
        "prompt_path": status.get("prompt_path"),
        "command_path": status.get("command_path"),
        "clipboard_load_status_path": status.get("clipboard_load_status_path"),
        "clipboard_load_receipt_path": status.get("clipboard_load_receipt_path"),
        "clipboard_load_with_receipt_command": status.get("clipboard_load_with_receipt_command"),
        "watch_after_manual_paste_refreshes": status.get("watch_after_manual_paste_refreshes", []),
        "post_paste_refresh_chain": status.get("post_paste_refresh_chain", []),
        "candidate_review_result_exists": status.get("candidate_review_result_exists"),
        "real_review_result_path_exists": status.get("real_review_result_path_exists"),
        "target_queue_path_exists": status.get("target_queue_path_exists"),
        "p193_guard_exists": status.get("p193_guard_exists"),
        "issues": status.get("issues", []),
        "external_actions_performed": status["external_actions_performed"],
        "blocked_actions_preserved": status["blocked_actions_preserved"],
        "completion_claim": "P209 OpenCode operator handoff status recorded; no candidate result, real review result, packet_078, P193 guard, live send, provider call, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": status["next_safe_action"],
    }


def build_packet078_opencode_operator_status_brief(
    root: Path,
    plan: dict[str, Any],
    handoff_status_input: str,
    prompt_input: str,
    command_input: str,
    candidate_input: str,
    result_input: str,
    p193_guard_input: str,
) -> dict[str, Any]:
    handoff = build_packet078_opencode_operator_handoff_status_surface(
        root,
        plan,
        choose_packet078_operator_handoff_status_input(root, handoff_status_input, handoff_status_input),
        prompt_input,
        command_input,
        candidate_input,
        result_input,
        p193_guard_input,
    )
    source_status = handoff["status"]
    if source_status == "ready_for_manual_paste_and_bounded_watch":
        status = "ready_for_operator_manual_paste"
        commands_to_run = [
            command
            for command in [
                handoff.get("clipboard_load_with_receipt_command") or handoff.get("clipboard_load_command"),
                handoff.get("watch_after_manual_paste_command"),
            ]
            if isinstance(command, str) and command
        ]
        sidebar_summary = "packet_078 OpenCode candidate is waiting for manual P195 paste, then bounded P207 watch."
        telegram_safe_draft = (
            "P210 status: P209 is ready. Paste the P195 prompt into OpenCode, then run the bounded P207 watcher. "
            "No candidate, real result, queue write, provider call, live send, commit, push, deploy, or cloud mutation has run."
        )
        next_safe_action = handoff["next_safe_action"]
    elif source_status == "stale_candidate_already_arrived":
        status = "candidate_arrived_run_reconcile"
        commands_to_run = [
            command
            for command in [handoff.get("watch_after_manual_paste_command")]
            if isinstance(command, str) and command
        ]
        sidebar_summary = "packet_078 OpenCode candidate exists; stop manual paste and run reconcile/watch surfaces."
        telegram_safe_draft = (
            "P210 status: P185 candidate appears to exist. Do not paste P195 again. "
            "Run the P207 watcher or P206 reconcile bundle before any exact copy/queue gate."
        )
        next_safe_action = handoff["next_safe_action"]
    else:
        status = "blocked_or_not_ready"
        commands_to_run = []
        sidebar_summary = "packet_078 OpenCode operator handoff is not ready; inspect P210/P209 issues."
        telegram_safe_draft = (
            "P210 status: OpenCode operator handoff is not ready. Inspect issues before advancing packet_078."
        )
        next_safe_action = handoff["next_safe_action"]

    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_operator_status_brief.v1",
        "packet_id": "A2A2A-P210-PACKET078-OPENCODE-OPERATOR-STATUS-BRIEF-20260704",
        "status": status,
        "source_status": source_status,
        "mode": "local_safe_operator_status_brief_no_external_send",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "active_focus": plan["active_focus"],
        "paused_focus": plan["paused_focus"],
        "selected_packet": "packet_078",
        "sidebar_summary": sidebar_summary,
        "telegram_safe_draft": telegram_safe_draft,
        "commands_to_run": commands_to_run,
        "clipboard_load_with_receipt_command": handoff.get("clipboard_load_with_receipt_command"),
        "clipboard_load_status_path": handoff.get("clipboard_load_status_path"),
        "clipboard_load_receipt_path": handoff.get("clipboard_load_receipt_path"),
        "watch_after_manual_paste_refreshes": handoff.get("watch_after_manual_paste_refreshes", []),
        "post_paste_refresh_chain": handoff.get("post_paste_refresh_chain", []),
        "current_state": {
            "prompt_path": handoff.get("prompt_path"),
            "prompt_path_exists": handoff.get("prompt_path_exists"),
            "command_path": handoff.get("command_path"),
            "command_path_exists": handoff.get("command_path_exists"),
            "clipboard_load_status_path": handoff.get("clipboard_load_status_path"),
            "clipboard_load_receipt_path": handoff.get("clipboard_load_receipt_path"),
            "candidate_review_result_path": handoff.get("candidate_review_result_path"),
            "candidate_review_result_exists": handoff.get("candidate_review_result_exists"),
            "real_review_result_path": handoff.get("real_review_result_path"),
            "real_review_result_path_exists": handoff.get("real_review_result_path_exists"),
            "target_queue_path": handoff.get("target_queue_path"),
            "target_queue_path_exists": handoff.get("target_queue_path_exists"),
            "p193_guard_path": handoff.get("p193_guard_path"),
            "p193_guard_exists": handoff.get("p193_guard_exists"),
        },
        "issues": handoff.get("issues", []),
        "next_safe_action": next_safe_action,
        "external_actions_performed": {
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "candidate_review_result_write": False,
            "real_review_result_write": False,
            "queue_file_write": False,
            "queue_payload_execution": False,
            "guard_script_write": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
    }


def build_packet078_opencode_operator_status_brief_receipt(
    brief: dict[str, Any], evidence_path: str
) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_operator_status_brief_receipt.v1",
        "packet_id": brief["packet_id"],
        "status": "recorded_packet078_opencode_operator_status_brief",
        "brief_status": brief["status"],
        "source_status": brief["source_status"],
        "created_at": now_iso(),
        "repo": brief["repo"],
        "evidence_path": evidence_path,
        "commands_to_run": brief.get("commands_to_run", []),
        "clipboard_load_status_path": brief.get("clipboard_load_status_path"),
        "clipboard_load_receipt_path": brief.get("clipboard_load_receipt_path"),
        "clipboard_load_with_receipt_command": brief.get("clipboard_load_with_receipt_command"),
        "watch_after_manual_paste_refreshes": brief.get("watch_after_manual_paste_refreshes", []),
        "post_paste_refresh_chain": brief.get("post_paste_refresh_chain", []),
        "current_state": brief.get("current_state", {}),
        "issues": brief.get("issues", []),
        "external_actions_performed": brief["external_actions_performed"],
        "blocked_actions_preserved": brief["blocked_actions_preserved"],
        "completion_claim": "P210 OpenCode operator status brief recorded; no live send, provider call, candidate/result/queue/guard write, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": brief["next_safe_action"],
    }


def packet078_local_safe_external_actions() -> dict[str, bool]:
    actions = local_safe_external_actions()
    actions.update(
        {
            "candidate_review_result_write": False,
            "real_review_result_write": False,
            "guard_script_write": False,
        }
    )
    return actions


def _coerce_int(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def build_packet078_opencode_watch_stall_status(
    root: Path,
    plan: dict[str, Any],
    watch_input: str,
    brief_input: str,
    candidate_input: str,
    result_input: str,
    p193_guard_input: str,
) -> dict[str, Any]:
    watch_path, watch = load_optional_json(root, watch_input)
    brief_path, brief = load_optional_json(root, brief_input)
    if isinstance(watch, dict):
        candidate_input = str(watch.get("candidate_review_result_path") or candidate_input)
        result_input = str(watch.get("real_review_result_path") or result_input)
    candidate_path = resolve_under_root(root, candidate_input)
    result_path = resolve_under_root(root, result_input)
    target_queue_path = resolve_under_root(root, "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json")
    p193_guard_path = resolve_under_root(root, p193_guard_input)

    candidate_exists = candidate_path.is_file()
    real_result_exists = result_path.exists()
    target_queue_exists = target_queue_path.exists()
    p193_guard_exists = p193_guard_path.exists()
    attempts_used = _coerce_int(watch.get("attempts_used")) if isinstance(watch, dict) else None
    attempts_configured = _coerce_int(watch.get("attempts_configured")) if isinstance(watch, dict) else None
    watch_attempts_exhausted = (
        attempts_used is not None
        and attempts_configured is not None
        and attempts_configured > 0
        and attempts_used >= attempts_configured
    )
    watch_status = watch.get("status") if isinstance(watch, dict) else None
    brief_status = brief.get("status") if isinstance(brief, dict) else None
    issues: list[str] = []
    if not isinstance(watch, dict):
        issues.append("p207_watch_status_missing_or_invalid")
    if not isinstance(brief, dict):
        issues.append("p210_operator_status_brief_missing_or_invalid")
    if real_result_exists:
        issues.append("real_review_result_already_exists")
    if target_queue_exists:
        issues.append("packet_078_already_exists")
    if p193_guard_exists:
        issues.append("p193_guard_already_exists")

    p210_commands = [
        str(command)
        for command in (brief.get("commands_to_run", []) if isinstance(brief, dict) else [])
        if isinstance(command, str) and command.strip()
    ]
    copy_commands = [command for command in p210_commands if "--copy" in command or "pbcopy" in command]
    watch_commands = [command for command in p210_commands if "--watch-after-paste" in command]

    if candidate_exists:
        status = "candidate_arrived_run_reconcile"
        next_action = "run_p206_reconcile_or_p207_watch"
        operator_warning = "Candidate exists. Do not paste P195 again; route through P206/P207 reconcile surfaces."
        commands_to_run = [
            "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-post-candidate-reconcile-bundle --write",
            "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-candidate-arrival-watch --packet078-candidate-watch-attempts 1 --packet078-candidate-watch-interval 0 --write",
        ]
        next_safe_action = "Candidate exists; run P206/P207 reconcile before any exact P193/P167 gate."
    elif issues:
        status = "blocked_or_not_ready"
        next_action = "resolve_watch_stall_status_issues"
        operator_warning = "Watch stall status cannot advance until P207/P210 inputs and blocked artifact state are clean."
        commands_to_run = []
        next_safe_action = "Resolve P213 issues before rerunning watcher or asking OpenCode for a candidate."
    elif watch_status == "waiting_for_opencode_candidate" and watch_attempts_exhausted:
        status = "manual_opencode_candidate_required_stop_local_retry"
        next_action = "manual_paste_p195_before_rerun_watch"
        operator_warning = "Do not rerun P207 blindly. The bounded watch exhausted without a P185 candidate."
        commands_to_run = copy_commands
        next_safe_action = (
            "Run the receipted clipboard copy, paste the P195 prompt into OpenCode manually, wait for OpenCode to write P185 only, "
            "then run the bounded P208/P207 watcher once."
        )
    elif watch_status == "waiting_for_opencode_candidate":
        status = "waiting_for_opencode_candidate_watch_can_continue"
        next_action = "run_single_bounded_watch_after_manual_paste"
        operator_warning = "Candidate is still absent; run only one bounded watcher after manual OpenCode paste."
        commands_to_run = watch_commands[:1]
        next_safe_action = "If P195 was already pasted into OpenCode, run one bounded P207 watch; otherwise paste first."
    else:
        status = "watch_status_needs_inspection"
        next_action = "inspect_p207_watch_status"
        operator_warning = f"Unexpected P207 watch status: {watch_status}"
        commands_to_run = []
        next_safe_action = "Inspect P207/P210 status before advancing packet_078."

    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_watch_stall_status.v1",
        "packet_id": "A2A2A-P213-PACKET078-OPENCODE-WATCH-STALL-STATUS-20260704",
        "status": status,
        "mode": "local_safe_opencode_watch_stall_status_no_candidate_result_queue_or_guard_write",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "active_focus": plan["active_focus"],
        "paused_focus": plan["paused_focus"],
        "selected_packet": "packet_078",
        "source_p207_watch_path": rel(root, watch_path) if watch_path else watch_input,
        "source_p207_watch_status": watch_status,
        "source_p210_brief_path": rel(root, brief_path) if brief_path else brief_input,
        "source_p210_brief_status": brief_status,
        "watch_attempts_used": attempts_used,
        "watch_attempts_configured": attempts_configured,
        "watch_attempts_exhausted": watch_attempts_exhausted,
        "candidate_review_result_path": candidate_input,
        "candidate_review_result_exists": candidate_exists,
        "real_review_result_path": result_input,
        "real_review_result_path_exists": real_result_exists,
        "target_queue_path": rel(root, target_queue_path),
        "target_queue_path_exists": target_queue_exists,
        "p193_guard_path": rel(root, p193_guard_path),
        "p193_guard_exists": p193_guard_exists,
        "commands_to_run": commands_to_run,
        "post_manual_paste_watch_commands": watch_commands,
        "manual_steps": [
            "copy_p195_prompt",
            "paste_into_opencode_sidebar_or_opencode_pane",
            "wait_for_p185_candidate_only",
            "run_bounded_watch_once",
        ],
        "next_action": next_action,
        "next_safe_action": next_safe_action,
        "operator_warning": operator_warning,
        "issues": issues,
        "external_actions_performed": packet078_local_safe_external_actions(),
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
    }


def build_packet078_opencode_watch_stall_status_receipt(
    status: dict[str, Any], evidence_path: str
) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_watch_stall_status_receipt.v1",
        "packet_id": status["packet_id"],
        "status": "recorded_packet078_opencode_watch_stall_status",
        "stall_status": status["status"],
        "created_at": now_iso(),
        "repo": status["repo"],
        "evidence_path": evidence_path,
        "source_p207_watch_path": status.get("source_p207_watch_path"),
        "source_p207_watch_status": status.get("source_p207_watch_status"),
        "source_p210_brief_path": status.get("source_p210_brief_path"),
        "source_p210_brief_status": status.get("source_p210_brief_status"),
        "watch_attempts_exhausted": status.get("watch_attempts_exhausted"),
        "candidate_review_result_exists": status.get("candidate_review_result_exists"),
        "real_review_result_path_exists": status.get("real_review_result_path_exists"),
        "target_queue_path_exists": status.get("target_queue_path_exists"),
        "p193_guard_exists": status.get("p193_guard_exists"),
        "issues": status.get("issues", []),
        "external_actions_performed": status["external_actions_performed"],
        "blocked_actions_preserved": status["blocked_actions_preserved"],
        "completion_claim": "P213 OpenCode watch-stall status recorded; no candidate result, real review result, packet_078, guard script, live send, provider call, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": status["next_safe_action"],
    }


def build_packet078_opencode_manual_paste_pending_status(
    root: Path,
    plan: dict[str, Any],
    clipboard_status_input: str,
    brief_input: str,
    candidate_input: str,
    result_input: str,
    p193_guard_input: str,
) -> dict[str, Any]:
    clipboard_path, clipboard_status = load_optional_json(root, clipboard_status_input)
    brief_path, brief = load_optional_json(root, brief_input)
    candidate_path = resolve_under_root(root, candidate_input)
    result_path = resolve_under_root(root, result_input)
    target_queue_path = resolve_under_root(root, "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json")
    p193_guard_path = resolve_under_root(root, p193_guard_input)

    commands = [
        command
        for command in (brief.get("commands_to_run", []) if isinstance(brief, dict) else [])
        if isinstance(command, str) and command.strip()
    ]
    copy_with_receipt_commands = [command for command in commands if "--copy-with-receipt" in command]
    watch_commands = [command for command in commands if "--watch-after-paste" in command]

    observed_actions = (
        clipboard_status.get("external_actions_performed")
        if isinstance(clipboard_status, dict) and isinstance(clipboard_status.get("external_actions_performed"), dict)
        else {}
    )
    clipboard_receipt_valid = (
        isinstance(clipboard_status, dict)
        and clipboard_status.get("schema") == "ghostclaw.a2a2a.packet078_p195_clipboard_load_status.v1"
        and clipboard_status.get("status") == "copied_to_local_clipboard_operator_must_paste_manually"
        and observed_actions.get("local_clipboard_write") is True
        and observed_actions.get("opencode_paste") is False
    )
    candidate_exists = candidate_path.is_file()
    real_result_exists = result_path.exists()
    target_queue_exists = target_queue_path.exists()
    p193_guard_exists = p193_guard_path.exists()

    issues: list[str] = []
    if not isinstance(brief, dict):
        issues.append("p210_operator_status_brief_missing_or_invalid")
    if real_result_exists:
        issues.append("real_review_result_already_exists")
    if target_queue_exists:
        issues.append("packet_078_already_exists")
    if p193_guard_exists:
        issues.append("p193_guard_already_exists")

    if candidate_exists:
        status = "candidate_arrived_stop_manual_paste"
        next_action = "run_bounded_watch_after_candidate_arrival"
        commands_to_run = watch_commands[:1]
        next_safe_action = "P185 candidate exists. Do not paste P195 again; run P208 --watch-after-paste or P206 reconcile."
    elif issues:
        status = "blocked_or_not_ready"
        next_action = "inspect_p221_issues"
        commands_to_run = []
        next_safe_action = "Resolve P221 issues before manual paste or watch."
    elif clipboard_receipt_valid:
        status = "manual_paste_pending_after_receipted_clipboard_load"
        next_action = "paste_clipboard_into_opencode"
        commands_to_run = ["manual_paste_clipboard_into_opencode"]
        next_safe_action = "Paste the clipboard contents into OpenCode manually. OpenCode must write only P185 candidate."
    else:
        status = "clipboard_receipt_missing_run_copy_with_receipt"
        next_action = "run_p208_copy_with_receipt"
        commands_to_run = copy_with_receipt_commands[:1]
        next_safe_action = "Run P208 --copy-with-receipt before manual OpenCode paste."

    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_manual_paste_pending_status.v1",
        "packet_id": "A2A2A-P221-PACKET078-OPENCODE-MANUAL-PASTE-PENDING-STATUS-20260704",
        "status": status,
        "mode": "local_safe_manual_paste_pending_status_no_opencode_paste",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "active_focus": plan["active_focus"],
        "paused_focus": plan["paused_focus"],
        "selected_packet": "packet_078",
        "source_p220_status_path": rel(root, clipboard_path) if clipboard_path else clipboard_status_input,
        "source_p220_status": clipboard_status.get("status") if isinstance(clipboard_status, dict) else None,
        "source_p210_brief_path": rel(root, brief_path) if brief_path else brief_input,
        "source_p210_brief_status": brief.get("status") if isinstance(brief, dict) else None,
        "clipboard_receipt_valid": clipboard_receipt_valid,
        "observed_prior_local_clipboard_write": observed_actions.get("local_clipboard_write") is True,
        "observed_prior_opencode_paste": observed_actions.get("opencode_paste") is True,
        "candidate_review_result_path": candidate_input,
        "candidate_review_result_exists": candidate_exists,
        "real_review_result_path": result_input,
        "real_review_result_path_exists": real_result_exists,
        "target_queue_path": rel(root, target_queue_path),
        "target_queue_path_exists": target_queue_exists,
        "p193_guard_path": rel(root, p193_guard_path),
        "p193_guard_exists": p193_guard_exists,
        "commands_to_run": commands_to_run,
        "post_manual_paste_command": watch_commands[0] if watch_commands else None,
        "manual_steps": [
            "paste_clipboard_into_opencode",
            "allow_opencode_to_write_p185_candidate_only",
            "run_p208_watch_after_paste",
        ],
        "next_action": next_action,
        "next_safe_action": next_safe_action,
        "issues": issues,
        "external_actions_performed": {
            "opencode_paste": False,
            "candidate_review_result_write": False,
            "real_review_result_write": False,
            "queue_file_write": False,
            "p193_guard_write": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
    }


def build_packet078_opencode_manual_paste_pending_status_receipt(
    status: dict[str, Any], evidence_path: str
) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_manual_paste_pending_status_receipt.v1",
        "packet_id": status["packet_id"],
        "status": "recorded_packet078_manual_paste_pending_status",
        "surface_status": status["status"],
        "created_at": now_iso(),
        "repo": status["repo"],
        "evidence_path": evidence_path,
        "source_p220_status_path": status.get("source_p220_status_path"),
        "source_p210_brief_path": status.get("source_p210_brief_path"),
        "clipboard_receipt_valid": status.get("clipboard_receipt_valid"),
        "candidate_review_result_exists": status.get("candidate_review_result_exists"),
        "commands_to_run": status.get("commands_to_run", []),
        "issues": status.get("issues", []),
        "external_actions_performed": status["external_actions_performed"],
        "blocked_actions_preserved": status["blocked_actions_preserved"],
        "completion_claim": "P221 manual paste pending status recorded; no OpenCode paste, candidate write, real result write, queue write, P193 guard write, live send, provider call, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": status["next_safe_action"],
    }


def build_packet078_opencode_manual_paste_action_card(
    root: Path,
    plan: dict[str, Any],
    manual_paste_status_input: str,
    candidate_input: str,
    result_input: str,
) -> dict[str, Any]:
    status_path, status = load_optional_json(root, manual_paste_status_input)
    candidate_path = resolve_under_root(root, candidate_input)
    result_path = resolve_under_root(root, result_input)
    target_queue_path = resolve_under_root(
        root,
        (status.get("target_queue_path") if isinstance(status, dict) else None)
        or "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
    )
    p193_guard_path = resolve_under_root(
        root,
        (status.get("p193_guard_path") if isinstance(status, dict) else None)
        or DEFAULT_PACKET078_CANDIDATE_COPY_COMMAND_OUTPUT,
    )
    candidate_exists = candidate_path.is_file()
    real_result_exists = result_path.exists()
    target_queue_exists = target_queue_path.exists()
    p193_guard_exists = p193_guard_path.exists()
    issues: list[str] = []
    if not isinstance(status, dict) or status.get("schema") != "ghostclaw.a2a2a.packet078_opencode_manual_paste_pending_status.v1":
        issues.append("p221_manual_paste_pending_status_missing_or_invalid")
    if real_result_exists:
        issues.append("real_review_result_already_exists")
    if target_queue_exists:
        issues.append("packet_078_already_exists")
    if p193_guard_exists:
        issues.append("p193_guard_already_exists")

    p221_status = status.get("status") if isinstance(status, dict) else None
    p221_commands = status.get("commands_to_run", []) if isinstance(status, dict) else []
    commands_to_run = [cmd for cmd in p221_commands if isinstance(cmd, str) and cmd.strip()]
    post_manual_paste_command = status.get("post_manual_paste_command") if isinstance(status, dict) else None

    if candidate_exists:
        card_status = "candidate_arrived_stop_manual_paste"
        next_action = "run_p208_watch_after_paste"
        commands_to_run = [post_manual_paste_command] if isinstance(post_manual_paste_command, str) else []
        next_safe_action = "P185 candidate exists. Do not paste P195 again; run P208 --watch-after-paste."
    elif issues:
        card_status = "blocked_or_not_ready"
        next_action = "inspect_p223_issues"
        commands_to_run = []
        next_safe_action = "Resolve P223 issues before any manual paste."
    elif p221_status == "manual_paste_pending_after_receipted_clipboard_load" and status.get("clipboard_receipt_valid") is True:
        card_status = "ready_for_operator_manual_opencode_paste"
        next_action = "paste_clipboard_into_opencode"
        commands_to_run = commands_to_run or ["manual_paste_clipboard_into_opencode"]
        next_safe_action = "Operator manually pastes clipboard into OpenCode; OpenCode must write only P185 candidate."
    else:
        card_status = "blocked_or_not_ready"
        next_action = "refresh_p221_manual_paste_pending_status"
        commands_to_run = []
        next_safe_action = "Refresh P221 manual-paste-pending status before operator paste."

    telegram_safe_draft = (
        "P223 packet_078 OpenCode manual paste action card: "
        f"status={card_status}; next={next_action}; "
        "live_send=false; provider_call=false; commit_push_deploy=false. "
        "Manual step only: paste current clipboard into OpenCode and allow only P185 candidate output."
    )
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_manual_paste_action_card.v1",
        "packet_id": "A2A2A-P223-PACKET078-OPENCODE-MANUAL-PASTE-ACTION-CARD-20260704",
        "status": card_status,
        "mode": "local_safe_operator_action_card_no_opencode_paste",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "active_focus": plan["active_focus"],
        "paused_focus": plan["paused_focus"],
        "selected_packet": "packet_078",
        "source_p221_status_path": rel(root, status_path) if status_path else manual_paste_status_input,
        "source_p221_status": p221_status,
        "clipboard_receipt_valid": bool(status.get("clipboard_receipt_valid")) if isinstance(status, dict) else False,
        "candidate_review_result_path": candidate_input,
        "candidate_review_result_exists": candidate_exists,
        "real_review_result_path": result_input,
        "real_review_result_path_exists": real_result_exists,
        "target_queue_path": rel(root, target_queue_path),
        "target_queue_path_exists": target_queue_exists,
        "p193_guard_path": rel(root, p193_guard_path),
        "p193_guard_exists": p193_guard_exists,
        "commands_to_run": commands_to_run,
        "post_manual_paste_command": post_manual_paste_command,
        "manual_steps": [
            "operator_pastes_clipboard_into_opencode",
            "opencode_writes_p185_candidate_only",
            "codex_runs_p208_watch_after_paste_after_candidate_exists",
        ],
        "next_action": next_action,
        "next_safe_action": next_safe_action,
        "telegram_safe_draft": telegram_safe_draft,
        "issues": issues,
        "external_actions_performed": {
            "opencode_paste": False,
            "candidate_review_result_write": False,
            "real_review_result_write": False,
            "queue_file_write": False,
            "p193_guard_write": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
    }


def build_packet078_opencode_manual_paste_action_card_receipt(
    card: dict[str, Any], evidence_path: str
) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_manual_paste_action_card_receipt.v1",
        "packet_id": card["packet_id"],
        "status": "recorded_packet078_manual_paste_action_card",
        "card_status": card["status"],
        "created_at": now_iso(),
        "repo": card["repo"],
        "evidence_path": evidence_path,
        "source_p221_status_path": card.get("source_p221_status_path"),
        "source_p221_status": card.get("source_p221_status"),
        "candidate_review_result_exists": card.get("candidate_review_result_exists"),
        "commands_to_run": card.get("commands_to_run", []),
        "post_manual_paste_command": card.get("post_manual_paste_command"),
        "issues": card.get("issues", []),
        "external_actions_performed": card["external_actions_performed"],
        "blocked_actions_preserved": card["blocked_actions_preserved"],
        "completion_claim": "P223 manual paste action card recorded; no OpenCode paste, candidate write, real result write, queue write, P193 guard write, live send, provider call, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": card["next_safe_action"],
    }


def build_packet078_post_p185_accelerator_status(
    root: Path,
    plan: dict[str, Any],
    action_card_input: str,
    candidate_input: str,
    preflight_input: str,
    result_input: str,
    p193_guard_input: str,
) -> dict[str, Any]:
    card_path, card = load_optional_json(root, action_card_input)
    preflight_path, preflight = load_optional_json(root, preflight_input)
    candidate_path = resolve_under_root(root, candidate_input)
    result_path = resolve_under_root(root, result_input)
    target_queue_path = resolve_under_root(root, "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json")
    p193_guard_path = resolve_under_root(root, p193_guard_input)
    candidate_exists = candidate_path.is_file()
    result_exists = result_path.exists()
    target_queue_exists = target_queue_path.exists()
    p193_guard_exists = p193_guard_path.exists()

    issues: list[str] = []
    if not isinstance(card, dict) or card.get("schema") != "ghostclaw.a2a2a.packet078_opencode_manual_paste_action_card.v1":
        issues.append("p223_manual_paste_action_card_missing_or_invalid")
    if result_exists:
        issues.append("real_review_result_already_exists")
    if target_queue_exists:
        issues.append("packet_078_already_exists")
    if p193_guard_exists:
        issues.append("p193_guard_already_exists")

    preflight_status = preflight.get("status") if isinstance(preflight, dict) else None
    candidate_ready = (
        isinstance(preflight, dict)
        and preflight.get("schema") == "ghostclaw.a2a2a.packet078_opencode_review_candidate_preflight.v1"
        and preflight_status == "candidate_ready_for_real_result_path"
        and preflight.get("candidate_ready_for_real_result_path") is True
    )
    preflight_command = (
        "python3 scripts/ghostclaw_a2a_agent_orchestrator.py "
        "--packet078-opencode-review-candidate-preflight --write"
    )
    sequence_status_command = (
        "python3 scripts/ghostclaw_a2a_agent_orchestrator.py "
        "--packet078-sequence-status --write"
    )

    if issues:
        status = "blocked_or_not_ready"
        next_action = "inspect_p225_issues"
        commands_to_run: list[str] = []
        next_safe_action = "Resolve P225 issues before any post-P185 action."
    elif not candidate_exists:
        status = "waiting_for_manual_opencode_paste"
        next_action = "paste_clipboard_into_opencode"
        commands_to_run = [
            command
            for command in (card.get("commands_to_run", []) if isinstance(card, dict) else [])
            if isinstance(command, str) and command.strip()
        ] or ["manual_paste_clipboard_into_opencode"]
        next_safe_action = "Operator manually pastes clipboard into OpenCode; OpenCode must write only P185 candidate."
    elif not candidate_ready:
        status = "candidate_arrived_run_preflight"
        next_action = "run_p185_candidate_preflight"
        commands_to_run = [preflight_command]
        next_safe_action = "P185 candidate exists. Run P185 candidate preflight before any exact P193 copy gate."
    else:
        status = "candidate_preflight_ready_request_p193_gate"
        next_action = "request_exact_p193_candidate_copy_gate"
        commands_to_run = [sequence_status_command]
        next_safe_action = "P185 preflight is ready. Request exact P193 copy gate before writing real review result."

    return {
        "schema": "ghostclaw.a2a2a.packet078_post_p185_accelerator_status.v1",
        "packet_id": "A2A2A-P225-PACKET078-POST-P185-ACCELERATOR-STATUS-20260704",
        "status": status,
        "mode": "local_safe_post_p185_accelerator_no_copy_no_queue_no_guard_write",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "active_focus": plan["active_focus"],
        "paused_focus": plan["paused_focus"],
        "selected_packet": "packet_078",
        "source_p223_action_card_path": rel(root, card_path) if card_path else action_card_input,
        "source_p223_status": card.get("status") if isinstance(card, dict) else None,
        "candidate_review_result_path": candidate_input,
        "candidate_review_result_exists": candidate_exists,
        "candidate_preflight_path": rel(root, preflight_path) if preflight_path else preflight_input,
        "candidate_preflight_status": preflight_status,
        "candidate_ready_for_real_result_path": candidate_ready,
        "real_review_result_path": result_input,
        "real_review_result_path_exists": result_exists,
        "target_queue_path": rel(root, target_queue_path),
        "target_queue_path_exists": target_queue_exists,
        "p193_guard_path": rel(root, p193_guard_path),
        "p193_guard_exists": p193_guard_exists,
        "p193_guard_write_allowed_now": False,
        "commands_to_run": commands_to_run,
        "post_candidate_validation_commands": [preflight_command, sequence_status_command],
        "next_action": next_action,
        "next_safe_action": next_safe_action,
        "issues": issues,
        "external_actions_performed": {
            "opencode_paste": False,
            "candidate_review_result_write": False,
            "real_review_result_write": False,
            "queue_file_write": False,
            "p193_guard_write": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
    }


def build_packet078_post_p185_accelerator_status_receipt(
    status: dict[str, Any], evidence_path: str
) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_post_p185_accelerator_status_receipt.v1",
        "packet_id": status["packet_id"],
        "status": "recorded_packet078_post_p185_accelerator_status",
        "accelerator_status": status["status"],
        "created_at": now_iso(),
        "repo": status["repo"],
        "evidence_path": evidence_path,
        "source_p223_action_card_path": status.get("source_p223_action_card_path"),
        "candidate_review_result_exists": status.get("candidate_review_result_exists"),
        "candidate_preflight_status": status.get("candidate_preflight_status"),
        "candidate_ready_for_real_result_path": status.get("candidate_ready_for_real_result_path"),
        "commands_to_run": status.get("commands_to_run", []),
        "issues": status.get("issues", []),
        "external_actions_performed": status["external_actions_performed"],
        "blocked_actions_preserved": status["blocked_actions_preserved"],
        "completion_claim": "P225 post-P185 accelerator status recorded; no OpenCode paste, candidate write, real result write, queue write, P193 guard write, live send, provider call, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": status["next_safe_action"],
    }


def build_packet078_clipboard_freshness_guard(
    root: Path,
    plan: dict[str, Any],
    prompt_input: str,
    clipboard_status_input: str,
    clipboard_receipt_input: str,
    action_card_input: str,
    post_p185_status_input: str,
    candidate_input: str,
    max_age_seconds: int,
) -> dict[str, Any]:
    prompt_path = resolve_under_root(root, prompt_input)
    clipboard_status_path, clipboard_status = load_optional_json(root, clipboard_status_input)
    clipboard_receipt_path, clipboard_receipt = load_optional_json(root, clipboard_receipt_input)
    action_card_path, action_card = load_optional_json(root, action_card_input)
    post_p185_path, post_p185_status = load_optional_json(root, post_p185_status_input)
    candidate_path = resolve_under_root(root, candidate_input)

    now_seconds = time.time()
    age_candidates = [
        now_seconds - path.stat().st_mtime
        for path in (clipboard_status_path, clipboard_receipt_path)
        if path is not None and path.is_file()
    ]
    clipboard_receipt_age_seconds = int(max(age_candidates)) if age_candidates else None
    prompt_exists = prompt_path.is_file()
    actual_prompt_sha256 = sha256_file(prompt_path) if prompt_exists else None
    status_prompt_sha256 = (
        clipboard_status.get("prompt_sha256") if isinstance(clipboard_status, dict) else None
    )
    receipt_prompt_sha256 = (
        clipboard_receipt.get("prompt_sha256") if isinstance(clipboard_receipt, dict) else None
    )
    prompt_sha256_matches_p220 = (
        bool(actual_prompt_sha256)
        and status_prompt_sha256 == actual_prompt_sha256
        and receipt_prompt_sha256 == actual_prompt_sha256
    )
    observed_actions = (
        clipboard_status.get("external_actions_performed")
        if isinstance(clipboard_status, dict)
        and isinstance(clipboard_status.get("external_actions_performed"), dict)
        else {}
    )
    clipboard_status_valid = (
        isinstance(clipboard_status, dict)
        and clipboard_status.get("schema") == "ghostclaw.a2a2a.packet078_p195_clipboard_load_status.v1"
        and clipboard_status.get("status") == "copied_to_local_clipboard_operator_must_paste_manually"
        and observed_actions.get("local_clipboard_write") is True
        and observed_actions.get("opencode_paste") is False
    )
    clipboard_receipt_valid = (
        isinstance(clipboard_receipt, dict)
        and clipboard_receipt.get("schema") == "ghostclaw.a2a2a.packet078_p195_clipboard_load_receipt.v1"
        and clipboard_receipt.get("status") == "recorded_local_clipboard_load"
    )
    action_card_status = action_card.get("status") if isinstance(action_card, dict) else None
    post_p185_status_text = post_p185_status.get("status") if isinstance(post_p185_status, dict) else None
    candidate_exists = candidate_path.is_file()
    stale = (
        clipboard_receipt_age_seconds is not None
        and clipboard_receipt_age_seconds > max_age_seconds
    )

    issues: list[str] = []
    if not prompt_exists:
        issues.append("p195_prompt_missing")
    if not clipboard_status_valid:
        issues.append("p220_clipboard_status_missing_or_invalid")
    if not clipboard_receipt_valid:
        issues.append("p220_clipboard_receipt_missing_or_invalid")
    if prompt_exists and not prompt_sha256_matches_p220:
        issues.append("p195_prompt_sha256_mismatch_with_p220")
    if not isinstance(action_card, dict) or action_card.get("schema") != "ghostclaw.a2a2a.packet078_opencode_manual_paste_action_card.v1":
        issues.append("p223_action_card_missing_or_invalid")
    if not isinstance(post_p185_status, dict) or post_p185_status.get("schema") != "ghostclaw.a2a2a.packet078_post_p185_accelerator_status.v1":
        issues.append("p225_post_p185_status_missing_or_invalid")
    if stale:
        issues.append("clipboard_receipt_stale")

    if candidate_exists:
        status = "candidate_arrived_stop_clipboard_refresh"
        next_action = "run_p208_watch_after_paste"
        commands_to_run = ["bash .ghostclaw_runtime/a2a2a/commands/A2A2A-P208-PACKET078-OPENCODE-OPERATOR-HANDOFF-20260704.sh --watch-after-paste"]
        next_safe_action = "P185 candidate exists. Do not refresh or paste P195 again; run bounded watch/reconcile."
    elif issues and issues != ["clipboard_receipt_stale"]:
        status = "clipboard_receipt_missing_or_invalid"
        next_action = "rerun_p208_copy_with_receipt_before_paste"
        commands_to_run = ["bash .ghostclaw_runtime/a2a2a/commands/A2A2A-P208-PACKET078-OPENCODE-OPERATOR-HANDOFF-20260704.sh --copy-with-receipt"]
        next_safe_action = "Refresh P195 clipboard load with P208 --copy-with-receipt before any manual OpenCode paste."
    elif stale:
        status = "clipboard_receipt_stale_refresh_before_paste"
        next_action = "rerun_p208_copy_with_receipt_before_paste"
        commands_to_run = ["bash .ghostclaw_runtime/a2a2a/commands/A2A2A-P208-PACKET078-OPENCODE-OPERATOR-HANDOFF-20260704.sh --copy-with-receipt"]
        next_safe_action = "Clipboard receipt is stale. Re-run P208 --copy-with-receipt, then paste manually into OpenCode."
    else:
        status = "clipboard_receipt_fresh_manual_paste_ready"
        next_action = "paste_clipboard_into_opencode"
        commands_to_run = ["manual_paste_clipboard_into_opencode"]
        next_safe_action = "P220 receipt still matches P195 prompt. Operator may manually paste the current clipboard into OpenCode."

    return {
        "schema": "ghostclaw.a2a2a.packet078_clipboard_freshness_guard.v1",
        "packet_id": "A2A2A-P227-PACKET078-CLIPBOARD-FRESHNESS-GUARD-20260704",
        "status": status,
        "mode": "local_safe_clipboard_freshness_guard_no_clipboard_read_no_opencode_paste",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "active_focus": plan["active_focus"],
        "paused_focus": plan["paused_focus"],
        "selected_packet": "packet_078",
        "prompt_path": rel(root, prompt_path),
        "prompt_path_exists": prompt_exists,
        "prompt_sha256": actual_prompt_sha256,
        "source_p220_status_path": rel(root, clipboard_status_path) if clipboard_status_path else clipboard_status_input,
        "source_p220_receipt_path": rel(root, clipboard_receipt_path) if clipboard_receipt_path else clipboard_receipt_input,
        "p220_status": clipboard_status.get("status") if isinstance(clipboard_status, dict) else None,
        "p220_receipt_status": clipboard_receipt.get("status") if isinstance(clipboard_receipt, dict) else None,
        "prompt_sha256_matches_p220": prompt_sha256_matches_p220,
        "clipboard_status_valid": clipboard_status_valid,
        "clipboard_receipt_valid": clipboard_receipt_valid,
        "clipboard_receipt_age_seconds": clipboard_receipt_age_seconds,
        "clipboard_receipt_age_source": "max_p220_status_or_receipt_file_mtime_seconds",
        "clipboard_max_age_seconds": max_age_seconds,
        "clipboard_read_performed": False,
        "source_p223_action_card_path": rel(root, action_card_path) if action_card_path else action_card_input,
        "source_p223_status": action_card_status,
        "source_p225_status_path": rel(root, post_p185_path) if post_p185_path else post_p185_status_input,
        "source_p225_status": post_p185_status_text,
        "candidate_review_result_path": rel(root, candidate_path),
        "candidate_review_result_exists": candidate_exists,
        "commands_to_run": commands_to_run,
        "next_action": next_action,
        "next_safe_action": next_safe_action,
        "issues": issues,
        "external_actions_performed": {
            "clipboard_read": False,
            "local_clipboard_write": False,
            "opencode_paste": False,
            "candidate_review_result_write": False,
            "real_review_result_write": False,
            "queue_file_write": False,
            "p193_guard_write": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
    }


def build_packet078_clipboard_freshness_guard_receipt(
    guard: dict[str, Any], evidence_path: str
) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_clipboard_freshness_guard_receipt.v1",
        "packet_id": guard["packet_id"],
        "status": "recorded_packet078_clipboard_freshness_guard",
        "guard_status": guard["status"],
        "created_at": now_iso(),
        "repo": guard["repo"],
        "evidence_path": evidence_path,
        "prompt_sha256_matches_p220": guard.get("prompt_sha256_matches_p220"),
        "clipboard_receipt_age_seconds": guard.get("clipboard_receipt_age_seconds"),
        "clipboard_max_age_seconds": guard.get("clipboard_max_age_seconds"),
        "candidate_review_result_exists": guard.get("candidate_review_result_exists"),
        "clipboard_read_performed": guard.get("clipboard_read_performed"),
        "commands_to_run": guard.get("commands_to_run", []),
        "issues": guard.get("issues", []),
        "external_actions_performed": guard["external_actions_performed"],
        "blocked_actions_preserved": guard["blocked_actions_preserved"],
        "completion_claim": "P227 clipboard freshness guard recorded; no clipboard read, OpenCode paste, candidate write, real result write, queue write, P193 guard write, live send, provider call, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": guard["next_safe_action"],
    }


def build_packet078_clipboard_freshness_guard_surface(
    root: Path,
    guard_input: str | None,
) -> dict[str, Any] | None:
    guard_path, guard = load_optional_json(root, guard_input)
    if not isinstance(guard, dict) or guard.get("schema") != "ghostclaw.a2a2a.packet078_clipboard_freshness_guard.v1":
        return None
    candidate_review_result_path = str(guard.get("candidate_review_result_path") or DEFAULT_PACKET078_OPENCODE_REVIEW_CANDIDATE)
    candidate_exists = resolve_under_root(root, candidate_review_result_path).is_file()
    source_status = str(guard.get("status") or "")
    if candidate_exists:
        surface_status = "candidate_arrived_stop_clipboard_refresh"
    elif source_status in {
        "clipboard_receipt_fresh_manual_paste_ready",
        "clipboard_receipt_stale_refresh_before_paste",
        "clipboard_receipt_missing_or_invalid",
    }:
        surface_status = source_status
    else:
        surface_status = "clipboard_freshness_guard_not_current"
    return {
        "packet_id": guard.get("packet_id"),
        "status": surface_status,
        "source_status": source_status,
        "status_path": rel(root, guard_path) if guard_path else None,
        "selected_packet": guard.get("selected_packet") or "packet_078",
        "prompt_sha256_matches_p220": bool(guard.get("prompt_sha256_matches_p220")),
        "clipboard_status_valid": bool(guard.get("clipboard_status_valid")),
        "clipboard_receipt_valid": bool(guard.get("clipboard_receipt_valid")),
        "clipboard_receipt_age_seconds": guard.get("clipboard_receipt_age_seconds"),
        "clipboard_max_age_seconds": guard.get("clipboard_max_age_seconds"),
        "clipboard_read_performed": bool(guard.get("clipboard_read_performed")),
        "candidate_review_result_path": candidate_review_result_path,
        "candidate_review_result_exists": candidate_exists,
        "commands_to_run": guard.get("commands_to_run", []),
        "next_action": guard.get("next_action"),
        "next_safe_action": guard.get("next_safe_action"),
        "issues": guard.get("issues", []),
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }


def apply_packet078_clipboard_freshness_guard(
    compact: dict[str, Any],
    guard: dict[str, Any] | None,
) -> dict[str, Any]:
    if not isinstance(guard, dict) or guard.get("status") not in {
        "clipboard_receipt_fresh_manual_paste_ready",
        "clipboard_receipt_stale_refresh_before_paste",
        "clipboard_receipt_missing_or_invalid",
        "candidate_arrived_stop_clipboard_refresh",
    }:
        return compact
    compact["clipboard_freshness_guard"] = {
        "packet_id": guard.get("packet_id"),
        "status": guard.get("status"),
        "source_status": guard.get("source_status"),
        "status_path": guard.get("status_path"),
        "selected_packet": guard.get("selected_packet"),
        "prompt_sha256_matches_p220": guard.get("prompt_sha256_matches_p220"),
        "clipboard_status_valid": guard.get("clipboard_status_valid"),
        "clipboard_receipt_valid": guard.get("clipboard_receipt_valid"),
        "clipboard_receipt_age_seconds": guard.get("clipboard_receipt_age_seconds"),
        "clipboard_max_age_seconds": guard.get("clipboard_max_age_seconds"),
        "clipboard_read_performed": guard.get("clipboard_read_performed"),
        "candidate_review_result_path": guard.get("candidate_review_result_path"),
        "candidate_review_result_exists": guard.get("candidate_review_result_exists"),
        "commands_to_run": guard.get("commands_to_run", []),
        "next_action": guard.get("next_action"),
        "next_safe_action": guard.get("next_safe_action"),
        "issues": guard.get("issues", []),
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }
    compact["source_mutation_allowed_now"] = False
    opencode_lane = (compact.get("lane_next_actions") or {}).get("opencode_reviewer")
    if isinstance(opencode_lane, dict):
        opencode_lane["next_action"] = guard.get("next_action")
        opencode_lane["selected_packet"] = guard.get("packet_id")
        opencode_lane["candidate_review_result_path"] = guard.get("candidate_review_result_path")
        opencode_lane["commands_to_run"] = guard.get("commands_to_run", [])
        opencode_lane["source_mutation_allowed_now"] = False
    compact["next_safe_action"] = guard.get("next_safe_action") or compact.get("next_safe_action")
    return compact


def build_packet078_post_p185_accelerator_status_surface(
    root: Path,
    status_input: str | None,
) -> dict[str, Any] | None:
    status_path, status = load_optional_json(root, status_input)
    if not isinstance(status, dict) or status.get("schema") != "ghostclaw.a2a2a.packet078_post_p185_accelerator_status.v1":
        return None
    candidate_review_result_path = str(status.get("candidate_review_result_path") or DEFAULT_PACKET078_OPENCODE_REVIEW_CANDIDATE)
    real_review_result_path = str(
        status.get("real_review_result_path")
        or ".ghostclaw_runtime/a2a2a/reviews/A2A2A-P175-PACKET078-TRANSITION-OPENCODE-REVIEW-RESULT-20260704.json"
    )
    target_queue_path = str(status.get("target_queue_path") or "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json")
    p193_guard_path = str(status.get("p193_guard_path") or DEFAULT_PACKET078_CANDIDATE_COPY_COMMAND_OUTPUT)
    candidate_exists = resolve_under_root(root, candidate_review_result_path).is_file()
    real_result_exists = resolve_under_root(root, real_review_result_path).exists()
    target_exists = resolve_under_root(root, target_queue_path).exists()
    p193_guard_exists = resolve_under_root(root, p193_guard_path).exists()
    source_status = str(status.get("status") or "")
    if source_status == "waiting_for_manual_opencode_paste" and not candidate_exists:
        surface_status = "waiting_for_manual_opencode_paste"
    elif source_status in {
        "candidate_arrived_run_preflight",
        "candidate_preflight_ready_request_p193_gate",
    }:
        surface_status = source_status
    elif candidate_exists:
        surface_status = "candidate_arrived_refresh_p225"
    else:
        surface_status = "post_p185_accelerator_not_current"
    return {
        "packet_id": status.get("packet_id"),
        "status": surface_status,
        "source_status": source_status,
        "status_path": rel(root, status_path) if status_path else None,
        "selected_packet": status.get("selected_packet") or "packet_078",
        "source_p223_status": status.get("source_p223_status"),
        "candidate_review_result_path": candidate_review_result_path,
        "candidate_review_result_exists": candidate_exists,
        "candidate_preflight_path": status.get("candidate_preflight_path"),
        "candidate_preflight_status": status.get("candidate_preflight_status"),
        "candidate_ready_for_real_result_path": bool(status.get("candidate_ready_for_real_result_path")),
        "real_review_result_path": real_review_result_path,
        "real_review_result_path_exists": real_result_exists,
        "target_queue_path": target_queue_path,
        "target_queue_path_exists": target_exists,
        "p193_guard_path": p193_guard_path,
        "p193_guard_exists": p193_guard_exists,
        "p193_guard_write_allowed_now": False,
        "commands_to_run": status.get("commands_to_run", []),
        "post_candidate_validation_commands": status.get("post_candidate_validation_commands", []),
        "next_action": status.get("next_action"),
        "next_safe_action": status.get("next_safe_action"),
        "issues": status.get("issues", []),
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }


def apply_packet078_post_p185_accelerator_status(
    compact: dict[str, Any],
    status: dict[str, Any] | None,
) -> dict[str, Any]:
    if not isinstance(status, dict) or status.get("status") not in {
        "waiting_for_manual_opencode_paste",
        "candidate_arrived_run_preflight",
        "candidate_preflight_ready_request_p193_gate",
        "candidate_arrived_refresh_p225",
    }:
        return compact
    compact["post_p185_accelerator_status"] = {
        "packet_id": status.get("packet_id"),
        "status": status.get("status"),
        "source_status": status.get("source_status"),
        "status_path": status.get("status_path"),
        "selected_packet": status.get("selected_packet"),
        "source_p223_status": status.get("source_p223_status"),
        "candidate_review_result_path": status.get("candidate_review_result_path"),
        "candidate_review_result_exists": status.get("candidate_review_result_exists"),
        "candidate_preflight_path": status.get("candidate_preflight_path"),
        "candidate_preflight_status": status.get("candidate_preflight_status"),
        "candidate_ready_for_real_result_path": status.get("candidate_ready_for_real_result_path"),
        "real_review_result_path": status.get("real_review_result_path"),
        "real_review_result_path_exists": status.get("real_review_result_path_exists"),
        "target_queue_path": status.get("target_queue_path"),
        "target_queue_path_exists": status.get("target_queue_path_exists"),
        "p193_guard_path": status.get("p193_guard_path"),
        "p193_guard_exists": status.get("p193_guard_exists"),
        "p193_guard_write_allowed_now": False,
        "commands_to_run": status.get("commands_to_run", []),
        "post_candidate_validation_commands": status.get("post_candidate_validation_commands", []),
        "next_action": status.get("next_action"),
        "next_safe_action": status.get("next_safe_action"),
        "issues": status.get("issues", []),
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }
    opencode_lane = (compact.get("lane_next_actions") or {}).get("opencode_reviewer")
    if isinstance(opencode_lane, dict):
        opencode_lane["next_action"] = status.get("next_action")
        opencode_lane["selected_packet"] = status.get("packet_id")
        opencode_lane["candidate_review_result_path"] = status.get("candidate_review_result_path")
        opencode_lane["commands_to_run"] = status.get("commands_to_run", [])
        opencode_lane["post_candidate_validation_commands"] = status.get("post_candidate_validation_commands", [])
        opencode_lane["source_mutation_allowed_now"] = False
    compact["next_safe_action"] = status.get("next_safe_action") or compact.get("next_safe_action")
    return compact


def build_packet078_opencode_manual_paste_action_card_surface(
    root: Path,
    card_input: str | None,
) -> dict[str, Any] | None:
    card_path, card = load_optional_json(root, card_input)
    if not isinstance(card, dict) or card.get("schema") != "ghostclaw.a2a2a.packet078_opencode_manual_paste_action_card.v1":
        return None
    candidate_review_result_path = str(card.get("candidate_review_result_path") or DEFAULT_PACKET078_OPENCODE_REVIEW_CANDIDATE)
    real_review_result_path = str(
        card.get("real_review_result_path")
        or ".ghostclaw_runtime/a2a2a/reviews/A2A2A-P175-PACKET078-TRANSITION-OPENCODE-REVIEW-RESULT-20260704.json"
    )
    target_queue_path = str(card.get("target_queue_path") or "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json")
    p193_guard_path = str(card.get("p193_guard_path") or DEFAULT_PACKET078_CANDIDATE_COPY_COMMAND_OUTPUT)
    candidate_exists = resolve_under_root(root, candidate_review_result_path).is_file()
    real_result_exists = resolve_under_root(root, real_review_result_path).exists()
    target_exists = resolve_under_root(root, target_queue_path).exists()
    p193_guard_exists = resolve_under_root(root, p193_guard_path).exists()
    source_status = str(card.get("status") or "")
    if source_status == "ready_for_operator_manual_opencode_paste" and not candidate_exists:
        surface_status = "ready_for_operator_manual_opencode_paste"
    elif candidate_exists:
        surface_status = "candidate_arrived_stop_manual_paste"
    else:
        surface_status = "manual_paste_action_card_not_current"
    return {
        "packet_id": card.get("packet_id"),
        "status": surface_status,
        "source_status": source_status,
        "status_path": rel(root, card_path) if card_path else None,
        "selected_packet": card.get("selected_packet") or "packet_078",
        "source_p221_status": card.get("source_p221_status"),
        "clipboard_receipt_valid": bool(card.get("clipboard_receipt_valid")),
        "candidate_review_result_path": candidate_review_result_path,
        "candidate_review_result_exists": candidate_exists,
        "real_review_result_path": real_review_result_path,
        "real_review_result_path_exists": real_result_exists,
        "target_queue_path": target_queue_path,
        "target_queue_path_exists": target_exists,
        "p193_guard_path": p193_guard_path,
        "p193_guard_exists": p193_guard_exists,
        "commands_to_run": card.get("commands_to_run", []),
        "post_manual_paste_command": card.get("post_manual_paste_command"),
        "manual_steps": card.get("manual_steps", []),
        "next_action": card.get("next_action"),
        "next_safe_action": card.get("next_safe_action"),
        "telegram_safe_draft": card.get("telegram_safe_draft"),
        "issues": card.get("issues", []),
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }


def apply_packet078_opencode_manual_paste_action_card(
    compact: dict[str, Any],
    card: dict[str, Any] | None,
) -> dict[str, Any]:
    if not isinstance(card, dict) or card.get("status") not in {
        "ready_for_operator_manual_opencode_paste",
        "candidate_arrived_stop_manual_paste",
    }:
        return compact
    compact["opencode_manual_paste_action_card"] = {
        "packet_id": card.get("packet_id"),
        "status": card.get("status"),
        "source_status": card.get("source_status"),
        "status_path": card.get("status_path"),
        "selected_packet": card.get("selected_packet"),
        "source_p221_status": card.get("source_p221_status"),
        "clipboard_receipt_valid": card.get("clipboard_receipt_valid"),
        "candidate_review_result_path": card.get("candidate_review_result_path"),
        "candidate_review_result_exists": card.get("candidate_review_result_exists"),
        "real_review_result_path": card.get("real_review_result_path"),
        "real_review_result_path_exists": card.get("real_review_result_path_exists"),
        "target_queue_path": card.get("target_queue_path"),
        "target_queue_path_exists": card.get("target_queue_path_exists"),
        "p193_guard_path": card.get("p193_guard_path"),
        "p193_guard_exists": card.get("p193_guard_exists"),
        "commands_to_run": card.get("commands_to_run", []),
        "post_manual_paste_command": card.get("post_manual_paste_command"),
        "manual_steps": card.get("manual_steps", []),
        "next_action": card.get("next_action"),
        "next_safe_action": card.get("next_safe_action"),
        "telegram_safe_draft": card.get("telegram_safe_draft"),
        "issues": card.get("issues", []),
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }
    opencode_lane = (compact.get("lane_next_actions") or {}).get("opencode_reviewer")
    if isinstance(opencode_lane, dict):
        opencode_lane["next_action"] = card.get("next_action")
        opencode_lane["selected_packet"] = card.get("packet_id")
        opencode_lane["candidate_review_result_path"] = card.get("candidate_review_result_path")
        opencode_lane["commands_to_run"] = card.get("commands_to_run", [])
        opencode_lane["post_manual_paste_command"] = card.get("post_manual_paste_command")
        opencode_lane["source_mutation_allowed_now"] = False
    compact["next_safe_action"] = card.get("next_safe_action") or compact.get("next_safe_action")
    return compact


def build_packet078_opencode_watch_stall_status_surface(
    root: Path,
    status_input: str | None,
) -> dict[str, Any] | None:
    status_path, status = load_optional_json(root, status_input)
    if not isinstance(status, dict) or status.get("schema") != "ghostclaw.a2a2a.packet078_opencode_watch_stall_status.v1":
        return None
    candidate_review_result_path = str(status.get("candidate_review_result_path") or DEFAULT_PACKET078_OPENCODE_REVIEW_CANDIDATE)
    real_review_result_path = str(
        status.get("real_review_result_path")
        or ".ghostclaw_runtime/a2a2a/reviews/A2A2A-P175-PACKET078-TRANSITION-OPENCODE-REVIEW-RESULT-20260704.json"
    )
    target_queue_path = str(status.get("target_queue_path") or "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json")
    p193_guard_path = str(status.get("p193_guard_path") or DEFAULT_PACKET078_CANDIDATE_COPY_COMMAND_OUTPUT)
    candidate_exists = resolve_under_root(root, candidate_review_result_path).is_file()
    real_result_exists = resolve_under_root(root, real_review_result_path).exists()
    target_exists = resolve_under_root(root, target_queue_path).exists()
    p193_guard_exists = resolve_under_root(root, p193_guard_path).exists()
    source_status = str(status.get("status") or "")
    if (
        source_status == "manual_opencode_candidate_required_stop_local_retry"
        and not candidate_exists
        and not real_result_exists
        and not target_exists
        and not p193_guard_exists
    ):
        surface_status = "manual_opencode_candidate_required_stop_local_retry"
    elif (
        source_status == "candidate_arrived_run_reconcile"
        and candidate_exists
        and not real_result_exists
        and not target_exists
        and not p193_guard_exists
    ):
        surface_status = "candidate_arrived_run_reconcile"
    else:
        surface_status = "opencode_watch_stall_not_current"
    return {
        "packet_id": status.get("packet_id"),
        "status": surface_status,
        "source_status": source_status,
        "status_path": rel(root, status_path) if status_path else None,
        "selected_packet": status.get("selected_packet") or "packet_078",
        "source_p207_watch_status": status.get("source_p207_watch_status"),
        "source_p210_brief_status": status.get("source_p210_brief_status"),
        "watch_attempts_used": status.get("watch_attempts_used"),
        "watch_attempts_configured": status.get("watch_attempts_configured"),
        "watch_attempts_exhausted": bool(status.get("watch_attempts_exhausted")),
        "candidate_review_result_path": candidate_review_result_path,
        "candidate_review_result_exists": candidate_exists,
        "real_review_result_path": real_review_result_path,
        "real_review_result_path_exists": real_result_exists,
        "target_queue_path": target_queue_path,
        "target_queue_path_exists": target_exists,
        "p193_guard_path": p193_guard_path,
        "p193_guard_exists": p193_guard_exists,
        "commands_to_run": status.get("commands_to_run", []),
        "post_manual_paste_watch_commands": status.get("post_manual_paste_watch_commands", []),
        "next_action": status.get("next_action"),
        "operator_warning": status.get("operator_warning"),
        "next_safe_action": status.get("next_safe_action"),
        "issues": status.get("issues", []),
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }


def build_packet078_opencode_manual_paste_pending_status_surface(
    root: Path,
    status_input: str | None,
) -> dict[str, Any] | None:
    status_path, status = load_optional_json(root, status_input)
    if not isinstance(status, dict) or status.get("schema") != "ghostclaw.a2a2a.packet078_opencode_manual_paste_pending_status.v1":
        return None
    candidate_review_result_path = str(status.get("candidate_review_result_path") or DEFAULT_PACKET078_OPENCODE_REVIEW_CANDIDATE)
    real_review_result_path = str(
        status.get("real_review_result_path")
        or ".ghostclaw_runtime/a2a2a/reviews/A2A2A-P175-PACKET078-TRANSITION-OPENCODE-REVIEW-RESULT-20260704.json"
    )
    target_queue_path = str(status.get("target_queue_path") or "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json")
    p193_guard_path = str(status.get("p193_guard_path") or DEFAULT_PACKET078_CANDIDATE_COPY_COMMAND_OUTPUT)
    candidate_exists = resolve_under_root(root, candidate_review_result_path).is_file()
    real_result_exists = resolve_under_root(root, real_review_result_path).exists()
    target_exists = resolve_under_root(root, target_queue_path).exists()
    p193_guard_exists = resolve_under_root(root, p193_guard_path).exists()
    source_status = str(status.get("status") or "")
    clipboard_receipt_valid = bool(status.get("clipboard_receipt_valid"))
    if (
        source_status == "manual_paste_pending_after_receipted_clipboard_load"
        and clipboard_receipt_valid
        and not candidate_exists
        and not real_result_exists
        and not target_exists
        and not p193_guard_exists
    ):
        surface_status = "manual_paste_pending_after_receipted_clipboard_load"
    elif candidate_exists:
        surface_status = "candidate_arrived_stop_manual_paste"
    else:
        surface_status = "manual_paste_pending_not_current"
    return {
        "packet_id": status.get("packet_id"),
        "status": surface_status,
        "source_status": source_status,
        "status_path": rel(root, status_path) if status_path else None,
        "selected_packet": status.get("selected_packet") or "packet_078",
        "source_p220_status": status.get("source_p220_status"),
        "source_p210_brief_status": status.get("source_p210_brief_status"),
        "clipboard_receipt_valid": clipboard_receipt_valid,
        "observed_prior_local_clipboard_write": bool(status.get("observed_prior_local_clipboard_write")),
        "observed_prior_opencode_paste": bool(status.get("observed_prior_opencode_paste")),
        "candidate_review_result_path": candidate_review_result_path,
        "candidate_review_result_exists": candidate_exists,
        "real_review_result_path": real_review_result_path,
        "real_review_result_path_exists": real_result_exists,
        "target_queue_path": target_queue_path,
        "target_queue_path_exists": target_exists,
        "p193_guard_path": p193_guard_path,
        "p193_guard_exists": p193_guard_exists,
        "commands_to_run": status.get("commands_to_run", []),
        "post_manual_paste_command": status.get("post_manual_paste_command"),
        "next_action": status.get("next_action"),
        "next_safe_action": status.get("next_safe_action"),
        "issues": status.get("issues", []),
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }


def apply_packet078_opencode_manual_paste_pending_status(
    compact: dict[str, Any],
    status: dict[str, Any] | None,
) -> dict[str, Any]:
    if not isinstance(status, dict) or status.get("status") not in {
        "manual_paste_pending_after_receipted_clipboard_load",
        "candidate_arrived_stop_manual_paste",
    }:
        return compact
    compact["opencode_manual_paste_pending_status"] = {
        "packet_id": status.get("packet_id"),
        "status": status.get("status"),
        "source_status": status.get("source_status"),
        "status_path": status.get("status_path"),
        "selected_packet": status.get("selected_packet"),
        "source_p220_status": status.get("source_p220_status"),
        "source_p210_brief_status": status.get("source_p210_brief_status"),
        "clipboard_receipt_valid": status.get("clipboard_receipt_valid"),
        "observed_prior_local_clipboard_write": status.get("observed_prior_local_clipboard_write"),
        "observed_prior_opencode_paste": status.get("observed_prior_opencode_paste"),
        "candidate_review_result_path": status.get("candidate_review_result_path"),
        "candidate_review_result_exists": status.get("candidate_review_result_exists"),
        "real_review_result_path": status.get("real_review_result_path"),
        "real_review_result_path_exists": status.get("real_review_result_path_exists"),
        "target_queue_path": status.get("target_queue_path"),
        "target_queue_path_exists": status.get("target_queue_path_exists"),
        "p193_guard_path": status.get("p193_guard_path"),
        "p193_guard_exists": status.get("p193_guard_exists"),
        "commands_to_run": status.get("commands_to_run", []),
        "post_manual_paste_command": status.get("post_manual_paste_command"),
        "next_action": status.get("next_action"),
        "next_safe_action": status.get("next_safe_action"),
        "issues": status.get("issues", []),
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }
    opencode_lane = (compact.get("lane_next_actions") or {}).get("opencode_reviewer")
    if isinstance(opencode_lane, dict):
        opencode_lane["next_action"] = status.get("next_action")
        opencode_lane["selected_packet"] = status.get("packet_id")
        opencode_lane["candidate_review_result_path"] = status.get("candidate_review_result_path")
        opencode_lane["commands_to_run"] = status.get("commands_to_run", [])
        opencode_lane["post_manual_paste_command"] = status.get("post_manual_paste_command")
        opencode_lane["source_mutation_allowed_now"] = False
    compact["next_safe_action"] = status.get("next_safe_action") or compact.get("next_safe_action")
    return compact


def apply_packet078_opencode_watch_stall_status(
    compact: dict[str, Any],
    status: dict[str, Any] | None,
) -> dict[str, Any]:
    if not isinstance(status, dict) or status.get("status") not in {
        "manual_opencode_candidate_required_stop_local_retry",
        "candidate_arrived_run_reconcile",
    }:
        return compact
    compact["opencode_watch_stall_status"] = {
        "packet_id": status.get("packet_id"),
        "status": status.get("status"),
        "source_status": status.get("source_status"),
        "status_path": status.get("status_path"),
        "selected_packet": status.get("selected_packet"),
        "source_p207_watch_status": status.get("source_p207_watch_status"),
        "source_p210_brief_status": status.get("source_p210_brief_status"),
        "watch_attempts_used": status.get("watch_attempts_used"),
        "watch_attempts_configured": status.get("watch_attempts_configured"),
        "watch_attempts_exhausted": status.get("watch_attempts_exhausted"),
        "candidate_review_result_path": status.get("candidate_review_result_path"),
        "candidate_review_result_exists": status.get("candidate_review_result_exists"),
        "real_review_result_path": status.get("real_review_result_path"),
        "real_review_result_path_exists": status.get("real_review_result_path_exists"),
        "target_queue_path": status.get("target_queue_path"),
        "target_queue_path_exists": status.get("target_queue_path_exists"),
        "p193_guard_path": status.get("p193_guard_path"),
        "p193_guard_exists": status.get("p193_guard_exists"),
        "commands_to_run": status.get("commands_to_run", []),
        "post_manual_paste_watch_commands": status.get("post_manual_paste_watch_commands", []),
        "next_action": status.get("next_action"),
        "operator_warning": status.get("operator_warning"),
        "next_safe_action": status.get("next_safe_action"),
        "issues": status.get("issues", []),
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }
    opencode_lane = (compact.get("lane_next_actions") or {}).get("opencode_reviewer")
    if isinstance(opencode_lane, dict):
        opencode_lane["next_action"] = status.get("next_action")
        opencode_lane["selected_packet"] = status.get("packet_id")
        opencode_lane["candidate_review_result_path"] = status.get("candidate_review_result_path")
        opencode_lane["source_mutation_allowed_now"] = False
        if status.get("commands_to_run"):
            opencode_lane["commands_to_run"] = status.get("commands_to_run")
        if status.get("post_manual_paste_watch_commands"):
            opencode_lane["post_manual_paste_watch_commands"] = status.get("post_manual_paste_watch_commands")
    compact["next_safe_action"] = status.get("next_safe_action") or compact.get("next_safe_action")
    return compact


def apply_packet078_gate_conflict_guard(compact: dict[str, Any]) -> dict[str, Any]:
    current_gate = compact.get("current_gate_overlay")
    watch_stall = compact.get("opencode_watch_stall_status")
    if not isinstance(current_gate, dict) or not isinstance(watch_stall, dict):
        return compact
    exact_gate = current_gate.get("exact_gate_phrase")
    selected_packet = current_gate.get("selected_packet")
    watch_status = watch_stall.get("status")
    candidate_missing = watch_stall.get("candidate_review_result_exists") is False
    queue_missing = current_gate.get("selected_packet_path_exists") is False
    if not (
        exact_gate == DEFAULT_QUEUE_DRAIN_REFRESH_GATE
        and selected_packet == "packet_078"
        and watch_status == "manual_opencode_candidate_required_stop_local_retry"
        and candidate_missing
        and queue_missing
    ):
        return compact

    hold_reasons = [
        "opencode_candidate_missing",
        "p207_watch_attempts_exhausted",
        "p185_required_before_packet078_queue_refresh",
    ]
    next_safe_action = (
        "Paste the P195 prompt into OpenCode, wait for P185 candidate only, then rerun P208 "
        "`--watch-after-paste` before considering the P167 packet_078 queue-refresh gate."
    )
    compact["packet078_gate_conflict_guard"] = {
        "schema": "ghostclaw.a2a2a.packet078_gate_conflict_guard.v1",
        "status": "hold_queue_refresh_until_opencode_candidate",
        "blocked_gate": exact_gate,
        "selected_packet": selected_packet,
        "selected_packet_path": current_gate.get("selected_packet_path"),
        "candidate_review_result_path": watch_stall.get("candidate_review_result_path"),
        "candidate_review_result_exists": watch_stall.get("candidate_review_result_exists"),
        "watch_stall_status": watch_status,
        "hold_reasons": hold_reasons,
        "next_safe_action": next_safe_action,
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }
    lanes = compact.get("lane_next_actions")
    if isinstance(lanes, dict):
        for lane_name in ("hermes_orchestrator", "validator"):
            lane = lanes.get(lane_name)
            if isinstance(lane, dict):
                lane["next_action"] = "hold_packet078_queue_refresh_until_opencode_candidate"
                lane["selected_packet"] = "packet_078"
                lane["source_mutation_allowed_now"] = False
    queue_drain = compact.get("queue_drain")
    if isinstance(queue_drain, dict):
        queue_drain["status"] = "queue_refresh_held_for_opencode_candidate"
        queue_drain["hold_reasons"] = hold_reasons
        queue_drain["next_safe_action"] = next_safe_action
        queue_drain["source_mutation_allowed_now"] = False
    compact["next_safe_action"] = next_safe_action
    return compact


def payload_external_actions_all_false(payload: dict[str, Any] | None) -> bool:
    if not isinstance(payload, dict):
        return False
    actions = payload.get("external_actions_performed")
    if not isinstance(actions, dict):
        return False
    return all(value is False for value in actions.values())


def build_loop_harness_status(
    root: Path,
    evidence_input: str,
    receipt_input: str,
    review_input: str,
) -> dict[str, Any]:
    evidence_path, evidence = load_optional_json(root, evidence_input)
    receipt_path, receipt = load_optional_json(root, receipt_input)
    review_path, review = load_optional_json(root, review_input)
    issues: list[str] = []
    if not isinstance(evidence, dict):
        issues.append("loop_harness_evidence_missing_or_invalid")
        evidence = {}
    if not isinstance(receipt, dict):
        issues.append("loop_harness_receipt_missing_or_invalid")
        receipt = {}
    if not isinstance(review, dict):
        issues.append("loop_harness_review_packet_missing_or_invalid")
        review = {}

    evidence_status = str(evidence.get("status") or "")
    receipt_status = str(receipt.get("status") or "")
    review_status = str(review.get("status") or "")
    validation = evidence.get("validation") if isinstance(evidence.get("validation"), dict) else {}
    validation_issues = validation.get("issues") if isinstance(validation.get("issues"), list) else []
    checks = {
        "evidence_passed": evidence_status.startswith("pass_"),
        "receipt_recorded": receipt_status.startswith("recorded_") or receipt_status.startswith("pass_"),
        "review_packet_ready": review_status == "ready_for_opencode_review",
        "review_mutation_blocked": review.get("mutation_allowed") is False,
        "validation_has_no_issues": validation_issues == [],
        "evidence_external_actions_false": payload_external_actions_all_false(evidence),
        "receipt_external_actions_false": payload_external_actions_all_false(receipt),
        "review_external_actions_false": payload_external_actions_all_false(review),
    }
    for key, passed in checks.items():
        if not passed:
            issues.append(key)
    status = "ready_for_opencode_review" if not issues else "blocked_or_not_ready"
    return {
        "schema": "ghostclaw.a2a2a.loop_harness_status_surface.v1",
        "packet_id": "A2A2A-P155-LOOP-HARNESS-STATUS-SURFACE-20260704",
        "status": status,
        "mode": "local_safe_loop_harness_status_surface_no_execution",
        "created_at": now_iso(),
        "repo": str(root),
        "layer": "LAYER_12B_LOOP_ENGINEERED_HARNESS",
        "loop_id": evidence.get("loop_id"),
        "current_gate": evidence.get("current_gate"),
        "active_focus": evidence.get("active_focus"),
        "paused_out_of_scope": evidence.get("paused_out_of_scope"),
        "evidence_path": rel(root, evidence_path) if evidence_path else evidence_input,
        "receipt_path": rel(root, receipt_path) if receipt_path else receipt_input,
        "review_packet_path": rel(root, review_path) if review_path else review_input,
        "evidence_status": evidence_status or None,
        "receipt_status": receipt_status or None,
        "review_status": review_status or None,
        "review_worker": review.get("review_worker"),
        "review_mutation_allowed": review.get("mutation_allowed"),
        "checks": checks,
        "issues": issues,
        "external_actions_performed": {
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "next_safe_action": (
            "OpenCode may review the Loop Harness packet read-only; Codex must not consume P143 without exact gate."
            if status == "ready_for_opencode_review"
            else "Fix Loop Harness status issues before review routing."
        ),
    }


def build_loop_harness_status_receipt(status: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.loop_harness_status_surface_receipt.v1",
        "packet_id": status["packet_id"],
        "status": "recorded_loop_harness_status_surface",
        "surface_status": status["status"],
        "created_at": now_iso(),
        "repo": status["repo"],
        "evidence_path": status.get("evidence_path"),
        "review_packet_path": status.get("review_packet_path"),
        "issues": status.get("issues", []),
        "external_actions_performed": status["external_actions_performed"],
        "completion_claim": "Loop Harness status surface recorded; no queue packet, worker, live send, provider call, commit, push, deploy, or cloud mutation was executed.",
        "next_safe_action": status["next_safe_action"],
    }


def apply_loop_harness_status(compact: dict[str, Any], status: dict[str, Any]) -> dict[str, Any]:
    compact["quality_loop_plane"] = {
        "layer": status.get("layer"),
        "status": status.get("status"),
        "loop_id": status.get("loop_id"),
        "current_gate": status.get("current_gate"),
        "review_status": status.get("review_status"),
        "review_worker": status.get("review_worker"),
        "review_mutation_allowed": status.get("review_mutation_allowed"),
        "issues": status.get("issues", []),
        "evidence_path": status.get("evidence_path"),
        "review_packet_path": status.get("review_packet_path"),
        "next_safe_action": status.get("next_safe_action"),
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }
    opencode_lane = (compact.get("lane_next_actions") or {}).get("opencode_reviewer")
    if isinstance(opencode_lane, dict) and status.get("status") == "ready_for_opencode_review":
        packet078_watch = compact.get("packet078_release_watch")
        packet078_escrow_active = (
            isinstance(packet078_watch, dict)
            and packet078_watch.get("escrow_status")
            in {"approval_accepted_pending_opencode_review", "approval_ready_for_operator_execution"}
            and packet078_watch.get("exact_p167_consumed") is False
        )
        if packet078_escrow_active:
            return compact
        opencode_lane["next_action"] = "review_loop_harness_packet_read_only"
        opencode_lane["selected_packet"] = status.get("packet_id")
        opencode_lane["source_mutation_allowed_now"] = False
    return compact


def apply_packet078_release_watch(compact: dict[str, Any], watch: dict[str, Any]) -> dict[str, Any]:
    compact["packet078_release_watch"] = {
        "packet_id": watch.get("packet_id"),
        "status": watch.get("status"),
        "gate_state": watch.get("gate_state"),
        "escrow_status": watch.get("escrow_status"),
        "release_sequence_allowed": watch.get("release_sequence_allowed"),
        "exact_p167_ready_to_surface": watch.get("exact_p167_ready_to_surface"),
        "exact_p167_consumed": watch.get("exact_p167_consumed"),
        "command_to_execute_now": watch.get("command_to_execute_now"),
        "target_queue_path": watch.get("target_queue_path"),
        "target_queue_path_exists": watch.get("target_queue_path_exists"),
        "hold_reasons": watch.get("hold_reasons", []),
        "next_safe_action": watch.get("next_safe_action"),
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }
    opencode_lane = (compact.get("lane_next_actions") or {}).get("opencode_reviewer")
    if isinstance(opencode_lane, dict) and watch.get("status") == "waiting_for_opencode_review_result":
        opencode_lane["next_action"] = "write_packet078_review_result_read_only"
        opencode_lane["selected_packet"] = watch.get("packet_id")
        opencode_lane["source_mutation_allowed_now"] = False
    return compact


def apply_opencode_review_action_card(compact: dict[str, Any], capsule: dict[str, Any]) -> dict[str, Any]:
    compact["opencode_review_action_card"] = {
        "packet_id": capsule.get("packet_id"),
        "status": capsule.get("status"),
        "review_worker": capsule.get("review_worker"),
        "mutation_allowed": capsule.get("mutation_allowed"),
        "selected_packet": capsule.get("selected_packet"),
        "target_queue_path": capsule.get("target_queue_path"),
        "target_queue_path_exists": capsule.get("target_queue_path_exists"),
        "template_path": capsule.get("template_path"),
        "result_path_to_write_by_reviewer": capsule.get("result_path_to_write_by_reviewer"),
        "writes_real_result_path": capsule.get("writes_real_result_path"),
        "review_checklist": capsule.get("review_checklist", []),
        "handoff_targets": capsule.get("handoff_targets", []),
        "post_review_intake_command": capsule.get("post_review_intake_command"),
        "must_not": capsule.get("must_not", []),
        "next_safe_action": capsule.get("next_safe_action"),
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }
    return compact


def build_packet078_candidate_call_status_surface(
    root: Path,
    status_input: str | None,
) -> dict[str, Any] | None:
    status_path, status = load_optional_json(root, status_input)
    if not isinstance(status, dict):
        return None
    candidate_review_result_path = str(status.get("candidate_review_result_path") or DEFAULT_PACKET078_OPENCODE_REVIEW_CANDIDATE)
    real_review_result_path = str(
        status.get("real_review_result_path")
        or ".ghostclaw_runtime/a2a2a/reviews/A2A2A-P175-PACKET078-TRANSITION-OPENCODE-REVIEW-RESULT-20260704.json"
    )
    target_queue_path = str(status.get("target_queue_path") or "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json")
    p173_guard_path = str(status.get("p173_guard_path") or DEFAULT_PACKET078_WORKER_ENVELOPE_COMMAND_OUTPUT)
    candidate_exists = resolve_under_root(root, candidate_review_result_path).exists()
    real_result_exists = resolve_under_root(root, real_review_result_path).exists()
    target_exists = resolve_under_root(root, target_queue_path).exists()
    p173_guard_exists = resolve_under_root(root, p173_guard_path).exists()
    waiting_for_candidate = (
        status.get("status") == "waiting_for_opencode_candidate"
        and not candidate_exists
        and not real_result_exists
        and not target_exists
    )
    return {
        "packet_id": status.get("packet_id"),
        "status": "waiting_for_opencode_candidate" if waiting_for_candidate else "candidate_call_not_current",
        "candidate_call_packet_path": status.get("candidate_call_packet_path"),
        "candidate_prompt_path": status.get("candidate_prompt_path"),
        "candidate_review_result_path": candidate_review_result_path,
        "real_review_result_path": real_review_result_path,
        "target_queue_path": target_queue_path,
        "p173_guard_path": p173_guard_path,
        "candidate_review_result_exists": candidate_exists,
        "real_review_result_exists": real_result_exists,
        "target_queue_path_exists": target_exists,
        "p173_guard_exists": p173_guard_exists,
        "p167_approval_handling": status.get("p167_approval_handling", {}),
        "next_safe_action": status.get("next_safe_action"),
        "status_path": rel(root, status_path) if status_path else None,
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }


def apply_packet078_candidate_call_status(compact: dict[str, Any], status: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(status, dict) or status.get("status") != "waiting_for_opencode_candidate":
        return compact
    compact["opencode_candidate_call_status"] = {
        "packet_id": status.get("packet_id"),
        "status": status.get("status"),
        "candidate_call_packet_path": status.get("candidate_call_packet_path"),
        "candidate_prompt_path": status.get("candidate_prompt_path"),
        "candidate_review_result_path": status.get("candidate_review_result_path"),
        "real_review_result_path": status.get("real_review_result_path"),
        "target_queue_path": status.get("target_queue_path"),
        "candidate_review_result_exists": status.get("candidate_review_result_exists"),
        "real_review_result_exists": status.get("real_review_result_exists"),
        "target_queue_path_exists": status.get("target_queue_path_exists"),
        "p173_guard_exists": status.get("p173_guard_exists"),
        "p167_approval_handling": status.get("p167_approval_handling", {}),
        "next_safe_action": status.get("next_safe_action"),
        "status_path": status.get("status_path"),
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }
    opencode_lane = (compact.get("lane_next_actions") or {}).get("opencode_reviewer")
    if isinstance(opencode_lane, dict):
        opencode_lane["next_action"] = "write_packet078_candidate_review_result_read_only"
        opencode_lane["selected_packet"] = status.get("packet_id")
        opencode_lane["candidate_review_result_path"] = status.get("candidate_review_result_path")
        opencode_lane["source_mutation_allowed_now"] = False
    compact["next_safe_action"] = status.get("next_safe_action") or compact.get("next_safe_action")
    return compact


def build_packet078_candidate_poll_status_surface(
    root: Path,
    status_input: str | None,
) -> dict[str, Any] | None:
    status_path, status = load_optional_json(root, status_input)
    if not isinstance(status, dict) or status.get("schema") != "ghostclaw.a2a2a.packet078_candidate_poll.v1":
        return None
    candidate_review_result_path = str(status.get("candidate_review_result_path") or DEFAULT_PACKET078_OPENCODE_REVIEW_CANDIDATE)
    real_review_result_path = str(
        status.get("real_review_result_path")
        or ".ghostclaw_runtime/a2a2a/reviews/A2A2A-P175-PACKET078-TRANSITION-OPENCODE-REVIEW-RESULT-20260704.json"
    )
    candidate_exists = resolve_under_root(root, candidate_review_result_path).is_file()
    real_result_exists = resolve_under_root(root, real_review_result_path).exists()
    target_queue_path = str(status.get("target_queue_path") or "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json")
    target_exists = resolve_under_root(root, target_queue_path).exists()
    p173_guard_path = str(status.get("p173_guard_path") or DEFAULT_PACKET078_WORKER_ENVELOPE_COMMAND_OUTPUT)
    p173_guard_exists = resolve_under_root(root, p173_guard_path).exists()
    waiting_for_candidate = (
        status.get("status") == "waiting_for_opencode_candidate"
        and not candidate_exists
        and not real_result_exists
        and not target_exists
        and not p173_guard_exists
    )
    poll_command = (
        "python3 scripts/ghostclaw_a2a_agent_orchestrator.py "
        "--packet078-candidate-poll "
        "--packet078-candidate-poll-attempts 1 "
        "--packet078-candidate-poll-interval 0"
    )
    return {
        "packet_id": status.get("packet_id"),
        "status": "waiting_for_opencode_candidate" if waiting_for_candidate else "candidate_poll_not_current",
        "status_path": rel(root, status_path) if status_path else None,
        "candidate_review_result_path": candidate_review_result_path,
        "candidate_review_result_exists": candidate_exists,
        "candidate_ready_for_real_result_path": bool(status.get("candidate_ready_for_real_result_path") and candidate_exists),
        "real_review_result_path": real_review_result_path,
        "real_review_result_exists": real_result_exists,
        "target_queue_path": target_queue_path,
        "target_queue_path_exists": target_exists,
        "p173_guard_path": p173_guard_path,
        "p173_guard_exists": p173_guard_exists,
        "poll_attempts_observed": status.get("poll_attempts_observed"),
        "candidate_poll_command": poll_command,
        "next_safe_action": status.get("next_safe_action"),
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }


def apply_packet078_candidate_poll_status(compact: dict[str, Any], status: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(status, dict) or status.get("status") != "waiting_for_opencode_candidate":
        return compact
    compact["opencode_candidate_poll_status"] = {
        "packet_id": status.get("packet_id"),
        "status": status.get("status"),
        "status_path": status.get("status_path"),
        "candidate_review_result_path": status.get("candidate_review_result_path"),
        "candidate_review_result_exists": status.get("candidate_review_result_exists"),
        "candidate_ready_for_real_result_path": status.get("candidate_ready_for_real_result_path"),
        "real_review_result_path": status.get("real_review_result_path"),
        "real_review_result_exists": status.get("real_review_result_exists"),
        "target_queue_path": status.get("target_queue_path"),
        "target_queue_path_exists": status.get("target_queue_path_exists"),
        "p173_guard_exists": status.get("p173_guard_exists"),
        "poll_attempts_observed": status.get("poll_attempts_observed"),
        "candidate_poll_command": status.get("candidate_poll_command"),
        "next_safe_action": status.get("next_safe_action"),
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }
    opencode_lane = (compact.get("lane_next_actions") or {}).get("opencode_reviewer")
    if isinstance(opencode_lane, dict):
        opencode_lane["next_action"] = "run_packet078_candidate_poll_then_p185"
        opencode_lane["selected_packet"] = status.get("packet_id")
        opencode_lane["candidate_poll_command"] = status.get("candidate_poll_command")
        opencode_lane["candidate_review_result_path"] = status.get("candidate_review_result_path")
        opencode_lane["source_mutation_allowed_now"] = False
    compact["next_safe_action"] = status.get("next_safe_action") or compact.get("next_safe_action")
    return compact


def build_packet078_post_handoff_router_status_surface(
    root: Path,
    status_input: str | None,
) -> dict[str, Any] | None:
    status_path, status = load_optional_json(root, status_input)
    if not isinstance(status, dict) or status.get("schema") != "ghostclaw.a2a2a.packet078_opencode_post_handoff_router.v1":
        return None
    candidate_review_result_path = str(status.get("candidate_review_result_path") or DEFAULT_PACKET078_OPENCODE_REVIEW_CANDIDATE)
    real_review_result_path = str(
        status.get("real_review_result_path")
        or ".ghostclaw_runtime/a2a2a/reviews/A2A2A-P175-PACKET078-TRANSITION-OPENCODE-REVIEW-RESULT-20260704.json"
    )
    target_queue_path = str(status.get("target_queue_path") or "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json")
    p173_guard_path = str(status.get("p173_guard_path") or DEFAULT_PACKET078_WORKER_ENVELOPE_COMMAND_OUTPUT)
    p193_guard_path = str(status.get("p193_guard_path") or DEFAULT_PACKET078_CANDIDATE_COPY_COMMAND_OUTPUT)
    candidate_exists = resolve_under_root(root, candidate_review_result_path).is_file()
    real_result_exists = resolve_under_root(root, real_review_result_path).exists()
    target_exists = resolve_under_root(root, target_queue_path).exists()
    p173_guard_exists = resolve_under_root(root, p173_guard_path).exists()
    p193_guard_exists = resolve_under_root(root, p193_guard_path).exists()
    source_status = str(status.get("status") or "")
    if (
        source_status == "waiting_for_opencode_candidate"
        and not candidate_exists
        and not real_result_exists
        and not target_exists
        and not p173_guard_exists
        and not p193_guard_exists
    ):
        surface_status = "waiting_for_opencode_candidate"
    elif (
        source_status == "ready_for_exact_p193_candidate_copy_gate"
        and candidate_exists
        and not real_result_exists
        and not target_exists
        and not p173_guard_exists
        and not p193_guard_exists
    ):
        surface_status = "ready_for_exact_p193_candidate_copy_gate"
    else:
        surface_status = "post_handoff_router_not_current"
    return {
        "packet_id": status.get("packet_id"),
        "status": surface_status,
        "source_status": source_status,
        "status_path": rel(root, status_path) if status_path else None,
        "selected_packet": status.get("selected_packet"),
        "next_action": status.get("next_action"),
        "handoff_readiness_status": status.get("handoff_readiness_status"),
        "candidate_preflight_status": status.get("candidate_preflight_status"),
        "candidate_copy_gate_status": status.get("candidate_copy_gate_status"),
        "sequence_status": status.get("sequence_status"),
        "candidate_review_result_path": candidate_review_result_path,
        "candidate_review_result_exists": candidate_exists,
        "candidate_ready_for_real_result_path": bool(status.get("candidate_ready_for_real_result_path") and candidate_exists),
        "real_review_result_path": real_review_result_path,
        "real_review_result_path_exists": real_result_exists,
        "target_queue_path": target_queue_path,
        "target_queue_path_exists": target_exists,
        "p173_guard_path": p173_guard_path,
        "p173_guard_exists": p173_guard_exists,
        "p193_guard_path": p193_guard_path,
        "p193_guard_exists": p193_guard_exists,
        "candidate_copy_command_after_exact_gate": status.get("candidate_copy_command_after_exact_gate"),
        "post_copy_intake_command": status.get("post_copy_intake_command"),
        "issues": status.get("issues", []),
        "next_safe_action": status.get("next_safe_action"),
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }


def apply_packet078_post_handoff_router_status(
    compact: dict[str, Any],
    status: dict[str, Any] | None,
) -> dict[str, Any]:
    if not isinstance(status, dict) or status.get("status") not in {
        "waiting_for_opencode_candidate",
        "ready_for_exact_p193_candidate_copy_gate",
    }:
        return compact
    compact["opencode_post_handoff_router_status"] = {
        "packet_id": status.get("packet_id"),
        "status": status.get("status"),
        "source_status": status.get("source_status"),
        "status_path": status.get("status_path"),
        "selected_packet": status.get("selected_packet"),
        "next_action": status.get("next_action"),
        "handoff_readiness_status": status.get("handoff_readiness_status"),
        "candidate_preflight_status": status.get("candidate_preflight_status"),
        "candidate_copy_gate_status": status.get("candidate_copy_gate_status"),
        "sequence_status": status.get("sequence_status"),
        "candidate_review_result_path": status.get("candidate_review_result_path"),
        "candidate_review_result_exists": status.get("candidate_review_result_exists"),
        "candidate_ready_for_real_result_path": status.get("candidate_ready_for_real_result_path"),
        "real_review_result_path": status.get("real_review_result_path"),
        "real_review_result_path_exists": status.get("real_review_result_path_exists"),
        "target_queue_path": status.get("target_queue_path"),
        "target_queue_path_exists": status.get("target_queue_path_exists"),
        "p173_guard_exists": status.get("p173_guard_exists"),
        "p193_guard_exists": status.get("p193_guard_exists"),
        "candidate_copy_command_after_exact_gate": status.get("candidate_copy_command_after_exact_gate"),
        "post_copy_intake_command": status.get("post_copy_intake_command"),
        "issues": status.get("issues", []),
        "next_safe_action": status.get("next_safe_action"),
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }
    opencode_lane = (compact.get("lane_next_actions") or {}).get("opencode_reviewer")
    if isinstance(opencode_lane, dict):
        opencode_lane["next_action"] = status.get("next_action")
        opencode_lane["selected_packet"] = status.get("packet_id")
        opencode_lane["candidate_review_result_path"] = status.get("candidate_review_result_path")
        if status.get("candidate_copy_command_after_exact_gate"):
            opencode_lane["candidate_copy_command_after_exact_gate"] = status.get("candidate_copy_command_after_exact_gate")
        opencode_lane["source_mutation_allowed_now"] = False
    compact["next_safe_action"] = status.get("next_safe_action") or compact.get("next_safe_action")
    return compact


def apply_packet078_opencode_operator_handoff_status(
    compact: dict[str, Any],
    status: dict[str, Any] | None,
) -> dict[str, Any]:
    if not isinstance(status, dict) or status.get("schema") != "ghostclaw.a2a2a.packet078_opencode_operator_handoff_status.v1":
        return compact
    if status.get("status") not in {
        "ready_for_manual_paste_and_bounded_watch",
        "stale_candidate_already_arrived",
    }:
        return compact
    compact["opencode_operator_handoff_status"] = {
        "packet_id": status.get("packet_id"),
        "status": status.get("status"),
        "source_p208_status_path": status.get("source_p208_status_path"),
        "source_p208_status": status.get("source_p208_status"),
        "selected_packet": status.get("selected_packet"),
        "prompt_path": status.get("prompt_path"),
        "prompt_path_exists": status.get("prompt_path_exists"),
        "command_path": status.get("command_path"),
        "command_path_exists": status.get("command_path_exists"),
        "clipboard_load_command": status.get("clipboard_load_command"),
        "clipboard_load_with_receipt_command": status.get("clipboard_load_with_receipt_command"),
        "watch_after_manual_paste_command": status.get("watch_after_manual_paste_command"),
        "candidate_review_result_path": status.get("candidate_review_result_path"),
        "candidate_review_result_exists": status.get("candidate_review_result_exists"),
        "real_review_result_path": status.get("real_review_result_path"),
        "real_review_result_path_exists": status.get("real_review_result_path_exists"),
        "target_queue_path": status.get("target_queue_path"),
        "target_queue_path_exists": status.get("target_queue_path_exists"),
        "p193_guard_path": status.get("p193_guard_path"),
        "p193_guard_exists": status.get("p193_guard_exists"),
        "issues": status.get("issues", []),
        "next_action": status.get("next_action"),
        "next_safe_action": status.get("next_safe_action"),
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }
    opencode_lane = (compact.get("lane_next_actions") or {}).get("opencode_reviewer")
    if isinstance(opencode_lane, dict):
        opencode_lane["next_action"] = status.get("next_action")
        opencode_lane["selected_packet"] = status.get("packet_id")
        opencode_lane["candidate_review_result_path"] = status.get("candidate_review_result_path")
        opencode_lane["clipboard_load_command"] = status.get("clipboard_load_command")
        opencode_lane["clipboard_load_with_receipt_command"] = status.get("clipboard_load_with_receipt_command")
        opencode_lane["watch_after_manual_paste_command"] = status.get("watch_after_manual_paste_command")
        opencode_lane["source_mutation_allowed_now"] = False
    compact["next_safe_action"] = status.get("next_safe_action") or compact.get("next_safe_action")
    return compact


def choose_packet078_operator_handoff_status_input(root: Path, output_path: str, p208_status_path: str) -> str:
    candidate = resolve_under_root(root, output_path)
    return output_path if candidate.is_file() else p208_status_path


def load_optional_json(root: Path, value: str | None) -> tuple[Path | None, dict[str, Any] | None]:
    if not value:
        return None, None
    path = resolve_under_root(root, value)
    if not path.is_file():
        return path, None
    payload = read_json(path)
    if not isinstance(payload, dict):
        return path, None
    return path, payload


def gate_status_is_completed(status: Any) -> bool:
    text = str(status or "").strip().lower()
    return text in {"completed", "consumed", "done"} or any(
        marker in text
        for marker in (
            "gate_complete",
            "ack_gate_complete",
            "complete_next_ready",
            "superseded_by_existing_target",
        )
    )


def current_gate_is_completed(current_gate: dict[str, Any] | None) -> bool:
    if not isinstance(current_gate, dict):
        return False
    current_gate_block = current_gate.get("current_next_gate")
    block_status = current_gate_block.get("status") if isinstance(current_gate_block, dict) else None
    return gate_status_is_completed(current_gate.get("status")) or gate_status_is_completed(block_status)


def build_current_gate_overlay(root: Path, current_next_gate_path: str | None) -> dict[str, Any] | None:
    """Return the currently persisted gate without treating it as execution approval."""
    current_path, current_gate = load_optional_json(root, current_next_gate_path)
    if current_path is None or not isinstance(current_gate, dict):
        return None
    current_gate_block = current_gate.get("current_next_gate") if isinstance(current_gate.get("current_next_gate"), dict) else {}
    current_orchestrator = (
        current_gate.get("current_orchestrator") if isinstance(current_gate.get("current_orchestrator"), dict) else {}
    )
    status = current_gate.get("status") or current_gate_block.get("status") or "present"
    exact_gate = current_gate_block.get("exact_phrase") or current_gate.get("next_exact_gate")
    if current_gate_is_completed(current_gate):
        return None
    if not exact_gate and not current_gate.get("status"):
        return None
    selected_packet = current_gate.get("selected_packet") or current_orchestrator.get("selected_packet")
    selected_path = current_gate.get("selected_packet_path") or current_orchestrator.get("selected_packet_path")
    selected_path_abs = resolve_under_root(root, str(selected_path)) if selected_path else None
    selected_path_exists = bool(selected_path_abs and selected_path_abs.exists())
    return {
        "schema": "ghostclaw.a2a2a.current_gate_overlay.v1",
        "status": current_gate.get("status") or current_gate_block.get("status") or "present",
        "source_path": rel(root, current_path),
        "source_sha256": sha256_file(current_path) if current_path.is_file() else None,
        "exact_gate_phrase": exact_gate,
        "allowed_scope": current_gate_block.get("allowed_scope"),
        "blocked_scope": current_gate_block.get("blocked_scope", []),
        "selected_packet": selected_packet,
        "selected_packet_path": selected_path,
        "selected_packet_path_exists": selected_path_exists,
        "selected_packet_sha256": sha256_file(selected_path_abs) if selected_path_abs and selected_path_abs.is_file() else None,
        "selected_packet_sequence": current_gate.get("selected_packet_sequence")
        or packet_sequence({"id": selected_packet, "path": selected_path}),
        "queue_drain_status": current_orchestrator.get("status")
        or (current_orchestrator.get("queue_drain") or {}).get("status"),
        "next_safe_action": current_gate.get("next_safe_action"),
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
        "current_gate_is_approval": False,
    }


def apply_current_gate_overlay(compact: dict[str, Any], overlay: dict[str, Any] | None) -> dict[str, Any]:
    """Surface the current gate in compact/sidebar output without changing ranking evidence."""
    if not overlay:
        return compact
    compact["current_gate_overlay"] = overlay
    exact_gate = overlay.get("exact_gate_phrase")
    queue_drain = compact.get("queue_drain") if isinstance(compact.get("queue_drain"), dict) else None
    selected_path_exists = bool(overlay.get("selected_packet_path_exists"))
    target_exists_for_queue_replenish = selected_path_exists and is_queue_replenish_gate(
        exact_gate, overlay.get("selected_packet_path"), overlay.get("allowed_scope")
    )
    if target_exists_for_queue_replenish:
        compact["current_gate_overlay"]["status"] = "superseded_by_existing_target"
        if queue_drain is not None:
            queue_drain["current_gate_superseded_by_existing_target"] = True
            queue_drain["recommended_next_gate_phrase"] = None
            queue_drain["next_gate_phrases"] = []
            queue_drain["next_safe_action"] = (
                "Target queue packet already exists. Do not rerun queue replenish; run coordinator dry-run "
                "and open a separate worker-envelope gate for the selected packet."
            )
            queue_drain["external_action_allowed"] = False
            queue_drain["source_mutation_allowed_now"] = False
        compact["next_safe_action"] = (
            "Target queue packet already exists. Do not rerun queue replenish; run coordinator dry-run "
            "and open a separate worker-envelope gate for the selected packet."
        )
        return compact
    if queue_drain is not None and exact_gate:
        if queue_drain.get("status") == "queue_drained_no_actionable_packet":
            queue_drain["status"] = "queue_drained_waiting_for_current_exact_gate"
        queue_drain["recommended_next_gate_phrase"] = exact_gate
        queue_drain["next_gate_phrases"] = [exact_gate]
        if queue_drain.get("next_gate_packet") is None:
            queue_drain["next_gate_packet"] = {
                "id": overlay.get("selected_packet"),
                "path": overlay.get("selected_packet_path"),
                "title": "current persisted gate",
                "focus_state": "active",
                "focus_label": ", ".join(compact.get("active_focus") or []),
                "lane_status": overlay.get("status"),
                "blockers": [],
                "required_gates": [exact_gate],
                "recommended_gate": {
                    "type": "current_persisted_exact_gate",
                    "phrases": [exact_gate],
                    "requires_human_approval": True,
                    "external_action_allowed": False,
                    "source_mutation_allowed_now": False,
                    "reason": "current_next_gate.json already names this exact gate; compact status surfaces it for sidebar continuity.",
                },
                "gate_lane": "current_next_gate",
                "can_prepare_local_packet": False,
            }
        queue_drain["next_safe_action"] = overlay.get("next_safe_action") or "wait_for_current_exact_gate_or_refresh_queue"
        queue_drain["external_action_allowed"] = False
        queue_drain["source_mutation_allowed_now"] = False
    for lane_name in ("hermes_orchestrator", "validator"):
        lane = (compact.get("lane_next_actions") or {}).get(lane_name)
        if isinstance(lane, dict) and exact_gate:
            lane["next_action"] = "surface_current_exact_gate_for_operator_decision"
            lane["selected_packet"] = overlay.get("selected_packet")
            lane["source_mutation_allowed_now"] = False
    if exact_gate:
        compact["next_safe_action"] = overlay.get("next_safe_action") or "wait_for_current_exact_gate_or_refresh_queue"
    return compact


def is_queue_replenish_gate(exact_gate: Any, selected_path: Any, allowed_scope: Any) -> bool:
    return bool(
        exact_gate
        and selected_path
        and (
            "QUEUE_REPLENISH" in str(exact_gate)
            or ("queue packet" in str(allowed_scope).lower() and "write one" in str(allowed_scope).lower())
        )
    )


def current_queue_replenish_artifact_overrides(overlay: dict[str, Any] | None) -> dict[str, str]:
    """Return current-gate artifact paths when legacy defaults no longer match the selected packet."""
    if not isinstance(overlay, dict):
        return {}
    exact_gate = str(overlay.get("exact_gate_phrase") or "")
    sequence = str(overlay.get("selected_packet_sequence") or "")
    if "P143" in exact_gate and sequence == "077":
        return {
            "preview": ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P143-PACKET077-QUEUE-REPLENISH-PREVIEW-20260704.json",
            "command": ".ghostclaw_runtime/a2a2a/commands/A2A2A-P143-PACKET077-QUEUE-WRITE-CHECKSUM-GUARD-20260704.sh",
            "receipt": ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P143-PACKET077-QUEUE-REPLENISH-GUARD-PREVIEW-20260704.json",
            "status": ".ghostclaw_runtime/a2a2a/status/A2A2A-P144-PACKET077-QUEUE-REPLENISH-GUARD-STATUS-20260704.json",
            "status_receipt": ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P144-PACKET077-QUEUE-REPLENISH-GUARD-STATUS-20260704.json",
            "team_handoff": ".ghostclaw_runtime/a2a2a/status/A2A2A-P145-PACKET077-TEAM-HANDOFF-BUNDLE-20260704.json",
            "team_handoff_receipt": ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P145-PACKET077-TEAM-HANDOFF-BUNDLE-20260704.json",
        }
    return {}


def resolve_default_queue_replenish_path(value: str, default_value: str, override_value: str | None) -> str:
    if value == default_value and override_value:
        return override_value
    return value


def packet_id_from_artifact_path(path: str | None, fallback: str) -> str:
    if not path:
        return fallback
    artifact_id = Path(path).stem
    return artifact_id if artifact_id.startswith("A2A2A-") else fallback


def build_queue_replenish_packet_payload(root: Path, overlay: dict[str, Any]) -> dict[str, Any]:
    target_path = str(overlay.get("selected_packet_path") or "")
    sequence = overlay.get("selected_packet_sequence") or packet_sequence({"path": target_path}) or "next"
    exact_gate = str(overlay.get("exact_gate_phrase") or "")
    return {
        "active_focus": ["sirinx.co", "AGM AutoFlow"],
        "agent": "codex",
        "allowed_files": [
            "apps/sirinx-site/**",
            "apps/agm-site/**",
            "apps/agm-autoglow-dashboard/**",
            "apps/agm-autoglow-extension/**",
            "docs/website/**",
            "docs/creative/**",
            "reports/mission/**",
            ".ghostclaw_runtime/a2a2a/evidence/**",
            ".ghostclaw_runtime/a2a2a/receipts/**",
        ],
        "approval_required": False,
        "closed_gates": {
            "cloudflare_r2_mutation": "blocked",
            "commit": "blocked",
            "connector_read": "blocked",
            "connector_write": "blocked",
            "deploy": "blocked",
            "install": "blocked",
            "live_send": "blocked",
            "provider_call": "blocked",
            "push": "blocked",
            "secret_read_or_print": "blocked",
        },
        "constraints": [
            "local-safe only",
            "do not mutate live services",
            "do not call providers or connectors",
            "do not send Telegram/LINE/email/customer messages",
            "do not install dependencies",
            "do not commit, push, deploy, or mutate Cloudflare/R2",
            "do not read or print secrets",
            "preserve active focus: sirinx.co and AGM AutoFlow only",
            "keep Kusala and Phitsanulok News out of scope",
        ],
        "created_at": now_iso(),
        "deliverables": [
            "scoped local implementation task card for sirinx.co or AGM AutoFlow",
            "current repo evidence summary for Codex builder",
            "OpenCode review target summary",
            "Validator command list",
            "receipt and Obsidian pulse after execution",
        ],
        "forbidden_files": [
            ".env",
            ".env.*",
            "secrets/**",
            "node_modules/**",
            ".git/**",
            "apps/kusala-site/**",
            "apps/phitsanulok-news/**",
        ],
        "id": f"packet_{sequence}",
        "mission_id": "A2A2A-P129-ACTIVE-FOCUS-QUEUE-REPLENISH-20260704",
        "mode": "local_only_active_focus_next_task_no_live_send_no_provider_no_deploy",
        "next_safe_action_after_write": (
            f"Run coordinator dry-run and orchestrator compact status, then open a separate local worker envelope "
            f"write gate only if packet_{sequence} is selected."
        ),
        "packet_id": f"packet_{sequence}_sirinx_agm_next_local_task_card",
        "paused_focus": ["Kusala", "Phitsanulok News"],
        "priority": "high",
        "project_id": "active-focus-sirinx-agm",
        "risk": "safe",
        "source_evidence": [
            ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
            ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P130-ORCHESTRATOR-CURRENT-GATE-COMPACT-OVERLAY-20260704.json",
            "reports/mission/A2A2A_P130_ORCHESTRATOR_CURRENT_GATE_COMPACT_OVERLAY_20260704.md",
            ".ghostclaw_runtime/a2a2a/project_queues/sirinx_site/TASK-001-sirinx-site-public-guardian.yaml",
            ".ghostclaw_runtime/a2a2a/project_queues/sirinx_site/TASK-002-sirinx-site-roi-calculator.yaml",
            ".ghostclaw_runtime/a2a2a/project_queues/agm/TASK-001-agm-creative-media-platform.yaml",
        ],
        "status": "queued_by_exact_gate",
        "summary": (
            f"Replenish the A2A2A queue after packet_{str(int(sequence) - 1).zfill(3) if str(sequence).isdigit() else 'previous'} "
            "completed local Hermes/KOB ack. This packet asks Codex to prepare the next scoped local task card "
            "for sirinx.co or AGM AutoFlow with OpenCode review and Validator evidence, while preserving all external-action gates."
        ),
        "target_queue_path_after_approval": target_path,
        "task_type": "active_focus_next_local_task_card",
        "title": "sirinx.co and AGM AutoFlow next local task card",
        "verification": [
            "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --compact",
            "python3 scripts/ghostclaw_a2a_queue_coordinator.py --dry-run",
            "JSON parse generated evidence and receipt",
            "node scripts/secret-scan.mjs",
            "git diff --check on scoped artifacts",
        ],
        "write_gate_consumed": exact_gate,
    }


def render_queue_replenish_guard_script(
    root: Path,
    exact_gate: str,
    preview_path: str,
    target_path: str,
    expected_sha256: str,
) -> str:
    return f"""#!/usr/bin/env bash
# Checksum-guarded queue replenish write.
# Run only after the exact gate is approved:
#   bash {DEFAULT_QUEUE_REPLENISH_COMMAND_OUTPUT} {exact_gate}
set -euo pipefail

REPO="{root}"
APPROVAL="${{1:-}}"
REQUIRED_APPROVAL="{exact_gate}"
SOURCE="$REPO/{preview_path}"
TARGET="$REPO/{target_path}"
EXPECTED_SHA256="{expected_sha256}"

if [[ "$APPROVAL" != "$REQUIRED_APPROVAL" ]]; then
  echo "ERROR: exact approval phrase required: $REQUIRED_APPROVAL" >&2
  exit 2
fi

if [[ ! -f "$SOURCE" ]]; then
  echo "ERROR: source preview missing: $SOURCE" >&2
  exit 3
fi

if [[ -e "$TARGET" ]]; then
  echo "ERROR: target already exists; refusing overwrite: $TARGET" >&2
  exit 4
fi

ACTUAL_SHA256="$(shasum -a 256 "$SOURCE" | awk '{{print $1}}')"
if [[ "$ACTUAL_SHA256" != "$EXPECTED_SHA256" ]]; then
  echo "ERROR: preview checksum mismatch" >&2
  echo "expected=$EXPECTED_SHA256" >&2
  echo "actual=$ACTUAL_SHA256" >&2
  exit 5
fi

mkdir -p "$(dirname "$TARGET")"
cp "$SOURCE" "$TARGET"

TARGET_SHA256="$(shasum -a 256 "$TARGET" | awk '{{print $1}}')"
if [[ "$TARGET_SHA256" != "$EXPECTED_SHA256" ]]; then
  echo "ERROR: target checksum mismatch after write" >&2
  exit 6
fi

echo "QUEUE_REPLENISH_WRITTEN target={target_path} sha256=$TARGET_SHA256"
"""


def build_queue_replenish_guard(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
    preview_output: str,
    command_output: str,
) -> dict[str, Any]:
    overlay = build_current_gate_overlay(root, current_next_gate_path)
    issues: list[str] = []
    if not overlay:
        issues.append("current_gate_overlay_missing")
        overlay = {}
    exact_gate = str(overlay.get("exact_gate_phrase") or "")
    target_path = str(overlay.get("selected_packet_path") or "")
    if not exact_gate:
        issues.append("missing_exact_gate")
    if not target_path:
        issues.append("missing_target_queue_path")
    if not is_queue_replenish_gate(exact_gate, target_path, overlay.get("allowed_scope")):
        issues.append("current_gate_is_not_queue_replenish")
    if target_path and resolve_under_root(root, target_path).exists():
        issues.append("target_queue_path_already_exists")
    packet_payload = build_queue_replenish_packet_payload(root, overlay) if not issues else None
    preview_sha256 = hashlib.sha256(to_json_text(packet_payload).encode("utf-8")).hexdigest() if packet_payload else None
    script = (
        render_queue_replenish_guard_script(root, exact_gate, preview_output, target_path, str(preview_sha256))
        if packet_payload and preview_sha256
        else None
    )
    return {
        "schema": "ghostclaw.a2a2a.queue_replenish_guard_preview.v1",
        "packet_id": packet_id_from_artifact_path(
            preview_output,
            "A2A2A-P131-P129-QUEUE-REPLENISH-GUARD-PREVIEW-20260704",
        ),
        "status": "ready_for_exact_gate" if not issues else "blocked_or_not_ready",
        "mode": "local_safe_queue_replenish_guard_preview_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "current_gate_overlay": overlay,
        "exact_gate_phrase": exact_gate or None,
        "target_queue_path": target_path or None,
        "preview_path": preview_output,
        "preview_sha256": preview_sha256,
        "command_path": command_output,
        "command_after_exact_gate": f"bash {command_output} {exact_gate}" if script else None,
        "packet_preview": packet_payload,
        "guard_script": script,
        "issues": issues,
        "external_actions_performed": {
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            f"Run the checksum-guard command only after the exact gate {exact_gate} is provided."
            if not issues
            else "Do not write a queue packet. Resolve queue replenish guard issues first."
        ),
    }


def build_queue_replenish_guard_receipt(guard: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.queue_replenish_guard_preview_receipt.v1",
        "packet_id": guard["packet_id"],
        "status": "recorded_queue_replenish_guard_preview",
        "guard_status": guard["status"],
        "created_at": now_iso(),
        "repo": guard["repo"],
        "exact_gate_phrase": guard.get("exact_gate_phrase"),
        "target_queue_path": guard.get("target_queue_path"),
        "preview_path": guard.get("preview_path"),
        "preview_sha256": guard.get("preview_sha256"),
        "command_path": guard.get("command_path"),
        "command_after_exact_gate": guard.get("command_after_exact_gate"),
        "issues": guard.get("issues", []),
        "external_actions_performed": guard["external_actions_performed"],
        "blocked_actions_preserved": guard["blocked_actions_preserved"],
        "completion_claim": "Queue replenish preview and checksum guard prepared; target queue packet was not written.",
        "next_safe_action": guard["next_safe_action"],
    }


def build_queue_drain_refresh_gate(root: Path, plan: dict[str, Any]) -> dict[str, Any]:
    """Prepare a fresh active-focus queue packet gate after the queue is drained."""
    sequence = next_outbox_packet_sequence(root)
    packet_id = f"packet_{sequence}"
    paths = queue_refresh_artifact_paths(sequence)
    target_path = paths["target"]
    exact_gate = DEFAULT_QUEUE_DRAIN_REFRESH_GATE
    issues: list[str] = []
    queue_drain = plan.get("queue_drain") if isinstance(plan.get("queue_drain"), dict) else {}
    if queue_drain.get("status") != "queue_drained_no_actionable_packet":
        issues.append(f"queue_not_drained:{queue_drain.get('status')}")
    if resolve_under_root(root, target_path).exists():
        issues.append("target_queue_path_already_exists")

    allowed_scope = "write one local A2A2A queue packet for active-focus sirinx.co and AGM AutoFlow only"
    current_next_gate_payload = {
        "schema": "ghostclaw.a2a2a.current_next_gate.v1",
        "status": "waiting_for_exact_queue_refresh_gate",
        "created_at": now_iso(),
        "selected_packet": packet_id,
        "selected_packet_path": target_path,
        "selected_packet_sequence": sequence,
        "next_safe_action": (
            f"Provide exact gate {exact_gate} only if the operator wants to write {target_path}; "
            "otherwise keep queue drained and continue review-only status."
        ),
        "artifacts": {
            "preview_path": paths["preview"],
            "command_path": paths["command"],
            "guard_receipt_path": paths["guard_receipt"],
        },
        "current_next_gate": {
            "allowed_scope": allowed_scope,
            "blocked_scope": BLOCKED_ACTIONS,
            "exact_phrase": exact_gate,
            "status": "waiting_for_exact_queue_refresh_gate",
        },
        "current_orchestrator": {
            "status": "queue_drained_waiting_for_queue_refresh_gate",
            "queue_drain": {
                "status": "queue_drained_waiting_for_current_exact_gate",
                "previous_status": queue_drain.get("status"),
            },
            "selected_packet": packet_id,
            "selected_packet_path": target_path,
        },
    }
    overlay = {
        "exact_gate_phrase": exact_gate,
        "selected_packet_path": target_path,
        "selected_packet_sequence": sequence,
        "allowed_scope": allowed_scope,
    }
    preview_payload = build_queue_replenish_packet_payload(root, overlay)
    preview_payload.update(
        {
            "mission_id": "A2A2A-P167-ACTIVE-FOCUS-QUEUE-REFRESH-20260704",
            "source_evidence": [
                ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
                ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P167-ACTIVE-FOCUS-QUEUE-REFRESH-GATE-20260704.json",
                "reports/mission/A2A2A_P167_ACTIVE_FOCUS_QUEUE_REFRESH_GATE_20260704.md",
            ],
            "summary": (
                f"Refresh the A2A2A queue after packet_{str(int(sequence) - 1).zfill(3) if sequence.isdigit() else 'previous'} "
                "completed local Hermes/KOB ACK and compact status found no actionable active-focus packet. "
                "This packet keeps work scoped to sirinx.co and AGM AutoFlow only."
            ),
            "write_gate_consumed": exact_gate,
        }
    )
    preview_sha256 = hashlib.sha256(to_json_text(preview_payload).encode("utf-8")).hexdigest()
    guard_script = (
        render_queue_replenish_guard_script(root, exact_gate, paths["preview"], target_path, preview_sha256)
        if not issues
        else None
    )
    return {
        "schema": "ghostclaw.a2a2a.queue_drain_refresh_gate.v1",
        "packet_id": "A2A2A-P167-ACTIVE-FOCUS-QUEUE-REFRESH-GATE-20260704",
        "status": "ready_for_exact_queue_refresh_gate" if not issues else "blocked_or_not_ready",
        "mode": "local_safe_queue_refresh_gate_no_queue_write",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "queue_drain_status": queue_drain.get("status"),
        "selected_packet": packet_id,
        "selected_packet_sequence": sequence,
        "exact_gate_phrase": exact_gate,
        "target_queue_path": target_path,
        "target_queue_path_absent": not resolve_under_root(root, target_path).exists(),
        "preview_path": paths["preview"],
        "preview_sha256": preview_sha256,
        "command_path": paths["command"],
        "guard_receipt_path": paths["guard_receipt"],
        "command_after_exact_gate": f"bash {paths['command']} {exact_gate}" if guard_script else None,
        "preview_payload": preview_payload,
        "current_next_gate_payload": current_next_gate_payload,
        "guard_script": guard_script,
        "issues": issues,
        "external_actions_performed": {
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            f"Wait for exact gate {exact_gate}; then run the checksum guard only if queue packet {target_path} should be written."
            if not issues
            else "Do not write a queue packet. Resolve queue refresh gate issues first."
        ),
    }


def build_queue_drain_refresh_gate_receipt(gate: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.queue_drain_refresh_gate_receipt.v1",
        "packet_id": gate["packet_id"],
        "status": "recorded_queue_drain_refresh_gate",
        "gate_status": gate["status"],
        "created_at": now_iso(),
        "repo": gate["repo"],
        "evidence_path": evidence_path,
        "selected_packet": gate.get("selected_packet"),
        "selected_packet_sequence": gate.get("selected_packet_sequence"),
        "exact_gate_phrase": gate.get("exact_gate_phrase"),
        "target_queue_path": gate.get("target_queue_path"),
        "target_queue_path_absent": gate.get("target_queue_path_absent"),
        "preview_path": gate.get("preview_path"),
        "preview_sha256": gate.get("preview_sha256"),
        "command_path": gate.get("command_path"),
        "command_after_exact_gate": gate.get("command_after_exact_gate"),
        "issues": gate.get("issues", []),
        "external_actions_performed": gate["external_actions_performed"],
        "blocked_actions_preserved": gate["blocked_actions_preserved"],
        "completion_claim": "Queue refresh gate prepared; no queue target was written and no guard command was executed.",
        "next_safe_action": gate["next_safe_action"],
    }


def build_queue_drain_refresh_gate_status(root: Path, plan: dict[str, Any], current_next_gate_path: str | None) -> dict[str, Any]:
    """Inspect P167 queue-refresh gate artifacts without consuming the gate."""
    current_path, current_gate = load_optional_json(root, current_next_gate_path)
    current_gate_data = current_gate if isinstance(current_gate, dict) else {}
    current_block = current_gate_data.get("current_next_gate") if isinstance(current_gate_data.get("current_next_gate"), dict) else {}
    artifacts = current_gate_data.get("artifacts") if isinstance(current_gate_data.get("artifacts"), dict) else {}
    exact_gate = str(current_block.get("exact_phrase") or "")
    target_path = str(current_gate_data.get("selected_packet_path") or "")
    sequence = str(current_gate_data.get("selected_packet_sequence") or packet_sequence({"path": target_path}) or "")
    fallback_paths = queue_refresh_artifact_paths(sequence or next_outbox_packet_sequence(root))
    preview_output = str(artifacts.get("preview_path") or fallback_paths["preview"])
    command_output = str(artifacts.get("command_path") or fallback_paths["command"])
    guard_receipt_output = str(artifacts.get("guard_receipt_path") or fallback_paths["guard_receipt"])
    evidence_output = str(
        artifacts.get("evidence_path")
        or ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P167-ACTIVE-FOCUS-QUEUE-REFRESH-GATE-20260704.json"
    )
    receipt_output = str(
        artifacts.get("receipt_path")
        or ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P167-ACTIVE-FOCUS-QUEUE-REFRESH-GATE-20260704.json"
    )

    preview_path, preview_payload = load_optional_json(root, preview_output)
    evidence_path, evidence_payload = load_optional_json(root, evidence_output)
    receipt_path, receipt_payload = load_optional_json(root, receipt_output)
    guard_receipt_path, guard_receipt_payload = load_optional_json(root, guard_receipt_output)
    command_path = resolve_under_root(root, command_output)
    command_text = command_path.read_text(encoding="utf-8") if command_path.is_file() else None
    target_abs = resolve_under_root(root, target_path) if target_path else None
    preview_sha256 = sha256_file(preview_path) if preview_path and preview_path.is_file() else None
    issues: list[str] = []

    if not isinstance(current_gate, dict):
        issues.append("current_next_gate_missing_or_invalid")
    if exact_gate != DEFAULT_QUEUE_DRAIN_REFRESH_GATE:
        issues.append("current_gate_not_p167_queue_refresh")
    if not target_path:
        issues.append("missing_target_queue_path")
    if target_abs is not None and target_abs.exists():
        issues.append("target_queue_path_already_exists")
    if not isinstance(preview_payload, dict):
        issues.append("preview_missing_or_invalid")
        preview_payload = {}
    if not isinstance(evidence_payload, dict):
        issues.append("p167_evidence_missing_or_invalid")
        evidence_payload = {}
    if not isinstance(receipt_payload, dict):
        issues.append("p167_receipt_missing_or_invalid")
        receipt_payload = {}
    if not isinstance(guard_receipt_payload, dict):
        issues.append("p167_guard_receipt_missing_or_invalid")
        guard_receipt_payload = {}
    if command_text is None:
        issues.append("command_missing")

    receipt_preview_sha = receipt_payload.get("preview_sha256")
    guard_receipt_preview_sha = guard_receipt_payload.get("preview_sha256")
    evidence_preview_sha = evidence_payload.get("preview_sha256")
    preview_gate = preview_payload.get("write_gate_consumed")
    preview_target = preview_payload.get("target_queue_path_after_approval")
    receipt_gate = receipt_payload.get("exact_gate_phrase")
    receipt_target = receipt_payload.get("target_queue_path")
    evidence_gate = evidence_payload.get("exact_gate_phrase")
    evidence_target = evidence_payload.get("target_queue_path")
    command_unsafe_tokens = [
        token.strip()
        for token in UNSAFE_COMMAND_TOKENS
        if command_text and token.strip() and token in f" {command_text.lower()} "
    ]
    checks = {
        "current_gate_matches_p167": exact_gate == DEFAULT_QUEUE_DRAIN_REFRESH_GATE,
        "preview_checksum_matches_receipts": bool(
            preview_sha256
            and receipt_preview_sha == preview_sha256
            and guard_receipt_preview_sha == preview_sha256
            and evidence_preview_sha == preview_sha256
        ),
        "exact_gate_matches_preview": preview_gate == exact_gate == DEFAULT_QUEUE_DRAIN_REFRESH_GATE,
        "exact_gate_matches_receipt": receipt_gate == exact_gate,
        "exact_gate_matches_evidence": evidence_gate == exact_gate,
        "target_matches_preview": bool(target_path and preview_target == target_path),
        "target_matches_receipt": bool(target_path and receipt_target == target_path),
        "target_matches_evidence": bool(target_path and evidence_target == target_path),
        "command_contains_exact_gate": bool(command_text and exact_gate and exact_gate in command_text),
        "command_contains_preview_sha256": bool(command_text and preview_sha256 and preview_sha256 in command_text),
        "command_refuses_overwrite": bool(command_text and "refusing overwrite" in command_text),
        "command_checks_sha256": bool(command_text and "shasum -a 256" in command_text),
        "command_has_no_unsafe_tokens": not command_unsafe_tokens,
    }
    for check_name, passed in checks.items():
        if not passed:
            issues.append(check_name)
    return {
        "schema": "ghostclaw.a2a2a.queue_drain_refresh_gate_status.v1",
        "packet_id": "A2A2A-P168-P167-QUEUE-REFRESH-GATE-STATUS-20260704",
        "status": "ready_for_exact_queue_refresh_gate" if not issues else "blocked_or_not_ready",
        "mode": "local_safe_queue_refresh_gate_status_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "current_next_gate_path": rel(root, current_path) if current_path else current_next_gate_path,
        "exact_gate_phrase": exact_gate or None,
        "selected_packet": current_gate.get("selected_packet") if isinstance(current_gate, dict) else None,
        "selected_packet_sequence": sequence or None,
        "target_queue_path": target_path or None,
        "target_queue_path_absent": target_abs is not None and not target_abs.exists(),
        "preview_path": rel(root, preview_path) if preview_path else preview_output,
        "preview_sha256": preview_sha256,
        "evidence_path": rel(root, evidence_path) if evidence_path else evidence_output,
        "receipt_path": rel(root, receipt_path) if receipt_path else receipt_output,
        "guard_receipt_path": rel(root, guard_receipt_path) if guard_receipt_path else guard_receipt_output,
        "command_path": rel(root, command_path),
        "command_after_exact_gate": f"bash {rel(root, command_path)} {exact_gate}" if not issues else None,
        "checks": checks,
        "command_unsafe_tokens": command_unsafe_tokens,
        "issues": issues,
        "external_actions_performed": {
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            f"Wait for exact gate {exact_gate}; do not write {target_path} unless the operator intentionally consumes P167."
            if not issues
            else "Fix queue refresh gate status issues before consuming P167."
        ),
    }


def build_queue_drain_refresh_gate_status_receipt(status: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.queue_drain_refresh_gate_status_receipt.v1",
        "packet_id": status["packet_id"],
        "status": "recorded_queue_drain_refresh_gate_status",
        "gate_status": status["status"],
        "created_at": now_iso(),
        "repo": status["repo"],
        "evidence_path": evidence_path,
        "exact_gate_phrase": status.get("exact_gate_phrase"),
        "target_queue_path": status.get("target_queue_path"),
        "target_queue_path_absent": status.get("target_queue_path_absent"),
        "preview_path": status.get("preview_path"),
        "preview_sha256": status.get("preview_sha256"),
        "command_path": status.get("command_path"),
        "command_after_exact_gate": status.get("command_after_exact_gate"),
        "checks": status.get("checks", {}),
        "issues": status.get("issues", []),
        "external_actions_performed": status["external_actions_performed"],
        "blocked_actions_preserved": status["blocked_actions_preserved"],
        "completion_claim": "Queue refresh gate status recorded; P167 was not consumed and packet_078 was not written.",
        "next_safe_action": status["next_safe_action"],
    }


def build_queue_drain_refresh_team_handoff(root: Path, plan: dict[str, Any], current_next_gate_path: str | None) -> dict[str, Any]:
    """Build a no-execution lane handoff for the pending P167 queue refresh gate."""
    status = build_queue_drain_refresh_gate_status(root, plan, current_next_gate_path)
    ready = status.get("status") == "ready_for_exact_queue_refresh_gate"
    exact_gate = status.get("exact_gate_phrase")
    target_path = status.get("target_queue_path")
    packet_label = packet_label_from_path(target_path)
    lane_cards = {
        "Hermes_Commander": {
            "lane": "control",
            "status": "waiting_for_exact_p167_gate" if ready else "blocked_or_not_ready",
            "selected_packet": status.get("selected_packet"),
            "next_action": "surface_exact_p167_gate_for_operator_decision" if ready else "resolve_p167_status_issues",
            "allowed_now": [
                "show_p167_status",
                "show_exact_gate_phrase",
                "keep_current_next_gate_locked",
            ],
            "after_exact_gate": [
                "may_run_checksum_guard_command_once",
                "must_recheck_packet_078_absent_before_write",
                "must_record_post_write_receipt",
            ],
            "must_not": [
                "must_not_self_approve",
                "must_not_execute_worker_loop",
                "must_not_send_live_message",
                "must_not_call_provider",
                "must_not_push_deploy_or_mutate_cloud",
            ],
        },
        "Codex_Builder": {
            "lane": "build",
            "status": f"blocked_until_{packet_label}_exists" if ready else "blocked_or_not_ready",
            "selected_packet": status.get("selected_packet"),
            "next_action": (
                f"standby_until_exact_p167_writes_{packet_label}_then_wait_for_separate_worker_envelope_gate"
                if ready
                else "do_not_build_until_p167_status_is_ready"
            ),
            "allowed_now": [
                "inspect_p167_p168_artifacts",
                "prepare_notes_for_next_local_task_card",
            ],
            "must_not": [
                "do_not_write_worker_envelope",
                "do_not_edit_source_from_preview",
                "do_not_run_queue_payload",
                "do_not_commit_push_deploy",
            ],
        },
        "OpenCode_Reviewer": {
            "lane": "review",
            "status": "read_only_review_ready" if ready else "read_only_review_blocked",
            "mutation_allowed": False,
            "next_action": "review_p167_p168_gate_artifacts_read_only" if ready else "wait_for_fixed_status_artifacts",
            "allowed_now": [
                "inspect_p167_p168_artifacts",
                "inspect_current_next_gate",
                "inspect_guard_command_text",
                "report_blocking_issue_if_gate_or_checksum_mismatch",
            ],
            "must_not": [
                "edit_source",
                "write_queue_packet",
                "run_guard_command",
                "call_provider",
            ],
        },
        "Validator_Worker": {
            "lane": "validation",
            "status": "validation_ready" if ready else "validation_blocked",
            "next_action": "revalidate_before_any_exact_gate_consumption" if ready else "report_status_issues",
            "validation_commands": [
                "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --queue-drain-refresh-gate-status",
                "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --compact",
                "bash -n .ghostclaw_runtime/a2a2a/commands/A2A2A-P167-PACKET078-QUEUE-REFRESH-WRITE-GUARD-20260704.sh",
                "node scripts/secret-scan.mjs",
            ],
            "must_not": [
                "mutate_source",
                "write_queue_packet",
                "dispatch_worker",
                "run_guard_command_without_exact_gate",
            ],
        },
    }
    return {
        "schema": "ghostclaw.a2a2a.queue_drain_refresh_team_handoff.v1",
        "packet_id": "A2A2A-P169-P167-QUEUE-REFRESH-TEAM-HANDOFF-20260704",
        "status": "ready_for_operator_exact_gate_decision" if ready else "blocked_or_not_ready",
        "mode": "local_safe_queue_refresh_team_handoff_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "selected_packet": status.get("selected_packet"),
        "selected_packet_sequence": status.get("selected_packet_sequence"),
        "exact_gate_phrase": exact_gate,
        "target_queue_path": target_path,
        "target_queue_path_absent": status.get("target_queue_path_absent"),
        "p168_status_path": status.get("status_path") or ".ghostclaw_runtime/a2a2a/status/A2A2A-P168-P167-QUEUE-REFRESH-GATE-STATUS-20260704.json",
        "p167_preview_path": status.get("preview_path"),
        "p167_command_path": status.get("command_path"),
        "command_after_exact_gate": status.get("command_after_exact_gate"),
        "commands_after_exact_gate": {
            "write_packet_078": status.get("command_after_exact_gate") if ready else None,
            "worker_envelope": None,
            "role_worker_ack": None,
        },
        "lane_cards": lane_cards,
        "status_checks": status.get("checks", {}),
        "issues": status.get("issues", []),
        "external_actions_performed": {
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            f"Operator may provide exact P167 only if local queue target {target_path} should be written."
            if ready
            else "Fix P167/P168 status issues before any queue refresh handoff proceeds."
        ),
    }


def build_queue_drain_refresh_team_handoff_receipt(handoff: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.queue_drain_refresh_team_handoff_receipt.v1",
        "packet_id": handoff["packet_id"],
        "status": "recorded_queue_drain_refresh_team_handoff",
        "handoff_status": handoff["status"],
        "created_at": now_iso(),
        "repo": handoff["repo"],
        "evidence_path": evidence_path,
        "selected_packet": handoff.get("selected_packet"),
        "exact_gate_phrase": handoff.get("exact_gate_phrase"),
        "target_queue_path": handoff.get("target_queue_path"),
        "target_queue_path_absent": handoff.get("target_queue_path_absent"),
        "lane_cards": list((handoff.get("lane_cards") or {}).keys()),
        "issues": handoff.get("issues", []),
        "external_actions_performed": handoff["external_actions_performed"],
        "blocked_actions_preserved": handoff["blocked_actions_preserved"],
        "completion_claim": "P169 team handoff recorded; P167 was not consumed and packet_078 was not written.",
        "next_safe_action": handoff["next_safe_action"],
    }


def first_existing_relpath(root: Path, candidates: list[str]) -> str:
    for candidate in candidates:
        if resolve_under_root(root, candidate).is_file():
            return candidate
    return candidates[0]


def build_queue_drain_refresh_opencode_review(root: Path, plan: dict[str, Any], current_next_gate_path: str | None) -> dict[str, Any]:
    """Prepare a read-only OpenCode review packet for P167/P168/P169."""
    status = build_queue_drain_refresh_gate_status(root, plan, current_next_gate_path)
    handoff_default = ".ghostclaw_runtime/a2a2a/status/A2A2A-P169-P167-QUEUE-REFRESH-TEAM-HANDOFF-20260704.json"
    handoff_test = ".ghostclaw_runtime/a2a2a/status/P169-refresh-team-handoff.json"
    handoff_path_value = first_existing_relpath(root, [handoff_default, handoff_test])
    handoff_path, handoff = load_optional_json(root, handoff_path_value)
    issues = list(status.get("issues", []))
    if not isinstance(handoff, dict):
        issues.append("p169_handoff_missing_or_invalid")
        handoff = {}
    elif handoff.get("status") != "ready_for_operator_exact_gate_decision":
        issues.append(f"p169_handoff_not_ready:{handoff.get('status')}")
    p167_evidence = first_existing_relpath(
        root,
        [
            ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P167-ACTIVE-FOCUS-QUEUE-REFRESH-GATE-20260704.json",
            ".ghostclaw_runtime/a2a2a/evidence/P167-refresh-gate.json",
        ],
    )
    p167_receipt = first_existing_relpath(
        root,
        [
            ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P167-ACTIVE-FOCUS-QUEUE-REFRESH-GATE-20260704.json",
            ".ghostclaw_runtime/a2a2a/receipts/P167-refresh-gate.json",
        ],
    )
    p168_status = first_existing_relpath(
        root,
        [
            ".ghostclaw_runtime/a2a2a/status/A2A2A-P168-P167-QUEUE-REFRESH-GATE-STATUS-20260704.json",
            ".ghostclaw_runtime/a2a2a/status/P168-refresh-gate-status.json",
        ],
    )
    review_targets = [
        p167_evidence,
        p167_receipt,
        status.get("preview_path"),
        status.get("guard_receipt_path"),
        status.get("command_path"),
        p168_status,
        handoff_path_value,
        "reports/mission/A2A2A_P167_ACTIVE_FOCUS_QUEUE_REFRESH_GATE_20260704.md",
        "reports/mission/A2A2A_P168_P167_QUEUE_REFRESH_GATE_STATUS_20260704.md",
        "reports/mission/A2A2A_P169_P167_QUEUE_REFRESH_TEAM_HANDOFF_20260704.md",
    ]
    review_targets = [str(item) for item in review_targets if item]
    return {
        "schema": "ghostclaw.a2a2a.queue_drain_refresh_opencode_review.v1",
        "packet_id": "A2A2A-P170-P167-P169-OPENCODE-REVIEW-PACKET-20260704",
        "status": "ready_for_opencode_review" if not issues else "blocked_or_not_ready",
        "mode": "local_safe_opencode_review_packet_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "review_worker": "OpenCode_Reviewer",
        "mutation_allowed": False,
        "selected_packet": status.get("selected_packet"),
        "selected_packet_sequence": status.get("selected_packet_sequence"),
        "exact_gate_phrase": status.get("exact_gate_phrase"),
        "target_queue_path": status.get("target_queue_path"),
        "target_queue_path_absent": status.get("target_queue_path_absent"),
        "review_targets": review_targets,
        "review_checklist": [
            "verify_current_gate_exact_phrase_is_p167",
            "verify_no_packet_078_written",
            "verify_preview_checksum_matches_receipts",
            "verify_guard_command_requires_exact_gate",
            "verify_guard_command_refuses_overwrite",
            "verify_p169_codex_lane_blocked_until_packet_exists",
            "verify_no_external_actions_performed",
        ],
        "must_not": [
            "do_not_edit_source",
            "do_not_write_queue_packet",
            "do_not_run_guard_command",
            "do_not_call_provider",
            "do_not_send_live_message",
            "do_not_commit_push_deploy",
            "do_not_mutate_cloudflare_or_r2",
        ],
        "p168_status": status.get("status"),
        "p169_handoff_status": handoff.get("status"),
        "status_checks": status.get("checks", {}),
        "issues": issues,
        "external_actions_performed": {
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            "OpenCode may review listed targets read-only and report PASS/WARN/BLOCKED; P167 remains unconsumed."
            if not issues
            else "Fix P167/P168/P169 issues before routing to OpenCode review."
        ),
    }


def build_queue_drain_refresh_opencode_review_receipt(review: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.queue_drain_refresh_opencode_review_receipt.v1",
        "packet_id": review["packet_id"],
        "status": "recorded_queue_drain_refresh_opencode_review_packet",
        "review_status": review["status"],
        "created_at": now_iso(),
        "repo": review["repo"],
        "evidence_path": evidence_path,
        "review_worker": review.get("review_worker"),
        "mutation_allowed": review.get("mutation_allowed"),
        "selected_packet": review.get("selected_packet"),
        "exact_gate_phrase": review.get("exact_gate_phrase"),
        "target_queue_path": review.get("target_queue_path"),
        "target_queue_path_absent": review.get("target_queue_path_absent"),
        "review_targets": review.get("review_targets", []),
        "issues": review.get("issues", []),
        "external_actions_performed": review["external_actions_performed"],
        "blocked_actions_preserved": review["blocked_actions_preserved"],
        "completion_claim": "OpenCode review packet recorded; no mutation, provider call, guard execution, or packet_078 write was performed.",
        "next_safe_action": review["next_safe_action"],
    }


def build_queue_drain_refresh_approval_check(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
    approval_phrase: str,
) -> dict[str, Any]:
    """Validate an operator P167 approval phrase without running the guard command."""
    status = build_queue_drain_refresh_gate_status(root, plan, current_next_gate_path)
    expected = str(status.get("exact_gate_phrase") or "")
    issues = list(status.get("issues", []))
    phrase_matches = approval_phrase == expected == DEFAULT_QUEUE_DRAIN_REFRESH_GATE
    if not phrase_matches:
        issues.append("approval_phrase_mismatch")
    if not status.get("target_queue_path_absent"):
        issues.append("target_queue_path_already_exists")
    accepted = not issues and phrase_matches
    return {
        "schema": "ghostclaw.a2a2a.queue_drain_refresh_approval_check.v1",
        "packet_id": "A2A2A-P171-P167-QUEUE-REFRESH-APPROVAL-CHECK-20260704",
        "status": "accepted_exact_gate_command_ready" if accepted else "rejected_wrong_exact_gate",
        "mode": "local_safe_approval_check_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "approval_phrase": approval_phrase,
        "exact_gate_phrase": expected or None,
        "phrase_matches": phrase_matches,
        "selected_packet": status.get("selected_packet"),
        "selected_packet_sequence": status.get("selected_packet_sequence"),
        "target_queue_path": status.get("target_queue_path"),
        "target_queue_path_absent": status.get("target_queue_path_absent"),
        "command_after_exact_gate": status.get("command_after_exact_gate") if accepted else None,
        "p168_status": status.get("status"),
        "p168_issues": status.get("issues", []),
        "issues": issues,
        "external_actions_performed": {
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            "Run command_after_exact_gate only if the operator intentionally wants to write packet_078 locally."
            if accepted
            else f"Provide the exact phrase {DEFAULT_QUEUE_DRAIN_REFRESH_GATE} to unlock the local checksum guard command."
        ),
    }


def build_queue_drain_refresh_approval_check_receipt(check: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.queue_drain_refresh_approval_check_receipt.v1",
        "packet_id": check["packet_id"],
        "status": "recorded_queue_drain_refresh_approval_check",
        "check_status": check["status"],
        "created_at": now_iso(),
        "repo": check["repo"],
        "evidence_path": evidence_path,
        "phrase_matches": check.get("phrase_matches"),
        "exact_gate_phrase": check.get("exact_gate_phrase"),
        "target_queue_path": check.get("target_queue_path"),
        "target_queue_path_absent": check.get("target_queue_path_absent"),
        "command_ready": bool(check.get("command_after_exact_gate")),
        "issues": check.get("issues", []),
        "external_actions_performed": check["external_actions_performed"],
        "blocked_actions_preserved": check["blocked_actions_preserved"],
        "completion_claim": "P171 approval check recorded; no guard command was executed and packet_078 was not written.",
        "next_safe_action": check["next_safe_action"],
    }


def build_queue_drain_refresh_post_approval_simulation(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
) -> dict[str, Any]:
    """Project the state after exact P167 without executing the P167 guard."""
    check = build_queue_drain_refresh_approval_check(
        root,
        plan,
        current_next_gate_path,
        DEFAULT_QUEUE_DRAIN_REFRESH_GATE,
    )
    target_path = str(check.get("target_queue_path") or "")
    actual_target_exists = bool(target_path and resolve_under_root(root, target_path).exists())
    ready = check.get("status") == "accepted_exact_gate_command_ready" and not actual_target_exists
    issues = list(check.get("issues", []))
    if actual_target_exists and "target_queue_path_already_exists" not in issues:
        issues.append("target_queue_path_already_exists")
    if check.get("status") != "accepted_exact_gate_command_ready":
        issues.append("p167_exact_gate_not_ready")
    return {
        "schema": "ghostclaw.a2a2a.queue_drain_refresh_post_approval_simulation.v1",
        "packet_id": "A2A2A-P172-P167-POST-APPROVAL-SIMULATION-20260704",
        "status": "ready_for_post_p167_worker_envelope_gate" if ready else "blocked_or_not_ready",
        "mode": "local_safe_post_approval_simulation_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "source_gate_packet": check.get("packet_id"),
        "source_gate_status": check.get("status"),
        "exact_gate_phrase": check.get("exact_gate_phrase"),
        "selected_packet": check.get("selected_packet"),
        "selected_packet_sequence": check.get("selected_packet_sequence"),
        "target_queue_path": target_path or None,
        "actual_target_queue_path_exists": actual_target_exists,
        "simulated_target_queue_path_exists_after_p167": ready,
        "simulated_transition": [
            "operator_runs_exact_p167_checksum_guard",
            "packet_078_exists_locally_after_guard",
            "orchestrator_runs_local_dry_run_reconcile",
            "separate_packet078_worker_envelope_gate_opens",
        ],
        "next_expected_gate_type": "separate_packet078_worker_envelope_gate" if ready else None,
        "next_safe_action": (
            "After exact P167 writes packet_078, run coordinator dry-run and open a separate packet_078 worker-envelope gate; do not start a worker loop."
            if ready
            else "Do not project worker-envelope readiness until P167 approval check is ready and packet_078 remains absent."
        ),
        "validation_commands": [
            "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --queue-drain-refresh-gate-status",
            "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --compact",
            "bash -n .ghostclaw_runtime/a2a2a/commands/A2A2A-P167-PACKET078-QUEUE-REFRESH-WRITE-GUARD-20260704.sh",
            "node scripts/secret-scan.mjs",
        ],
        "must_not": [
            "do_not_execute_guard_command",
            "do_not_write_packet_078",
            "do_not_write_worker_envelope",
            "do_not_start_worker_loop",
            "do_not_send_live_message",
            "do_not_call_provider",
            "do_not_commit_push_deploy",
            "do_not_mutate_cloudflare_or_r2",
            "do_not_read_or_print_secrets",
        ],
        "issues": issues,
        "external_actions_performed": {
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
    }


def build_queue_drain_refresh_post_approval_simulation_receipt(
    simulation: dict[str, Any],
    evidence_path: str,
) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.queue_drain_refresh_post_approval_simulation_receipt.v1",
        "packet_id": simulation["packet_id"],
        "status": "recorded_queue_drain_refresh_post_approval_simulation",
        "simulation_status": simulation["status"],
        "created_at": now_iso(),
        "repo": simulation["repo"],
        "evidence_path": evidence_path,
        "selected_packet": simulation.get("selected_packet"),
        "target_queue_path": simulation.get("target_queue_path"),
        "actual_target_queue_path_exists": simulation.get("actual_target_queue_path_exists"),
        "simulated_target_queue_path_exists_after_p167": simulation.get(
            "simulated_target_queue_path_exists_after_p167"
        ),
        "next_expected_gate_type": simulation.get("next_expected_gate_type"),
        "issues": simulation.get("issues", []),
        "external_actions_performed": simulation["external_actions_performed"],
        "blocked_actions_preserved": simulation["blocked_actions_preserved"],
        "completion_claim": "P172 post-approval simulation recorded; P167 guard was not executed and packet_078 was not written.",
        "next_safe_action": simulation["next_safe_action"],
    }


def build_packet078_transition_readiness(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
) -> dict[str, Any]:
    """Surface the safe P167 -> packet_078 -> P173 transition without executing it."""
    p167_check = build_queue_drain_refresh_approval_check(
        root,
        plan,
        current_next_gate_path,
        DEFAULT_QUEUE_DRAIN_REFRESH_GATE,
    )
    p172 = build_queue_drain_refresh_post_approval_simulation(root, plan, current_next_gate_path)
    target_path = str(p172.get("target_queue_path") or "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json")
    target_exists = resolve_under_root(root, target_path).exists()
    p173 = build_packet078_worker_envelope_gate(
        root,
        plan,
        target_path,
        DEFAULT_PACKET078_WORKER_ENVELOPE_PREVIEW_OUTPUT,
        DEFAULT_PACKET078_WORKER_ENVELOPE_COMMAND_OUTPUT,
    )
    p173_issues = list(p173.get("issues", []))
    p172_ready = p172.get("status") == "ready_for_post_p167_worker_envelope_gate"
    p167_ready = p167_check.get("status") == "accepted_exact_gate_command_ready"
    p173_waiting_only_for_packet = p173.get("status") == "blocked_or_not_ready" and p173_issues == ["queue_packet_missing"]
    p173_ready = p173.get("status") == "ready_for_exact_gate"
    issues: list[str] = []
    if not p167_ready:
        issues.append("p167_exact_gate_not_ready")
    if not p172_ready and not target_exists:
        issues.append("p172_post_approval_simulation_not_ready")
    if not (p173_waiting_only_for_packet or p173_ready):
        issues.append("p173_preflight_not_in_expected_state")
    if p167_ready and p172_ready and p173_waiting_only_for_packet and not target_exists:
        status = "ready_for_exact_p167_queue_write"
        next_safe_action = (
            "Consume exact P167 only if packet_078 should be written locally; then rerun P173 preflight "
            "before opening the separate worker-envelope gate."
        )
    elif p173_ready and target_exists:
        status = "ready_for_exact_p173_worker_envelope_gate"
        next_safe_action = (
            "packet_078 exists and P173 preview is ready; consume exact P173 only if local Hermes/KOB "
            "worker envelopes should be written."
        )
    else:
        status = "blocked_or_not_ready"
        next_safe_action = "Resolve transition readiness issues before consuming P167 or opening P173."

    return {
        "schema": "ghostclaw.a2a2a.packet078_transition_readiness.v1",
        "packet_id": "A2A2A-P174-PACKET078-TRANSITION-READINESS-20260704",
        "status": status,
        "mode": "local_safe_packet078_transition_readiness_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "selected_packet": "packet_078",
        "target_queue_path": target_path,
        "actual_target_queue_path_exists": target_exists,
        "exact_p167_phrase": DEFAULT_QUEUE_DRAIN_REFRESH_GATE,
        "p167_status": p167_check.get("status"),
        "p167_command_after_exact_gate": p167_check.get("command_after_exact_gate"),
        "p172_status": p172.get("status"),
        "p172_next_expected_gate_type": p172.get("next_expected_gate_type"),
        "p173_preflight_status": p173.get("status"),
        "p173_expected_blockers": p173_issues,
        "post_p167_expected_worker_envelope_gate": DEFAULT_PACKET078_WORKER_ENVELOPE_GATE,
        "post_p167_preflight_command": "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-worker-envelope-gate --write",
        "ordered_next_steps": [
            {
                "id": "consume_exact_p167",
                "requires": DEFAULT_QUEUE_DRAIN_REFRESH_GATE,
                "command": p167_check.get("command_after_exact_gate"),
                "writes": target_path,
                "skip_if_target_exists": True,
            },
            {
                "id": "rerun_p173_preflight",
                "requires": f"{target_path} exists after P167",
                "command": "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-worker-envelope-gate --write",
                "writes": [
                    DEFAULT_PACKET078_WORKER_ENVELOPE_PREVIEW_OUTPUT,
                    DEFAULT_PACKET078_WORKER_ENVELOPE_RECEIPT_OUTPUT,
                    DEFAULT_PACKET078_WORKER_ENVELOPE_COMMAND_OUTPUT,
                ],
            },
            {
                "id": "open_exact_p173_if_ready",
                "requires": "P173 preflight status ready_for_exact_gate",
                "exact_gate": DEFAULT_PACKET078_WORKER_ENVELOPE_GATE,
                "command_source": DEFAULT_PACKET078_WORKER_ENVELOPE_COMMAND_OUTPUT,
                "writes": "local Hermes/KOB worker envelopes only",
            },
        ],
        "must_not": [
            "do_not_execute_p167_guard",
            "do_not_write_packet_078",
            "do_not_run_p173_guard",
            "do_not_write_worker_envelope",
            "do_not_start_worker_loop",
            "do_not_send_live_message",
            "do_not_call_provider",
            "do_not_commit_push_deploy",
            "do_not_mutate_cloudflare_or_r2",
            "do_not_read_or_print_secrets",
        ],
        "issues": issues,
        "external_actions_performed": {
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": next_safe_action,
    }


def build_packet078_transition_readiness_receipt(readiness: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_transition_readiness_receipt.v1",
        "packet_id": readiness["packet_id"],
        "status": "recorded_packet078_transition_readiness",
        "readiness_status": readiness["status"],
        "created_at": now_iso(),
        "repo": readiness["repo"],
        "evidence_path": evidence_path,
        "target_queue_path": readiness.get("target_queue_path"),
        "actual_target_queue_path_exists": readiness.get("actual_target_queue_path_exists"),
        "exact_p167_phrase": readiness.get("exact_p167_phrase"),
        "post_p167_expected_worker_envelope_gate": readiness.get("post_p167_expected_worker_envelope_gate"),
        "issues": readiness.get("issues", []),
        "external_actions_performed": readiness["external_actions_performed"],
        "blocked_actions_preserved": readiness["blocked_actions_preserved"],
        "completion_claim": "P174 transition readiness recorded; no P167 guard, packet_078 write, P173 guard, or worker envelope write was performed.",
        "next_safe_action": readiness["next_safe_action"],
    }


def build_packet078_transition_opencode_review(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
) -> dict[str, Any]:
    """Prepare a read-only OpenCode review packet for the packet_078 transition chain."""
    readiness = build_packet078_transition_readiness(root, plan, current_next_gate_path)
    target_path = str(readiness.get("target_queue_path") or "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json")
    target_exists = resolve_under_root(root, target_path).exists()
    p174_path = first_existing_relpath(
        root,
        [
            ".ghostclaw_runtime/a2a2a/status/A2A2A-P174-PACKET078-TRANSITION-READINESS-20260704.json",
            ".ghostclaw_runtime/a2a2a/status/P174-packet078-transition-readiness.json",
        ],
    )
    review_targets = [
        ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P167-ACTIVE-FOCUS-QUEUE-REFRESH-GATE-20260704.json",
        ".ghostclaw_runtime/a2a2a/status/A2A2A-P171-P167-EXACT-APPROVAL-CHECK-20260704.json",
        ".ghostclaw_runtime/a2a2a/status/A2A2A-P172-P167-POST-APPROVAL-SIMULATION-20260704.json",
        ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P173-PACKET078-WORKER-ENVELOPE-PREVIEW-20260704.json",
        ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P173-PACKET078-WORKER-ENVELOPE-GATE-PREVIEW-20260704.json",
        p174_path,
        "reports/mission/A2A2A_P167_ACTIVE_FOCUS_QUEUE_REFRESH_GATE_20260704.md",
        "reports/mission/A2A2A_P171_P167_APPROVAL_CHECK_20260704.md",
        "reports/mission/A2A2A_P172_P167_POST_APPROVAL_SIMULATION_20260704.md",
        "reports/mission/A2A2A_P173_PACKET078_WORKER_ENVELOPE_PREFLIGHT_20260704.md",
        "reports/mission/A2A2A_P174_PACKET078_TRANSITION_READINESS_20260704.md",
    ]
    issues: list[str] = []
    if readiness.get("status") not in {
        "ready_for_exact_p167_queue_write",
        "ready_for_exact_p173_worker_envelope_gate",
    }:
        issues.append(f"p174_transition_not_ready:{readiness.get('status')}")
    if target_exists:
        issues.append("packet_078_already_exists_review_should_switch_to_post_p167_mode")
    if readiness.get("p173_expected_blockers") != ["queue_packet_missing"] and not target_exists:
        issues.append("p173_not_waiting_only_for_packet_078")
    return {
        "schema": "ghostclaw.a2a2a.packet078_transition_opencode_review.v1",
        "packet_id": "A2A2A-P175-PACKET078-TRANSITION-OPENCODE-REVIEW-20260704",
        "status": "ready_for_opencode_review" if not issues else "blocked_or_not_ready",
        "mode": "local_safe_opencode_review_packet_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "review_worker": "OpenCode_Reviewer",
        "mutation_allowed": False,
        "selected_packet": "packet_078",
        "target_queue_path": target_path,
        "target_queue_path_exists": target_exists,
        "p174_status": readiness.get("status"),
        "p167_status": readiness.get("p167_status"),
        "p172_status": readiness.get("p172_status"),
        "p173_preflight_status": readiness.get("p173_preflight_status"),
        "exact_p167_phrase": readiness.get("exact_p167_phrase"),
        "post_p167_expected_worker_envelope_gate": readiness.get("post_p167_expected_worker_envelope_gate"),
        "ordered_next_steps": readiness.get("ordered_next_steps", []),
        "review_targets": review_targets,
        "review_checklist": [
            "verify_current_gate_exact_phrase_is_p167",
            "verify_p174_orders_exact_p167_before_p173",
            "verify_packet_078_absent_before_exact_p167",
            "verify_p173_waits_on_queue_packet_missing_only",
            "verify_p173_guard_command_absent_until_packet_078_exists",
            "verify_no_external_actions_performed",
            "verify_next_safe_action_does_not_skip_worker_envelope_gate",
        ],
        "must_not": [
            "do_not_edit_source",
            "do_not_execute_p167_guard",
            "do_not_write_packet_078",
            "do_not_run_p173_guard",
            "do_not_write_worker_envelope",
            "do_not_call_provider",
            "do_not_send_live_message",
            "do_not_commit_push_deploy",
            "do_not_mutate_cloudflare_or_r2",
        ],
        "issues": issues,
        "external_actions_performed": {
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            "OpenCode may review listed targets read-only. Exact P167 remains required before packet_078 exists."
            if not issues
            else "Resolve P175 review packet issues before routing to OpenCode."
        ),
    }


def build_packet078_transition_opencode_review_receipt(review: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_transition_opencode_review_receipt.v1",
        "packet_id": review["packet_id"],
        "status": "recorded_packet078_transition_opencode_review_packet",
        "review_status": review["status"],
        "created_at": now_iso(),
        "repo": review["repo"],
        "evidence_path": evidence_path,
        "review_worker": review.get("review_worker"),
        "mutation_allowed": review.get("mutation_allowed"),
        "selected_packet": review.get("selected_packet"),
        "target_queue_path": review.get("target_queue_path"),
        "target_queue_path_exists": review.get("target_queue_path_exists"),
        "p174_status": review.get("p174_status"),
        "review_targets": review.get("review_targets", []),
        "issues": review.get("issues", []),
        "external_actions_performed": review["external_actions_performed"],
        "blocked_actions_preserved": review["blocked_actions_preserved"],
        "completion_claim": "P175 OpenCode review packet recorded; no P167/P173 guard, queue write, worker envelope write, provider call, live send, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": review["next_safe_action"],
    }


def external_actions_false_subset(actions: dict[str, Any] | None) -> bool:
    if not isinstance(actions, dict):
        return False
    return all(value is False for value in actions.values())


def build_packet078_opencode_review_result_intake(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
    result_input: str,
) -> dict[str, Any]:
    """Validate an OpenCode review result without treating missing review as pass."""
    review = build_packet078_transition_opencode_review(root, plan, current_next_gate_path)
    result_path, result = load_optional_json(root, result_input)
    target_path = str(review.get("target_queue_path") or "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json")
    target_exists = resolve_under_root(root, target_path).exists()
    issues = list(review.get("issues", []))
    if review.get("status") != "ready_for_opencode_review":
        issues.append(f"p175_review_packet_not_ready:{review.get('status')}")
    result_status = None
    if not isinstance(result, dict):
        result = {}
        issues.append("opencode_review_result_missing")
    else:
        result_status = str(result.get("status") or "")
        if result.get("review_worker") != "OpenCode_Reviewer":
            issues.append("review_worker_not_opencode")
        if result.get("mutation_allowed") is not False:
            issues.append("review_result_mutation_not_false")
        if result.get("target_queue_path_exists") is not False:
            issues.append("review_result_target_absence_not_confirmed")
        if result.get("blocking_issues") not in ([], None):
            issues.append("review_result_has_blocking_issues")
        if not external_actions_false_subset(result.get("external_actions_performed")):
            issues.append("review_result_external_actions_not_all_false")
        if result_status != "REVIEW_PASS_READY_FOR_EXACT_P167":
            issues.append(f"review_result_not_pass:{result_status or 'missing'}")
    if target_exists:
        issues.append("packet_078_already_exists")

    pass_ready = issues == []
    waiting_only = issues == ["opencode_review_result_missing"]
    status = (
        "ready_to_surface_exact_p167_after_opencode_pass"
        if pass_ready
        else "waiting_for_opencode_review_result"
        if waiting_only
        else "blocked_or_not_ready"
    )
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_review_result_intake.v1",
        "packet_id": "A2A2A-P176-PACKET078-OPENCODE-REVIEW-RESULT-INTAKE-20260704",
        "status": status,
        "mode": "local_safe_opencode_review_result_intake_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "review_packet_status": review.get("status"),
        "review_packet_path": ".ghostclaw_runtime/a2a2a/reviews/A2A2A-P175-PACKET078-TRANSITION-OPENCODE-REVIEW-20260704.json",
        "review_result_path": rel(root, result_path) if result_path else result_input,
        "review_result_status": result_status,
        "selected_packet": "packet_078",
        "target_queue_path": target_path,
        "target_queue_path_exists": target_exists,
        "exact_p167_phrase": DEFAULT_QUEUE_DRAIN_REFRESH_GATE,
        "exact_p167_allowed_after_review": pass_ready,
        "command_after_review_pass": (
            review.get("ordered_next_steps", [{}])[0].get("command")
            if pass_ready and review.get("ordered_next_steps")
            else None
        ),
        "must_not": [
            "do_not_claim_opencode_pass_without_result_file",
            "do_not_execute_p167_guard",
            "do_not_write_packet_078",
            "do_not_run_p173_guard",
            "do_not_write_worker_envelope",
            "do_not_call_provider",
            "do_not_send_live_message",
            "do_not_commit_push_deploy",
            "do_not_mutate_cloudflare_or_r2",
        ],
        "issues": issues,
        "external_actions_performed": {
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            "Surface exact P167 for operator decision; do not execute it automatically."
            if pass_ready
            else "Wait for OpenCode read-only review result before surfacing exact P167."
            if waiting_only
            else "Resolve OpenCode review result intake issues before surfacing exact P167."
        ),
    }


def build_packet078_opencode_review_result_intake_receipt(intake: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_review_result_intake_receipt.v1",
        "packet_id": intake["packet_id"],
        "status": "recorded_packet078_opencode_review_result_intake",
        "intake_status": intake["status"],
        "created_at": now_iso(),
        "repo": intake["repo"],
        "evidence_path": evidence_path,
        "review_result_path": intake.get("review_result_path"),
        "review_result_status": intake.get("review_result_status"),
        "exact_p167_allowed_after_review": intake.get("exact_p167_allowed_after_review"),
        "target_queue_path": intake.get("target_queue_path"),
        "target_queue_path_exists": intake.get("target_queue_path_exists"),
        "issues": intake.get("issues", []),
        "external_actions_performed": intake["external_actions_performed"],
        "blocked_actions_preserved": intake["blocked_actions_preserved"],
        "completion_claim": "P176 OpenCode review result intake recorded; no review pass was fabricated and no P167/P173 guard, queue write, worker envelope write, provider call, live send, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": intake["next_safe_action"],
    }


def build_packet078_opencode_review_candidate_preflight(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
    candidate_input: str,
    result_input: str,
) -> dict[str, Any]:
    """Validate an OpenCode candidate result before the real review-result path is written."""
    candidate_path, candidate = load_optional_json(root, candidate_input)
    real_result_path = resolve_under_root(root, result_input)
    real_result_exists = real_result_path.exists()
    issues: list[str] = []
    candidate_sha256 = sha256_file(candidate_path) if candidate_path and candidate_path.is_file() else None
    candidate_result_status = None
    if not isinstance(candidate, dict):
        issues.append("candidate_review_result_missing")
    else:
        candidate_result_status = str(candidate.get("status") or "")
        candidate_schema = str(candidate.get("schema") or "")
        candidate_packet_id = str(candidate.get("packet_id") or "")
        if candidate_schema == PACKET078_TRANSITION_REVIEW_RESULT_SCHEMA:
            issues.append("candidate_schema_is_real_review_result")
        if candidate_packet_id == PACKET078_TRANSITION_REVIEW_RESULT_PACKET_ID:
            issues.append("candidate_packet_id_is_real_review_result")
        if candidate.get("review_worker") != "OpenCode_Reviewer":
            issues.append("candidate_review_worker_not_opencode")
        if candidate.get("mutation_allowed") is not False:
            issues.append("candidate_mutation_not_false")
        if candidate.get("target_queue_path_exists") is not False:
            issues.append("candidate_target_absence_not_confirmed")
        if candidate.get("blocking_issues") not in ([], None):
            issues.append("candidate_has_blocking_issues")
        if not external_actions_false_subset(candidate.get("external_actions_performed")):
            issues.append("candidate_external_actions_not_all_false")
        if candidate_result_status != "REVIEW_PASS_READY_FOR_EXACT_P167":
            issues.append(f"candidate_review_result_not_pass:{candidate_result_status or 'missing'}")
    if real_result_exists:
        issues.append("real_review_result_already_exists")

    ready = issues == []
    waiting_only = issues == ["candidate_review_result_missing"]
    status = (
        "candidate_ready_for_real_result_path"
        if ready
        else "waiting_for_candidate_review_result"
        if waiting_only
        else "blocked_or_not_ready"
    )
    post_copy_intake_command = (
        "python3 scripts/ghostclaw_a2a_agent_orchestrator.py "
        "--packet078-opencode-review-result-intake "
        f"--packet078-opencode-review-result {shlex.quote(result_input)} --write"
    )
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_review_candidate_preflight.v1",
        "packet_id": "A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-PREFLIGHT-20260704",
        "status": status,
        "mode": "local_safe_candidate_preflight_no_real_result_write",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "selected_packet": "packet_078",
        "candidate_path": rel(root, candidate_path) if candidate_path else candidate_input,
        "candidate_path_exists": isinstance(candidate, dict),
        "candidate_sha256": candidate_sha256,
        "candidate_schema": candidate.get("schema") if isinstance(candidate, dict) else None,
        "candidate_packet_id": candidate.get("packet_id") if isinstance(candidate, dict) else None,
        "candidate_review_result_status": candidate_result_status,
        "candidate_intake_status": "candidate_format_pass" if isinstance(candidate, dict) and not issues else None,
        "candidate_ready_for_real_result_path": ready,
        "real_review_result_path": result_input,
        "real_review_result_path_exists": real_result_exists,
        "copy_to_real_result_requires_exact_gate": True,
        "copy_to_real_result_command_preview": (
            f"cp {shlex.quote(candidate_input)} {shlex.quote(result_input)}"
            if ready
            else None
        ),
        "post_copy_intake_command": post_copy_intake_command,
        "issues": issues,
        "must_not": [
            "do_not_write_real_review_result_path",
            "do_not_treat_candidate_as_real_review_result",
            "do_not_write_packet_078",
            "do_not_execute_p167_guard",
            "do_not_run_p173_guard",
            "do_not_write_worker_envelope",
            "do_not_call_provider",
            "do_not_send_live_message",
            "do_not_commit_push_deploy",
            "do_not_mutate_cloudflare_or_r2",
        ],
        "external_actions_performed": {
            "review_result_write": False,
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            "Candidate is valid; separate exact gate is required before copying it to the real review-result path."
            if ready
            else "OpenCode should write a candidate review result, then rerun this preflight before touching the real result path."
            if waiting_only
            else "Resolve candidate preflight issues before the real review-result path can be written."
        ),
    }


def build_packet078_opencode_review_candidate_preflight_receipt(
    preflight: dict[str, Any],
    evidence_path: str,
) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_review_candidate_preflight_receipt.v1",
        "packet_id": preflight["packet_id"],
        "status": "recorded_packet078_opencode_review_candidate_preflight",
        "preflight_status": preflight["status"],
        "created_at": now_iso(),
        "repo": preflight["repo"],
        "evidence_path": evidence_path,
        "candidate_path": preflight["candidate_path"],
        "candidate_ready_for_real_result_path": preflight["candidate_ready_for_real_result_path"],
        "real_review_result_path": preflight["real_review_result_path"],
        "real_review_result_path_exists": preflight["real_review_result_path_exists"],
        "issues": preflight["issues"],
        "external_actions_performed": preflight["external_actions_performed"],
        "blocked_actions_preserved": preflight["blocked_actions_preserved"],
        "completion_claim": "P185 OpenCode candidate preflight recorded; no real review result, P167 guard, packet_078 write, P173 guard, worker envelope write, provider call, live send, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": preflight["next_safe_action"],
    }


def build_packet078_candidate_watch(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
    candidate_input: str,
    result_input: str,
    candidate_call_status_input: str | None,
) -> dict[str, Any]:
    """Watch the candidate-review handoff and surface the next safe gate without writing result files."""
    preflight = build_packet078_opencode_review_candidate_preflight(
        root,
        plan,
        current_next_gate_path,
        candidate_input,
        result_input,
    )
    call_status_path, call_status = load_optional_json(root, candidate_call_status_input)
    candidate_path = resolve_under_root(root, candidate_input)
    real_result_path = resolve_under_root(root, result_input)
    target_queue_input = "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json"
    p173_guard_input = DEFAULT_PACKET078_WORKER_ENVELOPE_COMMAND_OUTPUT
    target_queue_path = resolve_under_root(root, target_queue_input)
    p173_guard_path = resolve_under_root(root, p173_guard_input)

    issues = list(preflight.get("issues", []))
    unsafe_present: list[str] = []
    if real_result_path.exists():
        unsafe_present.append("real_review_result_path_exists")
    if target_queue_path.exists():
        unsafe_present.append("target_queue_path_exists")
    if p173_guard_path.exists():
        unsafe_present.append("p173_guard_exists")
    issues.extend(issue for issue in unsafe_present if issue not in issues)

    candidate_exists = candidate_path.is_file()
    ready = (
        candidate_exists
        and preflight.get("candidate_ready_for_real_result_path") is True
        and not unsafe_present
    )
    waiting = not candidate_exists and unsafe_present == []
    status = (
        "candidate_ready_for_exact_real_result_gate"
        if ready
        else "waiting_for_opencode_candidate"
        if waiting
        else "blocked_or_not_ready"
    )
    return {
        "schema": "ghostclaw.a2a2a.packet078_candidate_watch.v1",
        "packet_id": "A2A2A-P190-PACKET078-CANDIDATE-WATCH-20260704",
        "status": status,
        "mode": "local_safe_candidate_watch_no_result_or_queue_write",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "selected_packet": "packet_078",
        "candidate_call_status_path": rel(root, call_status_path) if call_status_path else candidate_call_status_input,
        "candidate_call_status": call_status.get("status") if isinstance(call_status, dict) else None,
        "candidate_review_result_path": candidate_input,
        "candidate_review_result_exists": candidate_exists,
        "candidate_ready_for_real_result_path": ready,
        "candidate_preflight_status": preflight.get("status"),
        "candidate_preflight_issues": preflight.get("issues", []),
        "candidate_sha256": preflight.get("candidate_sha256"),
        "real_review_result_path": result_input,
        "real_review_result_path_exists": real_result_path.exists(),
        "target_queue_path": target_queue_input,
        "target_queue_path_exists": target_queue_path.exists(),
        "p173_guard_path": p173_guard_input,
        "p173_guard_exists": p173_guard_path.exists(),
        "copy_to_real_result_requires_exact_gate": True,
        "copy_to_real_result_command_preview": preflight.get("copy_to_real_result_command_preview") if ready else None,
        "post_copy_intake_command": preflight.get("post_copy_intake_command") if ready else None,
        "issues": [] if ready else issues,
        "unsafe_present": unsafe_present,
        "must_not": [
            "do_not_write_candidate_result_from_codex",
            "do_not_write_real_review_result_path",
            "do_not_write_packet_078",
            "do_not_execute_p167_guard",
            "do_not_create_or_run_p173_guard",
            "do_not_write_worker_envelope",
            "do_not_call_provider",
            "do_not_send_live_message",
            "do_not_commit_push_deploy",
            "do_not_mutate_cloudflare_or_r2",
        ],
        "external_actions_performed": {
            "candidate_review_result_write": False,
            "real_review_result_write": False,
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            "Candidate is valid; a separate exact gate is required before copying it to the real review-result path, then rerun P176/P181/P182."
            if ready
            else "OpenCode candidate is still missing; paste/run the P186 prompt in OpenCode, then rerun P190/P185."
            if waiting
            else "Resolve candidate watch issues before any real result-path or queue write."
        ),
    }


def build_packet078_candidate_watch_receipt(watch: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_candidate_watch_receipt.v1",
        "packet_id": watch["packet_id"],
        "status": "recorded_packet078_candidate_watch",
        "watch_status": watch["status"],
        "created_at": now_iso(),
        "repo": watch["repo"],
        "evidence_path": evidence_path,
        "candidate_review_result_path": watch["candidate_review_result_path"],
        "candidate_review_result_exists": watch["candidate_review_result_exists"],
        "candidate_ready_for_real_result_path": watch["candidate_ready_for_real_result_path"],
        "real_review_result_path_exists": watch["real_review_result_path_exists"],
        "target_queue_path_exists": watch["target_queue_path_exists"],
        "p173_guard_exists": watch["p173_guard_exists"],
        "issues": watch["issues"],
        "external_actions_performed": watch["external_actions_performed"],
        "completion_claim": "P190 candidate watch recorded; no candidate result, real review result, packet_078, worker envelope, provider call, live send, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": watch["next_safe_action"],
    }


def build_packet078_candidate_poll(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
    candidate_input: str,
    result_input: str,
    candidate_call_status_input: str | None,
    attempts: int,
    interval_seconds: float,
) -> dict[str, Any]:
    """Run a bounded local poll for the OpenCode candidate result without writing it."""
    effective_attempts = max(1, min(attempts, 10))
    effective_interval = max(0.0, min(interval_seconds, 10.0))
    trace: list[dict[str, Any]] = []
    final_watch: dict[str, Any] | None = None
    for attempt in range(1, effective_attempts + 1):
        final_watch = build_packet078_candidate_watch(
            root,
            plan,
            current_next_gate_path,
            candidate_input,
            result_input,
            candidate_call_status_input,
        )
        trace.append(
            {
                "attempt": attempt,
                "status": final_watch["status"],
                "candidate_review_result_exists": final_watch["candidate_review_result_exists"],
                "candidate_ready_for_real_result_path": final_watch["candidate_ready_for_real_result_path"],
                "real_review_result_path_exists": final_watch["real_review_result_path_exists"],
                "target_queue_path_exists": final_watch["target_queue_path_exists"],
                "p173_guard_exists": final_watch["p173_guard_exists"],
                "issues": final_watch["issues"],
            }
        )
        if final_watch["status"] != "waiting_for_opencode_candidate":
            break
        if attempt < effective_attempts and effective_interval > 0:
            time.sleep(effective_interval)
    assert final_watch is not None
    return {
        "schema": "ghostclaw.a2a2a.packet078_candidate_poll.v1",
        "packet_id": "A2A2A-P191-PACKET078-CANDIDATE-POLL-20260704",
        "status": final_watch["status"],
        "mode": "local_safe_bounded_candidate_poll_no_result_or_queue_write",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "selected_packet": "packet_078",
        "poll_attempts_requested": attempts,
        "poll_attempts_effective": effective_attempts,
        "poll_attempts_observed": len(trace),
        "poll_interval_seconds_requested": interval_seconds,
        "poll_interval_seconds_effective": effective_interval,
        "final_watch_status": final_watch["status"],
        "candidate_call_status_path": final_watch["candidate_call_status_path"],
        "candidate_call_status": final_watch["candidate_call_status"],
        "candidate_review_result_path": final_watch["candidate_review_result_path"],
        "candidate_review_result_exists": final_watch["candidate_review_result_exists"],
        "candidate_ready_for_real_result_path": final_watch["candidate_ready_for_real_result_path"],
        "candidate_sha256": final_watch["candidate_sha256"],
        "real_review_result_path": final_watch["real_review_result_path"],
        "real_review_result_path_exists": final_watch["real_review_result_path_exists"],
        "target_queue_path": final_watch["target_queue_path"],
        "target_queue_path_exists": final_watch["target_queue_path_exists"],
        "p173_guard_path": final_watch["p173_guard_path"],
        "p173_guard_exists": final_watch["p173_guard_exists"],
        "copy_to_real_result_requires_exact_gate": True,
        "copy_to_real_result_command_preview": final_watch["copy_to_real_result_command_preview"],
        "post_copy_intake_command": final_watch["post_copy_intake_command"],
        "issues": final_watch["issues"],
        "unsafe_present": final_watch["unsafe_present"],
        "poll_trace": trace,
        "must_not": final_watch["must_not"],
        "external_actions_performed": final_watch["external_actions_performed"],
        "blocked_actions_preserved": final_watch["blocked_actions_preserved"],
        "next_safe_action": final_watch["next_safe_action"],
    }


def build_packet078_candidate_poll_receipt(poll: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_candidate_poll_receipt.v1",
        "packet_id": poll["packet_id"],
        "status": "recorded_packet078_candidate_poll",
        "poll_status": poll["status"],
        "created_at": now_iso(),
        "repo": poll["repo"],
        "evidence_path": evidence_path,
        "poll_attempts_observed": poll["poll_attempts_observed"],
        "candidate_review_result_path": poll["candidate_review_result_path"],
        "candidate_review_result_exists": poll["candidate_review_result_exists"],
        "candidate_ready_for_real_result_path": poll["candidate_ready_for_real_result_path"],
        "real_review_result_path_exists": poll["real_review_result_path_exists"],
        "target_queue_path_exists": poll["target_queue_path_exists"],
        "p173_guard_exists": poll["p173_guard_exists"],
        "issues": poll["issues"],
        "external_actions_performed": poll["external_actions_performed"],
        "completion_claim": "P191 bounded candidate poll recorded; no candidate result, real review result, packet_078, worker envelope, provider call, live send, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": poll["next_safe_action"],
    }


def render_packet078_candidate_copy_guard_script(
    root: Path,
    candidate_path: str,
    real_result_path: str,
    expected_candidate_sha256: str,
    exact_gate: str,
) -> str:
    return f"""#!/usr/bin/env bash
# P193 checksum-guarded candidate-to-real OpenCode review-result copy.
# Local-only. Requires exact gate and refuses overwrite/checksum mismatch.
set -euo pipefail

EXPECTED_GATE={shlex.quote(exact_gate)}
if [ "${{1:-}}" != "$EXPECTED_GATE" ]; then
  echo "ERROR: exact gate required: $EXPECTED_GATE" >&2
  exit 2
fi

cd {shlex.quote(str(root))}
CANDIDATE={shlex.quote(candidate_path)}
TARGET={shlex.quote(real_result_path)}
EXPECTED_CANDIDATE_SHA256={shlex.quote(expected_candidate_sha256)}

if [ ! -f "$CANDIDATE" ]; then
  echo "ERROR: candidate review result missing: $CANDIDATE" >&2
  exit 3
fi

if [ -e "$TARGET" ]; then
  echo "ERROR: real review-result target already exists: $TARGET" >&2
  exit 4
fi

ACTUAL_CANDIDATE_SHA256="$(shasum -a 256 "$CANDIDATE" | awk '{{print $1}}')"
if [ "$ACTUAL_CANDIDATE_SHA256" != "$EXPECTED_CANDIDATE_SHA256" ]; then
  echo "ERROR: candidate checksum mismatch" >&2
  exit 5
fi

mkdir -p "$(dirname "$TARGET")"
cp "$CANDIDATE" "$TARGET"

TARGET_SHA256="$(shasum -a 256 "$TARGET" | awk '{{print $1}}')"
if [ "$TARGET_SHA256" != "$EXPECTED_CANDIDATE_SHA256" ]; then
  echo "ERROR: target checksum mismatch after copy" >&2
  exit 6
fi

echo "CANDIDATE_REVIEW_RESULT_COPIED target=$TARGET sha256=$TARGET_SHA256"
"""


def build_packet078_candidate_copy_gate(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
    candidate_input: str,
    result_input: str,
    command_output: str,
) -> dict[str, Any]:
    preflight = build_packet078_opencode_review_candidate_preflight(
        root,
        plan,
        current_next_gate_path,
        candidate_input,
        result_input,
    )
    ready = preflight.get("status") == "candidate_ready_for_real_result_path"
    waiting = preflight.get("status") == "waiting_for_candidate_review_result"
    candidate_sha256 = preflight.get("candidate_sha256")
    exact_gate = DEFAULT_PACKET078_CANDIDATE_COPY_GATE
    guard_script = (
        render_packet078_candidate_copy_guard_script(
            root,
            candidate_input,
            result_input,
            str(candidate_sha256),
            exact_gate,
        )
        if ready and candidate_sha256
        else None
    )
    status = (
        "ready_for_exact_candidate_copy_gate"
        if ready
        else "waiting_for_opencode_candidate"
        if waiting
        else "blocked_or_not_ready"
    )
    return {
        "schema": "ghostclaw.a2a2a.packet078_candidate_copy_gate.v1",
        "packet_id": "A2A2A-P193-PACKET078-CANDIDATE-COPY-GATE-20260704",
        "status": status,
        "mode": "local_safe_candidate_copy_gate_preview_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "selected_packet": "packet_078",
        "candidate_preflight_status": preflight.get("status"),
        "candidate_review_result_path": candidate_input,
        "candidate_review_result_exists": bool(preflight.get("candidate_path_exists")),
        "candidate_ready_for_real_result_path": bool(ready),
        "candidate_sha256": candidate_sha256,
        "real_review_result_path": result_input,
        "real_review_result_path_exists": bool(preflight.get("real_review_result_path_exists")),
        "exact_gate_phrase": exact_gate,
        "command_path": command_output if ready else None,
        "command_after_exact_gate": f"bash {shlex.quote(command_output)} {shlex.quote(exact_gate)}" if ready else None,
        "guard_script": guard_script,
        "post_copy_intake_command": preflight.get("post_copy_intake_command") if ready else None,
        "issues": [] if ready else preflight.get("issues", []),
        "must_not": [
            "do_not_execute_candidate_copy_guard_without_exact_gate",
            "do_not_write_real_review_result_path_from_codex",
            "do_not_write_packet_078",
            "do_not_execute_p167_guard",
            "do_not_create_or_run_p173_guard",
            "do_not_write_worker_envelope",
            "do_not_call_provider",
            "do_not_send_live_message",
            "do_not_commit_push_deploy",
            "do_not_mutate_cloudflare_or_r2",
        ],
        "external_actions_performed": {
            "candidate_review_result_write": False,
            "real_review_result_write": False,
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            f"Candidate is valid; run the checksum guard only after exact gate {exact_gate}, then rerun P176/P181/P182."
            if ready
            else "OpenCode candidate is still missing; paste/run P186 prompt, then rerun P191/P190/P185/P193."
            if waiting
            else "Resolve candidate copy gate issues before preparing any real review-result copy."
        ),
    }


def build_packet078_candidate_copy_gate_receipt(gate: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_candidate_copy_gate_receipt.v1",
        "packet_id": gate["packet_id"],
        "status": "recorded_packet078_candidate_copy_gate",
        "gate_status": gate["status"],
        "created_at": now_iso(),
        "repo": gate["repo"],
        "evidence_path": evidence_path,
        "candidate_review_result_path": gate["candidate_review_result_path"],
        "candidate_ready_for_real_result_path": gate["candidate_ready_for_real_result_path"],
        "candidate_sha256": gate.get("candidate_sha256"),
        "real_review_result_path": gate["real_review_result_path"],
        "real_review_result_path_exists": gate["real_review_result_path_exists"],
        "exact_gate_phrase": gate["exact_gate_phrase"],
        "command_path": gate.get("command_path"),
        "issues": gate.get("issues", []),
        "external_actions_performed": gate["external_actions_performed"],
        "completion_claim": "P193 candidate copy gate preview recorded; no candidate result, real review result, packet_078, worker envelope, provider call, live send, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": gate["next_safe_action"],
    }


def build_packet078_sequence_status(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
    candidate_input: str,
    result_input: str,
    candidate_call_status_input: str | None,
    escrow_input: str,
    command_output: str,
) -> dict[str, Any]:
    """Consolidate packet_078 candidate/copy/review/release state into one safe surface."""
    candidate_poll = build_packet078_candidate_poll(
        root,
        plan,
        current_next_gate_path,
        candidate_input,
        result_input,
        candidate_call_status_input,
        attempts=1,
        interval_seconds=0,
    )
    candidate_copy_gate = build_packet078_candidate_copy_gate(
        root,
        plan,
        current_next_gate_path,
        candidate_input,
        result_input,
        command_output,
    )
    review_intake = build_packet078_opencode_review_result_intake(
        root,
        plan,
        current_next_gate_path,
        result_input,
    )
    release_watch = build_packet078_p167_release_watch(
        root,
        plan,
        current_next_gate_path,
        result_input,
        escrow_input,
    )
    target_queue_path = str(
        candidate_poll.get("target_queue_path")
        or review_intake.get("target_queue_path")
        or "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json"
    )
    target_queue_exists = resolve_under_root(root, target_queue_path).exists()
    p173_guard_path = str(candidate_poll.get("p173_guard_path") or DEFAULT_PACKET078_WORKER_ENVELOPE_COMMAND_OUTPUT)
    p173_guard_exists = resolve_under_root(root, p173_guard_path).exists()
    p193_guard_exists = resolve_under_root(root, command_output).exists()

    blocking_issues: list[str] = []
    if target_queue_exists:
        blocking_issues.append("packet_078_already_exists")
    if p173_guard_exists:
        blocking_issues.append("p173_worker_envelope_guard_already_exists")

    if blocking_issues:
        status = "blocked_or_not_ready"
        next_action = "inspect_advanced_or_unsafe_packet078_artifacts"
        next_safe_action = "Inspect packet_078/P173 artifacts before selecting the next packet_078 action."
    elif candidate_poll.get("status") == "waiting_for_opencode_candidate":
        status = "waiting_for_opencode_candidate"
        next_action = "run_opencode_candidate_then_poll"
        next_safe_action = "Paste/run the P186 prompt in OpenCode, then rerun P194/P191/P190/P185/P193."
    elif candidate_copy_gate.get("status") == "ready_for_exact_candidate_copy_gate" and not bool(
        review_intake.get("review_result_status")
    ):
        status = "ready_for_candidate_copy_gate"
        next_action = "prepare_or_run_p193_candidate_copy_gate_after_exact_approval"
        next_safe_action = (
            f"Candidate is valid; use exact gate {DEFAULT_PACKET078_CANDIDATE_COPY_GATE} "
            "before copying it to the real review-result path, then rerun P176/P181/P182."
        )
    elif release_watch.get("release_sequence_allowed") is True:
        status = "ready_for_p167_release_watch"
        next_action = "surface_escrowed_p167_for_operator_decision"
        next_safe_action = "P176/P181/P182 are ready; surface P167 for operator decision only, do not execute automatically."
    elif review_intake.get("status") == "ready_to_surface_exact_p167_after_opencode_pass":
        status = "review_pass_waiting_for_p167_escrow_release"
        next_action = "rerun_p181_p182_or_reconcile_p167_escrow"
        next_safe_action = "Review result passed; reconcile P167 escrow readiness before any packet_078 queue write."
    else:
        status = "blocked_or_not_ready"
        next_action = "resolve_packet078_sequence_status_conflicts"
        next_safe_action = "Resolve packet_078 sequence issues before surfacing any exact gate."

    candidate_poll_command = (
        "python3 scripts/ghostclaw_a2a_agent_orchestrator.py "
        "--packet078-candidate-poll "
        "--packet078-candidate-poll-attempts 1 "
        "--packet078-candidate-poll-interval 0 "
        f"--packet078-opencode-review-candidate {shlex.quote(candidate_input)} "
        f"--packet078-opencode-review-result {shlex.quote(result_input)} "
        f"--packet078-candidate-call-status {shlex.quote(candidate_call_status_input or DEFAULT_PACKET078_CANDIDATE_CALL_STATUS)}"
    )
    candidate_copy_gate_prepare_command = (
        "python3 scripts/ghostclaw_a2a_agent_orchestrator.py "
        "--packet078-candidate-copy-gate "
        f"--packet078-opencode-review-candidate {shlex.quote(candidate_input)} "
        f"--packet078-opencode-review-result {shlex.quote(result_input)} "
        f"--packet078-candidate-copy-command-output {shlex.quote(command_output)} "
        "--write"
    )
    post_copy_intake_command = (
        candidate_copy_gate.get("post_copy_intake_command")
        or (
            "python3 scripts/ghostclaw_a2a_agent_orchestrator.py "
            "--packet078-opencode-review-result-intake "
            f"--packet078-opencode-review-result {shlex.quote(result_input)} --write"
        )
    )
    return {
        "schema": "ghostclaw.a2a2a.packet078_sequence_status.v1",
        "packet_id": "A2A2A-P194-PACKET078-SEQUENCE-STATUS-20260704",
        "status": status,
        "mode": "local_safe_packet078_sequence_status_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "selected_packet": "packet_078",
        "next_action": next_action,
        "candidate_poll_status": candidate_poll.get("status"),
        "candidate_copy_gate_status": candidate_copy_gate.get("status"),
        "review_intake_status": review_intake.get("status"),
        "release_watch_status": release_watch.get("status"),
        "release_watch_gate_state": release_watch.get("gate_state"),
        "candidate_review_result_path": candidate_input,
        "candidate_review_result_exists": bool(candidate_poll.get("candidate_review_result_exists")),
        "candidate_ready_for_real_result_path": bool(candidate_poll.get("candidate_ready_for_real_result_path")),
        "candidate_sha256": candidate_poll.get("candidate_sha256") or candidate_copy_gate.get("candidate_sha256"),
        "real_review_result_path": result_input,
        "real_review_result_path_exists": bool(candidate_poll.get("real_review_result_path_exists")),
        "target_queue_path": target_queue_path,
        "target_queue_path_exists": target_queue_exists,
        "p173_guard_path": p173_guard_path,
        "p173_guard_exists": p173_guard_exists,
        "p193_guard_path": command_output,
        "p193_guard_exists": p193_guard_exists,
        "exact_gates": {
            "candidate_copy_gate": DEFAULT_PACKET078_CANDIDATE_COPY_GATE,
            "p167_queue_refresh_gate": DEFAULT_QUEUE_DRAIN_REFRESH_GATE,
        },
        "commands": {
            "candidate_poll": candidate_poll_command,
            "candidate_copy_gate_prepare": candidate_copy_gate_prepare_command,
            "post_copy_intake": post_copy_intake_command,
            "p167_release_watch_after_real_result": release_watch.get("rerun_commands", {}).get("after_opencode_result"),
        },
        "candidate_copy_command_after_exact_gate": candidate_copy_gate.get("command_after_exact_gate"),
        "post_copy_intake_command": post_copy_intake_command,
        "p167_command_to_execute_now": release_watch.get("command_to_execute_now"),
        "issues": {
            "blocking": blocking_issues,
            "candidate_poll": candidate_poll.get("issues", []),
            "candidate_copy_gate": candidate_copy_gate.get("issues", []),
            "review_intake": review_intake.get("issues", []),
            "release_watch": release_watch.get("hold_reasons", []),
        },
        "must_not": [
            "do_not_write_candidate_review_result_from_codex",
            "do_not_write_real_review_result_path_without_p193_exact_gate",
            "do_not_write_packet_078",
            "do_not_execute_p167_guard",
            "do_not_create_or_run_p173_guard",
            "do_not_write_worker_envelope",
            "do_not_call_provider",
            "do_not_send_live_message",
            "do_not_commit_push_deploy",
            "do_not_mutate_cloudflare_or_r2",
        ],
        "external_actions_performed": {
            "candidate_review_result_write": False,
            "real_review_result_write": False,
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": next_safe_action,
    }


def build_packet078_sequence_status_receipt(status: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_sequence_status_receipt.v1",
        "packet_id": status["packet_id"],
        "status": "recorded_packet078_sequence_status",
        "sequence_status": status["status"],
        "created_at": now_iso(),
        "repo": status["repo"],
        "evidence_path": evidence_path,
        "selected_packet": status["selected_packet"],
        "next_action": status["next_action"],
        "candidate_review_result_exists": status["candidate_review_result_exists"],
        "real_review_result_path_exists": status["real_review_result_path_exists"],
        "target_queue_path_exists": status["target_queue_path_exists"],
        "p173_guard_exists": status["p173_guard_exists"],
        "p193_guard_exists": status["p193_guard_exists"],
        "issues": status.get("issues", {}),
        "external_actions_performed": status["external_actions_performed"],
        "blocked_actions_preserved": status["blocked_actions_preserved"],
        "completion_claim": "P194 sequence status recorded; no candidate result, real review result, packet_078, worker envelope, provider call, live send, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": status["next_safe_action"],
    }


def default_packet078_opencode_candidate_prompt(candidate_input: str, result_input: str) -> str:
    return (
        "OpenCode read-only candidate review task for packet_078 transition. "
        "Work only inside /Users/sirinx/sirinx-os. "
        "Review the P167 -> P172 -> P173 -> P174 -> P175 -> P185 chain and write only the candidate review result path if evidence supports it. "
        f"Candidate path: {candidate_input}. "
        f"Template path: {DEFAULT_PACKET078_OPENCODE_CANDIDATE_TEMPLATE_OUTPUT}. "
        f"Do not write the real result path: {result_input}. "
        "Set status to REVIEW_PASS_READY_FOR_EXACT_P167 only after a real read-only review passes. "
        "Keep review_worker=OpenCode_Reviewer, mutation_allowed=false, blocking_issues=[], target_queue_path_exists=false, and all external action flags false for a pass. "
        "If any check fails, use REVIEW_WARN_BLOCKING_ISSUES or REVIEW_FAIL_BLOCKING_ISSUES and include blocking_issues. "
        "Do not write packet_078, execute P167/P173, write worker envelopes, call providers from this Codex lane, send live messages, read secrets, install, commit, push, deploy, or mutate Cloudflare/R2."
    )


def build_packet078_opencode_candidate_paste_pack(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
    call_packet_input: str,
    candidate_input: str,
    result_input: str,
    prompt_output: str,
    command_output: str,
) -> dict[str, Any]:
    """Create a paste-ready OpenCode candidate prompt surface without writing review results."""
    call_packet_path, call_packet = load_optional_json(root, call_packet_input)
    sequence = build_packet078_sequence_status(
        root,
        plan,
        current_next_gate_path,
        candidate_input,
        result_input,
        DEFAULT_PACKET078_CANDIDATE_CALL_STATUS,
        DEFAULT_PACKET078_P167_DEFERRED_APPROVAL_OUTPUT,
        command_output,
    )
    call_packet_prompt = (
        str(call_packet.get("opencode_prompt"))
        if isinstance(call_packet, dict) and call_packet.get("opencode_prompt")
        else None
    )
    stale_call_packet_prompt_replaced = bool(
        call_packet_prompt
        and "A2A2A-P177-PACKET078-OPENCODE-REVIEW-RESULT-TEMPLATE-20260704.json" in call_packet_prompt
    )
    if call_packet_prompt and not stale_call_packet_prompt_replaced:
        prompt = call_packet_prompt
        prompt_source = "p186_candidate_call_packet"
    else:
        prompt = default_packet078_opencode_candidate_prompt(candidate_input, result_input)
        prompt_source = (
            "default_p197_template_due_to_stale_call_packet_prompt"
            if stale_call_packet_prompt_replaced
            else "default_p197_template"
        )
    prompt_sha256 = hashlib.sha256(prompt.encode("utf-8")).hexdigest()
    candidate_exists = resolve_under_root(root, candidate_input).exists()
    real_result_exists = resolve_under_root(root, result_input).exists()
    target_queue_path = str(sequence.get("target_queue_path") or "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json")
    target_queue_exists = resolve_under_root(root, target_queue_path).exists()
    p173_guard_exists = bool(sequence.get("p173_guard_exists"))
    p193_guard_exists = bool(sequence.get("p193_guard_exists"))
    issues: list[str] = []
    if not isinstance(call_packet, dict):
        issues.append("p186_candidate_call_packet_missing")
    if candidate_exists:
        issues.append("candidate_review_result_already_exists")
    if real_result_exists:
        issues.append("real_review_result_already_exists")
    if target_queue_exists:
        issues.append("packet_078_already_exists")
    if p173_guard_exists:
        issues.append("p173_guard_already_exists")
    status = "ready_to_paste_opencode_candidate_prompt" if issues == [] else "blocked_or_not_ready"
    next_action = (
        "paste_prompt_into_opencode_then_run_sequence_status"
        if status == "ready_to_paste_opencode_candidate_prompt"
        else "resolve_paste_pack_issues_before_opencode_candidate_handoff"
    )
    post_paste_validation_commands = [
        "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-sequence-status",
        (
            "python3 scripts/ghostclaw_a2a_agent_orchestrator.py "
            "--packet078-candidate-poll --packet078-candidate-poll-attempts 1 --packet078-candidate-poll-interval 0"
        ),
        "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-candidate-watch",
        "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-opencode-review-candidate-preflight",
        "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-candidate-copy-gate",
    ]
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_candidate_paste_pack.v1",
        "packet_id": "A2A2A-P195-PACKET078-OPENCODE-CANDIDATE-PASTE-PACK-20260704",
        "status": status,
        "mode": "local_safe_opencode_candidate_paste_pack_no_result_or_queue_write",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "selected_packet": "packet_078",
        "next_action": next_action,
        "call_packet_path": rel(root, call_packet_path) if call_packet_path else call_packet_input,
        "call_packet_status": call_packet.get("status") if isinstance(call_packet, dict) else None,
        "prompt_output_path": prompt_output,
        "prompt_source": prompt_source,
        "stale_call_packet_prompt_replaced": stale_call_packet_prompt_replaced,
        "prompt_sha256": prompt_sha256,
        "opencode_prompt": prompt,
        "clipboard_command_preview": f"pbcopy < {shlex.quote(prompt_output)}",
        "candidate_review_result_path": candidate_input,
        "candidate_review_result_exists": candidate_exists,
        "real_review_result_path": result_input,
        "real_review_result_path_exists": real_result_exists,
        "target_queue_path": target_queue_path,
        "target_queue_path_exists": target_queue_exists,
        "p173_guard_path": sequence.get("p173_guard_path"),
        "p173_guard_exists": p173_guard_exists,
        "p193_guard_path": sequence.get("p193_guard_path"),
        "p193_guard_exists": p193_guard_exists,
        "sequence_status": sequence.get("status"),
        "sequence_next_action": sequence.get("next_action"),
        "post_paste_validation_commands": post_paste_validation_commands,
        "issues": issues,
        "must_not": [
            "do_not_write_candidate_review_result_from_codex",
            "do_not_write_real_review_result_path",
            "do_not_write_packet_078",
            "do_not_execute_p167_guard",
            "do_not_create_or_run_p173_guard",
            "do_not_write_worker_envelope",
            "do_not_call_provider",
            "do_not_send_live_message",
            "do_not_commit_push_deploy",
            "do_not_mutate_cloudflare_or_r2",
        ],
        "external_actions_performed": {
            "prompt_file_write": False,
            "candidate_review_result_write": False,
            "real_review_result_write": False,
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            "Paste the prompt into OpenCode; OpenCode may write only the candidate result path, then rerun P194/P191/P190/P185/P193."
            if status == "ready_to_paste_opencode_candidate_prompt"
            else "Resolve paste-pack issues before asking OpenCode to write a candidate result."
        ),
    }


def build_packet078_opencode_candidate_paste_pack_receipt(pack: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_candidate_paste_pack_receipt.v1",
        "packet_id": pack["packet_id"],
        "status": "recorded_packet078_opencode_candidate_paste_pack",
        "paste_pack_status": pack["status"],
        "created_at": now_iso(),
        "repo": pack["repo"],
        "evidence_path": evidence_path,
        "prompt_output_path": pack["prompt_output_path"],
        "prompt_sha256": pack["prompt_sha256"],
        "candidate_review_result_exists": pack["candidate_review_result_exists"],
        "real_review_result_path_exists": pack["real_review_result_path_exists"],
        "target_queue_path_exists": pack["target_queue_path_exists"],
        "p173_guard_exists": pack["p173_guard_exists"],
        "p193_guard_exists": pack["p193_guard_exists"],
        "issues": pack["issues"],
        "external_actions_performed": pack["external_actions_performed"],
        "blocked_actions_preserved": pack["blocked_actions_preserved"],
        "completion_claim": "P195 OpenCode candidate paste pack recorded; no candidate result, real review result, packet_078, worker envelope, provider call, live send, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": pack["next_safe_action"],
    }


def build_packet078_opencode_candidate_stall_guard(
    root: Path,
    plan: dict[str, Any],
    paste_pack_input: str,
    prompt_input: str,
    candidate_input: str,
    result_input: str,
    command_output: str,
) -> dict[str, Any]:
    """Diagnose an external OpenCode candidate wait without writing candidate artifacts."""
    paste_pack_path, paste_pack = load_optional_json(root, paste_pack_input)
    prompt_path = resolve_under_root(root, prompt_input)
    candidate_path = resolve_under_root(root, candidate_input)
    real_result_path = resolve_under_root(root, result_input)
    target_queue_input = "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json"
    target_queue_path = resolve_under_root(root, target_queue_input)
    p173_guard_path = resolve_under_root(root, DEFAULT_PACKET078_WORKER_ENVELOPE_COMMAND_OUTPUT)
    p193_guard_path = resolve_under_root(root, command_output)
    prompt_exists = prompt_path.is_file()
    prompt_sha256 = sha256_file(prompt_path) if prompt_exists else None
    prompt_mtime = datetime.fromtimestamp(prompt_path.stat().st_mtime, timezone.utc).isoformat() if prompt_exists else None
    candidate_exists = candidate_path.is_file()
    real_result_exists = real_result_path.exists()
    target_exists = target_queue_path.exists()
    p173_exists = p173_guard_path.exists()
    p193_exists = p193_guard_path.exists()
    issues: list[str] = []
    if not isinstance(paste_pack, dict):
        issues.append("p195_paste_pack_missing")
    elif paste_pack.get("status") != "ready_to_paste_opencode_candidate_prompt":
        issues.append(f"p195_paste_pack_not_ready:{paste_pack.get('status')}")
    if not prompt_exists:
        issues.append("p195_prompt_file_missing")
    if real_result_exists:
        issues.append("real_review_result_already_exists")
    if target_exists:
        issues.append("packet_078_already_exists")
    if p173_exists:
        issues.append("p173_guard_already_exists")
    if p193_exists:
        issues.append("p193_guard_already_exists")

    if candidate_exists and issues == []:
        status = "candidate_arrived_rerun_p194"
        next_action = "rerun_sequence_status_and_candidate_preflight"
        next_safe_action = "Candidate exists; rerun P194/P191/P190/P185/P193 before any exact gate."
    elif not candidate_exists and issues == []:
        status = "waiting_for_external_opencode_candidate"
        next_action = "re_paste_p195_prompt_or_run_external_opencode_review"
        next_safe_action = "Re-paste the P195 prompt into OpenCode or run the external OpenCode review, then rerun P194/P191/P190/P185/P193."
    else:
        status = "blocked_or_not_ready"
        next_action = "resolve_stall_guard_issues_before_retry"
        next_safe_action = "Resolve P196 stall guard issues before asking OpenCode to write a candidate result."

    retry_commands = [
        (
            "python3 scripts/ghostclaw_a2a_agent_orchestrator.py "
            "--packet078-opencode-candidate-paste-pack --write"
        ),
        f"pbcopy < {shlex.quote(prompt_input)}",
    ]
    post_candidate_commands = [
        "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-sequence-status",
        (
            "python3 scripts/ghostclaw_a2a_agent_orchestrator.py "
            "--packet078-candidate-poll --packet078-candidate-poll-attempts 1 --packet078-candidate-poll-interval 0"
        ),
        "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-candidate-watch",
        "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-opencode-review-candidate-preflight",
        "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-candidate-copy-gate",
    ]
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_candidate_stall_guard.v1",
        "packet_id": "A2A2A-P196-PACKET078-OPENCODE-CANDIDATE-STALL-GUARD-20260704",
        "status": status,
        "mode": "local_safe_opencode_candidate_stall_guard_no_result_or_queue_write",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "selected_packet": "packet_078",
        "next_action": next_action,
        "paste_pack_path": rel(root, paste_pack_path) if paste_pack_path else paste_pack_input,
        "paste_pack_status": paste_pack.get("status") if isinstance(paste_pack, dict) else None,
        "prompt_path": prompt_input,
        "prompt_file_exists": prompt_exists,
        "prompt_sha256": prompt_sha256,
        "prompt_mtime": prompt_mtime,
        "candidate_review_result_path": candidate_input,
        "candidate_review_result_exists": candidate_exists,
        "real_review_result_path": result_input,
        "real_review_result_path_exists": real_result_exists,
        "target_queue_path": target_queue_input,
        "target_queue_path_exists": target_exists,
        "p173_guard_path": DEFAULT_PACKET078_WORKER_ENVELOPE_COMMAND_OUTPUT,
        "p173_guard_exists": p173_exists,
        "p193_guard_path": command_output,
        "p193_guard_exists": p193_exists,
        "retry_commands": retry_commands,
        "post_candidate_commands": post_candidate_commands,
        "operator_checklist": [
            "paste_p195_prompt_into_opencode",
            "verify_opencode_writes_only_candidate_path",
            "rerun_p194_p191_p190_p185_p193_after_candidate_arrives",
            "use_exact_p193_gate_only_after_candidate_preflight_passes",
        ],
        "issues": issues,
        "must_not": [
            "do_not_write_candidate_review_result_from_codex",
            "do_not_write_real_review_result_path",
            "do_not_write_packet_078",
            "do_not_execute_p167_guard",
            "do_not_create_or_run_p173_guard",
            "do_not_write_worker_envelope",
            "do_not_call_provider",
            "do_not_send_live_message",
            "do_not_commit_push_deploy",
            "do_not_mutate_cloudflare_or_r2",
        ],
        "external_actions_performed": {
            "candidate_review_result_write": False,
            "real_review_result_write": False,
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": next_safe_action,
    }


def build_packet078_opencode_candidate_stall_guard_receipt(guard: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_candidate_stall_guard_receipt.v1",
        "packet_id": guard["packet_id"],
        "status": "recorded_packet078_opencode_candidate_stall_guard",
        "stall_guard_status": guard["status"],
        "created_at": now_iso(),
        "repo": guard["repo"],
        "evidence_path": evidence_path,
        "prompt_file_exists": guard["prompt_file_exists"],
        "candidate_review_result_exists": guard["candidate_review_result_exists"],
        "real_review_result_path_exists": guard["real_review_result_path_exists"],
        "target_queue_path_exists": guard["target_queue_path_exists"],
        "p173_guard_exists": guard["p173_guard_exists"],
        "p193_guard_exists": guard["p193_guard_exists"],
        "issues": guard["issues"],
        "external_actions_performed": guard["external_actions_performed"],
        "blocked_actions_preserved": guard["blocked_actions_preserved"],
        "completion_claim": "P196 OpenCode candidate stall guard recorded; no candidate result, real review result, packet_078, worker envelope, provider call, live send, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": guard["next_safe_action"],
    }


def build_packet078_opencode_candidate_template_payload(candidate_input: str, result_input: str) -> dict[str, Any]:
    return {
        "schema": PACKET078_OPENCODE_REVIEW_CANDIDATE_SCHEMA,
        "packet_id": PACKET078_OPENCODE_REVIEW_CANDIDATE_PACKET_ID,
        "status": "REVIEW_PENDING_FILL_BY_OPENCODE",
        "review_worker": "OpenCode_Reviewer",
        "mutation_allowed": False,
        "selected_packet": "packet_078",
        "candidate_review_result_path": candidate_input,
        "real_review_result_path_must_not_write": result_input,
        "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
        "target_queue_path_exists": False,
        "blocking_issues": [],
        "review_notes": [
            "Replace status with REVIEW_PASS_READY_FOR_EXACT_P167 only if the read-only review passes.",
            "Use REVIEW_WARN_BLOCKING_ISSUES or REVIEW_FAIL_BLOCKING_ISSUES if any check fails.",
            "Do not write the real P175 result path or packet_078 from OpenCode candidate review.",
        ],
        "external_actions_performed": {
            "candidate_review_result_write": False,
            "real_review_result_write": False,
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
    }


def build_packet078_opencode_candidate_template_pack(
    root: Path,
    plan: dict[str, Any],
    candidate_input: str,
    result_input: str,
    template_output: str,
) -> dict[str, Any]:
    """Write a fillable candidate result template separate from the real candidate path."""
    template_path = resolve_under_root(root, template_output)
    candidate_path = resolve_under_root(root, candidate_input)
    real_result_path = resolve_under_root(root, result_input)
    target_queue_input = "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json"
    target_queue_path = resolve_under_root(root, target_queue_input)
    p173_guard_path = resolve_under_root(root, DEFAULT_PACKET078_WORKER_ENVELOPE_COMMAND_OUTPUT)
    p193_guard_path = resolve_under_root(root, DEFAULT_PACKET078_CANDIDATE_COPY_COMMAND_OUTPUT)
    template_payload = build_packet078_opencode_candidate_template_payload(candidate_input, result_input)
    template_sha256 = hashlib.sha256(
        json.dumps(template_payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()
    issues: list[str] = []
    if rel(root, template_path) == candidate_input:
        issues.append("template_output_must_not_equal_candidate_path")
    if candidate_path.exists():
        issues.append("candidate_review_result_already_exists")
    if real_result_path.exists():
        issues.append("real_review_result_already_exists")
    if target_queue_path.exists():
        issues.append("packet_078_already_exists")
    if p173_guard_path.exists():
        issues.append("p173_guard_already_exists")
    status = "ready_for_opencode_candidate_fill" if issues == [] else "blocked_or_not_ready"
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_candidate_template_pack.v1",
        "packet_id": "A2A2A-P197-PACKET078-OPENCODE-CANDIDATE-TEMPLATE-PACK-20260704",
        "status": status,
        "mode": "local_safe_opencode_candidate_template_pack_no_candidate_or_queue_write",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "selected_packet": "packet_078",
        "template_path": rel(root, template_path),
        "template_sha256": template_sha256,
        "template_payload": template_payload,
        "candidate_review_result_path": candidate_input,
        "candidate_review_result_exists": candidate_path.exists(),
        "real_review_result_path": result_input,
        "real_review_result_path_exists": real_result_path.exists(),
        "target_queue_path": target_queue_input,
        "target_queue_path_exists": target_queue_path.exists(),
        "p173_guard_path": DEFAULT_PACKET078_WORKER_ENVELOPE_COMMAND_OUTPUT,
        "p173_guard_exists": p173_guard_path.exists(),
        "p193_guard_path": DEFAULT_PACKET078_CANDIDATE_COPY_COMMAND_OUTPUT,
        "p193_guard_exists": p193_guard_path.exists(),
        "post_fill_validation_commands": [
            "--packet078-opencode-review-candidate-preflight",
            "--packet078-sequence-status",
            "--packet078-candidate-poll --packet078-candidate-poll-attempts 1 --packet078-candidate-poll-interval 0",
            "--packet078-candidate-copy-gate",
        ],
        "copy_template_to_clipboard_command": f"pbcopy < {shlex.quote(template_output)}",
        "issues": issues,
        "must_not": [
            "do_not_write_candidate_review_result_from_codex",
            "do_not_write_real_review_result_path",
            "do_not_write_packet_078",
            "do_not_execute_p167_guard",
            "do_not_create_or_run_p173_guard",
            "do_not_write_worker_envelope",
            "do_not_call_provider",
            "do_not_send_live_message",
            "do_not_commit_push_deploy",
            "do_not_mutate_cloudflare_or_r2",
        ],
        "external_actions_performed": {
            "template_file_write": False,
            "candidate_review_result_write": False,
            "real_review_result_write": False,
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            "OpenCode may use this template to write only the candidate result path, then Codex reruns P185/P194/P193."
            if status == "ready_for_opencode_candidate_fill"
            else "Resolve candidate template pack issues before using this template."
        ),
    }


def build_packet078_opencode_candidate_template_pack_receipt(pack: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_candidate_template_pack_receipt.v1",
        "packet_id": pack["packet_id"],
        "status": "recorded_packet078_opencode_candidate_template_pack",
        "template_pack_status": pack["status"],
        "created_at": now_iso(),
        "repo": pack["repo"],
        "evidence_path": evidence_path,
        "template_path": pack["template_path"],
        "template_sha256": pack["template_sha256"],
        "candidate_review_result_exists": pack["candidate_review_result_exists"],
        "real_review_result_path_exists": pack["real_review_result_path_exists"],
        "target_queue_path_exists": pack["target_queue_path_exists"],
        "p173_guard_exists": pack["p173_guard_exists"],
        "p193_guard_exists": pack["p193_guard_exists"],
        "issues": pack["issues"],
        "external_actions_performed": pack["external_actions_performed"],
        "blocked_actions_preserved": pack["blocked_actions_preserved"],
        "completion_claim": "P197 OpenCode candidate template pack recorded; no candidate result, real review result, packet_078, worker envelope, provider call, live send, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": pack["next_safe_action"],
    }


def build_packet078_opencode_handoff_readiness(
    root: Path,
    plan: dict[str, Any],
    paste_pack_input: str,
    prompt_input: str,
    template_pack_input: str,
    false_pass_guard_input: str,
    canonicalization_input: str,
    candidate_input: str,
    result_input: str,
) -> dict[str, Any]:
    """Surface the current safe OpenCode handoff state without writing review or queue artifacts."""
    paste_pack_path, paste_pack = load_optional_json(root, paste_pack_input)
    template_pack_path, template_pack = load_optional_json(root, template_pack_input)
    false_pass_guard_path, false_pass_guard = load_optional_json(root, false_pass_guard_input)
    canonicalization_path, canonicalization = load_optional_json(root, canonicalization_input)
    prompt_path = resolve_under_root(root, prompt_input)
    candidate_path = resolve_under_root(root, candidate_input)
    real_result_path = resolve_under_root(root, result_input)
    target_queue_input = "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json"
    target_queue_path = resolve_under_root(root, target_queue_input)
    p173_guard_path = resolve_under_root(root, DEFAULT_PACKET078_WORKER_ENVELOPE_COMMAND_OUTPUT)
    p193_guard_path = resolve_under_root(root, DEFAULT_PACKET078_CANDIDATE_COPY_COMMAND_OUTPUT)
    prompt_text = prompt_path.read_text(encoding="utf-8") if prompt_path.is_file() else ""
    p197_token = "A2A2A-P197-PACKET078-OPENCODE-CANDIDATE-RESULT-TEMPLATE-20260704.json"
    p177_token = "A2A2A-P177-PACKET078-OPENCODE-REVIEW-RESULT-TEMPLATE-20260704.json"
    prompt_contains_p197 = p197_token in prompt_text
    prompt_contains_p177 = p177_token in prompt_text
    candidate_exists = candidate_path.exists()
    real_result_exists = real_result_path.exists()
    target_queue_exists = target_queue_path.exists()
    p173_guard_exists = p173_guard_path.exists()
    p193_guard_exists = p193_guard_path.exists()
    issues: list[str] = []
    if not isinstance(paste_pack, dict):
        issues.append("p195_paste_pack_missing")
    elif paste_pack.get("status") != "ready_to_paste_opencode_candidate_prompt":
        issues.append(f"p195_paste_pack_not_ready:{paste_pack.get('status') or 'missing'}")
    if not prompt_path.is_file():
        issues.append("p195_prompt_file_missing")
    if not prompt_contains_p197:
        issues.append("p195_prompt_missing_p197_template")
    if prompt_contains_p177:
        issues.append("p195_prompt_contains_stale_p177_template")
    if not isinstance(template_pack, dict):
        issues.append("p197_template_pack_missing")
    elif template_pack.get("status") != "ready_for_opencode_candidate_fill":
        issues.append(f"p197_template_pack_not_ready:{template_pack.get('status') or 'missing'}")
    if not isinstance(false_pass_guard, dict):
        issues.append("p198_false_pass_guard_missing")
    elif false_pass_guard.get("status") != "false_pass_guard_verified":
        issues.append(f"p198_false_pass_guard_not_verified:{false_pass_guard.get('status') or 'missing'}")
    if not isinstance(canonicalization, dict):
        issues.append("p199_prompt_canonicalization_missing")
    elif canonicalization.get("status") != "p195_prompt_canonicalized_to_p197_template":
        issues.append(f"p199_prompt_canonicalization_not_ready:{canonicalization.get('status') or 'missing'}")
    if real_result_exists:
        issues.append("real_review_result_already_exists")
    if target_queue_exists:
        issues.append("packet_078_already_exists")
    if p173_guard_exists:
        issues.append("p173_guard_already_exists")
    if p193_guard_exists:
        issues.append("p193_guard_already_exists")
    if candidate_exists and not issues:
        status = "candidate_present_run_p185"
        next_action = "run_p185_candidate_preflight"
    elif not issues:
        status = "ready_for_manual_opencode_paste"
        next_action = "paste_p195_prompt_into_opencode"
    else:
        status = "blocked_or_not_ready"
        next_action = "resolve_handoff_readiness_issues"
    post_candidate_commands = [
        "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-sequence-status",
        "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-candidate-poll --packet078-candidate-poll-attempts 1 --packet078-candidate-poll-interval 0",
        "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-candidate-watch",
        "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-opencode-review-candidate-preflight",
        "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-candidate-copy-gate",
    ]
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_handoff_readiness.v1",
        "packet_id": "A2A2A-P200-PACKET078-OPENCODE-HANDOFF-READINESS-20260704",
        "status": status,
        "mode": "local_safe_opencode_handoff_readiness_no_result_or_queue_write",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "selected_packet": "packet_078",
        "next_action": next_action,
        "paste_pack_path": rel(root, paste_pack_path) if paste_pack_path else paste_pack_input,
        "paste_pack_status": paste_pack.get("status") if isinstance(paste_pack, dict) else None,
        "prompt_path": rel(root, prompt_path),
        "prompt_sha256": sha256_file(prompt_path) if prompt_path.is_file() else None,
        "prompt_template_reference": "P197" if prompt_contains_p197 and not prompt_contains_p177 else "unknown_or_stale",
        "prompt_contains_p197_template": prompt_contains_p197,
        "prompt_contains_stale_p177_template": prompt_contains_p177,
        "template_pack_path": rel(root, template_pack_path) if template_pack_path else template_pack_input,
        "template_pack_status": template_pack.get("status") if isinstance(template_pack, dict) else None,
        "false_pass_guard_path": rel(root, false_pass_guard_path) if false_pass_guard_path else false_pass_guard_input,
        "false_pass_guard_status": false_pass_guard.get("status") if isinstance(false_pass_guard, dict) else None,
        "canonicalization_path": rel(root, canonicalization_path) if canonicalization_path else canonicalization_input,
        "canonicalization_status": canonicalization.get("status") if isinstance(canonicalization, dict) else None,
        "canonicalization_prompt_source": (
            canonicalization.get("prompt_source_after_regeneration")
            if isinstance(canonicalization, dict)
            else None
        ),
        "stale_call_packet_prompt_replaced": (
            canonicalization.get("stale_call_packet_prompt_replaced")
            if isinstance(canonicalization, dict)
            else None
        ),
        "candidate_review_result_path": candidate_input,
        "candidate_review_result_exists": candidate_exists,
        "real_review_result_path": result_input,
        "real_review_result_path_exists": real_result_exists,
        "target_queue_path": target_queue_input,
        "target_queue_path_exists": target_queue_exists,
        "p173_guard_path": DEFAULT_PACKET078_WORKER_ENVELOPE_COMMAND_OUTPUT,
        "p173_guard_exists": p173_guard_exists,
        "p193_guard_path": DEFAULT_PACKET078_CANDIDATE_COPY_COMMAND_OUTPUT,
        "p193_guard_exists": p193_guard_exists,
        "clipboard_command": f"pbcopy < {shlex.quote(prompt_input)}",
        "post_candidate_validation_commands": post_candidate_commands,
        "issues": issues,
        "must_not": [
            "do_not_write_candidate_review_result_from_codex",
            "do_not_write_real_review_result_path",
            "do_not_write_packet_078",
            "do_not_execute_p167_guard",
            "do_not_create_or_run_p173_guard",
            "do_not_write_worker_envelope",
            "do_not_call_provider",
            "do_not_send_live_message",
            "do_not_commit_push_deploy",
            "do_not_mutate_cloudflare_or_r2",
        ],
        "external_actions_performed": {
            "candidate_review_result_write": False,
            "real_review_result_write": False,
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            "Paste the regenerated P195 prompt into OpenCode, then rerun P194/P191/P190/P185/P193 after candidate appears."
            if status == "ready_for_manual_opencode_paste"
            else "Candidate is present; run P185/P194/P193 before any exact copy gate."
            if status == "candidate_present_run_p185"
            else "Resolve P200 handoff readiness issues before asking OpenCode to write the candidate."
        ),
    }


def build_packet078_opencode_handoff_readiness_receipt(readiness: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_handoff_readiness_receipt.v1",
        "packet_id": readiness["packet_id"],
        "status": "recorded_packet078_opencode_handoff_readiness",
        "readiness_status": readiness["status"],
        "created_at": now_iso(),
        "repo": readiness["repo"],
        "evidence_path": evidence_path,
        "prompt_path": readiness["prompt_path"],
        "prompt_template_reference": readiness["prompt_template_reference"],
        "candidate_review_result_exists": readiness["candidate_review_result_exists"],
        "real_review_result_path_exists": readiness["real_review_result_path_exists"],
        "target_queue_path_exists": readiness["target_queue_path_exists"],
        "issues": readiness["issues"],
        "external_actions_performed": readiness["external_actions_performed"],
        "blocked_actions_preserved": readiness["blocked_actions_preserved"],
        "completion_claim": "P200 OpenCode handoff readiness recorded; no candidate result, real review result, packet_078, worker envelope, provider call, live send, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": readiness["next_safe_action"],
    }


def build_packet078_opencode_post_handoff_router(
    root: Path,
    plan: dict[str, Any],
    readiness_input: str,
    current_next_gate_path: str | None,
    candidate_input: str,
    result_input: str,
    candidate_call_status_input: str | None,
    command_output: str,
) -> dict[str, Any]:
    """Route packet_078 after the OpenCode handoff without writing review, command, or queue files."""
    readiness_path, readiness = load_optional_json(root, readiness_input)
    preflight = build_packet078_opencode_review_candidate_preflight(
        root,
        plan,
        current_next_gate_path,
        candidate_input,
        result_input,
    )
    copy_gate = build_packet078_candidate_copy_gate(
        root,
        plan,
        current_next_gate_path,
        candidate_input,
        result_input,
        command_output,
    )
    sequence = build_packet078_sequence_status(
        root,
        plan,
        current_next_gate_path,
        candidate_input,
        result_input,
        candidate_call_status_input,
        DEFAULT_PACKET078_P167_DEFERRED_APPROVAL_OUTPUT,
        command_output,
    )
    issues: list[str] = []
    if not isinstance(readiness, dict):
        issues.append("p200_handoff_readiness_missing")
    elif readiness.get("status") not in {"ready_for_manual_opencode_paste", "candidate_present_run_p185"}:
        issues.append(f"p200_handoff_readiness_not_ready:{readiness.get('status') or 'missing'}")
    if sequence.get("target_queue_path_exists"):
        issues.append("packet_078_already_exists")
    if sequence.get("real_review_result_path_exists"):
        issues.append("real_review_result_already_exists")
    if sequence.get("p173_guard_exists"):
        issues.append("p173_guard_already_exists")
    if sequence.get("p193_guard_exists"):
        issues.append("p193_guard_already_exists")
    preflight_status = str(preflight.get("status") or "")
    copy_gate_status = str(copy_gate.get("status") or "")
    if issues:
        status = "blocked_or_not_ready"
        next_action = "resolve_post_handoff_router_issues"
    elif copy_gate_status == "ready_for_exact_candidate_copy_gate":
        status = "ready_for_exact_p193_candidate_copy_gate"
        next_action = "prepare_p193_candidate_copy_gate_after_exact_approval"
    elif preflight_status == "waiting_for_candidate_review_result":
        status = "waiting_for_opencode_candidate"
        next_action = "paste_p195_prompt_into_opencode"
    elif preflight_status == "blocked_or_not_ready":
        status = "candidate_present_but_preflight_blocked"
        next_action = "resolve_candidate_preflight_issues"
    else:
        status = "blocked_or_not_ready"
        next_action = "resolve_post_handoff_router_issues"
        issues.append(f"unexpected_candidate_preflight_status:{preflight_status or 'missing'}")
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_post_handoff_router.v1",
        "packet_id": "A2A2A-P201-PACKET078-OPENCODE-POST-HANDOFF-ROUTER-20260704",
        "status": status,
        "mode": "local_safe_post_handoff_router_no_result_command_or_queue_write",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "selected_packet": "packet_078",
        "next_action": next_action,
        "handoff_readiness_path": rel(root, readiness_path) if readiness_path else readiness_input,
        "handoff_readiness_status": readiness.get("status") if isinstance(readiness, dict) else None,
        "candidate_preflight_status": preflight_status,
        "candidate_copy_gate_status": copy_gate_status,
        "sequence_status": sequence.get("status"),
        "sequence_next_action": sequence.get("next_action"),
        "candidate_review_result_path": candidate_input,
        "candidate_review_result_exists": bool(preflight.get("candidate_path_exists")),
        "candidate_ready_for_real_result_path": bool(preflight.get("candidate_ready_for_real_result_path")),
        "candidate_sha256": preflight.get("candidate_sha256") or copy_gate.get("candidate_sha256"),
        "real_review_result_path": result_input,
        "real_review_result_path_exists": bool(preflight.get("real_review_result_path_exists")),
        "target_queue_path": sequence.get("target_queue_path"),
        "target_queue_path_exists": bool(sequence.get("target_queue_path_exists")),
        "p173_guard_path": sequence.get("p173_guard_path"),
        "p173_guard_exists": bool(sequence.get("p173_guard_exists")),
        "p193_guard_path": DEFAULT_PACKET078_CANDIDATE_COPY_COMMAND_OUTPUT,
        "p193_guard_exists": bool(sequence.get("p193_guard_exists")),
        "candidate_copy_command_path": copy_gate.get("command_path"),
        "candidate_copy_command_after_exact_gate": copy_gate.get("command_after_exact_gate"),
        "post_copy_intake_command": copy_gate.get("post_copy_intake_command"),
        "post_candidate_validation_commands": [
            "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-sequence-status",
            "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-candidate-poll --packet078-candidate-poll-attempts 1 --packet078-candidate-poll-interval 0",
            "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-candidate-watch",
            "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-opencode-review-candidate-preflight",
            "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-candidate-copy-gate",
        ],
        "issues": issues,
        "candidate_preflight_issues": preflight.get("issues", []),
        "candidate_copy_gate_issues": copy_gate.get("issues", []),
        "must_not": [
            "do_not_write_candidate_review_result_from_codex",
            "do_not_write_real_review_result_path",
            "do_not_write_packet_078",
            "do_not_execute_p167_guard",
            "do_not_create_or_run_p173_or_p193_guard",
            "do_not_write_worker_envelope",
            "do_not_call_provider",
            "do_not_send_live_message",
            "do_not_commit_push_deploy",
            "do_not_mutate_cloudflare_or_r2",
        ],
        "external_actions_performed": {
            "candidate_review_result_write": False,
            "real_review_result_write": False,
            "queue_file_write": False,
            "queue_payload_execution": False,
            "guard_script_write": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            "Paste the P195 prompt into OpenCode, then rerun P201/P194/P191/P190/P185/P193 after candidate appears."
            if status == "waiting_for_opencode_candidate"
            else "Candidate is valid; prepare P193 copy gate and require exact approval before writing the real review-result path."
            if status == "ready_for_exact_p193_candidate_copy_gate"
            else "Resolve P201 router issues before advancing packet_078."
        ),
    }


def build_packet078_opencode_post_handoff_router_receipt(router: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_post_handoff_router_receipt.v1",
        "packet_id": router["packet_id"],
        "status": "recorded_packet078_opencode_post_handoff_router",
        "router_status": router["status"],
        "created_at": now_iso(),
        "repo": router["repo"],
        "evidence_path": evidence_path,
        "handoff_readiness_status": router["handoff_readiness_status"],
        "candidate_preflight_status": router["candidate_preflight_status"],
        "candidate_copy_gate_status": router["candidate_copy_gate_status"],
        "candidate_review_result_exists": router["candidate_review_result_exists"],
        "real_review_result_path_exists": router["real_review_result_path_exists"],
        "target_queue_path_exists": router["target_queue_path_exists"],
        "issues": router["issues"],
        "external_actions_performed": router["external_actions_performed"],
        "blocked_actions_preserved": router["blocked_actions_preserved"],
        "completion_claim": "P201 post-handoff router recorded; no candidate result, real review result, packet_078, guard script, worker envelope, provider call, live send, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": router["next_safe_action"],
    }


def build_packet078_opencode_review_result_template(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
    result_input: str,
) -> dict[str, Any]:
    """Create a fill-in template for OpenCode without writing the real result."""
    review = build_packet078_transition_opencode_review(root, plan, current_next_gate_path)
    target_path = str(review.get("target_queue_path") or "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json")
    target_exists = resolve_under_root(root, target_path).exists()
    template = {
        "schema": "ghostclaw.a2a2a.packet078_transition_opencode_review_result.v1",
        "packet_id": "A2A2A-P175-PACKET078-TRANSITION-OPENCODE-REVIEW-20260704",
        "status": "REVIEW_PENDING_FILL_BY_OPENCODE",
        "review_worker": "OpenCode_Reviewer",
        "mutation_allowed": False,
        "target_queue_path_exists": target_exists,
        "blocking_issues": [
            "replace_with_empty_array_only_after_real_read_only_review_passes",
        ],
        "external_actions_performed": {
            "queue_file_write": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "provider_call": False,
            "telegram_live_send": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "reviewed_paths": review.get("review_targets", []),
        "review_notes": [
            "Fill this template from a real OpenCode read-only review.",
            "Do not change status to REVIEW_PASS_READY_FOR_EXACT_P167 unless every checklist item passes.",
            "Do not write packet_078, run P167/P173, send live messages, call providers, commit, push, deploy, or mutate Cloudflare/R2.",
        ],
    }
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_review_result_template.v1",
        "packet_id": "A2A2A-P177-PACKET078-OPENCODE-REVIEW-RESULT-TEMPLATE-20260704",
        "status": "ready_for_opencode_review_result_template",
        "mode": "local_safe_template_only_no_review_pass",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "review_packet_status": review.get("status"),
        "selected_packet": "packet_078",
        "target_queue_path": target_path,
        "target_queue_path_exists": target_exists,
        "template_result_path": result_input,
        "writes_real_result_path": False,
        "template": template,
        "required_fields": [
            "schema",
            "packet_id",
            "status",
            "review_worker",
            "mutation_allowed",
            "target_queue_path_exists",
            "blocking_issues",
            "external_actions_performed",
        ],
        "allowed_review_statuses": [
            "REVIEW_PASS_READY_FOR_EXACT_P167",
            "REVIEW_WARN_BLOCKING_ISSUES",
            "REVIEW_FAIL_BLOCKING_ISSUES",
        ],
        "pass_requires": [
            "real_opencode_read_only_review_completed",
            "mutation_allowed_false",
            "blocking_issues_empty",
            "target_queue_path_exists_false",
            "all_external_actions_false",
            "p167_before_p173_sequence_confirmed",
            "active_focus_only_sirinx_co_and_agm_autoflow",
        ],
        "must_not": [
            "do_not_treat_template_as_review_pass",
            "do_not_write_packet_078",
            "do_not_execute_p167_guard",
            "do_not_run_p173_guard",
            "do_not_write_worker_envelope",
            "do_not_call_provider",
            "do_not_send_live_message",
            "do_not_commit_push_deploy",
            "do_not_mutate_cloudflare_or_r2",
        ],
        "external_actions_performed": {
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": "Give this template to OpenCode for a real read-only review result; P176 remains the intake gate.",
    }


def build_packet078_opencode_review_result_template_receipt(template: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_review_result_template_receipt.v1",
        "packet_id": template["packet_id"],
        "status": "recorded_packet078_opencode_review_result_template",
        "template_status": template["status"],
        "created_at": now_iso(),
        "repo": template["repo"],
        "evidence_path": evidence_path,
        "template_result_path": template["template_result_path"],
        "writes_real_result_path": template["writes_real_result_path"],
        "target_queue_path": template["target_queue_path"],
        "target_queue_path_exists": template["target_queue_path_exists"],
        "external_actions_performed": template["external_actions_performed"],
        "blocked_actions_preserved": template["blocked_actions_preserved"],
        "completion_claim": "P177 OpenCode review-result template recorded; no real review result, queue write, gate execution, worker envelope write, provider call, live send, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": template["next_safe_action"],
    }


def build_packet078_opencode_review_handoff_capsule(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
    result_input: str,
) -> dict[str, Any]:
    """Package the read-only OpenCode handoff without creating a review result."""
    template = build_packet078_opencode_review_result_template(root, plan, current_next_gate_path, result_input)
    target_path = template["target_queue_path"]
    target_exists = template["target_queue_path_exists"]
    post_review_intake_command = (
        "python3 scripts/ghostclaw_a2a_agent_orchestrator.py "
        "--packet078-opencode-review-result-intake "
        f"--packet078-opencode-review-result {shlex.quote(result_input)} "
        "--write "
        "--output .ghostclaw_runtime/a2a2a/status/A2A2A-P176-PACKET078-OPENCODE-REVIEW-RESULT-INTAKE-20260704.json "
        "--receipt .ghostclaw_runtime/a2a2a/receipts/A2A2A-P176-PACKET078-OPENCODE-REVIEW-RESULT-INTAKE-20260704.json"
    )
    prompt = "\n".join(
        [
            "OpenCode read-only review task for packet_078 transition.",
            "Review the P167 -> P172 -> P173 -> P174 -> P175 chain and fill only the real review result path if evidence supports it.",
            f"Template path: {DEFAULT_PACKET078_OPENCODE_REVIEW_RESULT_TEMPLATE_OUTPUT}",
            f"Real result path: {result_input}",
            "Set status to REVIEW_PASS_READY_FOR_EXACT_P167 only after a real read-only review passes.",
            "Keep mutation_allowed=false, blocking_issues=[], target_queue_path_exists=false, and all external action flags false for a pass.",
            "If any check fails, use REVIEW_WARN_BLOCKING_ISSUES or REVIEW_FAIL_BLOCKING_ISSUES and include blocking_issues.",
            "Do not write packet_078, execute P167/P173, write worker envelopes, call providers, send live messages, commit, push, deploy, or mutate Cloudflare/R2.",
        ]
    )
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_review_handoff_capsule.v1",
        "packet_id": "A2A2A-P178-PACKET078-OPENCODE-REVIEW-HANDOFF-CAPSULE-20260704",
        "status": "ready_for_opencode_review_handoff_capsule",
        "mode": "local_safe_opencode_handoff_no_review_pass",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "review_worker": "OpenCode_Reviewer",
        "mutation_allowed": False,
        "selected_packet": "packet_078",
        "target_queue_path": target_path,
        "target_queue_path_exists": target_exists,
        "template_path": DEFAULT_PACKET078_OPENCODE_REVIEW_RESULT_TEMPLATE_OUTPUT,
        "result_path_to_write_by_reviewer": result_input,
        "writes_real_result_path": False,
        "prompt": prompt,
        "review_checklist": [
            "p167_gate_ready_before_packet078",
            "p172_simulation_only_no_packet_write",
            "p173_blocked_until_packet078_exists",
            "p174_orders_p167_before_p173",
            "p175_review_packet_mutation_allowed_false",
            "active_focus_only_sirinx_co_and_agm_autoflow",
            "template_is_not_review_pass",
            "no_external_actions_performed",
        ],
        "handoff_targets": [
            ".ghostclaw_runtime/a2a2a/reviews/A2A2A-P175-PACKET078-TRANSITION-OPENCODE-REVIEW-20260704.json",
            DEFAULT_PACKET078_OPENCODE_REVIEW_RESULT_TEMPLATE_OUTPUT,
            "reports/mission/A2A2A_P175_PACKET078_TRANSITION_OPENCODE_REVIEW_20260704.md",
            "reports/mission/A2A2A_P176_PACKET078_OPENCODE_REVIEW_RESULT_INTAKE_20260704.md",
            "reports/mission/A2A2A_P177_PACKET078_OPENCODE_REVIEW_RESULT_TEMPLATE_20260704.md",
        ],
        "post_review_intake_command": post_review_intake_command,
        "must_not": [
            "do_not_write_packet_078",
            "do_not_execute_p167_guard",
            "do_not_run_p173_guard",
            "do_not_write_worker_envelope",
            "do_not_call_provider",
            "do_not_send_live_message",
            "do_not_commit_push_deploy",
            "do_not_mutate_cloudflare_or_r2",
            "do_not_treat_handoff_capsule_as_review_result",
        ],
        "external_actions_performed": {
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": "OpenCode can use this capsule to perform a real read-only review, then run P176 intake on the result.",
    }


def build_packet078_opencode_review_handoff_capsule_receipt(capsule: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_review_handoff_capsule_receipt.v1",
        "packet_id": capsule["packet_id"],
        "status": "recorded_packet078_opencode_review_handoff_capsule",
        "capsule_status": capsule["status"],
        "created_at": now_iso(),
        "repo": capsule["repo"],
        "evidence_path": evidence_path,
        "result_path_to_write_by_reviewer": capsule["result_path_to_write_by_reviewer"],
        "writes_real_result_path": capsule["writes_real_result_path"],
        "target_queue_path": capsule["target_queue_path"],
        "target_queue_path_exists": capsule["target_queue_path_exists"],
        "external_actions_performed": capsule["external_actions_performed"],
        "blocked_actions_preserved": capsule["blocked_actions_preserved"],
        "completion_claim": "P178 OpenCode handoff capsule recorded; no real review result, queue write, gate execution, worker envelope write, provider call, live send, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": capsule["next_safe_action"],
    }


def build_packet078_opencode_review_status_surface(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
    result_input: str,
) -> dict[str, Any]:
    """Surface the packet_078 review chain state without treating handoff artifacts as a pass."""
    intake = build_packet078_opencode_review_result_intake(root, plan, current_next_gate_path, result_input)
    template = build_packet078_opencode_review_result_template(root, plan, current_next_gate_path, result_input)
    handoff = build_packet078_opencode_review_handoff_capsule(root, plan, current_next_gate_path, result_input)
    result_path = resolve_under_root(root, result_input)
    real_result_exists = result_path.exists()
    exact_ready = bool(intake.get("exact_p167_allowed_after_review"))
    status = (
        "ready_for_exact_p167_operator_decision"
        if exact_ready
        else "waiting_for_opencode_review_result"
        if intake.get("status") == "waiting_for_opencode_review_result"
        else "blocked_or_not_ready"
    )
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_review_status_surface.v1",
        "packet_id": "A2A2A-P179-PACKET078-OPENCODE-REVIEW-STATUS-SURFACE-20260704",
        "status": status,
        "mode": "local_safe_status_surface_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "selected_packet": "packet_078",
        "target_queue_path": intake["target_queue_path"],
        "target_queue_path_exists": intake["target_queue_path_exists"],
        "review_packet_status": intake.get("review_packet_status"),
        "intake_status": intake["status"],
        "template_status": template["status"],
        "handoff_status": handoff["status"],
        "real_review_result_path": result_input,
        "real_review_result_exists": real_result_exists,
        "exact_p167_phrase": DEFAULT_QUEUE_DRAIN_REFRESH_GATE,
        "exact_p167_allowed_after_review": exact_ready,
        "command_after_review_pass": intake.get("command_after_review_pass"),
        "issues": intake.get("issues", []),
        "operator_surface": {
            "owner": "OpenCode_Reviewer",
            "current_state": "waiting_for_real_read_only_review_result" if not real_result_exists else intake["status"],
            "required_result_path": result_input,
            "template_path": template.get("template_path", DEFAULT_PACKET078_OPENCODE_REVIEW_RESULT_TEMPLATE_OUTPUT),
            "handoff_capsule_path": DEFAULT_PACKET078_OPENCODE_REVIEW_HANDOFF_OUTPUT,
            "next_safe_action": intake["next_safe_action"],
        },
        "must_not": [
            "do_not_write_packet_078",
            "do_not_execute_p167_guard",
            "do_not_run_p173_guard",
            "do_not_write_worker_envelope",
            "do_not_call_provider",
            "do_not_send_live_message",
            "do_not_commit_push_deploy",
            "do_not_mutate_cloudflare_or_r2",
            "do_not_treat_template_or_handoff_as_review_result",
        ],
        "external_actions_performed": {
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": intake["next_safe_action"],
    }


def build_packet078_opencode_review_status_surface_receipt(surface: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_opencode_review_status_surface_receipt.v1",
        "packet_id": surface["packet_id"],
        "status": "recorded_packet078_opencode_review_status_surface",
        "surface_status": surface["status"],
        "created_at": now_iso(),
        "repo": surface["repo"],
        "evidence_path": evidence_path,
        "real_review_result_path": surface["real_review_result_path"],
        "real_review_result_exists": surface["real_review_result_exists"],
        "exact_p167_allowed_after_review": surface["exact_p167_allowed_after_review"],
        "target_queue_path": surface["target_queue_path"],
        "target_queue_path_exists": surface["target_queue_path_exists"],
        "issues": surface["issues"],
        "external_actions_performed": surface["external_actions_performed"],
        "blocked_actions_preserved": surface["blocked_actions_preserved"],
        "completion_claim": "P179 OpenCode review status surface recorded; no real review result, queue write, gate execution, worker envelope write, provider call, live send, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": surface["next_safe_action"],
    }


def build_packet078_p167_deferred_approval_escrow(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
    result_input: str,
    approval_phrase: str | None,
) -> dict[str, Any]:
    """Record exact P167 approval as pending when P176 still blocks execution."""
    surface = build_packet078_opencode_review_status_surface(root, plan, current_next_gate_path, result_input)
    approval = approval_phrase or ""
    phrase_matches = approval == DEFAULT_QUEUE_DRAIN_REFRESH_GATE
    hold_reasons = list(surface.get("issues", []))
    if not phrase_matches:
        hold_reasons.append("approval_phrase_mismatch")
    exact_allowed = bool(surface.get("exact_p167_allowed_after_review")) and phrase_matches
    status = (
        "approval_ready_for_operator_execution"
        if exact_allowed
        else "approval_accepted_pending_opencode_review"
        if phrase_matches
        else "approval_rejected"
    )
    return {
        "schema": "ghostclaw.a2a2a.packet078_p167_deferred_approval_escrow.v1",
        "packet_id": "A2A2A-P180-PACKET078-P167-DEFERRED-APPROVAL-ESCROW-20260704",
        "status": status,
        "mode": "local_safe_deferred_approval_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "selected_packet": "packet_078",
        "approval_phrase": approval,
        "approval_phrase_matches_p167": phrase_matches,
        "approval_received": bool(approval),
        "exact_p167_allowed_after_review": bool(surface.get("exact_p167_allowed_after_review")),
        "exact_p167_consumed": False,
        "command_to_execute_now": surface.get("command_after_review_pass") if exact_allowed else None,
        "intake_status": surface.get("intake_status"),
        "review_status_surface": surface.get("status"),
        "real_review_result_path": surface.get("real_review_result_path"),
        "real_review_result_exists": surface.get("real_review_result_exists"),
        "target_queue_path": surface.get("target_queue_path"),
        "target_queue_path_exists": surface.get("target_queue_path_exists"),
        "hold_reasons": hold_reasons,
        "must_not": [
            "do_not_consume_p167_until_p176_passes",
            "do_not_write_packet_078",
            "do_not_execute_p167_guard",
            "do_not_run_p173_guard",
            "do_not_write_worker_envelope",
            "do_not_call_provider",
            "do_not_send_live_message",
            "do_not_commit_push_deploy",
            "do_not_mutate_cloudflare_or_r2",
        ],
        "external_actions_performed": {
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            "P176 passed and P167 can be surfaced for operator execution; do not auto-execute."
            if exact_allowed
            else "Keep P167 approval in escrow; OpenCode must write a real read-only review result and P176 must pass before consuming it."
            if phrase_matches
            else f"Provide exact gate {DEFAULT_QUEUE_DRAIN_REFRESH_GATE} if P167 should be escrowed."
        ),
    }


def build_packet078_p167_deferred_approval_escrow_receipt(escrow: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_p167_deferred_approval_escrow_receipt.v1",
        "packet_id": escrow["packet_id"],
        "status": "recorded_packet078_p167_deferred_approval_escrow",
        "escrow_status": escrow["status"],
        "created_at": now_iso(),
        "repo": escrow["repo"],
        "evidence_path": evidence_path,
        "approval_phrase_matches_p167": escrow["approval_phrase_matches_p167"],
        "exact_p167_consumed": escrow["exact_p167_consumed"],
        "exact_p167_allowed_after_review": escrow["exact_p167_allowed_after_review"],
        "real_review_result_exists": escrow["real_review_result_exists"],
        "target_queue_path": escrow["target_queue_path"],
        "target_queue_path_exists": escrow["target_queue_path_exists"],
        "hold_reasons": escrow["hold_reasons"],
        "external_actions_performed": escrow["external_actions_performed"],
        "blocked_actions_preserved": escrow["blocked_actions_preserved"],
        "completion_claim": "P180 deferred P167 approval escrow recorded; approval was not consumed and no queue write, gate execution, worker envelope write, provider call, live send, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": escrow["next_safe_action"],
    }


def build_packet078_p167_escrow_release_readiness(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
    result_input: str,
    escrow_input: str,
) -> dict[str, Any]:
    """Combine P180 escrow and P176 intake to decide whether P167 can be surfaced."""
    intake = build_packet078_opencode_review_result_intake(root, plan, current_next_gate_path, result_input)
    escrow_path, escrow = load_optional_json(root, escrow_input)
    hold_reasons: list[str] = []
    if not isinstance(escrow, dict):
        escrow = {}
        hold_reasons.append("p167_deferred_approval_escrow_missing")
    if escrow.get("approval_phrase_matches_p167") is not True:
        hold_reasons.append("p167_approval_not_in_escrow")
    if escrow.get("exact_p167_consumed") is not False:
        hold_reasons.append("p167_approval_already_consumed_or_unknown")
    if intake.get("exact_p167_allowed_after_review") is not True:
        hold_reasons.extend(str(issue) for issue in intake.get("issues", []))
    if intake.get("target_queue_path_exists") is not False:
        hold_reasons.append("packet_078_already_exists")
    ready = hold_reasons == []
    surface_command = (
        "python3 scripts/ghostclaw_a2a_agent_orchestrator.py "
        f"--check-queue-drain-refresh-approval {DEFAULT_QUEUE_DRAIN_REFRESH_GATE} "
        "--write "
        "--output .ghostclaw_runtime/a2a2a/status/A2A2A-P171-P167-EXACT-APPROVAL-CHECK-20260704.json "
        "--receipt .ghostclaw_runtime/a2a2a/receipts/A2A2A-P171-P167-EXACT-APPROVAL-CHECK-20260704.json"
    )
    return {
        "schema": "ghostclaw.a2a2a.packet078_p167_escrow_release_readiness.v1",
        "packet_id": "A2A2A-P181-PACKET078-P167-ESCROW-RELEASE-READINESS-20260704",
        "status": "ready_to_surface_escrowed_p167" if ready else "waiting_for_opencode_review_result",
        "mode": "local_safe_escrow_release_readiness_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "selected_packet": "packet_078",
        "escrow_path": rel(root, escrow_path) if escrow_path else escrow_input,
        "escrow_status": escrow.get("status"),
        "approval_phrase_matches_p167": escrow.get("approval_phrase_matches_p167") is True,
        "exact_p167_consumed": False,
        "exact_p167_ready_to_surface": ready,
        "intake_status": intake["status"],
        "exact_p167_allowed_after_review": intake.get("exact_p167_allowed_after_review"),
        "real_review_result_path": intake.get("review_result_path"),
        "review_result_status": intake.get("review_result_status"),
        "target_queue_path": intake["target_queue_path"],
        "target_queue_path_exists": intake["target_queue_path_exists"],
        "hold_reasons": hold_reasons,
        "command_to_execute_now": surface_command if ready else None,
        "must_not": [
            "do_not_execute_p167_guard",
            "do_not_write_packet_078",
            "do_not_run_p173_guard",
            "do_not_write_worker_envelope",
            "do_not_call_provider",
            "do_not_send_live_message",
            "do_not_commit_push_deploy",
            "do_not_mutate_cloudflare_or_r2",
        ],
        "external_actions_performed": {
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            "Surface the escrowed P167 approval check command for operator decision; do not execute packet_078 write automatically."
            if ready
            else "Keep P167 approval in escrow until OpenCode writes a real passing review result and P176 passes."
        ),
    }


def build_packet078_p167_escrow_release_readiness_receipt(readiness: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_p167_escrow_release_readiness_receipt.v1",
        "packet_id": readiness["packet_id"],
        "status": "recorded_packet078_p167_escrow_release_readiness",
        "readiness_status": readiness["status"],
        "created_at": now_iso(),
        "repo": readiness["repo"],
        "evidence_path": evidence_path,
        "escrow_path": readiness["escrow_path"],
        "exact_p167_ready_to_surface": readiness["exact_p167_ready_to_surface"],
        "exact_p167_consumed": readiness["exact_p167_consumed"],
        "target_queue_path": readiness["target_queue_path"],
        "target_queue_path_exists": readiness["target_queue_path_exists"],
        "hold_reasons": readiness["hold_reasons"],
        "external_actions_performed": readiness["external_actions_performed"],
        "blocked_actions_preserved": readiness["blocked_actions_preserved"],
        "completion_claim": "P181 escrow release readiness recorded; no P167 guard, packet_078 write, P173 guard, worker envelope write, provider call, live send, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": readiness["next_safe_action"],
    }


def build_packet078_p167_release_watch(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
    result_input: str,
    escrow_input: str,
) -> dict[str, Any]:
    """Watch the P167 escrow release chain without consuming approval or writing packet_078."""
    release = build_packet078_p167_escrow_release_readiness(
        root,
        plan,
        current_next_gate_path,
        result_input,
        escrow_input,
    )
    ready = release.get("exact_p167_ready_to_surface") is True
    gate_state = "ready_for_operator_p167_decision" if ready else "hold_for_opencode_review_result"
    return {
        "schema": "ghostclaw.a2a2a.packet078_p167_release_watch.v1",
        "packet_id": "A2A2A-P182-PACKET078-P167-RELEASE-WATCH-20260704",
        "status": release["status"],
        "mode": "local_safe_release_watch_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "selected_packet": "packet_078",
        "gate_state": gate_state,
        "release_sequence_allowed": ready,
        "exact_p167_phrase": DEFAULT_QUEUE_DRAIN_REFRESH_GATE,
        "exact_p167_ready_to_surface": ready,
        "exact_p167_consumed": False,
        "command_to_execute_now": release.get("command_to_execute_now") if ready else None,
        "escrow_path": release["escrow_path"],
        "escrow_status": release.get("escrow_status"),
        "intake_status": release.get("intake_status"),
        "review_result_status": release.get("review_result_status"),
        "real_review_result_path": release.get("real_review_result_path"),
        "target_queue_path": release["target_queue_path"],
        "target_queue_path_exists": release["target_queue_path_exists"],
        "hold_reasons": release.get("hold_reasons", []),
        "rerun_commands": {
            "after_opencode_result": (
                "python3 scripts/ghostclaw_a2a_agent_orchestrator.py "
                "--packet078-opencode-review-result-intake "
                f"--packet078-opencode-review-result {shlex.quote(result_input)} --write"
            ),
            "after_p176_passes": (
                "python3 scripts/ghostclaw_a2a_agent_orchestrator.py "
                "--packet078-p167-escrow-release-readiness "
                f"--packet078-opencode-review-result {shlex.quote(result_input)} "
                f"--packet078-p167-deferred-approval {shlex.quote(escrow_input)} --write"
            ),
        },
        "must_not": [
            "do_not_execute_p167_guard",
            "do_not_write_packet_078",
            "do_not_run_p173_guard",
            "do_not_write_worker_envelope",
            "do_not_call_provider",
            "do_not_send_live_message",
            "do_not_commit_push_deploy",
            "do_not_mutate_cloudflare_or_r2",
        ],
        "external_actions_performed": {
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            "Operator may inspect the surfaced P167 approval check command; do not execute automatically."
            if ready
            else "Keep watching for the real OpenCode read-only review result, then rerun P176 and P181."
        ),
    }


def build_packet078_p167_release_watch_receipt(watch: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet078_p167_release_watch_receipt.v1",
        "packet_id": watch["packet_id"],
        "status": "recorded_packet078_p167_release_watch",
        "watch_status": watch["status"],
        "created_at": now_iso(),
        "repo": watch["repo"],
        "evidence_path": evidence_path,
        "gate_state": watch["gate_state"],
        "release_sequence_allowed": watch["release_sequence_allowed"],
        "exact_p167_ready_to_surface": watch["exact_p167_ready_to_surface"],
        "exact_p167_consumed": watch["exact_p167_consumed"],
        "target_queue_path": watch["target_queue_path"],
        "target_queue_path_exists": watch["target_queue_path_exists"],
        "hold_reasons": watch["hold_reasons"],
        "external_actions_performed": watch["external_actions_performed"],
        "blocked_actions_preserved": watch["blocked_actions_preserved"],
        "completion_claim": "P182 release watch recorded; no P167 guard, packet_078 write, P173 guard, worker envelope write, provider call, live send, commit, push, deploy, or cloud mutation was performed.",
        "next_safe_action": watch["next_safe_action"],
    }


def build_queue_replenish_guard_status(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
    preview_output: str,
    command_output: str,
    receipt_output: str,
    status_output: str | None = None,
) -> dict[str, Any]:
    """Inspect queue-replenish guard artifacts without executing the guard."""
    overlay = build_current_gate_overlay(root, current_next_gate_path)
    if not overlay:
        overlay = {}
    exact_gate = str(overlay.get("exact_gate_phrase") or "")
    target_path = str(overlay.get("selected_packet_path") or "")
    preview_path = resolve_under_root(root, preview_output)
    command_path = resolve_under_root(root, command_output)
    receipt_path = resolve_under_root(root, receipt_output)
    target_abs = resolve_under_root(root, target_path) if target_path else None

    issues: list[str] = []
    preview_payload: dict[str, Any] | None = None
    receipt_payload: dict[str, Any] | None = None
    preview_sha256: str | None = None
    command_text: str | None = None

    if not exact_gate:
        issues.append("missing_exact_gate")
    if not target_path:
        issues.append("missing_target_queue_path")
    if not is_queue_replenish_gate(exact_gate, target_path, overlay.get("allowed_scope")):
        issues.append("current_gate_is_not_queue_replenish")

    if preview_path.is_file():
        try:
            preview_payload = read_json(preview_path)
            preview_sha256 = sha256_file(preview_path)
        except (json.JSONDecodeError, OSError):
            issues.append("preview_json_invalid")
    else:
        issues.append("preview_missing")

    if receipt_path.is_file():
        try:
            receipt_payload = read_json(receipt_path)
        except (json.JSONDecodeError, OSError):
            issues.append("receipt_json_invalid")
    else:
        issues.append("receipt_missing")

    if command_path.is_file():
        command_text = command_path.read_text(encoding="utf-8")
    else:
        issues.append("command_missing")

    target_absent = target_abs is not None and not target_abs.exists()
    if target_abs is not None and target_abs.exists():
        issues.append("target_queue_path_already_exists")

    receipt_preview_sha = receipt_payload.get("preview_sha256") if isinstance(receipt_payload, dict) else None
    receipt_exact_gate = receipt_payload.get("exact_gate_phrase") if isinstance(receipt_payload, dict) else None
    receipt_target_path = receipt_payload.get("target_queue_path") if isinstance(receipt_payload, dict) else None
    preview_gate = preview_payload.get("write_gate_consumed") if isinstance(preview_payload, dict) else None
    preview_target = (
        preview_payload.get("target_queue_path_after_approval") if isinstance(preview_payload, dict) else None
    )

    checksum_matches_receipt = bool(preview_sha256 and receipt_preview_sha and preview_sha256 == receipt_preview_sha)
    exact_gate_matches_receipt = bool(exact_gate and receipt_exact_gate and exact_gate == receipt_exact_gate)
    exact_gate_matches_preview = bool(exact_gate and preview_gate and exact_gate == preview_gate)
    target_matches_receipt = bool(target_path and receipt_target_path and target_path == receipt_target_path)
    target_matches_preview = bool(target_path and preview_target and target_path == preview_target)

    command_contains_exact_gate = bool(command_text and exact_gate and exact_gate in command_text)
    command_contains_sha = bool(command_text and preview_sha256 and preview_sha256 in command_text)
    command_refuses_overwrite = bool(command_text and "refusing overwrite" in command_text)
    command_checks_sha256 = bool(command_text and "shasum -a 256" in command_text)
    command_unsafe_tokens = [
        token.strip()
        for token in UNSAFE_COMMAND_TOKENS
        if command_text and token.strip() and token in f" {command_text.lower()} "
    ]

    if receipt_preview_sha and preview_sha256 and not checksum_matches_receipt:
        issues.append("preview_checksum_mismatch_receipt")
    if receipt_exact_gate and exact_gate and not exact_gate_matches_receipt:
        issues.append("exact_gate_mismatch_receipt")
    if preview_gate and exact_gate and not exact_gate_matches_preview:
        issues.append("exact_gate_mismatch_preview")
    if receipt_target_path and target_path and not target_matches_receipt:
        issues.append("target_path_mismatch_receipt")
    if preview_target and target_path and not target_matches_preview:
        issues.append("target_path_mismatch_preview")
    if command_text and not command_contains_exact_gate:
        issues.append("command_missing_exact_gate")
    if command_text and preview_sha256 and not command_contains_sha:
        issues.append("command_missing_preview_sha256")
    if command_text and not command_refuses_overwrite:
        issues.append("command_missing_overwrite_refusal")
    if command_text and not command_checks_sha256:
        issues.append("command_missing_sha256_check")
    if command_unsafe_tokens:
        issues.append("command_contains_unsafe_token")

    ready = not issues
    command_after_exact_gate = f"bash {command_output} {exact_gate}" if ready else None
    target_packet_label = packet_label_from_path(target_path)
    return {
        "schema": "ghostclaw.a2a2a.queue_replenish_guard_status.v1",
        "packet_id": packet_id_from_artifact_path(
            status_output,
            "A2A2A-P132-P129-QUEUE-REPLENISH-GUARD-STATUS-20260704",
        ),
        "status": "ready_for_exact_gate" if ready else "blocked_or_not_ready",
        "mode": "local_safe_queue_replenish_guard_status_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "current_gate_overlay": overlay,
        "exact_gate_phrase": exact_gate or None,
        "target_queue_path": target_path or None,
        "target_queue_path_absent": target_absent,
        "preview_path": preview_output,
        "status_path": status_output,
        "preview_exists": preview_path.is_file(),
        "preview_sha256": preview_sha256,
        "receipt_path": receipt_output,
        "receipt_exists": receipt_path.is_file(),
        "receipt_preview_sha256": receipt_preview_sha,
        "command_path": command_output,
        "command_exists": command_path.is_file(),
        "command_after_exact_gate": command_after_exact_gate,
        "checks": {
            "preview_checksum_matches_receipt": checksum_matches_receipt,
            "exact_gate_matches_receipt": exact_gate_matches_receipt,
            "exact_gate_matches_preview": exact_gate_matches_preview,
            "target_matches_receipt": target_matches_receipt,
            "target_matches_preview": target_matches_preview,
            "command_contains_exact_gate": command_contains_exact_gate,
            "command_contains_preview_sha256": command_contains_sha,
            "command_refuses_overwrite": command_refuses_overwrite,
            "command_checks_sha256": command_checks_sha256,
            "command_has_no_unsafe_tokens": not command_unsafe_tokens,
        },
        "command_unsafe_tokens": command_unsafe_tokens,
        "issues": issues,
        "external_actions_performed": {
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            f"Wait for exact gate {exact_gate}; then run command_after_exact_gate if operator chooses to write {target_packet_label}."
            if ready
            else "Do not run the queue replenish guard command until status issues are resolved."
        ),
    }


def build_queue_replenish_guard_status_receipt(status: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.queue_replenish_guard_status_receipt.v1",
        "packet_id": status["packet_id"],
        "status": "recorded_queue_replenish_guard_status",
        "guard_status": status["status"],
        "created_at": now_iso(),
        "repo": status["repo"],
        "exact_gate_phrase": status.get("exact_gate_phrase"),
        "target_queue_path": status.get("target_queue_path"),
        "target_queue_path_absent": status.get("target_queue_path_absent"),
        "preview_path": status.get("preview_path"),
        "preview_sha256": status.get("preview_sha256"),
        "command_path": status.get("command_path"),
        "command_after_exact_gate": status.get("command_after_exact_gate"),
        "checks": status.get("checks", {}),
        "issues": status.get("issues", []),
        "external_actions_performed": status["external_actions_performed"],
        "blocked_actions_preserved": status["blocked_actions_preserved"],
        "completion_claim": "Queue replenish guard status recorded; no queue packet was written and no guard command was executed.",
        "next_safe_action": status["next_safe_action"],
    }


def build_queue_replenish_team_handoff(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
    preview_output: str,
    command_output: str,
    receipt_output: str,
    status_output: str | None = None,
    handoff_output: str | None = None,
) -> dict[str, Any]:
    """Build one no-execution handoff bundle for Hermes/Codex/OpenCode/Validator."""
    guard_status = build_queue_replenish_guard_status(
        root,
        plan,
        current_next_gate_path,
        preview_output,
        command_output,
        receipt_output,
        status_output,
    )
    exact_gate = guard_status.get("exact_gate_phrase")
    target_path = guard_status.get("target_queue_path")
    target_packet_label = packet_label_from_path(target_path)
    ready = guard_status.get("status") == "ready_for_exact_gate"
    target_reconcile = build_queue_replenish_target_reconcile(root, plan, current_next_gate_path, preview_output)
    target_present_ready = target_reconcile.get("status") == "queue_packet_present_matches_preview"
    lane_cards = {
        "Hermes_Commander": {
            "lane": "control",
            "status": "waiting_for_exact_gate" if ready else "blocked_or_not_ready",
            "next_action": "hold_gate_and_surface_operator_choice",
            "allowed_now": [
                "show_status_bundle",
                "verify_exact_gate_text",
                "keep_current_next_gate_locked",
            ],
            "after_exact_gate": [
                "may_run_checksum_guard_command_if_operator_chooses_queue_write",
                "must_not_self_approve",
                "must_record_receipt_after_queue_write",
            ],
            "must_not": [
                "execute_queue_payload",
                "start_worker_loop",
                "send_live_message",
                "call_provider",
                "push_or_deploy",
            ],
        },
        "Codex_Builder": {
            "lane": "build",
            "status": f"standby_until_{target_packet_label}_exists",
            "next_action": f"do_not_mutate_source_until_a_separate_worker_envelope_gate_selects_{target_packet_label}",
            "allowed_now": [
                "inspect_status_bundle",
                "inspect_preview_packet",
                "prepare_review_notes",
            ],
            "after_exact_gate": [
                "run_coordinator_dry_run",
                "wait_for_separate_local_worker_envelope_write_gate",
            ],
            "must_not": [
                "write_worker_envelope_without_next_gate",
                "edit_source_from_queue_preview",
                "execute_external_actions",
            ],
        },
        "OpenCode_Reviewer": {
            "lane": "review",
            "status": "read_only_review_ready" if ready else "read_only_review_blocked",
            "next_action": "review_preview_receipt_status_and_guard_command_only",
            "allowed_now": [
                "inspect_preview_packet",
                "inspect_guard_status",
                "inspect_mission_report",
            ],
            "must_not": [
                "edit_source",
                "write_queue_packet",
                "run_guard_command",
                "call_provider",
            ],
        },
        "Validator_Worker": {
            "lane": "validation",
            "status": "validation_ready" if ready else "validation_blocked",
            "next_action": "re-run_local_checks_before_any_exact_gate_consumption",
            "allowed_now": [
                "json_parse_status_and_receipts",
                "bash_syntax_check_guard",
                "verify_target_queue_absent",
                "run_focused_unittest",
                "run_secret_scan",
            ],
            "must_not": [
                "mutate_source",
                "write_queue_packet",
                "dispatch_worker",
            ],
        },
    }
    if target_present_ready:
        lane_cards["Hermes_Commander"]["status"] = "target_reconcile_ready"
        lane_cards["Hermes_Commander"]["next_action"] = "surface_target_reconcile_and_request_separate_worker_envelope_gate"
        lane_cards["Hermes_Commander"]["after_exact_gate"] = [
            "queue_replenish_already_consumed_do_not_rerun",
            "request_separate_local_worker_envelope_write_gate",
        ]
        lane_cards["Codex_Builder"]["status"] = "standby_for_separate_worker_envelope_gate"
        lane_cards["Codex_Builder"]["next_action"] = (
            f"do_not_mutate_source_until_separate_worker_envelope_gate_selects_{target_packet_label}"
        )
        lane_cards["Codex_Builder"]["after_exact_gate"] = [
            "not_applicable_queue_target_already_exists",
            "wait_for_separate_local_worker_envelope_write_gate",
        ]
        lane_cards["OpenCode_Reviewer"]["status"] = "read_only_review_ready"
        lane_cards["OpenCode_Reviewer"]["next_action"] = "review_target_reconcile_and_preview_match_only"
        lane_cards["Validator_Worker"]["status"] = "validation_ready"
        lane_cards["Validator_Worker"]["next_action"] = "verify_target_matches_preview_and_no_external_actions"
        lane_cards["Validator_Worker"]["allowed_now"] = [
            "json_parse_status_and_receipts",
            "bash_syntax_check_guard",
            "verify_target_matches_preview",
            "run_focused_unittest",
            "run_secret_scan",
        ]
    external_actions = {
        "queue_file_write": False,
        "queue_payload_execution": False,
        "worker_envelope_write": False,
        "worker_execution": False,
        "telegram_live_send": False,
        "provider_call": False,
        "repo_or_customer_data_external_routing": False,
        "secret_read_or_print": False,
        "install": False,
        "commit": False,
        "push": False,
        "deploy": False,
        "cloudflare_or_r2_mutation": False,
    }
    if target_present_ready:
        telegram_safe_draft = (
            f"Hermes {target_packet_label} queue target already exists and matches preview. "
            f"Target {target_path} already exists; checksum {target_reconcile.get('target_sha256')}. "
            "Next: target_reconcile then request a separate local worker-envelope write gate. "
            "No live/provider/deploy/cloud action performed."
        )
    else:
        telegram_safe_draft = (
            f"Hermes {target_packet_label} queue replenish is ready for exact gate. "
            f"Target {target_path} is absent; preview checksum {guard_status.get('preview_sha256')}. "
            f"Next exact gate: {exact_gate}. No live/provider/deploy/cloud action performed."
        )
    return {
        "schema": "ghostclaw.a2a2a.queue_replenish_team_handoff.v1",
        "packet_id": packet_id_from_artifact_path(
            handoff_output,
            "A2A2A-P133-P129-TEAM-HANDOFF-BUNDLE-20260704",
        ),
        "status": (
            "queue_target_present_matches_preview"
            if target_present_ready
            else "ready_for_exact_gate"
            if ready
            else "blocked_or_not_ready"
        ),
        "mode": "local_safe_team_handoff_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "active_focus": plan["active_focus"],
        "paused_focus": plan["paused_focus"],
        "exact_gate_phrase": exact_gate,
        "target_queue_path": target_path,
        "target_queue_path_absent": guard_status.get("target_queue_path_absent"),
        "command_after_exact_gate": guard_status.get("command_after_exact_gate"),
        "guard_status": {
            "status": guard_status.get("status"),
            "preview_path": guard_status.get("preview_path"),
            "preview_sha256": guard_status.get("preview_sha256"),
            "receipt_path": guard_status.get("receipt_path"),
            "command_path": guard_status.get("command_path"),
            "checks": guard_status.get("checks", {}),
            "issues": guard_status.get("issues", []),
        },
        "target_reconcile": {
            "status": target_reconcile.get("status"),
            "transition": target_reconcile.get("transition"),
            "target_matches_preview": target_reconcile.get("target_matches_preview"),
            "json_matches_preview": target_reconcile.get("json_matches_preview"),
            "sha_matches_preview": target_reconcile.get("sha_matches_preview"),
            "target_sha256": target_reconcile.get("target_sha256"),
            "issues": target_reconcile.get("issues", []),
        },
        "lane_cards": lane_cards,
        "telegram_safe_draft": telegram_safe_draft,
        "external_actions_performed": external_actions,
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            "Run target_reconcile status, then request a separate local worker-envelope write gate for "
            f"{target_packet_label}. Do not rerun queue replenish."
            if target_present_ready
            else
            f"Wait for exact gate {exact_gate}; then the operator may run command_after_exact_gate to write {target_packet_label} only."
            if ready
            else "Do not proceed. Resolve guard status issues before any exact gate consumption."
        ),
    }


def build_queue_replenish_team_handoff_receipt(bundle: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.queue_replenish_team_handoff_receipt.v1",
        "packet_id": bundle["packet_id"],
        "status": "recorded_queue_replenish_team_handoff",
        "handoff_status": bundle["status"],
        "created_at": now_iso(),
        "repo": bundle["repo"],
        "exact_gate_phrase": bundle.get("exact_gate_phrase"),
        "target_queue_path": bundle.get("target_queue_path"),
        "target_queue_path_absent": bundle.get("target_queue_path_absent"),
        "lane_count": len(bundle.get("lane_cards", {})),
        "guard_status": bundle.get("guard_status", {}),
        "external_actions_performed": bundle["external_actions_performed"],
        "blocked_actions_preserved": bundle["blocked_actions_preserved"],
        "completion_claim": "Queue replenish team handoff recorded; no queue packet was written and no external action was performed.",
        "next_safe_action": bundle["next_safe_action"],
    }


def build_queue_replenish_target_reconcile(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
    preview_output: str,
) -> dict[str, Any]:
    """Reconcile whether the P129 target queue packet exists and matches the preview."""
    overlay = build_current_gate_overlay(root, current_next_gate_path) or {}
    exact_gate = str(overlay.get("exact_gate_phrase") or "")
    target_path = str(overlay.get("selected_packet_path") or "")
    preview_path = resolve_under_root(root, preview_output)
    target_abs = resolve_under_root(root, target_path) if target_path else None
    issues: list[str] = []

    preview_payload: Any = None
    target_payload: Any = None
    preview_sha256: str | None = None
    target_sha256: str | None = None
    if not exact_gate:
        issues.append("missing_exact_gate")
    if not target_path:
        issues.append("missing_target_queue_path")
    if not is_queue_replenish_gate(exact_gate, target_path, overlay.get("allowed_scope")):
        issues.append("current_gate_is_not_queue_replenish")

    if preview_path.is_file():
        try:
            preview_payload = read_json(preview_path)
            preview_sha256 = sha256_file(preview_path)
        except (json.JSONDecodeError, OSError):
            issues.append("preview_json_invalid")
    else:
        issues.append("preview_missing")

    target_exists = target_abs is not None and target_abs.exists()
    target_packet_label = packet_label_from_path(target_path)
    if target_exists and target_abs is not None:
        try:
            target_payload = read_json(target_abs)
            target_sha256 = sha256_file(target_abs)
        except (json.JSONDecodeError, OSError):
            issues.append("target_json_invalid")

    json_matches_preview = bool(preview_payload is not None and target_payload is not None and preview_payload == target_payload)
    sha_matches_preview = bool(preview_sha256 and target_sha256 and preview_sha256 == target_sha256)
    target_matches_preview = target_exists and json_matches_preview and sha_matches_preview

    if target_exists and not target_matches_preview and "target_json_invalid" not in issues:
        issues.append("target_queue_path_mismatch_preview")

    if target_matches_preview and not issues:
        status = "queue_packet_present_matches_preview"
        transition = "p129_target_present_exact_preview_match"
        next_safe_action = (
            "Do not rerun the queue replenish guard. Run coordinator dry-run and prepare a separate "
            f"local worker-envelope write gate for {target_packet_label}."
        )
    elif not target_exists and not issues:
        status = "waiting_for_exact_gate"
        transition = "p129_target_absent_waiting_for_exact_gate"
        next_safe_action = f"Wait for exact gate {exact_gate} before writing {target_packet_label}."
    else:
        status = "blocked_or_not_ready"
        transition = "p129_target_reconcile_blocked"
        next_safe_action = "Stop and inspect target/preview mismatch before any worker envelope or queue execution."

    return {
        "schema": "ghostclaw.a2a2a.queue_replenish_target_reconcile.v1",
        "packet_id": "A2A2A-P134-P129-TARGET-RECONCILE-20260704",
        "status": status,
        "transition": transition,
        "mode": "local_safe_target_reconcile_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "exact_gate_phrase": exact_gate or None,
        "target_queue_path": target_path or None,
        "target_exists": target_exists,
        "preview_path": preview_output,
        "preview_exists": preview_path.is_file(),
        "preview_sha256": preview_sha256,
        "target_sha256": target_sha256,
        "json_matches_preview": json_matches_preview,
        "sha_matches_preview": sha_matches_preview,
        "target_matches_preview": target_matches_preview,
        "target_write_gate_claim": target_payload.get("write_gate_consumed") if isinstance(target_payload, dict) else None,
        "target_packet_id": target_payload.get("packet_id") if isinstance(target_payload, dict) else None,
        "issues": issues,
        "external_actions_performed": {
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": next_safe_action,
        "audit_note": (
            "This reconcile only compares local files. It does not prove who wrote the target file or that an "
            "approval was issued in another process."
        ),
    }


def build_queue_replenish_target_reconcile_receipt(reconcile: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.queue_replenish_target_reconcile_receipt.v1",
        "packet_id": reconcile["packet_id"],
        "status": "recorded_queue_replenish_target_reconcile",
        "reconcile_status": reconcile["status"],
        "transition": reconcile["transition"],
        "created_at": now_iso(),
        "repo": reconcile["repo"],
        "exact_gate_phrase": reconcile.get("exact_gate_phrase"),
        "target_queue_path": reconcile.get("target_queue_path"),
        "target_exists": reconcile.get("target_exists"),
        "target_matches_preview": reconcile.get("target_matches_preview"),
        "preview_sha256": reconcile.get("preview_sha256"),
        "target_sha256": reconcile.get("target_sha256"),
        "target_write_gate_claim": reconcile.get("target_write_gate_claim"),
        "issues": reconcile.get("issues", []),
        "external_actions_performed": reconcile["external_actions_performed"],
        "blocked_actions_preserved": reconcile["blocked_actions_preserved"],
        "completion_claim": "P134 target reconcile recorded; no queue packet was written by this command and no external action was performed.",
        "next_safe_action": reconcile["next_safe_action"],
    }


def build_packet_worker_envelope(
    queue_packet: dict[str, Any],
    target: str,
    source_gate: str,
    queue_packet_path: str,
    mission: str,
    dispatch_prefix: str,
) -> dict[str, Any]:
    packet_id = queue_packet.get("id") or queue_packet.get("packet_id")
    return {
        "schema": "ghostclaw.a2a2a.task.v1",
        "id": f"{dispatch_prefix}_local_dispatch_{packet_id}_{target}",
        "mission": mission,
        "source": "codex",
        "target": target,
        "requires_ack": True,
        "requires_receipt": True,
        "dangerous_actions_allowed": False,
        "secret_access_allowed": False,
        "paid_model_calls_allowed": False,
        "created_at": now_iso(),
        "payload": {
            "message": "Review safe local queue packet metadata only.",
            "source_gate": source_gate,
            "queue_packet": {
                "id": packet_id,
                "path": queue_packet_path,
                "title": queue_packet.get("title"),
                "risk": queue_packet.get("risk"),
                "active_focus": queue_packet.get("active_focus"),
                "paused_focus": queue_packet.get("paused_focus"),
            },
            "expected_behavior": "write local role receipt only",
            "runtime_queue_execution": False,
            "queue_payload_execution": False,
            "provider_call": False,
            "external_message_send": False,
            "telegram_live_send": False,
            "deploy": False,
            "push": False,
            "secret_read": False,
        },
    }


def render_packet_worker_envelope_guard_script(
    root: Path,
    preview_path: str,
    expected_preview_sha256: str,
    command_output: str,
    exact_gate: str,
    gate_label: str,
) -> str:
    return f"""#!/usr/bin/env bash
# {gate_label} checksum-guarded worker-envelope write.
# Run only after the exact gate is approved:
#   bash {command_output} {exact_gate}
set -euo pipefail

REPO="{root}"
APPROVAL="${{1:-}}"
REQUIRED_APPROVAL="{exact_gate}"
PREVIEW="$REPO/{preview_path}"
EXPECTED_PREVIEW_SHA256="{expected_preview_sha256}"

if [[ "$APPROVAL" != "$REQUIRED_APPROVAL" ]]; then
  echo "ERROR: exact approval phrase required: $REQUIRED_APPROVAL" >&2
  exit 2
fi

if [[ ! -f "$PREVIEW" ]]; then
  echo "ERROR: envelope preview missing: $PREVIEW" >&2
  exit 3
fi

ACTUAL_PREVIEW_SHA256="$(shasum -a 256 "$PREVIEW" | awk '{{print $1}}')"
if [[ "$ACTUAL_PREVIEW_SHA256" != "$EXPECTED_PREVIEW_SHA256" ]]; then
  echo "ERROR: envelope preview checksum mismatch" >&2
  exit 4
fi

python3 - "$REPO" "$PREVIEW" <<'PY'
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

root = Path(sys.argv[1]).resolve()
preview = Path(sys.argv[2]).resolve()
preview_sha256 = hashlib.sha256(preview.read_bytes()).hexdigest()
payload = json.loads(preview.read_text(encoding="utf-8"))
if payload.get("status") != "ready_for_exact_gate":
    raise SystemExit("ERROR: preview is not ready_for_exact_gate")
allowed_root = (root / ".ghostclaw_runtime" / "a2a2a" / "inbox").resolve()
receipt_path = (
    root
    / ".ghostclaw_runtime"
    / "a2a2a"
    / "receipts"
    / "{gate_label}-WORKER-ENVELOPE-WRITE-EXECUTED-20260704.json"
).resolve()
written = []
written_records = []
for item in payload.get("planned_writes", []):
    target = (root / item["path"]).resolve()
    if not str(target).startswith(str(allowed_root)):
        raise SystemExit(f"ERROR: target outside inbox: {{item['path']}}")
    if target.exists():
        raise SystemExit(f"ERROR: target already exists; refusing overwrite: {{item['path']}}")
    text = json.dumps(item["envelope"], ensure_ascii=False, indent=2, sort_keys=True) + "\\n"
    actual = hashlib.sha256(text.encode("utf-8")).hexdigest()
    if actual != item.get("sha256"):
        raise SystemExit(f"ERROR: envelope checksum mismatch: {{item['path']}}")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")
    written.append(item["path"])
    written_records.append({{
        "target": item.get("target"),
        "path": item["path"],
        "sha256": item.get("sha256"),
    }})
receipt = {{
    "schema": "ghostclaw.a2a2a.packet_worker_envelope_write_receipt.v1",
    "packet_id": "{gate_label}-WORKER-ENVELOPE-WRITE-EXECUTED-20260704",
    "status": "worker_envelopes_written",
    "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    "repo": str(root),
    "exact_gate_phrase": "{exact_gate}",
    "source_preview": str(preview.relative_to(root)),
    "source_preview_sha256": preview_sha256,
    "written_count": len(written_records),
    "written_targets": [item["target"] for item in written_records],
    "written": written_records,
    "external_actions_performed": {{
        "queue_file_write": False,
        "queue_payload_execution": False,
        "worker_envelope_write": True,
        "worker_execution": False,
        "role_worker_ack_write": False,
        "telegram_live_send": False,
        "provider_call": False,
        "repo_or_customer_data_external_routing": False,
        "secret_read_or_print": False,
        "install": False,
        "commit": False,
        "push": False,
        "deploy": False,
        "cloudflare_or_r2_mutation": False,
    }},
    "blocked_actions_preserved": payload.get("blocked_actions_preserved", {{}}),
    "next_safe_action": "Run role-worker ACK readiness for packet_077; do not execute queue payloads.",
}}
receipt_path.parent.mkdir(parents=True, exist_ok=True)
receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True) + "\\n", encoding="utf-8")
print("{gate_label}_WORKER_ENVELOPES_WRITTEN count=%d paths=%s" % (len(written), ",".join(written)))
PY
"""


def build_packet_worker_envelope_gate(
    root: Path,
    plan: dict[str, Any],
    queue_packet_path: str,
    preview_output: str,
    command_output: str,
    sequence: str,
    gate_label: str,
    exact_gate: str,
    mission: str,
    dispatch_prefix: str,
) -> dict[str, Any]:
    queue_path = resolve_under_root(root, queue_packet_path)
    issues: list[str] = []
    queue_packet: dict[str, Any] | None = None
    queue_sha256: str | None = None
    if queue_path.is_file():
        try:
            payload = read_json(queue_path)
            if isinstance(payload, dict):
                queue_packet = payload
                queue_sha256 = sha256_file(queue_path)
            else:
                issues.append("queue_packet_json_not_object")
        except (json.JSONDecodeError, OSError):
            issues.append("queue_packet_json_invalid")
    else:
        issues.append("queue_packet_missing")
    expected_packet_id = f"packet_{sequence}"
    if queue_packet:
        if queue_packet.get("id") != expected_packet_id:
            issues.append(f"queue_packet_id_not_{expected_packet_id}")
        if queue_packet.get("risk") != "safe":
            issues.append("queue_packet_risk_not_safe")
        if queue_packet.get("approval_required") is not False:
            issues.append("queue_packet_approval_required_not_false")
        focus = set(queue_packet.get("active_focus", []) or [])
        if not {"sirinx.co", "AGM AutoFlow"}.issubset(focus):
            issues.append("queue_packet_active_focus_mismatch")

    planned_writes: list[dict[str, Any]] = []
    if not issues and queue_packet:
        for target in ("hermes", "kob"):
            path = (
                f".ghostclaw_runtime/a2a2a/inbox/{target}/"
                f"queue_coord_packet_{sequence}_{target}_{dispatch_prefix}_20260704.json"
            )
            absolute = resolve_under_root(root, path)
            if absolute.exists():
                issues.append(f"worker_envelope_already_exists:{path}")
                continue
            envelope = build_packet_worker_envelope(
                queue_packet,
                target,
                f"{gate_label}-WORKER-ENVELOPE-GATE-20260704",
                queue_packet_path,
                mission,
                dispatch_prefix,
            )
            envelope_text = to_json_text(envelope)
            planned_writes.append(
                {
                    "queue_packet_id": expected_packet_id,
                    "target": target,
                    "path": path,
                    "sha256": hashlib.sha256(envelope_text.encode("utf-8")).hexdigest(),
                    "envelope": envelope,
                }
            )
    preview_payload = {
        "schema": "ghostclaw.a2a2a.packet_worker_envelope_gate_preview.v1",
        "packet_id": f"{gate_label}-WORKER-ENVELOPE-GATE-PREVIEW-20260704",
        "status": "ready_for_exact_gate" if not issues else "blocked_or_not_ready",
        "mode": "local_safe_worker_envelope_gate_preview_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "exact_gate_phrase": exact_gate,
        "queue_packet_path": queue_packet_path,
        "queue_packet_sha256": queue_sha256,
        "planned_writes": planned_writes if not issues else [],
        "issues": issues,
        "external_actions_performed": {
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            f"Wait for exact gate {exact_gate}; then run command_after_exact_gate "
            "only if local worker envelopes should be written."
            if not issues
            else "Do not write worker envelopes. Resolve preview issues first."
        ),
    }
    preview_sha256 = hashlib.sha256(to_json_text(preview_payload).encode("utf-8")).hexdigest()
    command_script = (
        render_packet_worker_envelope_guard_script(
            root,
            preview_output,
            preview_sha256,
            command_output,
            exact_gate,
            gate_label,
        )
        if not issues
        else None
    )
    return {
        "schema": "ghostclaw.a2a2a.packet_worker_envelope_gate.v1",
        "packet_id": f"{gate_label}-WORKER-ENVELOPE-GATE-20260704",
        "status": "ready_for_exact_gate" if not issues else "blocked_or_not_ready",
        "mode": "local_safe_worker_envelope_gate_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "exact_gate_phrase": exact_gate,
        "queue_packet_path": queue_packet_path,
        "queue_packet_sha256": queue_sha256,
        "preview_path": preview_output,
        "preview_sha256": preview_sha256,
        "command_path": command_output,
        "command_after_exact_gate": f"bash {command_output} {exact_gate}" if command_script else None,
        "preview_payload": preview_payload,
        "guard_script": command_script,
        "planned_worker_packets": [
            {"target": item["target"], "path": item["path"], "sha256": item["sha256"]}
            for item in planned_writes
        ]
        if not issues
        else [],
        "issues": issues,
        "external_actions_performed": preview_payload["external_actions_performed"],
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": preview_payload["next_safe_action"],
    }


def build_packet076_worker_envelope_gate(
    root: Path,
    plan: dict[str, Any],
    queue_packet_path: str,
    preview_output: str,
    command_output: str,
) -> dict[str, Any]:
    return build_packet_worker_envelope_gate(
        root,
        plan,
        queue_packet_path,
        preview_output,
        command_output,
        "076",
        "A2A2A-P136-PACKET076",
        DEFAULT_PACKET076_WORKER_ENVELOPE_GATE,
        "A2A2A_P136_PACKET076_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
        "p136",
    )


def build_packet077_worker_envelope_gate(
    root: Path,
    plan: dict[str, Any],
    queue_packet_path: str,
    preview_output: str,
    command_output: str,
) -> dict[str, Any]:
    return build_packet_worker_envelope_gate(
        root,
        plan,
        queue_packet_path,
        preview_output,
        command_output,
        "077",
        "A2A2A-P156-PACKET077",
        DEFAULT_PACKET077_WORKER_ENVELOPE_GATE,
        "A2A2A_P156_PACKET077_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
        "p156",
    )


def build_packet078_worker_envelope_gate(
    root: Path,
    plan: dict[str, Any],
    queue_packet_path: str,
    preview_output: str,
    command_output: str,
) -> dict[str, Any]:
    return build_packet_worker_envelope_gate(
        root,
        plan,
        queue_packet_path,
        preview_output,
        command_output,
        "078",
        "A2A2A-P173-PACKET078",
        DEFAULT_PACKET078_WORKER_ENVELOPE_GATE,
        "A2A2A_P173_PACKET078_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
        "p173",
    )


def build_packet_worker_envelope_gate_receipt(gate: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet_worker_envelope_gate_receipt.v1",
        "packet_id": gate["packet_id"],
        "status": "recorded_packet_worker_envelope_gate_preview",
        "gate_status": gate["status"],
        "created_at": now_iso(),
        "repo": gate["repo"],
        "exact_gate_phrase": gate.get("exact_gate_phrase"),
        "queue_packet_path": gate.get("queue_packet_path"),
        "queue_packet_sha256": gate.get("queue_packet_sha256"),
        "preview_path": gate.get("preview_path"),
        "preview_sha256": gate.get("preview_sha256"),
        "command_path": gate.get("command_path"),
        "command_after_exact_gate": gate.get("command_after_exact_gate"),
        "planned_worker_packets": gate.get("planned_worker_packets", []),
        "issues": gate.get("issues", []),
        "external_actions_performed": gate["external_actions_performed"],
        "blocked_actions_preserved": gate["blocked_actions_preserved"],
        "completion_claim": f"{gate['packet_id']} worker-envelope gate preview recorded; no worker envelopes were written.",
        "next_safe_action": gate["next_safe_action"],
    }


def build_packet076_worker_envelope_gate_receipt(gate: dict[str, Any]) -> dict[str, Any]:
    return build_packet_worker_envelope_gate_receipt(gate)


def build_handoff_capsule(root: Path, plan: dict[str, Any], current_next_gate_path: str | None) -> dict[str, Any]:
    """Return one sidebar-safe packet for Hermes/Codex/OpenCode/KOB handoff."""
    compact = build_compact_plan(plan)
    apply_current_gate_overlay(compact, build_current_gate_overlay(root, current_next_gate_path))
    current_path, current_gate = load_optional_json(root, current_next_gate_path)
    completed_current_gate = current_gate_is_completed(current_gate)
    next_packet = compact["summary"].get("next_packet")
    selected_packet = next_packet.get("id") if isinstance(next_packet, dict) else None
    selected_path = next_packet.get("path") if isinstance(next_packet, dict) else None
    current_gate_block = (
        current_gate.get("current_next_gate")
        if isinstance(current_gate, dict) and not completed_current_gate
        else None
    )
    current_orchestrator = (
        current_gate.get("current_orchestrator")
        if isinstance(current_gate, dict) and not completed_current_gate
        else None
    )
    if isinstance(current_orchestrator, dict):
        selected_packet = selected_packet or current_orchestrator.get("selected_packet")
        selected_path = selected_path or current_orchestrator.get("selected_packet_path")
    if isinstance(current_gate, dict) and not completed_current_gate:
        selected_packet = selected_packet or current_gate.get("selected_packet")
        selected_path = selected_path or current_gate.get("selected_packet_path")
    exact_phrase = None
    allowed_scope = None
    blocked_scope: list[str] = []
    command_preview: dict[str, Any] = {}
    if isinstance(current_gate_block, dict):
        exact_phrase = current_gate_block.get("exact_phrase")
        allowed_scope = current_gate_block.get("allowed_scope")
        blocked_scope = list(current_gate_block.get("blocked_scope", []) or [])
        command_preview = dict(current_gate.get("command_preview", {}) or {})
    if exact_phrase is None and compact["queue_drain"].get("recommended_next_gate_phrase"):
        exact_phrase = compact["queue_drain"]["recommended_next_gate_phrase"]
    source_truth: dict[str, Any] = {
        "orchestrator_schema": compact["schema"],
        "queue_drain_status": compact["queue_drain"].get("status"),
    }
    if current_path is not None:
        source_truth["current_next_gate"] = rel(root, current_path)
        if current_path.is_file():
            source_truth["current_next_gate_sha256"] = sha256_file(current_path)
    if selected_path:
        packet_path = resolve_under_root(root, str(selected_path))
        source_truth["selected_packet_path"] = rel(root, packet_path)
        if packet_path.is_file():
            source_truth["selected_packet_sha256"] = sha256_file(packet_path)
    telegram_safe_draft = (
        "Hermes A2A2A current handoff: "
        f"{selected_packet or 'no packet'} is selected with "
        f"queue_drain={compact['queue_drain'].get('status')}. "
        f"Next gate: {exact_phrase or 'none'}. "
        "No live send, provider call, worker execution, deploy, push, secret read, or cloud mutation is allowed by this capsule."
    )
    capsule = {
        "schema": "ghostclaw.a2a2a.sidebar_handoff_capsule.v1",
        "packet_id": "A2A2A-P109-ORCHESTRATOR-HANDOFF-CAPSULE-MODE-20260703",
        "status": "pass_sidebar_handoff_capsule_ready",
        "mode": "local_safe_orchestrator_handoff_capsule_no_execution",
        "created_at": plan["created_at"],
        "repo": plan["repo"],
        "active_focus": plan["active_focus"],
        "paused_focus": plan["paused_focus"],
        "source_truth": source_truth,
        "current_state": {
            "queue_drain_status": compact["queue_drain"].get("status"),
            "selected_packet": selected_packet,
            "selected_packet_path": selected_path,
            "ready_active_count": compact["queue_drain"].get("ready_active_count", 0),
            "external_action_allowed": False,
            "source_mutation_allowed_now": False,
        },
        "next_exact_gate": {
            "phrase": exact_phrase,
            "scope": allowed_scope,
            "does_not_allow": blocked_scope,
        },
        "command_preview": command_preview,
        "lane_handoff": compact["lane_next_actions"],
        "telegram_safe_draft": telegram_safe_draft,
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "external_actions_performed": {
            "worker_envelope_write": False,
            "worker_execution": False,
            "queue_payload_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "next_safe_action": (
            f"Provide {exact_phrase} only if the scoped local action should run."
            if exact_phrase
            else compact["next_safe_action"]
        ),
    }
    capsule["gate_readiness"] = build_gate_readiness(root, capsule)
    return capsule


def is_local_dispatch_command(value: str) -> bool:
    return value.startswith("python3 scripts/ghostclaw_a2a_local_dispatch_execute.py --gate ")


def is_packet076_worker_envelope_preflight(value: str) -> bool:
    return value.strip() == "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet076-worker-envelope-gate"


def is_packet077_worker_envelope_preflight(value: str) -> bool:
    return value.strip() == "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet077-worker-envelope-gate"


def is_packet076_worker_envelope_guard(value: str) -> bool:
    return (
        value.startswith("bash .ghostclaw_runtime/a2a2a/commands/")
        and "PACKET076-WORKER-ENVELOPE-WRITE-GUARD" in value
    )


def is_packet077_worker_envelope_guard(value: str) -> bool:
    return (
        value.startswith("bash .ghostclaw_runtime/a2a2a/commands/")
        and "PACKET077-WORKER-ENVELOPE-WRITE-GUARD" in value
    )


def is_packet_worker_envelope_preflight(value: str) -> bool:
    return is_packet076_worker_envelope_preflight(value) or is_packet077_worker_envelope_preflight(value)


def is_packet_worker_envelope_guard(value: str) -> bool:
    return is_packet076_worker_envelope_guard(value) or is_packet077_worker_envelope_guard(value)


def command_preview_issues(command_preview: dict[str, Any], exact_phrase: str | None) -> list[str]:
    issues: list[str] = []
    required_keys = ("safety_check_without_approval", "dry_run_after_gate", "write_after_gate")
    for key in required_keys:
        value = command_preview.get(key)
        if not isinstance(value, str) or not value.strip():
            issues.append(f"command_preview_missing:{key}")
            continue
        normalized = f" {value.lower()} "
        if key == "safety_check_without_approval":
            allowed_command = is_local_dispatch_command(value) or is_packet_worker_envelope_preflight(value)
        else:
            allowed_command = is_local_dispatch_command(value) or is_packet_worker_envelope_guard(value)
        if not allowed_command:
            issues.append(f"command_preview_not_local_dispatch:{key}")
        for token in UNSAFE_COMMAND_TOKENS:
            if token in normalized:
                issues.append(f"command_preview_unsafe_token:{key}:{token.strip()}")
    safety_command = command_preview.get("safety_check_without_approval")
    if isinstance(safety_command, str) and "--approval" in safety_command:
        issues.append("safety_check_should_not_include_approval")
    dry_run_command = command_preview.get("dry_run_after_gate")
    if isinstance(dry_run_command, str):
        if is_packet_worker_envelope_guard(dry_run_command):
            if " WRONG_APPROVAL" not in dry_run_command:
                issues.append("dry_run_command_missing_wrong_approval_smoke")
            if exact_phrase and exact_phrase in dry_run_command:
                issues.append("dry_run_command_must_not_use_exact_gate")
        else:
            if "--dry-run" not in dry_run_command:
                issues.append("dry_run_command_missing_dry_run_flag")
            if "--execute" in dry_run_command:
                issues.append("dry_run_command_must_not_execute")
            if exact_phrase and exact_phrase not in dry_run_command:
                issues.append("dry_run_command_missing_exact_gate")
    write_command = command_preview.get("write_after_gate")
    if isinstance(write_command, str):
        if is_packet_worker_envelope_guard(write_command):
            if " WRONG_APPROVAL" in write_command:
                issues.append("write_command_uses_wrong_approval_smoke")
            if exact_phrase and exact_phrase not in write_command:
                issues.append("write_command_missing_exact_gate")
        else:
            if "--execute" not in write_command or "--write" not in write_command:
                issues.append("write_command_missing_execute_write_flags")
            if exact_phrase and exact_phrase not in write_command:
                issues.append("write_command_missing_exact_gate")
    return issues


def build_gate_readiness(root: Path, capsule: dict[str, Any]) -> dict[str, Any]:
    issues: list[str] = []
    next_gate = capsule.get("next_exact_gate", {}) if isinstance(capsule.get("next_exact_gate"), dict) else {}
    exact_phrase = next_gate.get("phrase")
    selected_packet = capsule.get("current_state", {}).get("selected_packet")
    selected_path = capsule.get("current_state", {}).get("selected_packet_path")
    if not exact_phrase:
        issues.append("missing_exact_gate_phrase")
    if not selected_packet:
        issues.append("missing_selected_packet")
    seq = packet_sequence({"id": selected_packet, "path": selected_path})
    if selected_packet and exact_phrase and seq and seq not in str(exact_phrase):
        issues.append("exact_gate_does_not_reference_selected_packet_sequence")
    if selected_path:
        packet_path = resolve_under_root(root, str(selected_path))
        if not packet_path.is_file():
            issues.append("selected_packet_path_missing")
    command_preview = capsule.get("command_preview", {}) if isinstance(capsule.get("command_preview"), dict) else {}
    issues.extend(command_preview_issues(command_preview, str(exact_phrase) if exact_phrase else None))
    worker_packets: list[str] = []
    if seq:
        for target in ("hermes", "kob"):
            inbox = root / f".ghostclaw_runtime/a2a2a/inbox/{target}"
            worker_packets.extend(rel(root, path) for path in sorted(inbox.glob(f"queue_coord_packet_{seq}_{target}_*.json")))
    if worker_packets:
        issues.append("worker_envelope_already_written_for_selected_packet")
    external_actions = capsule.get("external_actions_performed", {})
    if isinstance(external_actions, dict):
        for key, value in external_actions.items():
            if value is not False:
                issues.append(f"external_action_not_false:{key}")
    else:
        issues.append("external_actions_performed_missing")
    blocked_actions = capsule.get("blocked_actions_preserved", {})
    if isinstance(blocked_actions, dict):
        for key, value in blocked_actions.items():
            if value is not False:
                issues.append(f"blocked_action_not_preserved:{key}")
    else:
        issues.append("blocked_actions_preserved_missing")
    return {
        "schema": "ghostclaw.a2a2a.gate_readiness.v1",
        "status": "ready_for_exact_gate" if not issues else "not_ready",
        "selected_packet": selected_packet,
        "selected_packet_sequence": seq,
        "exact_gate_phrase": exact_phrase,
        "command_preview_keys": sorted(command_preview.keys()),
        "worker_envelopes_present": worker_packets,
        "issues": issues,
        "allows_after_exact_gate_only": "local_worker_envelope_write",
        "still_blocks": [
            "worker_execution",
            "queue_payload_execution",
            "telegram_live_send",
            "provider_call",
            "repo_or_customer_data_external_routing",
            "secret_read_or_print",
            "install",
            "commit",
            "push",
            "deploy",
            "cloudflare_or_r2_mutation",
        ],
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
    }


def build_operator_action_card(root: Path, plan: dict[str, Any], current_next_gate_path: str | None) -> dict[str, Any]:
    """Return one bounded operator card for the next human-approved local action."""
    capsule = build_handoff_capsule(root, plan, current_next_gate_path)
    readiness = capsule.get("gate_readiness", {}) if isinstance(capsule.get("gate_readiness"), dict) else {}
    command_preview = capsule.get("command_preview", {}) if isinstance(capsule.get("command_preview"), dict) else {}
    selected_packet = readiness.get("selected_packet") or capsule.get("current_state", {}).get("selected_packet")
    selected_path = capsule.get("current_state", {}).get("selected_packet_path")
    selected_sequence = readiness.get("selected_packet_sequence") or packet_sequence(
        {"id": selected_packet, "path": selected_path}
    )
    exact_phrase = readiness.get("exact_gate_phrase") or capsule.get("next_exact_gate", {}).get("phrase")
    gate_scope = str(capsule.get("next_exact_gate", {}).get("scope") or "")
    if is_queue_replenish_gate(exact_phrase, selected_path, gate_scope):
        target_path = resolve_under_root(root, str(selected_path))
        issues: list[str] = []
        external_actions = capsule.get("external_actions_performed", {})
        if isinstance(external_actions, dict):
            for key, value in external_actions.items():
                if value is not False:
                    issues.append(f"external_action_not_false:{key}")
        else:
            issues.append("external_actions_performed_missing")
        if target_path.exists() and not issues:
            return {
                "schema": "ghostclaw.a2a2a.operator_action_card.v1",
                "packet_id": "A2A2A-P111-ORCHESTRATOR-OPERATOR-ACTION-CARD-MODE-20260703",
                "status": "target_queue_packet_present",
                "mode": "local_safe_operator_action_card_no_execution",
                "created_at": plan["created_at"],
                "repo": plan["repo"],
                "active_focus": plan["active_focus"],
                "paused_focus": plan["paused_focus"],
                "source_truth": capsule["source_truth"],
                "selected_packet": selected_packet,
                "selected_packet_path": selected_path,
                "selected_packet_sequence": selected_sequence,
                "exact_gate_phrase": exact_phrase,
                "gate_readiness_status": "target_already_present",
                "gate_readiness_issues": ["target_queue_path_already_exists"],
                "action_after_exact_gate": {
                    "kind": "do_not_replenish_queue_target_already_present",
                    "target_queue_path": selected_path,
                    "requires_exact_gate_phrase": None,
                    "allowed_only_after_exact_gate": False,
                    "would_execute": False,
                    "requires_separate_dispatch_command": True,
                    "blocked_until_ready": False,
                },
                "next_safe_action": (
                    "Do not rerun queue replenish. Run coordinator dry-run and open a separate local "
                    "worker-envelope write gate for the selected packet."
                ),
                "validation_commands": [
                    "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --top 20 --compact",
                    "python3 scripts/ghostclaw_a2a_queue_coordinator.py --dry-run",
                    "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --queue-replenish-target-reconcile",
                    "node scripts/secret-scan.mjs",
                ],
                "external_actions_performed": {
                    "queue_file_write": False,
                    "queue_payload_execution": False,
                    "worker_envelope_write": False,
                    "worker_execution": False,
                    "telegram_live_send": False,
                    "provider_call": False,
                    "repo_or_customer_data_external_routing": False,
                    "secret_read_or_print": False,
                    "install": False,
                    "commit": False,
                    "push": False,
                    "deploy": False,
                    "cloudflare_or_r2_mutation": False,
                },
                "blocked_actions_preserved": plan["blocked_actions_preserved"],
                "telegram_safe_draft": (
                    "Hermes operator card: queue replenish target already exists for "
                    f"{selected_path}; do not rerun P129. No live send performed."
                ),
                "stop_conditions": [
                    "any queue payload execution request",
                    "any live/provider/install/push/deploy/cloud/secret action required",
                    "any attempt to overwrite target queue packet",
                ],
            }
        if target_path.exists():
            issues.append("target_queue_path_already_exists")
        status = "ready_for_exact_gate" if not issues else "blocked_by_gate_readiness"
        return {
            "schema": "ghostclaw.a2a2a.operator_action_card.v1",
            "packet_id": "A2A2A-P111-ORCHESTRATOR-OPERATOR-ACTION-CARD-MODE-20260703",
            "status": status,
            "mode": "local_safe_operator_action_card_no_execution",
            "created_at": plan["created_at"],
            "repo": plan["repo"],
            "active_focus": plan["active_focus"],
            "paused_focus": plan["paused_focus"],
            "source_truth": capsule["source_truth"],
            "selected_packet": selected_packet,
            "selected_packet_path": selected_path,
            "selected_packet_sequence": selected_sequence,
            "exact_gate_phrase": exact_phrase,
            "gate_readiness_status": "ready_for_exact_gate" if not issues else "not_ready",
            "gate_readiness_issues": issues,
            "action_after_exact_gate": {
                "kind": "write_one_local_active_focus_queue_packet",
                "target_queue_path": selected_path,
                "requires_exact_gate_phrase": exact_phrase,
                "allowed_only_after_exact_gate": True,
                "would_execute": False,
                "requires_separate_dispatch_command": True,
                "blocked_until_ready": bool(issues),
            },
            "preflight_command": None,
            "dry_run_command": None,
            "validation_commands": [
                "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --top 20 --compact",
                "python3 scripts/ghostclaw_a2a_queue_coordinator.py --dry-run",
                "python3 -m json.tool .ghostclaw_runtime/a2a2a/status/current_next_gate.json",
                "node scripts/secret-scan.mjs",
            ],
            "stop_conditions": [
                "missing exact gate",
                "target queue path already exists",
                "any worker loop/start request",
                "any queue payload execution request",
                "any live/provider/install/push/deploy/cloud/secret action required",
            ],
            "telegram_safe_draft": (
                f"Hermes operator card: queue replenish target={selected_path}; "
                f"status={status}; next gate={exact_phrase}. No live send performed."
            ),
            "external_actions_performed": {
                "queue_file_write": False,
                "worker_envelope_write": False,
                "worker_execution": False,
                "queue_payload_execution": False,
                "telegram_live_send": False,
                "provider_call": False,
                "repo_or_customer_data_external_routing": False,
                "secret_read_or_print": False,
                "install": False,
                "commit": False,
                "push": False,
                "deploy": False,
                "cloudflare_or_r2_mutation": False,
            },
            "blocked_actions_preserved": plan["blocked_actions_preserved"],
            "next_safe_action": (
                f"Provide {exact_phrase} only if a new local active-focus queue packet should be written."
                if not issues
                else "Resolve queue replenish readiness issues before any local queue write."
            ),
        }
    is_ready = readiness.get("status") == "ready_for_exact_gate"
    packet_pattern = f"*packet_{selected_sequence}*" if selected_sequence else "*packet_*"
    return {
        "schema": "ghostclaw.a2a2a.operator_action_card.v1",
        "packet_id": "A2A2A-P111-ORCHESTRATOR-OPERATOR-ACTION-CARD-MODE-20260703",
        "status": "ready_for_exact_gate" if is_ready else "blocked_by_gate_readiness",
        "mode": "local_safe_operator_action_card_no_execution",
        "created_at": plan["created_at"],
        "repo": plan["repo"],
        "active_focus": plan["active_focus"],
        "paused_focus": plan["paused_focus"],
        "source_truth": capsule["source_truth"],
        "selected_packet": selected_packet,
        "selected_packet_path": selected_path,
        "selected_packet_sequence": selected_sequence,
        "exact_gate_phrase": exact_phrase,
        "gate_readiness_status": readiness.get("status"),
        "gate_readiness_issues": readiness.get("issues", []),
        "action_after_exact_gate": {
            "kind": "write_local_worker_envelopes_only",
            "command": command_preview.get("write_after_gate") if is_ready else None,
            "requires_exact_gate_phrase": exact_phrase,
            "allowed_only_after_exact_gate": True,
            "blocked_until_ready": not is_ready,
        },
        "preflight_command": command_preview.get("safety_check_without_approval"),
        "dry_run_command": command_preview.get("dry_run_after_gate"),
        "validation_commands": [
            "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --top 20 --handoff-capsule",
            (
                "find .ghostclaw_runtime/a2a2a/inbox/hermes "
                f".ghostclaw_runtime/a2a2a/inbox/kob -maxdepth 1 -name '{packet_pattern}' -print"
            ),
            "node scripts/secret-scan.mjs",
            (
                "git diff --check -- scripts/ghostclaw_a2a_agent_orchestrator.py "
                "WORKSPACE_SCAFFOLD/tests/test_ghostclaw_a2a_agent_orchestrator.py"
            ),
        ],
        "stop_conditions": [
            "missing exact gate",
            "readiness not ready",
            "command preview unsafe",
            "existing worker envelope detected",
            "any external/prod/secret/provider/deploy/push/cloud action required",
        ],
        "telegram_safe_draft": (
            f"Hermes operator card: {selected_packet or 'no packet'} status="
            f"{'ready_for_exact_gate' if is_ready else 'blocked_by_gate_readiness'}; "
            f"next gate={exact_phrase or 'none'}. No live send performed."
        ),
        "external_actions_performed": {
            "worker_envelope_write": False,
            "worker_execution": False,
            "queue_payload_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            f"Wait for exact gate {exact_phrase} before local worker-envelope write."
            if is_ready and exact_phrase
            else "Resolve gate readiness issues before any local worker-envelope write."
        ),
    }


def render_operator_brief(card: dict[str, Any]) -> str:
    """Render a copy-paste safe operator brief from an action card."""
    action = card.get("action_after_exact_gate", {}) if isinstance(card.get("action_after_exact_gate"), dict) else {}
    command = action.get("command") or "BLOCKED: resolve gate readiness issues before local worker-envelope write."
    issues = card.get("gate_readiness_issues") or []
    issue_lines = "\n".join(f"- `{issue}`" for issue in issues) if issues else "- none"
    validation_lines = "\n".join(f"- `{command_text}`" for command_text in card.get("validation_commands", []))
    stop_lines = "\n".join(f"- {condition}" for condition in card.get("stop_conditions", []))
    blocked_lines = "\n".join(
        f"- `{key}` remains blocked"
        for key, value in sorted((card.get("blocked_actions_preserved") or {}).items())
        if value is False
    )
    return (
        "# A2A2A Operator Action Brief\n\n"
        f"- Status: `{card.get('status')}`\n"
        f"- Selected packet: `{card.get('selected_packet')}`\n"
        f"- Selected path: `{card.get('selected_packet_path')}`\n"
        f"- Gate readiness: `{card.get('gate_readiness_status')}`\n"
        f"- Exact gate required: `{card.get('exact_gate_phrase')}`\n"
        f"- Active focus: `{', '.join(card.get('active_focus') or [])}`\n"
        f"- Paused focus: `{', '.join(card.get('paused_focus') or [])}`\n\n"
        "## Gate Issues\n\n"
        f"{issue_lines}\n\n"
        "## Commands\n\n"
        "Preflight, no approval required:\n\n"
        f"```bash\n{card.get('preflight_command') or 'true'}\n```\n\n"
        "Dry run after exact gate:\n\n"
        f"```bash\n{card.get('dry_run_command') or 'BLOCKED'}\n```\n\n"
        "Write local worker envelopes after exact gate only:\n\n"
        f"```bash\n{command}\n```\n\n"
        "## Validation Commands\n\n"
        f"{validation_lines}\n\n"
        "## Stop Conditions\n\n"
        f"{stop_lines}\n\n"
        "## Still Blocked\n\n"
        f"{blocked_lines}\n\n"
        "## Telegram-Safe Draft\n\n"
        f"{card.get('telegram_safe_draft')}\n\n"
        "No live send, provider/model call, worker execution, queue payload execution, install, commit, push, deploy, secret read/print, or Cloudflare/R2 mutation is performed by this brief.\n"
    )


def build_approval_check(card: dict[str, Any], approval_text: str | None) -> dict[str, Any]:
    """Validate an operator approval phrase without executing the approved action."""
    provided = (approval_text or "").strip()
    expected = (card.get("exact_gate_phrase") or "").strip()
    issues: list[str] = []
    if not provided:
        issues.append("approval_text_missing")
    if not expected:
        issues.append("expected_gate_missing")
    if provided and expected and provided != expected:
        issues.append("approval_text_does_not_match_exact_gate")
    upper_provided = provided.upper()
    if provided and (
        "APPROVE_ALL" in upper_provided
        or "FULL_AUTO" in upper_provided
        or "GODMODE" in upper_provided
        or "GOD_MODE" in upper_provided
        or re.search(r"อนุญาต.*ทั้งหมด", provided)
    ):
        issues.append("blanket_approval_rejected")
    if card.get("status") != "ready_for_exact_gate":
        issues.append("operator_card_not_ready")
    if card.get("gate_readiness_status") != "ready_for_exact_gate":
        issues.append("gate_readiness_not_ready")
    if card.get("gate_readiness_issues"):
        issues.append("gate_readiness_has_issues")
    action = card.get("action_after_exact_gate", {}) if isinstance(card.get("action_after_exact_gate"), dict) else {}
    command = action.get("command") if not issues else None
    return {
        "schema": "ghostclaw.a2a2a.operator_approval_check.v1",
        "packet_id": "A2A2A-P113-ORCHESTRATOR-EXACT-GATE-APPROVAL-CHECK-20260703",
        "status": "accepted_exact_gate_ready" if not issues else "rejected_or_not_ready",
        "mode": "local_safe_approval_check_no_execution",
        "created_at": now_iso(),
        "selected_packet": card.get("selected_packet"),
        "selected_packet_path": card.get("selected_packet_path"),
        "exact_gate_expected": expected,
        "approval_text_present": bool(provided),
        "approval_text_matches_exact_gate": bool(provided and expected and provided == expected),
        "issues": issues,
        "action_after_approval": {
            "kind": "write_local_worker_envelopes_only",
            "command": command,
            "would_execute": False,
            "requires_separate_dispatch_command": True,
        },
        "external_actions_performed": card.get("external_actions_performed"),
        "blocked_actions_preserved": card.get("blocked_actions_preserved"),
        "next_safe_action": (
            "Run the listed local worker-envelope command only in the explicitly gated dispatch step."
            if not issues
            else "Do not dispatch. Resolve approval/readiness issues first."
        ),
    }


def find_packet074_worker_state(root: Path, sequence: str | None) -> dict[str, Any]:
    packet_pattern = f"*packet_{sequence}*" if sequence else "*packet_*"
    envelopes: dict[str, list[str]] = {}
    receipts: dict[str, list[str]] = {}
    outbox_records: dict[str, list[str]] = {}
    for target in ("hermes", "kob"):
        inbox = root / ".ghostclaw_runtime" / "a2a2a" / "inbox" / target
        envelopes[target] = [rel(root, path) for path in sorted(inbox.glob(packet_pattern))]
    receipt_root = root / ".ghostclaw_runtime" / "a2a2a" / "receipts"
    outbox_root = root / ".ghostclaw_runtime" / "a2a2a" / "outbox"
    receipts["hermes"] = [rel(root, path) for path in sorted(receipt_root.glob(f"hermes_route_*packet_{sequence}*hermes*.json"))] if sequence else []
    receipts["kob"] = [rel(root, path) for path in sorted(receipt_root.glob(f"kob_verdict_*packet_{sequence}*kob*.json"))] if sequence else []
    outbox_records["hermes"] = [rel(root, path) for path in sorted((outbox_root / "hermes").glob(f"hermes_route_*packet_{sequence}*hermes*.json"))] if sequence else []
    outbox_records["kob"] = [rel(root, path) for path in sorted((outbox_root / "kob").glob(f"kob_verdict_*packet_{sequence}*kob*.json"))] if sequence else []
    return {"envelopes": envelopes, "receipts": receipts, "outbox_records": outbox_records}


def build_role_worker_ack_action_card(root: Path, plan: dict[str, Any], current_next_gate_path: str | None) -> dict[str, Any]:
    """Return one gate-ready card for local Hermes/KOB ack-only processing."""
    current_path, current_gate = load_optional_json(root, current_next_gate_path)
    if current_gate_is_completed(current_gate):
        current_gate_block = (
            current_gate.get("current_next_gate")
            if isinstance(current_gate, dict) and isinstance(current_gate.get("current_next_gate"), dict)
            else {}
        )
        current_orchestrator = (
            current_gate.get("current_orchestrator")
            if isinstance(current_gate, dict) and isinstance(current_gate.get("current_orchestrator"), dict)
            else {}
        )
        selected_packet = (
            current_gate.get("selected_packet") if isinstance(current_gate, dict) else None
        ) or current_orchestrator.get("selected_packet")
        selected_path = (
            current_gate.get("selected_packet_path") if isinstance(current_gate, dict) else None
        ) or current_orchestrator.get("selected_packet_path")
        selected_sequence = (
            current_gate.get("selected_packet_sequence") if isinstance(current_gate, dict) else None
        ) or packet_sequence({"id": selected_packet, "path": selected_path})
        exact_gate = current_gate_block.get("exact_phrase")
        worker_state = find_packet074_worker_state(root, selected_sequence)
        ack_receipt_count = sum(len(worker_state["receipts"].get(target, [])) for target in ("hermes", "kob"))
        issues = ["role_worker_ack_already_completed"]
        if ack_receipt_count:
            issues.append("role_worker_ack_already_present")
        else:
            issues.append("ack_receipts_missing_for_completed_gate")
        gate_packet_id = ROLE_WORKER_ACK_GATE_BY_SEQUENCE.get(selected_sequence or "", "P114")
        return {
            "schema": "ghostclaw.a2a2a.role_worker_ack_action_card.v1",
            "packet_id": f"A2A2A-{gate_packet_id}-ORCHESTRATOR-PACKET{selected_sequence}-ROLE-WORKER-ACK-GATE-20260703"
            if selected_sequence
            else "A2A2A-P114-ORCHESTRATOR-ROLE-WORKER-ACK-GATE-20260703",
            "status": "ack_gate_complete_no_action",
            "mode": "local_safe_role_worker_ack_card_no_execution",
            "created_at": now_iso(),
            "repo": plan["repo"],
            "selected_packet": selected_packet,
            "selected_packet_path": selected_path,
            "selected_packet_sequence": selected_sequence,
            "exact_gate_phrase": exact_gate,
            "current_next_gate_path": rel(root, current_path) if current_path else current_next_gate_path,
            "worker_state": worker_state,
            "issues": issues,
            "commands_after_exact_gate": {"hermes": None, "kob": None},
            "combined_command_after_exact_gate": None,
            "validation_commands": [
                f"find .ghostclaw_runtime/a2a2a/receipts -maxdepth 1 -name '*packet_{selected_sequence}*' -print"
                if selected_sequence
                else "find .ghostclaw_runtime/a2a2a/receipts -maxdepth 1 -name '*packet_*' -print",
                "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --compact",
                "node scripts/secret-scan.mjs",
            ],
            "stop_conditions": [
                "do not rerun completed role-worker ack",
                "any worker loop/start request",
                "any queue payload execution request",
                "any live/provider/install/push/deploy/cloud/secret action required",
            ],
            "external_actions_performed": {
                "role_worker_ack_write": False,
                "worker_loop_start": False,
                "queue_payload_execution": False,
                "telegram_live_send": False,
                "provider_call": False,
                "repo_or_customer_data_external_routing": False,
                "secret_read_or_print": False,
                "install": False,
                "commit": False,
                "push": False,
                "deploy": False,
                "cloudflare_or_r2_mutation": False,
            },
            "blocked_actions_preserved": plan["blocked_actions_preserved"],
            "next_safe_action": "Do not run role workers again; ACK gate is complete. Run compact status or refresh active-focus queue.",
        }
    operator_card = build_operator_action_card(root, plan, current_next_gate_path)
    selected_packet = operator_card.get("selected_packet")
    selected_path = operator_card.get("selected_packet_path")
    selected_sequence = operator_card.get("selected_packet_sequence") or packet_sequence(
        {"id": selected_packet, "path": selected_path}
    )
    worker_state = find_packet074_worker_state(root, selected_sequence)
    issues: list[str] = []
    for target in ("hermes", "kob"):
        if not worker_state["envelopes"].get(target):
            issues.append(f"missing_worker_envelope:{target}")
    ack_receipt_count = sum(len(worker_state["receipts"].get(target, [])) for target in ("hermes", "kob"))
    if ack_receipt_count:
        issues.append("role_worker_ack_already_present")
    gate_packet_id = ROLE_WORKER_ACK_GATE_BY_SEQUENCE.get(selected_sequence or "", "P114")
    exact_gate = f"APPROVE_A2A2A_{gate_packet_id}_PACKET{selected_sequence}_LOCAL_ROLE_WORKER_ACK_ONLY" if selected_sequence else None
    if not exact_gate:
        issues.append("missing_selected_packet_sequence")
    status = "ready_for_exact_ack_gate" if not issues else "blocked_or_already_acknowledged"
    commands: dict[str, str | None] = {}
    for target in ("hermes", "kob"):
        envelope = (worker_state["envelopes"].get(target) or [None])[0]
        commands[target] = (
            f"python3 scripts/ghostclaw_a2a_role_worker.py --agent {target} --packet {envelope} --once"
            if status == "ready_for_exact_ack_gate" and envelope
            else None
        )
    return {
        "schema": "ghostclaw.a2a2a.role_worker_ack_action_card.v1",
        "packet_id": f"A2A2A-{gate_packet_id}-ORCHESTRATOR-PACKET{selected_sequence}-ROLE-WORKER-ACK-GATE-20260703"
        if selected_sequence
        else "A2A2A-P114-ORCHESTRATOR-ROLE-WORKER-ACK-GATE-20260703",
        "status": status,
        "mode": "local_safe_role_worker_ack_card_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "selected_packet": selected_packet,
        "selected_packet_path": selected_path,
        "selected_packet_sequence": selected_sequence,
        "exact_gate_phrase": exact_gate,
        "worker_state": worker_state,
        "issues": issues,
        "commands_after_exact_gate": commands,
        "combined_command_after_exact_gate": " && ".join(command for command in commands.values() if command)
        if status == "ready_for_exact_ack_gate"
        else None,
        "validation_commands": [
            f"find .ghostclaw_runtime/a2a2a/receipts -maxdepth 1 -name '*packet_{selected_sequence}*' -print"
            if selected_sequence
            else "find .ghostclaw_runtime/a2a2a/receipts -maxdepth 1 -name '*packet_*' -print",
            "python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_ghostclaw_a2a_role_worker",
            "node scripts/secret-scan.mjs",
            (
                "git diff --check -- scripts/ghostclaw_a2a_agent_orchestrator.py "
                "WORKSPACE_SCAFFOLD/tests/test_ghostclaw_a2a_agent_orchestrator.py"
            ),
        ],
        "stop_conditions": [
            "missing Hermes worker envelope",
            "missing KOB worker envelope",
            "role worker ack already exists",
            "any worker loop/start request",
            "any queue payload execution request",
            "any live/provider/install/push/deploy/cloud/secret action required",
        ],
        "external_actions_performed": {
            "role_worker_ack_write": False,
            "worker_loop_start": False,
            "queue_payload_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            f"Provide {exact_gate} only if Hermes and KOB should write local ack receipts once."
            if status == "ready_for_exact_ack_gate"
            else "Do not run role workers; resolve ack readiness issues first."
        ),
    }


def build_role_worker_ack_gate(card: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.local_role_worker_ack_gate.v1",
        "packet_id": f"{card.get('packet_id')}-LOCAL-GATE",
        "status": "awaiting_exact_ack_gate" if card.get("status") == "ready_for_exact_ack_gate" else "blocked_or_already_acknowledged",
        "created_at": now_iso(),
        "required_approval": card.get("exact_gate_phrase"),
        "selected_packet": card.get("selected_packet"),
        "selected_packet_path": card.get("selected_packet_path"),
        "allowed_scope": (
            f"run Hermes and KOB local role workers once for packet_{card.get('selected_packet_sequence')} "
            "inbox envelopes only"
        ),
        "commands_after_exact_gate": card.get("commands_after_exact_gate"),
        "blocked_scope": [
            "worker loop/start",
            "queue payload execution",
            "Telegram live send",
            "provider/model call",
            "external routing",
            "secret read/print",
            "install",
            "commit",
            "push",
            "deploy",
            "Cloudflare/R2 mutation",
        ],
        "issues": card.get("issues", []),
    }


def default_role_worker_ack_gate_output(card: dict[str, Any]) -> str:
    exact_gate = str(card.get("exact_gate_phrase") or "")
    match = re.match(r"APPROVE_A2A2A_(P\d+)_PACKET(\d+)_LOCAL_ROLE_WORKER_ACK_ONLY$", exact_gate)
    if not match:
        return DEFAULT_ACK_GATE_OUTPUT
    gate_packet_id, sequence = match.groups()
    return f".ghostclaw_runtime/a2a2a/gates/A2A2A-{gate_packet_id}-PACKET{sequence}-LOCAL-ROLE-WORKER-ACK.gate.json"


def role_worker_ack_gate_parts(card: dict[str, Any]) -> tuple[str, str] | None:
    exact_gate = str(card.get("exact_gate_phrase") or "")
    match = re.match(r"APPROVE_A2A2A_(P\d+)_PACKET(\d+)_LOCAL_ROLE_WORKER_ACK_ONLY$", exact_gate)
    return match.groups() if match else None


def render_role_worker_ack_brief(card: dict[str, Any]) -> str:
    issue_lines = "\n".join(f"- `{issue}`" for issue in card.get("issues", [])) if card.get("issues") else "- none"
    command_lines = "\n".join(
        f"{target}: `{command or 'BLOCKED'}`" for target, command in sorted((card.get("commands_after_exact_gate") or {}).items())
    )
    validation_lines = "\n".join(f"- `{command}`" for command in card.get("validation_commands", []))
    return (
        "# A2A2A Role Worker Ack Brief\n\n"
        f"- Status: `{card.get('status')}`\n"
        f"- Selected packet: `{card.get('selected_packet')}`\n"
        f"- Exact gate required: `{card.get('exact_gate_phrase')}`\n"
        f"- Hermes envelope: `{(card.get('worker_state') or {}).get('envelopes', {}).get('hermes', [])}`\n"
        f"- KOB envelope: `{(card.get('worker_state') or {}).get('envelopes', {}).get('kob', [])}`\n\n"
        "## Issues\n\n"
        f"{issue_lines}\n\n"
        "## Commands After Exact Gate Only\n\n"
        f"{command_lines}\n\n"
        "## Validation Commands\n\n"
        f"{validation_lines}\n\n"
        "No role worker ack, worker loop/start, payload execution, live send, provider call, install, commit, push, deploy, secret read/print, or Cloudflare/R2 mutation is performed by this brief.\n"
    )


def build_role_worker_ack_approval_check(card: dict[str, Any], approval_text: str | None) -> dict[str, Any]:
    """Validate a role-worker ack approval phrase without running workers."""
    provided = (approval_text or "").strip()
    expected = (card.get("exact_gate_phrase") or "").strip()
    issues: list[str] = []
    if not provided:
        issues.append("approval_text_missing")
    if not expected:
        issues.append("expected_gate_missing")
    if provided and expected and provided != expected:
        issues.append("approval_text_does_not_match_exact_ack_gate")
    upper_provided = provided.upper()
    if provided and (
        "APPROVE_ALL" in upper_provided
        or "FULL_AUTO" in upper_provided
        or "GODMODE" in upper_provided
        or "GOD_MODE" in upper_provided
        or re.search(r"อนุญาต.*ทั้งหมด", provided)
    ):
        issues.append("blanket_approval_rejected")
    if card.get("status") == "ack_gate_complete_no_action":
        if "role_worker_ack_already_completed" not in issues:
            issues.append("role_worker_ack_already_completed")
        gate_parts = role_worker_ack_gate_parts(card)
        packet_id = (
            f"A2A2A-{gate_parts[0]}-ORCHESTRATOR-PACKET{gate_parts[1]}-ACK-APPROVAL-CHECK-20260703"
            if gate_parts
            else "A2A2A-P115-ORCHESTRATOR-ACK-APPROVAL-CHECK-20260703"
        )
        duplicate_exact_match = bool(provided and expected and provided == expected and "blanket_approval_rejected" not in issues)
        return {
            "schema": "ghostclaw.a2a2a.role_worker_ack_approval_check.v1",
            "packet_id": packet_id,
            "status": "rejected_duplicate_ack_already_completed" if duplicate_exact_match else "rejected_or_not_ready",
            "mode": "local_safe_ack_approval_check_no_execution",
            "created_at": now_iso(),
            "selected_packet": card.get("selected_packet"),
            "selected_packet_path": card.get("selected_packet_path"),
            "selected_packet_sequence": card.get("selected_packet_sequence"),
            "exact_gate_expected": expected,
            "approval_text_present": bool(provided),
            "approval_text_matches_exact_gate": bool(provided and expected and provided == expected),
            "issues": issues,
            "action_after_approval": {
                "kind": "run_local_role_worker_ack_once",
                "commands": {"hermes": None, "kob": None},
                "combined_command": None,
                "would_execute": False,
                "requires_separate_dispatch_command": False,
            },
            "external_actions_performed": card.get("external_actions_performed"),
            "blocked_actions_preserved": card.get("blocked_actions_preserved"),
            "next_safe_action": "Do not run role workers. ACK gate is already complete; refresh active-focus queue instead.",
        }
    if card.get("status") != "ready_for_exact_ack_gate":
        issues.append("ack_action_card_not_ready")
    if card.get("issues"):
        issues.append("ack_action_card_has_issues")
    commands = card.get("commands_after_exact_gate", {}) if isinstance(card.get("commands_after_exact_gate"), dict) else {}
    for target in ("hermes", "kob"):
        command = commands.get(target)
        if not isinstance(command, str) or not command.strip():
            issues.append(f"ack_command_missing:{target}")
            continue
        normalized = f" {command.lower()} "
        if not command.startswith(f"python3 scripts/ghostclaw_a2a_role_worker.py --agent {target} --packet "):
            issues.append(f"ack_command_not_local_role_worker:{target}")
        if "--once" not in command or "--loop" in command:
            issues.append(f"ack_command_not_once_only:{target}")
        for token in UNSAFE_COMMAND_TOKENS:
            if token in normalized:
                issues.append(f"ack_command_unsafe_token:{target}:{token.strip()}")
    combined_command = card.get("combined_command_after_exact_gate") if not issues else None
    gate_parts = role_worker_ack_gate_parts(card)
    packet_id = (
        f"A2A2A-{gate_parts[0]}-ORCHESTRATOR-PACKET{gate_parts[1]}-ACK-APPROVAL-CHECK-20260703"
        if gate_parts
        else "A2A2A-P115-ORCHESTRATOR-ACK-APPROVAL-CHECK-20260703"
    )
    return {
        "schema": "ghostclaw.a2a2a.role_worker_ack_approval_check.v1",
        "packet_id": packet_id,
        "status": "accepted_exact_ack_gate_ready" if not issues else "rejected_or_not_ready",
        "mode": "local_safe_ack_approval_check_no_execution",
        "created_at": now_iso(),
        "selected_packet": card.get("selected_packet"),
        "selected_packet_path": card.get("selected_packet_path"),
        "selected_packet_sequence": card.get("selected_packet_sequence"),
        "exact_gate_expected": expected,
        "approval_text_present": bool(provided),
        "approval_text_matches_exact_gate": bool(provided and expected and provided == expected),
        "issues": issues,
        "action_after_approval": {
            "kind": "run_local_role_worker_ack_once",
            "commands": commands if not issues else {"hermes": None, "kob": None},
            "combined_command": combined_command,
            "would_execute": False,
            "requires_separate_dispatch_command": True,
        },
        "external_actions_performed": card.get("external_actions_performed"),
        "blocked_actions_preserved": card.get("blocked_actions_preserved"),
        "next_safe_action": (
            "Run the listed local role-worker ack commands only in the explicitly gated ack step."
            if not issues
            else "Do not run role workers. Resolve ack approval/readiness issues first."
        ),
    }


def selected_packet_context(root: Path, plan: dict[str, Any], current_next_gate_path: str | None) -> dict[str, Any]:
    """Find the packet currently waiting for role-worker ack."""
    current_path, current_gate = load_optional_json(root, current_next_gate_path)
    selected_packet = None
    selected_path = None
    current_exact_gate = None
    current_allowed_scope = None
    current_blocked_scope: list[str] = []
    if isinstance(current_gate, dict):
        current_gate_block = current_gate.get("current_next_gate")
        if isinstance(current_gate_block, dict):
            current_exact_gate = current_gate_block.get("exact_phrase")
            current_allowed_scope = current_gate_block.get("allowed_scope")
            current_blocked_scope = list(current_gate_block.get("blocked_scope", []) or [])
        current_orchestrator = current_gate.get("current_orchestrator")
        if isinstance(current_orchestrator, dict):
            selected_packet = current_orchestrator.get("selected_packet")
            selected_path = current_orchestrator.get("selected_packet_path")
    if not selected_packet:
        queue_drain = plan.get("queue_drain", {}) if isinstance(plan.get("queue_drain"), dict) else {}
        next_ack = queue_drain.get("next_ack_reconcile_packet")
        if isinstance(next_ack, dict):
            selected_packet = next_ack.get("id")
            selected_path = next_ack.get("path")
    if not selected_packet:
        next_packet = plan.get("summary", {}).get("next_packet")
        if isinstance(next_packet, dict):
            selected_packet = next_packet.get("id")
            selected_path = next_packet.get("path")
    selected_sequence = packet_sequence({"id": selected_packet, "path": selected_path})
    selected_path_abs = resolve_under_root(root, str(selected_path)) if selected_path else None
    selected_path_exists = bool(selected_path_abs and selected_path_abs.is_file())
    current_gate_is_queue_replenish = is_queue_replenish_gate(current_exact_gate, selected_path, current_allowed_scope)
    return {
        "selected_packet": selected_packet,
        "selected_packet_path": selected_path,
        "selected_packet_path_exists": selected_path_exists,
        "selected_packet_sequence": selected_sequence,
        "current_next_gate_path": rel(root, current_path) if current_path else None,
        "current_exact_gate_phrase": current_exact_gate,
        "current_allowed_scope": current_allowed_scope,
        "current_blocked_scope": current_blocked_scope,
        "current_gate_is_queue_replenish": current_gate_is_queue_replenish,
    }


def ack_receipt_expected_status(target: str, status: str | None) -> bool:
    if target == "hermes":
        return status in ACKED_HERMES_STATUSES
    return status in ACKED_KOB_STATUSES


def build_ack_target_reconcile(root: Path, sequence: str | None, target: str) -> tuple[dict[str, Any], list[str]]:
    issues: list[str] = []
    latest_packet = latest_worker_packet(root, sequence, target) if sequence else None
    receipt_path = worker_receipt_path(root, sequence, target, latest_packet) if sequence and latest_packet else None
    receipt_exists = bool(receipt_path and receipt_path.is_file())
    receipt_payload: dict[str, Any] | None = None
    receipt_status = "missing"
    receipt_packet_path = None
    receipt_matches_latest_packet = False
    if not sequence:
        issues.append("missing_selected_packet_sequence")
    if latest_packet is None:
        issues.append(f"missing_worker_envelope:{target}")
    if receipt_exists and receipt_path is not None:
        try:
            payload = read_json(receipt_path)
            if isinstance(payload, dict):
                receipt_payload = payload
                receipt_status = str(payload.get("status") or "unknown")
                paths = receipt_packet_paths(payload)
                receipt_packet_path = paths[0] if paths else None
                receipt_matches_latest_packet = bool(
                    latest_packet is not None and receipt_matches_packet(root, payload, latest_packet)
                )
            else:
                receipt_status = "invalid_json_payload"
                issues.append(f"invalid_ack_receipt_json:{target}")
        except (json.JSONDecodeError, OSError):
            receipt_status = "invalid_json"
            issues.append(f"invalid_ack_receipt_json:{target}")
    else:
        issues.append(f"missing_ack_receipt:{target}")
    if receipt_exists:
        if not ack_receipt_expected_status(target, receipt_status):
            issues.append(f"ack_receipt_status_unexpected:{target}:{receipt_status}")
        if latest_packet is not None and not receipt_matches_latest_packet:
            issues.append(f"ack_receipt_stale_or_mismatch:{target}")
    return (
        {
            "target": target,
            "latest_worker_packet": rel(root, latest_packet) if latest_packet else None,
            "latest_worker_packet_sha256": sha256_file(latest_packet) if latest_packet else None,
            "expected_receipt": rel(root, receipt_path) if receipt_path else None,
            "receipt_exists": receipt_exists,
            "receipt_status": receipt_status,
            "receipt_packet_path": receipt_packet_path,
            "receipt_matches_latest_packet": receipt_matches_latest_packet,
            "receipt_schema": receipt_payload.get("schema") if receipt_payload else None,
            "ack_complete": bool(
                receipt_exists
                and latest_packet is not None
                and ack_receipt_expected_status(target, receipt_status)
                and receipt_matches_latest_packet
            ),
        },
        issues,
    )


def build_role_worker_ack_reconcile(root: Path, plan: dict[str, Any], current_next_gate_path: str | None) -> dict[str, Any]:
    """Inspect Hermes/KOB ack receipts and decide whether selection may continue."""
    context = selected_packet_context(root, plan, current_next_gate_path)
    sequence = context.get("selected_packet_sequence")
    sequence_label = str(sequence or "unknown")
    targets: list[dict[str, Any]] = []
    issues: list[str] = []
    queue_replenish_pending = bool(
        context.get("current_gate_is_queue_replenish") and not context.get("selected_packet_path_exists")
    )
    if queue_replenish_pending:
        issues.extend(["selected_queue_packet_absent", "current_gate_is_queue_replenish_not_ack_gate"])
        status = "ack_not_applicable_queue_replenish_pending"
        return {
            "schema": "ghostclaw.a2a2a.role_worker_ack_reconcile.v1",
            "packet_id": f"A2A2A-P117-ORCHESTRATOR-PACKET{sequence_label}-POST-ACK-RECONCILE-20260703",
            "status": status,
            "mode": "local_safe_post_ack_reconcile_no_execution",
            "created_at": now_iso(),
            "repo": plan["repo"],
            **context,
            "targets": targets,
            "issues": issues,
            "external_actions_performed": {
                "role_worker_ack_write": False,
                "worker_loop_start": False,
                "queue_payload_execution": False,
                "telegram_live_send": False,
                "provider_call": False,
                "repo_or_customer_data_external_routing": False,
                "secret_read_or_print": False,
                "install": False,
                "commit": False,
                "push": False,
                "deploy": False,
                "cloudflare_or_r2_mutation": False,
            },
            "blocked_actions_preserved": plan["blocked_actions_preserved"],
            "next_safe_action": (
                "Wait for the exact queue-replenish gate before any role-worker envelope or ACK gate."
            ),
        }
    for target in ("hermes", "kob"):
        record, target_issues = build_ack_target_reconcile(root, sequence, target)
        targets.append(record)
        issues.extend(target_issues)
    missing_ack = [issue for issue in issues if issue.startswith("missing_ack_receipt:")]
    missing_envelope = [issue for issue in issues if issue.startswith("missing_worker_envelope:")]
    blocking_issues = [
        issue
        for issue in issues
        if not issue.startswith("missing_ack_receipt:") and not issue.startswith("missing_worker_envelope:")
    ]
    complete = all(record.get("ack_complete") for record in targets)
    if complete and not issues:
        status = "ack_complete_ready_for_next_selection"
    elif missing_ack and len(missing_ack) == 2 and not blocking_issues and not missing_envelope:
        status = "waiting_for_role_worker_ack"
    elif missing_ack and not blocking_issues and not missing_envelope:
        status = "partial_ack_waiting_for_remaining_role_worker"
    else:
        status = "ack_reconcile_blocked"
    return {
        "schema": "ghostclaw.a2a2a.role_worker_ack_reconcile.v1",
        "packet_id": f"A2A2A-P117-ORCHESTRATOR-PACKET{sequence_label}-POST-ACK-RECONCILE-20260703",
        "status": status,
        "mode": "local_safe_post_ack_reconcile_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        **context,
        "targets": targets,
        "issues": issues,
        "external_actions_performed": {
            "role_worker_ack_write": False,
            "worker_loop_start": False,
            "queue_payload_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            "Run orchestrator compact status to select the next active-focus packet."
            if status == "ack_complete_ready_for_next_selection"
            else f"Run the one-shot ack dispatch with the exact ack gate for packet_{sequence_label} if local ack receipts should be written."
            if status in {"waiting_for_role_worker_ack", "partial_ack_waiting_for_remaining_role_worker"}
            else "Inspect worker envelopes and ack receipts before any next selection."
        ),
    }


def build_receipt(plan: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.agent_orchestrator_receipt.v1",
        "packet_id": PACKET_ID,
        "status": "implemented_local_safe_dry_run_orchestrator",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "evidence_path": evidence_path,
        "summary": plan["summary"],
        "lane_assignments": plan["lane_assignments"],
        "guardrails": plan["guardrails"],
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "completion_claim": "P077 local dry-run orchestrator implemented and evidence generated; no live execution performed",
        "next_safe_action": plan["next_safe_action"],
    }


def build_ack_reconcile_receipt(reconcile: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    selected_sequence = reconcile.get("selected_packet_sequence") or "unknown"
    return {
        "schema": "ghostclaw.a2a2a.role_worker_ack_reconcile_receipt.v1",
        "packet_id": reconcile["packet_id"],
        "status": "recorded_post_ack_reconcile_status",
        "reconcile_status": reconcile["status"],
        "created_at": now_iso(),
        "repo": reconcile["repo"],
        "evidence_path": evidence_path,
        "selected_packet": reconcile.get("selected_packet"),
        "selected_packet_path": reconcile.get("selected_packet_path"),
        "selected_packet_sequence": reconcile.get("selected_packet_sequence"),
        "issues": reconcile.get("issues", []),
        "external_actions_performed": reconcile["external_actions_performed"],
        "blocked_actions_preserved": reconcile["blocked_actions_preserved"],
        "completion_claim": f"Local post-ack reconcile status recorded for packet_{selected_sequence}; no role-worker ack executed by reconcile.",
        "next_safe_action": reconcile["next_safe_action"],
    }


def build_role_worker_ack_debug(root: Path, plan: dict[str, Any], current_next_gate_path: str | None) -> dict[str, Any]:
    """Return one compact no-execution status for selected-packet ack debugging."""
    reconcile = build_role_worker_ack_reconcile(root, plan, current_next_gate_path)
    card = build_role_worker_ack_action_card(root, plan, current_next_gate_path)
    current_path, current_gate = load_optional_json(root, current_next_gate_path)
    current_next_gate = (
        current_gate.get("current_next_gate")
        if isinstance(current_gate, dict) and not current_gate_is_completed(current_gate)
        else {}
    )
    if not isinstance(current_next_gate, dict):
        current_next_gate = {}
    missing_targets = [record["target"] for record in reconcile["targets"] if not record.get("ack_complete")]
    selected_sequence = str(reconcile.get("selected_packet_sequence") or "unknown")
    exact_gate = card.get("exact_gate_phrase") or current_next_gate.get("exact_phrase")
    completed_exact_gate = None
    p116_execute_command = current_next_gate.get("p116_execute_command")
    if not p116_execute_command and card.get("combined_command_after_exact_gate"):
        p116_execute_command = card.get("combined_command_after_exact_gate")
    if reconcile["status"] == "ack_complete_ready_for_next_selection":
        status = "ack_complete_ready_for_next_selection"
        next_safe_action = "Run compact orchestrator status to select the next active-focus packet."
        completed_exact_gate = exact_gate
        exact_gate = None
        p116_execute_command = None
        debug_issues = list(reconcile.get("issues", []))
    elif reconcile["status"] == "ack_not_applicable_queue_replenish_pending":
        status = "ack_not_applicable_queue_replenish_pending"
        exact_gate = reconcile.get("current_exact_gate_phrase")
        p116_execute_command = None
        next_safe_action = "Wait for the exact queue-replenish gate before any ACK gate."
        debug_issues = list(reconcile.get("issues", []))
    elif card.get("status") == "ready_for_exact_ack_gate" and reconcile["status"] in {
        "waiting_for_role_worker_ack",
        "partial_ack_waiting_for_remaining_role_worker",
    }:
        status = "ready_for_exact_ack_gate"
        next_safe_action = f"Provide {exact_gate} only if local Hermes/KOB ack receipts should be written once."
        debug_issues = sorted(set(reconcile.get("issues", []) + card.get("issues", [])))
    else:
        status = "blocked_or_needs_inspection"
        next_safe_action = "Inspect ack card, worker envelopes, and reconcile issues before running any ack command."
        debug_issues = sorted(set(reconcile.get("issues", []) + card.get("issues", [])))
    ack_allowed_scope = f"write local Hermes/KOB role-worker ACK receipts once for packet_{selected_sequence} inbox envelopes only"
    ack_blocked_scope = [
        "worker loop/start",
        "queue payload execution",
        "Telegram live send",
        "provider/model call",
        "repo/customer data external routing",
        "secret read/print",
        "install",
        "commit",
        "push",
        "deploy",
        "Cloudflare/R2 mutation",
    ]
    return {
        "schema": "ghostclaw.a2a2a.role_worker_ack_debug.v1",
        "packet_id": f"A2A2A-P118-PACKET{selected_sequence}-ROLE-WORKER-ACK-DEBUG-20260703",
        "status": status,
        "mode": "local_safe_compact_ack_debug_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "selected_packet": reconcile.get("selected_packet"),
        "selected_packet_path": reconcile.get("selected_packet_path"),
        "selected_packet_sequence": reconcile.get("selected_packet_sequence"),
        "current_next_gate_path": rel(root, current_path) if current_path else None,
        "ack_reconcile_status": reconcile["status"],
        "ack_action_card_status": card.get("status"),
        "completed_exact_gate_phrase": completed_exact_gate,
        "missing_targets": missing_targets,
        "issues": debug_issues,
        "targets": [
            {
                "target": record["target"],
                "ack_complete": record["ack_complete"],
                "latest_worker_packet": record["latest_worker_packet"],
                "latest_worker_packet_sha256": record["latest_worker_packet_sha256"],
                "expected_receipt": record["expected_receipt"],
                "receipt_status": record["receipt_status"],
                "receipt_matches_latest_packet": record["receipt_matches_latest_packet"],
            }
            for record in reconcile["targets"]
        ],
        "next_exact_gate": {
            "phrase": exact_gate,
            "allowed_scope": (
                None
                if status == "ack_complete_ready_for_next_selection"
                else reconcile.get("current_allowed_scope")
                if status == "ack_not_applicable_queue_replenish_pending"
                else ack_allowed_scope
            ),
            "does_not_allow": []
            if status == "ack_complete_ready_for_next_selection"
            else reconcile.get("current_blocked_scope", [])
            if status == "ack_not_applicable_queue_replenish_pending"
            else ack_blocked_scope,
        },
        "command_preview_after_exact_gate_only": {
            "p116_one_shot_dispatch": p116_execute_command,
            "would_execute_now": False,
        },
        "telegram_safe_draft": (
            f"A2A2A packet_{selected_sequence} ack debug: "
            f"status={status}; reconcile={reconcile['status']}; missing={','.join(missing_targets) or 'none'}; "
            f"next_gate={exact_gate}. No live send/provider/deploy/cloud action performed."
        ),
        "external_actions_performed": reconcile["external_actions_performed"],
        "blocked_actions_preserved": reconcile["blocked_actions_preserved"],
        "next_safe_action": next_safe_action,
    }


def build_ack_debug_receipt(debug: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.role_worker_ack_debug_receipt.v1",
        "packet_id": debug["packet_id"],
        "status": "recorded_compact_ack_debug_status",
        "ack_debug_status": debug["status"],
        "created_at": now_iso(),
        "repo": debug["repo"],
        "evidence_path": evidence_path,
        "selected_packet": debug.get("selected_packet"),
        "selected_packet_path": debug.get("selected_packet_path"),
        "missing_targets": debug.get("missing_targets", []),
        "next_exact_gate": debug.get("next_exact_gate", {}).get("phrase"),
        "external_actions_performed": debug["external_actions_performed"],
        "blocked_actions_preserved": debug["blocked_actions_preserved"],
        "completion_claim": "P118 compact ack debug status recorded; no role-worker ack executed",
        "next_safe_action": debug["next_safe_action"],
    }


def build_post_ack_current_gate_complete(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
    backup_output: str,
) -> dict[str, Any]:
    """Mark the persisted gate complete after local ACK receipts match the latest worker envelopes."""
    reconcile = build_role_worker_ack_reconcile(root, plan, current_next_gate_path)
    current_path, _current_gate = load_optional_json(root, current_next_gate_path)
    selected_sequence = str(reconcile.get("selected_packet_sequence") or "unknown")
    gate_packet_id = ROLE_WORKER_ACK_GATE_BY_SEQUENCE.get(selected_sequence)
    completed_exact_gate = (
        f"APPROVE_A2A2A_{gate_packet_id}_PACKET{selected_sequence}_LOCAL_ROLE_WORKER_ACK_ONLY"
        if gate_packet_id and selected_sequence != "unknown"
        else None
    )
    issues: list[str] = []
    if reconcile.get("status") != "ack_complete_ready_for_next_selection":
        issues.append(f"ack_reconcile_not_complete:{reconcile.get('status')}")
    if not completed_exact_gate:
        issues.append("missing_completed_exact_gate")
    if not current_path or not current_path.is_file():
        issues.append("current_next_gate_missing")

    completion_status = (
        f"{gate_packet_id.lower()}_ack_gate_complete_next_ready_for_orchestrator_selection"
        if gate_packet_id
        else "ack_gate_complete_next_ready_for_orchestrator_selection"
    )
    current_next_gate_payload = {
        "schema": "ghostclaw.a2a2a.current_next_gate.v1",
        "status": completion_status,
        "updated_at": now_iso(),
        "selected_packet": reconcile.get("selected_packet"),
        "selected_packet_path": reconcile.get("selected_packet_path"),
        "selected_packet_sequence": selected_sequence,
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
        "current_next_gate": {
            "status": completion_status,
            "exact_phrase": completed_exact_gate,
            "allowed_scope": (
                f"write local Hermes/KOB role-worker ACK receipts once for packet_{selected_sequence} inbox envelopes only"
            ),
            "blocked_scope": [
                "worker loop/start",
                "queue payload execution",
                "Telegram live send",
                "provider/model call",
                "repo/customer data external routing",
                "secret read/print",
                "install",
                "commit",
                "push",
                "deploy",
                "Cloudflare/R2 mutation",
            ],
        },
        "current_orchestrator": {
            "status": f"packet_{selected_sequence}_ack_gate_complete_next_ready_for_orchestrator_selection",
            "selected_packet": reconcile.get("selected_packet"),
            "selected_packet_path": reconcile.get("selected_packet_path"),
            "ack_reconcile_status": reconcile.get("status"),
            "queue_drain": {
                "status": "ack_complete_ready_for_next_selection",
            },
        },
        "source_artifacts": {
            "post_ack_reconcile_status": reconcile.get("status"),
            "backup_previous_current_next_gate": backup_output,
        },
        "next_safe_action": "Run compact orchestrator status to select the next active-focus packet.",
    }
    if issues:
        current_next_gate_payload = {}
    return {
        "schema": "ghostclaw.a2a2a.post_ack_current_gate_complete.v1",
        "packet_id": f"A2A2A-P164-PACKET{selected_sequence}-POST-ACK-CURRENT-GATE-COMPLETE-20260704",
        "status": "ack_gate_complete_next_ready_for_orchestrator_selection" if not issues else "blocked_post_ack_current_gate_complete",
        "mode": "local_safe_post_ack_current_gate_complete_pointer_update_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "active_focus": plan["active_focus"],
        "paused_focus": plan["paused_focus"],
        "current_next_gate_path": current_next_gate_path or DEFAULT_CURRENT_NEXT_GATE,
        "backup_path": backup_output if current_path and current_path.is_file() else None,
        "previous_current_next_gate_path": rel(root, current_path) if current_path else None,
        "previous_current_next_gate_sha256": sha256_file(current_path) if current_path and current_path.is_file() else None,
        "selected_packet": reconcile.get("selected_packet"),
        "selected_packet_path": reconcile.get("selected_packet_path"),
        "selected_packet_sequence": selected_sequence,
        "completed_exact_gate_phrase": completed_exact_gate,
        "ack_reconcile_status": reconcile.get("status"),
        "targets": reconcile.get("targets", []),
        "current_next_gate_payload": current_next_gate_payload,
        "issues": issues,
        "external_actions_performed": local_safe_external_actions(),
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            "Run compact orchestrator status to select the next active-focus packet."
            if not issues
            else "Do not mark current gate complete. Resolve ACK reconcile issues first."
        ),
        "telegram_safe_draft": (
            f"A2A2A P164 packet_{selected_sequence}: ACK complete and current gate marked complete; "
            "next selection can run. No live send/provider/deploy/cloud action performed."
            if not issues
            else f"A2A2A P164 current gate complete blocked: issues={issues}."
        ),
    }


def build_post_ack_current_gate_complete_receipt(complete: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.post_ack_current_gate_complete_receipt.v1",
        "packet_id": complete["packet_id"],
        "status": "recorded_post_ack_current_gate_complete",
        "complete_status": complete["status"],
        "created_at": now_iso(),
        "repo": complete["repo"],
        "evidence_path": evidence_path,
        "current_next_gate_path": complete.get("current_next_gate_path"),
        "backup_path": complete.get("backup_path"),
        "selected_packet": complete.get("selected_packet"),
        "selected_packet_path": complete.get("selected_packet_path"),
        "selected_packet_sequence": complete.get("selected_packet_sequence"),
        "completed_exact_gate_phrase": complete.get("completed_exact_gate_phrase"),
        "ack_reconcile_status": complete.get("ack_reconcile_status"),
        "issues": complete.get("issues", []),
        "external_actions_performed": complete["external_actions_performed"],
        "blocked_actions_preserved": complete["blocked_actions_preserved"],
        "completion_claim": "Post-ACK current gate completion recorded; no queue payload or external action executed.",
        "next_safe_action": complete["next_safe_action"],
    }


def build_phase_guard_summary(root: Path, plan: dict[str, Any], current_next_gate_path: str | None) -> dict[str, Any]:
    """Return one phase-aware lane guard for sidebar/team orchestration."""
    compact = build_compact_plan(plan)
    overlay = build_current_gate_overlay(root, current_next_gate_path)
    apply_current_gate_overlay(compact, overlay)
    ack_debug = build_role_worker_ack_debug(root, plan, current_next_gate_path)
    selected_packet = (
        (overlay or {}).get("selected_packet")
        or ack_debug.get("selected_packet")
        or (compact.get("summary", {}).get("next_packet") or {}).get("id")
    )
    selected_path = (
        (overlay or {}).get("selected_packet_path")
        or ack_debug.get("selected_packet_path")
        or (compact.get("summary", {}).get("next_packet") or {}).get("path")
    )
    selected_path_exists = bool((overlay or {}).get("selected_packet_path_exists"))
    selected_sequence = (
        (overlay or {}).get("selected_packet_sequence")
        or ack_debug.get("selected_packet_sequence")
        or packet_sequence({"id": selected_packet, "path": selected_path})
    )
    current_exact_gate = (overlay or {}).get("exact_gate_phrase") or ack_debug.get("next_exact_gate", {}).get("phrase")
    current_allowed_scope = (overlay or {}).get("allowed_scope") or ack_debug.get("next_exact_gate", {}).get("allowed_scope")
    current_gate_is_queue_replenish = bool(
        overlay and is_queue_replenish_gate(current_exact_gate, selected_path, current_allowed_scope)
    )

    if current_gate_is_queue_replenish and not selected_path_exists:
        current_phase = "queue_replenish_pending"
        next_safe_action = "Wait for the exact queue-replenish gate before queue write, worker envelope, or ACK lanes."
        phase_locks = {
            "queue_replenish": {
                "state": "ready_for_exact_gate",
                "exact_gate": current_exact_gate,
                "target_path": selected_path,
                "target_path_exists": False,
            },
            "worker_envelope": {
                "state": "blocked_until_queue_packet_exists",
                "allowed_now": False,
            },
            "role_worker_ack": {
                "state": "blocked_until_queue_packet_and_worker_envelopes_exist",
                "allowed_now": False,
                "exact_gate": None,
            },
        }
        blocked_phase_actions = [
            "worker_envelope_write",
            "role_worker_ack_gate",
            "role_worker_ack_write",
            "queue_payload_execution",
        ]
    elif current_gate_is_queue_replenish and selected_path_exists:
        current_phase = "queue_target_present_reconcile"
        next_safe_action = "Do not rerun queue replenish; reconcile target and open a separate worker-envelope gate."
        phase_locks = {
            "queue_replenish": {
                "state": "superseded_by_existing_target",
                "exact_gate": None,
                "target_path": selected_path,
                "target_path_exists": True,
            },
            "worker_envelope": {
                "state": "requires_separate_exact_gate",
                "allowed_now": False,
            },
            "role_worker_ack": {
                "state": "blocked_until_worker_envelopes_exist",
                "allowed_now": False,
                "exact_gate": None,
            },
        }
        blocked_phase_actions = ["role_worker_ack_gate", "role_worker_ack_write", "queue_payload_execution"]
    elif ack_debug.get("status") == "ready_for_exact_ack_gate":
        current_phase = "role_worker_ack_pending"
        next_safe_action = ack_debug.get("next_safe_action")
        phase_locks = {
            "queue_replenish": {"state": "not_applicable", "exact_gate": None},
            "worker_envelope": {"state": "complete_or_present", "allowed_now": False},
            "role_worker_ack": {
                "state": "ready_for_exact_gate",
                "allowed_now": False,
                "exact_gate": ack_debug.get("next_exact_gate", {}).get("phrase"),
            },
        }
        blocked_phase_actions = ["queue_payload_execution"]
    elif ack_debug.get("status") == "ack_complete_ready_for_next_selection":
        current_phase = "ack_complete_ready_for_next_selection"
        next_safe_action = "Run compact orchestrator status to select the next active-focus packet."
        phase_locks = {
            "queue_replenish": {"state": "not_applicable", "exact_gate": None},
            "worker_envelope": {"state": "not_applicable", "allowed_now": False},
            "role_worker_ack": {"state": "complete", "allowed_now": False, "exact_gate": None},
        }
        blocked_phase_actions = ["queue_payload_execution"]
    else:
        current_phase = str(compact.get("queue_drain", {}).get("status") or ack_debug.get("status") or "unknown")
        next_safe_action = compact.get("next_safe_action") or ack_debug.get("next_safe_action")
        phase_locks = {
            "queue_replenish": {"state": "inspect_required", "exact_gate": current_exact_gate},
            "worker_envelope": {"state": "inspect_required", "allowed_now": False},
            "role_worker_ack": {
                "state": ack_debug.get("status") or "inspect_required",
                "allowed_now": False,
                "exact_gate": ack_debug.get("next_exact_gate", {}).get("phrase"),
            },
        }
        blocked_phase_actions = ["queue_payload_execution"]

    invariant_violations: list[str] = []
    ack_gate_phrase = phase_locks.get("role_worker_ack", {}).get("exact_gate")
    if current_phase == "queue_replenish_pending" and ack_gate_phrase:
        invariant_violations.append("ack_gate_visible_before_queue_packet_exists")
    if current_phase == "queue_replenish_pending" and selected_path_exists:
        invariant_violations.append("queue_replenish_pending_but_target_exists")
    if ack_debug.get("command_preview_after_exact_gate_only", {}).get("would_execute_now"):
        invariant_violations.append("ack_debug_would_execute_now")
    next_safe_action_text = str(next_safe_action or "").rstrip(".")

    return {
        "schema": "ghostclaw.a2a2a.phase_guard_summary.v1",
        "packet_id": "A2A2A-P148-PACKET077-PHASE-GUARD-SUMMARY-20260704",
        "status": "pass" if not invariant_violations else "blocked",
        "mode": "local_safe_phase_guard_summary_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "active_focus": plan["active_focus"],
        "paused_focus": plan["paused_focus"],
        "current_phase": current_phase,
        "selected_packet": selected_packet,
        "selected_packet_path": selected_path,
        "selected_packet_path_exists": selected_path_exists,
        "selected_packet_sequence": selected_sequence,
        "current_exact_gate": current_exact_gate,
        "current_allowed_scope": current_allowed_scope,
        "compact_status": compact.get("status"),
        "queue_drain_status": compact.get("queue_drain", {}).get("status"),
        "ack_debug_status": ack_debug.get("status"),
        "ack_reconcile_status": ack_debug.get("ack_reconcile_status"),
        "phase_locks": phase_locks,
        "blocked_phase_actions": blocked_phase_actions,
        "invariant_violations": invariant_violations,
        "lane_next_actions": {
            "Hermes_Commander": "surface_current_phase_and_exact_gate",
            "Codex_Builder": (
                "blocked_until_exact_queue_replenish_gate"
                if current_phase == "queue_replenish_pending"
                else "follow_current_phase_guard"
            ),
            "OpenCode_Reviewer": "review_current_plan_snapshot_read_only",
            "Validator": "verify_phase_guard_and_target_absence",
            "Role_Worker_ACK": phase_locks.get("role_worker_ack", {}).get("state"),
        },
        "external_actions_performed": {
            "queue_file_write": False,
            "worker_envelope_write": False,
            "role_worker_ack_write": False,
            "worker_loop_start": False,
            "queue_payload_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "telegram_safe_draft": (
            f"A2A2A phase guard: packet_{selected_sequence or 'unknown'} phase={current_phase}; "
            f"gate={current_exact_gate}; next={next_safe_action_text}. "
            "No live send/provider/deploy/cloud action performed."
        ),
        "next_safe_action": next_safe_action,
    }


def build_phase_guard_summary_receipt(summary: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.phase_guard_summary_receipt.v1",
        "packet_id": summary["packet_id"],
        "status": "recorded_phase_guard_summary",
        "phase_guard_status": summary["status"],
        "created_at": now_iso(),
        "repo": summary["repo"],
        "evidence_path": evidence_path,
        "current_phase": summary.get("current_phase"),
        "selected_packet": summary.get("selected_packet"),
        "selected_packet_path": summary.get("selected_packet_path"),
        "current_exact_gate": summary.get("current_exact_gate"),
        "invariant_violations": summary.get("invariant_violations", []),
        "external_actions_performed": summary["external_actions_performed"],
        "blocked_actions_preserved": summary["blocked_actions_preserved"],
        "completion_claim": "P148 phase guard summary recorded; no queue write, worker envelope, ACK, or external action executed.",
        "next_safe_action": summary["next_safe_action"],
    }


def build_worker_envelope_phase_guard(root: Path, plan: dict[str, Any], current_next_gate_path: str | None) -> dict[str, Any]:
    """Return a no-execution guard for the worker-envelope phase of the selected packet."""
    summary = build_phase_guard_summary(root, plan, current_next_gate_path)
    selected_path = str(summary.get("selected_packet_path") or "")
    selected_sequence = str(summary.get("selected_packet_sequence") or "")
    selected_exists = bool(summary.get("selected_packet_path_exists"))
    worker_records: dict[str, Any] = {}
    worker_envelopes_present = False
    if selected_sequence:
        for target in ("hermes", "kob"):
            packet_path = latest_worker_packet(root, selected_sequence, target)
            worker_records[target] = {
                "latest_worker_packet": rel(root, packet_path) if packet_path else None,
                "latest_worker_packet_exists": bool(packet_path and packet_path.is_file()),
            }
        worker_envelopes_present = all(
            bool(record["latest_worker_packet_exists"]) for record in worker_records.values()
        )
    recommended_exact_gate = worker_envelope_gate_for_sequence(selected_sequence)

    if not selected_exists:
        status = "blocked_until_queue_packet_exists"
        next_safe_action = "Wait for exact P143 queue-replenish gate before worker-envelope guard."
        blocked_phase_actions = [
            "worker_envelope_write",
            "worker_envelope_gate",
            "role_worker_ack_gate",
            "role_worker_ack_write",
            "queue_payload_execution",
        ]
    elif worker_envelopes_present:
        status = "blocked_until_ack_phase_reconcile"
        next_safe_action = "Worker envelopes already exist; reconcile role-worker ACK status before any next gate."
        blocked_phase_actions = [
            "worker_envelope_write",
            "queue_payload_execution",
        ]
    else:
        status = "ready_for_separate_worker_envelope_gate_request"
        next_safe_action = (
            f"Queue packet {summary.get('selected_packet') or 'selected packet'} exists; open a separate exact "
            f"worker-envelope gate ({recommended_exact_gate}) before writing Hermes/KOB envelopes."
        )
        blocked_phase_actions = [
            "worker_envelope_write_without_separate_exact_gate",
            "role_worker_ack_gate",
            "role_worker_ack_write",
            "queue_payload_execution",
        ]

    return {
        "schema": "ghostclaw.a2a2a.worker_envelope_phase_guard.v1",
        "packet_id": "A2A2A-P149-PACKET077-WORKER-ENVELOPE-PHASE-GUARD-20260704",
        "status": status,
        "mode": "local_safe_worker_envelope_phase_guard_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "active_focus": plan["active_focus"],
        "paused_focus": plan["paused_focus"],
        "phase_guard_packet_id": summary["packet_id"],
        "current_phase": summary.get("current_phase"),
        "selected_packet": summary.get("selected_packet"),
        "selected_packet_path": selected_path or None,
        "selected_packet_path_exists": selected_exists,
        "selected_packet_sequence": selected_sequence or None,
        "required_prior_gate": summary.get("current_exact_gate"),
        "recommended_exact_gate_phrase": recommended_exact_gate if selected_exists and not worker_envelopes_present else None,
        "exact_gate_phrase": recommended_exact_gate if selected_exists and not worker_envelopes_present else None,
        "allowed_now": False,
        "requires_separate_exact_gate": bool(selected_exists and not worker_envelopes_present),
        "worker_records": worker_records,
        "phase_locks": {
            "queue_replenish": summary.get("phase_locks", {}).get("queue_replenish", {}),
            "worker_envelope": {
                "state": status,
                "allowed_now": False,
                "exact_gate": recommended_exact_gate if selected_exists and not worker_envelopes_present else None,
            },
            "role_worker_ack": summary.get("phase_locks", {}).get("role_worker_ack", {}),
        },
        "blocked_phase_actions": blocked_phase_actions,
        "external_actions_performed": {
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "role_worker_ack_write": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "invariant_violations": [],
        "next_safe_action": next_safe_action,
        "telegram_safe_draft": (
            f"A2A2A worker-envelope phase guard: {summary.get('selected_packet')} status={status}; "
            f"queue_exists={selected_exists}; required_prior_gate={summary.get('current_exact_gate')}; "
            f"next_gate={recommended_exact_gate if selected_exists and not worker_envelopes_present else None}; "
            "no queue write, worker envelope, ACK, live send, provider, deploy, cloud, or secret action performed."
        ),
    }


def build_worker_envelope_phase_guard_receipt(guard: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.worker_envelope_phase_guard_receipt.v1",
        "packet_id": guard["packet_id"],
        "status": "recorded_worker_envelope_phase_guard",
        "guard_status": guard["status"],
        "created_at": now_iso(),
        "repo": guard["repo"],
        "evidence_path": evidence_path,
        "selected_packet": guard.get("selected_packet"),
        "selected_packet_path": guard.get("selected_packet_path"),
        "selected_packet_path_exists": guard.get("selected_packet_path_exists"),
        "required_prior_gate": guard.get("required_prior_gate"),
        "exact_gate_phrase": guard.get("exact_gate_phrase"),
        "blocked_phase_actions": guard.get("blocked_phase_actions", []),
        "external_actions_performed": guard["external_actions_performed"],
        "blocked_actions_preserved": guard["blocked_actions_preserved"],
        "completion_claim": "P149 worker-envelope phase guard recorded; no queue write, worker envelope, ACK, or external action executed.",
        "next_safe_action": guard["next_safe_action"],
    }


def build_phase_next_action_selector(root: Path, plan: dict[str, Any], current_next_gate_path: str | None) -> dict[str, Any]:
    """Select the one safe next lane from the current phase without executing it."""
    summary = build_phase_guard_summary(root, plan, current_next_gate_path)
    worker_guard = build_worker_envelope_phase_guard(root, plan, current_next_gate_path)
    current_path, current_gate = load_optional_json(root, current_next_gate_path)
    command_preview = (
        dict(current_gate.get("command_preview", {}))
        if isinstance(current_gate, dict) and isinstance(current_gate.get("command_preview"), dict)
        else {}
    )
    current_phase = summary.get("current_phase")
    selected_path_exists = bool(summary.get("selected_packet_path_exists"))
    selected_sequence = str(summary.get("selected_packet_sequence") or "")
    role_ack_lock = summary.get("phase_locks", {}).get("role_worker_ack", {})
    exact_gate_phrase: str | None = None

    if summary.get("status") != "pass":
        status = "blocked_by_phase_guard_invariant"
        action_kind = "inspect_phase_guard"
        next_safe_action = "Inspect phase guard invariant violations before selecting any lane."
    elif current_phase == "queue_replenish_pending":
        status = "waiting_for_queue_replenish_exact_gate"
        action_kind = "queue_replenish_exact_gate"
        exact_gate_phrase = summary.get("current_exact_gate")
        next_safe_action = summary.get("next_safe_action")
    elif worker_guard.get("status") == "ready_for_separate_worker_envelope_gate_request":
        status = "ready_for_worker_envelope_gate_request"
        action_kind = "worker_envelope_gate_request"
        exact_gate_phrase = (
            worker_guard.get("recommended_exact_gate_phrase")
            or worker_guard.get("exact_gate_phrase")
        )
        next_safe_action = worker_guard.get("next_safe_action")
    elif current_phase == "queue_target_present_reconcile":
        status = "queue_target_present_reconcile"
        action_kind = "target_reconcile_then_worker_envelope_gate_request"
        next_safe_action = "Run target reconcile, then open a separate worker-envelope exact gate if the target matches preview."
    elif current_phase == "role_worker_ack_pending":
        status = "waiting_for_role_worker_ack_exact_gate"
        action_kind = "role_worker_ack_exact_gate"
        exact_gate_phrase = role_ack_lock.get("exact_gate")
        next_safe_action = summary.get("next_safe_action")
    elif current_phase == "ack_complete_ready_for_next_selection":
        status = "ready_for_orchestrator_next_selection"
        action_kind = "orchestrator_next_selection"
        next_safe_action = summary.get("next_safe_action")
    else:
        status = "inspect_required"
        action_kind = "inspect_current_phase"
        next_safe_action = summary.get("next_safe_action")

    invariant_violations: list[str] = []
    if action_kind in {"worker_envelope_gate_request", "role_worker_ack_exact_gate"} and not selected_path_exists:
        invariant_violations.append("selected_future_phase_without_queue_packet")
    if action_kind == "queue_replenish_exact_gate" and not exact_gate_phrase:
        invariant_violations.append("queue_replenish_selected_without_exact_gate")
    if action_kind == "role_worker_ack_exact_gate" and not exact_gate_phrase:
        invariant_violations.append("ack_selected_without_exact_gate")
    if action_kind == "worker_envelope_gate_request" and not exact_gate_phrase:
        invariant_violations.append("worker_envelope_selected_without_exact_gate")
    if invariant_violations:
        status = "blocked_by_selector_invariant"
        action_kind = "inspect_selector_invariant"
        exact_gate_phrase = None
        next_safe_action = "Inspect selector invariant violations before selecting any lane."
    worker_command_path = (
        worker_envelope_command_output_for_sequence(selected_sequence)
        if action_kind == "worker_envelope_gate_request"
        else None
    )
    if action_kind == "worker_envelope_gate_request":
        write_after_gate = (
            f"bash {worker_command_path} {exact_gate_phrase}"
            if worker_command_path and exact_gate_phrase
            else None
        )
        dry_run_after_gate = f"bash {worker_command_path} WRONG_APPROVAL" if worker_command_path else None
        safety_check_without_approval = (
            "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet077-worker-envelope-gate"
            if selected_sequence == "077"
            else "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet076-worker-envelope-gate"
            if selected_sequence == "076"
            else None
        )
    else:
        write_after_gate = command_preview.get("write_after_gate") if exact_gate_phrase else None
        dry_run_after_gate = command_preview.get("dry_run_after_gate") if exact_gate_phrase else None
        safety_check_without_approval = command_preview.get("safety_check_without_approval")

    return {
        "schema": "ghostclaw.a2a2a.phase_next_action_selector.v1",
        "packet_id": "A2A2A-P150-PACKET077-PHASE-NEXT-ACTION-SELECTOR-20260704",
        "status": status,
        "mode": "local_safe_phase_next_action_selector_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "active_focus": plan["active_focus"],
        "paused_focus": plan["paused_focus"],
        "action_kind": action_kind,
        "selected_packet": summary.get("selected_packet"),
        "selected_packet_path": summary.get("selected_packet_path"),
        "selected_packet_path_exists": selected_path_exists,
        "selected_packet_sequence": summary.get("selected_packet_sequence"),
        "current_phase": current_phase,
        "phase_guard_status": summary.get("status"),
        "worker_envelope_guard_status": worker_guard.get("status"),
        "exact_gate_phrase": exact_gate_phrase,
        "requires_human_exact_gate": bool(exact_gate_phrase),
        "requires_separate_gate": action_kind in {"worker_envelope_gate_request"} or bool(exact_gate_phrase),
        "current_gate_source_path": rel(root, current_path) if current_path else None,
        "command_preview_after_exact_gate_only": {
            "would_execute_now": False,
            "write_after_gate": write_after_gate,
            "dry_run_after_gate": dry_run_after_gate,
            "safety_check_without_approval": safety_check_without_approval,
        },
        "phase_order": [
            "queue_replenish",
            "target_reconcile",
            "worker_envelope_gate",
            "role_worker_ack_gate",
            "orchestrator_next_selection",
        ],
        "blocked_future_phases": {
            "queue_replenish": action_kind not in {"queue_replenish_exact_gate"},
            "target_reconcile": action_kind not in {"target_reconcile_then_worker_envelope_gate_request"},
            "worker_envelope": action_kind not in {"worker_envelope_gate_request"},
            "role_worker_ack": action_kind not in {"role_worker_ack_exact_gate"},
            "queue_payload_execution": True,
        },
        "source_statuses": {
            "phase_guard_packet_id": summary.get("packet_id"),
            "worker_envelope_guard_packet_id": worker_guard.get("packet_id"),
            "phase_guard_next_safe_action": summary.get("next_safe_action"),
            "worker_envelope_next_safe_action": worker_guard.get("next_safe_action"),
        },
        "invariant_violations": invariant_violations,
        "external_actions_performed": {
            "queue_file_write": False,
            "queue_payload_execution": False,
            "worker_envelope_write": False,
            "worker_execution": False,
            "role_worker_ack_write": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": next_safe_action,
        "telegram_safe_draft": (
            f"A2A2A next-action selector: {summary.get('selected_packet')} action={action_kind}; "
            f"phase={current_phase}; gate={exact_gate_phrase}; no execution/live/provider/deploy/cloud action performed."
        ),
    }


def build_phase_next_action_selector_receipt(selector: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.phase_next_action_selector_receipt.v1",
        "packet_id": selector["packet_id"],
        "status": "recorded_phase_next_action_selector",
        "selector_status": selector["status"],
        "created_at": now_iso(),
        "repo": selector["repo"],
        "evidence_path": evidence_path,
        "action_kind": selector.get("action_kind"),
        "selected_packet": selector.get("selected_packet"),
        "selected_packet_path": selector.get("selected_packet_path"),
        "current_phase": selector.get("current_phase"),
        "exact_gate_phrase": selector.get("exact_gate_phrase"),
        "invariant_violations": selector.get("invariant_violations", []),
        "external_actions_performed": selector["external_actions_performed"],
        "blocked_actions_preserved": selector["blocked_actions_preserved"],
        "completion_claim": "P150 next-action selector recorded; no queue write, worker envelope, ACK, or external action executed.",
        "next_safe_action": selector["next_safe_action"],
    }


def build_current_next_gate_advance(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
    backup_output: str,
) -> dict[str, Any]:
    """Advance current_next_gate.json from a superseded queue gate to the P156 worker-envelope gate."""
    selector = build_phase_next_action_selector(root, plan, current_next_gate_path)
    current_path, current_gate = load_optional_json(root, current_next_gate_path)
    current_gate_block = (
        current_gate.get("current_next_gate")
        if isinstance(current_gate, dict) and isinstance(current_gate.get("current_next_gate"), dict)
        else {}
    )
    previous_exact_gate = current_gate_block.get("exact_phrase")
    next_exact_gate = selector.get("exact_gate_phrase")
    issues: list[str] = []
    if selector.get("status") != "ready_for_worker_envelope_gate_request":
        issues.append(f"selector_not_ready:{selector.get('status')}")
    if selector.get("selected_packet") != "packet_077":
        issues.append(f"unexpected_selected_packet:{selector.get('selected_packet')}")
    if next_exact_gate != DEFAULT_PACKET077_WORKER_ENVELOPE_GATE:
        issues.append("selector_missing_p156_exact_gate")
    if not selector.get("selected_packet_path_exists"):
        issues.append("selected_packet_path_missing")
    command_preview = selector.get("command_preview_after_exact_gate_only")
    if not isinstance(command_preview, dict):
        issues.append("selector_command_preview_missing")
        command_preview = {}
    write_after_gate = str(command_preview.get("write_after_gate") or "")
    if "P156-PACKET077-WORKER-ENVELOPE-WRITE-GUARD" not in write_after_gate:
        issues.append("selector_command_preview_not_p156")
    if "P143-PACKET077-QUEUE-WRITE-CHECKSUM-GUARD" in write_after_gate:
        issues.append("selector_command_preview_still_p143")

    selected_packet_path = selector.get("selected_packet_path")
    payload = {
        "schema": "ghostclaw.a2a2a.current_next_gate.v1",
        "status": "waiting_for_exact_worker_envelope_gate",
        "updated_at": now_iso(),
        "selected_packet": selector.get("selected_packet"),
        "selected_packet_path": selected_packet_path,
        "selected_packet_sequence": selector.get("selected_packet_sequence"),
        "external_action_allowed": False,
        "source_mutation_allowed_now": False,
        "current_next_gate": {
            "status": "waiting_for_exact_worker_envelope_gate",
            "exact_phrase": next_exact_gate,
            "allowed_scope": (
                "write exactly two local packet_077 worker envelope files under "
                ".ghostclaw_runtime/a2a2a/inbox/hermes and .ghostclaw_runtime/a2a2a/inbox/kob only"
            ),
            "blocked_scope": [
                "queue payload execution",
                "worker execution",
                "role worker ACK write",
                "Telegram live send",
                "provider/model call",
                "repo/customer data external routing",
                "secret read/print",
                "install",
                "commit",
                "push",
                "deploy",
                "Cloudflare/R2 mutation",
            ],
        },
        "current_orchestrator": {
            "status": "packet_077_worker_envelope_gate_ready",
            "selected_packet": selector.get("selected_packet"),
            "selected_packet_path": selected_packet_path,
            "queue_drain": {
                "status": "packet_077_queue_packet_present",
            },
            "worker_envelope_guard_status": selector.get("worker_envelope_guard_status"),
        },
        "command_preview": {
            "write_after_gate": command_preview.get("write_after_gate"),
            "dry_run_after_gate": command_preview.get("dry_run_after_gate"),
            "safety_check_without_approval": command_preview.get("safety_check_without_approval"),
        },
        "source_artifacts": {
            "p149_worker_envelope_phase_guard": DEFAULT_WORKER_ENVELOPE_PHASE_GUARD_OUTPUT,
            "p150_phase_next_action_selector": DEFAULT_PHASE_NEXT_ACTION_SELECTOR_OUTPUT,
            "p156_worker_envelope_preview": DEFAULT_PACKET077_WORKER_ENVELOPE_PREVIEW_OUTPUT,
            "backup_previous_current_next_gate": backup_output,
        },
        "next_safe_action": selector.get("next_safe_action"),
    }
    if issues:
        payload = {}

    return {
        "schema": "ghostclaw.a2a2a.current_next_gate_advance.v1",
        "packet_id": "A2A2A-P157-PACKET077-CURRENT-NEXT-GATE-ADVANCE-20260704",
        "status": "advanced_to_worker_envelope_exact_gate" if not issues else "blocked_current_next_gate_advance",
        "mode": "local_safe_current_next_gate_pointer_update_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "active_focus": plan["active_focus"],
        "paused_focus": plan["paused_focus"],
        "current_next_gate_path": current_next_gate_path or DEFAULT_CURRENT_NEXT_GATE,
        "backup_path": backup_output if current_path and current_path.is_file() else None,
        "previous_current_next_gate_path": rel(root, current_path) if current_path else None,
        "previous_current_next_gate_sha256": sha256_file(current_path) if current_path and current_path.is_file() else None,
        "previous_exact_gate_phrase": previous_exact_gate,
        "next_exact_gate_phrase": next_exact_gate,
        "selected_packet": selector.get("selected_packet"),
        "selected_packet_path": selected_packet_path,
        "selector_status": selector.get("status"),
        "selector_packet_id": selector.get("packet_id"),
        "command_preview": payload.get("command_preview", command_preview),
        "current_next_gate_payload": payload,
        "issues": issues,
        "external_actions_performed": local_safe_external_actions(),
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            f"Wait for exact gate {next_exact_gate}; do not execute worker envelopes without that phrase."
            if not issues
            else "Do not advance current_next_gate. Resolve selector readiness issues first."
        ),
        "telegram_safe_draft": (
            f"A2A2A P157 current gate advance: packet_077 next_gate={next_exact_gate}; "
            "no worker inbox, queue execution, live send, provider, deploy, cloud, or secret action performed."
            if not issues
            else f"A2A2A P157 current gate advance blocked: issues={issues}."
        ),
    }


def build_current_next_gate_advance_receipt(advance: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.current_next_gate_advance_receipt.v1",
        "packet_id": advance["packet_id"],
        "status": "recorded_current_next_gate_advance",
        "advance_status": advance["status"],
        "created_at": now_iso(),
        "repo": advance["repo"],
        "evidence_path": evidence_path,
        "current_next_gate_path": advance.get("current_next_gate_path"),
        "backup_path": advance.get("backup_path"),
        "previous_exact_gate_phrase": advance.get("previous_exact_gate_phrase"),
        "next_exact_gate_phrase": advance.get("next_exact_gate_phrase"),
        "selected_packet": advance.get("selected_packet"),
        "selected_packet_path": advance.get("selected_packet_path"),
        "issues": advance.get("issues", []),
        "external_actions_performed": advance["external_actions_performed"],
        "blocked_actions_preserved": advance["blocked_actions_preserved"],
        "completion_claim": "P157 current_next_gate pointer advance recorded; no worker envelope or external action executed.",
        "next_safe_action": advance["next_safe_action"],
    }


def expected_preview_sha_from_guard_script(command_path: Path) -> str | None:
    if not command_path.is_file():
        return None
    match = re.search(r'EXPECTED_PREVIEW_SHA256="([0-9a-f]{64})"', command_path.read_text(encoding="utf-8"))
    return match.group(1) if match else None


def build_packet077_worker_envelope_execution_audit(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
    preview_output: str,
    command_output: str,
) -> dict[str, Any]:
    """Audit the exact-gate worker-envelope command without writing worker envelopes."""
    current_path, current_gate = load_optional_json(root, current_next_gate_path)
    current_gate_block = (
        current_gate.get("current_next_gate")
        if isinstance(current_gate, dict) and isinstance(current_gate.get("current_next_gate"), dict)
        else {}
    )
    action_card = build_operator_action_card(root, plan, current_next_gate_path)
    preview_path = resolve_under_root(root, preview_output)
    command_path = resolve_under_root(root, command_output)
    preview = read_json(preview_path) if preview_path.is_file() else {}
    issues: list[str] = []
    exact_gate = current_gate_block.get("exact_phrase")
    if exact_gate != DEFAULT_PACKET077_WORKER_ENVELOPE_GATE:
        issues.append("current_gate_not_p156")
    if current_gate_block.get("status") != "waiting_for_exact_worker_envelope_gate":
        issues.append(f"current_gate_status_not_waiting:{current_gate_block.get('status')}")
    if action_card.get("status") != "ready_for_exact_gate":
        issues.append(f"operator_action_card_not_ready:{action_card.get('status')}")
    command_after_exact_gate = (action_card.get("action_after_exact_gate") or {}).get("command")
    expected_command = f"bash {command_output} {DEFAULT_PACKET077_WORKER_ENVELOPE_GATE}"
    if command_after_exact_gate != expected_command:
        issues.append("operator_action_card_command_mismatch")
    if not preview_path.is_file():
        issues.append("p156_preview_missing")
    if not command_path.is_file():
        issues.append("p156_command_missing")
    if isinstance(preview, dict) and preview.get("status") != "ready_for_exact_gate":
        issues.append(f"p156_preview_not_ready:{preview.get('status')}")
    if isinstance(preview, dict) and preview.get("exact_gate_phrase") != DEFAULT_PACKET077_WORKER_ENVELOPE_GATE:
        issues.append("p156_preview_exact_gate_mismatch")
    preview_sha256 = sha256_file(preview_path) if preview_path.is_file() else None
    command_expected_sha256 = expected_preview_sha_from_guard_script(command_path)
    if command_expected_sha256 != preview_sha256:
        issues.append("p156_command_preview_checksum_mismatch")

    planned_writes = preview.get("planned_writes", []) if isinstance(preview, dict) else []
    if len(planned_writes) != 2:
        issues.append(f"planned_write_count_not_two:{len(planned_writes)}")
    targets = [str(item.get("target")) for item in planned_writes if isinstance(item, dict)]
    if targets != ["hermes", "kob"]:
        issues.append(f"planned_targets_mismatch:{targets}")
    planned_write_records: list[dict[str, Any]] = []
    allowed_root = (root / ".ghostclaw_runtime/a2a2a/inbox").resolve()
    for item in planned_writes:
        if not isinstance(item, dict):
            issues.append("planned_write_not_object")
            continue
        path_value = str(item.get("path") or "")
        target_path = resolve_under_root(root, path_value)
        target_name = str(item.get("target") or "")
        expected_path = f".ghostclaw_runtime/a2a2a/inbox/{target_name}/queue_coord_packet_077_{target_name}_p156_20260704.json"
        if path_value != expected_path:
            issues.append(f"planned_write_path_mismatch:{path_value}")
        if not str(target_path).startswith(str(allowed_root)):
            issues.append(f"planned_write_outside_inbox:{path_value}")
        if target_path.exists():
            issues.append(f"planned_worker_envelope_already_exists:{path_value}")
        envelope = item.get("envelope") if isinstance(item.get("envelope"), dict) else {}
        if envelope.get("mission") != "A2A2A_P156_PACKET077_LOCAL_WORKER_ENVELOPE_WRITE_ONLY":
            issues.append(f"planned_envelope_mission_mismatch:{path_value}")
        payload = envelope.get("payload") if isinstance(envelope.get("payload"), dict) else {}
        for blocked_flag in ("provider_call", "push", "deploy", "secret_read", "telegram_live_send", "queue_payload_execution"):
            if payload.get(blocked_flag) is not False:
                issues.append(f"planned_envelope_blocked_flag_not_false:{path_value}:{blocked_flag}")
        actual_sha = hashlib.sha256(to_json_text(envelope).encode("utf-8")).hexdigest()
        if actual_sha != item.get("sha256"):
            issues.append(f"planned_envelope_sha_mismatch:{path_value}")
        planned_write_records.append(
            {
                "target": target_name,
                "path": path_value,
                "sha256": item.get("sha256"),
                "exists_now": target_path.exists(),
            }
        )

    return {
        "schema": "ghostclaw.a2a2a.packet_worker_envelope_execution_audit.v1",
        "packet_id": "A2A2A-P159-PACKET077-WORKER-ENVELOPE-EXECUTION-AUDIT-20260704",
        "status": "ready_for_exact_p156_worker_envelope_write" if not issues else "blocked_p156_worker_envelope_write",
        "mode": "local_safe_pre_execution_audit_no_worker_envelope_write",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "active_focus": plan["active_focus"],
        "paused_focus": plan["paused_focus"],
        "current_next_gate_path": rel(root, current_path) if current_path else current_next_gate_path,
        "current_exact_gate": exact_gate,
        "operator_action_card_status": action_card.get("status"),
        "operator_action_card_gate_readiness_status": action_card.get("gate_readiness_status"),
        "preview_path": preview_output,
        "preview_sha256": preview_sha256,
        "command_path": command_output,
        "command_expected_preview_sha256": command_expected_sha256,
        "command_after_exact_gate": command_after_exact_gate,
        "wrong_approval_smoke_command": f"bash {command_output} WRONG_APPROVAL",
        "planned_write_count": len(planned_writes),
        "targets": targets,
        "planned_writes": planned_write_records,
        "issues": issues,
        "external_actions_performed": local_safe_external_actions(),
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            f"Run {expected_command} only after the exact P156 gate is provided."
            if not issues
            else "Do not run the P156 write guard; resolve audit issues first."
        ),
        "telegram_safe_draft": (
            "A2A2A P159 audit: packet_077 P156 worker-envelope write is ready for exact gate; "
            "no worker inbox, queue execution, live send, provider, deploy, cloud, or secret action performed."
            if not issues
            else f"A2A2A P159 audit blocked: issues={issues}."
        ),
    }


def build_packet_worker_envelope_execution_audit_receipt(audit: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet_worker_envelope_execution_audit_receipt.v1",
        "packet_id": audit["packet_id"],
        "status": "recorded_packet_worker_envelope_execution_audit",
        "audit_status": audit["status"],
        "created_at": now_iso(),
        "repo": audit["repo"],
        "evidence_path": evidence_path,
        "current_exact_gate": audit.get("current_exact_gate"),
        "command_after_exact_gate": audit.get("command_after_exact_gate"),
        "planned_write_count": audit.get("planned_write_count"),
        "targets": audit.get("targets", []),
        "issues": audit.get("issues", []),
        "external_actions_performed": audit["external_actions_performed"],
        "blocked_actions_preserved": audit["blocked_actions_preserved"],
        "completion_claim": "P159 worker-envelope execution audit recorded; no worker envelopes were written.",
        "next_safe_action": audit["next_safe_action"],
    }


def build_packet077_post_write_ack_readiness_simulation(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
    audit_output: str,
) -> dict[str, Any]:
    """Project packet_077 ACK readiness after the exact P156 envelope write, without writing envelopes."""
    current_path, current_gate = load_optional_json(root, current_next_gate_path)
    current_gate_block = (
        current_gate.get("current_next_gate")
        if isinstance(current_gate, dict) and isinstance(current_gate.get("current_next_gate"), dict)
        else {}
    )
    current_orchestrator = (
        current_gate.get("current_orchestrator")
        if isinstance(current_gate, dict) and isinstance(current_gate.get("current_orchestrator"), dict)
        else {}
    )
    audit_path = resolve_under_root(root, audit_output)
    audit: dict[str, Any] = {}
    issues: list[str] = []
    if audit_path.is_file():
        try:
            payload = read_json(audit_path)
            if isinstance(payload, dict):
                audit = payload
            else:
                issues.append("p159_audit_json_not_object")
        except (json.JSONDecodeError, OSError):
            issues.append("p159_audit_json_invalid")
    else:
        issues.append("p159_audit_missing")

    if current_gate_block.get("exact_phrase") != DEFAULT_PACKET077_WORKER_ENVELOPE_GATE:
        issues.append("current_gate_not_p156_worker_envelope_gate")
    if current_orchestrator.get("selected_packet") not in (None, "packet_077"):
        issues.append(f"current_selected_packet_not_packet_077:{current_orchestrator.get('selected_packet')}")
    if audit and audit.get("status") != "ready_for_exact_p156_worker_envelope_write":
        issues.append(f"p159_audit_not_ready:{audit.get('status')}")
    if audit and audit.get("current_exact_gate") != DEFAULT_PACKET077_WORKER_ENVELOPE_GATE:
        issues.append("p159_audit_exact_gate_mismatch")

    planned_writes = audit.get("planned_writes", []) if isinstance(audit.get("planned_writes"), list) else []
    if audit and len(planned_writes) != 2:
        issues.append(f"planned_write_count_not_two:{len(planned_writes)}")
    targets = [str(item.get("target")) for item in planned_writes if isinstance(item, dict)]
    if audit and targets != ["hermes", "kob"]:
        issues.append(f"planned_targets_mismatch:{targets}")

    projected_worker_envelopes: list[dict[str, Any]] = []
    actual_worker_envelopes_present_now = False
    for item in planned_writes:
        if not isinstance(item, dict):
            issues.append("planned_write_not_object")
            continue
        target = str(item.get("target") or "")
        path_value = str(item.get("path") or "")
        target_path = resolve_under_root(root, path_value)
        exists_now = target_path.is_file()
        actual_worker_envelopes_present_now = actual_worker_envelopes_present_now or exists_now
        expected_path = f".ghostclaw_runtime/a2a2a/inbox/{target}/queue_coord_packet_077_{target}_p156_20260704.json"
        if target not in {"hermes", "kob"}:
            issues.append(f"planned_target_not_allowed:{target}")
        if path_value != expected_path:
            issues.append(f"planned_write_path_mismatch:{path_value}")
        projected_worker_envelopes.append(
            {
                "target": target,
                "path": path_value,
                "sha256": item.get("sha256"),
                "exists_now": exists_now,
                "projected_exists_after_p156": True,
                "projected_ack_receipt_expected": worker_receipt_path(root, "077", target, target_path)
                and rel(root, worker_receipt_path(root, "077", target, target_path)),
            }
        )

    selected_packet = current_orchestrator.get("selected_packet") or audit.get("selected_packet") or "packet_077"
    selected_packet_path = (
        current_orchestrator.get("selected_packet_path")
        or audit.get("selected_packet_path")
        or "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json"
    )
    ready = not issues
    return {
        "schema": "ghostclaw.a2a2a.packet077_post_write_ack_readiness_simulation.v1",
        "packet_id": "A2A2A-P161-PACKET077-POST-WRITE-ACK-READINESS-SIMULATION-20260704",
        "status": "ready_for_projected_packet077_ack_gate_after_p156" if ready else "blocked_projected_packet077_ack_gate",
        "mode": "local_safe_projected_ack_readiness_no_worker_envelope_or_ack_write",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "active_focus": plan["active_focus"],
        "paused_focus": plan["paused_focus"],
        "selected_packet": selected_packet,
        "selected_packet_path": selected_packet_path,
        "selected_packet_sequence": "077",
        "current_next_gate_path": rel(root, current_path) if current_path else current_next_gate_path,
        "current_exact_gate": current_gate_block.get("exact_phrase"),
        "source_audit_path": audit_output,
        "source_audit_status": audit.get("status"),
        "projected_ack_status": "waiting_for_role_worker_ack" if ready else "blocked",
        "projected_next_exact_gate": DEFAULT_PACKET077_POST_WRITE_ACK_GATE,
        "projected_worker_targets": targets,
        "projected_worker_envelopes": projected_worker_envelopes,
        "projected_worker_envelopes_present_after_p156": ready,
        "actual_worker_envelopes_present_now": actual_worker_envelopes_present_now,
        "issues": issues,
        "external_actions_performed": local_safe_external_actions(),
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            f"After exact P156 writes local packet_077 envelopes, request {DEFAULT_PACKET077_POST_WRITE_ACK_GATE} "
            "to write Hermes/KOB local role-worker ACK receipts once."
            if ready
            else "Do not request packet_077 ACK gate; resolve P161 simulation issues first."
        ),
        "telegram_safe_draft": (
            "A2A2A P161 simulation: after exact P156 writes packet_077 worker envelopes, "
            f"next ACK gate is {DEFAULT_PACKET077_POST_WRITE_ACK_GATE}; no inbox, ack, live send, provider, deploy, cloud, or secret action performed."
            if ready
            else f"A2A2A P161 simulation blocked: issues={issues}."
        ),
    }


def build_packet077_post_write_ack_readiness_simulation_receipt(
    simulation: dict[str, Any], evidence_path: str
) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.packet077_post_write_ack_readiness_simulation_receipt.v1",
        "packet_id": simulation["packet_id"],
        "status": "recorded_packet077_projected_ack_readiness",
        "simulation_status": simulation["status"],
        "created_at": now_iso(),
        "repo": simulation["repo"],
        "evidence_path": evidence_path,
        "source_audit_path": simulation.get("source_audit_path"),
        "selected_packet": simulation.get("selected_packet"),
        "selected_packet_path": simulation.get("selected_packet_path"),
        "projected_next_exact_gate": simulation.get("projected_next_exact_gate"),
        "projected_ack_status": simulation.get("projected_ack_status"),
        "projected_worker_targets": simulation.get("projected_worker_targets", []),
        "actual_worker_envelopes_present_now": simulation.get("actual_worker_envelopes_present_now"),
        "issues": simulation.get("issues", []),
        "external_actions_performed": simulation["external_actions_performed"],
        "blocked_actions_preserved": simulation["blocked_actions_preserved"],
        "completion_claim": "P161 projected ACK readiness recorded; no worker envelopes or ACK receipts were written.",
        "next_safe_action": simulation["next_safe_action"],
    }


def external_actions_false(payload: dict[str, Any]) -> bool:
    actions = payload.get("external_actions_performed")
    return isinstance(actions, dict) and all(value is False for value in actions.values())


def build_ack_gate_lock_audit(root: Path, plan: dict[str, Any], current_next_gate_path: str | None) -> dict[str, Any]:
    """Return a no-execution audit proving the selected packet is ready for ACK gate only."""
    card = build_role_worker_ack_action_card(root, plan, current_next_gate_path)
    reconcile = build_role_worker_ack_reconcile(root, plan, current_next_gate_path)
    debug = build_role_worker_ack_debug(root, plan, current_next_gate_path)
    exact_gate = card.get("exact_gate_phrase")
    accepted_check = build_role_worker_ack_approval_check(card, exact_gate)
    blanket_check = build_role_worker_ack_approval_check(card, "APPROVE_ALL_FULL_AUTO")
    current_path, current_gate = load_optional_json(root, current_next_gate_path)
    current_next_gate = current_gate.get("current_next_gate") if isinstance(current_gate, dict) else {}
    if not isinstance(current_next_gate, dict):
        current_next_gate = {}
    issues: list[str] = []
    if card.get("status") != "ready_for_exact_ack_gate":
        issues.append("ack_action_card_not_ready")
    if reconcile.get("status") != "waiting_for_role_worker_ack":
        issues.append(f"ack_reconcile_status_not_waiting:{reconcile.get('status')}")
    if debug.get("status") != "ready_for_exact_ack_gate":
        issues.append(f"ack_debug_status_not_ready:{debug.get('status')}")
    if current_next_gate.get("exact_phrase") != exact_gate:
        issues.append("current_next_gate_exact_phrase_mismatch")
    if accepted_check.get("status") != "accepted_exact_ack_gate_ready":
        issues.append("exact_ack_approval_check_not_accepted")
    if accepted_check.get("action_after_approval", {}).get("would_execute") is not False:
        issues.append("exact_ack_approval_check_would_execute")
    if blanket_check.get("status") != "rejected_or_not_ready":
        issues.append("blanket_approval_not_rejected")
    if "blanket_approval_rejected" not in blanket_check.get("issues", []):
        issues.append("blanket_rejection_issue_missing")
    for target in ("hermes", "kob"):
        envelopes = card.get("worker_state", {}).get("envelopes", {}).get(target, [])
        receipts = card.get("worker_state", {}).get("receipts", {}).get(target, [])
        if len(envelopes) != 1:
            issues.append(f"worker_envelope_count_not_one:{target}:{len(envelopes)}")
        if receipts:
            issues.append(f"ack_receipt_already_present:{target}")
    for name, payload in (
        ("card", card),
        ("reconcile", reconcile),
        ("debug", debug),
        ("accepted_check", accepted_check),
        ("blanket_check", blanket_check),
    ):
        if not external_actions_false(payload):
            issues.append(f"external_actions_not_false:{name}")
    status = "ready_for_exact_ack_gate_locked" if not issues else "blocked_or_not_ready"
    selected_sequence = card.get("selected_packet_sequence") or "unknown"
    return {
        "schema": "ghostclaw.a2a2a.ack_gate_lock_audit.v1",
        "packet_id": f"A2A2A-P138-PACKET{selected_sequence}-ACK-GATE-LOCK-AUDIT-20260704",
        "status": status,
        "mode": "local_safe_ack_gate_lock_audit_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "selected_packet": card.get("selected_packet"),
        "selected_packet_path": card.get("selected_packet_path"),
        "selected_packet_sequence": selected_sequence,
        "current_next_gate_path": rel(root, current_path) if current_path else None,
        "exact_gate_phrase": exact_gate,
        "issues": issues,
        "ack_action_card_status": card.get("status"),
        "ack_reconcile_status": reconcile.get("status"),
        "ack_debug_status": debug.get("status"),
        "accepted_approval_check_status": accepted_check.get("status"),
        "blanket_approval_check_status": blanket_check.get("status"),
        "worker_state": card.get("worker_state"),
        "command_preview_after_exact_gate_only": {
            "combined_command": card.get("combined_command_after_exact_gate"),
            "would_execute_now": False,
        },
        "external_actions_performed": {
            "role_worker_ack_write": False,
            "worker_loop_start": False,
            "queue_payload_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            f"Wait for {exact_gate} before writing local Hermes/KOB ack receipts once."
            if status == "ready_for_exact_ack_gate_locked"
            else "Resolve ACK gate-lock audit issues before any role-worker ack."
        ),
    }


def build_ack_gate_lock_audit_receipt(audit: dict[str, Any], evidence_path: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.ack_gate_lock_audit_receipt.v1",
        "packet_id": audit["packet_id"],
        "status": audit["status"],
        "created_at": now_iso(),
        "repo": audit["repo"],
        "evidence_path": evidence_path,
        "selected_packet": audit.get("selected_packet"),
        "selected_packet_path": audit.get("selected_packet_path"),
        "selected_packet_sequence": audit.get("selected_packet_sequence"),
        "exact_gate_phrase": audit.get("exact_gate_phrase"),
        "issues": audit.get("issues", []),
        "external_actions_performed": audit["external_actions_performed"],
        "blocked_actions_preserved": audit["blocked_actions_preserved"],
        "completion_claim": "P138 ACK gate-lock audit recorded; no role-worker ack executed.",
        "next_safe_action": audit["next_safe_action"],
    }


def render_ack_execution_guard_script(root: Path, preview_path: str, expected_preview_sha256: str, exact_gate: str) -> str:
    return f"""#!/usr/bin/env bash
# P139 checksum-guarded packet_076 role-worker ACK execution.
# Run only after the exact gate is approved:
#   bash {DEFAULT_ACK_EXECUTION_GUARD_COMMAND_OUTPUT} {exact_gate}
set -euo pipefail

REPO="{root}"
APPROVAL="${{1:-}}"
REQUIRED_APPROVAL="{exact_gate}"
PREVIEW="$REPO/{preview_path}"
EXPECTED_PREVIEW_SHA256="{expected_preview_sha256}"

if [[ "$APPROVAL" != "$REQUIRED_APPROVAL" ]]; then
  echo "ERROR: exact approval phrase required: $REQUIRED_APPROVAL" >&2
  exit 2
fi

if [[ ! -f "$PREVIEW" ]]; then
  echo "ERROR: ACK execution preview missing: $PREVIEW" >&2
  exit 3
fi

ACTUAL_PREVIEW_SHA256="$(shasum -a 256 "$PREVIEW" | awk '{{print $1}}')"
if [[ "$ACTUAL_PREVIEW_SHA256" != "$EXPECTED_PREVIEW_SHA256" ]]; then
  echo "ERROR: ACK execution preview checksum mismatch" >&2
  exit 4
fi

python3 - "$REPO" "$PREVIEW" <<'PY'
import hashlib
import json
import subprocess
import sys
from pathlib import Path

root = Path(sys.argv[1]).resolve()
preview = Path(sys.argv[2]).resolve()
payload = json.loads(preview.read_text(encoding="utf-8"))
if payload.get("status") != "ready_for_exact_gate":
    raise SystemExit("ERROR: preview is not ready_for_exact_gate")

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

for item in payload.get("source_files", []):
    path = (root / item["path"]).resolve()
    if not path.is_file():
        raise SystemExit(f"ERROR: required source file missing: {{item['path']}}")
    if sha256(path) != item.get("sha256"):
        raise SystemExit(f"ERROR: required source checksum mismatch: {{item['path']}}")

for item in payload.get("planned_worker_packets", []):
    packet = (root / item["path"]).resolve()
    receipt = (root / item["expected_receipt"]).resolve()
    if not packet.is_file():
        raise SystemExit(f"ERROR: worker envelope missing: {{item['path']}}")
    if sha256(packet) != item.get("sha256"):
        raise SystemExit(f"ERROR: worker envelope checksum mismatch: {{item['path']}}")
    if receipt.exists():
        raise SystemExit(f"ERROR: ACK receipt already exists: {{item['expected_receipt']}}")

for command in payload.get("planned_commands", []):
    argv = command.get("argv")
    target = command.get("target")
    if not isinstance(argv, list) or not argv:
        raise SystemExit(f"ERROR: invalid argv for target: {{target}}")
    subprocess.run(argv, cwd=root, check=True)

for item in payload.get("planned_worker_packets", []):
    receipt = (root / item["expected_receipt"]).resolve()
    if not receipt.is_file():
        raise SystemExit(f"ERROR: expected ACK receipt missing after worker run: {{item['expected_receipt']}}")

print("P139_PACKET076_ACK_EXECUTED targets=%s" % ",".join(item["target"] for item in payload.get("planned_worker_packets", [])))
PY
"""


def build_ack_execution_guard(
    root: Path,
    plan: dict[str, Any],
    current_next_gate_path: str | None,
    preview_output: str,
    command_output: str,
    audit_output: str,
) -> dict[str, Any]:
    """Prepare a checksum-guarded command for the exact P137 ACK step without executing it."""
    card = build_role_worker_ack_action_card(root, plan, current_next_gate_path)
    exact_gate = str(card.get("exact_gate_phrase") or "")
    issues: list[str] = []
    if card.get("status") != "ready_for_exact_ack_gate":
        issues.append("ack_action_card_not_ready")
    if card.get("selected_packet_sequence") != "076":
        issues.append(f"selected_packet_sequence_not_076:{card.get('selected_packet_sequence')}")
    if exact_gate != "APPROVE_A2A2A_P137_PACKET076_LOCAL_ROLE_WORKER_ACK_ONLY":
        issues.append("exact_gate_not_p137_packet076")

    source_files: list[dict[str, Any]] = []
    current_path, current_gate = load_optional_json(root, current_next_gate_path)
    if current_path is None or not current_path.is_file():
        issues.append("current_next_gate_missing")
    else:
        source_files.append({"label": "current_next_gate", "path": rel(root, current_path), "sha256": sha256_file(current_path)})
        gate_block = current_gate.get("current_next_gate") if isinstance(current_gate, dict) else {}
        if not isinstance(gate_block, dict) or gate_block.get("exact_phrase") != exact_gate:
            issues.append("current_next_gate_exact_phrase_mismatch")

    audit_path = resolve_under_root(root, audit_output)
    audit_payload: dict[str, Any] | None = None
    if not audit_path.is_file():
        issues.append("ack_gate_lock_audit_missing")
    else:
        try:
            payload = read_json(audit_path)
            if isinstance(payload, dict):
                audit_payload = payload
                source_files.append({"label": "ack_gate_lock_audit", "path": rel(root, audit_path), "sha256": sha256_file(audit_path)})
            else:
                issues.append("ack_gate_lock_audit_json_not_object")
        except (json.JSONDecodeError, OSError):
            issues.append("ack_gate_lock_audit_json_invalid")
    if audit_payload:
        if audit_payload.get("status") != "ready_for_exact_ack_gate_locked":
            issues.append(f"ack_gate_lock_audit_not_ready:{audit_payload.get('status')}")
        if audit_payload.get("exact_gate_phrase") != exact_gate:
            issues.append("ack_gate_lock_audit_exact_phrase_mismatch")
        if audit_payload.get("selected_packet_sequence") != "076":
            issues.append("ack_gate_lock_audit_sequence_mismatch")

    planned_worker_packets: list[dict[str, Any]] = []
    planned_commands: list[dict[str, Any]] = []
    commands = card.get("commands_after_exact_gate") if isinstance(card.get("commands_after_exact_gate"), dict) else {}
    sequence = str(card.get("selected_packet_sequence") or "")
    for target in ("hermes", "kob"):
        packet_path = latest_worker_packet(root, sequence, target) if sequence else None
        if packet_path is None:
            issues.append(f"missing_worker_envelope:{target}")
            continue
        expected_receipt = worker_receipt_path(root, sequence, target, packet_path)
        if expected_receipt is None:
            issues.append(f"missing_expected_receipt_path:{target}")
            continue
        if expected_receipt.exists():
            issues.append(f"ack_receipt_already_present:{target}")
        command = commands.get(target)
        if not isinstance(command, str) or not command.strip():
            issues.append(f"ack_command_missing:{target}")
            continue
        argv = shlex.split(command)
        expected_prefix = ["python3", "scripts/ghostclaw_a2a_role_worker.py", "--agent", target, "--packet"]
        if argv[:5] != expected_prefix or "--once" not in argv or "--loop" in argv:
            issues.append(f"ack_command_not_one_shot_role_worker:{target}")
        planned_worker_packets.append(
            {
                "target": target,
                "path": rel(root, packet_path),
                "sha256": sha256_file(packet_path),
                "expected_receipt": rel(root, expected_receipt),
            }
        )
        planned_commands.append({"target": target, "command": command, "argv": argv})

    preview_payload = {
        "schema": "ghostclaw.a2a2a.ack_execution_guard_preview.v1",
        "packet_id": "A2A2A-P139-PACKET076-ACK-EXECUTION-GUARD-PREVIEW-20260704",
        "status": "ready_for_exact_gate" if not issues else "blocked_or_not_ready",
        "mode": "local_safe_ack_execution_guard_preview_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "selected_packet": card.get("selected_packet"),
        "selected_packet_path": card.get("selected_packet_path"),
        "selected_packet_sequence": card.get("selected_packet_sequence"),
        "exact_gate_phrase": exact_gate or None,
        "source_files": source_files if not issues else source_files,
        "planned_worker_packets": planned_worker_packets if not issues else planned_worker_packets,
        "planned_commands": planned_commands if not issues else [],
        "issues": issues,
        "external_actions_performed": {
            "role_worker_ack_write": False,
            "worker_loop_start": False,
            "queue_payload_execution": False,
            "telegram_live_send": False,
            "provider_call": False,
            "repo_or_customer_data_external_routing": False,
            "secret_read_or_print": False,
            "install": False,
            "commit": False,
            "push": False,
            "deploy": False,
            "cloudflare_or_r2_mutation": False,
        },
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": (
            f"Run the checksum-guard command only after exact gate {exact_gate} is intentionally provided."
            if not issues
            else "Do not run ACK workers. Resolve P139 guard preview issues first."
        ),
    }
    preview_sha256 = hashlib.sha256(to_json_text(preview_payload).encode("utf-8")).hexdigest()
    guard_script = (
        render_ack_execution_guard_script(root, preview_output, preview_sha256, exact_gate)
        if not issues and exact_gate
        else None
    )
    return {
        "schema": "ghostclaw.a2a2a.ack_execution_guard.v1",
        "packet_id": "A2A2A-P139-PACKET076-ACK-EXECUTION-GUARD-20260704",
        "status": "ready_for_exact_gate" if not issues else "blocked_or_not_ready",
        "mode": "local_safe_ack_execution_guard_no_execution",
        "created_at": now_iso(),
        "repo": plan["repo"],
        "selected_packet": card.get("selected_packet"),
        "selected_packet_path": card.get("selected_packet_path"),
        "selected_packet_sequence": card.get("selected_packet_sequence"),
        "exact_gate_phrase": exact_gate or None,
        "preview_path": preview_output,
        "preview_sha256": preview_sha256,
        "command_path": command_output,
        "command_after_exact_gate": f"bash {command_output} {exact_gate}" if guard_script else None,
        "audit_path": audit_output,
        "source_files": source_files,
        "planned_worker_packets": planned_worker_packets,
        "planned_commands": planned_commands if not issues else [],
        "preview_payload": preview_payload,
        "guard_script": guard_script,
        "issues": issues,
        "external_actions_performed": preview_payload["external_actions_performed"],
        "blocked_actions_preserved": plan["blocked_actions_preserved"],
        "next_safe_action": preview_payload["next_safe_action"],
    }


def build_ack_execution_guard_receipt(guard: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.ack_execution_guard_receipt.v1",
        "packet_id": guard["packet_id"],
        "status": "recorded_ack_execution_guard_preview",
        "guard_status": guard["status"],
        "created_at": now_iso(),
        "repo": guard["repo"],
        "selected_packet": guard.get("selected_packet"),
        "selected_packet_path": guard.get("selected_packet_path"),
        "selected_packet_sequence": guard.get("selected_packet_sequence"),
        "exact_gate_phrase": guard.get("exact_gate_phrase"),
        "preview_path": guard.get("preview_path"),
        "preview_sha256": guard.get("preview_sha256"),
        "command_path": guard.get("command_path"),
        "command_after_exact_gate": guard.get("command_after_exact_gate"),
        "audit_path": guard.get("audit_path"),
        "source_files": guard.get("source_files", []),
        "planned_worker_packets": guard.get("planned_worker_packets", []),
        "issues": guard.get("issues", []),
        "external_actions_performed": guard["external_actions_performed"],
        "blocked_actions_preserved": guard["blocked_actions_preserved"],
        "completion_claim": "P139 ACK execution guard preview recorded; P137 ACK was not executed.",
        "next_safe_action": guard["next_safe_action"],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Build a local-safe A2A2A agent-orchestrator plan.")
    parser.add_argument("--root", default=str(REPO_ROOT), help="repo root")
    parser.add_argument("--dry-run-report", default=None, help="existing coordinator dry-run JSON")
    parser.add_argument("--output", default=DEFAULT_OUTPUT, help="evidence JSON output path")
    parser.add_argument("--receipt", default=DEFAULT_RECEIPT, help="receipt JSON output path")
    parser.add_argument("--top", type=int, default=20, help="number of ranked packets to include")
    parser.add_argument("--write", action="store_true", help="write evidence and receipt")
    parser.add_argument("--compact", action="store_true", help="print compact status JSON for sidebar/team handoff")
    parser.add_argument("--compact-snapshot-freshness", action="store_true", help="inspect whether the durable compact snapshot still matches packet_078 filesystem state")
    parser.add_argument("--compact-output", default=DEFAULT_COMPACT_OUTPUT, help="compact status snapshot path when --compact --write is used")
    parser.add_argument(
        "--compact-receipt-output",
        default=DEFAULT_COMPACT_RECEIPT_OUTPUT,
        help="compact status receipt path when --compact --write is used",
    )
    parser.add_argument(
        "--compact-freshness-output",
        default=DEFAULT_COMPACT_FRESHNESS_OUTPUT,
        help="compact snapshot freshness status path when --compact-snapshot-freshness --write is used",
    )
    parser.add_argument(
        "--compact-freshness-receipt-output",
        default=DEFAULT_COMPACT_FRESHNESS_RECEIPT_OUTPUT,
        help="compact snapshot freshness receipt path when --compact-snapshot-freshness --write is used",
    )
    parser.add_argument("--handoff-capsule", action="store_true", help="print one sidebar-safe team handoff capsule")
    parser.add_argument("--operator-action-card", action="store_true", help="print one exact-gate operator action card")
    parser.add_argument("--operator-brief", action="store_true", help="print one Markdown operator action brief")
    parser.add_argument("--check-approval", default=None, help="validate an approval phrase without executing it")
    parser.add_argument("--approval", default=None, help="operator approval phrase for deferred escrow/status-only flows")
    parser.add_argument("--check-ack-approval", default=None, help="validate a local role-worker ack approval phrase without executing it")
    parser.add_argument(
        "--check-queue-drain-refresh-approval",
        default=None,
        help="validate a P167 queue refresh approval phrase without executing the guard command",
    )
    parser.add_argument("--ack-action-card", action="store_true", help="print one local role-worker ack action card")
    parser.add_argument("--ack-brief", action="store_true", help="print one Markdown local role-worker ack brief")
    parser.add_argument("--ack-reconcile", action="store_true", help="print local post-ack reconcile status")
    parser.add_argument("--ack-debug", action="store_true", help="print compact local packet ack debug status")
    parser.add_argument("--post-ack-current-gate-complete", action="store_true", help="mark current_next_gate complete after ACK receipts reconcile")
    parser.add_argument("--phase-guard-summary", action="store_true", help="print one phase-aware lane guard summary")
    parser.add_argument("--worker-envelope-phase-guard", action="store_true", help="print worker-envelope phase guard status")
    parser.add_argument("--phase-next-action-selector", action="store_true", help="print one phase-aware next-action selector")
    parser.add_argument("--loop-harness-status", action="store_true", help="print Loop Harness status surface")
    parser.add_argument("--ack-gate-lock-audit", action="store_true", help="print selected-packet ACK gate-lock audit")
    parser.add_argument("--ack-execution-guard", action="store_true", help="prepare checksum-guarded packet ACK execution command")
    parser.add_argument("--queue-replenish-guard", action="store_true", help="print checksum-guarded queue replenish preview")
    parser.add_argument("--queue-drain-refresh-gate", action="store_true", help="prepare a fresh active-focus queue refresh gate after queue drain")
    parser.add_argument("--queue-drain-refresh-gate-status", action="store_true", help="inspect P167 queue refresh gate readiness without consuming it")
    parser.add_argument("--queue-drain-refresh-team-handoff", action="store_true", help="build a no-execution team handoff for the pending P167 queue refresh gate")
    parser.add_argument("--queue-drain-refresh-opencode-review", action="store_true", help="build a read-only OpenCode review packet for P167/P168/P169")
    parser.add_argument(
        "--queue-drain-refresh-post-approval-simulation",
        action="store_true",
        help="simulate the post-P167 state without executing the guard or writing packet_078",
    )
    parser.add_argument("--queue-replenish-guard-status", action="store_true", help="inspect queue replenish guard readiness")
    parser.add_argument("--queue-replenish-team-handoff", action="store_true", help="print queue replenish team handoff bundle")
    parser.add_argument("--queue-replenish-target-reconcile", action="store_true", help="reconcile queue replenish target path")
    parser.add_argument("--packet076-worker-envelope-gate", action="store_true", help="prepare packet_076 worker-envelope gate preview")
    parser.add_argument("--packet077-worker-envelope-gate", action="store_true", help="prepare packet_077 worker-envelope gate preview")
    parser.add_argument("--packet078-worker-envelope-gate", action="store_true", help="prepare packet_078 worker-envelope gate preview")
    parser.add_argument("--packet078-transition-readiness", action="store_true", help="surface P167 to P173 transition readiness without executing either gate")
    parser.add_argument("--packet078-transition-opencode-review", action="store_true", help="build a read-only OpenCode review packet for the packet_078 transition chain")
    parser.add_argument("--packet078-opencode-review-result-intake", action="store_true", help="validate an OpenCode review result for the packet_078 transition chain without executing gates")
    parser.add_argument("--packet078-opencode-review-candidate-preflight", action="store_true", help="validate an OpenCode candidate review result before the real result path is written")
    parser.add_argument("--packet078-candidate-watch", action="store_true", help="watch packet_078 OpenCode candidate review handoff without writing result or queue files")
    parser.add_argument("--packet078-candidate-poll", action="store_true", help="run a bounded local poll for packet_078 OpenCode candidate review handoff")
    parser.add_argument("--packet078-candidate-copy-gate", action="store_true", help="prepare checksum-guarded exact gate for copying packet_078 candidate review result to the real result path")
    parser.add_argument("--packet078-sequence-status", action="store_true", help="surface the packet_078 candidate/copy/review/release sequencer status without executing gates")
    parser.add_argument("--packet078-opencode-candidate-paste-pack", action="store_true", help="create a paste-ready OpenCode candidate prompt pack without writing candidate/result/queue files")
    parser.add_argument("--packet078-opencode-candidate-stall-guard", action="store_true", help="diagnose a missing packet_078 OpenCode candidate without writing candidate/result/queue files")
    parser.add_argument("--packet078-opencode-candidate-template-pack", action="store_true", help="create a fillable OpenCode candidate result template separate from the real candidate path")
    parser.add_argument("--packet078-opencode-handoff-readiness", action="store_true", help="verify the OpenCode packet_078 handoff is ready without writing candidate/result/queue files")
    parser.add_argument("--packet078-opencode-post-handoff-router", action="store_true", help="route packet_078 after OpenCode handoff without writing candidate/result/command/queue files")
    parser.add_argument("--packet078-post-candidate-reconcile-bundle", action="store_true", help="refresh P201/P204/P205 packet_078 post-candidate surfaces without writing candidate/result/queue/guard files")
    parser.add_argument("--packet078-candidate-arrival-watch", action="store_true", help="bounded local watch for P185 candidate arrival; refresh P206 only after candidate exists")
    parser.add_argument("--packet078-opencode-operator-handoff-pack", action="store_true", help="write a checksum-guarded local operator helper for copying P195 prompt and running P207 watch")
    parser.add_argument("--packet078-opencode-operator-handoff-status-surface", action="store_true", help="surface P208 OpenCode operator handoff readiness without writing candidate/result/queue/guard files")
    parser.add_argument("--packet078-opencode-operator-status-brief", action="store_true", help="build a sidebar/Telegram-safe operator brief for the packet_078 OpenCode handoff without sending it")
    parser.add_argument("--packet078-opencode-watch-stall-status", action="store_true", help="surface exhausted P207 watch state and stop blind local retry loops")
    parser.add_argument("--packet078-opencode-manual-paste-pending-status", action="store_true", help="surface P220 clipboard-loaded/P185-missing manual paste state without pasting into OpenCode")
    parser.add_argument("--packet078-opencode-manual-paste-action-card", action="store_true", help="build a local-safe operator action card for manual OpenCode paste without executing it")
    parser.add_argument("--packet078-post-p185-accelerator-status", action="store_true", help="surface next local-safe action after P185 candidate appears without writing P175/P193/packet_078")
    parser.add_argument("--packet078-clipboard-freshness-guard", action="store_true", help="verify P220/P195 clipboard receipt freshness without reading clipboard or pasting into OpenCode")
    parser.add_argument("--packet078-opencode-review-result-template", action="store_true", help="build an OpenCode result template without writing the real result path")
    parser.add_argument("--packet078-opencode-review-handoff-capsule", action="store_true", help="build a read-only OpenCode handoff capsule for packet_078 transition review")
    parser.add_argument("--packet078-opencode-review-status-surface", action="store_true", help="surface packet_078 OpenCode review readiness without executing gates")
    parser.add_argument("--packet078-p167-deferred-approval-escrow", action="store_true", help="record exact P167 approval as pending until P176 review intake passes")
    parser.add_argument("--packet078-p167-escrow-release-readiness", action="store_true", help="surface whether escrowed P167 can be released after P176 review intake")
    parser.add_argument("--packet078-p167-release-watch", action="store_true", help="watch the P167 escrow release chain without consuming approval or writing packet_078")
    parser.add_argument("--current-next-gate-advance", action="store_true", help="advance current_next_gate to the ready worker-envelope gate without executing it")
    parser.add_argument("--packet077-worker-envelope-execution-audit", action="store_true", help="audit packet_077 worker-envelope write readiness without executing it")
    parser.add_argument(
        "--packet077-post-write-ack-readiness-simulation",
        action="store_true",
        help="project packet_077 ACK readiness after exact P156 envelope write without executing it",
    )
    parser.add_argument("--current-next-gate", default=DEFAULT_CURRENT_NEXT_GATE, help="current next gate status JSON")
    parser.add_argument(
        "--current-next-gate-advance-backup-output",
        default=DEFAULT_CURRENT_NEXT_GATE_ADVANCE_BACKUP,
        help="backup path for previous current_next_gate when --current-next-gate-advance --write is used",
    )
    parser.add_argument(
        "--post-ack-current-gate-complete-backup-output",
        default=DEFAULT_POST_ACK_CURRENT_GATE_COMPLETE_BACKUP,
        help="backup path for previous current_next_gate when --post-ack-current-gate-complete --write is used",
    )
    parser.add_argument("--handoff-output", default=DEFAULT_HANDOFF_OUTPUT, help="handoff capsule output path when --write is used")
    parser.add_argument("--action-card-output", default=DEFAULT_ACTION_CARD_OUTPUT, help="operator action card output path when --write is used")
    parser.add_argument("--operator-brief-output", default=DEFAULT_OPERATOR_BRIEF_OUTPUT, help="operator brief output path when --write is used")
    parser.add_argument("--approval-check-output", default=DEFAULT_APPROVAL_CHECK_OUTPUT, help="approval check output path when --write is used")
    parser.add_argument("--ack-action-card-output", default=DEFAULT_ACK_ACTION_CARD_OUTPUT, help="ack action card output path when --write is used")
    parser.add_argument("--ack-brief-output", default=DEFAULT_ACK_BRIEF_OUTPUT, help="ack brief output path when --write is used")
    parser.add_argument("--ack-gate-output", default=DEFAULT_ACK_GATE_OUTPUT, help="ack gate output path when --write is used")
    parser.add_argument("--ack-approval-check-output", default=DEFAULT_ACK_APPROVAL_CHECK_OUTPUT, help="ack approval check output path when --write is used")
    parser.add_argument("--ack-reconcile-output", default=DEFAULT_ACK_RECONCILE_OUTPUT, help="ack reconcile output path when --write is used")
    parser.add_argument("--ack-debug-output", default=DEFAULT_ACK_DEBUG_OUTPUT, help="ack debug output path when --write is used")
    parser.add_argument(
        "--phase-guard-summary-output",
        default=DEFAULT_PHASE_GUARD_SUMMARY_OUTPUT,
        help="phase guard summary output path when --write is used",
    )
    parser.add_argument(
        "--worker-envelope-phase-guard-output",
        default=DEFAULT_WORKER_ENVELOPE_PHASE_GUARD_OUTPUT,
        help="worker-envelope phase guard output path when --write is used",
    )
    parser.add_argument(
        "--phase-next-action-selector-output",
        default=DEFAULT_PHASE_NEXT_ACTION_SELECTOR_OUTPUT,
        help="phase next-action selector output path when --write is used",
    )
    parser.add_argument(
        "--loop-harness-evidence",
        default=DEFAULT_LOOP_HARNESS_EVIDENCE,
        help="Loop Harness validation evidence JSON",
    )
    parser.add_argument(
        "--loop-harness-receipt",
        default=DEFAULT_LOOP_HARNESS_RECEIPT,
        help="Loop Harness validation receipt JSON",
    )
    parser.add_argument(
        "--loop-harness-review",
        default=DEFAULT_LOOP_HARNESS_REVIEW,
        help="Loop Harness OpenCode review packet JSON",
    )
    parser.add_argument(
        "--loop-harness-status-output",
        default=DEFAULT_LOOP_HARNESS_STATUS_OUTPUT,
        help="Loop Harness status surface output path when --write is used",
    )
    parser.add_argument(
        "--loop-harness-status-receipt-output",
        default=DEFAULT_LOOP_HARNESS_STATUS_RECEIPT_OUTPUT,
        help="Loop Harness status surface receipt path when --write is used",
    )
    parser.add_argument(
        "--ack-gate-lock-audit-output",
        default=DEFAULT_ACK_GATE_LOCK_AUDIT_OUTPUT,
        help="ack gate-lock audit output path when --write is used",
    )
    parser.add_argument(
        "--ack-gate-lock-audit-receipt-output",
        default=DEFAULT_ACK_GATE_LOCK_AUDIT_RECEIPT_OUTPUT,
        help="ack gate-lock audit receipt path when --write is used",
    )
    parser.add_argument(
        "--ack-execution-guard-preview-output",
        default=DEFAULT_ACK_EXECUTION_GUARD_PREVIEW_OUTPUT,
        help="ack execution guard preview path when --write is used",
    )
    parser.add_argument(
        "--ack-execution-guard-command-output",
        default=DEFAULT_ACK_EXECUTION_GUARD_COMMAND_OUTPUT,
        help="ack execution checksum guard command path when --write is used",
    )
    parser.add_argument(
        "--ack-execution-guard-receipt-output",
        default=DEFAULT_ACK_EXECUTION_GUARD_RECEIPT_OUTPUT,
        help="ack execution guard receipt path when --write is used",
    )
    parser.add_argument(
        "--ack-execution-guard-audit-output",
        default=DEFAULT_ACK_GATE_LOCK_AUDIT_OUTPUT,
        help="ack gate-lock audit path required by --ack-execution-guard",
    )
    parser.add_argument(
        "--queue-replenish-preview-output",
        default=DEFAULT_QUEUE_REPLENISH_PREVIEW_OUTPUT,
        help="queue replenish packet preview path when --write is used",
    )
    parser.add_argument(
        "--queue-replenish-command-output",
        default=DEFAULT_QUEUE_REPLENISH_COMMAND_OUTPUT,
        help="queue replenish checksum guard command path when --write is used",
    )
    parser.add_argument(
        "--queue-replenish-receipt-output",
        default=DEFAULT_QUEUE_REPLENISH_RECEIPT_OUTPUT,
        help="queue replenish guard receipt path when --write is used",
    )
    parser.add_argument(
        "--queue-replenish-status-output",
        default=DEFAULT_QUEUE_REPLENISH_STATUS_OUTPUT,
        help="queue replenish guard status output path when --write is used",
    )
    parser.add_argument(
        "--queue-replenish-status-receipt-output",
        default=DEFAULT_QUEUE_REPLENISH_STATUS_RECEIPT_OUTPUT,
        help="queue replenish guard status receipt path when --write is used",
    )
    parser.add_argument(
        "--queue-replenish-team-handoff-output",
        default=DEFAULT_QUEUE_REPLENISH_TEAM_HANDOFF_OUTPUT,
        help="queue replenish team handoff output path when --write is used",
    )
    parser.add_argument(
        "--queue-replenish-team-handoff-receipt-output",
        default=DEFAULT_QUEUE_REPLENISH_TEAM_HANDOFF_RECEIPT_OUTPUT,
        help="queue replenish team handoff receipt path when --write is used",
    )
    parser.add_argument(
        "--queue-replenish-target-reconcile-output",
        default=DEFAULT_QUEUE_REPLENISH_TARGET_RECONCILE_OUTPUT,
        help="queue replenish target reconcile output path when --write is used",
    )
    parser.add_argument(
        "--queue-replenish-target-reconcile-receipt-output",
        default=DEFAULT_QUEUE_REPLENISH_TARGET_RECONCILE_RECEIPT_OUTPUT,
        help="queue replenish target reconcile receipt path when --write is used",
    )
    parser.add_argument(
        "--queue-drain-refresh-backup-output",
        default=DEFAULT_QUEUE_DRAIN_REFRESH_CURRENT_GATE_BACKUP,
        help="backup path for previous current_next_gate when --queue-drain-refresh-gate --write is used",
    )
    parser.add_argument(
        "--packet076-worker-envelope-preview-output",
        default=DEFAULT_PACKET076_WORKER_ENVELOPE_PREVIEW_OUTPUT,
        help="packet_076 worker-envelope preview path when --write is used",
    )
    parser.add_argument(
        "--packet076-worker-envelope-command-output",
        default=DEFAULT_PACKET076_WORKER_ENVELOPE_COMMAND_OUTPUT,
        help="packet_076 worker-envelope checksum guard command path when --write is used",
    )
    parser.add_argument(
        "--packet076-worker-envelope-receipt-output",
        default=DEFAULT_PACKET076_WORKER_ENVELOPE_RECEIPT_OUTPUT,
        help="packet_076 worker-envelope gate receipt path when --write is used",
    )
    parser.add_argument(
        "--packet077-worker-envelope-preview-output",
        default=DEFAULT_PACKET077_WORKER_ENVELOPE_PREVIEW_OUTPUT,
        help="packet_077 worker-envelope preview path when --write is used",
    )
    parser.add_argument(
        "--packet077-worker-envelope-command-output",
        default=DEFAULT_PACKET077_WORKER_ENVELOPE_COMMAND_OUTPUT,
        help="packet_077 worker-envelope checksum guard command path when --write is used",
    )
    parser.add_argument(
        "--packet077-worker-envelope-receipt-output",
        default=DEFAULT_PACKET077_WORKER_ENVELOPE_RECEIPT_OUTPUT,
        help="packet_077 worker-envelope gate receipt path when --write is used",
    )
    parser.add_argument(
        "--packet078-worker-envelope-preview-output",
        default=DEFAULT_PACKET078_WORKER_ENVELOPE_PREVIEW_OUTPUT,
        help="packet_078 worker-envelope preview path when --write is used",
    )
    parser.add_argument(
        "--packet078-worker-envelope-command-output",
        default=DEFAULT_PACKET078_WORKER_ENVELOPE_COMMAND_OUTPUT,
        help="packet_078 worker-envelope checksum guard command path when --write is used",
    )
    parser.add_argument(
        "--packet078-worker-envelope-receipt-output",
        default=DEFAULT_PACKET078_WORKER_ENVELOPE_RECEIPT_OUTPUT,
        help="packet_078 worker-envelope gate receipt path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-review-result",
        default=".ghostclaw_runtime/a2a2a/reviews/A2A2A-P175-PACKET078-TRANSITION-OPENCODE-REVIEW-RESULT-20260704.json",
        help="OpenCode read-only review result JSON for P175/P176 intake",
    )
    parser.add_argument(
        "--packet078-opencode-review-candidate",
        default=DEFAULT_PACKET078_OPENCODE_REVIEW_CANDIDATE,
        help="OpenCode candidate review result JSON to preflight before writing the real result path",
    )
    parser.add_argument(
        "--packet078-opencode-review-candidate-preflight-output",
        default=DEFAULT_PACKET078_OPENCODE_REVIEW_CANDIDATE_PREFLIGHT_OUTPUT,
        help="P185 candidate preflight status path used by post-P185 acceleration",
    )
    parser.add_argument(
        "--packet078-candidate-call-status",
        default=DEFAULT_PACKET078_CANDIDATE_CALL_STATUS,
        help="P187 candidate-call status JSON for compact sidebar routing",
    )
    parser.add_argument(
        "--packet078-candidate-poll-status",
        default=DEFAULT_PACKET078_CANDIDATE_POLL_STATUS,
        help="P191 candidate-poll status JSON for compact sidebar routing",
    )
    parser.add_argument(
        "--packet078-candidate-poll-attempts",
        type=int,
        default=3,
        help="bounded candidate poll attempts for --packet078-candidate-poll",
    )
    parser.add_argument(
        "--packet078-candidate-poll-interval",
        type=float,
        default=2.0,
        help="seconds between bounded candidate poll attempts for --packet078-candidate-poll",
    )
    parser.add_argument(
        "--packet078-candidate-copy-command-output",
        default=DEFAULT_PACKET078_CANDIDATE_COPY_COMMAND_OUTPUT,
        help="P193 checksum guard command path for candidate-to-real review-result copy",
    )
    parser.add_argument(
        "--packet078-sequence-status-output",
        default=DEFAULT_PACKET078_SEQUENCE_STATUS_OUTPUT,
        help="P194 packet_078 sequence status path when --write is used",
    )
    parser.add_argument(
        "--packet078-sequence-status-receipt-output",
        default=DEFAULT_PACKET078_SEQUENCE_STATUS_RECEIPT_OUTPUT,
        help="P194 packet_078 sequence status receipt path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-candidate-call-packet",
        default=DEFAULT_PACKET078_OPENCODE_CANDIDATE_CALL_PACKET,
        help="P186 OpenCode candidate-call packet used by the P195 paste pack",
    )
    parser.add_argument(
        "--packet078-opencode-candidate-paste-prompt-output",
        default=DEFAULT_PACKET078_OPENCODE_CANDIDATE_PASTE_PROMPT_OUTPUT,
        help="P195 paste-ready OpenCode prompt text path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-candidate-paste-pack-output",
        default=DEFAULT_PACKET078_OPENCODE_CANDIDATE_PASTE_PACK_OUTPUT,
        help="P195 OpenCode candidate paste pack status path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-candidate-paste-pack-receipt-output",
        default=DEFAULT_PACKET078_OPENCODE_CANDIDATE_PASTE_PACK_RECEIPT,
        help="P195 OpenCode candidate paste pack receipt path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-candidate-paste-pack-status",
        default=DEFAULT_PACKET078_OPENCODE_CANDIDATE_PASTE_PACK_OUTPUT,
        help="P195 paste pack status JSON used by the P196 stall guard",
    )
    parser.add_argument(
        "--packet078-opencode-candidate-stall-guard-output",
        default=DEFAULT_PACKET078_OPENCODE_CANDIDATE_STALL_GUARD_OUTPUT,
        help="P196 OpenCode candidate stall guard status path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-candidate-stall-guard-receipt-output",
        default=DEFAULT_PACKET078_OPENCODE_CANDIDATE_STALL_GUARD_RECEIPT,
        help="P196 OpenCode candidate stall guard receipt path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-candidate-template-output",
        default=DEFAULT_PACKET078_OPENCODE_CANDIDATE_TEMPLATE_OUTPUT,
        help="P197 fillable OpenCode candidate template path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-candidate-template-pack-output",
        default=DEFAULT_PACKET078_OPENCODE_CANDIDATE_TEMPLATE_PACK_OUTPUT,
        help="P197 OpenCode candidate template pack status path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-candidate-template-pack-receipt-output",
        default=DEFAULT_PACKET078_OPENCODE_CANDIDATE_TEMPLATE_PACK_RECEIPT,
        help="P197 OpenCode candidate template pack receipt path when --write is used",
    )
    parser.add_argument(
        "--packet078-unfilled-template-guard-status",
        default=DEFAULT_PACKET078_UNFILLED_TEMPLATE_GUARD_STATUS,
        help="P198 unfilled-template false-pass guard status JSON used by P200",
    )
    parser.add_argument(
        "--packet078-p195-prompt-canonicalization-status",
        default=DEFAULT_PACKET078_P195_PROMPT_CANONICALIZATION_STATUS,
        help="P199 P195 prompt canonicalization status JSON used by P200",
    )
    parser.add_argument(
        "--packet078-opencode-handoff-readiness-output",
        default=DEFAULT_PACKET078_OPENCODE_HANDOFF_READINESS_OUTPUT,
        help="P200 OpenCode handoff readiness status path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-handoff-readiness-receipt-output",
        default=DEFAULT_PACKET078_OPENCODE_HANDOFF_READINESS_RECEIPT,
        help="P200 OpenCode handoff readiness receipt path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-post-handoff-router-output",
        default=DEFAULT_PACKET078_OPENCODE_POST_HANDOFF_ROUTER_OUTPUT,
        help="P201 post-OpenCode-handoff router status path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-post-handoff-router-receipt-output",
        default=DEFAULT_PACKET078_OPENCODE_POST_HANDOFF_ROUTER_RECEIPT,
        help="P201 post-OpenCode-handoff router receipt path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-post-handoff-router-status",
        default=DEFAULT_PACKET078_OPENCODE_POST_HANDOFF_ROUTER_OUTPUT,
        help="P201 post-OpenCode-handoff router status JSON for compact sidebar routing",
    )
    parser.add_argument(
        "--packet078-post-candidate-reconcile-output",
        default=DEFAULT_PACKET078_POST_CANDIDATE_RECONCILE_OUTPUT,
        help="P206 post-candidate reconcile bundle status path when --write is used",
    )
    parser.add_argument(
        "--packet078-post-candidate-reconcile-receipt-output",
        default=DEFAULT_PACKET078_POST_CANDIDATE_RECONCILE_RECEIPT,
        help="P206 post-candidate reconcile bundle receipt path when --write is used",
    )
    parser.add_argument(
        "--packet078-candidate-watch-attempts",
        type=int,
        default=3,
        help="bounded attempts for --packet078-candidate-arrival-watch",
    )
    parser.add_argument(
        "--packet078-candidate-watch-interval",
        type=float,
        default=2.0,
        help="seconds between bounded P185 candidate checks",
    )
    parser.add_argument(
        "--packet078-candidate-arrival-watch-output",
        default=DEFAULT_PACKET078_CANDIDATE_ARRIVAL_WATCH_OUTPUT,
        help="P207 candidate arrival watch status path when --write is used",
    )
    parser.add_argument(
        "--packet078-candidate-arrival-watch-receipt-output",
        default=DEFAULT_PACKET078_CANDIDATE_ARRIVAL_WATCH_RECEIPT,
        help="P207 candidate arrival watch receipt path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-operator-handoff-output",
        default=DEFAULT_PACKET078_OPENCODE_OPERATOR_HANDOFF_OUTPUT,
        help="P208 OpenCode operator handoff pack status path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-operator-handoff-receipt-output",
        default=DEFAULT_PACKET078_OPENCODE_OPERATOR_HANDOFF_RECEIPT,
        help="P208 OpenCode operator handoff pack receipt path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-operator-handoff-command-output",
        default=DEFAULT_PACKET078_OPENCODE_OPERATOR_HANDOFF_COMMAND,
        help="P208 checksum-guarded local operator handoff command path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-operator-handoff-status",
        default=DEFAULT_PACKET078_OPENCODE_OPERATOR_HANDOFF_OUTPUT,
        help="P208 OpenCode operator handoff pack status JSON for P209/compact sidebar routing",
    )
    parser.add_argument(
        "--packet078-opencode-operator-handoff-status-output",
        default=DEFAULT_PACKET078_OPENCODE_OPERATOR_HANDOFF_STATUS_OUTPUT,
        help="P209 OpenCode operator handoff status path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-operator-handoff-status-receipt-output",
        default=DEFAULT_PACKET078_OPENCODE_OPERATOR_HANDOFF_STATUS_RECEIPT,
        help="P209 OpenCode operator handoff status receipt path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-operator-status-brief-output",
        default=DEFAULT_PACKET078_OPENCODE_OPERATOR_STATUS_BRIEF_OUTPUT,
        help="P210 OpenCode operator status brief path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-operator-status-brief-receipt-output",
        default=DEFAULT_PACKET078_OPENCODE_OPERATOR_STATUS_BRIEF_RECEIPT,
        help="P210 OpenCode operator status brief receipt path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-clipboard-load-status-output",
        default=DEFAULT_PACKET078_OPENCODE_CLIPBOARD_LOAD_STATUS,
        help="P220 local clipboard-load status path for P221 manual-paste pending surface",
    )
    parser.add_argument(
        "--packet078-opencode-clipboard-load-receipt-output",
        default=DEFAULT_PACKET078_OPENCODE_CLIPBOARD_LOAD_RECEIPT,
        help="P220 local clipboard-load receipt path",
    )
    parser.add_argument(
        "--packet078-opencode-manual-paste-pending-status-output",
        default=DEFAULT_PACKET078_OPENCODE_MANUAL_PASTE_PENDING_STATUS_OUTPUT,
        help="P221 manual-paste pending status path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-manual-paste-pending-status-receipt-output",
        default=DEFAULT_PACKET078_OPENCODE_MANUAL_PASTE_PENDING_STATUS_RECEIPT,
        help="P221 manual-paste pending status receipt path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-manual-paste-action-card-output",
        default=DEFAULT_PACKET078_OPENCODE_MANUAL_PASTE_ACTION_CARD_OUTPUT,
        help="P223 manual-paste action card path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-manual-paste-action-card-receipt-output",
        default=DEFAULT_PACKET078_OPENCODE_MANUAL_PASTE_ACTION_CARD_RECEIPT,
        help="P223 manual-paste action card receipt path when --write is used",
    )
    parser.add_argument(
        "--packet078-post-p185-accelerator-status-output",
        default=DEFAULT_PACKET078_POST_P185_ACCELERATOR_STATUS_OUTPUT,
        help="P225 post-P185 accelerator status path when --write is used",
    )
    parser.add_argument(
        "--packet078-post-p185-accelerator-status-receipt-output",
        default=DEFAULT_PACKET078_POST_P185_ACCELERATOR_STATUS_RECEIPT,
        help="P225 post-P185 accelerator receipt path when --write is used",
    )
    parser.add_argument(
        "--packet078-clipboard-freshness-guard-output",
        default=DEFAULT_PACKET078_CLIPBOARD_FRESHNESS_GUARD_OUTPUT,
        help="P227 clipboard freshness guard status path when --write is used",
    )
    parser.add_argument(
        "--packet078-clipboard-freshness-guard-receipt-output",
        default=DEFAULT_PACKET078_CLIPBOARD_FRESHNESS_GUARD_RECEIPT,
        help="P227 clipboard freshness guard receipt path when --write is used",
    )
    parser.add_argument(
        "--packet078-clipboard-freshness-max-age-seconds",
        type=int,
        default=3600,
        help="maximum acceptable age for the P220 clipboard receipt before manual paste should refresh",
    )
    parser.add_argument(
        "--packet078-opencode-watch-stall-status-output",
        default=DEFAULT_PACKET078_OPENCODE_WATCH_STALL_STATUS_OUTPUT,
        help="P213 OpenCode watch-stall status path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-watch-stall-status-input",
        default=DEFAULT_PACKET078_OPENCODE_WATCH_STALL_STATUS_OUTPUT,
        help="P213 OpenCode watch-stall status JSON for compact sidebar routing",
    )
    parser.add_argument(
        "--packet078-opencode-watch-stall-status-receipt-output",
        default=DEFAULT_PACKET078_OPENCODE_WATCH_STALL_STATUS_RECEIPT,
        help="P213 OpenCode watch-stall status receipt path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-review-result-template-output",
        default=DEFAULT_PACKET078_OPENCODE_REVIEW_RESULT_TEMPLATE_OUTPUT,
        help="OpenCode review-result template path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-review-handoff-output",
        default=DEFAULT_PACKET078_OPENCODE_REVIEW_HANDOFF_OUTPUT,
        help="OpenCode review handoff capsule path when --write is used",
    )
    parser.add_argument(
        "--packet078-opencode-review-status-output",
        default=DEFAULT_PACKET078_OPENCODE_REVIEW_STATUS_OUTPUT,
        help="OpenCode review status surface path when --write is used",
    )
    parser.add_argument(
        "--packet078-p167-deferred-approval-output",
        default=DEFAULT_PACKET078_P167_DEFERRED_APPROVAL_OUTPUT,
        help="P167 deferred approval escrow path when --write is used",
    )
    parser.add_argument(
        "--packet078-p167-deferred-approval",
        default=DEFAULT_PACKET078_P167_DEFERRED_APPROVAL_OUTPUT,
        help="P167 deferred approval escrow JSON for release-readiness checks",
    )
    parser.add_argument(
        "--packet078-p167-escrow-release-output",
        default=DEFAULT_PACKET078_P167_ESCROW_RELEASE_OUTPUT,
        help="P167 escrow release readiness path when --write is used",
    )
    parser.add_argument(
        "--packet078-p167-release-watch-output",
        default=DEFAULT_PACKET078_P167_RELEASE_WATCH_OUTPUT,
        help="P167 release watch status path when --write is used",
    )
    parser.add_argument(
        "--packet077-worker-envelope-execution-audit-output",
        default=DEFAULT_PACKET077_WORKER_ENVELOPE_EXECUTION_AUDIT_OUTPUT,
        help="packet_077 P159 execution audit evidence path for projected ACK readiness simulation",
    )
    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    if args.dry_run_report:
        dry_run_report = read_json(resolve_under_root(root, args.dry_run_report))
    else:
        dry_run_report = load_current_dry_run(root)

    plan = build_orchestrator_plan(root, dry_run_report, limit=args.top)
    queue_artifact_overrides = current_queue_replenish_artifact_overrides(
        build_current_gate_overlay(root, args.current_next_gate)
    )
    queue_preview_output = resolve_default_queue_replenish_path(
        args.queue_replenish_preview_output,
        DEFAULT_QUEUE_REPLENISH_PREVIEW_OUTPUT,
        queue_artifact_overrides.get("preview"),
    )
    queue_command_output = resolve_default_queue_replenish_path(
        args.queue_replenish_command_output,
        DEFAULT_QUEUE_REPLENISH_COMMAND_OUTPUT,
        queue_artifact_overrides.get("command"),
    )
    queue_receipt_output = resolve_default_queue_replenish_path(
        args.queue_replenish_receipt_output,
        DEFAULT_QUEUE_REPLENISH_RECEIPT_OUTPUT,
        queue_artifact_overrides.get("receipt"),
    )
    queue_status_output = resolve_default_queue_replenish_path(
        args.queue_replenish_status_output,
        DEFAULT_QUEUE_REPLENISH_STATUS_OUTPUT,
        queue_artifact_overrides.get("status"),
    )
    queue_status_receipt_output = resolve_default_queue_replenish_path(
        args.queue_replenish_status_receipt_output,
        DEFAULT_QUEUE_REPLENISH_STATUS_RECEIPT_OUTPUT,
        queue_artifact_overrides.get("status_receipt"),
    )
    queue_team_handoff_output = resolve_default_queue_replenish_path(
        args.queue_replenish_team_handoff_output,
        DEFAULT_QUEUE_REPLENISH_TEAM_HANDOFF_OUTPUT,
        queue_artifact_overrides.get("team_handoff"),
    )
    queue_team_handoff_receipt_output = resolve_default_queue_replenish_path(
        args.queue_replenish_team_handoff_receipt_output,
        DEFAULT_QUEUE_REPLENISH_TEAM_HANDOFF_RECEIPT_OUTPUT,
        queue_artifact_overrides.get("team_handoff_receipt"),
    )
    if args.write:
        output_path = resolve_under_root(root, args.output)
        receipt_path = resolve_under_root(root, args.receipt)
        write_json(output_path, plan)
        receipt = build_receipt(plan, rel(root, output_path))
        write_json(receipt_path, receipt)
        plan["receipt_path"] = rel(root, receipt_path)

    if args.ack_brief:
        ack_card = build_role_worker_ack_action_card(root, plan, args.current_next_gate)
        ack_gate = build_role_worker_ack_gate(ack_card)
        stdout_text = render_role_worker_ack_brief(ack_card)
        if args.write:
            ack_card_path = resolve_under_root(root, args.ack_action_card_output)
            ack_brief_path = resolve_under_root(root, args.ack_brief_output)
            ack_gate_output = (
                default_role_worker_ack_gate_output(ack_card)
                if args.ack_gate_output == DEFAULT_ACK_GATE_OUTPUT
                else args.ack_gate_output
            )
            ack_gate_path = resolve_under_root(root, ack_gate_output)
            write_json(ack_card_path, ack_card)
            write_json(ack_gate_path, ack_gate)
            ack_brief_path.parent.mkdir(parents=True, exist_ok=True)
            ack_brief_path.write_text(stdout_text, encoding="utf-8")
        print(stdout_text)
        return 0
    if args.current_next_gate_advance:
        stdout_plan = build_current_next_gate_advance(
            root,
            plan,
            args.current_next_gate,
            args.current_next_gate_advance_backup_output,
        )
        if args.write:
            output_path = resolve_under_root(root, args.output)
            receipt_path = resolve_under_root(root, args.receipt)
            current_gate_path = resolve_under_root(root, args.current_next_gate)
            backup_path = resolve_under_root(root, args.current_next_gate_advance_backup_output)
            write_json(output_path, stdout_plan)
            if current_gate_path.is_file():
                backup_path.parent.mkdir(parents=True, exist_ok=True)
                backup_path.write_text(current_gate_path.read_text(encoding="utf-8"), encoding="utf-8")
            if stdout_plan.get("status") == "advanced_to_worker_envelope_exact_gate":
                write_json(current_gate_path, stdout_plan["current_next_gate_payload"])
            write_json(receipt_path, build_current_next_gate_advance_receipt(stdout_plan, rel(root, output_path)))
            stdout_plan["evidence_path"] = rel(root, output_path)
            stdout_plan["receipt_path"] = rel(root, receipt_path)
            stdout_plan["current_next_gate_path"] = rel(root, current_gate_path)
            stdout_plan["backup_path"] = rel(root, backup_path) if backup_path.is_file() else None
    elif args.packet077_worker_envelope_execution_audit:
        stdout_plan = build_packet077_worker_envelope_execution_audit(
            root,
            plan,
            args.current_next_gate,
            args.packet077_worker_envelope_preview_output,
            args.packet077_worker_envelope_command_output,
        )
        if args.write:
            output_path = resolve_under_root(root, args.output)
            receipt_path = resolve_under_root(root, args.receipt)
            write_json(output_path, stdout_plan)
            write_json(
                receipt_path,
                build_packet_worker_envelope_execution_audit_receipt(stdout_plan, rel(root, output_path)),
            )
            stdout_plan["evidence_path"] = rel(root, output_path)
            stdout_plan["receipt_path"] = rel(root, receipt_path)
    elif args.packet077_post_write_ack_readiness_simulation:
        stdout_plan = build_packet077_post_write_ack_readiness_simulation(
            root,
            plan,
            args.current_next_gate,
            args.packet077_worker_envelope_execution_audit_output,
        )
        if args.write:
            output_path = resolve_under_root(root, args.output)
            receipt_path = resolve_under_root(root, args.receipt)
            write_json(output_path, stdout_plan)
            write_json(
                receipt_path,
                build_packet077_post_write_ack_readiness_simulation_receipt(stdout_plan, rel(root, output_path)),
            )
            stdout_plan["evidence_path"] = rel(root, output_path)
            stdout_plan["receipt_path"] = rel(root, receipt_path)
    elif args.queue_drain_refresh_gate:
        stdout_plan = build_queue_drain_refresh_gate(root, plan)
        if args.write:
            output_path = resolve_under_root(root, args.output)
            receipt_path = resolve_under_root(root, args.receipt)
            current_gate_path = resolve_under_root(root, args.current_next_gate)
            backup_path = resolve_under_root(root, args.queue_drain_refresh_backup_output)
            preview_path = resolve_under_root(root, str(stdout_plan["preview_path"]))
            command_path = resolve_under_root(root, str(stdout_plan["command_path"]))
            guard_receipt_path = resolve_under_root(root, str(stdout_plan["guard_receipt_path"]))
            stdout_plan["current_next_gate_payload"]["artifacts"]["evidence_path"] = rel(root, output_path)
            stdout_plan["current_next_gate_payload"]["artifacts"]["receipt_path"] = rel(root, receipt_path)
            write_json(output_path, stdout_plan)
            if current_gate_path.is_file():
                backup_path.parent.mkdir(parents=True, exist_ok=True)
                backup_path.write_text(current_gate_path.read_text(encoding="utf-8"), encoding="utf-8")
            if stdout_plan.get("status") == "ready_for_exact_queue_refresh_gate":
                write_json(preview_path, stdout_plan["preview_payload"])
                if stdout_plan.get("guard_script") is not None:
                    command_path.parent.mkdir(parents=True, exist_ok=True)
                    command_path.write_text(str(stdout_plan["guard_script"]), encoding="utf-8")
                    command_path.chmod(0o755)
                write_json(current_gate_path, stdout_plan["current_next_gate_payload"])
            receipt = build_queue_drain_refresh_gate_receipt(stdout_plan, rel(root, output_path))
            write_json(receipt_path, receipt)
            write_json(guard_receipt_path, receipt)
            stdout_plan["evidence_path"] = rel(root, output_path)
            stdout_plan["receipt_path"] = rel(root, receipt_path)
            stdout_plan["current_next_gate_path"] = rel(root, current_gate_path)
            stdout_plan["backup_path"] = rel(root, backup_path) if backup_path.is_file() else None
            stdout_plan["preview_path"] = rel(root, preview_path)
            stdout_plan["command_path"] = rel(root, command_path)
            stdout_plan["guard_receipt_path"] = rel(root, guard_receipt_path)
            stdout_plan.pop("guard_script", None)
    elif args.queue_drain_refresh_gate_status:
        stdout_plan = build_queue_drain_refresh_gate_status(root, plan, args.current_next_gate)
        if args.write:
            output_path = resolve_under_root(root, args.output)
            receipt_path = resolve_under_root(root, args.receipt)
            write_json(output_path, stdout_plan)
            write_json(receipt_path, build_queue_drain_refresh_gate_status_receipt(stdout_plan, rel(root, output_path)))
            stdout_plan["status_path"] = rel(root, output_path)
            stdout_plan["status_receipt_path"] = rel(root, receipt_path)
    elif args.queue_drain_refresh_team_handoff:
        stdout_plan = build_queue_drain_refresh_team_handoff(root, plan, args.current_next_gate)
        if args.write:
            output_path = resolve_under_root(root, args.output)
            receipt_path = resolve_under_root(root, args.receipt)
            write_json(output_path, stdout_plan)
            write_json(receipt_path, build_queue_drain_refresh_team_handoff_receipt(stdout_plan, rel(root, output_path)))
            stdout_plan["handoff_path"] = rel(root, output_path)
            stdout_plan["handoff_receipt_path"] = rel(root, receipt_path)
    elif args.queue_drain_refresh_opencode_review:
        stdout_plan = build_queue_drain_refresh_opencode_review(root, plan, args.current_next_gate)
        if args.write:
            output_path = resolve_under_root(root, args.output)
            receipt_path = resolve_under_root(root, args.receipt)
            write_json(output_path, stdout_plan)
            write_json(receipt_path, build_queue_drain_refresh_opencode_review_receipt(stdout_plan, rel(root, output_path)))
            stdout_plan["review_packet_path"] = rel(root, output_path)
            stdout_plan["review_receipt_path"] = rel(root, receipt_path)
    elif args.queue_drain_refresh_post_approval_simulation:
        stdout_plan = build_queue_drain_refresh_post_approval_simulation(root, plan, args.current_next_gate)
        if args.write:
            output_path = resolve_under_root(root, args.output)
            receipt_path = resolve_under_root(root, args.receipt)
            write_json(output_path, stdout_plan)
            write_json(
                receipt_path,
                build_queue_drain_refresh_post_approval_simulation_receipt(stdout_plan, rel(root, output_path)),
            )
            stdout_plan["simulation_path"] = rel(root, output_path)
            stdout_plan["simulation_receipt_path"] = rel(root, receipt_path)
    elif args.queue_replenish_guard:
        stdout_plan = build_queue_replenish_guard(
            root,
            plan,
            args.current_next_gate,
            queue_preview_output,
            queue_command_output,
        )
        if args.write:
            preview_path = resolve_under_root(root, queue_preview_output)
            command_path = resolve_under_root(root, queue_command_output)
            receipt_path = resolve_under_root(root, queue_receipt_output)
            if stdout_plan.get("packet_preview") is not None:
                write_json(preview_path, stdout_plan["packet_preview"])
            if stdout_plan.get("guard_script") is not None:
                command_path.parent.mkdir(parents=True, exist_ok=True)
                command_path.write_text(str(stdout_plan["guard_script"]), encoding="utf-8")
                command_path.chmod(0o755)
            receipt = build_queue_replenish_guard_receipt(stdout_plan)
            write_json(receipt_path, receipt)
            stdout_plan["preview_path"] = rel(root, preview_path)
            stdout_plan["command_path"] = rel(root, command_path)
            stdout_plan["receipt_path"] = rel(root, receipt_path)
            stdout_plan.pop("guard_script", None)
    elif args.queue_replenish_guard_status:
        stdout_plan = build_queue_replenish_guard_status(
            root,
            plan,
            args.current_next_gate,
            queue_preview_output,
            queue_command_output,
            queue_receipt_output,
            queue_status_output,
        )
        if args.write:
            status_path = resolve_under_root(root, queue_status_output)
            receipt_path = resolve_under_root(root, queue_status_receipt_output)
            stdout_plan["status_path"] = rel(root, status_path)
            stdout_plan["status_receipt_path"] = rel(root, receipt_path)
            write_json(status_path, stdout_plan)
            write_json(receipt_path, build_queue_replenish_guard_status_receipt(stdout_plan))
    elif args.queue_replenish_team_handoff:
        stdout_plan = build_queue_replenish_team_handoff(
            root,
            plan,
            args.current_next_gate,
            queue_preview_output,
            queue_command_output,
            queue_receipt_output,
            queue_status_output,
            queue_team_handoff_output,
        )
        if args.write:
            handoff_path = resolve_under_root(root, queue_team_handoff_output)
            receipt_path = resolve_under_root(root, queue_team_handoff_receipt_output)
            stdout_plan["handoff_path"] = rel(root, handoff_path)
            stdout_plan["handoff_receipt_path"] = rel(root, receipt_path)
            write_json(handoff_path, stdout_plan)
            write_json(receipt_path, build_queue_replenish_team_handoff_receipt(stdout_plan))
    elif args.queue_replenish_target_reconcile:
        stdout_plan = build_queue_replenish_target_reconcile(
            root,
            plan,
            args.current_next_gate,
            queue_preview_output,
        )
        if args.write:
            reconcile_path = resolve_under_root(root, args.queue_replenish_target_reconcile_output)
            receipt_path = resolve_under_root(root, args.queue_replenish_target_reconcile_receipt_output)
            stdout_plan["reconcile_path"] = rel(root, reconcile_path)
            stdout_plan["reconcile_receipt_path"] = rel(root, receipt_path)
            write_json(reconcile_path, stdout_plan)
            write_json(receipt_path, build_queue_replenish_target_reconcile_receipt(stdout_plan))
    elif args.packet076_worker_envelope_gate:
        stdout_plan = build_packet076_worker_envelope_gate(
            root,
            plan,
            "_A2A_QUEUE/outbox/packet_076_sirinx_agm_next_local_task_card.json",
            args.packet076_worker_envelope_preview_output,
            args.packet076_worker_envelope_command_output,
        )
        if args.write:
            preview_path = resolve_under_root(root, args.packet076_worker_envelope_preview_output)
            command_path = resolve_under_root(root, args.packet076_worker_envelope_command_output)
            receipt_path = resolve_under_root(root, args.packet076_worker_envelope_receipt_output)
            if stdout_plan.get("preview_payload") is not None:
                write_json(preview_path, stdout_plan["preview_payload"])
            if stdout_plan.get("guard_script") is not None:
                command_path.parent.mkdir(parents=True, exist_ok=True)
                command_path.write_text(str(stdout_plan["guard_script"]), encoding="utf-8")
                command_path.chmod(0o755)
            stdout_plan["preview_path"] = rel(root, preview_path)
            stdout_plan["command_path"] = rel(root, command_path)
            stdout_plan["receipt_path"] = rel(root, receipt_path)
            write_json(receipt_path, build_packet076_worker_envelope_gate_receipt(stdout_plan))
            stdout_plan.pop("guard_script", None)
    elif args.packet077_worker_envelope_gate:
        stdout_plan = build_packet077_worker_envelope_gate(
            root,
            plan,
            "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
            args.packet077_worker_envelope_preview_output,
            args.packet077_worker_envelope_command_output,
        )
        if args.write:
            preview_path = resolve_under_root(root, args.packet077_worker_envelope_preview_output)
            command_path = resolve_under_root(root, args.packet077_worker_envelope_command_output)
            receipt_path = resolve_under_root(root, args.packet077_worker_envelope_receipt_output)
            if stdout_plan.get("preview_payload") is not None:
                write_json(preview_path, stdout_plan["preview_payload"])
            if stdout_plan.get("guard_script") is not None:
                command_path.parent.mkdir(parents=True, exist_ok=True)
                command_path.write_text(str(stdout_plan["guard_script"]), encoding="utf-8")
                command_path.chmod(0o755)
            stdout_plan["preview_path"] = rel(root, preview_path)
            stdout_plan["command_path"] = rel(root, command_path)
            stdout_plan["receipt_path"] = rel(root, receipt_path)
            write_json(receipt_path, build_packet_worker_envelope_gate_receipt(stdout_plan))
            stdout_plan.pop("guard_script", None)
    elif args.packet078_worker_envelope_gate:
        stdout_plan = build_packet078_worker_envelope_gate(
            root,
            plan,
            "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
            args.packet078_worker_envelope_preview_output,
            args.packet078_worker_envelope_command_output,
        )
        if args.write:
            preview_path = resolve_under_root(root, args.packet078_worker_envelope_preview_output)
            command_path = resolve_under_root(root, args.packet078_worker_envelope_command_output)
            receipt_path = resolve_under_root(root, args.packet078_worker_envelope_receipt_output)
            if stdout_plan.get("preview_payload") is not None:
                write_json(preview_path, stdout_plan["preview_payload"])
            if stdout_plan.get("guard_script") is not None:
                command_path.parent.mkdir(parents=True, exist_ok=True)
                command_path.write_text(str(stdout_plan["guard_script"]), encoding="utf-8")
                command_path.chmod(0o755)
            stdout_plan["preview_path"] = rel(root, preview_path)
            stdout_plan["command_path"] = rel(root, command_path)
            stdout_plan["receipt_path"] = rel(root, receipt_path)
            write_json(receipt_path, build_packet_worker_envelope_gate_receipt(stdout_plan))
            stdout_plan.pop("guard_script", None)
    elif args.packet078_transition_readiness:
        stdout_plan = build_packet078_transition_readiness(root, plan, args.current_next_gate)
        if args.write:
            output_path = resolve_under_root(root, args.output)
            receipt_path = resolve_under_root(root, args.receipt)
            write_json(output_path, stdout_plan)
            write_json(receipt_path, build_packet078_transition_readiness_receipt(stdout_plan, rel(root, output_path)))
            stdout_plan["readiness_path"] = rel(root, output_path)
            stdout_plan["readiness_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_transition_opencode_review:
        stdout_plan = build_packet078_transition_opencode_review(root, plan, args.current_next_gate)
        if args.write:
            output_path = resolve_under_root(root, args.output)
            receipt_path = resolve_under_root(root, args.receipt)
            write_json(output_path, stdout_plan)
            write_json(receipt_path, build_packet078_transition_opencode_review_receipt(stdout_plan, rel(root, output_path)))
            stdout_plan["review_packet_path"] = rel(root, output_path)
            stdout_plan["review_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_opencode_review_result_intake:
        stdout_plan = build_packet078_opencode_review_result_intake(
            root,
            plan,
            args.current_next_gate,
            args.packet078_opencode_review_result,
        )
        if args.write:
            output_path = resolve_under_root(root, args.output)
            receipt_path = resolve_under_root(root, args.receipt)
            write_json(output_path, stdout_plan)
            write_json(receipt_path, build_packet078_opencode_review_result_intake_receipt(stdout_plan, rel(root, output_path)))
            stdout_plan["intake_path"] = rel(root, output_path)
            stdout_plan["intake_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_opencode_review_candidate_preflight:
        stdout_plan = build_packet078_opencode_review_candidate_preflight(
            root,
            plan,
            args.current_next_gate,
            args.packet078_opencode_review_candidate,
            args.packet078_opencode_review_result,
        )
        if args.write:
            output_path = resolve_under_root(root, args.output)
            receipt_path = resolve_under_root(root, args.receipt)
            write_json(output_path, stdout_plan)
            write_json(
                receipt_path,
                build_packet078_opencode_review_candidate_preflight_receipt(stdout_plan, rel(root, output_path)),
            )
            stdout_plan["candidate_preflight_path"] = rel(root, output_path)
            stdout_plan["candidate_preflight_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_candidate_watch:
        stdout_plan = build_packet078_candidate_watch(
            root,
            plan,
            args.current_next_gate,
            args.packet078_opencode_review_candidate,
            args.packet078_opencode_review_result,
            args.packet078_candidate_call_status,
        )
        if args.write:
            output_path = resolve_under_root(root, args.output)
            receipt_path = resolve_under_root(root, args.receipt)
            write_json(output_path, stdout_plan)
            write_json(receipt_path, build_packet078_candidate_watch_receipt(stdout_plan, rel(root, output_path)))
            stdout_plan["candidate_watch_path"] = rel(root, output_path)
            stdout_plan["candidate_watch_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_candidate_poll:
        stdout_plan = build_packet078_candidate_poll(
            root,
            plan,
            args.current_next_gate,
            args.packet078_opencode_review_candidate,
            args.packet078_opencode_review_result,
            args.packet078_candidate_call_status,
            args.packet078_candidate_poll_attempts,
            args.packet078_candidate_poll_interval,
        )
        if args.write:
            output_path = resolve_under_root(root, args.output)
            receipt_path = resolve_under_root(root, args.receipt)
            write_json(output_path, stdout_plan)
            write_json(receipt_path, build_packet078_candidate_poll_receipt(stdout_plan, rel(root, output_path)))
            stdout_plan["candidate_poll_path"] = rel(root, output_path)
            stdout_plan["candidate_poll_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_candidate_copy_gate:
        stdout_plan = build_packet078_candidate_copy_gate(
            root,
            plan,
            args.current_next_gate,
            args.packet078_opencode_review_candidate,
            args.packet078_opencode_review_result,
            args.packet078_candidate_copy_command_output,
        )
        if args.write:
            output_path = resolve_under_root(root, args.output)
            receipt_path = resolve_under_root(root, args.receipt)
            write_json(output_path, stdout_plan)
            write_json(receipt_path, build_packet078_candidate_copy_gate_receipt(stdout_plan, rel(root, output_path)))
            guard_script = stdout_plan.pop("guard_script", None)
            if guard_script and stdout_plan.get("command_path"):
                command_path = resolve_under_root(root, str(stdout_plan["command_path"]))
                command_path.parent.mkdir(parents=True, exist_ok=True)
                command_path.write_text(str(guard_script), encoding="utf-8")
                command_path.chmod(0o755)
                stdout_plan["command_path"] = rel(root, command_path)
            else:
                stdout_plan.pop("guard_script", None)
            stdout_plan["candidate_copy_gate_path"] = rel(root, output_path)
            stdout_plan["candidate_copy_gate_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_sequence_status:
        stdout_plan = build_packet078_sequence_status(
            root,
            plan,
            args.current_next_gate,
            args.packet078_opencode_review_candidate,
            args.packet078_opencode_review_result,
            args.packet078_candidate_call_status,
            args.packet078_p167_deferred_approval,
            args.packet078_candidate_copy_command_output,
        )
        if args.write:
            output = (
                args.packet078_sequence_status_output
                if args.output == DEFAULT_OUTPUT
                else args.output
            )
            receipt = (
                args.packet078_sequence_status_receipt_output
                if args.receipt == DEFAULT_RECEIPT
                else args.receipt
            )
            output_path = resolve_under_root(root, output)
            receipt_path = resolve_under_root(root, receipt)
            write_json(output_path, stdout_plan)
            write_json(receipt_path, build_packet078_sequence_status_receipt(stdout_plan, rel(root, output_path)))
            stdout_plan["sequence_status_path"] = rel(root, output_path)
            stdout_plan["sequence_status_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_opencode_candidate_paste_pack:
        stdout_plan = build_packet078_opencode_candidate_paste_pack(
            root,
            plan,
            args.current_next_gate,
            args.packet078_opencode_candidate_call_packet,
            args.packet078_opencode_review_candidate,
            args.packet078_opencode_review_result,
            args.packet078_opencode_candidate_paste_prompt_output,
            args.packet078_candidate_copy_command_output,
        )
        if args.write:
            output = (
                args.packet078_opencode_candidate_paste_pack_output
                if args.output == DEFAULT_OUTPUT
                else args.output
            )
            receipt = (
                args.packet078_opencode_candidate_paste_pack_receipt_output
                if args.receipt == DEFAULT_RECEIPT
                else args.receipt
            )
            output_path = resolve_under_root(root, output)
            receipt_path = resolve_under_root(root, receipt)
            prompt_path = resolve_under_root(root, args.packet078_opencode_candidate_paste_prompt_output)
            prompt_path.parent.mkdir(parents=True, exist_ok=True)
            prompt_path.write_text(str(stdout_plan["opencode_prompt"]), encoding="utf-8")
            write_json(output_path, stdout_plan)
            write_json(
                receipt_path,
                build_packet078_opencode_candidate_paste_pack_receipt(stdout_plan, rel(root, output_path)),
            )
            stdout_plan["paste_pack_path"] = rel(root, output_path)
            stdout_plan["paste_pack_receipt_path"] = rel(root, receipt_path)
            stdout_plan["prompt_output_path"] = rel(root, prompt_path)
    elif args.packet078_opencode_candidate_stall_guard:
        stdout_plan = build_packet078_opencode_candidate_stall_guard(
            root,
            plan,
            args.packet078_opencode_candidate_paste_pack_status,
            args.packet078_opencode_candidate_paste_prompt_output,
            args.packet078_opencode_review_candidate,
            args.packet078_opencode_review_result,
            args.packet078_candidate_copy_command_output,
        )
        if args.write:
            output = (
                args.packet078_opencode_candidate_stall_guard_output
                if args.output == DEFAULT_OUTPUT
                else args.output
            )
            receipt = (
                args.packet078_opencode_candidate_stall_guard_receipt_output
                if args.receipt == DEFAULT_RECEIPT
                else args.receipt
            )
            output_path = resolve_under_root(root, output)
            receipt_path = resolve_under_root(root, receipt)
            write_json(output_path, stdout_plan)
            write_json(
                receipt_path,
                build_packet078_opencode_candidate_stall_guard_receipt(stdout_plan, rel(root, output_path)),
            )
            stdout_plan["stall_guard_path"] = rel(root, output_path)
            stdout_plan["stall_guard_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_opencode_candidate_template_pack:
        stdout_plan = build_packet078_opencode_candidate_template_pack(
            root,
            plan,
            args.packet078_opencode_review_candidate,
            args.packet078_opencode_review_result,
            args.packet078_opencode_candidate_template_output,
        )
        if args.write:
            output = (
                args.packet078_opencode_candidate_template_pack_output
                if args.output == DEFAULT_OUTPUT
                else args.output
            )
            receipt = (
                args.packet078_opencode_candidate_template_pack_receipt_output
                if args.receipt == DEFAULT_RECEIPT
                else args.receipt
            )
            template_path = resolve_under_root(root, args.packet078_opencode_candidate_template_output)
            output_path = resolve_under_root(root, output)
            receipt_path = resolve_under_root(root, receipt)
            write_json(template_path, stdout_plan["template_payload"])
            write_json(output_path, stdout_plan)
            write_json(
                receipt_path,
                build_packet078_opencode_candidate_template_pack_receipt(stdout_plan, rel(root, output_path)),
            )
            stdout_plan["template_path"] = rel(root, template_path)
            stdout_plan["template_pack_path"] = rel(root, output_path)
            stdout_plan["template_pack_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_opencode_handoff_readiness:
        stdout_plan = build_packet078_opencode_handoff_readiness(
            root,
            plan,
            args.packet078_opencode_candidate_paste_pack_status,
            args.packet078_opencode_candidate_paste_prompt_output,
            args.packet078_opencode_candidate_template_pack_output,
            args.packet078_unfilled_template_guard_status,
            args.packet078_p195_prompt_canonicalization_status,
            args.packet078_opencode_review_candidate,
            args.packet078_opencode_review_result,
        )
        if args.write:
            output = (
                args.packet078_opencode_handoff_readiness_output
                if args.output == DEFAULT_OUTPUT
                else args.output
            )
            receipt = (
                args.packet078_opencode_handoff_readiness_receipt_output
                if args.receipt == DEFAULT_RECEIPT
                else args.receipt
            )
            output_path = resolve_under_root(root, output)
            receipt_path = resolve_under_root(root, receipt)
            write_json(output_path, stdout_plan)
            write_json(
                receipt_path,
                build_packet078_opencode_handoff_readiness_receipt(stdout_plan, rel(root, output_path)),
            )
            stdout_plan["handoff_readiness_path"] = rel(root, output_path)
            stdout_plan["handoff_readiness_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_opencode_post_handoff_router:
        stdout_plan = build_packet078_opencode_post_handoff_router(
            root,
            plan,
            args.packet078_opencode_handoff_readiness_output,
            args.current_next_gate,
            args.packet078_opencode_review_candidate,
            args.packet078_opencode_review_result,
            args.packet078_candidate_call_status,
            args.packet078_candidate_copy_command_output,
        )
        if args.write:
            output = (
                args.packet078_opencode_post_handoff_router_output
                if args.output == DEFAULT_OUTPUT
                else args.output
            )
            receipt = (
                args.packet078_opencode_post_handoff_router_receipt_output
                if args.receipt == DEFAULT_RECEIPT
                else args.receipt
            )
            output_path = resolve_under_root(root, output)
            receipt_path = resolve_under_root(root, receipt)
            write_json(output_path, stdout_plan)
            write_json(
                receipt_path,
                build_packet078_opencode_post_handoff_router_receipt(stdout_plan, rel(root, output_path)),
            )
            stdout_plan["post_handoff_router_path"] = rel(root, output_path)
            stdout_plan["post_handoff_router_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_post_candidate_reconcile_bundle:
        router = build_packet078_opencode_post_handoff_router(
            root,
            plan,
            args.packet078_opencode_handoff_readiness_output,
            args.current_next_gate,
            args.packet078_opencode_review_candidate,
            args.packet078_opencode_review_result,
            args.packet078_candidate_call_status,
            args.packet078_candidate_copy_command_output,
        )
        router_output_path = resolve_under_root(root, args.packet078_opencode_post_handoff_router_output)
        router_receipt_path = resolve_under_root(root, args.packet078_opencode_post_handoff_router_receipt_output)
        if args.write:
            write_json(router_output_path, router)
            write_json(
                router_receipt_path,
                build_packet078_opencode_post_handoff_router_receipt(router, rel(root, router_output_path)),
            )
            router["post_handoff_router_path"] = rel(root, router_output_path)
            router["post_handoff_router_receipt_path"] = rel(root, router_receipt_path)

        compact = build_compact_plan(plan)
        apply_current_gate_overlay(compact, build_current_gate_overlay(root, args.current_next_gate))
        packet078_watch = build_packet078_p167_release_watch(
            root,
            plan,
            args.current_next_gate,
            args.packet078_opencode_review_result,
            args.packet078_p167_deferred_approval,
        )
        apply_packet078_release_watch(compact, packet078_watch)
        candidate_call_status = build_packet078_candidate_call_status_surface(
            root,
            args.packet078_candidate_call_status,
        )
        apply_packet078_candidate_call_status(compact, candidate_call_status)
        candidate_poll_status = build_packet078_candidate_poll_status_surface(
            root,
            args.packet078_candidate_poll_status,
        )
        apply_packet078_candidate_poll_status(compact, candidate_poll_status)
        post_handoff_router_status = build_packet078_post_handoff_router_status_surface(
            root,
            args.packet078_opencode_post_handoff_router_output,
        )
        apply_packet078_post_handoff_router_status(compact, post_handoff_router_status)
        operator_handoff_status = build_packet078_opencode_operator_handoff_status_surface(
            root,
            plan,
            choose_packet078_operator_handoff_status_input(
                root,
                args.packet078_opencode_operator_handoff_status_output,
                args.packet078_opencode_operator_handoff_status,
            ),
            args.packet078_opencode_candidate_paste_prompt_output,
            args.packet078_opencode_operator_handoff_command_output,
            args.packet078_opencode_review_candidate,
            args.packet078_opencode_review_result,
            args.packet078_candidate_copy_command_output,
        )
        apply_packet078_opencode_operator_handoff_status(compact, operator_handoff_status)
        manual_paste_pending_status = build_packet078_opencode_manual_paste_pending_status_surface(
            root,
            args.packet078_opencode_manual_paste_pending_status_output,
        )
        apply_packet078_opencode_manual_paste_pending_status(compact, manual_paste_pending_status)
        manual_paste_action_card = build_packet078_opencode_manual_paste_action_card_surface(
            root,
            args.packet078_opencode_manual_paste_action_card_output,
        )
        apply_packet078_opencode_manual_paste_action_card(compact, manual_paste_action_card)
        post_p185_accelerator_status = build_packet078_post_p185_accelerator_status_surface(
            root,
            args.packet078_post_p185_accelerator_status_output,
        )
        apply_packet078_post_p185_accelerator_status(compact, post_p185_accelerator_status)
        clipboard_freshness_guard = build_packet078_clipboard_freshness_guard_surface(
            root,
            args.packet078_clipboard_freshness_guard_output,
        )
        apply_packet078_clipboard_freshness_guard(compact, clipboard_freshness_guard)
        loop_status = build_loop_harness_status(
            root,
            args.loop_harness_evidence,
            args.loop_harness_receipt,
            args.loop_harness_review,
        )
        if loop_status["status"] == "ready_for_opencode_review":
            apply_loop_harness_status(compact, loop_status)

        compact_path = resolve_under_root(root, args.compact_output)
        compact_receipt_path = resolve_under_root(root, args.compact_receipt_output)
        if args.write:
            write_json(compact_path, compact)
            write_json(
                compact_receipt_path,
                build_compact_status_receipt(
                    compact,
                    rel(root, compact_path),
                    plan.get("receipt_path"),
                ),
            )

        freshness = build_compact_snapshot_freshness(root, args.compact_output)
        freshness_path = resolve_under_root(root, args.compact_freshness_output)
        freshness_receipt_path = resolve_under_root(root, args.compact_freshness_receipt_output)
        if args.write:
            write_json(freshness_path, freshness)
            write_json(
                freshness_receipt_path,
                build_compact_snapshot_freshness_receipt(freshness, rel(root, freshness_path)),
            )
            freshness["freshness_path"] = rel(root, freshness_path)
            freshness["freshness_receipt_path"] = rel(root, freshness_receipt_path)

        stdout_plan = build_packet078_post_candidate_reconcile_bundle_status(
            root,
            plan,
            router,
            compact,
            freshness,
            rel(root, router_output_path),
            rel(root, compact_path),
            rel(root, freshness_path),
        )
        if args.write:
            output_path = resolve_under_root(root, args.packet078_post_candidate_reconcile_output)
            receipt_path = resolve_under_root(root, args.packet078_post_candidate_reconcile_receipt_output)
            write_json(output_path, stdout_plan)
            write_json(
                receipt_path,
                build_packet078_post_candidate_reconcile_bundle_receipt(stdout_plan, rel(root, output_path)),
            )
            stdout_plan["reconcile_bundle_path"] = rel(root, output_path)
            stdout_plan["reconcile_bundle_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_candidate_arrival_watch:
        attempts = max(1, int(args.packet078_candidate_watch_attempts))
        interval = max(0.0, float(args.packet078_candidate_watch_interval))
        candidate_path = resolve_under_root(root, args.packet078_opencode_review_candidate)
        attempts_used = 0
        for attempt in range(1, attempts + 1):
            attempts_used = attempt
            if candidate_path.is_file():
                break
            if attempt < attempts and interval > 0:
                time.sleep(interval)

        reconcile_bundle: dict[str, Any] | None = None
        if candidate_path.is_file():
            router = build_packet078_opencode_post_handoff_router(
                root,
                plan,
                args.packet078_opencode_handoff_readiness_output,
                args.current_next_gate,
                args.packet078_opencode_review_candidate,
                args.packet078_opencode_review_result,
                args.packet078_candidate_call_status,
                args.packet078_candidate_copy_command_output,
            )
            router_output_path = resolve_under_root(root, args.packet078_opencode_post_handoff_router_output)
            router_receipt_path = resolve_under_root(root, args.packet078_opencode_post_handoff_router_receipt_output)
            if args.write:
                write_json(router_output_path, router)
                write_json(
                    router_receipt_path,
                    build_packet078_opencode_post_handoff_router_receipt(router, rel(root, router_output_path)),
                )
                router["post_handoff_router_path"] = rel(root, router_output_path)
                router["post_handoff_router_receipt_path"] = rel(root, router_receipt_path)

            compact = build_compact_plan(plan)
            apply_current_gate_overlay(compact, build_current_gate_overlay(root, args.current_next_gate))
            packet078_watch = build_packet078_p167_release_watch(
                root,
                plan,
                args.current_next_gate,
                args.packet078_opencode_review_result,
                args.packet078_p167_deferred_approval,
            )
            apply_packet078_release_watch(compact, packet078_watch)
            candidate_call_status = build_packet078_candidate_call_status_surface(
                root,
                args.packet078_candidate_call_status,
            )
            apply_packet078_candidate_call_status(compact, candidate_call_status)
            candidate_poll_status = build_packet078_candidate_poll_status_surface(
                root,
                args.packet078_candidate_poll_status,
            )
            apply_packet078_candidate_poll_status(compact, candidate_poll_status)
            post_handoff_router_status = build_packet078_post_handoff_router_status_surface(
                root,
                args.packet078_opencode_post_handoff_router_output,
            )
            apply_packet078_post_handoff_router_status(compact, post_handoff_router_status)
            operator_handoff_status = build_packet078_opencode_operator_handoff_status_surface(
                root,
                plan,
                choose_packet078_operator_handoff_status_input(
                    root,
                    args.packet078_opencode_operator_handoff_status_output,
                    args.packet078_opencode_operator_handoff_status,
                ),
                args.packet078_opencode_candidate_paste_prompt_output,
                args.packet078_opencode_operator_handoff_command_output,
                args.packet078_opencode_review_candidate,
                args.packet078_opencode_review_result,
                args.packet078_candidate_copy_command_output,
            )
            apply_packet078_opencode_operator_handoff_status(compact, operator_handoff_status)
            manual_paste_pending_status = build_packet078_opencode_manual_paste_pending_status_surface(
                root,
                args.packet078_opencode_manual_paste_pending_status_output,
            )
            apply_packet078_opencode_manual_paste_pending_status(compact, manual_paste_pending_status)
            manual_paste_action_card = build_packet078_opencode_manual_paste_action_card_surface(
                root,
                args.packet078_opencode_manual_paste_action_card_output,
            )
            apply_packet078_opencode_manual_paste_action_card(compact, manual_paste_action_card)
            post_p185_accelerator_status = build_packet078_post_p185_accelerator_status_surface(
                root,
                args.packet078_post_p185_accelerator_status_output,
            )
            apply_packet078_post_p185_accelerator_status(compact, post_p185_accelerator_status)
            loop_status = build_loop_harness_status(
                root,
                args.loop_harness_evidence,
                args.loop_harness_receipt,
                args.loop_harness_review,
            )
            if loop_status["status"] == "ready_for_opencode_review":
                apply_loop_harness_status(compact, loop_status)

            compact_path = resolve_under_root(root, args.compact_output)
            compact_receipt_path = resolve_under_root(root, args.compact_receipt_output)
            if args.write:
                write_json(compact_path, compact)
                write_json(
                    compact_receipt_path,
                    build_compact_status_receipt(
                        compact,
                        rel(root, compact_path),
                        plan.get("receipt_path"),
                    ),
                )

            freshness = build_compact_snapshot_freshness(root, args.compact_output)
            freshness_path = resolve_under_root(root, args.compact_freshness_output)
            freshness_receipt_path = resolve_under_root(root, args.compact_freshness_receipt_output)
            if args.write:
                write_json(freshness_path, freshness)
                write_json(
                    freshness_receipt_path,
                    build_compact_snapshot_freshness_receipt(freshness, rel(root, freshness_path)),
                )
                freshness["freshness_path"] = rel(root, freshness_path)
                freshness["freshness_receipt_path"] = rel(root, freshness_receipt_path)

            reconcile_bundle = build_packet078_post_candidate_reconcile_bundle_status(
                root,
                plan,
                router,
                compact,
                freshness,
                rel(root, router_output_path),
                rel(root, compact_path),
                rel(root, freshness_path),
            )
            if args.write:
                reconcile_path = resolve_under_root(root, args.packet078_post_candidate_reconcile_output)
                reconcile_receipt_path = resolve_under_root(root, args.packet078_post_candidate_reconcile_receipt_output)
                write_json(reconcile_path, reconcile_bundle)
                write_json(
                    reconcile_receipt_path,
                    build_packet078_post_candidate_reconcile_bundle_receipt(
                        reconcile_bundle,
                        rel(root, reconcile_path),
                    ),
                )
                reconcile_bundle["reconcile_bundle_path"] = rel(root, reconcile_path)
                reconcile_bundle["reconcile_bundle_receipt_path"] = rel(root, reconcile_receipt_path)

        stdout_plan = build_packet078_candidate_arrival_watch_status(
            root,
            plan,
            args.packet078_opencode_review_candidate,
            args.packet078_opencode_review_result,
            attempts_used,
            attempts,
            interval,
            reconcile_bundle,
        )
        if args.write:
            output_path = resolve_under_root(root, args.packet078_candidate_arrival_watch_output)
            receipt_path = resolve_under_root(root, args.packet078_candidate_arrival_watch_receipt_output)
            write_json(output_path, stdout_plan)
            write_json(
                receipt_path,
                build_packet078_candidate_arrival_watch_receipt(stdout_plan, rel(root, output_path)),
            )
            stdout_plan["candidate_arrival_watch_path"] = rel(root, output_path)
            stdout_plan["candidate_arrival_watch_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_opencode_operator_handoff_pack:
        stdout_plan = build_packet078_opencode_operator_handoff_pack(
            root,
            plan,
            args.packet078_opencode_candidate_paste_prompt_output,
            args.packet078_opencode_operator_handoff_command_output,
            args.packet078_opencode_review_candidate,
            args.packet078_opencode_review_result,
            max(1, int(args.packet078_candidate_watch_attempts)),
            max(0.0, float(args.packet078_candidate_watch_interval)),
        )
        if args.write:
            output_path = resolve_under_root(root, args.packet078_opencode_operator_handoff_output)
            receipt_path = resolve_under_root(root, args.packet078_opencode_operator_handoff_receipt_output)
            write_json(output_path, stdout_plan)
            write_json(
                receipt_path,
                build_packet078_opencode_operator_handoff_pack_receipt(stdout_plan, rel(root, output_path)),
            )
            stdout_plan["operator_handoff_pack_path"] = rel(root, output_path)
            stdout_plan["operator_handoff_pack_receipt_path"] = rel(root, receipt_path)
            if stdout_plan["status"] == "ready_for_manual_paste_and_bounded_watch":
                command_path = resolve_under_root(root, args.packet078_opencode_operator_handoff_command_output)
                prompt_path = resolve_under_root(root, args.packet078_opencode_candidate_paste_prompt_output)
                script = render_packet078_opencode_operator_handoff_script(
                    root,
                    rel(root, prompt_path),
                    str(stdout_plan["prompt_sha256"]),
                    args.packet078_opencode_review_candidate,
                    args.packet078_opencode_review_result,
                    args.packet078_opencode_operator_handoff_command_output,
                    args.compact_output,
                    args.compact_receipt_output,
                    args.compact_freshness_output,
                    args.compact_freshness_receipt_output,
                    args.packet078_post_candidate_reconcile_output,
                    args.packet078_post_candidate_reconcile_receipt_output,
                    args.packet078_candidate_arrival_watch_output,
                    args.packet078_candidate_arrival_watch_receipt_output,
                    args.packet078_opencode_operator_status_brief_output,
                    args.packet078_opencode_operator_status_brief_receipt_output,
                    args.packet078_opencode_watch_stall_status_output,
                    args.packet078_opencode_watch_stall_status_receipt_output,
                    max(1, int(args.packet078_candidate_watch_attempts)),
                    max(0.0, float(args.packet078_candidate_watch_interval)),
                )
                command_path.parent.mkdir(parents=True, exist_ok=True)
                command_path.write_text(script, encoding="utf-8")
                command_path.chmod(0o755)
                stdout_plan["command_path"] = rel(root, command_path)
    elif args.packet078_opencode_operator_handoff_status_surface:
        stdout_plan = build_packet078_opencode_operator_handoff_status_surface(
            root,
            plan,
            args.packet078_opencode_operator_handoff_status,
            args.packet078_opencode_candidate_paste_prompt_output,
            args.packet078_opencode_operator_handoff_command_output,
            args.packet078_opencode_review_candidate,
            args.packet078_opencode_review_result,
            args.packet078_candidate_copy_command_output,
        )
        if args.write:
            output_path = resolve_under_root(root, args.packet078_opencode_operator_handoff_status_output)
            receipt_path = resolve_under_root(root, args.packet078_opencode_operator_handoff_status_receipt_output)
            write_json(output_path, stdout_plan)
            write_json(
                receipt_path,
                build_packet078_opencode_operator_handoff_status_receipt(stdout_plan, rel(root, output_path)),
            )
            stdout_plan["operator_handoff_status_path"] = rel(root, output_path)
            stdout_plan["operator_handoff_status_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_opencode_operator_status_brief:
        stdout_plan = build_packet078_opencode_operator_status_brief(
            root,
            plan,
            args.packet078_opencode_operator_handoff_status_output,
            args.packet078_opencode_candidate_paste_prompt_output,
            args.packet078_opencode_operator_handoff_command_output,
            args.packet078_opencode_review_candidate,
            args.packet078_opencode_review_result,
            args.packet078_candidate_copy_command_output,
        )
        if args.write:
            output_path = resolve_under_root(root, args.packet078_opencode_operator_status_brief_output)
            receipt_path = resolve_under_root(root, args.packet078_opencode_operator_status_brief_receipt_output)
            write_json(output_path, stdout_plan)
            write_json(
                receipt_path,
                build_packet078_opencode_operator_status_brief_receipt(stdout_plan, rel(root, output_path)),
            )
            stdout_plan["operator_status_brief_path"] = rel(root, output_path)
            stdout_plan["operator_status_brief_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_opencode_watch_stall_status:
        stdout_plan = build_packet078_opencode_watch_stall_status(
            root,
            plan,
            args.packet078_candidate_arrival_watch_output,
            args.packet078_opencode_operator_status_brief_output,
            args.packet078_opencode_review_candidate,
            args.packet078_opencode_review_result,
            args.packet078_candidate_copy_command_output,
        )
        if args.write:
            output_path = resolve_under_root(root, args.packet078_opencode_watch_stall_status_output)
            receipt_path = resolve_under_root(root, args.packet078_opencode_watch_stall_status_receipt_output)
            write_json(output_path, stdout_plan)
            write_json(
                receipt_path,
                build_packet078_opencode_watch_stall_status_receipt(stdout_plan, rel(root, output_path)),
            )
            stdout_plan["watch_stall_status_path"] = rel(root, output_path)
            stdout_plan["watch_stall_status_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_opencode_manual_paste_pending_status:
        stdout_plan = build_packet078_opencode_manual_paste_pending_status(
            root,
            plan,
            args.packet078_opencode_clipboard_load_status_output,
            args.packet078_opencode_operator_status_brief_output,
            args.packet078_opencode_review_candidate,
            args.packet078_opencode_review_result,
            args.packet078_candidate_copy_command_output,
        )
        if args.write:
            output_path = resolve_under_root(root, args.packet078_opencode_manual_paste_pending_status_output)
            receipt_path = resolve_under_root(root, args.packet078_opencode_manual_paste_pending_status_receipt_output)
            write_json(output_path, stdout_plan)
            write_json(
                receipt_path,
                build_packet078_opencode_manual_paste_pending_status_receipt(stdout_plan, rel(root, output_path)),
            )
            stdout_plan["manual_paste_pending_status_path"] = rel(root, output_path)
            stdout_plan["manual_paste_pending_status_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_opencode_manual_paste_action_card:
        stdout_plan = build_packet078_opencode_manual_paste_action_card(
            root,
            plan,
            args.packet078_opencode_manual_paste_pending_status_output,
            args.packet078_opencode_review_candidate,
            args.packet078_opencode_review_result,
        )
        if args.write:
            output_path = resolve_under_root(root, args.packet078_opencode_manual_paste_action_card_output)
            receipt_path = resolve_under_root(root, args.packet078_opencode_manual_paste_action_card_receipt_output)
            write_json(output_path, stdout_plan)
            write_json(
                receipt_path,
                build_packet078_opencode_manual_paste_action_card_receipt(stdout_plan, rel(root, output_path)),
            )
            stdout_plan["manual_paste_action_card_path"] = rel(root, output_path)
            stdout_plan["manual_paste_action_card_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_post_p185_accelerator_status:
        stdout_plan = build_packet078_post_p185_accelerator_status(
            root,
            plan,
            args.packet078_opencode_manual_paste_action_card_output,
            args.packet078_opencode_review_candidate,
            args.packet078_opencode_review_candidate_preflight_output,
            args.packet078_opencode_review_result,
            args.packet078_candidate_copy_command_output,
        )
        if args.write:
            output_path = resolve_under_root(root, args.packet078_post_p185_accelerator_status_output)
            receipt_path = resolve_under_root(root, args.packet078_post_p185_accelerator_status_receipt_output)
            write_json(output_path, stdout_plan)
            write_json(
                receipt_path,
                build_packet078_post_p185_accelerator_status_receipt(stdout_plan, rel(root, output_path)),
            )
            stdout_plan["post_p185_accelerator_status_path"] = rel(root, output_path)
            stdout_plan["post_p185_accelerator_status_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_clipboard_freshness_guard:
        stdout_plan = build_packet078_clipboard_freshness_guard(
            root,
            plan,
            args.packet078_opencode_candidate_paste_prompt_output,
            args.packet078_opencode_clipboard_load_status_output,
            args.packet078_opencode_clipboard_load_receipt_output,
            args.packet078_opencode_manual_paste_action_card_output,
            args.packet078_post_p185_accelerator_status_output,
            args.packet078_opencode_review_candidate,
            args.packet078_clipboard_freshness_max_age_seconds,
        )
        if args.write:
            output_path = resolve_under_root(root, args.packet078_clipboard_freshness_guard_output)
            receipt_path = resolve_under_root(root, args.packet078_clipboard_freshness_guard_receipt_output)
            write_json(output_path, stdout_plan)
            write_json(
                receipt_path,
                build_packet078_clipboard_freshness_guard_receipt(stdout_plan, rel(root, output_path)),
            )
            stdout_plan["clipboard_freshness_guard_path"] = rel(root, output_path)
            stdout_plan["clipboard_freshness_guard_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_opencode_review_result_template:
        stdout_plan = build_packet078_opencode_review_result_template(
            root,
            plan,
            args.current_next_gate,
            args.packet078_opencode_review_result,
        )
        if args.write:
            output = (
                args.packet078_opencode_review_result_template_output
                if args.output == DEFAULT_OUTPUT
                else args.output
            )
            output_path = resolve_under_root(root, output)
            receipt_path = resolve_under_root(root, args.receipt)
            write_json(output_path, stdout_plan)
            write_json(receipt_path, build_packet078_opencode_review_result_template_receipt(stdout_plan, rel(root, output_path)))
            stdout_plan["template_path"] = rel(root, output_path)
            stdout_plan["template_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_opencode_review_handoff_capsule:
        stdout_plan = build_packet078_opencode_review_handoff_capsule(
            root,
            plan,
            args.current_next_gate,
            args.packet078_opencode_review_result,
        )
        if args.write:
            output = (
                args.packet078_opencode_review_handoff_output
                if args.output == DEFAULT_OUTPUT
                else args.output
            )
            output_path = resolve_under_root(root, output)
            receipt_path = resolve_under_root(root, args.receipt)
            write_json(output_path, stdout_plan)
            write_json(receipt_path, build_packet078_opencode_review_handoff_capsule_receipt(stdout_plan, rel(root, output_path)))
            stdout_plan["handoff_capsule_path"] = rel(root, output_path)
            stdout_plan["handoff_capsule_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_opencode_review_status_surface:
        stdout_plan = build_packet078_opencode_review_status_surface(
            root,
            plan,
            args.current_next_gate,
            args.packet078_opencode_review_result,
        )
        if args.write:
            output = (
                args.packet078_opencode_review_status_output
                if args.output == DEFAULT_OUTPUT
                else args.output
            )
            output_path = resolve_under_root(root, output)
            receipt_path = resolve_under_root(root, args.receipt)
            write_json(output_path, stdout_plan)
            write_json(receipt_path, build_packet078_opencode_review_status_surface_receipt(stdout_plan, rel(root, output_path)))
            stdout_plan["status_surface_path"] = rel(root, output_path)
            stdout_plan["status_surface_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_p167_deferred_approval_escrow:
        stdout_plan = build_packet078_p167_deferred_approval_escrow(
            root,
            plan,
            args.current_next_gate,
            args.packet078_opencode_review_result,
            args.approval,
        )
        if args.write:
            output = (
                args.packet078_p167_deferred_approval_output
                if args.output == DEFAULT_OUTPUT
                else args.output
            )
            output_path = resolve_under_root(root, output)
            receipt_path = resolve_under_root(root, args.receipt)
            write_json(output_path, stdout_plan)
            write_json(receipt_path, build_packet078_p167_deferred_approval_escrow_receipt(stdout_plan, rel(root, output_path)))
            stdout_plan["escrow_path"] = rel(root, output_path)
            stdout_plan["escrow_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_p167_escrow_release_readiness:
        stdout_plan = build_packet078_p167_escrow_release_readiness(
            root,
            plan,
            args.current_next_gate,
            args.packet078_opencode_review_result,
            args.packet078_p167_deferred_approval,
        )
        if args.write:
            output = (
                args.packet078_p167_escrow_release_output
                if args.output == DEFAULT_OUTPUT
                else args.output
            )
            output_path = resolve_under_root(root, output)
            receipt_path = resolve_under_root(root, args.receipt)
            write_json(output_path, stdout_plan)
            write_json(receipt_path, build_packet078_p167_escrow_release_readiness_receipt(stdout_plan, rel(root, output_path)))
            stdout_plan["release_readiness_path"] = rel(root, output_path)
            stdout_plan["release_readiness_receipt_path"] = rel(root, receipt_path)
    elif args.packet078_p167_release_watch:
        stdout_plan = build_packet078_p167_release_watch(
            root,
            plan,
            args.current_next_gate,
            args.packet078_opencode_review_result,
            args.packet078_p167_deferred_approval,
        )
        if args.write:
            output = (
                args.packet078_p167_release_watch_output
                if args.output == DEFAULT_OUTPUT
                else args.output
            )
            output_path = resolve_under_root(root, output)
            receipt_path = resolve_under_root(root, args.receipt)
            write_json(output_path, stdout_plan)
            write_json(receipt_path, build_packet078_p167_release_watch_receipt(stdout_plan, rel(root, output_path)))
            stdout_plan["release_watch_path"] = rel(root, output_path)
            stdout_plan["release_watch_receipt_path"] = rel(root, receipt_path)
    elif args.ack_gate_lock_audit:
        stdout_plan = build_ack_gate_lock_audit(root, plan, args.current_next_gate)
        if args.write:
            audit_path = resolve_under_root(root, args.ack_gate_lock_audit_output)
            receipt_path = resolve_under_root(root, args.ack_gate_lock_audit_receipt_output)
            write_json(audit_path, stdout_plan)
            write_json(receipt_path, build_ack_gate_lock_audit_receipt(stdout_plan, rel(root, audit_path)))
            stdout_plan["audit_path"] = rel(root, audit_path)
            stdout_plan["receipt_path"] = rel(root, receipt_path)
    elif args.ack_execution_guard:
        stdout_plan = build_ack_execution_guard(
            root,
            plan,
            args.current_next_gate,
            args.ack_execution_guard_preview_output,
            args.ack_execution_guard_command_output,
            args.ack_execution_guard_audit_output,
        )
        if args.write:
            preview_path = resolve_under_root(root, args.ack_execution_guard_preview_output)
            command_path = resolve_under_root(root, args.ack_execution_guard_command_output)
            receipt_path = resolve_under_root(root, args.ack_execution_guard_receipt_output)
            write_json(preview_path, stdout_plan["preview_payload"])
            if stdout_plan.get("guard_script") is not None:
                command_path.parent.mkdir(parents=True, exist_ok=True)
                command_path.write_text(str(stdout_plan["guard_script"]), encoding="utf-8")
                command_path.chmod(0o755)
            write_json(receipt_path, build_ack_execution_guard_receipt(stdout_plan))
            stdout_plan["preview_path"] = rel(root, preview_path)
            stdout_plan["command_path"] = rel(root, command_path)
            stdout_plan["receipt_path"] = rel(root, receipt_path)
            stdout_plan.pop("guard_script", None)
    elif args.ack_debug:
        stdout_plan = build_role_worker_ack_debug(root, plan, args.current_next_gate)
        if args.write:
            output_path = resolve_under_root(root, args.output)
            receipt_path = resolve_under_root(root, args.receipt)
            ack_debug_path = resolve_under_root(root, args.ack_debug_output)
            write_json(output_path, stdout_plan)
            write_json(receipt_path, build_ack_debug_receipt(stdout_plan, rel(root, output_path)))
            write_json(ack_debug_path, stdout_plan)
            stdout_plan["evidence_path"] = rel(root, output_path)
            stdout_plan["receipt_path"] = rel(root, receipt_path)
            stdout_plan["ack_debug_path"] = rel(root, ack_debug_path)
    elif args.post_ack_current_gate_complete:
        stdout_plan = build_post_ack_current_gate_complete(
            root,
            plan,
            args.current_next_gate,
            args.post_ack_current_gate_complete_backup_output,
        )
        if args.write:
            output_path = resolve_under_root(root, args.output)
            receipt_path = resolve_under_root(root, args.receipt)
            current_gate_path = resolve_under_root(root, args.current_next_gate)
            backup_path = resolve_under_root(root, args.post_ack_current_gate_complete_backup_output)
            write_json(output_path, stdout_plan)
            if current_gate_path.is_file():
                backup_path.parent.mkdir(parents=True, exist_ok=True)
                backup_path.write_text(current_gate_path.read_text(encoding="utf-8"), encoding="utf-8")
            if stdout_plan.get("status") == "ack_gate_complete_next_ready_for_orchestrator_selection":
                write_json(current_gate_path, stdout_plan["current_next_gate_payload"])
            write_json(receipt_path, build_post_ack_current_gate_complete_receipt(stdout_plan, rel(root, output_path)))
            stdout_plan["evidence_path"] = rel(root, output_path)
            stdout_plan["receipt_path"] = rel(root, receipt_path)
            stdout_plan["current_next_gate_path"] = rel(root, current_gate_path)
            stdout_plan["backup_path"] = rel(root, backup_path) if backup_path.is_file() else None
    elif args.phase_guard_summary:
        stdout_plan = build_phase_guard_summary(root, plan, args.current_next_gate)
        if args.write:
            output_path = resolve_under_root(root, args.output)
            receipt_path = resolve_under_root(root, args.receipt)
            phase_guard_path = resolve_under_root(root, args.phase_guard_summary_output)
            write_json(output_path, stdout_plan)
            write_json(receipt_path, build_phase_guard_summary_receipt(stdout_plan, rel(root, output_path)))
            write_json(phase_guard_path, stdout_plan)
            stdout_plan["evidence_path"] = rel(root, output_path)
            stdout_plan["receipt_path"] = rel(root, receipt_path)
            stdout_plan["phase_guard_summary_path"] = rel(root, phase_guard_path)
    elif args.worker_envelope_phase_guard:
        stdout_plan = build_worker_envelope_phase_guard(root, plan, args.current_next_gate)
        if args.write:
            output_path = resolve_under_root(root, args.output)
            receipt_path = resolve_under_root(root, args.receipt)
            guard_path = resolve_under_root(root, args.worker_envelope_phase_guard_output)
            write_json(output_path, stdout_plan)
            write_json(receipt_path, build_worker_envelope_phase_guard_receipt(stdout_plan, rel(root, output_path)))
            write_json(guard_path, stdout_plan)
            stdout_plan["evidence_path"] = rel(root, output_path)
            stdout_plan["receipt_path"] = rel(root, receipt_path)
            stdout_plan["worker_envelope_phase_guard_path"] = rel(root, guard_path)
    elif args.phase_next_action_selector:
        stdout_plan = build_phase_next_action_selector(root, plan, args.current_next_gate)
        if args.write:
            output_path = resolve_under_root(root, args.output)
            receipt_path = resolve_under_root(root, args.receipt)
            selector_path = resolve_under_root(root, args.phase_next_action_selector_output)
            write_json(output_path, stdout_plan)
            write_json(receipt_path, build_phase_next_action_selector_receipt(stdout_plan, rel(root, output_path)))
            write_json(selector_path, stdout_plan)
            stdout_plan["evidence_path"] = rel(root, output_path)
            stdout_plan["receipt_path"] = rel(root, receipt_path)
            stdout_plan["phase_next_action_selector_path"] = rel(root, selector_path)
    elif args.loop_harness_status:
        stdout_plan = build_loop_harness_status(
            root,
            args.loop_harness_evidence,
            args.loop_harness_receipt,
            args.loop_harness_review,
        )
        if args.write:
            status_path = resolve_under_root(root, args.loop_harness_status_output)
            status_receipt_path = resolve_under_root(root, args.loop_harness_status_receipt_output)
            write_json(status_path, stdout_plan)
            write_json(status_receipt_path, build_loop_harness_status_receipt(stdout_plan))
            stdout_plan["loop_harness_status_path"] = rel(root, status_path)
            stdout_plan["loop_harness_status_receipt_path"] = rel(root, status_receipt_path)
    elif args.ack_reconcile:
        stdout_plan = build_role_worker_ack_reconcile(root, plan, args.current_next_gate)
        if args.write:
            output_path = resolve_under_root(root, args.output)
            receipt_path = resolve_under_root(root, args.receipt)
            ack_reconcile_path = resolve_under_root(root, args.ack_reconcile_output)
            write_json(output_path, stdout_plan)
            write_json(receipt_path, build_ack_reconcile_receipt(stdout_plan, rel(root, output_path)))
            write_json(ack_reconcile_path, stdout_plan)
            stdout_plan["evidence_path"] = rel(root, output_path)
            stdout_plan["receipt_path"] = rel(root, receipt_path)
            stdout_plan["ack_reconcile_path"] = rel(root, ack_reconcile_path)
    elif args.ack_action_card:
        stdout_plan = build_role_worker_ack_action_card(root, plan, args.current_next_gate)
        if args.write:
            ack_card_path = resolve_under_root(root, args.ack_action_card_output)
            ack_gate_output = (
                default_role_worker_ack_gate_output(stdout_plan)
                if args.ack_gate_output == DEFAULT_ACK_GATE_OUTPUT
                else args.ack_gate_output
            )
            ack_gate_path = resolve_under_root(root, ack_gate_output)
            write_json(ack_card_path, stdout_plan)
            write_json(ack_gate_path, build_role_worker_ack_gate(stdout_plan))
            stdout_plan["ack_action_card_path"] = rel(root, ack_card_path)
            stdout_plan["ack_gate_path"] = rel(root, ack_gate_path)
    elif args.check_ack_approval is not None:
        ack_card = build_role_worker_ack_action_card(root, plan, args.current_next_gate)
        stdout_plan = build_role_worker_ack_approval_check(ack_card, args.check_ack_approval)
        if args.write:
            ack_card_path = resolve_under_root(root, args.ack_action_card_output)
            ack_gate_output = (
                default_role_worker_ack_gate_output(ack_card)
                if args.ack_gate_output == DEFAULT_ACK_GATE_OUTPUT
                else args.ack_gate_output
            )
            ack_gate_path = resolve_under_root(root, ack_gate_output)
            ack_check_path = resolve_under_root(root, args.ack_approval_check_output)
            write_json(ack_card_path, ack_card)
            write_json(ack_gate_path, build_role_worker_ack_gate(ack_card))
            write_json(ack_check_path, stdout_plan)
            stdout_plan["ack_action_card_path"] = rel(root, ack_card_path)
            stdout_plan["ack_gate_path"] = rel(root, ack_gate_path)
            stdout_plan["ack_approval_check_path"] = rel(root, ack_check_path)
    elif args.check_queue_drain_refresh_approval is not None:
        stdout_plan = build_queue_drain_refresh_approval_check(
            root,
            plan,
            args.current_next_gate,
            args.check_queue_drain_refresh_approval,
        )
        if args.write:
            output_path = resolve_under_root(root, args.output)
            receipt_path = resolve_under_root(root, args.receipt)
            write_json(output_path, stdout_plan)
            write_json(receipt_path, build_queue_drain_refresh_approval_check_receipt(stdout_plan, rel(root, output_path)))
            stdout_plan["approval_check_path"] = rel(root, output_path)
            stdout_plan["approval_check_receipt_path"] = rel(root, receipt_path)
    elif args.check_approval is not None:
        card = build_operator_action_card(root, plan, args.current_next_gate)
        stdout_plan = build_approval_check(card, args.check_approval)
        if args.write:
            action_card_path = resolve_under_root(root, args.action_card_output)
            approval_check_path = resolve_under_root(root, args.approval_check_output)
            write_json(action_card_path, card)
            write_json(approval_check_path, stdout_plan)
            stdout_plan["approval_check_path"] = rel(root, approval_check_path)
    elif args.compact_snapshot_freshness:
        stdout_plan = build_compact_snapshot_freshness(root, args.compact_output)
        if args.write:
            freshness_path = resolve_under_root(root, args.compact_freshness_output)
            freshness_receipt_path = resolve_under_root(root, args.compact_freshness_receipt_output)
            write_json(freshness_path, stdout_plan)
            write_json(
                freshness_receipt_path,
                build_compact_snapshot_freshness_receipt(stdout_plan, rel(root, freshness_path)),
            )
            stdout_plan["freshness_path"] = rel(root, freshness_path)
            stdout_plan["freshness_receipt_path"] = rel(root, freshness_receipt_path)
    elif args.operator_brief:
        card = build_operator_action_card(root, plan, args.current_next_gate)
        stdout_text = render_operator_brief(card)
        if args.write:
            action_card_path = resolve_under_root(root, args.action_card_output)
            brief_path = resolve_under_root(root, args.operator_brief_output)
            write_json(action_card_path, card)
            brief_path.parent.mkdir(parents=True, exist_ok=True)
            brief_path.write_text(stdout_text, encoding="utf-8")
        print(stdout_text)
        return 0
    elif args.operator_action_card:
        stdout_plan = build_operator_action_card(root, plan, args.current_next_gate)
        if args.write:
            action_card_path = resolve_under_root(root, args.action_card_output)
            write_json(action_card_path, stdout_plan)
            stdout_plan["action_card_path"] = rel(root, action_card_path)
    elif args.handoff_capsule:
        stdout_plan = build_handoff_capsule(root, plan, args.current_next_gate)
        if args.write:
            handoff_path = resolve_under_root(root, args.handoff_output)
            write_json(handoff_path, stdout_plan)
            stdout_plan["handoff_path"] = rel(root, handoff_path)
    else:
        if args.compact:
            stdout_plan = build_compact_plan(plan)
            apply_current_gate_overlay(stdout_plan, build_current_gate_overlay(root, args.current_next_gate))
            packet078_watch = build_packet078_p167_release_watch(
                root,
                plan,
                args.current_next_gate,
                args.packet078_opencode_review_result,
                args.packet078_p167_deferred_approval,
            )
            apply_packet078_release_watch(stdout_plan, packet078_watch)
            if packet078_watch.get("status") == "waiting_for_opencode_review_result":
                opencode_capsule = build_packet078_opencode_review_handoff_capsule(
                    root,
                    plan,
                    args.current_next_gate,
                    args.packet078_opencode_review_result,
                )
                apply_opencode_review_action_card(stdout_plan, opencode_capsule)
            candidate_call_status = build_packet078_candidate_call_status_surface(
                root,
                args.packet078_candidate_call_status,
            )
            apply_packet078_candidate_call_status(stdout_plan, candidate_call_status)
            candidate_poll_status = build_packet078_candidate_poll_status_surface(
                root,
                args.packet078_candidate_poll_status,
            )
            apply_packet078_candidate_poll_status(stdout_plan, candidate_poll_status)
            post_handoff_router_status = build_packet078_post_handoff_router_status_surface(
                root,
                args.packet078_opencode_post_handoff_router_status,
            )
            apply_packet078_post_handoff_router_status(stdout_plan, post_handoff_router_status)
            operator_handoff_status = build_packet078_opencode_operator_handoff_status_surface(
                root,
                plan,
                choose_packet078_operator_handoff_status_input(
                    root,
                    args.packet078_opencode_operator_handoff_status_output,
                    args.packet078_opencode_operator_handoff_status,
                ),
                args.packet078_opencode_candidate_paste_prompt_output,
                args.packet078_opencode_operator_handoff_command_output,
                args.packet078_opencode_review_candidate,
                args.packet078_opencode_review_result,
                args.packet078_candidate_copy_command_output,
            )
            apply_packet078_opencode_operator_handoff_status(stdout_plan, operator_handoff_status)
            watch_stall_status = build_packet078_opencode_watch_stall_status_surface(
                root,
                args.packet078_opencode_watch_stall_status_input,
            )
            apply_packet078_opencode_watch_stall_status(stdout_plan, watch_stall_status)
            apply_packet078_gate_conflict_guard(stdout_plan)
            manual_paste_pending_status = build_packet078_opencode_manual_paste_pending_status_surface(
                root,
                args.packet078_opencode_manual_paste_pending_status_output,
            )
            apply_packet078_opencode_manual_paste_pending_status(stdout_plan, manual_paste_pending_status)
            manual_paste_action_card = build_packet078_opencode_manual_paste_action_card_surface(
                root,
                args.packet078_opencode_manual_paste_action_card_output,
            )
            apply_packet078_opencode_manual_paste_action_card(stdout_plan, manual_paste_action_card)
            post_p185_accelerator_status = build_packet078_post_p185_accelerator_status_surface(
                root,
                args.packet078_post_p185_accelerator_status_output,
            )
            apply_packet078_post_p185_accelerator_status(stdout_plan, post_p185_accelerator_status)
            clipboard_freshness_guard = build_packet078_clipboard_freshness_guard_surface(
                root,
                args.packet078_clipboard_freshness_guard_output,
            )
            apply_packet078_clipboard_freshness_guard(stdout_plan, clipboard_freshness_guard)
            loop_status = build_loop_harness_status(
                root,
                args.loop_harness_evidence,
                args.loop_harness_receipt,
                args.loop_harness_review,
            )
            if loop_status["status"] == "ready_for_opencode_review":
                apply_loop_harness_status(stdout_plan, loop_status)
            if args.write:
                compact_path = resolve_under_root(root, args.compact_output)
                compact_receipt_path = resolve_under_root(root, args.compact_receipt_output)
                write_json(compact_path, stdout_plan)
                write_json(
                    compact_receipt_path,
                    build_compact_status_receipt(
                        stdout_plan,
                        rel(root, compact_path),
                        rel(root, resolve_under_root(root, args.output)),
                    ),
                )
        else:
            stdout_plan = plan
    print(json.dumps(stdout_plan, indent=2, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
