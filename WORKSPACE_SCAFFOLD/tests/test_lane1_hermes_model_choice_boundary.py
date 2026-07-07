"""GhostClaw LANE_1 Hermes model-choice boundary guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BOUNDARY_JSON = (
    ROOT
    / "data"
    / "pathspecs"
    / "ghostclaw_lane1_hermes_model_choice_boundary_2026-06-29.json"
)
BOUNDARY_DOC = (
    ROOT
    / "docs"
    / "knowledge"
    / "SIRINX_GHOSTCLAW_LANE1_HERMES_MODEL_CHOICE_BOUNDARY_2026-06-29.md"
)
DECISION_TEMPLATE_JSON = (
    ROOT
    / "WORKSPACE_SCAFFOLD"
    / "templates"
    / "ghostclaw_lane1_hermes_review_decision.template.json"
)
DECISION_TEMPLATE_DOC = (
    ROOT
    / "docs"
    / "knowledge"
    / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION_TEMPLATE_2026-06-29.md"
)
QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
QUEUE_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_EXECUTION_QUEUE_2026-06-29.md"
INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
INDEX_DOC = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_SYSTEMATIC_WORK_INDEX_2026-06-29.md"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
HERMES_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"


class Lane1HermesModelChoiceBoundaryTests(unittest.TestCase):
    """Ensure any-model vibe coding help cannot widen execution gates."""

    def load_boundary_json(self):
        self.assertTrue(BOUNDARY_JSON.exists(), f"Missing model boundary JSON: {BOUNDARY_JSON}")
        return json.loads(BOUNDARY_JSON.read_text(encoding="utf-8"))

    def load_boundary_doc(self):
        self.assertTrue(BOUNDARY_DOC.exists(), f"Missing model boundary doc: {BOUNDARY_DOC}")
        return BOUNDARY_DOC.read_text(encoding="utf-8")

    def test_boundary_files_exist_without_final_decision_or_packet(self):
        self.assertTrue(BOUNDARY_JSON.exists(), f"Missing model boundary JSON: {BOUNDARY_JSON}")
        self.assertTrue(BOUNDARY_DOC.exists(), f"Missing model boundary doc: {BOUNDARY_DOC}")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 packet exists unexpectedly")
        self.assertTrue(HERMES_DECISION.exists(), "Hermes decision file should exist after route_to_opus decision")

    def test_boundary_json_limits_any_model_to_draft_assistance(self):
        boundary = self.load_boundary_json()

        self.assertEqual(boundary["schema"], "ghostclaw.lane1.hermes_model_choice_boundary.v1")
        self.assertEqual(boundary["status"], "model_choice_allowed_draft_only")
        self.assertEqual(boundary["models"], "any")
        self.assertTrue(boundary["allowed_for_vibe_coding_drafts"])
        self.assertEqual(
            set(boundary["allowed_without_gate"]),
            {"draft_assistance", "architecture_wording", "local_review_synthesis"},
        )
        self.assertTrue(boundary["separate_action_gate_required"])
        self.assertFalse(boundary["decision_record"])
        self.assertFalse(boundary["lane2_authorized"])

    def test_boundary_json_blocks_provider_and_external_actions(self):
        boundary = self.load_boundary_json()

        for key in (
            "provider_call",
            "paid_provider_call",
            "secret_read",
            "runtime_queue_execution",
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "external_message_send",
            "migration",
            "merge_script_execution",
        ):
            self.assertFalse(boundary["blocked_actions"][key], f"{key} should remain false")

        self.assertEqual(
            set(boundary["blocked_without_gate"]),
            {
                "provider_call",
                "paid_provider_call",
                "secret_read",
                "runtime_queue_execution",
                "deploy",
                "push",
                "cloud_mutation",
                "customer_send",
                "external_message_send",
                "migration",
                "merge_script_execution",
            },
        )

    def test_boundary_is_linked_from_templates_queue_index_and_mission_control(self):
        boundary_path = "data/pathspecs/ghostclaw_lane1_hermes_model_choice_boundary_2026-06-29.json"
        boundary_doc = "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_MODEL_CHOICE_BOUNDARY_2026-06-29.md"

        template = json.loads(DECISION_TEMPLATE_JSON.read_text(encoding="utf-8"))
        self.assertIn(boundary_path, template["hermes_model_selection"].get("evidence", []))

        for path in (DECISION_TEMPLATE_DOC, QUEUE_DOC, INDEX_DOC, MISSION_CONTROL):
            text = path.read_text(encoding="utf-8")
            self.assertIn(boundary_path, text, f"{path} does not link boundary JSON")
            self.assertIn(boundary_doc, text, f"{path} does not link boundary doc")

        queue = json.loads(QUEUE_JSON.read_text(encoding="utf-8"))
        self.assertIn(boundary_path, queue["source_indexes"])
        self.assertIn(boundary_path, queue["items"][0]["evidence"])

        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        self.assertIn(boundary_path, index["source_files"])
        lane1 = next(item for item in index["workstreams"] if item["id"] == "ghostclaw_lane1")
        self.assertIn(boundary_path, lane1["evidence"])

    def test_boundary_doc_states_non_approval_boundary(self):
        text = self.load_boundary_doc()
        required = [
            "HERMES_MODEL_CHOICE_BOUNDARY_DRAFT_ONLY",
            "Hermes may choose any model to help create vibe coding drafts.",
            "models=any",
            "allowed_for_vibe_coding_drafts=true",
            "decision_record=false",
            "lane2_authorized=false",
            "provider_call=false",
            "paid_provider_call=false",
            "secret_read=false",
            "runtime_queue_execution=false",
            "No deploy.",
            "No push.",
            "No cloud mutation.",
            "No customer send.",
            "No external message send.",
            "This boundary is not a Hermes decision.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
