import { describe, expect, it } from "vitest";
import {
  getCloudflareDeployStatus,
  createCloudflareDeployDryRun,
  simulateCloudflareDeploy
} from "./cloudflare-deploy-approval.mjs";

describe("cloudflare-deploy-approval (deploy approval gate)", () => {
  it("exports expected functions", () => {
    expect(typeof getCloudflareDeployStatus).toBe("function");
    expect(typeof createCloudflareDeployDryRun).toBe("function");
    expect(typeof simulateCloudflareDeploy).toBe("function");
  });

  it("getCloudflareDeployStatus returns status with no external side effects", async () => {
    const status = await getCloudflareDeployStatus();
    expect(status).toHaveProperty("schema");
    expect(status.schema).toBe("ghostclaw.cloudflare.deploy_status.v2");
    expect(status).toHaveProperty("gate");
    expect(status).toHaveProperty("status");
    expect(status).toHaveProperty("deployAuthorized");
    expect(status).toHaveProperty("deployExecuted");
    // Critical safety invariant: deploy is never authorized in local mode
    expect(status.deployAuthorized).toBe(false);
    expect(status.deployExecuted).toBe(false);
    expect(status.externalWrites).toBe(false);
    expect(status.noExternalSideEffects).toBe(true);
    expect(status).toHaveProperty("blockers");
    expect(Array.isArray(status.blockers)).toBe(true);
  });

  it("createCloudflareDeployDryRun returns dry-run packet that does not execute", async () => {
    const dryRun = await createCloudflareDeployDryRun("LOCAL_PREVIEW_ONLY");
    expect(dryRun.schema).toBe("ghostclaw.cloudflare.deploy_dry_run.v2");
    expect(dryRun.gateAccepted).toBe(false);
    expect(dryRun.execute).toBe(false);
    expect(dryRun.deploy).toBe(false);
    expect(dryRun.externalRequests).toBe(false);
    expect(dryRun.noExternalSideEffects).toBe(true);
    expect(dryRun).toHaveProperty("packet");
    expect(dryRun).toHaveProperty("blockers");
    expect(dryRun).toHaveProperty("requiredGatePattern");
  });

  it("simulateCloudflareDeploy returns local-simulation-only result", async () => {
    const sim = await simulateCloudflareDeploy();
    expect(sim.schema).toBe("ghostclaw.cloudflare.local_simulation.v2");
    expect(sim.status).toBe("local-simulation-only");
    expect(sim.deployAuthorized).toBe(false);
    expect(sim.deployExecuted).toBe(false);
    expect(sim.externalRequests).toBe(false);
    expect(sim.externalWrites).toBe(false);
    expect(sim.noExternalSideEffects).toBe(true);
    expect(sim.bindings).toHaveProperty("kv");
    expect(sim.bindings).toHaveProperty("r2");
  });
});
