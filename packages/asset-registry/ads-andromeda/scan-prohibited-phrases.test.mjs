import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateAssetFactoryData } from "./scan-prohibited-phrases.mjs";

const locks = JSON.parse(await readFile(resolve("packages/asset-registry/ads-andromeda/text-locks.json"), "utf8"));
const templatePack = JSON.parse(await readFile(resolve("prompts/ads-andromeda/templates.json"), "utf8"));

describe("ADS Andromeda asset factory scanner", () => {
  it("passes the canonical prompt pack", () => {
    const report = validateAssetFactoryData({ locks, templatePack });

    expect(report.status).toBe("PASS");
    expect(report.category_counts).toMatchObject({
      poster: 3,
      cover: 3,
      video_storyboard: 3
    });
    expect(report.errors).toEqual([]);
  });

  it("fails when rendered prompts contain prohibited copy or Thai typos", () => {
    const unsafePack = structuredClone(templatePack);
    unsafePack.templates[0].prompt += " ราซินี รับประกัน ไม่มีความเสี่ยง";

    const report = validateAssetFactoryData({ locks, templatePack: unsafePack });

    expect(report.status).toBe("FAIL");
    expect(report.errors).toEqual(
      expect.arrayContaining([
        { type: "forbidden_typo", template_id: "poster_cyber_queen_trust", typo: "ราซินี" },
        { type: "prohibited_phrase", template_id: "poster_cyber_queen_trust", phrase: "รับประกัน" },
        { type: "prohibited_phrase", template_id: "poster_cyber_queen_trust", phrase: "ไม่มีความเสี่ยง" }
      ])
    );
  });

  it("blocks affirmative fake chat UI requests while allowing negative safety wording", () => {
    const unsafePack = structuredClone(templatePack);
    unsafePack.templates[1].prompt += " Create fake chat UI with fake LINE conversation.";

    const report = validateAssetFactoryData({ locks, templatePack: unsafePack });

    expect(report.status).toBe("FAIL");
    expect(report.errors).toEqual(
      expect.arrayContaining([
        { type: "blocked_visual_pattern", template_id: "poster_account_stability", pattern: "fake chat UI" },
        {
          type: "blocked_visual_pattern",
          template_id: "poster_account_stability",
          pattern: "fake LINE conversation"
        }
      ])
    );
  });
});
