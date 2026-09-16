"""Active-goal blocker refresh Hermes handoff guardrails."""
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_033_active_goal_blocker_refresh_hermes_handoff.json"
DOC = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_BLOCKER_REFRESH_HERMES_HANDOFF_2026-07-02.md"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
QUEUE_STATUS_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_a2a_queue_status_2026-06-29.json"
QUEUE_STATUS_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_A2A_QUEUE_STATUS_2026-06-29.md"
EXECUTION_QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
ACTIVE_INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
ACTIVE_INDEX_DOC = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_SYSTEMATIC_WORK_INDEX_2026-06-29.md"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"


class ActiveGoalBlockerRefreshHermesHandoffPacketTests(unittest.TestCase):
    """Ensure packet_033 is handoff-only and keeps all completion blockers open."""

    def load_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet_033: {PACKET}")
        return json.loads(PACKET.read_text(encoding="utf-8"))

    def test_packet_artifacts_exist_without_final_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet_033: {PACKET}")
        self.assertTrue(DOC.exists(), f"Missing packet_033 doc: {DOC}")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 Opus packet exists unexpectedly")

    def test_packet_033_is_review_only_not_execution_or_approval(self):
        packet = self.load_packet()

        self.assertEqual(packet["id"], "packet_033")
        self.assertEqual(packet["project"], "ghostclaw")
        self.assertEqual(packet["agent"], "codex")
        self.assertEqual(packet["to_agent"], "hermes_kob")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertEqual(packet["approval_scope"], "review_only_no_execution")
        self.assertEqual(packet["dispatch_mode"], "dry_run_review_only")
        self.assertEqual(packet["current_actionable_packet"], "packet_013")
        self.assertEqual(packet["handoff_source"], "active_goal_current_blocker_refresh")
        self.assertTrue(packet["hermes_decision_recorded"])
        self.assertTrue(packet["packet_032_sync_receipt_present"])
        self.assertFalse(packet["approval_required"])
        self.assertTrue(packet["execution_approval_required"])
        self.assertTrue(packet["dry_run"])
        self.assertTrue(packet["not_approval"])
        self.assertFalse(packet["final_lane1_packet_present"])
        self.assertFalse(packet["final_packet_record"])
        self.assertFalse(packet["decision_record"])
        self.assertFalse(packet["lane2_authorized"])

        for field in (
            "runtime_queue_execution",
            "provider_call",
            "paid_provider_call",
            "real_mcp_execution",
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "external_message_send",
            "telegram_live_send",
            "line_send",
            "line_webhook_activation",
            "production_analytics",
            "crm_customer_data_storage",
            "database_write",
            "database_migration",
            "dependency_install",
            "public_tunnel",
            "service_repair",
            "service_restart",
            "state_mutation",
        ):
            self.assertFalse(packet[field], f"{field} should remain false")

    def test_packet_links_current_blocker_evidence_and_required_future_outputs(self):
        packet = self.load_packet()

        self.assertEqual(
            packet["completion_blockers"],
            [
                "BLOCK-CHAT-EXPORT",
                "BLOCK-LANE1-OPUS-PACKET",
                "BLOCK-HERMES-GATEWAY",
                "BLOCK-V3-3-ARTIFACT",
                "BLOCK-R0-APPROVALS",
            ],
        )
        for rel_path in (
            "data/pathspecs/sirinx_active_goal_current_blocker_refresh_2026-06-29.json",
            "docs/knowledge/SIRINX_ACTIVE_GOAL_CURRENT_BLOCKER_REFRESH_2026-06-29.md",
            "docs/knowledge/SIRINX_ACTIVE_GOAL_COMPLETION_AUDIT_2026-06-29.md",
            "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_PACKET032_A2A_SYNC_RECEIPT_2026-07-02.md",
            "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_FINAL_PACKET_AUTHORING_REQUEST_2026-07-02.md",
            "_A2A_QUEUE/outbox/packet_032_ghostclaw_lane1_opus_final_packet_authoring_request.json",
            ".hermes/logs/night-watch-latest.md",
        ):
            self.assertIn(rel_path, packet["input"])

        self.assertIn(str(DOC.relative_to(ROOT)), packet["output"])
        self.assertIn(str(PACKET.relative_to(ROOT)), packet["output"])
        self.assertIn(str(FINAL_PACKET.relative_to(ROOT)), packet["required_future_outputs"])
        self.assertIn("operator_provided_chatgpt_export_or_connector_source", packet["required_future_outputs"])
        self.assertIn("exact_local_path_to_ghostclaw_repo_merge_kit_v3_3.zip", packet["required_future_outputs"])

    def test_a2a_queue_status_indexes_packet_033_without_execution(self):
        status = json.loads(QUEUE_STATUS_JSON.read_text(encoding="utf-8"))

        self.assertEqual(
            status["packet_counts"],
            {
                "inbox": 5,
                "outbox": 34,
                "working": 1,
                "done": 8,
                "blocked": 0,
                "total": 48,
            },
        )
        packet = next(item for item in status["packets"] if item["id"] == "packet_033")
        self.assertEqual(packet["folder"], "outbox")
        self.assertEqual(packet["agent"], "codex")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["decision_record"])
        self.assertFalse(packet["final_packet_record"])
        self.assertFalse(packet["lane2_authorized"])

        text = QUEUE_STATUS_DOC.read_text(encoding="utf-8")
        self.assertIn("packet_counts: inbox=5 outbox=34 working=1 done=8 blocked=0 total=48", text)
        self.assertIn(str(PACKET.relative_to(ROOT)), text)

    def test_execution_queue_active_index_and_mission_control_surface_packet_033(self):
        execution_queue = json.loads(EXECUTION_QUEUE_JSON.read_text(encoding="utf-8"))
        active_index = json.loads(ACTIVE_INDEX_JSON.read_text(encoding="utf-8"))
        active_doc = ACTIVE_INDEX_DOC.read_text(encoding="utf-8")
        mission = MISSION_CONTROL.read_text(encoding="utf-8")
        rel_packet = str(PACKET.relative_to(ROOT))
        rel_doc = str(DOC.relative_to(ROOT))

        self.assertIn(rel_packet, execution_queue["source_indexes"])
        item = next(item for item in execution_queue["items"] if item["id"] == "ACTIVE-GOAL-BLOCKER-REFRESH-HERMES-HANDOFF-PACKET-033")
        self.assertEqual(item["status"], "handoff_ready_local_only")
        self.assertEqual(item["gate"], "blockers_still_open_review_only")
        self.assertEqual(item["current_actionable_packet"], "packet_013")
        self.assertFalse(item["lane2_authorized"])
        self.assertIn(rel_packet, item["evidence"])
        self.assertIn(rel_doc, item["evidence"])
        self.assertIn("service_repair", item["forbidden_actions"])
        self.assertIn("runtime_queue_execution", item["forbidden_actions"])

        workstream = next(item for item in active_index["workstreams"] if item["id"] == "active_goal_blocker_refresh_hermes_handoff")
        self.assertEqual(workstream["status"], "handoff_ready_local_only")
        self.assertIn(rel_packet, workstream["evidence"])
        self.assertIn(rel_doc, workstream["evidence"])
        self.assertIn("latest_outbox_packet=packet_040", active_doc)

        self.assertIn("ACTIVE-GOAL-BLOCKER-REFRESH-HERMES-HANDOFF-PACKET-033", mission)
        self.assertIn(rel_packet, mission)
        self.assertIn(rel_doc, mission)

    def test_markdown_doc_records_current_blockers_and_non_actions(self):
        text = DOC.read_text(encoding="utf-8")
        required = [
            "ACTIVE_GOAL_BLOCKER_REFRESH_HERMES_HANDOFF_LOCAL_ONLY",
            "packet=packet_033",
            "current_actionable_packet=packet_013",
            "packet_032_sync_receipt_present=true",
            "final_lane1_packet_present=false",
            "lane2_authorized=false",
            "night_watch_latest_status=WARN",
            "local_stack_status=degraded_services_offline",
            "service_repair=false",
            "service_restart=false",
            "BLOCK-CHAT-EXPORT",
            "BLOCK-LANE1-OPUS-PACKET",
            "BLOCK-HERMES-GATEWAY",
            "BLOCK-V3-3-ARTIFACT",
            "BLOCK-R0-APPROVALS",
            "No final packet was created.",
            "No service repair",
            "Hermes/KOB reviews `packet_033` locally",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
