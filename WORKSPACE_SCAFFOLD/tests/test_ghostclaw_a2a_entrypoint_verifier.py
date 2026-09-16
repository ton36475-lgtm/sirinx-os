import json
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "ghostclaw_a2a_entrypoint_verifier.py"


class GhostclawA2AEntrypointVerifierTest(unittest.TestCase):
    def test_current_repo_has_local_role_worker_entrypoints(self):
        result = subprocess.run(
            ["python3", str(SCRIPT), "--root", str(ROOT)],
            check=True,
            text=True,
            capture_output=True,
        )
        report = json.loads(result.stdout)
        self.assertEqual(report["status"], "ready_for_live_start_review")
        self.assertTrue(report["summary"]["hermes_real_entrypoint_found"])
        self.assertTrue(report["summary"]["kob_real_entrypoint_found"])
        self.assertTrue(report["summary"]["a2a_sync_startable_sidecar_found"])
        self.assertFalse(report["summary"]["safe_to_claim_full_goal_complete"])

    def test_classifies_probe_and_dry_run_as_not_real_entrypoints(self):
        result = subprocess.run(
            ["python3", str(SCRIPT), "--root", str(ROOT)],
            check=True,
            text=True,
            capture_output=True,
        )
        report = json.loads(result.stdout)
        hermes_paths = {item["path"]: item for item in report["candidates"]["hermes"]["paths"]}
        kob_paths = {item["path"]: item for item in report["candidates"]["kob"]["paths"]}
        a2a_paths = {item["path"]: item for item in report["candidates"]["a2a_sync"]["paths"]}
        self.assertEqual(hermes_paths["scripts/ghostclaw_a2a_role_worker.py"]["classification"], "local_runner")
        self.assertEqual(kob_paths["scripts/ghostclaw_a2a_role_worker.py"]["classification"], "local_runner")
        self.assertEqual(a2a_paths["scripts/ghostclaw_a2a_bus_watcher.py"]["classification"], "local_runner")
        self.assertEqual(hermes_paths["scripts/ghostclaw_a2a_sync_probe.py"]["classification"], "probe_fallback")
        self.assertEqual(hermes_paths["services/hermes-api/src/inbox.mjs"]["classification"], "dry_run_module")
        self.assertEqual(kob_paths["GHOSTCLAW/agents/kob-validator.md"]["classification"], "agent_card_or_doc")
        self.assertFalse(hermes_paths["scripts/ghostclaw_a2a_sync_probe.py"]["startable_for_goal"])
        self.assertTrue(hermes_paths["scripts/ghostclaw_a2a_role_worker.py"]["startable_for_goal"])
        self.assertTrue(a2a_paths["scripts/ghostclaw_a2a_bus_watcher.py"]["startable_for_goal"])

    def test_write_receipt_creates_state_and_receipt_files(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "GHOSTCLAW" / "a2a-hermes-codex-bridge").mkdir(parents=True)
            (root / "GHOSTCLAW" / "a2a-hermes-codex-bridge" / "a2a-sync-runner.mjs").write_text(
                "console.log('sidecar')\n",
                encoding="utf-8",
            )
            (root / "scripts").mkdir()
            (root / "scripts" / "ghostclaw_a2a_sync_probe.py").write_text("# probe\n", encoding="utf-8")
            (root / "scripts" / "ghostclaw_a2a_role_worker.py").write_text("# role worker\n", encoding="utf-8")
            (root / "scripts" / "ghostclaw_a2a_bus_watcher.py").write_text("# bus watcher\n", encoding="utf-8")
            (root / "package.json").write_text(json.dumps({"scripts": {}}), encoding="utf-8")

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--write-receipt"],
                check=True,
                text=True,
                capture_output=True,
            )
            report = json.loads(result.stdout)
            written = report["written"]
            self.assertTrue((root / written["state"]).is_file())
            self.assertTrue((root / written["receipt"]).is_file())
            receipt = json.loads((root / written["receipt"]).read_text(encoding="utf-8"))
            self.assertEqual(receipt["schema"], "ghostclaw.a2a2a.entrypoint_verification.v1")
            self.assertIn("package_install", receipt["blocked_actions_preserved"])


if __name__ == "__main__":
    unittest.main()
