export const POLICY_CORE_VERSION = "2026-05-20.policy-core.v1";

const EXTERNAL_ACTION_TYPES = new Set([
  "cloudflare-deploy",
  "cloudflare-write",
  "database-migration",
  "github-push",
  "github-pr",
  "line-send",
  "paid-api-call",
  "production-lead-write",
  "solis-telemetry-read",
  "telegram-send"
]);

const SECRET_PATTERNS = [
  /\.env(?:\.|$)/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /password/i,
  /private[_-]?key/i,
  /keystore/i
];

function toArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value.filter(Boolean) : [value];
}

function targetId(target) {
  if (!target) {
    return "";
  }

  if (typeof target === "string") {
    return target.trim();
  }

  return String(target.id || target.path || target.url || target.name || "").trim();
}

function textFields(action) {
  return [
    action.id,
    action.type,
    action.description,
    action.command,
    targetId(action.target),
    ...toArray(action.paths),
    ...toArray(action.connectors)
  ]
    .filter(Boolean)
    .map(String);
}

function referencesSecretMaterial(action) {
  return textFields(action).some((value) => SECRET_PATTERNS.some((pattern) => pattern.test(value)));
}

function isExternalAction(action) {
  return Boolean(
    action.externalWrite ||
      action.productionWrite ||
      action.customerVisible ||
      action.paidApi ||
      action.destructive ||
      EXTERNAL_ACTION_TYPES.has(action.type)
  );
}

function approvalMatches(action, approval) {
  if (!approval?.approved) {
    return false;
  }

  const expectedTarget = targetId(action.target);
  const approvedTarget = targetId(approval.target);
  const scopeMatches = !approval.scope || approval.scope === action.id || approval.scope === action.type;
  const targetMatches = expectedTarget && approvedTarget === expectedTarget;

  return scopeMatches && targetMatches;
}

function solisEvidenceComplete(action) {
  if (action.type !== "solis-telemetry-read") {
    return true;
  }

  const evidence = action.evidence || {};

  return Boolean(
    action.readOnly &&
      evidence.consent === true &&
      evidence.credentialStorage === true &&
      evidence.stationMapping === true
  );
}

export function normalizePolicyAction(input = {}) {
  const target = input.target || null;

  return {
    id: String(input.id || input.actionId || input.type || "unnamed-action"),
    type: String(input.type || "local-review"),
    description: String(input.description || ""),
    command: input.command ? String(input.command) : "",
    target,
    paths: toArray(input.paths),
    connectors: toArray(input.connectors),
    externalWrite: Boolean(input.externalWrite),
    productionWrite: Boolean(input.productionWrite),
    customerVisible: Boolean(input.customerVisible),
    paidApi: Boolean(input.paidApi),
    destructive: Boolean(input.destructive),
    readsSecretValues: Boolean(input.readsSecretValues),
    printsSecrets: Boolean(input.printsSecrets),
    rawChatToMemory: Boolean(input.rawChatToMemory),
    readOnly: Boolean(input.readOnly),
    evidence: input.evidence || {}
  };
}

export function evaluatePolicy(input = {}, context = {}) {
  const action = normalizePolicyAction(input);
  const hardBlocks = [];
  const approvalReasons = [];
  const target = targetId(action.target);
  const externalAction = isExternalAction(action);

  if (action.readsSecretValues) {
    hardBlocks.push("secret-value-read-requested");
  }

  if (action.printsSecrets) {
    hardBlocks.push("secret-print-requested");
  }

  if (action.rawChatToMemory) {
    hardBlocks.push("raw-chat-memory-requested");
  }

  if (referencesSecretMaterial(action) && !action.readOnly) {
    hardBlocks.push("secret-like-path-or-target-in-write-scope");
  }

  if (externalAction && !target) {
    hardBlocks.push("external-action-missing-exact-target");
  }

  if (!solisEvidenceComplete(action)) {
    hardBlocks.push("solis-consent-credential-or-station-evidence-missing");
  }

  if (externalAction) {
    approvalReasons.push("external-or-production-action");
  }

  if (action.customerVisible) {
    approvalReasons.push("customer-visible-action");
  }

  if (action.paidApi) {
    approvalReasons.push("paid-api-action");
  }

  if (action.destructive) {
    approvalReasons.push("destructive-action");
  }

  if (hardBlocks.length > 0) {
    return {
      policyVersion: POLICY_CORE_VERSION,
      decision: "blocked",
      allowed: false,
      externalWrites: false,
      requiresApproval: approvalReasons.length > 0,
      action,
      target,
      hardBlocks,
      approvalReasons,
      approved: false
    };
  }

  const approved = approvalMatches(action, context.approval);

  if (approvalReasons.length > 0 && !approved) {
    return {
      policyVersion: POLICY_CORE_VERSION,
      decision: "approval_required",
      allowed: false,
      externalWrites: false,
      requiresApproval: true,
      action,
      target,
      hardBlocks,
      approvalReasons,
      approved: false
    };
  }

  return {
    policyVersion: POLICY_CORE_VERSION,
    decision: "allowed",
    allowed: true,
    externalWrites: externalAction,
    requiresApproval: approvalReasons.length > 0,
    action,
    target,
    hardBlocks,
    approvalReasons,
    approved
  };
}

export function summarizePolicyDecision(decision) {
  return {
    policyVersion: decision.policyVersion,
    decision: decision.decision,
    allowed: decision.allowed,
    externalWrites: decision.externalWrites,
    requiresApproval: decision.requiresApproval,
    target: decision.target,
    hardBlocks: decision.hardBlocks,
    approvalReasons: decision.approvalReasons
  };
}
