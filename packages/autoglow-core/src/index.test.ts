import { describe, expect, it } from "vitest";
import {
  AUTOGLOW_FORBIDDEN_ACTIONS,
  buildCsvExport,
  buildMarkdownExport,
  compileScenePrompt,
  createMockProject,
  validateProject
} from "./index.js";

describe("AGM AUTOGLOW core", () => {
  it("validates a safe local creative production project", () => {
    const project = createMockProject();
    const result = validateProject(project);

    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
    expect(project.scenes[0]?.status).toBe("draft");
    expect(project.platform).toContain("tiktok");
  });

  it("keeps the Flow assistant policy away from unsafe automation patterns", () => {
    expect(AUTOGLOW_FORBIDDEN_ACTIONS).toEqual(
      expect.arrayContaining([
        "NO_COOKIE_SESSION_TOKEN_ACCESS",
        "NO_CREDIT_OR_RATE_LIMIT_BYPASS",
        "NO_PRIVATE_API_REPLAY",
        "NO_HIDDEN_BACKGROUND_AUTOMATION",
        "NO_AUTO_POST_OR_COMMENT"
      ])
    );
  });

  it("compiles a scene prompt from storyboard, camera, motion, and brand context", () => {
    const project = createMockProject();
    const scene = project.scenes[0];
    if (!scene) throw new Error("mock project must include a scene");

    const prompt = compileScenePrompt(project, scene);

    expect(prompt).toContain(project.visualStyle);
    expect(prompt).toContain(scene.visualDescription);
    expect(prompt).toContain(scene.cameraDirection);
    expect(prompt).toContain(scene.motionDirection);
    expect(prompt).toContain("vertical 9:16");
    expect(prompt).toContain("human-reviewed assisted workflow");
    expect(prompt).not.toMatch(/cookie|session|token|captcha|bypass|auto-click/i);
  });

  it("builds a delivery markdown pack with storyboard, prompts, voiceover, and captions", () => {
    const project = createMockProject();
    const markdown = buildMarkdownExport(project);

    expect(markdown).toContain("# AGM AUTOGLOW Delivery Pack");
    expect(markdown).toContain("## Storyboard");
    expect(markdown).toContain("## Prompt Pack");
    expect(markdown).toContain(project.scenes[0]?.voiceoverText);
    expect(markdown).toContain(project.scenes[0]?.captionText);
  });

  it("builds a CSV prompt pack that spreadsheet tools can import", () => {
    const csv = buildCsvExport(createMockProject());

    expect(csv.split("\n")[0]).toBe(
      "sceneNo,hook,visualDescription,cameraDirection,motionDirection,prompt,voiceoverText,captionText,status"
    );
    expect(csv).toContain('"1"');
    expect(csv).toContain('"draft"');
  });
});
