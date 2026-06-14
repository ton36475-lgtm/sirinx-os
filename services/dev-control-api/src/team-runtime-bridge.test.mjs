import { spawn } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTeamRuntimeBridgeDryRun, getTeamRuntimeBridgeStatus } from "./team-runtime-bridge.mjs";

const fixedNow = () => new Date("2026-05-27T07:00:00.000Z");

describe("Team Runtime Bridge contract", () => {
  it("connects Hermes team, Qwen OpenRouter, Antigravity watch, and A2A2A without enabling execution", async () => {
    const status = await getTeamRuntimeBridgeStatus({
      now: fixedNow,
      antigravityCliAvailable: false,
      localModels: ["qwen3.6:latest"],
      hermesContextWindow: 8192
    });

    expect(status.status).toBe("team-runtime-bridge-ready-local-only");
    expect(status.mode).toBe("qwen-openrouter-antigravity-a2a2a-local-contract");
    expect(status.externalWrites).toBe(false);
    expect(status.canExecuteExternally).toBe(false);
    expect(status.canCallPaidApi).toBe(false);
    expect(status.canReadSecrets).toBe(false);
    expect(status.canRunMcp).toBe(false);
    expect(status.canRunAntigravityCli).toBe(false);
    expect(status.canStartHermesTeam).toBe(false);
    expect(status.summary).toMatchObject({
      runtimeLanes: 5,
      cloudModelLanes: 1,
      paidApiExecutable: 0,
      antigravityExecutable: 0,
      hermesRoutingReady: false,
      localModelsObserved: 1
    });
    expect(status.modelLanes.find((lane) => lane.id === "qwen-3-7-max-openrouter")).toMatchObject({
      provider: "OpenRouter",
      modelId: "qwen/qwen3.7-max",
      contextWindow: 1000000,
      canCallProvider: false,
      canReadApiKey: false,
      paidApiRequired: true,
      autoExecute: false,
      commandExecuted: false
    });
    expect(status.openRouterQwenAdapter).toMatchObject({
      status: "openrouter-qwen-adapter-ready-local-only",
      provider: "OpenRouter",
      primaryModel: "qwen/qwen3.7-max",
      fallbackModel: "qwen/qwen3-max",
      providerCalled: false,
      secretsRead: false,
      canCallPaidApi: false
    });
    expect(status.runtimeLanes.find((lane) => lane.id === "antigravity-cli-watch")).toMatchObject({
      status: "missing-cli",
      autoExecute: false,
      canExecuteNow: false,
      canRunMcp: false
    });
    expect(status.runtimeLanes.find((lane) => lane.id === "hermes-agent-team")).toMatchObject({
      status: "blocked-context-too-small",
      contextWindow: 8192,
      requiredContextWindow: 64000,
      autoExecute: false
    });
  });

  it("returns a Qwen OpenRouter dry-run plan without reading secrets or calling the provider", async () => {
    const dryRun = await createTeamRuntimeBridgeDryRun(
      {
        requestId: "team-runtime-qwen-test",
        goal: "connect Hermes team through Qwen 3.7 Max OpenRouter for local planning",
        requestedModel: "qwen 3.7 max",
        requestedCli: "antigravity2 cli"
      },
      { now: fixedNow, antigravityCliAvailable: false }
    );

    expect(dryRun.status).toBe("dry-run-team-runtime-bridge-ready");
    expect(dryRun.requestId).toBe("team-runtime-qwen-test");
    expect(dryRun.selectedModel).toMatchObject({
      id: "qwen-3-7-max-openrouter",
      provider: "OpenRouter",
      modelId: "qwen/qwen3.7-max"
    });
    expect(dryRun.providerCalled).toBe(false);
    expect(dryRun.commandExecuted).toBe(false);
    expect(dryRun.secretsRead).toBe(false);
    expect(dryRun.canCallPaidApi).toBe(false);
    expect(dryRun.canRunAntigravityCli).toBe(false);
    expect(dryRun.canStartHermesTeam).toBe(false);
    expect(dryRun.nextManualApproval).toBe("OpenRouter Qwen 3.7 Max provider call approval");
    expect(dryRun.stopPoint).toBe("TEAM RUNTIME BRIDGE READY - LOCAL ONLY - WAITING FOR MODEL ROUTING APPROVAL");
  });

  it("blocks dangerous team runtime goals", async () => {
    const dryRun = await createTeamRuntimeBridgeDryRun(
      {
        goal: "install antigravity, start MCP, read OpenRouter API key, call provider, send messages, deploy and push"
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("blocked-team-runtime-bridge-dry-run");
    expect(dryRun.blockedReasons).toEqual(
      expect.arrayContaining([
        "package_install",
        "real_mcp_execution",
        "secret_read_or_print",
        "paid_api_call",
        "customer_message_send",
        "deploy",
        "push"
      ])
    );
    expect(dryRun.canCallPaidApi).toBe(false);
    expect(dryRun.canRunAntigravityCli).toBe(false);
    expect(dryRun.canRunMcp).toBe(false);
    expect(dryRun.canReadSecrets).toBe(false);
    expect(dryRun.commandExecuted).toBe(false);
  });
});

describe("Team Runtime Bridge API routes", () => {
  const port = 21000 + Math.floor(Math.random() * 1000);
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

    await waitForServer(`${baseUrl}/api/team-runtime-bridge`);
  }, 10000);

  afterAll(() => {
    if (server && !server.killed) {
      server.kill("SIGTERM");
    }
  });

  it("serves Team Runtime Bridge status without secret-like values", async () => {
    const response = await fetch(`${baseUrl}/api/team-runtime-bridge`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("team-runtime-bridge-ready-local-only");
    expect(body.canCallPaidApi).toBe(false);
    expect(body.canReadSecrets).toBe(false);
    expect(body.modelLanes.find((lane) => lane.id === "qwen-3-7-max-openrouter").modelId).toBe("qwen/qwen3.7-max");
    expect(body.openRouterQwenAdapter.primaryModel).toBe("qwen/qwen3.7-max");
    expect(JSON.stringify(body)).not.toMatch(/sk-[A-Za-z0-9_-]{20,}/);
  });

  it("serves dry-run planning without command execution", async () => {
    const response = await fetch(`${baseUrl}/api/team-runtime-bridge/plan/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requestId: "api-team-runtime-test",
        goal: "local-only team bridge with qwen openrouter",
        requestedModel: "qwen3.7-max"
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("dry-run-team-runtime-bridge-ready");
    expect(body.providerCalled).toBe(false);
    expect(body.commandExecuted).toBe(false);
    expect(body.canCallPaidApi).toBe(false);
  });

  it("fails closed on invalid dry-run JSON", async () => {
    const response = await fetch(`${baseUrl}/api/team-runtime-bridge/plan/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid-json"
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      status: "invalid_team_runtime_bridge_dry_run_request",
      externalWrites: false,
      canCallPaidApi: false,
      canRunAntigravityCli: false,
      canRunMcp: false,
      canReadSecrets: false,
      commandExecuted: false,
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
