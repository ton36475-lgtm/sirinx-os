import json
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "ghostclaw_a2a_sidecar.py"


class GhostclawA2ASidecarTest(unittest.TestCase):
    def test_sidecar_routes_outbox_packet_and_writes_probe_ack(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            outbox = root / ".ghostclaw_runtime" / "a2a2a" / "outbox" / "codex"
            outbox.mkdir(parents=True)
            packet = outbox / "ping_hermes.json"
            packet.write_text(
                json.dumps(
                    {
                        "schema": "ghostclaw.a2a2a.task.v1",
                        "mission": "a2a_sync_smoke_test",
                        "source": "codex",
                        "target": "hermes",
                        "requires_ack": True,
                        "requires_receipt": True,
                        "dangerous_actions_allowed": False,
                        "secret_access_allowed": False,
                        "paid_model_calls_allowed": False,
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
                    "a2a-sync",
                    "--scan-all",
                    "--once",
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            payload = json.loads(result.stdout)
            self.assertEqual(payload["scan"]["routed_count"], 1)
            self.assertEqual(payload["scan"]["ack_count"], 1)
            self.assertTrue((root / ".ghostclaw_runtime" / "a2a2a" / "inbox" / "hermes" / "ping_hermes.json").is_file())

            receipts = sorted((root / ".ghostclaw_runtime" / "a2a2a" / "receipts").glob("ack_*.json"))
            self.assertEqual(len(receipts), 1)
            receipt = json.loads(receipts[0].read_text(encoding="utf-8"))
            self.assertEqual(receipt["mode"], "probe_only_no_model")
            self.assertEqual(receipt["ack_agent"], "hermes")
            self.assertEqual(receipt["packet_target"], "hermes")
            self.assertFalse(receipt["payload_executed"])
            self.assertFalse(receipt["paid_model_calls_executed"])
            self.assertFalse(receipt["secret_access_executed"])
            self.assertFalse(receipt["execution"]["deploy"])
            self.assertFalse(receipt["execution"]["git_push"])

    def test_sidecar_send_smoke_creates_all_required_mailboxes(self):
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
                    "--send-smoke",
                    "--scan-all",
                    "--once",
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            for agent in ("hermes", "kob", "codex", "opus", "glm", "deepseek", "kimi", "browser", "vibe"):
                self.assertTrue((root / ".ghostclaw_runtime" / "a2a2a" / "inbox" / agent).is_dir())
                self.assertTrue((root / ".ghostclaw_runtime" / "a2a2a" / "outbox" / agent).is_dir())

            receipts = sorted((root / ".ghostclaw_runtime" / "a2a2a" / "receipts").glob("ack_*.json"))
            self.assertEqual(len(receipts), 9)
            self.assertTrue((root / ".ghostclaw_runtime" / "a2a2a" / "logs" / "a2a-sync.log").is_file())


if __name__ == "__main__":
    unittest.main()
