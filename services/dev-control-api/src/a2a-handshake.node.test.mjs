import assert from "node:assert/strict";
import test from "node:test";
import { createA2aHandshakeDryRun } from "./a2a-handshake.mjs";

test("creates a normalized local dry-run handshake", () => {
  const result = createA2aHandshakeDryRun({
    agent_reference: "agent:codex",
    agent_id: "Codex worker",
    capabilities: "coding,rust-build,coding",
    dry_run_only: true
  }, { now: new Date("2026-07-20T00:00:00.000Z") });

  assert.equal(result.status, "a2a-handshake-dry-run-ready");
  assert.deepEqual(result.capabilities, ["coding", "rust-build"]);
  assert.equal(result.dryRunOnly, true);
  assert.equal(result.authenticatedSessionCreated, false);
  assert.equal(result.providerCalled, false);
  assert.equal(result.queueMutated, false);
});

test("rejects malformed identity, capabilities, and non-dry-run requests", () => {
  assert.throws(() => createA2aHandshakeDryRun({
    agent_reference: "codex; rm",
    agent_id: "x",
    capabilities: "coding,not allowed",
    dry_run_only: false
  }), (error) => {
    assert.equal(error.code, "invalid_a2a_handshake");
    assert.deepEqual(error.issues, [
      "invalid_agent_reference",
      "invalid_agent_id",
      "invalid_capability",
      "dry_run_only_required"
    ]);
    return true;
  });
});
