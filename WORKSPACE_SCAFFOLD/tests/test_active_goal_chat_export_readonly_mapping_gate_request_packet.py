"""Active-goal ChatGPT export read-only mapping gate request guardrails."""
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_035_active_goal_chat_export_readonly_mapping_gate_request.json"
DOC = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_CHAT_EXPORT_READONLY_MAPPING_GATE_REQUEST_2026-07-02.md"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
QUEUE_STATUS_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_a2a_queue_status_2026-06-29.json"
QUEUE_STATUS_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_A2A_QUEUE_STATUS_2026-06-29.md"
EXECUTION_QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
ACTIVE_INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
ACTIVE_INDEX_DOC = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_SYSTEMATIC_WORK_INDEX_2026-06-29.md"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"


class ActiveGoalChatExportReadonlyMappingGateRequestPacketTests(unittest.TestCase):
    """Ensure packet_035 requests the next gate without approving or reading an export."""

    def load_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet_035: {PACKET}")
        return json.loads(PACKET.read_text(encoding="utf-8"))

    def test_packet_artifacts_exist_without_final_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet_035: {PACKET}")
        self.assertTrue(DOC.exists(), f"Missing packet_035 doc: {DOC}")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 Opus packet exists unexpectedly")

    def test_packet_035_is_gate_request_only_not_approval_or_export_import(self):
        packet = self.load_packet()

        self.assertEqual(packet["id"], "packet_035")
        self.assertEqual(packet["project"], "ghostclaw")
        self.assertEqual(packet["agent"], "codex")
        self.assertEqual(packet["to_agent"], "hermes_kob_operator")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertEqual(packet["approval_status"], "not_granted")
        self.assertEqual(packet["approval_scope"], "chat_export_readonly_mapping_gate_request_not_approval")
        self.assertFalse(packet["approval_required"])
        self.assertFalse(packet["approval_packet_record"])
        self.assertTrue(packet["execution_approval_required"])
        self.assertEqual(packet["source_packet"], "packet_034")
        self.assertEqual(packet["selected_blocker"], "BLOCK-CHAT-EXPORT")
        self.assertEqual(packet["selected_gate"], "APPROVE_CHATGPT_EXPORT_READONLY_MAPPING_<path>_<date>")
        self.assertTrue(packet["dry_run"])
        self.assertTrue(packet["not_approval"])
        self.assertFalse(packet["claims_goal_complete"])
        self.assertFalse(packet["claims_all_chats_read"])
        self.assertFalse(packet["final_packet_record"])
        self.assertFalse(packet["decision_record"])
        self.assertFalse(packet["lane2_authorized"])

        for field in (
            "runtime_queue_execution",
            "provider_call",
            "paid_provider_call",
            "real_mcp_execution",
            "connector_read_performed",
            "real_export_loaded",
            "raw_chat_content_stored",
            "external_upload",
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
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
            "service_repair",
            "service_restart",
            "state_mutation",
        ):
            self.assertFalse(packet[field], f"{field} should remain false")

    def test_packet_requires_exact_operator_input_and_receipt_fields(self):
        packet = self.load_packet()
        operator_input = packet["required_operator_input"]

        self.assertEqual(operator_input["approval_phrase"], "APPROVE_CHATGPT_EXPORT_READONLY_MAPPING_<path>_<date>")
        self.assertEqual(operator_input["local_path_or_connector_scope"], "operator_supplied_required")
        self.assertTrue(operator_input["read_only"])
        self.assertTrue(operator_input["redaction_confirmed"])
        self.assertFalse(operator_input["raw_chat_content_stored"])
        self.assertFalse(operator_input["claims_all_chats_read"])
        self.assertIn("source_hash_or_query_id", packet["required_receipt_fields"])
        self.assertIn("redaction_confirmed", packet["required_receipt_fields"])
        self.assertIn("raw_chat_content_stored", packet["required_receipt_fields"])
        self.assertIn("claims_all_chats_read", packet["required_receipt_fields"])
        self.assertIn("connector_read_performed", packet["forbidden_without_gate"])
        self.assertIn("real_export_loaded", packet["forbidden_without_gate"])
        self.assertIn("raw_chat_content_stored", packet["forbidden_without_gate"])
        self.assertIn("claims_all_chats_read", packet["forbidden_without_gate"])

    def test_packet_links_matrix_request_and_mapper_contracts(self):
        packet = self.load_packet()

        for rel_path in (
            "_A2A_QUEUE/outbox/packet_034_active_goal_blocker_clearance_approval_matrix.json",
            "docs/knowledge/SIRINX_ACTIVE_GOAL_BLOCKER_CLEARANCE_APPROVAL_MATRIX_2026-07-02.md",
            "_A2A_QUEUE/outbox/packet_020_sirinx_all_chat_export_request.json",
            "docs/knowledge/SIRINX_ALL_CHAT_EXPORT_REQUEST_PACKET_2026-06-29.md",
            "data/pathspecs/sirinx_all_chat_export_intake_contract_2026-06-29.json",
            "data/pathspecs/sirinx_all_chat_export_intake_mapper_2026-06-29.json",
        ):
            self.assertIn(rel_path, packet["input"])

        self.assertIn(str(DOC.relative_to(ROOT)), packet["output"])
        self.assertIn(str(PACKET.relative_to(ROOT)), packet["output"])
        self.assertIn("source_receipt_metadata_json", packet["required_future_outputs"])
        self.assertIn("metadata_only_mapping_report", packet["required_future_outputs"])

    def test_a2a_queue_status_indexes_packet_035_without_execution(self):
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
        packet = next(item for item in status["packets"] if item["id"] == "packet_035")
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

    def test_execution_queue_active_index_and_mission_control_surface_packet_035(self):
        execution_queue = json.loads(EXECUTION_QUEUE_JSON.read_text(encoding="utf-8"))
        active_index = json.loads(ACTIVE_INDEX_JSON.read_text(encoding="utf-8"))
        active_doc = ACTIVE_INDEX_DOC.read_text(encoding="utf-8")
        mission = MISSION_CONTROL.read_text(encoding="utf-8")
        rel_packet = str(PACKET.relative_to(ROOT))
        rel_doc = str(DOC.relative_to(ROOT))

        self.assertIn(rel_packet, execution_queue["source_indexes"])
        item = next(item for item in execution_queue["items"] if item["id"] == "ACTIVE-GOAL-CHAT-EXPORT-READONLY-MAPPING-GATE-REQUEST-PACKET-035")
        self.assertEqual(item["status"], "gate_request_ready_local_only")
        self.assertEqual(item["gate"], "chat_export_readonly_mapping_approval_required")
        self.assertEqual(item["current_actionable_packet"], "packet_013")
        self.assertFalse(item["lane2_authorized"])
        self.assertIn(rel_packet, item["evidence"])
        self.assertIn(rel_doc, item["evidence"])
        self.assertIn("raw_chat_content_stored", item["forbidden_actions"])
        self.assertIn("claims_all_chats_read", item["forbidden_actions"])
        self.assertIn("connector_read_performed", item["forbidden_actions"])

        workstream = next(item for item in active_index["workstreams"] if item["id"] == "active_goal_chat_export_readonly_mapping_gate_request")
        self.assertEqual(workstream["status"], "gate_request_ready_local_only")
        self.assertIn(rel_packet, workstream["evidence"])
        self.assertIn(rel_doc, workstream["evidence"])
        self.assertIn("latest_outbox_packet=packet_040", active_doc)

        self.assertIn("ACTIVE-GOAL-CHAT-EXPORT-READONLY-MAPPING-GATE-REQUEST-PACKET-035", mission)
        self.assertIn(rel_packet, mission)
        self.assertIn(rel_doc, mission)

    def test_markdown_doc_records_no_approval_no_export_boundary(self):
        text = DOC.read_text(encoding="utf-8")
        required = [
            "ACTIVE_GOAL_CHAT_EXPORT_READONLY_MAPPING_GATE_REQUEST_LOCAL_ONLY",
            "packet=packet_035",
            "source_packet=packet_034",
            "selected_blocker=BLOCK-CHAT-EXPORT",
            "selected_gate=APPROVE_CHATGPT_EXPORT_READONLY_MAPPING_<path>_<date>",
            "approval_status=not_granted",
            "claims_all_chats_read=false",
            "raw_chat_content_stored=false",
            "real_export_loaded=false",
            "connector_read_performed=false",
            "No approval is granted.",
            "No connector was read.",
            "No ChatGPT export was loaded.",
            "Operator reviews `packet_035`.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
