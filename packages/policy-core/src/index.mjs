export const POLICY_CORE_VERSION = "2026-07-02.policy-core.v1.1";

export const UAT_CRUD_MONGODB_SECURITY_RULE_IDS = [
  "dry-run-discovery-only",
  "no-real-env-read",
  "no-mongodb-connect",
  "no-database-write",
  "synthetic-data-only",
  "no-package-install",
  "no-public-tunnel",
  "no-provider-call",
  "no-customer-data"
];

export const CODING_ENGINE_SECURITY_RULES = [
  {
    id: "no-secret-env-read",
    decision: "blocked",
    appliesTo: ["env", "secret", "token", "password"],
    rule: "Coding engine and UAT skills may inspect .env.example but must not read real .env files or secret values."
  },
  {
    id: "mongodb-crud-write-gate",
    decision: "approval_required",
    appliesTo: ["mongodb-crud-uat", "mongodb-write", "database-write"],
    rule: "Any MongoDB create/update/delete or verifier write requires an exact local UAT gate and synthetic data."
  },
  {
    id: "no-production-customer-data",
    decision: "blocked",
    appliesTo: ["production-data", "customer-data", "pii"],
    rule: "CRUD UAT must use synthetic fixtures only; production or customer data is not allowed in this coding engine lane."
  },
  {
    id: "no-implicit-runtime-start",
    decision: "approval_required",
    appliesTo: ["server-start", "browser-automation", "stagehand", "playwright"],
    rule: "The engine may propose local run commands but must not start apps, browsers, Stagehand, or Playwright without an exact gate."
  },
  {
    id: "no-implicit-install-or-tunnel",
    decision: "approval_required",
    appliesTo: ["dependency-install", "public-tunnel"],
    rule: "Package installs and public tunnels require separate target-specific approval."
  },
  {
    id: "mcp-filesystem-local-only",
    decision: "blocked",
    appliesTo: ["mcp", "mcp_sirinx_files_create_directory", "filesystem"],
    rule: "Schema-like MCP filesystem requests are mapped to local Codex work only; real MCP execution or remote mutation stays blocked."
  }
];

const EXTERNAL_ACTION_TYPES = new Set([
  "cloudflare-deploy",
  "cloudflare-write",
  "database-migration",
  "database-write",
  "dependency-install",
  "github-push",
  "github-pr",
  "line-send",
  "mongodb-crud-uat",
  "mongodb-write",
  "paid-api-call",
  "production-lead-write",
  "public-tunnel",
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

const REAL_ENV_PATH_PATTERN = /(^|\/)\.env($|\.(?!example$)[^/]+)/i;

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

function codingSecurityTextValues(values = []) {
  const result = [];

  function append(value) {
    if (!value) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(append);
      return;
    }

    if (typeof value === "object") {
      ["id", "path", "url", "name", "target"].forEach((key) => append(value[key]));
      return;
    }

    result.push(String(value));
  }

  values.forEach(append);
  return result;
}

function includesRealEnvPath(values = []) {
  return codingSecurityTextValues(values).some((value) => REAL_ENV_PATH_PATTERN.test(value));
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
      action.databaseWrite ||
      action.databaseMigration ||
      action.dependencyInstall ||
      action.publicTunnel ||
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
    databaseWrite: Boolean(input.databaseWrite),
    databaseMigration: Boolean(input.databaseMigration || input.migration),
    dependencyInstall: Boolean(input.dependencyInstall || input.installDependencies),
    publicTunnel: Boolean(input.publicTunnel),
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

  if (action.databaseWrite) {
    approvalReasons.push("database-write-action");
  }

  if (action.databaseMigration) {
    approvalReasons.push("database-migration-action");
  }

  if (action.dependencyInstall) {
    approvalReasons.push("dependency-install-action");
  }

  if (action.publicTunnel) {
    approvalReasons.push("public-tunnel-action");
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

export function evaluateCodingEngineSecurityAction(input = {}, context = {}) {
  const paths = Array.isArray(input.paths) ? input.paths : input.paths ? [input.paths] : [];
  const readsRealEnv = Boolean(input.readsSecretValues || includesRealEnvPath([input.target, input.command, ...paths]));
  const productionOrCustomerData = Boolean(input.productionData || input.customerData || input.pii);
  const providerCall = Boolean(input.providerCall || input.paidApi);
  const realMcpExecution = Boolean(input.realMcpExecution || input.mcpExecution || input.realMcpMutation);
  const remoteMutation = Boolean(input.remoteMutation);
  const hardBlocks = [];

  if (readsRealEnv) {
    hardBlocks.push("secret-env-file-read-blocked");
  }

  if (productionOrCustomerData) {
    hardBlocks.push("production-or-customer-data-blocked");
  }

  if (providerCall) {
    hardBlocks.push("provider-call-blocked-in-local-coding-engine");
  }

  if (realMcpExecution) {
    hardBlocks.push("real-mcp-execution-blocked");
  }

  if (remoteMutation) {
    hardBlocks.push("remote-mutation-blocked-in-local-coding-engine");
  }

  const policyDecision = evaluatePolicy(
    {
      id: input.id || "coding-engine-action",
      type: input.type || "local-review",
      description: input.description || "",
      command: input.command || "",
      target: input.target || "coding-engine:local",
      paths,
      externalWrite: Boolean(input.externalWrite || remoteMutation),
      productionWrite: Boolean(input.productionWrite || input.productionData),
      customerVisible: Boolean(input.customerVisible || input.customerData),
      paidApi: Boolean(input.paidApi),
      destructive: Boolean(input.destructive || input.databaseDelete),
      databaseWrite: Boolean(input.databaseWrite),
      databaseMigration: Boolean(input.databaseMigration || input.migration),
      dependencyInstall: Boolean(input.dependencyInstall || input.installDependencies),
      publicTunnel: Boolean(input.publicTunnel),
      readsSecretValues: readsRealEnv,
      printsSecrets: Boolean(input.printsSecrets),
      readOnly: Boolean(input.readOnly)
    },
    context
  );

  const blocked = hardBlocks.length > 0 || policyDecision.decision === "blocked";
  const decision = blocked ? "blocked" : policyDecision.decision;
  const haystack = codingSecurityTextValues([
    input.id,
    input.type,
    input.description,
    input.command,
    input.target,
    ...paths
  ])
    .join(" ")
    .toLowerCase();

  return {
    ...summarizePolicyDecision(policyDecision),
    decision,
    allowed: decision === "allowed",
    externalWrites: decision === "allowed" ? policyDecision.externalWrites : false,
    hardBlocks: [...hardBlocks, ...policyDecision.hardBlocks],
    matchedRules: CODING_ENGINE_SECURITY_RULES.filter((rule) =>
      rule.appliesTo.some((token) => haystack.includes(token))
    ).map((rule) => rule.id)
  };
}
