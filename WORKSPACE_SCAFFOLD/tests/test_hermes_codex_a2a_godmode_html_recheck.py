"""Hermes/Codex/A2A Godmode v3 HTML intake guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RECHECK_JSON = ROOT / "data" / "pathspecs" / "sirinx_hermes_codex_a2a_godmode_v3_html_recheck_2026-06-29.json"
RECHECK_DOC = ROOT / "docs" / "knowledge" / "SIRINX_HERMES_CODEX_A2A_GODMODE_V3_HTML_RECHECK_2026-06-29.md"


class HermesCodexA2AGodmodeHtmlRecheckTests(unittest.TestCase):
    """Ensure the readable HTML source is captured without confusing it with v3.3."""

    def load_recheck(self):
        self.assertTrue(RECHECK_JSON.exists(), f"Missing JSON recheck: {RECHECK_JSON}")
        return json.loads(RECHECK_JSON.read_text(encoding="utf-8"))

    def test_recheck_files_exist(self):
        self.assertTrue(RECHECK_JSON.exists(), f"Missing JSON recheck: {RECHECK_JSON}")
        self.assertTrue(RECHECK_DOC.exists(), f"Missing Markdown recheck: {RECHECK_DOC}")

    def test_recheck_records_readable_html_source_and_v3_3_boundary(self):
        recheck = self.load_recheck()

        self.assertEqual(recheck["schema"], "sirinx.hermes_codex_a2a_godmode_v3.html_recheck.v1")
        self.assertEqual(recheck["status"], "source_read_local_only")
        self.assertEqual(recheck["evidence_boundary"], "local_evidence_only")
        self.assertEqual(recheck["line_count"], 78)
        self.assertFalse(recheck["claims_v3_3_merge_kit_present"])
        self.assertEqual(
            recheck["source_path"],
            "/Users/sirinx/Downloads/hermes_codex_a2a_godmode_integration_v3/project_hermes_codex_a2a_godmode_integration_v3.html",
        )

    def test_recheck_preserves_topology_and_no_ask_boundary(self):
        recheck = self.load_recheck()

        self.assertEqual(recheck["topology"]["Hermes"], "Mission commander, memory sync, queue routing, run log, watchdog.")
        self.assertEqual(recheck["topology"]["Codex"], "Real workspace executor, patches, tests, validation, git integration.")
        self.assertEqual(recheck["topology"]["Opus/KOB"], "Architecture, risk review, task decomposition, release readiness.")
        self.assertEqual(recheck["risk_engine"]["critical"], "Auto-block and continue other work.")
        self.assertTrue(recheck["no_ask_not_approve_all"])

    def test_recheck_forbids_external_or_sensitive_actions(self):
        recheck = self.load_recheck()
        flags = recheck["safety_flags"]

        for action in (
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "paid_provider_call",
            "runtime_queue_execution",
            "merge_script_execution",
        ):
            self.assertFalse(flags[action], f"{action} should remain false")

    def test_markdown_recheck_states_boundary(self):
        text = RECHECK_DOC.read_text(encoding="utf-8")
        required = [
            "HERMES_CODEX_A2A_GODMODE_V3_HTML_RECHECK_LOCAL_ONLY",
            "source_read_local_only",
            "claims_v3_3_merge_kit_present=false",
            "No-Ask != Approve-All",
            "Hermes",
            "Codex",
            "Opus/KOB",
            "GLM / DeepSeek",
            "No deploy, push, cloud mutation, customer send, secret read, provider call, runtime queue execution, or merge script was performed.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
