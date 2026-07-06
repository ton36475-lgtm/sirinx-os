import { describe, expect, it } from "vitest";
import { collectManualReviewGate, evaluateManualReviewGate } from "./manual-review-gate.mjs";

const reviewBoardPacket = {
  status: "READY_FOR_HUMAN_REVIEW"
};

function manualTemplate({ rowStatus = "Passed", reviewer = true, approval = false } = {}) {
  return `# Review

## Reviewer

- Reviewer name: ${reviewer ? "SIRINX Reviewer" : ""}
- Review date: ${reviewer ? "2026-07-03" : ""}
- Device/browser: ${reviewer ? "iPhone Safari and desktop Chrome" : ""}
- Network context: ${reviewer ? "Local preview" : ""}

## Required Manual Evidence

| Check | Status | Evidence / notes |
| --- | --- | --- |
| Local homepage visual review | ${rowStatus} | screenshot reviewed |
| Real-device LINE QR scan | ${rowStatus} | phone scan |
| Existing bot / inquiry path behavior | ${rowStatus} | inquiry opens |

## Decision

- [ ] Not ready for deploy review. Required fixes:
- [x] Ready for deploy approval discussion, but deploy is not approved by this checkbox.
- [${approval ? "x" : " "}] Deploy approval granted separately with exact phrase:

Exact approval phrase, if separately granted:

\`\`\`text
${approval ? "APPROVE_DEPLOY_SIRINX_SITE_2026-07-03" : "APPROVE_DEPLOY_SIRINX_SITE_<date>"}
\`\`\`
`;
}

describe("manual review gate validator", () => {
  it("blocks the current repository template while manual evidence is still pending", async () => {
    const packet = await collectManualReviewGate();

    expect(packet.status).toBe("BLOCKED_PENDING_HUMAN_REVIEW");
    expect(packet.deploy_gate).toBe("BLOCKED_FOR_DEPLOY");
    expect(packet.completion_claim_allowed).toBe(false);
    expect(packet.manual_checks_pending).toEqual(
      expect.arrayContaining(["Confirm Add LINE target", "Existing bot / inquiry path behavior"])
    );
    expect(packet.exact_deploy_approval_present).toBe(false);
  });

  it("allows only deploy discussion when all manual checks pass but exact approval is absent", () => {
    const packet = evaluateManualReviewGate({
      manualReviewMarkdown: manualTemplate({ approval: false }),
      reviewBoardPacket
    });

    expect(packet.status).toBe("READY_FOR_DEPLOY_APPROVAL_DISCUSSION_NOT_APPROVED");
    expect(packet.deploy_gate).toBe("BLOCKED_UNTIL_EXACT_DEPLOY_APPROVAL");
    expect(packet.exact_deploy_approval_present).toBe(false);
    expect(packet.completion_claim_allowed).toBe(false);
  });

  it("records exact deploy approval without running deploy", () => {
    const packet = evaluateManualReviewGate({
      manualReviewMarkdown: manualTemplate({ approval: true }),
      reviewBoardPacket
    });

    expect(packet.status).toBe("EXACT_DEPLOY_APPROVAL_RECORDED_LOCAL_ONLY");
    expect(packet.deploy_gate).toBe("EXACT_APPROVAL_RECORDED_STILL_NO_DEPLOY_RUN");
    expect(packet.exact_deploy_approval_present).toBe(true);
    expect(packet.push_gate).toBe("BLOCKED_UNTIL_EXPLICIT_PUSH_APPROVAL");
  });
});
