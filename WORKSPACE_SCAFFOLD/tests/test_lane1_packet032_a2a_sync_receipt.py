"""Packet_032 local A2A sync receipt guardrails."""
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
RUN_ID = "20260701T231950_334409Z"
DOC = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_PACKET032_A2A_SYNC_RECEIPT_2026-07-02.md"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
COORDINATOR_RECEIPT = ROOT / ".ghostclaw_runtime" / "a2a2a" / "receipts" / f"queue_coordination_{RUN_ID}.json"
HERMES_INBOX = ROOT / ".ghostclaw_runtime" / "a2a2a" / "inbox" / "hermes" / f"queue_coord_packet_032_hermes_{RUN_ID}.json"
KOB_INBOX = ROOT / ".ghostclaw_runtime" / "a2a2a" / "inbox" / "kob" / f"queue_coord_packet_032_kob_{RUN_ID}.json"
HERMES_RECEIPT = ROOT / ".ghostclaw_runtime" / "a2a2a" / "receipts" / f"hermes_route_queue_coord_packet_032_hermes_{RUN_ID}.json"
KOB_RECEIPT = ROOT / ".ghostclaw_runtime" / "a2a2a" / "receipts" / f"kob_verdict_queue_coord_packet_032_kob_{RUN_ID}.json"
HERMES_OUTBOX = ROOT / ".ghostclaw_runtime" / "a2a2a" / "outbox" / "hermes" / f"hermes_route_queue_coord_packet_032_hermes_{RUN_ID}.json"
KOB_OUTBOX = ROOT / ".ghostclaw_runtime" / "a2a2a" / "outbox" / "kob" / f"kob_verdict_queue_coord_packet_032_kob_{RUN_ID}.json"
COORDINATOR_TEST = ROOT / "WORKSPACE_SCAFFOLD" / "tests" / "test_ghostclaw_a2a_queue_coordinator.py"


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


class Lane1Packet032A2ASyncReceiptTests(unittest.TestCase):
    """Ensure packet_032 local receipts prove sync only, not final packet completion."""

    def test_packet032_sync_artifacts_exist(self):
        for path in (
            DOC,
            COORDINATOR_RECEIPT,
            HERMES_INBOX,
            KOB_INBOX,
            HERMES_RECEIPT,
            KOB_RECEIPT,
            HERMES_OUTBOX,
            KOB_OUTBOX,
        ):
            self.assertTrue(path.exists(), f"Missing packet_032 sync artifact: {path}")

    def test_coordinator_dispatched_packet032_without_gate_or_blockers(self):
        receipt = read_json(COORDINATOR_RECEIPT)
        packet = next(item for item in receipt["dispatched"] if item["id"] == "packet_032")

        self.assertEqual(receipt["status"], "pass")
        self.assertGreaterEqual(receipt["packet_counts"]["dispatched"], 1)
        self.assertEqual(packet["decision"], "dispatch_to_local_workers")
        self.assertIsNone(packet["gate_lane"])
        self.assertEqual(packet["blockers"], [])
        self.assertFalse(packet["approval_required"])
        self.assertEqual(packet["path"], "_A2A_QUEUE/outbox/packet_032_ghostclaw_lane1_opus_final_packet_authoring_request.json")
        self.assertEqual(
            packet["worker_packets"],
            [
                f".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_032_hermes_{RUN_ID}.json",
                f".ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_032_kob_{RUN_ID}.json",
            ],
        )

        for rel_path in packet["worker_packets"]:
            self.assertTrue((ROOT / rel_path).exists(), f"Missing worker packet: {rel_path}")

        for value in receipt["blocked_actions_preserved"].values():
            self.assertFalse(value)

    def test_hermes_and_kob_receipts_are_local_ack_only(self):
        hermes = read_json(HERMES_RECEIPT)
        kob = read_json(KOB_RECEIPT)

        self.assertEqual(hermes["schema"], "ghostclaw.a2a2a.hermes_route_receipt.v1")
        self.assertEqual(hermes["status"], "routed_local_only")
        self.assertEqual(hermes["route"]["target"], "kob")
        self.assertEqual(hermes["route"]["blocked_reasons"], [])
        self.assertTrue(hermes["local_worker"])

        self.assertEqual(kob["schema"], "ghostclaw.a2a2a.kob_verdict_receipt.v1")
        self.assertEqual(kob["status"], "kob_allow_local_ack_only")
        self.assertEqual(kob["verdict"]["decision"], "allow_local_ack_only")
        self.assertEqual(kob["verdict"]["blocked_reasons"], [])
        self.assertTrue(kob["local_worker"])

        for receipt in (hermes, kob):
            for value in receipt["execution"].values():
                self.assertFalse(value)

    def test_outbox_records_preserve_external_action_blocks(self):
        hermes = read_json(HERMES_OUTBOX)
        kob = read_json(KOB_OUTBOX)

        self.assertEqual(hermes["route_status"], "routed_local_only")
        self.assertEqual(hermes["route_target"], "kob")
        self.assertEqual(hermes["blocked_reasons"], [])
        self.assertEqual(kob["verdict"], "allow_local_ack_only")
        self.assertEqual(kob["blocked_reasons"], [])
        self.assertEqual(kob["allowed_actions"], ["write_receipt", "write_outbox_record"])

        for record in (hermes, kob):
            for value in record["external_actions"].values():
                self.assertFalse(value)

    def test_sync_doc_records_boundaries_and_final_packet_absence(self):
        text = DOC.read_text(encoding="utf-8")
        required = [
            "GHOSTCLAW_LANE1_PACKET032_A2A_SYNC_RECEIPT_LOCAL_ONLY",
            f"run_id={RUN_ID}",
            str(COORDINATOR_RECEIPT.relative_to(ROOT)),
            str(HERMES_RECEIPT.relative_to(ROOT)),
            str(KOB_RECEIPT.relative_to(ROOT)),
            "real_mcp_execution=false",
            "runtime_queue_execution=false",
            "provider_call=false",
            "final_packet_record=false",
            "lane2_authorized=false",
            "classifier fix",
            "not the final Opus packet",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 Opus packet exists unexpectedly")

    def test_classifier_regression_guard_exists(self):
        text = COORDINATOR_TEST.read_text(encoding="utf-8")
        self.assertIn("test_false_mcp_execution_flag_does_not_force_mcp_auth_gate", text)


if __name__ == "__main__":
    unittest.main()
