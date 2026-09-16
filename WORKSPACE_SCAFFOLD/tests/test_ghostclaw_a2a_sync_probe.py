import json
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "ghostclaw_a2a_sync_probe.py"


class GhostclawA2ASyncProbeTest(unittest.TestCase):
    def test_probe_writes_ack_receipt_without_executing_payload(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            inbox = root / ".ghostclaw_runtime" / "a2a2a" / "inbox" / "hermes"
            inbox.mkdir(parents=True)
            packet = inbox / "ping.json"
            packet.write_text(
                json.dumps(
                    {
                        "schema": "ghostclaw.a2a2a.task.v1",
                        "source": "codex",
                        "target": "hermes",
                        "payload": {"message": "ping"},
                    }
                ),
                encoding="utf-8",
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--agent",
                    "hermes",
                    "--once",
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            self.assertIn('"scanned_packets": 1', result.stdout)
            receipts = sorted((root / ".ghostclaw_runtime" / "a2a2a" / "receipts").glob("*.json"))
            self.assertEqual(len(receipts), 1)
            receipt = json.loads(receipts[0].read_text(encoding="utf-8"))
            self.assertTrue(receipt["probe_only"])
            self.assertEqual(receipt["target"], "hermes")
            self.assertEqual(receipt["source"], "codex")
            self.assertFalse(receipt["execution"]["payload_executed"])
            self.assertFalse(receipt["execution"]["paid_model_calls"])
            self.assertFalse(receipt["execution"]["secret_access"])

    def test_probe_scan_all_creates_missing_mailbox_dirs(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--agent",
                    "a2a-sync",
                    "--scan-all",
                    "--once",
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            for agent in ("hermes", "kob", "codex", "opus", "glm", "deepseek", "kimi", "browser", "vibe", "opencode"):
                self.assertTrue((root / ".ghostclaw_runtime" / "a2a2a" / "inbox" / agent).is_dir())
                self.assertTrue((root / ".ghostclaw_runtime" / "a2a2a" / "outbox" / agent).is_dir())
            self.assertTrue((root / ".ghostclaw_runtime" / "a2a2a" / "state" / "probe-processed-a2a-sync.json").is_file())


if __name__ == "__main__":
    unittest.main()
