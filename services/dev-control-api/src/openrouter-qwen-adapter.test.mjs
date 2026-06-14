import { spawn } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  buildOpenRouterQwenRequestPreview,
  classifyOpenRouterError,
  createOpenRouterQwenAdapterDryRun,
  getOpenRouterQwenAdapterStatus,
  isPromptCacheEligible
} from "./openrouter-qwen-adapter.mjs";

const fixedNow = () => new Date("2026-05-27T12:00:00.000Z");
const secretLikePattern = /sk-[A-Za-z0-9_-]{20,}|OPENROUTER_API_KEY\s*=\s*[^"'\s]{12,}/;

describe("OpenRouter Qwen Adapter policy", () => {
  it("exposes the locked Qwen 3.7 Max policy without enabling provider calls", () => {
    const status = getOpenRouterQwenAdapterStatus({ now: fixedNow });

    expect(status.status).toBe("openrouter-qwen-adapter-ready-local-only");
    expect(status.provider).toBe("OpenRouter");
    expect(status.endpoint).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(status.model.primary).toBe("qwen/qwen3.7-max");
    expect(status.model.fallback).toBe("qwen/qwen3-max");
    expect(status.defaultPolicy).toMatchObject({
      temperature: 0.2,
      maxTokens: 4096
    });
    expect(status.sensitivePolicy.provider).toEqual({ zdr: true });
    expect(status.jsonPolicy.response_format).toEqual({ type: "json_object" });
    expect(status.providerCalled).toBe(false);
    expect(status.secretsRead).toBe(false);
    expect(status.canCallPaidApi).toBe(false);
    expect(status.commandExecuted).toBe(false);
    expect(status.requiresHumanApproval).toBe(true);
    expect(status.stopPoint).toBe("OPENROUTER QWEN ADAPTER READY - LOCAL ONLY - WAITING FOR MODEL ROUTING APPROVAL");
    expect(JSON.stringify(status)).not.toMatch(secretLikePattern);
  });

  it("builds JSON strict ZDR fallback request previews without secrets", () => {
    const preview = buildOpenRouterQwenRequestPreview({
      goal: "plan Hermes routing with Qwen 3.7 Max",
      mode: "jsonStrict",
      sensitivity: "internal_repo_analysis",
      stableContext: [
        { id: "repo-map", role: "stable_context", text: "SIRINX repo map and local policy summary." },
        { id: "secret", role: "stable_context", text: "OpenRouter API key placeholder should never be cached" },
        { id: "latest", role: "latest_user_command", text: "Use this exact latest user request." }
      ]
    });

    expect(preview.body).toMatchObject({
      models: ["qwen/qwen3.7-max", "qwen/qwen3-max"],
      temperature: 0.05,
      max_tokens: 3000,
      stream: false,
      response_format: { type: "json_object" },
      provider: { zdr: true }
    });
    expect(preview.providerCalled).toBe(false);
    expect(preview.secretsRead).toBe(false);
    expect(preview.cacheReport.accepted.map((item) => item.id)).toEqual(["repo-map"]);
    expect(preview.cacheReport.rejected.map((item) => item.id)).toEqual(["secret", "latest"]);
    expect(JSON.stringify(preview)).not.toMatch(secretLikePattern);
  });

  it("rejects prompt-cache inputs that include secrets, runtime logs, credentials, or latest user commands", () => {
    expect(isPromptCacheEligible({ id: "stable", role: "stable_context", text: "Architecture policy." })).toMatchObject({
      eligible: true,
      reasons: []
    });
    expect(isPromptCacheEligible({ id: "secret", role: "stable_context", text: "secret token placeholder should never be cached" })).toMatchObject({
      eligible: false,
      reasons: expect.arrayContaining(["secret_like_content"])
    });
    expect(isPromptCacheEligible({ id: "runtime", role: "stable_context", text: "ERROR fetch failed stack trace at runtime" })).toMatchObject({
      eligible: false,
      reasons: expect.arrayContaining(["runtime_log_content"])
    });
    expect(isPromptCacheEligible({ id: "credential", role: "stable_context", text: "private credential password value" })).toMatchObject({
      eligible: false,
      reasons: expect.arrayContaining(["credential_content"])
    });
    expect(isPromptCacheEligible({ id: "latest", role: "latest_user_command", text: "Do the latest thing." })).toMatchObject({
      eligible: false,
      reasons: expect.arrayContaining(["latest_user_command"])
    });
  });

  it("classifies OpenRouter failures deterministically", () => {
    expect(classifyOpenRouterError(401)).toBe("AUTH_ERROR_INVALID_KEY");
    expect(classifyOpenRouterError(402)).toBe("BILLING_ERROR_NO_CREDIT");
    expect(classifyOpenRouterError(403)).toBe("POLICY_OR_PROVIDER_FORBIDDEN");
    expect(classifyOpenRouterError(404)).toBe("MODEL_NOT_FOUND_OR_BAD_SLUG");
    expect(classifyOpenRouterError(429)).toBe("RATE_LIMITED");
    expect(classifyOpenRouterError(500)).toBe("PROVIDER_OR_GATEWAY_ERROR");
    expect(classifyOpenRouterError(418)).toBe("UNKNOWN_OPENROUTER_ERROR");
  });

  it("returns dry-run evidence without calling fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dryRun = createOpenRouterQwenAdapterDryRun(
      {
        requestId: "openrouter-qwen-test",
        goal: "plan Hermes routing with Qwen 3.7 Max",
        mode: "jsonStrict",
        sensitivity: "internal_repo_analysis"
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("dry-run-openrouter-qwen-adapter-ready");
    expect(dryRun.requestId).toBe("openrouter-qwen-test");
    expect(dryRun.providerCalled).toBe(false);
    expect(dryRun.secretsRead).toBe(false);
    expect(dryRun.canCallPaidApi).toBe(false);
    expect(dryRun.commandExecuted).toBe(false);
    expect(dryRun.requestPreview.body.models).toEqual(["qwen/qwen3.7-max", "qwen/qwen3-max"]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(JSON.stringify(dryRun)).not.toMatch(secretLikePattern);

    fetchSpy.mockRestore();
  });

  it("blocks dangerous dry-run goals before request preview creation", () => {
    const dryRun = createOpenRouterQwenAdapterDryRun(
      {
        goal: "install packages, start MCP, read OpenRouter API key, call provider, send messages, deploy, push, publish"
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("blocked-openrouter-qwen-adapter-dry-run");
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

describe("OpenRouter Qwen Adapter API routes", () => {
  const port = 22000 + Math.floor(Math.random() * 1000);
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

    await waitForServer(`${baseUrl}/api/openrouter-qwen-adapter`);
  }, 10000);

  afterAll(() => {
    if (server && !server.killed) {
      server.kill("SIGTERM");
    }
  });

  it("serves adapter status without secret-like values", async () => {
    const response = await fetch(`${baseUrl}/api/openrouter-qwen-adapter`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("openrouter-qwen-adapter-ready-local-only");
    expect(body.model.primary).toBe("qwen/qwen3.7-max");
    expect(body.canCallPaidApi).toBe(false);
    expect(body.secretsRead).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(secretLikePattern);
  });

  it("serves dry-run planning without provider execution", async () => {
    const response = await fetch(`${baseUrl}/api/openrouter-qwen-adapter/plan/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requestId: "api-openrouter-qwen-test",
        goal: "plan Hermes routing with Qwen 3.7 Max",
        mode: "jsonStrict",
        sensitivity: "internal_repo_analysis"
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("dry-run-openrouter-qwen-adapter-ready");
    expect(body.providerCalled).toBe(false);
    expect(body.secretsRead).toBe(false);
    expect(body.canCallPaidApi).toBe(false);
    expect(body.requestPreview.body.models).toEqual(["qwen/qwen3.7-max", "qwen/qwen3-max"]);
  });

  it("fails closed on invalid dry-run JSON", async () => {
    const response = await fetch(`${baseUrl}/api/openrouter-qwen-adapter/plan/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid-json"
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      status: "invalid_openrouter_qwen_adapter_dry_run_request",
      externalWrites: false,
      canCallPaidApi: false,
      canRunMcp: false,
      canReadSecrets: false,
      providerCalled: false,
      secretsRead: false,
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
