"""Hermes gateway current recheck packet guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RECHECK_JSON = ROOT / "data" / "pathspecs" / "sirinx_hermes_gateway_current_recheck_packet_2026-06-29.json"
RECHECK_DOC = ROOT / "docs" / "knowledge" / "SIRINX_HERMES_GATEWAY_CURRENT_RECHECK_PACKET_2026-06-29.md"
PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_023_sirinx_hermes_gateway_current_recheck.json"
QUEUE_STATUS_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_a2a_queue_status_2026-06-29.json"
QUEUE_STATUS_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_A2A_QUEUE_STATUS_2026-06-29.md"
EXECUTION_QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
ACTIVE_INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
CONTEXT_REGISTRY_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_context_packet_registry_2026-06-29.json"
MANIFEST_JSON = ROOT / "WORKSPACE_SCAFFOLD" / "manifests" / "active_goal_local_evidence_durability_2026-06-29.json"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"


class HermesGatewayCurrentRecheckPacketTests(unittest.TestCase):
    """Ensure packet_023 records current Hermes gateway state without restarting or executing."""

    def load_recheck(self):
        self.assertTrue(RECHECK_JSON.exists(), f"Missing current recheck JSON: {RECHECK_JSON}")
        return json.loads(RECHECK_JSON.read_text(encoding="utf-8"))

    def load_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet_023: {PACKET}")
        return json.loads(PACKET.read_text(encoding="utf-8"))

    def test_recheck_artifacts_exist_without_restart_or_runtime_execution(self):
        self.assertTrue(RECHECK_JSON.exists(), f"Missing current recheck JSON: {RECHECK_JSON}")
        self.assertTrue(RECHECK_DOC.exists(), f"Missing current recheck doc: {RECHECK_DOC}")
        self.assertTrue(PACKET.exists(), f"Missing packet_023: {PACKET}")

    def test_recheck_records_current_gateway_blocker_without_opening_gates(self):
        recheck = self.load_recheck()

        self.assertEqual(recheck["schema"], "sirinx.hermes_gateway.current_recheck_packet.v1")
        self.assertEqual(recheck["status"], "hermes_gateway_current_recheck_ready_local_only")
        self.assertEqual(recheck["next_outbox_packet"], "packet_023")
        self.assertEqual(recheck["source_recheck"], "data/pathspecs/sirinx_hermes_gateway_recheck_2026-06-29.json")
        self.assertEqual(recheck["target"], "127.0.0.1:9000")
        self.assertEqual(recheck["blocker"]["id"], "BLOCK-HERMES-GATEWAY")
        self.assertEqual(recheck["blocker"]["status"], "open")
        self.assertFalse(recheck["gateway_reachable"])
        self.assertEqual(recheck["queue_counts"]["total"], 24)
        self.assertEqual(recheck["queue_counts"]["outbox"], 11)
        self.assertEqual(recheck["latest_outbox_packet"], "packet_023")

        probes = {item["id"]: item for item in recheck["probes"]}
        self.assertEqual(probes["health"]["result"], "failed")
        self.assertEqual(probes["health"]["exit_code"], 7)
        self.assertEqual(probes["knowledge_status"]["result"], "failed")
        self.assertEqual(probes["knowledge_status"]["exit_code"], 7)

        for field in (
            "restart_attempted",
            "runtime_queue_execution",
            "provider_call",
            "external_message_send",
            "decision_record",
            "state_mutation",
            "lane2_authorized",
            "claims_goal_complete",
            "claims_all_chats_read",
        ):
            self.assertFalse(recheck[field], f"{field} should remain false")

        for action in (
            "restart_hermes",
            "runtime_queue_execution",
            "provider_call",
            "decision_record",
            "state_mutation",
            "lane2_authorization",
            "deploy",
            "push",
            "secret_read",
        ):
            self.assertIn(action, recheck["forbidden_actions"])

    def test_packet_023_is_safe_gateway_recheck_outbox_only(self):
        packet = self.load_packet()

        self.assertEqual(packet["id"], "packet_023")
        self.assertEqual(packet["project"], "sirinx")
        self.assertEqual(packet["agent"], "codex")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertEqual(packet["approval_scope"], "read_only_gateway_status_review_only")
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["external_message_send"])
        self.assertFalse(packet["secret_read"])
        self.assertFalse(packet["decision_record"])
        self.assertFalse(packet["state_mutation"])
        self.assertFalse(packet["lane2_authorized"])
        self.assertFalse(packet["restart_attempted"])
        self.assertIn(str(RECHECK_JSON.relative_to(ROOT)), packet["input"])
        self.assertIn(str(RECHECK_DOC.relative_to(ROOT)), packet["input"])
        self.assertIn(str(PACKET.relative_to(ROOT)), packet["output"])

    def test_queue_status_indexes_packet_023_without_execution(self):
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
        packet = next(item for item in queue_status["packets"] if item["id"] == "packet_023")
        self.assertEqual(packet["folder"], "outbox")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["external_message_send"])
        self.assertFalse(packet["secret_read"])
        self.assertFalse(packet["decision_record"])
        self.assertFalse(packet["state_mutation"])
        self.assertFalse(packet["lane2_authorized"])

        text = QUEUE_STATUS_DOC.read_text(encoding="utf-8")
        self.assertIn("packet_counts: inbox=5 outbox=15 working=1 done=8 blocked=0 total=29", text)
        self.assertIn(str(PACKET.relative_to(ROOT)), text)

    def test_recheck_surfaces_across_queue_index_registry_manifest_and_mission_control(self):
        rel_json = str(RECHECK_JSON.relative_to(ROOT))
        rel_doc = str(RECHECK_DOC.relative_to(ROOT))
        rel_packet = str(PACKET.relative_to(ROOT))

        execution_queue = json.loads(EXECUTION_QUEUE_JSON.read_text(encoding="utf-8"))
        active_index = json.loads(ACTIVE_INDEX_JSON.read_text(encoding="utf-8"))
        registry = json.loads(CONTEXT_REGISTRY_JSON.read_text(encoding="utf-8"))
        manifest = json.loads(MANIFEST_JSON.read_text(encoding="utf-8"))
        mission = MISSION_CONTROL.read_text(encoding="utf-8")

        self.assertIn(rel_json, execution_queue["source_indexes"])
        queue_item = next(item for item in execution_queue["items"] if item["id"] == "HERMES-GATEWAY-CURRENT-RECHECK-PACKET-023")
        self.assertEqual(queue_item["status"], "hermes_gateway_current_recheck_ready_local_only")
        self.assertEqual(queue_item["gate"], "local_read_only_gateway_status_review")
        self.assertIn(rel_json, queue_item["evidence"])
        self.assertIn(rel_doc, queue_item["evidence"])
        self.assertIn(rel_packet, queue_item["evidence"])
        self.assertIn("restart_hermes", queue_item["forbidden_actions"])
        self.assertIn("runtime_queue_execution", queue_item["forbidden_actions"])

        stream = next(item for item in active_index["workstreams"] if item["id"] == "hermes_gateway_current_recheck_packet")
        self.assertEqual(stream["status"], "hermes_gateway_current_recheck_ready_local_only")
        self.assertIn(rel_json, stream["evidence"])
        self.assertIn(rel_packet, stream["evidence"])

        packet = next(item for item in registry["context_packets"] if item["id"] == "ctx-hermes-gateway-current-recheck-packet")
        self.assertEqual(packet["source"], rel_json)
        self.assertEqual(packet["permission"], "local_read_only")
        self.assertEqual(packet["status"], "hermes_gateway_current_recheck_ready_local_only")

        manifest_paths = {entry["path"] for entry in manifest["ignored_pathspecs"]}
        self.assertIn(rel_json, manifest_paths)
        self.assertIn(rel_json, mission)
        self.assertIn(rel_doc, mission)

    def test_markdown_recheck_states_local_only_boundaries(self):
        self.assertTrue(RECHECK_DOC.exists(), f"Missing current recheck doc: {RECHECK_DOC}")
        text = RECHECK_DOC.read_text(encoding="utf-8")
        required = [
            "HERMES_GATEWAY_CURRENT_RECHECK_PACKET_LOCAL_ONLY",
            "status=hermes_gateway_current_recheck_ready_local_only",
            "next_outbox_packet=packet_023",
            "target=127.0.0.1:9000",
            "gateway_reachable=false",
            "blocker=BLOCK-HERMES-GATEWAY",
            "restart_attempted=false",
            "runtime_queue_execution=false",
            "provider_call=false",
            "decision_record=false",
            "state_mutation=false",
            "lane2_authorized=false",
            "No Hermes restart was attempted.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
