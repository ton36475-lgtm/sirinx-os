/**
 * LatentMAS subsystem status for dev-control-api.
 *
 * Reports the health and readiness of the LatentMAS research subsystem
 * (Rust orchestrator + Python backend + Node gateway) following the
 * same pattern as other SIRINX OS subsystem status modules.
 */

import { execFile } from "node:child_process";
import { access, constants } from "node:fs/promises";

const RUST_BIN = process.env.LATENTMAS_BIN ||
  "/Users/sirinx/sirinx-os/research/latentmas/target/debug/katgpt-latentmas";

const PYTHON_BACKEND = process.env.LATENTMAS_PYTHON_PATH ||
  "/Users/sirinx/sirinx-os/research/latentmas/python";

const GATEWAY_URL = process.env.LATENTMAS_GATEWAY_URL || "http://localhost:3700";

const LIVE_ENABLED = process.env.LATENTMAS_LIVE_ENABLED === "true";

/**
 * Get LatentMAS subsystem status.
 * Read-only, never triggers inference.
 */
export async function getLatentmasStatus(options = {}) {
  const rustBin = options.rustBin || RUST_BIN;
  const pythonBackend = options.pythonBackend || PYTHON_BACKEND;
  const gatewayUrl = options.gatewayUrl || GATEWAY_URL;
  const liveEnabled = options.liveEnabled ?? LIVE_ENABLED;
  const fetchImpl = options.fetchImpl || fetch;
  const now = options.now || (() => new Date());

  const rustCheck = await checkFile(rustBin, constants.X_OK);
  const pythonCheck = await checkFile(
    `${pythonBackend}/latent_backend/run_agent.py`,
    constants.R_OK
  );

  let gatewayAlive = false;
  try {
    const resp = await fetchImpl(`${gatewayUrl}/health`, {
      signal: AbortSignal.timeout(options.gatewayTimeoutMs || 2000)
    });
    gatewayAlive = resp.ok;
  } catch {
    gatewayAlive = false;
  }

  const srl = "SRL-2";
  const mode = liveEnabled ? "live" : "dry-run";

  const gates = [
    {
      id: "dry-run-lock",
      state: liveEnabled ? "warn" : "pass",
      description: "Live inference requires LATENTMAS_LIVE_ENABLED=true"
    },
    {
      id: "local-only",
      state: "pass",
      description: "LatentMAS runs on local GPU only, never public"
    },
    {
      id: "no-secret-access",
      state: "pass",
      description: "LatentMAS never reads .env or credentials"
    },
    {
      id: "no-external-send",
      state: "pass",
      description: "LatentMAS does not send customer messages"
    }
  ];

  return {
    subsystem: "latentmas",
    srl,
    mode,
    dry_run: !liveEnabled,
    live_enabled: liveEnabled,
    rust_cli: {
      available: rustCheck.available,
      path: rustBin,
      ...rustCheck
    },
    python_backend: {
      available: pythonCheck.available,
      path: pythonBackend,
      ...pythonCheck
    },
    gateway: {
      url: gatewayUrl,
      alive: gatewayAlive
    },
    gates,
    externalWrites: false,
    providerCalled: false,
    commandExecuted: false,
    canReadSecrets: false,
    canRunGpuInference: false,
    canDeploy: false,
    requiresHumanApproval: true,
    updatedAt: now().toISOString()
  };
}

/**
 * Create a dry-run plan for a LatentMAS benchmark.
 * Returns the would-be command without executing anything.
 */
export function createLatentmasBenchDryRun(input = {}, options = {}) {
  const liveEnabled = options.liveEnabled ?? LIVE_ENABLED;
  const now = options.now || (() => new Date());
  const model = input.model || "Qwen/Qwen3-4B-Instruct";
  const mode = input.mode || "latentmas";
  const dataset = input.dataset || "benchmarks/gsm8k_small.jsonl";
  const agents = input.agents || "planner,critic,refiner,solver";
  const latentSteps = input.latent_steps || "40,20,40,20";

  const command = [
    "katgpt-latentmas",
    "bench",
    "--model",
    model,
    "--mode",
    mode,
    "--dataset",
    dataset,
    "--agents",
    agents,
    "--latent-steps",
    `${latentSteps}`
  ];
  if (input.debug) command.push("--debug");
  if (input.output) command.push("--out", input.output);

  return {
    status: "dry-run-latentmas-bench-ready",
    requestId: input.requestId || "latentmas-bench-dry-run",
    would_run: command.join(" "),
    blocked_by: liveEnabled
      ? ["benchmark_requires_explicit_runtime_approval"]
      : ["LATENTMAS_LIVE_ENABLED=false"],
    risk_level: "low",
    approval_required: true,
    requiresHumanApproval: true,
    externalWrites: false,
    providerCalled: false,
    commandExecuted: false,
    canReadSecrets: false,
    canRunGpuInference: false,
    canDeploy: false,
    productionWrites: false,
    customerVisible: false,
    evidence: [
      `model=${model}`,
      `mode=${mode}`,
      `agents=${agents}`,
      `latent_steps=${latentSteps}`,
      `live_enabled=${liveEnabled}`
    ],
    updatedAt: now().toISOString()
  };
}

async function checkFile(path, mode) {
  try {
    await access(path, mode);
    return { available: true };
  } catch {
    return { available: false, error: "not found or missing permissions" };
  }
}
