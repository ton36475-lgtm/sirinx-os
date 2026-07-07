import { readRuntimeSecret } from "./runtime-foundation.mjs";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_CHAT_COMPLETIONS_ENDPOINT = `${OPENROUTER_BASE_URL}/chat/completions`;
const DEFAULT_MODEL = "anthropic/claude-fable-5";
const STOP_POINT = "OPENROUTER FABLE5 ADAPTER READY - LOCAL ONLY - WAITING FOR EXPLICIT PROVIDER CALL GATE";
const FABLE5_SMOKE_RETRY_POLICY = {
  maxProviderAttempts: 1,
  retryAllowed: false,
  repeatedRetryBlocked: true,
  retryAfterFailure: false,
  reason: "Fable5 is a gated high-cost route; failed smoke results must stop for operator review."
};
export const OPENROUTER_FABLE5_PROVIDER_CALL_APPROVAL = "APPROVE_OPENROUTER_FABLE5_PROVIDER_CALL_A019E53EE";

export const openRouterFable5AdapterBlockedActions = [
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
  "heartbeat_polling",
  "repeated_status_polling"
];

const dangerousGoalRules = [
  ["deploy", /\bdeploy\b/i],
  ["push", /\bpush|git push\b/i],
  ["publish", /\bpublish\b/i],
  ["package_install", /\binstall|brew install|pnpm add|npm i|pip install|cargo install\b/i],
  ["real_mcp_execution", /\bmcp|model context protocol|start server|start-server\b/i],
  ["secret_read_or_print", /\bsecret|token|api key|apikey|password|credential|openrouter_api_key\b/i],
  ["paid_api_call", /\bcall provider|paid api|openrouter call|run fable|invoke fable|generate with fable\b/i],
  ["provider_credit_spend", /\bspend|credit|billing|paid smoke|charge|quota\b/i],
  ["customer_message_send", /\b(send|notify|broadcast|dm|email|sms)\b|\btelegram\s+(send|broadcast|message)\b|\bline\s+(send|broadcast|message)\b/i],
  ["external_connector_activation", /\bactivate|connect live|oauth|external connector|supabase write|github push\b/i],
  ["heartbeat_polling", /\bheartbeat|polling loop|repeat(?:ed)? polling|cron polling\b/i]
];

function nowIso(options = {}) {
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

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function trimForPreview(value) {
  return safeString(value).slice(0, 2000);
}

function findBlockedReasons(goal) {
  return dangerousGoalRules.filter(([, pattern]) => pattern.test(goal)).map(([reason]) => reason);
}

export function buildOpenRouterFable5RequestPreview(input = {}) {
  const model = safeString(input.model, DEFAULT_MODEL);
  const maxTokens = clampNumber(input.max_tokens ?? input.maxTokens, 2048, 16, 12000);
  const temperature = clampNumber(input.temperature, 0.15, 0, 0.6);

  return {
    endpoint: OPENROUTER_CHAT_COMPLETIONS_ENDPOINT,
    method: "POST",
    headersPreview: {
      authorization: "Bearer env:OPENROUTER_API_KEY (not read in dry-run)",
      "content-type": "application/json",
      "http-referer": "env:HERMES_SITE_URL or https://dev.sirinx.co",
      "x-openrouter-title": "env:HERMES_APP_TITLE or Hermes Fable5 Command Layer"
    },
    body: {
      model,
      messages: [
        {
          role: "system",
          content:
            "You are SIRINX Hermes Fable5. Use this route only for founder-level architecture, strategy, and complex debugging. Do not expose secrets. Do not claim live execution without evidence."
        },
        {
          role: "user",
          content: trimForPreview(input.goal || "Prepare a safe Hermes Telegram routing plan for OpenRouter Fable5.")
        }
      ],
      temperature,
      max_tokens: maxTokens,
      stream: false
    },
    providerCalled: false,
    secretsRead: false,
    keyValuePrinted: false
  };
}

export function getOpenRouterFable5AdapterStatus(options = {}) {
  return {
    title: "OpenRouter Fable5 Adapter",
    status: "openrouter-fable5-adapter-ready-local-only",
    mode: "request-preview-and-policy-only",
    ...lock(),
    provider: "OpenRouter",
    endpoint: OPENROUTER_CHAT_COMPLETIONS_ENDPOINT,
    model: {
      primary: DEFAULT_MODEL,
      codexProfile: "fable5",
      intendedUse: "explicit high-reasoning Hermes Telegram tasks only",
      availability: "not verified in local-only mode; verify before paid/provider call"
    },
    quotaPolicy: {
      defaultRoute: false,
      repeatedPolling: false,
      heartbeatLlmPolling: false,
      useOnlyFor: ["architecture", "strategy", "complex debugging", "founder-level decisions"]
    },
    gates: {
      providerCall: {
        status: "closed",
        requiredApproval: OPENROUTER_FABLE5_PROVIDER_CALL_APPROVAL
      },
      telegramLiveSend: {
        status: "closed",
        requiredApproval: "APPROVE_TELEGRAM_GATEWAY_LIVE_SEND_A019E53EE"
      }
    },
    blockedActions: openRouterFable5AdapterBlockedActions,
    retryPolicy: FABLE5_SMOKE_RETRY_POLICY,
    stopPoint: STOP_POINT,
    updatedAt: nowIso(options)
  };
}

export function createOpenRouterFable5AdapterDryRun(body = {}, options = {}) {
  const requestId = safeString(body.requestId, "openrouter-fable5-dry-run");
  const goal = safeString(body.goal, "Prepare a safe Hermes Telegram routing plan for OpenRouter Fable5.");
  const blockedReasons = findBlockedReasons(goal);

  if (blockedReasons.length > 0) {
    return {
      title: "OpenRouter Fable5 Adapter Dry-Run",
      status: "blocked-openrouter-fable5-adapter-dry-run",
      mode: "local-only-dry-run",
      requestId,
      goal,
      ...lock(),
      blockedReasons,
      blockedActions: openRouterFable5AdapterBlockedActions,
      requestPreview: null,
      nextRecommendedAction: "Remove blocked actions and request request-preview planning only.",
      stopPoint: "OPENROUTER FABLE5 ADAPTER BLOCKED - NO ACTION TAKEN",
      updatedAt: nowIso(options)
    };
  }

  return {
    title: "OpenRouter Fable5 Adapter Dry-Run",
    status: "dry-run-openrouter-fable5-adapter-ready",
    mode: "local-only-dry-run",
    requestId,
    goal,
    ...lock(),
    blockedReasons: [],
    blockedActions: openRouterFable5AdapterBlockedActions,
    requestPreview: buildOpenRouterFable5RequestPreview({
      goal,
      model: body.model,
      max_tokens: body.max_tokens ?? body.maxTokens,
      temperature: body.temperature
    }),
    evidencePacket: {
      provider: "OpenRouter",
      primaryModel: DEFAULT_MODEL,
      providerExecution: "none",
      secretAccess: "none",
      commandExecution: "none",
      evidencePath: "docs/knowledge/SIRINX_OPENROUTER_FABLE5_ADAPTER_V1.md"
    },
    nextManualApproval: "APPROVE_OPENROUTER_FABLE5_PROVIDER_CALL_A019E53EE",
    nextRecommendedAction: "Review request preview, confirm model availability and budget, then open one explicit provider-call gate if needed.",
    stopPoint: STOP_POINT,
    updatedAt: nowIso(options)
  };
}

export function classifyOpenRouterFable5Error(status) {
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "AUTH_ERROR_INVALID_KEY";
  if (status === 402) return "BILLING_ERROR_NO_CREDIT";
  if (status === 403) return "POLICY_OR_PROVIDER_FORBIDDEN";
  if (status === 404) return "MODEL_NOT_FOUND_OR_BAD_SLUG";
  if (status === 408) return "REQUEST_TIMEOUT";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "PROVIDER_OR_GATEWAY_ERROR";
  return "UNKNOWN_OPENROUTER_ERROR";
}

function buildLiveSmokeInput(body = {}) {
  return {
    requestId: safeString(body.requestId, "openrouter-fable5-live-smoke"),
    goal: safeString(
      body.goal,
      'Return compact JSON only: {"status":"ok","model_route":"fable5","notes":"bounded smoke"}'
    ),
    model: safeString(body.model, DEFAULT_MODEL),
    max_tokens: clampNumber(body.max_tokens ?? body.maxTokens, 96, 16, 160),
    temperature: clampNumber(body.temperature, 0, 0, 0.2)
  };
}

function sanitizeOpenRouterResponse(json, text) {
  const choice = json?.choices?.[0];
  return {
    idPresent: Boolean(json?.id),
    model: typeof json?.model === "string" ? json.model : "",
    choiceCount: Array.isArray(json?.choices) ? json.choices.length : 0,
    finishReason: choice?.finish_reason || "",
    messagePreview: safeString(choice?.message?.content || text).slice(0, 500),
    usage: json?.usage
      ? {
          prompt_tokens: json.usage.prompt_tokens,
          completion_tokens: json.usage.completion_tokens,
          total_tokens: json.usage.total_tokens
        }
      : null
  };
}

export async function runOpenRouterFable5LiveSmoke(body = {}, options = {}) {
  const startedAt = nowIso(options);
  const input = buildLiveSmokeInput(body);
  const openRouterCredential = options.apiKey
    ? { ok: true, present: true, value: options.apiKey, error: null }
    : await readRuntimeSecret("OPENROUTER_API_KEY", options);

  if (!openRouterCredential.ok) {
    return {
      title: "OpenRouter Fable5 Live Smoke",
      status: "blocked-openrouter-fable5-live-smoke",
      mode: "bounded-provider-smoke",
      requestId: input.requestId,
      provider: "OpenRouter",
      model: input.model,
      providerCalled: false,
      commandExecuted: false,
      secretsRead: true,
      keyValuePrinted: false,
      canCallPaidApi: false,
      providerAttemptCount: 0,
      retryPolicy: FABLE5_SMOKE_RETRY_POLICY,
      blockedReason: openRouterCredential.error || "missing_openrouter_api_key_value",
      nextRecommendedAction: "Set a non-empty OPENROUTER_API_KEY in the approved Hermes runtime environment, then rerun one bounded smoke.",
      startedAt,
      updatedAt: nowIso(options)
    };
  }

  const requestPreview = buildOpenRouterFable5RequestPreview(input);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const referer = safeString(process.env.HERMES_SITE_URL, "https://dev.sirinx.local");
  const title = safeString(process.env.HERMES_APP_TITLE, "SIRINX Hermes Fable5");
  const controller = options.fetchImpl ? null : new AbortController();
  const timeout = controller ? setTimeout(() => controller.abort(), 15000) : null;

  try {
    const response = await fetchImpl(requestPreview.endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${openRouterCredential.value}`,
        "content-type": "application/json",
        "http-referer": referer,
        "x-openrouter-title": title
      },
      body: JSON.stringify(requestPreview.body),
      ...(controller ? { signal: controller.signal } : {})
    });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!response.ok) {
      return {
        title: "OpenRouter Fable5 Live Smoke",
        status: "failed-openrouter-fable5-live-smoke",
        mode: "bounded-provider-smoke",
        requestId: input.requestId,
        provider: "OpenRouter",
        model: input.model,
        providerCalled: true,
        commandExecuted: false,
        secretsRead: true,
        keyValuePrinted: false,
        canCallPaidApi: true,
        providerAttemptCount: 1,
        retryPolicy: FABLE5_SMOKE_RETRY_POLICY,
        httpStatus: response.status,
        errorClass: classifyOpenRouterFable5Error(response.status),
        responsePreview: safeString(json?.error?.message || text).slice(0, 500),
        nextRecommendedAction: "Stop. Do not retry automatically; inspect status, budget, model slug, and provider gateway logs first.",
        startedAt,
        updatedAt: nowIso(options)
      };
    }

    return {
      title: "OpenRouter Fable5 Live Smoke",
      status: "passed-openrouter-fable5-live-smoke",
      mode: "bounded-provider-smoke",
      requestId: input.requestId,
      provider: "OpenRouter",
      model: input.model,
      providerCalled: true,
      commandExecuted: false,
      secretsRead: true,
      keyValuePrinted: false,
      canCallPaidApi: true,
      providerAttemptCount: 1,
      retryPolicy: FABLE5_SMOKE_RETRY_POLICY,
      httpStatus: response.status,
      response: sanitizeOpenRouterResponse(json, text),
      startedAt,
      updatedAt: nowIso(options)
    };
  } catch (error) {
    return {
      title: "OpenRouter Fable5 Live Smoke",
      status: "failed-openrouter-fable5-live-smoke",
      mode: "bounded-provider-smoke",
      requestId: input.requestId,
      provider: "OpenRouter",
      model: input.model,
      providerCalled: true,
      commandExecuted: false,
      secretsRead: true,
      keyValuePrinted: false,
      canCallPaidApi: true,
      providerAttemptCount: 1,
      retryPolicy: FABLE5_SMOKE_RETRY_POLICY,
      errorClass: error.name === "AbortError" ? "REQUEST_TIMEOUT" : "NETWORK_OR_FETCH_ERROR",
      responsePreview: safeString(error.message).slice(0, 300),
      nextRecommendedAction: "Stop. Do not retry automatically; inspect local network/provider gateway state first.",
      startedAt,
      updatedAt: nowIso(options)
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
