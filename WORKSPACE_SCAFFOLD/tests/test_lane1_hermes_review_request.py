"""GhostClaw LANE_1 Hermes review request packet tests."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKET_PATH = ROOT / "_A2A_QUEUE" / "inbox" / "packet_012_ghostclaw_lane1_hermes_draft_review.json"
DOC_PATH = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_DRAFT_REVIEW_REQUEST_2026-06-29.md"
FINAL_PACKET_PATH = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"


class Lane1HermesReviewRequestTests(unittest.TestCase):
    """Ensure packet_012 requests review without granting approval."""

    def test_review_request_files_exist_and_final_packet_is_missing(self):
        self.assertTrue(PACKET_PATH.exists(), f"Missing packet: {PACKET_PATH}")
        self.assertTrue(DOC_PATH.exists(), f"Missing review request doc: {DOC_PATH}")
        self.assertFalse(FINAL_PACKET_PATH.exists(), "Final Opus packet exists unexpectedly")

    def test_review_request_packet_safety_flags(self):
        packet = json.loads(PACKET_PATH.read_text(encoding="utf-8"))

        self.assertEqual(packet["id"], "packet_012")
        self.assertEqual(packet["status"], "inbox")
        self.assertTrue(packet["review_request"])
        self.assertFalse(packet["decision_record"])
        self.assertTrue(packet["dry_run"])
        self.assertFalse(packet["live_send"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["external_message_send"])
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["deploy"])
        self.assertFalse(packet["push"])
        self.assertFalse(packet["lane2_authorized"])

    def test_review_request_doc_lists_allowed_decisions_and_blockers(self):
        text = DOC_PATH.read_text(encoding="utf-8")
        required = [
            "HERMES_REVIEW_REQUEST_INBOX_NOT_DECISION",
            "route_to_opus",
            "request_revision",
            "open_codex_recorder_gate",
            "block",
            "No decision has been made in this request.",
            "lane2_authorized=false",
        ]

        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
