"""Active goal completion audit guardrails."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AUDIT_PATH = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_COMPLETION_AUDIT_2026-06-29.md"


class ActiveGoalCompletionAuditTests(unittest.TestCase):
    """Ensure the active-goal audit keeps unresolved completion blockers visible."""

    def test_audit_file_exists(self):
        self.assertTrue(AUDIT_PATH.exists(), f"Missing audit file: {AUDIT_PATH}")

    def test_audit_does_not_claim_goal_complete(self):
        text = AUDIT_PATH.read_text(encoding="utf-8")

        self.assertIn("Status: `IN_PROGRESS_NOT_COMPLETE`", text)
        self.assertIn("The active goal is not complete.", text)
        self.assertIn("This audit should be considered valid only if:", text)

    def test_audit_lists_required_completion_blockers(self):
        text = AUDIT_PATH.read_text(encoding="utf-8")
        required = [
            "BLOCK-CHAT-EXPORT",
            "BLOCK-LANE1-OPUS-PACKET",
            "BLOCK-HERMES-GATEWAY",
            "BLOCK-V3-3-ARTIFACT",
            "BLOCK-R0-APPROVALS",
        ]

        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])

    def test_audit_preserves_blocked_actions(self):
        text = AUDIT_PATH.read_text(encoding="utf-8")
        required = [
            "deploy/push/live/provider/cloud/install/migration/secret reads blocked",
            "Do not start until Hermes approval",
            "Wait for exact artifact",
            "SIRINX_GHOSTCLAW_LANE1_PACKET032_A2A_SYNC_RECEIPT_2026-07-02.md",
            "Night Watch fresh status",
            "WARN with local stack services offline",
            "No service repair or restart without approval",
        ]

        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
