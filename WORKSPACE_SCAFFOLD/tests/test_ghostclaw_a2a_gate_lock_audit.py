import json
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "ghostclaw_a2a_gate_lock_audit.py"
EXACT_GATE = "APPROVE_A2A2A_P123_PACKET075_LOCAL_WORKER_ENVELOPE_WRITE_ONLY"


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def blocked_actions() -> dict:
    return {
        "cloudflare_or_r2_mutation": False,
        "commit": False,
        "deploy": False,
        "install": False,
        "line_send": False,
        "paid_model_call": False,
        "provider_call": False,
        "push": False,
        "queue_payload_execution": False,
        "repo_or_customer_data_external_routing": False,
        "secret_read_or_print": False,
        "telegram_live_send": False,
        "worker_envelope_written": False,
        "worker_execution": False,
    }


def compatibility_gate() -> dict:
    return {
        "schema": "ghostclaw.a2a2a.local_dispatch_gate.v1",
        "packet_id": "A2A2A-P003-LOCAL-WORKER-DISPATCH-GATE-20260703",
        "status": "awaiting_exact_local_dispatch_gate",
        "required_approval": EXACT_GATE,
        "plan_issues": [],
        "summary": {
            "safe_local_dispatch_candidates": 1,
            "approval_gated_candidates": 0,
            "workers_planned": ["hermes-local-role-worker", "kob-local-role-worker"],
            "workers_used": [],
        },
        "dispatch_manifest": [
            {
                "queue_packet_id": "packet_075",
                "queue_packet_path": "_A2A_QUEUE/outbox/packet_075_sirinx.json",
                "title": "sirinx.co and AGM AutoFlow next local task card",
                "risk": "safe",
                "planned_worker_packets": [
                    ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_075_hermes.json",
                    ".ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_075_kob.json",
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


def seed_ready_gate_lock(root: Path, exact_gate: str = EXACT_GATE) -> None:
    gate_path = ".ghostclaw_runtime/a2a2a/gates/p123-compat.json"
    write_json(
        root / "_A2A_QUEUE/outbox/packet_075_sirinx.json",
        {
            "id": "packet_075",
            "title": "sirinx.co and AGM AutoFlow next local task card",
            "agent": "codex",
            "risk": "safe",
        },
    )
    write_json(root / gate_path, compatibility_gate())
    command_preview = {
        "safety_check_without_approval": f"python3 scripts/ghostclaw_a2a_local_dispatch_execute.py --gate {gate_path}",
        "dry_run_after_gate": (
            f"python3 scripts/ghostclaw_a2a_local_dispatch_execute.py --gate {gate_path} "
            f"--approval {exact_gate} --dry-run"
        ),
        "write_after_gate": (
            f"python3 scripts/ghostclaw_a2a_local_dispatch_execute.py --gate {gate_path} "
            f"--approval {exact_gate} --execute --write"
        ),
    }
    write_json(
        root / ".ghostclaw_runtime/a2a2a/status/current_next_gate.json",
        {
            "schema": "ghostclaw.a2a2a.current_next_gate.v1",
            "status": "ready_for_exact_gate",
            "active_focus": ["sirinx.co", "AGM AutoFlow"],
            "paused_focus": ["Kusala", "Phitsanulok News"],
            "next_exact_gate": exact_gate,
            "current_next_gate": {
                "exact_phrase": exact_gate,
                "status": "suggested_next_gate_not_executed",
                "allowed_scope": "write local Hermes/KOB worker-envelope JSON only",
                "blocked_scope": ["provider/model call", "push", "deploy"],
            },
            "current_orchestrator": {
                "status": "ready_active_packet_available",
                "selected_packet": "packet_075",
                "selected_packet_path": "_A2A_QUEUE/outbox/packet_075_sirinx.json",
                "planned_worker_packets": [
                    ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_075_hermes.json",
                    ".ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_075_kob.json",
                ],
            },
            "command_preview": command_preview,
            "blocked_actions_preserved": blocked_actions(),
            "external_actions_performed": blocked_actions(),
        },
    )
    write_json(
        root / ".ghostclaw_runtime/a2a2a/status/operator_action_card.json",
        {
            "schema": "ghostclaw.a2a2a.operator_action_card.v1",
            "status": "ready_for_exact_gate",
            "gate_readiness_status": "ready_for_exact_gate",
            "exact_gate_phrase": exact_gate,
            "selected_packet": "packet_075",
            "selected_packet_path": "_A2A_QUEUE/outbox/packet_075_sirinx.json",
            "preflight_command": command_preview["safety_check_without_approval"],
            "dry_run_command": command_preview["dry_run_after_gate"],
            "action_after_exact_gate": {
                "command": command_preview["write_after_gate"],
                "kind": "write_local_worker_envelopes_only",
            },
            "external_actions_performed": {
                "cloudflare_or_r2_mutation": False,
                "commit": False,
                "deploy": False,
                "install": False,
                "provider_call": False,
                "push": False,
                "queue_payload_execution": False,
                "repo_or_customer_data_external_routing": False,
                "secret_read_or_print": False,
                "telegram_live_send": False,
                "worker_envelope_write": False,
                "worker_execution": False,
            },
        },
    )


class GhostclawA2AGateLockAuditTest(unittest.TestCase):
    def test_gate_lock_audit_passes_without_dispatching(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            seed_ready_gate_lock(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root)],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "PASS_GATE_LOCK_HELD_READY_FOR_EXACT_GATE")
            self.assertEqual(payload["current_next_gate"], EXACT_GATE)
            self.assertEqual(payload["approval_less_executor_check"]["status"], "blocked_missing_or_invalid_exact_gate")
            self.assertIn("exact_approval_not_present", payload["approval_less_executor_check"]["issues"])
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox").exists())

    def test_write_creates_only_audit_artifacts(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            seed_ready_gate_lock(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "PASS_GATE_LOCK_HELD_READY_FOR_EXACT_GATE")
            self.assertTrue((root / ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P125-GATE-LOCK-AUDIT-CLI-20260703.json").is_file())
            self.assertTrue((root / ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P125-GATE-LOCK-AUDIT-CLI-20260703.json").is_file())
            self.assertTrue((root / ".ghostclaw_runtime/a2a2a/status/gate_lock_status.json").is_file())
            self.assertTrue((root / "reports/mission/A2A2A_P125_GATE_LOCK_AUDIT_CLI_20260703.md").is_file())
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/inbox").exists())

    def test_existing_worker_envelope_blocks_audit(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            seed_ready_gate_lock(root)
            write_json(root / ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_075_hermes.json", {"exists": True})

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root)],
                check=False,
                text=True,
                capture_output=True,
            )
            self.assertEqual(result.returncode, 2)
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "FAIL_GATE_LOCK_AUDIT_ISSUES")
            self.assertIn("worker_envelope_already_written_for_selected_packet", payload["issues"])

    def test_current_operator_exact_gate_mismatch_blocks_audit(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            seed_ready_gate_lock(root)
            operator_card = root / ".ghostclaw_runtime/a2a2a/status/operator_action_card.json"
            payload = json.loads(operator_card.read_text(encoding="utf-8"))
            payload["exact_gate_phrase"] = "APPROVE_A2A2A_WRONG_GATE"
            write_json(operator_card, payload)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root)],
                check=False,
                text=True,
                capture_output=True,
            )
            self.assertEqual(result.returncode, 2)
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "FAIL_GATE_LOCK_AUDIT_ISSUES")
            self.assertIn("current_operator_exact_gate_mismatch", payload["issues"])


if __name__ == "__main__":
    unittest.main()
