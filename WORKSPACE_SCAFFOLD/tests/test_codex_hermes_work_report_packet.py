"""Codex/Hermes work-report A2A packet guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_014_codex_hermes_work_report_draft.json"
PACKET_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_WORK_REPORT_PACKET_2026-06-29.md"
CONTRACT_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_work_report_contract_2026-06-29.json"
QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
MISSION_DATA = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
HERMES_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"


class CodexHermesWorkReportPacketTests(unittest.TestCase):
    """Ensure the work report is routable locally without becoming a live send."""

    def load_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet: {PACKET}")
        return json.loads(PACKET.read_text(encoding="utf-8"))

    def test_packet_files_exist_without_lane1_completion(self):
        self.assertTrue(PACKET.exists(), f"Missing packet: {PACKET}")
        self.assertTrue(PACKET_DOC.exists(), f"Missing packet doc: {PACKET_DOC}")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 packet exists unexpectedly")
        self.assertTrue(HERMES_DECISION.exists(), "Hermes decision file should exist after route_to_opus decision")

    def test_packet_preserves_telegram_draft_boundary(self):
        packet = self.load_packet()

        self.assertEqual(packet["id"], "packet_014")
        self.assertEqual(packet["project"], "ghostclaw")
        self.assertEqual(packet["agent"], "codex")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertEqual(packet["delivery"], "telegram-draft")
        self.assertEqual(packet["approval_scope"], "telegram_live_send_only")
        self.assertEqual(packet["live_send_gate"], "APPROVE_TELEGRAM_WORK_REPORT_SEND")
        self.assertTrue(packet["approval_required"])
        self.assertTrue(packet["dry_run"])

        for field in (
            "live_send",
            "provider_call",
            "external_message_send",
            "runtime_queue_execution",
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "paid_provider_call",
            "telegram_live_send",
            "lane2_authorized",
        ):
            self.assertFalse(packet[field], f"{field} should remain false")

    def test_packet_links_report_sources_and_draft_body(self):
        packet = self.load_packet()
        contract = json.loads(CONTRACT_JSON.read_text(encoding="utf-8"))

        self.assertIn(str(CONTRACT_JSON.relative_to(ROOT)), packet["input"])
        self.assertIn("docs/knowledge/SIRINX_CODEX_HERMES_WORK_REPORT_DRAFT_2026-06-29.md", packet["input"])
        self.assertIn("WORKSPACE_SCAFFOLD/scripts/build_codex_hermes_work_report.py", packet["input"])
        self.assertIn(str(PACKET_DOC.relative_to(ROOT)), packet["output"])
        self.assertEqual(packet["draft_report_body"], contract["draft_report_body"])
        self.assertIn("status: BLOCKED", packet["draft_report_body"])
        self.assertIn("live_send: false", packet["draft_report_body"])

    def test_packet_is_linked_from_queue_index_and_mission_control(self):
        rel_packet = str(PACKET.relative_to(ROOT))
        rel_doc = str(PACKET_DOC.relative_to(ROOT))
        queue = json.loads(QUEUE_JSON.read_text(encoding="utf-8"))
        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        mission = MISSION_DATA.read_text(encoding="utf-8")

        report_item = next(item for item in queue["items"] if item["id"] == "CODEX-HERMES-WORK-REPORT-DRAFT")
        self.assertIn(rel_packet, report_item["evidence"])
        self.assertIn(rel_doc, report_item["evidence"])
        self.assertIn(rel_packet, queue["source_indexes"])
        self.assertIn(rel_packet, index["source_files"])
        self.assertIn(rel_packet, mission)
        self.assertIn(rel_doc, mission)

    def test_markdown_packet_doc_states_non_send_boundary(self):
        text = PACKET_DOC.read_text(encoding="utf-8")
        required = [
            "CODEX_HERMES_WORK_REPORT_PACKET_LOCAL_ONLY",
            "packet_014",
            "delivery=telegram-draft",
            "live_send=false",
            "telegram_live_send=false",
            "APPROVE_TELEGRAM_WORK_REPORT_SEND",
            "This packet was not sent to Telegram.",
            "does not create a Hermes decision",
            "does not authorize LANE_2",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
