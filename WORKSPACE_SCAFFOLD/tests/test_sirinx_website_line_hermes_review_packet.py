"""SIRINX website LINE integration Hermes review packet guardrails."""
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUILDER = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "build_codex_hermes_a2a_queue_status.py"
PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_029_sirinx_website_line_hermes_review.json"
PATHSPEC = ROOT / "docs" / "knowledge" / "SIRINX_WEBSITE_LINE_HERMES_REVIEW_PACKET_2026-07-02.json"
DOC = ROOT / "docs" / "knowledge" / "SIRINX_WEBSITE_LINE_HERMES_REVIEW_PACKET_2026-07-02.md"
AUDIT = ROOT / "docs" / "website" / "SIRINX_WEBSITE_QUALITY_AUDIT.md"


def load_builder():
    spec = importlib.util.spec_from_file_location("codex_hermes_a2a_queue_status", BUILDER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class SirinxWebsiteLineHermesReviewPacketTests(unittest.TestCase):
    """Ensure website review handoff is local-only and does not open production gates."""

    def load_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet: {PACKET}")
        return json.loads(PACKET.read_text(encoding="utf-8"))

    def load_pathspec(self):
        self.assertTrue(PATHSPEC.exists(), f"Missing pathspec: {PATHSPEC}")
        return json.loads(PATHSPEC.read_text(encoding="utf-8"))

    def test_artifacts_exist(self):
        for path in (PACKET, PATHSPEC, DOC, AUDIT):
            self.assertTrue(path.exists(), f"Missing artifact: {path}")

    def test_packet_is_review_only_not_deploy_or_runtime_execution(self):
        packet = self.load_packet()

        self.assertEqual(packet["id"], "packet_029")
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
            "deploy",
            "push",
            "cloud_mutation",
            "production_mutation",
            "provider_call",
            "paid_provider_call",
            "external_message_send",
            "telegram_live_send",
            "line_send",
            "customer_send",
            "line_webhook_activation",
            "production_analytics",
            "crm_customer_data_storage",
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
        ):
            self.assertFalse(packet[field], f"{field} should remain false")

    def test_pathspec_lists_current_evidence_and_future_approval_gates(self):
        pathspec = self.load_pathspec()

        self.assertEqual(pathspec["schema"], "sirinx.website_line.hermes_review_packet.v1")
        self.assertEqual(pathspec["status"], "review_packet_ready_local_only")
        self.assertEqual(pathspec["dispatch_mode"], "dry_run_review_only")
        self.assertEqual(pathspec["approval_scope"], "review_only_no_execution")
        self.assertFalse(pathspec["approval_required_for_review"])
        self.assertTrue(pathspec["execution_approval_required"])
        self.assertTrue(pathspec["not_approval"])
        self.assertEqual(pathspec["verified_counts"]["site_browser_uat"], 42)
        self.assertEqual(pathspec["verified_counts"]["closed_gate_regression"], 3)

        closed = pathspec["closed_gates"]
        self.assertTrue(closed)
        self.assertTrue(all(value is False for value in closed.values()))

        for gate in (
            "APPROVE_DEPLOY_SIRINX_SITE_<date>",
            "APPROVE_LINE_WEBHOOK_<scope>_<date>",
            "APPROVE_PRODUCTION_ANALYTICS_<scope>_<date>",
            "APPROVE_CRM_CUSTOMER_DATA_STORAGE_<scope>_<date>",
        ):
            self.assertIn(gate, pathspec["required_future_approval_phrases"])

        for command in (
            "pnpm --filter @sirinx/site test:line",
            "pnpm --filter @sirinx/site test:closed-gates",
            "pnpm --filter @sirinx/site build && pnpm --filter @sirinx/site check",
        ):
            self.assertIn(command, pathspec["expected_local_verification"])

    def test_packet_links_sources_and_review_doc_states_boundary(self):
        packet = self.load_packet()
        doc = DOC.read_text(encoding="utf-8")

        for source in (
            "docs/website/SIRINX_WEBSITE_QUALITY_AUDIT.md",
            "apps/sirinx-site/scripts/closed-gate-checks.mjs",
            "apps/sirinx-site/scripts/closed-gate-checks.test.mjs",
            "apps/sirinx-site/tests/line-integration.spec.ts",
            "docs/knowledge/SIRINX_WEBSITE_LINE_HERMES_REVIEW_PACKET_2026-07-02.json",
        ):
            self.assertIn(source, packet["input"])

        required_text = [
            "review-only packet",
            "No runtime queue execution",
            "Hermes may review",
            "Hermes may not deploy",
            "APPROVE_DEPLOY_SIRINX_SITE_<date>",
            "This packet is not approval.",
        ]
        missing = [item for item in required_text if item not in doc]
        self.assertEqual(missing, [])

    def test_packet_is_visible_in_local_a2a_queue_without_execution(self):
        module = load_builder()
        snapshot = module.build_queue_status(queue_root=ROOT / "_A2A_QUEUE", root=ROOT)
        packet = next(item for item in snapshot["packets"] if item["id"] == "packet_029")

        self.assertEqual(snapshot["status"], "local_queue_indexed_not_executed")
        self.assertEqual(snapshot["evidence_boundary"], "local_file_bus_only")
        self.assertFalse(snapshot["runtime_queue_execution"])
        self.assertFalse(snapshot["lane2_authorized"])
        self.assertEqual(packet["folder"], "outbox")
        self.assertEqual(packet["agent"], "codex")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertEqual(packet["path"], "_A2A_QUEUE/outbox/packet_029_sirinx_website_line_hermes_review.json")

        for field in (
            "approval_required",
            "runtime_queue_execution",
            "provider_call",
            "external_message_send",
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "paid_provider_call",
            "telegram_live_send",
            "lane2_authorized",
            "decision_record",
            "state_mutation",
            "final_packet_record",
        ):
            self.assertFalse(packet[field], f"{field} should remain false")


if __name__ == "__main__":
    unittest.main()
