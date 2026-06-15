import { getAgentLoopRuntimeStatus, runAgentLoop } from "./agent-loop-runtime.mjs";
import { getCodexTaskRunnerStatus, runCodexTask } from "./codex-task-runner.mjs";
import { runOpenRouterFusionLiveSmoke } from "./openrouter-fusion-router.mjs";
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

export function buildTelegramCommandMenu() {
  return {
    inline_keyboard: [
      [
        { text: "Hermes Status", callback_data: "cmd:status" },
        { text: "Fusion Smoke", callback_data: "cmd:fusion-smoke" }
      ],
      [
        { text: "Codex Queue", callback_data: "cmd:codex-status" },
        { text: "Agent Loop", callback_data: "cmd:agent-loop-status" }
      ],
      [
        { text: "Run Fusion Loop", callback_data: "cmd:agent-loop-fusion" },
        { text: "Daily Report", callback_data: "cmd:daily-report" }
      ]
    ]
  };
}

export function getTelegramCommandRouterStatus(options = {}) {
  return {
    title: "SIRINX Telegram Command Router",
    status: "telegram-command-router-ready",
    mode: "real-send-with-safe-command-map",
    acceptedCommands: [
      "/commands",
      "/status",
      "/fusion smoke",
      "/codex status",
      "/codex run status",
      "/agent loop status",
      "/agent loop fusion",
      "/daily report"
    ],
    callbackCommands: [
      "cmd:status",
      "cmd:fusion-smoke",
      "cmd:codex-status",
      "cmd:agent-loop-status",
      "cmd:agent-loop-fusion",
      "cmd:daily-report"
    ],
    guardrails: {
      arbitraryShell: false,
      deploy: false,
      push: false,
      publish: false,
      providerCallOnlyForFusionSmoke: true,
      providerCallRequiresOpenRouterKey: true,
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
  } else if (command === "/fusion smoke" || command === "cmd:fusion-smoke") {
    actionResult = await runOpenRouterFusionLiveSmoke({ requestId: "telegram-fusion-smoke" }, options);
    message = {
      text: formatResultMessage("OpenRouter Fusion Smoke", actionResult),
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
  } else {
    message = {
      text: `Unknown command: ${safeString(input.command || input.text || input.callbackData)}\nใช้ /commands เพื่อเปิดเมนูคำสั่ง`,
      replyMarkup: buildTelegramCommandMenu()
    };
  }

  const sendResult =
    options.liveSend === false
      ? {
          status: "telegram-send-preview",
          telegramSent: false,
          keyValuePrinted: false,
          updatedAt: nowIso(options)
        }
      : await sendTelegramRouterMessage(message, options);

  return {
    title: "SIRINX Telegram Command Router",
    status: sendResult.telegramSent ? "completed-telegram-command" : "blocked-or-preview-telegram-command",
    command,
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
