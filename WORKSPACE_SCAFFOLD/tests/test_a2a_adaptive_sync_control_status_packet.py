"""A2A adaptive sync control status packet guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STATUS_JSON = ROOT / "data" / "pathspecs" / "sirinx_a2a_adaptive_sync_control_status_2026-06-29.json"
STATUS_DOC = ROOT / "docs" / "knowledge" / "SIRINX_A2A_ADAPTIVE_SYNC_CONTROL_STATUS_2026-06-29.md"
PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_021_sirinx_a2a_adaptive_sync_control_status.json"
QUEUE_STATUS_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_a2a_queue_status_2026-06-29.json"
QUEUE_STATUS_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_A2A_QUEUE_STATUS_2026-06-29.md"
EXECUTION_QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
ACTIVE_INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
CONTEXT_REGISTRY_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_context_packet_registry_2026-06-29.json"
MANIFEST_JSON = ROOT / "WORKSPACE_SCAFFOLD" / "manifests" / "active_goal_local_evidence_durability_2026-06-29.json"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"


class A2AAdaptiveSyncControlStatusPacketTests(unittest.TestCase):
    """Ensure adaptive sync control status is durable, read-only, and non-executing."""

    def load_status(self):
        self.assertTrue(STATUS_JSON.exists(), f"Missing adaptive sync status JSON: {STATUS_JSON}")
        return json.loads(STATUS_JSON.read_text(encoding="utf-8"))

    def load_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet_021: {PACKET}")
        return json.loads(PACKET.read_text(encoding="utf-8"))

    def test_status_artifacts_exist_without_runtime_execution(self):
        self.assertTrue(STATUS_JSON.exists(), f"Missing adaptive sync status JSON: {STATUS_JSON}")
        self.assertTrue(STATUS_DOC.exists(), f"Missing adaptive sync status doc: {STATUS_DOC}")
        self.assertTrue(PACKET.exists(), f"Missing adaptive sync packet: {PACKET}")

    def test_status_summarizes_current_control_plane_without_opening_gates(self):
        status = self.load_status()

        self.assertEqual(status["schema"], "sirinx.a2a_adaptive_sync.control_status.v1")
        self.assertEqual(status["status"], "a2a_adaptive_sync_control_status_ready_local_only")
        self.assertEqual(status["next_outbox_packet"], "packet_021")
        self.assertEqual(status["control_plane_mode"], "a2a2-adaptive-sync-control-plane")
        self.assertEqual(status["evidence_boundary"], "local_file_bus_only")
        self.assertFalse(status["runtime_queue_execution"])
        self.assertFalse(status["provider_call"])
        self.assertFalse(status["external_message_send"])
        self.assertFalse(status["claims_all_chats_read"])
        self.assertFalse(status["lane2_authorized"])
        self.assertEqual(status["queue_counts"]["total"], 22)
        self.assertEqual(status["queue_counts"]["outbox"], 9)
        self.assertEqual(status["current_actionable_packet"], "packet_013")
        self.assertEqual(status["latest_outbox_packet"], "packet_021")

        self.assertEqual(
            status["open_blockers"],
            [
                "BLOCK-CHAT-EXPORT",
                "BLOCK-LANE1-OPUS-PACKET",
                "BLOCK-HERMES-GATEWAY",
                "BLOCK-V3-3-ARTIFACT",
                "BLOCK-R0-APPROVALS",
            ],
        )

        required_next_actions = {item["id"]: item for item in status["next_safe_actions"]}
        self.assertIn("review_packet_021_status", required_next_actions)
        self.assertIn("provide_all_chat_source", required_next_actions)
        self.assertIn("record_hermes_packet_013_decision", required_next_actions)

        for action in (
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "paid_provider_call",
            "provider_call",
            "runtime_queue_execution",
            "connector_read",
        ):
            self.assertIn(action, status["forbidden_actions"])

    def test_packet_021_is_safe_status_outbox_only(self):
        packet = self.load_packet()

        self.assertEqual(packet["id"], "packet_021")
        self.assertEqual(packet["project"], "sirinx")
        self.assertEqual(packet["agent"], "codex")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertEqual(packet["approval_scope"], "read_only_status_review_only")
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["external_message_send"])
        self.assertFalse(packet["secret_read"])
        self.assertFalse(packet["claims_goal_complete"])
        self.assertFalse(packet["claims_all_chats_read"])
        self.assertIn(str(STATUS_JSON.relative_to(ROOT)), packet["input"])
        self.assertIn(str(STATUS_DOC.relative_to(ROOT)), packet["input"])
        self.assertIn(str(PACKET.relative_to(ROOT)), packet["output"])

    def test_queue_status_indexes_packet_021_without_execution(self):
        queue_status = json.loads(QUEUE_STATUS_JSON.read_text(encoding="utf-8"))

        self.assertEqual(
            queue_status["packet_counts"],
            {
                "inbox": 5,
                "outbox": 15,
                "working": 1,
                "done": 8,
                "blocked": 0,
                "total": 29,
            },
        )
        packet = next(item for item in queue_status["packets"] if item["id"] == "packet_021")
        self.assertEqual(packet["folder"], "outbox")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["external_message_send"])
        self.assertFalse(packet["secret_read"])

        text = QUEUE_STATUS_DOC.read_text(encoding="utf-8")
        self.assertIn("packet_counts: inbox=5 outbox=15 working=1 done=8 blocked=0 total=29", text)
        self.assertIn(str(PACKET.relative_to(ROOT)), text)

    def test_status_surfaces_across_queue_index_registry_manifest_and_mission_control(self):
        rel_json = str(STATUS_JSON.relative_to(ROOT))
        rel_doc = str(STATUS_DOC.relative_to(ROOT))
        rel_packet = str(PACKET.relative_to(ROOT))

        execution_queue = json.loads(EXECUTION_QUEUE_JSON.read_text(encoding="utf-8"))
        active_index = json.loads(ACTIVE_INDEX_JSON.read_text(encoding="utf-8"))
        registry = json.loads(CONTEXT_REGISTRY_JSON.read_text(encoding="utf-8"))
        manifest = json.loads(MANIFEST_JSON.read_text(encoding="utf-8"))
        mission = MISSION_CONTROL.read_text(encoding="utf-8")

        self.assertIn(rel_json, execution_queue["source_indexes"])
        queue_item = next(item for item in execution_queue["items"] if item["id"] == "A2A-ADAPTIVE-SYNC-CONTROL-STATUS-PACKET-021")
        self.assertEqual(queue_item["status"], "a2a_adaptive_sync_control_status_ready_local_only")
        self.assertIn(rel_json, queue_item["evidence"])
        self.assertIn(rel_doc, queue_item["evidence"])
        self.assertIn(rel_packet, queue_item["evidence"])
        self.assertIn("runtime_queue_execution", queue_item["forbidden_actions"])

        stream = next(item for item in active_index["workstreams"] if item["id"] == "a2a_adaptive_sync_control_status")
        self.assertEqual(stream["status"], "a2a_adaptive_sync_control_status_ready_local_only")
        self.assertIn(rel_json, stream["evidence"])
        self.assertIn(rel_packet, stream["evidence"])

        packet = next(item for item in registry["context_packets"] if item["id"] == "ctx-a2a-adaptive-sync-control-status")
        self.assertEqual(packet["source"], rel_json)
        self.assertEqual(packet["permission"], "local_read_only")
        self.assertEqual(packet["status"], "a2a_adaptive_sync_control_status_ready_local_only")

        manifest_paths = {entry["path"] for entry in manifest["ignored_pathspecs"]}
        self.assertIn(rel_json, manifest_paths)
        self.assertIn(rel_json, mission)
        self.assertIn(rel_doc, mission)

    def test_markdown_status_states_local_only_boundaries(self):
        self.assertTrue(STATUS_DOC.exists(), f"Missing adaptive sync status doc: {STATUS_DOC}")
        text = STATUS_DOC.read_text(encoding="utf-8")
        required = [
            "A2A_ADAPTIVE_SYNC_CONTROL_STATUS_LOCAL_ONLY",
            "status=a2a_adaptive_sync_control_status_ready_local_only",
            "next_outbox_packet=packet_021",
            "current_actionable_packet=packet_013",
            "latest_outbox_packet=packet_021",
            "claims_all_chats_read=false",
            "runtime_queue_execution=false",
            "provider_call=false",
            "lane2_authorized=false",
            "No queue item was executed.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
