import { describe, expect, it } from "vitest";
import { gates, actions, getAction, createDryRunResult } from "./gates.mjs";

describe("gates", () => {
  it("exports expected arrays and functions", () => {
    expect(Array.isArray(gates)).toBe(true);
    expect(Array.isArray(actions)).toBe(true);
    expect(typeof getAction).toBe("function");
    expect(typeof createDryRunResult).toBe("function");
  });

  it("gates array contains the dry-run lock gate", () => {
    const dryRun = gates.find((g) => g.id === "dry-run-lock");
    expect(dryRun).toBeDefined();
    expect(dryRun.state).toBe("pass");
  });

  it("each gate has id, title, state, description", () => {
    for (const gate of gates) {
      expect(gate).toHaveProperty("id");
      expect(gate).toHaveProperty("title");
      expect(gate).toHaveProperty("state");
      expect(gate).toHaveProperty("description");
    }
  });

  it("getAction returns action by id", () => {
    const action = getAction("baseline-check");
    expect(action).toBeDefined();
    expect(action.id).toBe("baseline-check");
    expect(action.risk).toBe("low");
  });

  it("getAction returns undefined for unknown id", () => {
    expect(getAction("nonexistent-action")).toBeUndefined();
  });

  it("createDryRunResult returns 404 for unknown action", () => {
    const result = createDryRunResult("nonexistent-action-xyz");
    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
  });

  it("createDryRunResult simulates a low-risk dry-run action", () => {
    const result = createDryRunResult("baseline-check");
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.body.result).toBe("simulated_only");
    expect(result.body.externalWrites).toBe(false);
  });

  it("createDryRunResult queues for approval when requiresApproval is true", () => {
    const result = createDryRunResult("release-preflight");
    expect(result.ok).toBe(true);
    expect(result.status).toBe(202);
    expect(result.body.result).toBe("queued_for_approval");
    expect(result.body.approvalRequest).not.toBeNull();
  });
});
