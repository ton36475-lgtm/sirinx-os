import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseMultiStepCommand } from "./vibe-task-parser.mjs";
import {
  createExecutionPlan,
  executePlan,
  runVibePipeline,
  validateExecutablePlan,
} from "./vibe-agent-router.mjs";

describe("GHOSTCLAW Phase 5 Vibe Coding Agent contract", () => {
  it("parses natural language into a multi-step task graph", () => {
    const graph = parseMultiStepCommand("write docs then run test", {
      requester: "vibe-agent",
      brainstormId: "brainstorm-phase5-test",
    });

    expect(graph.status).toBe("pending_approval");
    expect(graph.brainstorm_id).toBe("brainstorm-phase5-test");
    expect(graph.tasks).toHaveLength(2);
    expect(graph.tasks.map((task) => task.task_type)).toEqual(["docs_update", "test_run"]);
    expect(graph.tasks[1].dependencies).toEqual([graph.tasks[0].task_id]);
  });

  it("creates a mutual approval decision and required evidence pack before execution", () => {
    const graph = parseMultiStepCommand("write docs then run test", {
      requester: "vibe-agent",
    });
    const plan = createExecutionPlan(graph, {
      requester: "vibe-agent",
      approver: "hermes-commander",
      planId: "plan-phase5-approval-test",
    });

    expect(plan.status).toBe("approved");
    expect(plan.approval_status).toBe("approved");
    expect(plan.human_approval_required).toBe(false);
    expect(plan.receipt_required).toBe(true);
    expect(plan.decision_id).toBe("decision-plan-phase5-approval-test");
    expect(plan.mutual_approval).toMatchObject({
      requested: true,
      status: "approved",
      requester_agent: "vibe-agent",
      approver_agent: "hermes-commander",
      self_approval_allowed: false,
      receipt_required: true,
    });
    expect(plan.evidence_pack).toMatchObject({
      required: true,
      receipt_required: true,
      requester_agent: "vibe-agent",
      approver_agent: "hermes-commander",
      decision_id: "decision-plan-phase5-approval-test",
    });
    expect(plan.evidence_pack.artifacts.map((artifact) => artifact.type)).toEqual(
      expect.arrayContaining(["execution_plan", "decision_artifact", "receipt"]),
    );
    expect(validateExecutablePlan(plan)).toMatchObject({ valid: true });
  });

  it("rejects self-approval before any task can execute", () => {
    const graph = parseMultiStepCommand("write docs", {
      requester: "vibe-agent",
    });
    const plan = createExecutionPlan(graph, {
      requester: "vibe-agent",
      approver: "vibe-agent",
      planId: "plan-phase5-self-approval-test",
    });

    expect(plan.status).toBe("rejected");
    expect(plan.approval_status).toBe("rejected");
    expect(validateExecutablePlan(plan)).toMatchObject({
      valid: false,
      reason: expect.stringMatching(/Self-approval/),
    });
  });

  it("archives blocked commands as receipts without executing the blocked action", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "ghostclaw-vibe-"));
    const receiptsDir = join(tempRoot, "receipts");
    const archiveDir = join(tempRoot, "archive");

    const graph = parseMultiStepCommand("push to production", {
      requester: "vibe-agent",
    });
    const plan = createExecutionPlan(graph, {
      requester: "vibe-agent",
      approver: "hermes-commander",
      planId: "plan-phase5-blocked-test",
      receiptsDir,
      archiveDir,
    });

    expect(plan.status).toBe("all_blocked");
    expect(plan.tasks[0]).toMatchObject({
      validation: false,
      status: "blocked",
      autonomy_level: "X",
    });

    const receipt = await executePlan(plan);
    expect(receipt.status).toBeUndefined();
    expect(receipt.summary).toMatchObject({ total: 1, blocked: 1, completed: 0 });
    expect(receipt.decision_id).toBe("decision-plan-phase5-blocked-test");
    expect(receipt.receipt_required).toBe(true);
    expect(receipt.results[0].receipt).toMatchObject({
      status: "blocked",
      decision_id: "decision-plan-phase5-blocked-test",
      requester_agent: "vibe-agent",
      approver_agent: "hermes-commander",
      receipt_required: true,
    });

    const archivedPlan = JSON.parse(await readFile(join(archiveDir, plan.plan_id, "plan.json"), "utf8"));
    const archivedReceipt = JSON.parse(await readFile(join(archiveDir, plan.plan_id, "receipt.json"), "utf8"));
    expect(archivedPlan.plan_id).toBe(plan.plan_id);
    expect(archivedReceipt.summary.blocked).toBe(1);
  });

  it("keeps dry-run pipeline local and non-executing", async () => {
    const result = await runVibePipeline("write docs", {
      requester: "vibe-agent",
      approver: "hermes-commander",
      dryRun: true,
    });

    expect(result.status).toBe("dry_run_complete");
    expect(result.plan.status).toBe("approved");
    expect(result.plan.approval_status).toBe("approved");
    expect(result.message).toMatch(/no tasks executed/i);
  });
});
