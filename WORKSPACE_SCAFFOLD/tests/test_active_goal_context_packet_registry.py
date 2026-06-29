"""Active-goal context packet registry guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGISTRY_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_context_packet_registry_2026-06-29.json"
REGISTRY_DOC = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_CONTEXT_PACKET_REGISTRY_2026-06-29.md"
INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"


class ActiveGoalContextPacketRegistryTests(unittest.TestCase):
    """Ensure source context is tracked with AGENTS.md context-engineering metadata."""

    def load_registry(self):
        self.assertTrue(REGISTRY_JSON.exists(), f"Missing context packet registry JSON: {REGISTRY_JSON}")
        return json.loads(REGISTRY_JSON.read_text(encoding="utf-8"))

    def test_registry_files_exist(self):
        self.assertTrue(REGISTRY_JSON.exists(), f"Missing context packet registry JSON: {REGISTRY_JSON}")
        self.assertTrue(REGISTRY_DOC.exists(), f"Missing context packet registry doc: {REGISTRY_DOC}")

    def test_registry_preserves_local_only_and_non_completion_boundary(self):
        registry = self.load_registry()

        self.assertEqual(registry["schema"], "sirinx.active_goal.context_packet_registry.v1")
        self.assertEqual(registry["status"], "active_local_context_registry")
        self.assertEqual(registry["evidence_boundary"], "local_evidence_only")
        self.assertFalse(registry["claims_goal_complete"])
        self.assertFalse(registry["claims_all_chats_read"])
        self.assertFalse(registry["external_action_authorized"])

    def test_registry_has_required_context_packet_fields(self):
        registry = self.load_registry()
        required_fields = {
            "id",
            "source",
            "owner",
            "freshness",
            "permission",
            "confidence",
            "relevance",
            "expiry",
            "status",
            "next_safe_action",
        }

        packets = registry["context_packets"]
        self.assertGreaterEqual(len(packets), 10)
        for packet in packets:
            self.assertTrue(required_fields.issubset(packet), f"Missing context fields in {packet.get('id')}")
            self.assertIn(packet["permission"], {"local_read_only", "operator_required", "blocked"})
            self.assertIn(packet["confidence"], {"high", "medium", "low"})

    def test_registry_covers_core_active_goal_sources(self):
        registry = self.load_registry()
        sources = {packet["source"] for packet in registry["context_packets"]}

        for source in (
            "AGENTS.md",
            "PROJECT_STATE.md",
            "NEXT_ACTIONS.md",
            "data/pathspecs/sirinx_active_goal_systematic_work_index_2026-06-29.json",
            "data/pathspecs/sirinx_codex_hermes_execution_queue_2026-06-29.json",
            "data/pathspecs/sirinx_active_goal_blocker_recheck_2026-06-29.json",
            "WORKSPACE_SCAFFOLD/scripts/probe_active_goal_blockers.py",
            "docs/knowledge/SIRINX_ACTIVE_GOAL_COMPLETION_AUDIT_2026-06-29.md",
            "/Users/sirinx/project-hermes/HERMES_AGENT_CODEX_CONTINUATION_BOARD_2026-05-30.md",
            "/Users/sirinx/Documents/Obsidian Vault/SIRINX/AI HQ Knowledge Digest.md",
        ):
            self.assertIn(source, sources)

    def test_registry_is_linked_from_index_and_queue(self):
        self.assertTrue(INDEX_JSON.exists(), f"Missing index JSON: {INDEX_JSON}")
        self.assertTrue(QUEUE_JSON.exists(), f"Missing queue JSON: {QUEUE_JSON}")
        rel = str(REGISTRY_JSON.relative_to(ROOT))
        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        queue = json.loads(QUEUE_JSON.read_text(encoding="utf-8"))

        self.assertIn(rel, index["source_files"])
        self.assertIn(rel, queue["source_indexes"])

    def test_markdown_registry_states_required_boundary(self):
        text = REGISTRY_DOC.read_text(encoding="utf-8")
        required = [
            "ACTIVE_GOAL_CONTEXT_PACKET_REGISTRY_LOCAL_ONLY",
            "claims_goal_complete=false",
            "claims_all_chats_read=false",
            "source | owner | freshness | permission | confidence | relevance | expiry",
            "No deploy, push, cloud mutation, customer send, secret read, provider call, runtime queue execution, merge script, install, or migration was performed.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
