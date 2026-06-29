"""GhostClaw LANE_1 Hermes decision inbox index guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INDEX_JSON = ROOT / "data" / "pathspecs" / "ghostclaw_lane1_hermes_decision_inbox_2026-06-29.json"
INDEX_DOC = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_INBOX_INDEX_2026-06-29.md"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
DECISION_FILE = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"


class Lane1HermesDecisionInboxIndexTests(unittest.TestCase):
    """Ensure Hermes has a single local-only inbox view without implicit approval."""

    def test_index_files_exist_without_final_packet_or_decision(self):
        self.assertTrue(INDEX_JSON.exists(), f"Missing JSON index: {INDEX_JSON}")
        self.assertTrue(INDEX_DOC.exists(), f"Missing Markdown index: {INDEX_DOC}")
        self.assertFalse(FINAL_PACKET.exists(), "Final Opus packet exists unexpectedly")
        self.assertFalse(DECISION_FILE.exists(), "Hermes decision file exists unexpectedly")

    def test_json_index_points_to_current_actionable_packet(self):
        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))

        self.assertEqual(index["schema"], "ghostclaw.lane1.hermes_decision_inbox.v1")
        self.assertEqual(index["status"], "local_only_inbox_index_not_decision")
        self.assertEqual(index["current_actionable_packet"], "packet_013")
        self.assertEqual(index["next_safe_action"], "Hermes records a separate decision file")
        self.assertFalse(index["decision_record"])
        self.assertFalse(index["final_packet_exists"])
        self.assertFalse(index["lane2_authorized"])

    def test_json_index_includes_expected_packets_and_closed_gates(self):
        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        packets = {packet["id"]: packet for packet in index["packets"]}

        self.assertEqual(set(packets), {"packet_011", "packet_012", "packet_013"})
        self.assertEqual(packets["packet_013"]["requested_decision"], "open_codex_recorder_gate")
        self.assertFalse(packets["packet_013"]["codex_recorder_gate_open"])
        for flag in ("provider_call", "runtime_queue_execution", "deploy", "push"):
            self.assertFalse(index["blocked_actions"][flag], f"{flag} should remain false")

    def test_markdown_index_preserves_non_decision_boundary(self):
        text = INDEX_DOC.read_text(encoding="utf-8")
        required = [
            "HERMES_DECISION_INBOX_INDEX_NOT_DECISION",
            "Current actionable packet: `packet_013`",
            "This index is not a Hermes decision.",
            "decision_record=false",
            "final_packet_exists=false",
            "lane2_authorized=false",
            "provider_call=false",
            "runtime_queue_execution=false",
            "deploy=false",
            "push=false",
            "Blanket approval is not executable approval.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
