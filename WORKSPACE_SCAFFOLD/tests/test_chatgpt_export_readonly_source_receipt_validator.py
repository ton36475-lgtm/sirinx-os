"""ChatGPT export read-only source receipt validator guardrails."""
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "validate_chatgpt_export_readonly_source_receipt.py"
PATHSPEC = ROOT / "data" / "pathspecs" / "sirinx_chatgpt_export_readonly_source_receipt_validator_2026-07-02.json"
DOC = ROOT / "docs" / "knowledge" / "SIRINX_CHATGPT_EXPORT_READONLY_SOURCE_RECEIPT_VALIDATOR_2026-07-02.md"
PACKET_035 = ROOT / "_A2A_QUEUE" / "outbox" / "packet_035_active_goal_chat_export_readonly_mapping_gate_request.json"


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


class ChatgptExportReadonlySourceReceiptValidatorTests(unittest.TestCase):
    """Ensure receipt validation stays metadata-only and fail-closed."""

    def load_module(self):
        self.assertTrue(SCRIPT.exists(), f"Missing validator script: {SCRIPT}")
        spec = importlib.util.spec_from_file_location("validate_chatgpt_export_readonly_source_receipt", SCRIPT)
        module = importlib.util.module_from_spec(spec)
        self.assertIsNotNone(spec.loader)
        spec.loader.exec_module(module)
        return module

    def valid_receipt(self):
        return {
            "source_kind": "chatgpt_export",
            "local_path_or_connector_scope": "/Users/sirinx/local-only/conversations.json",
            "operator_supplied": True,
            "read_only": True,
            "source_hash_or_query_id": "sha256:synthetic-placeholder",
            "redaction_confirmed": True,
            "raw_chat_content_stored": False,
            "claims_all_chats_read": False,
            "connector_read_performed": False,
            "real_export_loaded": False,
            "external_upload": False,
            "provider_call": False,
            "runtime_queue_execution": False,
            "secret_read": False,
            "deploy": False,
            "push": False,
            "permission": "operator_supplied_local_readonly_receipt",
            "freshness": "operator_supplied_2026-07-02",
            "confidence": "medium",
            "approval_phrase": "APPROVE_CHATGPT_EXPORT_READONLY_MAPPING_local-only-conversations_2026-07-02",
        }

    def test_artifacts_exist_and_link_packet_035(self):
        self.assertTrue(SCRIPT.exists(), f"Missing validator script: {SCRIPT}")
        self.assertTrue(PATHSPEC.exists(), f"Missing validator pathspec: {PATHSPEC}")
        self.assertTrue(DOC.exists(), f"Missing validator doc: {DOC}")
        self.assertTrue(PACKET_035.exists(), f"Missing packet_035: {PACKET_035}")

        pathspec = load_json(PATHSPEC)
        self.assertEqual(pathspec["schema"], "sirinx.chatgpt_export.readonly_source_receipt_validator.v1")
        self.assertEqual(pathspec["status"], "validator_ready_no_export_loaded")
        self.assertEqual(pathspec["source_packet"], str(PACKET_035.relative_to(ROOT)))
        self.assertFalse(pathspec["source_loaded"])
        self.assertFalse(pathspec["connector_read_performed"])
        self.assertFalse(pathspec["raw_chat_content_stored"])
        self.assertFalse(pathspec["claims_all_chats_read"])

    def test_valid_receipt_metadata_passes_without_source_load(self):
        module = self.load_module()
        result = module.validate_receipt(self.valid_receipt())

        self.assertTrue(result["valid"])
        self.assertEqual(result["status"], "valid")
        self.assertEqual(result["errors"], [])
        self.assertFalse(result["source_loaded"])
        self.assertFalse(result["connector_read_performed"])
        self.assertFalse(result["raw_chat_content_stored"])
        self.assertFalse(result["claims_all_chats_read"])

    def test_rejects_raw_content_and_completion_claims(self):
        module = self.load_module()
        receipt = self.valid_receipt()
        receipt["claims_all_chats_read"] = True
        receipt["messages"] = [{"content": "raw transcript should not be in receipt"}]

        result = module.validate_receipt(receipt)

        self.assertFalse(result["valid"])
        self.assertIn("forbidden_true_flag:claims_all_chats_read", result["errors"])
        self.assertTrue(any(error.startswith("raw_content_field_not_allowed:$.messages") for error in result["errors"]))
        self.assertTrue(any(error.startswith("raw_content_field_not_allowed:$.messages[0].content") for error in result["errors"]))

    def test_rejects_placeholder_or_missing_approval_phrase(self):
        module = self.load_module()
        receipt = self.valid_receipt()
        receipt["approval_phrase"] = "APPROVE_CHATGPT_EXPORT_READONLY_MAPPING_<path>_<date>"

        result = module.validate_receipt(receipt)

        self.assertFalse(result["valid"])
        self.assertIn("approval_phrase_missing_or_invalid", result["errors"])

    def test_cli_missing_receipt_fails_closed(self):
        result = subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--receipt",
                str(ROOT / "missing-chatgpt-export-receipt.json"),
                "--json",
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )

        self.assertEqual(result.returncode, 2)
        payload = json.loads(result.stdout)
        self.assertFalse(payload["valid"])
        self.assertFalse(payload["source_loaded"])
        self.assertFalse(payload["connector_read_performed"])
        self.assertFalse(payload["raw_chat_content_stored"])
        self.assertFalse(payload["claims_all_chats_read"])
        self.assertTrue(payload["errors"][0].startswith("receipt_file_missing:"))

    def test_cli_valid_receipt_outputs_json_without_reading_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            receipt_path = Path(tmp) / "receipt.json"
            receipt_path.write_text(json.dumps(self.valid_receipt()), encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--receipt", str(receipt_path), "--json"],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )

        self.assertEqual(result.returncode, 0)
        payload = json.loads(result.stdout)
        self.assertTrue(payload["valid"])
        self.assertFalse(payload["source_loaded"])
        self.assertFalse(payload["connector_read_performed"])

    def test_doc_records_fail_closed_boundary(self):
        text = DOC.read_text(encoding="utf-8")
        required = [
            "VALIDATOR_READY_NO_EXPORT_LOADED",
            "approval_status=`not_granted`",
            "source_loaded=false",
            "connector_read_performed=false",
            "raw_chat_content_stored=false",
            "claims_all_chats_read=false",
            "provider_call=false",
            "runtime_queue_execution=false",
            "deploy=false",
            "push=false",
            "does not grant approval",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
