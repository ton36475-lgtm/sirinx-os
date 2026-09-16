"""Active-goal source-file receipt guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RECEIPT_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_source_file_receipt_2026-06-29.json"
RECEIPT_DOC = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_SOURCE_FILE_RECEIPT_2026-06-29.md"
INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
COMPLETION_AUDIT = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_COMPLETION_AUDIT_2026-06-29.md"


class ActiveGoalSourceFileReceiptTests(unittest.TestCase):
    """Ensure user-named source files are tracked without overstating availability."""

    def load_receipt(self):
        self.assertTrue(RECEIPT_JSON.exists(), f"Missing source-file receipt JSON: {RECEIPT_JSON}")
        return json.loads(RECEIPT_JSON.read_text(encoding="utf-8"))

    def test_receipt_files_exist_without_all_files_claim(self):
        self.assertTrue(RECEIPT_JSON.exists(), f"Missing source-file receipt JSON: {RECEIPT_JSON}")
        self.assertTrue(RECEIPT_DOC.exists(), f"Missing source-file receipt doc: {RECEIPT_DOC}")

        receipt = self.load_receipt()
        self.assertEqual(receipt["schema"], "sirinx.active_goal.source_file_receipt.v1")
        self.assertEqual(receipt["status"], "current_local_scan_partial")
        self.assertEqual(receipt["evidence_boundary"], "local_evidence_only")
        self.assertFalse(receipt["claims_all_files_read"])
        self.assertFalse(receipt["claims_all_chats_read"])
        self.assertFalse(receipt["external_action_authorized"])

    def test_receipt_covers_all_user_named_sources(self):
        receipt = self.load_receipt()
        expected_names = {item["expected_name"] for item in receipt["source_file_receipts"]}

        self.assertEqual(
            expected_names,
            {
                "routers.ts",
                "agentic.ts",
                "schema.ts",
                "db.ts",
                "llmAnalysis.ts",
                "Master_Agentic_OS_Dashboard.pdf",
                "SKILL (3).md",
                "todo.md",
                "ghostclaw_repo_merge_kit_v3_3.zip",
                "project_hermes_codex_a2a_godmode_integration_v3 (1).html",
            },
        )

    def test_receipt_distinguishes_found_html_from_missing_artifacts(self):
        receipt = self.load_receipt()
        by_name = {item["expected_name"]: item for item in receipt["source_file_receipts"]}

        html = by_name["project_hermes_codex_a2a_godmode_integration_v3 (1).html"]
        self.assertEqual(html["current_local_status"], "found_equivalent_name_read_local_only")
        self.assertEqual(
            html["local_paths"],
            [
                "/Users/sirinx/Downloads/hermes_codex_a2a_godmode_integration_v3/project_hermes_codex_a2a_godmode_integration_v3.html"
            ],
        )
        self.assertEqual(html["evidence_authority"], "current_local_file")

        for missing in (
            "routers.ts",
            "agentic.ts",
            "schema.ts",
            "db.ts",
            "llmAnalysis.ts",
            "Master_Agentic_OS_Dashboard.pdf",
            "SKILL (3).md",
            "todo.md",
            "ghostclaw_repo_merge_kit_v3_3.zip",
        ):
            self.assertEqual(by_name[missing]["current_local_status"], "not_found_in_current_local_scan", missing)
            self.assertEqual(by_name[missing]["local_paths"], [], missing)
            self.assertEqual(by_name[missing]["evidence_authority"], "user_message_summary_only", missing)

    def test_receipt_preserves_external_action_boundary(self):
        receipt = self.load_receipt()
        boundary = receipt["blocked_actions"]

        for action in (
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "paid_provider_call",
            "runtime_queue_execution",
            "merge_script_execution",
            "install",
            "migration",
        ):
            self.assertFalse(boundary[action], f"{action} should remain false")

    def test_receipt_is_linked_from_index_queue_and_completion_audit(self):
        rel_json = str(RECEIPT_JSON.relative_to(ROOT))
        rel_doc = str(RECEIPT_DOC.relative_to(ROOT))

        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        queue = json.loads(QUEUE_JSON.read_text(encoding="utf-8"))
        audit_text = COMPLETION_AUDIT.read_text(encoding="utf-8")

        self.assertIn(rel_json, index["source_files"])
        workstreams = {item["id"]: item for item in index["workstreams"]}
        self.assertIn("active_goal_source_file_receipt", workstreams)
        self.assertEqual(workstreams["active_goal_source_file_receipt"]["status"], "current_local_scan_partial")

        self.assertIn(rel_json, queue["source_indexes"])
        queue_items = {item["id"]: item for item in queue["items"]}
        self.assertIn("SOURCE-FILE-RECEIPT", queue_items)
        self.assertIn("BLOCK-V3-3-ARTIFACT", queue_items["SOURCE-FILE-RECEIPT"]["blocked_by"])

        self.assertIn(rel_json, audit_text)
        self.assertIn(rel_doc, audit_text)

    def test_markdown_receipt_states_partial_boundary(self):
        self.assertTrue(RECEIPT_DOC.exists(), f"Missing source-file receipt doc: {RECEIPT_DOC}")
        text = RECEIPT_DOC.read_text(encoding="utf-8")
        required = [
            "ACTIVE_GOAL_SOURCE_FILE_RECEIPT_PARTIAL",
            "claims_all_files_read=false",
            "claims_all_chats_read=false",
            "not_found_in_current_local_scan",
            "found_equivalent_name_read_local_only",
            "project_hermes_codex_a2a_godmode_integration_v3.html",
            "No deploy, push, cloud mutation, customer send, secret read, provider call, runtime queue execution, merge script, install, or migration was performed.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
