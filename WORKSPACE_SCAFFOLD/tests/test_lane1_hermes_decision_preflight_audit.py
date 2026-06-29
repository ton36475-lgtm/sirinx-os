"""GhostClaw LANE_1 Hermes decision preflight audit guardrails."""
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "build_lane1_hermes_decision_preflight_audit.py"
AUDIT_JSON = ROOT / "data" / "pathspecs" / "ghostclaw_lane1_hermes_decision_preflight_audit_2026-06-29.json"
AUDIT_DOC = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_PREFLIGHT_AUDIT_2026-06-29.md"
PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_017_ghostclaw_lane1_hermes_decision_preflight_audit.json"
QUEUE_STATUS_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_a2a_queue_status_2026-06-29.json"
QUEUE_STATUS_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_A2A_QUEUE_STATUS_2026-06-29.md"
EXECUTION_QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
ACTIVE_INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
CONTEXT_REGISTRY_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_context_packet_registry_2026-06-29.json"
MANIFEST_JSON = ROOT / "WORKSPACE_SCAFFOLD" / "manifests" / "active_goal_local_evidence_durability_2026-06-29.json"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
HERMES_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"


def load_preflight_module():
    spec = importlib.util.spec_from_file_location("lane1_hermes_decision_preflight_audit", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Lane1HermesDecisionPreflightAuditTests(unittest.TestCase):
    """Ensure the preflight audit helps Hermes review without creating a decision."""

    def load_audit(self):
        self.assertTrue(AUDIT_JSON.exists(), f"Missing preflight audit JSON: {AUDIT_JSON}")
        return json.loads(AUDIT_JSON.read_text(encoding="utf-8"))

    def load_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing preflight audit outbox packet: {PACKET}")
        return json.loads(PACKET.read_text(encoding="utf-8"))

    def test_artifacts_exist_without_decision_or_final_packet(self):
        self.assertTrue(SCRIPT.exists(), f"Missing preflight audit builder: {SCRIPT}")
        self.assertTrue(AUDIT_JSON.exists(), f"Missing preflight audit JSON: {AUDIT_JSON}")
        self.assertTrue(AUDIT_DOC.exists(), f"Missing preflight audit doc: {AUDIT_DOC}")
        self.assertTrue(PACKET.exists(), f"Missing preflight audit outbox packet: {PACKET}")
        self.assertFalse(HERMES_DECISION.exists(), "Hermes decision exists unexpectedly")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 Opus packet exists unexpectedly")

    def test_builder_reports_review_readiness_without_gate_clearance(self):
        module = load_preflight_module()
        audit = module.build_preflight_audit()

        self.assertEqual(audit["schema"], "ghostclaw.lane1.hermes_decision_preflight_audit.v1")
        self.assertEqual(audit["status"], "ready_for_hermes_decision_review_not_decision")
        self.assertEqual(audit["current_actionable_packet"], "packet_013")
        self.assertTrue(audit["review_evidence_complete"])
        self.assertEqual(audit["missing_review_evidence"], [])
        self.assertTrue(audit["ready_for_hermes_decision_review"])
        self.assertFalse(audit["decision_record"])
        self.assertFalse(audit["hermes_decision_recorded"])
        self.assertFalse(audit["codex_recorder_gate_open"])
        self.assertFalse(audit["ready_for_codex_recorder"])
        self.assertFalse(audit["lane2_authorized"])
        self.assertFalse(audit["ready_for_lane2"])
        self.assertIn("docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md", audit["missing_gate_artifacts"])
        self.assertIn("docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md", audit["missing_gate_artifacts"])
        self.assertEqual(
            audit["model_assistance_scope"],
            "any_model_allowed_for_vibe_coding_drafts_only_no_gate_approval",
        )

        for action in (
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "paid_provider_call",
            "provider_call",
            "runtime_queue_execution",
            "telegram_live_send",
            "external_message_send",
            "merge_script_execution",
            "install",
            "migration",
        ):
            self.assertFalse(audit["blocked_actions"][action], f"{action} should remain false")

    def test_preflight_packet_017_is_safe_outbox_only(self):
        audit = self.load_audit()
        packet = self.load_packet()

        self.assertEqual(packet["id"], "packet_017")
        self.assertEqual(packet["project"], "ghostclaw")
        self.assertEqual(packet["agent"], "codex")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertTrue(packet["approval_required"])
        self.assertEqual(packet["approval_scope"], "hermes_decision_review_only")
        self.assertEqual(packet["current_actionable_packet"], "packet_013")
        self.assertTrue(packet["ready_for_hermes_decision_review"])
        self.assertFalse(packet["decision_record"])
        self.assertFalse(packet["codex_recorder_gate_open"])
        self.assertFalse(packet["lane2_authorized"])
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertIn(str(AUDIT_JSON.relative_to(ROOT)), packet["input"])
        self.assertIn(str(AUDIT_DOC.relative_to(ROOT)), packet["input"])
        self.assertIn(str(PACKET.relative_to(ROOT)), packet["output"])
        self.assertEqual(audit["current_actionable_packet"], packet["current_actionable_packet"])
        self.assertIn("Preflight audit only", packet["notes"])

    def test_queue_status_indexes_packet_017_without_execution(self):
        status = json.loads(QUEUE_STATUS_JSON.read_text(encoding="utf-8"))

        self.assertEqual(
            status["packet_counts"],
            {
                "inbox": 5,
                "outbox": 14,
                "working": 1,
                "done": 8,
                "blocked": 0,
                "total": 28,
            },
        )
        packet = next(item for item in status["packets"] if item["id"] == "packet_017")
        self.assertEqual(packet["folder"], "outbox")
        self.assertEqual(packet["agent"], "codex")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["decision_record"])
        self.assertFalse(packet["lane2_authorized"])

        text = QUEUE_STATUS_DOC.read_text(encoding="utf-8")
        self.assertIn("packet_counts: inbox=5 outbox=14 working=1 done=8 blocked=0 total=28", text)
        self.assertIn(str(PACKET.relative_to(ROOT)), text)

    def test_status_surfaces_link_preflight_without_claiming_transition(self):
        rel_script = str(SCRIPT.relative_to(ROOT))
        rel_json = str(AUDIT_JSON.relative_to(ROOT))
        rel_doc = str(AUDIT_DOC.relative_to(ROOT))
        rel_packet = str(PACKET.relative_to(ROOT))

        execution_queue = json.loads(EXECUTION_QUEUE_JSON.read_text(encoding="utf-8"))
        active_index = json.loads(ACTIVE_INDEX_JSON.read_text(encoding="utf-8"))
        registry = json.loads(CONTEXT_REGISTRY_JSON.read_text(encoding="utf-8"))
        manifest = json.loads(MANIFEST_JSON.read_text(encoding="utf-8"))
        mission = MISSION_CONTROL.read_text(encoding="utf-8")

        self.assertIn(rel_json, execution_queue["source_indexes"])
        item = next(item for item in execution_queue["items"] if item["id"] == "LANE1-HERMES-DECISION-PREFLIGHT-PACKET-017")
        self.assertEqual(item["status"], "ready_for_hermes_decision_review_not_decision")
        self.assertEqual(item["current_actionable_packet"], "packet_013")
        self.assertFalse(item["lane2_authorized"])
        self.assertIn(rel_script, item["evidence"])
        self.assertIn(rel_json, item["evidence"])
        self.assertIn(rel_doc, item["evidence"])
        self.assertIn(rel_packet, item["evidence"])
        self.assertIn("decision_record", item["forbidden_actions"])
        self.assertIn("state_mutation", item["forbidden_actions"])

        stream = next(item for item in active_index["workstreams"] if item["id"] == "ghostclaw_lane1_hermes_decision_preflight_audit")
        self.assertEqual(stream["status"], "ready_for_hermes_decision_review_not_decision")
        self.assertIn(rel_json, stream["evidence"])
        self.assertIn(rel_packet, stream["evidence"])

        packet = next(item for item in registry["context_packets"] if item["id"] == "ctx-lane1-hermes-decision-preflight-audit")
        self.assertEqual(packet["source"], rel_json)
        self.assertEqual(packet["permission"], "local_read_only")
        self.assertEqual(packet["status"], "ready_for_hermes_decision_review_not_decision")

        manifest_paths = {entry["path"] for entry in manifest["ignored_pathspecs"]}
        self.assertIn(rel_json, manifest_paths)
        self.assertIn(rel_json, mission)
        self.assertIn(rel_packet, mission)
        self.assertIn("LANE1-HERMES-DECISION-PREFLIGHT-PACKET-017", mission)

    def test_markdown_states_non_actions_and_next_safe_step(self):
        text = AUDIT_DOC.read_text(encoding="utf-8")
        required = [
            "GHOSTCLAW_LANE1_HERMES_DECISION_PREFLIGHT_AUDIT_LOCAL_ONLY",
            "ready_for_hermes_decision_review=true",
            "decision_record=false",
            "hermes_decision_recorded=false",
            "codex_recorder_gate_open=false",
            "lane2_authorized=false",
            "ready_for_lane2=false",
            "any_model_allowed_for_vibe_coding_drafts_only_no_gate_approval",
            "No deploy, push, cloud mutation, customer send, secret read, paid/provider call,",
            "Hermes records a separate local decision artifact",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
