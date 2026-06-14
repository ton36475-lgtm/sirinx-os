import { getAgentDriverStatus } from "./agent-driver.mjs";
import { getConnectorRegistryStatus } from "./connector-registry.mjs";

export const centerBrainBlockedActions = [
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
  "connector_auto_run",
  "device_remote_control",
  "mobile_push_notification",
  "package_install"
];

const stackLanes = [
  ["nextjs", "Next.js", "future-shell", "Use for the future production-grade CenterBrain UI shell."],
  ["tailwind", "Tailwind", "future-design-system", "Use for consistent operator UI once Next.js shell is approved."],
  ["html", "HTML", "current-dashboard", "Current local dashboard markup is the active surface."],
  ["javascript", "JavaScript", "current-dashboard-runtime", "Current local dashboard runtime and API render layer."],
  ["golang", "Go", "future-agent-runtime", "Use only after a separate Go worker plan is approved."],
  ["local-api", "Node.js Local API", "active-control-api", "Current local JSON contract surface."],
  ["a2a2-sync", "A2A2 Adaptive Sync", "active-contract", "Evidence, provenance, and approval-gated handoff loop."]
];

const deviceNodes = [
  ["mac", "Mac mini", "active-local-host", "Local command center host; can run tests and local dashboards."],
  ["pc", "PC", "planned-remote-node", "Planned node; requires manual pairing and evidence before sync."],
  ["mobile", "Mobile phone", "planned-control-client", "Planned review/control client; no push or messaging activation."]
];

const dangerousGoalRules = [
  ["deploy", /\bdeploy\b/i],
  ["push", /\bpush|git push\b/i],
  ["mcp_server_start", /\bmcp|model context protocol|start server|start-server\b/i],
  ["install_packages", /\binstall|pnpm add|npm i|pip install|brew install\b/i],
  ["message_send", /\bsend|telegram|line|dm|email|sms|notify\b/i],
  ["secret_read_or_print", /\bsecret|token|api key|apikey|password|credential\b/i],
  ["external_connector_activation", /\bactivate|connect live|oauth|supabase write|github push|clickup create\b/i]
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
    canActivateConnectors: false,
    canExecuteExternally: false,
    canRunMcp: false,
    canReadSecrets: false,
    canSendMessages: false,
    canDeploy: false,
    canRemoteControlDevices: false,
    requiresHumanApproval: true
  };
}

function makeStackLane([id, title, status, purpose], index) {
  return {
    id,
    title,
    ordinal: index + 1,
    status,
    purpose,
    ...lock(),
    nextExactStep:
      id === "nextjs"
        ? "Create a separate Next.js/Tailwind shell only after local dashboard contract remains green."
        : "Keep this lane as local planning context until separately approved."
  };
}

function makeDeviceNode([id, title, status, purpose], index) {
  return {
    id,
    title,
    ordinal: index + 1,
    status,
    purpose,
    ...lock(),
    syncMode: id === "mac" ? "local-observed" : "planned-manual-pairing",
    nextExactStep:
      id === "mac"
        ? "Use the Mac node as the only active CenterBrain host."
        : "Create a pairing evidence packet before any live device sync."
  };
}

function normalizeAiNode(agent, index) {
  return {
    id: agent.id,
    title: agent.title,
    ordinal: index + 1,
    classification: agent.classification,
    status: agent.classification === "passed" ? "read-only-smoke-passed" : agent.classification,
    approvedReadOnlyCommand: agent.approvedReadOnlyCommand || null,
    ...lock(),
    commandExecuted: false,
    source: "agent-driver"
  };
}

function findBlockedReasons(goal) {
  return dangerousGoalRules.filter(([, pattern]) => pattern.test(goal)).map(([reason]) => reason);
}

function makeSummary({ aiNodes, deviceNodes, connectorRegistry, stackLanes }) {
  return {
    aiNodes: aiNodes.length,
    deviceNodes: deviceNodes.length,
    connectorLanes: connectorRegistry.summary.connectorsTotal,
    stackLanes: stackLanes.length,
    liveExternalActions: 0,
    blockedActions: centerBrainBlockedActions.length
  };
}

export async function getCenterBrainHubStatus(options = {}) {
  const [agentDriver, connectorRegistry] = await Promise.all([
    Promise.resolve(getAgentDriverStatus(options)),
    getConnectorRegistryStatus(options)
  ]);
  const aiNodes = [...agentDriver.agents].sort((left, right) => left.order - right.order).map(normalizeAiNode);
  const devices = deviceNodes.map(makeDeviceNode);
  const stacks = stackLanes.map(makeStackLane);

  return {
    title: "CenterBrain Hub",
    status: "centerbrain-hub-ready-local-only",
    mode: "a2a2-adaptive-sync-control-plane",
    ...lock(),
    source: "local-dev-control-api",
    summary: makeSummary({ aiNodes, deviceNodes: devices, connectorRegistry, stackLanes: stacks }),
    aiNodes,
    deviceNodes: devices,
    stackLanes: stacks,
    connectorRegistry,
    agentDriver,
    syncContract: {
      handshake: ["discover", "classify", "dry-run", "evidence", "approval", "manual-activation"],
      evidencePath: "docs/knowledge/SIRINX_CENTERBRAIN_HUB_V1.md",
      activeHost: "mac",
      plannedNodes: ["pc", "mobile"],
      approvalRequiredFor: [
        "external connector activation",
        "device pairing",
        "Next.js/Tailwind app creation",
        "Go worker creation",
        "mobile push notifications",
        "real agent work"
      ]
    },
    blockedActions: centerBrainBlockedActions,
    stopRules: [
      "Keep all AI and connector nodes local-only until explicit approval.",
      "Do not activate Figma, Canva, ClickUp, Supabase, GitHub, Browser, Chrome, or messaging connectors from this hub.",
      "Do not create device pairing, mobile push, MCP, deploy, or package install side effects.",
      "Use CenterBrain as a status, evidence, and dry-run planning hub first."
    ],
    nextRecommendedAction: "Build Next.js/Tailwind shell only after local dashboard contract remains green.",
    stopPoint: "CENTERBRAIN HUB READY LOCAL-ONLY - WAITING FOR HUMAN APPROVAL",
    updatedAt: nowIso(options)
  };
}

export async function createCenterBrainSyncDryRun(body = {}, options = {}) {
  const status = await getCenterBrainHubStatus(options);
  const requestId = String(body.requestId || "centerbrain-sync-dry-run");
  const goal = String(body.goal || "local-only adaptive sync").trim();
  const requestedDevices = Array.isArray(body.targetDevices)
    ? body.targetDevices.map((device) => String(device).trim()).filter(Boolean)
    : ["mac"];
  const blockedReasons = findBlockedReasons(goal);

  if (blockedReasons.length > 0) {
    return {
      title: "CenterBrain Hub Sync Dry-Run",
      status: "blocked-centerbrain-sync-dry-run",
      mode: "local-only-dry-run",
      requestId,
      goal,
      ...lock(),
      blockedReasons,
      blockedActions: centerBrainBlockedActions,
      syncPlan: null,
      nextRecommendedAction: "Remove blocked actions and request local-only dry-run planning only.",
      stopPoint: "CENTERBRAIN SYNC BLOCKED - NO ACTION TAKEN",
      updatedAt: nowIso(options)
    };
  }

  return {
    title: "CenterBrain Hub Sync Dry-Run",
    status: "dry-run-centerbrain-sync-ready",
    mode: "local-only-dry-run",
    requestId,
    goal,
    ...lock(),
    blockedReasons: [],
    blockedActions: centerBrainBlockedActions,
    syncPlan: {
      devices: status.deviceNodes.filter((device) => requestedDevices.includes(device.id)),
      aiNodes: status.aiNodes,
      connectorLanes: status.connectorRegistry.connectors,
      stackLanes: status.stackLanes,
      handshake: status.syncContract.handshake,
      evidencePath: status.syncContract.evidencePath
    },
    manualSteps: [
      "Review CenterBrain node classifications.",
      "Keep Mac as the only active local host.",
      "Create evidence before pairing PC or mobile.",
      "Keep Figma, Canva, ClickUp, Supabase, GitHub, Browser, Chrome, and messaging connectors inactive.",
      "Stop before MCP, deploy, push, package install, provider secrets, or real agent work."
    ],
    nextRecommendedAction: status.nextRecommendedAction,
    stopPoint: "CENTERBRAIN SYNC DRY-RUN READY - NO ACTION TAKEN",
    updatedAt: nowIso(options)
  };
}
