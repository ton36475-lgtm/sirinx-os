import { describe, expect, it } from "vitest";
import {
  buildCsvExport,
  buildExtensionHandoff,
  buildMarkdownExport,
  buildProjectMetrics,
  createDashboardProject,
  updateProjectFromIntake
} from "./autoglow-dashboard-core.mjs";

describe("AGM AUTOGLOW dashboard core", () => {
  it("creates an editable dashboard project with storyboard scenes", () => {
    const project = createDashboardProject();

    expect(project.brandName).toBe("AGM AUTOGLOW");
    expect(project.scenes).toHaveLength(3);
    expect(project.scenes[0].status).toBe("approved");
  });

  it("updates intake fields and recompiles scene prompts", () => {
    const project = updateProjectFromIntake(createDashboardProject(), {
      productName: "ข้าวหมูแดงเตาถ่านลุงแบงค์",
      targetAudience: "คนทำงานในพิษณุโลก",
      tone: "น่ากิน, ท้องถิ่น, พรีเมียม"
    });

    expect(project.productName).toBe("ข้าวหมูแดงเตาถ่านลุงแบงค์");
    expect(project.scenes[0].prompt).toContain("ข้าวหมูแดงเตาถ่านลุงแบงค์");
    expect(project.scenes[0].prompt).toContain("vertical 9:16");
  });

  it("summarizes operational metrics for the dashboard", () => {
    const metrics = buildProjectMetrics(createDashboardProject());

    expect(metrics.totalProjects).toBe(1);
    expect(metrics.activeScenes).toBe(3);
    expect(metrics.exportPacks).toBe(1);
    expect(metrics.localSync).toBe(100);
    expect(metrics.statusCounts.approved).toBe(1);
    expect(metrics.statusCounts.copied).toBe(1);
    expect(metrics.statusCounts.needs_review).toBe(1);
  });

  it("builds markdown, csv, and extension handoff exports", () => {
    const project = createDashboardProject();
    const markdown = buildMarkdownExport(project);
    const csv = buildCsvExport(project);
    const handoff = buildExtensionHandoff(project);

    expect(markdown).toContain("# AGM AUTOGLOW Delivery Pack");
    expect(markdown).toContain("## Storyboard");
    expect(csv.split("\n")[0]).toBe("sceneNo,hook,prompt,voiceoverText,captionText,status");
    expect(handoff.targetTool).toBe("Google Flow Assisted");
    expect(handoff.mode).toBe("manual-assisted");
    expect(handoff.scenes).toHaveLength(3);
  });
});
