import { describe, expect, it } from "vitest";
import { createReviewEvidenceRefreshPacket } from "./review-evidence-refresh.mjs";

const readyInputs = {
  createdAt: "2026-07-03T05:00:00+0700",
  githubLive: {
    status: "GITHUB_LIVE_LOCAL_RECHECK_READY_LOCAL_REVIEW_TARGET_CONFIRMED"
  },
  lineQr: {
    status: "LINE_QR_LINK_RECHECK_READY_PENDING_REAL_DEVICE_SCAN",
    decision: {
      real_device_scan_proven: false
    }
  },
  manualEvidenceContract: {
    status: "MANUAL_REVIEW_EVIDENCE_CONTRACT_READY_PENDING_HUMAN_EVIDENCE",
    human_evidence_complete: false,
    report: "docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_EVIDENCE_CONTRACT_2026-07-03.md"
  },
  previewHealth: {
    status: "LOCAL_PREVIEW_HEALTH_READY_FOR_HUMAN_REVIEW",
    report: "docs/website/SIRINX_WEBSITE_LOCAL_PREVIEW_HEALTH_2026-07-03.md",
    base_url: "http://127.0.0.1:18732",
    routes_ready: true
  },
  manualIntake: {
    status: "MANUAL_REVIEW_INTAKE_READY_PENDING_HUMAN_INPUT",
    manual_checks_pending: ["Real-device LINE QR scan", "Existing bot / inquiry path behavior"]
  },
  manualReviewReceipt: {
    status: "MANUAL_REVIEW_RECEIPT_READY_PENDING_HUMAN_INPUT",
    report: "docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_RECEIPT_2026-07-03.md"
  },
  localReview: {
    status: "LOCAL_REVIEW_READY_BLOCKED_PENDING_HUMAN_INPUT"
  }
};

describe("review evidence refresh packet", () => {
  it("summarizes the refreshed local evidence lane while keeping manual gates pending", () => {
    const packet = createReviewEvidenceRefreshPacket(readyInputs);

    expect(packet.packet_id).toBe("packet_068_sirinx_website_review_evidence_refresh");
    expect(packet.status).toBe("REVIEW_EVIDENCE_REFRESH_READY_PENDING_HUMAN_INPUT");
    expect(packet.refreshed_packets).toEqual(
      expect.arrayContaining([
        "_A2A_QUEUE/outbox/packet_065_sirinx_website_github_live_local_recheck_automation.json",
        "_A2A_QUEUE/outbox/packet_066_sirinx_website_line_qr_link_recheck.json",
        "_A2A_QUEUE/outbox/packet_069_sirinx_website_manual_review_evidence_contract.json",
        "_A2A_QUEUE/outbox/packet_070_sirinx_website_local_preview_health.json",
        "_A2A_QUEUE/outbox/packet_067_sirinx_website_manual_review_intake.json",
        "_A2A_QUEUE/outbox/packet_072_sirinx_website_manual_review_receipt.json",
        "_A2A_QUEUE/outbox/packet_063_sirinx_website_local_review_run.json"
      ])
    );
    expect(packet.manual_checks_pending_count).toBe(2);
    expect(packet.manual_evidence_contract_complete).toBe(false);
    expect(packet.local_preview_routes_ready).toBe(true);
    expect(packet.local_preview_base_url).toBe("http://127.0.0.1:18732");
    expect(packet.manual_review_receipt_status).toBe("MANUAL_REVIEW_RECEIPT_READY_PENDING_HUMAN_INPUT");
    expect(packet.real_device_scan_proven).toBe(false);
    expect(packet.completion_claim_allowed).toBe(false);
    expect(packet.closed_gates).toEqual(
      expect.arrayContaining(["deploy", "push", "line_webhook", "production_analytics", "crm_customer_data_storage"])
    );
  });

  it("requires attention when any upstream packet status is not ready", () => {
    const packet = createReviewEvidenceRefreshPacket({
      ...readyInputs,
      manualIntake: {
        status: "MANUAL_REVIEW_INTAKE_REQUIRES_ATTENTION",
        manual_checks_pending: []
      }
    });

    expect(packet.status).toBe("REVIEW_EVIDENCE_REFRESH_REQUIRES_ATTENTION");
    expect(packet.deploy_gate).toBe("BLOCKED_FOR_DEPLOY");
  });
});
