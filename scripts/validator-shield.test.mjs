import { describe, expect, it } from "vitest";
import { validateGeneratedCodeText } from "./validator-shield.mjs";

describe("validator shield", () => {
  it("blocks hardcoded API keys in generated code before execution", () => {
    const fakeKey = ["sk", "or", "v1"].join("-") + "_" + "a".repeat(40);
    const sample = [
      `const OPENROUTER_API_KEY = "${fakeKey}";`,
      "console.log('ready');"
    ].join("\n");

    const result = validateGeneratedCodeText(sample, {
      filePath: "generated/swarm_v2.py"
    });

    expect(result.ok).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.findings.map((finding) => finding.ruleId)).toContain("hardcoded_api_key");
    expect(JSON.stringify(result)).not.toContain(fakeKey);
  });
});
