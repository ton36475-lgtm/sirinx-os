import assert from "node:assert/strict";
import test from "node:test";

import { HASH_PATHS } from "./ghostclaw-cloudflare-r3-readiness.mjs";

test("R3 receipt hashes the deterministic Worker build wrapper", () => {
  assert.ok(HASH_PATHS.includes("services/orchestrator/scripts/build-worker.mjs"));
});

test("R3 receipt hashes the readiness policy and canonical deployment target config", () => {
  assert.ok(HASH_PATHS.includes("services/dev-control-api/server.mjs"));
  assert.ok(HASH_PATHS.includes("services/dev-control-api/test-cloudflare-approval.mjs"));
  assert.ok(HASH_PATHS.includes("services/dev-control-api/src/cloudflare-deployment-readiness.mjs"));
  assert.ok(HASH_PATHS.includes("services/dev-control-api/src/cloudflare-deploy-approval.mjs"));
  assert.ok(HASH_PATHS.includes("configs/cloudflare_deployment_targets.config.json"));
  assert.ok(HASH_PATHS.includes("scripts/ghostclaw-cloudflare-r3-readiness.mjs"));
  assert.ok(HASH_PATHS.includes("scripts/ghostclaw-cloudflare-r4-prerequisites-packet.mjs"));
  assert.ok(HASH_PATHS.includes("scripts/ghostclaw-cloudflare-r4-approval-grant.mjs"));
  assert.ok(HASH_PATHS.includes("scripts/ghostclaw-cloudflare-r4-approval-grant.test.mjs"));
  assert.ok(HASH_PATHS.includes("scripts/ghostclaw-cloudflare-r4-safe-store.py"));
});
