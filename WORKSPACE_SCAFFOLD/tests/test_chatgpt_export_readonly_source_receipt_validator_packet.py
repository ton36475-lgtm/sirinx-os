"""Packet_036 ChatGPT export read-only receipt validator guardrails."""
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_036_chatgpt_export_readonly_source_receipt_validator.json"
VALIDATOR = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "validate_chatgpt_export_readonly_source_receipt.py"
PATHSPEC = ROOT / "data" / "pathspecs" / "sirinx_chatgpt_export_readonly_source_receipt_validator_2026-07-02.json"
DOC = ROOT / "docs" / "knowledge" / "SIRINX_CHATGPT_EXPORT_READONLY_SOURCE_RECEIPT_VALIDATOR_2026-07-02.md"
QUEUE_STATUS_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_a2a_queue_status_2026-06-29.json"
QUEUE_STATUS_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_A2A_QUEUE_STATUS_2026-06-29.md"
EXECUTION_QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
ACTIVE_INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
ACTIVE_INDEX_DOC = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_SYSTEMATIC_WORK_INDEX_2026-06-29.md"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"


class ChatgptExportReadonlySourceReceiptValidatorPacketTests(unittest.TestCase):
    """Ensure packet_036 is review-only and visible in local A2A surfaces."""

    def load_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet_036: {PACKET}")
        return json.loads(PACKET.read_text(encoding="utf-8"))

    def test_packet_artifacts_exist(self):
        for path in (PACKET, VALIDATOR, PATHSPEC, DOC):
            self.assertTrue(path.exists(), f"Missing artifact: {path}")

    def test_packet_036_is_validator_review_only_not_approval_or_source_load(self):
        packet = self.load_packet()

        self.assertEqual(packet["id"], "packet_036")
        self.assertEqual(packet["source_packet"], "packet_035")
        self.assertEqual(packet["selected_blocker"], "BLOCK-CHAT-EXPORT")
        self.assertEqual(packet["approval_status"], "not_granted")
        self.assertEqual(packet["approval_scope"], "validator_review_packet_not_approval")
        self.assertFalse(packet["approval_required"])
        self.assertFalse(packet["approval_packet_record"])
        self.assertTrue(packet["execution_approval_required"])
        self.assertTrue(packet["dry_run"])
        self.assertTrue(packet["not_approval"])

        for field in (
            "claims_goal_complete",
            "claims_all_chats_read",
            "final_packet_record",
            "decision_record",
            "runtime_queue_execution",
            "provider_call",
            "paid_provider_call",
            "real_mcp_execution",
            "connector_read_performed",
            "real_export_loaded",
            "source_loaded",
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
            "lane2_authorized",
        ):
            self.assertFalse(packet[field], f"{field} should remain false")

    def test_packet_links_validator_contract_and_forbidden_raw_fields(self):
        packet = self.load_packet()

        self.assertEqual(packet["validator"]["schema"], "sirinx.chatgpt_export.readonly_source_receipt_validator.v1")
        self.assertEqual(packet["validator"]["script"], str(VALIDATOR.relative_to(ROOT)))
        self.assertEqual(packet["validator"]["pathspec"], str(PATHSPEC.relative_to(ROOT)))
        self.assertEqual(packet["validator"]["doc"], str(DOC.relative_to(ROOT)))
        self.assertIn("approval_phrase", packet["required_receipt_fields"])
        self.assertIn("raw_chat_content_stored", packet["required_receipt_fields"])
        self.assertIn("claims_all_chats_read", packet["required_receipt_fields"])
        self.assertIn("messages", packet["forbidden_receipt_fields"])
        self.assertIn("transcript", packet["forbidden_receipt_fields"])
        self.assertIn("content", packet["forbidden_receipt_fields"])
        self.assertIn("validate_operator_receipt_metadata", packet["allowed_after_approval_only"])
        self.assertIn("source_loaded", packet["forbidden_without_gate"])

    def test_a2a_queue_execution_queue_active_index_and_mission_control_link_packet_036(self):
        status = json.loads(QUEUE_STATUS_JSON.read_text(encoding="utf-8"))
        self.assertEqual(status["packet_counts"], {"inbox": 5, "outbox": 34, "working": 1, "done": 8, "blocked": 0, "total": 48})
        packet = next(item for item in status["packets"] if item["id"] == "packet_036")
        self.assertEqual(packet["folder"], "outbox")
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["decision_record"])
        self.assertFalse(packet["lane2_authorized"])

        text = QUEUE_STATUS_DOC.read_text(encoding="utf-8")
        self.assertIn("packet_counts: inbox=5 outbox=34 working=1 done=8 blocked=0 total=48", text)
        self.assertIn(str(PACKET.relative_to(ROOT)), text)

        execution_queue = json.loads(EXECUTION_QUEUE_JSON.read_text(encoding="utf-8"))
        item = next(item for item in execution_queue["items"] if item["id"] == "CHATGPT-EXPORT-READONLY-SOURCE-RECEIPT-VALIDATOR-PACKET-036")
        self.assertEqual(item["status"], "validator_review_ready_local_only")
        self.assertIn(str(PACKET.relative_to(ROOT)), item["evidence"])
        self.assertIn("source_loaded", item["forbidden_actions"])
        self.assertIn("raw_chat_content_stored", item["forbidden_actions"])
        self.assertIn("claims_all_chats_read", item["forbidden_actions"])

        active = json.loads(ACTIVE_INDEX_JSON.read_text(encoding="utf-8"))
        workstream = next(item for item in active["workstreams"] if item["id"] == "chatgpt_export_readonly_source_receipt_validator")
        self.assertEqual(workstream["status"], "validator_review_ready_local_only")
        self.assertIn(str(PACKET.relative_to(ROOT)), workstream["evidence"])

        active_doc = ACTIVE_INDEX_DOC.read_text(encoding="utf-8")
        self.assertIn("latest_outbox_packet=packet_040", active_doc)
        self.assertIn("chatgpt_export_readonly_source_receipt_validator", active_doc)

        mission = MISSION_CONTROL.read_text(encoding="utf-8")
        self.assertIn("CHATGPT-EXPORT-READONLY-SOURCE-RECEIPT-VALIDATOR-PACKET-036", mission)
        self.assertIn(str(PACKET.relative_to(ROOT)), mission)
        self.assertIn(str(VALIDATOR.relative_to(ROOT)), mission)


if __name__ == "__main__":
    unittest.main()
