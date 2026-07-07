import hashlib
import json
import os
import subprocess
import tempfile
import time
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "ghostclaw_a2a_agent_orchestrator.py"


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class GhostClawA2AAgentOrchestratorTest(unittest.TestCase):
    def _write_ready_packet074_gate(self, root: Path, write_after_gate: str | None = None) -> None:
        exact_gate = "APPROVE_A2A2A_P107_PACKET074_LOCAL_WORKER_ENVELOPE_WRITE_ONLY"
        write_json(
            root / "_A2A_QUEUE" / "outbox" / "packet_074_sirinx.json",
            {
                "id": "packet_074",
                "title": "sirinx.co and AGM AutoFlow active focus local queue replenish",
                "agent": "codex",
                "risk": "safe",
                "approval_required": False,
            },
        )
        write_json(
            root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
            {
                "schema": "ghostclaw.a2a2a.current_next_gate.v1",
                "current_next_gate": {
                    "exact_phrase": exact_gate,
                    "allowed_scope": "write local Hermes/KOB worker-envelope JSON for packet_074 only",
                    "blocked_scope": ["worker execution", "provider/model call", "push", "deploy"],
                },
                "current_orchestrator": {
                    "selected_packet": "packet_074",
                    "selected_packet_path": "_A2A_QUEUE/outbox/packet_074_sirinx.json",
                },
                "command_preview": {
                    "safety_check_without_approval": "python3 scripts/ghostclaw_a2a_local_dispatch_execute.py --gate gate.json",
                    "dry_run_after_gate": f"python3 scripts/ghostclaw_a2a_local_dispatch_execute.py --gate gate.json --approval {exact_gate} --dry-run",
                    "write_after_gate": write_after_gate
                    or f"python3 scripts/ghostclaw_a2a_local_dispatch_execute.py --gate gate.json --approval {exact_gate} --execute --write",
                },
            },
        )

    def _write_packet074_worker_envelopes(self, root: Path, targets: tuple[str, ...] = ("hermes", "kob")) -> None:
        self._write_ready_packet074_gate(root)
        for target in targets:
            write_json(
                root
                / ".ghostclaw_runtime"
                / "a2a2a"
                / "inbox"
                / target
                / f"queue_coord_packet_074_{target}_20260703T070716_717279Z.json",
                {
                    "schema": "ghostclaw.a2a2a.task.v1",
                    "id": f"p004_local_dispatch_packet_074_{target}",
                    "source": "codex-local-dispatch",
                    "target": target,
                    "mission": "A2A2A_P107_PACKET074_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
                    "requires_ack": True,
                    "requires_receipt": True,
                    "dangerous_actions_allowed": False,
                    "secret_access_allowed": False,
                    "paid_model_calls_allowed": False,
                    "external_writes_allowed": False,
                    "payload": {
                        "expected_behavior": "write local role receipt only",
                        "queue_payload_execution_allowed": False,
                    },
                },
            )

    def _write_packet076_worker_envelopes(self, root: Path, targets: tuple[str, ...] = ("hermes", "kob")) -> None:
        exact_gate = "APPROVE_A2A2A_P136_PACKET076_LOCAL_WORKER_ENVELOPE_WRITE_ONLY"
        write_json(
            root / "_A2A_QUEUE" / "outbox" / "packet_076_sirinx_agm_next_local_task_card.json",
            {
                "id": "packet_076",
                "title": "sirinx.co and AGM AutoFlow next local task card",
                "agent": "codex",
                "risk": "safe",
                "approval_required": False,
            },
        )
        write_json(
            root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
            {
                "schema": "ghostclaw.a2a2a.current_next_gate.v1",
                "current_next_gate": {
                    "exact_phrase": exact_gate,
                    "allowed_scope": "write local Hermes/KOB worker-envelope JSON for packet_076 only",
                    "blocked_scope": ["worker execution", "provider/model call", "push", "deploy"],
                },
                "current_orchestrator": {
                    "selected_packet": "packet_076",
                    "selected_packet_path": "_A2A_QUEUE/outbox/packet_076_sirinx_agm_next_local_task_card.json",
                },
                "command_preview": {
                    "safety_check_without_approval": (
                        "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet076-worker-envelope-gate"
                    ),
                    "dry_run_after_gate": (
                        "bash .ghostclaw_runtime/a2a2a/commands/"
                        "A2A2A-P136-PACKET076-WORKER-ENVELOPE-WRITE-GUARD-20260704.sh WRONG_APPROVAL"
                    ),
                    "write_after_gate": (
                        "bash .ghostclaw_runtime/a2a2a/commands/"
                        f"A2A2A-P136-PACKET076-WORKER-ENVELOPE-WRITE-GUARD-20260704.sh {exact_gate}"
                    ),
                },
            },
        )
        for target in targets:
            write_json(
                root
                / ".ghostclaw_runtime"
                / "a2a2a"
                / "inbox"
                / target
                / f"queue_coord_packet_076_{target}_p136_20260704.json",
                {
                    "schema": "ghostclaw.a2a2a.task.v1",
                    "id": f"p136_local_dispatch_packet_076_{target}",
                    "source": "codex",
                    "target": target,
                    "mission": "A2A2A_P136_PACKET076_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
                    "requires_ack": True,
                    "requires_receipt": True,
                    "dangerous_actions_allowed": False,
                    "secret_access_allowed": False,
                    "paid_model_calls_allowed": False,
                    "payload": {
                        "expected_behavior": "write local role receipt only",
                        "queue_payload_execution": False,
                    },
                },
            )

    def _write_packet074_ack_receipts(
        self,
        root: Path,
        targets: tuple[str, ...] = ("hermes", "kob"),
        stale: bool = False,
    ) -> None:
        if stale:
            old_suffix = "20260703T060000_000000Z"
            for target in targets:
                write_json(
                    root
                    / ".ghostclaw_runtime"
                    / "a2a2a"
                    / "inbox"
                    / target
                    / f"queue_coord_packet_074_{target}_{old_suffix}.json",
                    {
                        "schema": "ghostclaw.a2a2a.task.v1",
                        "id": f"old_p004_local_dispatch_packet_074_{target}",
                        "target": target,
                    },
                )
        suffix = "20260703T060000_000000Z" if stale else "20260703T070716_717279Z"
        for target in targets:
            packet_path = (
                f".ghostclaw_runtime/a2a2a/inbox/{target}/"
                f"queue_coord_packet_074_{target}_{suffix}.json"
            )
            if target == "hermes":
                write_json(
                    root / ".ghostclaw_runtime/a2a2a/receipts/hermes_route_p004_local_dispatch_packet_074_hermes.json",
                    {
                        "schema": "ghostclaw.a2a2a.hermes_route_receipt.v1",
                        "status": "routed_local_only",
                        "packet_path": packet_path,
                    },
                )
            else:
                write_json(
                    root / ".ghostclaw_runtime/a2a2a/receipts/kob_verdict_p004_local_dispatch_packet_074_kob.json",
                    {
                        "schema": "ghostclaw.a2a2a.kob_verdict_receipt.v1",
                        "status": "kob_allow_local_ack_only",
                        "packet_path": packet_path,
                    },
                )

    def _write_packet076_actual_ack_receipts(self, root: Path, targets: tuple[str, ...] = ("hermes", "kob")) -> None:
        for target in targets:
            packet_path = (
                f".ghostclaw_runtime/a2a2a/inbox/{target}/"
                f"queue_coord_packet_076_{target}_p136_20260704.json"
            )
            if target == "hermes":
                write_json(
                    root / ".ghostclaw_runtime/a2a2a/receipts/hermes_route_p136_local_dispatch_packet_076_hermes.json",
                    {
                        "schema": "ghostclaw.a2a2a.hermes_route_receipt.v1",
                        "status": "routed_local_only",
                        "packet_path": packet_path,
                    },
                )
            else:
                write_json(
                    root / ".ghostclaw_runtime/a2a2a/receipts/kob_verdict_p136_local_dispatch_packet_076_kob.json",
                    {
                        "schema": "ghostclaw.a2a2a.kob_verdict_receipt.v1",
                        "status": "kob_allow_local_ack_only",
                        "packet_path": packet_path,
                    },
                )

    def _write_packet076_p137_current_gate(self, root: Path) -> None:
        write_json(
            root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
            {
                "schema": "ghostclaw.a2a2a.current_next_gate.v1",
                "current_next_gate": {
                    "exact_phrase": "APPROVE_A2A2A_P137_PACKET076_LOCAL_ROLE_WORKER_ACK_ONLY",
                    "allowed_scope": "write local Hermes/KOB role-worker ack receipts once for packet_076 only",
                    "blocked_scope": ["worker loop/start", "queue payload execution", "provider/model call"],
                },
                "current_orchestrator": {
                    "selected_packet": "packet_076",
                    "selected_packet_path": "_A2A_QUEUE/outbox/packet_076_sirinx_agm_next_local_task_card.json",
                },
            },
        )

    def _write_packet076_completed_current_gate(self, root: Path) -> None:
        write_json(
            root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
            {
                "schema": "ghostclaw.a2a2a.current_next_gate.v1",
                "status": "p137_ack_gate_complete_next_ready_for_orchestrator_selection",
                "current_next_gate": {
                    "exact_phrase": "APPROVE_A2A2A_P137_PACKET076_LOCAL_ROLE_WORKER_ACK_ONLY",
                    "allowed_scope": "run Hermes and KOB local role workers once for packet_076 inbox envelopes only",
                    "blocked_scope": ["worker loop/start", "queue payload execution", "provider/model call"],
                },
                "current_orchestrator": {
                    "selected_packet": "packet_076",
                    "selected_packet_path": "_A2A_QUEUE/outbox/packet_076_sirinx_agm_next_local_task_card.json",
                },
            },
        )

    def _write_packet077_queue_replenish_current_gate(self, root: Path) -> None:
        write_json(
            root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
            {
                "schema": "ghostclaw.a2a2a.current_next_gate.v1",
                "status": "waiting_for_exact_queue_replenish_gate",
                "current_next_gate": {
                    "status": "suggested_next_gate_not_executed",
                    "exact_phrase": "APPROVE_A2A2A_P143_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY",
                    "allowed_scope": (
                        "write one new local active-focus A2A2A queue packet for sirinx.co or AGM AutoFlow only"
                    ),
                    "blocked_scope": [
                        "queue payload execution",
                        "worker envelope write",
                        "worker execution",
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
                    "selected_packet": "packet_077",
                    "selected_packet_path": "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                    "status": "queue_drained_no_actionable_packet",
                },
                "selected_packet_path": "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
            },
        )

    def _write_ready_loop_harness_artifacts(self, root: Path, review_mutation_allowed: bool = False) -> None:
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
        write_json(
            root
            / ".ghostclaw_runtime/a2a2a/evidence/"
            / "A2A2A-P154-LOOP-HARNESS-MANIFEST-VALIDATOR-20260704.json",
            {
                "schema": "ghostclaw.a2a2a.loop_harness_manifest_validator.v1",
                "status": "pass_loop_harness_manifest_validation",
                "loop_id": "GHOSTCLAW-P077-LOOP-HARNESS-DRY-RUN-20260703",
                "current_gate": "P076A",
                "active_focus": ["sirinx.co", "AGM AutoFlow"],
                "paused_out_of_scope": ["Kusala", "Phitsanulok News"],
                "validation": {"issues": []},
                "external_actions_performed": external_actions,
            },
        )
        write_json(
            root
            / ".ghostclaw_runtime/a2a2a/receipts/"
            / "A2A2A-P154-LOOP-HARNESS-MANIFEST-VALIDATOR-20260704.json",
            {
                "schema": "ghostclaw.a2a2a.loop_harness_manifest_validator_receipt.v1",
                "status": "recorded_loop_harness_manifest_validation",
                "external_actions_performed": external_actions,
            },
        )
        write_json(
            root
            / ".ghostclaw_runtime/a2a2a/reviews/"
            / "A2A2A-P154-LOOP-HARNESS-OPENCODE-REVIEW-PACKET-20260704.json",
            {
                "schema": "ghostclaw.a2a2a.loop_harness_opencode_review_packet.v1",
                "status": "ready_for_opencode_review",
                "review_worker": "OpenCode_Reviewer",
                "mutation_allowed": review_mutation_allowed,
                "external_actions_performed": external_actions,
            },
        )

    def _write_packet075_ack_complete_state(self, root: Path) -> None:
        sequence = "075"
        write_json(
            root / "_A2A_QUEUE" / "outbox" / "packet_075_sirinx_agm_next_local_task_card.json",
            {
                "id": "packet_075",
                "title": "sirinx.co and AGM AutoFlow next local task card",
                "agent": "codex",
                "risk": "safe",
                "approval_required": False,
            },
        )
        write_json(
            root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
            {
                "schema": "ghostclaw.a2a2a.current_next_gate.v1",
                "status": "waiting_for_exact_ack_gate",
                "next_exact_gate": "APPROVE_A2A2A_P127_PACKET075_LOCAL_ROLE_WORKER_ACK_ONLY",
                "current_next_gate": {
                    "exact_phrase": "APPROVE_A2A2A_P127_PACKET075_LOCAL_ROLE_WORKER_ACK_ONLY",
                    "allowed_scope": "run local role-worker ack once for packet_075 Hermes/KOB envelopes only",
                    "blocked_scope": ["worker loop/start", "provider/model call", "push", "deploy"],
                },
                "current_orchestrator": {
                    "selected_packet": "packet_075",
                    "selected_packet_path": "_A2A_QUEUE/outbox/packet_075_sirinx_agm_next_local_task_card.json",
                },
            },
        )
        for target in ("hermes", "kob"):
            packet_path = (
                f".ghostclaw_runtime/a2a2a/inbox/{target}/"
                f"queue_coord_packet_{sequence}_{target}_20260703T094717_754116Z.json"
            )
            write_json(
                root / packet_path,
                {
                    "schema": "ghostclaw.a2a2a.task.v1",
                    "id": f"p004_local_dispatch_packet_{sequence}_{target}",
                    "target": target,
                    "requires_ack": True,
                    "requires_receipt": True,
                    "dangerous_actions_allowed": False,
                    "secret_access_allowed": False,
                    "paid_model_calls_allowed": False,
                },
            )
            if target == "hermes":
                write_json(
                    root / ".ghostclaw_runtime/a2a2a/receipts/hermes_route_p004_local_dispatch_packet_075_hermes.json",
                    {
                        "schema": "ghostclaw.a2a2a.hermes_route_receipt.v1",
                        "status": "routed_local_only",
                        "packet_path": packet_path,
                    },
                )
            else:
                write_json(
                    root / ".ghostclaw_runtime/a2a2a/receipts/kob_verdict_p004_local_dispatch_packet_075_kob.json",
                    {
                        "schema": "ghostclaw.a2a2a.kob_verdict_receipt.v1",
                        "status": "kob_allow_local_ack_only",
                        "packet_path": packet_path,
                    },
                )

    def test_ranks_active_focus_ready_packet_before_paused_project(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(
                root / "_A2A_QUEUE" / "inbox" / "packet_sirinx.json",
                {
                    "id": "packet_sirinx",
                    "title": "sirinx.co active focus local packet",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                },
            )
            write_json(
                root / "_A2A_QUEUE" / "inbox" / "packet_kusala.json",
                {
                    "id": "packet_kusala",
                    "title": "Kusala paused project local packet",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root)],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "pass")
            self.assertEqual(payload["summary"]["next_packet"]["id"], "packet_sirinx")
            self.assertEqual(payload["summary"]["next_packet"]["focus_state"], "active")
            paused = [item for item in payload["ranked_packets"] if item["id"] == "packet_kusala"][0]
            self.assertEqual(paused["focus_state"], "paused")
            self.assertFalse(paused["can_prepare_local_packet"])
            self.assertFalse(payload["guardrails"]["queue_file_mutation"])
            self.assertFalse(payload["guardrails"]["worker_execution"])

    def test_gated_packet_is_not_selected_for_codex_builder(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(
                root / "_A2A_QUEUE" / "inbox" / "packet_provider.json",
                {
                    "id": "packet_provider",
                    "title": "sirinx.co provider call request",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": True,
                    "provider_call": True,
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root)],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertIsNone(payload["lane_assignments"]["codex_builder"]["selected_packet"])
            self.assertEqual(payload["ranked_packets"][0]["lane_status"], "approval_gate_required")
            self.assertFalse(payload["ranked_packets"][0]["can_prepare_local_packet"])
            self.assertFalse(payload["blocked_actions_preserved"]["provider_call"])

    def test_default_run_does_not_write_evidence_or_receipt(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(
                root / "_A2A_QUEUE" / "inbox" / "packet_agm.json",
                {
                    "id": "packet_agm",
                    "title": "AGM AutoFlow active focus packet",
                    "agent": "codex",
                    "risk": "safe",
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root)],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["summary"]["next_packet"]["id"], "packet_agm")
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/evidence").exists())
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/receipts").exists())

    def test_write_creates_only_evidence_and_receipt_paths(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(
                root / "_A2A_QUEUE" / "inbox" / "packet_agm.json",
                {
                    "id": "packet_agm",
                    "title": "AGM AutoFlow active focus packet",
                    "agent": "codex",
                    "risk": "safe",
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            evidence = root / ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P077-AGENT-ORCHESTRATOR-ACCELERATION-IMPLEMENTATION-20260703.json"
            receipt = root / ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P077-AGENT-ORCHESTRATOR-ACCELERATION-IMPLEMENTATION-20260703.json"
            self.assertEqual(payload["receipt_path"], str(receipt.relative_to(root)))
            self.assertTrue(evidence.is_file())
            self.assertTrue(receipt.is_file())
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox").exists())

    def test_skips_acknowledged_packet_and_selects_next_active_packet(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(
                root / "_A2A_QUEUE" / "outbox" / "packet_041_sirinx.json",
                {
                    "id": "packet_041",
                    "title": "sirinx.co acknowledged local packet",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                },
            )
            write_json(
                root / "_A2A_QUEUE" / "outbox" / "packet_042_sirinx.json",
                {
                    "id": "packet_042",
                    "title": "sirinx.co next local packet",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                },
            )
            write_json(
                root / ".ghostclaw_runtime/a2a2a/receipts/hermes_route_p004_local_dispatch_packet_041_hermes.json",
                {"status": "route_blocked_by_local_safety"},
            )
            write_json(
                root / ".ghostclaw_runtime/a2a2a/receipts/kob_verdict_p004_local_dispatch_packet_041_kob.json",
                {"status": "kob_blocked"},
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root)],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["summary"]["next_packet"]["id"], "packet_042")
            packet_041 = [item for item in payload["ranked_packets"] if item["id"] == "packet_041"][0]
            self.assertEqual(packet_041["lane_status"], "already_acknowledged_local_safety_blocked")
            self.assertFalse(packet_041["can_prepare_local_packet"])
            self.assertEqual(packet_041["completion_ack"]["hermes_status"], "route_blocked_by_local_safety")
            self.assertEqual(packet_041["completion_ack"]["kob_status"], "kob_blocked")
            self.assertFalse(payload["blocked_actions_preserved"]["queue_payload_execution"])

    def test_skips_inflight_packet_waiting_for_current_ack(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(
                root / "_A2A_QUEUE" / "outbox" / "packet_042_sirinx.json",
                {
                    "id": "packet_042",
                    "title": "sirinx.co in-flight local packet",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                },
            )
            write_json(
                root / "_A2A_QUEUE" / "outbox" / "packet_043_sirinx.json",
                {
                    "id": "packet_043",
                    "title": "sirinx.co next local packet",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                },
            )
            write_json(
                root / ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_042_hermes_20260703T053954_538903Z.json",
                {"schema": "ghostclaw.a2a2a.task.v1", "id": "p004_local_dispatch_packet_042_hermes"},
            )
            write_json(
                root / ".ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_042_kob_20260703T053954_538903Z.json",
                {"schema": "ghostclaw.a2a2a.task.v1", "id": "p004_local_dispatch_packet_042_kob"},
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root)],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["summary"]["next_packet"]["id"], "packet_043")
            packet_042 = [item for item in payload["ranked_packets"] if item["id"] == "packet_042"][0]
            self.assertEqual(packet_042["lane_status"], "worker_envelopes_inflight_ack_pending")
            self.assertFalse(packet_042["can_prepare_local_packet"])
            self.assertEqual(packet_042["inflight_ack"]["status"], "waiting_for_role_worker_ack")
            self.assertEqual({item["target"] for item in packet_042["inflight_ack"]["pending_targets"]}, {"hermes", "kob"})
            self.assertFalse(payload["blocked_actions_preserved"]["queue_payload_execution"])

    def test_skips_safe_local_ack_packet_when_receipts_match_latest_envelopes(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(
                root / "_A2A_QUEUE" / "outbox" / "packet_043_sirinx.json",
                {
                    "id": "packet_043",
                    "title": "sirinx.co safe local ack packet",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                },
            )
            write_json(
                root / "_A2A_QUEUE" / "outbox" / "packet_044_sirinx.json",
                {
                    "id": "packet_044",
                    "title": "sirinx.co next local packet",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                },
            )
            hermes_packet = root / ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_043_hermes_20260702T190501_733201Z.json"
            kob_packet = root / ".ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_043_kob_20260702T190501_733201Z.json"
            write_json(hermes_packet, {"schema": "ghostclaw.a2a2a.task.v1", "id": "p004_local_dispatch_packet_043_hermes"})
            write_json(kob_packet, {"schema": "ghostclaw.a2a2a.task.v1", "id": "p004_local_dispatch_packet_043_kob"})
            write_json(
                root / ".ghostclaw_runtime/a2a2a/receipts/hermes_route_p004_local_dispatch_packet_043_hermes.json",
                {
                    "status": "routed_local_only",
                    "packet_path": ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_043_hermes_20260702T190501_733201Z.json",
                },
            )
            write_json(
                root / ".ghostclaw_runtime/a2a2a/receipts/kob_verdict_p004_local_dispatch_packet_043_kob.json",
                {
                    "status": "kob_allow_local_ack_only",
                    "packet_path": ".ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_043_kob_20260702T190501_733201Z.json",
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root)],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["summary"]["next_packet"]["id"], "packet_044")
            packet_043 = [item for item in payload["ranked_packets"] if item["id"] == "packet_043"][0]
            self.assertEqual(packet_043["lane_status"], "already_acknowledged_local_safety_blocked")
            self.assertFalse(packet_043["can_prepare_local_packet"])
            self.assertEqual(packet_043["completion_ack"]["hermes_status"], "routed_local_only")
            self.assertEqual(packet_043["completion_ack"]["kob_status"], "kob_allow_local_ack_only")
            self.assertTrue(packet_043["completion_ack"]["hermes_receipt_matches_latest_packet"])
            self.assertTrue(packet_043["completion_ack"]["kob_receipt_matches_latest_packet"])

    def test_does_not_complete_safe_ack_packet_when_receipts_are_stale(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(
                root / "_A2A_QUEUE" / "outbox" / "packet_043_sirinx.json",
                {
                    "id": "packet_043",
                    "title": "sirinx.co stale ack packet",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                },
            )
            write_json(
                root / "_A2A_QUEUE" / "outbox" / "packet_044_sirinx.json",
                {
                    "id": "packet_044",
                    "title": "sirinx.co next local packet",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                },
            )
            write_json(
                root / ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_043_hermes_20260702T190501_733201Z.json",
                {"schema": "ghostclaw.a2a2a.task.v1", "id": "old_hermes_packet"},
            )
            write_json(
                root / ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_043_hermes_20260703T060203_230288Z.json",
                {"schema": "ghostclaw.a2a2a.task.v1", "id": "new_hermes_packet"},
            )
            write_json(
                root / ".ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_043_kob_20260702T190501_733201Z.json",
                {"schema": "ghostclaw.a2a2a.task.v1", "id": "old_kob_packet"},
            )
            write_json(
                root / ".ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_043_kob_20260703T060203_230288Z.json",
                {"schema": "ghostclaw.a2a2a.task.v1", "id": "new_kob_packet"},
            )
            write_json(
                root / ".ghostclaw_runtime/a2a2a/receipts/hermes_route_p004_local_dispatch_packet_043_hermes.json",
                {
                    "status": "routed_local_only",
                    "packet_path": ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_043_hermes_20260702T190501_733201Z.json",
                },
            )
            write_json(
                root / ".ghostclaw_runtime/a2a2a/receipts/kob_verdict_p004_local_dispatch_packet_043_kob.json",
                {
                    "status": "kob_allow_local_ack_only",
                    "packet_path": ".ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_043_kob_20260702T190501_733201Z.json",
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root)],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["summary"]["next_packet"]["id"], "packet_044")
            packet_043 = [item for item in payload["ranked_packets"] if item["id"] == "packet_043"][0]
            self.assertIsNone(packet_043["completion_ack"])
            self.assertEqual(packet_043["lane_status"], "worker_envelopes_inflight_ack_pending")
            self.assertFalse(packet_043["can_prepare_local_packet"])
            self.assertEqual({item["target"] for item in packet_043["inflight_ack"]["pending_targets"]}, {"hermes", "kob"})

    def test_drain_mode_reports_ack_reconcile_when_no_ready_packet(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(
                root / "_A2A_QUEUE" / "outbox" / "packet_042_sirinx.json",
                {
                    "id": "packet_042",
                    "title": "sirinx.co current in-flight packet",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                },
            )
            write_json(
                root / ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_042_hermes_20260703T053954_538903Z.json",
                {"schema": "ghostclaw.a2a2a.task.v1", "id": "p004_local_dispatch_packet_042_hermes"},
            )
            write_json(
                root / ".ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_042_kob_20260703T053954_538903Z.json",
                {"schema": "ghostclaw.a2a2a.task.v1", "id": "p004_local_dispatch_packet_042_kob"},
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root)],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertIsNone(payload["summary"]["next_packet"])
            self.assertEqual(payload["queue_drain"]["status"], "ack_reconcile_required")
            self.assertEqual(payload["queue_drain"]["next_ack_reconcile_packet"]["id"], "packet_042")
            self.assertEqual(
                payload["lane_assignments"]["hermes_orchestrator"]["next_action"],
                "reconcile_current_worker_ack_receipts_before_new_dispatch",
            )
            self.assertFalse(payload["queue_drain"]["external_action_allowed"])

    def test_drain_mode_reports_active_gate_when_no_ready_or_inflight_packet(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(
                root / "_A2A_QUEUE" / "outbox" / "packet_021_sirinx.json",
                {
                    "id": "packet_021",
                    "title": "A2A adaptive sync control status for sirinx.co",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": True,
                    "required_gates": ["APPROVE_GATE_SPECIFIC_ACTION"],
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root)],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertIsNone(payload["summary"]["next_packet"])
            self.assertEqual(payload["queue_drain"]["status"], "active_gate_review_required")
            self.assertEqual(payload["queue_drain"]["next_gate_packet"]["id"], "packet_021")
            self.assertEqual(
                payload["queue_drain"]["recommended_next_gate_phrase"],
                "APPROVE_A2A2A_PACKET_021_A2A_ADAPTIVE_SYNC_CONTROL_STATUS_FOR_SIRINX_CO",
            )
            self.assertEqual(
                payload["queue_drain"]["next_gate_packet"]["recommended_gate"]["type"],
                "suggested_exact_gate_for_generic_gate",
            )
            self.assertFalse(payload["queue_drain"]["next_gate_packet"]["recommended_gate"]["external_action_allowed"])
            self.assertEqual(
                payload["lane_assignments"]["hermes_orchestrator"]["next_action"],
                "review_active_focus_gate_candidates_before_queue_replenish",
            )
            self.assertFalse(payload["queue_drain"]["source_mutation_allowed_now"])

    def test_preserves_existing_exact_required_gates_in_drain_mode(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(
                root / "_A2A_QUEUE" / "outbox" / "packet_020_sirinx_mcp_auth.json",
                {
                    "id": "packet_020",
                    "title": "sirinx.co MCP auth refresh for Linear Notion Figma connectors",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": True,
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root)],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertIsNone(payload["summary"]["next_packet"])
            self.assertEqual(payload["queue_drain"]["status"], "active_gate_review_required")
            self.assertEqual(payload["queue_drain"]["next_gate_packet"]["id"], "packet_020")
            self.assertEqual(
                payload["queue_drain"]["next_gate_packet"]["recommended_gate"]["type"],
                "existing_required_gates",
            )
            self.assertEqual(
                payload["queue_drain"]["recommended_next_gate_phrase"],
                "APPROVE_MCP_AUTH_REFRESH_LINEAR",
            )
            self.assertEqual(
                payload["queue_drain"]["next_gate_packet"]["recommended_gate"]["phrases"],
                [
                    "APPROVE_MCP_AUTH_REFRESH_LINEAR",
                    "APPROVE_MCP_AUTH_REFRESH_NOTION",
                    "APPROVE_MCP_AUTH_REFRESH_FIGMA",
                ],
            )
            self.assertFalse(payload["queue_drain"]["next_gate_packet"]["recommended_gate"]["external_action_allowed"])

    def test_compact_output_keeps_next_gate_without_ranked_packets(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(
                root / "_A2A_QUEUE" / "outbox" / "packet_020_sirinx_mcp_auth.json",
                {
                    "id": "packet_020",
                    "title": "sirinx.co MCP auth refresh for Linear Notion Figma connectors",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": True,
                    "required_gates": [
                        "APPROVE_MCP_AUTH_REFRESH_LINEAR",
                        "APPROVE_MCP_AUTH_REFRESH_NOTION",
                        "APPROVE_MCP_AUTH_REFRESH_FIGMA",
                    ],
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--compact"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.agent_orchestrator.compact.v1")
            self.assertNotIn("ranked_packets", payload)
            self.assertEqual(payload["queue_drain"]["status"], "active_gate_review_required")
            self.assertEqual(payload["queue_drain"]["recommended_next_gate_phrase"], "APPROVE_MCP_AUTH_REFRESH_LINEAR")
            self.assertEqual(
                payload["queue_drain"]["next_gate_phrases"],
                [
                    "APPROVE_MCP_AUTH_REFRESH_LINEAR",
                    "APPROVE_MCP_AUTH_REFRESH_NOTION",
                    "APPROVE_MCP_AUTH_REFRESH_FIGMA",
                ],
            )
            self.assertFalse(payload["queue_drain"]["external_action_allowed"])
            self.assertFalse(payload["queue_drain"]["source_mutation_allowed_now"])

    def test_compact_output_surfaces_current_persisted_gate_when_queue_is_drained(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P129_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY"
            write_json(
                root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
                {
                    "schema": "ghostclaw.a2a2a.current_next_gate.v1",
                    "status": "waiting_for_exact_queue_replenish_gate",
                    "current_next_gate": {
                        "status": "suggested_next_gate_not_executed",
                        "exact_phrase": exact_gate,
                        "allowed_scope": "write one new local active-focus A2A2A queue packet only",
                        "blocked_scope": [
                            "execute queue payload",
                            "provider/model call",
                            "push",
                            "deploy",
                        ],
                    },
                    "current_orchestrator": {
                        "status": "queue_drained_no_actionable_packet",
                        "lane_status": "waiting_for_active_focus_queue_replenish_gate",
                        "previous_packet": "packet_075",
                    },
                    "selected_packet_path": "_A2A_QUEUE/outbox/packet_076_sirinx_agm_next_local_task_card.json",
                    "next_safe_action": (
                        "Provide APPROVE_A2A2A_P129_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY "
                        "only if a new local queue packet should be written."
                    ),
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--compact"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["queue_drain"]["status"], "queue_drained_waiting_for_current_exact_gate")
            self.assertEqual(payload["queue_drain"]["recommended_next_gate_phrase"], exact_gate)
            self.assertEqual(payload["queue_drain"]["next_gate_phrases"], [exact_gate])
            self.assertEqual(payload["current_gate_overlay"]["exact_gate_phrase"], exact_gate)
            self.assertFalse(payload["current_gate_overlay"]["current_gate_is_approval"])
            self.assertFalse(payload["queue_drain"]["next_gate_packet"]["recommended_gate"]["external_action_allowed"])
            self.assertFalse(payload["queue_drain"]["next_gate_packet"]["recommended_gate"]["source_mutation_allowed_now"])
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox").exists())
            self.assertEqual(list((root / ".ghostclaw_runtime/a2a2a/receipts").glob("*.json")), [])

    def test_write_compact_prints_compact_but_writes_full_evidence(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(
                root / "_A2A_QUEUE" / "inbox" / "packet_agm.json",
                {
                    "id": "packet_agm",
                    "title": "AGM AutoFlow active focus packet",
                    "agent": "codex",
                    "risk": "safe",
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--write", "--compact"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertNotIn("ranked_packets", payload)
            self.assertEqual(payload["receipt_path"], ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P077-AGENT-ORCHESTRATOR-ACCELERATION-IMPLEMENTATION-20260703.json")
            evidence = root / ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P077-AGENT-ORCHESTRATOR-ACCELERATION-IMPLEMENTATION-20260703.json"
            evidence_payload = json.loads(evidence.read_text(encoding="utf-8"))
            self.assertIn("ranked_packets", evidence_payload)
            self.assertEqual(evidence_payload["summary"]["next_packet"]["id"], "packet_agm")

    def test_write_compact_can_also_write_durable_compact_snapshot_and_receipt(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            compact_output = ".ghostclaw_runtime/a2a2a/status/current_compact_status.json"
            compact_receipt = ".ghostclaw_runtime/a2a2a/receipts/current_compact_status.json"
            write_json(
                root / "_A2A_QUEUE" / "inbox" / "packet_agm.json",
                {
                    "id": "packet_agm",
                    "title": "AGM AutoFlow active focus packet",
                    "agent": "codex",
                    "risk": "safe",
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--write",
                    "--compact",
                    "--compact-output",
                    compact_output,
                    "--compact-receipt-output",
                    compact_receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            snapshot = json.loads((root / compact_output).read_text(encoding="utf-8"))
            receipt = json.loads((root / compact_receipt).read_text(encoding="utf-8"))
            self.assertEqual(snapshot, payload)
            self.assertEqual(snapshot["schema"], "ghostclaw.a2a2a.agent_orchestrator.compact.v1")
            self.assertNotIn("ranked_packets", snapshot)
            self.assertEqual(
                snapshot["summary"]["next_packet"]["id"],
                "packet_agm",
            )
            self.assertEqual(receipt["schema"], "ghostclaw.a2a2a.compact_status_receipt.v1")
            self.assertEqual(receipt["status"], "recorded_compact_status_snapshot")
            self.assertEqual(receipt["compact_status_path"], compact_output)
            self.assertFalse(receipt["external_actions_performed"]["telegram_live_send"])
            self.assertFalse(receipt["external_actions_performed"]["provider_call"])
            self.assertFalse(receipt["external_actions_performed"]["queue_payload_execution"])

    def test_compact_snapshot_freshness_guard_marks_waiting_snapshot_fresh_when_candidate_absent(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            snapshot_path = ".ghostclaw_runtime/a2a2a/status/current_compact_status.json"
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            target_queue = "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json"
            write_json(
                root / snapshot_path,
                {
                    "schema": "ghostclaw.a2a2a.agent_orchestrator.compact.v1",
                    "packet_id": "A2A2A-P077-AGENT-ORCHESTRATOR-ACCELERATION-IMPLEMENTATION-20260703",
                    "status": "pass",
                    "repo": str(root),
                    "opencode_post_handoff_router_status": {
                        "packet_id": "A2A2A-P201-PACKET078-OPENCODE-POST-HANDOFF-ROUTER-20260704",
                        "status": "waiting_for_opencode_candidate",
                        "candidate_review_result_path": candidate,
                        "candidate_review_result_exists": False,
                        "real_review_result_path": real_result,
                        "real_review_result_path_exists": False,
                        "target_queue_path": target_queue,
                        "target_queue_path_exists": False,
                        "p193_guard_exists": False,
                        "next_action": "paste_p195_prompt_into_opencode",
                    },
                    "next_safe_action": "Paste the P195 prompt into OpenCode.",
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--compact-snapshot-freshness",
                    "--compact-output",
                    snapshot_path,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.compact_snapshot_freshness.v1")
            self.assertEqual(payload["status"], "fresh_waiting_for_opencode_candidate")
            self.assertFalse(payload["candidate_review_result_exists"])
            self.assertFalse(payload["real_review_result_path_exists"])
            self.assertFalse(payload["target_queue_path_exists"])
            self.assertEqual(payload["recommended_next_action"], "paste_p195_prompt_into_opencode")
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / target_queue).exists())

    def test_compact_snapshot_freshness_guard_marks_waiting_snapshot_stale_after_candidate_arrives(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            snapshot_path = ".ghostclaw_runtime/a2a2a/status/current_compact_status.json"
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            target_queue = "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json"
            write_json(
                root / snapshot_path,
                {
                    "schema": "ghostclaw.a2a2a.agent_orchestrator.compact.v1",
                    "packet_id": "A2A2A-P077-AGENT-ORCHESTRATOR-ACCELERATION-IMPLEMENTATION-20260703",
                    "status": "pass",
                    "repo": str(root),
                    "opencode_post_handoff_router_status": {
                        "packet_id": "A2A2A-P201-PACKET078-OPENCODE-POST-HANDOFF-ROUTER-20260704",
                        "status": "waiting_for_opencode_candidate",
                        "candidate_review_result_path": candidate,
                        "candidate_review_result_exists": False,
                        "real_review_result_path": real_result,
                        "real_review_result_path_exists": False,
                        "target_queue_path": target_queue,
                        "target_queue_path_exists": False,
                        "p193_guard_exists": False,
                        "next_action": "paste_p195_prompt_into_opencode",
                    },
                    "next_safe_action": "Paste the P195 prompt into OpenCode.",
                },
            )
            write_json(
                root / candidate,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_review_candidate_result.v1",
                    "packet_id": "A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-20260704",
                    "status": "REVIEW_PASS_READY_FOR_EXACT_P167",
                    "review_worker": "OpenCode_Reviewer",
                    "mutation_allowed": False,
                    "blocking_issues": [],
                    "external_actions_performed": {
                        "candidate_review_result_write": False,
                        "real_review_result_write": False,
                        "queue_file_write": False,
                        "provider_call": False,
                    },
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--compact-snapshot-freshness",
                    "--compact-output",
                    snapshot_path,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "stale_refresh_required_candidate_arrived")
            self.assertTrue(payload["candidate_review_result_exists"])
            self.assertFalse(payload["real_review_result_path_exists"])
            self.assertFalse(payload["target_queue_path_exists"])
            self.assertEqual(payload["recommended_next_action"], "rerun_compact_snapshot_and_p201_router")
            self.assertFalse(payload["external_actions_performed"]["real_review_result_write"])
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / target_queue).exists())

    def test_packet078_post_candidate_reconcile_bundle_waits_without_writing_blocked_artifacts(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            readiness = ".ghostclaw_runtime/a2a2a/status/P200-handoff-readiness.json"
            router = ".ghostclaw_runtime/a2a2a/status/P201-router.json"
            router_receipt = ".ghostclaw_runtime/a2a2a/receipts/P201-router.json"
            compact = ".ghostclaw_runtime/a2a2a/status/current-compact.json"
            compact_receipt = ".ghostclaw_runtime/a2a2a/receipts/current-compact.json"
            freshness = ".ghostclaw_runtime/a2a2a/status/P205-freshness.json"
            freshness_receipt = ".ghostclaw_runtime/a2a2a/receipts/P205-freshness.json"
            reconcile = ".ghostclaw_runtime/a2a2a/status/P206-reconcile.json"
            reconcile_receipt = ".ghostclaw_runtime/a2a2a/receipts/P206-reconcile.json"
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            target_queue = "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json"
            p193_guard = ".ghostclaw_runtime/a2a2a/commands/P193-candidate-copy-gate.sh"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {"total": 0, "would_dispatch": 0, "would_gate": 0, "observed": 0},
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / readiness,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_handoff_readiness.v1",
                    "status": "ready_for_manual_opencode_paste",
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--write",
                    "--packet078-post-candidate-reconcile-bundle",
                    "--packet078-opencode-handoff-readiness-output",
                    readiness,
                    "--packet078-opencode-post-handoff-router-output",
                    router,
                    "--packet078-opencode-post-handoff-router-receipt-output",
                    router_receipt,
                    "--compact-output",
                    compact,
                    "--compact-receipt-output",
                    compact_receipt,
                    "--compact-freshness-output",
                    freshness,
                    "--compact-freshness-receipt-output",
                    freshness_receipt,
                    "--packet078-post-candidate-reconcile-output",
                    reconcile,
                    "--packet078-post-candidate-reconcile-receipt-output",
                    reconcile_receipt,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-candidate-copy-command-output",
                    p193_guard,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.packet078_post_candidate_reconcile_bundle.v1")
            self.assertEqual(payload["status"], "waiting_for_opencode_candidate")
            self.assertEqual(payload["recommended_next_action"], "paste_p195_prompt_into_opencode")
            self.assertTrue((root / router).is_file())
            self.assertTrue((root / compact).is_file())
            self.assertTrue((root / freshness).is_file())
            self.assertTrue((root / reconcile).is_file())
            self.assertTrue((root / reconcile_receipt).is_file())
            self.assertFalse((root / candidate).exists())
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / target_queue).exists())
            self.assertFalse((root / p193_guard).exists())
            self.assertFalse(payload["external_actions_performed"]["candidate_review_result_write"])
            self.assertFalse(payload["external_actions_performed"]["real_review_result_write"])
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse(payload["external_actions_performed"]["guard_script_write"])

    def test_packet078_post_candidate_reconcile_bundle_surfaces_exact_p193_gate_after_candidate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            readiness = ".ghostclaw_runtime/a2a2a/status/P200-handoff-readiness.json"
            compact = ".ghostclaw_runtime/a2a2a/status/current-compact.json"
            freshness = ".ghostclaw_runtime/a2a2a/status/P205-freshness.json"
            reconcile = ".ghostclaw_runtime/a2a2a/status/P206-reconcile.json"
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            target_queue = "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json"
            p193_guard = ".ghostclaw_runtime/a2a2a/commands/P193-candidate-copy-gate.sh"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {"total": 0, "would_dispatch": 0, "would_gate": 0, "observed": 0},
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / readiness,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_handoff_readiness.v1",
                    "status": "candidate_present_run_p185",
                },
            )
            write_json(
                root / candidate,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_review_candidate_result.v1",
                    "packet_id": "A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-20260704",
                    "status": "REVIEW_PASS_READY_FOR_EXACT_P167",
                    "review_worker": "OpenCode_Reviewer",
                    "mutation_allowed": False,
                    "target_queue_path_exists": False,
                    "blocking_issues": [],
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
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--write",
                    "--packet078-post-candidate-reconcile-bundle",
                    "--packet078-opencode-handoff-readiness-output",
                    readiness,
                    "--compact-output",
                    compact,
                    "--compact-freshness-output",
                    freshness,
                    "--packet078-post-candidate-reconcile-output",
                    reconcile,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-candidate-copy-command-output",
                    p193_guard,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            snapshot = json.loads((root / compact).read_text(encoding="utf-8"))
            fresh = json.loads((root / freshness).read_text(encoding="utf-8"))
            self.assertEqual(payload["status"], "ready_for_exact_p193_candidate_copy_gate")
            self.assertEqual(payload["recommended_next_action"], "request_exact_p193_candidate_copy_gate")
            self.assertEqual(snapshot["opencode_post_handoff_router_status"]["status"], "ready_for_exact_p193_candidate_copy_gate")
            self.assertEqual(fresh["status"], "fresh_ready_for_exact_p193_candidate_copy_gate")
            self.assertTrue(payload["candidate_review_result_exists"])
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / target_queue).exists())
            self.assertFalse((root / p193_guard).exists())
            self.assertFalse(payload["external_actions_performed"]["real_review_result_write"])
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse(payload["external_actions_performed"]["guard_script_write"])

    def test_packet078_opencode_operator_handoff_pack_writes_checksum_guarded_runner_only(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            prompt = ".ghostclaw_runtime/a2a2a/reviews/P195-paste-prompt.txt"
            command = ".ghostclaw_runtime/a2a2a/commands/P208-opencode-operator-handoff.sh"
            output = ".ghostclaw_runtime/a2a2a/status/P208-opencode-operator-handoff.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P208-opencode-operator-handoff.json"
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            target_queue = "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json"
            p193_guard = ".ghostclaw_runtime/a2a2a/commands/P193-candidate-copy-gate.sh"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {"total": 0, "would_dispatch": 0, "would_gate": 0, "observed": 0},
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            (root / prompt).parent.mkdir(parents=True, exist_ok=True)
            (root / prompt).write_text("OpenCode local-safe candidate prompt", encoding="utf-8")

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--write",
                    "--packet078-opencode-operator-handoff-pack",
                    "--packet078-opencode-candidate-paste-prompt-output",
                    prompt,
                    "--packet078-opencode-operator-handoff-command-output",
                    command,
                    "--packet078-opencode-operator-handoff-output",
                    output,
                    "--packet078-opencode-operator-handoff-receipt-output",
                    receipt,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-candidate-copy-command-output",
                    p193_guard,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            script_text = (root / command).read_text(encoding="utf-8")
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.packet078_opencode_operator_handoff_pack.v1")
            self.assertEqual(payload["status"], "ready_for_manual_paste_and_bounded_watch")
            self.assertTrue(payload["prompt_path_exists"])
            self.assertIn("pbcopy", script_text)
            self.assertIn("--watch-after-paste", script_text)
            self.assertIn("--copy-with-receipt", script_text)
            self.assertIn("A2A2A-P220-PACKET078-P195-CLIPBOARD-LOAD-STATUS-20260704.json", script_text)
            self.assertIn("A2A2A-P220-PACKET078-P195-CLIPBOARD-LOAD-RECEIPT-20260704.json", script_text)
            self.assertIn("--packet078-candidate-arrival-watch", script_text)
            self.assertIn("--packet078-opencode-review-candidate-preflight", script_text)
            self.assertIn("A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-PREFLIGHT-20260704.json", script_text)
            self.assertIn("--packet078-opencode-operator-status-brief", script_text)
            self.assertIn("--packet078-opencode-watch-stall-status", script_text)
            self.assertIn("--packet078-opencode-watch-stall-status-output", script_text)
            self.assertIn(payload["prompt_sha256"], script_text)
            self.assertTrue((root / command).is_file())
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertFalse((root / candidate).exists())
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / target_queue).exists())
            self.assertFalse((root / p193_guard).exists())
            self.assertFalse(payload["external_actions_performed"]["candidate_review_result_write"])
            self.assertFalse(payload["external_actions_performed"]["real_review_result_write"])
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])
            self.assertEqual(payload["clipboard_load_with_receipt_command"], f"bash {command} --copy-with-receipt")
            self.assertEqual(
                payload["clipboard_load_status_path"],
                ".ghostclaw_runtime/a2a2a/status/A2A2A-P220-PACKET078-P195-CLIPBOARD-LOAD-STATUS-20260704.json",
            )
            self.assertEqual(
                payload["clipboard_load_receipt_path"],
                ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P220-PACKET078-P195-CLIPBOARD-LOAD-RECEIPT-20260704.json",
            )
            self.assertEqual(
                payload["watch_after_manual_paste_refreshes"],
                [
                    "P207_candidate_arrival_watch",
                    "P185_candidate_preflight",
                    "P210_operator_status_brief",
                    "P213_watch_stall_status",
                ],
            )
            self.assertEqual(
                [step["step"] for step in payload["post_paste_refresh_chain"]],
                payload["watch_after_manual_paste_refreshes"],
            )
            self.assertEqual(
                payload["post_paste_refresh_chain"][1]["artifact"],
                ".ghostclaw_runtime/a2a2a/status/A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-PREFLIGHT-20260704.json",
            )

    def test_packet078_opencode_operator_handoff_pack_blocks_when_prompt_missing(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            prompt = ".ghostclaw_runtime/a2a2a/reviews/P195-paste-prompt.txt"
            command = ".ghostclaw_runtime/a2a2a/commands/P208-opencode-operator-handoff.sh"
            output = ".ghostclaw_runtime/a2a2a/status/P208-opencode-operator-handoff.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {"total": 0, "would_dispatch": 0, "would_gate": 0, "observed": 0},
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--write",
                    "--packet078-opencode-operator-handoff-pack",
                    "--packet078-opencode-candidate-paste-prompt-output",
                    prompt,
                    "--packet078-opencode-operator-handoff-command-output",
                    command,
                    "--packet078-opencode-operator-handoff-output",
                    output,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "blocked_prompt_missing")
            self.assertIn("p195_prompt_missing", payload["issues"])
            self.assertTrue((root / output).is_file())
            self.assertFalse((root / command).exists())
            self.assertFalse(payload["external_actions_performed"]["guard_script_write"])

    def test_packet078_opencode_operator_handoff_status_surfaces_manual_next_action(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            prompt = ".ghostclaw_runtime/a2a2a/reviews/P195-paste-prompt.txt"
            command = ".ghostclaw_runtime/a2a2a/commands/P208-opencode-operator-handoff.sh"
            p208_status = ".ghostclaw_runtime/a2a2a/status/P208-opencode-operator-handoff.json"
            output = ".ghostclaw_runtime/a2a2a/status/P209-opencode-operator-handoff-status.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P209-opencode-operator-handoff-status.json"
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            target_queue = "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json"
            p193_guard = ".ghostclaw_runtime/a2a2a/commands/P193-candidate-copy-gate.sh"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {"total": 0, "would_dispatch": 0, "would_gate": 0, "observed": 0},
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            (root / prompt).parent.mkdir(parents=True, exist_ok=True)
            (root / prompt).write_text("OpenCode local-safe candidate prompt", encoding="utf-8")
            (root / command).parent.mkdir(parents=True, exist_ok=True)
            (root / command).write_text("#!/usr/bin/env bash\nset -euo pipefail\n", encoding="utf-8")
            write_json(
                root / p208_status,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_operator_handoff_pack.v1",
                    "packet_id": "A2A2A-P208-PACKET078-OPENCODE-OPERATOR-HANDOFF-PACK-20260704",
                    "status": "ready_for_manual_paste_and_bounded_watch",
                    "prompt_path": prompt,
                    "prompt_path_exists": True,
                    "command_path": command,
                    "clipboard_load_command": f"bash {command} --copy",
                    "clipboard_load_with_receipt_command": f"bash {command} --copy-with-receipt",
                    "watch_after_manual_paste_command": f"bash {command} --watch-after-paste",
                    "candidate_review_result_path": candidate,
                    "candidate_review_result_exists": False,
                    "real_review_result_path": real_result,
                    "real_review_result_path_exists": False,
                    "target_queue_path": target_queue,
                    "target_queue_path_exists": False,
                    "p193_guard_path": p193_guard,
                    "p193_guard_exists": False,
                    "issues": [],
                    "next_safe_action": "Run copy, paste into OpenCode, then run watch.",
                    "external_actions_performed": {
                        "candidate_review_result_write": False,
                        "real_review_result_write": False,
                        "queue_file_write": False,
                        "guard_script_write": False,
                        "provider_call": False,
                    },
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--write",
                    "--packet078-opencode-operator-handoff-status-surface",
                    "--packet078-opencode-operator-handoff-status",
                    p208_status,
                    "--packet078-opencode-operator-handoff-status-output",
                    output,
                    "--packet078-opencode-operator-handoff-status-receipt-output",
                    receipt,
                    "--packet078-opencode-candidate-paste-prompt-output",
                    prompt,
                    "--packet078-opencode-operator-handoff-command-output",
                    command,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-candidate-copy-command-output",
                    p193_guard,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.packet078_opencode_operator_handoff_status.v1")
            self.assertEqual(payload["status"], "ready_for_manual_paste_and_bounded_watch")
            self.assertEqual(payload["next_action"], "manual_paste_p195_then_run_p207_watch")
            self.assertTrue(payload["prompt_path_exists"])
            self.assertTrue(payload["command_path_exists"])
            self.assertFalse(payload["candidate_review_result_exists"])
            self.assertFalse(payload["real_review_result_path_exists"])
            self.assertFalse(payload["target_queue_path_exists"])
            self.assertFalse(payload["p193_guard_exists"])
            self.assertEqual(payload["clipboard_load_with_receipt_command"], f"bash {command} --copy-with-receipt")
            self.assertEqual(
                payload["watch_after_manual_paste_refreshes"],
                [
                    "P207_candidate_arrival_watch",
                    "P185_candidate_preflight",
                    "P210_operator_status_brief",
                    "P213_watch_stall_status",
                ],
            )
            self.assertEqual(
                [step["step"] for step in payload["post_paste_refresh_chain"]],
                payload["watch_after_manual_paste_refreshes"],
            )
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())

            compact = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--compact",
                    "--packet078-opencode-operator-handoff-status",
                    output,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            compact_payload = json.loads(compact.stdout)
            surface = compact_payload["opencode_operator_handoff_status"]
            self.assertEqual(surface["status"], "ready_for_manual_paste_and_bounded_watch")
            opencode_lane = compact_payload["lane_next_actions"]["opencode_reviewer"]
            self.assertEqual(opencode_lane["next_action"], "manual_paste_p195_then_run_p207_watch")
            self.assertEqual(opencode_lane["selected_packet"], "A2A2A-P209-PACKET078-OPENCODE-OPERATOR-HANDOFF-STATUS-20260704")
            self.assertFalse(opencode_lane["source_mutation_allowed_now"])

    def test_packet078_opencode_operator_handoff_status_blocks_after_candidate_arrives(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            prompt = ".ghostclaw_runtime/a2a2a/reviews/P195-paste-prompt.txt"
            command = ".ghostclaw_runtime/a2a2a/commands/P208-opencode-operator-handoff.sh"
            p208_status = ".ghostclaw_runtime/a2a2a/status/P208-opencode-operator-handoff.json"
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {"total": 0, "would_dispatch": 0, "would_gate": 0, "observed": 0},
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            (root / prompt).parent.mkdir(parents=True, exist_ok=True)
            (root / prompt).write_text("OpenCode local-safe candidate prompt", encoding="utf-8")
            (root / command).parent.mkdir(parents=True, exist_ok=True)
            (root / command).write_text("#!/usr/bin/env bash\nset -euo pipefail\n", encoding="utf-8")
            write_json(root / candidate, {"status": "REVIEW_PASS_READY_FOR_EXACT_P167"})
            write_json(
                root / p208_status,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_operator_handoff_pack.v1",
                    "packet_id": "A2A2A-P208-PACKET078-OPENCODE-OPERATOR-HANDOFF-PACK-20260704",
                    "status": "ready_for_manual_paste_and_bounded_watch",
                    "prompt_path": prompt,
                    "command_path": command,
                    "candidate_review_result_path": candidate,
                    "real_review_result_path": real_result,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "p193_guard_path": ".ghostclaw_runtime/a2a2a/commands/P193-candidate-copy-gate.sh",
                    "issues": [],
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--packet078-opencode-operator-handoff-status-surface",
                    "--packet078-opencode-operator-handoff-status",
                    p208_status,
                    "--packet078-opencode-candidate-paste-prompt-output",
                    prompt,
                    "--packet078-opencode-operator-handoff-command-output",
                    command,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "stale_candidate_already_arrived")
            self.assertIn("candidate_review_result_already_exists", payload["issues"])
            self.assertEqual(payload["next_action"], "run_p207_watch_or_p206_reconcile")

    def test_packet078_opencode_operator_status_brief_summarizes_manual_paste_state(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            prompt = ".ghostclaw_runtime/a2a2a/reviews/P195-paste-prompt.txt"
            command = ".ghostclaw_runtime/a2a2a/commands/P208-opencode-operator-handoff.sh"
            p209_status = ".ghostclaw_runtime/a2a2a/status/P209-opencode-operator-handoff-status.json"
            brief_output = ".ghostclaw_runtime/a2a2a/status/P210-opencode-operator-status-brief.json"
            brief_receipt = ".ghostclaw_runtime/a2a2a/receipts/P210-opencode-operator-status-brief.json"
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {"total": 0, "would_dispatch": 0, "would_gate": 0, "observed": 0},
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            (root / prompt).parent.mkdir(parents=True, exist_ok=True)
            (root / prompt).write_text("OpenCode local-safe candidate prompt", encoding="utf-8")
            (root / command).parent.mkdir(parents=True, exist_ok=True)
            (root / command).write_text("#!/usr/bin/env bash\nset -euo pipefail\n", encoding="utf-8")
            write_json(
                root / p209_status,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_operator_handoff_status.v1",
                    "packet_id": "A2A2A-P209-PACKET078-OPENCODE-OPERATOR-HANDOFF-STATUS-20260704",
                    "status": "ready_for_manual_paste_and_bounded_watch",
                    "prompt_path": prompt,
                    "command_path": command,
                    "clipboard_load_command": f"bash {command} --copy",
                    "clipboard_load_with_receipt_command": f"bash {command} --copy-with-receipt",
                    "watch_after_manual_paste_command": f"bash {command} --watch-after-paste",
                    "candidate_review_result_path": candidate,
                    "candidate_review_result_exists": False,
                    "real_review_result_path": real_result,
                    "real_review_result_path_exists": False,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "target_queue_path_exists": False,
                    "p193_guard_path": ".ghostclaw_runtime/a2a2a/commands/P193-candidate-copy-gate.sh",
                    "p193_guard_exists": False,
                    "issues": [],
                    "next_action": "manual_paste_p195_then_run_p207_watch",
                    "next_safe_action": "Paste the P195 prompt into OpenCode, then run watch.",
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--write",
                    "--packet078-opencode-operator-status-brief",
                    "--packet078-opencode-operator-handoff-status-output",
                    p209_status,
                    "--packet078-opencode-operator-status-brief-output",
                    brief_output,
                    "--packet078-opencode-operator-status-brief-receipt-output",
                    brief_receipt,
                    "--packet078-opencode-candidate-paste-prompt-output",
                    prompt,
                    "--packet078-opencode-operator-handoff-command-output",
                    command,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.packet078_opencode_operator_status_brief.v1")
            self.assertEqual(payload["status"], "ready_for_operator_manual_paste")
            self.assertEqual(payload["source_status"], "ready_for_manual_paste_and_bounded_watch")
            self.assertIn("packet_078", payload["sidebar_summary"])
            self.assertIn("P209", payload["telegram_safe_draft"])
            self.assertEqual(
                payload["commands_to_run"],
                [f"bash {command} --copy-with-receipt", f"bash {command} --watch-after-paste"],
            )
            self.assertEqual(payload["clipboard_load_with_receipt_command"], f"bash {command} --copy-with-receipt")
            self.assertEqual(
                payload["watch_after_manual_paste_refreshes"],
                [
                    "P207_candidate_arrival_watch",
                    "P185_candidate_preflight",
                    "P210_operator_status_brief",
                    "P213_watch_stall_status",
                ],
            )
            self.assertFalse(payload["current_state"]["candidate_review_result_exists"])
            self.assertFalse(payload["external_actions_performed"]["telegram_live_send"])
            self.assertTrue((root / brief_output).is_file())
            self.assertTrue((root / brief_receipt).is_file())

    def test_packet078_opencode_operator_status_brief_stops_paste_after_candidate_arrives(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            prompt = ".ghostclaw_runtime/a2a2a/reviews/P195-paste-prompt.txt"
            command = ".ghostclaw_runtime/a2a2a/commands/P208-opencode-operator-handoff.sh"
            p209_status = ".ghostclaw_runtime/a2a2a/status/P209-opencode-operator-handoff-status.json"
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {"total": 0, "would_dispatch": 0, "would_gate": 0, "observed": 0},
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            (root / prompt).parent.mkdir(parents=True, exist_ok=True)
            (root / prompt).write_text("OpenCode local-safe candidate prompt", encoding="utf-8")
            (root / command).parent.mkdir(parents=True, exist_ok=True)
            (root / command).write_text("#!/usr/bin/env bash\nset -euo pipefail\n", encoding="utf-8")
            write_json(root / candidate, {"status": "REVIEW_PASS_READY_FOR_EXACT_P167"})
            write_json(
                root / p209_status,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_operator_handoff_status.v1",
                    "packet_id": "A2A2A-P209-PACKET078-OPENCODE-OPERATOR-HANDOFF-STATUS-20260704",
                    "status": "ready_for_manual_paste_and_bounded_watch",
                    "prompt_path": prompt,
                    "command_path": command,
                    "clipboard_load_command": f"bash {command} --copy",
                    "watch_after_manual_paste_command": f"bash {command} --watch-after-paste",
                    "candidate_review_result_path": candidate,
                    "real_review_result_path": real_result,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "p193_guard_path": ".ghostclaw_runtime/a2a2a/commands/P193-candidate-copy-gate.sh",
                    "issues": [],
                    "next_action": "manual_paste_p195_then_run_p207_watch",
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--packet078-opencode-operator-status-brief",
                    "--packet078-opencode-operator-handoff-status-output",
                    p209_status,
                    "--packet078-opencode-candidate-paste-prompt-output",
                    prompt,
                    "--packet078-opencode-operator-handoff-command-output",
                    command,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "candidate_arrived_run_reconcile")
            self.assertEqual(payload["source_status"], "stale_candidate_already_arrived")
            self.assertIn("Do not paste P195 again", payload["telegram_safe_draft"])
            self.assertNotIn("--copy", " ".join(payload["commands_to_run"]))
            self.assertTrue(payload["current_state"]["candidate_review_result_exists"])

    def test_packet078_candidate_arrival_watch_waits_without_refresh_when_candidate_absent(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            target_queue = "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json"
            p206_output = ".ghostclaw_runtime/a2a2a/status/P206-reconcile.json"
            watch_output = ".ghostclaw_runtime/a2a2a/status/P207-candidate-arrival-watch.json"
            watch_receipt = ".ghostclaw_runtime/a2a2a/receipts/P207-candidate-arrival-watch.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {"total": 0, "would_dispatch": 0, "would_gate": 0, "observed": 0},
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--write",
                    "--packet078-candidate-arrival-watch",
                    "--packet078-candidate-watch-attempts",
                    "1",
                    "--packet078-candidate-watch-interval",
                    "0",
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-post-candidate-reconcile-output",
                    p206_output,
                    "--packet078-candidate-arrival-watch-output",
                    watch_output,
                    "--packet078-candidate-arrival-watch-receipt-output",
                    watch_receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.packet078_candidate_arrival_watch.v1")
            self.assertEqual(payload["status"], "waiting_for_opencode_candidate")
            self.assertEqual(payload["attempts_used"], 1)
            self.assertFalse(payload["candidate_review_result_exists"])
            self.assertFalse(payload["reconcile_bundle_refreshed"])
            self.assertEqual(payload["recommended_next_action"], "paste_p195_prompt_into_opencode")
            self.assertTrue((root / watch_output).is_file())
            self.assertTrue((root / watch_receipt).is_file())
            self.assertFalse((root / p206_output).exists())
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / target_queue).exists())
            self.assertFalse(payload["external_actions_performed"]["real_review_result_write"])
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])

    def test_packet078_candidate_arrival_watch_refreshes_p206_after_candidate_arrives(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            readiness = ".ghostclaw_runtime/a2a2a/status/P200-handoff-readiness.json"
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            target_queue = "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json"
            p193_guard = ".ghostclaw_runtime/a2a2a/commands/P193-candidate-copy-gate.sh"
            p206_output = ".ghostclaw_runtime/a2a2a/status/P206-reconcile.json"
            p206_receipt = ".ghostclaw_runtime/a2a2a/receipts/P206-reconcile.json"
            compact = ".ghostclaw_runtime/a2a2a/status/current-compact.json"
            freshness = ".ghostclaw_runtime/a2a2a/status/P205-freshness.json"
            watch_output = ".ghostclaw_runtime/a2a2a/status/P207-candidate-arrival-watch.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {"total": 0, "would_dispatch": 0, "would_gate": 0, "observed": 0},
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / readiness,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_handoff_readiness.v1",
                    "status": "candidate_present_run_p185",
                },
            )
            write_json(
                root / candidate,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_review_candidate_result.v1",
                    "packet_id": "A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-20260704",
                    "status": "REVIEW_PASS_READY_FOR_EXACT_P167",
                    "review_worker": "OpenCode_Reviewer",
                    "mutation_allowed": False,
                    "target_queue_path_exists": False,
                    "blocking_issues": [],
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
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--write",
                    "--packet078-candidate-arrival-watch",
                    "--packet078-candidate-watch-attempts",
                    "1",
                    "--packet078-candidate-watch-interval",
                    "0",
                    "--packet078-opencode-handoff-readiness-output",
                    readiness,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-candidate-copy-command-output",
                    p193_guard,
                    "--compact-output",
                    compact,
                    "--compact-freshness-output",
                    freshness,
                    "--packet078-post-candidate-reconcile-output",
                    p206_output,
                    "--packet078-post-candidate-reconcile-receipt-output",
                    p206_receipt,
                    "--packet078-candidate-arrival-watch-output",
                    watch_output,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            reconcile = json.loads((root / p206_output).read_text(encoding="utf-8"))
            fresh = json.loads((root / freshness).read_text(encoding="utf-8"))
            self.assertEqual(payload["status"], "candidate_arrived_reconcile_ready_for_exact_p193_gate")
            self.assertTrue(payload["candidate_review_result_exists"])
            self.assertTrue(payload["reconcile_bundle_refreshed"])
            self.assertEqual(payload["reconcile_bundle_status"], "ready_for_exact_p193_candidate_copy_gate")
            self.assertEqual(payload["recommended_next_action"], "request_exact_p193_candidate_copy_gate")
            self.assertEqual(reconcile["status"], "ready_for_exact_p193_candidate_copy_gate")
            self.assertEqual(fresh["status"], "fresh_ready_for_exact_p193_candidate_copy_gate")
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / target_queue).exists())
            self.assertFalse((root / p193_guard).exists())
            self.assertFalse(payload["external_actions_performed"]["real_review_result_write"])
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse(payload["external_actions_performed"]["guard_script_write"])

    def test_packet078_opencode_watch_stall_status_stops_after_exhausted_watch(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            watch = ".ghostclaw_runtime/a2a2a/status/P207-candidate-arrival-watch.json"
            brief = ".ghostclaw_runtime/a2a2a/status/P210-opencode-operator-status-brief.json"
            output = ".ghostclaw_runtime/a2a2a/status/P213-watch-stall-status.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P213-watch-stall-status.json"
            write_json(
                root / watch,
                {
                    "schema": "ghostclaw.a2a2a.packet078_candidate_arrival_watch.v1",
                    "packet_id": "A2A2A-P207-PACKET078-CANDIDATE-ARRIVAL-WATCH-20260704",
                    "status": "waiting_for_opencode_candidate",
                    "attempts_used": 3,
                    "attempts_configured": 3,
                    "candidate_review_result_path": candidate,
                    "candidate_review_result_exists": False,
                    "real_review_result_path": real_result,
                    "real_review_result_path_exists": False,
                    "target_queue_path_exists": False,
                    "p193_guard_exists": False,
                },
            )
            write_json(
                root / brief,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_operator_status_brief.v1",
                    "packet_id": "A2A2A-P210-PACKET078-OPENCODE-OPERATOR-STATUS-BRIEF-20260704",
                    "status": "ready_for_operator_manual_paste",
                    "commands_to_run": ["bash .ghostclaw_runtime/a2a2a/commands/P208.sh --copy"],
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-opencode-watch-stall-status",
                    "--packet078-candidate-arrival-watch-output",
                    watch,
                    "--packet078-opencode-operator-status-brief-output",
                    brief,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-opencode-watch-stall-status-output",
                    output,
                    "--packet078-opencode-watch-stall-status-receipt-output",
                    receipt,
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.packet078_opencode_watch_stall_status.v1")
            self.assertEqual(payload["status"], "manual_opencode_candidate_required_stop_local_retry")
            self.assertEqual(payload["next_action"], "manual_paste_p195_before_rerun_watch")
            self.assertTrue(payload["watch_attempts_exhausted"])
            self.assertFalse(payload["candidate_review_result_exists"])
            self.assertIn("Do not rerun P207 blindly", payload["operator_warning"])
            self.assertFalse(payload["external_actions_performed"]["provider_call"])
            self.assertFalse((root / candidate).exists())
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())

    def test_packet078_opencode_watch_stall_status_routes_candidate_to_reconcile(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            watch = ".ghostclaw_runtime/a2a2a/status/P207-candidate-arrival-watch.json"
            brief = ".ghostclaw_runtime/a2a2a/status/P210-opencode-operator-status-brief.json"
            write_json(
                root / candidate,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_review_candidate_result.v1",
                    "status": "REVIEW_PASS_READY_FOR_EXACT_P167",
                    "external_actions_performed": {
                        "candidate_review_result_write": False,
                        "real_review_result_write": False,
                        "queue_file_write": False,
                        "provider_call": False,
                    },
                },
            )
            write_json(
                root / watch,
                {
                    "schema": "ghostclaw.a2a2a.packet078_candidate_arrival_watch.v1",
                    "status": "candidate_arrived_reconcile_ready_for_exact_p193_gate",
                    "attempts_used": 1,
                    "attempts_configured": 3,
                    "candidate_review_result_path": candidate,
                    "candidate_review_result_exists": True,
                },
            )
            write_json(
                root / brief,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_operator_status_brief.v1",
                    "status": "candidate_arrived_run_reconcile",
                    "commands_to_run": ["bash .ghostclaw_runtime/a2a2a/commands/P208.sh --watch-after-paste"],
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-opencode-watch-stall-status",
                    "--packet078-candidate-arrival-watch-output",
                    watch,
                    "--packet078-opencode-operator-status-brief-output",
                    brief,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "candidate_arrived_run_reconcile")
            self.assertEqual(payload["next_action"], "run_p206_reconcile_or_p207_watch")
            self.assertFalse(payload["watch_attempts_exhausted"])
            self.assertTrue(payload["candidate_review_result_exists"])
            self.assertNotIn("pbcopy", " ".join(payload["commands_to_run"]))
            self.assertFalse(payload["external_actions_performed"]["provider_call"])

    def test_packet078_opencode_manual_paste_pending_status_uses_clipboard_receipt(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            p220_status = ".ghostclaw_runtime/a2a2a/status/P220-clipboard-load-status.json"
            p210_brief = ".ghostclaw_runtime/a2a2a/status/P210-opencode-operator-status-brief.json"
            output = ".ghostclaw_runtime/a2a2a/status/P221-manual-paste-pending.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P221-manual-paste-pending.json"
            write_json(
                root / p220_status,
                {
                    "schema": "ghostclaw.a2a2a.packet078_p195_clipboard_load_status.v1",
                    "packet_id": "A2A2A-P220-PACKET078-P195-CLIPBOARD-LOAD-STATUS-20260704",
                    "status": "copied_to_local_clipboard_operator_must_paste_manually",
                    "prompt_sha256": "abc123",
                    "external_actions_performed": {
                        "local_clipboard_write": True,
                        "opencode_paste": False,
                        "provider_call": False,
                    },
                },
            )
            write_json(
                root / p210_brief,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_operator_status_brief.v1",
                    "packet_id": "A2A2A-P210-PACKET078-OPENCODE-OPERATOR-STATUS-BRIEF-20260704",
                    "status": "ready_for_operator_manual_paste",
                    "commands_to_run": [
                        "bash .ghostclaw_runtime/a2a2a/commands/P208.sh --copy-with-receipt",
                        "bash .ghostclaw_runtime/a2a2a/commands/P208.sh --watch-after-paste",
                    ],
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-opencode-manual-paste-pending-status",
                    "--packet078-opencode-clipboard-load-status-output",
                    p220_status,
                    "--packet078-opencode-operator-status-brief-output",
                    p210_brief,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-opencode-manual-paste-pending-status-output",
                    output,
                    "--packet078-opencode-manual-paste-pending-status-receipt-output",
                    receipt,
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.packet078_opencode_manual_paste_pending_status.v1")
            self.assertEqual(payload["status"], "manual_paste_pending_after_receipted_clipboard_load")
            self.assertEqual(payload["next_action"], "paste_clipboard_into_opencode")
            self.assertEqual(payload["commands_to_run"], ["manual_paste_clipboard_into_opencode"])
            self.assertEqual(
                payload["post_manual_paste_command"],
                "bash .ghostclaw_runtime/a2a2a/commands/P208.sh --watch-after-paste",
            )
            self.assertFalse(payload["candidate_review_result_exists"])
            self.assertFalse(payload["external_actions_performed"]["opencode_paste"])
            self.assertFalse(payload["external_actions_performed"]["provider_call"])
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())

    def test_packet078_clipboard_freshness_guard_accepts_fresh_receipt_without_reading_clipboard(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            prompt = ".ghostclaw_runtime/a2a2a/reviews/P195-paste-prompt.txt"
            p220_status = ".ghostclaw_runtime/a2a2a/status/P220-clipboard-load-status.json"
            p220_receipt = ".ghostclaw_runtime/a2a2a/receipts/P220-clipboard-load-receipt.json"
            p223_card = ".ghostclaw_runtime/a2a2a/status/P223-action-card.json"
            p225_status = ".ghostclaw_runtime/a2a2a/status/P225-post-p185-status.json"
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            output = ".ghostclaw_runtime/a2a2a/status/P227-clipboard-freshness-guard.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P227-clipboard-freshness-guard.json"
            prompt_path = root / prompt
            prompt_path.parent.mkdir(parents=True, exist_ok=True)
            prompt_path.write_text("OpenCode bounded candidate prompt\n", encoding="utf-8")
            prompt_hash = sha256_file(prompt_path)
            write_json(
                root / p220_status,
                {
                    "schema": "ghostclaw.a2a2a.packet078_p195_clipboard_load_status.v1",
                    "packet_id": "A2A2A-P220-PACKET078-P195-CLIPBOARD-LOAD-STATUS-20260704",
                    "status": "copied_to_local_clipboard_operator_must_paste_manually",
                    "prompt_path": prompt,
                    "prompt_sha256": prompt_hash,
                    "external_actions_performed": {
                        "local_clipboard_write": True,
                        "opencode_paste": False,
                        "provider_call": False,
                    },
                },
            )
            write_json(
                root / p220_receipt,
                {
                    "schema": "ghostclaw.a2a2a.packet078_p195_clipboard_load_receipt.v1",
                    "packet_id": "A2A2A-P220-PACKET078-P195-CLIPBOARD-LOAD-RECEIPT-20260704",
                    "status": "recorded_local_clipboard_load",
                    "prompt_path": prompt,
                    "prompt_sha256": prompt_hash,
                },
            )
            write_json(
                root / p223_card,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_manual_paste_action_card.v1",
                    "status": "ready_for_operator_manual_opencode_paste",
                    "next_action": "paste_clipboard_into_opencode",
                },
            )
            write_json(
                root / p225_status,
                {
                    "schema": "ghostclaw.a2a2a.packet078_post_p185_accelerator_status.v1",
                    "status": "waiting_for_manual_opencode_paste",
                    "next_action": "paste_clipboard_into_opencode",
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-clipboard-freshness-guard",
                    "--packet078-opencode-candidate-paste-prompt-output",
                    prompt,
                    "--packet078-opencode-clipboard-load-status-output",
                    p220_status,
                    "--packet078-opencode-clipboard-load-receipt-output",
                    p220_receipt,
                    "--packet078-opencode-manual-paste-action-card-output",
                    p223_card,
                    "--packet078-post-p185-accelerator-status-output",
                    p225_status,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-clipboard-freshness-max-age-seconds",
                    "3600",
                    "--packet078-clipboard-freshness-guard-output",
                    output,
                    "--packet078-clipboard-freshness-guard-receipt-output",
                    receipt,
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.packet078_clipboard_freshness_guard.v1")
            self.assertEqual(payload["status"], "clipboard_receipt_fresh_manual_paste_ready")
            self.assertEqual(payload["next_action"], "paste_clipboard_into_opencode")
            self.assertTrue(payload["prompt_sha256_matches_p220"])
            self.assertFalse(payload["clipboard_read_performed"])
            self.assertFalse(payload["external_actions_performed"]["opencode_paste"])
            self.assertFalse(payload["external_actions_performed"]["provider_call"])
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())

    def test_packet078_clipboard_freshness_guard_marks_stale_receipt_for_refresh(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            prompt = ".ghostclaw_runtime/a2a2a/reviews/P195-paste-prompt.txt"
            p220_status = ".ghostclaw_runtime/a2a2a/status/P220-clipboard-load-status.json"
            p220_receipt = ".ghostclaw_runtime/a2a2a/receipts/P220-clipboard-load-receipt.json"
            p223_card = ".ghostclaw_runtime/a2a2a/status/P223-action-card.json"
            p225_status = ".ghostclaw_runtime/a2a2a/status/P225-post-p185-status.json"
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            prompt_path = root / prompt
            prompt_path.parent.mkdir(parents=True, exist_ok=True)
            prompt_path.write_text("OpenCode bounded candidate prompt\n", encoding="utf-8")
            prompt_hash = sha256_file(prompt_path)
            write_json(
                root / p220_status,
                {
                    "schema": "ghostclaw.a2a2a.packet078_p195_clipboard_load_status.v1",
                    "status": "copied_to_local_clipboard_operator_must_paste_manually",
                    "prompt_path": prompt,
                    "prompt_sha256": prompt_hash,
                    "external_actions_performed": {
                        "local_clipboard_write": True,
                        "opencode_paste": False,
                        "provider_call": False,
                    },
                },
            )
            write_json(
                root / p220_receipt,
                {
                    "schema": "ghostclaw.a2a2a.packet078_p195_clipboard_load_receipt.v1",
                    "status": "recorded_local_clipboard_load",
                    "prompt_path": prompt,
                    "prompt_sha256": prompt_hash,
                },
            )
            write_json(root / p223_card, {"schema": "ghostclaw.a2a2a.packet078_opencode_manual_paste_action_card.v1"})
            write_json(root / p225_status, {"schema": "ghostclaw.a2a2a.packet078_post_p185_accelerator_status.v1"})
            old_time = time.time() - 7200
            os.utime(root / p220_status, (old_time, old_time))
            os.utime(root / p220_receipt, (old_time, old_time))

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-clipboard-freshness-guard",
                    "--packet078-opencode-candidate-paste-prompt-output",
                    prompt,
                    "--packet078-opencode-clipboard-load-status-output",
                    p220_status,
                    "--packet078-opencode-clipboard-load-receipt-output",
                    p220_receipt,
                    "--packet078-opencode-manual-paste-action-card-output",
                    p223_card,
                    "--packet078-post-p185-accelerator-status-output",
                    p225_status,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-clipboard-freshness-max-age-seconds",
                    "60",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "clipboard_receipt_stale_refresh_before_paste")
            self.assertEqual(payload["next_action"], "rerun_p208_copy_with_receipt_before_paste")
            self.assertTrue(payload["clipboard_receipt_age_seconds"] >= 60)
            self.assertFalse(payload["clipboard_read_performed"])
            self.assertFalse(payload["external_actions_performed"]["opencode_paste"])

    def test_handoff_capsule_preserves_current_exact_gate_without_execution(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(
                root / "_A2A_QUEUE" / "outbox" / "packet_074_sirinx.json",
                {
                    "id": "packet_074",
                    "title": "sirinx.co and AGM AutoFlow active focus local queue replenish",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                },
            )
            write_json(
                root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
                {
                    "schema": "ghostclaw.a2a2a.current_next_gate.v1",
                    "current_next_gate": {
                        "exact_phrase": "APPROVE_A2A2A_P107_PACKET074_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
                        "allowed_scope": "write local Hermes/KOB worker-envelope JSON for packet_074 only",
                        "blocked_scope": ["worker execution", "provider/model call", "push", "deploy"],
                    },
                    "current_orchestrator": {
                        "selected_packet": "packet_074",
                        "selected_packet_path": "_A2A_QUEUE/outbox/packet_074_sirinx.json",
                    },
                    "command_preview": {
                        "safety_check_without_approval": "python3 scripts/ghostclaw_a2a_local_dispatch_execute.py --gate gate.json",
                        "dry_run_after_gate": "python3 scripts/ghostclaw_a2a_local_dispatch_execute.py --gate gate.json --approval APPROVE_A2A2A_P107_PACKET074_LOCAL_WORKER_ENVELOPE_WRITE_ONLY --dry-run",
                        "write_after_gate": "python3 scripts/ghostclaw_a2a_local_dispatch_execute.py --gate gate.json --approval APPROVE_A2A2A_P107_PACKET074_LOCAL_WORKER_ENVELOPE_WRITE_ONLY --execute --write",
                    },
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--handoff-capsule"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.sidebar_handoff_capsule.v1")
            self.assertEqual(payload["current_state"]["selected_packet"], "packet_074")
            self.assertEqual(
                payload["next_exact_gate"]["phrase"],
                "APPROVE_A2A2A_P107_PACKET074_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
            )
            self.assertIn("worker execution", payload["next_exact_gate"]["does_not_allow"])
            self.assertEqual(payload["gate_readiness"]["status"], "ready_for_exact_gate")
            self.assertEqual(payload["gate_readiness"]["issues"], [])
            self.assertFalse(payload["external_actions_performed"]["worker_envelope_write"])
            self.assertFalse(payload["external_actions_performed"]["telegram_live_send"])
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox").exists())

    def test_operator_action_card_accepts_packet076_checksum_guard_preview(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P136_PACKET076_LOCAL_WORKER_ENVELOPE_WRITE_ONLY"
            command = (
                ".ghostclaw_runtime/a2a2a/commands/"
                "A2A2A-P136-PACKET076-WORKER-ENVELOPE-WRITE-GUARD-20260704.sh"
            )
            write_json(
                root / "_A2A_QUEUE" / "outbox" / "packet_076_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_076",
                    "title": "sirinx.co and AGM AutoFlow next local task card",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                },
            )
            write_json(
                root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
                {
                    "schema": "ghostclaw.a2a2a.current_next_gate.v1",
                    "current_next_gate": {
                        "exact_phrase": exact_gate,
                        "allowed_scope": "write local Hermes/KOB worker-envelope JSON for packet_076 only",
                        "blocked_scope": ["worker execution", "provider/model call", "push", "deploy"],
                    },
                    "current_orchestrator": {
                        "selected_packet": "packet_076",
                        "selected_packet_path": "_A2A_QUEUE/outbox/packet_076_sirinx_agm_next_local_task_card.json",
                    },
                    "command_preview": {
                        "safety_check_without_approval": (
                            "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet076-worker-envelope-gate"
                        ),
                        "dry_run_after_gate": f"bash {command} WRONG_APPROVAL",
                        "write_after_gate": f"bash {command} {exact_gate}",
                    },
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--operator-action-card"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_exact_gate")
            self.assertEqual(payload["gate_readiness_issues"], [])
            self.assertEqual(payload["action_after_exact_gate"]["command"], f"bash {command} {exact_gate}")
            self.assertEqual(payload["action_after_exact_gate"]["requires_exact_gate_phrase"], exact_gate)
            self.assertFalse(payload["external_actions_performed"]["worker_envelope_write"])
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox/hermes").exists())

    def test_operator_action_card_accepts_packet077_checksum_guard_preview(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P156_PACKET077_LOCAL_WORKER_ENVELOPE_WRITE_ONLY"
            command = (
                ".ghostclaw_runtime/a2a2a/commands/"
                "A2A2A-P156-PACKET077-WORKER-ENVELOPE-WRITE-GUARD-20260704.sh"
            )
            write_json(
                root / "_A2A_QUEUE" / "outbox" / "packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow next local task card",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                },
            )
            write_json(
                root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
                {
                    "schema": "ghostclaw.a2a2a.current_next_gate.v1",
                    "current_next_gate": {
                        "exact_phrase": exact_gate,
                        "allowed_scope": "write local Hermes/KOB worker-envelope JSON for packet_077 only",
                        "blocked_scope": ["worker execution", "provider/model call", "push", "deploy"],
                    },
                    "current_orchestrator": {
                        "selected_packet": "packet_077",
                        "selected_packet_path": "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                    },
                    "command_preview": {
                        "safety_check_without_approval": (
                            "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet077-worker-envelope-gate"
                        ),
                        "dry_run_after_gate": f"bash {command} WRONG_APPROVAL",
                        "write_after_gate": f"bash {command} {exact_gate}",
                    },
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--operator-action-card"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_exact_gate")
            self.assertEqual(payload["gate_readiness_issues"], [])
            self.assertEqual(payload["action_after_exact_gate"]["command"], f"bash {command} {exact_gate}")
            self.assertEqual(payload["action_after_exact_gate"]["requires_exact_gate_phrase"], exact_gate)
            self.assertFalse(payload["external_actions_performed"]["worker_envelope_write"])
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox/hermes").exists())

    def test_operator_action_card_blocks_packet076_guard_dry_run_with_exact_gate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P136_PACKET076_LOCAL_WORKER_ENVELOPE_WRITE_ONLY"
            command = (
                ".ghostclaw_runtime/a2a2a/commands/"
                "A2A2A-P136-PACKET076-WORKER-ENVELOPE-WRITE-GUARD-20260704.sh"
            )
            write_json(
                root / "_A2A_QUEUE" / "outbox" / "packet_076_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_076",
                    "title": "sirinx.co and AGM AutoFlow next local task card",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                },
            )
            write_json(
                root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
                {
                    "schema": "ghostclaw.a2a2a.current_next_gate.v1",
                    "current_next_gate": {
                        "exact_phrase": exact_gate,
                        "allowed_scope": "write local Hermes/KOB worker-envelope JSON for packet_076 only",
                        "blocked_scope": ["worker execution", "provider/model call", "push", "deploy"],
                    },
                    "current_orchestrator": {
                        "selected_packet": "packet_076",
                        "selected_packet_path": "_A2A_QUEUE/outbox/packet_076_sirinx_agm_next_local_task_card.json",
                    },
                    "command_preview": {
                        "safety_check_without_approval": (
                            "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet076-worker-envelope-gate"
                        ),
                        "dry_run_after_gate": f"bash {command} {exact_gate}",
                        "write_after_gate": f"bash {command} {exact_gate}",
                    },
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--operator-action-card"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "blocked_by_gate_readiness")
            self.assertIn("dry_run_command_missing_wrong_approval_smoke", payload["gate_readiness_issues"])
            self.assertIn("dry_run_command_must_not_use_exact_gate", payload["gate_readiness_issues"])
            self.assertIsNone(payload["action_after_exact_gate"]["command"])

    def test_handoff_capsule_blocks_unsafe_command_preview(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(
                root / "_A2A_QUEUE" / "outbox" / "packet_074_sirinx.json",
                {
                    "id": "packet_074",
                    "title": "sirinx.co and AGM AutoFlow active focus local queue replenish",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                },
            )
            write_json(
                root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
                {
                    "schema": "ghostclaw.a2a2a.current_next_gate.v1",
                    "current_next_gate": {
                        "exact_phrase": "APPROVE_A2A2A_P107_PACKET074_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
                        "allowed_scope": "write local Hermes/KOB worker-envelope JSON for packet_074 only",
                        "blocked_scope": ["worker execution", "provider/model call", "push", "deploy"],
                    },
                    "current_orchestrator": {
                        "selected_packet": "packet_074",
                        "selected_packet_path": "_A2A_QUEUE/outbox/packet_074_sirinx.json",
                    },
                    "command_preview": {
                        "safety_check_without_approval": "python3 scripts/ghostclaw_a2a_local_dispatch_execute.py --gate gate.json",
                        "dry_run_after_gate": "python3 scripts/ghostclaw_a2a_local_dispatch_execute.py --gate gate.json --approval APPROVE_A2A2A_P107_PACKET074_LOCAL_WORKER_ENVELOPE_WRITE_ONLY --dry-run",
                        "write_after_gate": "git push origin main",
                    },
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--handoff-capsule"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["gate_readiness"]["status"], "not_ready")
            self.assertIn(
                "command_preview_not_local_dispatch:write_after_gate",
                payload["gate_readiness"]["issues"],
            )
            self.assertIn(
                "command_preview_unsafe_token:write_after_gate:git push",
                payload["gate_readiness"]["issues"],
            )

    def test_handoff_capsule_reports_existing_packet_envelope_as_not_ready(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(
                root / "_A2A_QUEUE" / "outbox" / "packet_074_sirinx.json",
                {
                    "id": "packet_074",
                    "title": "sirinx.co and AGM AutoFlow active focus local queue replenish",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                },
            )
            write_json(
                root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
                {
                    "schema": "ghostclaw.a2a2a.current_next_gate.v1",
                    "current_next_gate": {
                        "exact_phrase": "APPROVE_A2A2A_P107_PACKET074_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
                        "allowed_scope": "write local Hermes/KOB worker-envelope JSON for packet_074 only",
                        "blocked_scope": ["worker execution", "provider/model call", "push", "deploy"],
                    },
                    "current_orchestrator": {
                        "selected_packet": "packet_074",
                        "selected_packet_path": "_A2A_QUEUE/outbox/packet_074_sirinx.json",
                    },
                    "command_preview": {
                        "safety_check_without_approval": "python3 scripts/ghostclaw_a2a_local_dispatch_execute.py --gate gate.json",
                        "dry_run_after_gate": "python3 scripts/ghostclaw_a2a_local_dispatch_execute.py --gate gate.json --approval APPROVE_A2A2A_P107_PACKET074_LOCAL_WORKER_ENVELOPE_WRITE_ONLY --dry-run",
                        "write_after_gate": "python3 scripts/ghostclaw_a2a_local_dispatch_execute.py --gate gate.json --approval APPROVE_A2A2A_P107_PACKET074_LOCAL_WORKER_ENVELOPE_WRITE_ONLY --execute --write",
                    },
                },
            )
            write_json(
                root / ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_074_hermes_20260703T000000_000000Z.json",
                {"schema": "ghostclaw.a2a2a.task.v1", "id": "existing_packet_074_hermes"},
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--handoff-capsule"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["gate_readiness"]["status"], "not_ready")
            self.assertIn("worker_envelope_already_written_for_selected_packet", payload["gate_readiness"]["issues"])
            self.assertEqual(
                payload["gate_readiness"]["worker_envelopes_present"],
                [".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_074_hermes_20260703T000000_000000Z.json"],
            )

    def test_write_handoff_capsule_writes_only_local_status_and_receipts(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(
                root / "_A2A_QUEUE" / "inbox" / "packet_agm.json",
                {
                    "id": "packet_agm",
                    "title": "AGM AutoFlow active focus packet",
                    "agent": "codex",
                    "risk": "safe",
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--handoff-capsule", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            capsule = root / ".ghostclaw_runtime/a2a2a/status/sidebar_handoff_capsule.json"
            evidence = root / ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P077-AGENT-ORCHESTRATOR-ACCELERATION-IMPLEMENTATION-20260703.json"
            receipt = root / ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P077-AGENT-ORCHESTRATOR-ACCELERATION-IMPLEMENTATION-20260703.json"
            self.assertEqual(payload["handoff_path"], str(capsule.relative_to(root)))
            self.assertTrue(capsule.is_file())
            self.assertTrue(evidence.is_file())
            self.assertTrue(receipt.is_file())
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox").exists())

    def test_operator_action_card_ready_uses_write_after_gate_only_after_exact_gate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_ready_packet074_gate(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--operator-action-card"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.operator_action_card.v1")
            self.assertEqual(payload["status"], "ready_for_exact_gate")
            self.assertEqual(payload["selected_packet"], "packet_074")
            self.assertEqual(payload["selected_packet_sequence"], "074")
            self.assertEqual(
                payload["exact_gate_phrase"],
                "APPROVE_A2A2A_P107_PACKET074_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
            )
            self.assertEqual(payload["action_after_exact_gate"]["kind"], "write_local_worker_envelopes_only")
            self.assertIn(
                "APPROVE_A2A2A_P107_PACKET074_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
                payload["action_after_exact_gate"]["command"],
            )
            self.assertTrue(payload["action_after_exact_gate"]["allowed_only_after_exact_gate"])
            self.assertFalse(payload["external_actions_performed"]["telegram_live_send"])
            self.assertFalse(payload["external_actions_performed"]["provider_call"])
            self.assertIn("missing exact gate", payload["stop_conditions"])
            self.assertTrue(any("*packet_074*" in command for command in payload["validation_commands"]))

    def test_operator_action_card_blocks_when_gate_readiness_not_ready(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_ready_packet074_gate(root, write_after_gate="git push origin main")

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--operator-action-card"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "blocked_by_gate_readiness")
            self.assertIsNone(payload["action_after_exact_gate"]["command"])
            self.assertIn(
                "command_preview_unsafe_token:write_after_gate:git push",
                payload["gate_readiness_issues"],
            )
            self.assertEqual(
                payload["next_safe_action"],
                "Resolve gate readiness issues before any local worker-envelope write.",
            )

    def test_operator_action_card_supports_queue_replenish_gate_without_execution(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P129_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY"
            target = "_A2A_QUEUE/outbox/packet_076_sirinx_agm_next_local_task_card.json"
            write_json(
                root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
                {
                    "schema": "ghostclaw.a2a2a.current_next_gate.v1",
                    "status": "waiting_for_exact_queue_replenish_gate",
                    "current_next_gate": {
                        "status": "suggested_next_gate_not_executed",
                        "exact_phrase": exact_gate,
                        "allowed_scope": "write one new local active-focus A2A2A queue packet for sirinx.co or AGM AutoFlow only",
                        "blocked_scope": [
                            "execute queue payload",
                            "start/restart worker loop",
                            "provider/model call",
                            "push",
                            "deploy",
                        ],
                    },
                    "current_orchestrator": {
                        "status": "queue_drained_no_actionable_packet",
                        "lane_status": "waiting_for_active_focus_queue_replenish_gate",
                    },
                    "selected_packet_path": target,
                    "next_safe_action": (
                        "Provide APPROVE_A2A2A_P129_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY "
                        "only if a new local queue packet should be written."
                    ),
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--operator-action-card"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_exact_gate")
            self.assertEqual(payload["exact_gate_phrase"], exact_gate)
            self.assertEqual(payload["selected_packet_path"], target)
            self.assertEqual(payload["selected_packet_sequence"], "076")
            self.assertEqual(payload["action_after_exact_gate"]["kind"], "write_one_local_active_focus_queue_packet")
            self.assertEqual(payload["action_after_exact_gate"]["target_queue_path"], target)
            self.assertFalse(payload["action_after_exact_gate"]["would_execute"])
            self.assertTrue(payload["action_after_exact_gate"]["requires_separate_dispatch_command"])
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse(payload["external_actions_performed"]["queue_payload_execution"])
            self.assertFalse((root / target).exists())
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox").exists())
            self.assertEqual(list((root / ".ghostclaw_runtime/a2a2a/receipts").glob("*.json")), [])

    def test_queue_replenish_guard_write_creates_preview_and_command_without_target_queue_write(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P129_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY"
            target = "_A2A_QUEUE/outbox/packet_076_sirinx_agm_next_local_task_card.json"
            preview = ".ghostclaw_runtime/a2a2a/evidence/P131-preview.json"
            command = ".ghostclaw_runtime/a2a2a/commands/P131-guard.sh"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P131-receipt.json"
            write_json(
                root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
                {
                    "schema": "ghostclaw.a2a2a.current_next_gate.v1",
                    "status": "waiting_for_exact_queue_replenish_gate",
                    "current_next_gate": {
                        "status": "suggested_next_gate_not_executed",
                        "exact_phrase": exact_gate,
                        "allowed_scope": "write one new local active-focus A2A2A queue packet for sirinx.co or AGM AutoFlow only",
                        "blocked_scope": ["execute queue payload", "provider/model call", "push", "deploy"],
                    },
                    "current_orchestrator": {"status": "queue_drained_no_actionable_packet"},
                    "selected_packet_path": target,
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--queue-replenish-guard",
                    "--write",
                    "--queue-replenish-preview-output",
                    preview,
                    "--queue-replenish-command-output",
                    command,
                    "--queue-replenish-receipt-output",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_exact_gate")
            self.assertEqual(payload["exact_gate_phrase"], exact_gate)
            self.assertEqual(payload["target_queue_path"], target)
            self.assertEqual(payload["preview_path"], preview)
            self.assertEqual(payload["command_path"], command)
            self.assertEqual(payload["receipt_path"], receipt)
            self.assertNotIn("guard_script", payload)
            self.assertTrue((root / preview).is_file())
            self.assertTrue((root / command).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertFalse((root / target).exists())
            preview_payload = json.loads((root / preview).read_text(encoding="utf-8"))
            receipt_payload = json.loads((root / receipt).read_text(encoding="utf-8"))
            command_text = (root / command).read_text(encoding="utf-8")
            self.assertEqual(preview_payload["id"], "packet_076")
            self.assertEqual(preview_payload["write_gate_consumed"], exact_gate)
            self.assertEqual(receipt_payload["guard_status"], "ready_for_exact_gate")
            self.assertEqual(receipt_payload["target_queue_path"], target)
            self.assertIn(exact_gate, command_text)
            self.assertIn("refusing overwrite", command_text)
            self.assertFalse(receipt_payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse(receipt_payload["external_actions_performed"]["queue_payload_execution"])

    def test_queue_replenish_guard_blocks_when_target_queue_already_exists(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P129_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY"
            target = "_A2A_QUEUE/outbox/packet_076_sirinx_agm_next_local_task_card.json"
            write_json(root / target, {"id": "packet_076"})
            write_json(
                root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
                {
                    "schema": "ghostclaw.a2a2a.current_next_gate.v1",
                    "status": "waiting_for_exact_queue_replenish_gate",
                    "current_next_gate": {
                        "exact_phrase": exact_gate,
                        "allowed_scope": "write one new local active-focus A2A2A queue packet for sirinx.co or AGM AutoFlow only",
                    },
                    "selected_packet_path": target,
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--queue-replenish-guard"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "blocked_or_not_ready")
            self.assertIn("target_queue_path_already_exists", payload["issues"])
            self.assertIsNone(payload["command_after_exact_gate"])
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])

    def test_queue_replenish_guard_status_reports_ready_without_queue_write(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P129_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY"
            target = "_A2A_QUEUE/outbox/packet_076_sirinx_agm_next_local_task_card.json"
            preview = ".ghostclaw_runtime/a2a2a/evidence/P131-preview.json"
            command = ".ghostclaw_runtime/a2a2a/commands/P131-guard.sh"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P131-receipt.json"
            status_output = ".ghostclaw_runtime/a2a2a/status/P132-status.json"
            status_receipt = ".ghostclaw_runtime/a2a2a/receipts/P132-receipt.json"
            write_json(
                root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
                {
                    "schema": "ghostclaw.a2a2a.current_next_gate.v1",
                    "status": "waiting_for_exact_queue_replenish_gate",
                    "current_next_gate": {
                        "exact_phrase": exact_gate,
                        "allowed_scope": "write one new local active-focus A2A2A queue packet for sirinx.co or AGM AutoFlow only",
                        "blocked_scope": ["execute queue payload", "provider/model call", "push", "deploy"],
                    },
                    "selected_packet_path": target,
                },
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--queue-replenish-guard",
                    "--write",
                    "--queue-replenish-preview-output",
                    preview,
                    "--queue-replenish-command-output",
                    command,
                    "--queue-replenish-receipt-output",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--queue-replenish-guard-status",
                    "--write",
                    "--queue-replenish-preview-output",
                    preview,
                    "--queue-replenish-command-output",
                    command,
                    "--queue-replenish-receipt-output",
                    receipt,
                    "--queue-replenish-status-output",
                    status_output,
                    "--queue-replenish-status-receipt-output",
                    status_receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_exact_gate")
            self.assertEqual(payload["exact_gate_phrase"], exact_gate)
            self.assertEqual(payload["target_queue_path"], target)
            self.assertTrue(payload["target_queue_path_absent"])
            self.assertTrue(payload["checks"]["preview_checksum_matches_receipt"])
            self.assertTrue(payload["checks"]["exact_gate_matches_receipt"])
            self.assertTrue(payload["checks"]["exact_gate_matches_preview"])
            self.assertTrue(payload["checks"]["target_matches_receipt"])
            self.assertTrue(payload["checks"]["target_matches_preview"])
            self.assertTrue(payload["checks"]["command_contains_exact_gate"])
            self.assertTrue(payload["checks"]["command_contains_preview_sha256"])
            self.assertTrue(payload["checks"]["command_refuses_overwrite"])
            self.assertTrue(payload["checks"]["command_checks_sha256"])
            self.assertTrue(payload["checks"]["command_has_no_unsafe_tokens"])
            self.assertEqual(payload["issues"], [])
            self.assertEqual(payload["status_path"], status_output)
            self.assertEqual(payload["status_receipt_path"], status_receipt)
            self.assertTrue((root / status_output).is_file())
            self.assertTrue((root / status_receipt).is_file())
            self.assertFalse((root / target).exists())
            status_receipt_payload = json.loads((root / status_receipt).read_text(encoding="utf-8"))
            self.assertEqual(status_receipt_payload["guard_status"], "ready_for_exact_gate")
            self.assertFalse(status_receipt_payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse(status_receipt_payload["external_actions_performed"]["queue_payload_execution"])

    def test_queue_replenish_handoff_uses_dynamic_packet_label_for_packet077(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P143_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY"
            target = "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json"
            preview = ".ghostclaw_runtime/a2a2a/evidence/P143-preview.json"
            command = ".ghostclaw_runtime/a2a2a/commands/P143-guard.sh"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P143-receipt.json"
            write_json(
                root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
                {
                    "schema": "ghostclaw.a2a2a.current_next_gate.v1",
                    "status": "waiting_for_exact_queue_replenish_gate",
                    "current_next_gate": {
                        "exact_phrase": exact_gate,
                        "allowed_scope": "write one new local active-focus A2A2A queue packet for sirinx.co or AGM AutoFlow only",
                        "blocked_scope": ["execute queue payload", "provider/model call", "push", "deploy"],
                    },
                    "selected_packet_path": target,
                },
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--queue-replenish-guard",
                    "--write",
                    "--queue-replenish-preview-output",
                    preview,
                    "--queue-replenish-command-output",
                    command,
                    "--queue-replenish-receipt-output",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--queue-replenish-team-handoff",
                    "--queue-replenish-preview-output",
                    preview,
                    "--queue-replenish-command-output",
                    command,
                    "--queue-replenish-receipt-output",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(
                payload["packet_id"],
                "A2A2A-P145-PACKET077-TEAM-HANDOFF-BUNDLE-20260704",
            )
            self.assertEqual(payload["status"], "ready_for_exact_gate")
            self.assertEqual(payload["target_queue_path"], target)
            self.assertIn("packet_077", payload["lane_cards"]["Codex_Builder"]["status"])
            self.assertIn("packet_077", payload["lane_cards"]["Codex_Builder"]["next_action"])
            self.assertIn("packet_077", payload["next_safe_action"])
            self.assertIn("packet_077", payload["telegram_safe_draft"])
            self.assertNotIn("P129", payload["telegram_safe_draft"])
            self.assertNotIn("packet_076", payload["next_safe_action"])
            self.assertFalse((root / target).exists())

    def test_queue_replenish_handoff_moves_to_target_reconcile_when_packet077_exists(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet077_queue_replenish_current_gate(root)
            target = root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json"

            subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--queue-replenish-guard", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            command = (
                root
                / ".ghostclaw_runtime/a2a2a/commands/"
                / "A2A2A-P143-PACKET077-QUEUE-WRITE-CHECKSUM-GUARD-20260704.sh"
            )
            subprocess.run(
                [
                    "bash",
                    str(command),
                    "APPROVE_A2A2A_P143_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY",
                ],
                cwd=root,
                check=True,
                text=True,
                capture_output=True,
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--queue-replenish-team-handoff"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "queue_target_present_matches_preview")
            self.assertFalse(payload["target_queue_path_absent"])
            self.assertIn("target_reconcile", payload["next_safe_action"])
            self.assertNotIn("is absent", payload["telegram_safe_draft"])
            self.assertIn("already exists", payload["telegram_safe_draft"])
            self.assertEqual(payload["lane_cards"]["Hermes_Commander"]["status"], "target_reconcile_ready")
            self.assertEqual(payload["lane_cards"]["Codex_Builder"]["status"], "standby_for_separate_worker_envelope_gate")
            self.assertIn("verify_target_matches_preview", payload["lane_cards"]["Validator_Worker"]["allowed_now"])
            self.assertNotIn("verify_target_queue_absent", payload["lane_cards"]["Validator_Worker"]["allowed_now"])
            self.assertTrue(target.is_file())

    def test_queue_replenish_guard_status_uses_packet077_defaults_from_current_gate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet077_queue_replenish_current_gate(root)
            target = root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json"
            p143_preview = root / ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P143-PACKET077-QUEUE-REPLENISH-PREVIEW-20260704.json"
            p143_command = root / ".ghostclaw_runtime/a2a2a/commands/A2A2A-P143-PACKET077-QUEUE-WRITE-CHECKSUM-GUARD-20260704.sh"
            p143_receipt = root / ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P143-PACKET077-QUEUE-REPLENISH-GUARD-PREVIEW-20260704.json"
            p144_status = root / ".ghostclaw_runtime/a2a2a/status/A2A2A-P144-PACKET077-QUEUE-REPLENISH-GUARD-STATUS-20260704.json"
            legacy_preview = root / ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P131-P129-QUEUE-REPLENISH-PACKET-PREVIEW-20260704.json"

            subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--queue-replenish-guard", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--queue-replenish-guard-status", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(
                payload["packet_id"],
                "A2A2A-P144-PACKET077-QUEUE-REPLENISH-GUARD-STATUS-20260704",
            )
            self.assertEqual(payload["status"], "ready_for_exact_gate")
            self.assertEqual(payload["exact_gate_phrase"], "APPROVE_A2A2A_P143_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY")
            self.assertEqual(payload["target_queue_path"], "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json")
            self.assertEqual(payload["preview_path"], str(p143_preview.relative_to(root)))
            self.assertEqual(payload["command_path"], str(p143_command.relative_to(root)))
            self.assertEqual(payload["receipt_path"], str(p143_receipt.relative_to(root)))
            self.assertEqual(payload["status_path"], str(p144_status.relative_to(root)))
            self.assertEqual(
                json.loads(p143_receipt.read_text())["packet_id"],
                "A2A2A-P143-PACKET077-QUEUE-REPLENISH-PREVIEW-20260704",
            )
            self.assertEqual(
                json.loads(p144_status.read_text())["packet_id"],
                "A2A2A-P144-PACKET077-QUEUE-REPLENISH-GUARD-STATUS-20260704",
            )
            self.assertTrue(p143_preview.is_file())
            self.assertTrue(p143_command.is_file())
            self.assertTrue(p143_receipt.is_file())
            self.assertTrue(p144_status.is_file())
            self.assertFalse(legacy_preview.exists())
            self.assertFalse(target.exists())

    def test_queue_replenish_guard_status_blocks_when_target_queue_exists(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P129_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY"
            target = "_A2A_QUEUE/outbox/packet_076_sirinx_agm_next_local_task_card.json"
            preview = ".ghostclaw_runtime/a2a2a/evidence/P131-preview.json"
            command = ".ghostclaw_runtime/a2a2a/commands/P131-guard.sh"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P131-receipt.json"
            write_json(
                root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
                {
                    "schema": "ghostclaw.a2a2a.current_next_gate.v1",
                    "current_next_gate": {
                        "exact_phrase": exact_gate,
                        "allowed_scope": "write one new local active-focus A2A2A queue packet for sirinx.co or AGM AutoFlow only",
                    },
                    "selected_packet_path": target,
                },
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--queue-replenish-guard",
                    "--write",
                    "--queue-replenish-preview-output",
                    preview,
                    "--queue-replenish-command-output",
                    command,
                    "--queue-replenish-receipt-output",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            write_json(root / target, {"id": "packet_076"})

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--queue-replenish-guard-status",
                    "--queue-replenish-preview-output",
                    preview,
                    "--queue-replenish-command-output",
                    command,
                    "--queue-replenish-receipt-output",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "blocked_or_not_ready")
            self.assertFalse(payload["target_queue_path_absent"])
            self.assertIn("target_queue_path_already_exists", payload["issues"])
            self.assertIsNone(payload["command_after_exact_gate"])
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])

    def test_queue_replenish_team_handoff_writes_lane_cards_without_queue_write(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P129_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY"
            target = "_A2A_QUEUE/outbox/packet_076_sirinx_agm_next_local_task_card.json"
            preview = ".ghostclaw_runtime/a2a2a/evidence/P131-preview.json"
            command = ".ghostclaw_runtime/a2a2a/commands/P131-guard.sh"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P131-receipt.json"
            handoff = ".ghostclaw_runtime/a2a2a/status/P133-handoff.json"
            handoff_receipt = ".ghostclaw_runtime/a2a2a/receipts/P133-receipt.json"
            write_json(
                root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
                {
                    "schema": "ghostclaw.a2a2a.current_next_gate.v1",
                    "current_next_gate": {
                        "exact_phrase": exact_gate,
                        "allowed_scope": "write one new local active-focus A2A2A queue packet for sirinx.co or AGM AutoFlow only",
                    },
                    "selected_packet_path": target,
                },
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--queue-replenish-guard",
                    "--write",
                    "--queue-replenish-preview-output",
                    preview,
                    "--queue-replenish-command-output",
                    command,
                    "--queue-replenish-receipt-output",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--queue-replenish-team-handoff",
                    "--write",
                    "--queue-replenish-preview-output",
                    preview,
                    "--queue-replenish-command-output",
                    command,
                    "--queue-replenish-receipt-output",
                    receipt,
                    "--queue-replenish-team-handoff-output",
                    handoff,
                    "--queue-replenish-team-handoff-receipt-output",
                    handoff_receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_exact_gate")
            self.assertEqual(payload["exact_gate_phrase"], exact_gate)
            self.assertTrue(payload["target_queue_path_absent"])
            self.assertEqual(payload["guard_status"]["status"], "ready_for_exact_gate")
            self.assertEqual(set(payload["lane_cards"]), {"Hermes_Commander", "Codex_Builder", "OpenCode_Reviewer", "Validator_Worker"})
            self.assertEqual(payload["lane_cards"]["Hermes_Commander"]["status"], "waiting_for_exact_gate")
            self.assertEqual(payload["lane_cards"]["Codex_Builder"]["status"], "standby_until_packet_076_exists")
            self.assertIn("No live/provider/deploy/cloud action performed.", payload["telegram_safe_draft"])
            self.assertEqual(payload["handoff_path"], handoff)
            self.assertEqual(payload["handoff_receipt_path"], handoff_receipt)
            self.assertTrue((root / handoff).is_file())
            self.assertTrue((root / handoff_receipt).is_file())
            self.assertFalse((root / target).exists())
            handoff_receipt_payload = json.loads((root / handoff_receipt).read_text(encoding="utf-8"))
            self.assertEqual(handoff_receipt_payload["handoff_status"], "ready_for_exact_gate")
            self.assertEqual(handoff_receipt_payload["lane_count"], 4)
            self.assertFalse(handoff_receipt_payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse(handoff_receipt_payload["external_actions_performed"]["worker_execution"])

    def test_queue_replenish_team_handoff_blocks_when_target_queue_exists(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P129_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY"
            target = "_A2A_QUEUE/outbox/packet_076_sirinx_agm_next_local_task_card.json"
            preview = ".ghostclaw_runtime/a2a2a/evidence/P131-preview.json"
            command = ".ghostclaw_runtime/a2a2a/commands/P131-guard.sh"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P131-receipt.json"
            write_json(
                root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
                {
                    "schema": "ghostclaw.a2a2a.current_next_gate.v1",
                    "current_next_gate": {
                        "exact_phrase": exact_gate,
                        "allowed_scope": "write one new local active-focus A2A2A queue packet for sirinx.co or AGM AutoFlow only",
                    },
                    "selected_packet_path": target,
                },
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--queue-replenish-guard",
                    "--write",
                    "--queue-replenish-preview-output",
                    preview,
                    "--queue-replenish-command-output",
                    command,
                    "--queue-replenish-receipt-output",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            write_json(root / target, {"id": "packet_076"})

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--queue-replenish-team-handoff",
                    "--queue-replenish-preview-output",
                    preview,
                    "--queue-replenish-command-output",
                    command,
                    "--queue-replenish-receipt-output",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "blocked_or_not_ready")
            self.assertFalse(payload["target_queue_path_absent"])
            self.assertEqual(payload["guard_status"]["status"], "blocked_or_not_ready")
            self.assertIn("target_queue_path_already_exists", payload["guard_status"]["issues"])
            self.assertIsNone(payload["command_after_exact_gate"])
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])

    def test_queue_replenish_target_reconcile_waits_when_target_absent(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P129_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY"
            target = "_A2A_QUEUE/outbox/packet_076_sirinx_agm_next_local_task_card.json"
            preview = ".ghostclaw_runtime/a2a2a/evidence/P131-preview.json"
            command = ".ghostclaw_runtime/a2a2a/commands/P131-guard.sh"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P131-receipt.json"
            write_json(
                root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
                {
                    "current_next_gate": {
                        "exact_phrase": exact_gate,
                        "allowed_scope": "write one new local active-focus A2A2A queue packet for sirinx.co or AGM AutoFlow only",
                    },
                    "selected_packet_path": target,
                },
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--queue-replenish-guard",
                    "--write",
                    "--queue-replenish-preview-output",
                    preview,
                    "--queue-replenish-command-output",
                    command,
                    "--queue-replenish-receipt-output",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--queue-replenish-target-reconcile",
                    "--queue-replenish-preview-output",
                    preview,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "waiting_for_exact_gate")
            self.assertFalse(payload["target_exists"])
            self.assertFalse(payload["target_matches_preview"])
            self.assertEqual(payload["issues"], [])
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])

    def test_queue_replenish_target_reconcile_detects_matching_target_without_writing(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P129_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY"
            target = "_A2A_QUEUE/outbox/packet_076_sirinx_agm_next_local_task_card.json"
            preview = ".ghostclaw_runtime/a2a2a/evidence/P131-preview.json"
            command = ".ghostclaw_runtime/a2a2a/commands/P131-guard.sh"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P131-receipt.json"
            reconcile = ".ghostclaw_runtime/a2a2a/status/P134-reconcile.json"
            reconcile_receipt = ".ghostclaw_runtime/a2a2a/receipts/P134-receipt.json"
            write_json(
                root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
                {
                    "current_next_gate": {
                        "exact_phrase": exact_gate,
                        "allowed_scope": "write one new local active-focus A2A2A queue packet for sirinx.co or AGM AutoFlow only",
                    },
                    "selected_packet_path": target,
                },
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--queue-replenish-guard",
                    "--write",
                    "--queue-replenish-preview-output",
                    preview,
                    "--queue-replenish-command-output",
                    command,
                    "--queue-replenish-receipt-output",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            write_json(root / target, json.loads((root / preview).read_text(encoding="utf-8")))

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--queue-replenish-target-reconcile",
                    "--write",
                    "--queue-replenish-preview-output",
                    preview,
                    "--queue-replenish-target-reconcile-output",
                    reconcile,
                    "--queue-replenish-target-reconcile-receipt-output",
                    reconcile_receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "queue_packet_present_matches_preview")
            self.assertEqual(payload["transition"], "p129_target_present_exact_preview_match")
            self.assertTrue(payload["target_exists"])
            self.assertTrue(payload["json_matches_preview"])
            self.assertTrue(payload["sha_matches_preview"])
            self.assertTrue(payload["target_matches_preview"])
            self.assertEqual(payload["target_write_gate_claim"], exact_gate)
            self.assertEqual(payload["target_packet_id"], "packet_076_sirinx_agm_next_local_task_card")
            self.assertEqual(payload["reconcile_path"], reconcile)
            self.assertEqual(payload["reconcile_receipt_path"], reconcile_receipt)
            self.assertTrue((root / reconcile).is_file())
            self.assertTrue((root / reconcile_receipt).is_file())
            reconcile_receipt_payload = json.loads((root / reconcile_receipt).read_text(encoding="utf-8"))
            self.assertEqual(reconcile_receipt_payload["reconcile_status"], "queue_packet_present_matches_preview")
            self.assertFalse(reconcile_receipt_payload["external_actions_performed"]["queue_file_write"])

    def test_queue_replenish_target_reconcile_blocks_mismatched_target(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P129_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY"
            target = "_A2A_QUEUE/outbox/packet_076_sirinx_agm_next_local_task_card.json"
            preview = ".ghostclaw_runtime/a2a2a/evidence/P131-preview.json"
            command = ".ghostclaw_runtime/a2a2a/commands/P131-guard.sh"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P131-receipt.json"
            write_json(
                root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
                {
                    "current_next_gate": {
                        "exact_phrase": exact_gate,
                        "allowed_scope": "write one new local active-focus A2A2A queue packet for sirinx.co or AGM AutoFlow only",
                    },
                    "selected_packet_path": target,
                },
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--queue-replenish-guard",
                    "--write",
                    "--queue-replenish-preview-output",
                    preview,
                    "--queue-replenish-command-output",
                    command,
                    "--queue-replenish-receipt-output",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            write_json(root / target, {"id": "packet_076", "status": "tampered"})

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--queue-replenish-target-reconcile",
                    "--queue-replenish-preview-output",
                    preview,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "blocked_or_not_ready")
            self.assertTrue(payload["target_exists"])
            self.assertFalse(payload["target_matches_preview"])
            self.assertIn("target_queue_path_mismatch_preview", payload["issues"])
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])

    def test_compact_overlay_suppresses_queue_replenish_gate_when_target_exists(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P129_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY"
            target = "_A2A_QUEUE/outbox/packet_076_sirinx_agm_next_local_task_card.json"
            write_json(
                root / target,
                {
                    "id": "packet_076",
                    "title": "sirinx.co and AGM AutoFlow next local task card",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                },
            )
            write_json(
                root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
                {
                    "status": "waiting_for_exact_queue_replenish_gate",
                    "current_next_gate": {
                        "exact_phrase": exact_gate,
                        "allowed_scope": "write one new local active-focus A2A2A queue packet for sirinx.co or AGM AutoFlow only",
                    },
                    "selected_packet_path": target,
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--compact"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["current_gate_overlay"]["status"], "superseded_by_existing_target")
            self.assertTrue(payload["current_gate_overlay"]["selected_packet_path_exists"])
            self.assertTrue(payload["queue_drain"]["current_gate_superseded_by_existing_target"])
            self.assertIsNone(payload["queue_drain"]["recommended_next_gate_phrase"])
            self.assertEqual(payload["queue_drain"]["next_gate_phrases"], [])
            self.assertIn("Target queue packet already exists", payload["next_safe_action"])

    def test_operator_action_card_reports_target_present_instead_of_replenish_gate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P129_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY"
            target = "_A2A_QUEUE/outbox/packet_076_sirinx_agm_next_local_task_card.json"
            write_json(
                root / target,
                {
                    "id": "packet_076",
                    "title": "sirinx.co and AGM AutoFlow next local task card",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                },
            )
            write_json(
                root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
                {
                    "status": "waiting_for_exact_queue_replenish_gate",
                    "current_next_gate": {
                        "exact_phrase": exact_gate,
                        "allowed_scope": "write one new local active-focus A2A2A queue packet for sirinx.co or AGM AutoFlow only",
                    },
                    "selected_packet_path": target,
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--operator-action-card"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "target_queue_packet_present")
            self.assertEqual(payload["action_after_exact_gate"]["kind"], "do_not_replenish_queue_target_already_present")
            self.assertFalse(payload["action_after_exact_gate"]["would_execute"])
            self.assertIsNone(payload["action_after_exact_gate"]["requires_exact_gate_phrase"])
            self.assertIn("target_queue_path_already_exists", payload["gate_readiness_issues"])
            self.assertIn("Do not rerun queue replenish", payload["next_safe_action"])
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])

    def test_packet076_worker_envelope_gate_writes_preview_command_receipt_only(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            target = "_A2A_QUEUE/outbox/packet_076_sirinx_agm_next_local_task_card.json"
            preview = ".ghostclaw_runtime/a2a2a/evidence/P136-preview.json"
            command = ".ghostclaw_runtime/a2a2a/commands/P136-guard.sh"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P136-receipt.json"
            write_json(
                root / target,
                {
                    "id": "packet_076",
                    "packet_id": "packet_076_sirinx_agm_next_local_task_card",
                    "title": "sirinx.co and AGM AutoFlow next local task card",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                    "paused_focus": ["Kusala", "Phitsanulok News"],
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet076-worker-envelope-gate",
                    "--write",
                    "--packet076-worker-envelope-preview-output",
                    preview,
                    "--packet076-worker-envelope-command-output",
                    command,
                    "--packet076-worker-envelope-receipt-output",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_exact_gate")
            self.assertEqual(payload["exact_gate_phrase"], "APPROVE_A2A2A_P136_PACKET076_LOCAL_WORKER_ENVELOPE_WRITE_ONLY")
            self.assertEqual(len(payload["planned_worker_packets"]), 2)
            self.assertEqual({item["target"] for item in payload["planned_worker_packets"]}, {"hermes", "kob"})
            self.assertEqual(payload["preview_path"], preview)
            self.assertEqual(payload["command_path"], command)
            self.assertEqual(payload["receipt_path"], receipt)
            self.assertNotIn("guard_script", payload)
            self.assertTrue((root / preview).is_file())
            self.assertTrue((root / command).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_076_hermes_p136_20260704.json").exists())
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_076_kob_p136_20260704.json").exists())
            preview_payload = json.loads((root / preview).read_text(encoding="utf-8"))
            receipt_payload = json.loads((root / receipt).read_text(encoding="utf-8"))
            command_text = (root / command).read_text(encoding="utf-8")
            self.assertEqual(preview_payload["status"], "ready_for_exact_gate")
            self.assertEqual(len(preview_payload["planned_writes"]), 2)
            self.assertEqual(receipt_payload["gate_status"], "ready_for_exact_gate")
            self.assertIn("APPROVE_A2A2A_P136_PACKET076_LOCAL_WORKER_ENVELOPE_WRITE_ONLY", command_text)
            self.assertIn("refusing overwrite", command_text)
            self.assertFalse(receipt_payload["external_actions_performed"]["worker_envelope_write"])
            self.assertFalse(receipt_payload["external_actions_performed"]["worker_execution"])

    def test_packet076_worker_envelope_gate_blocks_when_worker_envelope_exists(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            target = "_A2A_QUEUE/outbox/packet_076_sirinx_agm_next_local_task_card.json"
            worker = ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_076_hermes_p136_20260704.json"
            write_json(
                root / target,
                {
                    "id": "packet_076",
                    "packet_id": "packet_076_sirinx_agm_next_local_task_card",
                    "title": "sirinx.co and AGM AutoFlow next local task card",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                    "paused_focus": ["Kusala", "Phitsanulok News"],
                },
            )
            write_json(root / worker, {"id": "already-there"})

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--packet076-worker-envelope-gate"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "blocked_or_not_ready")
            self.assertIn(f"worker_envelope_already_exists:{worker}", payload["issues"])
            self.assertIsNone(payload["command_after_exact_gate"])
            self.assertEqual(payload["planned_worker_packets"], [])
            self.assertFalse(payload["external_actions_performed"]["worker_envelope_write"])

    def test_packet077_worker_envelope_gate_writes_preview_command_receipt_only(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            target = "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json"
            preview = ".ghostclaw_runtime/a2a2a/evidence/P156-preview.json"
            command = ".ghostclaw_runtime/a2a2a/commands/P156-guard.sh"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P156-receipt.json"
            write_json(
                root / target,
                {
                    "id": "packet_077",
                    "packet_id": "packet_077_sirinx_agm_next_local_task_card",
                    "title": "sirinx.co and AGM AutoFlow next local task card",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                    "paused_focus": ["Kusala", "Phitsanulok News"],
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet077-worker-envelope-gate",
                    "--write",
                    "--packet077-worker-envelope-preview-output",
                    preview,
                    "--packet077-worker-envelope-command-output",
                    command,
                    "--packet077-worker-envelope-receipt-output",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_exact_gate")
            self.assertEqual(payload["exact_gate_phrase"], "APPROVE_A2A2A_P156_PACKET077_LOCAL_WORKER_ENVELOPE_WRITE_ONLY")
            self.assertEqual(payload["packet_id"], "A2A2A-P156-PACKET077-WORKER-ENVELOPE-GATE-20260704")
            self.assertEqual(len(payload["planned_worker_packets"]), 2)
            self.assertEqual({item["target"] for item in payload["planned_worker_packets"]}, {"hermes", "kob"})
            self.assertTrue((root / preview).is_file())
            self.assertTrue((root / command).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_077_hermes_p156_20260704.json").exists())
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_077_kob_p156_20260704.json").exists())
            preview_payload = json.loads((root / preview).read_text(encoding="utf-8"))
            receipt_payload = json.loads((root / receipt).read_text(encoding="utf-8"))
            command_text = (root / command).read_text(encoding="utf-8")
            self.assertEqual(preview_payload["packet_id"], "A2A2A-P156-PACKET077-WORKER-ENVELOPE-GATE-PREVIEW-20260704")
            self.assertEqual(preview_payload["planned_writes"][0]["queue_packet_id"], "packet_077")
            self.assertEqual(preview_payload["planned_writes"][0]["envelope"]["mission"], "A2A2A_P156_PACKET077_LOCAL_WORKER_ENVELOPE_WRITE_ONLY")
            self.assertEqual(receipt_payload["gate_status"], "ready_for_exact_gate")
            self.assertIn("APPROVE_A2A2A_P156_PACKET077_LOCAL_WORKER_ENVELOPE_WRITE_ONLY", command_text)
            self.assertIn("refusing overwrite", command_text)
            self.assertFalse(receipt_payload["external_actions_performed"]["worker_envelope_write"])
            self.assertFalse(receipt_payload["external_actions_performed"]["worker_execution"])

    def test_packet078_worker_envelope_gate_writes_preview_command_receipt_only(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            target = "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json"
            preview = ".ghostclaw_runtime/a2a2a/evidence/P173-preview.json"
            command = ".ghostclaw_runtime/a2a2a/commands/P173-guard.sh"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P173-receipt.json"
            write_json(
                root / target,
                {
                    "id": "packet_078",
                    "packet_id": "packet_078_sirinx_agm_next_local_task_card",
                    "title": "sirinx.co and AGM AutoFlow next local task card",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                    "paused_focus": ["Kusala", "Phitsanulok News"],
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-worker-envelope-gate",
                    "--write",
                    "--packet078-worker-envelope-preview-output",
                    preview,
                    "--packet078-worker-envelope-command-output",
                    command,
                    "--packet078-worker-envelope-receipt-output",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_exact_gate")
            self.assertEqual(payload["exact_gate_phrase"], "APPROVE_A2A2A_P173_PACKET078_LOCAL_WORKER_ENVELOPE_WRITE_ONLY")
            self.assertEqual(payload["packet_id"], "A2A2A-P173-PACKET078-WORKER-ENVELOPE-GATE-20260704")
            self.assertEqual(len(payload["planned_worker_packets"]), 2)
            self.assertEqual({item["target"] for item in payload["planned_worker_packets"]}, {"hermes", "kob"})
            self.assertTrue((root / preview).is_file())
            self.assertTrue((root / command).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_078_hermes_p173_20260704.json").exists())
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_078_kob_p173_20260704.json").exists())
            preview_payload = json.loads((root / preview).read_text(encoding="utf-8"))
            receipt_payload = json.loads((root / receipt).read_text(encoding="utf-8"))
            command_text = (root / command).read_text(encoding="utf-8")
            self.assertEqual(preview_payload["packet_id"], "A2A2A-P173-PACKET078-WORKER-ENVELOPE-GATE-PREVIEW-20260704")
            self.assertEqual(preview_payload["planned_writes"][0]["queue_packet_id"], "packet_078")
            self.assertEqual(preview_payload["planned_writes"][0]["envelope"]["mission"], "A2A2A_P173_PACKET078_LOCAL_WORKER_ENVELOPE_WRITE_ONLY")
            self.assertEqual(receipt_payload["gate_status"], "ready_for_exact_gate")
            self.assertIn("APPROVE_A2A2A_P173_PACKET078_LOCAL_WORKER_ENVELOPE_WRITE_ONLY", command_text)
            self.assertIn("refusing overwrite", command_text)
            self.assertFalse(receipt_payload["external_actions_performed"]["worker_envelope_write"])
            self.assertFalse(receipt_payload["external_actions_performed"]["worker_execution"])

    def test_packet077_worker_envelope_guard_exact_gate_writes_receipt_in_temp_repo(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            target = "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json"
            preview = ".ghostclaw_runtime/a2a2a/evidence/P156-preview.json"
            command = ".ghostclaw_runtime/a2a2a/commands/P156-guard.sh"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P156-receipt.json"
            write_json(
                root / target,
                {
                    "id": "packet_077",
                    "packet_id": "packet_077_sirinx_agm_next_local_task_card",
                    "title": "sirinx.co and AGM AutoFlow next local task card",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                    "paused_focus": ["Kusala", "Phitsanulok News"],
                },
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet077-worker-envelope-gate",
                    "--write",
                    "--packet077-worker-envelope-preview-output",
                    preview,
                    "--packet077-worker-envelope-command-output",
                    command,
                    "--packet077-worker-envelope-receipt-output",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            result = subprocess.run(
                [
                    "bash",
                    str(root / command),
                    "APPROVE_A2A2A_P156_PACKET077_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            self.assertIn("A2A2A-P156-PACKET077_WORKER_ENVELOPES_WRITTEN", result.stdout)
            execution_receipt = (
                root
                / ".ghostclaw_runtime/a2a2a/receipts/"
                / "A2A2A-P156-PACKET077-WORKER-ENVELOPE-WRITE-EXECUTED-20260704.json"
            )
            self.assertTrue(execution_receipt.is_file())
            payload = json.loads(execution_receipt.read_text(encoding="utf-8"))
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.packet_worker_envelope_write_receipt.v1")
            self.assertEqual(payload["status"], "worker_envelopes_written")
            self.assertEqual(payload["exact_gate_phrase"], "APPROVE_A2A2A_P156_PACKET077_LOCAL_WORKER_ENVELOPE_WRITE_ONLY")
            self.assertEqual(payload["source_preview_sha256"], sha256_file(root / preview))
            self.assertEqual(payload["written_count"], 2)
            self.assertEqual(payload["written_targets"], ["hermes", "kob"])
            self.assertFalse(payload["external_actions_performed"]["queue_payload_execution"])
            self.assertFalse(payload["external_actions_performed"]["worker_execution"])
            self.assertTrue(
                (
                    root
                    / ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_077_hermes_p156_20260704.json"
                ).is_file()
            )
            self.assertTrue(
                (
                    root
                    / ".ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_077_kob_p156_20260704.json"
                ).is_file()
            )

    def test_write_operator_action_card_writes_status_card_without_inbox(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_ready_packet074_gate(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--operator-action-card", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            card = root / ".ghostclaw_runtime/a2a2a/status/operator_action_card.json"
            evidence = root / ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P077-AGENT-ORCHESTRATOR-ACCELERATION-IMPLEMENTATION-20260703.json"
            receipt = root / ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P077-AGENT-ORCHESTRATOR-ACCELERATION-IMPLEMENTATION-20260703.json"
            self.assertEqual(payload["action_card_path"], str(card.relative_to(root)))
            self.assertTrue(card.is_file())
            self.assertTrue(evidence.is_file())
            self.assertTrue(receipt.is_file())
            card_payload = json.loads(card.read_text(encoding="utf-8"))
            self.assertEqual(card_payload["status"], "ready_for_exact_gate")
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox").exists())

    def test_operator_brief_renders_copy_paste_safe_markdown(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_ready_packet074_gate(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--operator-brief"],
                check=True,
                text=True,
                capture_output=True,
            )
            self.assertIn("# A2A2A Operator Action Brief", result.stdout)
            self.assertIn("Status: `ready_for_exact_gate`", result.stdout)
            self.assertIn("Selected packet: `packet_074`", result.stdout)
            self.assertIn("APPROVE_A2A2A_P107_PACKET074_LOCAL_WORKER_ENVELOPE_WRITE_ONLY", result.stdout)
            self.assertIn("Write local worker envelopes after exact gate only", result.stdout)
            self.assertIn("No live send, provider/model call", result.stdout)
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox").exists())

    def test_operator_brief_blocks_write_command_when_readiness_not_ready(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_ready_packet074_gate(root, write_after_gate="git push origin main")

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--operator-brief"],
                check=True,
                text=True,
                capture_output=True,
            )
            self.assertIn("Status: `blocked_by_gate_readiness`", result.stdout)
            self.assertIn("BLOCKED: resolve gate readiness issues before local worker-envelope write.", result.stdout)
            self.assertNotIn("git push origin main", result.stdout)
            self.assertIn("command_preview_unsafe_token:write_after_gate:git push", result.stdout)

    def test_write_operator_brief_writes_markdown_and_card_without_inbox(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_ready_packet074_gate(root)

            subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--operator-brief", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            brief = root / ".ghostclaw_runtime/a2a2a/status/operator_action_brief.md"
            card = root / ".ghostclaw_runtime/a2a2a/status/operator_action_card.json"
            evidence = root / ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P077-AGENT-ORCHESTRATOR-ACCELERATION-IMPLEMENTATION-20260703.json"
            receipt = root / ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P077-AGENT-ORCHESTRATOR-ACCELERATION-IMPLEMENTATION-20260703.json"
            self.assertTrue(brief.is_file())
            self.assertTrue(card.is_file())
            self.assertTrue(evidence.is_file())
            self.assertTrue(receipt.is_file())
            self.assertIn("# A2A2A Operator Action Brief", brief.read_text(encoding="utf-8"))
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox").exists())

    def test_check_approval_accepts_exact_gate_without_execution(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P107_PACKET074_LOCAL_WORKER_ENVELOPE_WRITE_ONLY"
            self._write_ready_packet074_gate(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--check-approval", exact_gate],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.operator_approval_check.v1")
            self.assertEqual(payload["status"], "accepted_exact_gate_ready")
            self.assertTrue(payload["approval_text_matches_exact_gate"])
            self.assertEqual(payload["issues"], [])
            self.assertIn(exact_gate, payload["action_after_approval"]["command"])
            self.assertFalse(payload["action_after_approval"]["would_execute"])
            self.assertFalse(payload["external_actions_performed"]["worker_envelope_write"])
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox").exists())

    def test_check_approval_rejects_wrong_or_blanket_approval(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_ready_packet074_gate(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--check-approval", "APPROVE_ALL_FULL_AUTO"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "rejected_or_not_ready")
            self.assertFalse(payload["approval_text_matches_exact_gate"])
            self.assertIn("approval_text_does_not_match_exact_gate", payload["issues"])
            self.assertIn("blanket_approval_rejected", payload["issues"])
            self.assertIsNone(payload["action_after_approval"]["command"])

    def test_check_approval_rejects_exact_gate_when_readiness_not_ready(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P107_PACKET074_LOCAL_WORKER_ENVELOPE_WRITE_ONLY"
            self._write_ready_packet074_gate(root, write_after_gate="git push origin main")

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--check-approval", exact_gate],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "rejected_or_not_ready")
            self.assertTrue(payload["approval_text_matches_exact_gate"])
            self.assertIn("operator_card_not_ready", payload["issues"])
            self.assertIn("gate_readiness_not_ready", payload["issues"])
            self.assertIn("gate_readiness_has_issues", payload["issues"])
            self.assertIsNone(payload["action_after_approval"]["command"])

    def test_write_check_approval_writes_only_status_card_and_check(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P107_PACKET074_LOCAL_WORKER_ENVELOPE_WRITE_ONLY"
            self._write_ready_packet074_gate(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--check-approval", exact_gate, "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            card = root / ".ghostclaw_runtime/a2a2a/status/operator_action_card.json"
            check = root / ".ghostclaw_runtime/a2a2a/status/operator_approval_check.json"
            evidence = root / ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P077-AGENT-ORCHESTRATOR-ACCELERATION-IMPLEMENTATION-20260703.json"
            receipt = root / ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P077-AGENT-ORCHESTRATOR-ACCELERATION-IMPLEMENTATION-20260703.json"
            self.assertEqual(payload["approval_check_path"], str(check.relative_to(root)))
            self.assertTrue(card.is_file())
            self.assertTrue(check.is_file())
            self.assertTrue(evidence.is_file())
            self.assertTrue(receipt.is_file())
            check_payload = json.loads(check.read_text(encoding="utf-8"))
            self.assertEqual(check_payload["status"], "accepted_exact_gate_ready")
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox").exists())

    def test_ack_action_card_ready_after_worker_envelopes_exist_without_receipts(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet074_worker_envelopes(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-action-card"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.role_worker_ack_action_card.v1")
            self.assertEqual(payload["status"], "ready_for_exact_ack_gate")
            self.assertEqual(payload["selected_packet"], "packet_074")
            self.assertEqual(payload["selected_packet_sequence"], "074")
            self.assertEqual(
                payload["exact_gate_phrase"],
                "APPROVE_A2A2A_P114_PACKET074_LOCAL_ROLE_WORKER_ACK_ONLY",
            )
            self.assertIn("--agent hermes", payload["commands_after_exact_gate"]["hermes"])
            self.assertIn("--agent kob", payload["commands_after_exact_gate"]["kob"])
            self.assertIn("--once", payload["combined_command_after_exact_gate"])
            self.assertFalse(payload["external_actions_performed"]["role_worker_ack_write"])
            self.assertFalse(payload["external_actions_performed"]["provider_call"])
            self.assertFalse(payload["external_actions_performed"]["telegram_live_send"])
            self.assertEqual(payload["worker_state"]["receipts"], {"hermes": [], "kob": []})

    def test_ack_action_card_uses_packet076_p137_exact_gate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet076_worker_envelopes(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-action-card"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_exact_ack_gate")
            self.assertEqual(payload["selected_packet"], "packet_076")
            self.assertEqual(payload["selected_packet_sequence"], "076")
            self.assertEqual(
                payload["exact_gate_phrase"],
                "APPROVE_A2A2A_P137_PACKET076_LOCAL_ROLE_WORKER_ACK_ONLY",
            )
            self.assertEqual(
                payload["packet_id"],
                "A2A2A-P137-ORCHESTRATOR-PACKET076-ROLE-WORKER-ACK-GATE-20260703",
            )
            self.assertIn("packet_076", payload["combined_command_after_exact_gate"])
            self.assertFalse(payload["external_actions_performed"]["role_worker_ack_write"])

    def test_write_ack_action_card_uses_packet076_p137_gate_path(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet076_worker_envelopes(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-action-card", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            card = root / ".ghostclaw_runtime/a2a2a/status/role_worker_ack_action_card.json"
            gate = root / ".ghostclaw_runtime/a2a2a/gates/A2A2A-P137-PACKET076-LOCAL-ROLE-WORKER-ACK.gate.json"
            old_gate = root / ".ghostclaw_runtime/a2a2a/gates/A2A2A-P114-PACKET074-LOCAL-ROLE-WORKER-ACK.gate.json"
            self.assertEqual(payload["ack_action_card_path"], str(card.relative_to(root)))
            self.assertEqual(payload["ack_gate_path"], str(gate.relative_to(root)))
            self.assertTrue(card.is_file())
            self.assertTrue(gate.is_file())
            self.assertFalse(old_gate.exists())
            gate_payload = json.loads(gate.read_text(encoding="utf-8"))
            self.assertEqual(gate_payload["required_approval"], "APPROVE_A2A2A_P137_PACKET076_LOCAL_ROLE_WORKER_ACK_ONLY")
            self.assertIn("packet_076", gate_payload["allowed_scope"])
            self.assertEqual(
                list((root / ".ghostclaw_runtime/a2a2a/receipts").glob("*packet_076*")),
                [],
            )

    def test_check_ack_approval_uses_packet076_p137_packet_id(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P137_PACKET076_LOCAL_ROLE_WORKER_ACK_ONLY"
            self._write_packet076_worker_envelopes(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--check-ack-approval", exact_gate],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "accepted_exact_ack_gate_ready")
            self.assertEqual(
                payload["packet_id"],
                "A2A2A-P137-ORCHESTRATOR-PACKET076-ACK-APPROVAL-CHECK-20260703",
            )
            self.assertTrue(payload["approval_text_matches_exact_gate"])
            self.assertFalse(payload["action_after_approval"]["would_execute"])

    def test_ack_gate_lock_audit_ready_for_packet076_without_ack_receipts(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet076_worker_envelopes(root)
            self._write_packet076_p137_current_gate(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-gate-lock-audit"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.ack_gate_lock_audit.v1")
            self.assertEqual(payload["status"], "ready_for_exact_ack_gate_locked")
            self.assertEqual(payload["selected_packet_sequence"], "076")
            self.assertEqual(payload["exact_gate_phrase"], "APPROVE_A2A2A_P137_PACKET076_LOCAL_ROLE_WORKER_ACK_ONLY")
            self.assertEqual(payload["issues"], [])
            self.assertEqual(payload["accepted_approval_check_status"], "accepted_exact_ack_gate_ready")
            self.assertEqual(payload["blanket_approval_check_status"], "rejected_or_not_ready")
            self.assertFalse(payload["command_preview_after_exact_gate_only"]["would_execute_now"])
            self.assertFalse(payload["external_actions_performed"]["role_worker_ack_write"])

    def test_ack_gate_lock_audit_blocks_when_packet076_ack_receipt_exists(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet076_worker_envelopes(root)
            self._write_packet076_p137_current_gate(root)
            self._write_packet076_actual_ack_receipts(root, targets=("hermes",))

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-gate-lock-audit"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "blocked_or_not_ready")
            self.assertIn("ack_action_card_not_ready", payload["issues"])
            self.assertIn("ack_receipt_already_present:hermes", payload["issues"])
            self.assertFalse(payload["external_actions_performed"]["role_worker_ack_write"])

    def test_ack_reconcile_accepts_packet076_actual_role_worker_receipt_names(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet076_worker_envelopes(root)
            self._write_packet076_actual_ack_receipts(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-reconcile"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ack_complete_ready_for_next_selection")
            self.assertEqual(payload["issues"], [])
            self.assertEqual(
                [target["expected_receipt"] for target in payload["targets"]],
                [
                    ".ghostclaw_runtime/a2a2a/receipts/hermes_route_p136_local_dispatch_packet_076_hermes.json",
                    ".ghostclaw_runtime/a2a2a/receipts/kob_verdict_p136_local_dispatch_packet_076_kob.json",
                ],
            )
            self.assertTrue(all(target["ack_complete"] for target in payload["targets"]))

    def test_packet076_ack_execution_guard_writes_preview_command_receipt_only(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet076_worker_envelopes(root)
            self._write_packet076_p137_current_gate(root)
            subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-gate-lock-audit", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )

            preview = ".ghostclaw_runtime/a2a2a/evidence/P139-preview.json"
            command = ".ghostclaw_runtime/a2a2a/commands/P139-guard.sh"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P139-receipt.json"
            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--ack-execution-guard",
                    "--write",
                    "--ack-execution-guard-preview-output",
                    preview,
                    "--ack-execution-guard-command-output",
                    command,
                    "--ack-execution-guard-receipt-output",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_exact_gate")
            self.assertEqual(payload["exact_gate_phrase"], "APPROVE_A2A2A_P137_PACKET076_LOCAL_ROLE_WORKER_ACK_ONLY")
            self.assertTrue((root / preview).is_file())
            self.assertTrue((root / command).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertEqual(
                list((root / ".ghostclaw_runtime/a2a2a/receipts").glob("*p136_local_dispatch_packet_076*")),
                [],
            )

    def test_packet076_ack_execution_guard_wrong_approval_writes_no_ack_receipts(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet076_worker_envelopes(root)
            self._write_packet076_p137_current_gate(root)
            subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-gate-lock-audit", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            command = ".ghostclaw_runtime/a2a2a/commands/P139-guard.sh"
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--ack-execution-guard",
                    "--write",
                    "--ack-execution-guard-command-output",
                    command,
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            result = subprocess.run(
                ["bash", str(root / command), "WRONG_APPROVAL"],
                text=True,
                capture_output=True,
            )
            self.assertEqual(result.returncode, 2)
            self.assertIn("exact approval phrase required", result.stderr)
            self.assertEqual(
                list((root / ".ghostclaw_runtime/a2a2a/receipts").glob("*p136_local_dispatch_packet_076*")),
                [],
            )

    def test_completed_packet076_current_gate_is_not_resurfaced_as_next_gate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet076_worker_envelopes(root)
            self._write_packet076_actual_ack_receipts(root)
            self._write_packet076_completed_current_gate(root)

            compact = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--compact"],
                check=True,
                text=True,
                capture_output=True,
            )
            compact_payload = json.loads(compact.stdout)
            self.assertNotIn("current_gate_overlay", compact_payload)
            self.assertEqual(compact_payload["queue_drain"]["status"], "queue_drained_no_actionable_packet")
            self.assertIsNone(compact_payload["queue_drain"]["recommended_next_gate_phrase"])

            handoff = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--handoff-capsule"],
                check=True,
                text=True,
                capture_output=True,
            )
            handoff_payload = json.loads(handoff.stdout)
            self.assertIsNone(handoff_payload["next_exact_gate"]["phrase"])
            self.assertIsNone(handoff_payload["current_state"]["selected_packet"])
            self.assertIn("no packet", handoff_payload["telegram_safe_draft"])

            reconcile = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-reconcile"],
                check=True,
                text=True,
                capture_output=True,
            )
            reconcile_payload = json.loads(reconcile.stdout)
            self.assertEqual(reconcile_payload["status"], "ack_complete_ready_for_next_selection")

            debug = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-debug"],
                check=True,
                text=True,
                capture_output=True,
            )
            debug_payload = json.loads(debug.stdout)
            self.assertEqual(debug_payload["status"], "ack_complete_ready_for_next_selection")
            self.assertEqual(debug_payload["issues"], [])
            self.assertIsNone(debug_payload["next_exact_gate"]["phrase"])

    def test_ack_action_card_blocks_when_kob_envelope_missing(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet074_worker_envelopes(root, targets=("hermes",))

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-action-card"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "blocked_or_already_acknowledged")
            self.assertIn("missing_worker_envelope:kob", payload["issues"])
            self.assertIsNone(payload["commands_after_exact_gate"]["hermes"])
            self.assertIsNone(payload["commands_after_exact_gate"]["kob"])

    def test_ack_action_card_blocks_when_ack_receipts_already_exist(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet074_worker_envelopes(root)
            write_json(
                root / ".ghostclaw_runtime/a2a2a/receipts/hermes_route_p004_local_dispatch_packet_074_hermes.json",
                {"status": "routed_local_only"},
            )
            write_json(
                root / ".ghostclaw_runtime/a2a2a/receipts/kob_verdict_p004_local_dispatch_packet_074_kob.json",
                {"status": "kob_allow_local_ack_only"},
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-action-card"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "blocked_or_already_acknowledged")
            self.assertIn("role_worker_ack_already_present", payload["issues"])
            self.assertIsNone(payload["combined_command_after_exact_gate"])

    def test_write_ack_action_card_writes_card_and_gate_without_ack_receipts(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet074_worker_envelopes(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-action-card", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            card = root / ".ghostclaw_runtime/a2a2a/status/role_worker_ack_action_card.json"
            gate = root / ".ghostclaw_runtime/a2a2a/gates/A2A2A-P114-PACKET074-LOCAL-ROLE-WORKER-ACK.gate.json"
            self.assertEqual(payload["ack_action_card_path"], str(card.relative_to(root)))
            self.assertEqual(payload["ack_gate_path"], str(gate.relative_to(root)))
            self.assertTrue(card.is_file())
            self.assertTrue(gate.is_file())
            gate_payload = json.loads(gate.read_text(encoding="utf-8"))
            self.assertEqual(gate_payload["status"], "awaiting_exact_ack_gate")
            self.assertEqual(
                gate_payload["required_approval"],
                "APPROVE_A2A2A_P114_PACKET074_LOCAL_ROLE_WORKER_ACK_ONLY",
            )
            self.assertEqual(
                list((root / ".ghostclaw_runtime/a2a2a/receipts").glob("*packet_074*")),
                [],
            )

    def test_ack_brief_renders_markdown_without_running_workers(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet074_worker_envelopes(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-brief"],
                check=True,
                text=True,
                capture_output=True,
            )
            self.assertIn("# A2A2A Role Worker Ack Brief", result.stdout)
            self.assertIn("Status: `ready_for_exact_ack_gate`", result.stdout)
            self.assertIn("APPROVE_A2A2A_P114_PACKET074_LOCAL_ROLE_WORKER_ACK_ONLY", result.stdout)
            self.assertIn("--agent hermes", result.stdout)
            self.assertIn("--agent kob", result.stdout)
            self.assertIn("No role worker ack", result.stdout)
            self.assertEqual(
                list((root / ".ghostclaw_runtime/a2a2a/receipts").glob("*packet_074*")),
                [],
            )

    def test_check_ack_approval_accepts_exact_gate_without_running_workers(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P114_PACKET074_LOCAL_ROLE_WORKER_ACK_ONLY"
            self._write_packet074_worker_envelopes(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--check-ack-approval", exact_gate],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.role_worker_ack_approval_check.v1")
            self.assertEqual(payload["status"], "accepted_exact_ack_gate_ready")
            self.assertTrue(payload["approval_text_matches_exact_gate"])
            self.assertEqual(payload["issues"], [])
            self.assertEqual(payload["action_after_approval"]["kind"], "run_local_role_worker_ack_once")
            self.assertIn("--agent hermes", payload["action_after_approval"]["commands"]["hermes"])
            self.assertIn("--agent kob", payload["action_after_approval"]["commands"]["kob"])
            self.assertFalse(payload["action_after_approval"]["would_execute"])
            self.assertFalse(payload["external_actions_performed"]["role_worker_ack_write"])
            self.assertEqual(
                list((root / ".ghostclaw_runtime/a2a2a/receipts").glob("*packet_074*")),
                [],
            )

    def test_check_ack_approval_rejects_wrong_or_blanket_approval(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet074_worker_envelopes(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--check-ack-approval", "APPROVE_ALL_FULL_AUTO"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "rejected_or_not_ready")
            self.assertFalse(payload["approval_text_matches_exact_gate"])
            self.assertIn("approval_text_does_not_match_exact_ack_gate", payload["issues"])
            self.assertIn("blanket_approval_rejected", payload["issues"])
            self.assertIsNone(payload["action_after_approval"]["combined_command"])

    def test_check_ack_approval_rejects_exact_gate_when_ack_already_exists(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P114_PACKET074_LOCAL_ROLE_WORKER_ACK_ONLY"
            self._write_packet074_worker_envelopes(root)
            write_json(
                root / ".ghostclaw_runtime/a2a2a/receipts/hermes_route_p004_local_dispatch_packet_074_hermes.json",
                {"status": "routed_local_only"},
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--check-ack-approval", exact_gate],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "rejected_or_not_ready")
            self.assertTrue(payload["approval_text_matches_exact_gate"])
            self.assertIn("ack_action_card_not_ready", payload["issues"])
            self.assertIn("ack_action_card_has_issues", payload["issues"])
            self.assertIsNone(payload["action_after_approval"]["combined_command"])

    def test_write_check_ack_approval_writes_card_gate_and_check_without_receipts(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            exact_gate = "APPROVE_A2A2A_P114_PACKET074_LOCAL_ROLE_WORKER_ACK_ONLY"
            self._write_packet074_worker_envelopes(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--check-ack-approval", exact_gate, "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            card = root / ".ghostclaw_runtime/a2a2a/status/role_worker_ack_action_card.json"
            gate = root / ".ghostclaw_runtime/a2a2a/gates/A2A2A-P114-PACKET074-LOCAL-ROLE-WORKER-ACK.gate.json"
            check = root / ".ghostclaw_runtime/a2a2a/status/role_worker_ack_approval_check.json"
            evidence = root / ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P077-AGENT-ORCHESTRATOR-ACCELERATION-IMPLEMENTATION-20260703.json"
            receipt = root / ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P077-AGENT-ORCHESTRATOR-ACCELERATION-IMPLEMENTATION-20260703.json"
            self.assertEqual(payload["ack_action_card_path"], str(card.relative_to(root)))
            self.assertEqual(payload["ack_gate_path"], str(gate.relative_to(root)))
            self.assertEqual(payload["ack_approval_check_path"], str(check.relative_to(root)))
            self.assertTrue(card.is_file())
            self.assertTrue(gate.is_file())
            self.assertTrue(check.is_file())
            self.assertTrue(evidence.is_file())
            self.assertTrue(receipt.is_file())
            self.assertEqual(json.loads(check.read_text(encoding="utf-8"))["status"], "accepted_exact_ack_gate_ready")
            self.assertEqual(
                list((root / ".ghostclaw_runtime/a2a2a/receipts").glob("*packet_074*")),
                [],
            )

    def test_ack_reconcile_waits_when_no_ack_receipts_exist(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet074_worker_envelopes(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-reconcile"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.role_worker_ack_reconcile.v1")
            self.assertEqual(payload["status"], "waiting_for_role_worker_ack")
            self.assertEqual(payload["selected_packet"], "packet_074")
            self.assertIn("missing_ack_receipt:hermes", payload["issues"])
            self.assertIn("missing_ack_receipt:kob", payload["issues"])
            self.assertFalse(payload["external_actions_performed"]["role_worker_ack_write"])

    def test_ack_reconcile_reports_partial_ack_when_one_receipt_exists(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet074_worker_envelopes(root)
            self._write_packet074_ack_receipts(root, targets=("hermes",))

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-reconcile"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "partial_ack_waiting_for_remaining_role_worker")
            self.assertIn("missing_ack_receipt:kob", payload["issues"])
            hermes = [record for record in payload["targets"] if record["target"] == "hermes"][0]
            self.assertTrue(hermes["ack_complete"])
            self.assertTrue(hermes["receipt_matches_latest_packet"])

    def test_ack_reconcile_reports_complete_when_receipts_match_latest_envelopes(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet074_worker_envelopes(root)
            self._write_packet074_ack_receipts(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-reconcile"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ack_complete_ready_for_next_selection")
            self.assertEqual(payload["issues"], [])
            self.assertTrue(all(record["ack_complete"] for record in payload["targets"]))
            self.assertEqual(
                payload["next_safe_action"],
                "Run orchestrator compact status to select the next active-focus packet.",
            )

    def test_ack_reconcile_blocks_stale_receipts_that_do_not_match_latest_envelopes(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet074_worker_envelopes(root)
            self._write_packet074_ack_receipts(root, stale=True)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-reconcile"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ack_reconcile_blocked")
            self.assertIn("ack_receipt_stale_or_mismatch:hermes", payload["issues"])
            self.assertIn("ack_receipt_stale_or_mismatch:kob", payload["issues"])
            self.assertFalse(any(record["ack_complete"] for record in payload["targets"]))

    def test_write_ack_reconcile_writes_status_without_creating_ack_receipts(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet074_worker_envelopes(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-reconcile", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            status_path = root / ".ghostclaw_runtime/a2a2a/status/role_worker_ack_reconcile.json"
            self.assertEqual(payload["ack_reconcile_path"], str(status_path.relative_to(root)))
            self.assertTrue(status_path.is_file())
            self.assertEqual(json.loads(status_path.read_text(encoding="utf-8"))["status"], "waiting_for_role_worker_ack")
            self.assertEqual(
                list((root / ".ghostclaw_runtime/a2a2a/receipts").glob("*packet_074*")),
                [],
            )

    def test_write_ack_reconcile_writes_custom_evidence_and_receipt_payloads(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet074_worker_envelopes(root)
            evidence = root / ".ghostclaw_runtime/a2a2a/evidence/P117-custom.json"
            receipt = root / ".ghostclaw_runtime/a2a2a/receipts/P117-custom.json"

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--ack-reconcile",
                    "--write",
                    "--output",
                    str(evidence),
                    "--receipt",
                    str(receipt),
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["evidence_path"], str(evidence.relative_to(root)))
            self.assertEqual(payload["receipt_path"], str(receipt.relative_to(root)))
            evidence_payload = json.loads(evidence.read_text(encoding="utf-8"))
            receipt_payload = json.loads(receipt.read_text(encoding="utf-8"))
            self.assertEqual(evidence_payload["schema"], "ghostclaw.a2a2a.role_worker_ack_reconcile.v1")
            self.assertEqual(receipt_payload["schema"], "ghostclaw.a2a2a.role_worker_ack_reconcile_receipt.v1")
            self.assertEqual(receipt_payload["packet_id"], evidence_payload["packet_id"])
            self.assertEqual(receipt_payload["reconcile_status"], "waiting_for_role_worker_ack")

    def test_ack_reconcile_uses_selected_packet_sequence_in_packet_id(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet075_ack_complete_state(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-reconcile"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ack_complete_ready_for_next_selection")
            self.assertEqual(payload["selected_packet"], "packet_075")
            self.assertEqual(payload["selected_packet_sequence"], "075")
            self.assertEqual(
                payload["packet_id"],
                "A2A2A-P117-ORCHESTRATOR-PACKET075-POST-ACK-RECONCILE-20260703",
            )

    def test_ack_debug_suppresses_ack_gate_when_queue_replenish_target_is_absent(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet077_queue_replenish_current_gate(root)

            reconcile = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-reconcile"],
                check=True,
                text=True,
                capture_output=True,
            )
            reconcile_payload = json.loads(reconcile.stdout)
            self.assertEqual(reconcile_payload["status"], "ack_not_applicable_queue_replenish_pending")
            self.assertFalse(reconcile_payload["selected_packet_path_exists"])
            self.assertEqual(reconcile_payload["targets"], [])
            self.assertIn("selected_queue_packet_absent", reconcile_payload["issues"])

            debug = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-debug"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(debug.stdout)
            self.assertEqual(payload["status"], "ack_not_applicable_queue_replenish_pending")
            self.assertEqual(payload["ack_reconcile_status"], "ack_not_applicable_queue_replenish_pending")
            self.assertEqual(payload["missing_targets"], [])
            self.assertNotIn("missing_worker_envelope:hermes", payload["issues"])
            self.assertNotIn("missing_worker_envelope:kob", payload["issues"])
            self.assertEqual(
                payload["next_exact_gate"]["phrase"],
                "APPROVE_A2A2A_P143_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY",
            )
            self.assertNotIn("LOCAL_ROLE_WORKER_ACK_ONLY", payload["telegram_safe_draft"])
            self.assertIsNone(payload["command_preview_after_exact_gate_only"]["p116_one_shot_dispatch"])
            self.assertFalse(payload["command_preview_after_exact_gate_only"]["would_execute_now"])
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json").exists())

    def test_phase_guard_summary_marks_packet077_queue_replenish_pending(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet077_queue_replenish_current_gate(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--phase-guard-summary"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.phase_guard_summary.v1")
            self.assertEqual(payload["status"], "pass")
            self.assertEqual(payload["current_phase"], "queue_replenish_pending")
            self.assertEqual(payload["selected_packet"], "packet_077")
            self.assertFalse(payload["selected_packet_path_exists"])
            self.assertEqual(
                payload["current_exact_gate"],
                "APPROVE_A2A2A_P143_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY",
            )
            self.assertEqual(payload["phase_locks"]["queue_replenish"]["state"], "ready_for_exact_gate")
            self.assertEqual(
                payload["phase_locks"]["role_worker_ack"]["state"],
                "blocked_until_queue_packet_and_worker_envelopes_exist",
            )
            self.assertIsNone(payload["phase_locks"]["role_worker_ack"]["exact_gate"])
            self.assertIn("role_worker_ack_gate", payload["blocked_phase_actions"])
            self.assertEqual(payload["invariant_violations"], [])
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse(payload["external_actions_performed"]["role_worker_ack_write"])

    def test_phase_guard_summary_marks_ack_pending_when_worker_envelopes_exist(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet074_worker_envelopes(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--phase-guard-summary"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "pass")
            self.assertEqual(payload["current_phase"], "role_worker_ack_pending")
            self.assertEqual(payload["selected_packet"], "packet_074")
            self.assertTrue(payload["selected_packet_path_exists"])
            self.assertEqual(payload["phase_locks"]["role_worker_ack"]["state"], "ready_for_exact_gate")
            self.assertEqual(
                payload["phase_locks"]["role_worker_ack"]["exact_gate"],
                "APPROVE_A2A2A_P114_PACKET074_LOCAL_ROLE_WORKER_ACK_ONLY",
            )
            self.assertFalse(payload["phase_locks"]["role_worker_ack"]["allowed_now"])
            self.assertEqual(payload["invariant_violations"], [])

    def test_ack_debug_summarizes_missing_ack_receipts_and_exact_gate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet074_worker_envelopes(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-debug"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.role_worker_ack_debug.v1")
            self.assertEqual(payload["status"], "ready_for_exact_ack_gate")
            self.assertEqual(payload["ack_reconcile_status"], "waiting_for_role_worker_ack")
            self.assertEqual(payload["missing_targets"], ["hermes", "kob"])
            self.assertEqual(
                payload["next_exact_gate"]["phrase"],
                "APPROVE_A2A2A_P114_PACKET074_LOCAL_ROLE_WORKER_ACK_ONLY",
            )
            self.assertFalse(payload["command_preview_after_exact_gate_only"]["would_execute_now"])
            self.assertFalse(payload["external_actions_performed"]["role_worker_ack_write"])
            self.assertIn("missing=hermes,kob", payload["telegram_safe_draft"])

    def test_write_ack_debug_writes_compact_status_without_creating_ack_receipts(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet074_worker_envelopes(root)
            evidence = root / ".ghostclaw_runtime/a2a2a/evidence/P118-custom.json"
            receipt = root / ".ghostclaw_runtime/a2a2a/receipts/P118-custom.json"

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--ack-debug",
                    "--write",
                    "--output",
                    str(evidence),
                    "--receipt",
                    str(receipt),
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            status_path = root / ".ghostclaw_runtime/a2a2a/status/role_worker_ack_debug.json"
            self.assertEqual(payload["ack_debug_path"], str(status_path.relative_to(root)))
            self.assertTrue(status_path.is_file())
            evidence_payload = json.loads(evidence.read_text(encoding="utf-8"))
            receipt_payload = json.loads(receipt.read_text(encoding="utf-8"))
            self.assertEqual(evidence_payload["schema"], "ghostclaw.a2a2a.role_worker_ack_debug.v1")
            self.assertEqual(receipt_payload["schema"], "ghostclaw.a2a2a.role_worker_ack_debug_receipt.v1")
            self.assertEqual(receipt_payload["ack_debug_status"], "ready_for_exact_ack_gate")
            self.assertEqual(
                list((root / ".ghostclaw_runtime/a2a2a/receipts").glob("*packet_074*")),
                [],
            )

    def test_worker_envelope_phase_guard_blocks_packet077_until_queue_packet_exists(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet077_queue_replenish_current_gate(root)
            target = root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json"

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--worker-envelope-phase-guard"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.worker_envelope_phase_guard.v1")
            self.assertEqual(payload["status"], "blocked_until_queue_packet_exists")
            self.assertEqual(payload["current_phase"], "queue_replenish_pending")
            self.assertEqual(payload["selected_packet"], "packet_077")
            self.assertFalse(payload["selected_packet_path_exists"])
            self.assertEqual(
                payload["required_prior_gate"],
                "APPROVE_A2A2A_P143_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY",
            )
            self.assertIsNone(payload["exact_gate_phrase"])
            self.assertFalse(payload["allowed_now"])
            self.assertFalse(payload["requires_separate_exact_gate"])
            self.assertIn("worker_envelope_write", payload["blocked_phase_actions"])
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse(payload["external_actions_performed"]["worker_envelope_write"])
            self.assertFalse(target.exists())

    def test_write_worker_envelope_phase_guard_writes_only_status_evidence_receipt(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet077_queue_replenish_current_gate(root)
            target = root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json"
            evidence = ".ghostclaw_runtime/a2a2a/evidence/P149-worker-envelope-phase-guard.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P149-worker-envelope-phase-guard.json"
            status_path = ".ghostclaw_runtime/a2a2a/status/P149-worker-envelope-phase-guard.json"

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--worker-envelope-phase-guard",
                    "--write",
                    "--output",
                    evidence,
                    "--receipt",
                    receipt,
                    "--worker-envelope-phase-guard-output",
                    status_path,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "blocked_until_queue_packet_exists")
            self.assertEqual(payload["evidence_path"], evidence)
            self.assertEqual(payload["receipt_path"], receipt)
            self.assertEqual(payload["worker_envelope_phase_guard_path"], status_path)
            self.assertTrue((root / evidence).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertTrue((root / status_path).is_file())
            receipt_payload = json.loads((root / receipt).read_text(encoding="utf-8"))
            self.assertEqual(receipt_payload["schema"], "ghostclaw.a2a2a.worker_envelope_phase_guard_receipt.v1")
            self.assertEqual(receipt_payload["guard_status"], "blocked_until_queue_packet_exists")
            self.assertFalse(receipt_payload["external_actions_performed"]["worker_envelope_write"])
            self.assertFalse(receipt_payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse(target.exists())
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox/hermes").exists())
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox/kob").exists())

    def test_worker_envelope_phase_guard_recommends_p156_when_packet077_exists(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet077_queue_replenish_current_gate(root)
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow next local task card",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )

            guard_result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--worker-envelope-phase-guard"],
                check=True,
                text=True,
                capture_output=True,
            )
            guard = json.loads(guard_result.stdout)
            self.assertEqual(guard["status"], "ready_for_separate_worker_envelope_gate_request")
            self.assertEqual(
                guard["recommended_exact_gate_phrase"],
                "APPROVE_A2A2A_P156_PACKET077_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
            )
            self.assertEqual(
                guard["phase_locks"]["worker_envelope"]["exact_gate"],
                "APPROVE_A2A2A_P156_PACKET077_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
            )
            self.assertFalse(guard["allowed_now"])

            selector_result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--phase-next-action-selector"],
                check=True,
                text=True,
                capture_output=True,
            )
            selector = json.loads(selector_result.stdout)
            self.assertEqual(selector["status"], "ready_for_worker_envelope_gate_request")
            self.assertEqual(selector["action_kind"], "worker_envelope_gate_request")
            self.assertEqual(
                selector["exact_gate_phrase"],
                "APPROVE_A2A2A_P156_PACKET077_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
            )
            self.assertTrue(selector["requires_separate_gate"])
            self.assertFalse(selector["command_preview_after_exact_gate_only"]["would_execute_now"])
            self.assertIn(
                "A2A2A-P156-PACKET077-WORKER-ENVELOPE-WRITE-GUARD-20260704.sh",
                selector["command_preview_after_exact_gate_only"]["write_after_gate"],
            )
            self.assertNotIn(
                "A2A2A-P143-PACKET077-QUEUE-WRITE-CHECKSUM-GUARD-20260704.sh",
                selector["command_preview_after_exact_gate_only"]["write_after_gate"],
            )

    def test_phase_next_action_selector_prioritizes_packet077_queue_replenish_gate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet077_queue_replenish_current_gate(root)
            target = root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json"

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--phase-next-action-selector"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.phase_next_action_selector.v1")
            self.assertEqual(payload["status"], "waiting_for_queue_replenish_exact_gate")
            self.assertEqual(payload["action_kind"], "queue_replenish_exact_gate")
            self.assertEqual(payload["current_phase"], "queue_replenish_pending")
            self.assertEqual(payload["selected_packet"], "packet_077")
            self.assertFalse(payload["selected_packet_path_exists"])
            self.assertEqual(
                payload["exact_gate_phrase"],
                "APPROVE_A2A2A_P143_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY",
            )
            self.assertTrue(payload["requires_human_exact_gate"])
            self.assertTrue(payload["blocked_future_phases"]["worker_envelope"])
            self.assertTrue(payload["blocked_future_phases"]["role_worker_ack"])
            self.assertFalse(payload["command_preview_after_exact_gate_only"]["would_execute_now"])
            self.assertEqual(payload["invariant_violations"], [])
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse(payload["external_actions_performed"]["worker_envelope_write"])
            self.assertFalse(target.exists())

    def test_phase_next_action_selector_moves_to_p156_worker_envelope_gate_when_packet077_exists(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet077_queue_replenish_current_gate(root)
            target = root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json"
            write_json(
                target,
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow next local task card",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--phase-next-action-selector"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_worker_envelope_gate_request")
            self.assertEqual(payload["action_kind"], "worker_envelope_gate_request")
            self.assertEqual(payload["current_phase"], "queue_target_present_reconcile")
            self.assertTrue(payload["selected_packet_path_exists"])
            self.assertEqual(
                payload["exact_gate_phrase"],
                "APPROVE_A2A2A_P156_PACKET077_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
            )
            self.assertTrue(payload["requires_human_exact_gate"])
            self.assertFalse(payload["blocked_future_phases"]["worker_envelope"])
            self.assertTrue(payload["blocked_future_phases"]["role_worker_ack"])
            self.assertIn(
                "A2A2A-P156-PACKET077-WORKER-ENVELOPE-WRITE-GUARD-20260704.sh",
                payload["command_preview_after_exact_gate_only"]["write_after_gate"],
            )
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse(payload["external_actions_performed"]["worker_envelope_write"])

    def test_write_phase_next_action_selector_writes_only_status_evidence_receipt(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet077_queue_replenish_current_gate(root)
            target = root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json"
            evidence = ".ghostclaw_runtime/a2a2a/evidence/P150-phase-next-action-selector.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P150-phase-next-action-selector.json"
            status_path = ".ghostclaw_runtime/a2a2a/status/P150-phase-next-action-selector.json"

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--phase-next-action-selector",
                    "--write",
                    "--output",
                    evidence,
                    "--receipt",
                    receipt,
                    "--phase-next-action-selector-output",
                    status_path,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "waiting_for_queue_replenish_exact_gate")
            self.assertEqual(payload["phase_next_action_selector_path"], status_path)
            self.assertTrue((root / evidence).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertTrue((root / status_path).is_file())
            receipt_payload = json.loads((root / receipt).read_text(encoding="utf-8"))
            self.assertEqual(receipt_payload["schema"], "ghostclaw.a2a2a.phase_next_action_selector_receipt.v1")
            self.assertEqual(receipt_payload["selector_status"], "waiting_for_queue_replenish_exact_gate")
            self.assertEqual(receipt_payload["action_kind"], "queue_replenish_exact_gate")
            self.assertFalse(receipt_payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse(receipt_payload["external_actions_performed"]["worker_envelope_write"])
            self.assertFalse(target.exists())

    def test_current_next_gate_advance_moves_packet077_from_p143_to_p156_without_inbox_write(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet077_queue_replenish_current_gate(root)
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow next local task card",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            evidence = ".ghostclaw_runtime/a2a2a/evidence/P157-current-next-gate-advance.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P157-current-next-gate-advance.json"

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--current-next-gate-advance",
                    "--write",
                    "--output",
                    evidence,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "advanced_to_worker_envelope_exact_gate")
            self.assertEqual(
                payload["previous_exact_gate_phrase"],
                "APPROVE_A2A2A_P143_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY",
            )
            self.assertEqual(
                payload["next_exact_gate_phrase"],
                "APPROVE_A2A2A_P156_PACKET077_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
            )
            self.assertTrue((root / evidence).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertTrue((root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.before-p157-20260704.json").is_file())

            current = json.loads(
                (root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json").read_text(encoding="utf-8")
            )
            self.assertEqual(current["status"], "waiting_for_exact_worker_envelope_gate")
            self.assertEqual(
                current["current_next_gate"]["exact_phrase"],
                "APPROVE_A2A2A_P156_PACKET077_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
            )
            self.assertIn(
                "A2A2A-P156-PACKET077-WORKER-ENVELOPE-WRITE-GUARD-20260704.sh",
                current["command_preview"]["write_after_gate"],
            )
            self.assertNotIn(
                "A2A2A-P143-PACKET077-QUEUE-WRITE-CHECKSUM-GUARD-20260704.sh",
                current["command_preview"]["write_after_gate"],
            )
            receipt_payload = json.loads((root / receipt).read_text(encoding="utf-8"))
            self.assertEqual(receipt_payload["schema"], "ghostclaw.a2a2a.current_next_gate_advance_receipt.v1")
            self.assertFalse(receipt_payload["external_actions_performed"]["worker_envelope_write"])
            self.assertFalse(receipt_payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox/hermes").exists())
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox/kob").exists())

    def test_packet077_worker_envelope_execution_audit_verifies_p156_without_inbox_write(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet077_queue_replenish_current_gate(root)
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow next local task card",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--packet077-worker-envelope-gate", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--current-next-gate-advance", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--operator-action-card", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            evidence = ".ghostclaw_runtime/a2a2a/evidence/P159-execution-audit.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P159-execution-audit.json"

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet077-worker-envelope-execution-audit",
                    "--write",
                    "--output",
                    evidence,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_exact_p156_worker_envelope_write")
            self.assertEqual(payload["planned_write_count"], 2)
            self.assertEqual(payload["targets"], ["hermes", "kob"])
            self.assertEqual(payload["issues"], [])
            self.assertEqual(
                payload["command_after_exact_gate"],
                "bash .ghostclaw_runtime/a2a2a/commands/A2A2A-P156-PACKET077-WORKER-ENVELOPE-WRITE-GUARD-20260704.sh APPROVE_A2A2A_P156_PACKET077_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
            )
            self.assertTrue((root / evidence).is_file())
            self.assertTrue((root / receipt).is_file())
            receipt_payload = json.loads((root / receipt).read_text(encoding="utf-8"))
            self.assertEqual(receipt_payload["schema"], "ghostclaw.a2a2a.packet_worker_envelope_execution_audit_receipt.v1")
            self.assertFalse(receipt_payload["external_actions_performed"]["worker_envelope_write"])
            self.assertFalse(receipt_payload["external_actions_performed"]["queue_payload_execution"])
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox/hermes").exists())
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox/kob").exists())

    def test_packet077_post_write_ack_readiness_simulation_projects_next_ack_gate_without_inbox_write(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet077_queue_replenish_current_gate(root)
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow next local task card",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--packet077-worker-envelope-gate", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--current-next-gate-advance", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--operator-action-card", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            p159_evidence = ".ghostclaw_runtime/a2a2a/evidence/P159-execution-audit.json"
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet077-worker-envelope-execution-audit",
                    "--write",
                    "--output",
                    p159_evidence,
                    "--receipt",
                    ".ghostclaw_runtime/a2a2a/receipts/P159-execution-audit.json",
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            evidence = ".ghostclaw_runtime/a2a2a/evidence/P161-post-write-ack-readiness.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P161-post-write-ack-readiness.json"
            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet077-post-write-ack-readiness-simulation",
                    "--packet077-worker-envelope-execution-audit-output",
                    p159_evidence,
                    "--write",
                    "--output",
                    evidence,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.packet077_post_write_ack_readiness_simulation.v1")
            self.assertEqual(payload["status"], "ready_for_projected_packet077_ack_gate_after_p156")
            self.assertEqual(payload["selected_packet"], "packet_077")
            self.assertEqual(payload["projected_next_exact_gate"], "APPROVE_A2A2A_P162_PACKET077_LOCAL_ROLE_WORKER_ACK_ONLY")
            self.assertEqual(payload["projected_ack_status"], "waiting_for_role_worker_ack")
            self.assertEqual(payload["projected_worker_targets"], ["hermes", "kob"])
            self.assertEqual(payload["issues"], [])
            self.assertFalse(payload["actual_worker_envelopes_present_now"])
            self.assertFalse(payload["external_actions_performed"]["worker_envelope_write"])
            self.assertFalse(payload["external_actions_performed"]["role_worker_ack_write"])
            self.assertTrue((root / evidence).is_file())
            self.assertTrue((root / receipt).is_file())
            receipt_payload = json.loads((root / receipt).read_text(encoding="utf-8"))
            self.assertEqual(
                receipt_payload["schema"],
                "ghostclaw.a2a2a.packet077_post_write_ack_readiness_simulation_receipt.v1",
            )
            self.assertEqual(receipt_payload["projected_next_exact_gate"], "APPROVE_A2A2A_P162_PACKET077_LOCAL_ROLE_WORKER_ACK_ONLY")
            self.assertFalse(receipt_payload["external_actions_performed"]["worker_envelope_write"])
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox/hermes").exists())
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox/kob").exists())

    def test_packet077_ack_debug_after_p156_uses_ack_only_scope_not_worker_envelope_scope(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet077_queue_replenish_current_gate(root)
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow next local task card",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--packet077-worker-envelope-gate", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--current-next-gate-advance", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--operator-action-card", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            command = root / ".ghostclaw_runtime/a2a2a/commands/A2A2A-P156-PACKET077-WORKER-ENVELOPE-WRITE-GUARD-20260704.sh"
            subprocess.run(
                [
                    "bash",
                    str(command),
                    "APPROVE_A2A2A_P156_PACKET077_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--ack-debug"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_exact_ack_gate")
            self.assertEqual(payload["next_exact_gate"]["phrase"], "APPROVE_A2A2A_P162_PACKET077_LOCAL_ROLE_WORKER_ACK_ONLY")
            self.assertEqual(
                payload["next_exact_gate"]["allowed_scope"],
                "write local Hermes/KOB role-worker ACK receipts once for packet_077 inbox envelopes only",
            )
            self.assertIn("worker loop/start", payload["next_exact_gate"]["does_not_allow"])
            self.assertNotIn("write exactly two local packet_077 worker envelope files", payload["next_exact_gate"]["allowed_scope"])

    def test_packet077_post_ack_current_gate_complete_suppresses_stale_p156_gate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet077_queue_replenish_current_gate(root)
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow next local task card",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--packet077-worker-envelope-gate", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--current-next-gate-advance", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            command = root / ".ghostclaw_runtime/a2a2a/commands/A2A2A-P156-PACKET077-WORKER-ENVELOPE-WRITE-GUARD-20260704.sh"
            subprocess.run(
                [
                    "bash",
                    str(command),
                    "APPROVE_A2A2A_P156_PACKET077_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            for agent, packet in (
                ("hermes", ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_077_hermes_p156_20260704.json"),
                ("kob", ".ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_077_kob_p156_20260704.json"),
            ):
                subprocess.run(
                    [
                        "python3",
                        str(ROOT / "scripts/ghostclaw_a2a_role_worker.py"),
                        "--root",
                        str(root),
                        "--agent",
                        agent,
                        "--packet",
                        packet,
                        "--once",
                    ],
                    cwd=root,
                    check=True,
                    text=True,
                    capture_output=True,
                )

            evidence = ".ghostclaw_runtime/a2a2a/evidence/P164-post-ack-current-gate-complete.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P164-post-ack-current-gate-complete.json"
            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--post-ack-current-gate-complete",
                    "--write",
                    "--output",
                    evidence,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.post_ack_current_gate_complete.v1")
            self.assertEqual(payload["status"], "ack_gate_complete_next_ready_for_orchestrator_selection")
            self.assertEqual(payload["selected_packet"], "packet_077")
            self.assertEqual(payload["completed_exact_gate_phrase"], "APPROVE_A2A2A_P162_PACKET077_LOCAL_ROLE_WORKER_ACK_ONLY")
            self.assertEqual(payload["issues"], [])
            self.assertTrue((root / evidence).is_file())
            self.assertTrue((root / receipt).is_file())
            current_gate = json.loads((root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json").read_text(encoding="utf-8"))
            self.assertEqual(current_gate["status"], "p162_ack_gate_complete_next_ready_for_orchestrator_selection")

            compact = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--compact"],
                check=True,
                text=True,
                capture_output=True,
            )
            compact_payload = json.loads(compact.stdout)
            self.assertNotIn("current_gate_overlay", compact_payload)
            self.assertNotEqual(
                compact_payload["queue_drain"].get("recommended_next_gate_phrase"),
                "APPROVE_A2A2A_P156_PACKET077_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
            )

    def test_duplicate_packet077_p162_ack_gate_reports_completed_without_role_worker_commands(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_packet077_queue_replenish_current_gate(root)
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow next local task card",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": False,
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--packet077-worker-envelope-gate", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--current-next-gate-advance", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            command = root / ".ghostclaw_runtime/a2a2a/commands/A2A2A-P156-PACKET077-WORKER-ENVELOPE-WRITE-GUARD-20260704.sh"
            subprocess.run(
                [
                    "bash",
                    str(command),
                    "APPROVE_A2A2A_P156_PACKET077_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            for agent, packet in (
                ("hermes", ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_077_hermes_p156_20260704.json"),
                ("kob", ".ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_077_kob_p156_20260704.json"),
            ):
                subprocess.run(
                    [
                        "python3",
                        str(ROOT / "scripts/ghostclaw_a2a_role_worker.py"),
                        "--root",
                        str(root),
                        "--agent",
                        agent,
                        "--packet",
                        packet,
                        "--once",
                    ],
                    cwd=root,
                    check=True,
                    text=True,
                    capture_output=True,
                )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--post-ack-current-gate-complete",
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--check-ack-approval",
                    "APPROVE_A2A2A_P162_PACKET077_LOCAL_ROLE_WORKER_ACK_ONLY",
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "rejected_duplicate_ack_already_completed")
            self.assertEqual(
                payload["exact_gate_expected"],
                "APPROVE_A2A2A_P162_PACKET077_LOCAL_ROLE_WORKER_ACK_ONLY",
            )
            self.assertEqual(payload["selected_packet"], "packet_077")
            self.assertIn("role_worker_ack_already_completed", payload["issues"])
            self.assertEqual(payload["action_after_approval"]["combined_command"], None)
            self.assertEqual(payload["action_after_approval"]["commands"], {"hermes": None, "kob": None})

            ack_card = json.loads(
                (root / ".ghostclaw_runtime/a2a2a/status/role_worker_ack_action_card.json").read_text(
                    encoding="utf-8"
                )
            )
            self.assertEqual(ack_card["status"], "ack_gate_complete_no_action")
            self.assertIn("role_worker_ack_already_present", ack_card["issues"])

    def test_queue_drained_refresh_gate_prepares_packet078_without_queue_write(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {
                        "total": 0,
                        "would_dispatch": 0,
                        "would_gate": 0,
                        "observed": 0,
                    },
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow previous local task card",
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            output = ".ghostclaw_runtime/a2a2a/evidence/P167-refresh-gate.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P167-refresh-gate.json"

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--queue-drain-refresh-gate",
                    "--write",
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_exact_queue_refresh_gate")
            self.assertEqual(payload["exact_gate_phrase"], "APPROVE_A2A2A_P167_ACTIVE_FOCUS_QUEUE_REFRESH_WRITE_ONLY")
            self.assertEqual(payload["target_queue_path"], "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json")
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())

            current_gate = json.loads(
                (root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json").read_text(encoding="utf-8")
            )
            self.assertEqual(current_gate["status"], "waiting_for_exact_queue_refresh_gate")
            self.assertEqual(
                current_gate["current_next_gate"]["exact_phrase"],
                "APPROVE_A2A2A_P167_ACTIVE_FOCUS_QUEUE_REFRESH_WRITE_ONLY",
            )
            self.assertEqual(
                current_gate["selected_packet_path"],
                "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
            )

            preview = json.loads(
                (
                    root
                    / ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P167-PACKET078-QUEUE-REFRESH-PREVIEW-20260704.json"
                ).read_text(encoding="utf-8")
            )
            self.assertEqual(preview["id"], "packet_078")
            self.assertEqual(
                preview["write_gate_consumed"],
                "APPROVE_A2A2A_P167_ACTIVE_FOCUS_QUEUE_REFRESH_WRITE_ONLY",
            )

            compact = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--compact",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            compact_payload = json.loads(compact.stdout)
            self.assertEqual(compact_payload["queue_drain"]["status"], "queue_drained_waiting_for_current_exact_gate")
            self.assertEqual(
                compact_payload["queue_drain"]["recommended_next_gate_phrase"],
                "APPROVE_A2A2A_P167_ACTIVE_FOCUS_QUEUE_REFRESH_WRITE_ONLY",
            )

    def test_queue_drain_refresh_gate_status_validates_p167_without_queue_write(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {
                        "total": 0,
                        "would_dispatch": 0,
                        "would_gate": 0,
                        "observed": 0,
                    },
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow previous local task card",
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--queue-drain-refresh-gate",
                    "--write",
                    "--output",
                    ".ghostclaw_runtime/a2a2a/evidence/P167-refresh-gate.json",
                    "--receipt",
                    ".ghostclaw_runtime/a2a2a/receipts/P167-refresh-gate.json",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            output = ".ghostclaw_runtime/a2a2a/status/P168-refresh-gate-status.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P168-refresh-gate-status.json"

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--queue-drain-refresh-gate-status",
                    "--write",
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_exact_queue_refresh_gate")
            self.assertEqual(payload["exact_gate_phrase"], "APPROVE_A2A2A_P167_ACTIVE_FOCUS_QUEUE_REFRESH_WRITE_ONLY")
            self.assertEqual(payload["target_queue_path"], "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json")
            self.assertTrue(payload["target_queue_path_absent"])
            self.assertTrue(payload["checks"]["current_gate_matches_p167"])
            self.assertTrue(payload["checks"]["preview_checksum_matches_receipts"])
            self.assertTrue(payload["checks"]["exact_gate_matches_preview"])
            self.assertTrue(payload["checks"]["target_matches_preview"])
            self.assertTrue(payload["checks"]["command_contains_exact_gate"])
            self.assertTrue(payload["checks"]["command_contains_preview_sha256"])
            self.assertTrue(payload["checks"]["command_refuses_overwrite"])
            self.assertTrue(payload["checks"]["command_has_no_unsafe_tokens"])
            self.assertEqual(payload["issues"], [])
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())

    def test_queue_drain_refresh_team_handoff_surfaces_lanes_without_queue_write(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {
                        "total": 0,
                        "would_dispatch": 0,
                        "would_gate": 0,
                        "observed": 0,
                    },
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow previous local task card",
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--queue-drain-refresh-gate",
                    "--write",
                    "--output",
                    ".ghostclaw_runtime/a2a2a/evidence/P167-refresh-gate.json",
                    "--receipt",
                    ".ghostclaw_runtime/a2a2a/receipts/P167-refresh-gate.json",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            output = ".ghostclaw_runtime/a2a2a/status/P169-refresh-team-handoff.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P169-refresh-team-handoff.json"

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--queue-drain-refresh-team-handoff",
                    "--write",
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_operator_exact_gate_decision")
            self.assertEqual(payload["selected_packet"], "packet_078")
            self.assertEqual(payload["exact_gate_phrase"], "APPROVE_A2A2A_P167_ACTIVE_FOCUS_QUEUE_REFRESH_WRITE_ONLY")
            self.assertEqual(payload["target_queue_path"], "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json")
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())
            self.assertEqual(
                set(payload["lane_cards"]),
                {"Hermes_Commander", "Codex_Builder", "OpenCode_Reviewer", "Validator_Worker"},
            )
            self.assertEqual(payload["lane_cards"]["Hermes_Commander"]["status"], "waiting_for_exact_p167_gate")
            self.assertIn("must_not_self_approve", payload["lane_cards"]["Hermes_Commander"]["must_not"])
            self.assertEqual(payload["lane_cards"]["Codex_Builder"]["status"], "blocked_until_packet_078_exists")
            self.assertIn("do_not_write_worker_envelope", payload["lane_cards"]["Codex_Builder"]["must_not"])
            self.assertFalse(payload["lane_cards"]["OpenCode_Reviewer"]["mutation_allowed"])
            self.assertIn("inspect_p167_p168_artifacts", payload["lane_cards"]["OpenCode_Reviewer"]["allowed_now"])
            self.assertIn(
                "python3 scripts/ghostclaw_a2a_agent_orchestrator.py --queue-drain-refresh-gate-status",
                payload["lane_cards"]["Validator_Worker"]["validation_commands"],
            )
            self.assertEqual(payload["commands_after_exact_gate"]["write_packet_078"], payload["command_after_exact_gate"])
            self.assertEqual(payload["external_actions_performed"]["queue_file_write"], False)
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())

    def test_queue_drain_refresh_opencode_review_packet_is_read_only(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {
                        "total": 0,
                        "would_dispatch": 0,
                        "would_gate": 0,
                        "observed": 0,
                    },
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow previous local task card",
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--queue-drain-refresh-gate",
                    "--write",
                    "--output",
                    ".ghostclaw_runtime/a2a2a/evidence/P167-refresh-gate.json",
                    "--receipt",
                    ".ghostclaw_runtime/a2a2a/receipts/P167-refresh-gate.json",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--queue-drain-refresh-team-handoff",
                    "--write",
                    "--output",
                    ".ghostclaw_runtime/a2a2a/status/P169-refresh-team-handoff.json",
                    "--receipt",
                    ".ghostclaw_runtime/a2a2a/receipts/P169-refresh-team-handoff.json",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            output = ".ghostclaw_runtime/a2a2a/reviews/P170-opencode-review-packet.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P170-opencode-review-packet.json"

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--queue-drain-refresh-opencode-review",
                    "--write",
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_opencode_review")
            self.assertEqual(payload["review_worker"], "OpenCode_Reviewer")
            self.assertFalse(payload["mutation_allowed"])
            self.assertEqual(payload["selected_packet"], "packet_078")
            self.assertEqual(payload["exact_gate_phrase"], "APPROVE_A2A2A_P167_ACTIVE_FOCUS_QUEUE_REFRESH_WRITE_ONLY")
            self.assertTrue(payload["target_queue_path_absent"])
            self.assertIn(".ghostclaw_runtime/a2a2a/evidence/P167-refresh-gate.json", payload["review_targets"])
            self.assertIn(".ghostclaw_runtime/a2a2a/status/P169-refresh-team-handoff.json", payload["review_targets"])
            self.assertIn("verify_no_packet_078_written", payload["review_checklist"])
            self.assertIn("do_not_run_guard_command", payload["must_not"])
            self.assertIn("do_not_write_queue_packet", payload["must_not"])
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())

    def test_queue_drain_refresh_approval_check_accepts_only_exact_p167_without_write(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {
                        "total": 0,
                        "would_dispatch": 0,
                        "would_gate": 0,
                        "observed": 0,
                    },
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow previous local task card",
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--queue-drain-refresh-gate",
                    "--write",
                    "--output",
                    ".ghostclaw_runtime/a2a2a/evidence/P167-refresh-gate.json",
                    "--receipt",
                    ".ghostclaw_runtime/a2a2a/receipts/P167-refresh-gate.json",
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            wrong = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--check-queue-drain-refresh-approval",
                    "APPROVE_A2A2A_P167_WRONG",
                    "--write",
                    "--output",
                    ".ghostclaw_runtime/a2a2a/status/P171-wrong-approval.json",
                    "--receipt",
                    ".ghostclaw_runtime/a2a2a/receipts/P171-wrong-approval.json",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            wrong_payload = json.loads(wrong.stdout)
            self.assertEqual(wrong_payload["status"], "rejected_wrong_exact_gate")
            self.assertEqual(wrong_payload["command_after_exact_gate"], None)
            self.assertIn("approval_phrase_mismatch", wrong_payload["issues"])

            exact = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--check-queue-drain-refresh-approval",
                    "APPROVE_A2A2A_P167_ACTIVE_FOCUS_QUEUE_REFRESH_WRITE_ONLY",
                    "--write",
                    "--output",
                    ".ghostclaw_runtime/a2a2a/status/P171-exact-approval.json",
                    "--receipt",
                    ".ghostclaw_runtime/a2a2a/receipts/P171-exact-approval.json",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            exact_payload = json.loads(exact.stdout)
            self.assertEqual(exact_payload["status"], "accepted_exact_gate_command_ready")
            self.assertEqual(
                exact_payload["exact_gate_phrase"],
                "APPROVE_A2A2A_P167_ACTIVE_FOCUS_QUEUE_REFRESH_WRITE_ONLY",
            )
            self.assertEqual(exact_payload["issues"], [])
            self.assertIn("A2A2A-P167-PACKET078-QUEUE-REFRESH-WRITE-GUARD-20260704.sh", exact_payload["command_after_exact_gate"])
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_queue_drain_refresh_post_approval_simulation_projects_next_worker_gate_without_write(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {
                        "total": 0,
                        "would_dispatch": 0,
                        "would_gate": 0,
                        "observed": 0,
                    },
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow previous local task card",
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--queue-drain-refresh-gate",
                    "--write",
                    "--output",
                    ".ghostclaw_runtime/a2a2a/evidence/P167-refresh-gate.json",
                    "--receipt",
                    ".ghostclaw_runtime/a2a2a/receipts/P167-refresh-gate.json",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            output = ".ghostclaw_runtime/a2a2a/status/P172-post-approval-simulation.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P172-post-approval-simulation.json"

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--queue-drain-refresh-post-approval-simulation",
                    "--write",
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            target_path = "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json"
            self.assertEqual(payload["status"], "ready_for_post_p167_worker_envelope_gate")
            self.assertEqual(payload["selected_packet"], "packet_078")
            self.assertEqual(payload["target_queue_path"], target_path)
            self.assertFalse(payload["actual_target_queue_path_exists"])
            self.assertTrue(payload["simulated_target_queue_path_exists_after_p167"])
            self.assertEqual(payload["next_expected_gate_type"], "separate_packet078_worker_envelope_gate")
            self.assertIn("do_not_execute_guard_command", payload["must_not"])
            self.assertIn("do_not_write_packet_078", payload["must_not"])
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse((root / target_path).exists())
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())

    def test_packet078_transition_readiness_surfaces_p167_then_p173_without_write(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {
                        "total": 0,
                        "would_dispatch": 0,
                        "would_gate": 0,
                        "observed": 0,
                    },
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow previous local task card",
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--queue-drain-refresh-gate",
                    "--write",
                    "--output",
                    ".ghostclaw_runtime/a2a2a/evidence/P167-refresh-gate.json",
                    "--receipt",
                    ".ghostclaw_runtime/a2a2a/receipts/P167-refresh-gate.json",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            output = ".ghostclaw_runtime/a2a2a/status/P174-packet078-transition-readiness.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P174-packet078-transition-readiness.json"

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--packet078-transition-readiness",
                    "--write",
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            target_path = "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json"
            self.assertEqual(payload["status"], "ready_for_exact_p167_queue_write")
            self.assertEqual(payload["selected_packet"], "packet_078")
            self.assertEqual(payload["target_queue_path"], target_path)
            self.assertFalse(payload["actual_target_queue_path_exists"])
            self.assertEqual(payload["p172_status"], "ready_for_post_p167_worker_envelope_gate")
            self.assertEqual(payload["p173_preflight_status"], "blocked_or_not_ready")
            self.assertEqual(payload["p173_expected_blockers"], ["queue_packet_missing"])
            self.assertEqual(
                payload["exact_p167_phrase"],
                "APPROVE_A2A2A_P167_ACTIVE_FOCUS_QUEUE_REFRESH_WRITE_ONLY",
            )
            self.assertEqual(
                payload["post_p167_expected_worker_envelope_gate"],
                "APPROVE_A2A2A_P173_PACKET078_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
            )
            self.assertEqual(
                [step["id"] for step in payload["ordered_next_steps"]],
                ["consume_exact_p167", "rerun_p173_preflight", "open_exact_p173_if_ready"],
            )
            self.assertIn("do_not_execute_p167_guard", payload["must_not"])
            self.assertIn("do_not_write_packet_078", payload["must_not"])
            self.assertIn("do_not_write_worker_envelope", payload["must_not"])
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse(payload["external_actions_performed"]["worker_envelope_write"])
            self.assertFalse((root / target_path).exists())
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())

    def test_packet078_transition_opencode_review_is_read_only(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {
                        "total": 0,
                        "would_dispatch": 0,
                        "would_gate": 0,
                        "observed": 0,
                    },
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow previous local task card",
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--queue-drain-refresh-gate",
                    "--write",
                    "--output",
                    ".ghostclaw_runtime/a2a2a/evidence/P167-refresh-gate.json",
                    "--receipt",
                    ".ghostclaw_runtime/a2a2a/receipts/P167-refresh-gate.json",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--packet078-transition-readiness",
                    "--write",
                    "--output",
                    ".ghostclaw_runtime/a2a2a/status/P174-packet078-transition-readiness.json",
                    "--receipt",
                    ".ghostclaw_runtime/a2a2a/receipts/P174-packet078-transition-readiness.json",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            output = ".ghostclaw_runtime/a2a2a/reviews/P175-packet078-transition-opencode-review.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P175-packet078-transition-opencode-review.json"

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--packet078-transition-opencode-review",
                    "--write",
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_opencode_review")
            self.assertEqual(payload["review_worker"], "OpenCode_Reviewer")
            self.assertFalse(payload["mutation_allowed"])
            self.assertEqual(payload["selected_packet"], "packet_078")
            self.assertFalse(payload["target_queue_path_exists"])
            self.assertEqual(payload["p174_status"], "ready_for_exact_p167_queue_write")
            self.assertIn("verify_p174_orders_exact_p167_before_p173", payload["review_checklist"])
            self.assertIn("verify_packet_078_absent_before_exact_p167", payload["review_checklist"])
            self.assertIn("do_not_execute_p167_guard", payload["must_not"])
            self.assertIn("do_not_write_packet_078", payload["must_not"])
            self.assertIn("do_not_run_p173_guard", payload["must_not"])
            self.assertIn(".ghostclaw_runtime/a2a2a/status/P174-packet078-transition-readiness.json", payload["review_targets"])
            self.assertIn("reports/mission/A2A2A_P174_PACKET078_TRANSITION_READINESS_20260704.md", payload["review_targets"])
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse(payload["external_actions_performed"]["worker_envelope_write"])
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_packet078_opencode_review_result_intake_waits_then_accepts_read_only_pass(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {
                        "total": 0,
                        "would_dispatch": 0,
                        "would_gate": 0,
                        "observed": 0,
                    },
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow previous local task card",
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--queue-drain-refresh-gate",
                    "--write",
                    "--output",
                    ".ghostclaw_runtime/a2a2a/evidence/P167-refresh-gate.json",
                    "--receipt",
                    ".ghostclaw_runtime/a2a2a/receipts/P167-refresh-gate.json",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--packet078-transition-opencode-review",
                    "--write",
                    "--output",
                    ".ghostclaw_runtime/a2a2a/reviews/P175-packet078-transition-opencode-review.json",
                    "--receipt",
                    ".ghostclaw_runtime/a2a2a/receipts/P175-packet078-transition-opencode-review.json",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            output = ".ghostclaw_runtime/a2a2a/status/P176-opencode-review-result-intake.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P176-opencode-review-result-intake.json"
            result_path = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"

            waiting = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--packet078-opencode-review-result-intake",
                    "--packet078-opencode-review-result",
                    result_path,
                    "--write",
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            waiting_payload = json.loads(waiting.stdout)
            self.assertEqual(waiting_payload["status"], "waiting_for_opencode_review_result")
            self.assertFalse(waiting_payload["exact_p167_allowed_after_review"])
            self.assertIn("opencode_review_result_missing", waiting_payload["issues"])

            write_json(
                root / result_path,
                {
                    "schema": "ghostclaw.a2a2a.packet078_transition_opencode_review_result.v1",
                    "packet_id": "A2A2A-P175-PACKET078-TRANSITION-OPENCODE-REVIEW-20260704",
                    "status": "REVIEW_PASS_READY_FOR_EXACT_P167",
                    "review_worker": "OpenCode_Reviewer",
                    "mutation_allowed": False,
                    "target_queue_path_exists": False,
                    "blocking_issues": [],
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
                },
            )
            accepted = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--packet078-opencode-review-result-intake",
                    "--packet078-opencode-review-result",
                    result_path,
                    "--write",
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            accepted_payload = json.loads(accepted.stdout)
            self.assertEqual(accepted_payload["status"], "ready_to_surface_exact_p167_after_opencode_pass")
            self.assertTrue(accepted_payload["exact_p167_allowed_after_review"])
            self.assertEqual(
                accepted_payload["exact_p167_phrase"],
                "APPROVE_A2A2A_P167_ACTIVE_FOCUS_QUEUE_REFRESH_WRITE_ONLY",
            )
            self.assertFalse(accepted_payload["target_queue_path_exists"])
            self.assertEqual(accepted_payload["issues"], [])
            self.assertIn("do_not_execute_p167_guard", accepted_payload["must_not"])
            self.assertFalse(accepted_payload["external_actions_performed"]["queue_file_write"])
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_packet078_opencode_review_result_template_is_separate_from_real_result(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {
                        "total": 0,
                        "would_dispatch": 0,
                        "would_gate": 0,
                        "observed": 0,
                    },
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow previous local task card",
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--queue-drain-refresh-gate",
                    "--write",
                    "--output",
                    ".ghostclaw_runtime/a2a2a/evidence/P167-refresh-gate.json",
                    "--receipt",
                    ".ghostclaw_runtime/a2a2a/receipts/P167-refresh-gate.json",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            output = ".ghostclaw_runtime/a2a2a/reviews/P177-opencode-result-template.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P177-opencode-result-template.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--packet078-opencode-review-result-template",
                    "--packet078-opencode-review-result",
                    real_result,
                    "--write",
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_opencode_review_result_template")
            self.assertEqual(payload["template"]["status"], "REVIEW_PENDING_FILL_BY_OPENCODE")
            self.assertEqual(payload["template"]["review_worker"], "OpenCode_Reviewer")
            self.assertFalse(payload["template"]["mutation_allowed"])
            self.assertEqual(payload["template_result_path"], real_result)
            self.assertFalse(payload["writes_real_result_path"])
            self.assertFalse(payload["target_queue_path_exists"])
            self.assertIn("status", payload["required_fields"])
            self.assertIn("external_actions_performed", payload["required_fields"])
            self.assertIn("REVIEW_PASS_READY_FOR_EXACT_P167", payload["allowed_review_statuses"])
            self.assertIn("do_not_write_packet_078", payload["must_not"])
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse(payload["external_actions_performed"]["provider_call"])
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_packet078_opencode_handoff_capsule_points_to_template_and_intake(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {
                        "total": 0,
                        "would_dispatch": 0,
                        "would_gate": 0,
                        "observed": 0,
                    },
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow previous local task card",
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--queue-drain-refresh-gate",
                    "--write",
                    "--output",
                    ".ghostclaw_runtime/a2a2a/evidence/P167-refresh-gate.json",
                    "--receipt",
                    ".ghostclaw_runtime/a2a2a/receipts/P167-refresh-gate.json",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            output = ".ghostclaw_runtime/a2a2a/reviews/P178-opencode-handoff-capsule.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P178-opencode-handoff-capsule.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--packet078-opencode-review-handoff-capsule",
                    "--packet078-opencode-review-result",
                    real_result,
                    "--write",
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_opencode_review_handoff_capsule")
            self.assertEqual(payload["review_worker"], "OpenCode_Reviewer")
            self.assertFalse(payload["mutation_allowed"])
            self.assertEqual(payload["result_path_to_write_by_reviewer"], real_result)
            self.assertFalse(payload["writes_real_result_path"])
            self.assertFalse(payload["target_queue_path_exists"])
            self.assertIn("--packet078-opencode-review-result-intake", payload["post_review_intake_command"])
            self.assertIn(real_result, payload["post_review_intake_command"])
            self.assertIn("REVIEW_PASS_READY_FOR_EXACT_P167", payload["prompt"])
            self.assertIn("do_not_write_packet_078", payload["must_not"])
            self.assertIn("active_focus_only_sirinx_co_and_agm_autoflow", payload["review_checklist"])
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse(payload["external_actions_performed"]["provider_call"])
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_packet078_opencode_review_status_surface_keeps_p167_blocked_without_result(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {
                        "total": 0,
                        "would_dispatch": 0,
                        "would_gate": 0,
                        "observed": 0,
                    },
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow previous local task card",
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--queue-drain-refresh-gate",
                    "--write",
                    "--output",
                    ".ghostclaw_runtime/a2a2a/evidence/P167-refresh-gate.json",
                    "--receipt",
                    ".ghostclaw_runtime/a2a2a/receipts/P167-refresh-gate.json",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            output = ".ghostclaw_runtime/a2a2a/status/P179-opencode-review-status-surface.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P179-opencode-review-status-surface.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--packet078-opencode-review-status-surface",
                    "--packet078-opencode-review-result",
                    real_result,
                    "--write",
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "waiting_for_opencode_review_result")
            self.assertEqual(payload["selected_packet"], "packet_078")
            self.assertFalse(payload["exact_p167_allowed_after_review"])
            self.assertFalse(payload["target_queue_path_exists"])
            self.assertFalse(payload["real_review_result_exists"])
            self.assertEqual(payload["intake_status"], "waiting_for_opencode_review_result")
            self.assertEqual(payload["template_status"], "ready_for_opencode_review_result_template")
            self.assertEqual(payload["handoff_status"], "ready_for_opencode_review_handoff_capsule")
            self.assertIn("opencode_review_result_missing", payload["issues"])
            self.assertIn("OpenCode", payload["operator_surface"]["owner"])
            self.assertIn(real_result, payload["operator_surface"]["required_result_path"])
            self.assertIn("do_not_write_packet_078", payload["must_not"])
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse(payload["external_actions_performed"]["provider_call"])
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_packet078_p167_deferred_approval_escrow_records_hold_without_consuming_gate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {
                        "total": 0,
                        "would_dispatch": 0,
                        "would_gate": 0,
                        "observed": 0,
                    },
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow previous local task card",
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--queue-drain-refresh-gate",
                    "--write",
                    "--output",
                    ".ghostclaw_runtime/a2a2a/evidence/P167-refresh-gate.json",
                    "--receipt",
                    ".ghostclaw_runtime/a2a2a/receipts/P167-refresh-gate.json",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            output = ".ghostclaw_runtime/a2a2a/status/P180-p167-deferred-approval-escrow.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P180-p167-deferred-approval-escrow.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            approval = "APPROVE_A2A2A_P167_ACTIVE_FOCUS_QUEUE_REFRESH_WRITE_ONLY"

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--packet078-p167-deferred-approval-escrow",
                    "--packet078-opencode-review-result",
                    real_result,
                    "--approval",
                    approval,
                    "--write",
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "approval_accepted_pending_opencode_review")
            self.assertEqual(payload["approval_phrase"], approval)
            self.assertTrue(payload["approval_phrase_matches_p167"])
            self.assertFalse(payload["exact_p167_consumed"])
            self.assertFalse(payload["exact_p167_allowed_after_review"])
            self.assertIsNone(payload["command_to_execute_now"])
            self.assertEqual(payload["intake_status"], "waiting_for_opencode_review_result")
            self.assertIn("opencode_review_result_missing", payload["hold_reasons"])
            self.assertFalse(payload["target_queue_path_exists"])
            self.assertFalse(payload["real_review_result_exists"])
            self.assertIn("do_not_write_packet_078", payload["must_not"])
            self.assertFalse(payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse(payload["external_actions_performed"]["provider_call"])
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_packet078_p167_escrow_release_readiness_waits_then_surfaces_after_review_pass(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {
                        "total": 0,
                        "would_dispatch": 0,
                        "would_gate": 0,
                        "observed": 0,
                    },
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow previous local task card",
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--queue-drain-refresh-gate",
                    "--write",
                    "--output",
                    ".ghostclaw_runtime/a2a2a/evidence/P167-refresh-gate.json",
                    "--receipt",
                    ".ghostclaw_runtime/a2a2a/receipts/P167-refresh-gate.json",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            escrow = ".ghostclaw_runtime/a2a2a/status/P180-p167-deferred-approval-escrow.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            approval = "APPROVE_A2A2A_P167_ACTIVE_FOCUS_QUEUE_REFRESH_WRITE_ONLY"
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--packet078-p167-deferred-approval-escrow",
                    "--packet078-opencode-review-result",
                    real_result,
                    "--approval",
                    approval,
                    "--write",
                    "--output",
                    escrow,
                    "--receipt",
                    ".ghostclaw_runtime/a2a2a/receipts/P180-p167-deferred-approval-escrow.json",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            output = ".ghostclaw_runtime/a2a2a/status/P181-p167-escrow-release-readiness.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P181-p167-escrow-release-readiness.json"

            waiting = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--packet078-p167-escrow-release-readiness",
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-p167-deferred-approval",
                    escrow,
                    "--write",
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            waiting_payload = json.loads(waiting.stdout)
            self.assertEqual(waiting_payload["status"], "waiting_for_opencode_review_result")
            self.assertFalse(waiting_payload["exact_p167_ready_to_surface"])
            self.assertIsNone(waiting_payload["command_to_execute_now"])
            self.assertIn("opencode_review_result_missing", waiting_payload["hold_reasons"])

            write_json(
                root / real_result,
                {
                    "schema": "ghostclaw.a2a2a.packet078_transition_opencode_review_result.v1",
                    "packet_id": "A2A2A-P175-PACKET078-TRANSITION-OPENCODE-REVIEW-20260704",
                    "status": "REVIEW_PASS_READY_FOR_EXACT_P167",
                    "review_worker": "OpenCode_Reviewer",
                    "mutation_allowed": False,
                    "target_queue_path_exists": False,
                    "blocking_issues": [],
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
                },
            )
            ready = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--packet078-p167-escrow-release-readiness",
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-p167-deferred-approval",
                    escrow,
                    "--write",
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            ready_payload = json.loads(ready.stdout)
            self.assertEqual(ready_payload["status"], "ready_to_surface_escrowed_p167")
            self.assertTrue(ready_payload["exact_p167_ready_to_surface"])
            self.assertFalse(ready_payload["exact_p167_consumed"])
            self.assertIn("--check-queue-drain-refresh-approval", ready_payload["command_to_execute_now"])
            self.assertEqual(ready_payload["hold_reasons"], [])
            self.assertFalse(ready_payload["target_queue_path_exists"])
            self.assertIn("do_not_execute_p167_guard", ready_payload["must_not"])
            self.assertFalse(ready_payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse(ready_payload["external_actions_performed"]["provider_call"])
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_packet078_p167_release_watch_holds_then_surfaces_after_review_pass(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {
                        "total": 0,
                        "would_dispatch": 0,
                        "would_gate": 0,
                        "observed": 0,
                    },
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow previous local task card",
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--queue-drain-refresh-gate",
                    "--write",
                    "--output",
                    ".ghostclaw_runtime/a2a2a/evidence/P167-refresh-gate.json",
                    "--receipt",
                    ".ghostclaw_runtime/a2a2a/receipts/P167-refresh-gate.json",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            escrow = ".ghostclaw_runtime/a2a2a/status/P180-p167-deferred-approval-escrow.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--packet078-p167-deferred-approval-escrow",
                    "--packet078-opencode-review-result",
                    real_result,
                    "--approval",
                    "APPROVE_A2A2A_P167_ACTIVE_FOCUS_QUEUE_REFRESH_WRITE_ONLY",
                    "--write",
                    "--output",
                    escrow,
                    "--receipt",
                    ".ghostclaw_runtime/a2a2a/receipts/P180-p167-deferred-approval-escrow.json",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            output = ".ghostclaw_runtime/a2a2a/status/P182-p167-release-watch.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P182-p167-release-watch.json"

            waiting = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--packet078-p167-release-watch",
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-p167-deferred-approval",
                    escrow,
                    "--write",
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            waiting_payload = json.loads(waiting.stdout)
            self.assertEqual(waiting_payload["status"], "waiting_for_opencode_review_result")
            self.assertEqual(waiting_payload["gate_state"], "hold_for_opencode_review_result")
            self.assertFalse(waiting_payload["release_sequence_allowed"])
            self.assertFalse(waiting_payload["exact_p167_ready_to_surface"])
            self.assertFalse(waiting_payload["exact_p167_consumed"])
            self.assertIsNone(waiting_payload["command_to_execute_now"])
            self.assertIn("opencode_review_result_missing", waiting_payload["hold_reasons"])
            self.assertIn("--packet078-opencode-review-result-intake", waiting_payload["rerun_commands"]["after_opencode_result"])
            self.assertFalse(waiting_payload["external_actions_performed"]["queue_file_write"])
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

            write_json(
                root / real_result,
                {
                    "schema": "ghostclaw.a2a2a.packet078_transition_opencode_review_result.v1",
                    "packet_id": "A2A2A-P175-PACKET078-TRANSITION-OPENCODE-REVIEW-20260704",
                    "status": "REVIEW_PASS_READY_FOR_EXACT_P167",
                    "review_worker": "OpenCode_Reviewer",
                    "mutation_allowed": False,
                    "target_queue_path_exists": False,
                    "blocking_issues": [],
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
                },
            )
            ready = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--packet078-p167-release-watch",
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-p167-deferred-approval",
                    escrow,
                    "--write",
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            ready_payload = json.loads(ready.stdout)
            self.assertEqual(ready_payload["status"], "ready_to_surface_escrowed_p167")
            self.assertEqual(ready_payload["gate_state"], "ready_for_operator_p167_decision")
            self.assertTrue(ready_payload["release_sequence_allowed"])
            self.assertTrue(ready_payload["exact_p167_ready_to_surface"])
            self.assertFalse(ready_payload["exact_p167_consumed"])
            self.assertIn("--check-queue-drain-refresh-approval", ready_payload["command_to_execute_now"])
            self.assertEqual(ready_payload["hold_reasons"], [])
            self.assertFalse(ready_payload["target_queue_path_exists"])
            self.assertIn("do_not_execute_p167_guard", ready_payload["must_not"])
            self.assertFalse(ready_payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse(ready_payload["external_actions_performed"]["provider_call"])
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_compact_status_includes_packet078_release_watch_hold(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            escrow = ".ghostclaw_runtime/a2a2a/status/P180-p167-deferred-approval-escrow.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {
                        "total": 0,
                        "would_dispatch": 0,
                        "would_gate": 0,
                        "observed": 0,
                    },
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow previous local task card",
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            write_json(
                root / escrow,
                {
                    "schema": "ghostclaw.a2a2a.packet078_p167_deferred_approval_escrow.v1",
                    "packet_id": "A2A2A-P180-PACKET078-P167-DEFERRED-APPROVAL-ESCROW-20260704",
                    "status": "approval_accepted_pending_opencode_review",
                    "approval_phrase_matches_p167": True,
                    "exact_p167_consumed": False,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "target_queue_path_exists": False,
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--compact",
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-p167-deferred-approval",
                    escrow,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            watch = payload["packet078_release_watch"]
            self.assertEqual(watch["status"], "waiting_for_opencode_review_result")
            self.assertEqual(watch["gate_state"], "hold_for_opencode_review_result")
            self.assertFalse(watch["release_sequence_allowed"])
            self.assertFalse(watch["exact_p167_ready_to_surface"])
            self.assertFalse(watch["exact_p167_consumed"])
            self.assertIsNone(watch["command_to_execute_now"])
            self.assertIn("opencode_review_result_missing", watch["hold_reasons"])
            opencode_lane = payload["lane_next_actions"]["opencode_reviewer"]
            self.assertEqual(opencode_lane["next_action"], "write_packet078_review_result_read_only")
            self.assertEqual(opencode_lane["selected_packet"], "A2A2A-P182-PACKET078-P167-RELEASE-WATCH-20260704")
            self.assertFalse(opencode_lane["source_mutation_allowed_now"])
            self.assertFalse(payload["guardrails"]["provider_call"])

    def test_loop_harness_status_writes_only_status_surface_and_receipt(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_ready_loop_harness_artifacts(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--loop-harness-status", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            status_path = (
                root
                / ".ghostclaw_runtime/a2a2a/status/"
                / "A2A2A-P155-LOOP-HARNESS-STATUS-SURFACE-20260704.json"
            )
            receipt_path = (
                root
                / ".ghostclaw_runtime/a2a2a/receipts/"
                / "A2A2A-P155-LOOP-HARNESS-STATUS-SURFACE-20260704.json"
            )
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.loop_harness_status_surface.v1")
            self.assertEqual(payload["status"], "ready_for_opencode_review")
            self.assertEqual(payload["review_worker"], "OpenCode_Reviewer")
            self.assertFalse(payload["review_mutation_allowed"])
            self.assertEqual(payload["issues"], [])
            self.assertTrue(status_path.is_file())
            self.assertTrue(receipt_path.is_file())
            receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
            self.assertEqual(receipt["schema"], "ghostclaw.a2a2a.loop_harness_status_surface_receipt.v1")
            self.assertEqual(receipt["surface_status"], "ready_for_opencode_review")
            self.assertFalse(receipt["external_actions_performed"]["queue_payload_execution"])
            self.assertFalse(receipt["external_actions_performed"]["worker_execution"])
            self.assertFalse(receipt["external_actions_performed"]["provider_call"])

    def test_compact_status_includes_ready_loop_harness_review_surface(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_ready_loop_harness_artifacts(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--compact"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["quality_loop_plane"]["status"], "ready_for_opencode_review")
            self.assertEqual(payload["quality_loop_plane"]["review_worker"], "OpenCode_Reviewer")
            self.assertFalse(payload["quality_loop_plane"]["review_mutation_allowed"])
            opencode_lane = payload["lane_next_actions"]["opencode_reviewer"]
            self.assertEqual(opencode_lane["next_action"], "review_loop_harness_packet_read_only")
            self.assertEqual(
                opencode_lane["selected_packet"],
                "A2A2A-P155-LOOP-HARNESS-STATUS-SURFACE-20260704",
            )
            self.assertFalse(opencode_lane["source_mutation_allowed_now"])

    def test_compact_status_prioritizes_packet078_release_watch_when_p167_is_escrowed(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_ready_loop_harness_artifacts(root)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            escrow = ".ghostclaw_runtime/a2a2a/status/P180-p167-deferred-approval-escrow.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {
                        "total": 0,
                        "would_dispatch": 0,
                        "would_gate": 0,
                        "observed": 0,
                    },
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow previous local task card",
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            write_json(
                root / escrow,
                {
                    "schema": "ghostclaw.a2a2a.packet078_p167_deferred_approval_escrow.v1",
                    "packet_id": "A2A2A-P180-PACKET078-P167-DEFERRED-APPROVAL-ESCROW-20260704",
                    "status": "approval_accepted_pending_opencode_review",
                    "approval_phrase_matches_p167": True,
                    "exact_p167_consumed": False,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "target_queue_path_exists": False,
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--compact",
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-p167-deferred-approval",
                    escrow,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["quality_loop_plane"]["status"], "ready_for_opencode_review")
            self.assertEqual(payload["packet078_release_watch"]["status"], "waiting_for_opencode_review_result")
            opencode_lane = payload["lane_next_actions"]["opencode_reviewer"]
            self.assertEqual(opencode_lane["next_action"], "write_packet078_review_result_read_only")
            self.assertEqual(opencode_lane["selected_packet"], "A2A2A-P182-PACKET078-P167-RELEASE-WATCH-20260704")
            self.assertFalse(opencode_lane["source_mutation_allowed_now"])

    def test_compact_status_exposes_packet078_opencode_review_action_card(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            escrow = ".ghostclaw_runtime/a2a2a/status/P180-p167-deferred-approval-escrow.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {
                        "total": 0,
                        "would_dispatch": 0,
                        "would_gate": 0,
                        "observed": 0,
                    },
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow previous local task card",
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            write_json(
                root / escrow,
                {
                    "schema": "ghostclaw.a2a2a.packet078_p167_deferred_approval_escrow.v1",
                    "packet_id": "A2A2A-P180-PACKET078-P167-DEFERRED-APPROVAL-ESCROW-20260704",
                    "status": "approval_accepted_pending_opencode_review",
                    "approval_phrase_matches_p167": True,
                    "exact_p167_consumed": False,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "target_queue_path_exists": False,
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--compact",
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-p167-deferred-approval",
                    escrow,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            card = payload["opencode_review_action_card"]
            self.assertEqual(card["status"], "ready_for_opencode_review_handoff_capsule")
            self.assertEqual(card["review_worker"], "OpenCode_Reviewer")
            self.assertFalse(card["mutation_allowed"])
            self.assertEqual(card["selected_packet"], "packet_078")
            self.assertEqual(card["result_path_to_write_by_reviewer"], real_result)
            self.assertIn("p167_gate_ready_before_packet078", card["review_checklist"])
            self.assertIn("--packet078-opencode-review-result-intake", card["post_review_intake_command"])
            self.assertFalse(card["external_action_allowed"])
            self.assertFalse(card["source_mutation_allowed_now"])
            self.assertIn("do_not_write_packet_078", card["must_not"])

    def test_compact_status_prioritizes_packet078_candidate_call_when_candidate_missing(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            escrow = ".ghostclaw_runtime/a2a2a/status/P180-p167-deferred-approval-escrow.json"
            p187_status = ".ghostclaw_runtime/a2a2a/status/P187-candidate-call-status.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            candidate_result = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {
                        "total": 0,
                        "would_dispatch": 0,
                        "would_gate": 0,
                        "observed": 0,
                    },
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow previous local task card",
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )
            write_json(
                root / escrow,
                {
                    "schema": "ghostclaw.a2a2a.packet078_p167_deferred_approval_escrow.v1",
                    "packet_id": "A2A2A-P180-PACKET078-P167-DEFERRED-APPROVAL-ESCROW-20260704",
                    "status": "approval_accepted_pending_opencode_review",
                    "approval_phrase_matches_p167": True,
                    "exact_p167_consumed": False,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "target_queue_path_exists": False,
                },
            )
            write_json(
                root / p187_status,
                {
                    "schema": "ghostclaw.a2a2a.packet078_candidate_call_status.v1",
                    "packet_id": "A2A2A-P187-PACKET078-CANDIDATE-CALL-STATUS-20260704",
                    "status": "waiting_for_opencode_candidate",
                    "candidate_call_packet_path": ".ghostclaw_runtime/a2a2a/reviews/P186-call.json",
                    "candidate_prompt_path": ".ghostclaw_runtime/a2a2a/reviews/P186-prompt.txt",
                    "candidate_review_result_path": candidate_result,
                    "real_review_result_path": real_result,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "observed_state": {
                        "candidate_review_result_exists": False,
                        "real_review_result_exists": False,
                        "target_queue_path_exists": False,
                        "p173_guard_exists": False,
                    },
                    "p167_approval_handling": {
                        "consume_p167_now": False,
                        "approval_state": "escrowed_until_candidate_review_passes",
                    },
                    "next_safe_action": "OpenCode writes the candidate review result to the candidate path.",
                    "external_actions_performed": {
                        "candidate_review_result_write": False,
                        "real_review_result_write": False,
                        "queue_file_write": False,
                        "provider_call": False,
                        "push": False,
                        "deploy": False,
                    },
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--compact",
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-opencode-review-candidate",
                    candidate_result,
                    "--packet078-p167-deferred-approval",
                    escrow,
                    "--packet078-candidate-call-status",
                    p187_status,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            status = payload["opencode_candidate_call_status"]
            self.assertEqual(status["status"], "waiting_for_opencode_candidate")
            self.assertEqual(status["candidate_review_result_path"], candidate_result)
            self.assertEqual(status["real_review_result_path"], real_result)
            self.assertFalse(status["candidate_review_result_exists"])
            self.assertFalse(status["target_queue_path_exists"])
            opencode_lane = payload["lane_next_actions"]["opencode_reviewer"]
            self.assertEqual(opencode_lane["next_action"], "write_packet078_candidate_review_result_read_only")
            self.assertEqual(
                opencode_lane["selected_packet"],
                "A2A2A-P187-PACKET078-CANDIDATE-CALL-STATUS-20260704",
            )
            self.assertEqual(opencode_lane["candidate_review_result_path"], candidate_result)
            self.assertFalse(opencode_lane["source_mutation_allowed_now"])
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())
            self.assertFalse((root / real_result).exists())

    def test_compact_status_surfaces_packet078_candidate_poll_command_when_waiting(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            candidate_result = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            p187_status = ".ghostclaw_runtime/a2a2a/status/P187-candidate-call-status.json"
            p191_status = ".ghostclaw_runtime/a2a2a/status/P191-candidate-poll.json"
            write_json(
                root / dry_run_report,
                {
                    "schema": "ghostclaw.a2a2a.queue_coordinator.v1",
                    "repo": str(root),
                    "generated_at": "2026-07-04T00:00:00Z",
                    "dry_run": True,
                    "ranked_packets": [],
                    "packet_counts": {"total": 0, "would_dispatch": 0, "would_gate": 0, "observed": 0},
                    "status_counts": {"pending": 0},
                    "blocked_actions_preserved": {
                        "telegram_live_send": False,
                        "provider_call": False,
                        "push": False,
                        "deploy": False,
                    },
                },
            )
            write_json(
                root / p187_status,
                {
                    "schema": "ghostclaw.a2a2a.packet078_candidate_call_status.v1",
                    "packet_id": "A2A2A-P187-PACKET078-CANDIDATE-CALL-STATUS-20260704",
                    "status": "waiting_for_opencode_candidate",
                    "candidate_prompt_path": ".ghostclaw_runtime/a2a2a/reviews/P186-prompt.txt",
                    "candidate_review_result_path": candidate_result,
                    "real_review_result_path": real_result,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "next_safe_action": "OpenCode writes the candidate review result to the candidate path.",
                    "p167_approval_handling": {
                        "consume_p167_now": False,
                        "approval_state": "escrowed_until_candidate_review_passes",
                    },
                    "external_actions_performed": {
                        "candidate_review_result_write": False,
                        "real_review_result_write": False,
                        "queue_file_write": False,
                        "provider_call": False,
                    },
                },
            )
            write_json(
                root / p191_status,
                {
                    "schema": "ghostclaw.a2a2a.packet078_candidate_poll.v1",
                    "packet_id": "A2A2A-P191-PACKET078-CANDIDATE-POLL-20260704",
                    "status": "waiting_for_opencode_candidate",
                    "candidate_review_result_path": candidate_result,
                    "candidate_review_result_exists": False,
                    "candidate_ready_for_real_result_path": False,
                    "real_review_result_path": real_result,
                    "real_review_result_path_exists": False,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "target_queue_path_exists": False,
                    "p173_guard_exists": False,
                    "poll_attempts_observed": 1,
                    "next_safe_action": "OpenCode candidate is still missing; paste/run the P186 prompt in OpenCode, then rerun P190/P185.",
                    "external_actions_performed": {
                        "candidate_review_result_write": False,
                        "real_review_result_write": False,
                        "queue_file_write": False,
                        "provider_call": False,
                    },
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--compact",
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-opencode-review-candidate",
                    candidate_result,
                    "--packet078-candidate-call-status",
                    p187_status,
                    "--packet078-candidate-poll-status",
                    p191_status,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            poll_status = payload["opencode_candidate_poll_status"]
            self.assertEqual(poll_status["status"], "waiting_for_opencode_candidate")
            self.assertEqual(poll_status["poll_attempts_observed"], 1)
            self.assertIn("--packet078-candidate-poll", poll_status["candidate_poll_command"])
            opencode_lane = payload["lane_next_actions"]["opencode_reviewer"]
            self.assertEqual(opencode_lane["next_action"], "run_packet078_candidate_poll_then_p185")
            self.assertEqual(opencode_lane["selected_packet"], "A2A2A-P191-PACKET078-CANDIDATE-POLL-20260704")
            self.assertIn("--packet078-candidate-poll", opencode_lane["candidate_poll_command"])
            self.assertEqual(opencode_lane["candidate_review_result_path"], candidate_result)
            self.assertFalse(opencode_lane["source_mutation_allowed_now"])
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_compact_status_surfaces_packet078_watch_stall_stop_retry(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            candidate_result = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            p213_status = ".ghostclaw_runtime/a2a2a/status/P213-watch-stall-status.json"
            write_json(
                root / dry_run_report,
                {
                    "schema": "ghostclaw.a2a2a.queue_coordinator.v1",
                    "repo": str(root),
                    "generated_at": "2026-07-04T00:00:00Z",
                    "dry_run": True,
                    "ranked_packets": [],
                    "packet_counts": {"total": 0, "would_dispatch": 0, "would_gate": 0, "observed": 0},
                    "status_counts": {"pending": 0},
                    "blocked_actions_preserved": {
                        "telegram_live_send": False,
                        "provider_call": False,
                        "push": False,
                        "deploy": False,
                    },
                },
            )
            write_json(
                root / p213_status,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_watch_stall_status.v1",
                    "packet_id": "A2A2A-P213-PACKET078-OPENCODE-WATCH-STALL-STATUS-20260704",
                    "status": "manual_opencode_candidate_required_stop_local_retry",
                    "source_p207_watch_status": "waiting_for_opencode_candidate",
                    "source_p210_brief_status": "ready_for_operator_manual_paste",
                    "watch_attempts_used": 3,
                    "watch_attempts_configured": 3,
                    "watch_attempts_exhausted": True,
                    "candidate_review_result_path": candidate_result,
                    "candidate_review_result_exists": False,
                    "real_review_result_path": real_result,
                    "real_review_result_path_exists": False,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "target_queue_path_exists": False,
                    "p193_guard_exists": False,
                    "next_action": "manual_paste_p195_before_rerun_watch",
                    "operator_warning": "Do not rerun P207 blindly. The bounded watch exhausted without a P185 candidate.",
                    "next_safe_action": "Paste the P195 prompt into OpenCode manually, wait for OpenCode to write P185 only, then run the bounded P208/P207 watcher once.",
                    "commands_to_run": [
                        "bash .ghostclaw_runtime/a2a2a/commands/A2A2A-P208-PACKET078-OPENCODE-OPERATOR-HANDOFF-20260704.sh --copy"
                    ],
                    "external_actions_performed": {
                        "candidate_review_result_write": False,
                        "real_review_result_write": False,
                        "queue_file_write": False,
                        "provider_call": False,
                    },
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--compact",
                    "--packet078-opencode-watch-stall-status-input",
                    p213_status,
                    "--packet078-opencode-review-candidate",
                    candidate_result,
                    "--packet078-opencode-review-result",
                    real_result,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            status = payload["opencode_watch_stall_status"]
            self.assertEqual(status["status"], "manual_opencode_candidate_required_stop_local_retry")
            self.assertTrue(status["watch_attempts_exhausted"])
            self.assertEqual(status["next_action"], "manual_paste_p195_before_rerun_watch")
            self.assertFalse(status["candidate_review_result_exists"])
            opencode_lane = payload["lane_next_actions"]["opencode_reviewer"]
            self.assertEqual(opencode_lane["next_action"], "manual_paste_p195_before_rerun_watch")
            self.assertEqual(opencode_lane["selected_packet"], "A2A2A-P213-PACKET078-OPENCODE-WATCH-STALL-STATUS-20260704")
            self.assertEqual(opencode_lane["candidate_review_result_path"], candidate_result)
            self.assertFalse(opencode_lane["source_mutation_allowed_now"])
            self.assertIn("P195 prompt", payload["next_safe_action"])
            self.assertFalse((root / candidate_result).exists())
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_compact_status_holds_queue_refresh_when_watch_stall_blocks_packet078(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            current_gate = ".ghostclaw_runtime/a2a2a/status/current_next_gate.json"
            p213_status = ".ghostclaw_runtime/a2a2a/status/P213-watch-stall-status.json"
            candidate_result = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            write_json(
                root / dry_run_report,
                {
                    "schema": "ghostclaw.a2a2a.queue_coordinator.v1",
                    "repo": str(root),
                    "generated_at": "2026-07-04T00:00:00Z",
                    "dry_run": True,
                    "ranked_packets": [],
                    "packet_counts": {"total": 0, "would_dispatch": 0, "would_gate": 0, "observed": 0},
                    "status_counts": {"pending": 0},
                    "blocked_actions_preserved": {
                        "telegram_live_send": False,
                        "provider_call": False,
                        "push": False,
                        "deploy": False,
                    },
                },
            )
            write_json(
                root / current_gate,
                {
                    "schema": "ghostclaw.a2a2a.current_next_gate.v1",
                    "status": "waiting_for_exact_queue_refresh_gate",
                    "current_next_gate": {
                        "exact_phrase": "APPROVE_A2A2A_P167_ACTIVE_FOCUS_QUEUE_REFRESH_WRITE_ONLY",
                        "status": "waiting_for_exact_queue_refresh_gate",
                        "allowed_scope": "write one local A2A2A queue packet for active-focus sirinx.co and AGM AutoFlow only",
                    },
                    "current_orchestrator": {
                        "selected_packet": "packet_078",
                        "selected_packet_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    },
                },
            )
            write_json(
                root / p213_status,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_watch_stall_status.v1",
                    "packet_id": "A2A2A-P213-PACKET078-OPENCODE-WATCH-STALL-STATUS-20260704",
                    "status": "manual_opencode_candidate_required_stop_local_retry",
                    "watch_attempts_exhausted": True,
                    "candidate_review_result_path": candidate_result,
                    "candidate_review_result_exists": False,
                    "real_review_result_path": real_result,
                    "real_review_result_path_exists": False,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "target_queue_path_exists": False,
                    "p193_guard_exists": False,
                    "next_action": "manual_paste_p195_before_rerun_watch",
                    "next_safe_action": "Paste the P195 prompt into OpenCode manually, wait for OpenCode to write P185 only, then run the bounded P208/P207 watcher once.",
                    "commands_to_run": [
                        "bash .ghostclaw_runtime/a2a2a/commands/A2A2A-P208-PACKET078-OPENCODE-OPERATOR-HANDOFF-20260704.sh --copy"
                    ],
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--compact",
                    "--current-next-gate",
                    current_gate,
                    "--packet078-opencode-watch-stall-status-input",
                    p213_status,
                    "--packet078-opencode-review-candidate",
                    candidate_result,
                    "--packet078-opencode-review-result",
                    real_result,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            guard = payload["packet078_gate_conflict_guard"]
            self.assertEqual(guard["status"], "hold_queue_refresh_until_opencode_candidate")
            self.assertEqual(guard["blocked_gate"], "APPROVE_A2A2A_P167_ACTIVE_FOCUS_QUEUE_REFRESH_WRITE_ONLY")
            self.assertIn("opencode_candidate_missing", guard["hold_reasons"])
            self.assertFalse(guard["external_action_allowed"])
            self.assertEqual(
                payload["lane_next_actions"]["hermes_orchestrator"]["next_action"],
                "hold_packet078_queue_refresh_until_opencode_candidate",
            )
            self.assertEqual(
                payload["lane_next_actions"]["validator"]["next_action"],
                "hold_packet078_queue_refresh_until_opencode_candidate",
            )
            self.assertIn("Paste the P195 prompt", payload["queue_drain"]["next_safe_action"])
            self.assertFalse((root / candidate_result).exists())
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_compact_status_surfaces_packet078_manual_paste_pending_after_clipboard_receipt(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            candidate_result = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            p221_status = ".ghostclaw_runtime/a2a2a/status/P221-manual-paste-pending.json"
            write_json(
                root / dry_run_report,
                {
                    "schema": "ghostclaw.a2a2a.queue_coordinator.v1",
                    "repo": str(root),
                    "generated_at": "2026-07-04T00:00:00Z",
                    "dry_run": True,
                    "ranked_packets": [],
                    "packet_counts": {"total": 0, "would_dispatch": 0, "would_gate": 0, "observed": 0},
                    "status_counts": {"pending": 0},
                    "blocked_actions_preserved": {
                        "telegram_live_send": False,
                        "provider_call": False,
                        "push": False,
                        "deploy": False,
                    },
                },
            )
            write_json(
                root / p221_status,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_manual_paste_pending_status.v1",
                    "packet_id": "A2A2A-P221-PACKET078-OPENCODE-MANUAL-PASTE-PENDING-STATUS-20260704",
                    "status": "manual_paste_pending_after_receipted_clipboard_load",
                    "source_p220_status": "copied_to_local_clipboard_operator_must_paste_manually",
                    "source_p210_brief_status": "ready_for_operator_manual_paste",
                    "clipboard_receipt_valid": True,
                    "candidate_review_result_path": candidate_result,
                    "candidate_review_result_exists": False,
                    "real_review_result_path": real_result,
                    "real_review_result_path_exists": False,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "target_queue_path_exists": False,
                    "p193_guard_exists": False,
                    "commands_to_run": ["manual_paste_clipboard_into_opencode"],
                    "post_manual_paste_command": "bash .ghostclaw_runtime/a2a2a/commands/P208.sh --watch-after-paste",
                    "next_action": "paste_clipboard_into_opencode",
                    "next_safe_action": "Paste the clipboard contents into OpenCode manually. OpenCode must write only P185 candidate.",
                    "external_actions_performed": {
                        "opencode_paste": False,
                        "candidate_review_result_write": False,
                        "real_review_result_write": False,
                        "queue_file_write": False,
                        "provider_call": False,
                    },
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--compact",
                    "--packet078-opencode-manual-paste-pending-status-output",
                    p221_status,
                    "--packet078-opencode-review-candidate",
                    candidate_result,
                    "--packet078-opencode-review-result",
                    real_result,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            status = payload["opencode_manual_paste_pending_status"]
            self.assertEqual(status["status"], "manual_paste_pending_after_receipted_clipboard_load")
            self.assertTrue(status["clipboard_receipt_valid"])
            self.assertEqual(status["commands_to_run"], ["manual_paste_clipboard_into_opencode"])
            opencode_lane = payload["lane_next_actions"]["opencode_reviewer"]
            self.assertEqual(opencode_lane["next_action"], "paste_clipboard_into_opencode")
            self.assertEqual(opencode_lane["selected_packet"], "A2A2A-P221-PACKET078-OPENCODE-MANUAL-PASTE-PENDING-STATUS-20260704")
            self.assertEqual(opencode_lane["commands_to_run"], ["manual_paste_clipboard_into_opencode"])
            self.assertEqual(opencode_lane["post_manual_paste_command"], "bash .ghostclaw_runtime/a2a2a/commands/P208.sh --watch-after-paste")
            self.assertFalse(opencode_lane["source_mutation_allowed_now"])
            self.assertIn("OpenCode manually", payload["next_safe_action"])
            self.assertFalse((root / candidate_result).exists())
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_packet078_manual_paste_action_card_uses_p221_without_executing(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            candidate_result = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            p221_status = ".ghostclaw_runtime/a2a2a/status/P221-manual-paste-pending.json"
            output = ".ghostclaw_runtime/a2a2a/status/P223-manual-paste-action-card.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P223-manual-paste-action-card.json"
            write_json(
                root / p221_status,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_manual_paste_pending_status.v1",
                    "packet_id": "A2A2A-P221-PACKET078-OPENCODE-MANUAL-PASTE-PENDING-STATUS-20260704",
                    "status": "manual_paste_pending_after_receipted_clipboard_load",
                    "source_p220_status": "copied_to_local_clipboard_operator_must_paste_manually",
                    "clipboard_receipt_valid": True,
                    "candidate_review_result_path": candidate_result,
                    "candidate_review_result_exists": False,
                    "real_review_result_path": real_result,
                    "real_review_result_path_exists": False,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "target_queue_path_exists": False,
                    "p193_guard_exists": False,
                    "commands_to_run": ["manual_paste_clipboard_into_opencode"],
                    "post_manual_paste_command": "bash .ghostclaw_runtime/a2a2a/commands/P208.sh --watch-after-paste",
                    "next_action": "paste_clipboard_into_opencode",
                    "next_safe_action": "Paste the clipboard contents into OpenCode manually. OpenCode must write only P185 candidate.",
                    "external_actions_performed": {
                        "opencode_paste": False,
                        "candidate_review_result_write": False,
                        "real_review_result_write": False,
                        "queue_file_write": False,
                        "provider_call": False,
                    },
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-opencode-manual-paste-action-card",
                    "--packet078-opencode-manual-paste-pending-status-output",
                    p221_status,
                    "--packet078-opencode-review-candidate",
                    candidate_result,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-opencode-manual-paste-action-card-output",
                    output,
                    "--packet078-opencode-manual-paste-action-card-receipt-output",
                    receipt,
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.packet078_opencode_manual_paste_action_card.v1")
            self.assertEqual(payload["status"], "ready_for_operator_manual_opencode_paste")
            self.assertEqual(payload["commands_to_run"], ["manual_paste_clipboard_into_opencode"])
            self.assertEqual(payload["post_manual_paste_command"], "bash .ghostclaw_runtime/a2a2a/commands/P208.sh --watch-after-paste")
            self.assertIn("OpenCode", payload["telegram_safe_draft"])
            self.assertFalse(payload["external_actions_performed"]["opencode_paste"])
            self.assertFalse(payload["external_actions_performed"]["provider_call"])
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertFalse((root / candidate_result).exists())
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_compact_status_surfaces_packet078_manual_paste_action_card(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            candidate_result = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            p223_card = ".ghostclaw_runtime/a2a2a/status/P223-manual-paste-action-card.json"
            write_json(
                root / dry_run_report,
                {
                    "schema": "ghostclaw.a2a2a.queue_coordinator.v1",
                    "repo": str(root),
                    "generated_at": "2026-07-04T00:00:00Z",
                    "dry_run": True,
                    "ranked_packets": [],
                    "packet_counts": {"total": 0, "would_dispatch": 0, "would_gate": 0, "observed": 0},
                    "status_counts": {"pending": 0},
                    "blocked_actions_preserved": {
                        "telegram_live_send": False,
                        "provider_call": False,
                        "push": False,
                        "deploy": False,
                    },
                },
            )
            write_json(
                root / p223_card,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_manual_paste_action_card.v1",
                    "packet_id": "A2A2A-P223-PACKET078-OPENCODE-MANUAL-PASTE-ACTION-CARD-20260704",
                    "status": "ready_for_operator_manual_opencode_paste",
                    "source_p221_status": "manual_paste_pending_after_receipted_clipboard_load",
                    "clipboard_receipt_valid": True,
                    "candidate_review_result_path": candidate_result,
                    "candidate_review_result_exists": False,
                    "real_review_result_path": real_result,
                    "real_review_result_path_exists": False,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "target_queue_path_exists": False,
                    "p193_guard_exists": False,
                    "commands_to_run": ["manual_paste_clipboard_into_opencode"],
                    "post_manual_paste_command": "bash .ghostclaw_runtime/a2a2a/commands/P208.sh --watch-after-paste",
                    "next_action": "paste_clipboard_into_opencode",
                    "next_safe_action": "Operator manually pastes clipboard into OpenCode; OpenCode must write only P185 candidate.",
                    "telegram_safe_draft": "P223 packet_078 OpenCode manual paste action card",
                    "external_actions_performed": {
                        "opencode_paste": False,
                        "candidate_review_result_write": False,
                        "real_review_result_write": False,
                        "queue_file_write": False,
                        "provider_call": False,
                    },
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--compact",
                    "--packet078-opencode-manual-paste-action-card-output",
                    p223_card,
                    "--packet078-opencode-review-candidate",
                    candidate_result,
                    "--packet078-opencode-review-result",
                    real_result,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            card = payload["opencode_manual_paste_action_card"]
            self.assertEqual(card["status"], "ready_for_operator_manual_opencode_paste")
            self.assertEqual(card["commands_to_run"], ["manual_paste_clipboard_into_opencode"])
            opencode_lane = payload["lane_next_actions"]["opencode_reviewer"]
            self.assertEqual(opencode_lane["next_action"], "paste_clipboard_into_opencode")
            self.assertEqual(opencode_lane["selected_packet"], "A2A2A-P223-PACKET078-OPENCODE-MANUAL-PASTE-ACTION-CARD-20260704")
            self.assertEqual(opencode_lane["commands_to_run"], ["manual_paste_clipboard_into_opencode"])
            self.assertEqual(opencode_lane["post_manual_paste_command"], "bash .ghostclaw_runtime/a2a2a/commands/P208.sh --watch-after-paste")
            self.assertFalse(opencode_lane["source_mutation_allowed_now"])
            self.assertIn("OpenCode", payload["next_safe_action"])
            self.assertFalse((root / candidate_result).exists())
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_packet078_post_p185_accelerator_routes_missing_and_arrived_candidate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            preflight = ".ghostclaw_runtime/a2a2a/status/P185-candidate-preflight.json"
            p223_card = ".ghostclaw_runtime/a2a2a/status/P223-manual-paste-action-card.json"
            output = ".ghostclaw_runtime/a2a2a/status/P225-post-p185-accelerator.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P225-post-p185-accelerator.json"
            write_json(
                root / p223_card,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_manual_paste_action_card.v1",
                    "packet_id": "A2A2A-P223-PACKET078-OPENCODE-MANUAL-PASTE-ACTION-CARD-20260704",
                    "status": "ready_for_operator_manual_opencode_paste",
                    "commands_to_run": ["manual_paste_clipboard_into_opencode"],
                    "post_manual_paste_command": "bash .ghostclaw_runtime/a2a2a/commands/P208.sh --watch-after-paste",
                    "next_action": "paste_clipboard_into_opencode",
                    "next_safe_action": "Operator manually pastes clipboard into OpenCode; OpenCode must write only P185 candidate.",
                    "external_actions_performed": {
                        "opencode_paste": False,
                        "candidate_review_result_write": False,
                        "real_review_result_write": False,
                        "queue_file_write": False,
                        "provider_call": False,
                    },
                },
            )

            waiting = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-post-p185-accelerator-status",
                    "--packet078-opencode-manual-paste-action-card-output",
                    p223_card,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-candidate-preflight-output",
                    preflight,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-post-p185-accelerator-status-output",
                    output,
                    "--packet078-post-p185-accelerator-status-receipt-output",
                    receipt,
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            waiting_payload = json.loads(waiting.stdout)
            self.assertEqual(waiting_payload["schema"], "ghostclaw.a2a2a.packet078_post_p185_accelerator_status.v1")
            self.assertEqual(waiting_payload["status"], "waiting_for_manual_opencode_paste")
            self.assertEqual(waiting_payload["next_action"], "paste_clipboard_into_opencode")
            self.assertEqual(waiting_payload["commands_to_run"], ["manual_paste_clipboard_into_opencode"])
            self.assertFalse(waiting_payload["candidate_review_result_exists"])
            self.assertFalse(waiting_payload["external_actions_performed"]["candidate_review_result_write"])
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())

            write_json(
                root / candidate,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_review_candidate_result.v1",
                    "packet_id": "A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-20260704",
                    "status": "REVIEW_PASS_READY_FOR_EXACT_P167",
                    "review_worker": "OpenCode_Reviewer",
                    "mutation_allowed": False,
                    "target_queue_path_exists": False,
                    "blocking_issues": [],
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
                },
            )
            arrived = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-post-p185-accelerator-status",
                    "--packet078-opencode-manual-paste-action-card-output",
                    p223_card,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-candidate-preflight-output",
                    preflight,
                    "--packet078-opencode-review-result",
                    real_result,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            arrived_payload = json.loads(arrived.stdout)
            self.assertEqual(arrived_payload["status"], "candidate_arrived_run_preflight")
            self.assertEqual(arrived_payload["next_action"], "run_p185_candidate_preflight")
            self.assertIn("--packet078-opencode-review-candidate-preflight", arrived_payload["commands_to_run"][0])
            self.assertFalse(arrived_payload["p193_guard_write_allowed_now"])
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_compact_status_surfaces_packet078_post_p185_accelerator(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            p225_status = ".ghostclaw_runtime/a2a2a/status/P225-post-p185-accelerator.json"
            write_json(
                root / dry_run_report,
                {
                    "schema": "ghostclaw.a2a2a.queue_coordinator.v1",
                    "repo": str(root),
                    "generated_at": "2026-07-04T00:00:00Z",
                    "dry_run": True,
                    "ranked_packets": [],
                    "packet_counts": {"total": 0, "would_dispatch": 0, "would_gate": 0, "observed": 0},
                    "status_counts": {"pending": 0},
                    "blocked_actions_preserved": {
                        "telegram_live_send": False,
                        "provider_call": False,
                        "push": False,
                        "deploy": False,
                    },
                },
            )
            write_json(
                root / p225_status,
                {
                    "schema": "ghostclaw.a2a2a.packet078_post_p185_accelerator_status.v1",
                    "packet_id": "A2A2A-P225-PACKET078-POST-P185-ACCELERATOR-STATUS-20260704",
                    "status": "waiting_for_manual_opencode_paste",
                    "source_p223_status": "ready_for_operator_manual_opencode_paste",
                    "candidate_review_result_path": candidate,
                    "candidate_review_result_exists": False,
                    "candidate_preflight_status": "waiting_for_candidate_review_result",
                    "candidate_ready_for_real_result_path": False,
                    "real_review_result_path": real_result,
                    "real_review_result_path_exists": False,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "target_queue_path_exists": False,
                    "p193_guard_exists": False,
                    "p193_guard_write_allowed_now": False,
                    "commands_to_run": ["manual_paste_clipboard_into_opencode"],
                    "next_action": "paste_clipboard_into_opencode",
                    "next_safe_action": "Operator manually pastes clipboard into OpenCode; OpenCode must write only P185 candidate.",
                    "external_actions_performed": {
                        "opencode_paste": False,
                        "candidate_review_result_write": False,
                        "real_review_result_write": False,
                        "queue_file_write": False,
                        "p193_guard_write": False,
                        "provider_call": False,
                    },
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--compact",
                    "--packet078-post-p185-accelerator-status-output",
                    p225_status,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            status = payload["post_p185_accelerator_status"]
            self.assertEqual(status["status"], "waiting_for_manual_opencode_paste")
            self.assertFalse(status["candidate_review_result_exists"])
            self.assertFalse(status["p193_guard_write_allowed_now"])
            opencode_lane = payload["lane_next_actions"]["opencode_reviewer"]
            self.assertEqual(opencode_lane["next_action"], "paste_clipboard_into_opencode")
            self.assertEqual(opencode_lane["selected_packet"], "A2A2A-P225-PACKET078-POST-P185-ACCELERATOR-STATUS-20260704")
            self.assertEqual(opencode_lane["commands_to_run"], ["manual_paste_clipboard_into_opencode"])
            self.assertFalse(opencode_lane["source_mutation_allowed_now"])
            self.assertIn("OpenCode", payload["next_safe_action"])
            self.assertFalse((root / candidate).exists())
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_compact_status_surfaces_packet078_clipboard_freshness_guard(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            p227_status = ".ghostclaw_runtime/a2a2a/status/P227-clipboard-freshness-guard.json"
            write_json(
                root / dry_run_report,
                {
                    "schema": "ghostclaw.a2a2a.queue_coordinator.v1",
                    "repo": str(root),
                    "generated_at": "2026-07-04T00:00:00Z",
                    "dry_run": True,
                    "ranked_packets": [],
                    "packet_counts": {"total": 0, "would_dispatch": 0, "would_gate": 0, "observed": 0},
                    "status_counts": {"pending": 0},
                    "blocked_actions_preserved": {
                        "telegram_live_send": False,
                        "provider_call": False,
                        "push": False,
                        "deploy": False,
                    },
                },
            )
            write_json(
                root / p227_status,
                {
                    "schema": "ghostclaw.a2a2a.packet078_clipboard_freshness_guard.v1",
                    "packet_id": "A2A2A-P227-PACKET078-CLIPBOARD-FRESHNESS-GUARD-20260704",
                    "status": "clipboard_receipt_fresh_manual_paste_ready",
                    "selected_packet": "packet_078",
                    "prompt_sha256_matches_p220": True,
                    "clipboard_receipt_age_seconds": 30,
                    "clipboard_max_age_seconds": 3600,
                    "clipboard_read_performed": False,
                    "candidate_review_result_path": candidate,
                    "candidate_review_result_exists": False,
                    "commands_to_run": ["manual_paste_clipboard_into_opencode"],
                    "next_action": "paste_clipboard_into_opencode",
                    "next_safe_action": "P220 receipt still matches P195 prompt. Operator may manually paste the current clipboard into OpenCode.",
                    "issues": [],
                    "external_actions_performed": {
                        "clipboard_read": False,
                        "opencode_paste": False,
                        "candidate_review_result_write": False,
                        "real_review_result_write": False,
                        "queue_file_write": False,
                        "p193_guard_write": False,
                        "provider_call": False,
                    },
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--compact",
                    "--packet078-clipboard-freshness-guard-output",
                    p227_status,
                    "--packet078-opencode-review-candidate",
                    candidate,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            status = payload["clipboard_freshness_guard"]
            self.assertEqual(status["status"], "clipboard_receipt_fresh_manual_paste_ready")
            self.assertTrue(status["prompt_sha256_matches_p220"])
            self.assertFalse(status["clipboard_read_performed"])
            opencode_lane = payload["lane_next_actions"]["opencode_reviewer"]
            self.assertEqual(opencode_lane["next_action"], "paste_clipboard_into_opencode")
            self.assertEqual(opencode_lane["selected_packet"], "A2A2A-P227-PACKET078-CLIPBOARD-FRESHNESS-GUARD-20260704")
            self.assertEqual(opencode_lane["commands_to_run"], ["manual_paste_clipboard_into_opencode"])
            self.assertFalse(opencode_lane["source_mutation_allowed_now"])
            self.assertFalse(payload["source_mutation_allowed_now"])
            self.assertFalse((root / candidate).exists())

    def test_packet078_opencode_review_candidate_preflight_waits_then_accepts_candidate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            output = ".ghostclaw_runtime/a2a2a/status/P185-candidate-preflight.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P185-candidate-preflight.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {
                        "total": 0,
                        "would_dispatch": 0,
                        "would_gate": 0,
                        "observed": 0,
                    },
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / "_A2A_QUEUE/outbox/packet_077_sirinx_agm_next_local_task_card.json",
                {
                    "id": "packet_077",
                    "title": "sirinx.co and AGM AutoFlow previous local task card",
                    "active_focus": ["sirinx.co", "AGM AutoFlow"],
                },
            )

            waiting = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--packet078-opencode-review-candidate-preflight",
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--write",
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            waiting_payload = json.loads(waiting.stdout)
            self.assertEqual(waiting_payload["status"], "waiting_for_candidate_review_result")
            self.assertFalse(waiting_payload["candidate_ready_for_real_result_path"])
            self.assertIn("candidate_review_result_missing", waiting_payload["issues"])
            self.assertFalse(waiting_payload["real_review_result_path_exists"])
            self.assertFalse(waiting_payload["external_actions_performed"]["review_result_write"])
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

            write_json(
                root / candidate,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_review_candidate_result.v1",
                    "packet_id": "A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-20260704",
                    "status": "REVIEW_PASS_READY_FOR_EXACT_P167",
                    "review_worker": "OpenCode_Reviewer",
                    "mutation_allowed": False,
                    "target_queue_path_exists": False,
                    "blocking_issues": [],
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
                },
            )
            ready = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--packet078-opencode-review-candidate-preflight",
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--write",
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            ready_payload = json.loads(ready.stdout)
            self.assertEqual(ready_payload["status"], "candidate_ready_for_real_result_path")
            self.assertTrue(ready_payload["candidate_ready_for_real_result_path"])
            self.assertEqual(ready_payload["issues"], [])
            self.assertFalse(ready_payload["real_review_result_path_exists"])
            self.assertTrue(ready_payload["copy_to_real_result_requires_exact_gate"])
            self.assertIn("--packet078-opencode-review-result-intake", ready_payload["post_copy_intake_command"])
            self.assertFalse(ready_payload["external_actions_performed"]["review_result_write"])
            self.assertFalse(ready_payload["external_actions_performed"]["queue_file_write"])
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_packet078_opencode_review_candidate_preflight_rejects_real_result_schema_in_candidate_path(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            output = ".ghostclaw_runtime/a2a2a/status/P185-candidate-preflight.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P185-candidate-preflight.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {
                        "total": 0,
                        "would_dispatch": 0,
                        "would_gate": 0,
                        "observed": 0,
                    },
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / candidate,
                {
                    "schema": "ghostclaw.a2a2a.packet078_transition_opencode_review_result.v1",
                    "packet_id": "A2A2A-P175-PACKET078-TRANSITION-OPENCODE-REVIEW-20260704",
                    "status": "REVIEW_PASS_READY_FOR_EXACT_P167",
                    "review_worker": "OpenCode_Reviewer",
                    "mutation_allowed": False,
                    "target_queue_path_exists": False,
                    "blocking_issues": [],
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
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--packet078-opencode-review-candidate-preflight",
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--write",
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "blocked_or_not_ready")
            self.assertFalse(payload["candidate_ready_for_real_result_path"])
            self.assertIn("candidate_schema_is_real_review_result", payload["issues"])
            self.assertIn("candidate_packet_id_is_real_review_result", payload["issues"])
            self.assertIsNone(payload["copy_to_real_result_command_preview"])
            self.assertFalse(payload["external_actions_performed"]["review_result_write"])
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_packet078_opencode_review_candidate_preflight_rejects_unfilled_template(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            output = ".ghostclaw_runtime/a2a2a/status/P185-candidate-preflight.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P185-candidate-preflight.json"
            write_json(
                root / dry_run_report,
                {
                    "dry_run": True,
                    "packet_counts": {
                        "total": 0,
                        "would_dispatch": 0,
                        "would_gate": 0,
                        "observed": 0,
                    },
                    "would_dispatch": [],
                    "would_gate": [],
                    "observed": [],
                },
            )
            write_json(
                root / candidate,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_review_candidate_result.v1",
                    "packet_id": "A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-20260704",
                    "status": "REVIEW_PENDING_FILL_BY_OPENCODE",
                    "review_worker": "OpenCode_Reviewer",
                    "mutation_allowed": False,
                    "target_queue_path_exists": False,
                    "blocking_issues": [],
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
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--packet078-opencode-review-candidate-preflight",
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--write",
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "blocked_or_not_ready")
            self.assertFalse(payload["candidate_ready_for_real_result_path"])
            self.assertIn(
                "candidate_review_result_not_pass:REVIEW_PENDING_FILL_BY_OPENCODE",
                payload["issues"],
            )
            self.assertIsNone(payload["copy_to_real_result_command_preview"])
            self.assertFalse(payload["external_actions_performed"]["review_result_write"])
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_packet078_candidate_watch_waits_then_surfaces_exact_real_result_gate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            p187_status = ".ghostclaw_runtime/a2a2a/status/P187-candidate-call-status.json"
            output = ".ghostclaw_runtime/a2a2a/status/P190-candidate-watch.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P190-candidate-watch.json"
            write_json(
                root / p187_status,
                {
                    "schema": "ghostclaw.a2a2a.packet078_candidate_call_status.v1",
                    "packet_id": "A2A2A-P187-PACKET078-CANDIDATE-CALL-STATUS-20260704",
                    "status": "waiting_for_opencode_candidate",
                    "candidate_review_result_path": candidate,
                    "real_review_result_path": real_result,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "p167_approval_handling": {
                        "consume_p167_now": False,
                        "approval_state": "escrowed_until_candidate_review_passes",
                    },
                    "external_actions_performed": {
                        "candidate_review_result_write": False,
                        "real_review_result_write": False,
                        "queue_file_write": False,
                        "provider_call": False,
                    },
                },
            )

            waiting = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-candidate-watch",
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-candidate-call-status",
                    p187_status,
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            waiting_payload = json.loads(waiting.stdout)
            self.assertEqual(waiting_payload["status"], "waiting_for_opencode_candidate")
            self.assertFalse(waiting_payload["candidate_ready_for_real_result_path"])
            self.assertFalse(waiting_payload["candidate_review_result_exists"])
            self.assertIn("candidate_review_result_missing", waiting_payload["issues"])
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())

            write_json(
                root / candidate,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_review_result.v1",
                    "review_worker": "OpenCode_Reviewer",
                    "status": "REVIEW_PASS_READY_FOR_EXACT_P167",
                    "mutation_allowed": False,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "target_queue_path_exists": False,
                    "blocking_issues": [],
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
                },
            )
            ready = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-candidate-watch",
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-candidate-call-status",
                    p187_status,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            ready_payload = json.loads(ready.stdout)
            self.assertEqual(ready_payload["status"], "candidate_ready_for_exact_real_result_gate")
            self.assertTrue(ready_payload["candidate_ready_for_real_result_path"])
            self.assertTrue(ready_payload["candidate_review_result_exists"])
            self.assertFalse(ready_payload["real_review_result_path_exists"])
            self.assertFalse(ready_payload["target_queue_path_exists"])
            self.assertEqual(ready_payload["issues"], [])
            self.assertIn("separate exact gate", ready_payload["next_safe_action"])
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_packet078_candidate_copy_gate_waits_then_prepares_checksum_guard_after_candidate_ready(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            output = ".ghostclaw_runtime/a2a2a/status/P193-candidate-copy-gate.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P193-candidate-copy-gate.json"
            command = ".ghostclaw_runtime/a2a2a/commands/P193-candidate-copy-gate.sh"

            waiting = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-candidate-copy-gate",
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-candidate-copy-command-output",
                    command,
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            waiting_payload = json.loads(waiting.stdout)
            self.assertEqual(waiting_payload["status"], "waiting_for_opencode_candidate")
            self.assertFalse(waiting_payload["candidate_ready_for_real_result_path"])
            self.assertIsNone(waiting_payload["command_path"])
            self.assertIn("candidate_review_result_missing", waiting_payload["issues"])
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertFalse((root / command).exists())

            write_json(
                root / candidate,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_review_result.v1",
                    "review_worker": "OpenCode_Reviewer",
                    "status": "REVIEW_PASS_READY_FOR_EXACT_P167",
                    "mutation_allowed": False,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "target_queue_path_exists": False,
                    "blocking_issues": [],
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
                },
            )
            ready = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-candidate-copy-gate",
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-candidate-copy-command-output",
                    command,
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            ready_payload = json.loads(ready.stdout)
            self.assertEqual(ready_payload["status"], "ready_for_exact_candidate_copy_gate")
            self.assertTrue(ready_payload["candidate_ready_for_real_result_path"])
            self.assertIsNotNone(ready_payload["candidate_sha256"])
            self.assertEqual(ready_payload["command_path"], command)
            self.assertIn(ready_payload["exact_gate_phrase"], ready_payload["command_after_exact_gate"])
            self.assertTrue((root / command).is_file())
            command_text = (root / command).read_text(encoding="utf-8")
            self.assertIn(ready_payload["exact_gate_phrase"], command_text)
            self.assertIn(ready_payload["candidate_sha256"], command_text)
            self.assertIn("shasum -a 256", command_text)
            self.assertFalse(ready_payload["external_actions_performed"]["real_review_result_write"])
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_packet078_candidate_poll_attempts_once_and_reports_ready_after_candidate_arrives(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            p187_status = ".ghostclaw_runtime/a2a2a/status/P187-candidate-call-status.json"
            output = ".ghostclaw_runtime/a2a2a/status/P191-candidate-poll.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P191-candidate-poll.json"
            write_json(
                root / p187_status,
                {
                    "schema": "ghostclaw.a2a2a.packet078_candidate_call_status.v1",
                    "packet_id": "A2A2A-P187-PACKET078-CANDIDATE-CALL-STATUS-20260704",
                    "status": "waiting_for_opencode_candidate",
                    "candidate_review_result_path": candidate,
                    "real_review_result_path": real_result,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "p167_approval_handling": {
                        "consume_p167_now": False,
                        "approval_state": "escrowed_until_candidate_review_passes",
                    },
                    "external_actions_performed": {
                        "candidate_review_result_write": False,
                        "real_review_result_write": False,
                        "queue_file_write": False,
                        "provider_call": False,
                    },
                },
            )

            waiting = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-candidate-poll",
                    "--packet078-candidate-poll-attempts",
                    "1",
                    "--packet078-candidate-poll-interval",
                    "0",
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-candidate-call-status",
                    p187_status,
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            waiting_payload = json.loads(waiting.stdout)
            self.assertEqual(waiting_payload["schema"], "ghostclaw.a2a2a.packet078_candidate_poll.v1")
            self.assertEqual(waiting_payload["status"], "waiting_for_opencode_candidate")
            self.assertEqual(waiting_payload["poll_attempts_observed"], 1)
            self.assertEqual(waiting_payload["final_watch_status"], "waiting_for_opencode_candidate")
            self.assertFalse(waiting_payload["candidate_ready_for_real_result_path"])
            self.assertFalse(waiting_payload["external_actions_performed"]["candidate_review_result_write"])
            self.assertFalse(waiting_payload["external_actions_performed"]["real_review_result_write"])
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())

            write_json(
                root / candidate,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_review_result.v1",
                    "review_worker": "OpenCode_Reviewer",
                    "status": "REVIEW_PASS_READY_FOR_EXACT_P167",
                    "mutation_allowed": False,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "target_queue_path_exists": False,
                    "blocking_issues": [],
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
                },
            )
            ready = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-candidate-poll",
                    "--packet078-candidate-poll-attempts",
                    "2",
                    "--packet078-candidate-poll-interval",
                    "0",
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-candidate-call-status",
                    p187_status,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            ready_payload = json.loads(ready.stdout)
            self.assertEqual(ready_payload["status"], "candidate_ready_for_exact_real_result_gate")
            self.assertEqual(ready_payload["poll_attempts_observed"], 1)
            self.assertTrue(ready_payload["candidate_ready_for_real_result_path"])
            self.assertTrue(ready_payload["candidate_review_result_exists"])
            self.assertFalse(ready_payload["real_review_result_path_exists"])
            self.assertFalse(ready_payload["target_queue_path_exists"])
            self.assertIn("separate exact gate", ready_payload["next_safe_action"])
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_packet078_sequence_status_waits_for_candidate_then_routes_copy_gate_when_ready(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            p187_status = ".ghostclaw_runtime/a2a2a/status/P187-candidate-call-status.json"
            p180_escrow = ".ghostclaw_runtime/a2a2a/status/P180-p167-escrow.json"
            output = ".ghostclaw_runtime/a2a2a/status/P194-sequence-status.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P194-sequence-status.json"
            write_json(
                root / p187_status,
                {
                    "schema": "ghostclaw.a2a2a.packet078_candidate_call_status.v1",
                    "packet_id": "A2A2A-P187-PACKET078-CANDIDATE-CALL-STATUS-20260704",
                    "status": "waiting_for_opencode_candidate",
                    "candidate_review_result_path": candidate,
                    "real_review_result_path": real_result,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "external_actions_performed": {
                        "candidate_review_result_write": False,
                        "real_review_result_write": False,
                        "queue_file_write": False,
                        "provider_call": False,
                    },
                },
            )

            waiting = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-sequence-status",
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-candidate-call-status",
                    p187_status,
                    "--packet078-p167-deferred-approval",
                    p180_escrow,
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            waiting_payload = json.loads(waiting.stdout)
            self.assertEqual(waiting_payload["schema"], "ghostclaw.a2a2a.packet078_sequence_status.v1")
            self.assertEqual(waiting_payload["status"], "waiting_for_opencode_candidate")
            self.assertEqual(waiting_payload["next_action"], "run_opencode_candidate_then_poll")
            self.assertEqual(waiting_payload["candidate_poll_status"], "waiting_for_opencode_candidate")
            self.assertEqual(waiting_payload["candidate_copy_gate_status"], "waiting_for_opencode_candidate")
            self.assertFalse(waiting_payload["candidate_review_result_exists"])
            self.assertFalse(waiting_payload["real_review_result_path_exists"])
            self.assertFalse(waiting_payload["target_queue_path_exists"])
            self.assertFalse(waiting_payload["p173_guard_exists"])
            self.assertFalse(waiting_payload["p193_guard_exists"])
            self.assertIsNone(waiting_payload["candidate_copy_command_after_exact_gate"])
            self.assertIn("--packet078-candidate-poll", waiting_payload["commands"]["candidate_poll"])
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())

            write_json(
                root / candidate,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_review_result.v1",
                    "review_worker": "OpenCode_Reviewer",
                    "status": "REVIEW_PASS_READY_FOR_EXACT_P167",
                    "mutation_allowed": False,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "target_queue_path_exists": False,
                    "blocking_issues": [],
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
                },
            )
            ready = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-sequence-status",
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-candidate-call-status",
                    p187_status,
                    "--packet078-p167-deferred-approval",
                    p180_escrow,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            ready_payload = json.loads(ready.stdout)
            self.assertEqual(ready_payload["status"], "ready_for_candidate_copy_gate")
            self.assertEqual(ready_payload["next_action"], "prepare_or_run_p193_candidate_copy_gate_after_exact_approval")
            self.assertEqual(ready_payload["candidate_copy_gate_status"], "ready_for_exact_candidate_copy_gate")
            self.assertTrue(ready_payload["candidate_review_result_exists"])
            self.assertFalse(ready_payload["real_review_result_path_exists"])
            self.assertFalse(ready_payload["target_queue_path_exists"])
            self.assertIsNotNone(ready_payload["candidate_sha256"])
            self.assertIn(
                "APPROVE_A2A2A_P193_PACKET078_CANDIDATE_TO_REAL_REVIEW_RESULT_COPY_ONLY",
                ready_payload["candidate_copy_command_after_exact_gate"],
            )
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_packet078_opencode_candidate_paste_pack_writes_prompt_only(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            call_packet = ".ghostclaw_runtime/a2a2a/reviews/P186-candidate-call.json"
            prompt_output = ".ghostclaw_runtime/a2a2a/reviews/P195-paste-prompt.txt"
            output = ".ghostclaw_runtime/a2a2a/status/P195-paste-pack.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P195-paste-pack.json"
            write_json(
                root / call_packet,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_candidate_call.v1",
                    "packet_id": "A2A2A-P186-PACKET078-OPENCODE-CANDIDATE-CALL-20260704",
                    "status": "ready_for_opencode_candidate_review",
                    "candidate_review_result_path": candidate,
                    "real_review_result_path": real_result,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "opencode_prompt": "OpenCode review only. Write candidate path only: " + candidate,
                    "external_actions_performed": {
                        "candidate_review_result_write": False,
                        "real_review_result_write": False,
                        "queue_file_write": False,
                    },
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-opencode-candidate-paste-pack",
                    "--packet078-opencode-candidate-call-packet",
                    call_packet,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-opencode-candidate-paste-prompt-output",
                    prompt_output,
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.packet078_opencode_candidate_paste_pack.v1")
            self.assertEqual(payload["status"], "ready_to_paste_opencode_candidate_prompt")
            self.assertEqual(payload["next_action"], "paste_prompt_into_opencode_then_run_sequence_status")
            self.assertEqual(payload["candidate_review_result_path"], candidate)
            self.assertFalse(payload["candidate_review_result_exists"])
            self.assertFalse(payload["real_review_result_path_exists"])
            self.assertFalse(payload["target_queue_path_exists"])
            self.assertFalse(payload["p173_guard_exists"])
            self.assertFalse(payload["p193_guard_exists"])
            self.assertIn("--packet078-sequence-status", payload["post_paste_validation_commands"][0])
            self.assertIn("pbcopy", payload["clipboard_command_preview"])
            self.assertTrue((root / prompt_output).is_file())
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertIn(candidate, (root / prompt_output).read_text(encoding="utf-8"))
            self.assertFalse((root / candidate).exists())
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_packet078_opencode_candidate_paste_pack_default_prompt_uses_p197_template(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            call_packet = ".ghostclaw_runtime/a2a2a/reviews/P186-candidate-call.json"
            prompt_output = ".ghostclaw_runtime/a2a2a/reviews/P195-paste-prompt.txt"
            output = ".ghostclaw_runtime/a2a2a/status/P195-paste-pack.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P195-paste-pack.json"
            write_json(
                root / call_packet,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_candidate_call.v1",
                    "packet_id": "A2A2A-P186-PACKET078-OPENCODE-CANDIDATE-CALL-20260704",
                    "status": "ready_for_opencode_candidate_review",
                    "candidate_review_result_path": candidate,
                    "real_review_result_path": real_result,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "external_actions_performed": {
                        "candidate_review_result_write": False,
                        "real_review_result_write": False,
                        "queue_file_write": False,
                    },
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-opencode-candidate-paste-pack",
                    "--packet078-opencode-candidate-call-packet",
                    call_packet,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-opencode-candidate-paste-prompt-output",
                    prompt_output,
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            prompt = (root / prompt_output).read_text(encoding="utf-8")
            self.assertEqual(payload["status"], "ready_to_paste_opencode_candidate_prompt")
            self.assertIn(
                ".ghostclaw_runtime/a2a2a/reviews/A2A2A-P197-PACKET078-OPENCODE-CANDIDATE-RESULT-TEMPLATE-20260704.json",
                prompt,
            )
            self.assertNotIn("A2A2A-P177-PACKET078-OPENCODE-REVIEW-RESULT-TEMPLATE-20260704.json", prompt)
            self.assertFalse((root / candidate).exists())
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_packet078_opencode_candidate_paste_pack_replaces_stale_p177_call_prompt(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            call_packet = ".ghostclaw_runtime/a2a2a/reviews/P186-candidate-call.json"
            prompt_output = ".ghostclaw_runtime/a2a2a/reviews/P195-paste-prompt.txt"
            output = ".ghostclaw_runtime/a2a2a/status/P195-paste-pack.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P195-paste-pack.json"
            write_json(
                root / call_packet,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_candidate_call.v1",
                    "packet_id": "A2A2A-P186-PACKET078-OPENCODE-CANDIDATE-CALL-20260704",
                    "status": "ready_for_opencode_candidate_review",
                    "candidate_review_result_path": candidate,
                    "real_review_result_path": real_result,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "opencode_prompt": (
                        "OpenCode stale prompt. Template path: "
                        ".ghostclaw_runtime/a2a2a/reviews/"
                        "A2A2A-P177-PACKET078-OPENCODE-REVIEW-RESULT-TEMPLATE-20260704.json"
                    ),
                    "external_actions_performed": {
                        "candidate_review_result_write": False,
                        "real_review_result_write": False,
                        "queue_file_write": False,
                    },
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-opencode-candidate-paste-pack",
                    "--packet078-opencode-candidate-call-packet",
                    call_packet,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-opencode-candidate-paste-prompt-output",
                    prompt_output,
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            prompt = (root / prompt_output).read_text(encoding="utf-8")
            self.assertEqual(payload["status"], "ready_to_paste_opencode_candidate_prompt")
            self.assertEqual(payload["prompt_source"], "default_p197_template_due_to_stale_call_packet_prompt")
            self.assertTrue(payload["stale_call_packet_prompt_replaced"])
            self.assertIn(
                ".ghostclaw_runtime/a2a2a/reviews/A2A2A-P197-PACKET078-OPENCODE-CANDIDATE-RESULT-TEMPLATE-20260704.json",
                prompt,
            )
            self.assertNotIn("A2A2A-P177-PACKET078-OPENCODE-REVIEW-RESULT-TEMPLATE-20260704.json", prompt)
            self.assertFalse((root / candidate).exists())
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_packet078_opencode_handoff_readiness_surfaces_safe_paste_after_p199(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            prompt_output = ".ghostclaw_runtime/a2a2a/reviews/P195-paste-prompt.txt"
            paste_pack = ".ghostclaw_runtime/a2a2a/status/P195-paste-pack.json"
            template_pack = ".ghostclaw_runtime/a2a2a/status/P197-template-pack.json"
            false_pass_guard = ".ghostclaw_runtime/a2a2a/status/P198-false-pass-guard.json"
            canonicalization = ".ghostclaw_runtime/a2a2a/status/P199-canonicalization.json"
            output = ".ghostclaw_runtime/a2a2a/status/P200-handoff-readiness.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P200-handoff-readiness.json"
            prompt = (
                "OpenCode read-only candidate review task. Template path: "
                ".ghostclaw_runtime/a2a2a/reviews/"
                "A2A2A-P197-PACKET078-OPENCODE-CANDIDATE-RESULT-TEMPLATE-20260704.json"
            )
            prompt_path = root / prompt_output
            prompt_path.parent.mkdir(parents=True, exist_ok=True)
            prompt_path.write_text(prompt, encoding="utf-8")
            write_json(
                root / paste_pack,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_candidate_paste_pack.v1",
                    "packet_id": "A2A2A-P195-PACKET078-OPENCODE-CANDIDATE-PASTE-PACK-20260704",
                    "status": "ready_to_paste_opencode_candidate_prompt",
                    "prompt_output_path": prompt_output,
                    "prompt_source": "default_p197_template_due_to_stale_call_packet_prompt",
                    "stale_call_packet_prompt_replaced": True,
                    "candidate_review_result_path": candidate,
                    "candidate_review_result_exists": False,
                    "real_review_result_path": real_result,
                    "real_review_result_path_exists": False,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "target_queue_path_exists": False,
                    "p173_guard_exists": False,
                    "p193_guard_exists": False,
                },
            )
            write_json(
                root / template_pack,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_candidate_template_pack.v1",
                    "packet_id": "A2A2A-P197-PACKET078-OPENCODE-CANDIDATE-TEMPLATE-PACK-20260704",
                    "status": "ready_for_opencode_candidate_fill",
                    "template_path": (
                        ".ghostclaw_runtime/a2a2a/reviews/"
                        "A2A2A-P197-PACKET078-OPENCODE-CANDIDATE-RESULT-TEMPLATE-20260704.json"
                    ),
                },
            )
            write_json(
                root / false_pass_guard,
                {
                    "schema": "ghostclaw.a2a2a.packet078_unfilled_template_false_pass_guard.v1",
                    "packet_id": "A2A2A-P198-PACKET078-UNFILLED-TEMPLATE-FALSE-PASS-GUARD-20260704",
                    "status": "false_pass_guard_verified",
                },
            )
            write_json(
                root / canonicalization,
                {
                    "schema": "ghostclaw.a2a2a.packet078_p195_prompt_canonicalization.v1",
                    "packet_id": "A2A2A-P199-PACKET078-P195-PROMPT-CANONICALIZATION-20260704",
                    "status": "p195_prompt_canonicalized_to_p197_template",
                    "prompt_source_after_regeneration": "default_p197_template_due_to_stale_call_packet_prompt",
                    "stale_call_packet_prompt_replaced": True,
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-opencode-handoff-readiness",
                    "--packet078-opencode-candidate-paste-pack-status",
                    paste_pack,
                    "--packet078-opencode-candidate-paste-prompt-output",
                    prompt_output,
                    "--packet078-opencode-candidate-template-pack-output",
                    template_pack,
                    "--packet078-unfilled-template-guard-status",
                    false_pass_guard,
                    "--packet078-p195-prompt-canonicalization-status",
                    canonicalization,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.packet078_opencode_handoff_readiness.v1")
            self.assertEqual(payload["status"], "ready_for_manual_opencode_paste")
            self.assertEqual(payload["next_action"], "paste_p195_prompt_into_opencode")
            self.assertIn("pbcopy", payload["clipboard_command"])
            self.assertEqual(payload["prompt_template_reference"], "P197")
            self.assertTrue(payload["prompt_contains_p197_template"])
            self.assertFalse(payload["prompt_contains_stale_p177_template"])
            self.assertFalse(payload["candidate_review_result_exists"])
            self.assertFalse(payload["real_review_result_path_exists"])
            self.assertFalse(payload["target_queue_path_exists"])
            self.assertFalse(payload["p173_guard_exists"])
            self.assertFalse(payload["p193_guard_exists"])
            self.assertEqual(payload["issues"], [])
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertFalse((root / candidate).exists())
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_packet078_opencode_post_handoff_router_waits_when_candidate_missing(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            readiness = ".ghostclaw_runtime/a2a2a/status/P200-handoff-readiness.json"
            output = ".ghostclaw_runtime/a2a2a/status/P201-post-handoff-router.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P201-post-handoff-router.json"
            write_json(
                root / readiness,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_handoff_readiness.v1",
                    "packet_id": "A2A2A-P200-PACKET078-OPENCODE-HANDOFF-READINESS-20260704",
                    "status": "ready_for_manual_opencode_paste",
                    "next_action": "paste_p195_prompt_into_opencode",
                    "candidate_review_result_path": candidate,
                    "candidate_review_result_exists": False,
                    "real_review_result_path": real_result,
                    "real_review_result_path_exists": False,
                    "target_queue_path_exists": False,
                    "p173_guard_exists": False,
                    "p193_guard_exists": False,
                    "issues": [],
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-opencode-post-handoff-router",
                    "--packet078-opencode-handoff-readiness-output",
                    readiness,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.packet078_opencode_post_handoff_router.v1")
            self.assertEqual(payload["status"], "waiting_for_opencode_candidate")
            self.assertEqual(payload["next_action"], "paste_p195_prompt_into_opencode")
            self.assertEqual(payload["handoff_readiness_status"], "ready_for_manual_opencode_paste")
            self.assertEqual(payload["candidate_preflight_status"], "waiting_for_candidate_review_result")
            self.assertEqual(payload["candidate_copy_gate_status"], "waiting_for_opencode_candidate")
            self.assertFalse(payload["candidate_review_result_exists"])
            self.assertFalse(payload["real_review_result_path_exists"])
            self.assertFalse(payload["target_queue_path_exists"])
            self.assertIsNone(payload["candidate_copy_command_after_exact_gate"])
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertFalse((root / candidate).exists())
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_packet078_opencode_post_handoff_router_routes_valid_candidate_to_p193_gate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            readiness = ".ghostclaw_runtime/a2a2a/status/P200-handoff-readiness.json"
            p193_command = ".ghostclaw_runtime/a2a2a/commands/P193-copy-guard.sh"
            output = ".ghostclaw_runtime/a2a2a/status/P201-post-handoff-router.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P201-post-handoff-router.json"
            write_json(
                root / readiness,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_handoff_readiness.v1",
                    "packet_id": "A2A2A-P200-PACKET078-OPENCODE-HANDOFF-READINESS-20260704",
                    "status": "ready_for_manual_opencode_paste",
                    "next_action": "paste_p195_prompt_into_opencode",
                    "candidate_review_result_path": candidate,
                    "candidate_review_result_exists": False,
                    "real_review_result_path": real_result,
                    "real_review_result_path_exists": False,
                    "target_queue_path_exists": False,
                    "p173_guard_exists": False,
                    "p193_guard_exists": False,
                    "issues": [],
                },
            )
            write_json(
                root / candidate,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_review_candidate_result.v1",
                    "packet_id": "A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-20260704",
                    "status": "REVIEW_PASS_READY_FOR_EXACT_P167",
                    "review_worker": "OpenCode_Reviewer",
                    "mutation_allowed": False,
                    "target_queue_path_exists": False,
                    "blocking_issues": [],
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
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-opencode-post-handoff-router",
                    "--packet078-opencode-handoff-readiness-output",
                    readiness,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--packet078-candidate-copy-command-output",
                    p193_command,
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_exact_p193_candidate_copy_gate")
            self.assertEqual(payload["next_action"], "prepare_p193_candidate_copy_gate_after_exact_approval")
            self.assertEqual(payload["candidate_preflight_status"], "candidate_ready_for_real_result_path")
            self.assertEqual(payload["candidate_copy_gate_status"], "ready_for_exact_candidate_copy_gate")
            self.assertTrue(payload["candidate_review_result_exists"])
            self.assertTrue(payload["candidate_ready_for_real_result_path"])
            self.assertFalse(payload["real_review_result_path_exists"])
            self.assertFalse(payload["target_queue_path_exists"])
            self.assertIn(
                "APPROVE_A2A2A_P193_PACKET078_CANDIDATE_TO_REAL_REVIEW_RESULT_COPY_ONLY",
                payload["candidate_copy_command_after_exact_gate"],
            )
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())
            self.assertFalse((root / p193_command).exists())

    def test_compact_status_surfaces_packet078_post_handoff_router_waiting_state(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dry_run_report = ".ghostclaw_runtime/a2a2a/evidence/queue-drained-dry-run.json"
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            router_status = ".ghostclaw_runtime/a2a2a/status/P201-post-handoff-router.json"
            write_json(
                root / dry_run_report,
                {
                    "schema": "ghostclaw.a2a2a.queue_coordinator.v1",
                    "repo": str(root),
                    "generated_at": "2026-07-04T00:00:00Z",
                    "dry_run": True,
                    "ranked_packets": [],
                    "packet_counts": {"total": 0, "would_dispatch": 0, "would_gate": 0, "observed": 0},
                    "status_counts": {"pending": 0},
                    "blocked_actions_preserved": {
                        "telegram_live_send": False,
                        "provider_call": False,
                        "push": False,
                        "deploy": False,
                    },
                },
            )
            write_json(
                root / router_status,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_post_handoff_router.v1",
                    "packet_id": "A2A2A-P201-PACKET078-OPENCODE-POST-HANDOFF-ROUTER-20260704",
                    "status": "waiting_for_opencode_candidate",
                    "mode": "local_safe_post_handoff_router_no_result_command_or_queue_write",
                    "selected_packet": "packet_078",
                    "next_action": "paste_p195_prompt_into_opencode",
                    "handoff_readiness_status": "ready_for_manual_opencode_paste",
                    "candidate_preflight_status": "waiting_for_candidate_review_result",
                    "candidate_copy_gate_status": "waiting_for_opencode_candidate",
                    "sequence_status": "waiting_for_opencode_candidate",
                    "candidate_review_result_path": candidate,
                    "candidate_review_result_exists": False,
                    "candidate_ready_for_real_result_path": False,
                    "real_review_result_path": real_result,
                    "real_review_result_path_exists": False,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "target_queue_path_exists": False,
                    "p173_guard_exists": False,
                    "p193_guard_exists": False,
                    "issues": [],
                    "next_safe_action": "Paste the P195 prompt into OpenCode, then rerun P201 after candidate appears.",
                    "external_actions_performed": {
                        "candidate_review_result_write": False,
                        "real_review_result_write": False,
                        "queue_file_write": False,
                        "provider_call": False,
                    },
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    dry_run_report,
                    "--compact",
                    "--packet078-opencode-post-handoff-router-status",
                    router_status,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            status = payload["opencode_post_handoff_router_status"]
            self.assertEqual(status["status"], "waiting_for_opencode_candidate")
            self.assertEqual(status["next_action"], "paste_p195_prompt_into_opencode")
            self.assertFalse(status["candidate_review_result_exists"])
            self.assertFalse(status["real_review_result_path_exists"])
            self.assertFalse(status["target_queue_path_exists"])
            opencode_lane = payload["lane_next_actions"]["opencode_reviewer"]
            self.assertEqual(opencode_lane["next_action"], "paste_p195_prompt_into_opencode")
            self.assertEqual(opencode_lane["selected_packet"], "A2A2A-P201-PACKET078-OPENCODE-POST-HANDOFF-ROUTER-20260704")
            self.assertEqual(opencode_lane["candidate_review_result_path"], candidate)
            self.assertFalse(opencode_lane["source_mutation_allowed_now"])
            self.assertEqual(payload["next_safe_action"], "Paste the P195 prompt into OpenCode, then rerun P201 after candidate appears.")
            self.assertFalse((root / candidate).exists())
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_packet078_opencode_candidate_stall_guard_surfaces_retry_without_writing_candidate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            paste_pack = ".ghostclaw_runtime/a2a2a/status/P195-paste-pack.json"
            prompt_output = ".ghostclaw_runtime/a2a2a/reviews/P195-paste-prompt.txt"
            output = ".ghostclaw_runtime/a2a2a/status/P196-stall-guard.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P196-stall-guard.json"
            prompt_path = root / prompt_output
            prompt_path.parent.mkdir(parents=True, exist_ok=True)
            prompt_path.write_text("OpenCode candidate prompt: " + candidate, encoding="utf-8")
            write_json(
                root / paste_pack,
                {
                    "schema": "ghostclaw.a2a2a.packet078_opencode_candidate_paste_pack.v1",
                    "packet_id": "A2A2A-P195-PACKET078-OPENCODE-CANDIDATE-PASTE-PACK-20260704",
                    "status": "ready_to_paste_opencode_candidate_prompt",
                    "next_action": "paste_prompt_into_opencode_then_run_sequence_status",
                    "prompt_output_path": prompt_output,
                    "prompt_sha256": "fixture",
                    "candidate_review_result_path": candidate,
                    "candidate_review_result_exists": False,
                    "real_review_result_path": real_result,
                    "real_review_result_path_exists": False,
                    "target_queue_path": "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json",
                    "target_queue_path_exists": False,
                    "p173_guard_exists": False,
                    "p193_guard_exists": False,
                },
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-opencode-candidate-stall-guard",
                    "--packet078-opencode-candidate-paste-pack-status",
                    paste_pack,
                    "--packet078-opencode-candidate-paste-prompt-output",
                    prompt_output,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.packet078_opencode_candidate_stall_guard.v1")
            self.assertEqual(payload["status"], "waiting_for_external_opencode_candidate")
            self.assertEqual(payload["next_action"], "re_paste_p195_prompt_or_run_external_opencode_review")
            self.assertTrue(payload["prompt_file_exists"])
            self.assertFalse(payload["candidate_review_result_exists"])
            self.assertFalse(payload["real_review_result_path_exists"])
            self.assertFalse(payload["target_queue_path_exists"])
            self.assertFalse(payload["p173_guard_exists"])
            self.assertFalse(payload["p193_guard_exists"])
            self.assertIn("--packet078-opencode-candidate-paste-pack", payload["retry_commands"][0])
            self.assertIn("--packet078-sequence-status", payload["post_candidate_commands"][0])
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertFalse((root / candidate).exists())
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_packet078_opencode_candidate_template_pack_writes_template_not_candidate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            candidate = ".ghostclaw_runtime/a2a2a/reviews/P185-candidate-review-result.json"
            real_result = ".ghostclaw_runtime/a2a2a/reviews/P175-opencode-review-result.json"
            template = ".ghostclaw_runtime/a2a2a/reviews/P197-candidate-template.json"
            output = ".ghostclaw_runtime/a2a2a/status/P197-template-pack.json"
            receipt = ".ghostclaw_runtime/a2a2a/receipts/P197-template-pack.json"

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet078-opencode-candidate-template-pack",
                    "--packet078-opencode-candidate-template-output",
                    template,
                    "--packet078-opencode-review-candidate",
                    candidate,
                    "--packet078-opencode-review-result",
                    real_result,
                    "--output",
                    output,
                    "--receipt",
                    receipt,
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["schema"], "ghostclaw.a2a2a.packet078_opencode_candidate_template_pack.v1")
            self.assertEqual(payload["status"], "ready_for_opencode_candidate_fill")
            self.assertEqual(payload["candidate_review_result_path"], candidate)
            self.assertEqual(payload["template_path"], template)
            self.assertFalse(payload["candidate_review_result_exists"])
            self.assertFalse(payload["real_review_result_path_exists"])
            self.assertFalse(payload["target_queue_path_exists"])
            self.assertIn("--packet078-opencode-review-candidate-preflight", payload["post_fill_validation_commands"])
            self.assertTrue((root / template).is_file())
            template_payload = json.loads((root / template).read_text(encoding="utf-8"))
            self.assertEqual(template_payload["review_worker"], "OpenCode_Reviewer")
            self.assertEqual(template_payload["status"], "REVIEW_PENDING_FILL_BY_OPENCODE")
            self.assertFalse(template_payload["mutation_allowed"])
            self.assertEqual(template_payload["blocking_issues"], [])
            self.assertFalse(template_payload["external_actions_performed"]["provider_call"])
            self.assertTrue((root / output).is_file())
            self.assertTrue((root / receipt).is_file())
            self.assertFalse((root / candidate).exists())
            self.assertFalse((root / real_result).exists())
            self.assertFalse((root / "_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json").exists())

    def test_loop_harness_status_blocks_reviewer_mutation_packet(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._write_ready_loop_harness_artifacts(root, review_mutation_allowed=True)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--loop-harness-status"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "blocked_or_not_ready")
            self.assertIn("review_mutation_blocked", payload["issues"])
            self.assertTrue(payload["checks"]["review_packet_ready"])
            self.assertFalse(payload["checks"]["review_mutation_blocked"])
            self.assertFalse(payload["external_actions_performed"]["worker_execution"])


if __name__ == "__main__":
    unittest.main()
