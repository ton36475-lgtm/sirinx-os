import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const skillText = readFileSync(
  new URL("../../skills/ghostclaw-agent-ghostclaws-thai-jarvis/SKILL.md", import.meta.url),
  "utf8"
);

describe("Phase 10 Skill Creator / Zero Prompting contract", () => {
  it("marks Phase 10 coverage in the GhostClaw skill", () => {
    expect(skillText).toMatch(/phase_coverage:\s*"1-(10|11)"/);
    expect(skillText).toContain("Skill Creator / Zero Prompting System (Phase 10)");
  });

  it("preserves the Zero Prompting Mission Card workflow", () => {
    for (const marker of [
      "Zero Prompting workflow",
      "Mission Cards",
      "Goal",
      "Constraints",
      "File Scope",
      "Expected Result",
      "Verification",
      "Report Format"
    ]) {
      expect(skillText).toContain(marker);
    }
  });

  it("documents all required worker lanes and readiness contracts", () => {
    for (const marker of [
      "Hermes/Codex mutual approval",
      "Worker Build Runtime",
      "Browser Use Worker",
      "Vibe Coding Agent",
      "A2A Sync Team",
      "MoA-gated Brainstorm",
      "LatentMAS dual-plane architecture",
      "Model Auto Swap Router",
      "Kimi Worker lane",
      "EdgeOne deployment readiness",
      "GitHub Toptrend public read-only research",
      "validation/receipt/archive"
    ]) {
      expect(skillText).toContain(marker);
    }
  });

  it("keeps Phase 10 hard stops explicit", () => {
    for (const marker of [
      "no secret access",
      "no push/deploy",
      "no live provider/model call",
      "no GPU inference",
      "no model download"
    ]) {
      expect(skillText).toContain(marker);
    }
  });
});
