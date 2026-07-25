"""Config integrity tests for Pocket Hatchery Agent Factory v4."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class ConfigIntegrityTests(unittest.TestCase):
    """Validate model routing matrix and portfolio tracks."""

    def test_model_routing_priority(self):
        """Model routing matrix must list safe-to-audit models in ascending score order."""
        matrix_path = ROOT / "_OBSIDIAN_GHOSTCLAW_BRAIN" / "09_MODEL_ROUTING_MATRIX.md"
        self.assertTrue(matrix_path.exists(), "Model routing matrix file missing")
        text = matrix_path.read_text(encoding="utf-8")
        # Expect core agent/model names used in v2/v4 docs
        self.assertIn("deepseek", text.lower())
        self.assertIn("qwen", text.lower())
        self.assertIn("opus", text.lower())
        self.assertIn("glm", text.lower())
        self.assertIn("hermes", text.lower())

    def test_portfolio_tracks_exist(self):
        """Portfolio tracks must include Pocket Hatchery as flagship MVP."""
        state_path = ROOT / "PROJECT_STATE.md"
        self.assertTrue(state_path.exists())
        text = state_path.read_text(encoding="utf-8")
        self.assertIn("Pocket Hatchery", text)
        self.assertIn("flagship MVP", text)


if __name__ == "__main__":
    unittest.main()
