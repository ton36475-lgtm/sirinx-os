import { spawn } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createLatentmasBenchDryRun, getLatentmasStatus } from "./latentmas-status.mjs";

const fixedNow = () => new Date("2026-06-29T03:15:00.000Z");

describe("LatentMAS status contract", () => {
  it("reports dry-run status without executing inference or touching a real gateway", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }));

    const status = await getLatentmasStatus({
      now: fixedNow,
      rustBin: "/tmp/missing-katgpt-latentmas",
      pythonBackend: "/tmp/missing-latentmas-python",
      gatewayUrl: "http://127.0.0.1:3700",
      liveEnabled: false,
      fetchImpl,
      gatewayTimeoutMs: 50
    });

    expect(status.subsystem).toBe("latentmas");
    expect(status.srl).toBe("SRL-2");
    expect(status.mode).toBe("dry-run");
    expect(status.dry_run).toBe(true);
    expect(status.live_enabled).toBe(false);
    expect(status.gateway.alive).toBe(true);
    expect(status.externalWrites).toBe(false);
    expect(status.providerCalled).toBe(false);
    expect(status.commandExecuted).toBe(false);
    expect(status.canReadSecrets).toBe(false);
    expect(status.canRunGpuInference).toBe(false);
    expect(status.canDeploy).toBe(false);
    expect(status.requiresHumanApproval).toBe(true);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("creates a bounded benchmark dry-run preview without running commands", () => {
    const dryRun = createLatentmasBenchDryRun(
      {
        requestId: "latentmas-bench-test",
        model: "Qwen/Qwen3-4B-Instruct",
        dataset: "benchmarks/gsm8k_small.jsonl",
        debug: true,
        output: "runs/test.jsonl"
      },
      {
        now: fixedNow,
        liveEnabled: false
      }
    );

    expect(dryRun.status).toBe("dry-run-latentmas-bench-ready");
    expect(dryRun.requestId).toBe("latentmas-bench-test");
    expect(dryRun.commandExecuted).toBe(false);
    expect(dryRun.providerCalled).toBe(false);
    expect(dryRun.externalWrites).toBe(false);
    expect(dryRun.canReadSecrets).toBe(false);
    expect(dryRun.canRunGpuInference).toBe(false);
    expect(dryRun.canDeploy).toBe(false);
    expect(dryRun.requiresHumanApproval).toBe(true);
    expect(dryRun.blocked_by).toEqual(["LATENTMAS_LIVE_ENABLED=false"]);
    expect(dryRun.would_run).toContain("katgpt-latentmas bench");
    expect(dryRun.would_run).toContain("--debug");
    expect(dryRun.would_run).toContain("--out runs/test.jsonl");
  });

  it("keeps the dry-run preview approval-gated even if live mode is requested", () => {
    const dryRun = createLatentmasBenchDryRun(
      {
        requestId: "latentmas-live-request",
        model: "Qwen/Qwen3-4B-Instruct"
      },
      {
        now: fixedNow,
        liveEnabled: true
      }
    );

    expect(dryRun.status).toBe("dry-run-latentmas-bench-ready");
    expect(dryRun.commandExecuted).toBe(false);
    expect(dryRun.canRunGpuInference).toBe(false);
    expect(dryRun.requiresHumanApproval).toBe(true);
    expect(dryRun.blocked_by).toEqual(["benchmark_requires_explicit_runtime_approval"]);
  });
});

describe("LatentMAS API routes", () => {
  const port = 23200 + Math.floor(Math.random() * 1000);
  const baseUrl = `http://127.0.0.1:${port}`;
  let server;

  beforeAll(async () => {
    server = spawn("node", ["services/dev-control-api/server.mjs"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DEV_CONTROL_API_PORT: String(port),
        DEV_CONTROL_API_HOST: "127.0.0.1",
        LATENTMAS_BIN: "/tmp/missing-katgpt-latentmas",
        LATENTMAS_PYTHON_PATH: "/tmp/missing-latentmas-python",
        LATENTMAS_GATEWAY_URL: "http://127.0.0.1:1",
        LATENTMAS_LIVE_ENABLED: "false"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    await waitForServer(`${baseUrl}/api/latentmas`);
  }, 10000);

  afterAll(() => {
    if (server && !server.killed) {
      server.kill("SIGTERM");
    }
  });

  it("serves LatentMAS status over the local API", async () => {
    const response = await fetch(`${baseUrl}/api/latentmas`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.subsystem).toBe("latentmas");
    expect(body.dry_run).toBe(true);
    expect(body.live_enabled).toBe(false);
    expect(body.gateway.alive).toBe(false);
    expect(body.externalWrites).toBe(false);
    expect(body.commandExecuted).toBe(false);
    expect(body.canRunGpuInference).toBe(false);
  });

  it("serves a LatentMAS benchmark dry-run packet without command execution", async () => {
    const response = await fetch(`${baseUrl}/api/latentmas/bench/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId: "latentmas-api-test", debug: true })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("dry-run-latentmas-bench-ready");
    expect(body.requestId).toBe("latentmas-api-test");
    expect(body.commandExecuted).toBe(false);
    expect(body.canRunGpuInference).toBe(false);
    expect(body.requiresHumanApproval).toBe(true);
  });

  it("fails closed on invalid LatentMAS dry-run JSON", async () => {
    const response = await fetch(`${baseUrl}/api/latentmas/bench/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid-json"
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      status: "invalid_latentmas_bench_dry_run_request",
      externalWrites: false,
      productionWrites: false,
      customerVisible: false,
      commandExecuted: false,
      canRunGpuInference: false,
      canReadSecrets: false,
      canDeploy: false,
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
