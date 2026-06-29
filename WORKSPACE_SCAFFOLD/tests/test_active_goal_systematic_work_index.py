"""SIRINX active-goal systematic work index guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
INDEX_DOC = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_SYSTEMATIC_WORK_INDEX_2026-06-29.md"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
HERMES_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"


class ActiveGoalSystematicWorkIndexTests(unittest.TestCase):
    """Ensure the active-goal work index is complete enough without overstating progress."""

    def test_index_files_exist_without_final_lane1_decision(self):
        self.assertTrue(INDEX_JSON.exists(), f"Missing JSON index: {INDEX_JSON}")
        self.assertTrue(INDEX_DOC.exists(), f"Missing Markdown index: {INDEX_DOC}")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 packet exists unexpectedly")
        self.assertFalse(HERMES_DECISION.exists(), "Hermes decision exists unexpectedly")

    def test_json_index_preserves_scope_and_completion_state(self):
        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))

        self.assertEqual(index["schema"], "sirinx.active_goal.systematic_work_index.v1")
        self.assertEqual(index["status"], "in_progress_not_complete")
        self.assertFalse(index["claims_all_chats_read"])
        self.assertEqual(index["evidence_boundary"], "local_evidence_only")
        self.assertEqual(index["next_safe_action"], "Hermes records LANE_1 decision for packet_013")

    def test_json_index_lists_required_blockers_and_workstreams(self):
        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        blockers = {blocker["id"] for blocker in index["completion_blockers"]}
        workstreams = {item["id"]: item for item in index["workstreams"]}

        self.assertEqual(
            blockers,
            {
                "BLOCK-CHAT-EXPORT",
                "BLOCK-LANE1-OPUS-PACKET",
                "BLOCK-HERMES-GATEWAY",
                "BLOCK-V3-3-ARTIFACT",
                "BLOCK-R0-APPROVALS",
            },
        )
        self.assertIn("ghostclaw_lane1", workstreams)
        self.assertIn("ghostclaw_v3_3", workstreams)
        self.assertIn("hermes_codex_a2a_godmode_v3_html", workstreams)
        self.assertIn("pocket_hatchery_r0", workstreams)
        self.assertEqual(workstreams["ghostclaw_lane1"]["current_actionable_packet"], "packet_013")
        self.assertFalse(workstreams["ghostclaw_lane1"]["lane2_authorized"])
        self.assertEqual(workstreams["hermes_codex_a2a_godmode_v3_html"]["status"], "source_read_local_only")
        self.assertIn(
            "data/pathspecs/sirinx_hermes_codex_a2a_godmode_v3_html_recheck_2026-06-29.json",
            index["source_files"],
        )

    def test_json_index_preserves_external_action_boundary(self):
        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        boundary = index["blocked_actions"]

        for action in (
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "paid_provider_call",
            "runtime_queue_execution",
        ):
            self.assertFalse(boundary[action], f"{action} should be false")

    def test_markdown_index_states_incomplete_boundary(self):
        text = INDEX_DOC.read_text(encoding="utf-8")
        required = [
            "ACTIVE_GOAL_SYSTEMATIC_WORK_INDEX_NOT_COMPLETE",
            "This index does not claim all chats were read.",
            "claims_all_chats_read=false",
            "evidence_boundary=local_evidence_only",
            "BLOCK-CHAT-EXPORT",
            "BLOCK-LANE1-OPUS-PACKET",
            "BLOCK-HERMES-GATEWAY",
            "BLOCK-V3-3-ARTIFACT",
            "BLOCK-R0-APPROVALS",
            "current_actionable_packet=packet_013",
            "lane2_authorized=false",
            "hermes_codex_a2a_godmode_v3_html",
            "SIRINX_HERMES_CODEX_A2A_GODMODE_V3_HTML_RECHECK_2026-06-29.md",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
