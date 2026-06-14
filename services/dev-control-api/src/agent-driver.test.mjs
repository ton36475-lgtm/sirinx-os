import { spawn } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAgentDriverSmokeDryRun, getAgentDriverStatus } from "./agent-driver.mjs";
import { getAgentLaunchGateStatus } from "./agent-launch-gate.mjs";

const fixedNow = () => new Date("2026-05-27T10:00:00.000Z");
const allowedClassifications = ["passed", "missing", "side_effectful", "blocked", "needs_install"];
const dangerousCommandPattern = /\b(install|deploy|push|publish|send|mcp|start-server|start mcp|edit|write)\b/i;

describe("Agent Driver contract", () => {
  it("maps every driver lane back to the Launch Gate registry", () => {
    const launchGate = getAgentLaunchGateStatus({ now: fixedNow });
    const driver = getAgentDriverStatus({ now: fixedNow });
    const launchGateIds = launchGate.agents.map((agent) => agent.id).sort();
    const driverIds = driver.agents.map((agent) => agent.id).sort();

    expect(driver.status).toBe("agent-driver-ready-local-only");
    expect(driver.mode).toBe("local-only-smoke-driver");
    expect(driver.externalWrites).toBe(false);
    expect(driver.canExecuteExternally).toBe(false);
    expect(driver.canLaunchAgents).toBe(false);
    expect(driver.canEditFiles).toBe(false);
    expect(driver.canStartMcp).toBe(false);
    expect(driver.canInstallPackages).toBe(false);
    expect(driver.canSendMessages).toBe(false);
    expect(driver.canDeploy).toBe(false);
    expect(driverIds).toEqual(launchGateIds);
    expect(driver.summary.agentsTotal).toBe(9);
    expect(driver.summary.commandExecuted).toBe(0);
  });

  it("uses the locked classification vocabulary and recommended driving order", () => {
    const driver = getAgentDriverStatus({ now: fixedNow });
    const byId = Object.fromEntries(driver.agents.map((agent) => [agent.id, agent]));

    expect(driver.agents.every((agent) => allowedClassifications.includes(agent.classification))).toBe(true);
    expect(byId.codex.classification).toBe("passed");
    expect(byId["claude-code"].classification).toBe("passed");
    expect(byId["hermes-agent"].classification).toBe("side_effectful");
    expect(byId["codex-app"].classification).toBe("missing");
    expect(byId.openclaw.classification).toBe("needs_install");
    expect(byId.opencode.classification).toBe("needs_install");
    expect(byId["copilot-cli"].classification).toBe("needs_install");
    expect(byId.droid.classification).toBe("needs_install");
    expect(byId.pi.classification).toBe("needs_install");
    expect(driver.recommendedOrder.map((agent) => agent.id)).toEqual(["codex", "claude-code", "hermes-agent"]);
    expect(driver.nextRecommendedAgent.id).toBe("codex");
    expect(byId["hermes-agent"].blockedLauncherCommand).toBe("ollama launch hermes");
    expect(byId["hermes-agent"].approvedReadOnlyCommands).toEqual(["hermes --version", "hermes status", "hermes --help"]);
  });

  it("keeps all approved smoke commands read-only and non-executing", () => {
    const driver = getAgentDriverStatus({ now: fixedNow });

    expect(driver.agents.every((agent) => agent.commandExecuted === false)).toBe(true);
    expect(driver.agents.every((agent) => agent.canEditFiles === false)).toBe(true);
    expect(driver.agents.every((agent) => agent.canStartMcp === false)).toBe(true);
    expect(driver.agents.every((agent) => agent.canInstallPackages === false)).toBe(true);
    expect(driver.agents.every((agent) => agent.canSendMessages === false)).toBe(true);
    expect(driver.agents.every((agent) => agent.canDeploy === false)).toBe(true);
    expect(driver.agents.map((agent) => agent.approvedReadOnlyCommand).filter(Boolean)).not.toEqual([]);
    expect(
      driver.agents
        .map((agent) => agent.approvedReadOnlyCommand)
        .filter(Boolean)
        .every((command) => !dangerousCommandPattern.test(command))
    ).toBe(true);
  });

  it("blocks dangerous smoke goals before command selection", () => {
    const dryRun = createAgentDriverSmokeDryRun(
      {
        requestId: "dangerous-smoke",
        agentId: "codex",
        goal: "start MCP, edit files, install packages, send messages, deploy, push, publish"
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("blocked-agent-driver-smoke-dry-run");
    expect(dryRun.classification).toBe("blocked");
    expect(dryRun.commandExecuted).toBe(false);
    expect(dryRun.approvedReadOnlyCommand).toBeNull();
    expect(dryRun.canEditFiles).toBe(false);
    expect(dryRun.canStartMcp).toBe(false);
    expect(dryRun.canInstallPackages).toBe(false);
    expect(dryRun.canSendMessages).toBe(false);
    expect(dryRun.canDeploy).toBe(false);
    expect(dryRun.blockedReasons).toEqual(
      expect.arrayContaining(["file_edit_by_agent", "mcp_server_start", "install_packages", "message_send", "deploy", "push", "publish"])
    );
  });

  it("blocks Hermes cloud model launch smoke before the side-effectful launcher", () => {
    const dryRun = createAgentDriverSmokeDryRun(
      {
        requestId: "hermes-minimax-cloud",
        agentId: "hermes-agent",
        model: "minimax-m3:cloud",
        goal: "read-only debugging mode"
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("blocked-agent-driver-smoke-dry-run");
    expect(dryRun.classification).toBe("blocked");
    expect(dryRun.selectedAgent.id).toBe("hermes-agent");
    expect(dryRun.requestedLaunchCommand).toBe("ollama launch hermes --model minimax-m3:cloud");
    expect(dryRun.commandExecuted).toBe(false);
    expect(dryRun.approvedReadOnlyCommand).toBeNull();
    expect(dryRun.modelPolicy).toMatchObject({
      requestedModel: "minimax-m3:cloud",
      isCloudModel: true,
      blocked: true
    });
    expect(dryRun.blockedReasons).toEqual(
      expect.arrayContaining(["cloud_model_requires_paid_api_approval", "hermes_launcher_side_effectful", "manual_provider_auth_review_required"])
    );
  });
});

describe("Agent Driver API routes", () => {
  const port = 19880 + Math.floor(Math.random() * 1000);
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

    await waitForServer(`${baseUrl}/api/agent-driver`);
  }, 10000);

  afterAll(() => {
    if (server && !server.killed) {
      server.kill("SIGTERM");
    }
  });

  it("serves local-only driver status without secret-like values", async () => {
    const response = await fetch(`${baseUrl}/api/agent-driver`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("agent-driver-ready-local-only");
    expect(body.summary.agentsTotal).toBe(9);
    expect(body.nextRecommendedAgent.id).toBe("codex");
    expect(body.externalWrites).toBe(false);
    expect(body.canLaunchAgents).toBe(false);
    expect(body.canEditFiles).toBe(false);
    expect(body.canStartMcp).toBe(false);
    expect(body.canInstallPackages).toBe(false);
    expect(body.canSendMessages).toBe(false);
    expect(body.canDeploy).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(/sk-[A-Za-z0-9_-]{20,}/);
  });

  it("serves a dry-run smoke packet without executing commands", async () => {
    const response = await fetch(`${baseUrl}/api/agent-driver/smoke/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId: "agent-driver-smoke", agentId: "codex", goal: "read-only smoke" })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("dry-run-agent-driver-smoke-ready");
    expect(body.classification).toBe("passed");
    expect(body.selectedAgent.id).toBe("codex");
    expect(body.commandExecuted).toBe(false);
    expect(body.approvedReadOnlyCommand).toBe("ollama launch codex --model qwen3.6:latest -- --help");
    expect(body.evidencePacket.path).toBe("docs/knowledge/SIRINX_AGENT_DRIVER_V1.md");
    expect(body.nextRecommendedAgent.id).toBe("claude-code");
  });

  it("fails closed on invalid driver dry-run JSON", async () => {
    const response = await fetch(`${baseUrl}/api/agent-driver/smoke/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid-json"
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      status: "invalid_agent_driver_smoke_dry_run_request",
      externalWrites: false,
      productionWrites: false,
      customerVisible: false,
      canExecuteExternally: false,
      canLaunchAgents: false,
      canEditFiles: false,
      canStartMcp: false,
      canInstallPackages: false,
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
