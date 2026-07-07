"""Active-goal blocker clearance approval matrix guardrails."""
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_034_active_goal_blocker_clearance_approval_matrix.json"
DOC = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_BLOCKER_CLEARANCE_APPROVAL_MATRIX_2026-07-02.md"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
QUEUE_STATUS_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_a2a_queue_status_2026-06-29.json"
QUEUE_STATUS_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_A2A_QUEUE_STATUS_2026-06-29.md"
EXECUTION_QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
ACTIVE_INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
ACTIVE_INDEX_DOC = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_SYSTEMATIC_WORK_INDEX_2026-06-29.md"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"


class ActiveGoalBlockerClearanceApprovalMatrixPacketTests(unittest.TestCase):
    """Ensure packet_034 requests approvals without granting or executing anything."""

    def load_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet_034: {PACKET}")
        return json.loads(PACKET.read_text(encoding="utf-8"))

    def test_packet_artifacts_exist_without_final_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet_034: {PACKET}")
        self.assertTrue(DOC.exists(), f"Missing packet_034 doc: {DOC}")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 Opus packet exists unexpectedly")

    def test_packet_034_is_matrix_only_not_approval_or_execution(self):
        packet = self.load_packet()

        self.assertEqual(packet["id"], "packet_034")
        self.assertEqual(packet["project"], "ghostclaw")
        self.assertEqual(packet["agent"], "codex")
        self.assertEqual(packet["to_agent"], "hermes_kob_operator")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertEqual(packet["approval_scope"], "approval_request_matrix_no_approval_granted")
        self.assertEqual(packet["dispatch_mode"], "dry_run_review_only")
        self.assertEqual(packet["source_packet"], "packet_033")
        self.assertEqual(packet["current_actionable_packet"], "packet_013")
        self.assertEqual(packet["blocker_clearance_mode"], "one_blocker_one_gate")
        self.assertFalse(packet["approval_required"])
        self.assertTrue(packet["execution_approval_required"])
        self.assertTrue(packet["dry_run"])
        self.assertTrue(packet["not_approval"])
        self.assertFalse(packet["claims_goal_complete"])
        self.assertFalse(packet["claims_all_chats_read"])
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

    def test_packet_lists_one_gate_per_open_blocker(self):
        packet = self.load_packet()
        matrix = {item["blocker"]: item for item in packet["clearance_matrix"]}

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
        self.assertEqual(set(matrix), set(packet["completion_blockers"]))
        self.assertEqual(matrix["BLOCK-CHAT-EXPORT"]["required_gate"], "APPROVE_CHATGPT_EXPORT_READONLY_MAPPING_<path>_<date>")
        self.assertEqual(matrix["BLOCK-LANE1-OPUS-PACKET"]["required_gate"], "APPROVE_LANE1_OPUS_FINAL_PACKET_REVIEW_<date>")
        self.assertEqual(matrix["BLOCK-HERMES-GATEWAY"]["required_gate"], "APPROVE_LOCAL_STACK_REPAIR_<target>_<date>")
        self.assertEqual(matrix["BLOCK-V3-3-ARTIFACT"]["required_gate"], "APPROVE_V3_3_ARTIFACT_INTAKE_<path>_<date>")
        self.assertEqual(matrix["BLOCK-R0-APPROVALS"]["required_gate"], "APPROVE_R0_GATE_<target>_<date>")
        self.assertIn("crm_customer_data_storage", matrix["BLOCK-R0-APPROVALS"]["forbidden_without_gate"])
        self.assertIn("line_webhook_activation", matrix["BLOCK-R0-APPROVALS"]["forbidden_without_gate"])
        self.assertIn("production_analytics", matrix["BLOCK-R0-APPROVALS"]["forbidden_without_gate"])
        self.assertIn("runtime_queue_execution", matrix["BLOCK-LANE1-OPUS-PACKET"]["forbidden_without_gate"])

    def test_packet_links_current_evidence_and_required_future_outputs(self):
        packet = self.load_packet()

        for rel_path in (
            "_A2A_QUEUE/outbox/packet_033_active_goal_blocker_refresh_hermes_handoff.json",
            "docs/knowledge/SIRINX_ACTIVE_GOAL_BLOCKER_REFRESH_HERMES_HANDOFF_2026-07-02.md",
            "data/pathspecs/sirinx_active_goal_current_blocker_refresh_2026-06-29.json",
            "docs/knowledge/SIRINX_ACTIVE_GOAL_CURRENT_BLOCKER_REFRESH_2026-06-29.md",
            "docs/knowledge/SIRINX_ACTIVE_GOAL_COMPLETION_AUDIT_2026-06-29.md",
            ".hermes/logs/night-watch-latest.md",
        ):
            self.assertIn(rel_path, packet["input"])

        self.assertIn(str(DOC.relative_to(ROOT)), packet["output"])
        self.assertIn(str(PACKET.relative_to(ROOT)), packet["output"])
        self.assertIn("gate_specific_r0_approval_packet", packet["required_future_outputs"])
        self.assertIn("exact_local_path_to_ghostclaw_repo_merge_kit_v3_3.zip", packet["required_future_outputs"])

    def test_a2a_queue_status_indexes_packet_034_without_execution(self):
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
        packet = next(item for item in status["packets"] if item["id"] == "packet_034")
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

    def test_execution_queue_active_index_and_mission_control_surface_packet_034(self):
        execution_queue = json.loads(EXECUTION_QUEUE_JSON.read_text(encoding="utf-8"))
        active_index = json.loads(ACTIVE_INDEX_JSON.read_text(encoding="utf-8"))
        active_doc = ACTIVE_INDEX_DOC.read_text(encoding="utf-8")
        mission = MISSION_CONTROL.read_text(encoding="utf-8")
        rel_packet = str(PACKET.relative_to(ROOT))
        rel_doc = str(DOC.relative_to(ROOT))

        self.assertIn(rel_packet, execution_queue["source_indexes"])
        item = next(item for item in execution_queue["items"] if item["id"] == "ACTIVE-GOAL-BLOCKER-CLEARANCE-APPROVAL-MATRIX-PACKET-034")
        self.assertEqual(item["status"], "approval_matrix_ready_local_only")
        self.assertEqual(item["gate"], "one_blocker_one_gate_required")
        self.assertEqual(item["current_actionable_packet"], "packet_013")
        self.assertFalse(item["lane2_authorized"])
        self.assertIn(rel_packet, item["evidence"])
        self.assertIn(rel_doc, item["evidence"])
        self.assertIn("line_webhook_activation", item["forbidden_actions"])
        self.assertIn("production_analytics", item["forbidden_actions"])
        self.assertIn("crm_customer_data_storage", item["forbidden_actions"])

        workstream = next(item for item in active_index["workstreams"] if item["id"] == "active_goal_blocker_clearance_approval_matrix")
        self.assertEqual(workstream["status"], "approval_matrix_ready_local_only")
        self.assertIn(rel_packet, workstream["evidence"])
        self.assertIn(rel_doc, workstream["evidence"])
        self.assertIn("latest_outbox_packet=packet_040", active_doc)

        self.assertIn("ACTIVE-GOAL-BLOCKER-CLEARANCE-APPROVAL-MATRIX-PACKET-034", mission)
        self.assertIn(rel_packet, mission)
        self.assertIn(rel_doc, mission)

    def test_markdown_doc_records_matrix_and_non_approvals(self):
        text = DOC.read_text(encoding="utf-8")
        required = [
            "ACTIVE_GOAL_BLOCKER_CLEARANCE_APPROVAL_MATRIX_LOCAL_ONLY",
            "packet=packet_034",
            "source_packet=packet_033",
            "blocker_clearance_mode=one_blocker_one_gate",
            "approval_scope=approval_request_matrix_no_approval_granted",
            "claims_goal_complete=false",
            "lane2_authorized=false",
            "line_webhook_activation=false",
            "production_analytics=false",
            "crm_customer_data_storage=false",
            "APPROVE_CHATGPT_EXPORT_READONLY_MAPPING_<path>_<date>",
            "APPROVE_LANE1_OPUS_FINAL_PACKET_REVIEW_<date>",
            "APPROVE_LOCAL_STACK_REPAIR_<target>_<date>",
            "APPROVE_V3_3_ARTIFACT_INTAKE_<path>_<date>",
            "APPROVE_R0_GATE_<target>_<date>",
            "No approval is granted",
            "Hermes/KOB/operator reviews `packet_034`",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
