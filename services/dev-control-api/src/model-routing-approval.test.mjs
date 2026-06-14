import { spawn } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createOpenRouterQwenModelRoutingApprovalDryRun,
  getOpenRouterQwenModelRoutingApproval
} from "./model-routing-approval.mjs";

const fixedNow = () => new Date("2026-05-27T13:30:00.000Z");
const secretLikePattern = /sk-[A-Za-z0-9_-]{20,}|OPENROUTER_API_KEY\s*=\s*[^"'\s]{12,}/;

describe("OpenRouter Qwen model routing approval gate", () => {
  it("returns a local-only approval packet without provider execution", () => {
    const status = getOpenRouterQwenModelRoutingApproval({ now: fixedNow });

    expect(status.status).toBe("openrouter-qwen-model-routing-approval-ready-local-only");
    expect(status.approvalId).toBe("openrouter-qwen-model-routing");
    expect(status.modelSlugLocked).toBe("qwen/qwen3.7-max");
    expect(status.fallbackSlugLocked).toBe("qwen/qwen3-max");
    expect(status.providerCalled).toBe(false);
    expect(status.commandExecuted).toBe(false);
    expect(status.secretsRead).toBe(false);
    expect(status.keyValuePrinted).toBe(false);
    expect(status.canCallPaidApi).toBe(false);
    expect(status.futureSmokeCall.requiresSeparateApproval).toBe(true);
    expect(status.evidenceChecklist.map((item) => item.id)).toEqual([
      "model_slug_locked",
      "fallback_slug_locked",
      "paid_api_blocked",
      "key_value_never_printed",
      "zdr_policy_reviewed",
      "json_policy_reviewed",
      "cache_policy_reviewed",
      "one_future_smoke_requires_approval"
    ]);
    expect(status.stopPoint).toBe("OPENROUTER QWEN MODEL ROUTING APPROVAL READY - NO PROVIDER CALL TAKEN");
    expect(JSON.stringify(status)).not.toMatch(secretLikePattern);
  });

  it("returns dry-run approval evidence without creating a non-dry-run provider path", () => {
    const dryRun = createOpenRouterQwenModelRoutingApprovalDryRun(
      {
        requestId: "model-routing-approval-test",
        goal: "prepare one future qwen smoke approval"
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("dry-run-openrouter-qwen-model-routing-approval-ready");
    expect(dryRun.requestId).toBe("model-routing-approval-test");
    expect(dryRun.providerCalled).toBe(false);
    expect(dryRun.commandExecuted).toBe(false);
    expect(dryRun.secretsRead).toBe(false);
    expect(dryRun.keyValuePrinted).toBe(false);
    expect(dryRun.canCallPaidApi).toBe(false);
    expect(dryRun.approvalPacket.path).toBe("docs/approvals/OPENROUTER_QWEN_MODEL_ROUTING_APPROVAL.md");
    expect(dryRun.futureSmokeCall).toMatchObject({
      provider: "OpenRouter",
      model: "qwen/qwen3.7-max",
      fallback: "qwen/qwen3-max",
      commandExecuted: false,
      providerCalled: false,
      requiresSeparateApproval: true
    });
    expect(JSON.stringify(dryRun)).not.toMatch(secretLikePattern);
  });

  it("blocks dangerous routing goals", () => {
    const dryRun = createOpenRouterQwenModelRoutingApprovalDryRun(
      {
        goal: "read OpenRouter API key, call provider, spend credits, deploy, push, publish, send telegram"
      },
      { now: fixedNow }
    );

    expect(dryRun.status).toBe("blocked-openrouter-qwen-model-routing-approval");
    expect(dryRun.blockedReasons).toEqual(
      expect.arrayContaining([
        "secret_read_or_print",
        "paid_api_call",
        "provider_credit_spend",
        "deploy",
        "push",
        "publish",
        "customer_message_send"
      ])
    );
    expect(dryRun.providerCalled).toBe(false);
    expect(dryRun.canCallPaidApi).toBe(false);
    expect(dryRun.commandExecuted).toBe(false);
  });
});

describe("OpenRouter Qwen model routing approval API routes", () => {
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

    await waitForServer(`${baseUrl}/api/model-routing-approval/openrouter-qwen`);
  }, 10000);

  afterAll(() => {
    if (server && !server.killed) {
      server.kill("SIGTERM");
    }
  });

  it("serves approval status without secret-like values", async () => {
    const response = await fetch(`${baseUrl}/api/model-routing-approval/openrouter-qwen`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("openrouter-qwen-model-routing-approval-ready-local-only");
    expect(body.modelSlugLocked).toBe("qwen/qwen3.7-max");
    expect(body.canCallPaidApi).toBe(false);
    expect(body.providerCalled).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(secretLikePattern);
  });

  it("serves dry-run approval without provider execution", async () => {
    const response = await fetch(`${baseUrl}/api/model-routing-approval/openrouter-qwen/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requestId: "api-model-routing-approval",
        goal: "prepare one future qwen smoke approval"
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("dry-run-openrouter-qwen-model-routing-approval-ready");
    expect(body.providerCalled).toBe(false);
    expect(body.commandExecuted).toBe(false);
    expect(body.secretsRead).toBe(false);
    expect(body.approvalPacket.path).toBe("docs/approvals/OPENROUTER_QWEN_MODEL_ROUTING_APPROVAL.md");
  });

  it("fails closed on invalid dry-run JSON", async () => {
    const response = await fetch(`${baseUrl}/api/model-routing-approval/openrouter-qwen/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid-json"
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      status: "invalid_openrouter_qwen_model_routing_approval_request",
      canCallPaidApi: false,
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
