"""SIRINX website human review deploy gate guardrails."""
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUILDER = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "build_codex_hermes_a2a_queue_status.py"
PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_040_sirinx_website_human_review_deploy_gate.json"
GATE_JSON = ROOT / "docs" / "knowledge" / "SIRINX_WEBSITE_HUMAN_REVIEW_DEPLOY_GATE_2026-07-02.json"
GATE_DOC = ROOT / "docs" / "knowledge" / "SIRINX_WEBSITE_HUMAN_REVIEW_DEPLOY_GATE_2026-07-02.md"
PACKET_039 = ROOT / "_A2A_QUEUE" / "outbox" / "packet_039_sirinx_website_line_uat_verification_receipt.json"
QUEUE_STATUS_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_a2a_queue_status_2026-06-29.json"
EXECUTION_QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
ACTIVE_INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"


def load_builder():
    spec = importlib.util.spec_from_file_location("codex_hermes_a2a_queue_status", BUILDER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class SirinxWebsiteHumanReviewDeployGatePacketTests(unittest.TestCase):
    """Ensure human review evidence cannot be mistaken for deploy approval."""

    def load_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet: {PACKET}")
        return json.loads(PACKET.read_text(encoding="utf-8"))

    def load_gate(self):
        self.assertTrue(GATE_JSON.exists(), f"Missing gate JSON: {GATE_JSON}")
        return json.loads(GATE_JSON.read_text(encoding="utf-8"))

    def test_artifacts_exist(self):
        for path in (PACKET, GATE_JSON, GATE_DOC, PACKET_039):
            self.assertTrue(path.exists(), f"Missing artifact: {path}")

    def test_packet_records_pending_human_review_without_opening_external_gates(self):
        packet = self.load_packet()

        self.assertEqual(packet["id"], "packet_040")
        self.assertEqual(packet["project"], "sirinx-site")
        self.assertEqual(packet["to_agent"], "hermes")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertEqual(packet["approval_scope"], "human_review_gate_request_no_deploy_approval")
        self.assertEqual(packet["dispatch_mode"], "local_review_gate_only")
        self.assertEqual(packet["human_review_status"], "pending_human_review")
        self.assertTrue(packet["human_review_required"])
        self.assertTrue(packet["not_approval"])
        self.assertFalse(packet["approval_required"])
        self.assertTrue(packet["execution_approval_required"])
        self.assertIn("line_qr_real_device_scan", packet["review_targets"])
        self.assertIn("existing_website_bot", packet["review_targets"])

        evidence_statuses = {item["id"]: item["status"] for item in packet["required_human_evidence"]}
        self.assertEqual(evidence_statuses["local_website_review"], "pending")
        self.assertEqual(evidence_statuses["line_qr_real_device_scan"], "pending")
        self.assertEqual(evidence_statuses["existing_bot_manual_check"], "pending")
        self.assertEqual(evidence_statuses["deploy_approval"], "pending")

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
            "customer_data_storage",
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

    def test_gate_json_keeps_deploy_and_next_sprint_scopes_explicitly_closed(self):
        gate = self.load_gate()

        self.assertEqual(gate["schema"], "sirinx.website.human_review_deploy_gate.v1")
        self.assertEqual(gate["status"], "pending_human_review")
        self.assertFalse(gate["deployment_approved"])
        self.assertTrue(gate["not_approval"])
        self.assertTrue(gate["human_review_required"])
        self.assertIn("LINE QR real-device scan", gate["review_targets"])
        self.assertIn("existing website bot", gate["review_targets"])
        self.assertEqual(gate["canonical_line_official"]["short_link"], "https://lin.ee/S97R6nj")
        self.assertEqual(
            gate["canonical_line_official"]["qr_image_url"],
            "https://qr-official.line.me/gs/M_304zrttj_GW.png?oat_content=qr",
        )
        self.assertTrue(all(value is False for value in gate["closed_gates"].values()))

        scopes = {item["scope"]: item for item in gate["next_sprint_gates"]}
        self.assertEqual(set(scopes), {"quote_flow", "roi_calculator", "crm_lead_capture"})
        self.assertIn("customer_data_storage", scopes["quote_flow"]["blocked_until_approval"])
        self.assertIn("production_analytics", scopes["roi_calculator"]["blocked_until_approval"])
        self.assertIn("database_write", scopes["crm_lead_capture"]["blocked_until_approval"])

        phrases = gate["required_future_approval_phrases"]
        for phrase in (
            "APPROVE_DEPLOY_SIRINX_SITE_<date>",
            "APPROVE_LINE_QR_REAL_DEVICE_CONFIRMED_<device>_<date>",
            "APPROVE_EXISTING_BOT_MANUAL_CHECK_<date>",
            "APPROVE_QUOTE_FLOW_LOCAL_IMPLEMENTATION_<scope>_<date>",
            "APPROVE_ROI_CALCULATOR_LOCAL_IMPLEMENTATION_<scope>_<date>",
            "APPROVE_CRM_CUSTOMER_DATA_STORAGE_<scope>_<date>",
            "APPROVE_PRODUCTION_ANALYTICS_<scope>_<date>",
            "APPROVE_LINE_WEBHOOK_<scope>_<date>",
        ):
            self.assertIn(phrase, phrases)

    def test_gate_doc_states_pending_manual_review_and_non_approval_boundary(self):
        text = GATE_DOC.read_text(encoding="utf-8")
        required = [
            "Status: `pending_human_review`",
            "does not approve deployment",
            "LINE QR real-device scan",
            "Existing website bot behavior",
            "APPROVE_DEPLOY_SIRINX_SITE_<date>",
            "APPROVE_CRM_CUSTOMER_DATA_STORAGE_<scope>_<date>",
            "The QR must be confirmed on a real device before deploy approval",
            "Next Sprint Gates",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])

    def test_packet_is_visible_in_queue_index_and_mission_control_without_execution(self):
        status = json.loads(QUEUE_STATUS_JSON.read_text(encoding="utf-8"))
        self.assertEqual(status["packet_counts"], {"inbox": 5, "outbox": 34, "working": 1, "done": 8, "blocked": 0, "total": 48})
        packet = next(item for item in status["packets"] if item["id"] == "packet_040")
        self.assertEqual(packet["folder"], "outbox")
        self.assertEqual(packet["path"], "_A2A_QUEUE/outbox/packet_040_sirinx_website_human_review_deploy_gate.json")
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["deploy"])
        self.assertFalse(packet["push"])
        self.assertFalse(packet["secret_read"])

        module = load_builder()
        snapshot = module.build_queue_status(queue_root=ROOT / "_A2A_QUEUE", root=ROOT)
        self.assertEqual(snapshot["packet_counts"], status["packet_counts"])
        dynamic_packet = next(item for item in snapshot["packets"] if item["id"] == "packet_040")
        self.assertEqual(dynamic_packet["path"], packet["path"])

        rel_packet = str(PACKET.relative_to(ROOT))
        rel_doc = str(GATE_DOC.relative_to(ROOT))
        rel_json = str(GATE_JSON.relative_to(ROOT))
        execution_queue = json.loads(EXECUTION_QUEUE_JSON.read_text(encoding="utf-8"))
        active_index = json.loads(ACTIVE_INDEX_JSON.read_text(encoding="utf-8"))
        mission = MISSION_CONTROL.read_text(encoding="utf-8")

        self.assertIn(rel_packet, execution_queue["source_indexes"])
        self.assertIn(rel_packet, active_index["source_files"])
        item = next(item for item in execution_queue["items"] if item["id"] == "SIRINX-WEBSITE-HUMAN-REVIEW-DEPLOY-GATE-PACKET-040")
        self.assertEqual(item["status"], "pending_human_review_no_deploy")
        self.assertIn(rel_packet, item["evidence"])
        self.assertIn(rel_doc, item["evidence"])
        self.assertIn(rel_json, item["evidence"])
        self.assertIn("deploy", item["forbidden_actions"])
        self.assertIn("line_webhook_activation", item["forbidden_actions"])
        self.assertIn("production_analytics", item["forbidden_actions"])
        self.assertIn("crm_customer_data_storage", item["forbidden_actions"])

        stream = next(item for item in active_index["workstreams"] if item["id"] == "sirinx_website_human_review_deploy_gate")
        self.assertEqual(stream["status"], "pending_human_review_no_deploy")
        self.assertIn(rel_packet, stream["evidence"])
        self.assertIn(rel_doc, stream["evidence"])
        self.assertIn(rel_json, stream["evidence"])

        self.assertIn(rel_packet, mission)
        self.assertIn(rel_doc, mission)


if __name__ == "__main__":
    unittest.main()
