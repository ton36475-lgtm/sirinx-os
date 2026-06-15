const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_CHAT_COMPLETIONS_ENDPOINT = `${OPENROUTER_BASE_URL}/chat/completions`;
const FUSION_MODEL = "openrouter/fusion";
const STOP_POINT = "OPENROUTER FUSION ROUTER READY - LOCAL ONLY - NO PROVIDER CALL TAKEN";
const APPROVAL_DOC_PATH = "docs/approvals/OPENROUTER_FUSION_ROUTER_APPROVAL.md";
const KNOWLEDGE_DOC_PATH = "docs/knowledge/SIRINX_OPENROUTER_FUSION_ROUTER_V1.md";

const DEFAULT_ANALYSIS_MODELS = [
  "~anthropic/claude-opus-latest",
  "~openai/gpt-latest",
  "~google/gemini-pro-latest",
  "deepseek/deepseek-v3.2",
  "~moonshotai/kimi-latest"
];

const DEFAULT_JUDGE_MODEL = "~openai/gpt-latest";

export const openRouterFusionRouterBlockedActions = [
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
  "non_dry_run_fusion_smoke",
  "recursive_fusion",
  "unbounded_panel"
];

const sourceUrls = [
  "https://openrouter.ai/docs/guides/routing/routers/fusion-router",
  "https://openrouter.ai/docs/guides/features/plugins/fusion",
  "https://openrouter.ai/docs/guides/features/server-tools/fusion",
  "https://openrouter.ai/openrouter/fusion",
  "https://thclaws.ai/downloads.html"
];

const dangerousGoalRules = [
  ["deploy", /\bdeploy\b/i],
  ["push", /\bpush|git push\b/i],
  ["publish", /\bpublish\b/i],
  ["package_install", /\binstall|brew install|pnpm add|npm i|pip install|cargo install\b/i],
  ["real_mcp_execution", /\bmcp|model context protocol|start server|start-server\b/i],
  ["secret_read_or_print", /\bsecret|token|api key|apikey|password|credential|openrouter_api_key\b/i],
  ["paid_api_call", /\bcall provider|paid api|openrouter call|invoke fusion|run fusion|fusion provider\b/i],
  ["provider_credit_spend", /\bspend|credit|billing|paid smoke|charge\b/i],
  ["customer_message_send", /\bsend|telegram|line|dm|email|sms|notify\b/i],
  ["external_connector_activation", /\bactivate|connect live|oauth|external connector|supabase write|github push\b/i],
  ["recursive_fusion", /\brecursive fusion|fusion inside fusion|nested fusion\b/i]
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

function trimForPreview(value) {
  return safeString(value).slice(0, 2000);
}

function findBlockedReasons(goal) {
  return dangerousGoalRules.filter(([, pattern]) => pattern.test(goal)).map(([reason]) => reason);
}

function normalizeAnalysisModels(models) {
  const input = Array.isArray(models) ? models : DEFAULT_ANALYSIS_MODELS;
  const normalized = [...new Set(input.map((model) => safeString(model)).filter(Boolean))];

  if (normalized.length === 0) {
    return {
      models: DEFAULT_ANALYSIS_MODELS,
      errors: ["analysis_models_empty"]
    };
  }

  if (normalized.length > 8) {
    return {
      models: normalized.slice(0, 8),
      errors: ["analysis_models_exceeds_openrouter_limit_8"]
    };
  }

  return {
    models: normalized,
    errors: []
  };
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function normalizeReasoning(reasoning) {
  if (!reasoning || typeof reasoning !== "object" || Array.isArray(reasoning)) return undefined;

  const output = {};
  const effort = safeString(reasoning.effort);
  if (["low", "medium", "high"].includes(effort)) {
    output.effort = effort;
  }

  if (reasoning.max_tokens !== undefined) {
    output.max_tokens = clampNumber(reasoning.max_tokens, 1024, 1, 32000);
  }

  return Object.keys(output).length ? output : undefined;
}

export function normalizeFusionRouterConfig(input = {}) {
  const analysis = normalizeAnalysisModels(input.analysis_models || input.analysisModels);
  const maxToolCalls = clampNumber(input.max_tool_calls ?? input.maxToolCalls, 8, 1, 16);
  const temperature =
    input.temperature === undefined ? undefined : clampNumber(input.temperature, 0.2, 0, 2);
  const maxCompletionTokens =
    input.max_completion_tokens === undefined
      ? undefined
      : clampNumber(input.max_completion_tokens, 4096, 1, 64000);
  const reasoning = normalizeReasoning(input.reasoning);
  const judgeModel = safeString(input.model || input.judgeModel, DEFAULT_JUDGE_MODEL);

  return {
    model: safeString(input.outerModel || input.modelAlias, FUSION_MODEL),
    plugin: {
      id: "fusion",
      analysis_models: analysis.models,
      model: judgeModel,
      max_tool_calls: maxToolCalls,
      enabled: input.enabled === undefined ? true : Boolean(input.enabled),
      ...(maxCompletionTokens !== undefined ? { max_completion_tokens: maxCompletionTokens } : {}),
      ...(reasoning ? { reasoning } : {}),
      ...(temperature !== undefined ? { temperature } : {})
    },
    validation: {
      analysisModelCount: analysis.models.length,
      maxAnalysisModels: 8,
      maxToolCallsRange: "1-16",
      errors: analysis.errors
    }
  };
}

function buildMessages(goal) {
  return [
    {
      role: "system",
      content:
        "You are the SIRINX Fusion Router controller. Use multi-model deliberation only for high-value research, architecture, critique, and decision work. Never reveal secrets. Never claim external execution without evidence."
    },
    {
      role: "user",
      content: trimForPreview(goal || "Create a model-council analysis plan for SIRINX.")
    }
  ];
}

export function buildOpenRouterFusionRequestPreview(input = {}) {
  const goal = safeString(input.goal, "Create a model-council analysis plan for SIRINX.");
  const entrypoint = safeString(input.entrypoint, "plugin");
  const config = normalizeFusionRouterConfig(input);

  const base = {
    model: config.model,
    messages: buildMessages(goal),
    stream: false
  };

  const body =
    entrypoint === "server-tool"
      ? {
          ...base,
          model: safeString(input.outerModel, "~openai/gpt-latest"),
          tools: [
            {
              type: "openrouter:fusion",
              parameters: {
                analysis_models: config.plugin.analysis_models,
                model: config.plugin.model,
                max_tool_calls: config.plugin.max_tool_calls,
                ...(config.plugin.max_completion_tokens !== undefined
                  ? { max_completion_tokens: config.plugin.max_completion_tokens }
                  : {}),
                ...(config.plugin.reasoning ? { reasoning: config.plugin.reasoning } : {}),
                ...(config.plugin.temperature !== undefined ? { temperature: config.plugin.temperature } : {})
              }
            }
          ],
          tool_choice: input.forceFusion === true ? "required" : "auto"
        }
      : {
          ...base,
          plugins: [config.plugin],
          tool_choice: input.forceFusion === true ? "required" : undefined
        };

  if (body.tool_choice === undefined) {
    delete body.tool_choice;
  }

  return {
    endpoint: OPENROUTER_CHAT_COMPLETIONS_ENDPOINT,
    method: "POST",
    entrypoint,
    headersPreview: {
      authorization: "Bearer env:OPENROUTER_API_KEY (not read in dry-run)",
      "content-type": "application/json",
      "http-referer": "env:HERMES_SITE_URL or https://dev.sirinx.co",
      "x-openrouter-title": "env:HERMES_APP_TITLE or SIRINX Fusion Router"
    },
    body,
    validation: config.validation,
    providerCalled: false,
    secretsRead: false
  };
}

function makeEvidenceChecklist(status) {
  return [
    {
      id: "fusion_model_locked",
      label: "Fusion model slug locked",
      status: status.model === FUSION_MODEL ? "passed" : "blocked",
      evidence: status.model
    },
    {
      id: "panel_count_within_limit",
      label: "Panel model count within OpenRouter limit",
      status: status.panel.count >= 1 && status.panel.count <= 8 ? "passed" : "blocked",
      evidence: `${status.panel.count}/8`
    },
    {
      id: "judge_model_configured",
      label: "Judge model configured",
      status: status.judge.model ? "passed" : "blocked",
      evidence: status.judge.model
    },
    {
      id: "max_tool_calls_bounded",
      label: "Fusion web tool calls bounded",
      status: status.parameters.max_tool_calls >= 1 && status.parameters.max_tool_calls <= 16 ? "passed" : "blocked",
      evidence: String(status.parameters.max_tool_calls)
    },
    {
      id: "paid_api_blocked",
      label: "Paid API blocked",
      status: status.canCallPaidApi === false ? "passed" : "blocked",
      evidence: "canCallPaidApi=false"
    },
    {
      id: "key_value_never_printed",
      label: "Key value never printed",
      status: status.secretsRead === false && status.keyValuePrinted === false ? "passed" : "blocked",
      evidence: "secretsRead=false; keyValuePrinted=false"
    },
    {
      id: "thclaws_local_version_recorded",
      label: "Local thClaws version recorded",
      status: "warn",
      evidence: "local binary observed as 0.8.8 in this run; v0.61.0 requires separate install/upgrade"
    },
    {
      id: "future_smoke_requires_approval",
      label: "Future fusion smoke requires explicit approval",
      status: "passed",
      evidence: "non-dry-run fusion route not implemented"
    }
  ];
}

export function getOpenRouterFusionRouterStatus(options = {}) {
  const config = normalizeFusionRouterConfig(options);

  const status = {
    title: "OpenRouter Fusion Router",
    status: "openrouter-fusion-router-ready-local-only",
    mode: "request-preview-and-approval-only",
    ...lock(),
    provider: "OpenRouter",
    endpoint: OPENROUTER_CHAT_COMPLETIONS_ENDPOINT,
    model: FUSION_MODEL,
    panel: {
      count: config.plugin.analysis_models.length,
      max: 8,
      models: config.plugin.analysis_models
    },
    judge: {
      model: config.plugin.model,
      output: ["consensus", "contradictions", "partial_coverage", "unique_insights", "blind_spots"]
    },
    parameters: {
      max_tool_calls: config.plugin.max_tool_calls,
      ...(config.plugin.max_completion_tokens !== undefined
        ? { max_completion_tokens: config.plugin.max_completion_tokens }
        : {}),
      ...(config.plugin.reasoning ? { reasoning: config.plugin.reasoning } : {}),
      ...(config.plugin.temperature !== undefined ? { temperature: config.plugin.temperature } : {})
    },
    entrypoints: ["model-alias", "plugin", "server-tool"],
    costPolicy: {
      billingShape: "sum_of_panel_models_plus_judge_call",
      defaultUse: ["deep_research", "architecture_review", "expert_critique", "high_cost_wrong_answers"],
      avoidFor: ["short_caption", "formatting", "single_file_minor_edit", "low_risk_tactical_prompt"]
    },
    thClawsReadiness: {
      requiredVersion: "0.61.0",
      localObservedVersion: "0.8.8",
      status: "upgrade-required-before-claiming-live-thclaws-fusion-support"
    },
    sourceUrls,
    blockedActions: openRouterFusionRouterBlockedActions,
    approvalPacket: {
      id: "openrouter-fusion-router",
      path: APPROVAL_DOC_PATH,
      knowledgePath: KNOWLEDGE_DOC_PATH,
      status: "ready-local-only",
      futureApprovalPhrase:
        "Approve exactly one OpenRouter Fusion Router read-only smoke after confirming budget, key presence, panel models, judge model, max_tool_calls, and prompt scope.",
      canApproveProviderCallNow: false,
      providerCallRouteExists: false,
      humanApprovalRequired: true
    },
    nextRecommendedAction:
      "Upgrade thClaws to v0.61.0 with SHA verification, then run a separate dry-run smoke before any provider call.",
    stopPoint: STOP_POINT,
    updatedAt: nowIso(options)
  };

  return {
    ...status,
    evidenceChecklist: makeEvidenceChecklist(status)
  };
}

export function createOpenRouterFusionRouterDryRun(body = {}, options = {}) {
  const requestId = safeString(body.requestId, "openrouter-fusion-router-dry-run");
  const goal = safeString(body.goal, "prepare OpenRouter Fusion Router model-council request preview");
  const blockedReasons = findBlockedReasons(goal);

  if (blockedReasons.length > 0) {
    return {
      title: "OpenRouter Fusion Router Dry-Run",
      status: "blocked-openrouter-fusion-router-dry-run",
      mode: "local-only-dry-run",
      requestId,
      goal,
      ...lock(),
      blockedReasons,
      blockedActions: openRouterFusionRouterBlockedActions,
      requestPreview: null,
      nextRecommendedAction:
        "Remove provider execution, secret access, messaging, deploy, push, publish, install, and credit-spend terms.",
      stopPoint: "OPENROUTER FUSION ROUTER BLOCKED - NO ACTION TAKEN",
      updatedAt: nowIso(options)
    };
  }

  const requestPreview = buildOpenRouterFusionRequestPreview(body);
  const status = getOpenRouterFusionRouterStatus(body);

  return {
    title: "OpenRouter Fusion Router Dry-Run",
    status: requestPreview.validation.errors.length
      ? "dry-run-openrouter-fusion-router-ready-with-warnings"
      : "dry-run-openrouter-fusion-router-ready",
    mode: "local-only-dry-run",
    requestId,
    goal,
    ...lock(),
    blockedReasons: [],
    blockedActions: openRouterFusionRouterBlockedActions,
    requestPreview,
    evidenceChecklist: status.evidenceChecklist,
    evidencePacket: {
      provider: "OpenRouter",
      model: FUSION_MODEL,
      panelModels: requestPreview.body.plugins?.[0]?.analysis_models || requestPreview.body.tools?.[0]?.parameters?.analysis_models,
      judgeModel: requestPreview.body.plugins?.[0]?.model || requestPreview.body.tools?.[0]?.parameters?.model,
      providerExecution: "none",
      secretAccess: "none",
      commandExecution: "none",
      evidencePath: KNOWLEDGE_DOC_PATH
    },
    nextManualApproval: "OpenRouter Fusion Router one-shot provider smoke approval",
    nextRecommendedAction:
      "Review request preview and thClaws version, then create a separate approval for exactly one paid provider call.",
    stopPoint: STOP_POINT,
    updatedAt: nowIso(options)
  };
}
