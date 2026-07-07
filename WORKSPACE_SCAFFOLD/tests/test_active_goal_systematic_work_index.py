"""SIRINX active-goal systematic work index guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
INDEX_DOC = ROOT / "docs" / "knowledge" / "SIRINX_ACTIVE_GOAL_SYSTEMATIC_WORK_INDEX_2026-06-29.md"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
HERMES_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"


class ActiveGoalSystematicWorkIndexTests(unittest.TestCase):
    """Ensure the active-goal work index is complete enough without overstating progress."""

    def test_index_files_exist_without_final_lane1_decision(self):
        self.assertTrue(INDEX_JSON.exists(), f"Missing JSON index: {INDEX_JSON}")
        self.assertTrue(INDEX_DOC.exists(), f"Missing Markdown index: {INDEX_DOC}")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 packet exists unexpectedly")
        self.assertTrue(HERMES_DECISION.exists(), "Hermes decision file should exist after route_to_opus decision")

    def test_json_index_preserves_scope_and_completion_state(self):
        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))

        self.assertEqual(index["schema"], "sirinx.active_goal.systematic_work_index.v1")
        self.assertEqual(index["status"], "in_progress_not_complete")
        self.assertFalse(index["claims_all_chats_read"])
        self.assertEqual(index["evidence_boundary"], "local_evidence_only")
        self.assertEqual(
            index["next_safe_action"],
            "Human reviews the local website and packet_039 through packet_040, confirms LINE QR on a real device, confirms existing bot behavior manually, then provides separate exact deploy approval only if ready; deploy, webhook, analytics, CRM, live sends, repair, runtime, and external actions remain closed",
        )

    def test_json_index_lists_required_blockers_and_workstreams(self):
        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        blockers = {blocker["id"] for blocker in index["completion_blockers"]}
        workstreams = {item["id"]: item for item in index["workstreams"]}

        self.assertEqual(
            blockers,
            {
                "BLOCK-CHAT-EXPORT",
                "BLOCK-LANE1-OPUS-PACKET",
                "BLOCK-HERMES-GATEWAY",
                "BLOCK-V3-3-ARTIFACT",
                "BLOCK-R0-APPROVALS",
            },
        )
        self.assertIn("ghostclaw_lane1", workstreams)
        self.assertIn("ghostclaw_v3_3", workstreams)
        self.assertIn("hermes_codex_a2a_godmode_v3_html", workstreams)
        self.assertIn("pocket_hatchery_r0", workstreams)
        self.assertIn("sirinx_website_line_hermes_review", workstreams)
        self.assertIn("sirinx_website_line_uat_verification_receipt", workstreams)
        self.assertIn("sirinx_website_human_review_deploy_gate", workstreams)
        self.assertIn("coding_engine_security_rules_refactor", workstreams)
        self.assertIn("coding_engine_security_rules_work_report", workstreams)
        self.assertIn("active_goal_blocker_refresh_hermes_handoff", workstreams)
        self.assertIn("active_goal_blocker_clearance_approval_matrix", workstreams)
        self.assertIn("active_goal_chat_export_readonly_mapping_gate_request", workstreams)
        self.assertIn("chatgpt_export_readonly_source_receipt_validator", workstreams)
        self.assertIn("hermes_gateway_repair_approval_gate", workstreams)
        self.assertEqual(workstreams["ghostclaw_lane1"]["current_actionable_packet"], "packet_013")
        self.assertEqual(workstreams["ghostclaw_lane1"]["status"], "hermes_decision_recorded_final_packet_missing")
        self.assertIn("final LANE_1 Opus architecture packet", workstreams["ghostclaw_lane1"]["next_safe_action"])
        self.assertFalse(workstreams["ghostclaw_lane1"]["lane2_authorized"])
        self.assertEqual(workstreams["sirinx_website_line_hermes_review"]["status"], "review_packet_ready_local_only")
        self.assertIn(
            "_A2A_QUEUE/outbox/packet_029_sirinx_website_line_hermes_review.json",
            workstreams["sirinx_website_line_hermes_review"]["evidence"],
        )
        self.assertEqual(
            workstreams["sirinx_website_line_uat_verification_receipt"]["status"],
            "local_uat_verified_no_deploy",
        )
        self.assertIn(
            "_A2A_QUEUE/outbox/packet_039_sirinx_website_line_uat_verification_receipt.json",
            workstreams["sirinx_website_line_uat_verification_receipt"]["evidence"],
        )
        self.assertEqual(
            workstreams["sirinx_website_human_review_deploy_gate"]["status"],
            "pending_human_review_no_deploy",
        )
        self.assertIn(
            "_A2A_QUEUE/outbox/packet_040_sirinx_website_human_review_deploy_gate.json",
            workstreams["sirinx_website_human_review_deploy_gate"]["evidence"],
        )
        self.assertIn(
            "line_qr_real_device_scan",
            workstreams["sirinx_website_human_review_deploy_gate"]["required_human_evidence"],
        )
        self.assertEqual(workstreams["coding_engine_security_rules_work_report"]["status"], "telegram_draft_ready_local_only")
        self.assertIn(
            "_A2A_QUEUE/outbox/packet_031_sirinx_coding_engine_security_rules_work_report_draft.json",
            workstreams["coding_engine_security_rules_work_report"]["evidence"],
        )
        self.assertEqual(workstreams["active_goal_blocker_refresh_hermes_handoff"]["status"], "handoff_ready_local_only")
        self.assertIn(
            "_A2A_QUEUE/outbox/packet_033_active_goal_blocker_refresh_hermes_handoff.json",
            workstreams["active_goal_blocker_refresh_hermes_handoff"]["evidence"],
        )
        self.assertEqual(workstreams["active_goal_blocker_clearance_approval_matrix"]["status"], "approval_matrix_ready_local_only")
        self.assertIn(
            "_A2A_QUEUE/outbox/packet_034_active_goal_blocker_clearance_approval_matrix.json",
            workstreams["active_goal_blocker_clearance_approval_matrix"]["evidence"],
        )
        self.assertEqual(
            workstreams["active_goal_chat_export_readonly_mapping_gate_request"]["status"],
            "gate_request_ready_local_only",
        )
        self.assertIn(
            "_A2A_QUEUE/outbox/packet_035_active_goal_chat_export_readonly_mapping_gate_request.json",
            workstreams["active_goal_chat_export_readonly_mapping_gate_request"]["evidence"],
        )
        self.assertEqual(
            workstreams["chatgpt_export_readonly_source_receipt_validator"]["status"],
            "validator_review_ready_local_only",
        )
        self.assertIn(
            "_A2A_QUEUE/outbox/packet_036_chatgpt_export_readonly_source_receipt_validator.json",
            workstreams["chatgpt_export_readonly_source_receipt_validator"]["evidence"],
        )
        self.assertEqual(workstreams["hermes_gateway_repair_approval_gate"]["status"], "approval_gate_ready_local_only")
        self.assertIn(
            "_A2A_QUEUE/outbox/packet_038_hermes_gateway_repair_approval_gate.json",
            workstreams["hermes_gateway_repair_approval_gate"]["evidence"],
        )
        self.assertIn(
            "APPROVE_LOCAL_STACK_REPAIR_HERMES_GATEWAY_<target>_<date>",
            workstreams["hermes_gateway_repair_approval_gate"]["next_safe_action"],
        )
        self.assertIn(
            "docs/knowledge/SIRINX_ACTIVE_GOAL_BLOCKER_CLEARANCE_APPROVAL_MATRIX_2026-07-02.md",
            index["source_files"],
        )
        self.assertEqual(workstreams["hermes_codex_a2a_godmode_v3_html"]["status"], "source_read_local_only")
        self.assertIn(
            "data/pathspecs/sirinx_hermes_codex_a2a_godmode_v3_html_recheck_2026-06-29.json",
            index["source_files"],
        )

    def test_json_index_preserves_external_action_boundary(self):
        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        boundary = index["blocked_actions"]

        for action in (
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "paid_provider_call",
            "runtime_queue_execution",
        ):
            self.assertFalse(boundary[action], f"{action} should be false")

    def test_markdown_index_states_incomplete_boundary(self):
        text = INDEX_DOC.read_text(encoding="utf-8")
        required = [
            "ACTIVE_GOAL_SYSTEMATIC_WORK_INDEX_NOT_COMPLETE",
            "This index does not claim all chats were read.",
            "claims_all_chats_read=false",
            "evidence_boundary=local_evidence_only",
            "BLOCK-CHAT-EXPORT",
            "BLOCK-LANE1-OPUS-PACKET",
            "BLOCK-HERMES-GATEWAY",
            "BLOCK-V3-3-ARTIFACT",
            "BLOCK-R0-APPROVALS",
            "current_actionable_packet=packet_013",
            "Hermes packet_013 decision is recorded",
            "next_step=Human reviews the local website and packet_039 through packet_040, confirms LINE QR on a real device, confirms existing bot behavior manually, then provides separate exact deploy approval only if ready; deploy, webhook, analytics, CRM, live sends, repair, runtime, and external actions remain closed",
            "lane2_authorized=false",
            "hermes_codex_a2a_godmode_v3_html",
            "SIRINX_HERMES_CODEX_A2A_GODMODE_V3_HTML_RECHECK_2026-06-29.md",
            "sirinx_website_line_hermes_review",
            "sirinx_website_line_uat_verification_receipt",
            "sirinx_website_human_review_deploy_gate",
            "uat_crud_mongodb_security_rules",
            "uat_crud_mongodb_work_report",
            "coding_engine_security_rules_refactor",
            "coding_engine_security_rules_work_report",
            "active_goal_blocker_refresh_hermes_handoff",
            "active_goal_blocker_clearance_approval_matrix",
            "active_goal_chat_export_readonly_mapping_gate_request",
            "chatgpt_export_readonly_source_receipt_validator",
            "hermes_gateway_repair_approval_gate",
            "SIRINX_WEBSITE_LINE_HERMES_REVIEW_PACKET_2026-07-02.md",
            "SIRINX_WEBSITE_LINE_HERMES_REVIEW_PACKET_2026-07-02.json",
            "SIRINX_WEBSITE_QUALITY_AUDIT.md",
            "_A2A_QUEUE/outbox/packet_029_sirinx_website_line_hermes_review.json",
            "_A2A_QUEUE/outbox/packet_039_sirinx_website_line_uat_verification_receipt.json",
            "_A2A_QUEUE/outbox/packet_040_sirinx_website_human_review_deploy_gate.json",
            "SIRINX_WEBSITE_LINE_UAT_VERIFICATION_RECEIPT_2026-07-02.md",
            "SIRINX_WEBSITE_HUMAN_REVIEW_DEPLOY_GATE_2026-07-02.md",
            "SIRINX_UAT_CRUD_MONGODB_SECURITY_RULES_2026-07-02.md",
            "SIRINX_UAT_CRUD_MONGODB_WORK_REPORT_DRAFT_2026-07-02.md",
            "SIRINX_CODING_ENGINE_SECURITY_RULES_REFACTOR_PACKET_2026-07-02.md",
            "SIRINX_CODING_ENGINE_SECURITY_RULES_WORK_REPORT_DRAFT_2026-07-02.md",
            "SIRINX_GHOSTCLAW_LANE1_PACKET032_A2A_SYNC_RECEIPT_2026-07-02.md",
            "SIRINX_ACTIVE_GOAL_BLOCKER_REFRESH_HERMES_HANDOFF_2026-07-02.md",
            "SIRINX_ACTIVE_GOAL_BLOCKER_CLEARANCE_APPROVAL_MATRIX_2026-07-02.md",
            "test_lane1_packet032_a2a_sync_receipt.py",
            "_A2A_QUEUE/outbox/packet_027_sirinx_uat_crud_mongodb_hermes_review.json",
            "_A2A_QUEUE/outbox/packet_028_sirinx_uat_crud_mongodb_work_report_draft.json",
            "_A2A_QUEUE/outbox/packet_030_sirinx_coding_engine_security_rules_refactor.json",
            "_A2A_QUEUE/outbox/packet_031_sirinx_coding_engine_security_rules_work_report_draft.json",
            "_A2A_QUEUE/outbox/packet_033_active_goal_blocker_refresh_hermes_handoff.json",
            "_A2A_QUEUE/outbox/packet_034_active_goal_blocker_clearance_approval_matrix.json",
            "_A2A_QUEUE/outbox/packet_035_active_goal_chat_export_readonly_mapping_gate_request.json",
            "SIRINX_ACTIVE_GOAL_CHAT_EXPORT_READONLY_MAPPING_GATE_REQUEST_2026-07-02.md",
            "_A2A_QUEUE/outbox/packet_036_chatgpt_export_readonly_source_receipt_validator.json",
            "SIRINX_CHATGPT_EXPORT_READONLY_SOURCE_RECEIPT_VALIDATOR_2026-07-02.md",
            "_A2A_QUEUE/outbox/packet_038_hermes_gateway_repair_approval_gate.json",
            "SIRINX_HERMES_GATEWAY_REPAIR_APPROVAL_GATE_2026-07-02.md",
            "latest_outbox_packet=packet_040",
            "exact UAT gate required before MongoDB",
            "APPROVE_DEPLOY_SIRINX_SITE_<date>",
            "real MCP execution gate required before MCP",
            "Stop if SIRINX website LINE review packet is treated as deploy approval",
            "Stop if UAT CRUD MongoDB review/report packets are treated as approval",
            "Stop if coding-engine security-rule packets are treated as approval",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
