"""Telegram-safe work report guard for coding-engine security packet_030."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKET_030 = ROOT / "_A2A_QUEUE" / "outbox" / "packet_030_sirinx_coding_engine_security_rules_refactor.json"
PACKET_031 = ROOT / "_A2A_QUEUE" / "outbox" / "packet_031_sirinx_coding_engine_security_rules_work_report_draft.json"
DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODING_ENGINE_SECURITY_RULES_WORK_REPORT_DRAFT_2026-07-02.md"


class CodingEngineSecurityRulesWorkReportPacketTests(unittest.TestCase):
    """Ensure packet_031 remains a local Telegram-safe report draft only."""

    def test_artifacts_exist(self):
        for path in (PACKET_030, PACKET_031, DOC):
            self.assertTrue(path.exists(), f"Missing artifact: {path}")

    def test_packet_031_is_report_only_not_execution(self):
        packet = json.loads(PACKET_031.read_text(encoding="utf-8"))

        self.assertEqual(packet["id"], "packet_031")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertEqual(packet["delivery"], "telegram-draft")
        self.assertEqual(packet["approval_scope"], "telegram_live_send_only")
        self.assertEqual(packet["dispatch_mode"], "dry_run_report_only")
        self.assertEqual(packet["current_actionable_packet"], "packet_030")
        self.assertTrue(packet["approval_required"])
        self.assertTrue(packet["execution_approval_required"])
        self.assertTrue(packet["not_approval"])
        self.assertEqual(packet["receipt_claim"], "unconfirmed_sender_side_outbox_only")
        self.assertIn("APPROVE_TELEGRAM_WORK_REPORT_SEND", packet["future_approval_gates"])
        self.assertIn("APPROVE_REAL_MCP_EXECUTION_<server>_<target>_<date>", packet["future_approval_gates"])

        for field in (
            "live_send",
            "provider_call",
            "paid_provider_call",
            "external_message_send",
            "telegram_live_send",
            "line_send",
            "customer_send",
            "secret_read",
            "real_env_read",
            "real_mcp_execution",
            "remote_mutation",
            "mongodb_connect",
            "database_write",
            "database_migration",
            "customer_data",
            "production_data",
            "dependency_install",
            "browser_automation_execution",
            "stagehand_execution",
            "playwright_execution",
            "public_tunnel",
            "runtime_queue_execution",
            "cloud_mutation",
            "lane2_authorized",
            "decision_record",
            "state_mutation",
        ):
            self.assertFalse(packet[field], f"{field} should remain false")

    def test_report_body_and_doc_state_boundaries(self):
        packet = json.loads(PACKET_031.read_text(encoding="utf-8"))
        doc = DOC.read_text(encoding="utf-8")

        required_body = [
            "status: BLOCKED",
            "packet_030",
            "packet_031",
            "telegram_live_send: false",
            "runtime_queue_execution: false",
            "real_mcp_execution: false",
            "provider_call: false",
            "deploy: false",
            "push: false",
        ]
        missing_body = [item for item in required_body if item not in packet["draft_report_body"]]
        self.assertEqual(missing_body, [])

        required_doc = [
            "CODING_ENGINE_SECURITY_RULES_WORK_REPORT_DRAFT_LOCAL_ONLY",
            "delivery=telegram-draft",
            "packet_030",
            "packet_031",
            "live_send=false",
            "telegram_live_send=false",
            "real_mcp_execution=false",
            "APPROVE_TELEGRAM_WORK_REPORT_SEND",
            "APPROVE_REAL_MCP_EXECUTION_<server>_<target>_<date>",
            "not a Hermes receipt",
        ]
        missing_doc = [item for item in required_doc if item not in doc]
        self.assertEqual(missing_doc, [])

    def test_packet_031_links_packet_030_sources(self):
        packet = json.loads(PACKET_031.read_text(encoding="utf-8"))

        self.assertIn("_A2A_QUEUE/outbox/packet_030_sirinx_coding_engine_security_rules_refactor.json", packet["input"])
        self.assertIn("docs/knowledge/SIRINX_CODING_ENGINE_SECURITY_RULES_REFACTOR_PACKET_2026-07-02.md", packet["input"])
        self.assertIn("docs/knowledge/SIRINX_CODING_ENGINE_SECURITY_RULES_REFACTOR_A2A_VISIBILITY_2026-07-02.md", packet["input"])
        self.assertIn("docs/knowledge/SIRINX_CODING_ENGINE_SECURITY_RULES_WORK_REPORT_DRAFT_2026-07-02.md", packet["output"])


if __name__ == "__main__":
    unittest.main()
