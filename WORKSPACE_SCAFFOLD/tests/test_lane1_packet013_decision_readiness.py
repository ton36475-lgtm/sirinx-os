"""GhostClaw LANE_1 packet_013 decision readiness scorecard guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCORECARD_JSON = ROOT / "data" / "pathspecs" / "ghostclaw_lane1_packet013_decision_readiness_2026-06-29.json"
SCORECARD_DOC = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_PACKET013_DECISION_READINESS_2026-06-29.md"
WORKBENCH_JSON = ROOT / "data" / "pathspecs" / "ghostclaw_lane1_packet013_decision_workbench_2026-06-29.json"
QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
MISSION_DATA = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"
FINAL_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"


class Lane1Packet013DecisionReadinessTests(unittest.TestCase):
    """Ensure readiness evidence helps Hermes decide without becoming a decision."""

    def load_scorecard(self):
        self.assertTrue(SCORECARD_JSON.exists(), f"Missing readiness scorecard: {SCORECARD_JSON}")
        return json.loads(SCORECARD_JSON.read_text(encoding="utf-8"))

    def test_scorecard_files_exist_without_final_decision_or_packet(self):
        self.assertTrue(SCORECARD_JSON.exists(), f"Missing readiness scorecard: {SCORECARD_JSON}")
        self.assertTrue(SCORECARD_DOC.exists(), f"Missing readiness doc: {SCORECARD_DOC}")
        self.assertFalse(FINAL_DECISION.exists(), "Hermes decision exists unexpectedly")
        self.assertFalse(FINAL_PACKET.exists(), "Final Opus packet exists unexpectedly")

    def test_scorecard_is_not_a_decision_or_gate_unlock(self):
        scorecard = self.load_scorecard()

        self.assertEqual(scorecard["schema"], "ghostclaw.lane1.packet013_decision_readiness.v1")
        self.assertEqual(scorecard["status"], "readiness_scorecard_not_decision")
        self.assertEqual(scorecard["current_actionable_packet"], "packet_013")
        self.assertFalse(scorecard["decision_record"])
        self.assertFalse(scorecard["codex_recorder_gate_open"])
        self.assertFalse(scorecard["lane2_authorized"])
        self.assertFalse(scorecard["claims_final_opus_packet"])

    def test_scorecard_covers_all_allowed_decisions_with_readiness_states(self):
        scorecard = self.load_scorecard()
        readiness = {item["decision"]: item for item in scorecard["decision_readiness"]}

        self.assertEqual(
            set(readiness),
            {"route_to_opus", "request_revision", "open_codex_recorder_gate", "block"},
        )
        self.assertEqual(readiness["open_codex_recorder_gate"]["readiness"], "blocked_pending_hermes_decision")
        self.assertEqual(readiness["route_to_opus"]["readiness"], "reviewable_local_only")
        self.assertEqual(readiness["request_revision"]["readiness"], "reviewable_local_only")
        self.assertEqual(readiness["block"]["readiness"], "reviewable_local_only")
        for item in readiness.values():
            self.assertFalse(item["codex_recorder_gate_open"])
            self.assertFalse(item["lane2_authorized"])
            self.assertGreaterEqual(len(item["evidence"]), 1)
            self.assertGreaterEqual(len(item["required_before_action"]), 1)

    def test_scorecard_preserves_safety_flags_and_blockers(self):
        scorecard = self.load_scorecard()

        self.assertIn("BLOCK-HERMES-GATEWAY", scorecard["current_blockers"])
        self.assertIn("BLOCK-LANE1-OPUS-PACKET", scorecard["current_blockers"])
        for action, value in scorecard["safety_flags"].items():
            self.assertFalse(value, f"{action} should remain false")

    def test_scorecard_is_linked_from_queue_index_and_mission_control(self):
        rel = str(SCORECARD_JSON.relative_to(ROOT))
        rel_doc = str(SCORECARD_DOC.relative_to(ROOT))
        queue = json.loads(QUEUE_JSON.read_text(encoding="utf-8"))
        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        mission = MISSION_DATA.read_text(encoding="utf-8")

        self.assertIn(rel, queue["source_indexes"])
        self.assertIn(rel, index["source_files"])
        lane1 = next(item for item in queue["items"] if item["id"] == "LANE1-HERMES-DECISION-PACKET-013")
        self.assertIn(rel, lane1["evidence"])
        self.assertIn(rel_doc, lane1["evidence"])
        self.assertIn(rel, mission)
        self.assertIn(rel_doc, mission)

    def test_scorecard_extends_workbench_without_replacing_it(self):
        scorecard = self.load_scorecard()
        workbench = json.loads(WORKBENCH_JSON.read_text(encoding="utf-8"))

        self.assertEqual(scorecard["source_workbench"], str(WORKBENCH_JSON.relative_to(ROOT)))
        self.assertEqual(scorecard["allowed_decisions"], workbench["allowed_decisions"])
        self.assertEqual(scorecard["decision_record"], workbench["decision_record"])

    def test_markdown_scorecard_states_non_decision_boundary(self):
        text = SCORECARD_DOC.read_text(encoding="utf-8")
        required = [
            "PACKET013_DECISION_READINESS_NOT_DECISION",
            "decision_record=false",
            "codex_recorder_gate_open=false",
            "lane2_authorized=false",
            "open_codex_recorder_gate",
            "blocked_pending_hermes_decision",
            "This scorecard is not a Hermes decision.",
            "No deploy, push, cloud mutation, customer send, secret read, provider call, runtime queue execution, merge script, install, migration, or LANE_2 start was performed.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
