"""GhostClaw LANE_1 Hermes decision transition guardrails."""
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "build_lane1_hermes_decision_transition_guard.py"
GUARD_JSON = ROOT / "data" / "pathspecs" / "ghostclaw_lane1_hermes_decision_transition_guard_2026-06-29.json"
GUARD_DOC = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_TRANSITION_GUARD_2026-06-29.md"
FINAL_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
VALIDATOR = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "validate_lane1_hermes_decision.py"
QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
REGISTRY_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_context_packet_registry_2026-06-29.json"
MANIFEST_JSON = ROOT / "WORKSPACE_SCAFFOLD" / "manifests" / "active_goal_local_evidence_durability_2026-06-29.json"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"


def load_guard_module():
    spec = importlib.util.spec_from_file_location("lane1_decision_transition_guard", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def synthetic_decision(decision: str, recorder_gate_open: bool) -> str:
    return f"""
HERMES_REVIEW_DECISION_RECORD
decision={decision}
decision_record=true
codex_recorder_gate_open={"true" if recorder_gate_open else "false"}
lane2_authorized=false
approval_scope=local_decision_only
reviewed_evidence_paths=data/pathspecs/ghostclaw_lane1_packet013_decision_workbench_2026-06-29.json,docs/knowledge/SIRINX_GHOSTCLAW_LANE1_PACKET013_DECISION_WORKBENCH_2026-06-29.md,_A2A_QUEUE/inbox/packet_013_ghostclaw_lane1_codex_recorder_gate_request.json
deploy=false
push=false
cloud_mutation=false
customer_send=false
secret_read=false
paid_provider_call=false
runtime_queue_execution=false
merge_script_execution=false
install=false
migration=false
"""


class Lane1HermesDecisionTransitionGuardTests(unittest.TestCase):
    """Ensure future Hermes decisions can be mapped to local transitions without applying them."""

    def load_guard(self):
        self.assertTrue(GUARD_JSON.exists(), f"Missing transition guard JSON: {GUARD_JSON}")
        return json.loads(GUARD_JSON.read_text(encoding="utf-8"))

    def test_guard_artifacts_exist_without_final_decision_or_packet(self):
        self.assertTrue(SCRIPT.exists(), f"Missing transition guard builder: {SCRIPT}")
        self.assertTrue(GUARD_JSON.exists(), f"Missing transition guard JSON: {GUARD_JSON}")
        self.assertTrue(GUARD_DOC.exists(), f"Missing transition guard doc: {GUARD_DOC}")
        self.assertTrue(FINAL_DECISION.exists(), "Hermes decision file should exist after route_to_opus decision")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 Opus architecture packet exists unexpectedly")

    def test_guard_maps_recorded_route_to_opus_decision_without_opening_lane2(self):
        guard = self.load_guard()

        self.assertEqual(guard["schema"], "ghostclaw.lane1.hermes_decision_transition_guard.v1")
        self.assertEqual(guard["status"], "validated_decision_transition_ready")
        self.assertEqual(guard["current_actionable_packet"], "packet_013")
        self.assertTrue(guard["decision_record"])
        self.assertEqual(guard["validated_decision"], "route_to_opus")
        self.assertTrue(guard["transition_allowed"])
        self.assertFalse(guard["codex_recorder_gate_open"])
        self.assertFalse(guard["lane2_authorized"])
        self.assertEqual(guard["next_transition"], "await_opus_architecture_packet")
        self.assertIn(str(VALIDATOR.relative_to(ROOT)), guard["validator"])
        self.assertIn(str(FINAL_DECISION.relative_to(ROOT)), guard["decision_path"])
        self.assertIn("_A2A_QUEUE/inbox/packet_013_ghostclaw_lane1_codex_recorder_gate_request.json", guard["evidence_paths"])

        for action in (
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "paid_provider_call",
            "provider_call",
            "runtime_queue_execution",
            "telegram_live_send",
            "external_message_send",
            "merge_script_execution",
            "install",
            "migration",
        ):
            self.assertFalse(guard["blocked_actions"][action], f"{action} should remain false")

    def test_builder_maps_valid_synthetic_decisions_without_authorizing_lane2(self):
        module = load_guard_module()
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            route_decision = tmp_path / "route.md"
            recorder_decision = tmp_path / "recorder.md"
            route_decision.write_text(synthetic_decision("route_to_opus", False), encoding="utf-8")
            recorder_decision.write_text(synthetic_decision("open_codex_recorder_gate", True), encoding="utf-8")

            route_guard = module.build_transition_guard(route_decision)
            recorder_guard = module.build_transition_guard(recorder_decision)

        self.assertEqual(route_guard["status"], "validated_decision_transition_ready")
        self.assertEqual(route_guard["validated_decision"], "route_to_opus")
        self.assertEqual(route_guard["next_transition"], "await_opus_architecture_packet")
        self.assertFalse(route_guard["codex_recorder_gate_open"])
        self.assertFalse(route_guard["lane2_authorized"])
        self.assertFalse(route_guard["blocked_actions"]["provider_call"])

        self.assertEqual(recorder_guard["status"], "validated_decision_transition_ready")
        self.assertEqual(recorder_guard["validated_decision"], "open_codex_recorder_gate")
        self.assertEqual(recorder_guard["next_transition"], "codex_recorder_draft_allowed_local_docs_only")
        self.assertTrue(recorder_guard["codex_recorder_gate_open"])
        self.assertFalse(recorder_guard["lane2_authorized"])
        self.assertFalse(recorder_guard["blocked_actions"]["runtime_queue_execution"])

    def test_cli_missing_decision_writes_blocked_guard(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            output = tmp_path / "transition-guard.json"
            markdown_output = tmp_path / "transition-guard.md"
            missing_decision = tmp_path / "missing-decision.md"
            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "--decision",
                    str(missing_decision),
                    "--json-output",
                    str(output),
                    "--markdown-output",
                    str(markdown_output),
                ],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(result.returncode, 2)
            self.assertTrue(output.exists(), "CLI should write blocked guard output")
            written = json.loads(output.read_text(encoding="utf-8"))

        self.assertEqual(written["status"], "blocked_missing_hermes_decision")
        self.assertFalse(written["transition_allowed"])

    def test_guard_is_linked_from_index_queue_registry_manifest_and_mission_control(self):
        rel_json = str(GUARD_JSON.relative_to(ROOT))
        rel_doc = str(GUARD_DOC.relative_to(ROOT))
        rel_script = str(SCRIPT.relative_to(ROOT))

        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        queue = json.loads(QUEUE_JSON.read_text(encoding="utf-8"))
        registry = json.loads(REGISTRY_JSON.read_text(encoding="utf-8"))
        manifest = json.loads(MANIFEST_JSON.read_text(encoding="utf-8"))

        self.assertIn(rel_json, index["source_files"])
        stream = next(item for item in index["workstreams"] if item["id"] == "ghostclaw_lane1_hermes_decision_transition_guard")
        self.assertEqual(stream["status"], "validated_decision_transition_ready")
        self.assertIn(rel_json, stream["evidence"])
        self.assertIn(rel_doc, stream["evidence"])

        self.assertIn(rel_json, queue["source_indexes"])
        queue_item = next(item for item in queue["items"] if item["id"] == "LANE1-HERMES-DECISION-TRANSITION-GUARD")
        self.assertEqual(queue_item["status"], "validated_decision_transition_ready")
        self.assertEqual(queue_item["gate"], "await_opus_architecture_packet")
        self.assertIn(rel_script, queue_item["evidence"])
        self.assertIn(rel_json, queue_item["evidence"])
        self.assertIn(str(FINAL_DECISION.relative_to(ROOT)), queue_item["evidence"])
        self.assertIn("decision_record", queue_item["forbidden_actions"])

        packet = next(item for item in registry["context_packets"] if item["id"] == "ctx-lane1-hermes-decision-transition-guard")
        self.assertEqual(packet["source"], rel_json)
        self.assertEqual(packet["permission"], "local_read_only")
        self.assertEqual(packet["status"], "validated_decision_transition_ready")

        manifest_paths = {entry["path"] for entry in manifest["ignored_pathspecs"]}
        self.assertIn(rel_json, manifest_paths)
        mission_text = MISSION_CONTROL.read_text(encoding="utf-8")
        self.assertIn(rel_json, mission_text)
        self.assertIn(rel_doc, mission_text)

    def test_markdown_guard_states_non_action_boundary(self):
        text = GUARD_DOC.read_text(encoding="utf-8")
        required = [
            "HERMES_DECISION_TRANSITION_GUARD_NOT_DECISION",
            "status=validated_decision_transition_ready",
            "validated_decision=route_to_opus",
            "transition_allowed=true",
            "next_transition=await_opus_architecture_packet",
            "decision_record=true",
            "codex_recorder_gate_open=false",
            "lane2_authorized=false",
            "No Hermes decision is created by this guard.",
            "No deploy, push, cloud mutation, customer send, secret read, paid/provider call, provider call, runtime queue execution, Telegram live send, external message send, merge script, install, or migration is authorized.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
