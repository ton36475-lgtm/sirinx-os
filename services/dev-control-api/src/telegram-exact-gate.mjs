import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { link, mkdir, readFile, realpath, unlink } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { loadTelegramGatewayConfig } from "./telegram-gateway-config.mjs";

export const TELEGRAM_APPROVAL_RECEIPT_SCHEMA = "ghostclaw.telegram.approval-receipt.v2";
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const MAX_RECEIPT_TTL_MS = 10 * 60 * 1000;

function nowDate(options = {}) {
  const now = options.now || (() => new Date());
  const value = typeof now === "function" ? now() : now;
  return value instanceof Date ? value : new Date(value);
}

function safeString(value) {
  return String(value ?? "").trim();
}

function equalText(left, right) {
  const leftBuffer = Buffer.from(safeString(left));
  const rightBuffer = Buffer.from(safeString(right));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function digest(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function validReceiptId(value) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(safeString(value));
}

function validSigningKey(value) {
  return Buffer.byteLength(safeString(value), "utf8") >= 32;
}

export function digestTelegramExactGate(value) {
  return digest(safeString(value));
}

export function digestTelegramRecipientTarget(value) {
  return digestTelegramExactGate(value);
}

export function createTelegramApprovalTarget(input = {}) {
  return {
    Scope: safeString(input.scope),
    CommandId: safeString(input.commandId),
    RequestId: safeString(input.requestId),
    RecipientTargetDigest: safeString(input.recipientTargetDigest)
  };
}

export function digestTelegramApprovalTarget(input = {}) {
  return digest(JSON.stringify(stableValue(createTelegramApprovalTarget(input))));
}

function approvalReceiptSigningPayload(receipt = {}) {
  return JSON.stringify(stableValue({
    $schema: receipt.$schema,
    receiptId: receipt.receiptId,
    status: receipt.status,
    scope: receipt.scope,
    commandId: receipt.commandId,
    requestId: receipt.requestId,
    requestedBy: receipt.requestedBy,
    approvedBy: receipt.approvedBy,
    issuedAt: receipt.issuedAt,
    expiresAt: receipt.expiresAt,
    gateDigest: receipt.gateDigest,
    targetDigest: receipt.targetDigest,
    recipientEvidence: receipt.recipientEvidence,
    singleUse: receipt.singleUse,
    signatureAlgorithm: receipt.signatureAlgorithm
  }));
}

export function signTelegramApprovalReceipt(receipt = {}, signingKey = "") {
  const normalizedKey = safeString(signingKey);
  if (!validSigningKey(normalizedKey)) {
    throw new Error("Telegram approval signing key must contain at least 32 bytes");
  }
  return createHmac("sha256", normalizedKey)
    .update(approvalReceiptSigningPayload(receipt), "utf8")
    .digest("hex");
}

export function createTelegramApprovalReceipt(input = {}, options = {}) {
  const signingKey = safeString(options.signingKey);
  if (!validSigningKey(signingKey)) {
    throw new Error("Telegram approval signing key must contain at least 32 bytes");
  }
  if (!validReceiptId(input.receiptId)) {
    throw new Error("Telegram approval receipt id is invalid");
  }
  const issuedAt = new Date(input.issuedAt || new Date());
  const expiresAt = new Date(input.expiresAt || issuedAt.getTime() + 5 * 60 * 1000);
  const scope = safeString(input.scope);
  const recipientTargetDigest = scope === "telegram_live_send"
    ? digestTelegramRecipientTarget(input.recipientTarget)
    : "";
  const receipt = {
    $schema: TELEGRAM_APPROVAL_RECEIPT_SCHEMA,
    receiptId: safeString(input.receiptId),
    status: "approved",
    scope,
    commandId: safeString(input.commandId),
    ...(safeString(input.requestId) ? { requestId: safeString(input.requestId) } : {}),
    requestedBy: safeString(input.requestedBy),
    approvedBy: safeString(input.approvedBy),
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    gateDigest: digestTelegramExactGate(input.exactGate),
    targetDigest: digestTelegramApprovalTarget({
      scope,
      commandId: input.commandId,
      requestId: input.requestId,
      recipientTargetDigest
    }),
    singleUse: true,
    signatureAlgorithm: "hmac-sha256"
  };

  if (scope === "telegram_live_send") {
    receipt.recipientEvidence = {
      configuredChatMatched: input.configuredChatMatched === true,
      tokenPresenceOnlyChecked: input.tokenPresenceOnlyChecked === true,
      targetDigest: recipientTargetDigest
    };
  }
  return {
    ...receipt,
    receiptSignature: signTelegramApprovalReceipt(receipt, signingKey)
  };
}

async function loadApprovalReceipt(options = {}) {
  if (options.approvalReceipt && typeof options.approvalReceipt === "object") {
    if (options.allowProvidedReceiptObject !== true) {
      return {
        receipt: null,
        source: "untrusted_object",
        path: null,
        error: "provided_approval_receipt_not_trusted"
      };
    }
    return {
      receipt: options.approvalReceipt,
      source: "provided_object",
      path: null,
      error: null
    };
  }
  if (!options.approvalReceiptPath) {
    return { receipt: null, source: "missing", path: null, error: "approval_receipt_required" };
  }
  if (!options.approvalReceiptRoot) {
    return { receipt: null, source: "missing_root", path: null, error: "approval_receipt_root_required" };
  }
  try {
    const resolvedPath = await realpath(options.approvalReceiptPath);
    const resolvedRoot = await realpath(options.approvalReceiptRoot);
    const rootRelativePath = relative(resolvedRoot, resolvedPath);
    if (rootRelativePath.startsWith("..") || resolve(resolvedRoot, rootRelativePath) !== resolvedPath) {
      return {
        receipt: null,
        source: "path_outside_root",
        path: null,
        error: "approval_receipt_path_outside_root"
      };
    }
    return {
      receipt: JSON.parse(await readFile(resolvedPath, "utf8")),
      source: "pre_existing_file",
      path: resolvedPath,
      error: null
    };
  } catch {
    return { receipt: null, source: "invalid_file", path: null, error: "approval_receipt_unreadable" };
  }
}

async function claimApprovalReceiptFile(options = {}) {
  const expectedReceiptId = safeString(options.expectedReceiptId);
  if (!validReceiptId(expectedReceiptId)) {
    return { claimed: false, reason: "approval_receipt_expected_id_required" };
  }
  if (!options.approvalReceiptPath || !options.approvalReceiptRoot) {
    return { claimed: false, reason: "approval_receipt_file_required" };
  }
  const claimedRoot = resolve(
    options.consumedReceiptRoot
      || join(dirname(resolve(options.approvalReceiptPath)), "..", "consumed")
  );
  const claimedPath = join(claimedRoot, `${expectedReceiptId}.json`);
  try {
    await mkdir(claimedRoot, { recursive: true });
    try {
      await realpath(claimedPath);
      return { claimed: false, reason: "approval_receipt_already_consumed" };
    } catch {
      // The destination must not exist before the atomic hard-link claim.
    }
    const resolvedPath = await realpath(options.approvalReceiptPath);
    const resolvedRoot = await realpath(options.approvalReceiptRoot);
    const rootRelativePath = relative(resolvedRoot, resolvedPath);
    if (rootRelativePath.startsWith("..") || resolve(resolvedRoot, rootRelativePath) !== resolvedPath) {
      return { claimed: false, reason: "approval_receipt_path_outside_root" };
    }
    await link(resolvedPath, claimedPath);
    await unlink(resolvedPath);
    return { claimed: true, claimedPath, claimedRoot };
  } catch (error) {
    return {
      claimed: false,
      reason: error?.code === "EEXIST"
        ? "approval_receipt_already_consumed"
        : "approval_receipt_claim_failed"
    };
  }
}

function resolveExpectedGate(scope, context, config, options = {}) {
  if (scope === "telegram_live_send") {
    return config?.gates?.liveSend?.requiredApproval || "";
  }
  if (scope === "provider_call") {
    const pattern = safeString(config?.gates?.providerCall?.requiredApprovalPattern);
    const requestId = safeString(context.requestId);
    return requestId ? pattern.replace("<request_id>", requestId) : "";
  }
  if (scope === "runtime_restart") {
    return config?.gates?.runtimeRestart?.requiredApproval || "";
  }
  if (scope === "command_execution") {
    return safeString(options.requiredExactGate);
  }
  return "";
}

function validateReceipt(receipt, expected, context, options = {}) {
  const issues = [];
  const now = nowDate(options);
  const issuedAt = new Date(receipt?.issuedAt || "invalid");
  const expiresAt = new Date(receipt?.expiresAt || "invalid");
  const recipientTargetDigest = safeString(receipt?.recipientEvidence?.targetDigest);
  const targetDigest = digestTelegramApprovalTarget({
    scope: context.scope,
    commandId: context.commandId,
    requestId: context.requestId,
    recipientTargetDigest: context.scope === "telegram_live_send" ? recipientTargetDigest : ""
  });

  if (receipt?.$schema !== TELEGRAM_APPROVAL_RECEIPT_SCHEMA) issues.push("approval_receipt_schema_mismatch");
  if (!validReceiptId(receipt?.receiptId)) issues.push("approval_receipt_id_invalid");
  if (options.expectedReceiptId && safeString(receipt?.receiptId) !== safeString(options.expectedReceiptId)) {
    issues.push("approval_receipt_id_mismatch");
  }
  if (receipt?.status !== "approved") issues.push("approval_receipt_not_approved");
  if (receipt?.scope !== context.scope) issues.push("approval_receipt_scope_mismatch");
  if (!safeString(receipt?.requestedBy)) issues.push("approval_receipt_requester_required");
  if (!safeString(receipt?.approvedBy)) issues.push("approval_receipt_approver_required");
  if (safeString(receipt?.approvedBy) === safeString(receipt?.requestedBy) && safeString(receipt?.approvedBy)) {
    issues.push("approval_receipt_self_approval_blocked");
  }
  if (!Number.isFinite(issuedAt.getTime()) || issuedAt > now) issues.push("approval_receipt_issued_at_invalid");
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= now) issues.push("approval_receipt_expired");
  if (
    Number.isFinite(issuedAt.getTime()) &&
    Number.isFinite(expiresAt.getTime()) &&
    (expiresAt <= issuedAt || expiresAt.getTime() - issuedAt.getTime() > MAX_RECEIPT_TTL_MS)
  ) {
    issues.push("approval_receipt_ttl_invalid");
  }
  if (!equalText(receipt?.gateDigest, digestTelegramExactGate(expected))) {
    issues.push("approval_receipt_gate_digest_mismatch");
  }
  if (safeString(receipt?.commandId) !== safeString(context.commandId)) {
    issues.push("approval_receipt_command_mismatch");
  }
  if (safeString(receipt?.requestId) !== safeString(context.requestId)) {
    issues.push("approval_receipt_request_mismatch");
  }
  if (!equalText(receipt?.targetDigest, targetDigest)) issues.push("approval_receipt_target_mismatch");
  if (receipt?.singleUse !== true) issues.push("approval_receipt_single_use_required");
  if (receipt?.signatureAlgorithm !== "hmac-sha256") {
    issues.push("approval_receipt_signature_algorithm_mismatch");
  }
  if (!validSigningKey(options.receiptSigningKey)) {
    issues.push("approval_receipt_signing_key_required");
  } else if (!equalText(receipt?.receiptSignature, signTelegramApprovalReceipt(receipt, options.receiptSigningKey))) {
    issues.push("approval_receipt_signature_mismatch");
  }
  if (Object.hasOwn(receipt || {}, "gate") || Object.hasOwn(receipt || {}, "exactGate")) {
    issues.push("approval_receipt_must_not_store_raw_gate");
  }
  if (
    context.scope === "telegram_live_send" &&
    (receipt?.recipientEvidence?.configuredChatMatched !== true ||
      receipt?.recipientEvidence?.tokenPresenceOnlyChecked !== true)
  ) {
    issues.push("approval_receipt_recipient_evidence_required");
  }
  if (context.scope === "telegram_live_send" && !SHA256_PATTERN.test(recipientTargetDigest)) {
    issues.push("approval_receipt_recipient_target_digest_required");
  }

  return {
    issues,
    expiresAt: Number.isFinite(expiresAt.getTime()) ? expiresAt.toISOString() : null,
    recipientTargetDigest: SHA256_PATTERN.test(recipientTargetDigest) ? recipientTargetDigest : null,
    targetDigest
  };
}

export async function evaluateTelegramExactGate(context = {}, options = {}) {
  const root = options.repoRoot || options.root || process.cwd();
  let config;
  try {
    ({ config } = await loadTelegramGatewayConfig({
      root,
      configPath: options.telegramGatewayConfigPath
    }));
  } catch {
    return {
      required: true,
      authorized: false,
      status: "blocked_exact_gate",
      reason: "telegram_gateway_config_unavailable",
      issues: ["telegram_gateway_config_unavailable"],
      scope: safeString(context.scope),
      commandId: safeString(context.commandId) || null,
      requestIdPresent: Boolean(safeString(context.requestId)),
      receiptPresent: Boolean(options.approvalReceipt || options.approvalReceiptPath),
      keyValuePrinted: false
    };
  }

  const scope = safeString(context.scope);
  const commandId = safeString(context.commandId);
  const requestId = safeString(context.requestId);
  const expected = resolveExpectedGate(scope, { requestId }, config, options);
  const provided = safeString(options.exactGate);
  const loadedReceipt = await loadApprovalReceipt(options);
  const issues = [];

  if (!expected) issues.push("required_exact_gate_not_configured");
  if (!provided) issues.push("exact_gate_required");
  if (expected && provided && !equalText(provided, expected)) issues.push("exact_gate_mismatch");
  if (loadedReceipt.error) issues.push(loadedReceipt.error);

  let expiresAt = null;
  let recipientTargetDigest = null;
  let targetDigest = null;
  if (loadedReceipt.receipt && expected) {
    const validation = validateReceipt(
      loadedReceipt.receipt,
      expected,
      { scope, commandId, requestId },
      options
    );
    issues.push(...validation.issues);
    expiresAt = validation.expiresAt;
    recipientTargetDigest = validation.recipientTargetDigest;
    targetDigest = validation.targetDigest;
  }

  return {
    required: true,
    authorized: issues.length === 0,
    status: issues.length === 0 ? "authorized_exact_gate" : "blocked_exact_gate",
    reason: issues[0] || null,
    issues,
    scope,
    commandId: commandId || null,
    requestIdPresent: Boolean(requestId),
    receiptPresent: Boolean(loadedReceipt.receipt),
    receiptSource: loadedReceipt.source,
    receiptPath: loadedReceipt.path,
    receiptId: loadedReceipt.receipt?.receiptId || null,
    expiresAt,
    recipientTargetDigest,
    targetDigest,
    gateDigest: expected ? digestTelegramExactGate(expected) : null,
    keyValuePrinted: false
  };
}

async function consumeTelegramApprovalReceipt(validation = {}, options = {}) {
  if (!validation.authorized) {
    return { consumed: false, reason: "approval_receipt_not_authorized" };
  }
  if (validation.receiptSource === "provided_object") {
    if (typeof options.consumeReceipt !== "function") {
      return { consumed: false, reason: "approval_receipt_consumer_required" };
    }
    try {
      const consumed = await options.consumeReceipt({
        receiptId: validation.receiptId,
        targetDigest: validation.targetDigest
      });
      return {
        consumed: consumed === true,
        reason: consumed === true ? null : "approval_receipt_already_consumed"
      };
    } catch {
      return { consumed: false, reason: "approval_receipt_consume_failed" };
    }
  }
  if (validation.receiptSource !== "pre_existing_file" || !validation.receiptPath) {
    return { consumed: false, reason: "approval_receipt_file_required" };
  }
  if (validation.receiptClaimed !== true) {
    return { consumed: false, reason: "approval_receipt_atomic_claim_required" };
  }
  return { consumed: true, reason: null };
}

function publicGateResult(result = {}) {
  const { receiptPath, ...safeResult } = result;
  return safeResult;
}

export async function authorizeTelegramExactGate(context = {}, options = {}) {
  let evaluationOptions = options;
  let claim = null;
  if (!options.approvalReceipt && options.approvalReceiptPath) {
    claim = await claimApprovalReceiptFile(options);
    if (!claim.claimed) {
      return {
        required: true,
        authorized: false,
        status: "blocked_exact_gate",
        reason: claim.reason,
        issues: [claim.reason],
        scope: safeString(context.scope),
        commandId: safeString(context.commandId) || null,
        requestIdPresent: Boolean(safeString(context.requestId)),
        receiptPresent: false,
        receiptSource: "file_claim_failed",
        receiptId: safeString(options.expectedReceiptId) || null,
        receiptConsumed: false,
        keyValuePrinted: false
      };
    }
    evaluationOptions = {
      ...options,
      approvalReceiptPath: claim.claimedPath,
      approvalReceiptRoot: claim.claimedRoot
    };
  }

  const validation = await evaluateTelegramExactGate(context, evaluationOptions);
  if (claim?.claimed) validation.receiptClaimed = true;
  if (!validation.authorized) {
    return publicGateResult({ ...validation, receiptConsumed: false });
  }
  const consumption = await consumeTelegramApprovalReceipt(validation, evaluationOptions);
  if (!consumption.consumed) {
    return publicGateResult({
      ...validation,
      authorized: false,
      status: "blocked_exact_gate",
      reason: consumption.reason,
      issues: [...validation.issues, consumption.reason],
      receiptConsumed: false
    });
  }
  return publicGateResult({
    ...validation,
    status: "authorized_and_consumed_exact_gate",
    receiptConsumed: true
  });
}

export function getTelegramExecutionIntent(options = {}) {
  return {
    requested:
      options.executionRequested === true ||
      options.providerCall === true ||
      options.deploy === true ||
      options.runtimeMutation === true,
    providerCall: options.providerCall === true,
    deploy: options.deploy === true,
    runtimeMutation: options.runtimeMutation === true
  };
}

export function getTelegramCommandGateScope(commandDefinition = {}) {
  if (commandDefinition.actionClass === "provider_preview") return "provider_call";
  if (commandDefinition.id === "runtime_reset") return "runtime_restart";
  return "command_execution";
}
