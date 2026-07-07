"""Current active-goal blocker refresh guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REFRESH_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_current_blocker_refresh_2026-06-29.json"
REFRESH_DOC = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_CURRENT_BLOCKER_REFRESH_2026-06-29.md"
INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
FINAL_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
PACKET032_SYNC = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_PACKET032_A2A_SYNC_RECEIPT_2026-07-02.md"
NIGHT_WATCH = ROOT / ".hermes" / "logs" / "night-watch-latest.md"


class ActiveGoalCurrentBlockerRefreshTests(unittest.TestCase):
    """Ensure current read-only probes are recorded without clearing gates."""

    def load_refresh(self):
        self.assertTrue(REFRESH_JSON.exists(), f"Missing refresh JSON: {REFRESH_JSON}")
        return json.loads(REFRESH_JSON.read_text(encoding="utf-8"))

    def test_refresh_artifacts_exist_without_final_decision_or_packet(self):
        self.assertTrue(REFRESH_JSON.exists(), f"Missing refresh JSON: {REFRESH_JSON}")
        self.assertTrue(REFRESH_DOC.exists(), f"Missing refresh doc: {REFRESH_DOC}")
        self.assertTrue(FINAL_DECISION.exists(), "Hermes decision file should exist after route_to_opus decision")
        self.assertTrue(PACKET032_SYNC.exists(), "packet_032 sync receipt should exist")
        self.assertTrue(NIGHT_WATCH.exists(), "Night Watch latest log should exist")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 Opus architecture packet exists unexpectedly")

    def test_refresh_preserves_non_completion_and_safety_boundary(self):
        refresh = self.load_refresh()

        self.assertEqual(refresh["schema"], "sirinx.active_goal.current_blocker_refresh.v1")
        self.assertEqual(refresh["status"], "blockers_still_open")
        self.assertTrue(refresh["local_read_only"])
        self.assertFalse(refresh["claims_goal_complete"])
        self.assertFalse(refresh["claims_all_chats_read"])
        self.assertFalse(refresh["lane2_authorized"])
        self.assertTrue(refresh["hermes_decision_recorded"])
        self.assertTrue(refresh["packet_032_sync_receipt_present"])
        self.assertFalse(refresh["final_lane1_packet_present"])
        self.assertEqual(refresh["night_watch_latest_status"], "WARN")
        self.assertEqual(refresh["local_stack_status"], "degraded_services_offline")
        for action, allowed in refresh["blocked_actions"].items():
            self.assertFalse(allowed, f"{action} should remain false")

    def test_refresh_records_current_read_only_probe_results(self):
        refresh = self.load_refresh()
        probes = {probe["id"]: probe for probe in refresh["read_only_probes"]}

        self.assertEqual(probes["hermes_health"]["exit_code"], 7)
        self.assertEqual(probes["hermes_knowledge_status"]["exit_code"], 7)
        self.assertEqual(probes["hermes_health"]["result"], "unreachable")
        self.assertEqual(probes["hermes_knowledge_status"]["result"], "unreachable")
        self.assertEqual(probes["packet_032_sync_receipt"]["result"], "present")
        self.assertEqual(probes["night_watch_latest"]["result"], "warn_local_stack_offline")
        self.assertFalse(refresh["hermes_gateway_available"])
        self.assertFalse(refresh["exact_v3_3_artifact_found"])
        self.assertFalse(refresh["chat_export_candidate_found"])
        self.assertEqual(refresh["exact_v3_3_artifact_candidates"], [])
        self.assertEqual(refresh["chat_export_candidates"], [])

    def test_refresh_keeps_all_completion_blockers_open(self):
        refresh = self.load_refresh()
        blockers = {blocker["id"]: blocker for blocker in refresh["completion_blockers"]}

        self.assertEqual(
            set(blockers),
            {
                "BLOCK-CHAT-EXPORT",
                "BLOCK-LANE1-OPUS-PACKET",
                "BLOCK-HERMES-GATEWAY",
                "BLOCK-V3-3-ARTIFACT",
                "BLOCK-R0-APPROVALS",
            },
        )
        for blocker in blockers.values():
            self.assertEqual(blocker["status"], "open")
        self.assertIn("Hermes packet_013 decision is recorded", blockers["BLOCK-LANE1-OPUS-PACKET"]["current_evidence"])
        self.assertIn("packet_032 local A2A sync receipt exists", blockers["BLOCK-LANE1-OPUS-PACKET"]["current_evidence"])
        self.assertIn("final LANE_1 Opus architecture packet is still absent", blockers["BLOCK-LANE1-OPUS-PACKET"]["current_evidence"])
        self.assertNotIn("No final Hermes decision", blockers["BLOCK-LANE1-OPUS-PACKET"]["current_evidence"])
        self.assertIn("Night Watch is WARN", blockers["BLOCK-HERMES-GATEWAY"]["current_evidence"])
        self.assertIn("local stack services offline", blockers["BLOCK-HERMES-GATEWAY"]["current_evidence"])
        self.assertIn("final LANE_1 Opus architecture packet", refresh["next_safe_action"])
        self.assertNotIn("Keep packet_013 waiting", refresh["next_safe_action"])

    def test_refresh_is_linked_from_active_index_and_queue(self):
        rel = str(REFRESH_JSON.relative_to(ROOT))
        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        queue = json.loads(QUEUE_JSON.read_text(encoding="utf-8"))

        self.assertIn(rel, index["source_files"])
        self.assertIn(rel, queue["source_indexes"])
        recheck_item = next(item for item in queue["items"] if item["id"] == "ACTIVE-GOAL-BLOCKER-RECHECK")
        self.assertIn(rel, recheck_item["evidence"])

    def test_markdown_refresh_states_metadata_only_boundary(self):
        text = REFRESH_DOC.read_text(encoding="utf-8")
        required = [
            "ACTIVE_GOAL_CURRENT_BLOCKER_REFRESH_NOT_COMPLETE",
            "metadata-only",
            "No raw ChatGPT export content was read.",
            "No secret files were read.",
            "No deploy, push, cloud mutation, customer send, secret read, paid/provider call, runtime queue execution, merge script, install, migration, wallet action, or live send was performed.",
            "All completion blockers remain open.",
            "Hermes packet_013 decision is recorded",
            "packet_032 local A2A sync receipt exists",
            "final LANE_1 Opus architecture packet is still absent",
            "Night Watch latest status: WARN",
            "local stack services are offline",
            "No service repair or restart was performed.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
