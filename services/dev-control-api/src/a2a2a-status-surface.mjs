import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const A2A2A_STATUS_PATHS = {
  p002Plan: ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P002-SAFE-LOCAL-DISPATCH-PLAN-20260703.json",
  p003Gate: ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P003-LOCAL-WORKER-DISPATCH-GATE-20260703.json",
  p004Execute: ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P004-LOCAL-WORKER-DISPATCH-EXECUTE-20260703.json",
  p014Ack: ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P014-TARGETED-LOCAL-WORKER-ACK-20260703.json",
  telegramConfig: "configs/hermes_telegram_gateway.config.json"
};

function nowIso(options = {}) {
  const now = options.now || (() => new Date());
  return now().toISOString();
}

async function readJson(root, relativePath) {
  const absolutePath = resolve(root, relativePath);
  const raw = await readFile(absolutePath, "utf8");
  return JSON.parse(raw);
}

async function readOptionalJson(root, relativePath) {
  try {
    return await readJson(root, relativePath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function statusOf(value) {
  return value?.status || "missing";
}

function boolValue(value) {
  return value === true;
}

const P004_EXACT_GATE_READY_STATUSES = new Set([
  "ready_for_execute_flag_after_exact_gate",
  "dry_run_ready_for_local_worker_packet_dispatch"
]);

function getOverallA2A2AStatus(p002Status, p003Status, p004Status) {
  const p002Ready = p002Status === "ready_for_safe_local_review_not_live_dispatch";
  const p003Awaiting = p003Status === "awaiting_exact_local_dispatch_gate";
  if (p002Ready && p004Status === "local_worker_packets_dispatched") {
    return "a2a2a-local-worker-packets-dispatched";
  }
  if (p002Ready && p003Awaiting && P004_EXACT_GATE_READY_STATUSES.has(p004Status)) {
    return "a2a2a-exact-gate-ready-execute-still-closed";
  }
  if (p002Ready && p003Awaiting && p004Status === "blocked_missing_or_invalid_exact_gate") {
    return "a2a2a-awaiting-exact-local-dispatch-gate";
  }
  return "a2a2a-status-needs-review";
}

export async function getA2A2AStatusSurface(options = {}) {
  const root = options.root || process.cwd();
  const paths = { ...A2A2A_STATUS_PATHS, ...(options.paths || {}) };
  const [p002, p003, p004, telegram, p014] = await Promise.all([
    readJson(root, paths.p002Plan),
    readJson(root, paths.p003Gate),
    readJson(root, paths.p004Execute),
    readJson(root, paths.telegramConfig),
    readOptionalJson(root, paths.p014Ack)
  ]);
  const p002Status = statusOf(p002);
  const p003Status = statusOf(p003);
  const p004Status = statusOf(p004);

  return {
    title: "A2A2A Adaptive Sync Status",
    status: getOverallA2A2AStatus(p002Status, p003Status, p004Status),
    mode: "read_only_status_surface",
    packets: {
      p002: {
        status: p002Status,
        safeLocalDispatchCandidates: p002?.summary?.safe_local_dispatch_candidates ?? null,
        approvalGatedCandidates: p002?.summary?.approval_gated_candidates ?? null,
        workersUsed: p002?.summary?.workers_used || []
      },
      p003: {
        status: p003Status,
        requiredApproval: p003?.required_approval || null,
        approvalMatches: boolValue(p003?.approval_matches),
        workersUsed: p003?.summary?.workers_used || []
      },
      p004: {
        status: p004Status,
        requiredApproval: p004?.required_approval || null,
        approvalMatches: boolValue(p004?.approval_matches),
        dryRun: boolValue(p004?.dry_run),
        executeRequested: boolValue(p004?.execute_requested),
        plannedWorkerPackets: p004?.summary?.planned_worker_packets ?? null,
        workerPacketsWritten: p004?.summary?.worker_packets_written ?? 0,
        workersStarted: p004?.summary?.workers_started || [],
        workersUsed: p004?.summary?.workers_used || []
      }
    },
    telegramGateway: {
      status: telegram?.status || "missing",
      mode: telegram?.mode || "unknown",
      defaultLiveSend: boolValue(telegram?.gateway?.defaultLiveSend),
      webhookEnabled: boolValue(telegram?.gateway?.webhook?.enabled),
      pollingEnabled: boolValue(telegram?.gateway?.polling?.enabled),
      queuePayloadExecution: boolValue(telegram?.routing?.queuePayloadExecution)
    },
    acknowledgement: {
      status: p014?.status || "missing",
      totalAckReceiptsWritten: p014?.total_ack_receipts_written ?? 0,
      busAckReceipts: p014?.bus_ack_receipts ?? 0,
      hermesRouteReceipts: p014?.hermes_route_receipts ?? 0,
      kobVerdictReceipts: p014?.kob_verdict_receipts ?? 0,
      payloadExecution: boolValue(p014?.payload_execution),
      providerCall: boolValue(p014?.provider_call),
      secretRead: boolValue(p014?.secret_read)
    },
    guardrails: {
      readOnly: true,
      liveTelegramSend: false,
      webhookActivation: false,
      pollingStart: false,
      workerRestart: false,
      workerPacketWrite: false,
      queuePayloadExecution: false,
      providerCall: false,
      secretRead: false,
      push: false,
      deploy: false
    },
    nextGate: p004?.required_approval || p003?.required_approval || null,
    updatedAt: nowIso(options)
  };
}

export async function getA2A2ADispatchPreviewSurface(options = {}) {
  const status = await getA2A2AStatusSurface(options);
  const root = options.root || process.cwd();
  const paths = { ...A2A2A_STATUS_PATHS, ...(options.paths || {}) };
  const p004 = await readJson(root, paths.p004Execute);
  const plannedWrites = Array.isArray(p004?.planned_writes) ? p004.planned_writes : [];

  return {
    title: "A2A2A Local Dispatch Preview",
    status: "a2a2a-local-dispatch-preview-only",
    mode: "read_only_dispatch_preview_no_execution",
    sourceStatus: status.status,
    requiredApproval: p004?.required_approval || status.nextGate || null,
    approvalMatches: boolValue(p004?.approval_matches),
    executeRequested: boolValue(p004?.execute_requested),
    plannedWorkerPackets: p004?.summary?.planned_worker_packets ?? plannedWrites.length,
    safeLocalDispatchCandidates: p004?.summary?.safe_local_dispatch_candidates ?? null,
    plannedWrites: plannedWrites.map((item) => ({
      queuePacketId: item.queue_packet_id,
      target: item.target,
      path: item.path
    })),
    guardrails: {
      readOnly: true,
      workerPacketWrite: false,
      runtimeQueueExecution: false,
      queuePayloadExecution: false,
      liveTelegramSend: false,
      webhookActivation: false,
      pollingStart: false,
      workerRestart: false,
      providerCall: false,
      secretRead: false,
      push: false,
      deploy: false
    },
    updatedAt: nowIso(options)
  };
}

export async function getA2A2AGateCheckSurface(options = {}) {
  const status = await getA2A2AStatusSurface(options);
  const providedGate = String(options.gateText || "").trim();
  const requiredApproval = status.packets.p004.requiredApproval || status.packets.p003.requiredApproval || status.nextGate;
  const approvalProvided = providedGate.length > 0;
  const storedApprovalMatches = status.packets.p004.approvalMatches || status.packets.p003.approvalMatches;
  const approvalMatches = approvalProvided && providedGate === requiredApproval;

  return {
    title: "A2A2A Local Dispatch Gate Check",
    status: !approvalProvided
      ? "a2a2a-gate-check-missing-approval"
      : approvalMatches
        ? "a2a2a-gate-check-match-execute-still-closed"
        : "a2a2a-gate-check-mismatch",
    mode: "read_only_gate_check_no_execution",
    sourceStatus: status.status,
    requiredApproval,
    approvalProvided,
    approvalMatches,
    storedApprovalMatches,
    approvalSource: approvalProvided ? "provided_gate_text" : "none",
    providedGateEchoed: false,
    executeRequested: false,
    executeStillRequired: true,
    workerPacketWrite: false,
    guardrails: {
      readOnly: true,
      workerPacketWrite: false,
      runtimeQueueExecution: false,
      queuePayloadExecution: false,
      liveTelegramSend: false,
      webhookActivation: false,
      pollingStart: false,
      workerRestart: false,
      providerCall: false,
      secretRead: false,
      push: false,
      deploy: false
    },
    updatedAt: nowIso(options)
  };
}

export async function getA2A2AExecuteReadinessSurface(options = {}) {
  const status = await getA2A2AStatusSurface(options);
  const dispatchPreview = await getA2A2ADispatchPreviewSurface(options);
  const gateCheck = await getA2A2AGateCheckSurface({ ...options, gateText: options.gateText || "" });
  const checks = [
    {
      id: "p002_safe_plan_ready",
      label: "P002 safe-local dispatch plan ready",
      passed: status.packets.p002.status === "ready_for_safe_local_review_not_live_dispatch"
    },
    {
      id: "p003_exact_gate_matches",
      label: "P003 exact local dispatch gate matches",
      passed: gateCheck.approvalMatches
    },
    {
      id: "p004_execute_requested",
      label: "P004 explicit execute mode requested",
      passed: status.packets.p004.executeRequested === true
    },
    {
      id: "p004_not_already_dispatched",
      label: "P004 local worker envelopes have not already been dispatched",
      passed: status.packets.p004.status !== "local_worker_packets_dispatched" && Number(status.packets.p004.workerPacketsWritten || 0) === 0
    },
    {
      id: "planned_worker_packets_present",
      label: "P004 planned worker packets present",
      passed: Number(dispatchPreview.plannedWorkerPackets || 0) > 0
    },
    {
      id: "telegram_live_send_closed",
      label: "Telegram live send stays closed",
      passed: status.telegramGateway.defaultLiveSend === false
    },
    {
      id: "queue_payload_execution_closed",
      label: "Queue payload execution stays closed",
      passed: status.telegramGateway.queuePayloadExecution === false
    }
  ];
  const failedChecks = checks.filter((check) => !check.passed).map((check) => check.id);
  const readyForExecute = failedChecks.length === 0;

  return {
    title: "A2A2A Local Dispatch Execute Readiness",
    status: readyForExecute ? "a2a2a-execute-readiness-pass" : "a2a2a-execute-readiness-blocked",
    mode: "read_only_execute_readiness_no_execution",
    sourceStatus: status.status,
    requiredApproval: gateCheck.requiredApproval,
    approvalProvided: gateCheck.approvalProvided,
    approvalMatches: gateCheck.approvalMatches,
    executeRequested: status.packets.p004.executeRequested,
    readyForExecute,
    checks,
    failedChecks,
    plannedWorkerPackets: dispatchPreview.plannedWorkerPackets,
    guardrails: {
      readOnly: true,
      workerPacketWrite: false,
      runtimeQueueExecution: false,
      queuePayloadExecution: false,
      liveTelegramSend: false,
      webhookActivation: false,
      pollingStart: false,
      workerRestart: false,
      providerCall: false,
      secretRead: false,
      push: false,
      deploy: false
    },
    updatedAt: nowIso(options)
  };
}

export async function getA2A2AExecuteCommandPreviewSurface(options = {}) {
  const readiness = await getA2A2AExecuteReadinessSurface(options);
  const commandPreviewReady =
    readiness.approvalMatches &&
    Number(readiness.plannedWorkerPackets || 0) > 0 &&
    !readiness.failedChecks.includes("p004_not_already_dispatched") &&
    readiness.guardrails.workerPacketWrite === false;
  const command = commandPreviewReady
    ? [
        "python3",
        "scripts/ghostclaw_a2a_local_dispatch_execute.py",
        "--approval",
        readiness.requiredApproval,
        "--execute",
        "--write"
      ]
    : [];

  return {
    title: "A2A2A Local Dispatch Execute Command Preview",
    status: commandPreviewReady
      ? "a2a2a-execute-command-preview-ready-no-execution"
      : "a2a2a-execute-command-preview-blocked",
    mode: "read_only_execute_command_preview_no_execution",
    readinessStatus: readiness.status,
    requiredApproval: readiness.requiredApproval,
    approvalProvided: readiness.approvalProvided,
    approvalMatches: readiness.approvalMatches,
    plannedWorkerPackets: readiness.plannedWorkerPackets,
    commandPreviewReady,
    command,
    commandText: command.length ? command.join(" ") : null,
    commandExecuted: false,
    workerPacketWrite: false,
    failedChecks: readiness.failedChecks,
    guardrails: {
      readOnly: true,
      workerPacketWrite: false,
      runtimeQueueExecution: false,
      queuePayloadExecution: false,
      liveTelegramSend: false,
      webhookActivation: false,
      pollingStart: false,
      workerRestart: false,
      providerCall: false,
      secretRead: false,
      push: false,
      deploy: false
    },
    updatedAt: nowIso(options)
  };
}

export async function getA2A2ACompletionAuditSurface(options = {}) {
  const status = await getA2A2AStatusSurface(options);
  const repeatPreview = await getA2A2AExecuteCommandPreviewSurface({
    ...options,
    gateText: status.nextGate || ""
  });
  const checks = [
    {
      id: "p002_plan_ready",
      label: "P002 safe-local dispatch plan is ready",
      passed: status.packets.p002.status === "ready_for_safe_local_review_not_live_dispatch"
    },
    {
      id: "p004_dispatched",
      label: "P004 local worker envelopes were dispatched",
      passed: status.packets.p004.status === "local_worker_packets_dispatched"
    },
    {
      id: "worker_packet_count_matches_plan",
      label: "Written worker packet count matches planned count",
      passed:
        Number(status.packets.p004.plannedWorkerPackets || 0) > 0 &&
        status.packets.p004.workerPacketsWritten === status.packets.p004.plannedWorkerPackets
    },
    {
      id: "p014_ack_complete",
      label: "P014 targeted local acknowledgement receipts are complete",
      passed:
        status.acknowledgement.status === "pass_targeted_local_worker_ack_receipts_written" &&
        status.acknowledgement.totalAckReceiptsWritten === 20 &&
        status.acknowledgement.busAckReceipts === 10 &&
        status.acknowledgement.hermesRouteReceipts === 5 &&
        status.acknowledgement.kobVerdictReceipts === 5
    },
    {
      id: "ack_no_payload_execution",
      label: "Acknowledgement receipts did not execute payloads",
      passed:
        status.acknowledgement.payloadExecution === false &&
        status.acknowledgement.providerCall === false &&
        status.acknowledgement.secretRead === false
    },
    {
      id: "repeat_execute_blocked",
      label: "Repeat P004 execute command preview is blocked after dispatch",
      passed:
        repeatPreview.commandPreviewReady === false &&
        repeatPreview.failedChecks.includes("p004_not_already_dispatched")
    },
    {
      id: "workers_not_started",
      label: "No tmux/worker loop was started by the dispatch lane",
      passed: status.packets.p004.workersStarted.length === 0 && status.packets.p004.workersUsed.length === 0
    },
    {
      id: "telegram_live_closed",
      label: "Telegram live send, webhook, and polling remain closed",
      passed:
        status.telegramGateway.defaultLiveSend === false &&
        status.telegramGateway.webhookEnabled === false &&
        status.telegramGateway.pollingEnabled === false
    },
    {
      id: "queue_payload_closed",
      label: "Queue payload execution remains closed",
      passed: status.telegramGateway.queuePayloadExecution === false
    },
    {
      id: "external_gates_closed",
      label: "Provider, secret, push, and deploy gates remain closed",
      passed:
        status.guardrails.providerCall === false &&
        status.guardrails.secretRead === false &&
        status.guardrails.push === false &&
        status.guardrails.deploy === false
    }
  ];
  const failedChecks = checks.filter((check) => !check.passed).map((check) => check.id);
  const localSafeComplete = failedChecks.length === 0;

  return {
    title: "A2A2A Local-Safe Completion Audit",
    status: localSafeComplete ? "a2a2a-local-safe-completion-pass" : "a2a2a-local-safe-completion-blocked",
    mode: "read_only_completion_audit_no_live_actions",
    localSafeComplete,
    sourceStatus: status.status,
    p004Status: status.packets.p004.status,
    workerPacketsWritten: status.packets.p004.workerPacketsWritten,
    plannedWorkerPackets: status.packets.p004.plannedWorkerPackets,
    acknowledgement: status.acknowledgement,
    repeatExecutePreviewStatus: repeatPreview.status,
    checks,
    failedChecks,
    guardrails: {
      readOnly: true,
      workerPacketWrite: false,
      runtimeQueueExecution: false,
      queuePayloadExecution: false,
      liveTelegramSend: false,
      webhookActivation: false,
      pollingStart: false,
      workerRestart: false,
      providerCall: false,
      secretRead: false,
      push: false,
      deploy: false
    },
    nextSafeAction: localSafeComplete
      ? "Keep live/external gates closed or open a separate exact gate for a specific next action."
      : "Resolve failed local-safe completion checks before claiming A2A2A completion.",
    updatedAt: nowIso(options)
  };
}

export async function getA2A2ALiveGateReadinessSurface(options = {}) {
  const root = options.root || process.cwd();
  const paths = { ...A2A2A_STATUS_PATHS, ...(options.paths || {}) };
  const [completion, telegram] = await Promise.all([
    getA2A2ACompletionAuditSurface(options),
    readJson(root, paths.telegramConfig)
  ]);
  const gates = telegram?.gates || {};
  const liveSendGate = gates.liveSend || {};
  const webhookGate = gates.webhookActivation || {};
  const runtimeGate = gates.runtimeRestart || {};
  const checks = [
    {
      id: "local_safe_a2a2a_complete",
      label: "A2A2A local-safe completion audit passes",
      passed: completion.localSafeComplete === true
    },
    {
      id: "telegram_config_ready",
      label: "Telegram gateway config is local-safe ready",
      passed: telegram?.status === "local_safe_config_ready"
    },
    {
      id: "live_send_default_closed",
      label: "Telegram live send default remains closed",
      passed: telegram?.gateway?.defaultLiveSend === false
    },
    {
      id: "webhook_polling_closed",
      label: "Webhook and polling remain closed",
      passed: telegram?.gateway?.webhook?.enabled === false && telegram?.gateway?.polling?.enabled === false
    },
    {
      id: "queue_payload_execution_closed",
      label: "Queue payload execution remains closed",
      passed: telegram?.routing?.queuePayloadExecution === false
    },
    {
      id: "live_send_gate_present_closed",
      label: "Live send exact gate exists and remains closed",
      passed: liveSendGate.status === "closed" && Boolean(liveSendGate.requiredApproval)
    },
    {
      id: "webhook_gate_present_closed",
      label: "Webhook exact gate exists and remains closed",
      passed: webhookGate.status === "closed" && Boolean(webhookGate.requiredApproval)
    },
    {
      id: "runtime_restart_gate_present_closed",
      label: "Runtime restart exact gate exists and remains closed",
      passed: runtimeGate.status === "closed" && Boolean(runtimeGate.requiredApproval)
    },
    {
      id: "recipient_evidence_required",
      label: "Live send requires recipient evidence",
      passed: liveSendGate.requiresRecipientEvidence === true
    },
    {
      id: "token_presence_only",
      label: "Token check is presence-only and values are not stored or printed",
      passed:
        liveSendGate.requiresTokenPresenceOnlyCheck === true &&
        telegram?.credentials?.storeValuesInRepo === false &&
        telegram?.credentials?.printValues === false
    }
  ];
  const failedChecks = checks.filter((check) => !check.passed).map((check) => check.id);
  const readyForExactGateRequest = failedChecks.length === 0;

  return {
    title: "A2A2A Live Gate Readiness",
    status: readyForExactGateRequest
      ? "a2a2a-live-gate-ready-for-exact-approval-execution-closed"
      : "a2a2a-live-gate-readiness-blocked",
    mode: "read_only_live_gate_readiness_no_live_actions",
    readyForExactGateRequest,
    liveExecutionApproved: false,
    localSafeComplete: completion.localSafeComplete,
    completionStatus: completion.status,
    exactGates: {
      liveSend: {
        status: liveSendGate.status || "missing",
        requiredApproval: liveSendGate.requiredApproval || null,
        requiresRecipientEvidence: liveSendGate.requiresRecipientEvidence === true,
        requiresTokenPresenceOnlyCheck: liveSendGate.requiresTokenPresenceOnlyCheck === true
      },
      webhookActivation: {
        status: webhookGate.status || "missing",
        requiredApproval: webhookGate.requiredApproval || null
      },
      runtimeRestart: {
        status: runtimeGate.status || "missing",
        requiredApproval: runtimeGate.requiredApproval || null
      }
    },
    checks,
    failedChecks,
    guardrails: {
      readOnly: true,
      workerPacketWrite: false,
      runtimeQueueExecution: false,
      queuePayloadExecution: false,
      liveTelegramSend: false,
      webhookActivation: false,
      pollingStart: false,
      workerRestart: false,
      providerCall: false,
      secretRead: false,
      push: false,
      deploy: false
    },
    nextSafeAction: readyForExactGateRequest
      ? "Choose one exact live action gate and collect recipient evidence before any live Telegram/runtime action."
      : "Resolve blocked readiness checks before requesting a live Telegram/runtime gate.",
    updatedAt: nowIso(options)
  };
}

export function formatA2A2AStatusMessage(surface) {
  const p002 = surface.packets.p002;
  const p003 = surface.packets.p003;
  const p004 = surface.packets.p004;
  return [
    "GhostClaw A2A2A Status",
    "",
    `Overall: ${surface.status}`,
    `P002 plan: ${p002.status}`,
    `Safe candidates: ${p002.safeLocalDispatchCandidates ?? "unknown"}`,
    `Gated candidates: ${p002.approvalGatedCandidates ?? "unknown"}`,
    `P003 gate: ${p003.status}`,
    `P004 executor: ${p004.status}`,
    `Planned worker packets: ${p004.plannedWorkerPackets ?? "unknown"}`,
    `Ack receipts: ${surface.acknowledgement.totalAckReceiptsWritten ?? 0}`,
    `Ack status: ${surface.acknowledgement.status}`,
    "",
    `Telegram live send: ${surface.telegramGateway.defaultLiveSend ? "open" : "closed"}`,
    `Webhook: ${surface.telegramGateway.webhookEnabled ? "open" : "closed"}`,
    `Polling: ${surface.telegramGateway.pollingEnabled ? "open" : "closed"}`,
    "",
    `Next exact gate: ${surface.nextGate || "none"}`,
    "Live send, webhook, polling, worker restart, provider calls, push, deploy, install, and secret reads remain closed."
  ].join("\n");
}

export function formatA2A2ALiveGateReadinessMessage(surface) {
  const checkLines = surface.checks.map((check) => `- ${check.passed ? "PASS" : "BLOCK"} ${check.id}`);
  return [
    "GhostClaw A2A2A Live Gate Readiness",
    "",
    `Status: ${surface.status}`,
    `Ready for exact live gate request: ${surface.readyForExactGateRequest ? "yes" : "no"}`,
    `Live execution approved: ${surface.liveExecutionApproved ? "yes" : "no"}`,
    `Local-safe complete: ${surface.localSafeComplete ? "yes" : "no"}`,
    `Completion status: ${surface.completionStatus}`,
    "",
    "Exact gates:",
    `- Live send: ${surface.exactGates.liveSend.status} (${surface.exactGates.liveSend.requiredApproval || "missing"})`,
    `- Webhook activation: ${surface.exactGates.webhookActivation.status} (${surface.exactGates.webhookActivation.requiredApproval || "missing"})`,
    `- Runtime restart: ${surface.exactGates.runtimeRestart.status} (${surface.exactGates.runtimeRestart.requiredApproval || "missing"})`,
    "",
    "Checks:",
    ...checkLines,
    "",
    surface.failedChecks.length ? `Blocked checks: ${surface.failedChecks.join(", ")}` : "Blocked checks: none",
    "",
    surface.nextSafeAction,
    "This readiness check does not send Telegram, activate webhook/polling, restart workers, execute queue payloads, call providers, read secrets, push, deploy, or install."
  ].join("\n");
}

export function formatA2A2ACompletionAuditMessage(surface) {
  const checkLines = surface.checks.map((check) => `- ${check.passed ? "PASS" : "BLOCK"} ${check.id}`);
  return [
    "GhostClaw A2A2A Completion Audit",
    "",
    `Status: ${surface.status}`,
    `Local-safe complete: ${surface.localSafeComplete ? "yes" : "no"}`,
    `Source status: ${surface.sourceStatus}`,
    `P004 status: ${surface.p004Status}`,
    `Worker packets: ${surface.workerPacketsWritten}/${surface.plannedWorkerPackets ?? "unknown"}`,
    `Ack receipts: ${surface.acknowledgement.totalAckReceiptsWritten}`,
    `Ack status: ${surface.acknowledgement.status}`,
    `Repeat execute preview: ${surface.repeatExecutePreviewStatus}`,
    "",
    "Checks:",
    ...checkLines,
    "",
    surface.failedChecks.length ? `Blocked checks: ${surface.failedChecks.join(", ")}` : "Blocked checks: none",
    "",
    surface.nextSafeAction,
    "Live send, webhook, polling, worker restart, provider calls, push, deploy, install, and secret reads remain closed."
  ].join("\n");
}

export function formatA2A2ADispatchPreviewMessage(surface) {
  const planned = surface.plannedWrites.slice(0, 10);
  const writeLines = planned.length
    ? planned.map((item) => `- ${item.queuePacketId} -> ${item.target}: ${item.path}`)
    : ["- none"];
  return [
    "GhostClaw A2A2A Dispatch Preview",
    "",
    `Status: ${surface.status}`,
    `Source status: ${surface.sourceStatus}`,
    `Safe candidates: ${surface.safeLocalDispatchCandidates ?? "unknown"}`,
    `Planned worker packets: ${surface.plannedWorkerPackets ?? "unknown"}`,
    `Approval matched: ${surface.approvalMatches ? "yes" : "no"}`,
    `Execute requested: ${surface.executeRequested ? "yes" : "no"}`,
    "",
    `Required exact gate: ${surface.requiredApproval || "none"}`,
    "",
    "Planned writes:",
    ...writeLines,
    "",
    "This preview does not write inbox packets, execute queue payloads, restart workers, send Telegram, call providers, push, deploy, install, or read secrets."
  ].join("\n");
}

export function formatA2A2AGateCheckMessage(surface) {
  return [
    "GhostClaw A2A2A Gate Check",
    "",
    `Status: ${surface.status}`,
    `Source status: ${surface.sourceStatus}`,
    `Required exact gate: ${surface.requiredApproval || "none"}`,
    `Approval provided: ${surface.approvalProvided ? "yes" : "no"}`,
    `Approval matched: ${surface.approvalMatches ? "yes" : "no"}`,
    `Provided gate echoed: ${surface.providedGateEchoed ? "yes" : "no"}`,
    `Execute requested: ${surface.executeRequested ? "yes" : "no"}`,
    "",
    surface.approvalMatches
      ? "Exact gate matches, but P004 still requires explicit execute mode before local worker envelopes can be written."
      : "Gate is not open. Paste only the exact required gate after /a2a2a gate check to verify it.",
    "",
    "This check does not write inbox packets, execute queue payloads, restart workers, send Telegram, call providers, push, deploy, install, or read secrets."
  ].join("\n");
}

export function formatA2A2AExecuteReadinessMessage(surface) {
  const checkLines = surface.checks.map((check) => `- ${check.passed ? "PASS" : "BLOCK"} ${check.id}`);
  return [
    "GhostClaw A2A2A Execute Readiness",
    "",
    `Status: ${surface.status}`,
    `Ready for P004 execute: ${surface.readyForExecute ? "yes" : "no"}`,
    `Planned worker packets: ${surface.plannedWorkerPackets ?? "unknown"}`,
    `Approval provided: ${surface.approvalProvided ? "yes" : "no"}`,
    `Approval matched: ${surface.approvalMatches ? "yes" : "no"}`,
    `Execute requested: ${surface.executeRequested ? "yes" : "no"}`,
    `Required exact gate: ${surface.requiredApproval || "none"}`,
    "",
    "Checks:",
    ...checkLines,
    "",
    surface.readyForExecute
      ? "All local execute preconditions are satisfied, but this readiness command still does not perform execution."
      : `Blocked checks: ${surface.failedChecks.length ? surface.failedChecks.join(", ") : "none"}`,
    "",
    "This readiness check does not write inbox packets, execute queue payloads, restart workers, send Telegram, call providers, push, deploy, install, or read secrets."
  ].join("\n");
}

export function formatA2A2AExecuteCommandPreviewMessage(surface) {
  return [
    "GhostClaw A2A2A Execute Command Preview",
    "",
    `Status: ${surface.status}`,
    `Readiness status: ${surface.readinessStatus}`,
    `Command preview ready: ${surface.commandPreviewReady ? "yes" : "no"}`,
    `Approval matched: ${surface.approvalMatches ? "yes" : "no"}`,
    `Planned worker packets: ${surface.plannedWorkerPackets ?? "unknown"}`,
    "",
    surface.commandPreviewReady
      ? `Local command: ${surface.commandText}`
      : `Blocked checks: ${surface.failedChecks.length ? surface.failedChecks.join(", ") : "exact gate missing"}`,
    "",
    "This command preview does not run the command, write inbox packets, execute queue payloads, restart workers, send Telegram, call providers, push, deploy, install, or read secrets."
  ].join("\n");
}
