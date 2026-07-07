"""Live A2A queue visibility guard for packet_028."""
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUILDER = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "build_codex_hermes_a2a_queue_status.py"
PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_028_sirinx_uat_crud_mongodb_work_report_draft.json"
DOC = ROOT / "docs" / "knowledge" / "SIRINX_UAT_CRUD_MONGODB_WORK_REPORT_A2A_VISIBILITY_2026-07-02.md"


def load_builder():
    spec = importlib.util.spec_from_file_location("codex_hermes_a2a_queue_status", BUILDER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class UatCrudMongoWorkReportA2AVisibilityTests(unittest.TestCase):
    """Ensure packet_028 is indexed as a report draft without execution."""

    def test_packet_028_is_visible_in_live_queue_without_execution(self):
        module = load_builder()
        snapshot = module.build_queue_status(queue_root=ROOT / "_A2A_QUEUE", root=ROOT)
        packet = next(item for item in snapshot["packets"] if item["id"] == "packet_028")

        self.assertEqual(snapshot["status"], "local_queue_indexed_not_executed")
        self.assertEqual(snapshot["evidence_boundary"], "local_file_bus_only")
        self.assertTrue(snapshot["local_read_only"])
        self.assertFalse(snapshot["runtime_queue_execution"])
        self.assertFalse(snapshot["lane2_authorized"])
        self.assertGreaterEqual(snapshot["packet_counts"]["outbox"], 1)
        self.assertGreaterEqual(snapshot["packet_counts"]["total"], 1)

        self.assertEqual(packet["folder"], "outbox")
        self.assertEqual(packet["agent"], "codex")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertEqual(packet["path"], "_A2A_QUEUE/outbox/packet_028_sirinx_uat_crud_mongodb_work_report_draft.json")
        self.assertTrue(packet["approval_required"])

        for field in (
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

    def test_raw_packet_keeps_report_and_uat_gates_closed(self):
        packet = json.loads(PACKET.read_text(encoding="utf-8"))

        self.assertEqual(packet["dispatch_mode"], "dry_run_report_only")
        self.assertEqual(packet["approval_scope"], "telegram_live_send_only")
        self.assertEqual(packet["current_actionable_packet"], "packet_027")
        self.assertTrue(packet["approval_required"])
        self.assertTrue(packet["execution_approval_required"])
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
            "lane2_authorized",
            "decision_record",
            "state_mutation",
        ):
            self.assertFalse(packet[field], f"{field} should remain false")

    def test_visibility_doc_records_non_execution_boundary(self):
        text = DOC.read_text(encoding="utf-8")
        required = [
            "packet_028",
            "local-only live A2A queue visibility",
            "approval_required=true",
            "runtime_queue_execution=false",
            "telegram_live_send=false",
            "provider_call=false",
            "deploy=false",
            "push=false",
            "This confirms local file-bus visibility only.",
            "does not mean Hermes sent the report",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
