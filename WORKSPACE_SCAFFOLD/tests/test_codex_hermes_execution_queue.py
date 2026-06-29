"""Codex/Hermes execution queue guardrails for the active goal."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
QUEUE_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_EXECUTION_QUEUE_2026-06-29.md"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
HERMES_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"


class CodexHermesExecutionQueueTests(unittest.TestCase):
    """Ensure Codex and Hermes share one local-only execution queue without widening gates."""

    def load_queue(self):
        self.assertTrue(QUEUE_JSON.exists(), f"Missing JSON queue: {QUEUE_JSON}")
        return json.loads(QUEUE_JSON.read_text(encoding="utf-8"))

    def test_queue_files_exist_without_final_lane1_decision(self):
        self.assertTrue(QUEUE_JSON.exists(), f"Missing JSON queue: {QUEUE_JSON}")
        self.assertTrue(QUEUE_DOC.exists(), f"Missing Markdown queue: {QUEUE_DOC}")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 packet exists unexpectedly")
        self.assertFalse(HERMES_DECISION.exists(), "Hermes decision exists unexpectedly")

    def test_queue_preserves_scope_and_safety_boundary(self):
        queue = self.load_queue()

        self.assertEqual(queue["schema"], "sirinx.codex_hermes.execution_queue.v1")
        self.assertEqual(queue["status"], "active_local_only")
        self.assertEqual(queue["evidence_boundary"], "local_evidence_only")
        self.assertFalse(queue["claims_all_chats_read"])
        self.assertFalse(queue["lane2_authorized"])
        self.assertFalse(queue["runtime_queue_execution"])
        self.assertIn(
            "data/pathspecs/sirinx_hermes_codex_a2a_godmode_v3_html_recheck_2026-06-29.json",
            queue["source_indexes"],
        )
        self.assertIn(
            "data/pathspecs/sirinx_active_goal_context_packet_registry_2026-06-29.json",
            queue["source_indexes"],
        )
        self.assertIn(
            "data/pathspecs/ghostclaw_lane1_packet013_decision_workbench_2026-06-29.json",
            queue["source_indexes"],
        )
        self.assertIn(
            "data/pathspecs/ghostclaw_lane1_hermes_decision_preflight_audit_2026-06-29.json",
            queue["source_indexes"],
        )
        self.assertIn(
            "data/pathspecs/sirinx_a2a_next_safe_action_sequencer_2026-06-29.json",
            queue["source_indexes"],
        )

        boundary = queue["blocked_actions"]
        for action in (
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "paid_provider_call",
            "runtime_queue_execution",
        ):
            self.assertFalse(boundary[action], f"{action} should remain false")

    def test_queue_lists_required_ordered_work_items(self):
        queue = self.load_queue()
        items = queue["items"]
        ids = [item["id"] for item in items]

        self.assertEqual(
            ids[:14],
            [
                "LANE1-HERMES-DECISION-PACKET-013",
                "LANE1-HERMES-DECISION-DRAFT-PACKET-015",
                "LANE1-HERMES-DECISION-HANDOFF-PACKET-016",
                "LANE1-HERMES-DECISION-PREFLIGHT-PACKET-017",
                "LANE1-OPUS-ARCHITECTURE-PACKET-GATE-PACKET-018",
                "LANE1-OPUS-AUTHORING-BUNDLE-PACKET-019",
                "LANE1-HERMES-DECISION-TRANSITION-GUARD",
                "ALL-CHAT-EXPORT-INTAKE",
                "ALL-CHAT-EXPORT-REQUEST-PACKET-020",
                "A2A-ADAPTIVE-SYNC-CONTROL-STATUS-PACKET-021",
                "A2A-NEXT-SAFE-ACTION-SEQUENCER-PACKET-022",
                "HERMES-GATEWAY-CURRENT-RECHECK-PACKET-023",
                "GHOSTCLAW-V3-3-ARTIFACT-INTAKE",
                "R0-GATE-SPECIFIC-APPROVALS",
            ],
        )

        first = items[0]
        self.assertEqual(first["owner"], "Hermes")
        self.assertEqual(first["current_actionable_packet"], "packet_013")
        self.assertEqual(first["status"], "waiting_for_decision")
        self.assertEqual(first["gate"], "codex_recorder_gate_closed")
        self.assertFalse(first["lane2_authorized"])

        draft = items[1]
        self.assertEqual(draft["owner"], "Codex")
        self.assertEqual(draft["current_actionable_packet"], "packet_013")
        self.assertEqual(draft["status"], "draft_for_hermes_review_not_decision")
        self.assertEqual(draft["gate"], "hermes_decision_required")
        self.assertFalse(draft["lane2_authorized"])
        self.assertIn("data/pathspecs/ghostclaw_lane1_packet013_decision_draft_2026-06-29.json", draft["evidence"])
        self.assertIn("_A2A_QUEUE/outbox/packet_015_ghostclaw_lane1_hermes_decision_draft.json", draft["evidence"])
        self.assertIn("decision_record", draft["forbidden_actions"])

        handoff = items[2]
        self.assertEqual(handoff["owner"], "Codex")
        self.assertEqual(handoff["current_actionable_packet"], "packet_013")
        self.assertEqual(handoff["status"], "handoff_packet_ready_not_decision")
        self.assertEqual(handoff["gate"], "hermes_decision_record_required")
        self.assertFalse(handoff["lane2_authorized"])
        self.assertIn("_A2A_QUEUE/outbox/packet_016_ghostclaw_lane1_hermes_decision_intake_handoff.json", handoff["evidence"])
        self.assertIn("data/pathspecs/ghostclaw_lane1_hermes_decision_intake_handoff_2026-06-29.json", handoff["evidence"])
        self.assertIn("decision_record", handoff["forbidden_actions"])
        self.assertIn("runtime_queue_execution", handoff["forbidden_actions"])
        self.assertIn("state_mutation", handoff["forbidden_actions"])

        preflight = items[3]
        self.assertEqual(preflight["owner"], "Codex")
        self.assertEqual(preflight["current_actionable_packet"], "packet_013")
        self.assertEqual(preflight["status"], "ready_for_hermes_decision_review_not_decision")
        self.assertEqual(preflight["gate"], "hermes_decision_record_required")
        self.assertFalse(preflight["lane2_authorized"])
        self.assertIn("data/pathspecs/ghostclaw_lane1_hermes_decision_preflight_audit_2026-06-29.json", preflight["evidence"])
        self.assertIn("_A2A_QUEUE/outbox/packet_017_ghostclaw_lane1_hermes_decision_preflight_audit.json", preflight["evidence"])
        self.assertIn("decision_record", preflight["forbidden_actions"])
        self.assertIn("state_mutation", preflight["forbidden_actions"])

        packet_gate = items[4]
        self.assertEqual(packet_gate["owner"], "Codex")
        self.assertEqual(packet_gate["current_actionable_packet"], "packet_013")
        self.assertEqual(packet_gate["status"], "validator_ready_final_packet_missing")
        self.assertEqual(packet_gate["gate"], "hermes_decision_and_final_packet_required")
        self.assertFalse(packet_gate["lane2_authorized"])
        self.assertIn("data/pathspecs/ghostclaw_lane1_opus_architecture_packet_gate_2026-06-29.json", packet_gate["evidence"])
        self.assertIn("_A2A_QUEUE/outbox/packet_018_ghostclaw_lane1_opus_architecture_packet_gate.json", packet_gate["evidence"])
        self.assertIn("decision_record", packet_gate["forbidden_actions"])
        self.assertIn("state_mutation", packet_gate["forbidden_actions"])
        self.assertIn("final_packet_creation", packet_gate["forbidden_actions"])

        authoring = items[5]
        self.assertEqual(authoring["owner"], "Codex")
        self.assertEqual(authoring["current_actionable_packet"], "packet_013")
        self.assertEqual(authoring["status"], "authoring_bundle_ready_not_final_packet")
        self.assertEqual(authoring["gate"], "hermes_decision_and_final_packet_required")
        self.assertFalse(authoring["lane2_authorized"])
        self.assertIn("data/pathspecs/ghostclaw_lane1_opus_authoring_bundle_2026-06-29.json", authoring["evidence"])
        self.assertIn("_A2A_QUEUE/outbox/packet_019_ghostclaw_lane1_opus_authoring_bundle.json", authoring["evidence"])
        self.assertIn("decision_record", authoring["forbidden_actions"])
        self.assertIn("state_mutation", authoring["forbidden_actions"])
        self.assertIn("final_packet_creation", authoring["forbidden_actions"])

        guard = items[6]
        self.assertEqual(guard["owner"], "Codex")
        self.assertEqual(guard["current_actionable_packet"], "packet_013")
        self.assertEqual(guard["status"], "blocked_missing_hermes_decision")
        self.assertEqual(guard["gate"], "validated_hermes_decision_required")
        self.assertFalse(guard["lane2_authorized"])
        self.assertIn("data/pathspecs/ghostclaw_lane1_hermes_decision_transition_guard_2026-06-29.json", guard["evidence"])
        self.assertIn("decision_record", guard["forbidden_actions"])
        self.assertIn("state_mutation", guard["forbidden_actions"])

    def test_each_queue_item_has_auditable_fields(self):
        queue = self.load_queue()
        required = {
            "id",
            "priority",
            "owner",
            "status",
            "gate",
            "next_action",
            "evidence",
            "blocked_by",
            "allowed_actions",
            "forbidden_actions",
        }

        for item in queue["items"]:
            self.assertTrue(required.issubset(item), f"Missing fields in {item.get('id')}")
            self.assertGreaterEqual(len(item["evidence"]), 1, f"Missing evidence for {item['id']}")
            self.assertIn("read_local_files", item["allowed_actions"])
            self.assertIn("deploy", item["forbidden_actions"])
            self.assertIn("push", item["forbidden_actions"])
            self.assertIn("secret_read", item["forbidden_actions"])

    def test_markdown_queue_states_non_completion_and_next_safe_action(self):
        self.assertTrue(QUEUE_DOC.exists(), f"Missing Markdown queue: {QUEUE_DOC}")
        text = QUEUE_DOC.read_text(encoding="utf-8")
        required = [
            "CODEX_HERMES_EXECUTION_QUEUE_LOCAL_ONLY",
            "claims_all_chats_read=false",
            "evidence_boundary=local_evidence_only",
            "lane2_authorized=false",
            "runtime_queue_execution=false",
            "LANE1-HERMES-DECISION-PACKET-013",
            "LANE1-HERMES-DECISION-DRAFT-PACKET-015",
            "LANE1-HERMES-DECISION-HANDOFF-PACKET-016",
            "LANE1-HERMES-DECISION-PREFLIGHT-PACKET-017",
            "LANE1-OPUS-ARCHITECTURE-PACKET-GATE-PACKET-018",
            "LANE1-OPUS-AUTHORING-BUNDLE-PACKET-019",
            "LANE1-HERMES-DECISION-TRANSITION-GUARD",
            "A2A-ADAPTIVE-SYNC-CONTROL-STATUS-PACKET-021",
            "A2A-NEXT-SAFE-ACTION-SEQUENCER-PACKET-022",
            "HERMES-GATEWAY-CURRENT-RECHECK-PACKET-023",
            "current_actionable_packet=packet_013",
            "GHOSTCLAW-V3-3-ARTIFACT-INTAKE",
            "R0-GATE-SPECIFIC-APPROVALS",
            "ACTIVE-GOAL-BLOCKER-RECHECK",
            "ghostclaw_lane1_packet013_decision_workbench_2026-06-29.json",
            "sirinx_active_goal_context_packet_registry_2026-06-29.json",
            "sirinx_hermes_codex_a2a_godmode_v3_html_recheck_2026-06-29.json",
            "This queue is not a completion claim.",
            "_A2A_QUEUE/outbox/packet_016_ghostclaw_lane1_hermes_decision_intake_handoff.json",
            "_A2A_QUEUE/outbox/packet_017_ghostclaw_lane1_hermes_decision_preflight_audit.json",
            "_A2A_QUEUE/outbox/packet_018_ghostclaw_lane1_opus_architecture_packet_gate.json",
            "_A2A_QUEUE/outbox/packet_019_ghostclaw_lane1_opus_authoring_bundle.json",
            "_A2A_QUEUE/outbox/packet_021_sirinx_a2a_adaptive_sync_control_status.json",
            "_A2A_QUEUE/outbox/packet_022_sirinx_a2a_next_safe_action_sequencer.json",
            "_A2A_QUEUE/outbox/packet_023_sirinx_hermes_gateway_current_recheck.json",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
