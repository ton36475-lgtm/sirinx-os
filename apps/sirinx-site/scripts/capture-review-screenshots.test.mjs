import { describe, expect, it } from "vitest";
import { createScreenshotManifest, reviewTargets, reviewViewports } from "./capture-review-screenshots.mjs";

describe("review screenshot capture configuration", () => {
  it("covers all human-review routes across desktop and mobile viewports", () => {
    expect(reviewTargets.map((target) => target.path)).toEqual([
      "/",
      "/line/",
      "/contact/",
      "/projects/",
      "/trust-center/",
      "/quote/",
      "/roi-calculator/"
    ]);
    expect(reviewViewports.map((viewport) => viewport.slug)).toEqual(["desktop", "mobile"]);
  });

  it("creates a local-only manifest for screenshot evidence", () => {
    const manifest = createScreenshotManifest({
      outputDir: "/tmp/sirinx-review",
      baseUrl: "http://127.0.0.1:18731",
      screenshots: [{ route: "/", viewport: "desktop", path: "/tmp/sirinx-review/home-desktop.png" }]
    });

    expect(manifest.mode).toBe("local_only_visual_review_evidence");
    expect(manifest.output_dir).toBe("/tmp/sirinx-review");
    expect(manifest.screenshots).toHaveLength(1);
  });
});
