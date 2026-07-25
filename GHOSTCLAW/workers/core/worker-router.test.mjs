import { describe, expect, it } from "vitest";
import WorkerRouter from "./worker-router.mjs";

describe("GHOSTCLAW Worker Router", () => {
  it("exports WorkerRouter as default", () => {
    expect(WorkerRouter).toBeDefined();
    expect(typeof WorkerRouter).toBe("function");
  });

  it("constructs router and builds indices from registry", () => {
    const router = new WorkerRouter();
    expect(router.registry).toBeDefined();
    expect(router.registry.workers.length).toBeGreaterThan(0);
    expect(router.capabilityIndex.size).toBeGreaterThan(0);
    expect(router.actionIndex.size).toBeGreaterThan(0);
    expect(router.roleIndex.size).toBeGreaterThan(0);
  });

  it("routes explicit worker_id to that worker", () => {
    const router = new WorkerRouter();
    const result = router.route({ worker_id: "kimi_coding_worker" });
    expect(result).toEqual(["kimi_coding_worker"]);
  });

  it("returns empty array for unknown worker_id", () => {
    const router = new WorkerRouter();
    const result = router.route({ worker_id: "nonexistent_worker" });
    expect(result).toEqual([]);
  });

  it("routes by action_class to eligible workers", () => {
    const router = new WorkerRouter();
    // kimi_coding_worker is known to handle code_patch
    const result = router.route({ action_class: "code_patch" });
    expect(result).toContain("kimi_coding_worker");
  });

  it("findByCapability returns workers for a known capability", () => {
    const router = new WorkerRouter();
    const coders = router.findByCapability("code_generation");
    expect(coders).toContain("kimi_coding_worker");
  });

  it("findByAction returns workers for a known action", () => {
    const router = new WorkerRouter();
    const result = router.findByAction("code_patch");
    expect(result.length).toBeGreaterThan(0);
  });

  it("findByRole returns workers for a known role", () => {
    const router = new WorkerRouter();
    const result = router.findByRole("coding_tool_use_reference");
    expect(result).toContain("kimi_coding_worker");
  });

  it("findByModelLane returns workers in a model lane", () => {
    const router = new WorkerRouter();
    const result = router.findByModelLane("kimi");
    expect(result).toContain("kimi_coding_worker");
  });

  it("validateApprovalConstraint rejects self-routing (from === to)", () => {
    const router = new WorkerRouter();
    const result = router.validateApprovalConstraint({
      from_agent: "codex",
      to_agent: "codex"
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Self-routing");
  });

  it("validateApprovalConstraint rejects self-approval (requester === approver)", () => {
    const router = new WorkerRouter();
    const result = router.validateApprovalConstraint({
      requester_agent: "codex",
      approver_agent: "codex"
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Self-approval");
  });

  it("validateApprovalConstraint passes for distinct agents", () => {
    const router = new WorkerRouter();
    const result = router.validateApprovalConstraint({
      from_agent: "codex",
      to_agent: "hermes",
      requester_agent: "codex",
      approver_agent: "hermes"
    });
    expect(result.valid).toBe(true);
  });

  it("validateApprovalConstraint rejects autonomous self_approval=true", () => {
    const router = new WorkerRouter();
    const result = router.validateApprovalConstraint({
      autonomous_approval: { self_approval: true }
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("self_approval");
  });

  it("getRoutingTable returns structured routing indices", () => {
    const router = new WorkerRouter();
    const table = router.getRoutingTable();
    expect(table).toHaveProperty("byCapability");
    expect(table).toHaveProperty("byAction");
    expect(table).toHaveProperty("byRole");
    expect(table).toHaveProperty("byModelLane");
    expect(table.byCapability.code_generation).toBeDefined();
  });
});
