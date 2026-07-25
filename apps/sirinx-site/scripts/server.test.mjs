import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderHtmlForLocalPreview } from "../server.mjs";

const partial = '<div id="floating-contact-cluster">LINE dock</div>';

describe("sirinx-site local preview server", () => {
  it("injects the floating contact cluster into HTML pages that do not include it", () => {
    const rendered = renderHtmlForLocalPreview({
      html: '<main id="main">LINE page</main>\n<script type="module" src="/app.js"></script>',
      floatingContactPartial: partial
    });

    expect(rendered).toContain('id="floating-contact-cluster"');
    expect(rendered).toContain('<script type="module" src="/app.js"></script>');
    expect(rendered.indexOf('id="floating-contact-cluster"')).toBeLessThan(
      rendered.indexOf('<script type="module" src="/app.js"></script>')
    );
  });

  it("does not duplicate the existing homepage floating contact cluster", () => {
    const rendered = renderHtmlForLocalPreview({
      html: '<div id="floating-contact-cluster">Existing dock</div><script type="module" src="/app.js"></script>',
      floatingContactPartial: partial
    });

    expect(rendered.match(/id="floating-contact-cluster"/g)).toHaveLength(1);
    expect(rendered).toContain("Existing dock");
    expect(rendered).not.toContain("LINE dock");
  });

  it("keeps hidden desktop contact panels inert until opened", async () => {
    const root = resolve(import.meta.dirname, "..");
    const floatingContact = await readFile(resolve(root, "src", "_partials", "floating-contact.html"), "utf8");
    const appScript = await readFile(resolve(root, "src", "app.js"), "utf8");

    expect(floatingContact).toMatch(/id="line-panel"[\s\S]*aria-hidden="true"[\s\S]*inert/);
    expect(floatingContact).toMatch(/id="inquiry-panel"[\s\S]*aria-hidden="true"[\s\S]*inert/);
    expect(appScript).toContain("function setPanelOpen(panel, open)");
    expect(appScript).toContain("panel.inert = !open");
  });

  it("keeps the original Solar Carport homepage restored on /main with LINE entry points", async () => {
    const root = resolve(import.meta.dirname, "..");
    const homepage = await readFile(resolve(root, "src", "index.html"), "utf8");
    const redirects = await readFile(resolve(root, "public", "_redirects"), "utf8");

    expect(homepage).toContain('class="production-home solar-carport-original"');
    expect(homepage).toContain("restore-sources/ton36475-lgtm-sirinx@15799844a0ce41ad33717cf0c2f09ce8a725596e");
    expect(homepage).toContain("SIRINX | Solar Carport");
    expect(homepage).toContain("เปลี่ยนที่จอดรถ");
    expect(homepage).toContain("เป็นโรงไฟฟ้าพลังงานแสงอาทิตย์");
    expect(homepage).toContain("ออกแบบเฉพาะทาง รับน้ำหนักลม-ฝน");
    expect(homepage).toContain("อายุใช้งาน 25+ ปี");
    expect(homepage).toContain("นัดสำรวจหน้างานฟรี");
    expect(homepage).toContain("ดูโซลูชันทั้งหมด");
    expect(homepage).toContain("99.5%");
    expect(homepage).toContain("System Uptime");
    expect(homepage).toContain("ทำไม Solar Carport");
    expect(homepage).toContain("ระบบนิเวศพลังงานครบวงจร");
    expect(homepage).toContain("จากสำรวจสู่ติดตั้ง ใน 4 ขั้นตอน");
    expect(homepage).toContain("คำถามที่พบบ่อยเกี่ยวกับ Solar Carport");
    expect(homepage).toContain('class="production-line-link"');
    expect(homepage).toContain('href="/line"');
    expect(homepage).toContain("เพิ่มเพื่อน LINE");
    expect(homepage).toContain("LINE Official: @304zrttj");
    expect(homepage).toContain('data-track-event="quote_cta_click"');
    expect(homepage).not.toContain("Business solar assessment");
    expect(homepage).not.toContain("ระบบโซลาร์ที่เหมาะกับธุรกิจ ต้องเริ่มจากโหลดไฟ");
    expect(homepage).not.toContain("SIRINX - Controlled AI Operations");
    expect(homepage).not.toContain("AI operating systems for serious work");
    expect(redirects).toContain("/main / 200");
  });
});
