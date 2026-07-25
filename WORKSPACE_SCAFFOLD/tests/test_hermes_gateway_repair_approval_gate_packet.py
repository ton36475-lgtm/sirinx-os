"""Packet_038 Hermes gateway repair approval-gate guardrails."""
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_038_hermes_gateway_repair_approval_gate.json"
PATHSPEC = ROOT / "data" / "pathspecs" / "sirinx_hermes_gateway_repair_approval_gate_2026-07-02.json"
DOC = ROOT / "docs" / "knowledge" / "SIRINX_HERMES_GATEWAY_REPAIR_APPROVAL_GATE_2026-07-02.md"
SOURCE_PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_037_active_goal_current_probe_refresh.json"
SOURCE_PATHSPEC = ROOT / "data" / "pathspecs" / "sirinx_active_goal_current_probe_refresh_2026-07-02.json"
QUEUE_STATUS_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_a2a_queue_status_2026-06-29.json"
QUEUE_STATUS_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_A2A_QUEUE_STATUS_2026-06-29.md"
EXECUTION_QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
EXECUTION_QUEUE_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_EXECUTION_QUEUE_2026-06-29.md"
ACTIVE_INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
ACTIVE_INDEX_DOC = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_SYSTEMATIC_WORK_INDEX_2026-06-29.md"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"


class HermesGatewayRepairApprovalGatePacketTests(unittest.TestCase):
    """Ensure packet_038 prepares a future gate without repair or execution."""

    def load_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet_038: {PACKET}")
        return json.loads(PACKET.read_text(encoding="utf-8"))

    def load_pathspec(self):
        self.assertTrue(PATHSPEC.exists(), f"Missing packet_038 pathspec: {PATHSPEC}")
        return json.loads(PATHSPEC.read_text(encoding="utf-8"))

    def test_artifacts_exist_without_final_packet(self):
        for path in (PACKET, PATHSPEC, DOC, SOURCE_PACKET, SOURCE_PATHSPEC):
            self.assertTrue(path.exists(), f"Missing artifact: {path}")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 Opus packet exists unexpectedly")

    def test_packet_038_is_gate_request_only_not_repair_or_approval(self):
        packet = self.load_packet()

        self.assertEqual(packet["id"], "packet_038")
        self.assertEqual(packet["source_packet"], "packet_037")
        self.assertEqual(packet["selected_blocker"], "BLOCK-HERMES-GATEWAY")
        self.assertEqual(packet["approval_status"], "not_granted")
        self.assertEqual(packet["approval_scope"], "approval_gate_request_not_approval")
        self.assertFalse(packet["approval_required"])
        self.assertFalse(packet["approval_packet_record"])
        self.assertTrue(packet["execution_approval_required"])
        self.assertTrue(packet["dry_run"])
        self.assertTrue(packet["not_approval"])
        self.assertFalse(packet["blocker_clearance"])
        self.assertFalse(packet["final_lane1_packet_present"])
        self.assertEqual(packet["selected_gate"], "APPROVE_LOCAL_STACK_REPAIR_HERMES_GATEWAY_<target>_<date>")

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
            "real_env_read",
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

    def test_pathspec_defines_exact_future_gate_and_required_fields(self):
        pathspec = self.load_pathspec()

        self.assertEqual(pathspec["schema"], "sirinx.hermes_gateway.repair_approval_gate.v1")
        self.assertEqual(pathspec["status"], "approval_gate_ready_local_only")
        self.assertEqual(pathspec["source_packet"], "packet_037")
        self.assertEqual(pathspec["new_packet"], "packet_038")
        self.assertEqual(pathspec["selected_blocker"], "BLOCK-HERMES-GATEWAY")
        self.assertEqual(pathspec["required_future_approval_phrase"], "APPROVE_LOCAL_STACK_REPAIR_HERMES_GATEWAY_<target>_<date>")
        self.assertEqual(pathspec["approval_phrase_refines"], "APPROVE_LOCAL_STACK_REPAIR_<target>_<date>")
        self.assertFalse(pathspec["service_repair"])
        self.assertFalse(pathspec["service_restart"])
        self.assertFalse(pathspec["blocker_clearance"])
        self.assertFalse(pathspec["lane2_authorized"])
        self.assertFalse(pathspec["claims_goal_complete"])

        self.assertEqual(
            pathspec["required_future_approval_fields"],
            [
                "target",
                "operator",
                "approved_at",
                "scope",
                "rollback_plan",
                "commands_allowed",
                "max_duration_minutes",
                "evidence_path",
                "stop_conditions",
                "no_secrets_confirmed",
            ],
        )
        self.assertIn("run_documented_local_repair_command_for_named_target", pathspec["allowed_after_future_approval_only"])
        self.assertIn("secret_read", pathspec["forbidden_without_gate"])
        self.assertIn("real_env_read", pathspec["forbidden_without_gate"])
        self.assertIn("service_restart", pathspec["forbidden_without_gate"])
        self.assertIn("line_webhook_activation", pathspec["forbidden_without_gate"])
        self.assertIn("production_analytics", pathspec["forbidden_without_gate"])
        self.assertIn("crm_customer_data_storage", pathspec["forbidden_without_gate"])

    def test_packet_links_current_gateway_evidence(self):
        packet = self.load_packet()
        evidence = packet["current_gateway_evidence"]

        self.assertEqual(evidence["source_pathspec"], str(SOURCE_PATHSPEC.relative_to(ROOT)))
        self.assertEqual(evidence["health_url"], "http://127.0.0.1:9000/health")
        self.assertEqual(evidence["knowledge_status_url"], "http://127.0.0.1:9000/knowledge/status")
        self.assertEqual(evidence["health_exit_code"], 7)
        self.assertEqual(evidence["knowledge_status_exit_code"], 7)
        self.assertEqual(evidence["gateway_error"], "ConnectionRefusedError")
        self.assertFalse(evidence["service_repair_attempted"])
        self.assertFalse(evidence["service_restart_attempted"])
        self.assertIn(str(PATHSPEC.relative_to(ROOT)), packet["output"])
        self.assertIn(str(DOC.relative_to(ROOT)), packet["output"])

    def test_queue_status_execution_queue_active_index_and_mission_control_link_packet_038(self):
        status = json.loads(QUEUE_STATUS_JSON.read_text(encoding="utf-8"))
        self.assertEqual(status["packet_counts"], {"inbox": 5, "outbox": 34, "working": 1, "done": 8, "blocked": 0, "total": 48})
        packet = next(item for item in status["packets"] if item["id"] == "packet_038")
        self.assertEqual(packet["folder"], "outbox")
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["decision_record"])
        self.assertFalse(packet["final_packet_record"])
        self.assertFalse(packet["lane2_authorized"])

        status_text = QUEUE_STATUS_DOC.read_text(encoding="utf-8")
        self.assertIn("packet_counts: inbox=5 outbox=34 working=1 done=8 blocked=0 total=48", status_text)
        self.assertIn(str(PACKET.relative_to(ROOT)), status_text)

        execution_queue = json.loads(EXECUTION_QUEUE_JSON.read_text(encoding="utf-8"))
        item = next(item for item in execution_queue["items"] if item["id"] == "HERMES-GATEWAY-REPAIR-APPROVAL-GATE-PACKET-038")
        self.assertEqual(item["status"], "approval_gate_ready_local_only")
        self.assertEqual(item["gate"], "local_stack_repair_approval_required")
        self.assertIn(str(PACKET.relative_to(ROOT)), item["evidence"])
        self.assertIn(str(PATHSPEC.relative_to(ROOT)), item["evidence"])
        self.assertIn("service_repair", item["forbidden_actions"])
        self.assertIn("service_restart", item["forbidden_actions"])
        self.assertIn("secret_read", item["forbidden_actions"])

        execution_doc = EXECUTION_QUEUE_DOC.read_text(encoding="utf-8")
        self.assertIn("HERMES-GATEWAY-REPAIR-APPROVAL-GATE-PACKET-038", execution_doc)
        self.assertIn("APPROVE_LOCAL_STACK_REPAIR_HERMES_GATEWAY_<target>_<date>", execution_doc)

        active = json.loads(ACTIVE_INDEX_JSON.read_text(encoding="utf-8"))
        workstream = next(item for item in active["workstreams"] if item["id"] == "hermes_gateway_repair_approval_gate")
        self.assertEqual(workstream["status"], "approval_gate_ready_local_only")
        self.assertIn(str(PACKET.relative_to(ROOT)), workstream["evidence"])
        self.assertIn(str(PATHSPEC.relative_to(ROOT)), workstream["evidence"])

        active_doc = ACTIVE_INDEX_DOC.read_text(encoding="utf-8")
        self.assertIn("latest_outbox_packet=packet_040", active_doc)
        self.assertIn("hermes_gateway_repair_approval_gate", active_doc)

        mission = MISSION_CONTROL.read_text(encoding="utf-8")
        self.assertIn("HERMES-GATEWAY-REPAIR-APPROVAL-GATE-PACKET-038", mission)
        self.assertIn(str(PACKET.relative_to(ROOT)), mission)
        self.assertIn(str(PATHSPEC.relative_to(ROOT)), mission)

    def test_markdown_doc_records_gate_and_non_actions(self):
        text = DOC.read_text(encoding="utf-8")
        required = [
            "HERMES_GATEWAY_REPAIR_APPROVAL_GATE_LOCAL_ONLY",
            "Packet: `packet_038`",
            "Source packet: `packet_037`",
            "Selected blocker: `BLOCK-HERMES-GATEWAY`",
            "approval_status=not_granted",
            "approval_packet_record=false",
            "execution_approval_required=true",
            "service_repair=false",
            "service_restart=false",
            "runtime_queue_execution=false",
            "line_webhook_activation=false",
            "production_analytics=false",
            "crm_customer_data_storage=false",
            "lane2_authorized=false",
            "ConnectionRefusedError",
            "APPROVE_LOCAL_STACK_REPAIR_HERMES_GATEWAY_<target>_<date>",
            "No service repair or restart was attempted.",
            "Forbidden Without Gate",
            "Hermes/KOB/operator reviews `packet_038` locally.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
