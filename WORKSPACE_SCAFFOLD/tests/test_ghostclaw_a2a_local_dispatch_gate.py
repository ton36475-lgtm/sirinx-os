import json
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "ghostclaw_a2a_local_dispatch_gate.py"
APPROVAL = "APPROVE_A2A2A_P003_LOCAL_WORKER_PACKET_DISPATCH_ONLY_A019E53EE"


def write_json(path: Path, payload: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def p002_plan(status="ready_for_safe_local_review_not_live_dispatch"):
    return {
        "schema": "ghostclaw.a2a2a.safe_dispatch_plan.v1",
        "packet_id": "A2A2A-P002-SAFE-LOCAL-DISPATCH-PLAN-20260703",
        "status": status,
        "mode": "safe_local_dispatch_plan_no_execution",
        "repo": "/tmp/example",
        "summary": {
            "safe_local_dispatch_candidates": 1,
            "approval_gated_candidates": 2,
            "workers_planned": ["hermes-local-role-worker", "kob-local-role-worker"],
            "workers_used": [],
        },
        "telegram_gateway": {
            "default_live_send": False,
            "webhook_enabled": False,
            "polling_enabled": False,
            "queue_payload_execution": False,
            "issues": [],
        },
        "planned_safe_local_dispatch": [
            {
                "id": "packet_041",
                "path": "_A2A_QUEUE/outbox/packet_041.json",
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
            "provider_call": False,
            "install": False,
            "push": False,
            "deploy": False,
            "secret_read": False,
            "env_value_read": False,
        },
    }


class GhostclawA2ALocalDispatchGateTest(unittest.TestCase):
    def test_without_exact_approval_writes_gate_request_only(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(root / "p002.json", p002_plan())

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--plan",
                    "p002.json",
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            gate = json.loads(result.stdout)
            self.assertEqual(gate["status"], "awaiting_exact_local_dispatch_gate")
            self.assertFalse(gate["approval_matches"])
            self.assertFalse(gate["blocked_actions_preserved"]["write_worker_packets"])
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox").exists())
            self.assertTrue((root / ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P003-LOCAL-WORKER-DISPATCH-GATE-20260703.json").is_file())
            self.assertTrue((root / ".ghostclaw_runtime/a2a2a/gates/A2A2A-P003-LOCAL-WORKER-DISPATCH-GATE-20260703.json").is_file())

    def test_exact_approval_marks_ready_but_still_does_not_dispatch(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(root / "p002.json", p002_plan())

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--plan",
                    "p002.json",
                    "--approval",
                    APPROVAL,
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            gate = json.loads(result.stdout)
            self.assertEqual(gate["status"], "exact_local_dispatch_gate_ready_for_separate_execute_command")
            self.assertTrue(gate["approval_matches"])
            self.assertEqual(gate["summary"]["safe_local_dispatch_candidates"], 1)
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox").exists())

    def test_invalid_p002_plan_blocks_gate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(root / "p002.json", p002_plan(status="not_ready"))

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--plan", "p002.json"],
                check=False,
                text=True,
                capture_output=True,
            )
            self.assertEqual(result.returncode, 2)
            gate = json.loads(result.stdout)
            self.assertEqual(gate["status"], "blocked_invalid_p002_plan")
            self.assertIn("plan_status_not_ready", gate["plan_issues"])


if __name__ == "__main__":
    unittest.main()
