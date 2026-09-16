import { describe, expect, it } from "vitest";
import { validateLocalBusinessPack } from "./validate-local-business-pack.mjs";

describe("Local business promo asset pack", () => {
  it("keeps exact text locks and public-marketing-only gates", async () => {
    const result = await validateLocalBusinessPack();
    expect(result.status).toBe("PASS");
    expect(result.project_count).toBe(4);
    expect(result.failures).toEqual([]);
  });
});
