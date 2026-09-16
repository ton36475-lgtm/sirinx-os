"""GhostClaw LANE_1 packet_013 Hermes decision draft guardrails."""
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "build_lane1_hermes_decision_draft.py"
DRAFT_JSON = ROOT / "data" / "pathspecs" / "ghostclaw_lane1_packet013_decision_draft_2026-06-29.json"
DRAFT_DOC = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_PACKET013_DECISION_DRAFT_2026-06-29.md"
DRAFT_PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_015_ghostclaw_lane1_hermes_decision_draft.json"
WORKBENCH_JSON = ROOT / "data" / "pathspecs" / "ghostclaw_lane1_packet013_decision_workbench_2026-06-29.json"
READINESS_JSON = ROOT / "data" / "pathspecs" / "ghostclaw_lane1_packet013_decision_readiness_2026-06-29.json"
EXECUTION_QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
ACTIVE_INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
CONTEXT_REGISTRY_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_context_packet_registry_2026-06-29.json"
MANIFEST_JSON = ROOT / "WORKSPACE_SCAFFOLD" / "manifests" / "active_goal_local_evidence_durability_2026-06-29.json"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"
DECISION_VALIDATOR = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "validate_lane1_hermes_decision.py"
FINAL_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"


def load_draft_module():
    spec = importlib.util.spec_from_file_location("lane1_hermes_decision_draft", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Lane1Packet013DecisionDraftTests(unittest.TestCase):
    """Ensure Codex can prepare a Hermes-facing draft without recording a decision."""

    def load_draft(self):
        self.assertTrue(DRAFT_JSON.exists(), f"Missing decision draft JSON: {DRAFT_JSON}")
        return json.loads(DRAFT_JSON.read_text(encoding="utf-8"))

    def test_draft_artifacts_exist_without_final_decision_or_packet(self):
        self.assertTrue(SCRIPT.exists(), f"Missing decision draft builder: {SCRIPT}")
        self.assertTrue(DRAFT_JSON.exists(), f"Missing decision draft JSON: {DRAFT_JSON}")
        self.assertTrue(DRAFT_DOC.exists(), f"Missing decision draft doc: {DRAFT_DOC}")
        self.assertTrue(DRAFT_PACKET.exists(), f"Missing decision draft packet: {DRAFT_PACKET}")
        self.assertTrue(FINAL_DECISION.exists(), "Hermes decision file should exist after route_to_opus decision")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 packet exists unexpectedly")

    def test_draft_preserves_non_decision_and_closed_gate_boundary(self):
        draft = self.load_draft()

        self.assertEqual(draft["schema"], "ghostclaw.lane1.packet013_decision_draft.v1")
        self.assertEqual(draft["status"], "draft_for_hermes_review_not_decision")
        self.assertEqual(draft["current_actionable_packet"], "packet_013")
        self.assertEqual(draft["draft_decision"], "route_to_opus")
        self.assertEqual(draft["draft_reason"], "route_to_opus is reviewable from local evidence while the Codex recorder gate remains closed.")
        self.assertFalse(draft["decision_record"])
        self.assertFalse(draft["codex_recorder_gate_open"])
        self.assertFalse(draft["lane2_authorized"])
        self.assertFalse(draft["claims_final_opus_packet"])
        self.assertEqual(draft["approval_scope"], "hermes_decision_review_only")

        for action in (
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "paid_provider_call",
            "provider_call",
            "runtime_queue_execution",
            "merge_script_execution",
            "install",
            "migration",
            "telegram_live_send",
            "external_message_send",
        ):
            self.assertFalse(draft["blocked_actions"][action], f"{action} should remain false")

    def test_builder_chooses_reviewable_route_to_opus_from_scorecard(self):
        module = load_draft_module()
        draft = module.build_decision_draft(READINESS_JSON, WORKBENCH_JSON)

        self.assertEqual(draft["draft_decision"], "route_to_opus")
        self.assertFalse(draft["decision_record"])
        self.assertIn("docs/knowledge/SIRINX_GHOSTCLAW_LANE1_ARCHITECTURE_INPUT_WORKSHEET_2026-06-29.md", draft["reviewed_evidence_paths"])
        self.assertIn("WORKSPACE_SCAFFOLD/scripts/validate_lane1_hermes_decision.py", draft["required_before_action"])

    def test_builder_falls_back_to_block_when_no_reviewable_options_exist(self):
        module = load_draft_module()
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            readiness = tmp_path / "readiness.json"
            workbench = tmp_path / "workbench.json"
            readiness.write_text(
                json.dumps(
                    {
                        "current_actionable_packet": "packet_999",
                        "decision_readiness": [
                            {
                                "decision": "open_codex_recorder_gate",
                                "readiness": "blocked_pending_hermes_decision",
                                "evidence": ["docs/example.md"],
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )
            workbench.write_text(json.dumps({"current_blockers": ["BLOCK-TEST"]}), encoding="utf-8")

            draft = module.build_decision_draft(readiness, workbench)

        self.assertEqual(draft["draft_decision"], "block")
        self.assertEqual(draft["current_actionable_packet"], "packet_999")
        self.assertIn("BLOCK-TEST", draft["current_blockers"])
        self.assertFalse(draft["decision_record"])

    def test_draft_doc_is_rejected_by_final_decision_validator(self):
        self.assertTrue(DRAFT_DOC.exists(), f"Missing decision draft doc: {DRAFT_DOC}")
        result = subprocess.run(
            [sys.executable, str(DECISION_VALIDATOR), str(DRAFT_DOC)],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("missing HERMES_REVIEW_DECISION_RECORD marker", result.stdout)
        self.assertIn("decision_record must be true", result.stdout)

    def test_outbox_packet_preserves_draft_only_boundary(self):
        packet = json.loads(DRAFT_PACKET.read_text(encoding="utf-8"))

        self.assertEqual(packet["id"], "packet_015")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["approval_scope"], "hermes_decision_review_only")
        self.assertTrue(packet["approval_required"])
        self.assertEqual(packet["draft_decision"], "route_to_opus")
        self.assertFalse(packet["decision_record"])
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["external_message_send"])
        self.assertFalse(packet["deploy"])
        self.assertFalse(packet["push"])
        self.assertFalse(packet["lane2_authorized"])
        self.assertIn(str(DRAFT_JSON.relative_to(ROOT)), packet["input"])
        self.assertIn(str(DRAFT_DOC.relative_to(ROOT)), packet["output"])

    def test_draft_is_linked_from_index_queue_registry_manifest_and_mission_control(self):
        rel_json = str(DRAFT_JSON.relative_to(ROOT))
        rel_doc = str(DRAFT_DOC.relative_to(ROOT))
        rel_packet = str(DRAFT_PACKET.relative_to(ROOT))
        rel_script = str(SCRIPT.relative_to(ROOT))

        active_index = json.loads(ACTIVE_INDEX_JSON.read_text(encoding="utf-8"))
        execution_queue = json.loads(EXECUTION_QUEUE_JSON.read_text(encoding="utf-8"))
        registry = json.loads(CONTEXT_REGISTRY_JSON.read_text(encoding="utf-8"))
        manifest = json.loads(MANIFEST_JSON.read_text(encoding="utf-8"))

        self.assertIn(rel_json, active_index["source_files"])
        stream = next(item for item in active_index["workstreams"] if item["id"] == "ghostclaw_lane1_packet013_decision_draft")
        self.assertEqual(stream["status"], "draft_for_hermes_review_not_decision")
        self.assertIn(rel_json, stream["evidence"])
        self.assertIn(rel_doc, stream["evidence"])
        self.assertIn(rel_packet, stream["evidence"])

        self.assertIn(rel_json, execution_queue["source_indexes"])
        queue_item = next(item for item in execution_queue["items"] if item["id"] == "LANE1-HERMES-DECISION-DRAFT-PACKET-015")
        self.assertEqual(queue_item["status"], "superseded_by_recorded_route_to_opus_decision")
        self.assertIn(rel_script, queue_item["evidence"])
        self.assertIn(rel_json, queue_item["evidence"])
        self.assertIn(rel_packet, queue_item["evidence"])
        self.assertIn("runtime_queue_execution", queue_item["forbidden_actions"])

        packet = next(item for item in registry["context_packets"] if item["id"] == "ctx-lane1-packet013-decision-draft")
        self.assertEqual(packet["source"], rel_json)
        self.assertEqual(packet["permission"], "local_read_only")
        self.assertEqual(packet["status"], "draft_for_hermes_review_not_decision")

        manifest_paths = {entry["path"] for entry in manifest["ignored_pathspecs"]}
        self.assertIn(rel_json, manifest_paths)
        mission_text = MISSION_CONTROL.read_text(encoding="utf-8")
        self.assertIn(rel_json, mission_text)
        self.assertIn(rel_doc, mission_text)

    def test_markdown_draft_states_non_actions(self):
        text = DRAFT_DOC.read_text(encoding="utf-8")
        required = [
            "HERMES_REVIEW_DECISION_DRAFT_NOT_RECORD",
            "decision=route_to_opus",
            "decision_record=false",
            "codex_recorder_gate_open=false",
            "lane2_authorized=false",
            "approval_scope=hermes_decision_review_only",
            "runtime_queue_execution=false",
            "provider_call=false",
            "No Hermes decision is recorded by this draft.",
            "No deploy, push, cloud mutation, customer send, secret read, paid/provider call, runtime queue execution, Telegram live send, external message send, merge script, install, or migration is authorized.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
