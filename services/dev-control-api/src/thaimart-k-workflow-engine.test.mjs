import { describe, expect, it } from "vitest";
import {
  getKWorkflowEngineStatus,
  createWorkflow,
  advanceWorkflow
} from "./thaimart-k-workflow-engine.mjs";

describe("ThaiMart K Workflow Engine", () => {
  it("exports expected functions", () => {
    expect(typeof getKWorkflowEngineStatus).toBe("function");
    expect(typeof createWorkflow).toBe("function");
    expect(typeof advanceWorkflow).toBe("function");
  });

  it("getKWorkflowEngineStatus returns status with states and approval gates", () => {
    const status = getKWorkflowEngineStatus();
    expect(status.title).toBe("ThaiMart K01-K15 Workflow Engine");
    expect(status.version).toBe("1.0");
    expect(Array.isArray(status.states)).toBe(true);
    expect(status.states.length).toBeGreaterThan(0);
    // Object.keys() returns uppercase enum keys
    expect(status.states).toContain("INTAKE");
    expect(status.states).toContain("ARCHIVED");
    expect(status).toHaveProperty("approvalGates");
    expect(status).toHaveProperty("connectorStatus");
    expect(status.connectorStatus.thaimart).toBe("disabled_pending_contract");
  });

  it("createWorkflow initializes a workflow in INTAKE state", () => {
    const wf = createWorkflow({ id: "proj-001", type: "listing_publish" });
    expect(wf.projectId).toBe("proj-001");
    expect(wf.projectType).toBe("listing_publish");
    expect(wf.state).toBe("intake");
    expect(wf.contextPack).toBeNull();
    expect(wf.deliverables).toEqual([]);
    expect(wf.approvals).toEqual({});
    expect(wf.createdAt).toBeDefined();
  });

  it("advanceWorkflow approves from WAITING_APPROVAL → READY_TO_APPLY", () => {
    const wf = createWorkflow({ id: "proj-002", type: "price_stock" });
    // Force into waiting_approval state
    const waiting = { ...wf, state: "waiting_approval" };
    const result = advanceWorkflow(waiting, "approve");
    expect(result.state).toBe("ready_to_apply");
  });

  it("advanceWorkflow rejects from WAITING_APPROVAL → REJECTED", () => {
    const wf = createWorkflow({ id: "proj-003", type: "chat_send" });
    const waiting = { ...wf, state: "waiting_approval" };
    const result = advanceWorkflow(waiting, "reject");
    expect(result.state).toBe("rejected");
  });

  it("advanceWorkflow returns unchanged workflow for unrecognized event", () => {
    const wf = createWorkflow({ id: "proj-004", type: "order_status" });
    const result = advanceWorkflow(wf, "unknown_event");
    expect(result.state).toBe("intake");
  });

  it("advanceWorkflow returns unchanged workflow from terminal state", () => {
    const archived = { state: "archived", projectId: "proj-005" };
    const result = advanceWorkflow(archived, "approve");
    expect(result.state).toBe("archived");
  });
});
