"""GhostClaw LANE_1 Codex recorder gate request guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKET_PATH = ROOT / "_A2A_QUEUE" / "inbox" / "packet_013_ghostclaw_lane1_codex_recorder_gate_request.json"
DOC_PATH = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_CODEX_RECORDER_GATE_REQUEST_2026-06-29.md"
FINAL_PACKET_PATH = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
DECISION_PATH = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"


class Lane1CodexRecorderGateRequestTests(unittest.TestCase):
    """Ensure packet_013 asks for a gate without opening it."""

    def test_gate_request_files_exist_without_final_packet_or_decision(self):
        self.assertTrue(PACKET_PATH.exists(), f"Missing packet: {PACKET_PATH}")
        self.assertTrue(DOC_PATH.exists(), f"Missing gate request doc: {DOC_PATH}")
        self.assertFalse(FINAL_PACKET_PATH.exists(), "Final Opus packet exists unexpectedly")
        self.assertFalse(DECISION_PATH.exists(), "Hermes decision file exists unexpectedly")

    def test_packet_requests_gate_but_keeps_it_closed(self):
        packet = json.loads(PACKET_PATH.read_text(encoding="utf-8"))

        self.assertEqual(packet["id"], "packet_013")
        self.assertEqual(packet["status"], "inbox")
        self.assertTrue(packet["codex_recorder_gate_requested"])
        self.assertFalse(packet["codex_recorder_gate_open"])
        self.assertEqual(packet["requested_decision"], "open_codex_recorder_gate")
        self.assertFalse(packet["decision_record"])
        self.assertFalse(packet["lane2_authorized"])
        self.assertTrue(packet["dry_run"])
        self.assertFalse(packet["live_send"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["external_message_send"])
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["deploy"])
        self.assertFalse(packet["push"])

    def test_packet_preserves_model_choice_and_external_action_boundary(self):
        packet = json.loads(PACKET_PATH.read_text(encoding="utf-8"))

        self.assertTrue(packet["hermes_model_selection"]["allowed_for_vibe_coding_drafts"])
        self.assertEqual(packet["hermes_model_selection"]["models"], "any")
        self.assertFalse(packet["external_action_approval"]["blanket_approval_actionable"])
        self.assertTrue(packet["external_action_approval"]["requires_gate_specific_approval"])
        self.assertIn("paid_provider_call", packet["external_action_approval"]["blocked_without_gate"])

    def test_doc_states_request_is_not_approval(self):
        text = DOC_PATH.read_text(encoding="utf-8")
        required = [
            "CODEX_RECORDER_GATE_REQUEST_NOT_DECISION",
            "This request is not a Hermes decision.",
            "codex_recorder_gate_open=false",
            "lane2_authorized=false",
            "final_packet_exists=false",
            "Hermes may choose any model to help create vibe coding drafts.",
            "Blanket approval is not executable approval.",
            "Hermes gateway recheck failed to connect to 127.0.0.1:9000.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
