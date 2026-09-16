import json
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "ghostclaw_a2a_bus_watcher.py"


class GhostclawA2ABusWatcherTest(unittest.TestCase):
    def test_bus_watcher_acknowledges_all_mailboxes_without_executing_payloads(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            for target in ("codex", "opencode"):
                inbox = root / ".ghostclaw_runtime" / "a2a2a" / "inbox" / target
                inbox.mkdir(parents=True, exist_ok=True)
                (inbox / f"{target}.json").write_text(
                    json.dumps(
                        {
                            "schema": "ghostclaw.a2a2a.task.v1",
                            "id": f"packet-{target}",
                            "mission": "a2a_sync_smoke_test",
                            "source": "codex",
                            "target": target,
                            "requires_ack": True,
                            "requires_receipt": True,
                            "dangerous_actions_allowed": False,
                            "secret_access_allowed": False,
                            "paid_model_calls_allowed": False,
                            "created_at": "2026-06-30T00:00:00Z",
                            "payload": {"message": "ping"},
                        }
                    ),
                    encoding="utf-8",
                )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--once"],
                check=True,
                text=True,
                capture_output=True,
            )

            self.assertIn('"scanned_packets": 2', result.stdout)
            receipts = sorted((root / ".ghostclaw_runtime" / "a2a2a" / "receipts").glob("bus_ack_*.json"))
            self.assertEqual(len(receipts), 2)
            for path in receipts:
                receipt = json.loads(path.read_text(encoding="utf-8"))
                self.assertEqual(receipt["schema"], "ghostclaw.a2a2a.bus_ack_receipt.v1")
                self.assertTrue(receipt["local_worker"])
                self.assertFalse(receipt["probe_only"])
                self.assertFalse(receipt["execution"]["payload_executed"])
                self.assertFalse(receipt["execution"]["secret_access"])

            state = json.loads((root / ".ghostclaw_runtime" / "a2a2a" / "state" / "a2a-sync.json").read_text(encoding="utf-8"))
            self.assertEqual(state["schema"], "ghostclaw.a2a2a.local_bus_watcher_state.v1")
            self.assertTrue(state["local_worker"])
            self.assertFalse(state["probe_only"])
            self.assertEqual(state["receipt_count"], 2)

    def test_packet_argument_limits_bus_ack_to_selected_file(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            selected = None
            for target in ("codex", "opencode"):
                inbox = root / ".ghostclaw_runtime" / "a2a2a" / "inbox" / target
                inbox.mkdir(parents=True, exist_ok=True)
                packet_path = inbox / f"{target}.json"
                packet_path.write_text(
                    json.dumps(
                        {
                            "schema": "ghostclaw.a2a2a.task.v1",
                            "id": f"packet-{target}",
                            "mission": "a2a_sync_smoke_test",
                            "source": "codex",
                            "target": target,
                            "requires_ack": True,
                            "requires_receipt": True,
                            "dangerous_actions_allowed": False,
                            "secret_access_allowed": False,
                            "paid_model_calls_allowed": False,
                            "created_at": "2026-06-30T00:00:00Z",
                            "payload": {"message": "ping"},
                        }
                    ),
                    encoding="utf-8",
                )
                if target == "codex":
                    selected = packet_path

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--packet",
                    str(selected.relative_to(root)),
                    "--once",
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            self.assertIn('"scanned_packets": 1', result.stdout)
            receipts = sorted((root / ".ghostclaw_runtime" / "a2a2a" / "receipts").glob("bus_ack_*.json"))
            self.assertEqual(len(receipts), 1)
            receipt = json.loads(receipts[0].read_text(encoding="utf-8"))
            self.assertEqual(receipt["target"], "codex")
            self.assertNotEqual(receipt["target"], "opencode")


if __name__ == "__main__":
    unittest.main()
