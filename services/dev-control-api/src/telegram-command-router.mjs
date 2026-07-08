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
  createOpenRouterFable5AdapterDryRun,
  getOpenRouterFable5AdapterStatus
} from "./openrouter-fable5-adapter.mjs";
import {
  formatHermesAllJobsReadinessMessage,
  getHermesAllJobsReadiness
} from "./hermes-all-jobs-readiness.mjs";
import {
  createOpenRouterFusionRouterDryRun,
  getOpenRouterFusionRouterStatus
} from "./openrouter-fusion-router.mjs";
import { getRuntimeFoundationStatus, readRuntimeSecret } from "./runtime-foundation.mjs";

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

export function buildTelegramCommandMenu() {
  return {
    inline_keyboard: [
      [
        { text: "MCP Sync", callback_data: "cmd:mcp-sync" },
        { text: "Hermes Status", callback_data: "cmd:status" },
        { text: "All Jobs Ready", callback_data: "cmd:hermes-all-jobs-ready" }
      ],
      [
        { text: "Fusion Smoke", callback_data: "cmd:fusion-smoke" }
      ],
      [
        { text: "Fable5 Preview", callback_data: "cmd:fable5-preview" }
      ],
      [
        { text: "Codex Queue", callback_data: "cmd:codex-status" },
        { text: "Agent Loop", callback_data: "cmd:agent-loop-status" }
      ],
      [
        { text: "Run Fusion Loop", callback_data: "cmd:agent-loop-fusion" },
        { text: "Daily Report", callback_data: "cmd:daily-report" }
      ],
      [
        { text: "A2A2A Status", callback_data: "cmd:a2a2a-status" }
      ],
      [
        { text: "Dispatch Preview", callback_data: "cmd:a2a2a-dispatch-preview" }
      ],
      [
        { text: "Gate Check", callback_data: "cmd:a2a2a-gate-check" }
      ],
      [
        { text: "Execute Ready", callback_data: "cmd:a2a2a-execute-readiness" }
      ],
      [
        { text: "Execute Cmd", callback_data: "cmd:a2a2a-execute-command-preview" }
      ],
      [
        { text: "Completion Audit", callback_data: "cmd:a2a2a-completion-audit" }
      ],
      [
        { text: "Live Gate Ready", callback_data: "cmd:a2a2a-live-gate-readiness" }
      ]
    ]
  };
}

export function getTelegramCommandRouterStatus(options = {}) {
  return {
    title: "SIRINX Telegram Command Router",
    status: "telegram-command-router-ready",
    mode: "dry-run-first-with-explicit-live-send-gate",
    acceptedCommands: [
      "/commands",
      "/status",
      "/hermes all jobs ready",
      "/hermes all jobs ready liveSend true",
      "/hermes mcp-sync",
      "/fusion smoke",
      "/fable5 preview",
      "/codex status",
      "/codex run status",
      "/agent loop status",
      "/agent loop fusion",
      "/a2a2a status",
      "/a2a2a dispatch preview",
      "/a2a2a gate check <exact gate>",
      "/a2a2a execute readiness",
      "/a2a2a execute command preview <exact gate>",
      "/a2a2a completion audit",
      "/a2a2a live gate readiness",
      "/daily report"
    ],
    callbackCommands: [
      "cmd:mcp-sync",
      "cmd:status",
      "cmd:hermes-all-jobs-ready",
      "cmd:fusion-smoke",
      "cmd:fable5-preview",
      "cmd:codex-status",
      "cmd:agent-loop-status",
      "cmd:agent-loop-fusion",
      "cmd:a2a2a-status",
      "cmd:a2a2a-dispatch-preview",
      "cmd:a2a2a-gate-check",
      "cmd:a2a2a-execute-readiness",
      "cmd:a2a2a-execute-command-preview",
      "cmd:a2a2a-completion-audit",
      "cmd:a2a2a-live-gate-readiness",
      "cmd:daily-report"
    ],
    guardrails: {
      arbitraryShell: false,
      deploy: false,
      push: false,
      publish: false,
      providerCallOnlyForFusionSmoke: false,
      fusionSmokeTelegramPreviewOnly: true,
      fusionProviderCallRequiresSeparateGate: true,
      providerCallRequiresOpenRouterKey: true,
      fable5PreviewReadOnly: true,
      fable5ProviderCallRequiresExplicitGate: true,
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

function formatStatusMessage(foundation, codex, loop) {
  return [
    "SIRINX Hermes Runtime Status",
    "",
    `Runtime: ${foundation.status}`,
    `OpenRouter ready: ${foundation.readiness.openRouter ? "yes" : "no"}`,
    `Telegram ready: ${foundation.readiness.telegram ? "yes" : "no"}`,
    `Cloudflare ready: ${foundation.readiness.cloudflare ? "yes" : "no"}`,
    `Codex runner: ${codex.status}`,
    `Agent loop: ${loop.status}`,
    "",
    foundation.warnings.length ? `Warnings: ${foundation.warnings.join(", ")}` : "Warnings: none"
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
    : await readRuntimeSecret("TELEGRAM_BOT_TOKEN", options);
  const home = options.chatId
    ? { ok: true, value: options.chatId, error: null }
    : await readRuntimeSecret("TELEGRAM_HOME_CHANNEL", options);
  const fallback = home.ok ? home : await readRuntimeSecret("TELEGRAM_CHAT_ID", options);

  return {
    ok: botCredential.ok && fallback.ok,
    token: botCredential,
    chat: fallback,
    error: !botCredential.ok ? "missing_telegram_bot_token" : !fallback.ok ? "missing_telegram_chat_target" : null
  };
}

export async function sendTelegramRouterMessage(message, options = {}) {
  const target = await resolveTelegramTarget(options);
  if (!target.ok) {
    return {
      status: "blocked-telegram-send",
      telegramSent: false,
      blockedReason: target.error,
      tokenPresent: target.token.present !== false,
      chatTargetPresent: target.chat.present !== false,
      keyValuePrinted: false,
      updatedAt: nowIso(options)
    };
  }

  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const response = await fetchImpl(`https://api.telegram.org/bot${target.token.value}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: target.chat.value,
      text: message.text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(message.replyMarkup ? { reply_markup: message.replyMarkup } : {})
    })
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
    keyValuePrinted: false,
    updatedAt: nowIso(options)
  };
}

export async function handleTelegramCommand(input = {}, options = {}) {
  const command = normalizeCommand(input.command || input.text || input.callbackData);
  const reportedCommand = command.startsWith("/a2a2a gate check")
    ? "/a2a2a gate check"
    : command.startsWith("/a2a2a execute readiness")
      ? "/a2a2a execute readiness"
      : command.startsWith("/a2a2a execute command preview")
        ? "/a2a2a execute command preview"
        : command.startsWith("/hermes all jobs ready")
          ? "/hermes all jobs ready"
      : command;
  let message;
  let actionResult = null;

  if (command === "/commands" || command === "cmd:commands") {
    message = {
      text: "SIRINX Command Menu\nเลือกคำสั่งที่ต้องการให้ Hermes/Codex ตรวจหรือรันแบบปลอดภัย",
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (command === "/status" || command === "cmd:status") {
    const [foundation, codex, loop] = await Promise.all([
      getRuntimeFoundationStatus(options),
      getCodexTaskRunnerStatus(options),
      getAgentLoopRuntimeStatus(options)
    ]);
    message = {
      text: formatStatusMessage(foundation, codex, loop),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (command.startsWith("/hermes all jobs ready") || command === "cmd:hermes-all-jobs-ready") {
    actionResult = await getHermesAllJobsReadiness({
      ...options,
      liveSendRequested: command === "cmd:hermes-all-jobs-ready" ? false : commandRequestsLiveSend(input)
    });
    message = {
      text: formatHermesAllJobsReadinessMessage(actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (command === "/fusion smoke" || command === "cmd:fusion-smoke") {
    const status = getOpenRouterFusionRouterStatus(options);
    actionResult = createOpenRouterFusionRouterDryRun(
      {
        requestId: "telegram-fusion-smoke-preview",
        goal: "Preview OpenRouter Fusion routing for Hermes without provider execution."
      },
      options
    );
    message = {
      text: [
        "OpenRouter Fusion Smoke Preview",
        "",
        `Status: ${actionResult.status}`,
        `Provider: ${status.provider}`,
        `Model: ${status.model}`,
        `Provider called: ${actionResult.providerCalled ? "yes" : "no"}`,
        `Secrets read: ${actionResult.secretsRead ? "yes" : "no"}`,
        "Retry loop: blocked",
        "Next gate: separate bounded provider-call approval required"
      ].join("\n"),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (command === "/fable5 preview" || command === "cmd:fable5-preview") {
    const status = getOpenRouterFable5AdapterStatus(options);
    actionResult = createOpenRouterFable5AdapterDryRun(
      {
        requestId: "telegram-fable5-preview",
        goal: "Configure Hermes Telegram to route high-reasoning tasks through OpenRouter Fable5 in preview-only mode."
      },
      options
    );
    message = {
      text: [
        "OpenRouter Fable5 Preview",
        "",
        `Status: ${actionResult.status}`,
        `Provider: ${status.provider}`,
        `Model: ${status.model.primary}`,
        `Provider called: ${actionResult.providerCalled ? "yes" : "no"}`,
        `Secrets read: ${actionResult.secretsRead ? "yes" : "no"}`,
        `Next gate: ${status.gates.providerCall.requiredApproval}`
      ].join("\n"),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (command === "/codex status" || command === "cmd:codex-status") {
    const codex = getCodexTaskRunnerStatus(options);
    message = {
      text: `Codex Runner: ${codex.status}\nAllowed tasks: ${codex.allowedTasks.map((task) => task.id).join(", ")}`,
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (command === "/codex run status") {
    actionResult = await runCodexTask({ requestId: "telegram-codex-status", task: "status" }, options);
    message = {
      text: formatResultMessage("Codex Local Task", actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (command === "/agent loop status" || command === "cmd:agent-loop-status") {
    const loop = getAgentLoopRuntimeStatus(options);
    message = {
      text: `Agent Loop: ${loop.status}\nStages: ${loop.stages.join(" -> ")}`,
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (command === "/agent loop fusion" || command === "cmd:agent-loop-fusion") {
    actionResult = await runAgentLoop({ requestId: "telegram-agent-loop-fusion", goal: "Review fusion runtime readiness" }, options);
    message = {
      text: formatResultMessage("Agent Loop Fusion Runtime", actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (command === "/a2a2a status" || command === "cmd:a2a2a-status") {
    actionResult = await getA2A2AStatusSurface(options);
    message = {
      text: formatA2A2AStatusMessage(actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (command === "/a2a2a dispatch preview" || command === "cmd:a2a2a-dispatch-preview") {
    actionResult = await getA2A2ADispatchPreviewSurface(options);
    message = {
      text: formatA2A2ADispatchPreviewMessage(actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (command.startsWith("/a2a2a gate check") || command === "cmd:a2a2a-gate-check") {
    actionResult = await getA2A2AGateCheckSurface({
      ...options,
      gateText: command === "cmd:a2a2a-gate-check" ? "" : extractA2A2AGateCheckText(input)
    });
    message = {
      text: formatA2A2AGateCheckMessage(actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (command.startsWith("/a2a2a execute readiness") || command === "cmd:a2a2a-execute-readiness") {
    actionResult = await getA2A2AExecuteReadinessSurface({
      ...options,
      gateText: command === "cmd:a2a2a-execute-readiness" ? "" : extractA2A2AExecuteReadinessText(input)
    });
    message = {
      text: formatA2A2AExecuteReadinessMessage(actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (command.startsWith("/a2a2a execute command preview") || command === "cmd:a2a2a-execute-command-preview") {
    actionResult = await getA2A2AExecuteCommandPreviewSurface({
      ...options,
      gateText: command === "cmd:a2a2a-execute-command-preview" ? "" : extractA2A2AExecuteCommandPreviewText(input)
    });
    message = {
      text: formatA2A2AExecuteCommandPreviewMessage(actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (command === "/a2a2a completion audit" || command === "cmd:a2a2a-completion-audit") {
    actionResult = await getA2A2ACompletionAuditSurface(options);
    message = {
      text: formatA2A2ACompletionAuditMessage(actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (command === "/a2a2a live gate readiness" || command === "cmd:a2a2a-live-gate-readiness") {
    actionResult = await getA2A2ALiveGateReadinessSurface(options);
    message = {
      text: formatA2A2ALiveGateReadinessMessage(actionResult),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (command === "/daily report" || command === "cmd:daily-report") {
    const foundation = await getRuntimeFoundationStatus(options);
    message = {
      text: [
        "SIRINX Daily Runtime Report",
        "",
        `Runtime: ${foundation.status}`,
        `OpenRouter: ${foundation.readiness.openRouter ? "ready" : "blocked"}`,
        `Telegram: ${foundation.readiness.telegram ? "ready" : "blocked"}`,
        `Cloudflare: ${foundation.readiness.cloudflare ? "ready" : "blocked"}`,
        "",
        "Next: run /agent loop fusion after credentials are complete."
      ].join("\n"),
      replyMarkup: buildTelegramCommandMenu()
    };
  } else if (command === "/hermes mcp-sync" || command === "cmd:mcp-sync") {
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
  } else {
    message = {
      text: `Unknown command: ${safeString(input.command || input.text || input.callbackData)}\nใช้ /commands เพื่อเปิดเมนูคำสั่ง`,
      replyMarkup: buildTelegramCommandMenu()
    };
  }

  const sendResult =
    options.liveSend === true
      ? await sendTelegramRouterMessage(message, options)
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
