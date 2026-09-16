import { describe, expect, it } from "vitest";
import { createLineQrLinkRecheckPacket, inspectPng } from "./line-qr-link-recheck.mjs";

const lineConfig = {
  displayName: "SIRINX โซล่าเซลล์",
  shortLink: "https://lin.ee/S97R6nj",
  basicId: "@304zrttj",
  premiumIdTarget: "@sirinx",
  qrImageUrl: "https://qr-official.line.me/gs/M_304zrttj_GW.png?oat_content=qr",
  addFriendUrl: "https://line.me/R/ti/p/%40304zrttj",
  chatUrl: "https://line.me/R/oaMessage/%40304zrttj"
};

function fakePng(width = 360, height = 360) {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

function readyPacket(overrides = {}) {
  return createLineQrLinkRecheckPacket({
    createdAt: "2026-07-03T04:00:00+0700",
    lineConfig,
    qrAsset: {
      url: lineConfig.qrImageUrl,
      status: 200,
      content_type: "",
      content_length: "24045",
      ...inspectPng(fakePng())
    },
    links: {
      shortLink: {
        url: lineConfig.shortLink,
        status: 301,
        location: "https://line.me/R/ti/p/@304zrttj?ts=07020215&oat_content=url",
        content_type: "",
        content_length: "0"
      },
      addFriendUrl: {
        url: lineConfig.addFriendUrl,
        status: 200,
        location: "",
        content_type: "text/html;charset=UTF-8",
        content_length: ""
      },
      chatUrl: {
        url: lineConfig.chatUrl,
        status: 302,
        location: "/",
        content_type: "text/html",
        content_length: "142"
      }
    },
    ...overrides
  });
}

describe("LINE QR link recheck", () => {
  it("reads PNG dimensions from the QR image header", () => {
    expect(inspectPng(fakePng(360, 360))).toMatchObject({
      is_png: true,
      width: 360,
      height: 360,
      bytes: 24
    });
  });

  it("marks the asset and links ready while preserving the real-device scan gate", () => {
    const packet = readyPacket();

    expect(packet.packet_id).toBe("packet_066_sirinx_website_line_qr_link_recheck");
    expect(packet.status).toBe("LINE_QR_LINK_RECHECK_READY_PENDING_REAL_DEVICE_SCAN");
    expect(packet.qr_asset.acceptable_for_local_review).toBe(true);
    expect(packet.link_results.shortLink.acceptable_read_only_response).toBe(true);
    expect(packet.link_results.addFriendUrl.acceptable_read_only_response).toBe(true);
    expect(packet.link_results.chatUrl.acceptable_read_only_response).toBe(true);
    expect(packet.decision.real_device_scan_proven).toBe(false);
    expect(packet.closed_gates).toMatchObject({
      deploy: "blocked",
      push: "blocked",
      line_webhook: "blocked",
      production_analytics: "blocked",
      crm_customer_data_storage: "blocked"
    });
  });

  it("requires attention when the QR image is too small", () => {
    const packet = readyPacket({
      qrAsset: {
        url: lineConfig.qrImageUrl,
        status: 200,
        content_type: "",
        content_length: "100",
        ...inspectPng(fakePng(120, 120))
      }
    });

    expect(packet.status).toBe("LINE_QR_LINK_RECHECK_REQUIRES_ATTENTION");
    expect(packet.decision.completion_claim_allowed).toBe(false);
  });
});
