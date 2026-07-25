import { describe, expect, test } from "vitest";
import {
  GOD_MODE_ACTIVE_GOAL_INDEX,
  GOD_MODE_CODEX_HERMES_A2A_QUEUE_STATUS,
  GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE,
  GOD_MODE_LAYERS,
  GOD_MODE_POCKET_HATCHERY_RELEASE,
  GOD_MODE_QUEUE,
  GOD_MODE_R0_GATES,
  GOD_MODE_SECURITY_FLAGS,
  getGodModeLayer,
  getGodModeQueueSummary,
} from "./god-mode-master-os";

describe("god mode master os contract", () => {
  test("keeps the seven-layer GhostClaws architecture visible", () => {
    expect(GOD_MODE_LAYERS).toHaveLength(7);
    expect(GOD_MODE_LAYERS.map((layer) => layer.id)).toEqual([
      "L0",
      "L1",
      "L2",
      "L3",
      "L4",
      "L5",
      "L6",
    ]);
    expect(getGodModeLayer("L1")?.status).toBe("blocked");
    expect(getGodModeLayer("L2")?.status).toBe("planned");
    expect(getGodModeLayer("L6")?.name).toBe("Pocket Hatchery MVP");
    expect(JSON.stringify(getGodModeLayer("L6"))).not.toContain("waxwing");
    expect(JSON.stringify(GOD_MODE_SECURITY_FLAGS)).not.toContain("waxwing");
  });

  test("summarizes queue blockers without granting execution", () => {
    expect(GOD_MODE_QUEUE).toHaveLength(18);
    expect(getGodModeQueueSummary()).toEqual({
      total: 18,
      blocked: 2,
      r0Gated: 3,
    });
    expect(GOD_MODE_QUEUE.filter((task) => task.layer === "L6" && task.status === "done")).toHaveLength(3);
  });

  test("keeps R0 gates explicit and human-approval-only", () => {
    expect(GOD_MODE_R0_GATES).toHaveLength(8);
    expect(GOD_MODE_R0_GATES).toEqual(
      expect.arrayContaining([
        "git push - Agent Bridge v0.1.0",
        "GhostClaws Mission Control production deploy",
        "Pocket Hatchery testnet deploy",
        "Pocket Hatchery real wallet connector",
      ]),
    );
  });

  test("exposes Pocket Hatchery release evidence as read-only Mission Control data", () => {
    expect(GOD_MODE_POCKET_HATCHERY_RELEASE.score).toBe(84);
    expect(GOD_MODE_POCKET_HATCHERY_RELEASE.scoreMax).toBe(100);
    expect(GOD_MODE_POCKET_HATCHERY_RELEASE.status).toBe("local-evidence-ready");
    expect(GOD_MODE_POCKET_HATCHERY_RELEASE.externalWrites).toBe(false);
    expect(GOD_MODE_POCKET_HATCHERY_RELEASE.blockedGates).toEqual(
      expect.arrayContaining(["testnet deploy", "real wallet connector", "production deploy"]),
    );
    expect(GOD_MODE_POCKET_HATCHERY_RELEASE.evidenceFiles).toEqual(
      expect.arrayContaining([
        "apps/pocket-hatchery/ops/wallet_flow_evidence.md",
        "apps/pocket-hatchery/ops/metadata_permission_audit.md",
        "apps/pocket-hatchery/ops/rollback_plan_review.md",
      ]),
    );
  });

  test("exposes active-goal systematic work index as read-only Mission Control data", () => {
    expect(GOD_MODE_ACTIVE_GOAL_INDEX.status).toBe("in_progress_not_complete");
    expect(GOD_MODE_ACTIVE_GOAL_INDEX.claimsAllChatsRead).toBe(false);
    expect(GOD_MODE_ACTIVE_GOAL_INDEX.evidenceBoundary).toBe("local_evidence_only");
    expect(GOD_MODE_ACTIVE_GOAL_INDEX.currentActionablePacket).toBe("packet_013");
    expect(GOD_MODE_ACTIVE_GOAL_INDEX.externalWrites).toBe(false);
    expect(GOD_MODE_ACTIVE_GOAL_INDEX.lane2Authorized).toBe(false);
    expect(GOD_MODE_ACTIVE_GOAL_INDEX.blockers).toEqual(
      expect.arrayContaining([
        "BLOCK-CHAT-EXPORT",
        "BLOCK-LANE1-OPUS-PACKET",
        "BLOCK-HERMES-GATEWAY",
        "BLOCK-V3-3-ARTIFACT",
        "BLOCK-R0-APPROVALS",
      ]),
    );
    expect(GOD_MODE_ACTIVE_GOAL_INDEX.evidenceFiles).toEqual(
      expect.arrayContaining([
        "data/pathspecs/sirinx_active_goal_systematic_work_index_2026-06-29.json",
        "docs/knowledge/SIRINX_ACTIVE_GOAL_SYSTEMATIC_WORK_INDEX_2026-06-29.md",
        "data/pathspecs/sirinx_hermes_codex_a2a_godmode_v3_html_recheck_2026-06-29.json",
        "data/pathspecs/sirinx_all_chat_export_intake_mapper_2026-06-29.json",
        "data/pathspecs/sirinx_active_goal_blocker_clearance_validator_2026-06-29.json",
        "WORKSPACE_SCAFFOLD/scripts/probe_active_goal_blockers.py",
        "data/pathspecs/sirinx_active_goal_read_only_probe_runner_2026-06-29.json",
        "docs/knowledge/SIRINX_ACTIVE_GOAL_READ_ONLY_PROBE_RUNNER_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/reports/active_goal_read_only_probe_latest_2026-06-29.json",
        "data/pathspecs/sirinx_active_goal_completion_requirements_matrix_2026-06-29.json",
        "docs/knowledge/SIRINX_ACTIVE_GOAL_COMPLETION_REQUIREMENTS_MATRIX_2026-06-29.md",
        "data/pathspecs/sirinx_codex_hermes_work_report_contract_2026-06-29.json",
        "data/pathspecs/sirinx_active_goal_source_file_receipt_2026-06-29.json",
        "docs/knowledge/SIRINX_ACTIVE_GOAL_SOURCE_FILE_RECEIPT_2026-06-29.md",
        "data/pathspecs/sirinx_codex_hermes_a2a_queue_status_2026-06-29.json",
        "docs/knowledge/SIRINX_CODEX_HERMES_A2A_QUEUE_STATUS_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/reports/codex_hermes_a2a_queue_status_latest_2026-06-29.json",
        "WORKSPACE_SCAFFOLD/scripts/build_codex_hermes_a2a_queue_status.py",
        "data/pathspecs/sirinx_hermes_a2a_codex_sync_all_jobs_packet_2026-06-29.json",
        "docs/knowledge/SIRINX_HERMES_A2A_CODEX_SYNC_ALL_JOBS_PACKET_2026-06-29.md",
        "_A2A_QUEUE/inbox/packet_024_sirinx_hermes_a2a_codex_sync_all_jobs.json",
        "GHOSTCLAW/a2a-hermes-codex-bridge/command-intents.ts",
        "data/pathspecs/ghostclaw_lane1_packet013_decision_draft_2026-06-29.json",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_PACKET013_DECISION_DRAFT_2026-06-29.md",
        "_A2A_QUEUE/outbox/packet_015_ghostclaw_lane1_hermes_decision_draft.json",
        "_A2A_QUEUE/outbox/packet_018_ghostclaw_lane1_opus_architecture_packet_gate.json",
        "data/pathspecs/ghostclaw_lane1_opus_authoring_bundle_2026-06-29.json",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_AUTHORING_BUNDLE_2026-06-29.md",
        "_A2A_QUEUE/outbox/packet_019_ghostclaw_lane1_opus_authoring_bundle.json",
        "WORKSPACE_SCAFFOLD/tests/test_lane1_opus_authoring_bundle.py",
        "data/pathspecs/sirinx_a2a_adaptive_sync_control_status_2026-06-29.json",
        "docs/knowledge/SIRINX_A2A_ADAPTIVE_SYNC_CONTROL_STATUS_2026-06-29.md",
        "_A2A_QUEUE/outbox/packet_021_sirinx_a2a_adaptive_sync_control_status.json",
        "WORKSPACE_SCAFFOLD/tests/test_a2a_adaptive_sync_control_status_packet.py",
        "data/pathspecs/sirinx_a2a_next_safe_action_sequencer_2026-06-29.json",
        "docs/knowledge/SIRINX_A2A_NEXT_SAFE_ACTION_SEQUENCER_2026-06-29.md",
        "_A2A_QUEUE/outbox/packet_022_sirinx_a2a_next_safe_action_sequencer.json",
        "WORKSPACE_SCAFFOLD/tests/test_a2a_next_safe_action_sequencer_packet.py",
        "data/pathspecs/sirinx_hermes_gateway_current_recheck_packet_2026-06-29.json",
        "docs/knowledge/SIRINX_HERMES_GATEWAY_CURRENT_RECHECK_PACKET_2026-06-29.md",
        "_A2A_QUEUE/outbox/packet_023_sirinx_hermes_gateway_current_recheck.json",
        "WORKSPACE_SCAFFOLD/tests/test_hermes_gateway_current_recheck_packet.py",
        "WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_draft.py",
        "WORKSPACE_SCAFFOLD/scripts/validate_lane1_opus_architecture_packet.py",
        "data/pathspecs/ghostclaw_lane1_opus_architecture_packet_gate_2026-06-29.json",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET_GATE_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/tests/test_lane1_opus_architecture_packet_gate.py",
        "data/pathspecs/ghostclaw_lane1_hermes_decision_transition_guard_2026-06-29.json",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_TRANSITION_GUARD_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_transition_guard.py",
        "data/pathspecs/ghostclaw_lane1_hermes_decision_intake_handoff_2026-06-29.json",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_INTAKE_HANDOFF_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_intake_handoff.py",
        "WORKSPACE_SCAFFOLD/manifests/active_goal_local_evidence_durability_2026-06-29.json",
        "docs/knowledge/SIRINX_ACTIVE_GOAL_LOCAL_EVIDENCE_DURABILITY_MANIFEST_2026-06-29.md",
      ]),
    );
  });

  test("exposes Codex/Hermes execution queue as read-only Mission Control data", () => {
    expect(GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.status).toBe("active_local_only");
    expect(GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.evidenceBoundary).toBe("local_evidence_only");
    expect(GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.claimsAllChatsRead).toBe(false);
    expect(GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.lane2Authorized).toBe(false);
    expect(GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.runtimeQueueExecution).toBe(false);
    expect(GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items).toHaveLength(38);
    const firstQueueItem = GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items[0];
    expect(firstQueueItem).toBeDefined();
    expect(firstQueueItem).toMatchObject({
      id: "LANE1-HERMES-DECISION-PACKET-013",
      owner: "Hermes",
      status: "decision_recorded_route_to_opus",
      gate: "codex_recorder_gate_closed_final_opus_packet_required",
      currentActionablePacket: "packet_013",
      lane2Authorized: false,
    });
    expect(firstQueueItem?.evidence).toEqual(
      expect.arrayContaining([
        "data/pathspecs/ghostclaw_lane1_packet013_decision_workbench_2026-06-29.json",
        "data/pathspecs/ghostclaw_lane1_hermes_decision_validator_2026-06-29.json",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md",
        "_A2A_QUEUE/outbox/packet_026_ghostclaw_lane1_hermes_decision_route_to_opus.json",
        "data/pathspecs/ghostclaw_lane1_hermes_decision_intake_handoff_2026-06-29.json",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_INTAKE_HANDOFF_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_intake_handoff.py",
      ]),
    );
    expect(GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "ALL-CHAT-EXPORT-INTAKE",
        "ALL-CHAT-EXPORT-REQUEST-PACKET-020",
        "A2A-ADAPTIVE-SYNC-CONTROL-STATUS-PACKET-021",
        "A2A-NEXT-SAFE-ACTION-SEQUENCER-PACKET-022",
        "HERMES-GATEWAY-CURRENT-RECHECK-PACKET-023",
        "HERMES-A2A-CODEX-SYNC-ALL-JOBS-PACKET-024",
        "BROWSER-USE-CANDIDATE-LANE-PACKET-025",
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
        "GHOSTCLAW-V3-3-ARTIFACT-INTAKE",
        "R0-GATE-SPECIFIC-APPROVALS",
        "ACTIVE-GOAL-BLOCKER-RECHECK",
        "COMPLETION-REQUIREMENTS-MATRIX",
        "MISSION-CONTROL-READONLY-EVIDENCE",
        "SOURCE-FILE-RECEIPT",
        "CODEX-HERMES-A2A-QUEUE-STATUS",
        "CODEX-HERMES-WORK-REPORT-DRAFT",
        "SIRINX-WEBSITE-LINE-HERMES-REVIEW-PACKET-029",
        "CODING-ENGINE-SECURITY-RULES-REFACTOR-PACKET-030",
        "CODING-ENGINE-SECURITY-RULES-WORK-REPORT-PACKET-031",
        "OBSIDIAN-BRAIN-SYNC-PULSE",
        "LOCAL-EVIDENCE-DURABILITY",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "LANE1-HERMES-DECISION-HANDOFF-PACKET-016",
      ),
    ).toMatchObject({
      owner: "Codex",
      status: "handoff_superseded_by_packet_026_decision",
      gate: "decision_recorded_final_packet_required",
      currentActionablePacket: "packet_013",
      lane2Authorized: false,
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "LANE1-HERMES-DECISION-HANDOFF-PACKET-016",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "_A2A_QUEUE/outbox/packet_016_ghostclaw_lane1_hermes_decision_intake_handoff.json",
        "data/pathspecs/ghostclaw_lane1_hermes_decision_intake_handoff_2026-06-29.json",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_INTAKE_HANDOFF_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/tests/test_lane1_hermes_decision_handoff_packet.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "LANE1-HERMES-DECISION-HANDOFF-PACKET-016",
      )?.forbiddenActions,
    ).toEqual(
      expect.arrayContaining([
        "decision_record",
        "state_mutation",
        "provider_call",
        "runtime_queue_execution",
        "paid_provider_call",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "LANE1-HERMES-DECISION-DRAFT-PACKET-015",
      ),
    ).toMatchObject({
      owner: "Codex",
      status: "superseded_by_recorded_route_to_opus_decision",
      gate: "decision_recorded_final_packet_required",
      currentActionablePacket: "packet_013",
      lane2Authorized: false,
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "LANE1-HERMES-DECISION-DRAFT-PACKET-015",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_draft.py",
        "data/pathspecs/ghostclaw_lane1_packet013_decision_draft_2026-06-29.json",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_PACKET013_DECISION_DRAFT_2026-06-29.md",
        "_A2A_QUEUE/outbox/packet_015_ghostclaw_lane1_hermes_decision_draft.json",
        "WORKSPACE_SCAFFOLD/tests/test_lane1_packet013_decision_draft.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "LANE1-HERMES-DECISION-DRAFT-PACKET-015",
      )?.forbiddenActions,
    ).toEqual(
      expect.arrayContaining([
        "decision_record",
        "provider_call",
        "runtime_queue_execution",
        "telegram_live_send",
        "external_message_send",
        "paid_provider_call",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "LANE1-HERMES-DECISION-PREFLIGHT-PACKET-017",
      ),
    ).toMatchObject({
      owner: "Codex",
      status: "preflight_superseded_by_packet_026_decision",
      gate: "decision_recorded_final_packet_required",
      currentActionablePacket: "packet_013",
      lane2Authorized: false,
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "LANE1-HERMES-DECISION-PREFLIGHT-PACKET-017",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_preflight_audit.py",
        "data/pathspecs/ghostclaw_lane1_hermes_decision_preflight_audit_2026-06-29.json",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_PREFLIGHT_AUDIT_2026-06-29.md",
        "_A2A_QUEUE/outbox/packet_017_ghostclaw_lane1_hermes_decision_preflight_audit.json",
        "WORKSPACE_SCAFFOLD/tests/test_lane1_hermes_decision_preflight_audit.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "LANE1-HERMES-DECISION-PREFLIGHT-PACKET-017",
      )?.forbiddenActions,
    ).toEqual(
      expect.arrayContaining([
        "decision_record",
        "state_mutation",
        "provider_call",
        "runtime_queue_execution",
        "paid_provider_call",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "LANE1-OPUS-ARCHITECTURE-PACKET-GATE-PACKET-018",
      ),
    ).toMatchObject({
      owner: "Codex",
      status: "validator_ready_final_packet_missing",
      gate: "final_opus_packet_required_after_route_to_opus",
      currentActionablePacket: "packet_013",
      lane2Authorized: false,
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "LANE1-OPUS-ARCHITECTURE-PACKET-GATE-PACKET-018",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "WORKSPACE_SCAFFOLD/scripts/validate_lane1_opus_architecture_packet.py",
        "data/pathspecs/ghostclaw_lane1_opus_architecture_packet_gate_2026-06-29.json",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET_GATE_2026-06-29.md",
        "_A2A_QUEUE/outbox/packet_018_ghostclaw_lane1_opus_architecture_packet_gate.json",
        "WORKSPACE_SCAFFOLD/tests/test_lane1_opus_architecture_packet_gate.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "LANE1-OPUS-ARCHITECTURE-PACKET-GATE-PACKET-018",
      )?.forbiddenActions,
    ).toEqual(
      expect.arrayContaining([
        "decision_record",
        "state_mutation",
        "final_packet_creation",
        "runtime_queue_execution",
        "paid_provider_call",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "LANE1-OPUS-AUTHORING-BUNDLE-PACKET-019",
      ),
    ).toMatchObject({
      owner: "Codex",
      status: "authoring_bundle_ready_not_final_packet",
      gate: "route_to_opus_final_packet_required",
      currentActionablePacket: "packet_013",
      lane2Authorized: false,
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "LANE1-OPUS-AUTHORING-BUNDLE-PACKET-019",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "data/pathspecs/ghostclaw_lane1_opus_authoring_bundle_2026-06-29.json",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_AUTHORING_BUNDLE_2026-06-29.md",
        "_A2A_QUEUE/outbox/packet_019_ghostclaw_lane1_opus_authoring_bundle.json",
        "WORKSPACE_SCAFFOLD/tests/test_lane1_opus_authoring_bundle.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "LANE1-OPUS-AUTHORING-BUNDLE-PACKET-019",
      )?.forbiddenActions,
    ).toEqual(
      expect.arrayContaining([
        "decision_record",
        "state_mutation",
        "final_packet_creation",
        "provider_call",
        "runtime_queue_execution",
        "paid_provider_call",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "LANE1-HERMES-DECISION-TRANSITION-GUARD",
      ),
    ).toMatchObject({
      owner: "Codex",
      status: "validated_decision_transition_ready",
      gate: "await_opus_architecture_packet",
      currentActionablePacket: "packet_013",
      lane2Authorized: false,
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "LANE1-HERMES-DECISION-TRANSITION-GUARD",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_transition_guard.py",
        "data/pathspecs/ghostclaw_lane1_hermes_decision_transition_guard_2026-06-29.json",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_TRANSITION_GUARD_2026-06-29.md",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md",
        "WORKSPACE_SCAFFOLD/tests/test_lane1_hermes_decision_transition_guard.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "LANE1-HERMES-DECISION-TRANSITION-GUARD",
      )?.forbiddenActions,
    ).toEqual(
      expect.arrayContaining([
        "decision_record",
        "state_mutation",
        "provider_call",
        "runtime_queue_execution",
        "paid_provider_call",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "LANE1-OPUS-FINAL-PACKET-AUTHORING-REQUEST-PACKET-032",
      ),
    ).toMatchObject({
      owner: "Codex",
      status: "authoring_request_ready_local_only",
      gate: "await_opus_architecture_packet",
      currentActionablePacket: "packet_013",
      lane2Authorized: false,
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "LANE1-OPUS-FINAL-PACKET-AUTHORING-REQUEST-PACKET-032",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "_A2A_QUEUE/outbox/packet_032_ghostclaw_lane1_opus_final_packet_authoring_request.json",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_FINAL_PACKET_AUTHORING_REQUEST_2026-07-02.md",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md",
        "WORKSPACE_SCAFFOLD/tests/test_lane1_opus_final_packet_authoring_request.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "LANE1-OPUS-FINAL-PACKET-AUTHORING-REQUEST-PACKET-032",
      )?.forbiddenActions,
    ).toEqual(
      expect.arrayContaining([
        "final_packet_creation",
        "lane2_authorization",
        "real_mcp_execution",
        "provider_call",
        "runtime_queue_execution",
        "paid_provider_call",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "ACTIVE-GOAL-BLOCKER-REFRESH-HERMES-HANDOFF-PACKET-033",
      ),
    ).toMatchObject({
      owner: "Codex",
      status: "handoff_ready_local_only",
      gate: "blockers_still_open_review_only",
      currentActionablePacket: "packet_013",
      lane2Authorized: false,
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "ACTIVE-GOAL-BLOCKER-REFRESH-HERMES-HANDOFF-PACKET-033",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "_A2A_QUEUE/outbox/packet_033_active_goal_blocker_refresh_hermes_handoff.json",
        "docs/knowledge/SIRINX_ACTIVE_GOAL_BLOCKER_REFRESH_HERMES_HANDOFF_2026-07-02.md",
        "docs/knowledge/SIRINX_ACTIVE_GOAL_CURRENT_BLOCKER_REFRESH_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/tests/test_active_goal_blocker_refresh_hermes_handoff_packet.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "ACTIVE-GOAL-BLOCKER-REFRESH-HERMES-HANDOFF-PACKET-033",
      )?.forbiddenActions,
    ).toEqual(
      expect.arrayContaining([
        "service_repair",
        "service_restart",
        "runtime_queue_execution",
        "final_packet_creation",
        "lane2_authorization",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "ACTIVE-GOAL-BLOCKER-CLEARANCE-APPROVAL-MATRIX-PACKET-034",
      ),
    ).toMatchObject({
      owner: "Codex",
      status: "approval_matrix_ready_local_only",
      gate: "one_blocker_one_gate_required",
      currentActionablePacket: "packet_013",
      lane2Authorized: false,
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "ACTIVE-GOAL-BLOCKER-CLEARANCE-APPROVAL-MATRIX-PACKET-034",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "_A2A_QUEUE/outbox/packet_034_active_goal_blocker_clearance_approval_matrix.json",
        "docs/knowledge/SIRINX_ACTIVE_GOAL_BLOCKER_CLEARANCE_APPROVAL_MATRIX_2026-07-02.md",
        "_A2A_QUEUE/outbox/packet_033_active_goal_blocker_refresh_hermes_handoff.json",
        "WORKSPACE_SCAFFOLD/tests/test_active_goal_blocker_clearance_approval_matrix_packet.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "ACTIVE-GOAL-BLOCKER-CLEARANCE-APPROVAL-MATRIX-PACKET-034",
      )?.forbiddenActions,
    ).toEqual(
      expect.arrayContaining([
        "line_webhook_activation",
        "production_analytics",
        "crm_customer_data_storage",
        "runtime_queue_execution",
        "final_packet_creation",
        "lane2_authorization",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "ACTIVE-GOAL-CHAT-EXPORT-READONLY-MAPPING-GATE-REQUEST-PACKET-035",
      ),
    ).toMatchObject({
      owner: "Codex",
      status: "gate_request_ready_local_only",
      gate: "chat_export_readonly_mapping_approval_required",
      currentActionablePacket: "packet_013",
      lane2Authorized: false,
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "ACTIVE-GOAL-CHAT-EXPORT-READONLY-MAPPING-GATE-REQUEST-PACKET-035",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "_A2A_QUEUE/outbox/packet_035_active_goal_chat_export_readonly_mapping_gate_request.json",
        "docs/knowledge/SIRINX_ACTIVE_GOAL_CHAT_EXPORT_READONLY_MAPPING_GATE_REQUEST_2026-07-02.md",
        "_A2A_QUEUE/outbox/packet_034_active_goal_blocker_clearance_approval_matrix.json",
        "docs/knowledge/SIRINX_ACTIVE_GOAL_BLOCKER_CLEARANCE_APPROVAL_MATRIX_2026-07-02.md",
        "_A2A_QUEUE/outbox/packet_020_sirinx_all_chat_export_request.json",
        "docs/knowledge/SIRINX_ALL_CHAT_EXPORT_REQUEST_PACKET_2026-06-29.md",
        "data/pathspecs/sirinx_all_chat_export_intake_contract_2026-06-29.json",
        "data/pathspecs/sirinx_all_chat_export_intake_mapper_2026-06-29.json",
        "WORKSPACE_SCAFFOLD/tests/test_active_goal_chat_export_readonly_mapping_gate_request_packet.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "ACTIVE-GOAL-CHAT-EXPORT-READONLY-MAPPING-GATE-REQUEST-PACKET-035",
      )?.forbiddenActions,
    ).toEqual(
      expect.arrayContaining([
        "connector_read_performed",
        "real_export_loaded",
        "raw_chat_content_stored",
        "claims_all_chats_read",
        "runtime_queue_execution",
        "real_mcp_execution",
        "line_webhook_activation",
        "production_analytics",
        "crm_customer_data_storage",
        "service_repair",
        "service_restart",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "CHATGPT-EXPORT-READONLY-SOURCE-RECEIPT-VALIDATOR-PACKET-036",
      ),
    ).toMatchObject({
      owner: "Codex",
      status: "validator_review_ready_local_only",
      gate: "chat_export_readonly_mapping_approval_required",
      currentActionablePacket: "packet_013",
      lane2Authorized: false,
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "CHATGPT-EXPORT-READONLY-SOURCE-RECEIPT-VALIDATOR-PACKET-036",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "_A2A_QUEUE/outbox/packet_036_chatgpt_export_readonly_source_receipt_validator.json",
        "WORKSPACE_SCAFFOLD/scripts/validate_chatgpt_export_readonly_source_receipt.py",
        "data/pathspecs/sirinx_chatgpt_export_readonly_source_receipt_validator_2026-07-02.json",
        "docs/knowledge/SIRINX_CHATGPT_EXPORT_READONLY_SOURCE_RECEIPT_VALIDATOR_2026-07-02.md",
        "WORKSPACE_SCAFFOLD/tests/test_chatgpt_export_readonly_source_receipt_validator.py",
        "WORKSPACE_SCAFFOLD/tests/test_chatgpt_export_readonly_source_receipt_validator_packet.py",
        "_A2A_QUEUE/outbox/packet_035_active_goal_chat_export_readonly_mapping_gate_request.json",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "CHATGPT-EXPORT-READONLY-SOURCE-RECEIPT-VALIDATOR-PACKET-036",
      )?.forbiddenActions,
    ).toEqual(
      expect.arrayContaining([
        "connector_read_performed",
        "real_export_loaded",
        "source_loaded",
        "raw_chat_content_stored",
        "claims_all_chats_read",
        "runtime_queue_execution",
        "real_mcp_execution",
        "line_webhook_activation",
        "production_analytics",
        "crm_customer_data_storage",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find((item) => item.id === "CODEX-HERMES-WORK-REPORT-DRAFT")
        ?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "data/pathspecs/sirinx_codex_hermes_work_report_contract_2026-06-29.json",
        "docs/knowledge/SIRINX_CODEX_HERMES_WORK_REPORT_DRAFT_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/scripts/build_codex_hermes_work_report.py",
        "WORKSPACE_SCAFFOLD/tests/test_codex_hermes_work_report.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find((item) => item.id === "CODEX-HERMES-WORK-REPORT-DRAFT")
        ?.forbiddenActions,
    ).toEqual(expect.arrayContaining(["telegram_live_send", "external_message_send", "paid_provider_call"]));
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find((item) => item.id === "ALL-CHAT-EXPORT-INTAKE")?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "data/pathspecs/sirinx_all_chat_export_intake_contract_2026-06-29.json",
        "data/pathspecs/sirinx_all_chat_export_intake_mapper_2026-06-29.json",
        "docs/knowledge/SIRINX_ALL_CHAT_EXPORT_INTAKE_MAPPER_2026-06-29.md",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "ALL-CHAT-EXPORT-REQUEST-PACKET-020",
      ),
    ).toMatchObject({
      owner: "Codex",
      status: "request_packet_ready_no_export_loaded",
      gate: "chat_export_required",
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "ALL-CHAT-EXPORT-REQUEST-PACKET-020",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "data/pathspecs/sirinx_all_chat_export_request_packet_2026-06-29.json",
        "docs/knowledge/SIRINX_ALL_CHAT_EXPORT_REQUEST_PACKET_2026-06-29.md",
        "_A2A_QUEUE/outbox/packet_020_sirinx_all_chat_export_request.json",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "ALL-CHAT-EXPORT-REQUEST-PACKET-020",
      )?.forbiddenActions,
    ).toEqual(expect.arrayContaining(["raw_chat_content_stored", "claims_all_chats_read", "provider_call"]));
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "A2A-ADAPTIVE-SYNC-CONTROL-STATUS-PACKET-021",
      ),
    ).toMatchObject({
      owner: "Codex",
      status: "a2a_adaptive_sync_control_status_ready_local_only",
      gate: "local_read_only_status_review",
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "A2A-ADAPTIVE-SYNC-CONTROL-STATUS-PACKET-021",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "data/pathspecs/sirinx_a2a_adaptive_sync_control_status_2026-06-29.json",
        "docs/knowledge/SIRINX_A2A_ADAPTIVE_SYNC_CONTROL_STATUS_2026-06-29.md",
        "_A2A_QUEUE/outbox/packet_021_sirinx_a2a_adaptive_sync_control_status.json",
        "WORKSPACE_SCAFFOLD/tests/test_a2a_adaptive_sync_control_status_packet.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "A2A-ADAPTIVE-SYNC-CONTROL-STATUS-PACKET-021",
      )?.forbiddenActions,
    ).toEqual(expect.arrayContaining(["connector_read", "claims_all_chats_read", "runtime_queue_execution"]));
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "A2A-NEXT-SAFE-ACTION-SEQUENCER-PACKET-022",
      ),
    ).toMatchObject({
      owner: "Codex",
      status: "a2a_next_safe_action_sequencer_ready_local_only",
      gate: "local_read_only_next_lane_review",
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "A2A-NEXT-SAFE-ACTION-SEQUENCER-PACKET-022",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "data/pathspecs/sirinx_a2a_next_safe_action_sequencer_2026-06-29.json",
        "docs/knowledge/SIRINX_A2A_NEXT_SAFE_ACTION_SEQUENCER_2026-06-29.md",
        "_A2A_QUEUE/outbox/packet_022_sirinx_a2a_next_safe_action_sequencer.json",
        "WORKSPACE_SCAFFOLD/tests/test_a2a_next_safe_action_sequencer_packet.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "A2A-NEXT-SAFE-ACTION-SEQUENCER-PACKET-022",
      )?.forbiddenActions,
    ).toEqual(expect.arrayContaining(["decision_record", "state_mutation", "runtime_queue_execution"]));
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "HERMES-GATEWAY-CURRENT-RECHECK-PACKET-023",
      ),
    ).toMatchObject({
      owner: "Codex",
      status: "hermes_gateway_current_recheck_ready_local_only",
      gate: "local_read_only_gateway_status_review",
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "HERMES-GATEWAY-CURRENT-RECHECK-PACKET-023",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "data/pathspecs/sirinx_hermes_gateway_current_recheck_packet_2026-06-29.json",
        "docs/knowledge/SIRINX_HERMES_GATEWAY_CURRENT_RECHECK_PACKET_2026-06-29.md",
        "_A2A_QUEUE/outbox/packet_023_sirinx_hermes_gateway_current_recheck.json",
        "WORKSPACE_SCAFFOLD/tests/test_hermes_gateway_current_recheck_packet.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "HERMES-GATEWAY-CURRENT-RECHECK-PACKET-023",
      )?.forbiddenActions,
    ).toEqual(expect.arrayContaining(["restart_hermes", "decision_record", "runtime_queue_execution"]));
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "HERMES-A2A-CODEX-SYNC-ALL-JOBS-PACKET-024",
      ),
    ).toMatchObject({
      owner: "Hermes / Codex",
      status: "goal_command_inbox_ready_local_only",
      gate: "local_read_only_goal_command_review",
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "HERMES-A2A-CODEX-SYNC-ALL-JOBS-PACKET-024",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "data/pathspecs/sirinx_hermes_a2a_codex_sync_all_jobs_packet_2026-06-29.json",
        "docs/knowledge/SIRINX_HERMES_A2A_CODEX_SYNC_ALL_JOBS_PACKET_2026-06-29.md",
        "_A2A_QUEUE/inbox/packet_024_sirinx_hermes_a2a_codex_sync_all_jobs.json",
        "GHOSTCLAW/a2a-hermes-codex-bridge/command-intents.ts",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "HERMES-A2A-CODEX-SYNC-ALL-JOBS-PACKET-024",
      )?.forbiddenActions,
    ).toEqual(
      expect.arrayContaining([
        "real_codex_cli_execution",
        "runtime_queue_execution",
        "provider_call",
        "license_claim_without_license_file",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "BROWSER-USE-CANDIDATE-LANE-PACKET-025",
      ),
    ).toMatchObject({
      owner: "Codex",
      status: "browser_use_candidate_lane_ready_local_only",
      gate: "candidate_review_only_install_gate_required",
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "BROWSER-USE-CANDIDATE-LANE-PACKET-025",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "data/pathspecs/sirinx_browser_use_candidate_lane_2026-06-29.json",
        "docs/knowledge/SIRINX_BROWSER_USE_CANDIDATE_LANE_2026-06-29.md",
        "_A2A_QUEUE/outbox/packet_025_sirinx_browser_use_candidate_lane.json",
        "WORKSPACE_SCAFFOLD/tests/test_browser_use_candidate_lane.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "BROWSER-USE-CANDIDATE-LANE-PACKET-025",
      )?.forbiddenActions,
    ).toEqual(
      expect.arrayContaining([
        "install_browser_use",
        "browser_execution",
        "browser_use_cloud",
        "profile_sync",
        "cookie_export",
        "real_chrome_profile",
        "form_submit",
        "provider_call",
        "runtime_queue_execution",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "UAT-CRUD-MONGODB-HERMES-REVIEW-PACKET-027",
      ),
    ).toMatchObject({
      owner: "Codex",
      status: "uat_crud_mongodb_review_ready_local_only",
      gate: "review_only_uat_execution_gate_required",
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "UAT-CRUD-MONGODB-HERMES-REVIEW-PACKET-027",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "skills/uat-crud-mongodb/SKILL.md",
        "docs/knowledge/SIRINX_UAT_CRUD_MONGODB_SECURITY_RULES_2026-07-02.md",
        "docs/knowledge/SIRINX_UAT_CRUD_MONGODB_HERMES_REVIEW_PACKET_2026-07-02.md",
        "docs/knowledge/SIRINX_UAT_CRUD_MONGODB_HERMES_REVIEW_PACKET_2026-07-02.json",
        "docs/knowledge/SIRINX_UAT_CRUD_MONGODB_A2A_QUEUE_VISIBILITY_2026-07-02.md",
        "_A2A_QUEUE/outbox/packet_027_sirinx_uat_crud_mongodb_hermes_review.json",
        "WORKSPACE_SCAFFOLD/tests/test_uat_crud_mongodb_hermes_review_packet.py",
        "WORKSPACE_SCAFFOLD/tests/test_uat_crud_mongodb_a2a_queue_visibility.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "UAT-CRUD-MONGODB-HERMES-REVIEW-PACKET-027",
      )?.forbiddenActions,
    ).toEqual(
      expect.arrayContaining([
        "real_env_read",
        "mongodb_connect",
        "database_write",
        "database_migration",
        "dependency_install",
        "browser_execution",
        "stagehand_execution",
        "playwright_execution",
        "public_tunnel",
        "customer_data",
        "runtime_queue_execution",
        "provider_call",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "UAT-CRUD-MONGODB-WORK-REPORT-PACKET-028",
      ),
    ).toMatchObject({
      owner: "Codex",
      status: "telegram_draft_ready_local_only",
      gate: "telegram_live_send_gate_closed",
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "UAT-CRUD-MONGODB-WORK-REPORT-PACKET-028",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "data/pathspecs/sirinx_uat_crud_mongodb_work_report_queue_2026-07-02.json",
        "data/pathspecs/sirinx_uat_crud_mongodb_work_report_contract_2026-07-02.json",
        "docs/knowledge/SIRINX_UAT_CRUD_MONGODB_WORK_REPORT_DRAFT_2026-07-02.md",
        "docs/knowledge/SIRINX_UAT_CRUD_MONGODB_WORK_REPORT_A2A_VISIBILITY_2026-07-02.md",
        "_A2A_QUEUE/outbox/packet_028_sirinx_uat_crud_mongodb_work_report_draft.json",
        "_A2A_QUEUE/outbox/packet_027_sirinx_uat_crud_mongodb_hermes_review.json",
        "WORKSPACE_SCAFFOLD/scripts/build_codex_hermes_work_report.py",
        "WORKSPACE_SCAFFOLD/tests/test_uat_crud_mongodb_work_report_packet.py",
        "WORKSPACE_SCAFFOLD/tests/test_uat_crud_mongodb_work_report_a2a_visibility.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "UAT-CRUD-MONGODB-WORK-REPORT-PACKET-028",
      )?.forbiddenActions,
    ).toEqual(
      expect.arrayContaining([
        "telegram_live_send",
        "line_send",
        "real_env_read",
        "mongodb_connect",
        "database_write",
        "dependency_install",
        "public_tunnel",
        "runtime_queue_execution",
        "provider_call",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "SIRINX-WEBSITE-LINE-HERMES-REVIEW-PACKET-029",
      ),
    ).toMatchObject({
      owner: "Codex",
      status: "website_line_review_ready_local_only",
      gate: "website_deploy_webhook_analytics_crm_gates_closed",
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "SIRINX-WEBSITE-LINE-HERMES-REVIEW-PACKET-029",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "_A2A_QUEUE/outbox/packet_029_sirinx_website_line_hermes_review.json",
        "docs/knowledge/SIRINX_WEBSITE_LINE_HERMES_REVIEW_PACKET_2026-07-02.md",
        "docs/knowledge/SIRINX_WEBSITE_LINE_HERMES_REVIEW_PACKET_2026-07-02.json",
        "docs/website/SIRINX_WEBSITE_QUALITY_AUDIT.md",
        "WORKSPACE_SCAFFOLD/tests/test_sirinx_website_line_hermes_review_packet.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "SIRINX-WEBSITE-LINE-HERMES-REVIEW-PACKET-029",
      )?.forbiddenActions,
    ).toEqual(
      expect.arrayContaining([
        "deploy",
        "push",
        "secret_read",
        "provider_call",
        "runtime_queue_execution",
        "customer_send",
        "telegram_live_send",
        "line_send",
        "line_webhook_activation",
        "production_analytics",
        "crm_customer_data_storage",
        "public_tunnel",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "SIRINX-WEBSITE-LINE-UAT-VERIFICATION-RECEIPT-PACKET-039",
      ),
    ).toMatchObject({
      owner: "Codex",
      status: "local_uat_verified_no_deploy",
      gate: "website_deploy_webhook_analytics_crm_gates_closed",
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "SIRINX-WEBSITE-LINE-UAT-VERIFICATION-RECEIPT-PACKET-039",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "_A2A_QUEUE/outbox/packet_039_sirinx_website_line_uat_verification_receipt.json",
        "docs/knowledge/SIRINX_WEBSITE_LINE_UAT_VERIFICATION_RECEIPT_2026-07-02.md",
        "docs/knowledge/SIRINX_WEBSITE_LINE_UAT_VERIFICATION_RECEIPT_2026-07-02.json",
        "_A2A_QUEUE/outbox/packet_029_sirinx_website_line_hermes_review.json",
        "apps/sirinx-site/tests/line-integration.spec.ts",
        "WORKSPACE_SCAFFOLD/tests/test_sirinx_website_line_uat_verification_receipt_packet.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "SIRINX-WEBSITE-LINE-UAT-VERIFICATION-RECEIPT-PACKET-039",
      )?.forbiddenActions,
    ).toEqual(
      expect.arrayContaining([
        "deploy",
        "line_webhook_activation",
        "production_analytics",
        "crm_customer_data_storage",
        "customer_send",
        "public_tunnel",
        "local_stack_restart",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "SIRINX-WEBSITE-HUMAN-REVIEW-DEPLOY-GATE-PACKET-040",
      ),
    ).toMatchObject({
      owner: "Codex",
      status: "pending_human_review_no_deploy",
      gate: "human_review_real_device_qr_bot_check_and_explicit_deploy_approval_required",
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "SIRINX-WEBSITE-HUMAN-REVIEW-DEPLOY-GATE-PACKET-040",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "_A2A_QUEUE/outbox/packet_040_sirinx_website_human_review_deploy_gate.json",
        "docs/knowledge/SIRINX_WEBSITE_HUMAN_REVIEW_DEPLOY_GATE_2026-07-02.md",
        "docs/knowledge/SIRINX_WEBSITE_HUMAN_REVIEW_DEPLOY_GATE_2026-07-02.json",
        "_A2A_QUEUE/outbox/packet_039_sirinx_website_line_uat_verification_receipt.json",
        "docs/superpowers/plans/2026-07-02-quote-roi-crm-readiness.md",
        "WORKSPACE_SCAFFOLD/tests/test_sirinx_website_human_review_deploy_gate_packet.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "SIRINX-WEBSITE-HUMAN-REVIEW-DEPLOY-GATE-PACKET-040",
      )?.forbiddenActions,
    ).toEqual(
      expect.arrayContaining([
        "deploy",
        "line_webhook_activation",
        "production_analytics",
        "crm_customer_data_storage",
        "database_write",
        "customer_data_storage",
        "public_tunnel",
        "local_stack_restart",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "CODING-ENGINE-SECURITY-RULES-REFACTOR-PACKET-030",
      ),
    ).toMatchObject({
      owner: "Codex",
      status: "refactor_packet_ready_local_only",
      gate: "real_mcp_execution_gate_closed",
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "CODING-ENGINE-SECURITY-RULES-REFACTOR-PACKET-030",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "_A2A_QUEUE/outbox/packet_030_sirinx_coding_engine_security_rules_refactor.json",
        "docs/knowledge/SIRINX_CODING_ENGINE_SECURITY_RULES_REFACTOR_PACKET_2026-07-02.md",
        "docs/knowledge/SIRINX_CODING_ENGINE_SECURITY_RULES_REFACTOR_A2A_VISIBILITY_2026-07-02.md",
        "packages/policy-core/src/index.mjs",
        "services/dev-control-api/src/vibe-coding-agent.mjs",
        "skills/uat-crud-mongodb/SKILL.md",
        "WORKSPACE_SCAFFOLD/tests/test_coding_engine_security_rules_refactor_packet.py",
        "WORKSPACE_SCAFFOLD/tests/test_coding_engine_security_rules_refactor_a2a_visibility.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "CODING-ENGINE-SECURITY-RULES-REFACTOR-PACKET-030",
      )?.forbiddenActions,
    ).toEqual(
      expect.arrayContaining([
        "real_mcp_execution",
        "mcp_registration",
        "runtime_queue_execution",
        "provider_call",
        "deploy",
        "push",
        "customer_send",
        "secret_read",
        "production_mutation",
        "customer_data_storage",
        "telegram_live_send",
        "external_message_send",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "CODING-ENGINE-SECURITY-RULES-WORK-REPORT-PACKET-031",
      ),
    ).toMatchObject({
      owner: "Codex",
      status: "telegram_draft_ready_local_only",
      gate: "telegram_live_send_gate_closed",
    });
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "CODING-ENGINE-SECURITY-RULES-WORK-REPORT-PACKET-031",
      )?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "_A2A_QUEUE/outbox/packet_031_sirinx_coding_engine_security_rules_work_report_draft.json",
        "_A2A_QUEUE/outbox/packet_030_sirinx_coding_engine_security_rules_refactor.json",
        "docs/knowledge/SIRINX_CODING_ENGINE_SECURITY_RULES_WORK_REPORT_DRAFT_2026-07-02.md",
        "docs/knowledge/SIRINX_CODING_ENGINE_SECURITY_RULES_WORK_REPORT_A2A_VISIBILITY_2026-07-02.md",
        "WORKSPACE_SCAFFOLD/tests/test_coding_engine_security_rules_work_report_packet.py",
        "WORKSPACE_SCAFFOLD/tests/test_coding_engine_security_rules_work_report_a2a_visibility.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find(
        (item) => item.id === "CODING-ENGINE-SECURITY-RULES-WORK-REPORT-PACKET-031",
      )?.forbiddenActions,
    ).toEqual(
      expect.arrayContaining([
        "telegram_live_send",
        "real_mcp_execution",
        "runtime_queue_execution",
        "provider_call",
        "deploy",
        "push",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find((item) => item.id === "GHOSTCLAW-V3-3-ARTIFACT-INTAKE")
        ?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "data/pathspecs/sirinx_hermes_codex_a2a_godmode_v3_html_recheck_2026-06-29.json",
        "data/pathspecs/sirinx_ghostclaw_v3_3_artifact_gate_validator_2026-06-29.json",
        "docs/knowledge/SIRINX_GHOSTCLAW_V3_3_ARTIFACT_GATE_VALIDATOR_2026-06-29.md",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find((item) => item.id === "ACTIVE-GOAL-BLOCKER-RECHECK")
        ?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "data/pathspecs/sirinx_active_goal_blocker_recheck_2026-06-29.json",
        "data/pathspecs/sirinx_active_goal_blocker_clearance_validator_2026-06-29.json",
        "data/pathspecs/sirinx_active_goal_current_blocker_refresh_2026-06-29.json",
        "WORKSPACE_SCAFFOLD/scripts/probe_active_goal_blockers.py",
        "data/pathspecs/sirinx_active_goal_read_only_probe_runner_2026-06-29.json",
        "docs/knowledge/SIRINX_ACTIVE_GOAL_READ_ONLY_PROBE_RUNNER_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/reports/active_goal_read_only_probe_latest_2026-06-29.json",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find((item) => item.id === "ACTIVE-GOAL-BLOCKER-RECHECK")
        ?.allowedActions,
    ).toEqual(expect.arrayContaining(["run_read_only_blocker_probe"]));
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find((item) => item.id === "COMPLETION-REQUIREMENTS-MATRIX")
        ?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "data/pathspecs/sirinx_active_goal_completion_requirements_matrix_2026-06-29.json",
        "docs/knowledge/SIRINX_ACTIVE_GOAL_COMPLETION_REQUIREMENTS_MATRIX_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/tests/test_active_goal_completion_requirements_matrix.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find((item) => item.id === "COMPLETION-REQUIREMENTS-MATRIX")
        ?.forbiddenActions,
    ).toEqual(expect.arrayContaining(["completion_claim", "paid_provider_call", "runtime_queue_execution"]));
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find((item) => item.id === "SOURCE-FILE-RECEIPT")?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "data/pathspecs/sirinx_active_goal_source_file_receipt_2026-06-29.json",
        "docs/knowledge/SIRINX_ACTIVE_GOAL_SOURCE_FILE_RECEIPT_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/tests/test_active_goal_source_file_receipt.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find((item) => item.id === "SOURCE-FILE-RECEIPT")
        ?.forbiddenActions,
    ).toEqual(expect.arrayContaining(["merge_script_execution", "paid_provider_call", "runtime_queue_execution"]));
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find((item) => item.id === "CODEX-HERMES-A2A-QUEUE-STATUS")
        ?.evidence,
    ).toEqual(
      expect.arrayContaining([
        "data/pathspecs/sirinx_codex_hermes_a2a_queue_status_2026-06-29.json",
        "docs/knowledge/SIRINX_CODEX_HERMES_A2A_QUEUE_STATUS_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/reports/codex_hermes_a2a_queue_status_latest_2026-06-29.json",
        "WORKSPACE_SCAFFOLD/scripts/build_codex_hermes_a2a_queue_status.py",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find((item) => item.id === "CODEX-HERMES-A2A-QUEUE-STATUS")
        ?.forbiddenActions,
    ).toEqual(
      expect.arrayContaining([
        "runtime_queue_execution",
        "telegram_live_send",
        "external_message_send",
        "paid_provider_call",
      ]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find((item) => item.id === "R0-GATE-SPECIFIC-APPROVALS")
        ?.evidence,
    ).toEqual(
      expect.arrayContaining(["data/pathspecs/sirinx_r0_gate_specific_approval_contract_2026-06-29.json"]),
    );
    expect(
      GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.items.find((item) => item.id === "LOCAL-EVIDENCE-DURABILITY")
        ?.forbiddenActions,
    ).toEqual(expect.arrayContaining(["force_add_ignored_data", "paid_provider_call", "runtime_queue_execution"]));
    expect(GOD_MODE_CODEX_HERMES_EXECUTION_QUEUE.evidenceFiles).toEqual(
      expect.arrayContaining([
        "data/pathspecs/sirinx_codex_hermes_execution_queue_2026-06-29.json",
        "docs/knowledge/SIRINX_CODEX_HERMES_EXECUTION_QUEUE_2026-06-29.md",
        "docs/knowledge/SIRINX_HERMES_CODEX_A2A_GODMODE_V3_HTML_RECHECK_2026-06-29.md",
        "data/pathspecs/sirinx_active_goal_current_blocker_refresh_2026-06-29.json",
        "WORKSPACE_SCAFFOLD/scripts/probe_active_goal_blockers.py",
        "data/pathspecs/sirinx_active_goal_read_only_probe_runner_2026-06-29.json",
        "docs/knowledge/SIRINX_ACTIVE_GOAL_READ_ONLY_PROBE_RUNNER_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/reports/active_goal_read_only_probe_latest_2026-06-29.json",
        "data/pathspecs/sirinx_active_goal_completion_requirements_matrix_2026-06-29.json",
        "docs/knowledge/SIRINX_ACTIVE_GOAL_COMPLETION_REQUIREMENTS_MATRIX_2026-06-29.md",
        "data/pathspecs/sirinx_active_goal_context_packet_registry_2026-06-29.json",
        "data/pathspecs/sirinx_active_goal_source_file_receipt_2026-06-29.json",
        "docs/knowledge/SIRINX_ACTIVE_GOAL_SOURCE_FILE_RECEIPT_2026-06-29.md",
        "data/pathspecs/sirinx_ghostclaw_v3_3_artifact_gate_validator_2026-06-29.json",
        "data/pathspecs/ghostclaw_lane1_packet013_decision_workbench_2026-06-29.json",
        "data/pathspecs/ghostclaw_lane1_hermes_decision_validator_2026-06-29.json",
        "data/pathspecs/ghostclaw_lane1_packet013_decision_draft_2026-06-29.json",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_PACKET013_DECISION_DRAFT_2026-06-29.md",
        "_A2A_QUEUE/outbox/packet_015_ghostclaw_lane1_hermes_decision_draft.json",
        "_A2A_QUEUE/outbox/packet_016_ghostclaw_lane1_hermes_decision_intake_handoff.json",
        "_A2A_QUEUE/outbox/packet_017_ghostclaw_lane1_hermes_decision_preflight_audit.json",
        "_A2A_QUEUE/outbox/packet_018_ghostclaw_lane1_opus_architecture_packet_gate.json",
        "_A2A_QUEUE/outbox/packet_019_ghostclaw_lane1_opus_authoring_bundle.json",
        "_A2A_QUEUE/outbox/packet_021_sirinx_a2a_adaptive_sync_control_status.json",
        "data/pathspecs/sirinx_a2a_adaptive_sync_control_status_2026-06-29.json",
        "docs/knowledge/SIRINX_A2A_ADAPTIVE_SYNC_CONTROL_STATUS_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/tests/test_a2a_adaptive_sync_control_status_packet.py",
        "_A2A_QUEUE/outbox/packet_022_sirinx_a2a_next_safe_action_sequencer.json",
        "data/pathspecs/sirinx_a2a_next_safe_action_sequencer_2026-06-29.json",
        "docs/knowledge/SIRINX_A2A_NEXT_SAFE_ACTION_SEQUENCER_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/tests/test_a2a_next_safe_action_sequencer_packet.py",
        "_A2A_QUEUE/outbox/packet_023_sirinx_hermes_gateway_current_recheck.json",
        "data/pathspecs/sirinx_hermes_gateway_current_recheck_packet_2026-06-29.json",
        "docs/knowledge/SIRINX_HERMES_GATEWAY_CURRENT_RECHECK_PACKET_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/tests/test_hermes_gateway_current_recheck_packet.py",
        "_A2A_QUEUE/inbox/packet_024_sirinx_hermes_a2a_codex_sync_all_jobs.json",
        "data/pathspecs/sirinx_hermes_a2a_codex_sync_all_jobs_packet_2026-06-29.json",
        "docs/knowledge/SIRINX_HERMES_A2A_CODEX_SYNC_ALL_JOBS_PACKET_2026-06-29.md",
        "GHOSTCLAW/a2a-hermes-codex-bridge/command-intents.ts",
        "_A2A_QUEUE/outbox/packet_025_sirinx_browser_use_candidate_lane.json",
        "data/pathspecs/sirinx_browser_use_candidate_lane_2026-06-29.json",
        "docs/knowledge/SIRINX_BROWSER_USE_CANDIDATE_LANE_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/tests/test_browser_use_candidate_lane.py",
        "skills/uat-crud-mongodb/SKILL.md",
        "docs/knowledge/SIRINX_UAT_CRUD_MONGODB_SECURITY_RULES_2026-07-02.md",
        "docs/knowledge/SIRINX_UAT_CRUD_MONGODB_HERMES_REVIEW_PACKET_2026-07-02.md",
        "docs/knowledge/SIRINX_UAT_CRUD_MONGODB_HERMES_REVIEW_PACKET_2026-07-02.json",
        "docs/knowledge/SIRINX_UAT_CRUD_MONGODB_A2A_QUEUE_VISIBILITY_2026-07-02.md",
        "_A2A_QUEUE/outbox/packet_027_sirinx_uat_crud_mongodb_hermes_review.json",
        "data/pathspecs/sirinx_uat_crud_mongodb_work_report_queue_2026-07-02.json",
        "data/pathspecs/sirinx_uat_crud_mongodb_work_report_contract_2026-07-02.json",
        "docs/knowledge/SIRINX_UAT_CRUD_MONGODB_WORK_REPORT_DRAFT_2026-07-02.md",
        "docs/knowledge/SIRINX_UAT_CRUD_MONGODB_WORK_REPORT_A2A_VISIBILITY_2026-07-02.md",
        "_A2A_QUEUE/outbox/packet_028_sirinx_uat_crud_mongodb_work_report_draft.json",
        "WORKSPACE_SCAFFOLD/tests/test_uat_crud_mongodb_work_report_packet.py",
        "WORKSPACE_SCAFFOLD/tests/test_uat_crud_mongodb_work_report_a2a_visibility.py",
        "WORKSPACE_SCAFFOLD/tests/test_uat_crud_mongodb_hermes_review_packet.py",
        "WORKSPACE_SCAFFOLD/tests/test_uat_crud_mongodb_a2a_queue_visibility.py",
        "WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_draft.py",
        "WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_preflight_audit.py",
        "WORKSPACE_SCAFFOLD/tests/test_lane1_hermes_decision_preflight_audit.py",
        "data/pathspecs/ghostclaw_lane1_hermes_decision_preflight_audit_2026-06-29.json",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_PREFLIGHT_AUDIT_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/scripts/validate_lane1_opus_architecture_packet.py",
        "data/pathspecs/ghostclaw_lane1_opus_architecture_packet_gate_2026-06-29.json",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET_GATE_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/tests/test_lane1_opus_architecture_packet_gate.py",
        "data/pathspecs/ghostclaw_lane1_opus_authoring_bundle_2026-06-29.json",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_AUTHORING_BUNDLE_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/tests/test_lane1_opus_authoring_bundle.py",
        "WORKSPACE_SCAFFOLD/tests/test_lane1_packet013_decision_draft.py",
        "data/pathspecs/ghostclaw_lane1_hermes_decision_transition_guard_2026-06-29.json",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_TRANSITION_GUARD_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_transition_guard.py",
        "WORKSPACE_SCAFFOLD/tests/test_lane1_hermes_decision_transition_guard.py",
        "data/pathspecs/ghostclaw_lane1_hermes_decision_intake_handoff_2026-06-29.json",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_INTAKE_HANDOFF_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/scripts/build_lane1_hermes_decision_intake_handoff.py",
        "WORKSPACE_SCAFFOLD/tests/test_lane1_hermes_decision_intake_handoff.py",
        "WORKSPACE_SCAFFOLD/tests/test_lane1_hermes_decision_handoff_packet.py",
        "data/pathspecs/sirinx_r0_gate_specific_approval_contract_2026-06-29.json",
        "data/pathspecs/sirinx_all_chat_export_intake_mapper_2026-06-29.json",
        "data/pathspecs/sirinx_codex_hermes_work_report_contract_2026-06-29.json",
        "docs/knowledge/SIRINX_CODEX_HERMES_WORK_REPORT_DRAFT_2026-06-29.md",
        "data/pathspecs/sirinx_codex_hermes_a2a_queue_status_2026-06-29.json",
        "docs/knowledge/SIRINX_CODEX_HERMES_A2A_QUEUE_STATUS_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/reports/codex_hermes_a2a_queue_status_latest_2026-06-29.json",
        "WORKSPACE_SCAFFOLD/scripts/build_codex_hermes_a2a_queue_status.py",
        "WORKSPACE_SCAFFOLD/manifests/active_goal_local_evidence_durability_2026-06-29.json",
        "docs/knowledge/SIRINX_ACTIVE_GOAL_LOCAL_EVIDENCE_DURABILITY_MANIFEST_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/scripts/build_codex_hermes_work_report.py",
        "WORKSPACE_SCAFFOLD/scripts/validate_active_goal_blocker_clearance.py",
        "WORKSPACE_SCAFFOLD/scripts/validate_ghostclaw_v3_3_artifact_gate.py",
      ]),
    );
  });

  test("exposes Codex/Hermes A2A queue status without executing the file bus", () => {
    expect(GOD_MODE_CODEX_HERMES_A2A_QUEUE_STATUS.status).toBe("local_queue_indexed_not_executed");
    expect(GOD_MODE_CODEX_HERMES_A2A_QUEUE_STATUS.evidenceBoundary).toBe("local_file_bus_only");
    expect(GOD_MODE_CODEX_HERMES_A2A_QUEUE_STATUS.currentActionablePacket).toBe("packet_013");
    expect(GOD_MODE_CODEX_HERMES_A2A_QUEUE_STATUS.currentActionablePacketFolder).toBe("inbox");
    expect(GOD_MODE_CODEX_HERMES_A2A_QUEUE_STATUS.runtimeQueueExecution).toBe(false);
    expect(GOD_MODE_CODEX_HERMES_A2A_QUEUE_STATUS.hermesDecisionRecorded).toBe(true);
    expect(GOD_MODE_CODEX_HERMES_A2A_QUEUE_STATUS.lane2Authorized).toBe(false);
    expect(GOD_MODE_CODEX_HERMES_A2A_QUEUE_STATUS.externalWrites).toBe(false);
    expect(GOD_MODE_CODEX_HERMES_A2A_QUEUE_STATUS.packetCounts).toEqual({
      inbox: 5,
      outbox: 34,
      working: 1,
      done: 8,
      blocked: 0,
      total: 48,
    });
    expect(GOD_MODE_CODEX_HERMES_A2A_QUEUE_STATUS.evidenceFiles).toEqual(
      expect.arrayContaining([
        "data/pathspecs/sirinx_codex_hermes_a2a_queue_status_2026-06-29.json",
        "docs/knowledge/SIRINX_CODEX_HERMES_A2A_QUEUE_STATUS_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/reports/codex_hermes_a2a_queue_status_latest_2026-06-29.json",
        "WORKSPACE_SCAFFOLD/scripts/build_codex_hermes_a2a_queue_status.py",
        "WORKSPACE_SCAFFOLD/tests/test_codex_hermes_a2a_queue_status.py",
        "_A2A_QUEUE/outbox/packet_016_ghostclaw_lane1_hermes_decision_intake_handoff.json",
        "_A2A_QUEUE/outbox/packet_017_ghostclaw_lane1_hermes_decision_preflight_audit.json",
        "_A2A_QUEUE/outbox/packet_018_ghostclaw_lane1_opus_architecture_packet_gate.json",
        "_A2A_QUEUE/outbox/packet_019_ghostclaw_lane1_opus_authoring_bundle.json",
        "_A2A_QUEUE/outbox/packet_020_sirinx_all_chat_export_request.json",
        "_A2A_QUEUE/outbox/packet_021_sirinx_a2a_adaptive_sync_control_status.json",
        "data/pathspecs/sirinx_a2a_adaptive_sync_control_status_2026-06-29.json",
        "docs/knowledge/SIRINX_A2A_ADAPTIVE_SYNC_CONTROL_STATUS_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/tests/test_a2a_adaptive_sync_control_status_packet.py",
        "_A2A_QUEUE/outbox/packet_022_sirinx_a2a_next_safe_action_sequencer.json",
        "_A2A_QUEUE/outbox/packet_023_sirinx_hermes_gateway_current_recheck.json",
        "_A2A_QUEUE/inbox/packet_024_sirinx_hermes_a2a_codex_sync_all_jobs.json",
        "_A2A_QUEUE/outbox/packet_025_sirinx_browser_use_candidate_lane.json",
        "_A2A_QUEUE/outbox/packet_026_ghostclaw_lane1_hermes_decision_route_to_opus.json",
        "data/pathspecs/sirinx_a2a_next_safe_action_sequencer_2026-06-29.json",
        "docs/knowledge/SIRINX_A2A_NEXT_SAFE_ACTION_SEQUENCER_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/tests/test_a2a_next_safe_action_sequencer_packet.py",
        "data/pathspecs/sirinx_hermes_gateway_current_recheck_packet_2026-06-29.json",
        "docs/knowledge/SIRINX_HERMES_GATEWAY_CURRENT_RECHECK_PACKET_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/tests/test_hermes_gateway_current_recheck_packet.py",
        "data/pathspecs/sirinx_hermes_a2a_codex_sync_all_jobs_packet_2026-06-29.json",
        "docs/knowledge/SIRINX_HERMES_A2A_CODEX_SYNC_ALL_JOBS_PACKET_2026-06-29.md",
        "data/pathspecs/sirinx_browser_use_candidate_lane_2026-06-29.json",
        "docs/knowledge/SIRINX_BROWSER_USE_CANDIDATE_LANE_2026-06-29.md",
        "WORKSPACE_SCAFFOLD/tests/test_browser_use_candidate_lane.py",
        "GHOSTCLAW/a2a-hermes-codex-bridge/command-intents.ts",
        "skills/uat-crud-mongodb/SKILL.md",
        "docs/knowledge/SIRINX_UAT_CRUD_MONGODB_SECURITY_RULES_2026-07-02.md",
        "docs/knowledge/SIRINX_UAT_CRUD_MONGODB_HERMES_REVIEW_PACKET_2026-07-02.md",
        "docs/knowledge/SIRINX_UAT_CRUD_MONGODB_HERMES_REVIEW_PACKET_2026-07-02.json",
        "docs/knowledge/SIRINX_UAT_CRUD_MONGODB_A2A_QUEUE_VISIBILITY_2026-07-02.md",
        "_A2A_QUEUE/outbox/packet_027_sirinx_uat_crud_mongodb_hermes_review.json",
        "data/pathspecs/sirinx_uat_crud_mongodb_work_report_queue_2026-07-02.json",
        "data/pathspecs/sirinx_uat_crud_mongodb_work_report_contract_2026-07-02.json",
        "docs/knowledge/SIRINX_UAT_CRUD_MONGODB_WORK_REPORT_DRAFT_2026-07-02.md",
        "docs/knowledge/SIRINX_UAT_CRUD_MONGODB_WORK_REPORT_A2A_VISIBILITY_2026-07-02.md",
        "_A2A_QUEUE/outbox/packet_028_sirinx_uat_crud_mongodb_work_report_draft.json",
        "WORKSPACE_SCAFFOLD/tests/test_uat_crud_mongodb_work_report_packet.py",
        "WORKSPACE_SCAFFOLD/tests/test_uat_crud_mongodb_work_report_a2a_visibility.py",
        "WORKSPACE_SCAFFOLD/tests/test_uat_crud_mongodb_hermes_review_packet.py",
        "WORKSPACE_SCAFFOLD/tests/test_uat_crud_mongodb_a2a_queue_visibility.py",
        "_A2A_QUEUE/outbox/packet_029_sirinx_website_line_hermes_review.json",
        "_A2A_QUEUE/outbox/packet_039_sirinx_website_line_uat_verification_receipt.json",
        "docs/knowledge/SIRINX_WEBSITE_LINE_UAT_VERIFICATION_RECEIPT_2026-07-02.md",
        "docs/knowledge/SIRINX_WEBSITE_LINE_UAT_VERIFICATION_RECEIPT_2026-07-02.json",
        "WORKSPACE_SCAFFOLD/tests/test_sirinx_website_line_uat_verification_receipt_packet.py",
        "_A2A_QUEUE/outbox/packet_040_sirinx_website_human_review_deploy_gate.json",
        "docs/knowledge/SIRINX_WEBSITE_HUMAN_REVIEW_DEPLOY_GATE_2026-07-02.md",
        "docs/knowledge/SIRINX_WEBSITE_HUMAN_REVIEW_DEPLOY_GATE_2026-07-02.json",
        "WORKSPACE_SCAFFOLD/tests/test_sirinx_website_human_review_deploy_gate_packet.py",
        "_A2A_QUEUE/outbox/packet_030_sirinx_coding_engine_security_rules_refactor.json",
        "_A2A_QUEUE/outbox/packet_031_sirinx_coding_engine_security_rules_work_report_draft.json",
        "_A2A_QUEUE/outbox/packet_034_active_goal_blocker_clearance_approval_matrix.json",
        "_A2A_QUEUE/outbox/packet_035_active_goal_chat_export_readonly_mapping_gate_request.json",
        "docs/knowledge/SIRINX_ACTIVE_GOAL_CHAT_EXPORT_READONLY_MAPPING_GATE_REQUEST_2026-07-02.md",
        "WORKSPACE_SCAFFOLD/tests/test_active_goal_chat_export_readonly_mapping_gate_request_packet.py",
        "_A2A_QUEUE/outbox/packet_036_chatgpt_export_readonly_source_receipt_validator.json",
        "WORKSPACE_SCAFFOLD/scripts/validate_chatgpt_export_readonly_source_receipt.py",
        "data/pathspecs/sirinx_chatgpt_export_readonly_source_receipt_validator_2026-07-02.json",
        "docs/knowledge/SIRINX_CHATGPT_EXPORT_READONLY_SOURCE_RECEIPT_VALIDATOR_2026-07-02.md",
        "WORKSPACE_SCAFFOLD/tests/test_chatgpt_export_readonly_source_receipt_validator.py",
        "WORKSPACE_SCAFFOLD/tests/test_chatgpt_export_readonly_source_receipt_validator_packet.py",
        "_A2A_QUEUE/outbox/packet_038_hermes_gateway_repair_approval_gate.json",
        "data/pathspecs/sirinx_hermes_gateway_repair_approval_gate_2026-07-02.json",
        "docs/knowledge/SIRINX_HERMES_GATEWAY_REPAIR_APPROVAL_GATE_2026-07-02.md",
        "WORKSPACE_SCAFFOLD/tests/test_hermes_gateway_repair_approval_gate_packet.py",
        "docs/knowledge/SIRINX_WEBSITE_LINE_HERMES_REVIEW_PACKET_2026-07-02.md",
        "docs/knowledge/SIRINX_CODING_ENGINE_SECURITY_RULES_REFACTOR_PACKET_2026-07-02.md",
        "docs/knowledge/SIRINX_CODING_ENGINE_SECURITY_RULES_WORK_REPORT_DRAFT_2026-07-02.md",
      ]),
    );
  });
});
