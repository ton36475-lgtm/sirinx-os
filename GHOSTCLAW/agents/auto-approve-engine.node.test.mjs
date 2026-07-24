import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { AutoApproveEngine } from "./auto-approve-engine.mjs";

function createHarness(t) {
  const root = mkdtempSync(path.join(tmpdir(), "ghostclaw-approval-node-test-"));
  const receiptDir = path.join(root, "receipts");
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, receiptDir, engine: new AutoApproveEngine({ receiptDir }) };
}

function context(overrides = {}) {
  return {
    requester_agent: "codex",
    approver_agent: "hermes",
    action_class: "read_only",
    display_score: 99,
    decision_id: "decision-node-test-001",
    evidence_pack: { source: "synthetic-local-test" },
    ...overrides
  };
}

test("safe local decision is allowed only with a persisted digest receipt", (t) => {
  const { engine, receiptDir } = createHarness(t);
  const result = engine.evaluateAutonomousApproval(context());

  assert.equal(result.status, "approved");
  assert.equal(result.final_tier, "A");
  assert.equal(result.receipt_written, true);
  assert.match(result.receipt_digest, /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual(readdirSync(receiptDir).map((name) => /^receipt_[a-f0-9]{64}\.json$/.test(name)), [true]);
});

test("default YAML policy loads and matches the embedded fail-closed fallback", (t) => {
  const { root, receiptDir, engine } = createHarness(t);
  const fallback = new AutoApproveEngine(path.join(root, "missing-policy.yaml"), {
    receiptDir: path.join(root, "fallback-receipts")
  });

  assert.equal(engine.policy.mode, "fail_closed_guarded_execution");
  assert.equal(fallback.policy.mode, "fail_closed_guarded_execution");
  assert.equal(Array.isArray(engine.policy.hard_violations_force_x), true);
  assert.equal(engine.policy.unknown_action_class_default, "X");
  assert.equal(engine.receiptDir, receiptDir);
  assert.equal(engine.getActionTierCap("commit"), "D");
});

test("push and deploy are red proposals while secret access is not approvable", (t) => {
  const { engine } = createHarness(t);

  for (const action_class of ["push", "deploy", "non_production_branch_push", "staging_deploy_with_rollback"]) {
    const result = engine.evaluateAutonomousApproval(context({
      action_class,
      decision_id: `decision-node-test-${action_class}`
    }));
    assert.equal(result.status, "auto_blocked");
    assert.equal(result.final_tier, "D");
    assert.equal(result.human_approval_required, true);
    assert.equal(result.reason, "exact_human_approval_required");
  }

  const secret = engine.evaluateAutonomousApproval(context({
    action_class: "secret_access",
    decision_id: "decision-node-test-secret"
  }));
  assert.equal(secret.status, "auto_blocked");
  assert.equal(secret.final_tier, "X");
  assert.equal(secret.human_approval_required, false);
});

test("Tier B local mutation needs an independent checker receipt", (t) => {
  const { engine } = createHarness(t);
  const missingChecker = engine.evaluateAutonomousApproval(context({
    action_class: "code_patch_allowed_path",
    decision_id: "decision-node-test-checker-missing"
  }));
  assert.equal(missingChecker.status, "checker_required");
  assert.equal(missingChecker.final_tier, "B");
  assert.equal(missingChecker.reason, "independent_checker_receipt_required");

  const checked = engine.evaluateAutonomousApproval(context({
    action_class: "code_patch_allowed_path",
    decision_id: "decision-node-test-checker-present",
    checker_passed: true,
    checker_receipt_digest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  }));
  assert.equal(checked.status, "approved");
  assert.equal(checked.final_tier, "B");
  assert.equal(checked.receipt_written, true);
});

test("unknown approvers fail closed", (t) => {
  const { engine } = createHarness(t);
  const result = engine.evaluateAutonomousApproval(context({
    approver_agent: "unregistered-agent",
    decision_id: "decision-node-test-approver"
  }));

  assert.equal(result.status, "auto_blocked");
  assert.equal(result.final_tier, "X");
  assert.equal(result.reason, "approver_not_allowlisted");
});

test("unknown secret and force-push spellings cannot become human-approvable", (t) => {
  const { engine } = createHarness(t);
  for (const action_class of [
    "secret_read",
    "credential_access",
    "force_push",
    "git_force_push",
    "unknown_action"
  ]) {
    const result = engine.evaluateAutonomousApproval(context({
      action_class,
      decision_id: `decision-node-test-unknown-${action_class}`
    }));
    assert.equal(result.status, "auto_blocked");
    assert.equal(result.final_tier, "X");
    assert.equal(result.human_approval_required, false);
  }
});

test("receipt failure or decision replay cannot return approval", (t) => {
  const { root, engine } = createHarness(t);
  const first = engine.evaluateAutonomousApproval(context({ decision_id: "decision-node-test-replay" }));
  const replay = engine.evaluateAutonomousApproval(context({ decision_id: "decision-node-test-replay" }));
  assert.equal(first.status, "approved");
  assert.equal(replay.status, "auto_blocked");
  assert.equal(replay.final_tier, "X");
  assert.equal(replay.reason, "receipt_persistence_failed");
  assert.equal(replay.receipt_written, false);

  const blocker = path.join(root, "not-a-directory");
  writeFileSync(blocker, "local-test");
  const unwritable = new AutoApproveEngine({ receiptDir: path.join(blocker, "receipts") });
  const failed = unwritable.evaluateAutonomousApproval(context({ decision_id: "decision-node-test-write-fail" }));
  assert.equal(failed.status, "auto_blocked");
  assert.equal(failed.final_tier, "X");
  assert.equal(failed.reason, "receipt_persistence_failed");
  assert.equal(failed.receipt_written, false);
});
