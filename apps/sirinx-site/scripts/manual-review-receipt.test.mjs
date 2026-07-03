import { describe, expect, it } from "vitest";
import { createManualReviewReceiptPacket } from "./manual-review-receipt.mjs";

const checks = [
  "Local homepage visual review",
  "Local `/line` visual review",
  "Local `/contact` visual review",
  "Local `/projects` visual review",
  "Local `/trust-center` visual review",
  "Local `/quote` visual review",
  "Local `/roi-calculator` visual review",
  "Desktop floating LINE dock review",
  "Mobile contact tray review",
  "Real-device LINE QR scan",
  "Confirm QR opens `SIRINX โซล่าเซลล์`",
  "Confirm Add LINE target",
  "Confirm Chat target",
  "Existing bot / inquiry path behavior",
  "Confirm LINE did not replace existing inquiry path",
  "Keyboard skip-link spot check",
  "Mobile overlap / layout spot check"
];

function reviewTemplate({ status = "Pending", evidence = "", reviewer = false, decision = "" } = {}) {
  const reviewerFields = reviewer
    ? `- Reviewer name: SIRINX Reviewer
- Review date: 2026-07-03
- Device/browser: iPhone Safari and desktop Chrome
- Network context: local preview only
- Notes: Manual review evidence recorded.`
    : `- Reviewer name:
- Review date:
- Device/browser:
- Network context:
- Notes:`;
  const rows = checks.map((check) => `| ${check} | ${status} | ${evidence} |`).join("\n");
  const decisions = [
    "Not ready for deploy review. Required fixes:",
    "Ready for deploy approval discussion, but deploy is not approved by this checkbox.",
    "Deploy approval granted separately with exact phrase:"
  ]
    .map((label) => `- [${decision === label ? "x" : " "}] ${label}`)
    .join("\n");

  return `# SIRINX Website Manual Review Result Template

## Reviewer

${reviewerFields}

## Required Manual Evidence

| Check | Status | Evidence / notes |
| --- | --- | --- |
${rows}

## Decision

${decisions}
`;
}

const pendingContract = {
  status: "MANUAL_REVIEW_EVIDENCE_CONTRACT_READY_PENDING_HUMAN_EVIDENCE",
  human_evidence_complete: false
};
const completeContract = {
  status: "MANUAL_REVIEW_EVIDENCE_COMPLETE_READY_FOR_APPROVAL_DISCUSSION",
  human_evidence_complete: true
};
const releasePreflight = {
  status: "READY_FOR_HUMAN_REVIEW_BLOCKED_FOR_DEPLOY",
  deploy_gate: "BLOCKED_FOR_DEPLOY"
};

describe("manual review receipt", () => {
  it("records the current pending human review state without allowing deploy", () => {
    const packet = createManualReviewReceiptPacket({
      createdAt: "2026-07-03T06:30:00+0700",
      manualReviewMarkdown: reviewTemplate(),
      manualEvidenceContract: pendingContract,
      releasePreflight
    });

    expect(packet.packet_id).toBe("packet_072_sirinx_website_manual_review_receipt");
    expect(packet.status).toBe("MANUAL_REVIEW_RECEIPT_READY_PENDING_HUMAN_INPUT");
    expect(packet.manual_checks_pending).toHaveLength(17);
    expect(packet.qr_scan.status).toBe("pending");
    expect(packet.existing_bot.behavior_status).toBe("pending");
    expect(packet.deploy_gate).toBe("BLOCKED_FOR_DEPLOY");
    expect(packet.completion_claim_allowed).toBe(false);
  });

  it("marks receipt ready for deploy discussion when every manual check has evidence", () => {
    const packet = createManualReviewReceiptPacket({
      createdAt: "2026-07-03T06:30:00+0700",
      manualReviewMarkdown: reviewTemplate({
        status: "Passed",
        evidence: "Reviewed on local preview with visual evidence and device notes.",
        reviewer: true,
        decision: "Ready for deploy approval discussion, but deploy is not approved by this checkbox."
      }),
      manualEvidenceContract: completeContract,
      releasePreflight
    });

    expect(packet.status).toBe("MANUAL_REVIEW_RECEIPT_COMPLETE_READY_FOR_DEPLOY_DISCUSSION");
    expect(packet.receipt_complete).toBe(true);
    expect(packet.qr_scan.correct_account_confirmed).toBe(true);
    expect(packet.existing_bot.line_did_not_replace_inquiry_path).toBe(true);
    expect(packet.deploy_gate).toBe("BLOCKED_FOR_DEPLOY");
  });

  it("requires evidence details when a passed row is empty", () => {
    const packet = createManualReviewReceiptPacket({
      createdAt: "2026-07-03T06:30:00+0700",
      manualReviewMarkdown: reviewTemplate({ status: "Passed", evidence: "-", reviewer: true }),
      manualEvidenceContract: completeContract,
      releasePreflight
    });

    expect(packet.status).toBe("MANUAL_REVIEW_RECEIPT_REQUIRES_EVIDENCE_DETAILS");
    expect(packet.passed_without_evidence).toEqual(expect.arrayContaining(["Real-device LINE QR scan"]));
  });
});
