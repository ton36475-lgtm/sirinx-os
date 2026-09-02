import assert from "node:assert/strict";
import test from "node:test";

import {
  createTokenRouterCanaryPreview,
  loadTokenRouterProviderPack,
  validateTokenRouterProviderPack
} from "./tokenrouter-provider-pack.mjs";

test("provider pack validates without embedded credentials", () => {
  const config = loadTokenRouterProviderPack();
  const result = validateTokenRouterProviderPack(config);
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.match(result.configSha256, /^[a-f0-9]{64}$/);
});

test("TokenRouter owns its broker retry lane and cannot be nested", () => {
  const config = loadTokenRouterProviderPack();
  const lane = config.gateway.routingLane;
  assert.equal(lane.retryOwner, "TOKENROUTER");
  assert.equal(lane.outerRetries, 0);
  assert.equal(lane.nestedBehindLiteLLM, false);
  assert.equal(lane.nestedBehindOmniRoute, false);
  assert.equal(lane.nestedBehindOpenRouter, false);
});

test("canonical model IDs and free/paid classification are locked", () => {
  const config = loadTokenRouterProviderPack();
  const models = new Map(config.models.map((item) => [item.canonicalId, item]));
  assert.equal(models.get("z-ai/glm-5.3-free").billingClass, "FREE_CATALOG_SNAPSHOT");
  assert.equal(models.get("qwen/qwen3.8-max-free").billingClass, "FREE_CATALOG_SNAPSHOT");
  assert.equal(models.get("z-ai/glm-5.3-flash").billingClass, "PAID_CATALOG_SNAPSHOT");
  assert.equal(models.get("qwen/qwen3.8-flash").billingClass, "PAID_CATALOG_SNAPSHOT");
});

test("B.AI claim remains unroutable without official evidence", () => {
  const config = loadTokenRouterProviderPack();
  const record = config.externalClaims.find((item) => item.id === "b-ai-qwen38-free");
  assert.equal(record.state, "UNVERIFIED_SECONDARY_ONLY");
  assert.equal(record.routeAllowed, false);
  assert.equal(record.endpoint, null);
});

test("OpenClaude remains a reference-only legal provenance hold", () => {
  const config = loadTokenRouterProviderPack();
  const client = config.clientCandidates.find((item) => item.id === "openclaude");
  assert.equal(client.sourceState, "QUARANTINED_LEGAL_PROVENANCE_REVIEW");
  assert.equal(client.installationAllowed, false);
  assert.equal(client.routingAuthority, false);
  assert.equal(client.backgroundSessionsAllowed, false);
  assert.equal(client.headlessGrpcAllowed, false);
  assert.equal(client.directProviderCredentialsAllowed, false);
});

test("canary preview blocks the exposed-key state and does not call the network", () => {
  const result = createTokenRouterCanaryPreview({
    model: "z-ai/glm-5.3-free",
    dataClass: "public",
    approvalId: "APR-EXAMPLE",
    promptSha256: `sha256:${"a".repeat(64)}`
  });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.canExecute, false);
  assert.equal(result.networkCallExecuted, false);
  assert.equal(result.credentialRead, false);
  assert.ok(result.reasons.includes("CREDENTIAL_ROTATION_NOT_VERIFIED"));
});

test("non-public TokenRouter canary input is denied", () => {
  const result = createTokenRouterCanaryPreview({
    model: "z-ai/glm-5.3-free",
    dataClass: "internal",
    approvalId: "APR-EXAMPLE",
    promptSha256: `sha256:${"b".repeat(64)}`
  });
  assert.ok(result.reasons.includes("PUBLIC_DATA_ONLY"));
});

test("live execution is intentionally absent from the provider pack", () => {
  const result = createTokenRouterCanaryPreview({
    model: "z-ai/glm-5.3-free",
    dataClass: "public",
    approvalId: "APR-EXAMPLE",
    promptSha256: `sha256:${"c".repeat(64)}`,
    live: true
  });
  assert.equal(result.canExecute, false);
  assert.ok(result.reasons.includes("LIVE_EXECUTION_NOT_IMPLEMENTED"));
});
