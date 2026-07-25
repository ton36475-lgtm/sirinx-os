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
  "package_install",
  "marketing_platform_publish",
  "autoflow_live_run",
  "autocut_live_export"
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
  ["pc", "LAN PC", "planned-lan-worker-node", "Planned local-network worker for marketing dry-runs and autocut preparation; requires pairing evidence before sync."],
  ["mobile", "Mobile phone", "planned-control-client", "Planned review/control client; no push or messaging activation."]
];

const marketingAutomationLanes = [
  [
    "gemini-daily-report",
    "Gemini Daily Report Packet",
    "manual-review-packet",
    "Prepare a local daily status packet that Gemini CLI can review manually; never auto-run Gemini."
  ],
  [
    "ghostclaw-autoflow",
    "GHOSTCLAW Autoflow Planner",
    "dry-run-only",
    "Convert approved marketing goals into local task packets, briefs, and checklists without posting or buying media."
  ],
  [
    "autocut-prep",
    "Autocut Prep Lane",
    "dry-run-only",
    "Prepare cut lists, captions, asset manifests, and render-intent packets; no live export or upload."
  ],
  [
    "online-marketing-platform",
    "Online Marketing Platform Adapter",
    "blocked-until-approved",
    "Represent Meta, Google, TikTok, LINE, CRM, and scheduler targets as blocked adapter intents only."
  ]
];

const dangerousGoalRules = [
  ["deploy", /\bdeploy\b/i],
  ["push", /\bpush|git push\b/i],
  ["mcp_server_start", /\bmcp|model context protocol|start server|start-server\b/i],
  ["install_packages", /\binstall|pnpm add|npm i|pip install|brew install\b/i],
  ["message_send", /\bsend|telegram|line|dm|email|sms|notify\b/i],
  ["secret_read_or_print", /\bsecret|token|api key|apikey|password|credential\b/i],
  ["external_connector_activation", /\bactivate|connect live|oauth|supabase write|github push|clickup create\b/i],
  ["marketing_platform_publish", /\b(publish|post|launch|boost|buy ads|spend|upload live|go live)\b/i],
  ["autoflow_live_run", /\b(run|execute|start)\s+(autoflow|auto flow)\b/i],
  ["autocut_live_export", /\b(export|render|upload)\s+(autocut|auto cut|video)\b/i]
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
  const pcWorker = id === "pc";
  return {
    id,
    title,
    ordinal: index + 1,
    status,
    purpose,
    ...lock(),
    syncMode: id === "mac" ? "local-observed" : "planned-manual-pairing",
    lanWorker: pcWorker,
    allowedLocalRoles: pcWorker
      ? ["dry_run_marketing_planner", "autocut_prep", "local_render_intent_only", "report_packet_builder"]
      : [],
    forbiddenLocalRoles: pcWorker
      ? ["customer_message_send", "ad_publish", "paid_campaign_launch", "live_upload", "remote_desktop_control"]
      : [],
    nextExactStep:
      id === "mac"
        ? "Use the Mac node as the only active CenterBrain host."
        : pcWorker
          ? "Create a LAN PC pairing evidence packet with hostname, local IP, reachable ports, allowed folders, and operator approval."
          : "Create a pairing evidence packet before any live device sync."
  };
}

function makeMarketingAutomationLane([id, title, status, purpose], index) {
  return {
    id,
    title,
    ordinal: index + 1,
    status,
    purpose,
    targetDevice: id === "gemini-daily-report" ? "mac" : "pc",
    ...lock(),
    canPublishAds: false,
    canUploadAssets: false,
    canRunAutocut: false,
    canRunAutoflow: false,
    canCallGemini: false,
    reportFields: [
      "date",
      "sourceEvidence",
      "campaignGoal",
      "plannedAssets",
      "autocutChecklist",
      "blockedActions",
      "approvalNeeded",
      "nextSafeAction"
    ],
    nextExactStep:
      id === "gemini-daily-report"
        ? "Write a local daily report packet for manual Gemini review; do not invoke Gemini automatically."
        : "Keep this marketing lane as dry-run planning until LAN PC pairing and platform approval are complete."
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

function makeSummary({ aiNodes, deviceNodes, connectorRegistry, stackLanes, marketingAutomation }) {
  return {
    aiNodes: aiNodes.length,
    deviceNodes: deviceNodes.length,
    connectorLanes: connectorRegistry.summary.connectorsTotal,
    stackLanes: stackLanes.length,
    marketingAutomationLanes: marketingAutomation.length,
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
  const marketingAutomation = marketingAutomationLanes.map(makeMarketingAutomationLane);

  return {
    title: "CenterBrain Hub",
    status: "centerbrain-hub-ready-local-only",
    mode: "a2a2-adaptive-sync-control-plane",
    ...lock(),
    source: "local-dev-control-api",
    summary: makeSummary({ aiNodes, deviceNodes: devices, connectorRegistry, stackLanes: stacks, marketingAutomation }),
    aiNodes,
    deviceNodes: devices,
    stackLanes: stacks,
    marketingAutomation,
    connectorRegistry,
    agentDriver,
    syncContract: {
      handshake: ["discover", "classify", "dry-run", "evidence", "approval", "manual-activation"],
      evidencePath: "docs/knowledge/SIRINX_CENTERBRAIN_HUB_V1.md",
      activeHost: "mac",
      plannedNodes: ["pc", "mobile"],
      reportConsumers: ["Obsidian", "Night Watch", "Gemini CLI manual review"],
      pcWorkerPurpose: "LAN-only dry-run worker for GHOSTCLAW autoflow planning and autocut preparation.",
      approvalRequiredFor: [
        "external connector activation",
        "device pairing",
        "LAN PC worker pairing",
        "autoflow execution",
        "autocut render/export/upload",
        "online marketing platform publish or spend",
        "Gemini CLI execution",
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
      "Do not run Gemini CLI, online marketing platform actions, autoflow live runs, or autocut exports automatically.",
      "Use CenterBrain as a status, evidence, and dry-run planning hub first."
    ],
    nextRecommendedAction: "Create a LAN PC pairing evidence packet before any PC worker sync or marketing automation run.",
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
      marketingAutomation: status.marketingAutomation,
      handshake: status.syncContract.handshake,
      evidencePath: status.syncContract.evidencePath,
      reportConsumers: status.syncContract.reportConsumers
    },
    manualSteps: [
      "Review CenterBrain node classifications.",
      "Keep Mac as the only active local host.",
      "Create evidence before pairing PC or mobile.",
      "For LAN PC marketing work, record hostname, local IP, allowed folders, operator owner, and blocked external actions.",
      "Use Gemini Daily Report as a local packet for manual review only; do not run Gemini automatically.",
      "Keep GHOSTCLAW Autoflow and Autocut lanes in dry-run/report mode until a separate platform approval is recorded.",
      "Keep Figma, Canva, ClickUp, Supabase, GitHub, Browser, Chrome, and messaging connectors inactive.",
      "Stop before MCP, deploy, push, package install, provider secrets, or real agent work."
    ],
    nextRecommendedAction: status.nextRecommendedAction,
    stopPoint: "CENTERBRAIN SYNC DRY-RUN READY - NO ACTION TAKEN",
    updatedAt: nowIso(options)
  };
}
