"""Active-goal local evidence durability manifest guardrails."""
import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST_JSON = (
    ROOT
    / "WORKSPACE_SCAFFOLD"
    / "manifests"
    / "active_goal_local_evidence_durability_2026-06-29.json"
)
MANIFEST_DOC = (
    ROOT
    / "docs"
    / "knowledge"
    / "SIRINX_ACTIVE_GOAL_LOCAL_EVIDENCE_DURABILITY_MANIFEST_2026-06-29.md"
)
ACTIVE_INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
ACTIVE_INDEX_DOC = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_SYSTEMATIC_WORK_INDEX_2026-06-29.md"
QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
QUEUE_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_EXECUTION_QUEUE_2026-06-29.md"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
HERMES_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"


class ActiveGoalLocalEvidenceDurabilityManifestTests(unittest.TestCase):
    """Ensure ignored local pathspec artifacts remain explicitly auditable."""

    def load_manifest(self):
        self.assertTrue(MANIFEST_JSON.exists(), f"Missing durability manifest JSON: {MANIFEST_JSON}")
        return json.loads(MANIFEST_JSON.read_text(encoding="utf-8"))

    def test_manifest_files_exist_without_completion_claim(self):
        self.assertTrue(MANIFEST_JSON.exists(), f"Missing durability manifest JSON: {MANIFEST_JSON}")
        self.assertTrue(MANIFEST_DOC.exists(), f"Missing durability manifest doc: {MANIFEST_DOC}")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 packet exists unexpectedly")
        self.assertFalse(HERMES_DECISION.exists(), "Hermes decision exists unexpectedly")

    def test_manifest_preserves_local_only_boundary(self):
        manifest = self.load_manifest()

        self.assertEqual(manifest["schema"], "sirinx.active_goal.local_evidence_durability_manifest.v1")
        self.assertEqual(manifest["status"], "local_manifest_not_completion")
        self.assertEqual(manifest["evidence_boundary"], "local_evidence_only")
        self.assertTrue(manifest["data_pathspecs_ignored"])
        self.assertFalse(manifest["claims_all_chats_read"])
        self.assertFalse(manifest["lane2_authorized"])
        self.assertFalse(manifest["completion_claim"])

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
            self.assertFalse(manifest["blocked_actions"][action], f"{action} should remain false")

    def test_manifest_covers_current_ignored_pathspec_files(self):
        manifest = self.load_manifest()
        expected = sorted(str(path.relative_to(ROOT)) for path in (ROOT / "data" / "pathspecs").glob("*.json"))
        entries = manifest["ignored_pathspecs"]
        entry_paths = sorted(entry["path"] for entry in entries)

        self.assertEqual(entry_paths, expected)
        self.assertGreaterEqual(len(entries), 18)

        for entry in entries:
            path = ROOT / entry["path"]
            self.assertTrue(path.exists(), f"Missing local pathspec: {entry['path']}")
            self.assertEqual(entry["ignore_rule"], ".gitignore:31:data/")
            self.assertEqual(entry["state"], "local_ignored_present")
            self.assertTrue(entry["doc_mirror"].startswith("docs/knowledge/"))
            self.assertTrue((ROOT / entry["doc_mirror"]).exists(), f"Missing doc mirror: {entry['doc_mirror']}")

            result = subprocess.run(
                ["git", "check-ignore", "-v", entry["path"]],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, f"{entry['path']} should be ignored")
            self.assertIn(".gitignore:31:data/", result.stdout)

    def test_manifest_is_linked_from_queue_index_and_mission_control(self):
        manifest_path = str(MANIFEST_JSON.relative_to(ROOT))
        manifest_doc = str(MANIFEST_DOC.relative_to(ROOT))

        active_index = json.loads(ACTIVE_INDEX_JSON.read_text(encoding="utf-8"))
        queue = json.loads(QUEUE_JSON.read_text(encoding="utf-8"))

        self.assertIn(manifest_path, active_index["source_files"])
        durability_stream = next(item for item in active_index["workstreams"] if item["id"] == "local_evidence_durability")
        self.assertEqual(durability_stream["status"], "ignored_pathspecs_manifested")
        self.assertIn(manifest_path, durability_stream["evidence"])
        self.assertIn(manifest_doc, durability_stream["evidence"])

        self.assertIn(manifest_path, queue["source_indexes"])
        queue_item = next(item for item in queue["items"] if item["id"] == "LOCAL-EVIDENCE-DURABILITY")
        self.assertEqual(queue_item["status"], "done_local_manifest")
        self.assertIn(manifest_path, queue_item["evidence"])
        self.assertIn(manifest_doc, queue_item["evidence"])
        self.assertIn("force_add_ignored_data", queue_item["forbidden_actions"])

        for path in (ACTIVE_INDEX_DOC, QUEUE_DOC, MISSION_CONTROL):
            text = path.read_text(encoding="utf-8")
            self.assertIn(manifest_path, text, f"{path} does not link manifest JSON")
            self.assertIn(manifest_doc, text, f"{path} does not link manifest doc")

    def test_markdown_manifest_states_ignored_local_evidence_boundary(self):
        self.assertTrue(MANIFEST_DOC.exists(), f"Missing durability manifest doc: {MANIFEST_DOC}")
        text = MANIFEST_DOC.read_text(encoding="utf-8")
        required = [
            "ACTIVE_GOAL_LOCAL_EVIDENCE_DURABILITY_MANIFEST_NOT_COMPLETE",
            "data_pathspecs_ignored=true",
            "local_evidence_only",
            "claims_all_chats_read=false",
            "lane2_authorized=false",
            "completion_claim=false",
            ".gitignore:31:data/",
            "data/pathspecs/sirinx_active_goal_systematic_work_index_2026-06-29.json",
            "data/pathspecs/sirinx_codex_hermes_execution_queue_2026-06-29.json",
            "data/pathspecs/ghostclaw_lane1_hermes_model_choice_boundary_2026-06-29.json",
            "No force-add of ignored data.",
            "No deploy.",
            "No push.",
            "No provider call.",
            "No runtime queue execution.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
