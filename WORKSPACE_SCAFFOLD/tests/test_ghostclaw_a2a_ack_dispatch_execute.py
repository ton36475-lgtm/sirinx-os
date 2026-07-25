import json
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "ghostclaw_a2a_ack_dispatch_execute.py"
APPROVAL = "APPROVE_A2A2A_P114_PACKET074_LOCAL_ROLE_WORKER_ACK_ONLY"


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_ack_card(
    root: Path,
    targets: tuple[str, ...] = ("hermes", "kob"),
    sequence: str = "074",
    approval: str = APPROVAL,
) -> None:
    envelopes = {"hermes": [], "kob": []}
    for target in targets:
        packet_path = (
            root
            / ".ghostclaw_runtime"
            / "a2a2a"
            / "inbox"
            / target
            / f"queue_coord_packet_{sequence}_{target}_20260703T070716_717279Z.json"
        )
        write_json(
            packet_path,
            {
                "schema": "ghostclaw.a2a2a.task.v1",
                "id": f"p004_local_dispatch_packet_{sequence}_{target}",
                "mission": f"A2A2A_PACKET{sequence}_LOCAL_WORKER_ENVELOPE_WRITE_ONLY",
                "source": "codex-local-dispatch",
                "target": target,
                "requires_ack": True,
                "requires_receipt": True,
                "dangerous_actions_allowed": False,
                "secret_access_allowed": False,
                "paid_model_calls_allowed": False,
                "external_writes_allowed": False,
                "payload": {
                    "expected_behavior": "write local role receipt only",
                    "queue_payload_execution_allowed": False,
                },
            },
        )
        envelopes[target].append(str(packet_path.relative_to(root)))
    write_json(
        root / ".ghostclaw_runtime/a2a2a/status/role_worker_ack_action_card.json",
        {
            "schema": "ghostclaw.a2a2a.role_worker_ack_action_card.v1",
            "packet_id": f"A2A2A-ORCHESTRATOR-PACKET{sequence}-ROLE-WORKER-ACK-GATE-20260703",
            "status": "ready_for_exact_ack_gate",
            "selected_packet": f"packet_{sequence}",
            "selected_packet_path": f"_A2A_QUEUE/outbox/packet_{sequence}_sirinx_agm_active_focus_replenish.json",
            "selected_packet_sequence": sequence,
            "exact_gate_phrase": approval,
            "worker_state": {
                "envelopes": envelopes,
                "receipts": {"hermes": [], "kob": []},
                "outbox_records": {"hermes": [], "kob": []},
            },
            "issues": [],
            "external_actions_performed": {
                "role_worker_ack_write": False,
                "worker_loop_start": False,
                "queue_payload_execution": False,
                "telegram_live_send": False,
                "provider_call": False,
                "repo_or_customer_data_external_routing": False,
                "secret_read_or_print": False,
                "install": False,
                "commit": False,
                "push": False,
                "deploy": False,
                "cloudflare_or_r2_mutation": False,
            },
            "blocked_actions_preserved": {
                "cloudflare_or_r2_mutation": False,
                "commit": False,
                "deploy": False,
                "install": False,
                "key_printing": False,
                "paid_model_call": False,
                "provider_call": False,
                "push": False,
                "queue_payload_execution": False,
                "repo_or_customer_data_external_routing": False,
                "secret_read": False,
                "telegram_live_send": False,
                "worker_start_or_restart": False,
            },
        },
    )


class GhostClawA2AAckDispatchExecuteTest(unittest.TestCase):
    def test_without_exact_approval_blocks_and_writes_receipt_only(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_ack_card(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--write"],
                check=False,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(payload["status"], "blocked_missing_or_invalid_exact_ack_gate")
            self.assertIn("exact_ack_approval_not_present", payload["issues"])
            self.assertEqual(list((root / ".ghostclaw_runtime/a2a2a/receipts").glob("hermes_route_*.json")), [])
            self.assertTrue((root / ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P116-PACKET074-LOCAL-ROLE-WORKER-ACK-DISPATCH-20260703.json").is_file())
            self.assertTrue((root / ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P116-PACKET074-LOCAL-ROLE-WORKER-ACK-DISPATCH-20260703.json").is_file())

    def test_exact_approval_without_execute_does_not_write_ack_receipts(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_ack_card(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--approval", APPROVAL, "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ready_for_execute_flag_after_exact_ack_gate")
            self.assertEqual(payload["summary"]["planned_ack_worker_count"], 2)
            self.assertEqual(list((root / ".ghostclaw_runtime/a2a2a/receipts").glob("hermes_route_*.json")), [])

    def test_exact_approval_dry_run_does_not_write_ack_receipts(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_ack_card(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--approval", APPROVAL, "--dry-run"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "dry_run_ready_for_local_role_worker_ack_dispatch")
            self.assertTrue(payload["dry_run"])
            self.assertFalse(payload["execute_requested"])
            self.assertEqual(payload["summary"]["planned_ack_worker_count"], 2)
            self.assertEqual(list((root / ".ghostclaw_runtime/a2a2a/receipts").glob("hermes_route_*.json")), [])

    def test_rejects_dry_run_with_execute(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_ack_card(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--approval", APPROVAL, "--dry-run", "--execute"],
                check=False,
                text=True,
                capture_output=True,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("--dry-run cannot be combined with --execute", result.stderr)
            self.assertEqual(list((root / ".ghostclaw_runtime/a2a2a/receipts").glob("hermes_route_*.json")), [])

    def test_exact_approval_and_execute_writes_only_local_ack_receipts(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_ack_card(root)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--approval", APPROVAL, "--execute", "--write"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "local_role_worker_ack_dispatched")
            self.assertEqual(payload["summary"]["workers_started"], ["hermes", "kob"])
            self.assertEqual(
                sorted(payload["summary"]["ack_receipts_written"]),
                [
                    ".ghostclaw_runtime/a2a2a/receipts/hermes_route_p004_local_dispatch_packet_074_hermes.json",
                    ".ghostclaw_runtime/a2a2a/receipts/kob_verdict_p004_local_dispatch_packet_074_kob.json",
                ],
            )
            hermes = root / ".ghostclaw_runtime/a2a2a/receipts/hermes_route_p004_local_dispatch_packet_074_hermes.json"
            kob = root / ".ghostclaw_runtime/a2a2a/receipts/kob_verdict_p004_local_dispatch_packet_074_kob.json"
            self.assertEqual(json.loads(hermes.read_text(encoding="utf-8"))["status"], "routed_local_only")
            self.assertEqual(json.loads(kob.read_text(encoding="utf-8"))["status"], "kob_allow_local_ack_only")
            self.assertFalse(json.loads(hermes.read_text(encoding="utf-8"))["execution"]["payload_executed"])
            self.assertFalse(json.loads(kob.read_text(encoding="utf-8"))["execution"]["payload_executed"])

    def test_rejects_existing_ack_receipt_to_avoid_duplicate_execution(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_ack_card(root)
            write_json(
                root / ".ghostclaw_runtime/a2a2a/receipts/hermes_route_p004_local_dispatch_packet_074_hermes.json",
                {"status": "routed_local_only"},
            )

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--approval", APPROVAL, "--execute"],
                check=False,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(payload["status"], "blocked_missing_or_invalid_exact_ack_gate")
            self.assertIn("ack_receipt_already_exists:hermes", payload["issues"])

    def test_rejects_missing_kob_envelope(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_ack_card(root, targets=("hermes",))

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--approval", APPROVAL, "--execute"],
                check=False,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(result.returncode, 2)
            self.assertIn("missing_worker_envelope:kob", payload["issues"])

    def test_packet075_exact_approval_dry_run_is_supported(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            approval = "APPROVE_A2A2A_P127_PACKET075_LOCAL_ROLE_WORKER_ACK_ONLY"
            write_ack_card(root, sequence="075", approval=approval)

            result = subprocess.run(
                ["python3", str(SCRIPT), "--root", str(root), "--approval", approval, "--dry-run"],
                check=True,
                text=True,
                capture_output=True,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "dry_run_ready_for_local_role_worker_ack_dispatch")
            self.assertEqual(payload["packet_id"], "A2A2A-PACKET075-LOCAL-ROLE-WORKER-ACK-DISPATCH-20260703")
            self.assertEqual(payload["selected_packet_sequence"], "075")
            self.assertEqual(payload["required_approval"], approval)
            self.assertNotIn("selected_packet_sequence_not_074", payload["issues"])
            self.assertEqual(
                sorted(item["expected_receipt"] for item in payload["planned_ack_workers"]),
                [
                    ".ghostclaw_runtime/a2a2a/receipts/hermes_route_p004_local_dispatch_packet_075_hermes.json",
                    ".ghostclaw_runtime/a2a2a/receipts/kob_verdict_p004_local_dispatch_packet_075_kob.json",
                ],
            )
            self.assertEqual(list((root / ".ghostclaw_runtime/a2a2a/receipts").glob("hermes_route_*.json")), [])


if __name__ == "__main__":
    unittest.main()
