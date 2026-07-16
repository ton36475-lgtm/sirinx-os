import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleTelegramCommand } from "./telegram-command-router.mjs";
import { loadTelegramGatewayConfig } from "./telegram-gateway-config.mjs";
import { readRuntimeSecretCompat } from "./runtime-foundation.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const DEFAULT_OFFSET_PATH = path.join(REPO_ROOT, ".ghostclaw_runtime/telegram/offset.json");
const DEFAULT_RECEIPT_PATH = path.join(REPO_ROOT, ".ghostclaw_runtime/telegram/receipts/poll-once-latest.json");
const DEFAULT_APPROVAL_ROOT = path.join(REPO_ROOT, ".ghostclaw_runtime/telegram/approvals/pending");
const DEFAULT_CONSUMED_APPROVAL_ROOT = path.join(REPO_ROOT, ".ghostclaw_runtime/telegram/approvals/consumed");
const MAX_UPDATES_PER_POLL = 20;

function nowIso(options = {}) {
  const now = options.now || (() => new Date());
  const value = typeof now === "function" ? now() : now;
  return value.toISOString();
}

function safeString(value) {
  return String(value ?? "").trim();
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJsonAtomic(filePath, value) {
  const tempPath = `${filePath}.${process.pid}.tmp`;
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(tempPath, filePath);
}

async function resolveCredentials(options = {}) {
  const token = options.token
    ? { ok: true, value: options.token, present: true }
    : await readRuntimeSecretCompat("TelegramBotToken", ["TELEGRAM_BOT_TOKEN"], options);
  const primaryChat = options.chatId
    ? { ok: true, value: options.chatId, present: true }
    : await readRuntimeSecretCompat("TelegramHomeChannel", ["TELEGRAM_HOME_CHANNEL"], options);
  const fallbackChat = primaryChat.ok
    ? primaryChat
    : await readRuntimeSecretCompat("TelegramChatId", ["TELEGRAM_CHAT_ID"], options);
  return {
    ok: token.ok && fallbackChat.ok,
    token,
    chat: fallbackChat,
    blockedReason: !token.ok ? "missing_telegram_bot_token" : !fallbackChat.ok ? "missing_telegram_chat_target" : null
  };
}

function validReceiptId(value) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(safeString(value));
}

async function resolveLiveApprovalOptions(options = {}) {
  if (options.liveSendResponses !== true) return { ok: true, routerOptions: {} };

  let config;
  try {
    ({ config } = await loadTelegramGatewayConfig({
      root: options.repoRoot || options.root || REPO_ROOT,
      configPath: options.telegramGatewayConfigPath
    }));
  } catch {
    return { ok: false, blockedReason: "telegram_gateway_config_unavailable", routerOptions: {} };
  }

  const receiptId = safeString(options.approvalReceiptId || options.liveSendExpectedReceiptId);
  const providedObject = options.liveSendApprovalReceipt && typeof options.liveSendApprovalReceipt === "object";
  if (!providedObject && !validReceiptId(receiptId)) {
    return { ok: false, blockedReason: "telegram_live_approval_receipt_id_required", routerOptions: {} };
  }

  const signingCredential = options.telegramApprovalSigningKey
    ? { ok: true, value: options.telegramApprovalSigningKey, sourceKey: "injected" }
    : await readRuntimeSecretCompat(
        "GhostClawTelegramTrustKey",
        ["GHOSTCLAW_TELEGRAM_TRUST_KEY"],
        options
      );
  if (!signingCredential.ok) {
    return { ok: false, blockedReason: "telegram_approval_signing_key_required", routerOptions: {} };
  }

  const approvalRoot = path.resolve(options.liveSendApprovalReceiptRoot || DEFAULT_APPROVAL_ROOT);
  const consumedRoot = path.resolve(options.liveSendConsumedReceiptRoot || DEFAULT_CONSUMED_APPROVAL_ROOT);
  return {
    ok: true,
    routerOptions: {
      liveSendExactGate: safeString(config?.gates?.liveSend?.requiredApproval),
      liveSendApprovalReceipt: providedObject ? options.liveSendApprovalReceipt : null,
      liveSendApprovalReceiptPath: providedObject
        ? null
        : path.resolve(options.liveSendApprovalReceiptPath || path.join(approvalRoot, `${receiptId}.json`)),
      liveSendApprovalReceiptRoot: providedObject ? null : approvalRoot,
      liveSendConsumedReceiptRoot: providedObject ? null : consumedRoot,
      liveSendExpectedReceiptId: providedObject
        ? safeString(options.liveSendApprovalReceipt.receiptId)
        : receiptId,
      telegramApprovalSigningKey: signingCredential.value,
      allowProvidedReceiptObject: providedObject && options.allowProvidedReceiptObject === true,
      consumeTelegramApprovalReceipt: options.consumeTelegramApprovalReceipt
    }
  };
}

async function callTelegram(method, payload, credentials, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const response = await fetchImpl(`https://api.telegram.org/bot${credentials.token.value}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: options.signal || AbortSignal.timeout(options.timeoutMs || 15_000)
  });
  const raw = await response.text();
  let body = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = null;
  }
  return {
    ok: response.ok && body?.ok === true,
    httpStatus: response.status,
    body,
    errorClass: response.ok ? null : safeString(body?.description || raw).slice(0, 300)
  };
}

export function extractTelegramCommand(update = {}) {
  if (update.callback_query) {
    return {
      updateId: update.update_id,
      kind: "callback_query",
      callbackQueryId: safeString(update.callback_query.id),
      chatId: safeString(update.callback_query.message?.chat?.id),
      userId: safeString(update.callback_query.from?.id),
      input: { callbackData: safeString(update.callback_query.data) }
    };
  }
  if (update.message?.text) {
    return {
      updateId: update.update_id,
      kind: "message",
      callbackQueryId: null,
      chatId: safeString(update.message.chat?.id),
      userId: safeString(update.message.from?.id),
      input: { text: safeString(update.message.text) }
    };
  }
  return null;
}

export async function getTelegramCommandGatewayStatus(options = {}) {
  const credentials = await resolveCredentials(options);
  const offsetPath = options.offsetPath || DEFAULT_OFFSET_PATH;
  const offset = await readJson(offsetPath, { nextUpdateId: 0 });
  return {
    title: "SIRINX Telegram Command Gateway",
    status: credentials.ok ? "telegram-command-gateway-ready" : "telegram-command-gateway-blocked",
    mode: "authenticated-poll-once",
    credentialPresence: {
      token: credentials.token.present === true,
      chatTarget: credentials.chat.present === true
    },
    nextUpdateId: Number(offset.nextUpdateId || 0),
    policies: {
      configuredChatOnly: true,
      arbitraryShell: false,
      directDeploy: false,
      directPush: false,
      providerCallFromButton: false,
      receiptRequired: true,
      daemonLoop: false
    },
    blockedReason: credentials.blockedReason,
    keyValuePrinted: false,
    updatedAt: nowIso(options)
  };
}

export async function pollTelegramCommandsOnce(options = {}) {
  const offsetPath = options.offsetPath || DEFAULT_OFFSET_PATH;
  const receiptPath = options.receiptPath || DEFAULT_RECEIPT_PATH;
  const startedAt = nowIso(options);
  const liveApproval = await resolveLiveApprovalOptions(options);
  if (!liveApproval.ok) {
    return {
      status: "blocked-telegram-command-poll-live-approval",
      blockedReason: liveApproval.blockedReason,
      updatesReceived: 0,
      commandsProcessed: 0,
      externalNetworkRead: false,
      externalWrites: false,
      keyValuePrinted: false,
      startedAt,
      updatedAt: nowIso(options)
    };
  }

  const credentials = await resolveCredentials(options);
  if (!credentials.ok) {
    return {
      status: "blocked-telegram-command-poll",
      blockedReason: credentials.blockedReason,
      updatesReceived: 0,
      commandsProcessed: 0,
      externalWrites: false,
      keyValuePrinted: false,
      startedAt,
      updatedAt: nowIso(options)
    };
  }

  const offset = await readJson(offsetPath, { nextUpdateId: 0 });
  const poll = await callTelegram(
    "getUpdates",
    {
      offset: Number(offset.nextUpdateId || 0),
      limit: MAX_UPDATES_PER_POLL,
      timeout: 0,
      allowed_updates: ["message", "callback_query"]
    },
    credentials,
    options
  );
  if (!poll.ok || !Array.isArray(poll.body?.result)) {
    return {
      status: "failed-telegram-command-poll",
      blockedReason: poll.errorClass || "telegram_get_updates_failed",
      httpStatus: poll.httpStatus,
      updatesReceived: 0,
      commandsProcessed: 0,
      externalNetworkRead: true,
      externalWrites: false,
      keyValuePrinted: false,
      startedAt,
      updatedAt: nowIso(options)
    };
  }

  const updates = poll.body.result.slice(0, MAX_UPDATES_PER_POLL);
  const commandResults = [];
  let maxUpdateId = Number(offset.nextUpdateId || 0) - 1;
  for (const update of updates) {
    maxUpdateId = Math.max(maxUpdateId, Number(update.update_id || 0));
    const command = extractTelegramCommand(update);
    if (!command) {
      commandResults.push({ updateId: update.update_id, status: "ignored-unsupported-update" });
      continue;
    }
    if (command.chatId !== safeString(credentials.chat.value)) {
      commandResults.push({
        updateId: command.updateId,
        status: "blocked-unauthorized-chat",
        kind: command.kind,
        userIdPresent: Boolean(command.userId)
      });
      continue;
    }

    const routed = await handleTelegramCommand(command.input, {
      ...options,
      ...liveApproval.routerOptions,
      token: credentials.token.value,
      chatId: credentials.chat.value,
      liveSend: options.liveSendResponses === true
    });
    let callbackAcknowledged = false;
    const liveResponseAuthorized = routed.sendResult?.gateAssessment?.authorized === true;
    if (
      command.callbackQueryId &&
      options.acknowledgeCallbacks !== false &&
      liveResponseAuthorized
    ) {
      const acknowledgement = await callTelegram(
        "answerCallbackQuery",
        { callback_query_id: command.callbackQueryId, text: routed.handler === "unknown_command" ? "Unknown command" : "Command received" },
        credentials,
        options
      );
      callbackAcknowledged = acknowledgement.ok;
    }
    commandResults.push({
      updateId: command.updateId,
      status: routed.status,
      commandId: routed.commandId,
      handler: routed.handler,
      owner: routed.owner,
      actionClass: routed.actionClass,
      telegramSent: routed.sendResult.telegramSent,
      callbackAcknowledged,
      providerCalled: routed.providerCalled,
      externalWrites: routed.externalWrites,
      liveResponseAuthorized
    });
  }

  const nextUpdateId = updates.length ? maxUpdateId + 1 : Number(offset.nextUpdateId || 0);
  if (options.storeOffset !== false) {
    await writeJsonAtomic(offsetPath, { nextUpdateId, updatedAt: nowIso(options) });
  }
  const externalWrites = commandResults.some(
    (result) => result.telegramSent === true || result.callbackAcknowledged === true
  );
  const receipt = {
    title: "SIRINX Telegram Command Gateway Poll Receipt",
    status: "completed-telegram-command-poll",
    mode: "authenticated-poll-once",
    updatesReceived: updates.length,
    commandsProcessed: commandResults.filter((result) => result.commandId).length,
    unauthorizedUpdates: commandResults.filter((result) => result.status === "blocked-unauthorized-chat").length,
    nextUpdateId,
    commandResults,
    liveSendResponses: options.liveSendResponses === true,
    externalNetworkRead: true,
    externalWrites,
    providerCalled: commandResults.some((result) => result.providerCalled),
    deploy: false,
    push: false,
    keyValuePrinted: false,
    startedAt,
    updatedAt: nowIso(options)
  };
  if (options.storeReceipt !== false) await writeJsonAtomic(receiptPath, receipt);
  return { ...receipt, receiptPath };
}
