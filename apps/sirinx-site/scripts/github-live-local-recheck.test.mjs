import { describe, expect, it } from "vitest";
import { createGithubLiveLocalRecheckPacket } from "./github-live-local-recheck.mjs";

const githubOldIndex = `<!doctype html><html><head><title>SIRINX - Controlled AI Operations</title></head><body>controlled AI operations</body></html>`;
const liveSolarHome = `<!doctype html><html><head><title>SIRINX | Solar Carport วางแผนลดค่าไฟองค์กร พร้อม EV Charger, BESS &amp; AI Energy</title></head><body><h1>เปลี่ยนที่จอดรถ</h1><a href="/contact?interest=solar-carport">ขอใบเสนอราคา Solar Carport</a></body></html>`;
const localSolarHome = `<!doctype html><html><head><title>SIRINX | Solar Carport วางแผนลดค่าไฟองค์กร พร้อม EV Charger, BESS &amp; AI Energy</title></head><body><h1>เปลี่ยนที่จอดรถ</h1><a href="/line">LINE</a><a href="/contact?interest=solar-carport">ขอใบเสนอราคา Solar Carport</a></body></html>`;
const localLinePage = `<!doctype html><html><head><title>ติดต่อ SIRINX ผ่าน LINE Official | Solar Carport</title></head><body><img src="https://qr-official.line.me/gs/M_304zrttj_GW.png?oat_content=qr" alt="QR Code สำหรับเพิ่มเพื่อน LINE Official ของ SIRINX" /><a href="https://lin.ee/S97R6nj">LINE</a></body></html>`;

function basePacket(overrides = {}) {
  return createGithubLiveLocalRecheckPacket({
    createdAt: "2026-07-03T03:20:00+0700",
    githubRead: {
      method: "github_contents_api",
      status: 200,
      blob_sha: "abc123",
      content: githubOldIndex
    },
    gitMetadata: {
      local_head_sha: "local",
      remote_branch_sha: "remote",
      branch_found: true,
      status_short: "## staging/godmode-master-os-v2...origin/staging/godmode-master-os-v2 [ahead 33]",
      website_diff_name_status: "M\tapps/sirinx-site/src/index.html"
    },
    liveHome: {
      url: "https://www.sirinx.co/",
      status: 200,
      html: liveSolarHome
    },
    liveLine: {
      url: "https://www.sirinx.co/line",
      status: 404,
      html: "<html><title>Not found</title></html>"
    },
    localHomeHtml: localSolarHome,
    localLineHtml: localLinePage,
    ...overrides
  });
}

describe("github/live/local recheck packet", () => {
  it("keeps the local working copy as the review target when GitHub is older", () => {
    const packet = basePacket();

    expect(packet.packet_id).toBe("packet_065_sirinx_website_github_live_local_recheck_automation");
    expect(packet.status).toBe("GITHUB_LIVE_LOCAL_RECHECK_READY_LOCAL_REVIEW_TARGET_CONFIRMED");
    expect(packet.decision.copy_github_index_to_local).toBe(false);
    expect(packet.decision.review_target).toBe("local_working_copy");
    expect(packet.source_comparison.github_branch_index.has_old_controlled_ai_title).toBe(true);
    expect(packet.source_comparison.local_home.has_line_route_link).toBe(true);
    expect(packet.source_comparison.local_line.has_qr_url).toBe(true);
    expect(packet.closed_gates).toMatchObject({
      deploy: "blocked",
      push: "blocked",
      line_webhook: "blocked",
      production_analytics: "blocked",
      crm_customer_data_storage: "blocked"
    });
  });

  it("requires attention when the local homepage does not expose the LINE route", () => {
    const packet = basePacket({
      localHomeHtml: liveSolarHome
    });

    expect(packet.status).toBe("GITHUB_LIVE_LOCAL_RECHECK_REQUIRES_ATTENTION");
    expect(packet.decision.completion_claim_allowed).toBe(false);
  });
});
