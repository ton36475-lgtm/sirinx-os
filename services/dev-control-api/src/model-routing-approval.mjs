import { getOpenRouterQwenAdapterStatus } from "./openrouter-qwen-adapter.mjs";

const STOP_POINT = "OPENROUTER QWEN MODEL ROUTING APPROVAL READY - NO PROVIDER CALL TAKEN";
const APPROVAL_DOC_PATH = "docs/approvals/OPENROUTER_QWEN_MODEL_ROUTING_APPROVAL.md";

export const openRouterQwenModelRoutingBlockedActions = [
  "deploy",
  "push",
  "publish",
  "external_connector_activation",
  "real_mcp_execution",
  "paid_api_call",
  "secret_read_or_print",
  "customer_message_send",
  "production_database_write",
  "telegram_send",
  "line_send",
  "package_install",
  "openrouter_provider_call",
  "openrouter_api_key_read",
  "provider_credit_spend",
  "non_dry_run_model_smoke"
];

const dangerousGoalRules = [
  ["deploy", /\bdeploy\b/i],
  ["push", /\bpush|git push\b/i],
  ["publish", /\bpublish\b/i],
  ["package_install", /\binstall|brew install|pnpm add|npm i|pip install|cargo install\b/i],
  ["real_mcp_execution", /\bmcp|model context protocol|start server|start-server\b/i],
  ["secret_read_or_print", /\bsecret|token|api key|apikey|password|credential|openrouter_api_key\b/i],
  ["paid_api_call", /\bcall provider|paid api|openrouter call|run qwen|invoke qwen|generate with qwen\b/i],
  ["provider_credit_spend", /\bspend|credit|billing|paid smoke|charge\b/i],
  ["customer_message_send", /\bsend|telegram|line|dm|email|sms|notify\b/i],
  ["external_connector_activation", /\bactivate|connect live|oauth|external connector|supabase write|github push\b/i]
];

function nowIso(options) {
  const now = options.now || (() => new Date());
  return now().toISOString();
}

function lock() {
  return {
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canExecuteExternally: false,
    canCallPaidApi: false,
    canReadSecrets: false,
    canRunMcp: false,
    commandExecuted: false,
    providerCalled: false,
    secretsRead: false,
    keyValuePrinted: false,
    requiresHumanApproval: true
  };
}

function safeString(value, fallback = "") {
  return String(value || fallback).trim();
}

function findBlockedReasons(goal) {
  return dangerousGoalRules.filter(([, pattern]) => pattern.test(goal)).map(([reason]) => reason);
}

function makeEvidenceChecklist(adapter) {
  return [
    {
      id: "model_slug_locked",
      label: "Model slug locked",
      status: adapter.model.primary === "qwen/qwen3.7-max" ? "passed" : "blocked",
      evidence: adapter.model.primary
    },
    {
      id: "fallback_slug_locked",
      label: "Fallback slug locked",
      status: adapter.model.fallback === "qwen/qwen3-max" ? "passed" : "blocked",
      evidence: adapter.model.fallback
    },
    {
      id: "paid_api_blocked",
      label: "Paid API blocked",
      status: adapter.canCallPaidApi === false ? "passed" : "blocked",
      evidence: "canCallPaidApi=false"
    },
    {
      id: "key_value_never_printed",
      label: "Key value never printed",
      status: adapter.secretsRead === false ? "passed" : "blocked",
      evidence: "secretsRead=false; keyValuePrinted=false"
    },
    {
      id: "zdr_policy_reviewed",
      label: "ZDR policy reviewed",
      status: adapter.sensitivePolicy.provider?.zdr === true ? "passed" : "blocked",
      evidence: "provider.zdr=true for sensitive tasks"
    },
    {
      id: "json_policy_reviewed",
      label: "JSON policy reviewed",
      status: adapter.jsonPolicy.response_format?.type === "json_object" ? "passed" : "blocked",
      evidence: "response_format=json_object"
    },
    {
      id: "cache_policy_reviewed",
      label: "Cache policy reviewed",
      status: adapter.promptCachingPolicy.mode ? "passed" : "blocked",
      evidence: adapter.promptCachingPolicy.mode
    },
    {
      id: "one_future_smoke_requires_approval",
      label: "One future smoke requires approval",
      status: "passed",
      evidence: "non-dry-run smoke route not implemented"
    }
  ];
}

function makeFutureSmokeCall(adapter) {
  return {
    provider: adapter.provider,
    endpoint: adapter.endpoint,
    model: adapter.model.primary,
    fallback: adapter.model.fallback,
    purpose: "one future read-only model-routing smoke after explicit approval",
    commandExecuted: false,
    providerCalled: false,
    canCallPaidApi: false,
    secretsRead: false,
    keyValuePrinted: false,
    requiresSeparateApproval: true,
    approvalRequiredBefore: [
      "confirm credit limit",
      "confirm key presence without printing",
      "confirm ZDR/json/cache policy",
      "confirm exact prompt and max token budget"
    ]
  };
}

function makeApprovalPacket(adapter, evidenceChecklist) {
  return {
    id: "openrouter-qwen-model-routing",
    path: APPROVAL_DOC_PATH,
    status: "ready-local-only",
    provider: adapter.provider,
    model: adapter.model.primary,
    fallback: adapter.model.fallback,
    approvalPhrase:
      "Approve exactly one OpenRouter Qwen 3.7 Max read-only smoke after confirming budget, key presence, ZDR/json/cache policy, and prompt scope.",
    evidenceChecklist,
    canApproveProviderCallNow: false,
    providerCallRouteExists: false,
    humanApprovalRequired: true
  };
}

export function getOpenRouterQwenModelRoutingApproval(options = {}) {
  const adapter = getOpenRouterQwenAdapterStatus(options);
  const evidenceChecklist = makeEvidenceChecklist(adapter);
  const futureSmokeCall = makeFutureSmokeCall(adapter);

  return {
    title: "OpenRouter Qwen Model Routing Approval",
    approvalId: "openrouter-qwen-model-routing",
    status: "openrouter-qwen-model-routing-approval-ready-local-only",
    mode: "approval-packet-only",
    ...lock(),
    provider: adapter.provider,
    endpoint: adapter.endpoint,
    modelSlugLocked: adapter.model.primary,
    fallbackSlugLocked: adapter.model.fallback,
    adapterStatus: adapter.status,
    evidenceChecklist,
    futureSmokeCall,
    approvalPacket: makeApprovalPacket(adapter, evidenceChecklist),
    blockedActions: openRouterQwenModelRoutingBlockedActions,
    sourceUrls: adapter.sourceUrls,
    nextRecommendedAction: "Review the approval packet, then stop before any provider call.",
    stopPoint: STOP_POINT,
    updatedAt: nowIso(options)
  };
}

export function createOpenRouterQwenModelRoutingApprovalDryRun(body = {}, options = {}) {
  const requestId = safeString(body.requestId, "openrouter-qwen-model-routing-approval");
  const goal = safeString(body.goal, "prepare one future qwen smoke approval");
  const blockedReasons = findBlockedReasons(goal);
  const status = getOpenRouterQwenModelRoutingApproval(options);

  if (blockedReasons.length > 0) {
    return {
      title: "OpenRouter Qwen Model Routing Approval Dry-Run",
      status: "blocked-openrouter-qwen-model-routing-approval",
      mode: "local-only-dry-run",
      requestId,
      goal,
      ...lock(),
      blockedReasons,
      blockedActions: openRouterQwenModelRoutingBlockedActions,
      approvalPacket: null,
      futureSmokeCall: null,
      nextRecommendedAction: "Remove provider execution, secret access, messaging, deploy, push, publish, and credit-spend terms.",
      stopPoint: "OPENROUTER QWEN MODEL ROUTING APPROVAL BLOCKED - NO ACTION TAKEN",
      updatedAt: nowIso(options)
    };
  }

  return {
    title: "OpenRouter Qwen Model Routing Approval Dry-Run",
    status: "dry-run-openrouter-qwen-model-routing-approval-ready",
    mode: "local-only-dry-run",
    requestId,
    goal,
    ...lock(),
    blockedReasons: [],
    blockedActions: openRouterQwenModelRoutingBlockedActions,
    approvalPacket: status.approvalPacket,
    evidenceChecklist: status.evidenceChecklist,
    futureSmokeCall: status.futureSmokeCall,
    nextManualApproval: "OpenRouter Qwen one-shot provider smoke approval",
    nextRecommendedAction: "Keep this packet as local evidence until a separate explicit approval authorizes one paid provider call.",
    stopPoint: STOP_POINT,
    updatedAt: nowIso(options)
  };
}
