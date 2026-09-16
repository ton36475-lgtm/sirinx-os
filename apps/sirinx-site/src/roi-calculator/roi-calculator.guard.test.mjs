import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Resolve relative to this test file's location, not process.cwd()
// File is at: apps/sirinx-site/src/roi-calculator/roi-calculator.guard.test.mjs
// Need to go up 4 levels to reach repo root: roi-calculator -> src -> sirinx-site -> apps -> repo root
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..", "..", "..");
const pagePath = resolve(root, "apps/sirinx-site/src/roi-calculator/index.html");
const forbiddenClaims = [
  "ประหยัดแน่นอน",
  "คืนทุนแน่นอน",
  "ลดค่าไฟ 30% แน่นอน",
  "Zero Downtime แน่นอน",
  "กำไรทันที",
  "รายได้การันตี",
  "ติดแล้วรวย"
];

describe("SIRINX ROI calculator guard", () => {
  it("exposes a client-side estimator with clear non-guarantee copy", async () => {
    const html = await readFile(pagePath, "utf8");

    expect(html).toContain("data-roi-calculator");
    expect(html).toContain('data-roi-input="monthlyBill"');
    expect(html).toContain('data-roi-input="area"');
    expect(html).toContain('data-roi-input="daytimeUse"');
    expect(html).toContain('data-roi-input="electricityRate"');
    expect(html).toContain("ตัวเลขนี้เป็นแบบจำลองสำหรับคุยกับทีมเท่านั้น");
    expect(html).toContain("ไม่ใช่คำรับประกันผลลัพธ์");
    expect(html).toContain("คำนวณเป็นกรอบประมาณการเท่านั้น");
  });

  it("does not contain forbidden guaranteed-outcome claims", async () => {
    const html = await readFile(pagePath, "utf8");

    for (const claim of forbiddenClaims) {
      expect(html).not.toContain(claim);
    }
  });

  it("keeps the calculator closed-gate with no form, storage, network, or CRM path", async () => {
    const html = await readFile(pagePath, "utf8");

    expect(html).not.toMatch(/<form\b/i);
    expect(html).not.toMatch(/\b(localStorage|sessionStorage|indexedDB|document\.cookie)\b/i);
    expect(html).not.toMatch(/\b(fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/i);
    expect(html).not.toMatch(/\b(navigator\.sendBeacon|gtag|fbq|plausible|dataLayer)\b/i);
    expect(html).not.toMatch(/\b(crmClient|crmEndpoint|supabase|mongodb(?:\+srv)?:\/\/|createClient\s*\()/i);
  });
});
