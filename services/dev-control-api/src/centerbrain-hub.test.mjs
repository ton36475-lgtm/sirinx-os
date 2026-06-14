import { spawn } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createCenterBrainSyncDryRun, getCenterBrainHubStatus } from "./centerbrain-hub.mjs";

const fixedNow = () => new Date("2026-05-27T03:00:00.000Z");

describe("CenterBrain Hub contract", () => {
  it("maps AI nodes, device nodes, connector lanes, and stack lanes without activating external work", async () => {
    const status = await getCenterBrainHubStatus({ now: fixedNow });

    expect(status.status).toBe("centerbrain-hub-ready-local-only");
    expect(status.mode).toBe("a2a2-adaptive-sync-control-plane");
    expect(status.externalWrites).toBe(false);
    expect(status.canActivateConnectors).toBe(false);
    expect(status.canRunMcp).toBe(false);
    expect(status.canReadSecrets).toBe(false);
    expect(status.canSendMessages).toBe(false);
    expect(status.canDeploy).toBe(false);
    expect(status.summary).toMatchObject({
      aiNodes: 9,
      deviceNodes: 3,
      connectorLanes: 15,
      stackLanes: 7,
      liveExternalActions: 0
    });
    expect(status.aiNodes.map((node) => node.id)).toEqual([
      "codex",
      "claude-code",
      "hermes-agent",
      "codex-app",
      "openclaw",
      "opencode",
      "copilot-cli",
      "droid",
      "pi"
    ]);
    expect(status.deviceNodes.map((node) => node.id)).toEqual(["mac", "pc", "mobile"]);
    expect(status.stackLanes.map((lane) => lane.id)).toEqual([
      "nextjs",
      "tailwind",
      "html",
      "javascript",
      "golang",
      "local-api",
      "a2a2-sync"
    ]);
    expect(status.connectorRegistry.summary.connectorsTotal).toBe(15);
    expect(status.agentDriver.summary.commandExecuted).toBe(0);
  });

  it("returns a safe adaptive sync dry-run packet for all nodes", async () => {
    const dryRun = await createCenterBrainSyncDryRun(
      {
        requestId: "centerbrain-test",
        goal: "connect all AI nodes to Mac PC mobile centerbrain hub",
        targetDevices: ["mac", "pc", "mobile"]
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("dry-run-centerbrain-sync-ready");
    expect(dryRun.requestId).toBe("centerbrain-test");
    expect(dryRun.externalWrites).toBe(false);
    expect(dryRun.canActivateConnectors).toBe(false);
    expect(dryRun.canRunMcp).toBe(false);
    expect(dryRun.canSendMessages).toBe(false);
    expect(dryRun.canDeploy).toBe(false);
    expect(dryRun.syncPlan.devices.map((device) => device.id)).toEqual(["mac", "pc", "mobile"]);
    expect(dryRun.syncPlan.aiNodes).toHaveLength(9);
    expect(dryRun.syncPlan.handshake).toEqual([
      "discover",
      "classify",
      "dry-run",
      "evidence",
      "approval",
      "manual-activation"
    ]);
    expect(dryRun.nextRecommendedAction).toBe("Build Next.js/Tailwind shell only after local dashboard contract remains green.");
  });

  it("blocks dangerous sync goals", async () => {
    const dryRun = await createCenterBrainSyncDryRun(
      {
        goal: "deploy, push, start MCP, install packages, send LINE and Telegram messages, read secrets"
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("blocked-centerbrain-sync-dry-run");
    expect(dryRun.blockedReasons).toEqual(
      expect.arrayContaining([
        "deploy",
        "push",
        "mcp_server_start",
        "install_packages",
        "message_send",
        "secret_read_or_print"
      ])
    );
    expect(dryRun.externalWrites).toBe(false);
    expect(dryRun.canActivateConnectors).toBe(false);
    expect(dryRun.canRunMcp).toBe(false);
    expect(dryRun.canSendMessages).toBe(false);
    expect(dryRun.canDeploy).toBe(false);
  });
});

describe("CenterBrain Hub API routes", () => {
  const port = 19980 + Math.floor(Math.random() * 1000);
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

    await waitForServer(`${baseUrl}/api/centerbrain-hub`);
  }, 10000);

  afterAll(() => {
    if (server && !server.killed) {
      server.kill("SIGTERM");
    }
  });

  it("serves CenterBrain status over the local API", async () => {
    const response = await fetch(`${baseUrl}/api/centerbrain-hub`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("centerbrain-hub-ready-local-only");
    expect(body.summary.aiNodes).toBe(9);
    expect(body.summary.connectorLanes).toBe(15);
    expect(body.externalWrites).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(/sk-[A-Za-z0-9_-]{20,}/);
  });

  it("serves dry-run sync without activating connectors", async () => {
    const response = await fetch(`${baseUrl}/api/centerbrain-hub/sync/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId: "api-centerbrain-test", goal: "local-only adaptive sync" })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("dry-run-centerbrain-sync-ready");
    expect(body.canActivateConnectors).toBe(false);
    expect(body.canRunMcp).toBe(false);
    expect(body.canDeploy).toBe(false);
  });

  it("fails closed on invalid dry-run JSON", async () => {
    const response = await fetch(`${baseUrl}/api/centerbrain-hub/sync/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid-json"
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      status: "invalid_centerbrain_sync_dry_run_request",
      externalWrites: false,
      canActivateConnectors: false,
      canRunMcp: false,
      canReadSecrets: false,
      canSendMessages: false,
      canDeploy: false,
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
