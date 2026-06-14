import { spawn } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  classifyNightWatchCallback,
  createAdaptiveCommandDryRun,
  detectSecretLikeText,
  getAdaptiveCommandGatewayStatus,
  parseAdaptiveCommand,
  redactSecretLikeText
} from "./adaptive-command-gateway.mjs";

const fixedNow = "2026-05-27T14:00:00.000Z";
const secretLikePattern = /(sk-or-v1|sk-proj|bot-token|OPENROUTER_API_KEY|TELEGRAM_BOT_TOKEN|Bearer\s+[A-Za-z0-9])/i;

function waitForServer(url, timeoutMs = 5000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    async function check() {
      try {
        const response = await fetch(url);
        if (response.status < 500) {
          resolve();
          return;
        }
      } catch {
        // Retry until timeout.
      }

      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }

      setTimeout(check, 100);
    }

    check();
  });
}

describe("Hermes Adaptive Command Gateway v0.2", () => {
  it("publishes local-only gateway policy, aliases, command registry, and model split", () => {
    const status = getAdaptiveCommandGatewayStatus({ now: fixedNow });

    expect(status.status).toBe("hermes-adaptive-command-gateway-ready-local-only");
    expect(status.aliases.clear).toBe("reset");
    expect(status.commandRegistry).toEqual(
      expect.arrayContaining([
        "/clear",
        "/reset",
        "/kanban boards switch <slug>",
        "/mission create \"<name>\"",
        "/mission route \"<route>\" --provider <provider> --sync <targets> --mode <mode>"
      ])
    );
    expect(status.modelPolicy.router.model).toBe("qwen/qwen3.7-max");
    expect(status.modelPolicy.router.contextLength).toBe(1000000);
    expect(status.modelPolicy.planner.model).toBe("qwen/qwen3.7-max");
    expect(status.modelPolicy.planner.contextLength).toBe(1000000);
    expect(status.modelPolicy.reviewer.model).toBe("qwen/qwen3.7-max");
    expect(status.modelPolicy.reviewer.contextLength).toBe(1000000);
    expect(status.modelPolicy.router.maxTokens).toBe(512);
    expect(status.modelPolicy.planner.maxTokens).toBe(4096);
    expect(status.modelPolicy.reviewer.maxTokens).toBe(3000);
    expect(status.messageSent).toBe(false);
    expect(status.providerCalled).toBe(false);
    expect(status.commandExecuted).toBe(false);
  });

  it("aliases /clear to /reset and returns a fast ACK without queue execution", () => {
    const parsed = parseAdaptiveCommand("/clear");
    const dryRun = createAdaptiveCommandDryRun(
      {
        requestId: "clear-test",
        source: "telegram",
        command: "/clear"
      },
      { now: fixedNow }
    );

    expect(parsed.valid).toBe(true);
    expect(parsed.canonicalCommand).toBe("/reset");
    expect(parsed.kind).toBe("reset");
    expect(dryRun.status).toBe("fast_ack_ready");
    expect(dryRun.ack.shouldRespondImmediately).toBe(true);
    expect(dryRun.ack.text).toContain("Screen cleared and session reset");
    expect(dryRun.job.required).toBe(false);
    expect(dryRun.messageSent).toBe(false);
    expect(dryRun.commandExecuted).toBe(false);
  });

  it("detects and redacts secret-like Telegram payloads before model routing", () => {
    const secretSample = `sk-or-v1_${"a".repeat(40)}`;
    const command = `/mission create "Leak test ${secretSample}"`;
    const dryRun = createAdaptiveCommandDryRun(
      {
        requestId: "secret-test",
        source: "telegram",
        command
      },
      { now: fixedNow }
    );

    expect(detectSecretLikeText(command).secretDetected).toBe(true);
    expect(redactSecretLikeText(command)).not.toMatch(secretLikePattern);
    expect(dryRun.status).toBe("blocked_secret_detected");
    expect(dryRun.secretDetected).toBe(true);
    expect(dryRun.shouldForwardToLlm).toBe(false);
    expect(dryRun.sanitizedCommand).not.toMatch(secretLikePattern);
    expect(dryRun.nextActions).toEqual(expect.arrayContaining(["rotate_or_revoke_possible_token"]));
    expect(dryRun.messageSent).toBe(false);
    expect(dryRun.providerCalled).toBe(false);
  });

  it("rejects overloaded /kanban commands and recommends structured board/mission/route commands", () => {
    const dryRun = createAdaptiveCommandDryRun(
      {
        requestId: "kanban-overload",
        source: "telegram",
        command: "/kanban fusion team AI HERMES>CODEX>ANTIGRAVITY CLI AND OPEN ROUTER ADAPTIVE SYNC TO PC NODE AND MOBILE NODE."
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("invalid_command_syntax");
    expect(dryRun.parser.error).toBe("kanban_boards_switch_required");
    expect(dryRun.recommendedCommands).toEqual(
      expect.arrayContaining([
        "/kanban boards switch fusion-team-ai",
        '/mission create "Fusion Team AI: Hermes Codex Antigravity Adaptive Sync"',
        '/mission route "HERMES>CODEX>ANTIGRAVITY" --provider openrouter --sync pc,mobile --mode adaptive'
      ])
    );
    expect(dryRun.commandExecuted).toBe(false);
  });

  it("parses mission route into a queued approval-gated mission object", () => {
    const dryRun = createAdaptiveCommandDryRun(
      {
        requestId: "mission-route-test",
        source: "telegram",
        command: '/mission route "HERMES>CODEX>ANTIGRAVITY" --provider openrouter --sync pc,mobile --mode adaptive'
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("long_job_queued_dry_run");
    expect(dryRun.job.id).toMatch(/^HERMES-20260527-/);
    expect(dryRun.job.status).toBe("QUEUED");
    expect(dryRun.queue.backend).toBe("sqlite");
    expect(dryRun.mission).toMatchObject({
      route: ["HERMES", "CODEX", "ANTIGRAVITY"],
      provider: "openrouter",
      modelPolicy: {
        router: "qwen/qwen3.7-max",
        planner: "qwen/qwen3.7-max",
        reviewer: "qwen/qwen3.7-max"
      },
      syncTargets: ["pc_node", "mobile_node"],
      mode: "adaptive",
      status: "WAITING_APPROVAL",
      approvalRequired: true
    });
    expect(dryRun.progressCallbacks.map((item) => item.status)).toEqual([
      "QUEUED",
      "ROUTING",
      "PLANNING",
      "WAITING_APPROVAL"
    ]);
    expect(dryRun.workerExecution.codex).toBe(false);
    expect(dryRun.workerExecution.antigravity).toBe(false);
  });

  it("parses one-line /hermes mission create syntax without executing it", () => {
    const dryRun = createAdaptiveCommandDryRun(
      {
        requestId: "one-line-mission",
        source: "telegram",
        command:
          '/hermes mission create --board fusion-team-ai --name "Fusion Team AI" --route "HERMES>CODEX>ANTIGRAVITY" --provider openrouter --sync "pc,mobile" --mode adaptive'
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("long_job_queued_dry_run");
    expect(dryRun.mission).toMatchObject({
      board: "fusion-team-ai",
      name: "Fusion Team AI",
      route: ["HERMES", "CODEX", "ANTIGRAVITY"],
      provider: "openrouter",
      syncTargets: ["pc_node", "mobile_node"],
      status: "WAITING_APPROVAL"
    });
    expect(dryRun.ack.text).toContain("Job ID");
    expect(dryRun.messageSent).toBe(false);
    expect(dryRun.providerCalled).toBe(false);
  });

  it("blocks execution, install, MCP, provider, message, deploy, push, and publish requests", () => {
    const dryRun = createAdaptiveCommandDryRun(
      {
        requestId: "dangerous",
        source: "telegram",
        command: "/hermes approve MISSION-001 and execute codex, start MCP, install package, call OpenRouter, send Telegram, deploy, push, publish"
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("blocked_dangerous_command");
    expect(dryRun.blockedReasons).toEqual(
      expect.arrayContaining([
        "agent_execution",
        "mcp_start",
        "package_install",
        "provider_call",
        "message_send",
        "deploy",
        "push",
        "publish"
      ])
    );
    expect(dryRun.canSendTelegram).toBe(false);
    expect(dryRun.canCallProvider).toBe(false);
    expect(dryRun.canExecuteAgents).toBe(false);
    expect(dryRun.commandExecuted).toBe(false);
  });

  it("classifies Night Watch WARN with exit code 0 as a non-blocking callback success", () => {
    const callback = classifyNightWatchCallback({
      exitCode: 0,
      output: [
        "Hermes night-watch latest log written to /Users/sirinx/sirinx-os/.hermes/logs/night-watch-latest.md",
        "### Final Status",
        "",
        "WARN"
      ].join("\n"),
      logPath: ".hermes/logs/night-watch-latest.md"
    });

    expect(callback.status).toBe("completed_with_warning");
    expect(callback.failed).toBe(false);
    expect(callback.telegramLevel).toBe("success_warning");
    expect(callback.finalStatus).toBe("WARN");
    expect(callback.logPath).toBe(".hermes/logs/night-watch-latest.md");
  });
});

describe("Hermes Adaptive Command Gateway API routes", () => {
  const port = 25000 + Math.floor(Math.random() * 1000);
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

    await waitForServer(`${baseUrl}/api/hermes-adaptive-command-gateway`);
  }, 10000);

  afterAll(() => {
    if (server && !server.killed) {
      server.kill("SIGTERM");
    }
  });

  it("serves gateway status without secret-like values", async () => {
    const response = await fetch(`${baseUrl}/api/hermes-adaptive-command-gateway`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("hermes-adaptive-command-gateway-ready-local-only");
    expect(body.messageSent).toBe(false);
    expect(body.providerCalled).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(secretLikePattern);
  });

  it("serves Telegram dry-run ACK and queue preview without sending messages", async () => {
    const response = await fetch(`${baseUrl}/api/hermes-adaptive-command-gateway/telegram/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requestId: "api-mission-route",
        source: "telegram",
        command: '/mission route "HERMES>CODEX>ANTIGRAVITY" --provider openrouter --sync pc,mobile --mode adaptive'
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("long_job_queued_dry_run");
    expect(body.ack.shouldRespondImmediately).toBe(true);
    expect(body.messageSent).toBe(false);
    expect(body.commandExecuted).toBe(false);
    expect(body.providerCalled).toBe(false);
    expect(body.canExecuteAgents).toBe(false);
  });

  it("fails closed for invalid JSON", async () => {
    const response = await fetch(`${baseUrl}/api/hermes-adaptive-command-gateway/telegram/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid-json"
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("invalid_hermes_adaptive_command_gateway_request");
    expect(body.commandExecuted).toBe(false);
    expect(body.messageSent).toBe(false);
    expect(body.canCallProvider).toBe(false);
    expect(body.canSendTelegram).toBe(false);
    expect(body.canExecuteAgents).toBe(false);
    expect(body.requiresHumanApproval).toBe(true);
  });
});
