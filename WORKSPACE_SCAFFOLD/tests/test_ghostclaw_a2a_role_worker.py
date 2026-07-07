import json
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "ghostclaw_a2a_role_worker.py"


def write_packet(root: Path, agent: str, name: str, **overrides):
    inbox = root / ".ghostclaw_runtime" / "a2a2a" / "inbox" / agent
    inbox.mkdir(parents=True, exist_ok=True)
    packet = {
        "schema": "ghostclaw.a2a2a.task.v1",
        "mission": "a2a_sync_smoke_test",
        "source": "codex",
        "target": agent,
        "requires_ack": True,
        "requires_receipt": True,
        "dangerous_actions_allowed": False,
        "secret_access_allowed": False,
        "paid_model_calls_allowed": False,
        "created_at": "2026-06-30T00:00:00Z",
        "payload": {"message": "ping", "expected_behavior": "write ack receipt only"},
    }
    packet.update(overrides)
    path = inbox / name
    path.write_text(json.dumps(packet), encoding="utf-8")
    return path


class GhostclawA2ARoleWorkerTest(unittest.TestCase):
    def test_hermes_worker_routes_packet_without_executing_payload(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_packet(root, "hermes", "ping.json")
            packet = root / ".ghostclaw_runtime" / "a2a2a" / "inbox" / "hermes" / "ping.json"
            payload = json.loads(packet.read_text(encoding="utf-8"))
            payload["payload"]["deploy"] = False
            payload["payload"]["secret_read"] = False
            packet.write_text(json.dumps(payload), encoding="utf-8")

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--agent", "hermes", "--once"],
                check=True,
                text=True,
                capture_output=True,
            )

            self.assertIn('"local_worker": true', result.stdout)
            receipts = sorted((root / ".ghostclaw_runtime" / "a2a2a" / "receipts").glob("hermes_route_*.json"))
            self.assertEqual(len(receipts), 1)
            receipt = json.loads(receipts[0].read_text(encoding="utf-8"))
            self.assertEqual(receipt["schema"], "ghostclaw.a2a2a.hermes_route_receipt.v1")
            self.assertTrue(receipt["local_worker"])
            self.assertFalse(receipt["probe_only"])
            self.assertEqual(receipt["status"], "routed_local_only")
            self.assertFalse(receipt["execution"]["payload_executed"])
            self.assertFalse(receipt["execution"]["paid_model_calls"])
            self.assertFalse(receipt["execution"]["secret_access"])
            outbox_record = root / receipt["route"]["outbox_record"]
            self.assertTrue(outbox_record.is_file())

    def test_kob_worker_blocks_dangerous_packet(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_packet(
                root,
                "kob",
                "danger.json",
                dangerous_actions_allowed=True,
                payload={"message": "deploy production and print token"},
            )

            subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--agent", "kob", "--once"],
                check=True,
                text=True,
                capture_output=True,
            )

            receipts = sorted((root / ".ghostclaw_runtime" / "a2a2a" / "receipts").glob("kob_verdict_*.json"))
            self.assertEqual(len(receipts), 1)
            receipt = json.loads(receipts[0].read_text(encoding="utf-8"))
            self.assertEqual(receipt["schema"], "ghostclaw.a2a2a.kob_verdict_receipt.v1")
            self.assertTrue(receipt["local_worker"])
            self.assertFalse(receipt["probe_only"])
            self.assertEqual(receipt["verdict"]["decision"], "blocked")
            self.assertIn("dangerous_actions_requested", receipt["verdict"]["blocked_reasons"])
            self.assertIn("blocked_keyword_detected", receipt["verdict"]["blocked_reasons"])
            self.assertFalse(receipt["execution"]["deploy"])
            self.assertFalse(receipt["execution"]["secret_access"])

    def test_kob_worker_allows_safe_ack_only_packet(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_packet(root, "kob", "safe.json")

            subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--agent", "kob", "--once"],
                check=True,
                text=True,
                capture_output=True,
            )

            receipts = sorted((root / ".ghostclaw_runtime" / "a2a2a" / "receipts").glob("kob_verdict_*.json"))
            self.assertEqual(len(receipts), 1)
            receipt = json.loads(receipts[0].read_text(encoding="utf-8"))
            self.assertEqual(receipt["status"], "kob_allow_local_ack_only")
            self.assertEqual(receipt["verdict"]["blocked_reasons"], [])
            self.assertTrue((root / receipt["verdict"]["outbox_record"]).is_file())

    def test_packet_argument_limits_processing_to_selected_file(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            selected = write_packet(root, "hermes", "selected.json")
            write_packet(root, "hermes", "ignored.json")

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--agent",
                    "hermes",
                    "--packet",
                    str(selected.relative_to(root)),
                    "--once",
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            self.assertIn('"scanned_packets": 1', result.stdout)
            receipts = sorted((root / ".ghostclaw_runtime" / "a2a2a" / "receipts").glob("hermes_route_*.json"))
            self.assertEqual(len(receipts), 1)
            receipt = json.loads(receipts[0].read_text(encoding="utf-8"))
            self.assertIn("selected.json", receipt["packet_path"])
            self.assertNotIn("ignored.json", receipt["packet_path"])


if __name__ == "__main__":
    unittest.main()
