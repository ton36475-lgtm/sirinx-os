"""Codex/Hermes execution queue guardrails for the active goal."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
QUEUE_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_EXECUTION_QUEUE_2026-06-29.md"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
HERMES_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"


class CodexHermesExecutionQueueTests(unittest.TestCase):
    """Ensure Codex and Hermes share one local-only execution queue without widening gates."""

    def load_queue(self):
        self.assertTrue(QUEUE_JSON.exists(), f"Missing JSON queue: {QUEUE_JSON}")
        return json.loads(QUEUE_JSON.read_text(encoding="utf-8"))

    def test_queue_files_exist_without_final_lane1_decision(self):
        self.assertTrue(QUEUE_JSON.exists(), f"Missing JSON queue: {QUEUE_JSON}")
        self.assertTrue(QUEUE_DOC.exists(), f"Missing Markdown queue: {QUEUE_DOC}")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 packet exists unexpectedly")
        self.assertTrue(HERMES_DECISION.exists(), "Hermes decision file should exist after route_to_opus decision")

    def test_queue_preserves_scope_and_safety_boundary(self):
        queue = self.load_queue()

        self.assertEqual(queue["schema"], "sirinx.codex_hermes.execution_queue.v1")
        self.assertEqual(queue["status"], "active_local_only")
        self.assertEqual(queue["evidence_boundary"], "local_evidence_only")
        self.assertFalse(queue["claims_all_chats_read"])
        self.assertFalse(queue["lane2_authorized"])
        self.assertFalse(queue["runtime_queue_execution"])
        self.assertIn(
            "data/pathspecs/sirinx_hermes_codex_a2a_godmode_v3_html_recheck_2026-06-29.json",
            queue["source_indexes"],
        )
        self.assertIn(
            "data/pathspecs/sirinx_active_goal_context_packet_registry_2026-06-29.json",
            queue["source_indexes"],
        )
        self.assertIn(
            "data/pathspecs/ghostclaw_lane1_packet013_decision_workbench_2026-06-29.json",
            queue["source_indexes"],
        )
        self.assertIn(
            "data/pathspecs/ghostclaw_lane1_hermes_decision_preflight_audit_2026-06-29.json",
            queue["source_indexes"],
        )
        self.assertIn(
            "data/pathspecs/sirinx_a2a_next_safe_action_sequencer_2026-06-29.json",
            queue["source_indexes"],
        )
        self.assertIn(
            "data/pathspecs/sirinx_hermes_a2a_codex_sync_all_jobs_packet_2026-06-29.json",
            queue["source_indexes"],
        )
        self.assertIn(
            "_A2A_QUEUE/outbox/packet_029_sirinx_website_line_hermes_review.json",
            queue["source_indexes"],
        )
        self.assertIn(
            "_A2A_QUEUE/outbox/packet_031_sirinx_coding_engine_security_rules_work_report_draft.json",
            queue["source_indexes"],
        )
        self.assertIn(
            "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_PACKET032_A2A_SYNC_RECEIPT_2026-07-02.md",
            queue["source_indexes"],
        )

        boundary = queue["blocked_actions"]
        for action in (
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "paid_provider_call",
            "runtime_queue_execution",
        ):
            self.assertFalse(boundary[action], f"{action} should remain false")

    def test_queue_lists_required_ordered_work_items(self):
        queue = self.load_queue()
        items = queue["items"]
        ids = [item["id"] for item in items]

        self.assertEqual(
            ids[:30],
            [
                "LANE1-HERMES-DECISION-PACKET-013",
                "LANE1-HERMES-DECISION-DRAFT-PACKET-015",
                "LANE1-HERMES-DECISION-HANDOFF-PACKET-016",
                "LANE1-HERMES-DECISION-PREFLIGHT-PACKET-017",
                "LANE1-OPUS-ARCHITECTURE-PACKET-GATE-PACKET-018",
                "LANE1-OPUS-AUTHORING-BUNDLE-PACKET-019",
                "LANE1-HERMES-DECISION-TRANSITION-GUARD",
                "LANE1-OPUS-FINAL-PACKET-AUTHORING-REQUEST-PACKET-032",
                "ACTIVE-GOAL-BLOCKER-REFRESH-HERMES-HANDOFF-PACKET-033",
                "ACTIVE-GOAL-BLOCKER-CLEARANCE-APPROVAL-MATRIX-PACKET-034",
                "ACTIVE-GOAL-CHAT-EXPORT-READONLY-MAPPING-GATE-REQUEST-PACKET-035",
                "CHATGPT-EXPORT-READONLY-SOURCE-RECEIPT-VALIDATOR-PACKET-036",
                "ACTIVE-GOAL-CURRENT-PROBE-REFRESH-PACKET-037",
                "HERMES-GATEWAY-REPAIR-APPROVAL-GATE-PACKET-038",
                "ALL-CHAT-EXPORT-INTAKE",
                "ALL-CHAT-EXPORT-REQUEST-PACKET-020",
                "A2A-ADAPTIVE-SYNC-CONTROL-STATUS-PACKET-021",
                "A2A-NEXT-SAFE-ACTION-SEQUENCER-PACKET-022",
                "HERMES-GATEWAY-CURRENT-RECHECK-PACKET-023",
                "HERMES-A2A-CODEX-SYNC-ALL-JOBS-PACKET-024",
                "BROWSER-USE-CANDIDATE-LANE-PACKET-025",
                "UAT-CRUD-MONGODB-HERMES-REVIEW-PACKET-027",
                "UAT-CRUD-MONGODB-WORK-REPORT-PACKET-028",
                "SIRINX-WEBSITE-LINE-HERMES-REVIEW-PACKET-029",
                "SIRINX-WEBSITE-LINE-UAT-VERIFICATION-RECEIPT-PACKET-039",
                "SIRINX-WEBSITE-HUMAN-REVIEW-DEPLOY-GATE-PACKET-040",
                "CODING-ENGINE-SECURITY-RULES-REFACTOR-PACKET-030",
                "CODING-ENGINE-SECURITY-RULES-WORK-REPORT-PACKET-031",
                "GHOSTCLAW-V3-3-ARTIFACT-INTAKE",
                "R0-GATE-SPECIFIC-APPROVALS",
            ],
        )

        first = items[0]
        self.assertEqual(first["owner"], "Hermes")
        self.assertEqual(first["current_actionable_packet"], "packet_013")
        self.assertEqual(first["status"], "decision_recorded_route_to_opus")
        self.assertEqual(first["gate"], "codex_recorder_gate_closed_final_opus_packet_required")
        self.assertFalse(first["lane2_authorized"])
        self.assertIn("docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md", first["evidence"])
        self.assertIn("_A2A_QUEUE/outbox/packet_026_ghostclaw_lane1_hermes_decision_route_to_opus.json", first["evidence"])

        draft = items[1]
        self.assertEqual(draft["owner"], "Codex")
        self.assertEqual(draft["current_actionable_packet"], "packet_013")
        self.assertEqual(draft["status"], "superseded_by_recorded_route_to_opus_decision")
        self.assertEqual(draft["gate"], "decision_recorded_final_packet_required")
        self.assertFalse(draft["lane2_authorized"])
        self.assertIn("data/pathspecs/ghostclaw_lane1_packet013_decision_draft_2026-06-29.json", draft["evidence"])
        self.assertIn("_A2A_QUEUE/outbox/packet_015_ghostclaw_lane1_hermes_decision_draft.json", draft["evidence"])
        self.assertIn("decision_record", draft["forbidden_actions"])

        handoff = items[2]
        self.assertEqual(handoff["owner"], "Codex")
        self.assertEqual(handoff["current_actionable_packet"], "packet_013")
        self.assertEqual(handoff["status"], "handoff_superseded_by_packet_026_decision")
        self.assertEqual(handoff["gate"], "decision_recorded_final_packet_required")
        self.assertFalse(handoff["lane2_authorized"])
        self.assertIn("_A2A_QUEUE/outbox/packet_016_ghostclaw_lane1_hermes_decision_intake_handoff.json", handoff["evidence"])
        self.assertIn("data/pathspecs/ghostclaw_lane1_hermes_decision_intake_handoff_2026-06-29.json", handoff["evidence"])
        self.assertIn("decision_record", handoff["forbidden_actions"])
        self.assertIn("runtime_queue_execution", handoff["forbidden_actions"])
        self.assertIn("state_mutation", handoff["forbidden_actions"])

        preflight = items[3]
        self.assertEqual(preflight["owner"], "Codex")
        self.assertEqual(preflight["current_actionable_packet"], "packet_013")
        self.assertEqual(preflight["status"], "preflight_superseded_by_packet_026_decision")
        self.assertEqual(preflight["gate"], "decision_recorded_final_packet_required")
        self.assertFalse(preflight["lane2_authorized"])
        self.assertIn("data/pathspecs/ghostclaw_lane1_hermes_decision_preflight_audit_2026-06-29.json", preflight["evidence"])
        self.assertIn("_A2A_QUEUE/outbox/packet_017_ghostclaw_lane1_hermes_decision_preflight_audit.json", preflight["evidence"])
        self.assertIn("decision_record", preflight["forbidden_actions"])
        self.assertIn("state_mutation", preflight["forbidden_actions"])

        packet_gate = items[4]
        self.assertEqual(packet_gate["owner"], "Codex")
        self.assertEqual(packet_gate["current_actionable_packet"], "packet_013")
        self.assertEqual(packet_gate["status"], "validator_ready_final_packet_missing")
        self.assertEqual(packet_gate["gate"], "final_opus_packet_required_after_route_to_opus")
        self.assertFalse(packet_gate["lane2_authorized"])
        self.assertIn("data/pathspecs/ghostclaw_lane1_opus_architecture_packet_gate_2026-06-29.json", packet_gate["evidence"])
        self.assertIn("_A2A_QUEUE/outbox/packet_018_ghostclaw_lane1_opus_architecture_packet_gate.json", packet_gate["evidence"])
        self.assertIn("decision_record", packet_gate["forbidden_actions"])
        self.assertIn("state_mutation", packet_gate["forbidden_actions"])
        self.assertIn("final_packet_creation", packet_gate["forbidden_actions"])

        authoring = items[5]
        self.assertEqual(authoring["owner"], "Codex")
        self.assertEqual(authoring["current_actionable_packet"], "packet_013")
        self.assertEqual(authoring["status"], "authoring_bundle_ready_not_final_packet")
        self.assertEqual(authoring["gate"], "route_to_opus_final_packet_required")
        self.assertFalse(authoring["lane2_authorized"])
        self.assertIn("data/pathspecs/ghostclaw_lane1_opus_authoring_bundle_2026-06-29.json", authoring["evidence"])
        self.assertIn("_A2A_QUEUE/outbox/packet_019_ghostclaw_lane1_opus_authoring_bundle.json", authoring["evidence"])
        self.assertIn("decision_record", authoring["forbidden_actions"])
        self.assertIn("state_mutation", authoring["forbidden_actions"])
        self.assertIn("final_packet_creation", authoring["forbidden_actions"])

        guard = items[6]
        self.assertEqual(guard["owner"], "Codex")
        self.assertEqual(guard["current_actionable_packet"], "packet_013")
        self.assertEqual(guard["status"], "validated_decision_transition_ready")
        self.assertEqual(guard["gate"], "await_opus_architecture_packet")
        self.assertFalse(guard["lane2_authorized"])
        self.assertIn("data/pathspecs/ghostclaw_lane1_hermes_decision_transition_guard_2026-06-29.json", guard["evidence"])
        self.assertIn("docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md", guard["evidence"])
        self.assertIn("decision_record", guard["forbidden_actions"])
        self.assertIn("state_mutation", guard["forbidden_actions"])

        request = items[7]
        self.assertEqual(request["owner"], "Codex")
        self.assertEqual(request["current_actionable_packet"], "packet_013")
        self.assertEqual(request["status"], "authoring_request_ready_local_only")
        self.assertEqual(request["gate"], "await_opus_architecture_packet")
        self.assertFalse(request["lane2_authorized"])
        self.assertIn("_A2A_QUEUE/outbox/packet_032_ghostclaw_lane1_opus_final_packet_authoring_request.json", request["evidence"])
        self.assertIn("docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_FINAL_PACKET_AUTHORING_REQUEST_2026-07-02.md", request["evidence"])
        self.assertIn("docs/knowledge/SIRINX_GHOSTCLAW_LANE1_PACKET032_A2A_SYNC_RECEIPT_2026-07-02.md", request["evidence"])
        self.assertIn("WORKSPACE_SCAFFOLD/tests/test_lane1_packet032_a2a_sync_receipt.py", request["evidence"])
        self.assertIn("final_packet_creation", request["forbidden_actions"])
        self.assertIn("runtime_queue_execution", request["forbidden_actions"])

        handoff_033 = items[8]
        self.assertEqual(handoff_033["owner"], "Codex")
        self.assertEqual(handoff_033["current_actionable_packet"], "packet_013")
        self.assertEqual(handoff_033["status"], "handoff_ready_local_only")
        self.assertEqual(handoff_033["gate"], "blockers_still_open_review_only")
        self.assertFalse(handoff_033["lane2_authorized"])
        self.assertIn("_A2A_QUEUE/outbox/packet_033_active_goal_blocker_refresh_hermes_handoff.json", handoff_033["evidence"])
        self.assertIn("docs/knowledge/SIRINX_ACTIVE_GOAL_BLOCKER_REFRESH_HERMES_HANDOFF_2026-07-02.md", handoff_033["evidence"])
        self.assertIn("docs/knowledge/SIRINX_ACTIVE_GOAL_CURRENT_BLOCKER_REFRESH_2026-06-29.md", handoff_033["evidence"])
        self.assertIn("service_repair", handoff_033["forbidden_actions"])
        self.assertIn("service_restart", handoff_033["forbidden_actions"])
        self.assertIn("runtime_queue_execution", handoff_033["forbidden_actions"])

        matrix_034 = items[9]
        self.assertEqual(matrix_034["owner"], "Codex")
        self.assertEqual(matrix_034["current_actionable_packet"], "packet_013")
        self.assertEqual(matrix_034["status"], "approval_matrix_ready_local_only")
        self.assertEqual(matrix_034["gate"], "one_blocker_one_gate_required")
        self.assertFalse(matrix_034["lane2_authorized"])
        self.assertIn("_A2A_QUEUE/outbox/packet_034_active_goal_blocker_clearance_approval_matrix.json", matrix_034["evidence"])
        self.assertIn("docs/knowledge/SIRINX_ACTIVE_GOAL_BLOCKER_CLEARANCE_APPROVAL_MATRIX_2026-07-02.md", matrix_034["evidence"])
        self.assertIn("line_webhook_activation", matrix_034["forbidden_actions"])
        self.assertIn("production_analytics", matrix_034["forbidden_actions"])
        self.assertIn("crm_customer_data_storage", matrix_034["forbidden_actions"])

        sync_all = next(item for item in items if item["id"] == "HERMES-A2A-CODEX-SYNC-ALL-JOBS-PACKET-024")
        self.assertEqual(sync_all["owner"], "Hermes / Codex")
        self.assertEqual(sync_all["status"], "goal_command_inbox_ready_local_only")
        self.assertEqual(sync_all["gate"], "local_read_only_goal_command_review")
        self.assertIn("data/pathspecs/sirinx_hermes_a2a_codex_sync_all_jobs_packet_2026-06-29.json", sync_all["evidence"])
        self.assertIn("_A2A_QUEUE/inbox/packet_024_sirinx_hermes_a2a_codex_sync_all_jobs.json", sync_all["evidence"])
        self.assertIn("GHOSTCLAW/a2a-hermes-codex-bridge/command-intents.ts", sync_all["evidence"])
        self.assertIn("real_codex_cli_execution", sync_all["forbidden_actions"])
        self.assertIn("runtime_queue_execution", sync_all["forbidden_actions"])
        self.assertIn("provider_call", sync_all["forbidden_actions"])
        self.assertIn("license_claim_without_license_file", sync_all["forbidden_actions"])

        website = next(item for item in items if item["id"] == "SIRINX-WEBSITE-LINE-HERMES-REVIEW-PACKET-029")
        self.assertEqual(website["owner"], "Codex")
        self.assertEqual(website["status"], "review_packet_ready_local_only")
        self.assertEqual(website["gate"], "website_deploy_webhook_analytics_crm_gates_closed")
        self.assertIn("_A2A_QUEUE/outbox/packet_029_sirinx_website_line_hermes_review.json", website["evidence"])
        self.assertIn("docs/knowledge/SIRINX_WEBSITE_LINE_HERMES_REVIEW_PACKET_2026-07-02.md", website["evidence"])
        self.assertIn("apps/sirinx-site/tests/line-integration.spec.ts", website["evidence"])
        self.assertIn("line_webhook_activation", website["forbidden_actions"])
        self.assertIn("production_analytics", website["forbidden_actions"])
        self.assertIn("crm_customer_data_storage", website["forbidden_actions"])

        repair_gate = next(item for item in items if item["id"] == "HERMES-GATEWAY-REPAIR-APPROVAL-GATE-PACKET-038")
        self.assertEqual(repair_gate["owner"], "Codex")
        self.assertEqual(repair_gate["status"], "approval_gate_ready_local_only")
        self.assertEqual(repair_gate["gate"], "local_stack_repair_approval_required")
        self.assertIn("_A2A_QUEUE/outbox/packet_038_hermes_gateway_repair_approval_gate.json", repair_gate["evidence"])
        self.assertIn("data/pathspecs/sirinx_hermes_gateway_repair_approval_gate_2026-07-02.json", repair_gate["evidence"])
        self.assertIn("service_repair", repair_gate["forbidden_actions"])
        self.assertIn("service_restart", repair_gate["forbidden_actions"])
        self.assertIn("secret_read", repair_gate["forbidden_actions"])
        self.assertIn("real_env_read", repair_gate["forbidden_actions"])

        refactor = next(item for item in items if item["id"] == "CODING-ENGINE-SECURITY-RULES-REFACTOR-PACKET-030")
        self.assertEqual(refactor["owner"], "Codex")
        self.assertEqual(refactor["status"], "review_packet_ready_local_only")
        self.assertEqual(refactor["gate"], "real_mcp_execution_gate_closed")
        self.assertIn("_A2A_QUEUE/outbox/packet_030_sirinx_coding_engine_security_rules_refactor.json", refactor["evidence"])
        self.assertIn("packages/policy-core/src/index.mjs", refactor["evidence"])
        self.assertIn("real_mcp_execution", refactor["forbidden_actions"])

        report = next(item for item in items if item["id"] == "CODING-ENGINE-SECURITY-RULES-WORK-REPORT-PACKET-031")
        self.assertEqual(report["owner"], "Codex")
        self.assertEqual(report["status"], "telegram_draft_ready_local_only")
        self.assertEqual(report["gate"], "telegram_live_send_and_real_mcp_execution_gates_closed")
        self.assertIn("_A2A_QUEUE/outbox/packet_031_sirinx_coding_engine_security_rules_work_report_draft.json", report["evidence"])
        self.assertIn("docs/knowledge/SIRINX_CODING_ENGINE_SECURITY_RULES_WORK_REPORT_DRAFT_2026-07-02.md", report["evidence"])
        self.assertIn("telegram_live_send", report["forbidden_actions"])
        self.assertIn("real_mcp_execution", report["forbidden_actions"])

    def test_each_queue_item_has_auditable_fields(self):
        queue = self.load_queue()
        required = {
            "id",
            "priority",
            "owner",
            "status",
            "gate",
            "next_action",
            "evidence",
            "blocked_by",
            "allowed_actions",
            "forbidden_actions",
        }

        for item in queue["items"]:
            self.assertTrue(required.issubset(item), f"Missing fields in {item.get('id')}")
            self.assertGreaterEqual(len(item["evidence"]), 1, f"Missing evidence for {item['id']}")
            self.assertIn("read_local_files", item["allowed_actions"])
            self.assertIn("deploy", item["forbidden_actions"])
            self.assertIn("push", item["forbidden_actions"])
            self.assertIn("secret_read", item["forbidden_actions"])

    def test_markdown_queue_states_non_completion_and_next_safe_action(self):
        self.assertTrue(QUEUE_DOC.exists(), f"Missing Markdown queue: {QUEUE_DOC}")
        text = QUEUE_DOC.read_text(encoding="utf-8")
        required = [
            "CODEX_HERMES_EXECUTION_QUEUE_LOCAL_ONLY",
            "claims_all_chats_read=false",
            "evidence_boundary=local_evidence_only",
            "lane2_authorized=false",
            "runtime_queue_execution=false",
            "LANE1-HERMES-DECISION-PACKET-013",
            "LANE1-HERMES-DECISION-DRAFT-PACKET-015",
            "LANE1-HERMES-DECISION-HANDOFF-PACKET-016",
            "LANE1-HERMES-DECISION-PREFLIGHT-PACKET-017",
            "LANE1-OPUS-ARCHITECTURE-PACKET-GATE-PACKET-018",
            "LANE1-OPUS-AUTHORING-BUNDLE-PACKET-019",
            "LANE1-HERMES-DECISION-TRANSITION-GUARD",
            "A2A-ADAPTIVE-SYNC-CONTROL-STATUS-PACKET-021",
            "A2A-NEXT-SAFE-ACTION-SEQUENCER-PACKET-022",
            "HERMES-GATEWAY-CURRENT-RECHECK-PACKET-023",
            "HERMES-A2A-CODEX-SYNC-ALL-JOBS-PACKET-024",
            "UAT-CRUD-MONGODB-HERMES-REVIEW-PACKET-027",
            "UAT-CRUD-MONGODB-WORK-REPORT-PACKET-028",
            "SIRINX-WEBSITE-LINE-HERMES-REVIEW-PACKET-029",
            "CODING-ENGINE-SECURITY-RULES-REFACTOR-PACKET-030",
            "CODING-ENGINE-SECURITY-RULES-WORK-REPORT-PACKET-031",
            "current_actionable_packet=packet_013",
            "decision_recorded_route_to_opus",
            "Hermes packet_013 decision is recorded",
            "_A2A_QUEUE/outbox/packet_026_ghostclaw_lane1_hermes_decision_route_to_opus.json",
            "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md",
            "GHOSTCLAW-V3-3-ARTIFACT-INTAKE",
            "R0-GATE-SPECIFIC-APPROVALS",
            "ACTIVE-GOAL-BLOCKER-RECHECK",
            "ghostclaw_lane1_packet013_decision_workbench_2026-06-29.json",
            "sirinx_active_goal_context_packet_registry_2026-06-29.json",
            "sirinx_hermes_codex_a2a_godmode_v3_html_recheck_2026-06-29.json",
            "This queue is not a completion claim.",
            "_A2A_QUEUE/outbox/packet_016_ghostclaw_lane1_hermes_decision_intake_handoff.json",
            "_A2A_QUEUE/outbox/packet_017_ghostclaw_lane1_hermes_decision_preflight_audit.json",
            "_A2A_QUEUE/outbox/packet_018_ghostclaw_lane1_opus_architecture_packet_gate.json",
            "_A2A_QUEUE/outbox/packet_019_ghostclaw_lane1_opus_authoring_bundle.json",
            "_A2A_QUEUE/outbox/packet_021_sirinx_a2a_adaptive_sync_control_status.json",
            "_A2A_QUEUE/outbox/packet_022_sirinx_a2a_next_safe_action_sequencer.json",
            "_A2A_QUEUE/outbox/packet_023_sirinx_hermes_gateway_current_recheck.json",
            "_A2A_QUEUE/inbox/packet_024_sirinx_hermes_a2a_codex_sync_all_jobs.json",
            "_A2A_QUEUE/outbox/packet_027_sirinx_uat_crud_mongodb_hermes_review.json",
            "_A2A_QUEUE/outbox/packet_028_sirinx_uat_crud_mongodb_work_report_draft.json",
            "_A2A_QUEUE/outbox/packet_029_sirinx_website_line_hermes_review.json",
            "_A2A_QUEUE/outbox/packet_030_sirinx_coding_engine_security_rules_refactor.json",
            "_A2A_QUEUE/outbox/packet_031_sirinx_coding_engine_security_rules_work_report_draft.json",
            "_A2A_QUEUE/outbox/packet_034_active_goal_blocker_clearance_approval_matrix.json",
            "ACTIVE-GOAL-BLOCKER-CLEARANCE-APPROVAL-MATRIX-PACKET-034",
            "SIRINX_WEBSITE_LINE_HERMES_REVIEW_PACKET_2026-07-02.md",
            "SIRINX_CODING_ENGINE_SECURITY_RULES_REFACTOR_PACKET_2026-07-02.md",
            "SIRINX_CODING_ENGINE_SECURITY_RULES_WORK_REPORT_DRAFT_2026-07-02.md",
            "SIRINX_UAT_CRUD_MONGODB_SECURITY_RULES_2026-07-02.md",
            "SIRINX_UAT_CRUD_MONGODB_WORK_REPORT_A2A_VISIBILITY_2026-07-02.md",
            "review_only_uat_execution_gate_required",
            "They do not authorize",
            "MongoDB connection",
            "website_deploy_webhook_analytics_crm_gates_closed",
            "real_mcp_execution_gate_closed",
            "telegram_live_send_and_real_mcp_execution_gates_closed",
            "license_claim_without_license_file",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
