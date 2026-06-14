import { spawn } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAgentLaunchGateDryRun, getAgentLaunchGateStatus } from "./agent-launch-gate.mjs";

const fixedNow = () => new Date("2026-05-27T09:00:00.000Z");

describe("Agent Launch Gate registry", () => {
  it("registers the nine Ollama launch agents as manual-only commands", () => {
    const status = getAgentLaunchGateStatus({ now: fixedNow, hermesContextWindow: 8192 });

    expect(status.status).toBe("local-launch-gate-ready");
    expect(status.mode).toBe("local-only-manual-command-registry");
    expect(status.externalWrites).toBe(false);
    expect(status.canExecuteExternally).toBe(false);
    expect(status.canLaunchAgents).toBe(false);
    expect(status.canRunMcp).toBe(false);
    expect(status.canReadSecrets).toBe(false);
    expect(status.agents.map((agent) => agent.id)).toEqual([
      "claude-code",
      "codex-app",
      "hermes-agent",
      "openclaw",
      "opencode",
      "codex",
      "copilot-cli",
      "droid",
      "pi"
    ]);
    expect(status.agents).toHaveLength(9);
    expect(status.agents.every((agent) => agent.command.startsWith("ollama launch "))).toBe(true);
    expect(status.agents.every((agent) => agent.allowedMode === "manual_only")).toBe(true);
    expect(status.agents.every((agent) => agent.autoExecute === false)).toBe(true);
    expect(status.agents.every((agent) => agent.canLaunchAutomatically === false)).toBe(true);
    expect(status.summary).toMatchObject({
      agentsTotal: 9,
      manualOnly: 9,
      autoExecutable: 0,
      blockedContextTooSmall: 1
    });
  });

  it("blocks Hermes routing when the observed context window is below 64000", () => {
    const status = getAgentLaunchGateStatus({ now: fixedNow, hermesContextWindow: 8192 });
    const hermes = status.agents.find((agent) => agent.id === "hermes-agent");

    expect(status.hermesContextRule).toMatchObject({
      observedContextWindow: 8192,
      requiredContextWindow: 64000,
      status: "blocked-context-too-small"
    });
    expect(hermes).toMatchObject({
      status: "blocked-context-too-small",
      autoExecute: false,
      canExecuteNow: false
    });
    expect(hermes.badges).toContain("blocked-context-too-small");
    expect(hermes.routing.allowed).toBe(false);
  });

  it("creates a dry-run manual smoke plan without executing a launch command", () => {
    const dryRun = createAgentLaunchGateDryRun(
      {
        requestId: "launch-gate-test",
        agentId: "codex-app",
        goal: "test Codex App manually",
        source: "vitest"
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("dry-run-agent-launch-plan-ready");
    expect(dryRun.requestId).toBe("launch-gate-test");
    expect(dryRun.selectedAgent.id).toBe("codex-app");
    expect(dryRun.manualCommand).toBe("ollama launch codex-app");
    expect(dryRun.commandExecuted).toBe(false);
    expect(dryRun.externalWrites).toBe(false);
    expect(dryRun.canLaunchAgents).toBe(false);
    expect(dryRun.canRunMcp).toBe(false);
    expect(dryRun.manualSteps.join(" ")).toContain("Copy the command manually");
  });

  it("blocks Hermes cloud model launch plans before command execution", () => {
    const dryRun = createAgentLaunchGateDryRun(
      {
        requestId: "hermes-cloud-model-test",
        agentId: "hermes-agent",
        model: "minimax-m3:cloud",
        goal: "launch Hermes in debugging mode",
        source: "vitest"
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("blocked-agent-launch-plan-dry-run");
    expect(dryRun.selectedAgent.id).toBe("hermes-agent");
    expect(dryRun.manualCommand).toBe("ollama launch hermes --model minimax-m3:cloud");
    expect(dryRun.commandExecuted).toBe(false);
    expect(dryRun.modelPolicy).toMatchObject({
      requestedModel: "minimax-m3:cloud",
      isCloudModel: true,
      requiresPaidApiApproval: true,
      requiresProviderAuthReview: true,
      blocked: true
    });
    expect(dryRun.blockedReasons).toEqual(
      expect.arrayContaining(["cloud_model_requires_paid_api_approval", "hermes_launcher_side_effectful", "manual_provider_auth_review_required"])
    );
  });
});

describe("Agent Launch Gate API routes", () => {
  const port = 19780 + Math.floor(Math.random() * 1000);
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

    await waitForServer(`${baseUrl}/api/agent-launch-gate`);
  }, 10000);

  afterAll(() => {
    if (server && !server.killed) {
      server.kill("SIGTERM");
    }
  });

  it("serves local-only launch gate status over the local API", async () => {
    const response = await fetch(`${baseUrl}/api/agent-launch-gate`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("local-launch-gate-ready");
    expect(body.summary.agentsTotal).toBe(9);
    expect(body.externalWrites).toBe(false);
    expect(body.canLaunchAgents).toBe(false);
    expect(body.canReadSecrets).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(/sk-[A-Za-z0-9_-]{20,}/);
  });

  it("serves a dry-run plan without launching an agent", async () => {
    const response = await fetch(`${baseUrl}/api/agent-launch-gate/plan/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: "codex", goal: "manual smoke test" })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("dry-run-agent-launch-plan-ready");
    expect(body.selectedAgent.id).toBe("codex");
    expect(body.manualCommand).toBe("ollama launch codex");
    expect(body.commandExecuted).toBe(false);
    expect(body.canLaunchAgents).toBe(false);
  });

  it("fails closed on invalid launch gate dry-run JSON", async () => {
    const response = await fetch(`${baseUrl}/api/agent-launch-gate/plan/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid-json"
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      status: "invalid_agent_launch_gate_dry_run_request",
      externalWrites: false,
      productionWrites: false,
      customerVisible: false,
      canExecuteExternally: false,
      canLaunchAgents: false,
      canRunMcp: false,
      canReadSecrets: false,
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
