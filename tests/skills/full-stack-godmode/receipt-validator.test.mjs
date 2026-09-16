import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { validateReceipt } from "../../../skills/evidence-verifier/scripts/validate_receipt.mjs";
import { REPO_ROOT } from "./test-helpers.mjs";

function fixture(name) {
  return JSON.parse(fs.readFileSync(
    `${REPO_ROOT}/tests/skills/full-stack-godmode/fixtures/${name}`,
    "utf8",
  ));
}

test("accepts a verified local receipt with no external actions", () => {
  assert.deepEqual(validateReceipt(fixture("valid-safe-receipt.json")), {
    valid: true,
    errors: [],
  });
});

test("rejects deployment executed under a broad token without an exact gate", () => {
  const result = validateReceipt(fixture("invalid-broad-deploy-receipt.json"));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /executed without a matching gate/.test(error)));
});

test("rejects secret reads even when a gate id is claimed", () => {
  const result = validateReceipt(fixture("invalid-secret-read-receipt.json"));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /secret reads cannot be gated/.test(error)));
});

test("accepts an exact, matching, unexpired task-specific external-action gate", () => {
  const result = validateReceipt(fixture("valid-scoped-deploy-receipt.json"));
  assert.deepEqual(result, { valid: true, errors: [] });
});

test("rejects a gate when the target no longer matches the executed action", () => {
  const receipt = fixture("valid-scoped-deploy-receipt.json");
  receipt.external_actions.deploy.target = "all";
  const result = validateReceipt(receipt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /target must exactly match gate/.test(error)));
});

test("rejects a matching but still broad target-all deployment gate", () => {
  const receipt = fixture("valid-scoped-deploy-receipt.json");
  receipt.gates[0].target = "all";
  receipt.gates[0].scope = "target=all";
  receipt.gates[0].exact_operation = "deploy";
  receipt.external_actions.deploy.target = "all";
  receipt.external_actions.deploy.scope = "target=all";
  receipt.external_actions.deploy.exact_operation = "deploy";
  const result = validateReceipt(receipt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /broad or generic/.test(error)));
});

test("rejects non-UTC timestamps and approvals created after observation", () => {
  const receipt = fixture("valid-scoped-deploy-receipt.json");
  receipt.gates[0].approved_at = "2026-07-14 10:00:00";
  let result = validateReceipt(receipt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /approved_at must be an ISO timestamp/.test(error)));

  receipt.gates[0].approved_at = "2026-07-14T11:30:00Z";
  receipt.observed_at = "2026-07-14T11:00:00Z";
  result = validateReceipt(receipt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /approved after the receipt was observed/.test(error)));
});

test("rejects duplicate gate identifiers", () => {
  const receipt = fixture("valid-scoped-deploy-receipt.json");
  receipt.gates.push(structuredClone(receipt.gates[0]));
  const result = validateReceipt(receipt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /duplicate gate_id/.test(error)));
});
