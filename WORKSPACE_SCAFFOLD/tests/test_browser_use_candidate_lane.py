"""Browser Use candidate lane guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STATUS_JSON = ROOT / "data" / "pathspecs" / "sirinx_browser_use_candidate_lane_2026-06-29.json"
STATUS_DOC = ROOT / "docs" / "knowledge" / "SIRINX_BROWSER_USE_CANDIDATE_LANE_2026-06-29.md"
PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_025_sirinx_browser_use_candidate_lane.json"
QUEUE_STATUS_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_a2a_queue_status_2026-06-29.json"
EXECUTION_QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
ACTIVE_INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
CONTEXT_REGISTRY_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_context_packet_registry_2026-06-29.json"
MANIFEST_JSON = ROOT / "WORKSPACE_SCAFFOLD" / "manifests" / "active_goal_local_evidence_durability_2026-06-29.json"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"


class BrowserUseCandidateLaneTests(unittest.TestCase):
    """Ensure Browser Use is captured as a safe candidate lane, not executed."""

    def load_status(self):
        self.assertTrue(STATUS_JSON.exists(), f"Missing Browser Use lane JSON: {STATUS_JSON}")
        return json.loads(STATUS_JSON.read_text(encoding="utf-8"))

    def load_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet_025: {PACKET}")
        return json.loads(PACKET.read_text(encoding="utf-8"))

    def test_artifacts_exist_without_install_or_browser_execution(self):
        self.assertTrue(STATUS_JSON.exists(), f"Missing Browser Use lane JSON: {STATUS_JSON}")
        self.assertTrue(STATUS_DOC.exists(), f"Missing Browser Use lane doc: {STATUS_DOC}")
        self.assertTrue(PACKET.exists(), f"Missing Browser Use packet: {PACKET}")

    def test_status_records_browser_use_source_and_blocks_risky_modes(self):
        status = self.load_status()

        self.assertEqual(status["schema"], "sirinx.browser_use.candidate_lane.v1")
        self.assertEqual(status["status"], "browser_use_candidate_lane_ready_local_only")
        self.assertEqual(status["evidence_boundary"], "public_repo_metadata_and_local_policy_only")
        self.assertEqual(status["next_outbox_packet"], "packet_025")
        self.assertEqual(status["candidate_repo"]["full_name"], "browser-use/browser-use")
        self.assertEqual(status["candidate_repo"]["license"], "MIT")
        self.assertIn("https://github.com/browser-use/browser-use", status["source_urls"])
        self.assertIn("https://raw.githubusercontent.com/browser-use/browser-use/main/skills/browser-use/SKILL.md", status["source_urls"])

        self.assertFalse(status["install_performed"])
        self.assertFalse(status["browser_execution"])
        self.assertFalse(status["cloud_browser_use"])
        self.assertFalse(status["profile_sync"])
        self.assertFalse(status["cookie_access"])
        self.assertFalse(status["provider_call"])
        self.assertFalse(status["paid_provider_call"])
        self.assertFalse(status["external_message_send"])
        self.assertFalse(status["secret_read"])

        for action in (
            "install_browser_use",
            "browser_use_cloud",
            "profile_sync",
            "cookie_export",
            "real_chrome_profile",
            "form_submit",
            "transaction_confirm",
            "customer_send",
            "provider_call",
            "paid_provider_call",
            "secret_read",
            "tunnel",
        ):
            self.assertIn(action, status["blocked_actions"])

    def test_packet_025_is_outbox_review_only(self):
        packet = self.load_packet()

        self.assertEqual(packet["id"], "packet_025")
        self.assertEqual(packet["project"], "sirinx-browser-use")
        self.assertEqual(packet["agent"], "codex")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertEqual(packet["approval_scope"], "local_read_only_candidate_review")
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["browser_execution"])
        self.assertFalse(packet["install"])
        self.assertFalse(packet["cloud_mutation"])
        self.assertFalse(packet["secret_read"])
        self.assertIn(str(STATUS_JSON.relative_to(ROOT)), packet["input"])
        self.assertIn(str(STATUS_DOC.relative_to(ROOT)), packet["input"])
        self.assertIn(str(PACKET.relative_to(ROOT)), packet["output"])

    def test_queue_index_and_active_surfaces_include_packet_025_without_execution(self):
        rel_json = str(STATUS_JSON.relative_to(ROOT))
        rel_doc = str(STATUS_DOC.relative_to(ROOT))
        rel_packet = str(PACKET.relative_to(ROOT))

        queue_status = json.loads(QUEUE_STATUS_JSON.read_text(encoding="utf-8"))
        self.assertEqual(queue_status["packet_counts"]["outbox"], 34)
        self.assertEqual(queue_status["packet_counts"]["total"], 48)
        packet = next(item for item in queue_status["packets"] if item["id"] == "packet_025")
        self.assertEqual(packet["folder"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["secret_read"])

        execution_queue = json.loads(EXECUTION_QUEUE_JSON.read_text(encoding="utf-8"))
        queue_item = next(item for item in execution_queue["items"] if item["id"] == "BROWSER-USE-CANDIDATE-LANE-PACKET-025")
        self.assertEqual(queue_item["status"], "browser_use_candidate_lane_ready_local_only")
        self.assertIn(rel_json, queue_item["evidence"])
        self.assertIn(rel_doc, queue_item["evidence"])
        self.assertIn(rel_packet, queue_item["evidence"])
        self.assertIn("install", queue_item["forbidden_actions"])
        self.assertIn("browser_execution", queue_item["forbidden_actions"])
        self.assertIn("browser_use_cloud", queue_item["forbidden_actions"])

        active_index = json.loads(ACTIVE_INDEX_JSON.read_text(encoding="utf-8"))
        stream = next(item for item in active_index["workstreams"] if item["id"] == "browser_use_candidate_lane")
        self.assertEqual(stream["status"], "browser_use_candidate_lane_ready_local_only")
        self.assertIn(rel_packet, stream["evidence"])

        registry = json.loads(CONTEXT_REGISTRY_JSON.read_text(encoding="utf-8"))
        context_packet = next(item for item in registry["context_packets"] if item["id"] == "ctx-browser-use-candidate-lane")
        self.assertEqual(context_packet["source"], rel_json)
        self.assertEqual(context_packet["permission"], "public_metadata_and_local_read_only")
        self.assertEqual(context_packet["status"], "browser_use_candidate_lane_ready_local_only")

        manifest = json.loads(MANIFEST_JSON.read_text(encoding="utf-8"))
        manifest_paths = {entry["path"] for entry in manifest["ignored_pathspecs"]}
        self.assertIn(rel_json, manifest_paths)

        mission = MISSION_CONTROL.read_text(encoding="utf-8")
        self.assertIn("BROWSER-USE-CANDIDATE-LANE-PACKET-025", mission)
        self.assertIn(rel_doc, mission)

    def test_markdown_states_boundary_and_next_safe_steps(self):
        text = STATUS_DOC.read_text(encoding="utf-8")
        required = [
            "BROWSER_USE_CANDIDATE_LANE_LOCAL_ONLY",
            "status=browser_use_candidate_lane_ready_local_only",
            "next_outbox_packet=packet_025",
            "install_performed=false",
            "browser_execution=false",
            "cloud_browser_use=false",
            "profile_sync=false",
            "cookie_access=false",
            "provider_call=false",
            "No Browser Use package was installed.",
            "No browser automation command was executed.",
            "APPROVE_INSTALL_BROWSER_USE_SANDBOX",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
