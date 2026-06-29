"""A2A next-safe-action sequencer packet guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEQUENCER_JSON = ROOT / "data" / "pathspecs" / "sirinx_a2a_next_safe_action_sequencer_2026-06-29.json"
SEQUENCER_DOC = ROOT / "docs" / "knowledge" / "SIRINX_A2A_NEXT_SAFE_ACTION_SEQUENCER_2026-06-29.md"
PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_022_sirinx_a2a_next_safe_action_sequencer.json"
QUEUE_STATUS_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_a2a_queue_status_2026-06-29.json"
QUEUE_STATUS_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_A2A_QUEUE_STATUS_2026-06-29.md"
EXECUTION_QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
ACTIVE_INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
CONTEXT_REGISTRY_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_context_packet_registry_2026-06-29.json"
MANIFEST_JSON = ROOT / "WORKSPACE_SCAFFOLD" / "manifests" / "active_goal_local_evidence_durability_2026-06-29.json"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"


class A2ANextSafeActionSequencerPacketTests(unittest.TestCase):
    """Ensure packet_022 chooses a local next lane without executing or approving it."""

    def load_sequencer(self):
        self.assertTrue(SEQUENCER_JSON.exists(), f"Missing sequencer JSON: {SEQUENCER_JSON}")
        return json.loads(SEQUENCER_JSON.read_text(encoding="utf-8"))

    def load_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet_022: {PACKET}")
        return json.loads(PACKET.read_text(encoding="utf-8"))

    def test_sequencer_artifacts_exist_without_runtime_execution(self):
        self.assertTrue(SEQUENCER_JSON.exists(), f"Missing sequencer JSON: {SEQUENCER_JSON}")
        self.assertTrue(SEQUENCER_DOC.exists(), f"Missing sequencer doc: {SEQUENCER_DOC}")
        self.assertTrue(PACKET.exists(), f"Missing packet_022: {PACKET}")

    def test_sequencer_selects_packet_013_decision_lane_without_opening_gates(self):
        sequencer = self.load_sequencer()

        self.assertEqual(sequencer["schema"], "sirinx.a2a_adaptive_sync.next_safe_action_sequencer.v1")
        self.assertEqual(sequencer["status"], "a2a_next_safe_action_sequencer_ready_local_only")
        self.assertEqual(sequencer["next_outbox_packet"], "packet_022")
        self.assertEqual(sequencer["source_status_packet"], "packet_021")
        self.assertEqual(sequencer["control_plane_mode"], "a2a2-adaptive-sync-control-plane")
        self.assertEqual(sequencer["evidence_boundary"], "local_file_bus_only")
        self.assertEqual(sequencer["current_actionable_packet"], "packet_013")
        self.assertEqual(sequencer["selected_next_lane"], "record_hermes_packet_013_decision")
        self.assertEqual(sequencer["selected_next_packet"], "packet_013")
        self.assertEqual(sequencer["selected_next_owner"], "Hermes")
        self.assertEqual(sequencer["queue_counts"]["total"], 23)
        self.assertEqual(sequencer["queue_counts"]["outbox"], 10)
        self.assertEqual(sequencer["latest_outbox_packet"], "packet_022")

        for field in (
            "runtime_queue_execution",
            "provider_call",
            "connector_read_performed",
            "external_message_send",
            "decision_record",
            "state_mutation",
            "lane2_authorized",
            "claims_goal_complete",
            "claims_all_chats_read",
        ):
            self.assertFalse(sequencer[field], f"{field} should remain false")

        sequenced = {item["id"]: item for item in sequencer["sequenced_safe_actions"]}
        self.assertEqual(sequenced["record_hermes_packet_013_decision"]["rank"], 1)
        self.assertEqual(sequenced["record_hermes_packet_013_decision"]["gate"], "hermes_decision_record_required")
        self.assertEqual(sequenced["provide_all_chat_source"]["rank"], 2)
        self.assertEqual(sequenced["provide_v3_3_artifact"]["rank"], 3)
        self.assertEqual(sequenced["provide_r0_gate_specific_approval"]["rank"], 4)

        self.assertEqual(
            sequencer["open_blockers"],
            [
                "BLOCK-CHAT-EXPORT",
                "BLOCK-LANE1-OPUS-PACKET",
                "BLOCK-HERMES-GATEWAY",
                "BLOCK-V3-3-ARTIFACT",
                "BLOCK-R0-APPROVALS",
            ],
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
            "connector_read",
            "decision_record",
            "state_mutation",
            "lane2_authorization",
        ):
            self.assertIn(action, sequencer["forbidden_actions"])

    def test_packet_022_is_safe_sequencer_outbox_only(self):
        packet = self.load_packet()

        self.assertEqual(packet["id"], "packet_022")
        self.assertEqual(packet["project"], "sirinx")
        self.assertEqual(packet["agent"], "codex")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertEqual(packet["approval_scope"], "read_only_next_safe_action_review_only")
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["external_message_send"])
        self.assertFalse(packet["secret_read"])
        self.assertFalse(packet["decision_record"])
        self.assertFalse(packet["state_mutation"])
        self.assertFalse(packet["lane2_authorized"])
        self.assertFalse(packet["claims_goal_complete"])
        self.assertFalse(packet["claims_all_chats_read"])
        self.assertIn(str(SEQUENCER_JSON.relative_to(ROOT)), packet["input"])
        self.assertIn(str(SEQUENCER_DOC.relative_to(ROOT)), packet["input"])
        self.assertIn(str(PACKET.relative_to(ROOT)), packet["output"])

    def test_queue_status_indexes_packet_022_without_execution(self):
        queue_status = json.loads(QUEUE_STATUS_JSON.read_text(encoding="utf-8"))

        self.assertEqual(
            queue_status["packet_counts"],
            {
                "inbox": 4,
                "outbox": 11,
                "working": 1,
                "done": 8,
                "blocked": 0,
                "total": 24,
            },
        )
        packet = next(item for item in queue_status["packets"] if item["id"] == "packet_022")
        self.assertEqual(packet["folder"], "outbox")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["external_message_send"])
        self.assertFalse(packet["secret_read"])
        self.assertFalse(packet["decision_record"])
        self.assertFalse(packet["lane2_authorized"])

        text = QUEUE_STATUS_DOC.read_text(encoding="utf-8")
        self.assertIn("packet_counts: inbox=4 outbox=11 working=1 done=8 blocked=0 total=24", text)
        self.assertIn(str(PACKET.relative_to(ROOT)), text)

    def test_sequencer_surfaces_across_queue_index_registry_manifest_and_mission_control(self):
        rel_json = str(SEQUENCER_JSON.relative_to(ROOT))
        rel_doc = str(SEQUENCER_DOC.relative_to(ROOT))
        rel_packet = str(PACKET.relative_to(ROOT))

        execution_queue = json.loads(EXECUTION_QUEUE_JSON.read_text(encoding="utf-8"))
        active_index = json.loads(ACTIVE_INDEX_JSON.read_text(encoding="utf-8"))
        registry = json.loads(CONTEXT_REGISTRY_JSON.read_text(encoding="utf-8"))
        manifest = json.loads(MANIFEST_JSON.read_text(encoding="utf-8"))
        mission = MISSION_CONTROL.read_text(encoding="utf-8")

        self.assertIn(rel_json, execution_queue["source_indexes"])
        queue_item = next(item for item in execution_queue["items"] if item["id"] == "A2A-NEXT-SAFE-ACTION-SEQUENCER-PACKET-022")
        self.assertEqual(queue_item["status"], "a2a_next_safe_action_sequencer_ready_local_only")
        self.assertEqual(queue_item["gate"], "local_read_only_next_lane_review")
        self.assertIn(rel_json, queue_item["evidence"])
        self.assertIn(rel_doc, queue_item["evidence"])
        self.assertIn(rel_packet, queue_item["evidence"])
        self.assertIn("decision_record", queue_item["forbidden_actions"])
        self.assertIn("runtime_queue_execution", queue_item["forbidden_actions"])

        stream = next(item for item in active_index["workstreams"] if item["id"] == "a2a_next_safe_action_sequencer")
        self.assertEqual(stream["status"], "a2a_next_safe_action_sequencer_ready_local_only")
        self.assertIn(rel_json, stream["evidence"])
        self.assertIn(rel_packet, stream["evidence"])

        packet = next(item for item in registry["context_packets"] if item["id"] == "ctx-a2a-next-safe-action-sequencer")
        self.assertEqual(packet["source"], rel_json)
        self.assertEqual(packet["permission"], "local_read_only")
        self.assertEqual(packet["status"], "a2a_next_safe_action_sequencer_ready_local_only")

        manifest_paths = {entry["path"] for entry in manifest["ignored_pathspecs"]}
        self.assertIn(rel_json, manifest_paths)
        self.assertIn(rel_json, mission)
        self.assertIn(rel_doc, mission)

    def test_markdown_sequencer_states_local_only_boundaries(self):
        self.assertTrue(SEQUENCER_DOC.exists(), f"Missing sequencer doc: {SEQUENCER_DOC}")
        text = SEQUENCER_DOC.read_text(encoding="utf-8")
        required = [
            "A2A_NEXT_SAFE_ACTION_SEQUENCER_LOCAL_ONLY",
            "status=a2a_next_safe_action_sequencer_ready_local_only",
            "source_status_packet=packet_021",
            "next_outbox_packet=packet_022",
            "selected_next_lane=record_hermes_packet_013_decision",
            "selected_next_packet=packet_013",
            "current_actionable_packet=packet_013",
            "latest_outbox_packet=packet_022",
            "claims_all_chats_read=false",
            "runtime_queue_execution=false",
            "provider_call=false",
            "decision_record=false",
            "lane2_authorized=false",
            "No queue item was executed.",
            "No Hermes decision was recorded.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
