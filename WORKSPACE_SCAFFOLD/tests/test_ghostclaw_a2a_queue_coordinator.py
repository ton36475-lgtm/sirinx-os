import json
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "ghostclaw_a2a_queue_coordinator.py"


def write_json(path: Path, payload: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


class GhostclawA2AQueueCoordinatorTest(unittest.TestCase):
    def test_dispatches_safe_queue_packet_to_hermes_and_kob(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(
                root / "_A2A_QUEUE" / "inbox" / "packet_safe.json",
                {
                    "id": "packet_safe",
                    "title": "Safe local status packet",
                    "agent": "codex",
                    "risk": "safe",
                    "status": "inbox",
                    "approval_required": False,
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--write-receipt"],
                check=True,
                text=True,
                capture_output=True,
            )
            report = json.loads(result.stdout)
            self.assertEqual(report["status"], "pass")
            self.assertEqual(report["packet_counts"]["dispatched"], 1)
            worker_packets = report["dispatched"][0]["worker_packets"]
            self.assertEqual(len(worker_packets), 2)
            self.assertTrue((root / worker_packets[0]).is_file())
            self.assertTrue((root / worker_packets[1]).is_file())
            for rel_path in worker_packets:
                packet = json.loads((root / rel_path).read_text(encoding="utf-8"))
                self.assertEqual(packet["mission"], "a2a_queue_coordination")
                self.assertFalse(packet["dangerous_actions_allowed"])
                self.assertFalse(packet["secret_access_allowed"])
                self.assertFalse(packet["paid_model_calls_allowed"])
            self.assertTrue((root / report["receipt"]).is_file())

    def test_gates_mcp_auth_and_external_repo_install_lanes(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(
                root / "_A2A_QUEUE" / "inbox" / "packet_mcp.json",
                {
                    "id": "packet_mcp",
                    "title": "Refresh Linear Notion Figma MCP auth",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": True,
                },
            )
            write_json(
                root / "_A2A_QUEUE" / "outbox" / "packet_install.json",
                {
                    "id": "packet_install",
                    "title": "Install external repo Agent-Blackbox",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": True,
                    "install": True,
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--write-receipt"],
                check=True,
                text=True,
                capture_output=True,
            )
            report = json.loads(result.stdout)
            lanes = {item["gate_lane"]: item for item in report["gated"]}
            self.assertIn("mcp_auth_refresh", lanes)
            self.assertIn("external_repo_install", lanes)
            self.assertIn("APPROVE_MCP_AUTH_REFRESH_LINEAR", lanes["mcp_auth_refresh"]["required_gates"])
            self.assertIn("APPROVE_INSTALL_AGENT_BLACKBOX_QUARANTINE", lanes["external_repo_install"]["required_gates"])
            for item in report["gated"]:
                record = json.loads((root / item["gate_record"]).read_text(encoding="utf-8"))
                self.assertFalse(record["executed"])
                self.assertFalse(record["mcp_auth_refreshed"])
                self.assertFalse(record["external_repo_installed"])
                self.assertFalse(record["secret_read"])

    def test_false_mcp_execution_flag_does_not_force_mcp_auth_gate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(
                root / "_A2A_QUEUE" / "outbox" / "packet_opus_request.json",
                {
                    "id": "packet_opus_request",
                    "title": "GhostClaw LANE_1 Opus final architecture packet authoring request",
                    "agent": "codex",
                    "risk": "safe",
                    "status": "outbox",
                    "approval_required": False,
                    "real_mcp_execution": False,
                    "runtime_queue_execution": False,
                    "provider_call": False,
                    "deploy": False,
                    "push": False,
                    "secret_read": False,
                    "notes": "Local authoring request only; not a provider call, not runtime queue execution, and not approval for external actions.",
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--write-receipt"],
                check=True,
                text=True,
                capture_output=True,
            )
            report = json.loads(result.stdout)
            self.assertEqual(report["packet_counts"]["dispatched"], 1)
            self.assertEqual(report["packet_counts"]["gated"], 0)
            self.assertEqual(report["dispatched"][0]["id"], "packet_opus_request")
            self.assertIsNone(report["dispatched"][0]["gate_lane"])
            self.assertEqual(report["dispatched"][0]["blockers"], [])

    def test_dry_run_reconciles_without_writing_runtime_artifacts(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(
                root / "_A2A_QUEUE" / "inbox" / "packet_safe.json",
                {
                    "id": "packet_safe",
                    "title": "Safe local status packet",
                    "agent": "codex",
                    "risk": "safe",
                    "status": "inbox",
                    "approval_required": False,
                },
            )
            write_json(
                root / "_A2A_QUEUE" / "outbox" / "packet_install.json",
                {
                    "id": "packet_install",
                    "title": "Install external repo Agent-Blackbox",
                    "agent": "codex",
                    "risk": "safe",
                    "approval_required": True,
                    "install": True,
                },
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--dry-run"],
                check=True,
                text=True,
                capture_output=True,
            )
            report = json.loads(result.stdout)
            self.assertTrue(report["dry_run"])
            self.assertEqual(report["mode"], "dry_run_reconcile_only")
            self.assertEqual(report["packet_counts"]["dispatched"], 0)
            self.assertEqual(report["packet_counts"]["gated"], 0)
            self.assertEqual(report["packet_counts"]["would_dispatch"], 1)
            self.assertEqual(report["packet_counts"]["would_gate"], 1)
            self.assertFalse((root / ".ghostclaw_runtime").exists())
            self.assertFalse(report["blocked_actions_preserved"]["queue_file_mutation"])
            self.assertFalse(report["blocked_actions_preserved"]["secret_read"])

    def test_dry_run_rejects_write_receipt_flag(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--dry-run", "--write-receipt"],
                check=False,
                text=True,
                capture_output=True,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("cannot be combined", result.stderr)


if __name__ == "__main__":
    unittest.main()
