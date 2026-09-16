import { describe, expect, it } from "vitest";
import WorkerRuntime from "./worker-runtime.mjs";
import WorkerRouter from "./worker-router.mjs";
import WorkerHeartbeat from "./worker-heartbeat.mjs";
import WorkerReceipt from "./worker-receipt.mjs";

function validMessage(overrides = {}) {
  return {
    message_type: "request",
    task_id: "task-phase1-worker-runtime",
    correlation_id: "corr-phase1-worker-runtime",
    decision_id: "decision-phase1-worker-runtime",
    from_agent: "codex",
    to_agent: "hermes",
    worker_id: "kimi_coding_worker",
    action_class: "code_patch",
    requester_agent: "codex",
    approver_agent: "hermes",
    receipt_required: true,
    evidence_pack: {
      artifacts: [{ file_path: "GHOSTCLAW/workers/core/worker-runtime.mjs" }],
      verification_data: { tests_passed: true }
    },
    ...overrides
  };
}

describe("GhostClaw Worker Build Runtime contract", () => {
  it("loads the worker registry and exposes concrete worker IDs", () => {
    const runtime = new WorkerRuntime();
    expect(runtime.listWorkerIds()).toEqual(expect.arrayContaining([
      "kimi_coding_worker",
      "model_swap_worker"
    ]));
  });

  it("routes allowed actions through the worker router", () => {
    const router = new WorkerRouter();
    expect(router.findByAction("code_patch")).toContain("kimi_coding_worker");
    expect(router.route(validMessage())).toEqual(["kimi_coding_worker"]);
  });

  it("rejects self approval in router and runtime", () => {
    const router = new WorkerRouter();
    expect(router.validateApprovalConstraint(validMessage({
      requester_agent: "codex",
      approver_agent: "codex"
    }))).toMatchObject({ valid: false });

    const runtime = new WorkerRuntime();
    expect(() => runtime.validateMutualApproval("codex", "codex")).toThrow(/Self-approval/);
  });

  it("refuses dispatch without decision_id, evidence_pack, receipt_required, or mutual approver", () => {
    const runtime = new WorkerRuntime();
    for (const message of [
      validMessage({ decision_id: undefined }),
      validMessage({ evidence_pack: undefined }),
      validMessage({ receipt_required: false }),
      validMessage({ approver_agent: undefined })
    ]) {
      runtime.enqueue(message);
      expect(runtime.dispatchNext()).toBeNull();
    }
  });

  it("dispatches a valid message and marks the worker busy", () => {
    const runtime = new WorkerRuntime();
    runtime.enqueue(validMessage());
    const dispatched = runtime.dispatchNext();
    expect(dispatched?.task_id).toBe("task-phase1-worker-runtime");
    expect(runtime.getWorkerState("kimi_coding_worker")).toMatchObject({
      status: "busy",
      tasksCompleted: 0
    });
  });

  it("tracks heartbeat state and stale transitions", () => {
    const heartbeat = new WorkerHeartbeat({ staleThresholdMs: 10 });
    heartbeat.register("kimi_coding_worker");
    const beat = heartbeat.beat("kimi_coding_worker", { timestamp: Date.now() });
    expect(beat.status).toBe("alive");
    expect(heartbeat.getState("kimi_coding_worker")?.stale).toBe(false);
  });

  it("requires decision ID, evidence pack, receipt requirement, and non-self approval before writing receipts", () => {
    const writer = new WorkerReceipt();
    expect(() => writer.write({
      workerId: "kimi_coding_worker",
      taskId: "task-missing-decision",
      action: "code_patch",
      requesterAgent: "codex",
      approverAgent: "hermes",
      evidencePack: { verification_data: { tests_passed: true } }
    })).toThrow(/decisionId/);

    expect(() => writer.write({
      workerId: "kimi_coding_worker",
      taskId: "task-missing-evidence",
      action: "code_patch",
      requesterAgent: "codex",
      approverAgent: "hermes",
      decisionId: "decision-missing-evidence"
    })).toThrow(/evidencePack/);

    expect(() => writer.write({
      workerId: "kimi_coding_worker",
      taskId: "task-self-approval",
      action: "code_patch",
      requesterAgent: "codex",
      approverAgent: "codex",
      decisionId: "decision-self-approval",
      evidencePack: { verification_data: { tests_passed: true } }
    })).toThrow(/Self-approval/);
  });
});
