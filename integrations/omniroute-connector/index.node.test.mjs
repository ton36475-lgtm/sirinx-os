import assert from "node:assert/strict";
import test from "node:test";
import { getOmniRouteIntegrationConfig, getOmniRouteStatus } from "./index.mjs";

test("connector uses the canonical loopback OmniRoute endpoint", () => {
  const config = getOmniRouteIntegrationConfig();
  assert.equal(config.endpoint, "http://127.0.0.1:20128");
  assert.equal(config.safetyGates.localProxyOnly, true);
  assert.equal(config.safetyGates.humanApprovalForPaidTier, true);
});

test("status remains non-executing even when metadata is inspected", () => {
  const status = getOmniRouteStatus({ candidates: [] });
  assert.equal(status.installation.installed, false);
  assert.equal(status.gates.externalCallGate, true);
  assert.equal(status.runCommand, null);
});
