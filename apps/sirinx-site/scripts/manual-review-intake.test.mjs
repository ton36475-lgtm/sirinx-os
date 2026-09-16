import { describe, expect, it } from "vitest";
import { evaluateManualReviewIntake } from "./manual-review-intake.mjs";

const manualGatePacket = {
  status: "BLOCKED_PENDING_HUMAN_REVIEW",
  deploy_gate: "BLOCKED_FOR_DEPLOY"
};
const githubLivePacket = {
  status: "GITHUB_LIVE_LOCAL_RECHECK_READY_LOCAL_REVIEW_TARGET_CONFIRMED"
};
const lineQrPacket = {
  status: "LINE_QR_LINK_RECHECK_READY_PENDING_REAL_DEVICE_SCAN"
};

const manualReviewMarkdown = `# Manual Review

| Check | Status | Evidence / notes |
| --- | --- | --- |
| Local homepage visual review | Pending |  |
| Real-device LINE QR scan | Pending |  |

- \`pnpm --filter @sirinx/site test:line\`: passed, 106 Playwright checks
- \`pnpm --filter @sirinx/site review:github-live\`: passed
- \`pnpm --filter @sirinx/site review:line-qr\`: passed
- \`packet_065\` GitHub/live/local recheck
- \`packet_066\` LINE QR/link recheck
`;

const checklistMarkdown = `# Checklist

- \`pnpm --filter @sirinx/site test:line\`: passed, 106 Playwright checks
- \`pnpm --filter @sirinx/site review:github-live\`: passed
- \`pnpm --filter @sirinx/site review:line-qr\`: passed
- \`packet_065\`
- \`packet_066\`
- [ ] Confirm primary CTA routes to \`/contact?interest=solar-carport\`.
`;

describe("manual review intake", () => {
  it("marks the intake ready when checklist and template reference current evidence", () => {
    const packet = evaluateManualReviewIntake({
      createdAt: "2026-07-03T04:30:00+0700",
      manualReviewMarkdown,
      checklistMarkdown,
      manualGatePacket,
      githubLivePacket,
      lineQrPacket
    });

    expect(packet.status).toBe("MANUAL_REVIEW_INTAKE_READY_PENDING_HUMAN_INPUT");
    expect(packet.manual_checks_pending).toEqual(["Local homepage visual review", "Real-device LINE QR scan"]);
    expect(packet.docs_fresh).toBe(true);
    expect(packet.completion_claim_allowed).toBe(false);
    expect(packet.deploy_gate).toBe("BLOCKED_FOR_DEPLOY");
  });

  it("requires attention when stale checklist evidence remains", () => {
    const packet = evaluateManualReviewIntake({
      createdAt: "2026-07-03T04:30:00+0700",
      manualReviewMarkdown,
      checklistMarkdown: `${checklistMarkdown}\n- \`pnpm --filter @sirinx/site test:line\`: passed, 70 Playwright checks\n- [ ] Confirm primary CTA routes to \`/quote\`.`,
      manualGatePacket,
      githubLivePacket,
      lineQrPacket
    });

    expect(packet.status).toBe("MANUAL_REVIEW_INTAKE_REQUIRES_ATTENTION");
    expect(packet.stale_checklist_matches).toEqual(
      expect.arrayContaining(["70 Playwright checks", "Confirm primary CTA routes to `/quote`"])
    );
  });
});
