import assert from "node:assert/strict";
import test from "node:test";

import {
  createPcNodeRoutePreview,
  getPcNodeModelFabricStatus,
  loadPcNodeModelFabric,
  validatePcNodeModelFabric
} from "./pc-node-model-fabric.mjs";

function clone(value) {
  return structuredClone(value);
}

const config = loadPcNodeModelFabric();

test("canonical PC Node model-fabric config validates", () => {
  const result = validatePcNodeModelFabric(config);
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.match(result.configSha256, /^[a-f0-9]{64}$/);
});

test("status never manufactures runtime or provider evidence", () => {
  const status = getPcNodeModelFabricStatus(config);
  assert.equal(status.status, "CONFIG_VERIFIED_RUNTIME_DISABLED");
  assert.equal(status.runtimeObserved, false);
  assert.equal(status.providerCallsExecuted, false);
  assert.equal(status.secretsRead, false);
});

test("nested retry ownership fails closed", () => {
  const candidate = clone(config);
  candidate.lanes.find((lane) => lane.id === "cloud-governed").downstreamRoutersAllowFallbacks = true;
  const result = validatePcNodeModelFabric(candidate);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("lane:cloud-governed:nested-router-fallback-forbidden"));
});

test("OpenRouter must remain its own emergency broker lane", () => {
  const candidate = clone(config);
  candidate.lanes.find((lane) => lane.id === "emergency-broker").nestedBehindAnotherRouter = true;
  const result = validatePcNodeModelFabric(candidate);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("lane:emergency-broker:openrouter-must-own-its-broker-lane"));
});

test("raw provider model IDs are rejected at the client boundary", () => {
  const preview = createPcNodeRoutePreview({ alias: "provider/raw-model", dataClass: "public" }, config);
  assert.equal(preview.status, "BLOCKED_RAW_MODEL_ID");
  assert.equal(preview.canExecute, false);
});

test("free and experimental aliases reject sensitive data", () => {
  for (const alias of ["sirinx-free-general", "sirinx-emergency-free", "sirinx-aipass-public"]) {
    const preview = createPcNodeRoutePreview({ alias, dataClass: "sensitive" }, config);
    assert.equal(preview.status, "BLOCKED_DATA_CLASS");
    assert.equal(preview.canExecute, false);
  }
});

test("AIPass remains disabled, manual, public-only and retryless", () => {
  const adapter = config.experimentalAdapters.find((item) => item.id === "aipass-experimental");
  assert.equal(adapter.enabled, false);
  assert.equal(adapter.automaticBrowserAuthentication, false);
  assert.equal(adapter.automaticFallback, false);
  assert.equal(adapter.maxRetries, 0);
  assert.deepEqual(adapter.allowedDataClasses, ["public"]);

  const preview = createPcNodeRoutePreview(
    { alias: "sirinx-aipass-public", dataClass: "public", interactiveSessionVerified: false },
    config
  );
  assert.equal(preview.status, "BLOCKED_PREVIEW");
  assert.ok(preview.blockedReasons.includes("AIPASS_EXPERIMENTAL_ADAPTER_DISABLED"));
  assert.ok(preview.blockedReasons.includes("AIPASS_INTERACTIVE_SESSION_NOT_VERIFIED"));
});

test("Serena tunnel pilot denies mutation and shell tools", () => {
  const serena = config.mcp.serena;
  assert.equal(serena.mode, "read-only-pilot");
  for (const tool of ["execute_shell_command", "write", "memory_write", "delete", "git_push"]) {
    assert.ok(serena.toolDenylist.includes(tool));
  }
});

test("clients are presentation and agent surfaces, never router authorities", () => {
  for (const client of config.clients) assert.equal(client.routingAuthority, false);
  assert.equal(config.clients.find((client) => client.id === "deepseek-harness-web").defaultModelAlias, "sirinx-code");
  assert.equal(config.clients.find((client) => client.id === "jcode").defaultModelAlias, "sirinx-code");
});

test("valid route produces evidence-only preview and no network call", () => {
  const preview = createPcNodeRoutePreview(
    { alias: "sirinx-code", dataClass: "internal", taskType: "refactor" },
    config
  );
  assert.equal(preview.status, "READY_FOR_ACTION_BOUND_CANARY_APPROVAL");
  assert.equal(preview.canExecute, false);
  assert.equal(preview.networkCallExecuted, false);
  assert.equal(preview.providerCalled, false);
  assert.equal(preview.retryOwner, "LITELLM");
  assert.match(preview.previewSha256, /^[a-f0-9]{64}$/);
});

test("live flag remains blocked until a separate approved executor exists", () => {
  const preview = createPcNodeRoutePreview(
    { alias: "sirinx-local-private", dataClass: "sensitive", live: true },
    config
  );
  assert.equal(preview.status, "BLOCKED_PREVIEW");
  assert.ok(preview.blockedReasons.includes("LIVE_EXECUTION_NOT_AVAILABLE_IN_PREVIEW"));
  assert.equal(preview.canExecute, false);
});
