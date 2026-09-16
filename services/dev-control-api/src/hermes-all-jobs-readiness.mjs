import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  getA2A2ALiveGateReadinessSurface,
  getA2A2AStatusSurface
} from "./a2a2a-status-surface.mjs";
import { getAgentLoopRuntimeStatus } from "./agent-loop-runtime.mjs";
import { getCodexTaskRunnerStatus } from "./codex-task-runner.mjs";
import { getRuntimeFoundationStatus } from "./runtime-foundation.mjs";

export const HERMES_ALL_JOBS_READY_CONFIG_PATH = "configs/hermes_all_jobs_ready.config.json";

function nowIso(options = {}) {
  const now = options.now || (() => new Date());
  return now().toISOString();
}

function bool(value) {
  return value === true;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

async function readJson(root, relativePath) {
  const raw = await readFile(resolve(root, relativePath), "utf8");
  return JSON.parse(raw);
}

function laneSummary(config) {
  const lanes = safeArray(config.lanes);
  return {
    total: lanes.length,
    ready: lanes.filter((lane) => lane.status === "ready").length,
    gated: lanes.filter((lane) => lane.status === "gated").length,
    blocked: lanes.filter((lane) => lane.status === "blocked").length,
    sourceMutatingLanes: lanes.filter((lane) => lane.canMutateSource === true).map((lane) => lane.id),
    lanes: lanes.map((lane) => ({
      id: lane.id,
      owner: lane.owner,
      status: lane.status,
      mode: lane.mode,
      canMutateSource: bool(lane.canMutateSource)
    }))
  };
}

function externalRequestStatus(config, liveGate, options = {}) {
  const requested = {
    telegramLiveSend: bool(options.liveSendRequested),
    providerCall: bool(options.providerCallRequested),
    cloudflareR2Write: bool(options.cloudflareR2WriteRequested),
    push: bool(options.pushRequested),
    deploy: bool(options.deployRequested),
    install: bool(options.installRequested)
  };

  return {
    telegramLiveSend: {
      requested: requested.telegramLiveSend,
      status: requested.telegramLiveSend ? "exact_gate_required" : "not_requested",
      requiredApproval:
        config.exactGates?.telegramLiveSend || liveGate.exactGates?.liveSend?.requiredApproval || null,
      liveSendDefault: false,
      canSendNow: false,
      recipientEvidenceRequired: true
    },
    providerCall: {
      requested: requested.providerCall,
      status: requested.providerCall ? "exact_gate_required" : "not_requested",
      requiredApproval: config.exactGates?.openRouterFable5ProviderCall || null,
      canCallNow: false
    },
    cloudflareR2Write: {
      requested: requested.cloudflareR2Write,
      status: requested.cloudflareR2Write ? "exact_gate_required" : "not_requested",
      requiredApproval: config.exactGates?.cloudflareR2Write || null,
      canWriteNow: false
    },
    push: {
      requested: requested.push,
      status: requested.push ? "exact_gate_required" : "not_requested",
      requiredApproval: config.exactGates?.push || null,
      canPushNow: false
    },
    deploy: {
      requested: requested.deploy,
      status: requested.deploy ? "exact_gate_required" : "not_requested",
      requiredApproval: config.exactGates?.deploy || null,
      canDeployNow: false
    },
    install: {
      requested: requested.install,
      status: requested.install ? "exact_gate_required" : "not_requested",
      requiredApproval: config.exactGates?.install || null,
      canInstallNow: false
    }
  };
}

function buildTelegramReadiness(config) {
  return {
    status: "telegram-command-router-configured",
    mode: "dry-run-first-with-explicit-live-send-gate",
    liveSendDefault: false,
    acceptedCommands: safeArray(config.commands?.accepted),
    callbackCommands: safeArray(config.commands?.callbackCommands)
  };
}

function buildChecks(config, foundation, telegram, a2a2a, liveGate) {
  const defaults = config.defaultBehavior || {};
  const blocked = config.blockedActions || {};
  return [
    {
      id: "config_loaded",
      label: "Hermes all-jobs readiness config loads",
      passed: config.status === "local_safe_all_jobs_ready"
    },
    {
      id: "dry_run_default",
      label: "Dry-run remains the default behavior",
      passed: defaults.dryRun === true
    },
    {
      id: "live_send_default_closed",
      label: "Telegram live send is closed by default",
      passed: defaults.liveSend === false && blocked.liveTelegramSend === true
    },
    {
      id: "external_actions_closed",
      label: "Provider, install, push, deploy, and cloud mutation are blocked by default",
      passed:
        defaults.providerCall === false &&
        defaults.install === false &&
        defaults.push === false &&
        defaults.deploy === false &&
        defaults.cloudMutation === false &&
        blocked.providerCallByDefault === true &&
        blocked.install === true &&
        blocked.push === true &&
        blocked.deploy === true &&
        blocked.cloudMutation === true
    },
    {
      id: "secret_and_key_print_closed",
      label: "Secret reads and key printing are blocked",
      passed:
        defaults.secretRead === false &&
        defaults.keyValuePrint === false &&
        blocked.secretRead === true &&
        blocked.keyValuePrint === true
    },
    {
      id: "telegram_router_ready",
      label: "Telegram command router is ready",
      passed:
        telegram.status === "telegram-command-router-configured" &&
        telegram.acceptedCommands.includes("/hermes all jobs ready")
    },
    {
      id: "codex_runner_ready",
      label: "Codex local task runner is ready",
      passed: getCodexTaskRunnerStatus().status === "codex-task-runner-ready"
    },
    {
      id: "agent_loop_ready",
      label: "Agent loop runtime is ready",
      passed: getAgentLoopRuntimeStatus().status === "agent-loop-runtime-ready"
    },
    {
      id: "a2a2a_status_available",
      label: "A2A2A status surface is available",
      passed: typeof a2a2a.status === "string" && a2a2a.status.length > 0
    },
    {
      id: "telegram_live_gate_present",
      label: "Telegram live-send exact gate is present and closed",
      passed:
        liveGate.exactGates?.liveSend?.status === "closed" &&
        Boolean(liveGate.exactGates?.liveSend?.requiredApproval)
    },
    {
      id: "runtime_foundation_checked",
      label: "Runtime foundation readiness was checked without printing secrets",
      passed:
        typeof foundation.status === "string" &&
        foundation.guardrails?.secretValuesPrinted === false &&
        foundation.guardrails?.secretValuesReturned === false
    },
    {
      id: "obsidian_sync_policy_present",
      label: "Obsidian brain sync policy paths are configured",
      passed:
        Boolean(config.obsidianBrainSync?.vault) &&
        Boolean(config.obsidianBrainSync?.digestNote) &&
        config.obsidianBrainSync?.writePolicy === "append_concise_pulse_only_no_secrets_no_raw_logs"
    }
  ];
}

export async function getHermesAllJobsReadiness(options = {}) {
  const root = options.root || process.cwd();
  const configPath = options.configPath || HERMES_ALL_JOBS_READY_CONFIG_PATH;
  const config = await readJson(root, configPath);
  const telegram = buildTelegramReadiness(config);
  const [foundation, a2a2a, liveGate] = await Promise.all([
    getRuntimeFoundationStatus(options),
    getA2A2AStatusSurface(options),
    getA2A2ALiveGateReadinessSurface(options)
  ]);
  const lanes = laneSummary(config);
  const checks = buildChecks(config, foundation, telegram, a2a2a, liveGate);
  const failedChecks = checks.filter((check) => !check.passed).map((check) => check.id);
  const requests = externalRequestStatus(config, liveGate, options);
  const externalRequestsOpen = Object.values(requests).some((request) => request.requested);

  return {
    title: "Hermes All Jobs Readiness",
    status: failedChecks.length
      ? "hermes-all-jobs-readiness-blocked"
      : externalRequestsOpen
        ? "hermes-all-jobs-ready-local-safe-external-request-gated"
        : "hermes-all-jobs-ready-local-safe",
    mode: config.mode,
    configId: config.config_id,
    controlPlane: config.controlPlane,
    sourceOfTruth: config.sourceOfTruth,
    localSafeReady: failedChecks.length === 0,
    lanes,
    checks,
    failedChecks,
    runtimeFoundation: {
      status: foundation.status,
      readiness: foundation.readiness,
      warnings: foundation.warnings,
      secretValuesPrinted: foundation.guardrails?.secretValuesPrinted === true
    },
    telegramGateway: {
      status: telegram.status,
      mode: telegram.mode,
      liveSendDefault: false,
      acceptedCommands: telegram.acceptedCommands,
      callbackCommands: telegram.callbackCommands
    },
    a2a2a: {
      status: a2a2a.status,
      nextGate: a2a2a.nextGate,
      guardrails: a2a2a.guardrails
    },
    liveGate: {
      status: liveGate.status,
      readyForExactGateRequest: liveGate.readyForExactGateRequest,
      liveExecutionApproved: false,
      exactGates: liveGate.exactGates
    },
    externalRequests: requests,
    guardrails: {
      dryRun: true,
      liveTelegramSend: false,
      repoContentExternalSend: false,
      customerDataRouting: false,
      keyValuePrint: false,
      secretRead: false,
      providerCall: false,
      install: false,
      push: false,
      deploy: false,
      cloudMutation: false,
      blanketFullAuto: false
    },
    nextSafeAction: externalRequestsOpen
      ? "Collect the exact gate plus target evidence for exactly one requested external action."
      : config.nextSafeAction,
    updatedAt: nowIso(options)
  };
}

export function formatHermesAllJobsReadinessMessage(surface) {
  const live = surface.externalRequests.telegramLiveSend;
  const laneLine = `${surface.lanes.ready}/${surface.lanes.total} ready, ${surface.lanes.gated} gated`;
  const failed = surface.failedChecks.length ? surface.failedChecks.join(", ") : "none";
  return [
    "Hermes All Jobs Readiness",
    "",
    `Status: ${surface.status}`,
    `Mode: ${surface.mode}`,
    `Local-safe ready: ${surface.localSafeReady ? "yes" : "no"}`,
    `Lanes: ${laneLine}`,
    `A2A2A: ${surface.a2a2a.status}`,
    `Telegram router: ${surface.telegramGateway.status}`,
    `Runtime: ${surface.runtimeFoundation.status}`,
    "",
    `Telegram liveSend requested: ${live.requested ? "yes" : "no"}`,
    `Telegram liveSend status: ${live.status}`,
    `Telegram liveSend can send now: ${live.canSendNow ? "yes" : "no"}`,
    `Required liveSend gate: ${live.requiredApproval || "none"}`,
    "",
    `Failed checks: ${failed}`,
    "Blocked by default: live send, provider calls, repo/customer data external routing, install, push, deploy, cloud mutation, secret reads, key printing.",
    `Next: ${surface.nextSafeAction}`
  ].join("\n");
}
