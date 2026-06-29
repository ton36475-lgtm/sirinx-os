"""Active-goal blocker clearance validator guardrails."""
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VALIDATOR = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "validate_active_goal_blocker_clearance.py"
CONTRACT_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_blocker_clearance_validator_2026-06-29.json"
CONTRACT_DOC = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_BLOCKER_CLEARANCE_VALIDATOR_2026-06-29.md"
TEMPLATE_JSON = ROOT / "WORKSPACE_SCAFFOLD" / "templates" / "active_goal_blocker_clearance_packet.template.json"
ACTIVE_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_BLOCKER_CLEARANCE_PACKET.md"
INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"


def load_validator_module():
    spec = importlib.util.spec_from_file_location("active_goal_blocker_clearance_validator", VALIDATOR)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ActiveGoalBlockerClearanceValidatorTests(unittest.TestCase):
    """Ensure blocker clearance requires specific evidence and never clears the full goal."""

    def test_contract_artifacts_exist_without_active_clearance_packet(self):
        self.assertTrue(VALIDATOR.exists(), f"Missing validator script: {VALIDATOR}")
        self.assertTrue(CONTRACT_JSON.exists(), f"Missing contract JSON: {CONTRACT_JSON}")
        self.assertTrue(CONTRACT_DOC.exists(), f"Missing contract doc: {CONTRACT_DOC}")
        self.assertTrue(TEMPLATE_JSON.exists(), f"Missing template JSON: {TEMPLATE_JSON}")
        self.assertFalse(ACTIVE_PACKET.exists(), "Active blocker clearance packet exists unexpectedly")

    def test_contract_is_not_clearance_and_preserves_action_boundary(self):
        contract = json.loads(CONTRACT_JSON.read_text(encoding="utf-8"))

        self.assertEqual(contract["schema"], "sirinx.active_goal.blocker_clearance_validator.v1")
        self.assertEqual(contract["status"], "validator_not_clearance")
        self.assertFalse(contract["clearance_packet_record"])
        self.assertFalse(contract["claims_goal_complete"])
        self.assertEqual(
            set(contract["allowed_blocker_ids"]),
            {
                "BLOCK-CHAT-EXPORT",
                "BLOCK-LANE1-OPUS-PACKET",
                "BLOCK-HERMES-GATEWAY",
                "BLOCK-V3-3-ARTIFACT",
                "BLOCK-R0-APPROVALS",
            },
        )
        for action in (
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "paid_provider_call",
            "runtime_queue_execution",
            "merge_script_execution",
            "install",
            "migration",
        ):
            self.assertFalse(contract["blocked_actions"][action], f"{action} should remain false")

    def test_template_defaults_to_no_clearance(self):
        template = json.loads(TEMPLATE_JSON.read_text(encoding="utf-8"))

        self.assertEqual(template["status"], "template_not_clearance")
        self.assertFalse(template["clearance_packet_record"])
        self.assertEqual(template["clearance_scope"], "single_blocker_only")
        self.assertFalse(template["claims_goal_complete"])
        self.assertFalse(template["claims_all_chats_read"])
        self.assertFalse(template["operator_review_complete"])
        for action, allowed in template["blocked_actions"].items():
            self.assertFalse(allowed, f"{action} should remain false")

    def test_validator_accepts_synthetic_chat_export_clearance_packet(self):
        module = load_validator_module()
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            evidence_dir = root / "data" / "pathspecs"
            evidence_dir.mkdir(parents=True)
            map_path = evidence_dir / "synthetic_all_chat_export_map.json"
            map_path.write_text(
                json.dumps(
                    {
                        "schema": "sirinx.all_chat_export.intake_map.v1",
                        "source_kind": "chatgpt_export",
                        "real_export_loaded": True,
                        "raw_chat_content_stored": False,
                        "claims_all_chats_read": False,
                        "records": [
                            {
                                "source_id": "synthetic:0001",
                                "conversation_id_hash": "abc123",
                                "title_redacted": "[REDACTED_TITLE]",
                                "status": "blocked",
                                "blockers": ["BLOCK-CHAT-EXPORT"],
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )
            packet_path = root / "clearance_packet.json"
            packet_path.write_text(
                json.dumps(
                    {
                        "schema": "sirinx.active_goal.blocker_clearance_packet.v1",
                        "status": "proposed_clearance",
                        "clearance_packet_record": True,
                        "blocker_id": "BLOCK-CHAT-EXPORT",
                        "clearance_scope": "single_blocker_only",
                        "claims_goal_complete": False,
                        "claims_all_chats_read": False,
                        "operator_review_complete": True,
                        "evidence_paths": ["data/pathspecs/synthetic_all_chat_export_map.json"],
                        "blocked_actions": {
                            "deploy": False,
                            "push": False,
                            "cloud_mutation": False,
                            "customer_send": False,
                            "secret_read": False,
                            "paid_provider_call": False,
                            "runtime_queue_execution": False,
                            "merge_script_execution": False,
                            "install": False,
                            "migration": False,
                        },
                    }
                ),
                encoding="utf-8",
            )
            result = module.validate_clearance_packet(packet_path, root=root)

        self.assertTrue(result.ok, result.errors)
        self.assertEqual(result.blocker_id, "BLOCK-CHAT-EXPORT")
        self.assertEqual(result.status, "clearable")
        self.assertFalse(result.claims_goal_complete)

    def test_validator_rejects_goal_completion_or_external_action_drift(self):
        module = load_validator_module()
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            packet_path = root / "bad_clearance_packet.json"
            packet_path.write_text(
                json.dumps(
                    {
                        "schema": "sirinx.active_goal.blocker_clearance_packet.v1",
                        "status": "proposed_clearance",
                        "clearance_packet_record": True,
                        "blocker_id": "BLOCK-CHAT-EXPORT,BLOCK-R0-APPROVALS",
                        "clearance_scope": "approve_all",
                        "claims_goal_complete": True,
                        "claims_all_chats_read": True,
                        "operator_review_complete": True,
                        "evidence_paths": [".env"],
                        "blocked_actions": {
                            "deploy": True,
                            "push": False,
                            "cloud_mutation": False,
                            "customer_send": False,
                            "secret_read": True,
                            "paid_provider_call": False,
                            "runtime_queue_execution": False,
                            "merge_script_execution": False,
                            "install": False,
                            "migration": False,
                        },
                    }
                ),
                encoding="utf-8",
            )
            result = module.validate_clearance_packet(packet_path, root=root)

        self.assertFalse(result.ok)
        self.assertIn("blocker_id must name exactly one known blocker", result.errors)
        self.assertIn("clearance_scope must be single_blocker_only", result.errors)
        self.assertIn("claims_goal_complete must remain false", result.errors)
        self.assertIn("secret_read must remain false", result.errors)
        self.assertIn("deploy must remain false", result.errors)
        self.assertIn("evidence path cannot be secret-like: .env", result.errors)

    def test_validator_cli_handles_missing_packet_as_blocked_not_success(self):
        result = subprocess.run(
            [sys.executable, str(VALIDATOR), str(ROOT / "missing-clearance-packet.json")],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )

        self.assertEqual(result.returncode, 2)
        self.assertIn("missing_clearance_packet", result.stdout)

    def test_contract_is_linked_from_active_index_and_queue(self):
        rel = str(CONTRACT_JSON.relative_to(ROOT))
        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        queue = json.loads(QUEUE_JSON.read_text(encoding="utf-8"))

        self.assertIn(rel, index["source_files"])
        self.assertIn(rel, queue["source_indexes"])
        recheck_item = next(item for item in queue["items"] if item["id"] == "ACTIVE-GOAL-BLOCKER-RECHECK")
        self.assertIn(rel, recheck_item["evidence"])

    def test_markdown_contract_states_single_blocker_and_non_action_boundary(self):
        text = CONTRACT_DOC.read_text(encoding="utf-8")
        required = [
            "ACTIVE_GOAL_BLOCKER_CLEARANCE_VALIDATOR_LOCAL_ONLY",
            "This validator does not clear any blocker by itself.",
            "clearance_scope=single_blocker_only",
            "claims_goal_complete=false",
            "No deploy, push, cloud mutation, customer send, secret read, paid/provider call, runtime queue execution, merge script, install, or migration is authorized.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
