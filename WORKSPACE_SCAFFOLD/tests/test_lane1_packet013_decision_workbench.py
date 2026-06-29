"""GhostClaw LANE_1 packet_013 offline decision workbench guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORKBENCH_JSON = ROOT / "data" / "pathspecs" / "ghostclaw_lane1_packet013_decision_workbench_2026-06-29.json"
WORKBENCH_DOC = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_PACKET013_DECISION_WORKBENCH_2026-06-29.md"
FINAL_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"


class Lane1Packet013DecisionWorkbenchTests(unittest.TestCase):
    """Ensure packet_013 can be reviewed offline without being treated as a decision."""

    def load_workbench(self):
        self.assertTrue(WORKBENCH_JSON.exists(), f"Missing packet_013 workbench JSON: {WORKBENCH_JSON}")
        return json.loads(WORKBENCH_JSON.read_text(encoding="utf-8"))

    def test_workbench_files_exist_without_final_decision_or_packet(self):
        self.assertTrue(WORKBENCH_JSON.exists(), f"Missing packet_013 workbench JSON: {WORKBENCH_JSON}")
        self.assertTrue(WORKBENCH_DOC.exists(), f"Missing packet_013 workbench doc: {WORKBENCH_DOC}")
        self.assertFalse(FINAL_DECISION.exists(), "Hermes final decision exists unexpectedly")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 Opus architecture packet exists unexpectedly")

    def test_workbench_preserves_non_decision_boundary(self):
        workbench = self.load_workbench()

        self.assertEqual(workbench["schema"], "ghostclaw.lane1.packet013_decision_workbench.v1")
        self.assertEqual(workbench["status"], "offline_workbench_not_decision")
        self.assertEqual(workbench["current_actionable_packet"], "packet_013")
        self.assertFalse(workbench["decision_record"])
        self.assertFalse(workbench["codex_recorder_gate_open"])
        self.assertFalse(workbench["lane2_authorized"])
        self.assertFalse(workbench["claims_final_opus_packet"])

    def test_workbench_lists_allowed_decisions_and_required_evidence(self):
        workbench = self.load_workbench()

        self.assertEqual(
            workbench["allowed_decisions"],
            ["route_to_opus", "request_revision", "open_codex_recorder_gate", "block"],
        )
        required_paths = set(workbench["required_evidence_paths"])
        for path in (
            "_A2A_QUEUE/inbox/packet_013_ghostclaw_lane1_codex_recorder_gate_request.json",
            "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_CODEX_RECORDER_GATE_REQUEST_2026-06-29.md",
            "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_ARCHITECTURE_PACKET_DRAFT_FOR_HERMES_REVIEW_2026-06-29.md",
            "data/pathspecs/sirinx_active_goal_blocker_recheck_2026-06-29.json",
            "data/pathspecs/sirinx_active_goal_context_packet_registry_2026-06-29.json",
        ):
            self.assertIn(path, required_paths)

    def test_workbench_preserves_blocked_actions(self):
        workbench = self.load_workbench()
        flags = workbench["safety_flags"]

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
            "lane2_start",
        ):
            self.assertFalse(flags[action], f"{action} should remain false")

    def test_workbench_is_linked_from_index_and_queue(self):
        self.assertTrue(INDEX_JSON.exists(), f"Missing index JSON: {INDEX_JSON}")
        self.assertTrue(QUEUE_JSON.exists(), f"Missing queue JSON: {QUEUE_JSON}")
        rel = str(WORKBENCH_JSON.relative_to(ROOT))
        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        queue = json.loads(QUEUE_JSON.read_text(encoding="utf-8"))

        self.assertIn(rel, index["source_files"])
        self.assertIn(rel, queue["source_indexes"])
        lane1 = next(item for item in queue["items"] if item["id"] == "LANE1-HERMES-DECISION-PACKET-013")
        self.assertIn(rel, lane1["evidence"])

    def test_markdown_workbench_states_boundary(self):
        text = WORKBENCH_DOC.read_text(encoding="utf-8")
        required = [
            "PACKET013_DECISION_WORKBENCH_NOT_DECISION",
            "decision_record=false",
            "codex_recorder_gate_open=false",
            "lane2_authorized=false",
            "allowed_decisions=route_to_opus,request_revision,open_codex_recorder_gate,block",
            "This workbench is not a Hermes decision.",
            "No deploy, push, cloud mutation, customer send, secret read, provider call, runtime queue execution, merge script, install, migration, or LANE_2 start was performed.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
