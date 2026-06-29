"""GhostClaw LANE_1 Hermes decision handoff outbox packet guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_016_ghostclaw_lane1_hermes_decision_intake_handoff.json"
QUEUE_STATUS_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_a2a_queue_status_2026-06-29.json"
QUEUE_STATUS_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_A2A_QUEUE_STATUS_2026-06-29.md"
EXECUTION_QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"
HANDOFF_JSON = ROOT / "data" / "pathspecs" / "ghostclaw_lane1_hermes_decision_intake_handoff_2026-06-29.json"
HANDOFF_DOC = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_INTAKE_HANDOFF_2026-06-29.md"
HANDOFF_SCRIPT = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "build_lane1_hermes_decision_intake_handoff.py"
HANDOFF_TEST = ROOT / "WORKSPACE_SCAFFOLD" / "tests" / "test_lane1_hermes_decision_intake_handoff.py"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
HERMES_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"


class Lane1HermesDecisionHandoffPacketTests(unittest.TestCase):
    """Ensure packet_016 is a local handoff pointer, not a decision or execution event."""

    def load_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing handoff outbox packet: {PACKET}")
        return json.loads(PACKET.read_text(encoding="utf-8"))

    def test_packet_exists_without_final_decision_or_lane1_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing handoff outbox packet: {PACKET}")
        self.assertTrue(HANDOFF_JSON.exists(), f"Missing handoff JSON: {HANDOFF_JSON}")
        self.assertTrue(HANDOFF_DOC.exists(), f"Missing handoff doc: {HANDOFF_DOC}")
        self.assertFalse(HERMES_DECISION.exists(), "Hermes decision exists unexpectedly")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 Opus packet exists unexpectedly")

    def test_packet_preserves_handoff_only_boundary(self):
        packet = self.load_packet()

        self.assertEqual(packet["id"], "packet_016")
        self.assertEqual(packet["project"], "ghostclaw")
        self.assertEqual(packet["priority"], "P0")
        self.assertEqual(packet["agent"], "codex")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertTrue(packet["approval_required"])
        self.assertEqual(packet["approval_scope"], "hermes_decision_record_only")
        self.assertEqual(packet["current_actionable_packet"], "packet_013")
        self.assertEqual(packet["decision_path"], "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md")
        self.assertFalse(packet["decision_record"])
        self.assertFalse(packet["codex_recorder_gate_open"])
        self.assertFalse(packet["lane2_authorized"])

        for action in (
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "paid_provider_call",
            "provider_call",
            "runtime_queue_execution",
            "telegram_live_send",
            "external_message_send",
            "merge_script_execution",
            "install",
            "migration",
        ):
            self.assertFalse(packet[action], f"{action} should remain false")

    def test_packet_links_handoff_sources_and_next_validation_step(self):
        packet = self.load_packet()
        inputs = set(packet["input"])
        outputs = set(packet["output"])

        self.assertIn(str(HANDOFF_JSON.relative_to(ROOT)), inputs)
        self.assertIn(str(HANDOFF_DOC.relative_to(ROOT)), inputs)
        self.assertIn(str(HANDOFF_SCRIPT.relative_to(ROOT)), inputs)
        self.assertIn(str(HANDOFF_TEST.relative_to(ROOT)), inputs)
        self.assertIn(str(PACKET.relative_to(ROOT)), outputs)
        self.assertIn("validate_lane1_hermes_decision.py", "\n".join(packet["next_validation_commands"]))
        self.assertIn("build_lane1_hermes_decision_transition_guard.py", "\n".join(packet["next_validation_commands"]))
        self.assertIn("Handoff pointer only", packet["notes"])

    def test_queue_status_indexes_packet_016_without_execution(self):
        status = json.loads(QUEUE_STATUS_JSON.read_text(encoding="utf-8"))

        self.assertEqual(
            status["packet_counts"],
            {
                "inbox": 5,
                "outbox": 15,
                "working": 1,
                "done": 8,
                "blocked": 0,
                "total": 29,
            },
        )
        packet = next(item for item in status["packets"] if item["id"] == "packet_016")
        self.assertEqual(packet["folder"], "outbox")
        self.assertEqual(packet["agent"], "codex")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["decision_record"])
        self.assertFalse(packet["lane2_authorized"])

        text = QUEUE_STATUS_DOC.read_text(encoding="utf-8")
        self.assertIn("packet_counts: inbox=5 outbox=15 working=1 done=8 blocked=0 total=29", text)
        self.assertIn("_A2A_QUEUE/outbox/packet_016_ghostclaw_lane1_hermes_decision_intake_handoff.json", text)
        self.assertIn("_A2A_QUEUE/outbox/packet_017_ghostclaw_lane1_hermes_decision_preflight_audit.json", text)
        self.assertIn("_A2A_QUEUE/outbox/packet_018_ghostclaw_lane1_opus_architecture_packet_gate.json", text)
        self.assertIn("_A2A_QUEUE/outbox/packet_019_ghostclaw_lane1_opus_authoring_bundle.json", text)

    def test_execution_queue_and_mission_control_link_packet_016(self):
        rel_packet = str(PACKET.relative_to(ROOT))
        execution_queue = json.loads(EXECUTION_QUEUE_JSON.read_text(encoding="utf-8"))
        mission = MISSION_CONTROL.read_text(encoding="utf-8")

        self.assertIn(rel_packet, execution_queue["source_indexes"])
        handoff_item = next(item for item in execution_queue["items"] if item["id"] == "LANE1-HERMES-DECISION-HANDOFF-PACKET-016")
        self.assertEqual(handoff_item["status"], "handoff_packet_ready_not_decision")
        self.assertEqual(handoff_item["current_actionable_packet"], "packet_013")
        self.assertFalse(handoff_item["lane2_authorized"])
        self.assertIn(rel_packet, handoff_item["evidence"])
        self.assertIn("decision_record", handoff_item["forbidden_actions"])
        self.assertIn("runtime_queue_execution", handoff_item["forbidden_actions"])

        self.assertIn(rel_packet, mission)
        self.assertIn("outbox: 15", mission)
        self.assertIn("total: 29", mission)


if __name__ == "__main__":
    unittest.main()
