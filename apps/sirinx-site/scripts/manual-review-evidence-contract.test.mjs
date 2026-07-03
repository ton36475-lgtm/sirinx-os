import { describe, expect, it } from "vitest";
import { evaluateManualReviewEvidenceContract } from "./manual-review-evidence-contract.mjs";

const requiredRows = [
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

function template({ status = "Pending", evidence = "", reviewer = false, checkedDecision = "", approval = "" } = {}) {
  const reviewerFields = reviewer
    ? `- Reviewer name: SIRINX Reviewer
- Review date: 2026-07-03
- Device/browser: iPhone Safari and desktop Chrome
- Network context: local preview only`
    : `- Reviewer name:
- Review date:
- Device/browser:
- Network context:`;
  const rows = requiredRows.map((check) => `| ${check} | ${status} | ${evidence} |`).join("\n");
  const decisions = [
    "Not ready for deploy review. Required fixes:",
    "Ready for deploy approval discussion, but deploy is not approved by this checkbox.",
    "Deploy approval granted separately with exact phrase:"
  ]
    .map((label) => `- [${checkedDecision === label ? "x" : " "}] ${label}`)
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

${approval}
`;
}

describe("manual review evidence contract", () => {
  it("accepts the current pending template shape while blocking completion claims", () => {
    const packet = evaluateManualReviewEvidenceContract({
      createdAt: "2026-07-03T05:30:00+0700",
      manualReviewMarkdown: template()
    });

    expect(packet.packet_id).toBe("packet_069_sirinx_website_manual_review_evidence_contract");
    expect(packet.status).toBe("MANUAL_REVIEW_EVIDENCE_CONTRACT_READY_PENDING_HUMAN_EVIDENCE");
    expect(packet.required_checks_count).toBe(17);
    expect(packet.manual_checks_pending).toHaveLength(17);
    expect(packet.human_evidence_complete).toBe(false);
    expect(packet.completion_claim_allowed).toBe(false);
    expect(packet.deploy_gate).toBe("BLOCKED_FOR_DEPLOY");
  });

  it("requires attention when a passed manual check has no meaningful evidence", () => {
    const packet = evaluateManualReviewEvidenceContract({
      createdAt: "2026-07-03T05:30:00+0700",
      manualReviewMarkdown: template({ status: "Passed", evidence: "-", reviewer: true })
    });

    expect(packet.status).toBe("MANUAL_REVIEW_EVIDENCE_CONTRACT_REQUIRES_ATTENTION");
    expect(packet.passed_without_evidence).toEqual(expect.arrayContaining(["Real-device LINE QR scan"]));
    expect(packet.human_evidence_complete).toBe(false);
  });

  it("blocks contradictory deploy approval before manual evidence is complete", () => {
    const packet = evaluateManualReviewEvidenceContract({
      createdAt: "2026-07-03T05:30:00+0700",
      manualReviewMarkdown: template({
        checkedDecision: "Deploy approval granted separately with exact phrase:",
        approval: "APPROVE_DEPLOY_SIRINX_SITE_2026-07-03"
      })
    });

    expect(packet.status).toBe("MANUAL_REVIEW_EVIDENCE_CONTRACT_REQUIRES_ATTENTION");
    expect(packet.exact_approval_before_manual_complete).toBe(true);
    expect(packet.deploy_gate).toBe("EXACT_APPROVAL_RECORDED_STILL_NO_DEPLOY_RUN");
  });
});
