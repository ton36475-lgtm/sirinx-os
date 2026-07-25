"""GhostClaw LANE_1 Hermes decision template guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOC_TEMPLATE = (
    ROOT
    / "docs"
    / "knowledge"
    / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION_TEMPLATE_2026-06-29.md"
)
JSON_TEMPLATE = (
    ROOT
    / "WORKSPACE_SCAFFOLD"
    / "templates"
    / "ghostclaw_lane1_hermes_review_decision.template.json"
)
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"


class Lane1HermesDecisionTemplateTests(unittest.TestCase):
    """Ensure the decision template cannot be confused with an approval."""

    def test_decision_templates_exist_and_final_packet_is_missing(self):
        self.assertTrue(DOC_TEMPLATE.exists(), f"Missing decision doc template: {DOC_TEMPLATE}")
        self.assertTrue(JSON_TEMPLATE.exists(), f"Missing decision JSON template: {JSON_TEMPLATE}")
        self.assertFalse(FINAL_PACKET.exists(), "Final Opus packet exists unexpectedly")

    def test_json_template_defaults_to_no_decision(self):
        template = json.loads(JSON_TEMPLATE.read_text(encoding="utf-8"))

        self.assertEqual(template["status"], "template_not_decision")
        self.assertEqual(template["decision"], "pending")
        self.assertFalse(template["decision_record"])
        self.assertFalse(template["lane2_authorized"])
        self.assertFalse(template["provider_call"])
        self.assertFalse(template["runtime_queue_execution"])
        self.assertFalse(template["deploy"])
        self.assertFalse(template["push"])
        self.assertTrue(template["hermes_model_selection"]["allowed_for_vibe_coding_drafts"])
        self.assertEqual(template["hermes_model_selection"]["models"], "any")
        self.assertTrue(template["hermes_model_selection"]["separate_action_gate_required"])
        self.assertFalse(template["external_action_approval"]["blanket_approval_actionable"])
        self.assertTrue(template["external_action_approval"]["requires_gate_specific_approval"])
        self.assertIn("paid_provider_call", template["external_action_approval"]["blocked_without_gate"])

    def test_json_template_limits_allowed_decisions(self):
        template = json.loads(JSON_TEMPLATE.read_text(encoding="utf-8"))
        self.assertEqual(
            set(template["allowed_decisions"]),
            {"route_to_opus", "request_revision", "open_codex_recorder_gate", "block"},
        )

    def test_doc_template_preserves_review_boundary(self):
        text = DOC_TEMPLATE.read_text(encoding="utf-8")
        required = [
            "DECISION_TEMPLATE_NOT_DECISION",
            "This template is not a Hermes decision.",
            "lane2_authorized=false",
            "decision_record=false",
            "No deploy.",
            "No push.",
            "No provider call.",
            "No runtime queue execution.",
            "Hermes may choose any model to help create vibe coding drafts.",
            "This model-choice permission does not authorize deploy, push, cloud mutation, customer send, secret read, or runtime queue execution.",
            "Blanket approval is not executable approval.",
            "Each external or paid action still requires gate-specific approval with target, environment, rollback, and evidence path.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
