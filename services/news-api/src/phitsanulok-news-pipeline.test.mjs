import { describe, expect, it } from "vitest";
import {
  checkFacebookPublishGate,
  createDailyContentPacket,
  createFacebookDraft,
  createPartnerPanelSnapshot,
  runPhitsanulokNewsDryRun
} from "./phitsanulok-news-pipeline.mjs";

describe("Phitsanulok news automation pipeline", () => {
  it("creates a draft-only daily content packet", () => {
    const packet = createDailyContentPacket({ date: "2026-07-03" });
    expect(packet.status).toBe("draft_only");
    expect(packet.externalPublishing).toBe("blocked_until_owner_gate");
    expect(packet.contentCards).toHaveLength(3);
    expect(packet.contentCards[0].requiredChecks).toContain("owner_review");
  });

  it("creates Facebook drafts without enabling live send", () => {
    const packet = createDailyContentPacket();
    const draft = createFacebookDraft(packet.contentCards[0]);
    expect(draft.status).toBe("draft_only");
    expect(draft.liveSend).toBe(false);
    expect(draft.ownerApprovalRequired).toBe(true);
  });

  it("blocks live Facebook posting and partner outreach", () => {
    expect(checkFacebookPublishGate({ liveSend: true }).status).toBe("BLOCKED");
    expect(createPartnerPanelSnapshot().liveOutreach).toBe(false);
    expect(runPhitsanulokNewsDryRun().status).toBe("PASS");
  });
});
