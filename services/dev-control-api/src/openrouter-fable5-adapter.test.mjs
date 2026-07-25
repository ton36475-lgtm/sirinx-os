import { spawn } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  buildOpenRouterFable5RequestPreview,
  classifyOpenRouterFable5Error,
  createOpenRouterFable5AdapterDryRun,
  getOpenRouterFable5AdapterStatus,
  OPENROUTER_FABLE5_PROVIDER_CALL_APPROVAL,
  runOpenRouterFable5LiveSmoke
} from "./openrouter-fable5-adapter.mjs";
import { createProviderCallApprovalReceipt } from "./provider-call-exact-gate.mjs";

const fixedNow = () => new Date("2026-07-03T02:30:00.000Z");
const secretLikePattern = /sk-[A-Za-z0-9_-]{20,}|OPENROUTER_API_KEY\s*=\s*[^"'\s]{12,}/;
const approvalSigningKey = "test-only-provider-approval-signing-key-2026";

function providerReceipt(requestId, maxTokens = 64, model = "anthropic/claude-fable-5") {
  return createProviderCallApprovalReceipt({
    receiptId: `provider-receipt-${requestId}`,
    commandId: "openrouter_fable5_live_smoke",
    requestId,
    provider: "OpenRouter",
    model,
    maxTokens,
    requestedBy: "codex_build_captain",
    approvedBy: "hermes_commander",
    exactGate: OPENROUTER_FABLE5_PROVIDER_CALL_APPROVAL,
    budgetConfirmed: true,
    issuedAt: "2026-07-03T02:25:00.000Z",
    expiresAt: "2026-07-03T02:35:00.000Z"
  }, { signingKey: approvalSigningKey });
}

function providerGateOptions(requestId, maxTokens = 64) {
  return {
    exactGate: OPENROUTER_FABLE5_PROVIDER_CALL_APPROVAL,
    approvalReceipt: providerReceipt(requestId, maxTokens),
    approvalSigningKey,
    allowProvidedReceiptObject: true,
    consumeReceipt: async () => true,
    now: fixedNow
  };
}

describe("OpenRouter Fable5 Adapter policy", () => {
  it("exposes the locked Fable5 policy without enabling provider calls", () => {
    const status = getOpenRouterFable5AdapterStatus({ now: fixedNow });

    expect(status.status).toBe("openrouter-fable5-adapter-ready-local-only");
    expect(status.provider).toBe("OpenRouter");
    expect(status.endpoint).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(status.model.primary).toBe("anthropic/claude-fable-5");
    expect(status.model.codexProfile).toBe("fable5");
    expect(status.quotaPolicy.defaultRoute).toBe(false);
    expect(status.quotaPolicy.repeatedPolling).toBe(false);
    expect(status.gates.providerCall.status).toBe("closed");
    expect(status.gates.providerCall.requiredApproval).toBe("APPROVE_OPENROUTER_FABLE5_PROVIDER_CALL_A019E53EE");
    expect(status.providerCalled).toBe(false);
    expect(status.secretsRead).toBe(false);
    expect(status.canCallPaidApi).toBe(false);
    expect(status.commandExecuted).toBe(false);
    expect(status.requiresHumanApproval).toBe(true);
    expect(JSON.stringify(status)).not.toMatch(secretLikePattern);
  });

  it("builds request previews without secrets or provider execution", () => {
    const preview = buildOpenRouterFable5RequestPreview({
      goal: "Plan Hermes Telegram Fable5 routing.",
      max_tokens: 3072,
      temperature: 0.1
    });

    expect(preview.endpoint).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(preview.body).toMatchObject({
      model: "anthropic/claude-fable-5",
      temperature: 0.1,
      max_tokens: 3072,
      stream: false
    });
    expect(preview.headersPreview.authorization).toBe(
      "Bearer env:OpenRouterApiKey (legacy OPENROUTER_API_KEY accepted; not read in dry-run)"
    );
    expect(preview.providerCalled).toBe(false);
    expect(preview.secretsRead).toBe(false);
    expect(JSON.stringify(preview)).not.toMatch(secretLikePattern);
  });

  it("returns dry-run evidence without calling fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dryRun = createOpenRouterFable5AdapterDryRun(
      {
        requestId: "openrouter-fable5-test",
        goal: "Configure Hermes Telegram routing for Fable5 preview."
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("dry-run-openrouter-fable5-adapter-ready");
    expect(dryRun.requestId).toBe("openrouter-fable5-test");
    expect(dryRun.providerCalled).toBe(false);
    expect(dryRun.secretsRead).toBe(false);
    expect(dryRun.canCallPaidApi).toBe(false);
    expect(dryRun.commandExecuted).toBe(false);
    expect(dryRun.requestPreview.body.model).toBe("anthropic/claude-fable-5");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(JSON.stringify(dryRun)).not.toMatch(secretLikePattern);

    fetchSpy.mockRestore();
  });

  it("blocks dangerous dry-run goals before request preview creation", () => {
    const dryRun = createOpenRouterFable5AdapterDryRun(
      {
        goal: "install packages, read OpenRouter API key, call provider, send Telegram, deploy, push, run fable"
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("blocked-openrouter-fable5-adapter-dry-run");
    expect(dryRun.blockedReasons).toEqual(
      expect.arrayContaining([
        "package_install",
        "secret_read_or_print",
        "paid_api_call",
        "customer_message_send",
        "deploy",
        "push"
      ])
    );
    expect(dryRun.requestPreview).toBe(null);
    expect(dryRun.providerCalled).toBe(false);
    expect(dryRun.canCallPaidApi).toBe(false);
    expect(dryRun.commandExecuted).toBe(false);
  });

  it("classifies OpenRouter Fable5 provider failures deterministically", () => {
    expect(classifyOpenRouterFable5Error(400)).toBe("BAD_REQUEST");
    expect(classifyOpenRouterFable5Error(401)).toBe("AUTH_ERROR_INVALID_KEY");
    expect(classifyOpenRouterFable5Error(402)).toBe("BILLING_ERROR_NO_CREDIT");
    expect(classifyOpenRouterFable5Error(403)).toBe("POLICY_OR_PROVIDER_FORBIDDEN");
    expect(classifyOpenRouterFable5Error(404)).toBe("MODEL_NOT_FOUND_OR_BAD_SLUG");
    expect(classifyOpenRouterFable5Error(429)).toBe("RATE_LIMITED");
    expect(classifyOpenRouterFable5Error(500)).toBe("PROVIDER_OR_GATEWAY_ERROR");
  });

  it("blocks live smoke before secret access when the approval receipt is missing", async () => {
    const fetchImpl = vi.fn();
    const result = await runOpenRouterFable5LiveSmoke(
      { requestId: "missing-key-live-smoke" },
      { envPath: "/tmp/sirinx-missing-openrouter-env", fetchImpl, now: fixedNow }
    );

    expect(result.status).toBe("blocked-openrouter-fable5-live-smoke");
    expect(result.providerCalled).toBe(false);
    expect(result.providerAttemptCount).toBe(0);
    expect(result.retryPolicy.retryAllowed).toBe(false);
    expect(result.secretsRead).toBe(false);
    expect(result.blockedReason).toBe("missing_exact_provider_call_approval");
    expect(result.keyValuePrinted).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(secretLikePattern);
  });

  it("checks credentials only after a target-bound provider receipt passes", async () => {
    const requestId = "missing-key-after-provider-gate";
    const fetchImpl = vi.fn();
    const result = await runOpenRouterFable5LiveSmoke(
      { requestId, max_tokens: 64 },
      {
        ...providerGateOptions(requestId),
        envPath: "/tmp/sirinx-missing-openrouter-env",
        fetchImpl
      }
    );

    expect(result.status).toBe("blocked-openrouter-fable5-live-smoke");
    expect(result.approvalGate.authorized).toBe(true);
    expect(result.providerCalled).toBe(false);
    expect(result.secretsRead).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("runs a bounded live smoke through an injected fetch implementation", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          id: "gen-fable5-test",
          model: "anthropic/claude-fable-5",
          choices: [
            {
              finish_reason: "stop",
              message: { content: "{\"status\":\"ok\",\"model_route\":\"fable5\"}" }
            }
          ],
          usage: { prompt_tokens: 9, completion_tokens: 7, total_tokens: 16 }
        })
    });
    const result = await runOpenRouterFable5LiveSmoke(
      {
        requestId: "injected-fable5-live-smoke",
        goal: "Return compact JSON only.",
        max_tokens: 64
      },
      { apiKey: "test-key", fetchImpl, ...providerGateOptions("injected-fable5-live-smoke") }
    );
    const request = JSON.parse(fetchImpl.mock.calls[0][1].body);

    expect(result.status).toBe("passed-openrouter-fable5-live-smoke");
    expect(result.providerCalled).toBe(true);
    expect(result.providerAttemptCount).toBe(1);
    expect(result.retryPolicy.retryAllowed).toBe(false);
    expect(result.keyValuePrinted).toBe(false);
    expect(request.model).toBe("anthropic/claude-fable-5");
    expect(request.max_tokens).toBe(64);
    expect(result.response.usage.total_tokens).toBe(16);
    expect(JSON.stringify(result)).not.toMatch(secretLikePattern);
  });

  it("fails closed on provider 5xx without retrying or leaking secrets", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => JSON.stringify({ error: { message: "provider temporarily unavailable" } })
    });
    const result = await runOpenRouterFable5LiveSmoke(
      {
        requestId: "injected-fable5-5xx",
        goal: "Return compact JSON only.",
        max_tokens: 64
      },
      { apiKey: "test-key", fetchImpl, ...providerGateOptions("injected-fable5-5xx") }
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("failed-openrouter-fable5-live-smoke");
    expect(result.providerCalled).toBe(true);
    expect(result.providerAttemptCount).toBe(1);
    expect(result.errorClass).toBe("PROVIDER_OR_GATEWAY_ERROR");
    expect(result.retryPolicy).toMatchObject({
      maxProviderAttempts: 1,
      retryAllowed: false,
      repeatedRetryBlocked: true,
      retryAfterFailure: false
    });
    expect(result.nextRecommendedAction).toContain("Do not retry automatically");
    expect(JSON.stringify(result)).not.toMatch(secretLikePattern);
  });

  it("fails closed on fetch/network errors without retrying", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    const result = await runOpenRouterFable5LiveSmoke(
      {
        requestId: "injected-fable5-network-error",
        goal: "Return compact JSON only.",
        max_tokens: 64
      },
      { apiKey: "test-key", fetchImpl, ...providerGateOptions("injected-fable5-network-error") }
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("failed-openrouter-fable5-live-smoke");
    expect(result.errorClass).toBe("NETWORK_OR_FETCH_ERROR");
    expect(result.providerAttemptCount).toBe(1);
    expect(result.retryPolicy.retryAllowed).toBe(false);
    expect(result.nextRecommendedAction).toContain("Do not retry automatically");
    expect(JSON.stringify(result)).not.toMatch(secretLikePattern);
  });
});

describe("OpenRouter Fable5 Adapter API routes", () => {
  const port = 24000 + Math.floor(Math.random() * 1000);
  const baseUrl = `http://127.0.0.1:${port}`;
  let server;

  beforeAll(async () => {
    server = spawn("node", ["services/dev-control-api/server.mjs"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DEV_CONTROL_API_PORT: String(port),
        DEV_CONTROL_API_HOST: "127.0.0.1",
        HERMES_PROFILE_ENV_PATH: "/tmp/sirinx-openrouter-fable5-test-missing-env"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    await waitForServer(`${baseUrl}/api/openrouter-fable5-adapter`);
  }, 10000);

  afterAll(() => {
    if (server && !server.killed) {
      server.kill("SIGTERM");
    }
  });

  it("serves adapter status without secret-like values", async () => {
    const response = await fetch(`${baseUrl}/api/openrouter-fable5-adapter`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("openrouter-fable5-adapter-ready-local-only");
    expect(body.model.primary).toBe("anthropic/claude-fable-5");
    expect(body.canCallPaidApi).toBe(false);
    expect(body.secretsRead).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(secretLikePattern);
  });

  it("serves dry-run planning without provider execution", async () => {
    const response = await fetch(`${baseUrl}/api/openrouter-fable5-adapter/plan/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requestId: "api-openrouter-fable5-test",
        goal: "Configure Hermes Telegram routing for Fable5 preview."
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("dry-run-openrouter-fable5-adapter-ready");
    expect(body.providerCalled).toBe(false);
    expect(body.secretsRead).toBe(false);
    expect(body.canCallPaidApi).toBe(false);
    expect(body.requestPreview.body.model).toBe("anthropic/claude-fable-5");
  });

  it("fails closed on invalid dry-run JSON", async () => {
    const response = await fetch(`${baseUrl}/api/openrouter-fable5-adapter/plan/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid-json"
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      status: "invalid_openrouter_fable5_adapter_dry_run_request",
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

  it("serves a bounded smoke endpoint that requires exact approval before secret or provider access", async () => {
    const response = await fetch(`${baseUrl}/api/openrouter-fable5-adapter/smoke`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requestId: "api-openrouter-fable5-smoke",
        goal: "Return compact JSON only."
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("blocked-openrouter-fable5-live-smoke");
    expect(body.blockedReason).toBe("missing_exact_provider_call_approval");
    expect(body.requiredApproval).toBe("APPROVE_OPENROUTER_FABLE5_PROVIDER_CALL_A019E53EE");
    expect(body.providerAttemptCount).toBe(0);
    expect(body.retryPolicy.retryAllowed).toBe(false);
    expect(body.providerCalled).toBe(false);
    expect(body.secretsRead).toBe(false);
    expect(body.keyValuePrinted).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(secretLikePattern);
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

  throw new Error(`Timed out waiting for ${url}`);
}
