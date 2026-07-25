import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { AutoApproveEngine, createEngine } from "./auto-approve-engine.mjs";

describe("GhostClaw Autonomous Mutual Approval Runtime v2 Matrix", () => {
  const receiptDir = mkdtempSync(path.join(tmpdir(), "ghostclaw-approval-test-"));
  const engine = new AutoApproveEngine({ receiptDir });
  afterAll(() => rmSync(receiptDir, { recursive: true, force: true }));

  it("should evaluate tier thresholds correctly based on scores", () => {
    expect(engine.scoreToTier(95)).toBe("A");
    expect(engine.scoreToTier(80)).toBe("B");
    expect(engine.scoreToTier(65)).toBe("C");
    expect(engine.scoreToTier(59.99)).toBe("D");
  });

  it("should cap effective scores at 100 while maintaining display_score flexibility", () => {
    const ctx = {
      requester_agent: "codex",
      approver_agent: "hermes",
      action_class: "read_only",
      display_score: 150,
      decision_id: "test-dec-001",
      evidence_pack: { file: "test.mjs" }
    };
    const res = engine.evaluateAutonomousApproval(ctx);
    expect(res.effective_score).toBe(100);
    expect(res.display_score).toBe(150);
    expect(res.confidence_label).toBe("A+");
    expect(res.status).toBe("approved");
    expect(res.human_approval_required).toBe(false);
  });

  it("should correctly resolve mappings for action tier caps", () => {
    expect(engine.getActionTierCap("read_only")).toBe("A");
    expect(engine.getActionTierCap("local_commit_allowed_scope")).toBe("D");
    expect(engine.getActionTierCap("lockfile_bound_dependency_repair")).toBe("C");
    expect(engine.getActionTierCap("dependency_install")).toBe("D");
    expect(engine.getActionTierCap("model_download")).toBe("X");
    expect(engine.getActionTierCap("gpu_inference")).toBe("X");
    expect(engine.getActionTierCap("push")).toBe("D");
    expect(engine.getActionTierCap("commit")).toBe("D");
    expect(engine.getActionTierCap("unknown_hacker_action")).toBe("X");
  });

  it("should auto-approve Tier B local validation work", () => {
    const ctx = {
      requester_agent: "codex",
      approver_agent: "hermes",
      action_class: "no_install_validation",
      display_score: 88,
      decision_id: "test-dec-tier-b-auto-approve",
      evidence_pack: { command: "pnpm vitest run focused-suite" },
      checker_passed: true,
      checker_receipt_digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    };
    const res = engine.evaluateAutonomousApproval(ctx);
    expect(res.status).toBe("approved");
    expect(res.final_tier).toBe("B");
    expect(res.human_approval_required).toBe(false);
  });

  it("should not approve Tier B without an independent checker receipt", () => {
    const res = engine.evaluateAutonomousApproval({
      requester_agent: "codex",
      approver_agent: "hermes",
      action_class: "code_patch_allowed_path",
      display_score: 95,
      decision_id: "test-dec-tier-b-checker-required",
      evidence_pack: { source: "synthetic-test" }
    });
    expect(res.status).toBe("checker_required");
    expect(res.final_tier).toBe("B");
    expect(res.reason).toBe("independent_checker_receipt_required");
    expect(res.human_approval_required).toBe(false);
  });

  it("should require agent quorum for Tier C actions", () => {
    const ctx = {
      requester_agent: "codex",
      approver_agent: "hermes",
      action_class: "lockfile_bound_dependency_repair",
      display_score: 95,
      decision_id: "test-dec-tier-c-quorum",
      evidence_pack: { rollback_plan: "restore lockfile from git" }
    };
    const res = engine.evaluateAutonomousApproval(ctx);
    expect(res.status).toBe("quorum_required");
    expect(res.final_tier).toBe("C");
    expect(res.reason).toBe("agent_quorum_required");
    expect(res.human_approval_required).toBe(false);
  });

  it("should hard-block unknown action classes as Tier X", () => {
    const ctx = {
      requester_agent: "codex",
      approver_agent: "hermes",
      action_class: "unknown_hacker_action",
      display_score: 95,
      decision_id: "test-dec-unknown-action",
      evidence_pack: { note: "unknown actions must fail closed" }
    };
    const res = engine.evaluateAutonomousApproval(ctx);
    expect(res.status).toBe("auto_blocked");
    expect(res.final_tier).toBe("X");
    expect(res.reason).toBe("policy_tier_auto_blocked");
    expect(res.human_approval_required).toBe(false);
  });

  it("should strictly enforce mutual approval rules and disallow self-approval", () => {
    const ctx = {
      requester_agent: "codex",
      approver_agent: "codex",
      action_class: "read_only",
      display_score: 95,
      decision_id: "test-dec-002",
      evidence_pack: {}
    };
    const res = engine.evaluateAutonomousApproval(ctx);
    expect(res.status).toBe("auto_blocked");
    expect(res.final_tier).toBe("X");
    expect(res.human_approval_required).toBe(false);
    expect(res.reason).toMatch(/self_approval/);
  });

  it("should auto-block missing critical metadata targets", () => {
    const ctx = {
      requester_agent: "hermes",
      approver_agent: "codex",
      action_class: "read_only",
      display_score: 95
    };
    const res = engine.evaluateAutonomousApproval(ctx);
    expect(res.status).toBe("auto_blocked");
    expect(res.human_approval_required).toBe(false);
    expect(res.reason).toBe("missing_required_metadata_fields");
  });

  it("should auto-block a missing evidence pack even when decision id exists", () => {
    const ctx = {
      requester_agent: "hermes",
      approver_agent: "codex",
      action_class: "read_only",
      display_score: 95,
      decision_id: "test-dec-missing-evidence"
    };
    const res = engine.evaluateAutonomousApproval(ctx);
    expect(res.status).toBe("auto_blocked");
    expect(res.final_tier).toBe("X");
    expect(res.reason).toBe("missing_required_metadata_fields");
  });

  it("should auto-block a missing decision id even when evidence exists", () => {
    const ctx = {
      requester_agent: "hermes",
      approver_agent: "codex",
      action_class: "read_only",
      display_score: 95,
      evidence_pack: { file: "receipt.json" }
    };
    const res = engine.evaluateAutonomousApproval(ctx);
    expect(res.status).toBe("auto_blocked");
    expect(res.final_tier).toBe("X");
    expect(res.reason).toBe("missing_required_metadata_fields");
  });

  it("should hold normal push as Tier D pending exact human approval", () => {
    const ctx = {
      requester_agent: "hermes",
      approver_agent: "codex",
      action_class: "push",
      display_score: 99,
      decision_id: "test-dec-003",
      evidence_pack: {}
    };
    const res = engine.evaluateAutonomousApproval(ctx);
    expect(res.status).toBe("auto_blocked");
    expect(res.human_approval_required).toBe(true);
    expect(res.final_tier).toBe("D");
    expect(res.reason).toBe("exact_human_approval_required");
  });

  it("should hold push and deploy at Tier D while hard-denying Tier X actions", () => {
    for (const action_class of ["push", "deploy"]) {
      const res = engine.evaluateAutonomousApproval({
        requester_agent: "codex",
        approver_agent: "hermes",
        action_class,
        display_score: 99,
        decision_id: `test-dec-x-${action_class}`,
        evidence_pack: { action_class }
      });
      expect(res.status).toBe("auto_blocked");
      expect(res.final_tier).toBe("D");
      expect(res.human_approval_required).toBe(true);
    }
    for (const action_class of ["secret_access", "model_download", "gpu_inference"]) {
      const res = engine.evaluateAutonomousApproval({
        requester_agent: "codex",
        approver_agent: "hermes",
        action_class,
        display_score: 99,
        decision_id: `test-dec-x-${action_class}`,
        evidence_pack: { action_class }
      });
      expect(res.status).toBe("auto_blocked");
      expect(res.final_tier).toBe("X");
      expect(res.human_approval_required).toBe(false);
    }
  });

  it("should hold dependency install for an exact human approval", () => {
    const ctx = {
      requester_agent: "codex",
      approver_agent: "hermes",
      action_class: "dependency_install",
      display_score: 99,
      decision_id: "test-dec-004",
      evidence_pack: {}
    };
    const res = engine.evaluateAutonomousApproval(ctx);
    expect(res.status).toBe("auto_blocked");
    expect(res.final_tier).toBe("D");
    expect(res.human_approval_required).toBe(true);
  });

  it("should auto-block hard violations immediately", () => {
    const ctx = {
      requester_agent: "codex",
      approver_agent: "hermes",
      action_class: "read_only",
      display_score: 99,
      decision_id: "test-dec-005",
      evidence_pack: {},
      violations: ["secret_access_requested"]
    };
    const res = engine.evaluateAutonomousApproval(ctx);
    expect(res.status).toBe("auto_blocked");
    expect(res.final_tier).toBe("X");
    expect(res.human_approval_required).toBe(false);
  });

  it("should hold local commit even when validation and file-scope guards pass", () => {
    const ctx = {
      requester_agent: "codex",
      approver_agent: "hermes",
      action_class: "local_commit_allowed_scope",
      display_score: 95,
      decision_id: "test-dec-local-commit-pass",
      evidence_pack: { receipt: "receipt.json" },
      validation_passed: true,
      allowed_files_only: true,
      blocked_actions: []
    };
    const res = engine.evaluateAutonomousApproval(ctx);
    expect(res.status).toBe("auto_blocked");
    expect(res.final_tier).toBe("D");
    expect(res.human_approval_required).toBe(true);
  });

  it("should reject local commit when validation has not passed", () => {
    const ctx = {
      requester_agent: "codex",
      approver_agent: "hermes",
      action_class: "local_commit_allowed_scope",
      display_score: 95,
      decision_id: "test-dec-local-commit-validation-fail",
      evidence_pack: { receipt: "receipt.json" },
      validation_passed: false,
      allowed_files_only: true,
      blocked_actions: []
    };
    const res = engine.evaluateAutonomousApproval(ctx);
    expect(res.status).toBe("auto_blocked");
    expect(res.final_tier).toBe("X");
    expect(res.reason).toBe("local_commit_guard_failed");
  });

  it("should reject local commit when staged file scope is not allowed", () => {
    const ctx = {
      requester_agent: "codex",
      approver_agent: "hermes",
      action_class: "local_commit_allowed_scope",
      display_score: 95,
      decision_id: "test-dec-local-commit-scope-fail",
      evidence_pack: { receipt: "receipt.json" },
      validation_passed: true,
      allowed_files_only: false,
      blocked_actions: []
    };
    const res = engine.evaluateAutonomousApproval(ctx);
    expect(res.status).toBe("auto_blocked");
    expect(res.final_tier).toBe("X");
    expect(res.reason).toBe("local_commit_guard_failed");
  });

  it("should reject local commit when blocked actions are present", () => {
    const ctx = {
      requester_agent: "codex",
      approver_agent: "hermes",
      action_class: "local_commit_allowed_scope",
      display_score: 95,
      decision_id: "test-dec-local-commit-blocked-action",
      evidence_pack: { receipt: "receipt.json" },
      validation_passed: true,
      allowed_files_only: true,
      blocked_actions: ["deploy"]
    };
    const res = engine.evaluateAutonomousApproval(ctx);
    expect(res.status).toBe("auto_blocked");
    expect(res.final_tier).toBe("X");
    expect(res.reason).toBe("local_commit_guard_failed");
  });

  it("should normalize legacy aliases to canonical action classes", () => {
    expect(engine.getCanonicalActionClass("write_lane")).toBe("runtime_artifact_write");
    expect(engine.getCanonicalActionClass("git_push")).toBe("push");
    expect(engine.getCanonicalActionClass("read_env")).toBe("secret_access");
  });

  it("createEngine helper returns a configured engine", () => {
    const e = createEngine();
    expect(e).toBeInstanceOf(AutoApproveEngine);
    expect(e.getActionTierCap("read_only")).toBe("A");
  });
});
