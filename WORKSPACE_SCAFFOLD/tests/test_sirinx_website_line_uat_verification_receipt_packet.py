"""SIRINX website LINE local UAT verification receipt guardrails."""
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUILDER = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "build_codex_hermes_a2a_queue_status.py"
PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_039_sirinx_website_line_uat_verification_receipt.json"
RECEIPT_JSON = ROOT / "docs" / "knowledge" / "SIRINX_WEBSITE_LINE_UAT_VERIFICATION_RECEIPT_2026-07-02.json"
RECEIPT_DOC = ROOT / "docs" / "knowledge" / "SIRINX_WEBSITE_LINE_UAT_VERIFICATION_RECEIPT_2026-07-02.md"
REVIEW_PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_029_sirinx_website_line_hermes_review.json"
QUEUE_STATUS_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_a2a_queue_status_2026-06-29.json"
EXECUTION_QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
ACTIVE_INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"


def load_builder():
    spec = importlib.util.spec_from_file_location("codex_hermes_a2a_queue_status", BUILDER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class SirinxWebsiteLineUatVerificationReceiptPacketTests(unittest.TestCase):
    """Ensure local website UAT evidence stays review-only and does not open gates."""

    def load_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet: {PACKET}")
        return json.loads(PACKET.read_text(encoding="utf-8"))

    def load_receipt(self):
        self.assertTrue(RECEIPT_JSON.exists(), f"Missing receipt JSON: {RECEIPT_JSON}")
        return json.loads(RECEIPT_JSON.read_text(encoding="utf-8"))

    def test_artifacts_exist(self):
        for path in (PACKET, RECEIPT_JSON, RECEIPT_DOC, REVIEW_PACKET):
            self.assertTrue(path.exists(), f"Missing artifact: {path}")

    def test_packet_records_local_uat_without_external_or_production_actions(self):
        packet = self.load_packet()

        self.assertEqual(packet["id"], "packet_039")
        self.assertEqual(packet["project"], "sirinx-site")
        self.assertEqual(packet["to_agent"], "hermes")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertEqual(packet["approval_scope"], "verification_receipt_only_no_execution")
        self.assertEqual(packet["dispatch_mode"], "local_evidence_receipt_only")
        self.assertFalse(packet["approval_required"])
        self.assertTrue(packet["execution_approval_required"])
        self.assertTrue(packet["dry_run"])
        self.assertTrue(packet["local_playwright_uat_execution"])
        self.assertEqual(packet["local_playwright_scope"], "127.0.0.1 static preview only")
        self.assertEqual(packet["verified_counts"]["line_browser_uat_tests"], 42)
        self.assertEqual(packet["verified_counts"]["closed_gate_regression_tests"], 3)
        self.assertEqual(packet["verified_counts"]["server_tests"], 2)
        self.assertEqual(packet["verified_counts"]["built_site_files_checked"], 17)

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
            "external_browser_automation_execution",
            "stagehand_execution",
            "public_tunnel",
            "runtime_queue_execution",
            "lane2_authorized",
            "decision_record",
            "state_mutation",
            "final_packet_record",
        ):
            self.assertFalse(packet[field], f"{field} should remain false")

    def test_receipt_preserves_canonical_line_data_and_closed_gates(self):
        receipt = self.load_receipt()

        self.assertEqual(receipt["schema"], "sirinx.website_line.uat_verification_receipt.v1")
        self.assertEqual(receipt["status"], "local_uat_verified_no_deploy")
        self.assertEqual(receipt["evidence_boundary"], "local_static_preview_only")
        self.assertTrue(receipt["local_playwright_uat_execution"])
        self.assertTrue(receipt["not_approval"])
        self.assertEqual(receipt["verified_results"]["line_browser_uat"], "passed_42_tests")
        self.assertEqual(receipt["verified_line_official"]["basic_id"], "@304zrttj")
        self.assertEqual(receipt["verified_line_official"]["short_link"], "https://lin.ee/S97R6nj")
        self.assertEqual(
            receipt["verified_line_official"]["qr_image_url"],
            "https://qr-official.line.me/gs/M_304zrttj_GW.png?oat_content=qr",
        )
        self.assertIn("/line", receipt["verified_routes"])
        self.assertIn("/quote", receipt["verified_routes"])
        self.assertTrue(all(value is False for value in receipt["verified_closed_gates"].values()))
        self.assertIn("APPROVE_DEPLOY_SIRINX_SITE_<date>", receipt["required_future_approval_phrases"])
        self.assertIn("APPROVE_LINE_WEBHOOK_<scope>_<date>", receipt["required_future_approval_phrases"])

    def test_receipt_doc_states_non_approval_boundary(self):
        text = RECEIPT_DOC.read_text(encoding="utf-8")
        required = [
            "local-only verification receipt",
            "pnpm --filter @sirinx/site test:line -> passed, 42 Playwright checks",
            "Local Playwright Boundary",
            "It did not call production systems",
            "APPROVE_DEPLOY_SIRINX_SITE_<date>",
            "APPROVE_LINE_WEBHOOK_<scope>_<date>",
            "requires a separate exact approval gate",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])

    def test_packet_is_visible_in_queue_index_and_mission_control_without_execution(self):
        status = json.loads(QUEUE_STATUS_JSON.read_text(encoding="utf-8"))
        self.assertEqual(status["packet_counts"], {"inbox": 5, "outbox": 34, "working": 1, "done": 8, "blocked": 0, "total": 48})
        packet = next(item for item in status["packets"] if item["id"] == "packet_039")
        self.assertEqual(packet["folder"], "outbox")
        self.assertEqual(packet["path"], "_A2A_QUEUE/outbox/packet_039_sirinx_website_line_uat_verification_receipt.json")
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["deploy"])
        self.assertFalse(packet["push"])
        self.assertFalse(packet["secret_read"])

        module = load_builder()
        snapshot = module.build_queue_status(queue_root=ROOT / "_A2A_QUEUE", root=ROOT)
        dynamic_packet = next(item for item in snapshot["packets"] if item["id"] == "packet_039")
        self.assertEqual(dynamic_packet["path"], packet["path"])

        rel_packet = str(PACKET.relative_to(ROOT))
        rel_doc = str(RECEIPT_DOC.relative_to(ROOT))
        rel_json = str(RECEIPT_JSON.relative_to(ROOT))
        execution_queue = json.loads(EXECUTION_QUEUE_JSON.read_text(encoding="utf-8"))
        active_index = json.loads(ACTIVE_INDEX_JSON.read_text(encoding="utf-8"))
        mission = MISSION_CONTROL.read_text(encoding="utf-8")

        self.assertIn(rel_packet, execution_queue["source_indexes"])
        self.assertIn(rel_packet, active_index["source_files"])
        item = next(item for item in execution_queue["items"] if item["id"] == "SIRINX-WEBSITE-LINE-UAT-VERIFICATION-RECEIPT-PACKET-039")
        self.assertEqual(item["status"], "local_uat_verified_no_deploy")
        self.assertIn(rel_packet, item["evidence"])
        self.assertIn(rel_doc, item["evidence"])
        self.assertIn(rel_json, item["evidence"])
        self.assertIn("deploy", item["forbidden_actions"])
        self.assertIn("line_webhook_activation", item["forbidden_actions"])
        self.assertIn("crm_customer_data_storage", item["forbidden_actions"])

        stream = next(item for item in active_index["workstreams"] if item["id"] == "sirinx_website_line_uat_verification_receipt")
        self.assertEqual(stream["status"], "local_uat_verified_no_deploy")
        self.assertIn(rel_packet, stream["evidence"])
        self.assertIn(rel_doc, stream["evidence"])
        self.assertIn(rel_json, stream["evidence"])

        self.assertIn(rel_packet, mission)
        self.assertIn(rel_doc, mission)


if __name__ == "__main__":
    unittest.main()
