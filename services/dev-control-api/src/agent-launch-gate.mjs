const DEFAULT_HERMES_CONTEXT_WINDOW = 8192;
const REQUIRED_HERMES_CONTEXT_WINDOW = 64000;
const safeModelNamePattern = /^[A-Za-z0-9._:/@+-]+$/;

export const agentLaunchGateBlockedActions = [
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
  "ollama_launch_auto_execute",
  "agent_auto_execute",
  "per_profile_gateway_start"
];

const launchDefinitions = [
  ["claude-code", "Claude Code", "Anthropic coding tool with subagents", "ollama launch claude", "subagent-coding-review", "medium"],
  ["codex-app", "Codex App", "OpenAI app agent delegation surface", "ollama launch codex-app", "local-codex-app-smoke", "low"],
  ["hermes-agent", "Hermes Agent", "Nous Research self-improving agent", "ollama launch hermes", "hermes-tui-review", "high"],
  ["openclaw", "OpenClaw", "Personal AI with 100+ skills", "ollama launch openclaw", "skill-heavy-local-assistant", "medium"],
  ["opencode", "OpenCode", "Open-source coding agent", "ollama launch opencode", "open-source-coding-agent", "medium"],
  ["codex", "Codex", "OpenAI coding agent CLI", "ollama launch codex", "local-codex-cli-smoke", "low"],
  ["copilot-cli", "Copilot CLI", "GitHub terminal coding agent", "ollama launch copilot", "github-cli-review", "medium"],
  ["droid", "Droid", "Factory coding agent across terminal and IDEs", "ollama launch droid", "ide-terminal-agent", "medium"],
  ["pi", "Pi", "Minimal AI agent toolkit with plugin support", "ollama launch pi", "minimal-plugin-agent", "medium"]
];

function nowIso(options) {
  const now = options.now || (() => new Date());
  return now().toISOString();
}

function normalizeRequestedModel(value) {
  const requestedModel = String(value || "").trim();
  return requestedModel || null;
}

export function buildLaunchCommand(baseCommand, requestedModel) {
  const normalizedModel = normalizeRequestedModel(requestedModel);
  if (!normalizedModel) return baseCommand;
  return `${baseCommand} --model ${normalizedModel}`;
}

export function evaluateRequestedModelPolicy({ requestedModel, selectedAgentId }) {
  const normalizedModel = normalizeRequestedModel(requestedModel);
  const blockedReasons = [];

  if (normalizedModel && !safeModelNamePattern.test(normalizedModel)) {
    blockedReasons.push("invalid_model_name");
  }

  const isCloudModel = Boolean(normalizedModel && /(^|:)cloud$/i.test(normalizedModel));
  const isHermes = selectedAgentId === "hermes-agent";

  if (isCloudModel) {
    blockedReasons.push("cloud_model_requires_paid_api_approval");
  }

  if (isCloudModel && isHermes) {
    blockedReasons.push("hermes_launcher_side_effectful");
    blockedReasons.push("manual_provider_auth_review_required");
  }

  return {
    requestedModel: normalizedModel,
    isCloudModel,
    requiresPaidApiApproval: isCloudModel,
    requiresProviderAuthReview: isCloudModel && isHermes,
    blocked: blockedReasons.length > 0,
    blockedReasons
  };
}

function makeAgent([id, title, description, command, role, riskLevel], options) {
  const hermesContextWindow = Number(options.hermesContextWindow || DEFAULT_HERMES_CONTEXT_WINDOW);
  const hermesReady = hermesContextWindow >= REQUIRED_HERMES_CONTEXT_WINDOW;
  const isHermes = id === "hermes-agent";
  const status = isHermes && !hermesReady ? "blocked-context-too-small" : "manual-only";
  const recommended = id === "codex-app" || id === "codex";

  return {
    id,
    title,
    description,
    command,
    role,
    riskLevel,
    status,
    allowedMode: "manual_only",
    autoExecute: false,
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canExecuteNow: false,
    canLaunchAutomatically: false,
    canRunMcp: false,
    canReadSecrets: false,
    requiresApproval: true,
    healthRequirements: makeHealthRequirements({ id, isHermes, hermesReady }),
    recommendedFirstTest: makeRecommendedFirstTest({ id, title, isHermes, hermesReady }),
    badges: makeBadges({ isHermes, hermesReady }),
    routing: {
      allowed: isHermes ? hermesReady : false,
      reason: isHermes
        ? hermesReady
          ? "Hermes context window meets the reviewed routing floor, but launch remains manual-only."
          : "Hermes context window is below the 64000 routing floor."
        : "Launch Gate inventories this agent only; routing stays disabled until a manual smoke approval exists."
    },
    source: "ollama-launch-screen",
    recommendedManualSmokeCandidate: recommended
  };
}

function makeHealthRequirements({ id, isHermes, hermesReady }) {
  const base = [
    "operator_confirms_ollama_launch_screen",
    "manual_smoke_approval_exists",
    "no_secret_prompt_or_token_printing",
    "no_external_write_requested"
  ];

  if (isHermes) {
    return [
      ...base,
      `hermes_context_window_gte_${REQUIRED_HERMES_CONTEXT_WINDOW}`,
      hermesReady ? "hermes_context_gate_passed" : "hermes_context_gate_blocked",
      "use_direct_hermes_status_for_smoke_not_ollama_launch_hermes_help"
    ];
  }

  if (id === "copilot-cli") {
    return [...base, "github_auth_scope_review_required"];
  }

  return base;
}

function makeRecommendedFirstTest({ id, title, isHermes, hermesReady }) {
  if (isHermes && !hermesReady) {
    return "Do not launch for routing. First confirm a Hermes model/profile with context window >= 64000; use direct Hermes status/help checks because Ollama Hermes launcher smoke can restart the local gateway.";
  }

  if (id === "codex-app" || id === "codex") {
    return `Manual smoke only: copy "${title}" launch command, open a harmless local read-only prompt, then stop before file edits.`;
  }

  return `Manual smoke only: copy "${title}" launch command and run a read-only status/help prompt after approval.`;
}

function makeBadges({ isHermes, hermesReady }) {
  const badges = ["manual-only", "health-check-required", "approval-required"];
  if (isHermes && !hermesReady) badges.push("blocked-context-too-small");
  return badges;
}

function makeSummary(agents) {
  return {
    agentsTotal: agents.length,
    manualOnly: agents.filter((agent) => agent.allowedMode === "manual_only").length,
    autoExecutable: agents.filter((agent) => agent.autoExecute).length,
    blockedContextTooSmall: agents.filter((agent) => agent.status === "blocked-context-too-small").length,
    recommendedManualSmokeCandidates: agents.filter((agent) => agent.recommendedManualSmokeCandidate).map((agent) => agent.id),
    blockedActions: agentLaunchGateBlockedActions.length
  };
}

export function getAgentLaunchGateStatus(options = {}) {
  const agents = launchDefinitions.map((definition) => makeAgent(definition, options));

  return {
    title: "Ollama Agent Launch Gate",
    status: "local-launch-gate-ready",
    mode: "local-only-manual-command-registry",
    source: "Ollama Launch screen",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canExecuteExternally: false,
    canLaunchAgents: false,
    canRunMcp: false,
    canReadSecrets: false,
    hermesContextRule: {
      observedContextWindow: Number(options.hermesContextWindow || DEFAULT_HERMES_CONTEXT_WINDOW),
      requiredContextWindow: REQUIRED_HERMES_CONTEXT_WINDOW,
      status:
        Number(options.hermesContextWindow || DEFAULT_HERMES_CONTEXT_WINDOW) >= REQUIRED_HERMES_CONTEXT_WINDOW
          ? "manual-routing-review-allowed"
          : "blocked-context-too-small"
    },
    summary: makeSummary(agents),
    agents,
    blockedActions: agentLaunchGateBlockedActions,
    stopRules: [
      "Do not run ollama launch commands automatically.",
      "Do not start agents from the API or dashboard.",
      "Do not route work through Hermes until context window is at least 64000 and manually reviewed.",
      "Use this gate as a local inventory, copy surface, and smoke-test planning record only."
    ],
    stopPoint: "OLLAMA AGENT LAUNCH GATE READY — LOCAL ONLY — WAITING FOR MANUAL SMOKE APPROVAL",
    updatedAt: nowIso(options)
  };
}

export function createAgentLaunchGateDryRun(body = {}, options = {}) {
  const status = getAgentLaunchGateStatus(options);
  const requestedAgentId = String(body.agentId || "").trim();
  const requestedModel = normalizeRequestedModel(body.model || body.requestedModel || body.modelName);
  const selectedAgent =
    status.agents.find((agent) => agent.id === requestedAgentId) ||
    status.agents.find((agent) => agent.id === "codex-app") ||
    status.agents[0];
  const requestId = String(body.requestId || "agent-launch-gate-dry-run");
  const goal = String(body.goal || "plan a manual local agent smoke test").trim();
  const modelPolicy = evaluateRequestedModelPolicy({
    requestedModel,
    selectedAgentId: selectedAgent.id
  });

  return {
    title: "Agent Launch Gate Dry-Run",
    status: modelPolicy.blocked ? "blocked-agent-launch-plan-dry-run" : "dry-run-agent-launch-plan-ready",
    mode: "local-only-dry-run",
    requestId,
    goal,
    source: String(body.source || "codex-local"),
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canExecuteExternally: false,
    canLaunchAgents: false,
    canRunMcp: false,
    canReadSecrets: false,
    commandExecuted: false,
    selectedAgent,
    requestedModel,
    modelPolicy,
    manualCommand: buildLaunchCommand(selectedAgent.command, requestedModel),
    manualSteps: [
      "Review Launch Gate badges and health requirements.",
      modelPolicy.blocked
        ? "Stop at this dry-run packet until paid API, provider auth, and side-effect approval are reviewed."
        : "Copy the command manually only after operator approval.",
      selectedAgent.recommendedFirstTest,
      "Stop after read-only smoke output; do not edit files, connect external tools, or send messages."
    ],
    blockedReasons: modelPolicy.blockedReasons,
    blockedActions: agentLaunchGateBlockedActions,
    stopPoint: modelPolicy.blocked ? "AGENT LAUNCH DRY-RUN BLOCKED — NO COMMAND EXECUTED" : "AGENT LAUNCH DRY-RUN READY — NO COMMAND EXECUTED",
    updatedAt: nowIso(options)
  };
}
