import json
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "codex_no_mcp_a2a_sidebar.sh"
RUNBOOK = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_NO_MCP_A2A_SIDEBAR_RUNBOOK_2026-06-30.md"
RISK_REVIEW = ROOT / "docs" / "knowledge" / "GHOSTCLAW_EXTERNAL_REPO_INSTALL_RISK_REVIEW_20260630.md"
STATE = ROOT / ".ghostclaw_runtime" / "a2a2a" / "state" / "codex-no-mcp-sidebar-probe.json"


class CodexNoMcpSidebarRunbookTest(unittest.TestCase):
    def test_runbook_documents_no_mcp_and_blocked_actions(self):
        text = RUNBOOK.read_text(encoding="utf-8")
        self.assertIn("CODEX_HOME", text)
        self.assertIn("No MCP servers configured yet", text)
        self.assertIn("reading or printing auth tokens", text)
        self.assertIn("package install", text)
        self.assertIn("provider/model calls", text)
        self.assertIn("does not fix the current desktop app thread", text)

    def test_external_repo_review_keeps_installs_blocked(self):
        text = RISK_REVIEW.read_text(encoding="utf-8")
        lower = text.lower()
        self.assertIn("install_blocked_pending_gate", text)
        self.assertIn("APPROVE_INSTALL_OH_MY_OPENCODE_LITE_QUARANTINE", text)
        self.assertIn("APPROVE_INSTALL_AGENT_BLACKBOX_QUARANTINE", text)
        self.assertIn("postinstall", lower)
        self.assertIn("global plugin write", lower)

    def test_probe_confirms_isolated_codex_home_has_no_mcp(self):
        result = subprocess.run(
            ["bash", str(SCRIPT), "--probe"],
            cwd=ROOT,
            check=True,
            text=True,
            capture_output=True,
        )
        self.assertIn('"no_mcp_confirmed": true', result.stdout)
        state = json.loads(STATE.read_text(encoding="utf-8"))
        self.assertTrue(state["no_mcp_confirmed"])
        self.assertFalse(state["global_codex_config_mutated"])
        self.assertFalse(state["auth_files_read"])
        self.assertFalse(state["mcp_auth_refreshed"])

    def test_print_launch_does_not_execute_codex(self):
        result = subprocess.run(
            ["bash", str(SCRIPT), "--print-launch"],
            cwd=ROOT,
            check=True,
            text=True,
            capture_output=True,
        )
        self.assertIn("CODEX_HOME=", result.stdout)
        self.assertIn("codex --cd", result.stdout)
        self.assertIn("no_mcp", result.stdout)


if __name__ == "__main__":
    unittest.main()
