import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { link, mkdir, readFile, realpath, unlink } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

export const PROVIDER_CALL_APPROVAL_RECEIPT_SCHEMA = "ghostclaw.provider-call.approval-receipt.v2";

function safeString(value) {
  return String(value ?? "").trim();
}

function nowDate(options = {}) {
  const value = typeof options.now === "function" ? options.now() : options.now || new Date();
  return value instanceof Date ? value : new Date(value);
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

function hmacDigest(value, key) {
  return createHmac("sha256", key).update(value, "utf8").digest("hex");
}

function validReceiptId(value) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(safeString(value));
}

function validSigningKey(value) {
  return Buffer.byteLength(safeString(value), "utf8") >= 32;
}

export function digestProviderCallGate(value) {
  return digest(safeString(value));
}

export function createProviderCallTarget(input = {}) {
  const target = {
    RequestId: safeString(input.requestId ?? input.RequestId),
    CommandId: safeString(input.commandId ?? input.CommandId),
    Provider: safeString(input.provider ?? input.Provider),
    Model: safeString(input.model ?? input.Model),
    MaxTokens: Number(input.maxTokens ?? input.MaxTokens)
  };
  const optionalText = {
    TaskId: input.taskId ?? input.TaskId,
    CorrelationId: input.correlationId ?? input.CorrelationId,
    RequestDigestSha256: input.requestDigestSha256 ?? input.RequestDigestSha256,
    StateReceiptDigest: input.stateReceiptDigest ?? input.StateReceiptDigest,
    PromptDigestSha256: input.promptDigestSha256 ?? input.PromptDigestSha256,
    OutputPath: input.outputPath ?? input.OutputPath,
    WorkingDirectory: input.workingDirectory ?? input.WorkingDirectory,
    Route: input.route ?? input.Route,
    Mode: input.mode ?? input.Mode,
    ExecutableDigestSha256: input.executableDigestSha256 ?? input.ExecutableDigestSha256,
    ProviderCallAccounting: input.providerCallAccounting ?? input.ProviderCallAccounting,
    TokenLimitEnforcement: input.tokenLimitEnforcement ?? input.TokenLimitEnforcement
  };
  for (const [key, value] of Object.entries(optionalText)) {
    const normalized = safeString(value);
    if (normalized) target[key] = normalized;
  }
  const allowedTools = input.allowedTools ?? input.AllowedTools;
  if (Array.isArray(allowedTools)) {
    target.AllowedTools = [...new Set(allowedTools.map(safeString).filter(Boolean))].sort();
  }
  const optionalNumbers = {
    MaxTurns: input.maxTurns ?? input.MaxTurns,
    MaxBudgetUsd: input.maxBudgetUsd ?? input.MaxBudgetUsd,
    CallCountLimit: input.callCountLimit ?? input.CallCountLimit,
    InvocationCountLimit: input.invocationCountLimit ?? input.InvocationCountLimit,
    OutputCharacterCap: input.outputCharacterCap ?? input.OutputCharacterCap
  };
  for (const [key, value] of Object.entries(optionalNumbers)) {
    if (value !== undefined && value !== null && value !== "") target[key] = Number(value);
  }
  return target;
}

export function digestProviderCallTarget(input = {}) {
  return digest(JSON.stringify(stableValue(createProviderCallTarget(input))));
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
    budgetConfirmed: receipt.budgetConfirmed,
    singleUse: receipt.singleUse,
    signatureAlgorithm: receipt.signatureAlgorithm
  }));
}

export function signProviderCallApprovalReceipt(receipt = {}, signingKey = "") {
  const normalizedKey = safeString(signingKey);
  if (!validSigningKey(normalizedKey)) {
    throw new Error("Provider approval signing key must contain at least 32 bytes");
  }
  return hmacDigest(approvalReceiptSigningPayload(receipt), normalizedKey);
}

export function createProviderCallApprovalReceipt(input = {}, options = {}) {
  const signingKey = safeString(options.signingKey);
  if (!validSigningKey(signingKey)) {
    throw new Error("Provider approval signing key must contain at least 32 bytes");
  }
  if (!validReceiptId(input.receiptId)) {
    throw new Error("Provider approval receipt id is invalid");
  }
  const issuedAt = new Date(input.issuedAt || new Date());
  const expiresAt = new Date(input.expiresAt || issuedAt.getTime() + 5 * 60 * 1000);
  const target = createProviderCallTarget(input);
  const receipt = {
    $schema: PROVIDER_CALL_APPROVAL_RECEIPT_SCHEMA,
    receiptId: safeString(input.receiptId),
    status: "approved",
    scope: "provider_call",
    commandId: target.CommandId,
    requestId: target.RequestId,
    requestedBy: safeString(input.requestedBy),
    approvedBy: safeString(input.approvedBy),
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    gateDigest: digestProviderCallGate(input.exactGate),
    targetDigest: digestProviderCallTarget(target),
    budgetConfirmed: input.budgetConfirmed === true,
    singleUse: true,
    signatureAlgorithm: "hmac-sha256"
  };
  return {
    ...receipt,
    receiptSignature: signProviderCallApprovalReceipt(receipt, signingKey)
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
  try {
    const resolvedPath = await realpath(options.approvalReceiptPath);
    if (options.approvalReceiptRoot) {
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
    }
    return {
      receipt: JSON.parse(await readFile(resolvedPath, "utf8")),
      source: "pre_existing_file",
      path: resolvedPath,
      error: null
    };
  } catch {
    return {
      receipt: null,
      source: "invalid_file",
      path: null,
      error: "approval_receipt_unreadable"
    };
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
      // Absence is required before the exclusive hard-link claim below.
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

export async function evaluateProviderCallExactGate(context = {}, options = {}) {
  const expectedGate = safeString(options.requiredExactGate);
  const providedGate = safeString(options.exactGate);
  const loaded = await loadApprovalReceipt(options);
  const issues = [];
  const now = nowDate(options);
  const targetDigest = digestProviderCallTarget(context);
  const target = createProviderCallTarget(context);

  if (!expectedGate) issues.push("required_exact_gate_not_configured");
  if (!providedGate) issues.push("exact_gate_required");
  if (expectedGate && providedGate && !equalText(expectedGate, providedGate)) issues.push("exact_gate_mismatch");
  if (loaded.error) issues.push(loaded.error);
  if (!target.RequestId) issues.push("provider_target_request_id_required");
  if (!target.CommandId) issues.push("provider_target_command_id_required");
  if (!target.Provider) issues.push("provider_target_provider_required");
  if (!target.Model) issues.push("provider_target_model_required");
  if (!Number.isInteger(target.MaxTokens) || target.MaxTokens <= 0) {
    issues.push("provider_target_max_tokens_invalid");
  }
  const maxTokensCeiling = Number(options.maxTokensCeiling || 0);
  if (maxTokensCeiling > 0 && target.MaxTokens > maxTokensCeiling) {
    issues.push("provider_target_max_tokens_exceeds_ceiling");
  }
  if (
    Object.hasOwn(target, "MaxBudgetUsd") &&
    (!Number.isFinite(target.MaxBudgetUsd) || target.MaxBudgetUsd <= 0)
  ) {
    issues.push("provider_target_budget_invalid");
  }
  const maxBudgetUsdCeiling = Number(options.maxBudgetUsdCeiling || 0);
  if (
    maxBudgetUsdCeiling > 0 &&
    Object.hasOwn(target, "MaxBudgetUsd") &&
    target.MaxBudgetUsd > maxBudgetUsdCeiling
  ) {
    issues.push("provider_target_budget_exceeds_ceiling");
  }
  const requiredTargetFields = Array.isArray(options.requiredTargetFields)
    ? options.requiredTargetFields
    : [];
  for (const field of requiredTargetFields) {
    if (!Object.hasOwn(target, field) || target[field] === "" || target[field] === null) {
      issues.push(`provider_target_field_required:${field}`);
    }
  }

  let expiresAt = null;
  const receipt = loaded.receipt;
  if (receipt) {
    const issued = new Date(receipt.issuedAt || "invalid");
    const expires = new Date(receipt.expiresAt || "invalid");
    expiresAt = Number.isFinite(expires.getTime()) ? expires.toISOString() : null;
    if (receipt.$schema !== PROVIDER_CALL_APPROVAL_RECEIPT_SCHEMA) issues.push("approval_receipt_schema_mismatch");
    if (!validReceiptId(receipt.receiptId)) issues.push("approval_receipt_id_invalid");
    if (
      options.expectedReceiptId &&
      safeString(receipt.receiptId) !== safeString(options.expectedReceiptId)
    ) {
      issues.push("approval_receipt_id_mismatch");
    }
    if (receipt.status !== "approved") issues.push("approval_receipt_not_approved");
    if (receipt.scope !== "provider_call") issues.push("approval_receipt_scope_mismatch");
    if (safeString(receipt.commandId) !== target.CommandId) issues.push("approval_receipt_command_mismatch");
    if (safeString(receipt.requestId) !== target.RequestId) issues.push("approval_receipt_request_mismatch");
    if (!safeString(receipt.approvedBy)) issues.push("approval_receipt_approver_required");
    if (!safeString(receipt.requestedBy)) issues.push("approval_receipt_requester_required");
    if (safeString(receipt.approvedBy) === safeString(receipt.requestedBy) && safeString(receipt.approvedBy)) {
      issues.push("approval_receipt_self_approval_blocked");
    }
    if (
      Array.isArray(options.allowedApprovers) &&
      !options.allowedApprovers.map(safeString).includes(safeString(receipt.approvedBy))
    ) {
      issues.push("approval_receipt_approver_not_allowed");
    }
    if (
      Array.isArray(options.allowedRequesters) &&
      !options.allowedRequesters.map(safeString).includes(safeString(receipt.requestedBy))
    ) {
      issues.push("approval_receipt_requester_not_allowed");
    }
    if (!Number.isFinite(issued.getTime()) || issued > now) issues.push("approval_receipt_issued_at_invalid");
    if (!Number.isFinite(expires.getTime()) || expires <= now) issues.push("approval_receipt_expired");
    if (
      Number.isFinite(issued.getTime()) &&
      Number.isFinite(expires.getTime()) &&
      (expires <= issued || expires.getTime() - issued.getTime() > 10 * 60 * 1000)
    ) {
      issues.push("approval_receipt_ttl_invalid");
    }
    if (!equalText(receipt.gateDigest, digestProviderCallGate(expectedGate))) {
      issues.push("approval_receipt_gate_digest_mismatch");
    }
    if (!equalText(receipt.targetDigest, targetDigest)) issues.push("approval_receipt_target_mismatch");
    if (receipt.budgetConfirmed !== true) issues.push("approval_receipt_budget_confirmation_required");
    if (receipt.singleUse !== true) issues.push("approval_receipt_single_use_required");
    if (receipt.signatureAlgorithm !== "hmac-sha256") {
      issues.push("approval_receipt_signature_algorithm_mismatch");
    }
    if (!validSigningKey(options.receiptSigningKey)) {
      issues.push("approval_receipt_signing_key_required");
    } else if (
      !equalText(
        receipt.receiptSignature,
        signProviderCallApprovalReceipt(receipt, options.receiptSigningKey)
      )
    ) {
      issues.push("approval_receipt_signature_mismatch");
    }
    if (Object.hasOwn(receipt, "gate") || Object.hasOwn(receipt, "exactGate")) {
      issues.push("approval_receipt_must_not_store_raw_gate");
    }
  }

  return {
    required: true,
    authorized: issues.length === 0,
    status: issues.length === 0 ? "authorized_exact_gate" : "blocked_exact_gate",
    reason: issues[0] || null,
    issues,
    scope: "provider_call",
    commandId: target.CommandId,
    requestId: target.RequestId,
    provider: target.Provider,
    model: target.Model,
    maxTokens: target.MaxTokens,
    targetDigest,
    receiptId: receipt?.receiptId || null,
    receiptSource: loaded.source,
    receiptPath: loaded.path,
    expiresAt,
    keyValuePrinted: false
  };
}

export async function consumeProviderCallApprovalReceipt(validation = {}, options = {}) {
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
  return { consumed: true, reason: null, consumedPath: validation.receiptPath };
}

export async function authorizeProviderCallExactGate(context = {}, options = {}) {
  const target = createProviderCallTarget(context);
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
        scope: "provider_call",
        commandId: target.CommandId,
        requestId: target.RequestId,
        provider: target.Provider,
        model: target.Model,
        maxTokens: target.MaxTokens,
        targetDigest: digestProviderCallTarget(target),
        receiptId: safeString(options.expectedReceiptId) || null,
        receiptSource: "file_claim_failed",
        receiptPath: null,
        expiresAt: null,
        keyValuePrinted: false,
        receiptConsumed: false
      };
    }
    evaluationOptions = {
      ...options,
      approvalReceiptPath: claim.claimedPath,
      approvalReceiptRoot: claim.claimedRoot
    };
  }

  const validation = await evaluateProviderCallExactGate(context, evaluationOptions);
  if (claim?.claimed) validation.receiptClaimed = true;
  if (!validation.authorized) {
    return { ...validation, receiptConsumed: false };
  }

  const consumption = await consumeProviderCallApprovalReceipt(validation, evaluationOptions);
  if (!consumption.consumed) {
    return {
      ...validation,
      authorized: false,
      status: "blocked_exact_gate",
      reason: consumption.reason,
      issues: [...validation.issues, consumption.reason],
      receiptConsumed: false
    };
  }

  return {
    ...validation,
    status: "authorized_and_consumed_exact_gate",
    receiptConsumed: true,
    consumedPath: consumption.consumedPath || null
  };
}
