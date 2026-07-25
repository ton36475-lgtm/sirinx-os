import { describe, expect, it } from "vitest";
import { validateAssetPack } from "./validate-asset-pack.mjs";

describe("AI Education Carousel asset pack", () => {
  it("contains exactly five local prompt templates", async () => {
    const result = await validateAssetPack();

    expect(result.status).toBe("PASS");
    expect(result.template_count).toBe(5);
  });

  it("keeps the clean editorial palette complete", async () => {
    const result = await validateAssetPack();

    expect(result.required_palette).toEqual([
      "warm_ivory",
      "deep_ink_navy",
      "cool_slate",
      "clean_cyan",
      "warm_coral",
      "muted_gold"
    ]);
  });

  it("does not include blocked visual terms in templates", async () => {
    const result = await validateAssetPack();

    expect(result.failures).toEqual([]);
  });
});
