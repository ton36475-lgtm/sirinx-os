"""GhostClaw LANE_1 architecture draft safety tests."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DRAFT_PATH = (
    ROOT
    / "docs"
    / "knowledge"
    / "SIRINX_GHOSTCLAW_LANE1_ARCHITECTURE_PACKET_DRAFT_FOR_HERMES_REVIEW_2026-06-29.md"
)
FINAL_PACKET_PATH = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"


class Lane1ArchitectureDraftTests(unittest.TestCase):
    """Ensure the LANE_1 draft is complete enough for review but not final approval."""

    def test_draft_exists_and_final_packet_does_not(self):
        self.assertTrue(DRAFT_PATH.exists(), f"Missing draft: {DRAFT_PATH}")
        self.assertFalse(FINAL_PACKET_PATH.exists(), "Final Opus packet exists unexpectedly")

    def test_draft_has_required_architecture_sections(self):
        text = DRAFT_PATH.read_text(encoding="utf-8")
        required_sections = [
            "## Goal",
            "## Current State",
            "## Proposed Architecture",
            "## Interface Contracts",
            "## Data Model Changes",
            "## Lane Assignments",
            "## Risk Assessment",
            "## Dependencies",
            "## Rollback Plan",
            "## Hermes Routing Recommendation",
        ]

        missing = [section for section in required_sections if section not in text]
        self.assertEqual(missing, [])

    def test_draft_cannot_be_mistaken_for_final_approval(self):
        text = DRAFT_PATH.read_text(encoding="utf-8")
        required_phrases = [
            "DRAFT_FOR_HERMES_REVIEW_NOT_FINAL_OPUS_PACKET",
            "It is not the final Opus architecture packet",
            "not Hermes approval",
            "not authorization for `LANE_2`",
            "lane2_authorized=false",
        ]

        missing = [phrase for phrase in required_phrases if phrase not in text]
        self.assertEqual(missing, [])

    def test_draft_preserves_non_actions(self):
        text = DRAFT_PATH.read_text(encoding="utf-8")
        required_non_actions = [
            "No deploy.",
            "No push.",
            "No provider call.",
            "No runtime queue execution.",
            "No database migration.",
            "No v3.3 backend merge until exact artifact exists.",
            "No LANE_2 build until Hermes approval.",
            "No secret read.",
        ]

        missing = [phrase for phrase in required_non_actions if phrase not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
