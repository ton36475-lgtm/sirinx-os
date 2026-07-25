"""Telegram-safe work report guard for UAT CRUD MongoDB packet_027."""
import importlib.util
import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUILDER = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "build_codex_hermes_work_report.py"
QUEUE = ROOT / "data" / "pathspecs" / "sirinx_uat_crud_mongodb_work_report_queue_2026-07-02.json"
CONTRACT = ROOT / "data" / "pathspecs" / "sirinx_uat_crud_mongodb_work_report_contract_2026-07-02.json"
DOC = ROOT / "docs" / "knowledge" / "SIRINX_UAT_CRUD_MONGODB_WORK_REPORT_DRAFT_2026-07-02.md"
PACKET_027 = ROOT / "_A2A_QUEUE" / "outbox" / "packet_027_sirinx_uat_crud_mongodb_hermes_review.json"
PACKET_028 = ROOT / "_A2A_QUEUE" / "outbox" / "packet_028_sirinx_uat_crud_mongodb_work_report_draft.json"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"


def load_builder():
    spec = importlib.util.spec_from_file_location("codex_hermes_work_report", BUILDER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class UatCrudMongoWorkReportPacketTests(unittest.TestCase):
    """Ensure packet_028 remains a local draft and cannot become UAT execution."""

    def test_artifacts_exist(self):
        for path in (BUILDER, QUEUE, CONTRACT, DOC, PACKET_027, PACKET_028):
            self.assertTrue(path.exists(), f"Missing artifact: {path}")

    def test_builder_renders_packet_028_from_local_queue(self):
        module = load_builder()
        report = module.build_work_report(QUEUE, item_id="UAT-CRUD-MONGODB-WORK-REPORT-PACKET-028")
        contract = json.loads(CONTRACT.read_text(encoding="utf-8"))

        self.assertEqual(report.status, "BLOCKED")
        self.assertEqual(report.delivery, "telegram-draft")
        self.assertFalse(report.live_send)
        self.assertFalse(report.provider_call)
        self.assertEqual(report.body, contract["draft_report_body"])
        self.assertIn("packet_027", report.body)
        self.assertIn("telegram_live_send: false", report.body)
        self.assertIn("runtime_queue_execution: false", report.body)

    def test_packet_028_is_report_only_not_execution(self):
        packet = json.loads(PACKET_028.read_text(encoding="utf-8"))

        self.assertEqual(packet["id"], "packet_028")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertEqual(packet["delivery"], "telegram-draft")
        self.assertEqual(packet["approval_scope"], "telegram_live_send_only")
        self.assertEqual(packet["dispatch_mode"], "dry_run_report_only")
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

    def test_cli_json_preserves_draft_boundary(self):
        result = subprocess.run(
            [
                sys.executable,
                str(BUILDER),
                str(QUEUE),
                "--item-id",
                "UAT-CRUD-MONGODB-WORK-REPORT-PACKET-028",
                "--json",
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )

        self.assertEqual(result.returncode, 0)
        payload = json.loads(result.stdout)
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["status"], "BLOCKED")
        self.assertFalse(payload["live_send"])
        self.assertFalse(payload["provider_call"])
        self.assertFalse(payload["external_message_send"])
        self.assertIn("APPROVE", json.dumps(json.loads(CONTRACT.read_text(encoding="utf-8"))))

    def test_markdown_doc_and_mission_control_link_report(self):
        doc = DOC.read_text(encoding="utf-8")
        mission = MISSION_CONTROL.read_text(encoding="utf-8")
        required_doc = [
            "UAT_CRUD_MONGODB_WORK_REPORT_DRAFT_LOCAL_ONLY",
            "packet_027",
            "packet_028",
            "delivery=telegram-draft",
            "live_send=false",
            "telegram_live_send=false",
            "mongodb_connect=false",
            "database_write=false",
            "APPROVE_TELEGRAM_WORK_REPORT_SEND",
            "APPROVE_LOCAL_UAT_CRUD_MONGODB_<target>_<date>",
        ]
        missing = [item for item in required_doc if item not in doc]
        self.assertEqual(missing, [])

        for rel in (
            "data/pathspecs/sirinx_uat_crud_mongodb_work_report_queue_2026-07-02.json",
            "data/pathspecs/sirinx_uat_crud_mongodb_work_report_contract_2026-07-02.json",
            "docs/knowledge/SIRINX_UAT_CRUD_MONGODB_WORK_REPORT_DRAFT_2026-07-02.md",
            "_A2A_QUEUE/outbox/packet_028_sirinx_uat_crud_mongodb_work_report_draft.json",
        ):
            self.assertIn(rel, mission)


if __name__ == "__main__":
    unittest.main()
