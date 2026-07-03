import { describe, expect, it } from "vitest";
import { createActiveFocusLocalPreviewUatPacket } from "./ghostclaw_active_focus_local_preview_uat.mjs";

const passingCommand = {
  command: "pnpm --filter @sirinx/site build",
  status: "PASS",
  duration_ms: 10,
  stdout_excerpt: "ok",
  stderr_excerpt: ""
};

const passingSirinxRoute = {
  path: "/",
  label: "SIRINX Home",
  status: 200,
  ok: true,
  content_type: "text/html; charset=utf-8",
  bytes: 1000,
  missing_snippets: []
};

const passingAutoglowHome = {
  path: "/",
  label: "AGM AutoGlow Dashboard",
  status: 200,
  ok: true,
  content_type: "text/html; charset=utf-8",
  bytes: 1000,
  missing_snippets: []
};

const passingProjectApi = {
  url: "http://127.0.0.1:18733/api/project",
  status: 200,
  ok: true,
  content_type: "application/json; charset=utf-8",
  brand_name: "AGM AUTOGLOW",
  product_name: "AGM AUTOGLOW Image Storyboard",
  schema_present: true
};

describe("active focus local preview UAT packet", () => {
  it("passes only when active-focus local URLs, commands, site routes, and dashboard API are ready", () => {
    const packet = createActiveFocusLocalPreviewUatPacket({
      root: "/Users/sirinx/sirinx-os",
      createdAt: "2026-07-03T00:00:00.000Z",
      sirinxBaseUrl: "http://127.0.0.1:18732",
      autoglowBaseUrl: "http://127.0.0.1:18733",
      commands: [passingCommand],
      sirinxRoutes: [passingSirinxRoute],
      autoglowHome: passingAutoglowHome,
      autoglowProjectApi: passingProjectApi
    });

    expect(packet.status).toBe("PASS");
    expect(packet.active_focus).toEqual(["sirinx.co", "AGM AutoFlow"]);
    expect(packet.paused_out_of_focus).toEqual(["Kusala", "Phitsanulok News"]);
    expect(packet.closed_gates).toEqual(expect.arrayContaining(["push", "deploy", "provider_call"]));
  });

  it("fails for public URLs or missing dashboard schema", () => {
    const packet = createActiveFocusLocalPreviewUatPacket({
      root: "/Users/sirinx/sirinx-os",
      createdAt: "2026-07-03T00:00:00.000Z",
      sirinxBaseUrl: "https://www.sirinx.co",
      autoglowBaseUrl: "http://127.0.0.1:18733",
      commands: [passingCommand],
      sirinxRoutes: [passingSirinxRoute],
      autoglowHome: passingAutoglowHome,
      autoglowProjectApi: { ...passingProjectApi, schema_present: false }
    });

    expect(packet.status).toBe("FAIL");
    expect(packet.checks.local_urls).toBe(false);
    expect(packet.checks.autoglow_ready).toBe(false);
  });
});
