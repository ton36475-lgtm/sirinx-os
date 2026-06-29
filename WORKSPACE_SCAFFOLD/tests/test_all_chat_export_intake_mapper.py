"""Metadata-only all-chat export intake mapper guardrails."""
import hashlib
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAPPER_SCRIPT = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "build_all_chat_export_intake_map.py"
MAPPER_JSON = ROOT / "data" / "pathspecs" / "sirinx_all_chat_export_intake_mapper_2026-06-29.json"
MAPPER_DOC = ROOT / "docs" / "knowledge" / "SIRINX_ALL_CHAT_EXPORT_INTAKE_MAPPER_2026-06-29.md"
ACTIVE_INDEX = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
EXECUTION_QUEUE = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


class AllChatExportIntakeMapperTests(unittest.TestCase):
    """Ensure future export parsing writes routing metadata, not chat bodies."""

    def load_mapper_module(self):
        self.assertTrue(MAPPER_SCRIPT.exists(), f"Missing mapper script: {MAPPER_SCRIPT}")
        spec = importlib.util.spec_from_file_location("build_all_chat_export_intake_map", MAPPER_SCRIPT)
        module = importlib.util.module_from_spec(spec)
        self.assertIsNotNone(spec.loader)
        spec.loader.exec_module(module)
        return module

    def write_synthetic_export(self, directory):
        export_path = directory / "conversations.json"
        export = [
            {
                "id": "conv-lane1-secret-001",
                "title": "Hermes packet_013 decision customer@example.com",
                "mapping": {
                    "node-1": {
                        "message": {
                            "content": {
                                "parts": [
                                    "full secret transcript PRIVATE_TOKEN_VALUE LANE_1 Opus packet_013 Hermes decision",
                                ],
                            },
                        },
                    },
                },
            },
            {
                "id": "conv-v33-002",
                "title": "ghostclaw_repo_merge_kit_v3_3.zip staging merge kit",
                "messages": [
                    {
                        "content": "v3.3 merge kit policy bundle and staging-only preflight",
                    },
                ],
            },
            {
                "id": "conv-r0-003",
                "title": "R0 approval and testnet gate",
                "messages": [
                    {
                        "content": "R0 testnet approval packet with deploy blocked until gate-specific approval",
                    },
                ],
            },
            {
                "id": "conv-all-chat-004",
                "title": "ChatGPT export all chats intake",
                "messages": [
                    {
                        "content": "all chats export should map source metadata only",
                    },
                ],
            },
            {
                "id": "conv-general-005",
                "title": "General planning thread",
                "messages": [
                    {
                        "content": "unclassified local note for future human review",
                    },
                ],
            },
        ]
        export_path.write_text(json.dumps(export), encoding="utf-8")
        return export_path

    def test_mapper_contract_files_exist_and_preserve_no_export_claim(self):
        self.assertTrue(MAPPER_SCRIPT.exists(), f"Missing mapper script: {MAPPER_SCRIPT}")
        self.assertTrue(MAPPER_JSON.exists(), f"Missing mapper contract: {MAPPER_JSON}")
        self.assertTrue(MAPPER_DOC.exists(), f"Missing mapper doc: {MAPPER_DOC}")

        mapper = load_json(MAPPER_JSON)
        self.assertEqual(mapper["schema"], "sirinx.all_chat_export.intake_mapper.v1")
        self.assertEqual(mapper["status"], "mapper_ready_no_export_loaded")
        self.assertFalse(mapper["claims_all_chats_read"])
        self.assertFalse(mapper["raw_chat_content_stored"])
        self.assertFalse(mapper["real_export_loaded"])
        for flag in (
            "provider_call",
            "external_upload",
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "runtime_queue_execution",
        ):
            self.assertFalse(mapper["safety_flags"][flag], f"{flag} should remain false")

    def test_mapper_doc_states_fail_closed_boundary(self):
        self.assertTrue(MAPPER_DOC.exists(), f"Missing mapper doc: {MAPPER_DOC}")
        text = MAPPER_DOC.read_text(encoding="utf-8")
        required = [
            "ALL_CHAT_EXPORT_INTAKE_MAPPER_READY_NO_EXPORT_LOADED",
            "This mapper does not claim all chats were read.",
            "No raw chat content is written.",
            "provider_call=false",
            "external_upload=false",
            "runtime_queue_execution=false",
            "deploy=false",
            "push=false",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])

    def test_builds_redacted_map_from_synthetic_export(self):
        module = self.load_mapper_module()
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            export_path = self.write_synthetic_export(tmp_path)
            result = module.build_intake_map(
                export_path=export_path,
                source_id="synthetic-chatgpt-export",
                source_kind="chatgpt_export",
                repo=str(ROOT),
            )

        self.assertEqual(result["schema"], "sirinx.all_chat_export.intake_map.v1")
        self.assertFalse(result["claims_all_chats_read"])
        self.assertFalse(result["raw_chat_content_stored"])
        self.assertEqual(len(result["records"]), 5)

        by_id = {record["source_id"]: record for record in result["records"]}
        lane1 = by_id["synthetic-chatgpt-export:0001"]
        expected_hash = hashlib.sha256("conv-lane1-secret-001".encode("utf-8")).hexdigest()
        self.assertEqual(lane1["conversation_id_hash"], expected_hash)
        self.assertEqual(lane1["title_redacted"], "[REDACTED_TITLE]")
        self.assertIn("BLOCK-LANE1-OPUS-PACKET", lane1["blockers"])
        self.assertIn(
            "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_PACKET013_DECISION_WORKBENCH_2026-06-29.md",
            lane1["paths"],
        )

        v33 = by_id["synthetic-chatgpt-export:0002"]
        self.assertIn("BLOCK-V3-3-ARTIFACT", v33["blockers"])
        r0 = by_id["synthetic-chatgpt-export:0003"]
        self.assertIn("BLOCK-R0-APPROVALS", r0["blockers"])
        self.assertIn("docs/knowledge/SIRINX_R0_GATE_SPECIFIC_APPROVAL_CONTRACT_2026-06-29.md", r0["paths"])
        all_chat = by_id["synthetic-chatgpt-export:0004"]
        self.assertIn("BLOCK-CHAT-EXPORT", all_chat["blockers"])
        general = by_id["synthetic-chatgpt-export:0005"]
        self.assertEqual(general["status"], "needs_human_review")
        self.assertEqual(general["confidence"], "low")

        serialized = json.dumps(result)
        for forbidden in ("PRIVATE_TOKEN_VALUE", "full secret transcript", "customer@example.com"):
            self.assertNotIn(forbidden, serialized)

    def test_cli_missing_export_fails_closed(self):
        result = subprocess.run(
            [
                sys.executable,
                str(MAPPER_SCRIPT),
                "--export",
                str(ROOT / "missing-chatgpt-export.json"),
                "--source-id",
                "missing",
                "--repo",
                str(ROOT),
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("missing_export_file", result.stderr)

    def test_active_indexes_link_mapper_contract(self):
        active = load_json(ACTIVE_INDEX)
        queue = load_json(EXECUTION_QUEUE)
        mapper_path = "data/pathspecs/sirinx_all_chat_export_intake_mapper_2026-06-29.json"
        mapper_doc = "docs/knowledge/SIRINX_ALL_CHAT_EXPORT_INTAKE_MAPPER_2026-06-29.md"

        self.assertIn(mapper_path, active["source_files"])
        all_chat_workstream = next(item for item in active["workstreams"] if item["id"] == "all_chat_consolidation")
        self.assertIn(mapper_path, all_chat_workstream["evidence"])
        self.assertIn(mapper_doc, all_chat_workstream["evidence"])

        self.assertIn(mapper_path, queue["source_indexes"])
        queue_item = next(item for item in queue["items"] if item["id"] == "ALL-CHAT-EXPORT-INTAKE")
        self.assertIn(mapper_path, queue_item["evidence"])
        self.assertIn(mapper_doc, queue_item["evidence"])


if __name__ == "__main__":
    unittest.main()
