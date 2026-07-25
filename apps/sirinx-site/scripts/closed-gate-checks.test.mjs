import { describe, expect, it } from "vitest";
import { findClosedGateViolations } from "./closed-gate-checks.mjs";

function violationsFor(input) {
  return findClosedGateViolations({
    pages: new Map(Object.entries(input.pages || {})),
    scripts: new Map(Object.entries(input.scripts || {}))
  });
}

describe("closed gate static site checks", () => {
  it("flags lead capture surfaces in built HTML", () => {
    const violations = violationsFor({
      pages: {
        "/quote": '<form method="post" action="/api/leads"><input name="email" /></form>',
        "/line": '<script src="https://analytics.example.com/tag.js"></script>'
      }
    });

    expect(violations.map((violation) => violation.reason)).toEqual(
      expect.arrayContaining([
        "HTML form submit",
        "form method attribute",
        "form action attribute",
        "API endpoint link",
        "third-party script source"
      ])
    );
  });

  it("flags runtime storage, network, analytics, Supabase, and MongoDB wiring in built JavaScript", () => {
    const sampleMongoUri = ["mongo", "db://localhost:27017/sirinx"].join("");
    const violations = violationsFor({
      scripts: {
        "app.js": `
          localStorage.setItem("lead", "1");
          fetch("/api/leads");
          navigator.sendBeacon("/analytics");
          gtag("event", "lead");
          const supabaseClient = {};
          const uri = "${sampleMongoUri}";
        `
      }
    });

    expect(violations.map((violation) => violation.reason)).toEqual(
      expect.arrayContaining([
        "browser storage",
        "browser network call",
        "analytics beacon send",
        "production analytics vendor",
        "Supabase client/runtime wiring",
        "MongoDB connection string"
      ])
    );
  });

  it("allows static LINE links and QR image URLs without treating them as live integrations", () => {
    const violations = violationsFor({
      pages: {
        "/line": `
          <a href="https://lin.ee/S97R6nj">เพิ่มเพื่อน LINE Official</a>
          <a href="https://line.me/R/oaMessage/%40304zrttj">แชท LINE</a>
          <img src="https://qr-official.line.me/gs/M_304zrttj_GW.png?oat_content=qr" alt="QR Code" />
        `
      },
      scripts: {
        "app.js": 'console.log("[track]", "line_add_friend_click");'
      }
    });

    expect(violations).toEqual([]);
  });
});
