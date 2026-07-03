import { describe, expect, it } from "vitest";
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
});
