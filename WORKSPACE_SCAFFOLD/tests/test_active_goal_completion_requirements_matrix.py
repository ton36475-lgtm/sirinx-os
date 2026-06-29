"""Active-goal completion requirements matrix guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MATRIX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_completion_requirements_matrix_2026-06-29.json"
MATRIX_DOC = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_COMPLETION_REQUIREMENTS_MATRIX_2026-06-29.md"
INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
COMPLETION_AUDIT = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_COMPLETION_AUDIT_2026-06-29.md"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"


class ActiveGoalCompletionRequirementsMatrixTests(unittest.TestCase):
    """Ensure the active goal is audited requirement-by-requirement."""

    def load_matrix(self):
        self.assertTrue(MATRIX_JSON.exists(), f"Missing requirements matrix JSON: {MATRIX_JSON}")
        return json.loads(MATRIX_JSON.read_text(encoding="utf-8"))

    def test_matrix_files_exist_without_completion_claim(self):
        self.assertTrue(MATRIX_JSON.exists(), f"Missing requirements matrix JSON: {MATRIX_JSON}")
        self.assertTrue(MATRIX_DOC.exists(), f"Missing requirements matrix doc: {MATRIX_DOC}")

        matrix = self.load_matrix()
        self.assertEqual(matrix["schema"], "sirinx.active_goal.completion_requirements_matrix.v1")
        self.assertEqual(matrix["status"], "requirements_mapped_not_complete")
        self.assertEqual(matrix["evidence_boundary"], "local_evidence_only")
        self.assertFalse(matrix["claims_goal_complete"])
        self.assertFalse(matrix["claims_all_chats_read"])
        self.assertFalse(matrix["external_action_authorized"])

    def test_matrix_covers_objective_requirements_and_blockers(self):
        matrix = self.load_matrix()
        ids = {item["id"] for item in matrix["requirements"]}

        self.assertEqual(
            ids,
            {
                "REQ-LOCAL-SOURCE-READ",
                "REQ-ALL-CHAT-CONSOLIDATION",
                "REQ-PLAN-REVIEW",
                "REQ-CODEX-HERMES-AUTONOMY",
                "REQ-LANE1-FINAL-PACKET",
                "REQ-HERMES-GATEWAY",
                "REQ-V3-3-MERGE-KIT",
                "REQ-R0-GATE-APPROVALS",
                "REQ-SAFETY-GATES",
                "REQ-OBSIDIAN-BRAIN-SYNC",
                "REQ-VERIFICATION-BUNDLE",
            },
        )

        by_id = {item["id"]: item for item in matrix["requirements"]}
        self.assertEqual(by_id["REQ-ALL-CHAT-CONSOLIDATION"]["verdict"], "blocked_missing_export")
        self.assertEqual(by_id["REQ-LANE1-FINAL-PACKET"]["verdict"], "blocked_missing_hermes_decision_and_final_packet")
        self.assertEqual(by_id["REQ-HERMES-GATEWAY"]["verdict"], "blocked_connection_refused")
        self.assertEqual(by_id["REQ-V3-3-MERGE-KIT"]["verdict"], "blocked_exact_artifact_missing")
        self.assertEqual(by_id["REQ-R0-GATE-APPROVALS"]["verdict"], "blocked_gate_specific_approval_missing")
        self.assertEqual(by_id["REQ-SAFETY-GATES"]["verdict"], "satisfied_for_current_local_work")

        for item in matrix["requirements"]:
            self.assertIn(item["completion_state"], {"satisfied", "partial", "blocked", "active"})
            self.assertGreaterEqual(len(item["evidence"]), 1, item["id"])
            self.assertGreaterEqual(len(item["required_to_complete"]), 1, item["id"])

    def test_matrix_preserves_external_action_boundary(self):
        matrix = self.load_matrix()
        boundary = matrix["blocked_actions"]

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

    def test_matrix_links_from_index_queue_audit_and_mission_control(self):
        rel_json = str(MATRIX_JSON.relative_to(ROOT))
        rel_doc = str(MATRIX_DOC.relative_to(ROOT))

        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        queue = json.loads(QUEUE_JSON.read_text(encoding="utf-8"))
        audit_text = COMPLETION_AUDIT.read_text(encoding="utf-8")
        mission_text = MISSION_CONTROL.read_text(encoding="utf-8")

        self.assertIn(rel_json, index["source_files"])
        workstreams = {item["id"]: item for item in index["workstreams"]}
        self.assertIn("active_goal_completion_requirements_matrix", workstreams)
        self.assertEqual(workstreams["active_goal_completion_requirements_matrix"]["status"], "requirements_mapped_not_complete")

        self.assertIn(rel_json, queue["source_indexes"])
        queue_items = {item["id"]: item for item in queue["items"]}
        self.assertIn("COMPLETION-REQUIREMENTS-MATRIX", queue_items)
        self.assertIn("BLOCK-CHAT-EXPORT", queue_items["COMPLETION-REQUIREMENTS-MATRIX"]["blocked_by"])
        self.assertIn("BLOCK-LANE1-OPUS-PACKET", queue_items["COMPLETION-REQUIREMENTS-MATRIX"]["blocked_by"])

        for text in (audit_text, mission_text):
            self.assertIn(rel_json, text)
            self.assertIn(rel_doc, text)

    def test_markdown_matrix_states_not_complete(self):
        self.assertTrue(MATRIX_DOC.exists(), f"Missing requirements matrix doc: {MATRIX_DOC}")
        text = MATRIX_DOC.read_text(encoding="utf-8")
        required = [
            "ACTIVE_GOAL_COMPLETION_REQUIREMENTS_MATRIX_NOT_COMPLETE",
            "claims_goal_complete=false",
            "claims_all_chats_read=false",
            "REQ-ALL-CHAT-CONSOLIDATION",
            "blocked_missing_export",
            "REQ-LANE1-FINAL-PACKET",
            "blocked_missing_hermes_decision_and_final_packet",
            "REQ-HERMES-GATEWAY",
            "blocked_connection_refused",
            "REQ-SAFETY-GATES",
            "satisfied_for_current_local_work",
            "No deploy, push, cloud mutation, customer send, secret read, provider call, runtime queue execution, merge script, install, or migration was performed.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
