"""Project-state queue status must mirror the current local A2A snapshot."""
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
QUEUE_STATUS = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_a2a_queue_status_2026-06-29.json"
PROJECT_STATE = ROOT / "PROJECT_STATE.md"
COMPLETION_AUDIT = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_COMPLETION_AUDIT_2026-06-29.md"


class ProjectStateQueueStatusSyncTests(unittest.TestCase):
    """Keep top-level status docs aligned with queue-status evidence."""

    def test_status_docs_reflect_current_queue_counts_and_decision_state(self):
        status = json.loads(QUEUE_STATUS.read_text(encoding="utf-8"))
        counts = status["packet_counts"]
        current_counts = (
            f"inbox={counts['inbox']} outbox={counts['outbox']} working={counts['working']} "
            f"done={counts['done']} blocked={counts['blocked']} total={counts['total']}"
        )

        self.assertEqual(current_counts, "inbox=5 outbox=34 working=1 done=8 blocked=0 total=48")
        self.assertTrue(status["hermes_decision_recorded"])
        self.assertFalse(status["final_lane1_packet_present"])
        self.assertFalse(status["lane2_authorized"])
        self.assertFalse(status["runtime_queue_execution"])

        for doc_path in (PROJECT_STATE, COMPLETION_AUDIT):
            text = doc_path.read_text(encoding="utf-8")
            queue_status_entry = next(
                line for line in text.splitlines() if "Codex/Hermes A2A queue status" in line
            )
            with self.subTest(doc=str(doc_path.relative_to(ROOT))):
                self.assertIn(current_counts, queue_status_entry)
                self.assertIn("Hermes packet_013 decision is recorded", queue_status_entry)
                self.assertIn("packet_026 through packet_040", queue_status_entry)
                self.assertIn("final LANE_1 packet", queue_status_entry)
                self.assertNotIn("outbox=15", queue_status_entry)
                self.assertNotIn("total=29", queue_status_entry)
                self.assertNotIn("no Hermes decision", queue_status_entry)
                self.assertNotIn("does not record a Hermes decision", queue_status_entry)


if __name__ == "__main__":
    unittest.main()
