"""All-chat export intake contract guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTRACT_JSON = ROOT / "data" / "pathspecs" / "sirinx_all_chat_export_intake_contract_2026-06-29.json"
CONTRACT_DOC = ROOT / "docs" / "knowledge" / "SIRINX_ALL_CHAT_EXPORT_INTAKE_CONTRACT_2026-06-29.md"


class AllChatExportIntakeContractTests(unittest.TestCase):
    """Ensure the all-chat intake contract prepares import work without storing chats."""

    def load_contract(self):
        self.assertTrue(CONTRACT_JSON.exists(), f"Missing JSON contract: {CONTRACT_JSON}")
        return json.loads(CONTRACT_JSON.read_text(encoding="utf-8"))

    def test_contract_files_exist(self):
        self.assertTrue(CONTRACT_JSON.exists(), f"Missing JSON contract: {CONTRACT_JSON}")
        self.assertTrue(CONTRACT_DOC.exists(), f"Missing Markdown contract: {CONTRACT_DOC}")

    def test_contract_preserves_non_claim_and_local_only_boundary(self):
        contract = self.load_contract()

        self.assertEqual(contract["schema"], "sirinx.all_chat_export.intake_contract.v1")
        self.assertEqual(contract["status"], "waiting_for_export")
        self.assertEqual(contract["evidence_boundary"], "no_export_loaded")
        self.assertFalse(contract["claims_all_chats_read"])
        self.assertFalse(contract["raw_chat_content_stored"])
        self.assertEqual(contract["next_safe_action"], "Operator provides ChatGPT export or connector-backed source")

    def test_contract_lists_allowed_sources_and_required_record_fields(self):
        contract = self.load_contract()

        self.assertEqual(contract["allowed_input_sources"], ["chatgpt_export", "connector_backed_source"])
        required_fields = set(contract["record_schema"]["required_fields"])
        self.assertTrue(
            {
                "source_id",
                "source_kind",
                "conversation_id_hash",
                "title_redacted",
                "source_path",
                "repo",
                "paths",
                "status",
                "blockers",
                "next_action",
                "evidence",
                "permission",
                "freshness",
                "confidence",
            }.issubset(required_fields),
        )

    def test_contract_forbids_sensitive_or_external_actions(self):
        contract = self.load_contract()
        flags = contract["safety_flags"]

        for flag in (
            "raw_chat_content_stored",
            "secrets_allowed",
            "provider_call",
            "external_upload",
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "runtime_queue_execution",
        ):
            self.assertFalse(flags[flag], f"{flag} should remain false")

    def test_contract_does_not_define_raw_message_fields(self):
        contract_text = json.dumps(self.load_contract()).lower()
        forbidden = ["raw_messages", "message_text", "transcript", "cookie", "token_value", "api_key"]
        leaked = [item for item in forbidden if item in contract_text]
        self.assertEqual(leaked, [])

    def test_markdown_contract_states_required_boundaries(self):
        self.assertTrue(CONTRACT_DOC.exists(), f"Missing Markdown contract: {CONTRACT_DOC}")
        text = CONTRACT_DOC.read_text(encoding="utf-8")
        required = [
            "ALL_CHAT_EXPORT_INTAKE_CONTRACT_LOCAL_ONLY",
            "claims_all_chats_read=false",
            "raw_chat_content_stored=false",
            "provider_call=false",
            "external_upload=false",
            "runtime_queue_execution=false",
            "This contract does not import any chat export.",
            "repo/path/status/blocker/next_action/source",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
