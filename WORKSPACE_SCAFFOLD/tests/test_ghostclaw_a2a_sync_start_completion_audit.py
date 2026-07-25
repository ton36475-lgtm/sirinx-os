import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
AUDIT = ROOT / "docs" / "knowledge" / "GHOSTCLAW_A2A_SYNC_START_COMPLETION_AUDIT_20260630.md"
SYNC_RECEIPT = ROOT / ".ghostclaw_runtime" / "a2a2a" / "receipts" / "a2a_sync_start_20260630T000010_126013Z.json"
NO_MCP_RECEIPT = ROOT / ".ghostclaw_runtime" / "a2a2a" / "receipts" / "codex_no_mcp_sidebar_20260630T001124_796529Z.json"
LATEST_SYNC_STATE = ROOT / ".ghostclaw_runtime" / "a2a2a" / "state" / "a2a-sync-start-latest.json"
LATEST_ENTRYPOINT_STATE = ROOT / ".ghostclaw_runtime" / "a2a2a" / "state" / "entrypoint-verification-latest.json"


class GhostclawA2ASyncStartCompletionAuditTest(unittest.TestCase):
    def test_audit_scopes_pass_to_local_safe_runtime(self):
        text = AUDIT.read_text(encoding="utf-8")
        self.assertIn("Status: `pass` / `LOCAL_SAFE_A2A_SYNC_STARTED`", text)
        self.assertIn("Full local-safe objective status: PASS.", text)
        self.assertIn("Do not extend this pass to production", text)
        self.assertIn("Hermes and KOB now run deterministic local role workers", text)
        self.assertIn("no recursive Codex CLI/provider launch was performed", text)

    def test_audit_lists_required_evidence_paths(self):
        text = AUDIT.read_text(encoding="utf-8")
        for expected in (
            ".ghostclaw_runtime/a2a2a/receipts/codex_no_mcp_sidebar_20260630T001124_796529Z.json",
            ".ghostclaw_runtime/a2a2a/receipts/a2a_sync_start_20260630T004643_947615Z.json",
            ".ghostclaw_runtime/a2a2a/receipts/hermes_route_A_codex_to_hermes_buswatcher_20260630T004445_889087Z.json",
            ".ghostclaw_runtime/a2a2a/receipts/kob_verdict_B_codex_to_kob_buswatcher_20260630T004445_889087Z.json",
            ".ghostclaw_runtime/a2a2a/receipts/bus_ack_opencode_E_codex_to_sidebar_opencode_buswatcher_20260630T004445_889087Z.json",
            "scripts/ghostclaw_a2a_sync_probe.py",
            "scripts/codex_no_mcp_a2a_sidebar.sh",
            "scripts/ghostclaw_a2a_entrypoint_verifier.py",
            "scripts/ghostclaw_a2a_role_worker.py",
            "scripts/ghostclaw_a2a_bus_watcher.py",
            ".ghostclaw_runtime/a2a2a/state/entrypoint-verification-latest.json",
            ".ghostclaw_runtime/a2a2a/state/a2a-sync-start-latest.json",
            "docs/knowledge/GHOSTCLAW_EXTERNAL_REPO_INSTALL_RISK_REVIEW_20260630.md",
        ):
            self.assertIn(expected, text)

    def test_receipts_confirm_partial_probe_only_mode(self):
        sync = json.loads(SYNC_RECEIPT.read_text(encoding="utf-8"))
        self.assertEqual(sync["status"], "partial")
        self.assertEqual(sync["mode"], "PROBE_ONLY")
        self.assertTrue(sync["hermes"]["probe_only"])
        self.assertTrue(sync["kob"]["probe_only"])
        self.assertTrue(sync["a2a_sync"]["probe_only"])
        self.assertTrue(sync["restart_acks_received"])

        no_mcp = json.loads(NO_MCP_RECEIPT.read_text(encoding="utf-8"))
        self.assertEqual(no_mcp["status"], "partial")
        self.assertEqual(no_mcp["mode"], "PROBE_ONLY_NO_MCP_PATH_VERIFIED")
        self.assertTrue(no_mcp["no_mcp_confirmed"])
        self.assertFalse(no_mcp["interactive_codex_launched"])
        self.assertFalse(no_mcp["mcp_auth_refreshed"])

    def test_latest_state_confirms_entrypoint_blocker(self):
        sync = json.loads(LATEST_SYNC_STATE.read_text(encoding="utf-8"))
        self.assertEqual(sync["status"], "pass")
        self.assertEqual(sync["mode"], "LOCAL_SAFE_A2A_SYNC_STARTED")
        self.assertEqual(sync["entrypoint_verification"]["status"], "ready_for_live_start_review")
        self.assertTrue(sync["hermes"]["local_worker"])
        self.assertTrue(sync["kob"]["local_worker"])
        self.assertTrue(sync["a2a_sync"]["local_worker"])
        self.assertFalse(sync["hermes"]["probe_only"])
        self.assertFalse(sync["kob"]["probe_only"])
        self.assertFalse(sync["a2a_sync"]["probe_only"])

        entrypoint = json.loads(LATEST_ENTRYPOINT_STATE.read_text(encoding="utf-8"))
        self.assertEqual(entrypoint["status"], "ready_for_live_start_review")
        self.assertTrue(entrypoint["summary"]["hermes_real_entrypoint_found"])
        self.assertTrue(entrypoint["summary"]["kob_real_entrypoint_found"])
        self.assertTrue(entrypoint["summary"]["a2a_sync_startable_sidecar_found"])
        self.assertFalse(entrypoint["summary"]["current_sessions_are_probe_only"])

    def test_audit_blocks_external_install_without_gate(self):
        text = AUDIT.read_text(encoding="utf-8")
        self.assertIn("install_blocked_pending_gate", text)
        self.assertIn("APPROVE_INSTALL_OH_MY_OPENCODE_LITE_QUARANTINE", text)
        self.assertIn("APPROVE_INSTALL_AGENT_BLACKBOX_QUARANTINE", text)
        self.assertIn("install not executed", text)


if __name__ == "__main__":
    unittest.main()
