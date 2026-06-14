import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createHermesSpecFirstSwarmDryRun,
  getHermesSpecFirstSwarmStatus
} from "./hermes-spec-first-swarm.mjs";

const fixedNow = () => new Date("2026-05-27T13:45:00.000Z");
const secretLikePattern = /sk-[A-Za-z0-9_-]{20,}|OPENROUTER_API_KEY\s*=\s*[^"'\s]{12,}/;

const requiredHermesFiles = [
  ".hermes/context.md",
  ".hermes/state.json",
  ".hermes/agent-roles.md",
  ".hermes/approval-log.md",
  ".hermes/decision-log.md",
  ".hermes/risk-register.md"
];

const requiredWorkflowDocs = [
  "docs/00-project-brief.md",
  "docs/01-requirements.md",
  "docs/02-design-direction.md",
  "docs/03-technical-spec.md",
  "docs/04-implementation-plan.md",
  "docs/05-qa-checklist.md",
  "docs/06-release-report.md"
];

describe("Hermes Spec-First Swarm contract", () => {
  it("represents every required live state and workflow document", () => {
    const status = getHermesSpecFirstSwarmStatus({ now: fixedNow });

    expect(status.status).toBe("hermes-spec-first-swarm-ready-live-local-state");
    expect(status.currentPhase).toBe("APPROVAL_GATE");
    expect(status.approvalStatus).toBe("APPROVED_CLOUDFLARE_DEV_PLAN_LOCAL_ONLY_ONLY");
    expect(status.approvalPhrase).toBe("APPROVE_IMPLEMENTATION");
    expect(status.implementationStarted).toBe(true);
    expect(status.canModifySource).toBe(false);
    expect(status.canCallProvider).toBe(false);
    expect(status.canSendMessages).toBe(false);
    expect(status.environmentScanned).toBe(true);
    expect(status.requiredFiles.map((file) => file.path)).toEqual([...requiredHermesFiles, ...requiredWorkflowDocs]);
    expect(status.requiredFiles.every((file) => file.exists === true)).toBe(true);
    expect([...requiredHermesFiles, ...requiredWorkflowDocs].every((file) => existsSync(file))).toBe(true);
    expect(status.stopPoint).toBe("HERMES SPEC-FIRST SWARM READY - LIVE LOCAL STATE - WAITING FOR APPROVE_IMPLEMENTATION");
  });

  it("locks the expected agent roles and hard guardrails", () => {
    const status = getHermesSpecFirstSwarmStatus({ now: fixedNow });
    const roleIds = status.agentRoles.map((role) => role.id);

    expect(roleIds).toEqual([
      "hermes-orchestrator",
      "context-manager",
      "grill-agent",
      "spec-writer",
      "environment-scanner",
      "coder-agent",
      "qa-guardrail-agent",
      "reporter-agent"
    ]);
    expect(status.agentRoles.find((role) => role.id === "coder-agent").blocked).toContain(
      "add_unapproved_features"
    );
    expect(status.blockedActions).toEqual(
      expect.arrayContaining([
        "write_code_before_approval",
        "modify_source_without_approval",
        "install_packages",
        "deploy",
        "push",
        "publish",
        "real_mcp_execution",
        "external_connector_activation",
        "paid_api_call",
        "secret_read_or_print",
        "message_send",
        "agent_auto_start"
      ])
    );
    expect(status.commandExecuted).toBe(false);
    expect(status.canModifySource).toBe(false);
    expect(status.canInstallPackages).toBe(false);
    expect(status.canStartMcp).toBe(false);
    expect(status.canCallProvider).toBe(false);
  });

  it("creates a phase-safe dry-run plan without mutation", () => {
    const dryRun = createHermesSpecFirstSwarmDryRun(
      {
        requestId: "spec-first-swarm-dry-run",
        goal: "create requirements for the next local dashboard feature",
        phase: "GRILLING"
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("dry-run-hermes-spec-first-swarm-ready");
    expect(dryRun.requestId).toBe("spec-first-swarm-dry-run");
    expect(dryRun.selectedPhase).toBe("GRILLING");
    expect(dryRun.nextAllowedActions).toEqual(["ASK_STRUCTURED_QUESTIONS", "UPDATE_CONTEXT", "WRITE_SPEC_DOCS"]);
    expect(dryRun.commandExecuted).toBe(false);
    expect(dryRun.canModifySource).toBe(false);
    expect(dryRun.canInstallPackages).toBe(false);
    expect(dryRun.canStartMcp).toBe(false);
    expect(dryRun.canCallProvider).toBe(false);
    expect(dryRun.requiresHumanApproval).toBe(true);
  });

  it("blocks dangerous goals before creating an execution plan", () => {
    const dryRun = createHermesSpecFirstSwarmDryRun(
      {
        requestId: "dangerous-spec-first",
        goal: "write code, install package, start MCP, call provider, send LINE, deploy, push and publish"
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("blocked-hermes-spec-first-swarm-dry-run");
    expect(dryRun.commandExecuted).toBe(false);
    expect(dryRun.canModifySource).toBe(false);
    expect(dryRun.canInstallPackages).toBe(false);
    expect(dryRun.canStartMcp).toBe(false);
    expect(dryRun.canCallProvider).toBe(false);
    expect(dryRun.blockedReasons).toEqual(
      expect.arrayContaining([
        "write_code_before_approval",
        "install_packages",
        "real_mcp_execution",
        "paid_api_call",
        "message_send",
        "deploy",
        "push",
        "publish"
      ])
    );
  });
});

describe("Hermes Spec-First Swarm API routes", () => {
  const port = 23000 + Math.floor(Math.random() * 1000);
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

    await waitForServer(`${baseUrl}/api/hermes-spec-first-swarm`);
  }, 10000);

  afterAll(() => {
    if (server && !server.killed) {
      server.kill("SIGTERM");
    }
  });

  it("serves live local swarm state without secret-like values", async () => {
    const response = await fetch(`${baseUrl}/api/hermes-spec-first-swarm`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("hermes-spec-first-swarm-ready-live-local-state");
    expect(body.approvalPhrase).toBe("APPROVE_IMPLEMENTATION");
    expect(body.currentPhase).toBe("APPROVAL_GATE");
    expect(body.canModifySource).toBe(false);
    expect(body.canInstallPackages).toBe(false);
    expect(body.canStartMcp).toBe(false);
    expect(body.canCallProvider).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(secretLikePattern);
  });

  it("serves dry-run planning without mutation or execution", async () => {
    const response = await fetch(`${baseUrl}/api/hermes-spec-first-swarm/plan/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requestId: "api-spec-first-dry-run",
        goal: "capture requirements for local-only dashboard feature",
        phase: "SPEC_WRITING"
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("dry-run-hermes-spec-first-swarm-ready");
    expect(body.commandExecuted).toBe(false);
    expect(body.canModifySource).toBe(false);
    expect(body.canInstallPackages).toBe(false);
    expect(body.canStartMcp).toBe(false);
    expect(body.canCallProvider).toBe(false);
  });

  it("fails closed on invalid dry-run JSON", async () => {
    const response = await fetch(`${baseUrl}/api/hermes-spec-first-swarm/plan/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid-json"
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      status: "invalid_hermes_spec_first_swarm_dry_run_request",
      externalWrites: false,
      productionWrites: false,
      customerVisible: false,
      commandExecuted: false,
      canModifySource: false,
      canInstallPackages: false,
      canStartMcp: false,
      canCallProvider: false,
      requiresHumanApproval: true
    });
  });
});

async function waitForServer(url) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 8000) {
    try {
      const response = await fetch(url);
      if (response.status !== 404) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error(`server did not start for ${url}`);
}
