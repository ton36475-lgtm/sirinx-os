import { getAiTeamPairingStatus } from "./ai-team-pairing.mjs";
import { getOpenRouterQwenAdapterStatus } from "./openrouter-qwen-adapter.mjs";

const DEFAULT_HERMES_CONTEXT_WINDOW = 8192;
const REQUIRED_HERMES_CONTEXT_WINDOW = 64000;

export const teamRuntimeBridgeBlockedActions = [
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
  "antigravity_cli_auto_run",
  "openrouter_provider_call",
  "hermes_team_auto_start"
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
    canRunAntigravityCli: false,
    canStartHermesTeam: false,
    commandExecuted: false,
    requiresHumanApproval: true
  };
}

function makeQwenOpenRouterLane() {
  return {
    id: "qwen-3-7-max-openrouter",
    title: "Qwen 3.7 Max via OpenRouter",
    provider: "OpenRouter",
    modelId: "qwen/qwen3.7-max",
    status: "approval-required-paid-api",
    role: "large-context coding, synthesis, and agent-team review lane",
    contextWindow: 1000000,
    source: "https://openrouter.ai/qwen/qwen3.7-max/api",
    sourceVerification: "official-openrouter-page-checked-2026-05-27",
    paidApiRequired: true,
    apiKeyEnvName: "OPENROUTER_API_KEY",
    canCallProvider: false,
    canReadApiKey: false,
    autoExecute: false,
    commandExecuted: false,
    allowedUse: "Planning and approval packet only until explicit provider-call approval exists.",
    blockedActions: teamRuntimeBridgeBlockedActions
  };
}

function makeLocalQwenFallbackLane(localModels) {
  const observed = localModels.includes("qwen3.6:latest");

  return {
    id: "qwen-3-6-local-ollama",
    title: "Qwen 3.6 Local Ollama Fallback",
    provider: "Ollama",
    modelId: "qwen3.6:latest",
    status: observed ? "observed-local-model" : "not-observed-this-run",
    role: "local private planning fallback only; not Qwen 3.7 Max",
    contextWindow: null,
    source: "local-ollama-inventory",
    paidApiRequired: false,
    canCallProvider: false,
    canReadApiKey: false,
    autoExecute: false,
    commandExecuted: false,
    allowedUse: observed
      ? "Manual local smoke planning only; do not substitute for Qwen 3.7 Max provider approval."
      : "Unavailable unless observed by a separate local inventory run.",
    blockedActions: teamRuntimeBridgeBlockedActions
  };
}

function makeRuntimeLanes(options) {
  const localModels = Array.isArray(options.localModels) ? options.localModels.map(String) : [];
  const hermesContextWindow = Number(options.hermesContextWindow || DEFAULT_HERMES_CONTEXT_WINDOW);
  const hermesReady = hermesContextWindow >= REQUIRED_HERMES_CONTEXT_WINDOW;
  const antigravityCliAvailable = Boolean(options.antigravityCliAvailable);

  return [
    {
      id: "codex-control",
      title: "Codex Control",
      status: "active-local-dry-run",
      role: "repo edits, local tests, dashboard/API evidence",
      commandSurface: "Codex workspace",
      autoExecute: false,
      externalWrites: false,
      canExecuteNow: false,
      canRunMcp: false,
      nextExactStep: "Use Codex for local implementation and verification only."
    },
    {
      id: "hermes-agent-team",
      title: "Hermes Agent Team",
      status: hermesReady ? "manual-ready" : "blocked-context-too-small",
      role: "team routing and TUI review after context gate passes",
      commandSurface: "hermes --tui / Hermes Desktop / Hermes Agent",
      contextWindow: hermesContextWindow,
      requiredContextWindow: REQUIRED_HERMES_CONTEXT_WINDOW,
      autoExecute: false,
      externalWrites: false,
      canExecuteNow: false,
      canRunMcp: false,
      nextExactStep: hermesReady
        ? "Prepare a manual smoke approval packet before starting Hermes team routing."
        : "Switch Hermes to a model with at least 64k context before team routing."
    },
    {
      id: "qwen-openrouter-manual",
      title: "Qwen 3.7 Max OpenRouter Manual Lane",
      status: "approval-required-paid-api",
      role: "large-context cloud model candidate",
      commandSurface: "OpenRouter SDK/REST, model qwen/qwen3.7-max",
      modelId: "qwen/qwen3.7-max",
      autoExecute: false,
      externalWrites: false,
      canExecuteNow: false,
      canRunMcp: false,
      nextExactStep: "Create model-routing approval before any OpenRouter provider call."
    },
    {
      id: "antigravity-cli-watch",
      title: "Antigravity CLI Watch",
      status: antigravityCliAvailable ? "manual-review-available" : "missing-cli",
      role: "agent-first CLI migration watch, not active runtime",
      commandSurface: "antigravity / antigravity-cli",
      sourceRefs: [
        "https://www.antigravity.google/product/antigravity-cli",
        "https://www.antigravity.google/docs/cli-using",
        "https://formulae.brew.sh/cask/antigravity"
      ],
      autoExecute: false,
      externalWrites: false,
      canExecuteNow: false,
      canRunMcp: false,
      nextExactStep: antigravityCliAvailable
        ? "Review CLI permissions and repo intake evidence before manual smoke."
        : "Do not install automatically; run Repo Intake Gate before any install request."
    },
    {
      id: "a2a2a-evidence-loop",
      title: "A2A2A Evidence Loop",
      status: "local-sync-contract",
      role: "team handoff, provenance, dry-run evidence, next-step sync",
      commandSurface: "local JSON and Markdown artifacts",
      autoExecute: false,
      externalWrites: false,
      canExecuteNow: false,
      canRunMcp: false,
      nextExactStep: "Record evidence packets under docs/knowledge and stop before activation."
    }
  ].map((lane) => ({
    ...lock(),
    ...lane,
    blockedActions: teamRuntimeBridgeBlockedActions
  }));
}

function findBlockedReasons(goal) {
  return dangerousGoalRules.filter(([, pattern]) => pattern.test(goal)).map(([reason]) => reason);
}

function makeSummary({ runtimeLanes, modelLanes, localModels }) {
  const antigravity = runtimeLanes.find((lane) => lane.id === "antigravity-cli-watch");
  const hermes = runtimeLanes.find((lane) => lane.id === "hermes-agent-team");

  return {
    runtimeLanes: runtimeLanes.length,
    cloudModelLanes: modelLanes.filter((lane) => lane.provider === "OpenRouter").length,
    paidApiExecutable: 0,
    antigravityExecutable: antigravity?.canExecuteNow ? 1 : 0,
    hermesRoutingReady: hermes?.status === "manual-ready",
    openRouterQwenAdapterReady: true,
    localModelsObserved: localModels.length,
    blockedActions: teamRuntimeBridgeBlockedActions.length
  };
}

function makeOpenRouterQwenAdapterSummary(adapter) {
  return {
    status: adapter.status,
    provider: adapter.provider,
    endpoint: adapter.endpoint,
    primaryModel: adapter.model.primary,
    fallbackModel: adapter.model.fallback,
    jsonModeSupported: adapter.jsonPolicy.modes.includes("jsonStrict"),
    zdrModeSupported: adapter.sensitivePolicy.provider.zdr === true,
    promptCachingMode: adapter.promptCachingPolicy.mode,
    providerCalled: adapter.providerCalled,
    secretsRead: adapter.secretsRead,
    canCallPaidApi: adapter.canCallPaidApi,
    commandExecuted: adapter.commandExecuted,
    stopPoint: adapter.stopPoint
  };
}

export async function getTeamRuntimeBridgeStatus(options = {}) {
  const localModels = Array.isArray(options.localModels) ? options.localModels.map(String) : [];
  const runtimeLanes = makeRuntimeLanes(options);
  const modelLanes = [makeQwenOpenRouterLane(), makeLocalQwenFallbackLane(localModels)];
  const aiTeamPairing = await getAiTeamPairingStatus(options);
  const openRouterQwenAdapter = getOpenRouterQwenAdapterStatus(options);

  return {
    title: "Team Runtime Bridge",
    status: "team-runtime-bridge-ready-local-only",
    mode: "qwen-openrouter-antigravity-a2a2a-local-contract",
    ...lock(),
    source: "local-dev-control-api",
    requestedModel: "Qwen 3.7 Max",
    selectedCloudModelId: "qwen/qwen3.7-max",
    runtimeLanes,
    modelLanes,
    aiTeamPairing: {
      status: aiTeamPairing.status,
      mode: aiTeamPairing.mode,
      summary: aiTeamPairing.summary,
      canSendMessages: aiTeamPairing.canSendMessages,
      canStartGateways: aiTeamPairing.canStartGateways
    },
    openRouterQwenAdapter: makeOpenRouterQwenAdapterSummary(openRouterQwenAdapter),
    a2a2aContract: {
      handshake: ["goal", "role-map", "model-lane", "dry-run", "evidence", "approval", "manual-activation"],
      evidencePath: "docs/knowledge/SIRINX_TEAM_RUNTIME_BRIDGE_QWEN_ANTIGRAVITY.md",
      providerCallApprovalRequired: true,
      antigravityInstallApprovalRequired: true,
      hermesContextRequired: REQUIRED_HERMES_CONTEXT_WINDOW
    },
    summary: makeSummary({ runtimeLanes, modelLanes, localModels }),
    blockedActions: teamRuntimeBridgeBlockedActions,
    stopRules: [
      "Do not call OpenRouter or read OPENROUTER_API_KEY from this bridge.",
      "Do not install or start Antigravity CLI from this bridge.",
      "Do not start Hermes team routing until the Hermes context window is at least 64k.",
      "Do not run MCP, connectors, deploy, push, publish, or customer messaging from this bridge."
    ],
    nextRecommendedAction: "Create a model-routing approval packet for OpenRouter Qwen 3.7 Max, then run a separate dry-run smoke.",
    stopPoint: "TEAM RUNTIME BRIDGE READY - LOCAL ONLY - WAITING FOR MODEL ROUTING APPROVAL",
    updatedAt: nowIso(options)
  };
}

export async function createTeamRuntimeBridgeDryRun(body = {}, options = {}) {
  const requestId = String(body.requestId || "team-runtime-bridge-dry-run");
  const goal = String(body.goal || "connect Hermes team with Qwen OpenRouter and Antigravity watch").trim();
  const requestedModel = String(body.requestedModel || "qwen/qwen3.7-max").trim();
  const requestedCli = String(body.requestedCli || "antigravity-cli").trim();
  const blockedReasons = findBlockedReasons(goal);

  if (blockedReasons.length > 0) {
    return {
      title: "Team Runtime Bridge Dry-Run",
      status: "blocked-team-runtime-bridge-dry-run",
      mode: "local-only-dry-run",
      requestId,
      goal,
      requestedModel,
      requestedCli,
      ...lock(),
      providerCalled: false,
      secretsRead: false,
      blockedReasons,
      blockedActions: teamRuntimeBridgeBlockedActions,
      selectedModel: null,
      plan: null,
      nextManualApproval: null,
      nextRecommendedAction: "Remove blocked actions and request local-only bridge planning only.",
      stopPoint: "TEAM RUNTIME BRIDGE BLOCKED - NO ACTION TAKEN",
      updatedAt: nowIso(options)
    };
  }

  const status = await getTeamRuntimeBridgeStatus(options);
  const selectedModel = status.modelLanes.find((lane) => lane.id === "qwen-3-7-max-openrouter");

  return {
    title: "Team Runtime Bridge Dry-Run",
    status: "dry-run-team-runtime-bridge-ready",
    mode: "local-only-dry-run",
    requestId,
    goal,
    requestedModel,
    requestedCli,
    ...lock(),
    providerCalled: false,
    secretsRead: false,
    blockedReasons: [],
    blockedActions: teamRuntimeBridgeBlockedActions,
    selectedModel,
    runtimeLanes: status.runtimeLanes,
    a2a2aPlan: {
      route: ["Codex local", "Hermes team contract", "Qwen OpenRouter approval lane", "A2A2A evidence", "Manual activation"],
      evidencePath: status.a2a2aContract.evidencePath,
      commandExecution: "none",
      providerExecution: "none",
      secretAccess: "none"
    },
    manualSteps: [
      "Confirm OPENROUTER_API_KEY exists without printing it in a separate secret-presence gate.",
      "Confirm Qwen 3.7 Max model id remains `qwen/qwen3.7-max` from OpenRouter docs.",
      "Create approval for exactly one read-only model-routing smoke before any provider call.",
      "Keep Antigravity CLI in watch mode until Repo Intake Gate and CLI permission review pass.",
      "Keep Hermes team routing blocked until a 64k+ context model is active."
    ],
    nextManualApproval: "OpenRouter Qwen 3.7 Max provider call approval",
    nextRecommendedAction: status.nextRecommendedAction,
    stopPoint: "TEAM RUNTIME BRIDGE READY - LOCAL ONLY - WAITING FOR MODEL ROUTING APPROVAL",
    updatedAt: nowIso(options)
  };
}
