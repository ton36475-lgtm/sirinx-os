"""Hermes gateway read-only recheck evidence guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RECHECK_JSON = ROOT / "data" / "pathspecs" / "sirinx_hermes_gateway_recheck_2026-06-29.json"
RECHECK_DOC = ROOT / "docs" / "knowledge" / "SIRINX_HERMES_GATEWAY_RECHECK_2026-06-29.md"
FINAL_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"


class HermesGatewayRecheckTests(unittest.TestCase):
    """Ensure Hermes gateway evidence is read-only and cannot be mistaken for a decision."""

    def load_report(self):
        self.assertTrue(RECHECK_JSON.exists(), f"Missing JSON recheck: {RECHECK_JSON}")
        return json.loads(RECHECK_JSON.read_text(encoding="utf-8"))

    def test_recheck_files_exist_without_hermes_decision(self):
        self.assertTrue(RECHECK_JSON.exists(), f"Missing JSON recheck: {RECHECK_JSON}")
        self.assertTrue(RECHECK_DOC.exists(), f"Missing Markdown recheck: {RECHECK_DOC}")
        self.assertFalse(FINAL_DECISION.exists(), "Hermes decision exists unexpectedly")

    def test_recheck_preserves_read_only_boundary(self):
        report = self.load_report()

        self.assertEqual(report["schema"], "sirinx.hermes_gateway.recheck.v1")
        self.assertIn(report["status"], {"reachable_read_only", "unreachable"})
        self.assertEqual(report["evidence_boundary"], "localhost_read_only")
        self.assertFalse(report["runtime_queue_execution"])
        self.assertFalse(report["provider_call"])
        self.assertFalse(report["external_message_send"])
        self.assertFalse(report["restart_attempted"])
        self.assertFalse(report["decision_record"])
        self.assertFalse(report["lane2_authorized"])

    def test_recheck_records_required_probes(self):
        report = self.load_report()
        probes = {probe["id"]: probe for probe in report["probes"]}

        self.assertEqual(set(probes), {"tcp_9000_listen", "health", "knowledge_status"})
        for probe in probes.values():
            self.assertIn(probe["result"], {"ok", "failed"})
            self.assertIn("command", probe)
            self.assertNotIn("token", json.dumps(probe).lower())
            self.assertNotIn("secret", json.dumps(probe).lower())

    def test_markdown_recheck_states_blocker_status_and_non_actions(self):
        self.assertTrue(RECHECK_DOC.exists(), f"Missing Markdown recheck: {RECHECK_DOC}")
        text = RECHECK_DOC.read_text(encoding="utf-8")
        required = [
            "HERMES_GATEWAY_RECHECK_LOCAL_READ_ONLY",
            "BLOCK-HERMES-GATEWAY",
            "runtime_queue_execution=false",
            "provider_call=false",
            "external_message_send=false",
            "restart_attempted=false",
            "decision_record=false",
            "lane2_authorized=false",
            "This recheck is not a Hermes decision.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
