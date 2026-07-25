"""Local-only A2A autopilot guardrails."""
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "run_a2a_local_autopilot.py"
STATUS_JSON = ROOT / "data" / "pathspecs" / "sirinx_a2a_local_autopilot_status_2026-06-29.json"
REPORT_JSON = ROOT / "WORKSPACE_SCAFFOLD" / "reports" / "a2a_local_autopilot_status_latest_2026-06-29.json"
STATUS_DOC = ROOT / "docs" / "knowledge" / "SIRINX_A2A_LOCAL_AUTOPILOT_STATUS_2026-06-29.md"


def load_autopilot_module():
    spec = importlib.util.spec_from_file_location("a2a_local_autopilot", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class A2ALocalAutopilotTests(unittest.TestCase):
    """Ensure automatic A2A use stays local, bounded, and non-executing."""

    def load_status(self):
        self.assertTrue(STATUS_JSON.exists(), f"Missing autopilot status JSON: {STATUS_JSON}")
        return json.loads(STATUS_JSON.read_text(encoding="utf-8"))

    def test_autopilot_artifacts_exist(self):
        self.assertTrue(SCRIPT.exists(), f"Missing autopilot script: {SCRIPT}")
        self.assertTrue(STATUS_JSON.exists(), f"Missing autopilot status JSON: {STATUS_JSON}")
        self.assertTrue(REPORT_JSON.exists(), f"Missing autopilot report JSON: {REPORT_JSON}")
        self.assertTrue(STATUS_DOC.exists(), f"Missing autopilot doc: {STATUS_DOC}")

    def test_status_enables_local_auto_without_risky_permissions(self):
        status = self.load_status()

        self.assertEqual(status["schema"], "sirinx.a2a.local_autopilot_status.v1")
        self.assertEqual(status["status"], "local_autopilot_ready")
        self.assertEqual(status["execution_mode"], "safe_local_autopilot")
        self.assertEqual(status["queue_root"], "_A2A_QUEUE")
        self.assertTrue(status["autonomous_local_coordination"])
        self.assertFalse(status["runtime_queue_execution"])
        self.assertFalse(status["queue_file_mutation"])
        self.assertFalse(status["provider_call"])
        self.assertFalse(status["deploy"])
        self.assertFalse(status["push"])
        self.assertFalse(status["cloud_mutation"])
        self.assertFalse(status["customer_send"])
        self.assertFalse(status["telegram_live_send"])
        self.assertFalse(status["secret_read"])
        self.assertFalse(status["paid_provider_call"])
        self.assertFalse(status["install"])
        self.assertFalse(status["migration"])
        self.assertFalse(status["merge_script_execution"])
        self.assertFalse(status["license_file_mutation"])
        self.assertEqual(status["current_actionable_packet"], "packet_013")
        self.assertGreaterEqual(status["packet_counts"]["inbox"], 5)
        self.assertGreaterEqual(status["packet_counts"]["outbox"], 14)
        self.assertGreaterEqual(status["packet_counts"]["working"], 1)
        self.assertGreaterEqual(status["packet_counts"]["done"], 8)
        self.assertEqual(status["packet_counts"]["blocked"], 0)
        self.assertEqual(
            status["packet_counts"]["total"],
            sum(status["packet_counts"][k] for k in ("inbox", "outbox", "working", "done", "blocked")),
        )

    def test_packet_024_is_auto_acknowledgeable_but_not_runtime_executed(self):
        status = self.load_status()
        packet = next(item for item in status["autopilot_packets"] if item["id"] == "packet_024_sirinx_hermes_a2a_codex_sync_all_jobs")

        self.assertEqual(packet["folder"], "inbox")
        self.assertEqual(packet["autopilot_decision"], "auto_acknowledge_local_only")
        self.assertEqual(packet["reason"], "safe packet without approval requirement or risky flags")
        self.assertIn("read_packet", packet["allowed_operations"])
        self.assertIn("write_local_report", packet["allowed_operations"])
        self.assertNotIn("execute_runtime_queue", packet["allowed_operations"])
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["deploy"])
        self.assertFalse(packet["push"])
        self.assertFalse(packet["secret_read"])

    def test_packet_013_stays_blocked_until_hermes_decision(self):
        status = self.load_status()
        packet = next(item for item in status["autopilot_packets"] if item["id"] == "packet_013")

        self.assertEqual(packet["folder"], "inbox")
        self.assertEqual(packet["autopilot_decision"], "blocked_requires_gate_specific_approval")
        self.assertIn("approval_required", packet["blockers"])
        self.assertIn("hermes_decision_missing", packet["blockers"])
        self.assertNotIn("execute_runtime_queue", packet["allowed_operations"])

    def test_builder_classifies_synthetic_queue_without_moving_files(self):
        module = load_autopilot_module()
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            queue_root = tmp_path / "_A2A_QUEUE"
            for folder in ("inbox", "outbox", "working", "done", "blocked"):
                (queue_root / folder).mkdir(parents=True)
            safe_packet = queue_root / "inbox" / "packet_900_safe.json"
            safe_packet.write_text(
                json.dumps(
                    {
                        "id": "packet_900",
                        "title": "Synthetic safe packet",
                        "agent": "codex",
                        "status": "inbox",
                        "risk": "safe",
                        "approval_required": False,
                        "runtime_queue_execution": False,
                    }
                ),
                encoding="utf-8",
            )
            risky_packet = queue_root / "inbox" / "packet_901_risky.json"
            risky_packet.write_text(
                json.dumps(
                    {
                        "id": "packet_901",
                        "title": "Synthetic risky packet",
                        "agent": "codex",
                        "status": "inbox",
                        "risk": "safe",
                        "approval_required": False,
                        "deploy": True,
                    }
                ),
                encoding="utf-8",
            )

            snapshot = module.build_autopilot_status(queue_root=queue_root, root=tmp_path)

            self.assertTrue(safe_packet.exists(), "Autopilot must not move inbox packets")
            self.assertTrue(risky_packet.exists(), "Autopilot must not move risky packets")

        decisions = {item["id"]: item for item in snapshot["autopilot_packets"]}
        self.assertEqual(decisions["packet_900"]["autopilot_decision"], "auto_acknowledge_local_only")
        self.assertEqual(decisions["packet_901"]["autopilot_decision"], "blocked_risky_flags")
        self.assertIn("deploy", decisions["packet_901"]["blockers"])
        self.assertFalse(snapshot["queue_file_mutation"])
        self.assertFalse(snapshot["runtime_queue_execution"])

    def test_cli_writes_output_and_fails_closed_for_missing_queue(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            missing_queue = tmp_path / "_A2A_QUEUE"
            output = tmp_path / "autopilot.json"
            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "--queue-root",
                    str(missing_queue),
                    "--output",
                    str(output),
                ],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )

        self.assertEqual(result.returncode, 2)
        self.assertIn("missing_queue_root", result.stdout)
        self.assertIn('"runtime_queue_execution": false', result.stdout)
        self.assertIn('"deploy": false', result.stdout)
        self.assertFalse(output.exists(), "Missing queue failure must not write an output report")

    def test_markdown_states_autopilot_boundaries(self):
        text = STATUS_DOC.read_text(encoding="utf-8")
        required = [
            "A2A_LOCAL_AUTOPILOT_READY",
            "execution_mode=safe_local_autopilot",
            "autonomous_local_coordination=true",
            "queue_file_mutation=false",
            "runtime_queue_execution=false",
            "packet_024_sirinx_hermes_a2a_codex_sync_all_jobs=auto_acknowledge_local_only",
            "packet_013=blocked_requires_gate_specific_approval",
            "No deploy, push, cloud mutation, customer send, Telegram live send, secret read, provider/model/paid call, Hermes runtime queue execution, install, migration, merge script, or license-file mutation is authorized.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
