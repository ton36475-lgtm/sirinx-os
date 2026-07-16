import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { handleRequest } from "./server.mjs";

import {
  createCloudflareDeployDryRun,
  getCloudflareDeployStatus,
  simulateCloudflareDeploy
} from "./src/cloudflare-deploy-approval.mjs";

const serviceRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(serviceRoot, "../..");
const fixedNow = () => new Date("2026-07-15T09:30:00.000Z");

test("reports evidence-based R3 status without claiming preview readiness", async () => {
  const status = await getCloudflareDeployStatus({ repoRoot, now: fixedNow });
  assert.equal(status.schema, "ghostclaw.cloudflare.deploy_status.v2");
  assert.equal(status.gate, "R3");
  assert.equal(status.previewDeployReady, false);
  assert.ok(status.blockerCount > 0);
  assert.equal(status.deployAuthorized, false);
  assert.equal(status.deployExecuted, false);
  assert.equal(status.noExternalSideEffects, true);
});

test("keeps dry-run output non-executing while the R4 packet is blocked", async () => {
  const dryRun = await createCloudflareDeployDryRun("LOCAL_TEST", {
    repoRoot,
    now: fixedNow
  });
  assert.equal(dryRun.status, "blocked-preview-packet");
  assert.equal(dryRun.requestedGate, "LOCAL_TEST");
  assert.equal(dryRun.gateAccepted, false);
  assert.equal(dryRun.execute, false);
  assert.equal(dryRun.deploy, false);
  assert.equal(dryRun.externalRequests, false);
});

test("simulation never upgrades local inventory into deployment proof", async () => {
  const simulation = await simulateCloudflareDeploy({ repoRoot, now: fixedNow });
  assert.equal(simulation.status, "local-simulation-only");
  assert.equal(simulation.deployAuthorized, false);
  assert.equal(simulation.deployExecuted, false);
  assert.equal(simulation.externalWrites, false);
  assert.equal(simulation.noExternalSideEffects, true);
});

test("Cloudflare status resolves readiness from the canonical project root", async () => {
  const previousCwd = process.cwd();
  process.chdir(serviceRoot);

  const server = createServer(handleRequest);
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });

  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/cloudflare/deploy/status`
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.gate, "R3");
    assert.equal(body.previewDeployReady, false);
    assert.ok(body.blockers.includes("HERMES_LEDGER requires an exact preview namespace id"));
    assert.ok(
      !body.blockers.includes("Missing required path: services/orchestrator/package.json")
    );
  } finally {
    await new Promise((resolveClose, reject) => {
      server.close((error) => (error ? reject(error) : resolveClose()));
    });
    process.chdir(previousCwd);
  }
});
