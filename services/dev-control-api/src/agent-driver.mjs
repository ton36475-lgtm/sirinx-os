import { buildLaunchCommand, evaluateRequestedModelPolicy, getAgentLaunchGateStatus } from "./agent-launch-gate.mjs";

const evidencePath = "docs/knowledge/SIRINX_AGENT_DRIVER_V1.md";
const allowedClassifications = ["passed", "missing", "side_effectful", "blocked", "needs_install"];

export const agentDriverBlockedActions = [
  "file_edit_by_agent",
  "mcp_server_start",
  "install_packages",
  "message_send",
  "deploy",
  "push",
  "publish",
  "external_connector_activation",
  "paid_api_call",
  "secret_read_or_print",
  "real_agent_work",
  "ollama_launch_auto_execute"
];

const driverProfiles = {
  codex: {
    classification: "passed",
    approvedReadOnlyCommand: "ollama launch codex --model qwen3.6:latest -- --help",
    evidenceStatus: "manual-smoke-passed",
    order: 1,
    notes: "Codex CLI help smoke passed without file edits or external writes."
  },
  "claude-code": {
    classification: "passed",
    approvedReadOnlyCommand: "ollama launch claude --model qwen3.6:latest -- --help",
    evidenceStatus: "manual-smoke-passed",
    order: 2,
    notes: "Claude Code help smoke passed without file edits or external writes."
  },
  "hermes-agent": {
    classification: "side_effectful",
    approvedReadOnlyCommand: "hermes --help",
    approvedReadOnlyCommands: ["hermes --version", "hermes status", "hermes --help"],
    blockedLauncherCommand: "ollama launch hermes",
    evidenceStatus: "ollama-launch-help-side-effectful",
    order: 3,
    notes: "Ollama Hermes launcher help can refresh/restart the local gateway; only direct Hermes status/version/help checks are approved for future smoke review."
  },
  "codex-app": {
    classification: "missing",
    approvedReadOnlyCommand: "ollama launch codex-app",
    evidenceStatus: "app-not-installed",
    order: 90,
    notes: "Codex App launch target was not installed during manual smoke."
  },
  openclaw: {
    classification: "needs_install",
    approvedReadOnlyCommand: "ollama launch openclaw",
    evidenceStatus: "needs-install-confirmation",
    order: 91,
    notes: "No install was attempted; remains manual review only."
  },
  opencode: {
    classification: "needs_install",
    approvedReadOnlyCommand: "ollama launch opencode",
    evidenceStatus: "needs-install-confirmation",
    order: 92,
    notes: "No install was attempted; remains manual review only."
  },
  "copilot-cli": {
    classification: "needs_install",
    approvedReadOnlyCommand: "ollama launch copilot",
    evidenceStatus: "needs-install-confirmation",
    order: 93,
    notes: "No install or GitHub auth expansion was attempted."
  },
  droid: {
    classification: "needs_install",
    approvedReadOnlyCommand: "ollama launch droid",
    evidenceStatus: "needs-install-confirmation",
    order: 94,
    notes: "No install was attempted; remains manual review only."
  },
  pi: {
    classification: "needs_install",
    approvedReadOnlyCommand: "ollama launch pi",
    evidenceStatus: "needs-install-confirmation",
    order: 95,
    notes: "No install was attempted; remains manual review only."
  }
};

const dangerousGoalRules = [
  ["file_edit_by_agent", /\b(edit|modify|patch|write|save|create file|delete file|rewrite)\b/i],
  ["mcp_server_start", /\b(mcp|model context protocol|start server|start-server)\b/i],
  ["install_packages", /\b(install|npm i|pnpm add|brew install|pip install|cargo install)\b/i],
  ["message_send", /\b(send|dm|telegram|line|email|reply|publish message)\b/i],
  ["deploy", /\b(deploy|wrangler deploy|vercel deploy|cloudflare pages deploy)\b/i],
  ["push", /\b(push|git push)\b/i],
  ["publish", /\b(publish|release|submit|upload)\b/i]
];

function nowIso(options) {
  const now = options.now || (() => new Date());
  return now().toISOString();
}

function capabilityLock() {
  return {
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canExecuteExternally: false,
    canLaunchAgents: false,
    canEditFiles: false,
    canStartMcp: false,
    canInstallPackages: false,
    canSendMessages: false,
    canDeploy: false,
    canRunMcp: false,
    canReadSecrets: false,
    commandExecuted: false,
    requiresHumanApproval: true
  };
}

function classifyGoal(goal) {
  const blockedReasons = dangerousGoalRules
    .filter(([, pattern]) => pattern.test(goal))
    .map(([reason]) => reason);

  return {
    blocked: blockedReasons.length > 0,
    blockedReasons
  };
}

function makeEvidencePacket(agent, options) {
  return {
    path: evidencePath,
    mode: "local-docs-evidence",
    didWriteFromApi: false,
    evidenceStatus: agent.evidenceStatus,
    classification: agent.classification,
    commandExecuted: false,
    updatedAt: nowIso(options)
  };
}

function makeDriverAgent(launchAgent, options) {
  const profile = driverProfiles[launchAgent.id] || {
    classification: "blocked",
    approvedReadOnlyCommand: null,
    evidenceStatus: "unreviewed-agent",
    order: 999,
    notes: "Agent is not in the reviewed smoke allowlist."
  };

  return {
    ...capabilityLock(),
    id: launchAgent.id,
    title: launchAgent.title,
    role: launchAgent.role,
    riskLevel: launchAgent.riskLevel,
    launchGateCommand: launchAgent.command,
    classification: allowedClassifications.includes(profile.classification) ? profile.classification : "blocked",
    approvedReadOnlyCommand: profile.approvedReadOnlyCommand || null,
    approvedReadOnlyCommands: profile.approvedReadOnlyCommands || (profile.approvedReadOnlyCommand ? [profile.approvedReadOnlyCommand] : []),
    blockedLauncherCommand: profile.blockedLauncherCommand || null,
    evidenceStatus: profile.evidenceStatus,
    notes: profile.notes,
    order: profile.order,
    badges: ["local-only", "dry-run", profile.classification],
    blockedActions: agentDriverBlockedActions,
    evidencePacket: makeEvidencePacket(
      {
        ...profile,
        classification: allowedClassifications.includes(profile.classification) ? profile.classification : "blocked"
      },
      options
    )
  };
}

function makeSummary(agents) {
  const classificationCounts = Object.fromEntries(allowedClassifications.map((classification) => [classification, 0]));
  for (const agent of agents) {
    classificationCounts[agent.classification] += 1;
  }

  return {
    agentsTotal: agents.length,
    commandExecuted: agents.filter((agent) => agent.commandExecuted).length,
    classifications: classificationCounts,
    blockedActions: agentDriverBlockedActions.length,
    approvedReadOnlyCommands: agents.filter((agent) => agent.approvedReadOnlyCommand).length
  };
}

function nextAgentAfter(agents, selectedId) {
  const ordered = agents
    .filter((agent) => ["passed", "side_effectful"].includes(agent.classification))
    .sort((a, b) => a.order - b.order);
  const selectedIndex = ordered.findIndex((agent) => agent.id === selectedId);
  return ordered[selectedIndex + 1] || ordered[0] || null;
}

export function getAgentDriverStatus(options = {}) {
  const launchGate = getAgentLaunchGateStatus(options);
  const agents = launchGate.agents.map((agent) => makeDriverAgent(agent, options));
  const recommendedOrder = agents
    .filter((agent) => ["passed", "side_effectful"].includes(agent.classification))
    .sort((a, b) => a.order - b.order);

  return {
    title: "Agent Driver",
    status: "agent-driver-ready-local-only",
    mode: "local-only-smoke-driver",
    ...capabilityLock(),
    source: "Ollama Agent Launch Gate + local manual smoke evidence",
    launchGate: {
      status: launchGate.status,
      agentsTotal: launchGate.summary.agentsTotal,
      canLaunchAgents: launchGate.canLaunchAgents,
      canRunMcp: launchGate.canRunMcp,
      canReadSecrets: launchGate.canReadSecrets
    },
    summary: makeSummary(agents),
    agents,
    recommendedOrder,
    nextRecommendedAgent: recommendedOrder[0] || null,
    blockedActions: agentDriverBlockedActions,
    evidence: {
      path: evidencePath,
      currentState: "local-docs-evidence-ready",
      apiWritesEvidence: false
    },
    stopRules: [
      "Run no command from the Agent Driver API.",
      "Allow only reviewed read-only smoke commands.",
      "Block file edits, MCP starts, package installs, messages, deploys, pushes, and publishes.",
      "Keep real agent work behind separate explicit approval."
    ],
    stopPoint: "AGENT DRIVER READY — LOCAL ONLY — WAITING FOR MANUAL SMOKE APPROVAL",
    updatedAt: nowIso(options)
  };
}

export function createAgentDriverSmokeDryRun(body = {}, options = {}) {
  const status = getAgentDriverStatus(options);
  const requestId = String(body.requestId || "agent-driver-smoke-dry-run");
  const goal = String(body.goal || "read-only smoke").trim();
  const source = String(body.source || "codex-local");
  const requestedModel = String(body.model || body.requestedModel || body.modelName || "").trim() || null;
  const selectedAgent =
    status.agents.find((agent) => agent.id === String(body.agentId || "").trim()) ||
    status.nextRecommendedAgent ||
    status.agents[0];
  const goalClassification = classifyGoal(goal);
  const modelPolicy = evaluateRequestedModelPolicy({
    requestedModel,
    selectedAgentId: selectedAgent.id
  });

  if (goalClassification.blocked || modelPolicy.blocked) {
    const blockedReasons = [...goalClassification.blockedReasons, ...modelPolicy.blockedReasons];
    return {
      title: "Agent Driver Smoke Dry-Run",
      status: "blocked-agent-driver-smoke-dry-run",
      mode: "local-only-dry-run",
      requestId,
      goal,
      source,
      ...capabilityLock(),
      classification: "blocked",
      selectedAgent,
      requestedModel,
      requestedLaunchCommand: buildLaunchCommand(selectedAgent.launchGateCommand, requestedModel),
      modelPolicy,
      approvedReadOnlyCommand: null,
      evidencePacket: {
        path: evidencePath,
        mode: "blocked-dry-run-evidence",
        didWriteFromApi: false,
        commandExecuted: false,
        blockedReasons,
        updatedAt: nowIso(options)
      },
      blockedReasons,
      blockedActions: agentDriverBlockedActions,
      nextRecommendedAgent: status.nextRecommendedAgent,
      stopPoint: "AGENT DRIVER SMOKE BLOCKED — NO COMMAND EXECUTED",
      updatedAt: nowIso(options)
    };
  }

  return {
    title: "Agent Driver Smoke Dry-Run",
    status: "dry-run-agent-driver-smoke-ready",
    mode: "local-only-dry-run",
    requestId,
    goal,
    source,
    ...capabilityLock(),
    classification: selectedAgent.classification,
    selectedAgent,
    requestedModel,
    modelPolicy,
    approvedReadOnlyCommand: selectedAgent.approvedReadOnlyCommand,
    approvedReadOnlyCommands: selectedAgent.approvedReadOnlyCommands,
    evidencePacket: makeEvidencePacket(selectedAgent, options),
    blockedReasons: [],
    blockedActions: agentDriverBlockedActions,
    nextRecommendedAgent: nextAgentAfter(status.agents, selectedAgent.id),
    manualSteps: [
      "Review classification and blocked actions.",
      "Copy only the approved read-only command after explicit manual smoke approval.",
      "Capture stdout/stderr summary without printing secrets.",
      `Record evidence locally in ${evidencePath}.`,
      "Stop before any file edit, MCP start, install, message send, deploy, push, publish, or real agent task."
    ],
    stopPoint: "AGENT DRIVER SMOKE DRY-RUN READY — NO COMMAND EXECUTED",
    updatedAt: nowIso(options)
  };
}
