"""Read-only active-goal blocker probe runner guardrails."""
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "probe_active_goal_blockers.py"
CONTRACT_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_read_only_probe_runner_2026-06-29.json"
CONTRACT_DOC = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_READ_ONLY_PROBE_RUNNER_2026-06-29.md"
LATEST_REPORT = ROOT / "WORKSPACE_SCAFFOLD" / "reports" / "active_goal_read_only_probe_latest_2026-06-29.json"
INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"


def load_probe_module():
    spec = importlib.util.spec_from_file_location("probe_active_goal_blockers", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class ActiveGoalReadOnlyProbeRunnerTests(unittest.TestCase):
    """Ensure repeated blocker probes are runnable without widening gates."""

    def test_probe_runner_artifacts_exist_and_contract_is_non_action(self):
        self.assertTrue(SCRIPT.exists(), f"Missing probe runner: {SCRIPT}")
        self.assertTrue(CONTRACT_JSON.exists(), f"Missing contract JSON: {CONTRACT_JSON}")
        self.assertTrue(CONTRACT_DOC.exists(), f"Missing contract doc: {CONTRACT_DOC}")
        self.assertTrue(LATEST_REPORT.exists(), f"Missing latest probe report: {LATEST_REPORT}")

        contract = json.loads(CONTRACT_JSON.read_text(encoding="utf-8"))
        self.assertEqual(contract["schema"], "sirinx.active_goal.read_only_probe_runner.v1")
        self.assertEqual(contract["status"], "runner_ready_local_only")
        self.assertTrue(contract["local_read_only"])
        self.assertFalse(contract["claims_goal_complete"])
        self.assertFalse(contract["claims_all_chats_read"])
        self.assertFalse(contract["clears_blockers"])
        self.assertEqual(contract["script"], "WORKSPACE_SCAFFOLD/scripts/probe_active_goal_blockers.py")
        for action, allowed in contract["blocked_actions"].items():
            self.assertFalse(allowed, f"{action} should remain false")

    def test_build_snapshot_uses_filename_metadata_and_tcp_probe_only(self):
        module = load_probe_module()

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "ghostclaw_repo_merge_kit_v3_3.zip").write_bytes(b"placeholder")
            (root / "chatgpt-export-2026-06-29.json").write_text("{}", encoding="utf-8")
            (root / ".env").write_text("SHOULD_NOT_BE_READ", encoding="utf-8")

            snapshot = module.build_probe_snapshot(
                roots=[root],
                gateway_probe=lambda host, port, timeout: module.TcpProbeResult(
                    available=True,
                    error=None,
                    host=host,
                    port=port,
                ),
            )

        self.assertEqual(snapshot["schema"], "sirinx.active_goal.read_only_probe.v1")
        self.assertTrue(snapshot["local_read_only"])
        self.assertFalse(snapshot["claims_goal_complete"])
        self.assertFalse(snapshot["claims_all_chats_read"])
        self.assertTrue(snapshot["hermes_gateway_available"])
        self.assertTrue(snapshot["exact_v3_3_artifact_found"])
        self.assertTrue(snapshot["chat_export_candidate_found"])
        self.assertEqual(snapshot["secret_like_files_read"], [])
        self.assertIn("ghostclaw_repo_merge_kit_v3_3.zip", {item["basename"] for item in snapshot["artifact_candidates"]})
        self.assertIn("chatgpt-export-2026-06-29.json", {item["basename"] for item in snapshot["chat_export_candidates"]})
        for action, allowed in snapshot["blocked_actions"].items():
            self.assertFalse(allowed, f"{action} should remain false")

    def test_cli_writes_report_without_execution_permissions(self):
        with tempfile.TemporaryDirectory() as tmp:
            output_path = Path(tmp) / "probe.json"
            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "--root",
                    str(Path(tmp)),
                    "--gateway-host",
                    "127.0.0.1",
                    "--gateway-port",
                    "9",
                    "--output",
                    str(output_path),
                ],
                cwd=ROOT,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(output_path.exists())
            payload = json.loads(output_path.read_text(encoding="utf-8"))

        self.assertEqual(payload["schema"], "sirinx.active_goal.read_only_probe.v1")
        self.assertFalse(payload["claims_goal_complete"])
        self.assertFalse(payload["external_action_authorized"])
        self.assertFalse(payload["merge_script_execution"])
        self.assertFalse(payload["install_or_migration"])

    def test_probe_runner_is_linked_from_indexes_and_mission_control(self):
        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        queue = json.loads(QUEUE_JSON.read_text(encoding="utf-8"))
        mission = MISSION_CONTROL.read_text(encoding="utf-8")

        expected_paths = [
            "WORKSPACE_SCAFFOLD/scripts/probe_active_goal_blockers.py",
            "data/pathspecs/sirinx_active_goal_read_only_probe_runner_2026-06-29.json",
            "docs/knowledge/SIRINX_ACTIVE_GOAL_READ_ONLY_PROBE_RUNNER_2026-06-29.md",
            "WORKSPACE_SCAFFOLD/reports/active_goal_read_only_probe_latest_2026-06-29.json",
        ]
        for path in expected_paths:
            self.assertIn(path, index["source_files"])
            self.assertIn(path, queue["source_indexes"])
            self.assertIn(path, mission)

        recheck_item = next(item for item in queue["items"] if item["id"] == "ACTIVE-GOAL-BLOCKER-RECHECK")
        for path in expected_paths:
            self.assertIn(path, recheck_item["evidence"])
        self.assertIn("run_read_only_blocker_probe", recheck_item["allowed_actions"])

    def test_markdown_doc_states_non_completion_boundary(self):
        text = CONTRACT_DOC.read_text(encoding="utf-8")
        required = [
            "ACTIVE_GOAL_READ_ONLY_PROBE_RUNNER_LOCAL_ONLY",
            "claims_goal_complete=false",
            "claims_all_chats_read=false",
            "clears_blockers=false",
            "No secret file contents are read.",
            "No deploy, push, cloud mutation, customer send, secret read, paid/provider call, runtime queue execution, merge script, install, migration, wallet action, or live send is performed.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
