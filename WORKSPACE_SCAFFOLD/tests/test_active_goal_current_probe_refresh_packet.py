"""Packet_037 active-goal current probe refresh guardrails."""
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_037_active_goal_current_probe_refresh.json"
PATHSPEC = ROOT / "data" / "pathspecs" / "sirinx_active_goal_current_probe_refresh_2026-07-02.json"
DOC = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_CURRENT_PROBE_REFRESH_2026-07-02.md"
PROBE_REPORT = ROOT / "WORKSPACE_SCAFFOLD" / "reports" / "active_goal_read_only_probe_latest_2026-06-29.json"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
QUEUE_STATUS_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_a2a_queue_status_2026-06-29.json"
QUEUE_STATUS_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_A2A_QUEUE_STATUS_2026-06-29.md"
EXECUTION_QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
ACTIVE_INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
ACTIVE_INDEX_DOC = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_SYSTEMATIC_WORK_INDEX_2026-06-29.md"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"


class ActiveGoalCurrentProbeRefreshPacketTests(unittest.TestCase):
    """Ensure packet_037 records current probes without opening any gate."""

    def load_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet_037: {PACKET}")
        return json.loads(PACKET.read_text(encoding="utf-8"))

    def load_pathspec(self):
        self.assertTrue(PATHSPEC.exists(), f"Missing packet_037 pathspec: {PATHSPEC}")
        return json.loads(PATHSPEC.read_text(encoding="utf-8"))

    def test_artifacts_exist_without_final_packet(self):
        for path in (PACKET, PATHSPEC, DOC, PROBE_REPORT):
            self.assertTrue(path.exists(), f"Missing artifact: {path}")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 Opus packet exists unexpectedly")

    def test_packet_037_is_review_only_not_clearance_or_execution(self):
        packet = self.load_packet()

        self.assertEqual(packet["id"], "packet_037")
        self.assertEqual(packet["source_packet"], "packet_036")
        self.assertEqual(packet["approval_status"], "not_granted")
        self.assertEqual(packet["approval_scope"], "current_probe_review_packet_not_approval")
        self.assertFalse(packet["approval_required"])
        self.assertFalse(packet["approval_packet_record"])
        self.assertTrue(packet["execution_approval_required"])
        self.assertTrue(packet["dry_run"])
        self.assertTrue(packet["not_approval"])
        self.assertFalse(packet["blocker_clearance"])
        self.assertFalse(packet["final_lane1_packet_present"])

        for field in (
            "claims_goal_complete",
            "claims_all_chats_read",
            "final_packet_record",
            "decision_record",
            "runtime_queue_execution",
            "provider_call",
            "paid_provider_call",
            "real_mcp_execution",
            "connector_read_performed",
            "real_export_loaded",
            "source_loaded",
            "raw_chat_content_stored",
            "external_upload",
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
            "lane2_authorized",
        ):
            self.assertFalse(packet[field], f"{field} should remain false")

    def test_pathspec_records_current_open_blockers_and_probe_results(self):
        pathspec = self.load_pathspec()
        packet = self.load_packet()

        self.assertEqual(pathspec["schema"], "sirinx.active_goal.current_probe_refresh.v1")
        self.assertEqual(pathspec["status"], "blockers_still_open_local_only")
        self.assertEqual(pathspec["new_packet"], "packet_037")
        self.assertFalse(pathspec["claims_goal_complete"])
        self.assertFalse(pathspec["claims_all_chats_read"])
        self.assertFalse(pathspec["external_action_authorized"])
        self.assertFalse(pathspec["lane2_authorized"])
        self.assertFalse(pathspec["final_lane1_packet_present"])

        self.assertFalse(pathspec["probe_runner"]["hermes_gateway_available"])
        self.assertEqual(pathspec["probe_runner"]["hermes_gateway_error"], "ConnectionRefusedError")
        self.assertFalse(pathspec["probe_runner"]["exact_v3_3_artifact_found"])
        self.assertFalse(pathspec["probe_runner"]["chat_export_candidate_found"])
        self.assertEqual(pathspec["direct_gateway_probes"][0]["exit_code"], 7)
        self.assertEqual(pathspec["direct_gateway_probes"][1]["exit_code"], 7)
        self.assertFalse(pathspec["bounded_artifact_search"]["found"])
        self.assertEqual(pathspec["bounded_artifact_search"]["matches"], [])

        self.assertEqual(
            [item["id"] for item in pathspec["completion_blockers"]],
            packet["completion_blockers"],
        )

    def test_packet_links_probe_evidence_and_required_future_outputs(self):
        packet = self.load_packet()

        self.assertEqual(packet["current_probe"]["pathspec"], str(PATHSPEC.relative_to(ROOT)))
        self.assertEqual(packet["current_probe"]["doc"], str(DOC.relative_to(ROOT)))
        self.assertEqual(packet["current_probe"]["probe_runner_report"], str(PROBE_REPORT.relative_to(ROOT)))
        self.assertFalse(packet["current_probe"]["hermes_gateway_available"])
        self.assertEqual(packet["current_probe"]["hermes_gateway_error"], "ConnectionRefusedError")
        self.assertFalse(packet["current_probe"]["exact_v3_3_artifact_found"])
        self.assertFalse(packet["current_probe"]["chat_export_candidate_found"])
        self.assertIn(str(FINAL_PACKET.relative_to(ROOT)), packet["required_future_outputs"])
        self.assertIn("exact_local_path_to_ghostclaw_repo_merge_kit_v3_3.zip", packet["required_future_outputs"])
        self.assertIn("service_repair", packet["forbidden_without_gate"])
        self.assertIn("final_packet_creation", packet["forbidden_without_gate"])
        self.assertIn("lane2_authorization", packet["forbidden_without_gate"])

    def test_a2a_queue_execution_queue_active_index_and_mission_control_link_packet_037(self):
        status = json.loads(QUEUE_STATUS_JSON.read_text(encoding="utf-8"))
        self.assertEqual(status["packet_counts"], {"inbox": 5, "outbox": 34, "working": 1, "done": 8, "blocked": 0, "total": 48})
        packet = next(item for item in status["packets"] if item["id"] == "packet_037")
        self.assertEqual(packet["folder"], "outbox")
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["decision_record"])
        self.assertFalse(packet["lane2_authorized"])

        text = QUEUE_STATUS_DOC.read_text(encoding="utf-8")
        self.assertIn("packet_counts: inbox=5 outbox=34 working=1 done=8 blocked=0 total=48", text)
        self.assertIn(str(PACKET.relative_to(ROOT)), text)

        execution_queue = json.loads(EXECUTION_QUEUE_JSON.read_text(encoding="utf-8"))
        item = next(item for item in execution_queue["items"] if item["id"] == "ACTIVE-GOAL-CURRENT-PROBE-REFRESH-PACKET-037")
        self.assertEqual(item["status"], "probe_refresh_ready_local_only")
        self.assertIn(str(PACKET.relative_to(ROOT)), item["evidence"])
        self.assertIn(str(PATHSPEC.relative_to(ROOT)), item["evidence"])
        self.assertIn("service_repair", item["forbidden_actions"])
        self.assertIn("blocker_clearance", item["forbidden_actions"])

        active = json.loads(ACTIVE_INDEX_JSON.read_text(encoding="utf-8"))
        workstream = next(item for item in active["workstreams"] if item["id"] == "active_goal_current_probe_refresh")
        self.assertEqual(workstream["status"], "probe_refresh_ready_local_only")
        self.assertIn(str(PACKET.relative_to(ROOT)), workstream["evidence"])
        self.assertIn(str(PATHSPEC.relative_to(ROOT)), workstream["evidence"])

        active_doc = ACTIVE_INDEX_DOC.read_text(encoding="utf-8")
        self.assertIn("latest_outbox_packet=packet_040", active_doc)
        self.assertIn("active_goal_current_probe_refresh", active_doc)

        mission = MISSION_CONTROL.read_text(encoding="utf-8")
        self.assertIn("ACTIVE-GOAL-CURRENT-PROBE-REFRESH-PACKET-037", mission)
        self.assertIn(str(PACKET.relative_to(ROOT)), mission)
        self.assertIn(str(PATHSPEC.relative_to(ROOT)), mission)

    def test_markdown_doc_records_current_probe_and_non_actions(self):
        text = DOC.read_text(encoding="utf-8")
        required = [
            "ACTIVE_GOAL_CURRENT_PROBE_REFRESH_LOCAL_ONLY",
            "Packet: `packet_037`",
            "claims_goal_complete=false",
            "claims_all_chats_read=false",
            "service_repair=false",
            "service_restart=false",
            "lane2_authorized=false",
            "final_lane1_packet_present=false",
            "Hermes gateway error: `ConnectionRefusedError`",
            "Exact v3.3 artifact found: `false`",
            "ChatGPT export candidate found: `false`",
            "BLOCK-CHAT-EXPORT",
            "BLOCK-LANE1-OPUS-PACKET",
            "BLOCK-HERMES-GATEWAY",
            "BLOCK-V3-3-ARTIFACT",
            "BLOCK-R0-APPROVALS",
            "No service repair or restart",
            "No ChatGPT export load",
            "No final Opus packet created",
            "No LANE_2 authorization",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
