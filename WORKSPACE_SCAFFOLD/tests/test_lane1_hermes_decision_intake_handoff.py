"""Hermes decision intake handoff for GhostClaw LANE_1 packet_013."""
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "build_lane1_hermes_decision_intake_handoff.py"
HANDOFF_JSON = ROOT / "data" / "pathspecs" / "ghostclaw_lane1_hermes_decision_intake_handoff_2026-06-29.json"
HANDOFF_DOC = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_INTAKE_HANDOFF_2026-06-29.md"
QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
REGISTRY_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_context_packet_registry_2026-06-29.json"
MANIFEST_JSON = ROOT / "WORKSPACE_SCAFFOLD" / "manifests" / "active_goal_local_evidence_durability_2026-06-29.json"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
HERMES_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"


def load_module():
    spec = importlib.util.spec_from_file_location("lane1_decision_intake_handoff", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Lane1HermesDecisionIntakeHandoffTests(unittest.TestCase):
    """Ensure the handoff makes the Hermes decision step reproducible without widening gates."""

    def test_handoff_artifacts_exist_without_final_decision_or_packet(self):
        self.assertTrue(SCRIPT.exists(), f"Missing handoff builder: {SCRIPT}")
        self.assertTrue(HANDOFF_JSON.exists(), f"Missing handoff JSON: {HANDOFF_JSON}")
        self.assertTrue(HANDOFF_DOC.exists(), f"Missing handoff doc: {HANDOFF_DOC}")
        self.assertFalse(HERMES_DECISION.exists(), "Hermes decision exists unexpectedly")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 Opus packet exists unexpectedly")

    def test_builder_preserves_non_decision_boundary(self):
        module = load_module()
        handoff = module.build_handoff()

        self.assertEqual(handoff["schema"], "ghostclaw.lane1.hermes_decision_intake_handoff.v1")
        self.assertEqual(handoff["status"], "awaiting_hermes_decision_record")
        self.assertEqual(handoff["current_actionable_packet"], "packet_013")
        self.assertEqual(
            handoff["decision_path"],
            "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md",
        )
        self.assertFalse(handoff["decision_record"])
        self.assertFalse(handoff["state_mutation_performed"])
        self.assertFalse(handoff["codex_recorder_gate_open"])
        self.assertFalse(handoff["lane2_authorized"])
        self.assertEqual(
            set(handoff["allowed_decisions"]),
            {"route_to_opus", "request_revision", "open_codex_recorder_gate", "block"},
        )

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
            self.assertFalse(handoff["blocked_actions"][action], f"{action} should remain false")

        self.assertIn("decision", handoff["required_fields"])
        self.assertIn("reviewed_evidence_paths", handoff["required_fields"])
        self.assertGreaterEqual(len(handoff["recommended_reviewed_evidence_paths"]), 3)
        self.assertIn("validate_lane1_hermes_decision.py", "\n".join(handoff["validation_commands"]))
        self.assertIn("build_lane1_hermes_decision_transition_guard.py", "\n".join(handoff["validation_commands"]))

    def test_markdown_handoff_states_non_action_boundary(self):
        text = HANDOFF_DOC.read_text(encoding="utf-8")
        required = [
            "HERMES_DECISION_INTAKE_HANDOFF_LOCAL_ONLY",
            "This handoff is not a Hermes decision.",
            "decision_record=false",
            "state_mutation_performed=false",
            "lane2_authorized=false",
            "python3 WORKSPACE_SCAFFOLD/scripts/validate_lane1_hermes_decision.py",
            "python3 WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_transition_guard.py",
            "No deploy, push, cloud mutation, customer send, secret read, paid/provider call",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])

    def test_handoff_is_linked_from_queue_index_registry_manifest_and_mission_control(self):
        rel_json = str(HANDOFF_JSON.relative_to(ROOT))
        rel_doc = str(HANDOFF_DOC.relative_to(ROOT))
        rel_script = str(SCRIPT.relative_to(ROOT))

        queue = json.loads(QUEUE_JSON.read_text(encoding="utf-8"))
        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        registry = json.loads(REGISTRY_JSON.read_text(encoding="utf-8"))
        manifest = json.loads(MANIFEST_JSON.read_text(encoding="utf-8"))
        mission = MISSION_CONTROL.read_text(encoding="utf-8")

        self.assertIn(rel_json, queue["source_indexes"])
        first = next(item for item in queue["items"] if item["id"] == "LANE1-HERMES-DECISION-PACKET-013")
        self.assertIn(rel_json, first["evidence"])
        self.assertIn(rel_doc, first["evidence"])
        self.assertIn(rel_script, first["evidence"])

        self.assertIn(rel_json, index["source_files"])
        self.assertIn("ghostclaw_lane1_hermes_decision_intake_handoff", [item["id"] for item in index["workstreams"]])
        self.assertIn(
            "ctx-lane1-hermes-decision-intake-handoff",
            [item["id"] for item in registry["context_packets"]],
        )
        self.assertIn(rel_json, [item["path"] for item in manifest["ignored_pathspecs"]])
        self.assertIn(rel_json, mission)
        self.assertIn(rel_doc, mission)


if __name__ == "__main__":
    unittest.main()
