"""Risk classifier tests."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def classify_risk(text: str) -> str:
    """Simple rule-based risk classifier aligned with v4 guardrails."""
    lowered = text.lower()
    critical_patterns = ["secret", "private key", "seed phrase", "api token", "production deploy", "loot box", "cash out", "gambling", "public waxwing"]
    high_patterns = ["deploy", "install", "dependency repair", "rm -rf node_modules"]
    medium_patterns = ["patch", "refactor", "test"]
    for pat in critical_patterns:
        if pat in lowered:
            return "critical"
    for pat in high_patterns:
        if pat in lowered:
            return "high"
    for pat in medium_patterns:
        if pat in lowered:
            return "medium"
    return "safe"


class RiskClassifierTests(unittest.TestCase):
    """Validate risk classifier boundaries."""

    def test_critical_secret(self):
        self.assertEqual(classify_risk("Store the API secret in memory"), "critical")

    def test_high_dependency(self):
        self.assertEqual(classify_risk("Run rm -rf node_modules then pnpm install"), "high")

    def test_medium_patch(self):
        self.assertEqual(classify_risk("Patch the schema and add tests"), "medium")

    def test_safe_docs(self):
        self.assertEqual(classify_risk("Write markdown documentation for the wallet flow"), "safe")


if __name__ == "__main__":
    unittest.main()
