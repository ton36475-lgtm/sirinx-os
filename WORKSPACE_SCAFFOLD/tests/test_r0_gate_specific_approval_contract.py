"""R0 gate-specific approval packet contract guardrails."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTRACT_JSON = ROOT / "data" / "pathspecs" / "sirinx_r0_gate_specific_approval_contract_2026-06-29.json"
CONTRACT_DOC = ROOT / "docs" / "knowledge" / "SIRINX_R0_GATE_SPECIFIC_APPROVAL_CONTRACT_2026-06-29.md"
VALIDATOR = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "validate_r0_gate_approval.py"
TEMPLATE_JSON = ROOT / "WORKSPACE_SCAFFOLD" / "templates" / "r0_gate_specific_approval_packet.template.json"
ACTIVE_APPROVAL = ROOT / "docs" / "knowledge" / "SIRINX_R0_GATE_APPROVAL_PACKET.md"
INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"


def load_validator_module():
    spec = importlib.util.spec_from_file_location("r0_gate_approval_validator", VALIDATOR)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class R0GateSpecificApprovalContractTests(unittest.TestCase):
    """Ensure R0 approvals are precise packets, not blanket text."""

    def test_contract_artifacts_exist_without_active_approval(self):
        self.assertTrue(CONTRACT_JSON.exists(), f"Missing contract JSON: {CONTRACT_JSON}")
        self.assertTrue(CONTRACT_DOC.exists(), f"Missing contract doc: {CONTRACT_DOC}")
        self.assertTrue(VALIDATOR.exists(), f"Missing validator script: {VALIDATOR}")
        self.assertTrue(TEMPLATE_JSON.exists(), f"Missing approval template: {TEMPLATE_JSON}")
        self.assertFalse(ACTIVE_APPROVAL.exists(), "Active R0 approval packet exists unexpectedly")

    def test_contract_is_not_approval_and_keeps_external_actions_blocked(self):
        contract = json.loads(CONTRACT_JSON.read_text(encoding="utf-8"))

        self.assertEqual(contract["schema"], "sirinx.r0.gate_specific_approval_contract.v1")
        self.assertEqual(contract["status"], "contract_not_approval")
        self.assertFalse(contract["approval_packet_record"])
        self.assertFalse(contract["blanket_approval_actionable"])
        self.assertFalse(contract["runtime_execution"])
        for action in (
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "paid_provider_call",
            "runtime_queue_execution",
        ):
            self.assertFalse(contract["blocked_actions"][action], f"{action} should remain false")

    def test_contract_defines_required_fields_and_known_r0_gates(self):
        contract = json.loads(CONTRACT_JSON.read_text(encoding="utf-8"))

        required = {
            "SIRINX_R0_GATE_APPROVAL_PACKET",
            "approval_packet_record",
            "gate_id",
            "action",
            "target",
            "environment",
            "rollback",
            "evidence_path",
            "approval_scope",
            "approved_by",
            "approval_expires_at",
            "blanket_approval",
            "approve_all",
        }
        self.assertTrue(required.issubset(set(contract["required_fields"])))
        self.assertEqual(
            set(contract["allowed_gate_ids"]),
            {"R0-01", "R0-02", "R0-03"},
        )
        self.assertIn("testnet_deploy", contract["allowed_actions"])
        self.assertIn("real_wallet_connector_implementation", contract["allowed_actions"])
        self.assertIn("merge_staging_to_main", contract["allowed_actions"])
        self.assertIn("secret_read", contract["never_authorized_by_this_contract"])

    def test_json_template_defaults_to_no_approval(self):
        template = json.loads(TEMPLATE_JSON.read_text(encoding="utf-8"))

        self.assertEqual(template["status"], "template_not_approval")
        self.assertFalse(template["approval_packet_record"])
        self.assertEqual(template["approval_scope"], "single_gate_only")
        self.assertFalse(template["blanket_approval"])
        self.assertFalse(template["approve_all"])
        self.assertFalse(template["runtime_execution"])
        self.assertFalse(template["deploy"])
        self.assertFalse(template["push"])

    def test_validator_accepts_synthetic_single_gate_packet(self):
        module = load_validator_module()
        approval_text = """
SIRINX_R0_GATE_APPROVAL_PACKET
approval_packet_record=true
gate_id=R0-01
action=testnet_deploy
target=apps/pocket-hatchery
environment=testnet
rollback=apps/pocket-hatchery/ops/rollback_plan_review.md
evidence_path=apps/pocket-hatchery/ops/release_gate_evidence.md
approval_scope=single_gate_only
approved_by=Pitoon
approval_expires_at=2026-06-30T23:59:59+07:00
blanket_approval=false
approve_all=false
"""
        result = module.validate_approval_text(approval_text, ROOT)

        self.assertTrue(result.ok, result.errors)
        self.assertEqual(result.gate_id, "R0-01")
        self.assertEqual(result.action, "testnet_deploy")
        self.assertEqual(result.errors, [])

    def test_validator_rejects_blanket_multiple_or_secret_read_approval(self):
        module = load_validator_module()
        approval_text = """
SIRINX_R0_GATE_APPROVAL_PACKET
approval_packet_record=true
gate_id=R0-01
action=testnet_deploy,push,secret_read
target=apps/pocket-hatchery
environment=testnet
rollback=apps/pocket-hatchery/ops/rollback_plan_review.md
evidence_path=.env
approval_scope=approve_all
approved_by=Pitoon
approval_expires_at=2026-06-30T23:59:59+07:00
blanket_approval=true
approve_all=true
"""
        result = module.validate_approval_text(approval_text, ROOT)

        self.assertFalse(result.ok)
        self.assertIn("action must name exactly one allowed R0 action", result.errors)
        self.assertIn("secret_read is never authorized by this local contract", result.errors)
        self.assertIn("approval_scope must be single_gate_only", result.errors)
        self.assertIn("blanket_approval must be false", result.errors)
        self.assertIn("approve_all must be false", result.errors)
        self.assertIn("evidence_path cannot include secret-like path: .env", result.errors)

    def test_validator_cli_handles_missing_packet_as_blocked_not_success(self):
        module = load_validator_module()
        with tempfile.TemporaryDirectory() as tmp:
            missing_path = Path(tmp) / "missing-r0-approval.md"
            exit_code = module.main([str(missing_path)])

        self.assertEqual(exit_code, 2)

    def test_contract_is_linked_from_active_index_and_queue(self):
        rel = str(CONTRACT_JSON.relative_to(ROOT))
        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        queue = json.loads(QUEUE_JSON.read_text(encoding="utf-8"))

        self.assertIn(rel, index["source_files"])
        self.assertIn(rel, queue["source_indexes"])
        r0_item = next(item for item in queue["items"] if item["id"] == "R0-GATE-SPECIFIC-APPROVALS")
        self.assertIn(rel, r0_item["evidence"])

    def test_markdown_contract_states_non_action_boundary(self):
        text = CONTRACT_DOC.read_text(encoding="utf-8")
        required = [
            "R0_GATE_SPECIFIC_APPROVAL_CONTRACT_NOT_APPROVAL",
            "This contract is not approval.",
            "Blanket approval is not executable approval.",
            "Each external action requires one gate-specific packet.",
            "No deploy, push, cloud mutation, customer send, secret read, paid/provider call, runtime queue execution, or wallet action was performed.",
            "secret_read is not authorized by this local contract.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
