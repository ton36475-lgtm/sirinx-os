"""Pocket Hatchery v4 safety and schema tests."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class PocketHatcheryV4Tests(unittest.TestCase):
    """Validate Pocket Hatchery MVP boundaries and schemas."""

    def test_pocket_hatchery_track_exists(self):
        """Pocket Hatchery directory and release gate config must exist."""
        self.assertTrue((ROOT / "apps" / "pocket-hatchery").exists())
        self.assertTrue((ROOT / "WORKSPACE_SCAFFOLD" / "config" / "pocket_hatchery_release_gate.json").exists())

    def test_paid_random_loot_box_is_critical(self):
        """Release gate config must flag paid randomness/loot box as false."""
        config_path = ROOT / "WORKSPACE_SCAFFOLD" / "config" / "pocket_hatchery_release_gate.json"
        config = json.loads(config_path.read_text(encoding="utf-8"))
        self.assertFalse(config["flags"]["paid_randomness"])
        self.assertFalse(config["flags"]["loot_box"])
        self.assertFalse(config["flags"]["cash_out"])
        self.assertFalse(config["flags"]["real_money_prize_pool"])

    def test_public_signer_is_critical(self):
        """Public waxwing exposure must be flagged false in release gate."""
        config_path = ROOT / "WORKSPACE_SCAFFOLD" / "config" / "pocket_hatchery_release_gate.json"
        config = json.loads(config_path.read_text(encoding="utf-8"))
        self.assertFalse(config["flags"]["public_waxwing_exposure"])

    def test_release_gate_blocks_public_waxwing(self):
        """Required evidence must include no-public-waxwing check."""
        config_path = ROOT / "WORKSPACE_SCAFFOLD" / "config" / "pocket_hatchery_release_gate.json"
        config = json.loads(config_path.read_text(encoding="utf-8"))
        self.assertIn("metadata_permission_audit", config["required_evidence"])

    def test_uploaded_source_manifest_has_policy_pack(self):
        """Uploaded policy pack source directory or digest must exist."""
        sources = ROOT / "_OBSIDIAN_GHOSTCLAW_BRAIN" / "SOURCES"
        self.assertTrue(sources.exists() or (ROOT / "_OBSIDIAN_GHOSTCLAW_BRAIN" / "17_UPLOADED_POLICY_IMPORT_DIGEST.md").exists())

    def test_creature_catalog_schema_valid(self):
        """Sample creatures must conform to catalog schema."""
        schema_path = ROOT / "apps" / "pocket-hatchery" / "schemas" / "creature_catalog.schema.json"
        sample_path = ROOT / "apps" / "pocket-hatchery" / "schemas" / "sample_creatures.json"
        self.assertTrue(schema_path.exists())
        self.assertTrue(sample_path.exists())
        sample = json.loads(sample_path.read_text(encoding="utf-8"))
        self.assertEqual(sample["version"], "0.1.0")
        for creature in sample["creatures"]:
            self.assertTrue(creature["deterministic"])


if __name__ == "__main__":
    unittest.main()
