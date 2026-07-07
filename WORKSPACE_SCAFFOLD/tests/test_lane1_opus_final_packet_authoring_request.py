"""GhostClaw LANE_1 Opus final packet authoring request guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_032_ghostclaw_lane1_opus_final_packet_authoring_request.json"
DOC = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_FINAL_PACKET_AUTHORING_REQUEST_2026-07-02.md"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
HERMES_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"
QUEUE_STATUS_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_a2a_queue_status_2026-06-29.json"
QUEUE_STATUS_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_A2A_QUEUE_STATUS_2026-06-29.md"
EXECUTION_QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
EXECUTION_QUEUE_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_EXECUTION_QUEUE_2026-06-29.md"
ACTIVE_INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
ACTIVE_INDEX_DOC = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_SYSTEMATIC_WORK_INDEX_2026-06-29.md"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"


class Lane1OpusFinalPacketAuthoringRequestTests(unittest.TestCase):
    """Ensure packet_032 routes Opus authoring without pretending to be the final packet."""

    def load_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet_032: {PACKET}")
        return json.loads(PACKET.read_text(encoding="utf-8"))

    def test_packet_artifacts_exist_without_final_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet_032: {PACKET}")
        self.assertTrue(DOC.exists(), f"Missing packet_032 doc: {DOC}")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 Opus packet exists unexpectedly")
        self.assertTrue(HERMES_DECISION.exists(), "Hermes decision file should exist after route_to_opus decision")

    def test_packet_032_is_request_only_not_final_packet_or_execution(self):
        packet = self.load_packet()

        self.assertEqual(packet["id"], "packet_032")
        self.assertEqual(packet["project"], "ghostclaw")
        self.assertEqual(packet["agent"], "codex")
        self.assertEqual(packet["to_agent"], "hermes_opus")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertEqual(packet["approval_scope"], "opus_final_packet_authoring_request_only")
        self.assertEqual(packet["dispatch_mode"], "dry_run_review_only")
        self.assertEqual(packet["current_actionable_packet"], "packet_013")
        self.assertTrue(packet["hermes_decision_recorded"])
        self.assertFalse(packet["approval_required"])
        self.assertTrue(packet["execution_approval_required"])
        self.assertTrue(packet["dry_run"])
        self.assertTrue(packet["not_approval"])
        self.assertFalse(packet["final_packet_record"])
        self.assertFalse(packet["lane2_authorized"])
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["real_mcp_execution"])

        for field in (
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "paid_provider_call",
            "external_message_send",
            "telegram_live_send",
            "line_send",
            "line_webhook_activation",
            "production_analytics",
            "crm_customer_data_storage",
            "database_write",
            "database_migration",
            "dependency_install",
            "public_tunnel",
            "state_mutation",
        ):
            self.assertFalse(packet[field], f"{field} should remain false")

    def test_packet_links_route_to_opus_evidence_and_required_future_output(self):
        packet = self.load_packet()

        required_inputs = {
            "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md",
            "_A2A_QUEUE/outbox/packet_026_ghostclaw_lane1_hermes_decision_route_to_opus.json",
            "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_TRANSITION_GUARD_2026-06-29.md",
            "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_AUTHORING_BUNDLE_2026-06-29.md",
            "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET_GATE_2026-06-29.md",
        }
        self.assertTrue(required_inputs.issubset(set(packet["input"])))
        self.assertIn(str(DOC.relative_to(ROOT)), packet["output"])
        self.assertIn(str(PACKET.relative_to(ROOT)), packet["output"])
        self.assertEqual(packet["required_future_output"], str(FINAL_PACKET.relative_to(ROOT)))
        self.assertEqual(packet["next_transition"], "await_opus_architecture_packet")
        self.assertIn("GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET_FINAL", packet["required_final_packet_marker"])

    def test_a2a_queue_status_indexes_packet_032_without_execution(self):
        status = json.loads(QUEUE_STATUS_JSON.read_text(encoding="utf-8"))

        self.assertEqual(
            status["packet_counts"],
            {
                "inbox": 5,
                "outbox": 34,
                "working": 1,
                "done": 8,
                "blocked": 0,
                "total": 48,
            },
        )
        packet = next(item for item in status["packets"] if item["id"] == "packet_032")
        self.assertEqual(packet["folder"], "outbox")
        self.assertEqual(packet["agent"], "codex")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["decision_record"])
        self.assertFalse(packet["final_packet_record"])
        self.assertFalse(packet["lane2_authorized"])

        text = QUEUE_STATUS_DOC.read_text(encoding="utf-8")
        self.assertIn("packet_counts: inbox=5 outbox=34 working=1 done=8 blocked=0 total=48", text)
        self.assertIn(str(PACKET.relative_to(ROOT)), text)

    def test_execution_queue_active_index_and_mission_control_surface_packet_032(self):
        execution_queue = json.loads(EXECUTION_QUEUE_JSON.read_text(encoding="utf-8"))
        active_index = json.loads(ACTIVE_INDEX_JSON.read_text(encoding="utf-8"))
        execution_doc = EXECUTION_QUEUE_DOC.read_text(encoding="utf-8")
        active_doc = ACTIVE_INDEX_DOC.read_text(encoding="utf-8")
        mission = MISSION_CONTROL.read_text(encoding="utf-8")
        rel_packet = str(PACKET.relative_to(ROOT))
        rel_doc = str(DOC.relative_to(ROOT))

        self.assertIn(rel_packet, execution_queue["source_indexes"])
        item = next(item for item in execution_queue["items"] if item["id"] == "LANE1-OPUS-FINAL-PACKET-AUTHORING-REQUEST-PACKET-032")
        self.assertEqual(item["status"], "authoring_request_ready_local_only")
        self.assertEqual(item["gate"], "await_opus_architecture_packet")
        self.assertEqual(item["current_actionable_packet"], "packet_013")
        self.assertFalse(item["lane2_authorized"])
        self.assertIn(rel_packet, item["evidence"])
        self.assertIn(rel_doc, item["evidence"])
        self.assertIn("final_packet_creation", item["forbidden_actions"])

        workstream = next(item for item in active_index["workstreams"] if item["id"] == "ghostclaw_lane1_opus_final_packet_authoring_request")
        self.assertEqual(workstream["status"], "authoring_request_ready_local_only")
        self.assertIn(rel_packet, workstream["evidence"])
        self.assertIn(rel_doc, workstream["evidence"])
        self.assertIn("ghostclaw_lane1_opus_final_packet_authoring_request", active_doc)
        self.assertIn("packet_032", active_doc)

        for text in (execution_doc, mission):
            self.assertIn("LANE1-OPUS-FINAL-PACKET-AUTHORING-REQUEST-PACKET-032", text)
            self.assertIn(rel_packet, text)
            self.assertIn(rel_doc, text)

    def test_markdown_doc_records_non_execution_boundary(self):
        text = DOC.read_text(encoding="utf-8")
        required = [
            "GHOSTCLAW_LANE1_OPUS_FINAL_PACKET_AUTHORING_REQUEST_LOCAL_ONLY",
            "packet_032",
            "current_actionable_packet=packet_013",
            "hermes_decision_recorded=true",
            "final_packet_record=false",
            "lane2_authorized=false",
            "runtime_queue_execution=false",
            "provider_call=false",
            "real_mcp_execution=false",
            "This is not the final Opus packet",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
