"""GhostClaw LANE_1 Hermes decision validator guardrails."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VALIDATOR = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "validate_lane1_hermes_decision.py"
CONTRACT_JSON = ROOT / "data" / "pathspecs" / "ghostclaw_lane1_hermes_decision_validator_2026-06-29.json"
CONTRACT_DOC = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_VALIDATOR_2026-06-29.md"
WORKBENCH_JSON = ROOT / "data" / "pathspecs" / "ghostclaw_lane1_packet013_decision_workbench_2026-06-29.json"
FINAL_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"


def load_validator_module():
    spec = importlib.util.spec_from_file_location("lane1_decision_validator", VALIDATOR)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Lane1HermesDecisionValidatorTests(unittest.TestCase):
    """Ensure future Hermes decisions can be checked without creating a decision."""

    def test_validator_artifacts_exist_without_final_decision_or_packet(self):
        self.assertTrue(VALIDATOR.exists(), f"Missing validator script: {VALIDATOR}")
        self.assertTrue(CONTRACT_JSON.exists(), f"Missing validator contract: {CONTRACT_JSON}")
        self.assertTrue(CONTRACT_DOC.exists(), f"Missing validator doc: {CONTRACT_DOC}")
        self.assertFalse(FINAL_DECISION.exists(), "Hermes final decision exists unexpectedly")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 Opus architecture packet exists unexpectedly")

    def test_validator_contract_preserves_gate_boundaries(self):
        contract = json.loads(CONTRACT_JSON.read_text(encoding="utf-8"))

        self.assertEqual(contract["schema"], "ghostclaw.lane1.hermes_decision_validator.v1")
        self.assertEqual(contract["status"], "local_only_validator_not_decision")
        self.assertFalse(contract["decision_record"])
        self.assertFalse(contract["codex_recorder_gate_open"])
        self.assertFalse(contract["lane2_authorized"])
        self.assertFalse(contract["deploy"])
        self.assertFalse(contract["push"])
        self.assertFalse(contract["provider_call"])
        self.assertEqual(
            contract["allowed_decisions"],
            ["route_to_opus", "request_revision", "open_codex_recorder_gate", "block"],
        )
        self.assertIn("docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md", contract["validates"])
        self.assertIn("paid_provider_call", contract["blocked_actions"])
        self.assertIn("approval_scope", contract["required_fields"])

    def test_validator_accepts_synthetic_local_decision(self):
        module = load_validator_module()
        decision_text = """
HERMES_REVIEW_DECISION_RECORD
decision=open_codex_recorder_gate
decision_record=true
codex_recorder_gate_open=true
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
        result = module.validate_decision_text(decision_text, ROOT)

        self.assertTrue(result.ok, result.errors)
        self.assertEqual(result.decision, "open_codex_recorder_gate")
        self.assertEqual(result.errors, [])

    def test_validator_rejects_approval_or_gate_drift(self):
        module = load_validator_module()
        decision_text = """
HERMES_REVIEW_DECISION_RECORD
decision=route_to_opus
decision_record=true
codex_recorder_gate_open=true
lane2_authorized=true
approval_scope=blanket_approval
reviewed_evidence_paths=data/pathspecs/ghostclaw_lane1_packet013_decision_workbench_2026-06-29.json
deploy=true
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
        result = module.validate_decision_text(decision_text, ROOT)

        self.assertFalse(result.ok)
        self.assertIn("codex_recorder_gate_open must be false unless decision=open_codex_recorder_gate", result.errors)
        self.assertIn("lane2_authorized must remain false", result.errors)
        self.assertIn("approval_scope must be local_decision_only", result.errors)
        self.assertIn("deploy must be false", result.errors)

    def test_validator_rejects_secret_or_missing_evidence_paths(self):
        module = load_validator_module()
        decision_text = """
HERMES_REVIEW_DECISION_RECORD
decision=block
decision_record=true
codex_recorder_gate_open=false
lane2_authorized=false
approval_scope=local_decision_only
reviewed_evidence_paths=.env,docs/knowledge/DOES_NOT_EXIST.md
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
        result = module.validate_decision_text(decision_text, ROOT)

        self.assertFalse(result.ok)
        self.assertIn("reviewed_evidence_paths must include at least three local evidence paths", result.errors)
        self.assertIn("reviewed_evidence_paths cannot include secret-like path: .env", result.errors)
        self.assertIn("reviewed evidence path does not exist: docs/knowledge/DOES_NOT_EXIST.md", result.errors)

    def test_validator_cli_handles_missing_decision_as_blocked_not_success(self):
        module = load_validator_module()
        with tempfile.TemporaryDirectory() as tmp:
            missing_path = Path(tmp) / "missing-decision.md"
            exit_code = module.main([str(missing_path)])

        self.assertEqual(exit_code, 2)

    def test_validator_is_linked_from_workbench_index_and_queue(self):
        rel = str(CONTRACT_JSON.relative_to(ROOT))
        script_rel = str(VALIDATOR.relative_to(ROOT))
        doc_rel = str(CONTRACT_DOC.relative_to(ROOT))

        workbench = json.loads(WORKBENCH_JSON.read_text(encoding="utf-8"))
        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        queue = json.loads(QUEUE_JSON.read_text(encoding="utf-8"))

        self.assertIn(rel, workbench["validator_paths"])
        self.assertIn(script_rel, workbench["validator_paths"])
        self.assertIn(doc_rel, workbench["validator_paths"])
        self.assertIn(rel, index["source_files"])
        self.assertIn(rel, queue["source_indexes"])
        lane1 = next(item for item in queue["items"] if item["id"] == "LANE1-HERMES-DECISION-PACKET-013")
        self.assertIn(rel, lane1["evidence"])

    def test_validator_doc_states_non_action_boundary(self):
        text = CONTRACT_DOC.read_text(encoding="utf-8")
        required = [
            "HERMES_DECISION_VALIDATOR_NOT_DECISION",
            "This validator is not a Hermes decision.",
            "It does not authorize deploy, push, cloud mutation, customer send, secret read, paid provider call, runtime queue execution, or LANE_2.",
            "Hermes may use any model for vibe coding draft help only.",
            "Blanket approval is not executable approval.",
            "Each external or paid action requires gate-specific approval.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
