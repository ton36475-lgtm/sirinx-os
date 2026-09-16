"""GhostClaw LANE_1 route receipt safety tests."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INBOX_PACKET = ROOT / "_A2A_QUEUE" / "inbox" / "packet_011_ghostclaw_lane1_opus_architecture.json"
OUTBOX_RECEIPT = ROOT / "_A2A_QUEUE" / "outbox" / "packet_011_ghostclaw_lane1_hermes_route_receipt.json"
ROUTE_RECEIPT_DOC = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_ROUTE_RECEIPT_2026-06-29.md"


class Lane1RouteReceiptTests(unittest.TestCase):
    """Ensure the LANE_1 route receipt cannot be confused with execution approval."""

    def test_lane1_route_receipt_files_exist(self):
        self.assertTrue(INBOX_PACKET.exists(), f"Missing inbox packet: {INBOX_PACKET}")
        self.assertTrue(OUTBOX_RECEIPT.exists(), f"Missing outbox receipt: {OUTBOX_RECEIPT}")
        self.assertTrue(ROUTE_RECEIPT_DOC.exists(), f"Missing route receipt doc: {ROUTE_RECEIPT_DOC}")

    def test_lane1_route_receipt_preserves_safety_flags(self):
        receipt = json.loads(OUTBOX_RECEIPT.read_text(encoding="utf-8"))

        self.assertEqual(receipt["route_decision"], "ready_to_route_to_opus_local_only")
        self.assertTrue(receipt["dry_run"])
        self.assertFalse(receipt["live_send"])
        self.assertFalse(receipt["provider_call"])
        self.assertFalse(receipt["external_message_send"])
        self.assertFalse(receipt["runtime_queue_execution"])
        self.assertFalse(receipt["deploy"])
        self.assertFalse(receipt["push"])
        self.assertFalse(receipt["lane2_authorized"])

    def test_lane1_route_receipt_blocks_high_risk_actions(self):
        receipt = json.loads(OUTBOX_RECEIPT.read_text(encoding="utf-8"))
        blocked = set(receipt["blocked_actions"])

        expected = {
            "provider_call",
            "runtime_queue_execution",
            "lane2_build",
            "v3_3_merge_without_exact_artifact",
            "feature_branch_or_commit_from_dirty_checkout",
            "deploy",
            "push",
            "cloud_mutation",
            "live_send",
            "install",
            "migration_execution",
            "secret_read",
        }
        self.assertEqual(expected - blocked, set())


if __name__ == "__main__":
    unittest.main()
