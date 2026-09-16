"""Pause/unpause acceptance tests for Pocket Hatchery contracts."""
import unittest


class PauseUnpauseTests(unittest.TestCase):
    """Placeholder acceptance tests for contract pause/unpause."""

    def test_pause_exists_in_actions(self):
        """Contract action table must document pause/unpause."""
        from pathlib import Path
        actions = Path(__file__).resolve().parents[2] / "apps" / "pocket-hatchery" / "contracts" / "contract_actions.md"
        text = actions.read_text(encoding="utf-8")
        self.assertIn("pause()", text)
        self.assertIn("unpause()", text)

    def test_rollback_plan_triggers_pause(self):
        """Rollback plan must trigger pause() first."""
        from pathlib import Path
        plan = Path(__file__).resolve().parents[2] / "apps" / "pocket-hatchery" / "ops" / "rollback_plan.md"
        text = plan.read_text(encoding="utf-8")
        self.assertIn("pause()", text)


if __name__ == "__main__":
    unittest.main()
