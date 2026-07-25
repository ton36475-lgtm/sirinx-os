"""Release gate score evidence tests for Pocket Hatchery."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = ROOT / "WORKSPACE_SCAFFOLD" / "config" / "pocket_hatchery_release_gate.json"
OPS_PATH = ROOT / "apps" / "pocket-hatchery" / "ops"

REQUIRED_EVIDENCE_FILES = {
    "pause_unpause_tests": ROOT / "WORKSPACE_SCAFFOLD" / "tests" / "test_pause_unpause.py",
    "wallet_flow_evidence": OPS_PATH / "wallet_flow_evidence.md",
    "metadata_permission_audit": OPS_PATH / "metadata_permission_audit.md",
    "rollback_plan_review": OPS_PATH / "rollback_plan_review.md",
    "contract_action_tests": ROOT / "WORKSPACE_SCAFFOLD" / "tests" / "test_pause_unpause.py",
}

BOUNDARY_EVIDENCE_IDS = {
    "wallet_flow_evidence",
    "metadata_permission_audit",
    "rollback_plan_review",
}


class ReleaseGateScoreTests(unittest.TestCase):
    """Ensure the local release score only rises after local evidence exists."""

    def setUp(self):
        self.config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))

    def test_required_evidence_files_exist(self):
        """Every required evidence id must point to a local evidence file."""
        for evidence_id, path in REQUIRED_EVIDENCE_FILES.items():
            self.assertIn(evidence_id, self.config["required_evidence"])
            self.assertIn(evidence_id, self.config["evidence_files"])
            self.assertEqual(ROOT / self.config["evidence_files"][evidence_id], path)
            self.assertTrue(path.exists(), f"missing evidence for {evidence_id}: {path}")

    def test_evidence_preserves_local_only_boundaries(self):
        """Evidence docs must keep deploy and real wallet writes blocked."""
        boundary_terms = ["local-only", "no deploy", "no real wallet write"]
        for evidence_id in BOUNDARY_EVIDENCE_IDS:
            path = REQUIRED_EVIDENCE_FILES[evidence_id]
            self.assertTrue(path.exists(), f"missing evidence file: {path}")
            text = path.read_text(encoding="utf-8").lower()
            for term in boundary_terms:
                self.assertIn(term, text, f"{path} missing boundary term: {term}")

    def test_score_is_at_least_80_without_opening_external_gates(self):
        """Score can be >=80 only while production/testnet writes remain blocked."""
        self.assertGreaterEqual(self.config["score"], 80)
        self.assertEqual(self.config["score_max"], 100)
        self.assertFalse(self.config["flags"]["production_deploy"])
        self.assertFalse(self.config["flags"]["paid_randomness"])
        self.assertFalse(self.config["flags"]["loot_box"])
        self.assertFalse(self.config["flags"]["cash_out"])
        self.assertFalse(self.config["flags"]["real_money_prize_pool"])


if __name__ == "__main__":
    unittest.main()
