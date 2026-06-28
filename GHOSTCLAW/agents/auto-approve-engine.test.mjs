import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTION_TIER_CAP,
  HARD_VIOLATIONS,
  assignSafeTier,
  computeFinalConfidence,
  evaluateAutoApproval
} from "./auto-approve-engine.mjs";

test("computeFinalConfidence caps effective score at 100 and preserves display score", () => {
  const result = computeFinalConfidence(82, 30, [10, 15.9]);

  assert.equal(result.base_brainstorm, 82);
  assert.equal(result.latent_bonus, 30);
  assert.equal(result.modifier_total, 25.9);
  assert.ok(Math.abs(result.raw_score - 137.9) < Number.EPSILON * 100);
  assert.equal(result.capped_score, 100);
  assert.ok(Math.abs(result.display_score - 137.9) < Number.EPSILON * 100);
});

test("assignSafeTier caps a high score to the action class maximum", () => {
  const result = assignSafeTier(100, "write_lane", []);

  assert.equal(ACTION_TIER_CAP.write_lane, "B");
  assert.equal(result.base_tier, "A");
  assert.equal(result.final_tier, "B");
  assert.match(result.reason, /action_tier_cap/);
});

test("hard violations force tier X regardless of confidence", () => {
  const result = assignSafeTier(100, "read", ["secret_access_requested"]);

  assert.ok(HARD_VIOLATIONS.has("secret_access_requested"));
  assert.equal(result.base_tier, "A");
  assert.equal(result.final_tier, "X");
  assert.match(result.reason, /hard_violation/);
});

test("external or blocked action classes cannot be auto-approved", () => {
  const result = evaluateAutoApproval({
    base_brainstorm: 96,
    latent_bonus: 8,
    standard_modifiers: [4],
    action_class: "customer_message_send",
    violations: []
  });

  assert.equal(result.raw_score, 108);
  assert.equal(result.capped_score, 100);
  assert.equal(result.base_tier, "A");
  assert.equal(result.final_tier, "X");
  assert.match(result.reason, /customer_message_send/);
});

test("structured evaluation returns score, tier, and reason fields", () => {
  const result = evaluateAutoApproval({
    base_brainstorm: 72,
    latent_bonus: 4,
    standard_modifiers: { retrieval: 3, safety: -2 },
    action_class: "validate",
    violations: []
  });

  assert.deepEqual(Object.keys(result).sort(), [
    "action_class",
    "base_tier",
    "capped_score",
    "display_score",
    "final_tier",
    "latent_bonus",
    "modifier_total",
    "raw_score",
    "reason"
  ]);
  assert.equal(result.raw_score, 77);
  assert.equal(result.capped_score, 77);
  assert.equal(result.base_tier, "C");
  assert.equal(result.final_tier, "C");
});
