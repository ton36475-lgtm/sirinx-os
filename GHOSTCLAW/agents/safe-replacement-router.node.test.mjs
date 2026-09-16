import assert from "node:assert/strict";
import test from "node:test";

import { routeBlockedAction } from "./safe-replacement-router.mjs";

test("only an approved decision may continue the original action", () => {
  const approved = routeBlockedAction({
    status: "approved",
    final_tier: "A",
    receipt_written: true
  }, {
    action_class: "read_only"
  });
  assert.equal(approved.blocked, false);
  assert.equal(approved.continue_pipeline, true);

  for (const decision of [
    { status: "approved", final_tier: "A", receipt_written: false },
    { status: "approved", final_tier: "D", receipt_written: true }
  ]) {
    const held = routeBlockedAction(decision, { action_class: "read_only" });
    assert.equal(held.blocked, true);
    assert.equal(held.continue_pipeline, false);
    assert.equal(held.hold_reason, "approval_missing_safe_tier_or_receipt");
  }

  for (const status of ["checker_required", "quorum_required", "receipt_failed", undefined]) {
    const held = routeBlockedAction({ status, final_tier: "X" }, {
      action_class: "code_patch_allowed_path"
    });
    assert.equal(held.blocked, true);
    assert.equal(held.replacement_required, false);
    assert.equal(held.continue_pipeline, false);
  }
});

test("hard-denied work may continue only through a named safe replacement", () => {
  const result = routeBlockedAction({ status: "hard_blocked", final_tier: "X" }, {
    action_class: "secret_access"
  });
  assert.equal(result.blocked, true);
  assert.equal(result.replacement_required, true);
  assert.equal(result.continue_pipeline, true);
  assert.equal(result.replacement_actions.includes("secret_reference_presence_check"), true);
});
