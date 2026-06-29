"""GhostClaw LANE_1 Opus packet authoring bundle guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUNDLE_JSON = ROOT / "data" / "pathspecs" / "ghostclaw_lane1_opus_authoring_bundle_2026-06-29.json"
BUNDLE_DOC = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_AUTHORING_BUNDLE_2026-06-29.md"
PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_019_ghostclaw_lane1_opus_authoring_bundle.json"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
HERMES_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"
QUEUE_STATUS_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_a2a_queue_status_2026-06-29.json"
QUEUE_STATUS_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_A2A_QUEUE_STATUS_2026-06-29.md"
EXECUTION_QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
ACTIVE_INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
CONTEXT_REGISTRY_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_context_packet_registry_2026-06-29.json"
MANIFEST_JSON = ROOT / "WORKSPACE_SCAFFOLD" / "manifests" / "active_goal_local_evidence_durability_2026-06-29.json"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"


class Lane1OpusAuthoringBundleTests(unittest.TestCase):
    """Ensure packet_019 helps Hermes/Opus author the final packet without becoming it."""

    def load_bundle(self):
        self.assertTrue(BUNDLE_JSON.exists(), f"Missing authoring bundle JSON: {BUNDLE_JSON}")
        return json.loads(BUNDLE_JSON.read_text(encoding="utf-8"))

    def load_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet_019: {PACKET}")
        return json.loads(PACKET.read_text(encoding="utf-8"))

    def test_bundle_artifacts_exist_without_final_packet_or_decision(self):
        self.assertTrue(BUNDLE_JSON.exists(), f"Missing authoring bundle JSON: {BUNDLE_JSON}")
        self.assertTrue(BUNDLE_DOC.exists(), f"Missing authoring bundle doc: {BUNDLE_DOC}")
        self.assertTrue(PACKET.exists(), f"Missing authoring bundle packet: {PACKET}")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 Opus packet exists unexpectedly")
        self.assertFalse(HERMES_DECISION.exists(), "Hermes decision exists unexpectedly")

    def test_bundle_is_authoring_input_not_final_packet_or_decision(self):
        bundle = self.load_bundle()

        self.assertEqual(bundle["schema"], "ghostclaw.lane1.opus_authoring_bundle.v1")
        self.assertEqual(bundle["status"], "authoring_bundle_ready_not_final_packet")
        self.assertEqual(bundle["current_actionable_packet"], "packet_013")
        self.assertEqual(bundle["next_outbox_packet"], "packet_019")
        self.assertFalse(bundle["final_packet_record"])
        self.assertFalse(bundle["decision_record"])
        self.assertFalse(bundle["lane2_authorized"])
        self.assertFalse(bundle["provider_call"])
        self.assertFalse(bundle["runtime_queue_execution"])
        self.assertEqual(bundle["final_packet_path"], str(FINAL_PACKET.relative_to(ROOT)))
        self.assertEqual(bundle["decision_path"], str(HERMES_DECISION.relative_to(ROOT)))
        self.assertIn("GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET_FINAL", bundle["required_final_packet_marker"])
        self.assertIn("Hermes Review Decision", bundle["required_sections"])
        self.assertIn("reviewed_evidence_paths", bundle["required_fields"])

        for action in (
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "paid_provider_call",
            "provider_call",
            "runtime_queue_execution",
            "merge_script_execution",
            "install",
            "migration",
            "final_packet_creation",
            "decision_record",
            "state_mutation",
        ):
            self.assertIn(action, bundle["forbidden_actions"])

    def test_bundle_collects_hermes_opus_authoring_inputs(self):
        bundle = self.load_bundle()
        evidence = set(bundle["evidence_paths"])

        required_evidence = {
            "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_ARCHITECTURE_PACKET_DRAFT_FOR_HERMES_REVIEW_2026-06-29.md",
            "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_PREFLIGHT_AUDIT_2026-06-29.md",
            "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET_GATE_2026-06-29.md",
            "data/pathspecs/ghostclaw_lane1_opus_architecture_packet_gate_2026-06-29.json",
            "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_MODEL_CHOICE_BOUNDARY_2026-06-29.md",
            "docs/knowledge/SIRINX_R0_GATE_SPECIFIC_APPROVAL_CONTRACT_2026-06-29.md",
            "docs/knowledge/SIRINX_ACTIVE_GOAL_COMPLETION_REQUIREMENTS_MATRIX_2026-06-29.md",
            "docs/knowledge/SIRINX_CODEX_HERMES_EXECUTION_QUEUE_2026-06-29.md",
        }
        self.assertTrue(required_evidence.issubset(evidence))
        self.assertEqual(bundle["allowed_model_use"], "draft_assistance_only")
        self.assertEqual(bundle["delivery_mode"], "local_file_bus_outbox_only")
        self.assertIn("No-Ask is not Approve-All", bundle["authoring_prompt"])

    def test_packet_019_is_safe_outbox_only(self):
        bundle = self.load_bundle()
        packet = self.load_packet()

        self.assertEqual(packet["id"], "packet_019")
        self.assertEqual(packet["project"], "ghostclaw")
        self.assertEqual(packet["agent"], "codex")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertTrue(packet["approval_required"])
        self.assertEqual(packet["approval_scope"], "opus_authoring_bundle_review_only")
        self.assertEqual(packet["current_actionable_packet"], "packet_013")
        self.assertFalse(packet["final_packet_record"])
        self.assertFalse(packet["decision_record"])
        self.assertFalse(packet["lane2_authorized"])
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertIn(str(BUNDLE_JSON.relative_to(ROOT)), packet["input"])
        self.assertIn(str(BUNDLE_DOC.relative_to(ROOT)), packet["input"])
        self.assertIn(str(PACKET.relative_to(ROOT)), packet["output"])
        self.assertEqual(bundle["next_outbox_packet"], packet["id"])

    def test_queue_status_indexes_packet_019_without_execution(self):
        status = json.loads(QUEUE_STATUS_JSON.read_text(encoding="utf-8"))

        self.assertEqual(
            status["packet_counts"],
            {
                "inbox": 4,
                "outbox": 11,
                "working": 1,
                "done": 8,
                "blocked": 0,
                "total": 24,
            },
        )
        packet = next(item for item in status["packets"] if item["id"] == "packet_019")
        self.assertEqual(packet["folder"], "outbox")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["decision_record"])
        self.assertFalse(packet["final_packet_record"])
        self.assertFalse(packet["lane2_authorized"])

        text = QUEUE_STATUS_DOC.read_text(encoding="utf-8")
        self.assertIn("packet_counts: inbox=4 outbox=11 working=1 done=8 blocked=0 total=24", text)
        self.assertIn(str(PACKET.relative_to(ROOT)), text)

    def test_status_surfaces_link_authoring_bundle(self):
        rel_json = str(BUNDLE_JSON.relative_to(ROOT))
        rel_doc = str(BUNDLE_DOC.relative_to(ROOT))
        rel_packet = str(PACKET.relative_to(ROOT))

        execution_queue = json.loads(EXECUTION_QUEUE_JSON.read_text(encoding="utf-8"))
        active_index = json.loads(ACTIVE_INDEX_JSON.read_text(encoding="utf-8"))
        registry = json.loads(CONTEXT_REGISTRY_JSON.read_text(encoding="utf-8"))
        manifest = json.loads(MANIFEST_JSON.read_text(encoding="utf-8"))
        mission = MISSION_CONTROL.read_text(encoding="utf-8")

        self.assertIn(rel_json, execution_queue["source_indexes"])
        item = next(item for item in execution_queue["items"] if item["id"] == "LANE1-OPUS-AUTHORING-BUNDLE-PACKET-019")
        self.assertEqual(item["status"], "authoring_bundle_ready_not_final_packet")
        self.assertEqual(item["current_actionable_packet"], "packet_013")
        self.assertFalse(item["lane2_authorized"])
        self.assertIn(rel_json, item["evidence"])
        self.assertIn(rel_doc, item["evidence"])
        self.assertIn(rel_packet, item["evidence"])
        self.assertIn("final_packet_creation", item["forbidden_actions"])
        self.assertIn("decision_record", item["forbidden_actions"])

        stream = next(item for item in active_index["workstreams"] if item["id"] == "ghostclaw_lane1_opus_authoring_bundle")
        self.assertEqual(stream["status"], "authoring_bundle_ready_not_final_packet")
        self.assertIn(rel_json, stream["evidence"])
        self.assertIn(rel_packet, stream["evidence"])

        packet = next(item for item in registry["context_packets"] if item["id"] == "ctx-ghostclaw-lane1-opus-authoring-bundle")
        self.assertEqual(packet["source"], rel_json)
        self.assertEqual(packet["status"], "authoring_bundle_ready_not_final_packet")
        self.assertEqual(packet["permission"], "local_read_only")

        manifest_paths = {entry["path"] for entry in manifest["ignored_pathspecs"]}
        self.assertIn(rel_json, manifest_paths)
        self.assertIn(rel_json, mission)
        self.assertIn(rel_doc, mission)

    def test_markdown_bundle_states_no_action_boundary(self):
        text = BUNDLE_DOC.read_text(encoding="utf-8")
        required = [
            "GHOSTCLAW_LANE1_OPUS_AUTHORING_BUNDLE_LOCAL_ONLY",
            "status=authoring_bundle_ready_not_final_packet",
            "current_actionable_packet=packet_013",
            "final_packet_record=false",
            "decision_record=false",
            "lane2_authorized=false",
            "provider_call=false",
            "runtime_queue_execution=false",
            "No-Ask is not Approve-All",
            "This is not the final Opus packet",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
