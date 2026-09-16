import { describe, expect, it } from "vitest";
import { listApprovalQueue, ensureApprovalRequest } from "./approval-queue.mjs";

describe("approval-queue", () => {
  it("exports expected functions", () => {
    expect(typeof listApprovalQueue).toBe("function");
    expect(typeof ensureApprovalRequest).toBe("function");
  });

  it("listApprovalQueue returns items and totals", () => {
    const result = listApprovalQueue();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("totals");
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.totals).toHaveProperty("pending");
    expect(result.totals).toHaveProperty("approved");
    expect(result.totals).toHaveProperty("rejected");
    expect(result.totals).toHaveProperty("blocked");
  });

  it("listApprovalQueue items have required structure", () => {
    const { items } = listApprovalQueue();
    const first = items[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("actionId");
    expect(first).toHaveProperty("status");
    expect(first).toHaveProperty("riskLevel");
  });

  it("ensureApprovalRequest returns existing item for known actionId", () => {
    const existing = listApprovalQueue().items[0];
    const result = ensureApprovalRequest({ id: existing.actionId });
    expect(result.actionId).toBe(existing.actionId);
  });

  it("ensureApprovalRequest creates a new pending item for unknown actionId", () => {
    const result = ensureApprovalRequest({
      id: "test-new-action-" + Date.now(),
      title: "Test action",
      risk: "low"
    });
    expect(result).toHaveProperty("id");
    expect(result.status).toBe("pending");
    expect(result.riskLevel).toBe("low");
    expect(result.approvedBy).toBeNull();
  });

  it("ensureApprovalRequest marks blocked when kill switches are off", () => {
    const result = ensureApprovalRequest(
      { id: "test-blocked-action-" + Date.now(), title: "Blocked test", risk: "high" },
      [{ env: "CLOUDFLARE_MUTATION_ENABLED" }]
    );
    expect(result.status).toBe("blocked");
    expect(result.evidence).toContain("CLOUDFLARE_MUTATION_ENABLED=false");
  });
});
