"""UAT CRUD MongoDB Hermes review packet guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_027_sirinx_uat_crud_mongodb_hermes_review.json"
PATHSPEC = ROOT / "docs" / "knowledge" / "SIRINX_UAT_CRUD_MONGODB_HERMES_REVIEW_PACKET_2026-07-02.json"
DOC = ROOT / "docs" / "knowledge" / "SIRINX_UAT_CRUD_MONGODB_HERMES_REVIEW_PACKET_2026-07-02.md"
SOURCE_EVIDENCE = ROOT / "docs" / "knowledge" / "SIRINX_UAT_CRUD_MONGODB_SECURITY_RULES_2026-07-02.md"


class UatCrudMongoHermesReviewPacketTests(unittest.TestCase):
    """Ensure the Hermes handoff is review-only and all execution gates stay closed."""

    def load_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet: {PACKET}")
        return json.loads(PACKET.read_text(encoding="utf-8"))

    def load_pathspec(self):
        self.assertTrue(PATHSPEC.exists(), f"Missing pathspec: {PATHSPEC}")
        return json.loads(PATHSPEC.read_text(encoding="utf-8"))

    def test_artifacts_exist(self):
        self.assertTrue(PACKET.exists(), f"Missing packet: {PACKET}")
        self.assertTrue(PATHSPEC.exists(), f"Missing pathspec: {PATHSPEC}")
        self.assertTrue(DOC.exists(), f"Missing doc: {DOC}")
        self.assertTrue(SOURCE_EVIDENCE.exists(), f"Missing source evidence: {SOURCE_EVIDENCE}")

    def test_packet_is_review_only_not_execution(self):
        packet = self.load_packet()

        self.assertEqual(packet["id"], "packet_027")
        self.assertEqual(packet["to_agent"], "hermes")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertEqual(packet["approval_scope"], "review_only_no_execution")
        self.assertEqual(packet["dispatch_mode"], "dry_run_review_only")
        self.assertFalse(packet["approval_required"])
        self.assertTrue(packet["execution_approval_required"])
        self.assertTrue(packet["dry_run"])
        self.assertTrue(packet["not_approval"])

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

    def test_pathspec_matches_closed_gate_contract(self):
        pathspec = self.load_pathspec()

        self.assertEqual(pathspec["schema"], "sirinx.uat_crud_mongodb.hermes_review_packet.v1")
        self.assertEqual(pathspec["status"], "review_packet_ready_local_only")
        self.assertEqual(pathspec["dispatch_mode"], "dry_run_review_only")
        self.assertEqual(pathspec["approval_scope"], "review_only_no_execution")
        self.assertFalse(pathspec["approval_required_for_review"])
        self.assertTrue(pathspec["execution_approval_required"])
        self.assertTrue(pathspec["not_approval"])

        closed = pathspec["closed_gates"]
        self.assertTrue(closed)
        self.assertTrue(all(value is False for value in closed.values()))
        self.assertIn("APPROVE_LOCAL_UAT_CRUD_MONGODB_<target>_<date>", pathspec["required_future_approval_phrases"])
        self.assertIn("python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_uat_crud_mongodb_hermes_review_packet -v", pathspec["expected_local_verification"])

    def test_packet_links_sources_and_review_doc_states_boundary(self):
        packet = self.load_packet()
        doc = DOC.read_text(encoding="utf-8")

        self.assertIn("skills/uat-crud-mongodb/run.mjs", packet["input"])
        self.assertIn("packages/policy-core/src/index.mjs", packet["input"])
        self.assertIn("services/dev-control-api/src/vibe-coding-agent.mjs", packet["input"])
        self.assertIn(str(PATHSPEC.relative_to(ROOT)), packet["input"])
        self.assertIn(str(DOC.relative_to(ROOT)), packet["output"])

        required_text = [
            "review-only packet",
            "No runtime queue execution",
            "Hermes may not execute",
            "APPROVE_LOCAL_UAT_CRUD_MONGODB_<target>_<date>",
            "This packet is not approval.",
        ]
        missing = [item for item in required_text if item not in doc]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
