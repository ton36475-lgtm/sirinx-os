"""Codex/Hermes Telegram-safe work report draft contract."""
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "build_codex_hermes_work_report.py"
CONTRACT_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_work_report_contract_2026-06-29.json"
CONTRACT_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_WORK_REPORT_DRAFT_2026-06-29.md"
QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
PROJECT_HERMES_PROTOCOL = Path("/Users/sirinx/project-hermes/HERMES_TELEGRAM_WORK_REPORT_PROTOCOL.md")


def load_report_module():
    spec = importlib.util.spec_from_file_location("codex_hermes_work_report", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CodexHermesWorkReportTests(unittest.TestCase):
    """Ensure local work reports stay draft-only and auditable."""

    def test_contract_artifacts_exist(self):
        self.assertTrue(SCRIPT.exists(), f"Missing report builder: {SCRIPT}")
        self.assertTrue(CONTRACT_JSON.exists(), f"Missing contract JSON: {CONTRACT_JSON}")
        self.assertTrue(CONTRACT_DOC.exists(), f"Missing contract doc: {CONTRACT_DOC}")
        self.assertTrue(PROJECT_HERMES_PROTOCOL.exists(), f"Missing protocol source: {PROJECT_HERMES_PROTOCOL}")

    def test_contract_preserves_telegram_draft_boundary(self):
        contract = json.loads(CONTRACT_JSON.read_text(encoding="utf-8"))

        self.assertEqual(contract["schema"], "sirinx.codex_hermes.work_report_contract.v1")
        self.assertEqual(contract["status"], "telegram_draft_ready")
        self.assertEqual(contract["delivery"], "telegram-draft")
        self.assertEqual(contract["source_queue"], str(QUEUE_JSON.relative_to(ROOT)))
        self.assertEqual(contract["source_protocol"], str(PROJECT_HERMES_PROTOCOL))
        self.assertFalse(contract["live_send"])
        self.assertFalse(contract["provider_call"])
        self.assertFalse(contract["external_message_send"])
        for action in (
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "paid_provider_call",
            "runtime_queue_execution",
            "telegram_live_send",
        ):
            self.assertFalse(contract["blocked_actions"][action], f"{action} should remain false")

        body = contract["draft_report_body"]
        for required in (
            "Hermes work report.",
            "status: BLOCKED",
            "task: LANE1-HERMES-DECISION-PACKET-013",
            "delivery: telegram-draft",
            "dry_run: true",
            "live_send: false",
            "provider_call: false",
            "external_message_send: false",
            "deploy: false",
            "push: false",
            "next: Record a separate local Hermes decision",
        ):
            self.assertIn(required, body)

    def test_builder_renders_report_from_execution_queue(self):
        module = load_report_module()
        report = module.build_work_report(QUEUE_JSON)
        contract = json.loads(CONTRACT_JSON.read_text(encoding="utf-8"))

        self.assertEqual(report.status, "BLOCKED")
        self.assertEqual(report.delivery, "telegram-draft")
        self.assertFalse(report.live_send)
        self.assertFalse(report.provider_call)
        self.assertEqual(report.body, contract["draft_report_body"])
        self.assertIn("LANE1-HERMES-DECISION-PACKET-013", report.body)
        self.assertIn("BLOCK-HERMES-GATEWAY", report.body)
        self.assertIn("external_message_send: false", report.body)
        self.assertIn("secret_read: false", report.body)
        self.assertIn("paid_provider_call: false", report.body)

    def test_cli_missing_queue_fails_closed_without_send(self):
        with tempfile.TemporaryDirectory() as tmp:
            missing = Path(tmp) / "missing-queue.json"
            result = subprocess.run(
                [sys.executable, str(SCRIPT), str(missing)],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )

        self.assertEqual(result.returncode, 2)
        self.assertIn("missing_execution_queue", result.stdout)
        self.assertIn('"live_send": false', result.stdout)
        self.assertIn('"external_message_send": false', result.stdout)

    def test_contract_is_linked_from_active_index_and_queue(self):
        rel = str(CONTRACT_JSON.relative_to(ROOT))
        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        queue = json.loads(QUEUE_JSON.read_text(encoding="utf-8"))

        self.assertIn(rel, index["source_files"])
        self.assertIn(rel, queue["source_indexes"])
        report_item = next(item for item in queue["items"] if item["id"] == "CODEX-HERMES-WORK-REPORT-DRAFT")
        self.assertIn(rel, report_item["evidence"])
        self.assertIn(str(CONTRACT_DOC.relative_to(ROOT)), report_item["evidence"])
        self.assertIn(str(SCRIPT.relative_to(ROOT)), report_item["evidence"])

    def test_markdown_report_states_no_live_send(self):
        text = CONTRACT_DOC.read_text(encoding="utf-8")
        required = [
            "CODEX_HERMES_WORK_REPORT_DRAFT_LOCAL_ONLY",
            "delivery=telegram-draft",
            "live_send=false",
            "provider_call=false",
            "external_message_send=false",
            "No Telegram message, provider call, deploy, push, cloud mutation, customer send, secret read, paid/provider call, runtime queue execution, merge script, install, migration, wallet action, or live send is authorized.",
            "APPROVE_TELEGRAM_WORK_REPORT_SEND",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
