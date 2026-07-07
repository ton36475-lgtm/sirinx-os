import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const GHOSTCLAW_REGISTRY_PATHS = {
  agents: ".ghostclaw/registry/agent-registry.v1.yaml",
  routes: ".ghostclaw/registry/route-matrix.v1.yaml"
};

export const GHOSTCLAW_CONTROL_PLANE_RECEIPT_FIELDS = [
  "receipt_id",
  "mission_id",
  "task_id",
  "agent",
  "action_tier",
  "files_touched",
  "validation_commands",
  "validation_result",
  "created_at"
];

const BLOCKED_RULES = [
  ["secret_or_key_access", /(?:\b(secret|token|api[_-]?key|password|credential|private key)\b|\.env\b)/i, "X"],
  ["deploy_or_publish", /\b(deploy|publish|release|production)\b/i, "D"],
  ["git_push", /\b(git push|push)\b/i, "D"],
  ["cloud_mutation", /\b(cloudflare|r2|dns|worker deploy|pages deploy|supabase write|database migration)\b/i, "D"],
  ["install_or_migration", /\b(npm install|pnpm add|pip install|brew install|curl \| bash|migration|migrate)\b/i, "D"],
  ["provider_call", /\b(provider call|paid model|openrouter call|fable5 live|llm polling)\b/i, "D"],
  ["customer_send", /\b(send email|telegram send|line broadcast|customer data|crm write|webhook live)\b/i, "D"],
  ["destructive_action", /\b(rm -rf|delete file|drop table|truncate|reset --hard)\b/i, "X"]
];

function nowIso(options = {}) {
  const now = options.now || (() => new Date());
  return now().toISOString();
}

function safeString(value, fallback = "") {
  return String(value || fallback).trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

async function readText(root, relativePath) {
  return readFile(resolve(root, relativePath), "utf8");
}

function parseScalar(block, key) {
  const match = block.match(new RegExp(`^\\s*(?:-\\s+)?${key}:\\s*(.+?)\\s*$`, "m"));
  if (!match) return "";
  return match[1].replace(/^["']|["']$/g, "").trim();
}

function parseBool(block, key) {
  const value = parseScalar(block, key).toLowerCase();
  return value === "true";
}

function splitYamlRecords(raw, key) {
  const pattern = new RegExp(`^\\s*-\\s+${key}:\\s*`, "m");
  const lines = raw.split(/\r?\n/);
  const records = [];
  let current = [];

  for (const line of lines) {
    if (pattern.test(line) && current.length) {
      records.push(current.join("\n"));
      current = [line];
    } else if (pattern.test(line)) {
      current = [line];
    } else if (current.length) {
      current.push(line);
    }
  }
  if (current.length) records.push(current.join("\n"));
  return records;
}

export function parseAgentRegistry(raw) {
  return splitYamlRecords(raw, "id").map((block) => ({
    id: parseScalar(block, "id"),
    name: parseScalar(block, "name"),
    lane: parseScalar(block, "lane"),
    mutatesFiles: parseBool(block, "mutates_files"),
    requiresLease: parseBool(block, "requires_lease"),
    requiresReceipt: parseBool(block, "requires_receipt"),
    defaultModelHint: parseScalar(block, "default_model_hint")
  })).filter((agent) => agent.id);
}

export function parseRouteMatrix(raw) {
  return splitYamlRecords(raw, "route_id").map((block) => ({
    routeId: parseScalar(block, "route_id"),
    taskType: parseScalar(block, "task_type"),
    primaryAgent: parseScalar(block, "primary_agent"),
    reviewerAgent: parseScalar(block, "reviewer_agent"),
    architectAgent: parseScalar(block, "architect_agent"),
    validatorAgent: parseScalar(block, "validator_agent"),
    tier: parseScalar(block, "tier")
  })).filter((route) => route.routeId);
}

export async function loadGhostClawControlPlane(root = process.cwd(), options = {}) {
  const paths = { ...GHOSTCLAW_REGISTRY_PATHS, ...(options.paths || {}) };
  const [agentRaw, routeRaw] = await Promise.all([
    readText(root, paths.agents),
    readText(root, paths.routes)
  ]);
  const agents = parseAgentRegistry(agentRaw);
  const routes = parseRouteMatrix(routeRaw);

  return {
    title: "GhostClaw Control Plane",
    status: agents.length && routes.length ? "ghostclaw-control-plane-registry-ready" : "ghostclaw-control-plane-registry-incomplete",
    mode: "local_safe_dispatch_preview_only",
    registryPaths: paths,
    agents,
    routes,
    summary: {
      agents: agents.length,
      routes: routes.length,
      mutatingAgents: agents.filter((agent) => agent.mutatesFiles).map((agent) => agent.id),
      routesWithReviewers: routes.filter((route) => route.reviewerAgent).length
    },
    guardrails: makeGuardrails(),
    updatedAt: nowIso(options)
  };
}

function makeGuardrails() {
  return {
    dryRun: true,
    sourceMutation: false,
    workerExecution: false,
    providerCall: false,
    liveSend: false,
    install: false,
    push: false,
    deploy: false,
    cloudMutation: false,
    secretRead: false,
    keyValuePrint: false
  };
}

export function classifyGhostClawAction(input = {}) {
  const text = [
    input.action,
    input.command,
    input.summary,
    input.taskType,
    input.goal
  ].map((value) => safeString(value)).join(" ");
  const reasons = BLOCKED_RULES.filter(([, pattern]) => pattern.test(text)).map(([id, , tier]) => ({ id, tier }));
  const highestTier = reasons.some((reason) => reason.tier === "X") ? "X" : reasons.some((reason) => reason.tier === "D") ? "D" : null;

  if (highestTier) {
    return {
      actionTier: highestTier,
      blocked: true,
      blockedReasons: reasons.map((reason) => reason.id),
      requiresExactGate: true
    };
  }

  if (safeArray(input.filesToMutate).length > 0 || input.mutationRequested === true) {
    return {
      actionTier: input.routeTier || "B",
      blocked: false,
      blockedReasons: [],
      requiresExactGate: false
    };
  }

  return {
    actionTier: "A",
    blocked: false,
    blockedReasons: [],
    requiresExactGate: false
  };
}

function normalizePath(path) {
  return safeString(path).replace(/^\.\/+/, "");
}

function matchesPathPattern(path, pattern) {
  const normalizedPath = normalizePath(path);
  const normalizedPattern = normalizePath(pattern);
  if (!normalizedPattern) return false;
  if (normalizedPattern.endsWith("/**")) {
    return normalizedPath === normalizedPattern.slice(0, -3) || normalizedPath.startsWith(normalizedPattern.slice(0, -2));
  }
  return normalizedPath === normalizedPattern;
}

function hasPathMatch(path, patterns) {
  return safeArray(patterns).some((pattern) => matchesPathPattern(path, pattern));
}

export function requestGhostClawFileLease(input = {}, options = {}) {
  const files = safeArray(input.files).map(normalizePath).filter(Boolean);
  const existingLeases = safeArray(input.existingLeases);
  const allowedFiles = safeArray(input.allowedFiles);
  const forbiddenFiles = safeArray(input.forbiddenFiles);
  const deniedFiles = files.filter((file) => hasPathMatch(file, forbiddenFiles));
  const outsideAllowed = allowedFiles.length ? files.filter((file) => !hasPathMatch(file, allowedFiles)) : [];
  const conflictingFiles = files.filter((file) =>
    existingLeases.some((lease) =>
      lease?.status === "active" && safeArray(lease.files).map(normalizePath).includes(file)
    )
  );
  const granted = files.length > 0 && deniedFiles.length === 0 && outsideAllowed.length === 0 && conflictingFiles.length === 0;

  return {
    leaseId: safeString(input.leaseId, `lease-${safeString(input.taskId, "ghostclaw")}`),
    taskId: safeString(input.taskId, "unknown-task"),
    status: granted ? "granted" : "denied",
    granted,
    files,
    deniedFiles,
    outsideAllowed,
    conflictingFiles,
    acquiredAt: granted ? nowIso(options) : null,
    expiresAt: granted ? nowIso({ ...options, now: options.expiresNow || options.now }) : null
  };
}

export function validateGhostClawReceipt(receipt = {}) {
  const missingFields = GHOSTCLAW_CONTROL_PLANE_RECEIPT_FIELDS.filter((field) => {
    const value = receipt[field];
    return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
  });

  return {
    status: missingFields.length ? "receipt-invalid" : "receipt-valid",
    valid: missingFields.length === 0,
    requiredFields: GHOSTCLAW_CONTROL_PLANE_RECEIPT_FIELDS,
    missingFields
  };
}

function findById(items, id) {
  return items.find((item) => item.id === id) || null;
}

function findRoute(routes, taskType) {
  return routes.find((route) => route.taskType === taskType || route.routeId === taskType) || null;
}

export async function createGhostClawDispatchPreview(input = {}, options = {}) {
  const root = options.root || process.cwd();
  const controlPlane = options.controlPlane || await loadGhostClawControlPlane(root, options);
  const taskType = safeString(input.taskType, "repo_or_architecture");
  const route = findRoute(controlPlane.routes, taskType);
  const action = classifyGhostClawAction({
    ...input,
    routeTier: route?.tier
  });
  const filesToMutate = safeArray(input.filesToMutate).map(normalizePath).filter(Boolean);
  const lease = filesToMutate.length
    ? requestGhostClawFileLease({
        taskId: input.taskId || taskType,
        leaseId: input.leaseId,
        files: filesToMutate,
        allowedFiles: input.allowedFiles,
        forbiddenFiles: input.forbiddenFiles,
        existingLeases: input.existingLeases
      }, options)
    : null;
  const receipt = input.receipt ? validateGhostClawReceipt(input.receipt) : null;
  const primaryAgent = route ? findById(controlPlane.agents, route.primaryAgent) : null;
  const reviewerAgent = route ? findById(controlPlane.agents, route.reviewerAgent) : null;
  const validatorAgent = route ? findById(controlPlane.agents, route.validatorAgent) : null;
  const blockers = [
    ...(route ? [] : ["route_not_found"]),
    ...(action.blocked ? ["policy_guardian_block"] : []),
    ...(lease && !lease.granted ? ["file_lease_denied"] : []),
    ...(receipt && !receipt.valid ? ["receipt_invalid"] : [])
  ];

  return {
    title: "GhostClaw Dispatch Preview",
    status: blockers.length ? "blocked-ghostclaw-dispatch-preview" : "ready-ghostclaw-dispatch-preview",
    mode: "local_safe_preview_no_worker_execution",
    taskId: safeString(input.taskId, "ghostclaw-dispatch-preview"),
    taskType,
    route,
    agents: {
      primary: primaryAgent,
      reviewer: reviewerAgent,
      validator: validatorAgent
    },
    action,
    lease,
    receipt,
    reviewDispatch: reviewerAgent
      ? {
          reviewer: reviewerAgent.id,
          mode: "read_only_diff_review",
          canMutate: false,
          providerCall: false
        }
      : null,
    blockers,
    guardrails: makeGuardrails(),
    nextSafeAction: blockers.length
      ? "Resolve local blockers or request the exact external gate for D/X actions."
      : "Write the local packet/receipt, run validation, and keep external gates closed.",
    updatedAt: nowIso(options)
  };
}
