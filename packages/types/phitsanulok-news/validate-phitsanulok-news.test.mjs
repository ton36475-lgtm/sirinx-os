import { describe, expect, it } from "vitest";
import { validatePhitsanulokNewsTypes } from "./validate-phitsanulok-news.mjs";

describe("Phitsanulok news type contracts", () => {
  it("keeps Facebook and pipeline gates draft-only", async () => {
    const result = await validatePhitsanulokNewsTypes();
    expect(result.status).toBe("PASS");
    expect(result.failures).toEqual([]);
  });
});
