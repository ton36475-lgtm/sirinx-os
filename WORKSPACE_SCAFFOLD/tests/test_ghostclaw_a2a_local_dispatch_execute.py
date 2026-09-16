import json
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "ghostclaw_a2a_local_dispatch_execute.py"
APPROVAL = "APPROVE_A2A2A_P003_LOCAL_WORKER_PACKET_DISPATCH_ONLY_A019E53EE"


def write_json(path: Path, payload: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def p003_gate():
    return {
        "schema": "ghostclaw.a2a2a.local_dispatch_gate.v1",
        "packet_id": "A2A2A-P003-LOCAL-WORKER-DISPATCH-GATE-20260703",
        "status": "awaiting_exact_local_dispatch_gate",
        "required_approval": APPROVAL,
        "plan_issues": [],
        "summary": {
            "safe_local_dispatch_candidates": 1,
            "approval_gated_candidates": 2,
            "workers_planned": ["hermes-local-role-worker", "kob-local-role-worker"],
            "workers_used": [],
        },
        "dispatch_manifest": [
            {
                "queue_packet_id": "packet_041",
                "queue_packet_path": "_A2A_QUEUE/outbox/packet_041.json",
                "title": "Safe packet",
                "risk": "safe",
                "planned_worker_packets": [
                    ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_041_hermes.json",
                    ".ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_041_kob.json",
                ],
            }
        ],
        "blocked_actions_preserved": {
            "runtime_queue_execution": False,
            "queue_payload_execution": False,
            "tmux_start_stop_restart": False,
            "telegram_live_send": False,
            "telegram_webhook_activation": False,
            "telegram_polling_start": False,
            "provider_call": False,
            "install": False,
            "push": False,
            "deploy": False,
            "secret_read": False,
            "env_value_read": False,
        },
    }


class GhostclawA2ALocalDispatchExecuteTest(unittest.TestCase):
    def test_without_exact_approval_blocks_and_writes_receipt_only(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(root / "gate.json", p003_gate())

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--gate", "gate.json", "--write"],
                check=False,
                text=True,
                capture_output=True,
            )
            self.assertEqual(result.returncode, 2)
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "blocked_missing_or_invalid_exact_gate")
            self.assertIn("exact_approval_not_present", payload["issues"])
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox").exists())
            self.assertTrue((root / ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P004-LOCAL-WORKER-DISPATCH-EXECUTE-20260703.json").is_file())
            self.assertTrue((root / ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P004-LOCAL-WORKER-DISPATCH-EXECUTE-20260703.json").is_file())

    def test_exact_approval_without_execute_does_not_write_worker_packets(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(root / "gate.json", p003_gate())

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--gate", "gate.json", "--approval", APPROVAL, "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_execute_flag_after_exact_gate")
            self.assertEqual(payload["summary"]["planned_worker_packets"], 2)
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox").exists())

    def test_exact_approval_dry_run_does_not_write_worker_packets(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(root / "gate.json", p003_gate())

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--gate", "gate.json", "--approval", APPROVAL, "--dry-run"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "dry_run_ready_for_local_worker_packet_dispatch")
            self.assertTrue(payload["dry_run"])
            self.assertFalse(payload["execute_requested"])
            self.assertEqual(payload["summary"]["planned_worker_packets"], 2)
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox").exists())

    def test_rejects_dry_run_with_execute(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(root / "gate.json", p003_gate())

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--gate",
                    "gate.json",
                    "--approval",
                    APPROVAL,
                    "--dry-run",
                    "--execute",
                ],
                check=False,
                text=True,
                capture_output=True,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("--dry-run cannot be combined with --execute", result.stderr)
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox").exists())

    def test_exact_approval_and_execute_writes_only_planned_worker_packets(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(root / "gate.json", p003_gate())

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--gate",
                    "gate.json",
                    "--approval",
                    APPROVAL,
                    "--execute",
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "local_worker_packets_dispatched")
            self.assertEqual(payload["summary"]["worker_packets_written"], 2)
            hermes_packet = root / ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_041_hermes.json"
            kob_packet = root / ".ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_041_kob.json"
            self.assertTrue(hermes_packet.is_file())
            self.assertTrue(kob_packet.is_file())
            for path in (hermes_packet, kob_packet):
                packet = json.loads(path.read_text(encoding="utf-8"))
                self.assertEqual(packet["schema"], "ghostclaw.a2a2a.task.v1")
                self.assertFalse(packet["dangerous_actions_allowed"])
                self.assertFalse(packet["secret_access_allowed"])
                self.assertFalse(packet["paid_model_calls_allowed"])
                self.assertFalse(packet["payload"]["queue_payload_execution"])
                self.assertFalse(packet["payload"]["telegram_live_send"])

    def test_rejects_existing_worker_packet_to_avoid_overwrite(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(root / "gate.json", p003_gate())
            write_json(root / ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_041_hermes.json", {"exists": True})

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--gate",
                    "gate.json",
                    "--approval",
                    APPROVAL,
                    "--execute",
                ],
                check=False,
                text=True,
                capture_output=True,
            )
            self.assertEqual(result.returncode, 2)
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "blocked_missing_or_invalid_exact_gate")
            self.assertIn("worker_packet_already_exists:.ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_041_hermes.json", payload["issues"])


if __name__ == "__main__":
    unittest.main()
