import { spawn } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  buildOpenRouterFusionRequestPreview,
  createOpenRouterFusionRouterDryRun,
  getOpenRouterFusionRouterStatus,
  normalizeFusionRouterConfig
} from "./openrouter-fusion-router.mjs";

const fixedNow = () => new Date("2026-06-15T12:00:00.000Z");
const secretLikePattern = /sk-[A-Za-z0-9_-]{20,}|OPENROUTER_API_KEY\s*=\s*[^"'\s]{12,}/;

describe("OpenRouter Fusion Router policy", () => {
  it("exposes local-only Fusion Router status without enabling provider calls", () => {
    const status = getOpenRouterFusionRouterStatus({ now: fixedNow });

    expect(status.status).toBe("openrouter-fusion-router-ready-local-only");
    expect(status.mode).toBe("request-preview-and-approval-only");
    expect(status.provider).toBe("OpenRouter");
    expect(status.endpoint).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(status.model).toBe("openrouter/fusion");
    expect(status.panel.count).toBeGreaterThan(0);
    expect(status.panel.count).toBeLessThanOrEqual(8);
    expect(status.judge.model).toBe("~openai/gpt-latest");
    expect(status.parameters.max_tool_calls).toBe(8);
    expect(status.providerCalled).toBe(false);
    expect(status.secretsRead).toBe(false);
    expect(status.canCallPaidApi).toBe(false);
    expect(status.canRunMcp).toBe(false);
    expect(status.commandExecuted).toBe(false);
    expect(status.requiresHumanApproval).toBe(true);
    expect(status.thClawsReadiness).toMatchObject({
      requiredVersion: "0.61.0",
      localObservedVersion: "0.8.8",
      status: "upgrade-required-before-claiming-live-thclaws-fusion-support"
    });
    expect(JSON.stringify(status)).not.toMatch(secretLikePattern);
  });

  it("builds plugin-mode request previews without secrets", () => {
    const preview = buildOpenRouterFusionRequestPreview({
      goal: "Review GhostClaw Fusion Mode architecture",
      analysis_models: ["~anthropic/claude-opus-latest", "~openai/gpt-latest"],
      model: "~google/gemini-pro-latest",
      max_tool_calls: 4,
      max_completion_tokens: 2048,
      temperature: 0.1,
      reasoning: { effort: "medium", max_tokens: 1536 }
    });

    expect(preview).toMatchObject({
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      method: "POST",
      entrypoint: "plugin",
      providerCalled: false,
      secretsRead: false
    });
    expect(preview.body.model).toBe("openrouter/fusion");
    expect(preview.body.plugins).toEqual([
      {
        id: "fusion",
        analysis_models: ["~anthropic/claude-opus-latest", "~openai/gpt-latest"],
        model: "~google/gemini-pro-latest",
        max_tool_calls: 4,
        enabled: true,
        max_completion_tokens: 2048,
        reasoning: { effort: "medium", max_tokens: 1536 },
        temperature: 0.1
      }
    ]);
    expect(JSON.stringify(preview)).not.toMatch(secretLikePattern);
  });

  it("builds server-tool request previews for clients that expose Fusion as a tool", () => {
    const preview = buildOpenRouterFusionRequestPreview({
      entrypoint: "server-tool",
      outerModel: "~openai/gpt-latest",
      goal: "Compare plan options",
      analysis_models: ["~anthropic/claude-opus-latest", "~google/gemini-pro-latest"],
      model: "~openai/gpt-latest",
      forceFusion: true
    });

    expect(preview.entrypoint).toBe("server-tool");
    expect(preview.body.model).toBe("~openai/gpt-latest");
    expect(preview.body.tools).toEqual([
      {
        type: "openrouter:fusion",
        parameters: {
          analysis_models: ["~anthropic/claude-opus-latest", "~google/gemini-pro-latest"],
          model: "~openai/gpt-latest",
          max_tool_calls: 8
        }
      }
    ]);
    expect(preview.body.tool_choice).toBe("required");
    expect(preview.providerCalled).toBe(false);
  });

  it("caps panel models at OpenRouter's eight-model limit", () => {
    const config = normalizeFusionRouterConfig({
      analysis_models: [
        "model/1",
        "model/2",
        "model/3",
        "model/4",
        "model/5",
        "model/6",
        "model/7",
        "model/8",
        "model/9",
        "model/10"
      ]
    });

    expect(config.plugin.analysis_models).toHaveLength(8);
    expect(config.validation.errors).toEqual(["analysis_models_exceeds_openrouter_limit_8"]);
  });

  it("returns dry-run evidence without calling fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dryRun = createOpenRouterFusionRouterDryRun(
      {
        requestId: "openrouter-fusion-test",
        goal: "Create a safe agent loop design",
        analysis_models: ["~anthropic/claude-opus-latest", "~openai/gpt-latest"],
        model: "~google/gemini-pro-latest"
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("dry-run-openrouter-fusion-router-ready");
    expect(dryRun.requestId).toBe("openrouter-fusion-test");
    expect(dryRun.providerCalled).toBe(false);
    expect(dryRun.secretsRead).toBe(false);
    expect(dryRun.keyValuePrinted).toBe(false);
    expect(dryRun.canCallPaidApi).toBe(false);
    expect(dryRun.commandExecuted).toBe(false);
    expect(dryRun.requestPreview.body.plugins[0].analysis_models).toEqual([
      "~anthropic/claude-opus-latest",
      "~openai/gpt-latest"
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(JSON.stringify(dryRun)).not.toMatch(secretLikePattern);

    fetchSpy.mockRestore();
  });

  it("blocks dangerous dry-run goals before request preview creation", () => {
    const dryRun = createOpenRouterFusionRouterDryRun(
      {
        goal: "install packages, start MCP, read OpenRouter API key, call provider, send Telegram, deploy, push, publish"
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("blocked-openrouter-fusion-router-dry-run");
    expect(dryRun.blockedReasons).toEqual(
      expect.arrayContaining([
        "package_install",
        "real_mcp_execution",
        "secret_read_or_print",
        "paid_api_call",
        "customer_message_send",
        "deploy",
        "push",
        "publish"
      ])
    );
    expect(dryRun.requestPreview).toBe(null);
    expect(dryRun.providerCalled).toBe(false);
    expect(dryRun.canCallPaidApi).toBe(false);
    expect(dryRun.commandExecuted).toBe(false);
  });
});

describe("OpenRouter Fusion Router API routes", () => {
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

    await waitForServer(`${baseUrl}/api/openrouter-fusion-router`);
  }, 10000);

  afterAll(() => {
    if (server && !server.killed) {
      server.kill("SIGTERM");
    }
  });

  it("serves Fusion Router status without secret-like values", async () => {
    const response = await fetch(`${baseUrl}/api/openrouter-fusion-router`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("openrouter-fusion-router-ready-local-only");
    expect(body.model).toBe("openrouter/fusion");
    expect(body.panel.count).toBeLessThanOrEqual(8);
    expect(body.canCallPaidApi).toBe(false);
    expect(body.secretsRead).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(secretLikePattern);
  });

  it("serves dry-run planning without provider execution", async () => {
    const response = await fetch(`${baseUrl}/api/openrouter-fusion-router/plan/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requestId: "api-openrouter-fusion-test",
        goal: "Create a safe model council request preview",
        analysis_models: ["~anthropic/claude-opus-latest", "~openai/gpt-latest"],
        model: "~google/gemini-pro-latest"
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("dry-run-openrouter-fusion-router-ready");
    expect(body.providerCalled).toBe(false);
    expect(body.secretsRead).toBe(false);
    expect(body.keyValuePrinted).toBe(false);
    expect(body.canCallPaidApi).toBe(false);
    expect(body.requestPreview.body.plugins[0].id).toBe("fusion");
  });

  it("fails closed on invalid dry-run JSON", async () => {
    const response = await fetch(`${baseUrl}/api/openrouter-fusion-router/plan/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid-json"
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      status: "invalid_openrouter_fusion_router_dry_run_request",
      externalWrites: false,
      canCallPaidApi: false,
      canRunMcp: false,
      canReadSecrets: false,
      providerCalled: false,
      secretsRead: false,
      keyValuePrinted: false,
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
