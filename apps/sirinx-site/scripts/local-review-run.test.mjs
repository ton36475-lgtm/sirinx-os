import { describe, expect, it } from "vitest";
import { createLocalReviewRunPacket } from "./local-review-run.mjs";

describe("local review run packet", () => {
  it("summarizes the ready-for-review state while manual input is still required", () => {
    const packet = createLocalReviewRunPacket({
      masterAudit: { status: "LOCAL_EVIDENCE_READY_FOR_HUMAN_REVIEW_NOT_COMPLETE" },
      reviewBoard: {
        status: "READY_FOR_HUMAN_REVIEW",
        board: "docs/website/SIRINX_WEBSITE_HUMAN_REVIEW_BOARD_2026-07-03.html"
      },
      manualGate: {
        status: "BLOCKED_PENDING_HUMAN_REVIEW",
        manual_checks_total: 17,
        manual_checks_passed: 0,
        deploy_gate: "BLOCKED_FOR_DEPLOY",
        push_gate: "BLOCKED_UNTIL_EXPLICIT_PUSH_APPROVAL"
      }
    });

    expect(packet.packet_id).toBe("packet_063_sirinx_website_local_review_run");
    expect(packet.status).toBe("LOCAL_REVIEW_READY_BLOCKED_PENDING_HUMAN_INPUT");
    expect(packet.generated_packets).toEqual(
      expect.arrayContaining([
        "_A2A_QUEUE/outbox/packet_060_sirinx_website_master_plan_current_audit.json",
        "_A2A_QUEUE/outbox/packet_061_sirinx_website_human_review_board.json",
        "_A2A_QUEUE/outbox/packet_062_sirinx_website_manual_review_gate.json"
      ])
    );
    expect(packet.companion_packets).toEqual(
      expect.arrayContaining([
        "_A2A_QUEUE/outbox/packet_064_sirinx_website_github_connector_recheck.json",
        "_A2A_QUEUE/outbox/packet_065_sirinx_website_github_live_local_recheck_automation.json",
        "_A2A_QUEUE/outbox/packet_066_sirinx_website_line_qr_link_recheck.json",
        "_A2A_QUEUE/outbox/packet_067_sirinx_website_manual_review_intake.json",
        "_A2A_QUEUE/outbox/packet_069_sirinx_website_manual_review_evidence_contract.json",
        "_A2A_QUEUE/outbox/packet_070_sirinx_website_local_preview_health.json",
        "_A2A_QUEUE/outbox/packet_072_sirinx_website_manual_review_receipt.json"
      ])
    );
    expect(packet.completion_claim_allowed).toBe(false);
    expect(packet.closed_gates).toEqual(
      expect.arrayContaining(["deploy", "push", "line_webhook", "production_analytics", "crm_customer_data_storage"])
    );
  });

  it("reports attention required when any upstream review packet is not in the expected state", () => {
    const packet = createLocalReviewRunPacket({
      masterAudit: { status: "LOCAL_EVIDENCE_INCOMPLETE" },
      reviewBoard: {
        status: "READY_FOR_HUMAN_REVIEW",
        board: "docs/website/SIRINX_WEBSITE_HUMAN_REVIEW_BOARD_2026-07-03.html"
      },
      manualGate: {
        status: "BLOCKED_PENDING_HUMAN_REVIEW",
        manual_checks_total: 17,
        manual_checks_passed: 0,
        deploy_gate: "BLOCKED_FOR_DEPLOY",
        push_gate: "BLOCKED_UNTIL_EXPLICIT_PUSH_APPROVAL"
      }
    });

    expect(packet.status).toBe("LOCAL_REVIEW_REQUIRES_ATTENTION");
  });
});
