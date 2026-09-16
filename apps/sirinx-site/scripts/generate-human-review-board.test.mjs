import { describe, expect, it } from "vitest";
import { createHumanReviewBoardPacket } from "./generate-human-review-board.mjs";

describe("human review board packet", () => {
  it("keeps the board local-only and blocks completion claims", () => {
    const packet = createHumanReviewBoardPacket({
      screenshotManifest: {
        manifest_path: "/tmp/sirinx-review/manifest.json",
        screenshots: [
          { route: "/", viewport: "desktop", path: "/tmp/sirinx-review/home-desktop.png" },
          { route: "/", viewport: "mobile", path: "/tmp/sirinx-review/home-mobile.png" }
        ]
      },
      masterAudit: {
        status: "LOCAL_EVIDENCE_READY_FOR_HUMAN_REVIEW_NOT_COMPLETE",
        completion_claim_allowed: false,
        pending_requirements: [{ id: "real_device_qr_scan" }, { id: "existing_bot_manual_behavior" }],
        closed_gates: ["deploy", "push", "line_webhook", "production_analytics", "crm_customer_data_storage"]
      },
      screenshotChecks: {
        "/tmp/sirinx-review/home-desktop.png": true,
        "/tmp/sirinx-review/home-mobile.png": true
      }
    });

    expect(packet.packet_id).toBe("packet_061_sirinx_website_human_review_board");
    expect(packet.status).toBe("READY_FOR_HUMAN_REVIEW");
    expect(packet.completion_claim_allowed).toBe(false);
    expect(packet.pending_requirements).toEqual(
      expect.arrayContaining(["real_device_qr_scan", "existing_bot_manual_behavior"])
    );
    expect(packet.closed_gates).toEqual(
      expect.arrayContaining(["deploy", "push", "line_webhook", "production_analytics", "crm_customer_data_storage"])
    );
  });

  it("marks screenshot evidence incomplete when a referenced screenshot is missing", () => {
    const packet = createHumanReviewBoardPacket({
      screenshotManifest: {
        manifest_path: "/tmp/sirinx-review/manifest.json",
        screenshots: [{ route: "/line/", viewport: "mobile", path: "/tmp/sirinx-review/line-mobile.png" }]
      },
      masterAudit: {
        status: "LOCAL_EVIDENCE_READY_FOR_HUMAN_REVIEW_NOT_COMPLETE",
        completion_claim_allowed: false,
        pending_requirements: [],
        closed_gates: ["deploy", "push"]
      },
      screenshotChecks: {
        "/tmp/sirinx-review/line-mobile.png": false
      }
    });

    expect(packet.status).toBe("SCREENSHOT_EVIDENCE_INCOMPLETE");
    expect(packet.missing_screenshots).toEqual(["/tmp/sirinx-review/line-mobile.png"]);
  });
});
