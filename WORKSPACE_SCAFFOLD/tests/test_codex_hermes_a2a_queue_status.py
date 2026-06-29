"""Codex/Hermes A2A file-bus queue status guardrails."""
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "build_codex_hermes_a2a_queue_status.py"
STATUS_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_a2a_queue_status_2026-06-29.json"
STATUS_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_A2A_QUEUE_STATUS_2026-06-29.md"
REPORT_JSON = ROOT / "WORKSPACE_SCAFFOLD" / "reports" / "codex_hermes_a2a_queue_status_latest_2026-06-29.json"
EXECUTION_QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
ACTIVE_INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
CONTEXT_REGISTRY_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_context_packet_registry_2026-06-29.json"
MANIFEST_JSON = ROOT / "WORKSPACE_SCAFFOLD" / "manifests" / "active_goal_local_evidence_durability_2026-06-29.json"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
HERMES_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"


def load_status_module():
    spec = importlib.util.spec_from_file_location("codex_hermes_a2a_queue_status", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CodexHermesA2AQueueStatusTests(unittest.TestCase):
    """Ensure the local A2A queue can be indexed without executing or widening gates."""

    def load_status(self):
        self.assertTrue(STATUS_JSON.exists(), f"Missing queue status JSON: {STATUS_JSON}")
        return json.loads(STATUS_JSON.read_text(encoding="utf-8"))

    def test_status_artifacts_exist_without_final_lane1_decision(self):
        self.assertTrue(SCRIPT.exists(), f"Missing queue status builder: {SCRIPT}")
        self.assertTrue(STATUS_JSON.exists(), f"Missing queue status JSON: {STATUS_JSON}")
        self.assertTrue(STATUS_DOC.exists(), f"Missing queue status doc: {STATUS_DOC}")
        self.assertTrue(REPORT_JSON.exists(), f"Missing latest queue status report: {REPORT_JSON}")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 packet exists unexpectedly")
        self.assertFalse(HERMES_DECISION.exists(), "Hermes decision exists unexpectedly")

    def test_status_preserves_local_only_non_execution_boundary(self):
        status = self.load_status()

        self.assertEqual(status["schema"], "sirinx.codex_hermes.a2a_queue_status.v1")
        self.assertEqual(status["status"], "local_queue_indexed_not_executed")
        self.assertEqual(status["evidence_boundary"], "local_file_bus_only")
        self.assertTrue(status["local_read_only"])
        self.assertFalse(status["claims_goal_complete"])
        self.assertFalse(status["claims_all_chats_read"])
        self.assertFalse(status["runtime_queue_execution"])
        self.assertFalse(status["lane2_authorized"])
        self.assertFalse(status["hermes_decision_recorded"])
        self.assertEqual(status["current_actionable_packet"], "packet_013")
        self.assertEqual(status["current_actionable_packet_folder"], "inbox")

        for action in (
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "paid_provider_call",
            "runtime_queue_execution",
            "telegram_live_send",
            "external_message_send",
            "merge_script_execution",
            "install",
            "migration",
        ):
            self.assertFalse(status["blocked_actions"][action], f"{action} should remain false")

    def test_status_counts_current_local_queue_packets(self):
        status = self.load_status()

        self.assertEqual(
            status["packet_counts"],
            {
                "inbox": 4,
                "outbox": 11,
                "working": 1,
                "done": 8,
                "blocked": 0,
                "total": 24,
            },
        )
        packet_013 = next(packet for packet in status["packets"] if packet["id"] == "packet_013")
        self.assertEqual(packet_013["folder"], "inbox")
        self.assertEqual(packet_013["agent"], "hermes")
        self.assertEqual(packet_013["status"], "inbox")
        self.assertEqual(packet_013["risk"], "safe")
        self.assertFalse(packet_013["runtime_queue_execution"])
        self.assertFalse(packet_013["provider_call"])
        self.assertFalse(packet_013["deploy"])
        self.assertFalse(packet_013["push"])
        self.assertFalse(packet_013["lane2_authorized"])
        self.assertFalse(packet_013["decision_record"])

        packet_016 = next(packet for packet in status["packets"] if packet["id"] == "packet_016")
        self.assertEqual(packet_016["folder"], "outbox")
        self.assertEqual(packet_016["agent"], "codex")
        self.assertEqual(packet_016["status"], "outbox")
        self.assertEqual(packet_016["risk"], "safe")
        self.assertFalse(packet_016["runtime_queue_execution"])
        self.assertFalse(packet_016["provider_call"])
        self.assertFalse(packet_016["decision_record"])
        self.assertFalse(packet_016["lane2_authorized"])

        packet_017 = next(packet for packet in status["packets"] if packet["id"] == "packet_017")
        self.assertEqual(packet_017["folder"], "outbox")
        self.assertEqual(packet_017["agent"], "codex")
        self.assertEqual(packet_017["status"], "outbox")
        self.assertEqual(packet_017["risk"], "safe")
        self.assertFalse(packet_017["runtime_queue_execution"])
        self.assertFalse(packet_017["provider_call"])
        self.assertFalse(packet_017["decision_record"])
        self.assertFalse(packet_017["lane2_authorized"])

        packet_021 = next(packet for packet in status["packets"] if packet["id"] == "packet_021")
        self.assertEqual(packet_021["folder"], "outbox")
        self.assertEqual(packet_021["agent"], "codex")
        self.assertEqual(packet_021["status"], "outbox")
        self.assertEqual(packet_021["risk"], "safe")
        self.assertFalse(packet_021["runtime_queue_execution"])
        self.assertFalse(packet_021["provider_call"])
        self.assertFalse(packet_021["decision_record"])
        self.assertFalse(packet_021["lane2_authorized"])

        packet_022 = next(packet for packet in status["packets"] if packet["id"] == "packet_022")
        self.assertEqual(packet_022["folder"], "outbox")
        self.assertEqual(packet_022["agent"], "codex")
        self.assertEqual(packet_022["status"], "outbox")
        self.assertEqual(packet_022["risk"], "safe")
        self.assertFalse(packet_022["runtime_queue_execution"])
        self.assertFalse(packet_022["provider_call"])
        self.assertFalse(packet_022["decision_record"])
        self.assertFalse(packet_022["state_mutation"])
        self.assertFalse(packet_022["lane2_authorized"])

        packet_023 = next(packet for packet in status["packets"] if packet["id"] == "packet_023")
        self.assertEqual(packet_023["folder"], "outbox")
        self.assertEqual(packet_023["agent"], "codex")
        self.assertEqual(packet_023["status"], "outbox")
        self.assertEqual(packet_023["risk"], "safe")
        self.assertFalse(packet_023["runtime_queue_execution"])
        self.assertFalse(packet_023["provider_call"])
        self.assertFalse(packet_023["decision_record"])
        self.assertFalse(packet_023["state_mutation"])
        self.assertFalse(packet_023["lane2_authorized"])

        packet_018 = next(packet for packet in status["packets"] if packet["id"] == "packet_018")
        self.assertEqual(packet_018["folder"], "outbox")
        self.assertEqual(packet_018["agent"], "codex")
        self.assertEqual(packet_018["status"], "outbox")
        self.assertEqual(packet_018["risk"], "safe")
        self.assertFalse(packet_018["runtime_queue_execution"])
        self.assertFalse(packet_018["provider_call"])
        self.assertFalse(packet_018["decision_record"])
        self.assertFalse(packet_018["final_packet_record"])
        self.assertFalse(packet_018["lane2_authorized"])

        packet_019 = next(packet for packet in status["packets"] if packet["id"] == "packet_019")
        self.assertEqual(packet_019["folder"], "outbox")
        self.assertEqual(packet_019["agent"], "codex")
        self.assertEqual(packet_019["status"], "outbox")
        self.assertEqual(packet_019["risk"], "safe")
        self.assertFalse(packet_019["runtime_queue_execution"])
        self.assertFalse(packet_019["provider_call"])
        self.assertFalse(packet_019["decision_record"])
        self.assertFalse(packet_019["final_packet_record"])
        self.assertFalse(packet_019["lane2_authorized"])

    def test_builder_indexes_synthetic_queue_without_executing(self):
        module = load_status_module()
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            queue_root = tmp_path / "_A2A_QUEUE"
            for folder in ("inbox", "outbox", "working", "done", "blocked"):
                (queue_root / folder).mkdir(parents=True)
            (queue_root / "inbox" / "packet_900_test.json").write_text(
                json.dumps(
                    {
                        "id": "packet_900",
                        "title": "Synthetic test packet",
                        "agent": "codex",
                        "status": "inbox",
                        "risk": "safe",
                        "runtime_queue_execution": False,
                        "deploy": False,
                    }
                ),
                encoding="utf-8",
            )
            (queue_root / "outbox" / "packet_901_report.json").write_text(
                json.dumps({"id": "packet_901", "title": "Synthetic report", "agent": "hermes"}),
                encoding="utf-8",
            )

            snapshot = module.build_queue_status(queue_root=queue_root, root=tmp_path)

        self.assertEqual(snapshot["packet_counts"]["inbox"], 1)
        self.assertEqual(snapshot["packet_counts"]["outbox"], 1)
        self.assertEqual(snapshot["packet_counts"]["total"], 2)
        self.assertFalse(snapshot["runtime_queue_execution"])
        self.assertFalse(snapshot["blocked_actions"]["deploy"])
        self.assertEqual([packet["id"] for packet in snapshot["packets"]], ["packet_900", "packet_901"])
        self.assertEqual(snapshot["packets"][0]["path"], "_A2A_QUEUE/inbox/packet_900_test.json")

    def test_cli_writes_report_and_fails_closed_for_missing_queue(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            missing_queue = tmp_path / "_A2A_QUEUE"
            output = tmp_path / "queue-status.json"
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
        self.assertIn('"paid_provider_call": false', result.stdout)

    def test_status_is_linked_from_queue_index_registry_manifest_and_mission_control(self):
        rel_json = str(STATUS_JSON.relative_to(ROOT))
        rel_doc = str(STATUS_DOC.relative_to(ROOT))
        rel_report = str(REPORT_JSON.relative_to(ROOT))
        rel_script = str(SCRIPT.relative_to(ROOT))

        active_index = json.loads(ACTIVE_INDEX_JSON.read_text(encoding="utf-8"))
        execution_queue = json.loads(EXECUTION_QUEUE_JSON.read_text(encoding="utf-8"))
        registry = json.loads(CONTEXT_REGISTRY_JSON.read_text(encoding="utf-8"))
        manifest = json.loads(MANIFEST_JSON.read_text(encoding="utf-8"))

        self.assertIn(rel_json, active_index["source_files"])
        stream = next(item for item in active_index["workstreams"] if item["id"] == "codex_hermes_a2a_queue_status")
        self.assertEqual(stream["status"], "local_queue_indexed_not_executed")
        self.assertIn(rel_json, stream["evidence"])
        self.assertIn(rel_doc, stream["evidence"])
        self.assertIn(rel_report, stream["evidence"])

        self.assertIn(rel_json, execution_queue["source_indexes"])
        queue_item = next(item for item in execution_queue["items"] if item["id"] == "CODEX-HERMES-A2A-QUEUE-STATUS")
        self.assertEqual(queue_item["status"], "local_queue_indexed_not_executed")
        self.assertIn(rel_script, queue_item["evidence"])
        self.assertIn(rel_json, queue_item["evidence"])
        self.assertIn(rel_report, queue_item["evidence"])
        self.assertIn("runtime_queue_execution", queue_item["forbidden_actions"])

        packet = next(item for item in registry["context_packets"] if item["id"] == "ctx-codex-hermes-a2a-queue-status")
        self.assertEqual(packet["source"], rel_json)
        self.assertEqual(packet["permission"], "local_read_only")
        self.assertEqual(packet["status"], "local_queue_indexed_not_executed")

        manifest_paths = {entry["path"] for entry in manifest["ignored_pathspecs"]}
        self.assertIn(rel_json, manifest_paths)
        self.assertIn(rel_json, MISSION_CONTROL.read_text(encoding="utf-8"))
        self.assertIn(rel_doc, MISSION_CONTROL.read_text(encoding="utf-8"))

    def test_markdown_status_states_non_actions(self):
        text = STATUS_DOC.read_text(encoding="utf-8")
        required = [
            "CODEX_HERMES_A2A_QUEUE_STATUS_LOCAL_ONLY",
            "local_queue_indexed_not_executed",
            "evidence_boundary=local_file_bus_only",
            "current_actionable_packet=packet_013",
            "packet_counts: inbox=4 outbox=11 working=1 done=8 blocked=0 total=24",
            "_A2A_QUEUE/outbox/packet_016_ghostclaw_lane1_hermes_decision_intake_handoff.json",
            "_A2A_QUEUE/outbox/packet_017_ghostclaw_lane1_hermes_decision_preflight_audit.json",
            "_A2A_QUEUE/outbox/packet_018_ghostclaw_lane1_opus_architecture_packet_gate.json",
            "_A2A_QUEUE/outbox/packet_019_ghostclaw_lane1_opus_authoring_bundle.json",
            "_A2A_QUEUE/outbox/packet_021_sirinx_a2a_adaptive_sync_control_status.json",
            "_A2A_QUEUE/outbox/packet_022_sirinx_a2a_next_safe_action_sequencer.json",
            "_A2A_QUEUE/outbox/packet_023_sirinx_hermes_gateway_current_recheck.json",
            "runtime_queue_execution=false",
            "hermes_decision_recorded=false",
            "lane2_authorized=false",
            "No queue item was executed.",
            "No deploy, push, cloud mutation, customer send, secret read, paid/provider call, runtime queue execution, Telegram live send, external message send, merge script, install, or migration is authorized.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
