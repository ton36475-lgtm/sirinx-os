import { describe, expect, it } from "vitest";
import { evaluatePublicGuardian, lineExpected } from "./public-guardian-checks.mjs";

const safeRoutes = {
  home: `
    <a href="/quote">Quote</a>
    <a href="/line">LINE</a>
    <a href="/contact">Contact</a>
    <p>พร้อมประเมินช่วงลดค่าไฟและเงื่อนไขคืนทุนจากข้อมูลไซต์จริง</p>
  `,
  quote: `
    <section data-readiness-checklist>
      <div data-gate-state="closed"></div>
      <p>ไม่มีการส่งข้อมูล ไม่มีการบันทึกลงเบราว์เซอร์</p>
      <p>ไม่ใช่ quote form และไม่บันทึกข้อมูลลูกค้า</p>
      <a>เพิ่มเพื่อน LINE Official</a>
    </section>
  `,
  line: `
    <img src="${lineExpected.qrImageUrl}" data-qr-image />
    <a href="${lineExpected.shortLink}">short</a>
    <a href="${lineExpected.addFriendUrl}">add</a>
    <a href="${lineExpected.chatUrl}">chat</a>
    <code>${lineExpected.basicId}</code>
  `,
  contact: `
    <img src="${lineExpected.qrImageUrl}" data-qr-image />
    <a href="${lineExpected.shortLink}">short</a>
    <a href="${lineExpected.chatUrl}">chat</a>
    <a href="mailto:contact@sirinx.co">email</a>
  `
};

const darkStyles = `
  body:not(.production-home) { background: #0a1628; }
  .line-main-card,
  .contact-route-card,
  .proof-stage-card,
  .assurance-card {
    background: rgba(15, 23, 42, 0.68);
    border: 1px solid rgba(148, 163, 184, 0.18);
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.22);
  }
`;

describe("public guardian checks", () => {
  it("passes for the expected public route, LINE, claim, and dark-card evidence", () => {
    const packet = evaluatePublicGuardian({
      routes: safeRoutes,
      styles: darkStyles,
      lineConfig: lineExpected
    });

    expect(packet.status).toBe("PASS");
    expect(packet.completion_claim_allowed).toBe(false);
    expect(packet.deploy_gate).toBe("BLOCKED");
    expect(packet.checks.every((check) => check.passed)).toBe(true);
  });

  it("blocks the old fixed savings and payback claim", () => {
    const packet = evaluatePublicGuardian({
      routes: {
        ...safeRoutes,
        home: `${safeRoutes.home}<p>ผลิตไฟฟ้า ให้ร่มเงา รองรับ EV Charger ลดค่าไฟ 30-100% คืนทุน 3-5 ปี</p>`
      },
      styles: darkStyles,
      lineConfig: lineExpected
    });

    const claimCheck = packet.checks.find((check) => check.name === "claims:no_fake_or_guaranteed_outcome_claims");
    expect(packet.status).toBe("FAIL");
    expect(claimCheck.passed).toBe(false);
    expect(claimCheck.forbidden_claims).toEqual(
      expect.arrayContaining([
        { route: "home", label: "unsupported fixed savings range" },
        { route: "home", label: "unsupported fixed payback range" }
      ])
    );
  });

  it("fails if the LINE route loses the canonical QR reference", () => {
    const packet = evaluatePublicGuardian({
      routes: {
        ...safeRoutes,
        line: safeRoutes.line.replace(lineExpected.qrImageUrl, "missing-qr.png")
      },
      styles: darkStyles,
      lineConfig: lineExpected
    });

    const routeCheck = packet.checks.find((check) => check.name === "route:/line");
    expect(packet.status).toBe("FAIL");
    expect(routeCheck.passed).toBe(false);
    expect(routeCheck.missing).toContain(lineExpected.qrImageUrl);
  });
});
