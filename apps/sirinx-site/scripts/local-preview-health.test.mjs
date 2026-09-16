import { describe, expect, it } from "vitest";
import { createLocalPreviewHealthPacket } from "./local-preview-health.mjs";

const readyRoute = {
  path: "/line/",
  label: "LINE Official",
  status: 200,
  ok: true,
  content_type: "text/html; charset=utf-8",
  cache_control: "no-store",
  bytes: 12000,
  has_sirinx_signal: true,
  has_floating_contact_cluster: true,
  has_line_signal: true,
  missing_snippets: []
};

describe("local preview health packet", () => {
  it("marks the local preview ready when every review route responds with expected content", () => {
    const packet = createLocalPreviewHealthPacket({
      createdAt: "2026-07-03T06:00:00+0700",
      baseUrl: "http://127.0.0.1:18732",
      routeResults: [
        { ...readyRoute, path: "/" },
        { ...readyRoute, path: "/line/" },
        { ...readyRoute, path: "/contact/" }
      ]
    });

    expect(packet.packet_id).toBe("packet_070_sirinx_website_local_preview_health");
    expect(packet.status).toBe("LOCAL_PREVIEW_HEALTH_READY_FOR_HUMAN_REVIEW");
    expect(packet.mode).toContain("no_public_tunnel_no_push_no_deploy");
    expect(packet.route_count).toBe(3);
    expect(packet.completion_claim_allowed).toBe(false);
    expect(packet.closed_gates).toEqual(
      expect.arrayContaining(["deploy", "push", "line_webhook", "production_analytics", "crm_customer_data_storage"])
    );
  });

  it("requires attention for non-local URLs or missing snippets", () => {
    const packet = createLocalPreviewHealthPacket({
      createdAt: "2026-07-03T06:00:00+0700",
      baseUrl: "https://www.sirinx.co",
      routeResults: [{ ...readyRoute, missing_snippets: ["id=\"floating-contact-cluster\""] }]
    });

    expect(packet.status).toBe("LOCAL_PREVIEW_HEALTH_REQUIRES_ATTENTION");
    expect(packet.local_only_base_url).toBe(false);
    expect(packet.routes_ready).toBe(false);
    expect(packet.deploy_gate).toBe("BLOCKED_FOR_DEPLOY");
  });
});
