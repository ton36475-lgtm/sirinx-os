import { describe, expect, it } from "vitest";
import { classifyTruthState, getTruthProtocolStatus } from "./truth-protocol.mjs";

describe("truth protocol status", () => {
  it("classifies report claims without treating templates as observed facts", () => {
    expect(classifyTruthState({ observed: true })).toBe("observed");
    expect(classifyTruthState({ template: true })).toBe("template");
    expect(classifyTruthState({ blocked: true })).toBe("blocked");
    expect(classifyTruthState({ observed: false })).toBe("not_run");
  });

  it("publishes a local-only reporting contract for Command Center", () => {
    const status = getTruthProtocolStatus();

    expect(status.status).toBe("local-truth-protocol-ready");
    expect(status.externalWrites).toBe(false);
    expect(status.productionWrites).toBe(false);
    expect(status.claimStates).toEqual(["observed", "template", "blocked", "not_run"]);
    expect(status.reportRules.some((rule) => rule.id === "telegram-delivery" && rule.requiredState === "observed")).toBe(true);
    expect(status.stopPoint).toBe("TRUTH PROTOCOL READY — LOCAL ONLY — WAITING FOR IMPLEMENTATION APPROVAL");
  });
});
