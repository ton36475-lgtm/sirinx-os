import { describe, expect, it } from "vitest";
import { validateCompetitorResearchPacket } from "./validate_competitor_research_packet.mjs";

describe("competitor research pipeline", () => {
  it("validates public-source research templates", async () => {
    const result = await validateCompetitorResearchPacket();

    expect(result.status).toBe("PASS");
    expect(result.required_columns).toContain("pricing_clarity_score");
    expect(result.failures).toEqual([]);
  });
});
