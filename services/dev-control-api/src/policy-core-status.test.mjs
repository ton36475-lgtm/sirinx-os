import { describe, expect, it } from "vitest";
import { getPolicyCoreStatus } from "./policy-core-status.mjs";

describe("policy core status contract", () => {
  it("exposes read-only policy decisions for Command Center review", () => {
    const status = getPolicyCoreStatus();

    expect(status.status).toBe("local-policy-engine-ready");
    expect(status.externalWrites).toBe(false);
    expect(status.productionWrites).toBe(false);
    expect(status.summary.samples).toBe(5);
    expect(status.summary.allowed).toBe(1);
    expect(status.summary.approval_required).toBe(2);
    expect(status.summary.blocked).toBe(2);
    expect(status.decisions.some((item) => item.id === "solis-readonly-telemetry" && item.decision === "blocked")).toBe(
      true
    );
  });
});
