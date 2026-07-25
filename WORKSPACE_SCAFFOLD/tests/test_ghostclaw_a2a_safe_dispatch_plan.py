import json
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "ghostclaw_a2a_safe_dispatch_plan.py"


def write_json(path: Path, payload: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def dry_run_payload():
    return {
        "schema": "ghostclaw.a2a2a.queue_coordination_run.v1",
        "status": "pass",
        "mode": "dry_run_reconcile_only",
        "dry_run": True,
        "workers_planned": ["hermes-local-role-worker", "kob-local-role-worker", "a2a-local-bus-watcher"],
        "packet_counts": {"total": 2, "would_dispatch": 1, "would_gate": 1, "observed": 0},
        "would_dispatch": [
            {
                "id": "packet_safe",
                "path": "_A2A_QUEUE/inbox/packet_safe.json",
                "title": "Safe local packet",
                "agent": "codex",
                "risk": "safe",
                "decision": "dispatch_to_local_workers",
                "blockers": [],
                "worker_packets": [
                    ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_safe_hermes.json",
                    ".ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_safe_kob.json",
                ],
            }
        ],
        "would_gate": [
            {
                "id": "packet_install",
                "path": "_A2A_QUEUE/outbox/packet_install.json",
                "title": "Install external repo",
                "agent": "codex",
                "risk": "safe",
                "decision": "gate_or_observe_only",
                "gate_lane": "external_repo_install",
                "required_gates": ["APPROVE_INSTALL_AGENT_BLACKBOX_QUARANTINE"],
                "blockers": ["install"],
            }
        ],
        "observed": [],
    }


def telegram_config(live_send=False):
    return {
        "$schema": "ghostclaw.hermes.telegram_gateway.config.v1",
        "config_id": "HERMES-TELEGRAM-GATEWAY-CONFIG-TEST",
        "status": "local_safe_config_ready",
        "mode": "dry_run_first",
        "approval_reference": "a019e53ee-d979-70d0-9951-fe7cc20887ecd",
        "gateway": {
            "defaultLiveSend": live_send,
            "webhook": {"enabled": False, "url": None},
            "polling": {"enabled": False},
        },
        "credentials": {"storeValuesInRepo": False, "printValues": False},
        "routing": {"queuePayloadExecution": False},
        "gates": {
            "liveSend": {"status": "closed", "requiredApproval": "APPROVE_TELEGRAM_GATEWAY_LIVE_SEND_A019E53EE"},
            "webhookActivation": {"status": "closed", "requiredApproval": "APPROVE_TELEGRAM_GATEWAY_WEBHOOK_ACTIVATION_A019E53EE"},
            "runtimeRestart": {"status": "closed", "requiredApproval": "APPROVE_HERMES_GATEWAY_RESTART_A019E53EE"},
        },
    }


class GhostclawA2ASafeDispatchPlanTest(unittest.TestCase):
    def test_builds_plan_from_dry_run_and_closed_telegram_config(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(root / "dry-run.json", dry_run_payload())
            write_json(root / "config.json", telegram_config())

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    "dry-run.json",
                    "--telegram-config",
                    "config.json",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            plan = json.loads(result.stdout)
            self.assertEqual(plan["status"], "ready_for_safe_local_review_not_live_dispatch")
            self.assertEqual(plan["summary"]["safe_local_dispatch_candidates"], 1)
            self.assertEqual(plan["summary"]["approval_gated_candidates"], 1)
            self.assertFalse(plan["blocked_actions_preserved"]["telegram_live_send"])
            self.assertEqual(plan["telegram_gateway"]["approval_reference"], "a019e53ee-d979-70d0-9951-fe7cc20887ecd")
            self.assertEqual(plan["planned_safe_local_dispatch"][0]["id"], "packet_safe")
            self.assertEqual(plan["approval_gate_queue"][0]["gate_lane"], "external_repo_install")

    def test_write_mode_creates_only_plan_and_receipt(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(root / "dry-run.json", dry_run_payload())
            write_json(root / "config.json", telegram_config())

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    "dry-run.json",
                    "--telegram-config",
                    "config.json",
                    "--output",
                    ".ghostclaw_runtime/a2a2a/evidence/P002.json",
                    "--receipt",
                    ".ghostclaw_runtime/a2a2a/receipts/P002.json",
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
            )
            plan = json.loads(result.stdout)
            self.assertTrue((root / ".ghostclaw_runtime/a2a2a/evidence/P002.json").is_file())
            self.assertTrue((root / ".ghostclaw_runtime/a2a2a/receipts/P002.json").is_file())
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox").exists())
            receipt = json.loads((root / ".ghostclaw_runtime/a2a2a/receipts/P002.json").read_text(encoding="utf-8"))
            self.assertEqual(receipt["status"], plan["status"])
            self.assertFalse(receipt["blocked_actions_preserved"]["write_worker_packets"])

    def test_rejects_live_telegram_send_config(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_json(root / "dry-run.json", dry_run_payload())
            write_json(root / "config.json", telegram_config(live_send=True))

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(root),
                    "--dry-run-report",
                    "dry-run.json",
                    "--telegram-config",
                    "config.json",
                ],
                check=False,
                text=True,
                capture_output=True,
            )
            self.assertEqual(result.returncode, 2)
            plan = json.loads(result.stdout)
            self.assertEqual(plan["status"], "blocked_invalid_telegram_gateway_config")
            self.assertIn("telegram_default_live_send_not_false", plan["telegram_gateway"]["issues"])


if __name__ == "__main__":
    unittest.main()
