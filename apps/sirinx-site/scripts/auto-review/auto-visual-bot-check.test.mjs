import { describe, expect, it } from "vitest";
import {
  browserContextOptionsForEngine,
  classifyAutoVisualBotVerdict,
  inspectSeoMeta,
  makeBaselineMissingVisualResult,
  makeDependencyMissingCheck,
  summarizeAutoVisualBotReceipt,
  validateDryRunForms
} from "./auto-visual-bot-check.mjs";

describe("P087B auto visual bot check layer", () => {
  it("returns bot-verified verdict only when every required check passes", () => {
    expect(
      classifyAutoVisualBotVerdict({
        checks: [
          { check_type: "visual_regression", status: "passed" },
          { check_type: "accessibility_bot", status: "passed" },
          { check_type: "broken_link_crawler", status: "passed" },
          { check_type: "console_error_scan", status: "passed" },
          { check_type: "mobile_overlap_bot", status: "passed" },
          { check_type: "lighthouse_automated", status: "passed" },
          { check_type: "seo_meta_bot", status: "passed" },
          { check_type: "form_dry_run_bot", status: "passed" },
          { check_type: "cross_browser_bot", status: "passed" }
        ],
        findings: []
      })
    ).toBe("auto_review_pass_bot_verified");
  });

  it("blocks deploy discussion when a required bot check fails", () => {
    expect(
      classifyAutoVisualBotVerdict({
        checks: [
          { check_type: "visual_regression", status: "passed" },
          { check_type: "console_error_scan", status: "failed" }
        ],
        findings: [{ severity: "high", code: "CONSOLE_ERROR", message: "runtime error" }]
      })
    ).toBe("auto_review_blocked_findings_attached");
  });

  it("validates SEO metadata and JSON-LD without external requests", () => {
    const html = `<!doctype html>
      <html lang="th">
        <head>
          <title>SIRINX | Solar Carport</title>
          <meta name="description" content="Solar Carport สำหรับองค์กร" />
          <link rel="canonical" href="https://www.sirinx.co/line" />
          <meta property="og:image" content="/assets/og-sirinx.png" />
          <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"SIRINX"}</script>
        </head>
        <body><main id="main"><h1>ติดต่อ SIRINX</h1></main></body>
      </html>`;

    const result = inspectSeoMeta({ html, route: "/line/" });

    expect(result.status).toBe("passed");
    expect(result.findings).toEqual([]);
  });

  it("keeps form dry-run closed when no form exists and blocks live POST forms", () => {
    expect(validateDryRunForms({ html: "<main><a href='/contact'>Contact</a></main>" }).status).toBe("passed");

    const unsafe = validateDryRunForms({
      html: '<form method="post" action="https://api.line.me/v2/bot/message/push"><button>Send</button></form>'
    });

    expect(unsafe.status).toBe("failed");
    expect(unsafe.findings.map((finding) => finding.code)).toContain("LIVE_FORM_POST_DETECTED");
  });

  it("summarizes a receipt as ready only when deploy gates remain blocked", () => {
    const summary = summarizeAutoVisualBotReceipt({
      verdict: "auto_review_pass_bot_verified",
      blocked_actions_confirmed: ["deploy", "push", "cloud_mutation", "live_send", "secret_read"],
      routes_checked: ["/", "/line/"],
      visual_diff_results: [{ route: "/", status: "passed" }],
      a11y_violations: [],
      broken_links: [],
      console_errors: [],
      overlap_findings: [],
      seo_findings: [],
      cross_browser_results: [{ engine: "chromium", route: "/", status: "passed" }]
    });

    expect(summary.evidence_ready).toBe(true);
    expect(summary.accepted_manual_checks).toContain("Existing bot / inquiry path behavior");
  });

  it("does not accept missing browser engines as bot-verified cross-browser evidence", () => {
    const summary = summarizeAutoVisualBotReceipt({
      verdict: "auto_review_pass_bot_verified",
      blocked_actions_confirmed: ["deploy", "push", "cloud_mutation", "live_send", "secret_read"],
      routes_checked: ["/"],
      visual_diff_results: [{ route: "/", status: "passed" }],
      a11y_violations: [],
      broken_links: [],
      console_errors: [],
      overlap_findings: [],
      seo_findings: [],
      cross_browser_results: [{ engine: "webkit", route: "*", status: "skipped_dependency_missing" }]
    });

    expect(summary.evidence_ready).toBe(false);
  });

  it("marks missing Lighthouse as a failed dependency check", () => {
    const check = makeDependencyMissingCheck({
      check_type: "lighthouse_automated",
      dependency: "lighthouse",
      message: "Lighthouse CI is not installed"
    });

    expect(check.status).toBe("failed");
    expect(check.summary).toContain("lighthouse");
    expect(check.data.reason).toBe("missing_dependency");
  });

  it("marks missing axe-core as a failed dependency check", () => {
    const check = makeDependencyMissingCheck({
      check_type: "accessibility_bot",
      dependency: "axe-core",
      message: "axe-core is not installed"
    });

    expect(check.status).toBe("failed");
    expect(check.summary).toContain("axe-core");
    expect(check.data.reason).toBe("missing_dependency");
  });

  it("uses the baseline second-run verdict when a visual baseline is missing", () => {
    const visualResult = makeBaselineMissingVisualResult({
      route: "/",
      viewport: "desktop-1440",
      baselinePath: "reports/visual/baseline/home-desktop-1440.png"
    });

    expect(visualResult.status).toBe("failed");
    expect(visualResult.baseline_seeded).toBe(true);
    expect(visualResult.reason).toBe("baseline_missing");
    expect(
      classifyAutoVisualBotVerdict({
        checks: [
          { check_type: "visual_regression", status: "failed" },
          { check_type: "accessibility_bot", status: "passed" },
          { check_type: "broken_link_crawler", status: "passed" },
          { check_type: "console_error_scan", status: "passed" },
          { check_type: "mobile_overlap_bot", status: "passed" },
          { check_type: "lighthouse_automated", status: "passed" },
          { check_type: "seo_meta_bot", status: "passed" },
          { check_type: "form_dry_run_bot", status: "passed" },
          { check_type: "cross_browser_bot", status: "passed" }
        ],
        findings: [],
        visual_diff_results: [visualResult]
      })
    ).toBe("baseline_initialized_needs_second_run");
  });

  it("does not request unsupported mobile emulation options from Firefox", () => {
    expect(browserContextOptionsForEngine("firefox")).toEqual({ viewport: { width: 390, height: 844 } });
    expect(browserContextOptionsForEngine("chromium")).toEqual({
      viewport: { width: 390, height: 844 },
      isMobile: true
    });
  });
});
