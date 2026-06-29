"""Current-state blocker recheck guardrails for the active goal."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RECHECK_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_blocker_recheck_2026-06-29.json"
RECHECK_DOC = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_BLOCKER_RECHECK_2026-06-29.md"
INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"


class ActiveGoalBlockerRecheckTests(unittest.TestCase):
    """Ensure repeated blocker checks are explicit, current-state, and local-only."""

    def load_recheck(self):
        self.assertTrue(RECHECK_JSON.exists(), f"Missing blocker recheck JSON: {RECHECK_JSON}")
        return json.loads(RECHECK_JSON.read_text(encoding="utf-8"))

    def test_recheck_files_exist(self):
        self.assertTrue(RECHECK_JSON.exists(), f"Missing blocker recheck JSON: {RECHECK_JSON}")
        self.assertTrue(RECHECK_DOC.exists(), f"Missing blocker recheck doc: {RECHECK_DOC}")

    def test_recheck_records_current_blockers_without_claiming_completion(self):
        recheck = self.load_recheck()

        self.assertEqual(recheck["schema"], "sirinx.active_goal.blocker_recheck.v1")
        self.assertEqual(recheck["status"], "blockers_confirmed_current_state")
        self.assertEqual(recheck["evidence_boundary"], "local_evidence_only")
        self.assertFalse(recheck["claims_goal_complete"])
        self.assertFalse(recheck["claims_all_chats_read"])
        self.assertEqual(
            {item["id"] for item in recheck["completion_blockers"]},
            {
                "BLOCK-CHAT-EXPORT",
                "BLOCK-LANE1-OPUS-PACKET",
                "BLOCK-HERMES-GATEWAY",
                "BLOCK-V3-3-ARTIFACT",
                "BLOCK-R0-APPROVALS",
            },
        )

    def test_recheck_preserves_fresh_probe_results(self):
        recheck = self.load_recheck()
        probes = {probe["id"]: probe for probe in recheck["fresh_probes"]}

        self.assertEqual(probes["hermes_health"]["exit_code"], 7)
        self.assertEqual(probes["hermes_knowledge_status"]["exit_code"], 7)
        self.assertEqual(probes["targeted_artifact_and_export_search"]["exit_code"], 1)
        self.assertFalse(probes["targeted_artifact_and_export_search"]["matches_found"])
        self.assertTrue(probes["project_hermes_continuation_board"]["stale_against_current_probe"])

    def test_recheck_forbids_external_or_sensitive_actions(self):
        recheck = self.load_recheck()
        flags = recheck["safety_flags"]

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
            self.assertFalse(flags[action], f"{action} should remain false")

    def test_recheck_is_linked_from_active_index_and_execution_queue(self):
        self.assertTrue(INDEX_JSON.exists(), f"Missing index JSON: {INDEX_JSON}")
        self.assertTrue(QUEUE_JSON.exists(), f"Missing queue JSON: {QUEUE_JSON}")

        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        queue = json.loads(QUEUE_JSON.read_text(encoding="utf-8"))

        self.assertIn(str(RECHECK_JSON.relative_to(ROOT)), index["source_files"])
        self.assertIn(str(RECHECK_JSON.relative_to(ROOT)), queue["source_indexes"])

    def test_markdown_recheck_states_boundary_and_probe_results(self):
        text = RECHECK_DOC.read_text(encoding="utf-8")
        required = [
            "ACTIVE_GOAL_BLOCKER_RECHECK_LOCAL_ONLY",
            "claims_goal_complete=false",
            "claims_all_chats_read=false",
            "Hermes health curl exit code 7",
            "Hermes knowledge/status curl exit code 7",
            "targeted artifact/export search exit code 1",
            "project-hermes continuation board is stale against current probe",
            "No deploy, push, cloud mutation, customer send, secret read, provider call, runtime queue execution, merge script, install, or migration was performed.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
