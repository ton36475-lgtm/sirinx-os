import { getAgentLoopRuntimeStatus, runAgentLoop } from "./agent-loop-runtime.mjs";
import {
  formatA2A2ACompletionAuditMessage,
  formatA2A2AExecuteCommandPreviewMessage,
  formatA2A2ADispatchPreviewMessage,
  formatA2A2AExecuteReadinessMessage,
  formatA2A2AGateCheckMessage,
  formatA2A2ALiveGateReadinessMessage,
  formatA2A2AStatusMessage,
  getA2A2ACompletionAuditSurface,
  getA2A2AExecuteCommandPreviewSurface,
  getA2A2ADispatchPreviewSurface,
  getA2A2AExecuteReadinessSurface,
  getA2A2AGateCheckSurface,
  getA2A2ALiveGateReadinessSurface,
  getA2A2AStatusSurface
} from "./a2a2a-status-surface.mjs";
import { getCodexTaskRunnerStatus, runCodexTask } from "./codex-task-runner.mjs";
import {
  formatHermesAllJobsReadinessMessage,
  getHermesAllJobsReadiness
} from "./hermes-all-jobs-readiness.mjs";
import { getRuntimeFoundationStatus, readRuntimeSecretCompat } from "./runtime-foundation.mjs";
import { getAgentCoordinationStatus } from "./agent-coordination-contract.mjs";
import { getGodmodeV5RuntimeStatus } from "./godmode-v5-state-contract.mjs";
import {
  createCloudflarePreviewPacket,
  formatCloudflarePreviewPacketMessage,
  formatCloudflareReadinessMessage,
  getCloudflareDeploymentReadiness
} from "./cloudflare-deployment-readiness.mjs";
import {
  buildTelegramCommandMenuFromRegistry,
  getTelegramCommandCatalog,
  resolveTelegramCommand
} from "./telegram-command-registry.mjs";
import {
  digestTelegramRecipientTarget,
  authorizeTelegramExactGate,
  getTelegramCommandGateScope,
  getTelegramExecutionIntent
} from "./telegram-exact-gate.mjs";

function nowIso(options = {}) {
  const now = options.now || (() => new Date());
  return now().toISOString();
}

function safeString(value, fallback = "") {
  return String(value || fallback).trim();
}

function normalizeCommand(text) {
  const value = safeString(text).replace(/\s+/g, " ").trim();
  if (!value) return "/commands";
  const lower = value.toLowerCase();
  if (lower === "/command") return "/commands";
  if (lower === "/hermes status" || lower === "hermes status") return "/status";
  if (lower === "status") return "/status";
  if (lower === "commands" || lower === "menu") return "/commands";
  return lower;
}

function extractA2A2AGateCheckText(input = {}) {
  const raw = safeString(input.command || input.text || input.callbackData);
  return raw.replace(/^\/?a2a2a\s+gate\s+check\b/i, "").trim();
}

function extractA2A2AExecuteReadinessText(input = {}) {
  const raw = safeString(input.command || input.text || input.callbackData);
  return raw.replace(/^\/?a2a2a\s+execute\s+readiness\b/i, "").trim();
}

function extractA2A2AExecuteCommandPreviewText(input = {}) {
  const raw = safeString(input.command || input.text || input.callbackData);
  return raw.replace(/^\/?a2a2a\s+execute\s+command\s+preview\b/i, "").trim();
}

function commandRequestsLiveSend(input = {}) {
  const raw = safeString(input.command || input.text || input.callbackData).toLowerCase();
  return /\blivesend\s*[:=]?\s*true\b/.test(raw) || /\btelegram\s+livesend\s*[:=]?\s*true\b/.test(raw);
}

function stripGateMaterial(options = {}) {
  const {
    exactGate,
    approvalReceipt,
    approvalReceiptPath,
    requiredExactGate,
    executionExactGate,
    executionApprovalReceipt,
    executionApprovalReceiptPath,
    liveSendExactGate,
    liveSendApprovalReceipt,
    liveSendApprovalReceiptPath,
    executionRequested,
    providerCall,
    deploy,
    runtimeMutation,
    ...runtimeOptions
  } = options;
  return runtimeOptions;
}

function blockedCommandResult(command, commandDefinition, handler, gateAssessment, options = {}) {
  const reason = gateAssessment?.reason || "exact_gate_required";
  return {
    title: "SIRINX Telegram Command Router",
    status: "blocked-telegram-command-execution",
    command,
    commandId: commandDefinition?.id || null,
    handler,
    owner: commandDefinition?.owner || null,
    actionClass: commandDefinition?.actionClass || null,
    requiresExactGate: Boolean(commandDefinition?.requiresExactGate),
    messagePreview: `Execution blocked: ${reason}`,
    hasInlineKeyboard: false,
    actionResult: null,
    executionGate: gateAssessment,
    sendResult: {
      status: "telegram-send-not-attempted",
      telegramSent: false,
      keyValuePrinted: false,
      updatedAt: nowIso(options)
    },
    externalWrites: false,
    providerCalled: false,
    commandExecuted: false,
    keyValuePrinted: false,
    updatedAt: nowIso(options)
  };
}

export function buildTelegramCommandMenu() {
  return buildTelegramCommandMenuFromRegistry();
}

export function getTelegramCommandRouterStatus(options = {}) {
  const catalog = getTelegramCommandCatalog(options.registryOptions || {});
  return {
    title: "SIRINX Telegram Command Router",
    status: "telegram-command-router-ready",
    mode: "dry-run-first-with-explicit-live-send-gate",
    registryVersion: catalog.registry.version,
    registryValidation: catalog.validation,
    acceptedCommands: catalog.acceptedCommands,
    callbackCommands: catalog.callbackCommands,
    commandMetadata: catalog.commands.map((command) => ({
      id: command.id,
      handler: command.handler,
      owner: command.owner,
      actionClass: command.actionClass,
      requiresExactGate: command.requiresExactGate
    })),
    guardrails: {
      singleWriterRole: catalog.registry.policies.singleWriterRole,
      arbitraryShell: false,
      deploy: false,
      push: false,
      publish: false,
      providerCallFromTelegramCommand: false,
      providerCallsRequireSeparateExactGate: true,
      modelRoutingUsesCoordinationContract: true,
      legacyFusionAliasesPreviewOnly: true,
      telegramCommandRegistrySingleSource: true,
      hermesAllJobsReadyReadOnly: true,
      telegramLiveSendTrueRequiresExactGate: true,
      a2a2aStatusReadOnly: true,
      a2a2aDispatchPreviewReadOnly: true,
      a2a2aGateCheckReadOnly: true,
      a2a2aExecuteReadinessReadOnly: true,
      a2a2aExecuteCommandPreviewReadOnly: true,
      a2a2aCompletionAuditReadOnly: true,
      a2a2aLiveGateReadinessReadOnly: true,
      liveSendRequiresExplicitTrue: true,
      commandOutputsRedacted: true
    },
    updatedAt: nowIso(options)
  };
}

function formatStatusMessage(foundation, codex, loop, coordination) {
  return [
    "SIRINX Hermes Runtime Status",
    "",
    `Runtime: ${foundation.status}`,
    `Architecture route: ${coordination.modelRoutes.architecture.status}`,
    `Review route: ${coordination.modelRoutes.review.status}`,
    `Telegram ready: ${foundation.readiness.telegram ? "yes" : "no"}`,
    `Cloudflare ready: ${foundation.readiness.cloudflare ? "yes" : "no"}`,
    `Codex runner: ${codex.status}`,
    `Agent loop: ${loop.status}`,
    "",
    foundation.warnings.length ? `Warnings: ${foundation.warnings.join(", ")}` : "Warnings: none"
  ].join("\n");
}

function formatAgentTeamStatusMessage(coordination) {
  const routeLine = (label, route) => {
    const selected = route?.selected ? ` (${route.selected})` : "";
    return `${label}: ${route?.status || "unknown"}${selected}`;
  };
  return [
    "GhostClaw Agentic Coding Team",
    "",
    `Coordination: ${coordination.status}`,
    `Commander: ${coordination.ownership.missionCommander}`,
    `Architecture: ${coordination.ownership.architectureOwner}`,
    `Sole repo writer: ${coordination.ownership.repoWriter}`,
    `Review: ${coordination.ownership.reviewOwner}`,
    `Validation: ${coordination.ownership.validationOwner}`,
    "",
    routeLine("Architecture route", coordination.modelRoutes.architecture),
    routeLine("Implementation route", coordination.modelRoutes.implementation),
    routeLine("Review route", coordination.modelRoutes.review),
    "",
    `Active lease conflicts: ${coordination.assignmentConflicts.length}`,
    coordination.warnings.length ? `Warnings: ${coordination.warnings.join(", ")}` : "Warnings: none"
  ].join("\n");
}

function formatGodmodeV5StatusMessage(state) {
  const completed = Object.values(state.ExitCriteria).filter(Boolean).length;
  const total = Object.keys(state.ExitCriteria).length;
  return [
    "GhostClaw GODMODE V5",
    "",
    `Phase: ${state.Phase} (${state.PhaseIndex + 1}/${state.PhaseOrder.length})`,
    `Owner: ${state.Owner}`,
    `Status: ${state.Status}`,
    `Exit criteria: ${completed}/${total}`,
    `Attempt: ${state.Attempt}/${state.MaxRetries}`,
    `Abort required: ${state.AbortRequired ? "yes" : "no"}`,
    `Can advance: ${state.CanAdvance ? "yes" : "no"}`,
    "",
    "External action authorized: no"
  ].join("\n");
}

function formatResultMessage(title, result) {
  const lines = [title, "", `Status: ${result.status}`];
  if (result.blockedReason) lines.push(`Blocked: ${result.blockedReason}`);
  if (result.summary) lines.push(`Summary: ${result.summary.passed}/${result.summary.total} passed`);
  if (result.taskId) lines.push(`Task: ${result.taskId}`);
  if (result.stdoutPreview) lines.push("", result.stdoutPreview.slice(0, 1200));
  return lines.join("\n");
}

async function resolveTelegramTarget(options = {}) {
  const botCredential = options.token
    ? { ok: true, value: options.token, error: null }
    : await readRuntimeSecretCompat("TelegramBotToken", ["TELEGRAM_BOT_TOKEN"], options);
  const home = options.chatId
    ? { ok: true, value: options.chatId, error: null }
    : await readRuntimeSecretCompat("TelegramHomeChannel", ["TELEGRAM_HOME_CHANNEL"], options);
  const fallback = home.ok
    ? home
    : await readRuntimeSecretCompat("TelegramChatId", ["TELEGRAM_CHAT_ID"], options);

  return {
    ok: botCredential.ok && fallback.ok,
    token: botCredential,
    chat: fallback,
    error: !botCredential.ok ? "missing_telegram_bot_token" : !fallback.ok ? "missing_telegram_chat_target" : null
  };
}

export async function sendTelegramRouterMessage(message, options = {}) {
  const gateAssessment = await authorizeTelegramExactGate(
    {
      scope: "telegram_live_send",
      commandId: safeString(options.commandId || "direct_message"),
      requestId: safeString(options.requestId)
    },
    {
      ...options,
      exactGate: options.liveSendExactGate || options.exactGate,
      approvalReceipt: options.liveSendApprovalReceipt || options.approvalReceipt,
      approvalReceiptPath: options.liveSendApprovalReceiptPath || options.approvalReceiptPath,
      approvalReceiptRoot: options.liveSendApprovalReceiptRoot || options.approvalReceiptRoot,
      consumedReceiptRoot: options.liveSendConsumedReceiptRoot || options.consumedReceiptRoot,
      expectedReceiptId: options.liveSendExpectedReceiptId || options.expectedReceiptId,
      receiptSigningKey: options.telegramApprovalSigningKey || options.receiptSigningKey,
      allowProvidedReceiptObject: options.allowProvidedReceiptObject === true,
      consumeReceipt: options.consumeTelegramApprovalReceipt || options.consumeReceipt
    }
  );
  if (!gateAssessment.authorized) {
    return {
      status: "blocked-telegram-send-exact-gate",
      telegramSent: false,
      blockedReason: gateAssessment.reason,
      gateAssessment,
      keyValuePrinted: false,
      updatedAt: nowIso(options)
    };
  }

  const target = await resolveTelegramTarget(options);
  if (!target.ok) {
    return {
      status: "blocked-telegram-send",
      telegramSent: false,
      blockedReason: target.error,
      gateAssessment,
      tokenPresent: target.token.present !== false,
      chatTargetPresent: target.chat.present !== false,
      keyValuePrinted: false,
      updatedAt: nowIso(options)
    };
  }

  const recipientMatched =
    Boolean(gateAssessment.recipientTargetDigest) &&
    gateAssessment.recipientTargetDigest === digestTelegramRecipientTarget(target.chat.value);
  if (!recipientMatched) {
    return {
      status: "blocked-telegram-send-recipient-mismatch",
      telegramSent: false,
      blockedReason: "approval_receipt_recipient_target_mismatch",
      gateAssessment: { ...gateAssessment, recipientMatched: false },
      keyValuePrinted: false,
      updatedAt: nowIso(options)
    };
  }

  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const body = {
    chat_id: target.chat.value,
    text: message.text,
    disable_web_page_preview: true,
    ...(message.replyMarkup ? { reply_markup: message.replyMarkup } : {})
  };
  if (options.parseMode) body.parse_mode = options.parseMode;
  const response = await fetchImpl(`https://api.telegram.org/bot${target.token.value}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    status: response.ok ? "sent-telegram-message" : "failed-telegram-send",
    telegramSent: response.ok,
    httpStatus: response.status,
    ok: Boolean(json?.ok),
    messageIdPresent: Boolean(json?.result?.message_id),
    chatIdPresent: Boolean(json?.result?.chat?.id),
    errorClass: response.ok ? null : safeString(json?.description || text).slice(0, 300),
    gateAssessment: { ...gateAssessment, recipientMatched: true },
    keyValuePrinted: false,
    updatedAt: nowIso(options)
  };
}

export async function handleTelegramCommand(input = {}, options = {}) {
  const command = normalizeCommand(input.command || input.text || input.callbackData);
  const commandDefinition = resolveTelegramCommand(command, options.registryOptions || {});
  const handler = commandDefinition?.handler || "unknown_command";
  const reportedCommand = command.startsWith("cmd:") ? command : commandDefinition?.textCommands?.[0] || command;
  const authorizationOptions = options;
  const executionIntent = getTelegramExecutionIntent(options);
  let executionGate = {
    required: Boolean(commandDefinition?.requiresExactGate),
    authorized: false,
    status: executionIntent.requested ? "pending_exact_gate" : "preview_only_gate_not_consumed",
    reason: null,
    scope: commandDefinition ? getTelegramCommandGateScope(commandDefinition) : null,
    commandId: commandDefinition?.id || null,
    keyValuePrinted: false
  };

  if (executionIntent.requested) {
    if (!commandDefinition?.requiresExactGate) {
      executionGate = {
        ...executionGate,
        status: "blocked_exact_gate",
        reason: "command_not_execution_capable"
      };
      return blockedCommandResult(reportedCommand, commandDefinition, handler, executionGate, options);
    }

    executionGate = await authorizeTelegramExactGate(
      {
        scope: getTelegramCommandGateScope(commandDefinition),
        commandId: commandDefinition.id,
        requestId: safeString(options.requestId)
      },
      {
        ...options,
        exactGate: options.executionExactGate || options.exactGate,
        approvalReceipt: options.executionApprovalReceipt || options.approvalReceipt,
        approvalReceiptPath: options.executionApprovalReceiptPath || options.approvalReceiptPath,
        approvalReceiptRoot: options.executionApprovalReceiptRoot || options.approvalReceiptRoot,
        consumedReceiptRoot: options.executionConsumedReceiptRoot || options.consumedReceiptRoot,
        expectedReceiptId: options.executionExpectedReceiptId || options.expectedReceiptId,
        receiptSigningKey: options.telegramApprovalSigningKey || options.receiptSigningKey,
        allowProvidedReceiptObject: options.allowProvidedReceiptObject === true,
        consumeReceipt: options.consumeTelegramApprovalReceipt || options.consumeReceipt
      }
    );
    if (!executionGate.authorized) {
      return blockedCommandResult(reportedCommand, commandDefinition, handler, executionGate, options);
    }
  }

  options = stripGateMaterial(options);
  let message;
  let actionResult = null;

  if (handler === "command_menu") {
    message = {
      text: "SIRINX Command Menu\nเลือกคำสั่งที่ต้องการให้ Hermes/Codex ตรวจหรือรันแบบปลอดภัย",
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (handler === "runtime_status") {
    const [foundation, codex, loop, coordination] = await Promise.all([
      getRuntimeFoundationStatus(options),
      getCodexTaskRunnerStatus(options),
      getAgentLoopRuntimeStatus(options),
      getAgentCoordinationStatus(options)
    ]);
    message = {
      text: formatStatusMessage(foundation, codex, loop, coordination),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (handler === "agent_team_status") {
    actionResult = await getAgentCoordinationStatus(options);
    message = {
      text: formatAgentTeamStatusMessage(actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (handler === "godmode_v5_status") {
    actionResult = await getGodmodeV5RuntimeStatus(options);
    message = {
      text: formatGodmodeV5StatusMessage(actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (handler === "all_jobs_readiness") {
    actionResult = await getHermesAllJobsReadiness({
      ...options,
      liveSendRequested: command.startsWith("cmd:") ? false : commandRequestsLiveSend(input)
    });
    message = {
      text: formatHermesAllJobsReadinessMessage(actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (handler === "model_smoke_preview") {
    actionResult = await getAgentCoordinationStatus(options);
    message = {
      text: [
        "Agent Model Smoke Preview",
        "",
        `Status: ${actionResult.status}`,
        `Architecture: ${actionResult.modelRoutes.architecture.status}`,
        `Review: ${actionResult.modelRoutes.review.status}`,
        "Provider called: no",
        "Secrets read: no",
        "Direct execution: blocked",
        "Route source: configs/ghostclaw_agent_coordination.config.json"
      ].join("\n"),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (handler === "codex_status") {
    const codex = getCodexTaskRunnerStatus(options);
    message = {
      text: `Codex Runner: ${codex.status}\nAllowed tasks: ${codex.allowedTasks.map((task) => task.id).join(", ")}`,
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (handler === "codex_run_status") {
    actionResult = await runCodexTask({ requestId: "telegram-codex-status", task: "status" }, options);
    message = {
      text: formatResultMessage("Codex Local Task", actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (handler === "agent_loop_status") {
    const loop = getAgentLoopRuntimeStatus(options);
    message = {
      text: `Agent Loop: ${loop.status}\nStages: ${loop.stages.join(" -> ")}`,
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (handler === "agent_loop_preview") {
    actionResult = await runAgentLoop(
      { requestId: "telegram-agent-loop-preview", goal: "Review coordinated agent runtime readiness" },
      options
    );
    message = {
      text: formatResultMessage("Agent Loop Runtime Preview", actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (handler === "a2a2a_status") {
    actionResult = await getA2A2AStatusSurface(options);
    message = {
      text: formatA2A2AStatusMessage(actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (handler === "a2a2a_dispatch_preview") {
    actionResult = await getA2A2ADispatchPreviewSurface(options);
    message = {
      text: formatA2A2ADispatchPreviewMessage(actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (handler === "a2a2a_gate_check") {
    actionResult = await getA2A2AGateCheckSurface({
      ...options,
      gateText: command.startsWith("cmd:") ? "" : extractA2A2AGateCheckText(input)
    });
    message = {
      text: formatA2A2AGateCheckMessage(actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (handler === "a2a2a_execute_readiness") {
    actionResult = await getA2A2AExecuteReadinessSurface({
      ...options,
      gateText: command.startsWith("cmd:") ? "" : extractA2A2AExecuteReadinessText(input)
    });
    message = {
      text: formatA2A2AExecuteReadinessMessage(actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (handler === "a2a2a_execute_command_preview") {
    actionResult = await getA2A2AExecuteCommandPreviewSurface({
      ...options,
      gateText: command.startsWith("cmd:") ? "" : extractA2A2AExecuteCommandPreviewText(input)
    });
    message = {
      text: formatA2A2AExecuteCommandPreviewMessage(actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (handler === "a2a2a_completion_audit") {
    actionResult = await getA2A2ACompletionAuditSurface(options);
    message = {
      text: formatA2A2ACompletionAuditMessage(actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (handler === "a2a2a_live_gate_readiness") {
    actionResult = await getA2A2ALiveGateReadinessSurface(options);
    message = {
      text: formatA2A2ALiveGateReadinessMessage(actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (handler === "daily_report") {
    const [foundation, coordination] = await Promise.all([
      getRuntimeFoundationStatus(options),
      getAgentCoordinationStatus(options)
    ]);
    message = {
      text: [
        "SIRINX Daily Runtime Report",
        "",
        `Runtime: ${foundation.status}`,
        `Architecture route: ${coordination.modelRoutes.architecture.status}`,
        `Review route: ${coordination.modelRoutes.review.status}`,
        `Telegram: ${foundation.readiness.telegram ? "ready" : "blocked"}`,
        `Cloudflare: ${foundation.readiness.cloudflare ? "ready" : "blocked"}`,
        "",
        "Next: run /agent loop preview after provider health gates are complete."
      ].join("\n"),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (handler === "mcp_sync_preview") {
    actionResult = await runAgentLoop({
      requestId: "telegram-mcp-sync",
      goal: "Sync MCP tools (codex-mcp, slayer-mcp) to Codex via A2A packet. One-button sync."
    }, options);
    message = {
      text: [
        "MCP Sync via A2A to Codex",
        "",
        `Status: ${actionResult.status}`,
        `Goal: Sync MCP tools to Codex`,
        `Stages: ${actionResult.stages?.map(s => s.stage).join(" -> ") || "planned"}`,
        "",
        `Next gate: ${actionResult.nextGate || "auto_blocked_by_policy"}`,
        "",
        "[SAFETY]",
        "dry_run: true",
        "live_send: false",
        "provider_call: false"
      ].join("\n"),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (handler === "model_route_preview") {
    actionResult = await getAgentCoordinationStatus(options);
    const architecture = actionResult.modelRoutes.architecture;
    const implementation = actionResult.modelRoutes.implementation;
    const review = actionResult.modelRoutes.review;
    message = {
      text: [
        "Agent Team Model Routes",
        "",
        `Architecture: ${architecture.status}${architecture.selected ? ` (${architecture.selected})` : ""}`,
        `Implementation: ${implementation.status}${implementation.selected ? ` (${implementation.selected})` : ""}`,
        `Review: ${review.status}${review.selected ? ` (${review.selected})` : ""}`,
        "",
        "Provider called: no",
        "Route source: configs/ghostclaw_agent_coordination.config.json",
        "",
        "[SAFETY]",
        "dry_run: true",
        "provider_call: false",
        "live_send: false"
      ].join("\n"),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (handler === "cloudflare_readiness") {
    actionResult = await getCloudflareDeploymentReadiness(options);
    message = {
      text: formatCloudflareReadinessMessage(actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (handler === "cloudflare_preview_packet") {
    actionResult = await createCloudflarePreviewPacket(options);
    message = {
      text: formatCloudflarePreviewPacketMessage(actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (handler === "runtime_reset_preview") {
    actionResult = await runAgentLoop({
      requestId: "telegram-runtime-reset",
      goal: "Clear runtime queues and re-check all readiness lanes. Safe local reset."
    }, options);
    message = {
      text: [
        "Runtime Reset",
        "",
        `Status: ${actionResult.status}`,
        `Goal: Clear queues and re-check readiness`,
        `Stages: ${actionResult.stages?.map(s => s.stage).join(" -> ") || "discovery, verify"}`,
        "",
        "[SAFETY]",
        "dry_run: true",
        "live_send: false",
        "provider_call: false",
        "system_reset_only_dry_run: true"
      ].join("\n"),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else {
    message = {
      text: `Unknown command: ${safeString(input.command || input.text || input.callbackData)}\nใช้ /commands เพื่อเปิดเมนูคำสั่ง`,
      replyMarkup: buildTelegramCommandMenu()
    };
  }

  const sendResult =
    options.liveSend === true
      ? await sendTelegramRouterMessage(message, {
          ...authorizationOptions,
          commandId: commandDefinition?.id || "unknown_command"
        })
      : {
          status: "telegram-send-preview",
          telegramSent: false,
          keyValuePrinted: false,
          updatedAt: nowIso(options)
        };

  return {
    title: "SIRINX Telegram Command Router",
    status: sendResult.telegramSent ? "completed-telegram-command" : "blocked-or-preview-telegram-command",
    command: reportedCommand,
    commandId: commandDefinition?.id || null,
    handler,
    owner: commandDefinition?.owner || null,
    actionClass: commandDefinition?.actionClass || null,
    requiresExactGate: Boolean(commandDefinition?.requiresExactGate),
    executionIntent,
    executionGate,
    messagePreview: message.text.slice(0, 1200),
    hasInlineKeyboard: Boolean(message.replyMarkup),
    actionResult,
    sendResult,
    externalWrites: Boolean(sendResult.telegramSent),
    providerCalled: Boolean(actionResult?.providerCalled),
    commandExecuted: Boolean(actionResult?.commandExecuted || actionResult?.summary),
    keyValuePrinted: false,
    updatedAt: nowIso(options)
  };
}
