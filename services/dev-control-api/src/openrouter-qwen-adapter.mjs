const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_CHAT_COMPLETIONS_ENDPOINT = `${OPENROUTER_BASE_URL}/chat/completions`;
const PRIMARY_MODEL = "qwen/qwen3.7-max";
const FALLBACK_MODEL = "qwen/qwen3-max";
const STOP_POINT = "OPENROUTER QWEN ADAPTER READY - LOCAL ONLY - WAITING FOR MODEL ROUTING APPROVAL";

export const openRouterQwenAdapterBlockedActions = [
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
  "provider_credit_spend"
];

const sourceUrls = [
  "https://openrouter.ai/qwen/qwen3.7-max/api",
  "https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request",
  "https://openrouter.ai/docs/guides/routing/model-fallbacks",
  "https://openrouter.ai/docs/guides/features/zdr",
  "https://openrouter.ai/docs/organization-management"
];

const dangerousGoalRules = [
  ["deploy", /\bdeploy\b/i],
  ["push", /\bpush|git push\b/i],
  ["publish", /\bpublish\b/i],
  ["package_install", /\binstall|brew install|pnpm add|npm i|pip install|cargo install\b/i],
  ["real_mcp_execution", /\bmcp|model context protocol|start server|start-server\b/i],
  ["secret_read_or_print", /\bsecret|token|api key|apikey|password|credential|openrouter_api_key\b/i],
  ["paid_api_call", /\bcall provider|paid api|openrouter call|run qwen|invoke qwen|generate with qwen\b/i],
  ["customer_message_send", /\bsend|telegram|line|dm|email|sms|notify\b/i],
  ["external_connector_activation", /\bactivate|connect live|oauth|external connector|supabase write|github push\b/i]
];

const modePolicies = {
  default: {
    temperature: 0.2,
    maxTokens: 4096,
    jsonMode: false
  },
  planner: {
    temperature: 0.25,
    maxTokens: 4000,
    jsonMode: false
  },
  coding: {
    temperature: 0.1,
    maxTokens: 6000,
    jsonMode: false
  },
  jsonStrict: {
    temperature: 0.05,
    maxTokens: 3000,
    jsonMode: true
  },
  sensitive: {
    temperature: 0.1,
    maxTokens: 4000,
    jsonMode: true
  }
};

const sensitiveTasks = new Set(["internal_repo_analysis", "client_strategy", "security_report"]);

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
    requiresHumanApproval: true
  };
}

function findBlockedReasons(goal) {
  return dangerousGoalRules.filter(([, pattern]) => pattern.test(goal)).map(([reason]) => reason);
}

function normalizeMode(mode) {
  return Object.hasOwn(modePolicies, mode) ? mode : "default";
}

function shouldUseZdr(sensitivity) {
  return sensitiveTasks.has(String(sensitivity || "").trim());
}

function safeString(value, fallback = "") {
  return String(value || fallback).trim();
}

function trimForPreview(value) {
  return safeString(value).slice(0, 1200);
}

export function classifyOpenRouterError(status) {
  if (status === 401) return "AUTH_ERROR_INVALID_KEY";
  if (status === 402) return "BILLING_ERROR_NO_CREDIT";
  if (status === 403) return "POLICY_OR_PROVIDER_FORBIDDEN";
  if (status === 404) return "MODEL_NOT_FOUND_OR_BAD_SLUG";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "PROVIDER_OR_GATEWAY_ERROR";
  return "UNKNOWN_OPENROUTER_ERROR";
}

export function isPromptCacheEligible(block = {}) {
  const text = safeString(block.text || block.content);
  const role = safeString(block.role);
  const reasons = [];

  if (role === "latest_user_command" || role === "user") {
    reasons.push("latest_user_command");
  }
  if (/\b(secret|token|api key|apikey|private key|openrouter_api_key)\b/i.test(text)) {
    reasons.push("secret_like_content");
  }
  if (/\b(password|credential|service role|bearer)\b/i.test(text)) {
    reasons.push("credential_content");
  }
  if (/\b(error|fetch failed|stack trace|traceback|stderr|stdout|journalctl|runtime log)\b/i.test(text)) {
    reasons.push("runtime_log_content");
  }

  return {
    id: safeString(block.id, "context-block"),
    eligible: reasons.length === 0,
    reasons
  };
}

function splitCacheBlocks(stableContext = []) {
  const accepted = [];
  const rejected = [];

  for (const block of stableContext) {
    const result = isPromptCacheEligible(block);
    const item = {
      id: result.id,
      role: safeString(block.role, "stable_context"),
      reasons: result.reasons
    };

    if (result.eligible) {
      accepted.push({
        ...item,
        text: trimForPreview(block.text || block.content)
      });
    } else {
      rejected.push(item);
    }
  }

  return { accepted, rejected };
}

function buildSystemContent(cacheReport) {
  const base = [
    {
      type: "text",
      text:
        "You are Hermes Command Layer for SIRINXDev. Return structured, production-ready planning only. Never expose secrets. Never claim external execution without tool evidence."
    }
  ];

  for (const block of cacheReport.accepted) {
    base.push({
      type: "text",
      text: block.text,
      cache_control: { type: "ephemeral" }
    });
  }

  return base;
}

export function buildOpenRouterQwenRequestPreview(input = {}) {
  const mode = normalizeMode(safeString(input.mode, "default"));
  const policy = modePolicies[mode];
  const sensitivity = safeString(input.sensitivity, "public_content_task");
  const cacheReport = splitCacheBlocks(Array.isArray(input.stableContext) ? input.stableContext : []);
  const body = {
    models: [PRIMARY_MODEL, FALLBACK_MODEL],
    messages: [
      {
        role: "system",
        content: buildSystemContent(cacheReport)
      },
      {
        role: "user",
        content: trimForPreview(input.goal || "Plan Hermes routing with Qwen 3.7 Max.")
      }
    ],
    temperature: policy.temperature,
    max_tokens: policy.maxTokens,
    stream: false
  };

  if (policy.jsonMode || Boolean(input.jsonMode)) {
    body.response_format = { type: "json_object" };
  }

  if (shouldUseZdr(sensitivity) || mode === "sensitive") {
    body.provider = { zdr: true };
  }

  return {
    endpoint: OPENROUTER_CHAT_COMPLETIONS_ENDPOINT,
    method: "POST",
    headersPreview: {
      authorization: "Bearer env:OPENROUTER_API_KEY (not read in dry-run)",
      "content-type": "application/json",
      "http-referer": "env:HERMES_SITE_URL or https://dev.sirinx.co",
      "x-openrouter-title": "env:HERMES_APP_TITLE or Hermes Command Layer"
    },
    body,
    cacheReport,
    providerCalled: false,
    secretsRead: false
  };
}

export function getOpenRouterQwenAdapterStatus(options = {}) {
  return {
    title: "OpenRouter Qwen Adapter",
    status: "openrouter-qwen-adapter-ready-local-only",
    mode: "request-preview-and-policy-only",
    ...lock(),
    provider: "OpenRouter",
    endpoint: OPENROUTER_CHAT_COMPLETIONS_ENDPOINT,
    model: {
      primary: PRIMARY_MODEL,
      fallback: FALLBACK_MODEL,
      contextWindow: "1M source-verified; recheck before paid call",
      pricing: "source-required; do not hardcode pricing into runtime logic"
    },
    sourceUrls,
    defaultPolicy: {
      temperature: modePolicies.default.temperature,
      maxTokens: modePolicies.default.maxTokens,
      stream: false
    },
    sensitivePolicy: {
      appliesTo: [...sensitiveTasks],
      provider: { zdr: true }
    },
    jsonPolicy: {
      modes: ["jsonStrict", "sensitive"],
      response_format: { type: "json_object" }
    },
    promptCachingPolicy: {
      mode: "explicit-cache-control-preview-only",
      accepted: ["Hermes master system prompt", "project rules", "repo map", "architecture brief", "agent role definitions"],
      rejected: ["latest user command", "tokens", "secrets", "runtime logs", "temporary error traces", "credentials"]
    },
    errorPolicy: {
      401: classifyOpenRouterError(401),
      402: classifyOpenRouterError(402),
      403: classifyOpenRouterError(403),
      404: classifyOpenRouterError(404),
      429: classifyOpenRouterError(429),
      "500+": classifyOpenRouterError(500)
    },
    blockedActions: openRouterQwenAdapterBlockedActions,
    nextRecommendedAction: "Create model-routing approval before any OpenRouter provider call.",
    stopPoint: STOP_POINT,
    updatedAt: nowIso(options)
  };
}

export function createOpenRouterQwenAdapterDryRun(body = {}, options = {}) {
  const requestId = safeString(body.requestId, "openrouter-qwen-dry-run");
  const goal = safeString(body.goal, "plan Hermes routing with Qwen 3.7 Max");
  const mode = normalizeMode(safeString(body.mode, "default"));
  const sensitivity = safeString(body.sensitivity, "public_content_task");
  const blockedReasons = findBlockedReasons(goal);

  if (blockedReasons.length > 0) {
    return {
      title: "OpenRouter Qwen Adapter Dry-Run",
      status: "blocked-openrouter-qwen-adapter-dry-run",
      mode: "local-only-dry-run",
      requestId,
      goal,
      requestedMode: mode,
      sensitivity,
      ...lock(),
      blockedReasons,
      blockedActions: openRouterQwenAdapterBlockedActions,
      requestPreview: null,
      nextRecommendedAction: "Remove blocked actions and request request-preview planning only.",
      stopPoint: "OPENROUTER QWEN ADAPTER BLOCKED - NO ACTION TAKEN",
      updatedAt: nowIso(options)
    };
  }

  const requestPreview = buildOpenRouterQwenRequestPreview({
    goal,
    mode,
    sensitivity,
    stableContext: body.stableContext
  });

  return {
    title: "OpenRouter Qwen Adapter Dry-Run",
    status: "dry-run-openrouter-qwen-adapter-ready",
    mode: "local-only-dry-run",
    requestId,
    goal,
    requestedMode: mode,
    sensitivity,
    ...lock(),
    blockedReasons: [],
    blockedActions: openRouterQwenAdapterBlockedActions,
    requestPreview,
    evidencePacket: {
      provider: "OpenRouter",
      primaryModel: PRIMARY_MODEL,
      fallbackModel: FALLBACK_MODEL,
      providerExecution: "none",
      secretAccess: "none",
      commandExecution: "none",
      evidencePath: "docs/knowledge/SIRINX_OPENROUTER_QWEN_ADAPTER_V1.md"
    },
    nextManualApproval: "OpenRouter Qwen 3.7 Max provider call approval",
    nextRecommendedAction: "Review request preview, then create a separate model-routing approval before any paid API call.",
    stopPoint: STOP_POINT,
    updatedAt: nowIso(options)
  };
}
