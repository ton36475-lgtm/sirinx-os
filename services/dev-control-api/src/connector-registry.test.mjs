import { spawn } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createConnectorRegistryDryRun, getConnectorRegistryStatus } from "./connector-registry.mjs";
import { createGatewayAgentDryRunPlan, getGatewayAgentStatus } from "./gateway-agent.mjs";

const fixedNow = () => new Date("2026-05-26T06:00:00.000Z");

describe("Connector capability registry", () => {
  it("reports 15 local-only connectors across 7 owner lanes", async () => {
    const status = await getConnectorRegistryStatus({ now: fixedNow });

    expect(status.status).toBe("local-connector-registry-ready");
    expect(status.mode).toBe("local-only-capability-registry");
    expect(status.summary).toMatchObject({
      connectorsTotal: 15,
      ownerLanes: 7,
      activatableConnectors: 0
    });
    expect(status.connectors).toHaveLength(15);
    expect(status.ownerPackets).toHaveLength(7);
    expect(status.connectors.every((connector) => connector.externalWrites === false)).toBe(true);
    expect(status.connectors.every((connector) => connector.canActivate === false)).toBe(true);
    expect(status.connectors.every((connector) => connector.canExecuteExternally === false)).toBe(true);
    expect(status.connectors.every((connector) => connector.canRunMcp === false)).toBe(true);
    expect(status.connectors.every((connector) => connector.canReadSecrets === false)).toBe(true);
    expect(status.connectors.every((connector) => connector.requiresApproval === true)).toBe(true);
    expect(status.ownerPackets.find((packet) => packet.owner === "scribe").connectors).toEqual([
      "notion",
      "google-drive",
      "spreadsheets",
      "documents",
      "presentations"
    ]);
  });

  it("creates a dry-run owner packet map without activating connectors", async () => {
    const dryRun = await createConnectorRegistryDryRun(
      {
        requestId: "connector-registry-dry-run-test",
        goal: "map all listed connectors to local owner lanes",
        source: "codex-local"
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("dry-run-connector-registry-ready");
    expect(dryRun.requestId).toBe("connector-registry-dry-run-test");
    expect(dryRun.goal).toBe("map all listed connectors to local owner lanes");
    expect(dryRun.source).toBe("codex-local");
    expect(dryRun.externalWrites).toBe(false);
    expect(dryRun.canExecuteExternally).toBe(false);
    expect(dryRun.canRunMcp).toBe(false);
    expect(dryRun.canActivateConnectors).toBe(false);
    expect(dryRun.ownerPackets).toHaveLength(7);
    expect(dryRun.ownerPackets.every((packet) => packet.canActivate === false)).toBe(true);
    expect(dryRun.stopPoint).toBe("CONNECTOR REGISTRY READY LOCAL-ONLY - WAITING FOR HUMAN APPROVAL");
  });

  it("surfaces connector registry summary through Gateway Agent status and dry-run", async () => {
    const status = await getGatewayAgentStatus({
      now: fixedNow,
      evidenceRoot: "/tmp/sirinx-connector-registry-test-empty"
    });
    const dryRun = await createGatewayAgentDryRunPlan(
      {
        goal: "wire connector registry into gateway",
        source: "codex-local"
      },
      {
        now: fixedNow,
        evidenceRoot: "/tmp/sirinx-connector-registry-test-empty"
      }
    );

    expect(status.summary.connectorsTotal).toBe(15);
    expect(status.connectorRegistry.summary).toMatchObject({
      connectorsTotal: 15,
      ownerLanes: 7,
      activatableConnectors: 0
    });
    expect(dryRun.connectorRegistry.summary.connectorsTotal).toBe(15);
    expect(dryRun.connectorRegistry.canActivateConnectors).toBe(false);
  });
});

describe("Connector registry API routes", () => {
  const port = 18780 + Math.floor(Math.random() * 1000);
  const baseUrl = `http://127.0.0.1:${port}`;
  let server;

  beforeAll(async () => {
    server = spawn("node", ["services/dev-control-api/server.mjs"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DEV_CONTROL_API_PORT: String(port),
        DEV_CONTROL_API_HOST: "127.0.0.1"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    await waitForServer(`${baseUrl}/api/connector-registry`);
  }, 10000);

  afterAll(() => {
    if (server && !server.killed) {
      server.kill("SIGTERM");
    }
  });

  it("serves connector registry status over the local API", async () => {
    const response = await fetch(`${baseUrl}/api/connector-registry`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("local-connector-registry-ready");
    expect(body.summary.connectorsTotal).toBe(15);
    expect(body.externalWrites).toBe(false);
  });

  it("fails closed on invalid connector registry dry-run JSON", async () => {
    const response = await fetch(`${baseUrl}/api/connector-registry/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid-json"
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      status: "invalid_connector_registry_dry_run_request",
      externalWrites: false,
      productionWrites: false,
      customerVisible: false,
      canExecuteExternally: false,
      canRunMcp: false,
      canActivateConnectors: false,
      requiresHumanApproval: true
    });
  });
});

async function waitForServer(url) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 8000) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error(`server did not start for ${url}`);
}
