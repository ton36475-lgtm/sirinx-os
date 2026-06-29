"""All-chat export request packet guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REQUEST_JSON = ROOT / "data" / "pathspecs" / "sirinx_all_chat_export_request_packet_2026-06-29.json"
REQUEST_DOC = ROOT / "docs" / "knowledge" / "SIRINX_ALL_CHAT_EXPORT_REQUEST_PACKET_2026-06-29.md"
PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_020_sirinx_all_chat_export_request.json"
CONTRACT_JSON = ROOT / "data" / "pathspecs" / "sirinx_all_chat_export_intake_contract_2026-06-29.json"
MAPPER_JSON = ROOT / "data" / "pathspecs" / "sirinx_all_chat_export_intake_mapper_2026-06-29.json"
QUEUE_STATUS_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_a2a_queue_status_2026-06-29.json"
QUEUE_STATUS_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_A2A_QUEUE_STATUS_2026-06-29.md"
EXECUTION_QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
ACTIVE_INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
CONTEXT_REGISTRY_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_context_packet_registry_2026-06-29.json"
MANIFEST_JSON = ROOT / "WORKSPACE_SCAFFOLD" / "manifests" / "active_goal_local_evidence_durability_2026-06-29.json"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"


class AllChatExportRequestPacketTests(unittest.TestCase):
    """Ensure packet_020 requests an export without importing or claiming all chats."""

    def load_request(self):
        self.assertTrue(REQUEST_JSON.exists(), f"Missing request JSON: {REQUEST_JSON}")
        return json.loads(REQUEST_JSON.read_text(encoding="utf-8"))

    def load_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet_020: {PACKET}")
        return json.loads(PACKET.read_text(encoding="utf-8"))

    def test_request_artifacts_exist_without_export_or_all_chat_claim(self):
        self.assertTrue(REQUEST_JSON.exists(), f"Missing request JSON: {REQUEST_JSON}")
        self.assertTrue(REQUEST_DOC.exists(), f"Missing request doc: {REQUEST_DOC}")
        self.assertTrue(PACKET.exists(), f"Missing all-chat export request packet: {PACKET}")

    def test_request_is_receipt_request_not_export_import(self):
        request = self.load_request()

        self.assertEqual(request["schema"], "sirinx.all_chat_export.request_packet.v1")
        self.assertEqual(request["status"], "request_packet_ready_no_export_loaded")
        self.assertEqual(request["next_outbox_packet"], "packet_020")
        self.assertEqual(request["blocker"], "BLOCK-CHAT-EXPORT")
        self.assertFalse(request["claims_all_chats_read"])
        self.assertFalse(request["raw_chat_content_stored"])
        self.assertFalse(request["real_export_loaded"])
        self.assertFalse(request["connector_read_performed"])
        self.assertEqual(request["required_operator_input"], "chatgpt_export_or_connector_backed_source")
        self.assertIn(str(CONTRACT_JSON.relative_to(ROOT)), request["evidence_paths"])
        self.assertIn(str(MAPPER_JSON.relative_to(ROOT)), request["evidence_paths"])

        required_fields = set(request["required_receipt_fields"])
        self.assertTrue(
            {
                "source_kind",
                "local_path_or_connector_scope",
                "operator_supplied",
                "read_only",
                "source_hash_or_query_id",
                "redaction_confirmed",
                "raw_chat_content_stored",
                "claims_all_chats_read",
            }.issubset(required_fields)
        )

        for action in (
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "paid_provider_call",
            "provider_call",
            "runtime_queue_execution",
            "external_upload",
            "connector_read_performed",
        ):
            self.assertIn(action, request["forbidden_actions"])

    def test_packet_020_is_safe_outbox_only(self):
        packet = self.load_packet()

        self.assertEqual(packet["id"], "packet_020")
        self.assertEqual(packet["project"], "sirinx")
        self.assertEqual(packet["agent"], "codex")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertTrue(packet["approval_required"])
        self.assertEqual(packet["approval_scope"], "operator_supplied_all_chat_source_request_only")
        self.assertFalse(packet["claims_all_chats_read"])
        self.assertFalse(packet["raw_chat_content_stored"])
        self.assertFalse(packet["real_export_loaded"])
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["external_message_send"])
        self.assertFalse(packet["secret_read"])
        self.assertIn(str(REQUEST_JSON.relative_to(ROOT)), packet["input"])
        self.assertIn(str(REQUEST_DOC.relative_to(ROOT)), packet["input"])
        self.assertIn(str(PACKET.relative_to(ROOT)), packet["output"])

    def test_queue_status_indexes_packet_020_without_execution(self):
        status = json.loads(QUEUE_STATUS_JSON.read_text(encoding="utf-8"))

        self.assertEqual(
            status["packet_counts"],
            {
                "inbox": 4,
                "outbox": 11,
                "working": 1,
                "done": 8,
                "blocked": 0,
                "total": 24,
            },
        )
        packet = next(item for item in status["packets"] if item["id"] == "packet_020")
        self.assertEqual(packet["folder"], "outbox")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["external_message_send"])
        self.assertFalse(packet["secret_read"])
        self.assertFalse(status["claims_all_chats_read"])

        text = QUEUE_STATUS_DOC.read_text(encoding="utf-8")
        self.assertIn("packet_counts: inbox=4 outbox=11 working=1 done=8 blocked=0 total=24", text)
        self.assertIn(str(PACKET.relative_to(ROOT)), text)

    def test_status_surfaces_request_packet(self):
        rel_json = str(REQUEST_JSON.relative_to(ROOT))
        rel_doc = str(REQUEST_DOC.relative_to(ROOT))
        rel_packet = str(PACKET.relative_to(ROOT))

        execution_queue = json.loads(EXECUTION_QUEUE_JSON.read_text(encoding="utf-8"))
        active_index = json.loads(ACTIVE_INDEX_JSON.read_text(encoding="utf-8"))
        registry = json.loads(CONTEXT_REGISTRY_JSON.read_text(encoding="utf-8"))
        manifest = json.loads(MANIFEST_JSON.read_text(encoding="utf-8"))
        mission = MISSION_CONTROL.read_text(encoding="utf-8")

        self.assertIn(rel_json, execution_queue["source_indexes"])
        queue_item = next(item for item in execution_queue["items"] if item["id"] == "ALL-CHAT-EXPORT-REQUEST-PACKET-020")
        self.assertEqual(queue_item["status"], "request_packet_ready_no_export_loaded")
        self.assertIn(rel_json, queue_item["evidence"])
        self.assertIn(rel_doc, queue_item["evidence"])
        self.assertIn(rel_packet, queue_item["evidence"])
        self.assertIn("raw_chat_content_stored", queue_item["forbidden_actions"])
        self.assertIn("claims_all_chats_read", queue_item["forbidden_actions"])

        stream = next(item for item in active_index["workstreams"] if item["id"] == "all_chat_export_request_packet")
        self.assertEqual(stream["status"], "request_packet_ready_no_export_loaded")
        self.assertIn(rel_json, stream["evidence"])
        self.assertIn(rel_packet, stream["evidence"])

        packet = next(item for item in registry["context_packets"] if item["id"] == "ctx-all-chat-export-request-packet")
        self.assertEqual(packet["source"], rel_json)
        self.assertEqual(packet["permission"], "operator_required")
        self.assertEqual(packet["status"], "request_packet_ready_no_export_loaded")

        manifest_paths = {entry["path"] for entry in manifest["ignored_pathspecs"]}
        self.assertIn(rel_json, manifest_paths)
        self.assertIn(rel_json, mission)
        self.assertIn(rel_doc, mission)

    def test_markdown_request_states_no_action_boundary(self):
        self.assertTrue(REQUEST_DOC.exists(), f"Missing request doc: {REQUEST_DOC}")
        text = REQUEST_DOC.read_text(encoding="utf-8")
        required = [
            "ALL_CHAT_EXPORT_REQUEST_PACKET_LOCAL_ONLY",
            "status=request_packet_ready_no_export_loaded",
            "next_outbox_packet=packet_020",
            "claims_all_chats_read=false",
            "raw_chat_content_stored=false",
            "real_export_loaded=false",
            "connector_read_performed=false",
            "No raw chat content was loaded or written.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
