"""Coding engine security rules refactor Hermes packet guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_030_sirinx_coding_engine_security_rules_refactor.json"
DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODING_ENGINE_SECURITY_RULES_REFACTOR_PACKET_2026-07-02.md"


class CodingEngineSecurityRulesRefactorPacketTests(unittest.TestCase):
    """Ensure the refactor packet is review-only and all execution gates stay closed."""

    def load_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet: {PACKET}")
        return json.loads(PACKET.read_text(encoding="utf-8"))

    def test_packet_artifacts_exist(self):
        self.assertTrue(PACKET.exists(), f"Missing packet: {PACKET}")
        self.assertTrue(DOC.exists(), f"Missing doc: {DOC}")

    def test_packet_is_review_only_not_execution(self):
        packet = self.load_packet()

        self.assertEqual(packet["id"], "packet_030")
        self.assertEqual(packet["to_agent"], "hermes")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["approval_scope"], "review_only_no_execution")
        self.assertEqual(packet["dispatch_mode"], "dry_run_review_only")
        self.assertFalse(packet["approval_required"])
        self.assertTrue(packet["execution_approval_required"])
        self.assertTrue(packet["dry_run"])
        self.assertTrue(packet["not_approval"])
        self.assertEqual(packet["receipt_claim"], "unconfirmed_sender_side_outbox_only")

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
        ):
            self.assertFalse(packet[field], f"{field} should remain false")

    def test_packet_links_refactor_sources_and_security_rules(self):
        packet = self.load_packet()

        self.assertIn("packages/policy-core/src/index.mjs", packet["input"])
        self.assertIn("services/dev-control-api/src/vibe-coding-agent.mjs", packet["input"])
        self.assertIn("skills/uat-crud-mongodb/run.mjs", packet["input"])
        self.assertIn("docs/knowledge/SIRINX_CODING_ENGINE_SECURITY_RULES_REFACTOR_PACKET_2026-07-02.md", packet["output"])
        self.assertIn("mcp-filesystem-local-only", packet["security_rules"])
        self.assertIn("APPROVE_REAL_MCP_EXECUTION_<server>_<target>_<date>", packet["future_approval_gates"])

    def test_review_doc_states_receipt_boundary(self):
        doc = DOC.read_text(encoding="utf-8")

        required_text = [
            "review-only outbox packet",
            "not proof of Hermes receipt",
            "No real MCP execution",
            "no runtime queue execution is authorized",
            "Hermes-owned proof",
        ]
        missing = [item for item in required_text if item not in doc]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
