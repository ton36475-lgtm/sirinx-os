const params = new URLSearchParams(window.location.search);
const apiBase = params.get("api") || "http://localhost:8711";

const apiState = document.querySelector("#apiState");
const gateList = document.querySelector("#gateList");
const actionList = document.querySelector("#actionList");
const brainStatus = document.querySelector("#brainStatus");
const brainSummary = document.querySelector("#brainSummary");
const brainRootList = document.querySelector("#brainRootList");
const brainNoteList = document.querySelector("#brainNoteList");
const brainNoteTitle = document.querySelector("#brainNoteTitle");
const brainNotePath = document.querySelector("#brainNotePath");
const brainOpenLink = document.querySelector("#brainOpenLink");
const brainNoteMeta = document.querySelector("#brainNoteMeta");
const brainNoteContent = document.querySelector("#brainNoteContent");
const hermesOpenLink = document.querySelector("#hermesOpenLink");
const vibeStatus = document.querySelector("#vibeStatus");
const vibeSummary = document.querySelector("#vibeSummary");
const vibeRule = document.querySelector("#vibeRule");
const vibeProcessLane = document.querySelector("#vibeProcessLane");
const vibeFunctionGrid = document.querySelector("#vibeFunctionGrid");
const vibeAgentTeam = document.querySelector("#vibeAgentTeam");
const leadHealthStatus = document.querySelector("#leadHealthStatus");
const leadHealthSummary = document.querySelector("#leadHealthSummary");
const leadHealthLocal = document.querySelector("#leadHealthLocal");
const leadHealthProduction = document.querySelector("#leadHealthProduction");
const leadHealthNextActions = document.querySelector("#leadHealthNextActions");
const leadAuditEvent = document.querySelector("#leadAuditEvent");
const leadAuditBlocks = document.querySelector("#leadAuditBlocks");
const leadAuditEvidence = document.querySelector("#leadAuditEvidence");
const salesArtifactsStatus = document.querySelector("#salesArtifactsStatus");
const salesArtifactsSummary = document.querySelector("#salesArtifactsSummary");
const salesArtifactsList = document.querySelector("#salesArtifactsList");
const salesArtifactsNextActions = document.querySelector("#salesArtifactsNextActions");
const roiPreviewStatus = document.querySelector("#roiPreviewStatus");
const roiPreviewSummary = document.querySelector("#roiPreviewSummary");
const roiAssumptionForm = document.querySelector("#roiAssumptionForm");
const roiMonthlyBill = document.querySelector("#roiMonthlyBill");
const roiDaytimeRatio = document.querySelector("#roiDaytimeRatio");
const roiBackupPriority = document.querySelector("#roiBackupPriority");
const roiPhaseType = document.querySelector("#roiPhaseType");
const roiCalculateButton = document.querySelector("#roiCalculateButton");
const roiCaseList = document.querySelector("#roiCaseList");
const roiReviewGates = document.querySelector("#roiReviewGates");
const proposalDraftStatus = document.querySelector("#proposalDraftStatus");
const proposalDraftSummary = document.querySelector("#proposalDraftSummary");
const proposalDraftPreview = document.querySelector("#proposalDraftPreview");
const proposalDraftNextActions = document.querySelector("#proposalDraftNextActions");
const proposalDraftWriteButton = document.querySelector("#proposalDraftWriteButton");
const proposalDraftWriteResult = document.querySelector("#proposalDraftWriteResult");
const proposalReviewStatus = document.querySelector("#proposalReviewStatus");
const proposalReviewSummary = document.querySelector("#proposalReviewSummary");
const proposalReviewList = document.querySelector("#proposalReviewList");
const proposalReviewNextActions = document.querySelector("#proposalReviewNextActions");
const proposalReviewWriteButton = document.querySelector("#proposalReviewWriteButton");
const proposalReviewWriteResult = document.querySelector("#proposalReviewWriteResult");
const mobileReviewStatus = document.querySelector("#mobileReviewStatus");
const mobileReviewSummary = document.querySelector("#mobileReviewSummary");
const mobileReviewCommandList = document.querySelector("#mobileReviewCommandList");
const mobileReviewNextActions = document.querySelector("#mobileReviewNextActions");
const mobileReviewWriteButton = document.querySelector("#mobileReviewWriteButton");
const mobileReviewWriteResult = document.querySelector("#mobileReviewWriteResult");
const externalGateStatus = document.querySelector("#externalGateStatus");
const externalGateSummary = document.querySelector("#externalGateSummary");
const externalGateList = document.querySelector("#externalGateList");
const externalGateNextActions = document.querySelector("#externalGateNextActions");
const externalGateWriteButton = document.querySelector("#externalGateWriteButton");
const externalGateWriteResult = document.querySelector("#externalGateWriteResult");
const externalGatePreflightStatus = document.querySelector("#externalGatePreflightStatus");
const externalGatePreflightSummary = document.querySelector("#externalGatePreflightSummary");
const externalGatePreflightList = document.querySelector("#externalGatePreflightList");
const externalGatePreflightNextActions = document.querySelector("#externalGatePreflightNextActions");
const externalGatePreflightWriteButton = document.querySelector("#externalGatePreflightWriteButton");
const externalGatePreflightWriteResult = document.querySelector("#externalGatePreflightWriteResult");
const hermesInboxStatus = document.querySelector("#hermesInboxStatus");
const hermesInboxSummary = document.querySelector("#hermesInboxSummary");
const hermesInboxList = document.querySelector("#hermesInboxList");
const hermesInboxRunButton = document.querySelector("#hermesInboxRunButton");
const hermesInboxRunResult = document.querySelector("#hermesInboxRunResult");
const hermesDashboardState = document.querySelector("#hermesDashboardState");
const hermesDashboardMeta = document.querySelector("#hermesDashboardMeta");
const hermesGatewayState = document.querySelector("#hermesGatewayState");
const hermesGatewayMeta = document.querySelector("#hermesGatewayMeta");
const hermesKanbanState = document.querySelector("#hermesKanbanState");
const hermesKanbanMeta = document.querySelector("#hermesKanbanMeta");
const switchList = document.querySelector("#switchList");
const approvalStatus = document.querySelector("#approvalStatus");
const approvalList = document.querySelector("#approvalList");
const executiveStatus = document.querySelector("#executiveStatus");
const executiveSummary = document.querySelector("#executiveSummary");
const executiveServices = document.querySelector("#executiveServices");
const executiveAgents = document.querySelector("#executiveAgents");
const executiveProjects = document.querySelector("#executiveProjects");
const executiveKanban = document.querySelector("#executiveKanban");
const projectInventoryStatus = document.querySelector("#projectInventoryStatus");
const inventoryJsonLink = document.querySelector("#inventoryJsonLink");
const toolRefreshButton = document.querySelector("#toolRefreshButton");
const toolSummary = document.querySelector("#toolSummary");
const toolSubdomainList = document.querySelector("#toolSubdomainList");
const toolRepoList = document.querySelector("#toolRepoList");
const toolIntegrationList = document.querySelector("#toolIntegrationList");
const toolBlockerList = document.querySelector("#toolBlockerList");
const toolNextActions = document.querySelector("#toolNextActions");
const githubIntegrationStatus = document.querySelector("#githubIntegrationStatus");
const githubIntegrationSummary = document.querySelector("#githubIntegrationSummary");
const githubIntegrationList = document.querySelector("#githubIntegrationList");
const githubExtractionList = document.querySelector("#githubExtractionList");
const githubIntegrationNextActions = document.querySelector("#githubIntegrationNextActions");
const eventLog = document.querySelector("#eventLog");
const auditStatus = document.querySelector("#auditStatus");
const auditList = document.querySelector("#auditList");
const lastUpdated = document.querySelector("#lastUpdated");
const refreshButton = document.querySelector("#refreshButton");
const clearLogButton = document.querySelector("#clearLogButton");

const fallbackGates = [
  {
    id: "dry-run",
    title: "Dry-run lock",
    state: "pass",
    description: "External writes are disabled in local mode."
  },
  {
    id: "human-approval",
    title: "Human approval",
    state: "warn",
    description: "Approval is required before staging or production changes."
  },
  {
    id: "cloud-mutation",
    title: "Cloud mutation",
    state: "block",
    description: "Cloud writes remain blocked until release gates pass."
  }
];

const fallbackActions = [
  {
    id: "baseline-check",
    title: "Freeze Mac live baseline",
    description: "Records local readiness without touching production systems.",
    risk: "low",
    mode: "dry-run"
  },
  {
    id: "dashboard-qa",
    title: "Run dashboard QA checklist",
    description: "Prepares browser QA steps for dev.sirinx.co.",
    risk: "low",
    mode: "dry-run"
  }
];

const fallbackSwitches = [
  {
    id: "cloud-mutation",
    title: "Cloud mutation",
    env: "CLOUDFLARE_MUTATION_ENABLED",
    enabled: false,
    description: "Allows cloud resource writes only after explicit approval."
  },
  {
    id: "customer-messaging",
    title: "Customer messaging",
    env: "CUSTOMER_MESSAGE_SEND_ENABLED",
    enabled: false,
    description: "Allows customer-facing sends only after explicit approval."
  },
  {
    id: "paid-api",
    title: "Paid API calls",
    env: "PAID_API_CALLS_ENABLED",
    enabled: false,
    description: "Allows paid API usage only after approval gates pass."
  }
];

const fallbackApprovalQueue = {
  items: [
    {
      id: "fallback-approval",
      action: "Local fallback approval",
      actionId: "fallback",
      source: "dashboard",
      riskLevel: "low",
      status: "pending",
      reason: "Control API is offline; approvals cannot be changed.",
      evidence: ["fallback mode"]
    }
  ],
  totals: { pending: 1, approved: 0, rejected: 0, blocked: 0 }
};

const fallbackAuditTrail = {
  items: [
    {
      event_id: "fallback-audit",
      timestamp: new Date().toISOString(),
      actor: "dashboard",
      source: "fallback",
      action: "audit unavailable",
      target: "control-api",
      risk_level: "low",
      approval_status: "not-required",
      kill_switch_status: "not-required",
      external_writes: false,
      result: "api_offline",
      evidence: ["fallback mode"]
    }
  ],
  totals: { api_offline: 1 }
};

const fallbackBrain = {
  rootCount: 0,
  roots: [],
  noteCount: 0,
  totals: { openTasks: 0, doneTasks: 0, links: 0 },
  notes: []
};

const fallbackHermes = {
  connected: false,
  dashboard: { online: false, url: "http://127.0.0.1:9119" },
  gateway: { running: false, safeDispatch: true },
  kanban: {
    board: "sirinx-os",
    ready: 0,
    stats: { running: 0, blocked: 0, done: 0 }
  }
};

const fallbackVibe = {
  mode: "local-fallback",
  externalWrites: false,
  mainWebsiteProtected: true,
  summary: { functions: 0, ready: 0, dryRun: 0, blocked: 0, phases: 0, activeProfiles: 0, readyProfiles: 0, rosterRoles: 0 },
  functions: [],
  processLane: [
    {
      id: "fallback",
      label: "Fallback",
      title: "Control API unavailable",
      status: "manual-gate",
      nextCommand: "Start local control API",
      output: "Process control returns when API is online."
    }
  ],
  agentTeam: {
    title: "SIRINX 47 Ronin Agent Team",
    mode: "fallback",
    summary: { activeProfiles: 0, readyProfiles: 0, aliases: 0, rosterRoles: 0, connectorPolicies: 0, backlogGates: 0 },
    activeProfiles: [],
    connectorPolicy: [],
    backlogGates: [],
    roleRoster: []
  },
  operatingRule: "Fallback mode only. No external writes are available."
};

const fallbackLeadHealth = {
  status: "unavailable",
  schema: {
    version: "unavailable",
    fieldCount: 0,
    piiFieldCount: 0,
    contactChannelFields: [],
    acceptedPayloadShapes: [],
    reviewGates: ["Start the local control API to load the lead intake schema."]
  },
  qualificationModel: {
    modelVersion: "unavailable",
    score: 0,
    priority: "unknown",
    workflowLane: "unavailable",
    packageLane: "unavailable",
    trafficStatus: "unavailable",
    solarSegment: "unavailable",
    attribution: {},
    reasons: [],
    riskFlags: [],
    externalWrites: false,
    nextAction: "Start the local control API to load lead qualification status."
  },
  externalWrites: false,
  productionPostProbeRun: false,
  local: {
    ok: false,
    parser: {
      batchPayloadSupported: false,
      numericKeyedBatchSupported: false,
      arrayBatchSupported: false,
      hasName: false,
      hasContactChannel: false,
      arrayHasContactChannel: false
    },
    mockD1: {
      statements: 0,
      inserted: false
    }
  },
  production: {
    reachable: false,
    status: null,
    routedToMainRouter: false,
    externalWrites: false,
    postProbeRun: false
  },
  nextActions: ["Start the local control API and refresh lead health."]
};

const fallbackLeadAudit = {
  status: "unavailable",
  externalWrites: false,
  productionPostProbeRun: false,
  crmWrites: false,
  supabaseWrites: false,
  leadEvent: {
    workflowLane: "unavailable",
    packageLane: "unavailable",
    score: 0,
    priority: "unknown",
    contactEvidence: {
      contactChannelCount: 0,
      rawContactValuesStored: false
    },
    routing: {
      primaryProfile: "sales",
      supportProfiles: [],
      commandCenterLane: "leads",
      backlogStatus: "offline"
    },
    riskFlags: [],
    allowedLocalUses: []
  },
  evidenceChecklist: [],
  blockedExternalActions: [],
  nextActions: ["Start the local control API and refresh lead event audit."]
};

const fallbackSalesArtifacts = {
  status: "unavailable",
  proposalDraftReadiness: "blocked-local-artifacts",
  mode: "local-fallback",
  externalWrites: false,
  summary: { artifacts: 0, ready: 0, missing: 0, incomplete: 0 },
  items: [],
  lanes: [],
  reviewGates: ["Start the local control API to inspect sales artifacts."],
  nextActions: ["Start the local control API and refresh sales artifacts."]
};

const fallbackRoiPreview = {
  status: "unavailable",
  mode: "local-fallback",
  externalWrites: false,
  productionWrites: false,
  customerVisible: false,
  assumptions: {
    monthly_bill_thb: 0,
    daytime_load_ratio: 0.5,
    backup_priority: "medium",
    phase_type: "unknown"
  },
  result: {
    recommendedPackage: { id: "unavailable", type: "manual", kw: 0, batteryKwh: 0, price: 0 },
    estimatedMonthlyKwh: 0,
    estimatedMonthlyPvKwh: 0,
    cases: []
  },
  reviewGates: ["Start the local control API to calculate ROI assumptions."],
  nextActions: ["Start the local control API and refresh ROI preview."]
};

const fallbackProposalDraft = {
  status: "unavailable",
  mode: "local-fallback",
  externalWrites: false,
  customerVisible: false,
  safeWriteTargetRoot: "/Users/sirinx/Documents/Obsidian Vault/SIRINX/05_PROJECTS/Proposal Drafts",
  readiness: { salesArtifacts: "unavailable", proposalDraft: "blocked-local-artifacts", artifactReadyCount: 0, artifactTotal: 0 },
  draft: {
    title: "Local Proposal Draft Preview",
    markdown: "Proposal draft preview is unavailable until the local control API is online.",
    sectionCount: 0,
    byteLength: 0
  },
  nextActions: ["Start the local control API and refresh proposal draft preview."]
};

const fallbackProposalReview = {
  status: "blocked-external-send",
  mode: "local-fallback",
  localWorkflowReady: false,
  canSendExternally: false,
  externalWrites: false,
  productionWrites: false,
  customerVisible: false,
  reviewPacketTargetRoot: "/Users/sirinx/Documents/Obsidian Vault/SIRINX/06_OPERATIONS/Proposal Review Packets",
  summary: { items: 0, complete: 0, missing: 0, blocked: 0, reviewRequired: 0, blockingExternalSend: 1 },
  items: [
    {
      id: "fallback",
      title: "Proposal review unavailable",
      detail: "Start the local control API to inspect external-send readiness.",
      state: "blocked",
      complete: false,
      blocksExternalSend: true
    }
  ],
  nextActions: ["Start the local control API and refresh proposal review."]
};

const fallbackMobileReviewPacket = {
  status: "unavailable",
  mode: "local-fallback",
  externalWrites: false,
  productionWrites: false,
  customerVisible: false,
  mobileCanApproveExternally: false,
  reviewPacketTargetRoot: "/Users/sirinx/Documents/Obsidian Vault/SIRINX/06_OPERATIONS/Codex Mobile Review Packets",
  summary: { approvalItems: 0, pendingApprovals: 0, blockedApprovals: 0, proposalBlockingItems: 0, auditEvents: 0 },
  proposalReview: { status: "unavailable", localWorkflowReady: false, canSendExternally: false, blockingExternalSend: 0 },
  reviewCommands: ["Start the local control API to prepare a Codex Mobile review packet."],
  nextActions: ["Start the local control API and refresh mobile review packet."]
};

const fallbackExternalGatePackets = {
  status: "unavailable",
  mode: "local-fallback",
  externalWrites: false,
  productionWrites: false,
  customerVisible: false,
  canExecuteNow: false,
  packetTargetRoot: "/Users/sirinx/Documents/Obsidian Vault/SIRINX/06_OPERATIONS/External Gate Approval Packets",
  summary: { packets: 0, highRisk: 0, mediumRisk: 0, canExecuteNow: 0, externalWrites: false },
  packets: [
    {
      id: "fallback",
      gate: "Fallback",
      title: "External gate packets unavailable",
      approvalPhrase: "Start the local control API to inspect external gate packets.",
      risk: "medium",
      canExecuteNow: false,
      externalWrites: false
    }
  ],
  nextActions: ["Start the local control API and refresh external gate packets."]
};

const fallbackExternalGatePreflight = {
  status: "unavailable",
  mode: "local-fallback",
  externalWrites: false,
  productionWrites: false,
  customerVisible: false,
  canExecuteNow: false,
  preflightTargetRoot: "/Users/sirinx/Documents/Obsidian Vault/SIRINX/06_OPERATIONS/External Gate Audit Preflight",
  summary: {
    entries: 0,
    reviewed: 0,
    blocked: 1,
    readyForTargetedApproval: 0,
    optionalOfficialReview: 0,
    manualHumanGates: 0,
    canExecuteNow: 0,
    externalWrites: false
  },
  entries: [
    {
      id: "fallback",
      gate: "Fallback",
      title: "External gate preflight unavailable",
      owner: "shogun",
      status: "blocked-api-offline",
      reviewState: "blocked",
      target: "control-api",
      blockingReason: "Start the local control API to inspect gate preflight state.",
      nextLocalAction: "Start the local control API and refresh external gate preflight.",
      canExecuteNow: false,
      externalWrites: false
    }
  ],
  nextActions: ["Start the local control API and refresh external gate preflight."]
};

const fallbackHermesInbox = {
  status: "ready-local-dry-run",
  result: "not-run",
  externalWrites: false,
  requiresHumanApproval: false,
  policy: {
    decision: "not-run",
    target: "docs/knowledge/SIRINX_PLAN.md",
    hardBlocks: [],
    approvalReasons: []
  },
  auditEvent: {
    result: "not-run",
    source: "hermes-inbox-dry-run"
  }
};

const fallbackExecutive = {
  presentation: {
    canRunNow: false,
    safeDispatch: true,
    message: "Executive HQ data is loading from the local control API."
  },
  metrics: {
    servicesOnline: 0,
    servicesTotal: 0,
    hermesAgents: 0,
    thClawsAgents: 0,
    roninProfiles: 0,
    skills: 0,
    kanbanReady: 0,
    kanbanRunning: 0,
    kanbanBlocked: 0
  },
  services: [],
  agentTeams: [],
  skills: [],
  projects: [],
  kanbanTasks: []
};

const fallbackProjectInventory = {
  mode: "read-only",
  mainWebsiteProtected: true,
  externalWrites: false,
  summary: {
    repositories: 0,
    subdomains: 0,
    readySubdomains: 0,
    blockedSubdomains: 0,
    integrationGates: 0,
    blockers: 0,
    dirtyRepos: 0
  },
  repositories: [],
  subdomains: [
    {
      host: "www.sirinx.co",
      role: "public company website",
      source: "/Users/sirinx/restore-sources/ton36475-lgtm-sirinx",
      desiredState: "locked",
      action: "do-not-touch",
      current: { online: true, status: 200 }
    }
  ],
  integrationGates: [
    {
      channel: "Control API",
      status: "offline",
      reason: "Tool inventory is unavailable until the local control API is online."
    }
  ],
  blockers: [],
  nextActions: ["Start the local control API and refresh the tool inventory."]
};

const fallbackGithubIntegration = {
  title: "GitHub integration inventory unavailable",
  mode: "local-fallback",
  auditRoot: "/Users/sirinx/restore-sources/github-audit",
  status: "unavailable",
  externalWrites: false,
  productionWrites: false,
  customerVisible: false,
  summary: {
    repositories: 0,
    lanes: 0,
    p0: 0,
    p1: 0,
    p2: 0,
    p3: 0,
    blocked: 0,
    extractionTasks: 0,
    extractionReady: 0,
    extractionGated: 0,
    externalWrites: false
  },
  repositories: [
    {
      name: "Fallback",
      status: "api-offline",
      lane: "control-api",
      priority: "P0",
      integrationTarget: "Start the local control API to inspect GitHub repo integration.",
      nextAction: "Run pnpm dashboard:run.",
      blockers: ["Control API unavailable."]
    }
  ],
  extractionTasks: [
    {
      id: "Fallback",
      part: "fallback",
      repo: "control-api",
      lane: "control-api",
      priority: "P0",
      status: "api-offline",
      target: "Start the local control API to inspect extraction workstreams.",
      allowedNextStep: "Run pnpm dashboard:run.",
      sourceFiles: [],
      blockedBy: ["Control API unavailable."]
    }
  ],
  nextActions: ["Start the local control API to inspect GitHub repository integration."]
};

function logEvent(message) {
  const item = document.createElement("li");
  item.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
  eventLog.prepend(item);
}

function setApiState(state, label) {
  apiState.textContent = label;
  apiState.classList.remove("status-safe", "status-warn", "status-lock");
  apiState.classList.add(state === "online" ? "status-safe" : "status-warn");
}

function renderGates(gates) {
  gateList.replaceChildren(
    ...gates.map((gate) => {
      const row = document.createElement("article");
      row.className = "gate-row";

      const dot = document.createElement("span");
      dot.className = `gate-dot ${gate.state || "warn"}`;
      dot.setAttribute("aria-hidden", "true");

      const content = document.createElement("div");
      const title = document.createElement("p");
      title.className = "gate-title";
      title.textContent = gate.title;

      const copy = document.createElement("p");
      copy.className = "gate-copy";
      copy.textContent = gate.description;

      content.append(title, copy);
      row.append(dot, content);
      return row;
    })
  );
}

function renderActions(actions) {
  actionList.replaceChildren(
    ...actions.map((action) => {
      const row = document.createElement("article");
      row.className = "action-row";

      const content = document.createElement("div");
      const title = document.createElement("p");
      title.className = "action-title";
      title.textContent = action.title;

      const copy = document.createElement("p");
      copy.className = "action-copy";
      copy.textContent = action.description;

      const meta = document.createElement("div");
      meta.className = "action-meta";
      const tags = [action.mode, `risk: ${action.risk}`];
      if (action.requiredSwitches?.length) {
        tags.push(`requires: ${action.requiredSwitches.join(", ")}`);
      }

      for (const value of tags) {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = value;
        meta.append(tag);
      }

      content.append(title, copy, meta);

      const button = document.createElement("button");
      button.className = "run-button";
      button.type = "button";
      button.textContent = "Dry run";
      button.addEventListener("click", () => runDryRun(action.id));

      row.append(content, button);
      return row;
    })
  );
}

function renderSwitches(items) {
  switchList.replaceChildren(
    ...items.map((item) => {
      const row = document.createElement("article");
      row.className = `switch-row ${item.enabled ? "switch-on" : "switch-off"}`;

      const content = document.createElement("div");
      const title = document.createElement("p");
      title.className = "signal-title";
      title.textContent = item.title;

      const copy = document.createElement("p");
      copy.className = "signal-detail";
      copy.textContent = item.description;

      const env = document.createElement("p");
      env.className = "switch-env";
      env.textContent = item.env;

      content.append(title, copy, env);
      row.append(content, makeStatusBadge(item.enabled ? "on" : "off", item.enabled));
      return row;
    })
  );
}

function renderApprovalQueue(queue) {
  const items = queue.items || [];
  const totals = queue.totals || {};
  approvalStatus.textContent = `${items.length} items - ${totals.pending || 0} pending`;

  approvalList.replaceChildren(
    ...items.map((item) => {
      const row = document.createElement("article");
      row.className = `approval-row approval-${item.status}`;

      const content = document.createElement("div");
      const title = document.createElement("p");
      title.className = "signal-title";
      title.textContent = item.action;

      const detail = document.createElement("p");
      detail.className = "signal-detail";
      detail.textContent = item.reason;

      const meta = document.createElement("div");
      meta.className = "action-meta";
      meta.append(
        makeTag(item.source),
        makeTag(`risk: ${item.riskLevel}`),
        makeTag(item.actionId)
      );

      content.append(title, detail, meta);
      row.append(content, makeStatusBadge(item.status, item.status === "approved"));
      return row;
    })
  );
}

async function loadApprovalQueue() {
  try {
    const queue = await fetchJson("/api/approval-queue");
    renderApprovalQueue(queue);
    return queue;
  } catch {
    renderApprovalQueue(fallbackApprovalQueue);
    return fallbackApprovalQueue;
  }
}

function renderAuditEvents(audit) {
  const items = audit.items || [];
  auditStatus.textContent = `${items.length} events`;

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "gate-copy";
    empty.textContent = "No local API audit events recorded yet.";
    auditList.replaceChildren(empty);
    return;
  }

  auditList.replaceChildren(
    ...items.slice(0, 8).map((item) => {
      const row = document.createElement("article");
      row.className = `audit-row audit-${item.result}`;

      const content = document.createElement("div");
      const title = document.createElement("p");
      title.className = "signal-title";
      title.textContent = `${item.result} - ${item.target}`;

      const detail = document.createElement("p");
      detail.className = "signal-detail";
      detail.textContent = `${item.source} / ${item.action}`;

      const meta = document.createElement("div");
      meta.className = "action-meta";
      meta.append(
        makeTag(`risk: ${item.risk_level}`),
        makeTag(`approval: ${item.approval_status}`),
        makeTag(`switch: ${item.kill_switch_status}`),
        makeTag(item.external_writes ? "external writes" : "no external writes")
      );

      content.append(title, detail, meta);
      row.append(content, makeStatusBadge(item.external_writes ? "write" : "local", !item.external_writes));
      return row;
    })
  );
}

async function loadAuditEvents() {
  try {
    const audit = await fetchJson("/api/audit-events");
    renderAuditEvents(audit);
    return audit;
  } catch {
    renderAuditEvents(fallbackAuditTrail);
    return fallbackAuditTrail;
  }
}

function makeTag(value) {
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = value;
  return tag;
}

function setStateText(node, isOk, okText, offText) {
  node.textContent = isOk ? okText : offText;
  node.classList.remove("status-safe", "status-warn", "status-lock");
  node.classList.add(isOk ? "status-safe" : "status-warn");
}

function renderHermes(hermes) {
  const data = hermes || fallbackHermes;
  const dashboardUrl = data.dashboard?.url || fallbackHermes.dashboard.url;
  const ready = data.kanban?.ready ?? data.kanban?.stats?.ready ?? 0;
  const running = data.kanban?.stats?.running ?? 0;
  const blocked = data.kanban?.stats?.blocked ?? 0;
  const done = data.kanban?.stats?.done ?? 0;

  hermesOpenLink.href = dashboardUrl;

  setStateText(
    hermesDashboardState,
    Boolean(data.dashboard?.online),
    "Online",
    "Offline"
  );
  hermesDashboardMeta.textContent = dashboardUrl;

  setStateText(
    hermesGatewayState,
    Boolean(data.gateway?.running),
    "Running",
    "Stopped"
  );
  hermesGatewayMeta.textContent = data.gateway?.running
    ? data.gateway?.safeDispatch
      ? "Safe mode - kanban dispatch paused"
      : "Dispatcher may pick ready tasks"
    : "Gateway stopped - no dispatch active";

  setStateText(
    hermesKanbanState,
    data.kanban?.ok !== false,
    `${ready} ready`,
    "Unavailable"
  );
  hermesKanbanMeta.textContent = `Board: ${data.kanban?.board || "sirinx-os"} - ${running} running / ${blocked} blocked / ${done} done`;
}

function statusTone(status = "") {
  if (status.includes("done") || status.includes("ready") || status.includes("online") || status.includes("live")) {
    return "safe";
  }
  if (status.includes("blocked")) {
    return "danger";
  }
  return "warn";
}

function renderVibeSummary(vibe) {
  const summary = vibe.summary || fallbackVibe.summary;

  vibeStatus.textContent = vibe.externalWrites ? "External writes armed" : "Dry-run command";
  vibeStatus.classList.remove("status-safe", "status-warn", "status-lock");
  vibeStatus.classList.add(vibe.externalWrites ? "status-warn" : "status-safe");

  vibeSummary.replaceChildren(
    makeSummaryCard("Functions", `${summary.functions}`, "Command Center surfaces"),
    makeSummaryCard("Ready", `${summary.ready}`, "Runnable locally"),
    makeSummaryCard("Dry Run", `${summary.dryRun}`, "No external writes"),
    makeSummaryCard("Blocked", `${summary.blocked}`, "Needs approval/fix"),
    makeSummaryCard("Phases", `${summary.phases}`, "Strict sequence"),
    makeSummaryCard("Ronin", `${summary.readyProfiles || 0}/${summary.activeProfiles || 0}`, `${summary.rosterRoles || 0} role roster`)
  );
}

function renderVibeProcess(vibe) {
  const lane = vibe.processLane || fallbackVibe.processLane;

  vibeProcessLane.replaceChildren(
    ...lane.map((phase, index) => {
      const row = document.createElement("article");
      row.className = `process-card process-${statusTone(phase.status)}`;

      const indexNode = document.createElement("span");
      indexNode.className = "process-index";
      indexNode.textContent = `${index + 1}`;

      const content = document.createElement("div");
      const label = document.createElement("p");
      label.className = "metric-label";
      label.textContent = phase.label;

      const title = document.createElement("p");
      title.className = "signal-title";
      title.textContent = phase.title;

      const output = document.createElement("p");
      output.className = "signal-detail";
      output.textContent = phase.output;

      const meta = document.createElement("div");
      meta.className = "action-meta";
      meta.append(makeToneBadge(phase.status, statusTone(phase.status)), makeTag(phase.nextCommand));

      content.append(label, title, output, meta);
      row.append(indexNode, content);
      return row;
    })
  );
}

function renderVibeFunctions(vibe) {
  const functions = vibe.functions || fallbackVibe.functions;

  if (!functions.length) {
    const empty = document.createElement("p");
    empty.className = "gate-copy";
    empty.textContent = "Function matrix is unavailable until the local control API is online.";
    vibeFunctionGrid.replaceChildren(empty);
    return;
  }

  vibeFunctionGrid.replaceChildren(
    ...functions.map((item) => {
      const card = document.createElement("article");
      card.className = `function-card function-${statusTone(item.status)}`;

      const head = document.createElement("div");
      head.className = "function-head";

      const title = document.createElement("p");
      title.className = "signal-title";
      title.textContent = item.title;

      head.append(title, makeToneBadge(item.status, statusTone(item.status)));

      const surface = document.createElement("p");
      surface.className = "signal-detail";
      surface.textContent = `${item.surface} - ${item.owner}`;

      const command = document.createElement("p");
      command.className = "tool-path";
      command.textContent = item.command;

      const evidence = document.createElement("div");
      evidence.className = "action-meta";
      evidence.append(makeTag(item.mode), makeTag(item.approvalGate));
      for (const value of item.evidence || []) {
        evidence.append(makeTag(value));
      }

      const button = document.createElement("button");
      button.className = "run-button";
      button.type = "button";
      button.textContent = "Dry run";
      button.addEventListener("click", () => runDryRun(item.actionId));

      card.append(head, surface, command, evidence, button);
      return card;
    })
  );
}

function renderVibeAgentTeam(vibe) {
  const team = vibe.agentTeam || fallbackVibe.agentTeam;
  const activeProfiles = team.activeProfiles || [];
  const connectorPolicy = team.connectorPolicy || [];
  const backlogGates = team.backlogGates || [];

  const profilePanel = document.createElement("article");
  profilePanel.className = "agent-team-card agent-team-wide";

  const profileTitle = document.createElement("p");
  profileTitle.className = "signal-title";
  profileTitle.textContent = `${team.title || "SIRINX 47 Ronin Agent Team"} (${team.summary?.readyProfiles || 0}/${team.summary?.activeProfiles || 0} ready)`;

  const profileDetail = document.createElement("p");
  profileDetail.className = "signal-detail";
  profileDetail.textContent = `${team.mode || "local"} - ${team.summary?.rosterRoles || 0} roles tracked, ${team.summary?.aliases || 0} aliases ready.`;

  const profileGrid = document.createElement("div");
  profileGrid.className = "agent-profile-grid";
  for (const profile of activeProfiles) {
    const card = document.createElement("div");
    card.className = `role-chip role-chip-${statusTone(profile.status || "")}`;

    const head = document.createElement("strong");
    head.textContent = profile.name;

    const detail = document.createElement("span");
    detail.textContent = `${profile.title} / ${profile.lane}`;

    const command = document.createElement("span");
    command.textContent = profile.command;

    card.append(head, detail, command);
    profileGrid.append(card);
  }
  profilePanel.append(profileTitle, profileDetail, profileGrid);

  const connectorPanel = document.createElement("article");
  connectorPanel.className = "agent-team-card";

  const connectorTitle = document.createElement("p");
  connectorTitle.className = "signal-title";
  connectorTitle.textContent = "Connector Policy";

  const connectorList = document.createElement("div");
  connectorList.className = "signal-list";
  for (const policy of connectorPolicy) {
    const row = document.createElement("article");
    row.className = `signal-row ${policy.mode.includes("blocked") ? "signal-warn" : "signal-ok"}`;

    const content = document.createElement("div");
    const name = document.createElement("p");
    name.className = "signal-title";
    name.textContent = policy.connector;
    const rule = document.createElement("p");
    rule.className = "signal-detail";
    rule.textContent = policy.rule;
    content.append(name, rule);
    row.append(content, makeToneBadge(policy.mode, policy.mode.includes("blocked") ? "warn" : "safe"));
    connectorList.append(row);
  }
  connectorPanel.append(connectorTitle, connectorList);

  const backlogPanel = document.createElement("article");
  backlogPanel.className = "agent-team-card";

  const backlogTitle = document.createElement("p");
  backlogTitle.className = "signal-title";
  backlogTitle.textContent = "Old Gates Mapped";

  const backlogList = document.createElement("div");
  backlogList.className = "signal-list";
  for (const gate of backlogGates) {
    const row = document.createElement("article");
    row.className = `signal-row ${statusTone(gate.status) === "safe" ? "signal-ok" : "signal-warn"}`;

    const content = document.createElement("div");
    const name = document.createElement("p");
    name.className = "signal-title";
    name.textContent = gate.title;
    const action = document.createElement("p");
    action.className = "signal-detail";
    action.textContent = gate.nextAction;
    const meta = document.createElement("div");
    meta.className = "action-meta";
    meta.append(makeTag(`owner: ${gate.owner}`));
    content.append(name, action, meta);
    row.append(content, makeToneBadge(gate.status, statusTone(gate.status)));
    backlogList.append(row);
  }
  backlogPanel.append(backlogTitle, backlogList);

  vibeAgentTeam.replaceChildren(profilePanel, connectorPanel, backlogPanel);
}

function renderVibe(vibe) {
  const data = vibe || fallbackVibe;
  vibeRule.textContent = data.operatingRule || fallbackVibe.operatingRule;
  renderVibeSummary(data);
  renderVibeProcess(data);
  renderVibeFunctions(data);
  renderVibeAgentTeam(data);
}

function renderSignalList(container, rows) {
  container.replaceChildren(
    ...rows.map((row) => {
      const item = document.createElement("article");
      item.className = `signal-row ${row.ok ? "signal-ok" : "signal-warn"}`;

      const content = document.createElement("div");
      const title = document.createElement("p");
      title.className = "signal-title";
      title.textContent = row.title;

      const detail = document.createElement("p");
      detail.className = "signal-detail";
      detail.textContent = row.detail;

      content.append(title, detail);
      item.append(content, makeStatusBadge(row.badge, row.ok));
      return item;
    })
  );
}

function renderLeadHealth(health) {
  const data = health || fallbackLeadHealth;
  const localOk = Boolean(data.local?.ok);
  const handlerObserved = Boolean(data.production?.leadHandlerObserved);
  const routed = Boolean(data.production?.routedToMainRouter);
  const reachable = Boolean(data.production?.reachable);

  leadHealthStatus.textContent = localOk
    ? handlerObserved
      ? "Local ready / handler observed"
      : routed
        ? "Local ready / router proxying"
        : "Local ready / staged"
    : "Lead blocked";
  leadHealthStatus.classList.remove("status-safe", "status-warn", "status-lock");
  leadHealthStatus.classList.add(localOk ? "status-safe" : "status-warn");

  leadHealthSummary.replaceChildren(
    makeSummaryCard("Local Handler", localOk ? "Ready" : "Blocked", data.status || "unknown"),
    makeSummaryCard("Schema", data.schema?.fieldCount ? `${data.schema.fieldCount} fields` : "N/A", data.schema?.version || "schema unavailable"),
    makeSummaryCard("Lead Lane", data.qualificationModel?.workflowLane || "N/A", data.qualificationModel?.priority || "priority unavailable"),
    makeSummaryCard("Traffic", data.qualificationModel?.trafficStatus || "N/A", data.qualificationModel?.solarSegment || "segment unavailable"),
    makeSummaryCard("Risk Flags", `${data.qualificationModel?.riskFlags?.length || 0}`, "local scoring only"),
    makeSummaryCard("Batch Parser", data.local?.parser?.batchPayloadSupported ? "Pass" : "Check", "tRPC batch body"),
    makeSummaryCard("Mock D1", data.local?.mockD1?.inserted ? "Pass" : "Check", `${data.local?.mockD1?.statements || 0} statements`),
    makeSummaryCard("Prod GET", data.production?.status ? `${data.production.status}` : "N/A", reachable ? "safe no-write probe" : "unreachable"),
    makeSummaryCard("Prod POST", data.productionPostProbeRun ? "Run" : "Not run", "no production lead writes")
  );

  renderSignalList(leadHealthLocal, [
    {
      title: "tRPC batch parser",
      detail: data.local?.parser?.batchPayloadSupported
        ? "Numeric-keyed and array batch payloads are supported."
        : "Batch payload support unavailable.",
      ok: Boolean(data.local?.parser?.batchPayloadSupported),
      badge: data.local?.parser?.batchPayloadSupported ? "pass" : "check"
    },
    {
      title: "Lead intake schema",
      detail: data.schema?.fieldCount
        ? `${data.schema.fieldCount} accepted fields, ${data.schema.piiFieldCount || 0} PII fields, contact via ${(data.schema.contactChannelFields || []).join(", ")}.`
        : "Lead schema unavailable.",
      ok: Boolean(data.schema?.fieldCount),
      badge: data.schema?.fieldCount ? "schema" : "check"
    },
    {
      title: "Required lead fields",
      detail: data.local?.parser?.hasName && data.local?.parser?.hasContactChannel
        ? "Name plus at least one contact channel are present."
        : "Name/contact validation did not pass.",
      ok: Boolean(data.local?.parser?.hasName && data.local?.parser?.hasContactChannel),
      badge: data.local?.parser?.hasName && data.local?.parser?.hasContactChannel ? "pass" : "check"
    },
    {
      title: "Qualification model",
      detail: data.qualificationModel?.workflowLane
        ? `${data.qualificationModel.workflowLane}; ${data.qualificationModel.packageLane}; ${data.qualificationModel.trafficStatus || "traffic unknown"}; next: ${data.qualificationModel.nextAction}`
        : "Qualification model unavailable.",
      ok: data.qualificationModel?.externalWrites === false && Boolean(data.qualificationModel?.workflowLane),
      badge: data.qualificationModel?.priority || "check"
    },
    {
      title: "Lead quality reasons",
      detail: data.qualificationModel?.reasons?.length
        ? data.qualificationModel.reasons.slice(0, 3).join(" | ")
        : "No scoring reasons available.",
      ok: data.qualificationModel?.externalWrites === false && Array.isArray(data.qualificationModel?.reasons),
      badge: data.qualificationModel?.trafficStatus || "check"
    },
    {
      title: "Attribution and risk",
      detail: `UTM source: ${data.qualificationModel?.attribution?.utmSource || "none"}; campaign: ${data.qualificationModel?.attribution?.utmCampaign || "none"}; risk: ${(data.qualificationModel?.riskFlags || []).join(", ") || "none"}.`,
      ok: data.qualificationModel?.externalWrites === false,
      badge: data.qualificationModel?.riskFlags?.length ? "review" : "clear"
    },
    {
      title: "Mock D1 insert",
      detail: data.local?.mockD1?.inserted ? "Local self-test inserted into mock D1 only." : "No mock insert recorded.",
      ok: Boolean(data.local?.mockD1?.inserted),
      badge: data.local?.mockD1?.inserted ? "mock" : "check"
    }
  ]);

  renderSignalList(leadHealthProduction, [
    {
      title: "Safe production probe",
      detail: data.production?.status ? `GET probe returned HTTP ${data.production.status}.` : data.production?.error || "No production status.",
      ok: reachable,
      badge: reachable ? "reachable" : "check"
    },
    {
      title: "Main router header",
      detail: data.production?.edgeRouter ? `x-sirinx-router=${data.production.edgeRouter}` : "Main router header not observed.",
      ok: routed,
      badge: routed ? "routed" : "staged"
    },
    {
      title: "Lead handler route",
      detail: handlerObserved ? "Safe GET matched the deployed lead handler shape." : "Safe GET did not match the lead handler yet; deploy is still pending.",
      ok: handlerObserved,
      badge: handlerObserved ? "active" : "pending"
    },
    {
      title: "Production POST",
      detail: "Not run from Command Center to avoid creating production leads before approval.",
      ok: !data.productionPostProbeRun,
      badge: "no-write"
    }
  ]);

  leadHealthNextActions.replaceChildren(
    ...(data.nextActions || []).map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    })
  );
}

function renderLeadAudit(audit) {
  const data = audit || fallbackLeadAudit;
  const event = data.leadEvent || fallbackLeadAudit.leadEvent;
  const contactEvidence = event.contactEvidence || fallbackLeadAudit.leadEvent.contactEvidence;
  const routing = event.routing || fallbackLeadAudit.leadEvent.routing;

  renderSignalList(leadAuditEvent, [
    {
      title: "Audit model",
      detail: `${data.status || "unknown"}; externalWrites=${data.externalWrites}; productionPostProbeRun=${data.productionPostProbeRun}.`,
      ok: data.externalWrites === false && data.productionPostProbeRun === false,
      badge: data.externalWrites === false ? "local" : "check"
    },
    {
      title: "Lead lane",
      detail: `${event.workflowLane || "unknown"}; ${event.packageLane || "package unavailable"}; score ${event.score ?? 0}; priority ${event.priority || "unknown"}.`,
      ok: Boolean(event.workflowLane) && data.externalWrites === false,
      badge: event.priority || "check"
    },
    {
      title: "Contact evidence",
      detail: `${contactEvidence.contactChannelCount || 0} channel(s); raw values stored: ${contactEvidence.rawContactValuesStored}.`,
      ok: contactEvidence.rawContactValuesStored === false,
      badge: contactEvidence.contactChannelCount ? "present" : "missing"
    },
    {
      title: "Agent routing",
      detail: `${routing.primaryProfile || "sales"} owns it; support: ${(routing.supportProfiles || []).join(", ") || "none"}; lane: ${routing.commandCenterLane || "leads"}.`,
      ok: Boolean(routing.primaryProfile),
      badge: routing.backlogStatus || "route"
    },
    {
      title: "Risk flags",
      detail: (event.riskFlags || []).length ? event.riskFlags.join(", ") : "none",
      ok: data.externalWrites === false,
      badge: (event.riskFlags || []).length ? "review" : "clear"
    }
  ]);

  renderSignalList(
    leadAuditBlocks,
    (data.blockedExternalActions || []).map((action) => ({
      title: action.id || "blocked-action",
      detail: `${action.target || "external target"}: ${action.reason || "approval required"}`,
      ok: action.externalWrites === false && action.requiresHumanApproval === true,
      badge: action.status || "blocked"
    }))
  );

  renderSignalList(
    leadAuditEvidence,
    (data.evidenceChecklist || []).map((item) => ({
      title: item.label || item.id,
      detail: `${item.status || "unknown"} before ${item.requiredBefore || "next stage"}.`,
      ok: ["present-local", "estimated-from-intake"].includes(item.status) || item.externalWrites === false,
      badge: item.status || "check"
    }))
  );
}

function renderSalesArtifacts(status) {
  const data = status || fallbackSalesArtifacts;
  const ready = data.status === "ready-local";
  const proposalReady = data.proposalDraftReadiness === "ready-local-draft";

  salesArtifactsStatus.textContent = ready ? "Artifacts ready" : "Artifacts review";
  salesArtifactsStatus.classList.remove("status-safe", "status-warn", "status-lock");
  salesArtifactsStatus.classList.add(ready ? "status-safe" : "status-warn");

  salesArtifactsSummary.replaceChildren(
    makeSummaryCard("Artifacts", `${data.summary?.ready || 0}/${data.summary?.artifacts || 0}`, data.mode || "local"),
    makeSummaryCard("Proposal Draft", proposalReady ? "Ready" : "Blocked", data.proposalDraftReadiness || "unknown"),
    makeSummaryCard("Missing", `${data.summary?.missing || 0}`, "local notes"),
    makeSummaryCard("Incomplete", `${data.summary?.incomplete || 0}`, "required text")
  );

  const items = data.items || [];
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "gate-copy";
    empty.textContent = "Sales artifacts are unavailable until the local control API is online.";
    salesArtifactsList.replaceChildren(empty);
  } else {
    renderSignalList(
      salesArtifactsList,
      items.map((item) => ({
        title: item.title,
        detail: item.ready
          ? `${item.type} / ${item.lane} / ${item.fileName}`
          : `${item.exists ? "Incomplete" : "Missing"} / ${item.path}`,
        ok: Boolean(item.ready),
        badge: item.ready ? "ready" : "review"
      }))
    );
  }

  salesArtifactsNextActions.replaceChildren(
    ...(data.nextActions || []).map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    })
  );
}

function renderRoiPreview(preview) {
  const data = preview || fallbackRoiPreview;
  const ready = data.status === "ready-local-roi-preview";
  const result = data.result || fallbackRoiPreview.result;
  const recommendedPackage = result.recommendedPackage || fallbackRoiPreview.result.recommendedPackage;
  const assumptions = data.assumptions || fallbackRoiPreview.assumptions;

  roiPreviewStatus.textContent = ready ? "ROI ready" : "ROI blocked";
  roiPreviewStatus.classList.remove("status-safe", "status-warn", "status-lock");
  roiPreviewStatus.classList.add(ready ? "status-safe" : "status-warn");

  roiPreviewSummary.replaceChildren(
    makeSummaryCard("Package", recommendedPackage.id || "unknown", `${recommendedPackage.kw || 0} kW / ${recommendedPackage.batteryKwh || 0} kWh`),
    makeSummaryCard("Monthly Use", `${result.estimatedMonthlyKwh || 0} kWh`, `${assumptions.monthly_bill_thb || 0} THB bill`),
    makeSummaryCard("PV Output", `${result.estimatedMonthlyPvKwh || 0} kWh`, "planning estimate"),
    makeSummaryCard("External Writes", data.externalWrites ? "Armed" : "Off", data.customerVisible ? "customer visible" : "local only")
  );

  roiMonthlyBill.value = assumptions.monthly_bill_thb || 0;
  roiDaytimeRatio.value = assumptions.daytime_load_ratio ?? 0.5;
  roiBackupPriority.value = assumptions.backup_priority || "medium";
  roiPhaseType.value = assumptions.phase_type || "unknown";
  roiCalculateButton.disabled = !ready;

  const cases = result.cases || [];
  if (!cases.length) {
    const empty = document.createElement("p");
    empty.className = "gate-copy";
    empty.textContent = "ROI cases are unavailable until the local control API is online.";
    roiCaseList.replaceChildren(empty);
  } else {
    renderSignalList(
      roiCaseList,
      cases.map((item) => ({
        title: `${item.name} case`,
        detail: `${item.estimatedMonthlySavingsThb} THB/month, ${item.capturedKwh} kWh captured, payback ${item.estimatedPaybackYears ?? "n/a"} years, self-consumption ${item.selfConsumption}`,
        ok: item.name === "realistic",
        badge: item.name
      }))
    );
  }

  roiReviewGates.replaceChildren(
    ...(data.reviewGates || data.nextActions || []).map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    })
  );
}

function renderProposalDraft(preview) {
  const data = preview || fallbackProposalDraft;
  const ready = data.status === "ready-local-preview";

  proposalDraftStatus.textContent = ready ? "Draft ready" : "Draft blocked";
  proposalDraftStatus.classList.remove("status-safe", "status-warn", "status-lock");
  proposalDraftStatus.classList.add(ready ? "status-safe" : "status-warn");

  proposalDraftSummary.replaceChildren(
    makeSummaryCard("Mode", ready ? "Preview" : "Blocked", data.mode || "local"),
    makeSummaryCard("Sections", `${data.draft?.sectionCount || 0}`, data.draft?.title || "draft"),
    makeSummaryCard("Artifacts", `${data.readiness?.artifactReadyCount || 0}/${data.readiness?.artifactTotal || 0}`, data.readiness?.salesArtifacts || "unknown"),
    makeSummaryCard("External Writes", data.externalWrites ? "Armed" : "Off", data.customerVisible ? "customer visible" : "local only")
  );

  proposalDraftPreview.textContent = data.draft?.markdown || fallbackProposalDraft.draft.markdown;
  proposalDraftNextActions.replaceChildren(
    ...(data.nextActions || []).map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    })
  );

  proposalDraftWriteButton.disabled = !ready;
  proposalDraftWriteButton.title = ready
    ? `Write a local Obsidian draft under ${data.safeWriteTargetRoot || fallbackProposalDraft.safeWriteTargetRoot}`
    : "Local draft writer is blocked until proposal preview is ready.";
  proposalDraftWriteResult.textContent = ready
    ? `Target: ${data.safeWriteTargetRoot || fallbackProposalDraft.safeWriteTargetRoot}`
    : "Local Obsidian writer waits for draft readiness.";
}

function renderProposalReview(review) {
  const data = review || fallbackProposalReview;
  const blocked = data.status === "blocked-external-send";
  const summary = data.summary || fallbackProposalReview.summary;

  proposalReviewStatus.textContent = blocked ? "Send blocked" : "Review ready";
  proposalReviewStatus.classList.remove("status-safe", "status-warn", "status-lock");
  proposalReviewStatus.classList.add(blocked ? "status-warn" : "status-safe");

  proposalReviewSummary.replaceChildren(
    makeSummaryCard("Local Workflow", data.localWorkflowReady ? "Ready" : "Check", data.mode || "local"),
    makeSummaryCard("Complete", `${summary.complete || 0}/${summary.items || 0}`, "review items"),
    makeSummaryCard("Blocking", `${summary.blockingExternalSend || 0}`, "external send blockers"),
    makeSummaryCard("External Sends", data.canSendExternally ? "Allowed" : "Blocked", data.customerVisible ? "customer visible" : "local only")
  );

  renderSignalList(
    proposalReviewList,
    (data.items || fallbackProposalReview.items).map((item) => ({
      title: item.title,
      detail: item.detail,
      ok: Boolean(item.complete),
      badge: item.state
    }))
  );

  proposalReviewNextActions.replaceChildren(
    ...(data.nextActions || fallbackProposalReview.nextActions).map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    })
  );

  proposalReviewWriteButton.disabled = data.mode === "local-fallback";
  proposalReviewWriteButton.title = data.mode === "local-fallback"
    ? "Local review packet writer is blocked until proposal review is available."
    : `Write a local review packet under ${data.reviewPacketTargetRoot || fallbackProposalReview.reviewPacketTargetRoot}`;
  proposalReviewWriteResult.textContent = data.mode === "local-fallback"
    ? "Local review packet writer waits for API readiness."
    : `Target: ${data.reviewPacketTargetRoot || fallbackProposalReview.reviewPacketTargetRoot}`;
}

function renderMobileReviewPacket(packet) {
  const data = packet || fallbackMobileReviewPacket;
  const ready = data.status === "ready-local-mobile-review";
  const summary = data.summary || fallbackMobileReviewPacket.summary;

  mobileReviewStatus.textContent = ready ? "Mobile packet ready" : "Mobile packet blocked";
  mobileReviewStatus.classList.remove("status-safe", "status-warn", "status-lock");
  mobileReviewStatus.classList.add(ready ? "status-safe" : "status-warn");

  mobileReviewSummary.replaceChildren(
    makeSummaryCard("Approvals", `${summary.pendingApprovals || 0} pending`, `${summary.approvalItems || 0} total`),
    makeSummaryCard("Proposal Gate", `${summary.proposalBlockingItems || 0} blockers`, data.proposalReview?.status || "unknown"),
    makeSummaryCard("Audit Events", `${summary.auditEvents || 0}`, "local trail"),
    makeSummaryCard("External Approval", data.mobileCanApproveExternally ? "Allowed" : "Not From Packet", data.externalWrites ? "writes armed" : "local only")
  );

  renderSignalList(
    mobileReviewCommandList,
    (data.reviewCommands || fallbackMobileReviewPacket.reviewCommands).map((command) => ({
      title: command,
      detail: data.mobileCanApproveExternally ? "External approval allowed" : "Review evidence only; no external action is armed.",
      ok: !data.mobileCanApproveExternally,
      badge: data.mobileCanApproveExternally ? "approval" : "local"
    }))
  );

  mobileReviewNextActions.replaceChildren(
    ...(data.nextActions || fallbackMobileReviewPacket.nextActions).map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    })
  );

  mobileReviewWriteButton.disabled = !ready;
  mobileReviewWriteButton.title = ready
    ? `Write a local Codex Mobile packet under ${data.reviewPacketTargetRoot || fallbackMobileReviewPacket.reviewPacketTargetRoot}`
    : "Local mobile packet writer is blocked until packet data is available.";
  mobileReviewWriteResult.textContent = ready
    ? `Target: ${data.reviewPacketTargetRoot || fallbackMobileReviewPacket.reviewPacketTargetRoot}`
    : "Local mobile packet writer waits for API readiness.";
}

function renderExternalGatePackets(packetSet) {
  const data = packetSet || fallbackExternalGatePackets;
  const ready = data.status === "ready-local-packets";
  const summary = data.summary || fallbackExternalGatePackets.summary;

  externalGateStatus.textContent = ready ? "Packets ready" : "Packets blocked";
  externalGateStatus.classList.remove("status-safe", "status-warn", "status-lock");
  externalGateStatus.classList.add(ready ? "status-safe" : "status-warn");

  externalGateSummary.replaceChildren(
    makeSummaryCard("Packets", `${summary.packets || 0}`, `${summary.highRisk || 0} high risk`),
    makeSummaryCard("Executable Now", `${summary.canExecuteNow || 0}`, "requires exact phrase"),
    makeSummaryCard("External Writes", data.externalWrites ? "Armed" : "Off", data.canExecuteNow ? "actionable" : "packet only"),
    makeSummaryCard("Mode", ready ? "Local" : "Fallback", data.mode || "local")
  );

  renderSignalList(
    externalGateList,
    (data.packets || fallbackExternalGatePackets.packets).map((packet) => ({
      title: `${packet.gate}: ${packet.title}`,
      detail: `${packet.approvalPhrase} Target: ${packet.target || "unavailable"}`,
      ok: packet.canExecuteNow === false && packet.externalWrites === false,
      badge: packet.risk || "packet"
    }))
  );

  externalGateNextActions.replaceChildren(
    ...(data.nextActions || fallbackExternalGatePackets.nextActions).map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    })
  );

  externalGateWriteButton.disabled = !ready;
  externalGateWriteButton.title = ready
    ? `Write local external gate packets under ${data.packetTargetRoot || fallbackExternalGatePackets.packetTargetRoot}`
    : "Local gate packet writer is blocked until packet data is available.";
  externalGateWriteResult.textContent = ready
    ? `Target: ${data.packetTargetRoot || fallbackExternalGatePackets.packetTargetRoot}`
    : "Local gate packet writer waits for API readiness.";
}

function renderExternalGatePreflight(preflight) {
  const data = preflight || fallbackExternalGatePreflight;
  const ready = data.status === "ready-local-preflight";
  const summary = data.summary || fallbackExternalGatePreflight.summary;

  externalGatePreflightStatus.textContent = ready ? "Preflight ready" : "Preflight blocked";
  externalGatePreflightStatus.classList.remove("status-safe", "status-warn", "status-lock");
  externalGatePreflightStatus.classList.add(ready ? "status-safe" : "status-warn");

  externalGatePreflightSummary.replaceChildren(
    makeSummaryCard("Entries", `${summary.entries || 0}`, `${summary.reviewed || 0} reviewed`),
    makeSummaryCard("Manual", `${summary.manualHumanGates || 0}`, "human approval gates"),
    makeSummaryCard("Official Review", `${summary.optionalOfficialReview || 0}`, "Cloudflare policy check"),
    makeSummaryCard("Blocked", `${summary.blocked || 0}`, `${summary.manualHumanGates || 0} manual gates`),
    makeSummaryCard("Executable Now", `${summary.canExecuteNow || 0}`, "always zero in preflight"),
    makeSummaryCard("External Writes", data.externalWrites ? "Armed" : "Off", data.canExecuteNow ? "actionable" : "audit only")
  );

  renderSignalList(
    externalGatePreflightList,
    (data.entries || fallbackExternalGatePreflight.entries).map((entry) => ({
      title: `${entry.gate}: ${entry.title}`,
      detail: `${entry.status}; owner ${entry.owner}; ${entry.blockingReason || entry.nextLocalAction || "ready for exact targeted approval"}`,
      ok: entry.reviewState === "reviewed" && entry.externalWrites === false && entry.canExecuteNow === false,
      badge: entry.status
    }))
  );

  externalGatePreflightNextActions.replaceChildren(
    ...(data.nextActions || fallbackExternalGatePreflight.nextActions).map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    })
  );

  externalGatePreflightWriteButton.disabled = !ready;
  externalGatePreflightWriteButton.title = ready
    ? `Write local external gate preflight under ${data.preflightTargetRoot || fallbackExternalGatePreflight.preflightTargetRoot}`
    : "Local gate preflight writer is blocked until preflight data is available.";
  externalGatePreflightWriteResult.textContent = ready
    ? `Target: ${data.preflightTargetRoot || fallbackExternalGatePreflight.preflightTargetRoot}`
    : "Local preflight writer waits for API readiness.";
}

function renderHermesInbox(result) {
  const data = result || fallbackHermesInbox;
  const policy = data.policy || fallbackHermesInbox.policy;
  const allowed = data.status === "allowed";
  const blocked = data.status === "blocked" || data.status === "auth_required" || data.status === "execution_disabled";
  const tone = allowed ? "status-safe" : blocked ? "status-lock" : "status-warn";

  hermesInboxStatus.textContent = allowed
    ? "Allowed local"
    : blocked
      ? "Blocked"
      : data.status === "approval_required"
        ? "Approval required"
        : "Ready";
  hermesInboxStatus.classList.remove("status-safe", "status-warn", "status-lock");
  hermesInboxStatus.classList.add(tone);

  hermesInboxSummary.replaceChildren(
    makeSummaryCard("Decision", data.status || "not-run", "policy-core result"),
    makeSummaryCard("External Writes", data.externalWrites ? "Armed" : "False", "dry-run only"),
    makeSummaryCard("Approval", data.requiresHumanApproval ? "Required" : "Not required", "target gate"),
    makeSummaryCard("Target", policy.target || "local-doc", "normalized action")
  );

  renderSignalList(hermesInboxList, [
    {
      ok: allowed,
      title: "Policy decision",
      detail: `${policy.decision || data.status || "not-run"} for ${policy.target || "local target"}`,
      badge: policy.decision || data.status || "not-run"
    },
    {
      ok: !data.externalWrites,
      title: "External write guard",
      detail: data.externalWrites ? "External write path is armed." : "External writes remain false.",
      badge: data.externalWrites ? "write" : "local"
    },
    {
      ok: !(policy.hardBlocks || []).length,
      title: "Hard blocks",
      detail: (policy.hardBlocks || []).join(", ") || "No hard blocks for this local preview.",
      badge: `${(policy.hardBlocks || []).length}`
    }
  ]);

  hermesInboxRunResult.textContent =
    data.result === "not-run"
      ? "Ready to run local dry-run preview."
      : `${data.status}: ${data.result}; externalWrites=${Boolean(data.externalWrites)}`;
}

function makeSummaryCard(label, value, note) {
  const item = document.createElement("article");
  item.className = "hq-stat";

  const span = document.createElement("span");
  span.className = "metric-label";
  span.textContent = label;

  const strong = document.createElement("strong");
  strong.textContent = value;

  const small = document.createElement("span");
  small.className = "metric-note";
  small.textContent = note;

  item.append(span, strong, small);
  return item;
}

function makeStatusBadge(label, ok) {
  const badge = document.createElement("span");
  badge.className = `mini-status ${ok ? "status-safe" : "status-warn"}`;
  badge.textContent = label;
  return badge;
}

function actionTone(action) {
  if (action === "do-not-touch" || action.startsWith("blocked")) {
    return "danger";
  }
  if (action.includes("approval") || action.includes("verify")) {
    return "warn";
  }
  return "safe";
}

function makeToneBadge(label, tone = "safe") {
  const badge = document.createElement("span");
  badge.className = `tone-badge tone-${tone}`;
  badge.textContent = label;
  return badge;
}

function renderToolSummary(inventory) {
  const summary = inventory.summary || fallbackProjectInventory.summary;
  const protectedLabel = inventory.mainWebsiteProtected ? "Protected" : "Check";
  const writeLabel = inventory.externalWrites ? "Armed" : "Blocked";

  toolSummary.replaceChildren(
    makeSummaryCard("Main Website", protectedLabel, "www.sirinx.co locked"),
    makeSummaryCard("External Writes", writeLabel, "Cloud, GitHub, Telegram, LINE"),
    makeSummaryCard("Repos", `${summary.repositories}`, `${summary.dirtyRepos} dirty`),
    makeSummaryCard("Subdomains", `${summary.subdomains}`, `${summary.readySubdomains} live`),
    makeSummaryCard("Blockers", `${summary.blockers}`, `${summary.integrationGates} gates`)
  );
}

function renderToolSubdomains(inventory) {
  const items = inventory.subdomains || [];

  toolSubdomainList.replaceChildren(
    ...items.map((entry) => {
      const card = document.createElement("article");
      card.className = `subdomain-card ${entry.current?.online ? "subdomain-online" : "subdomain-pending"}`;

      const head = document.createElement("div");
      head.className = "subdomain-head";

      const host = document.createElement("p");
      host.className = "subdomain-host";
      host.textContent = entry.host;

      const statusLabel = entry.current?.status
        ? `${entry.current.status}`
        : entry.current?.error || "not live";
      head.append(host, makeToneBadge(statusLabel, entry.current?.online ? "safe" : "warn"));

      const role = document.createElement("p");
      role.className = "signal-detail";
      role.textContent = entry.role;

      const source = document.createElement("p");
      source.className = "tool-path";
      source.textContent = entry.source;

      const meta = document.createElement("div");
      meta.className = "action-meta";
      meta.append(
        makeToneBadge(entry.action, actionTone(entry.action)),
        makeTag(entry.desiredState)
      );

      card.append(head, role, source, meta);
      return card;
    })
  );
}

function renderToolRepos(inventory) {
  const items = inventory.repositories || [];

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "gate-copy";
    empty.textContent = "Repository inventory is unavailable.";
    toolRepoList.replaceChildren(empty);
    return;
  }

  toolRepoList.replaceChildren(
    ...items.map((repo) => {
      const row = document.createElement("article");
      row.className = `repo-row ${repo.git?.dirty ? "repo-dirty" : "repo-clean"}`;

      const content = document.createElement("div");
      const title = document.createElement("p");
      title.className = "signal-title";
      title.textContent = repo.name;

      const detail = document.createElement("p");
      detail.className = "signal-detail";
      detail.textContent = repo.recommendation;

      const path = document.createElement("p");
      path.className = "tool-path";
      path.textContent = repo.localPath;

      const meta = document.createElement("div");
      meta.className = "action-meta";
      meta.append(
        makeTag(repo.role),
        makeTag(repo.deployFit),
        makeTag(repo.git?.branch || "unknown"),
        makeToneBadge(repo.git?.dirty ? "dirty" : "clean", repo.git?.dirty ? "warn" : "safe")
      );

      content.append(title, detail, path, meta);
      row.append(content);
      return row;
    })
  );
}

function renderToolIntegrations(inventory) {
  const items = inventory.integrationGates || [];

  toolIntegrationList.replaceChildren(
    ...items.map((gate) => {
      const row = document.createElement("article");
      const tone = gate.status.includes("blocked") ? "danger" : gate.status.includes("ready") ? "safe" : "warn";
      row.className = `integration-row integration-${tone}`;

      const title = document.createElement("p");
      title.className = "signal-title";
      title.textContent = gate.channel;

      const reason = document.createElement("p");
      reason.className = "signal-detail";
      reason.textContent = gate.reason;

      const meta = document.createElement("div");
      meta.className = "action-meta";
      meta.append(makeToneBadge(gate.status, tone), makeTag(gate.currentSource || "local"));

      row.append(title, reason, meta);
      return row;
    })
  );
}

function renderToolBlockers(inventory) {
  const items = inventory.blockers || [];

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "gate-copy";
    empty.textContent = "No blockers recorded.";
    toolBlockerList.replaceChildren(empty);
    return;
  }

  toolBlockerList.replaceChildren(
    ...items.map((blocker) => {
      const row = document.createElement("article");
      const tone = blocker.severity === "critical" || blocker.severity === "high" ? "danger" : "warn";
      row.className = `blocker-row blocker-${tone}`;

      const title = document.createElement("p");
      title.className = "signal-title";
      title.textContent = blocker.summary;

      const action = document.createElement("p");
      action.className = "signal-detail";
      action.textContent = blocker.requiredAction;

      const meta = document.createElement("div");
      meta.className = "action-meta";
      meta.append(makeToneBadge(blocker.severity, tone), makeTag(blocker.area), makeTag(blocker.id));

      row.append(title, action, meta);
      return row;
    })
  );
}

function renderToolNextActions(inventory) {
  toolNextActions.replaceChildren(
    ...(inventory.nextActions || []).map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    })
  );
}

function renderProjectInventory(inventory) {
  const data = inventory || fallbackProjectInventory;
  const summary = data.summary || fallbackProjectInventory.summary;

  projectInventoryStatus.textContent = `${summary.repositories} repos / ${summary.subdomains} subdomains`;
  inventoryJsonLink.href = `${apiBase}/api/project-inventory`;
  renderToolSummary(data);
  renderToolSubdomains(data);
  renderToolRepos(data);
  renderToolIntegrations(data);
  renderToolBlockers(data);
  renderToolNextActions(data);
}

function renderGithubIntegration(inventory) {
  const data = inventory || fallbackGithubIntegration;
  const summary = data.summary || fallbackGithubIntegration.summary;

  githubIntegrationStatus.textContent = `${summary.repositories} repos / ${summary.lanes} lanes`;
  githubIntegrationSummary.replaceChildren(
    makeSummaryCard("Repos", `${summary.repositories}`, "GitHub audit clones"),
    makeSummaryCard("P0/P1", `${summary.p0 || 0}/${summary.p1 || 0}`, "primary integration"),
    makeSummaryCard("Tasks", `${summary.extractionReady || 0}/${summary.extractionTasks || 0}`, "ready extraction"),
    makeSummaryCard("Gated", `${summary.extractionGated || summary.blocked || 0}`, "needs review"),
    makeSummaryCard("External Writes", data.externalWrites ? "Armed" : "Off", data.mode || "read-only")
  );

  githubIntegrationList.replaceChildren(
    ...(data.repositories || fallbackGithubIntegration.repositories).map((repo) => {
      const row = document.createElement("article");
      row.className = "repo-card";

      const head = document.createElement("div");
      head.className = "subdomain-head";

      const title = document.createElement("p");
      title.className = "repo-path";
      title.textContent = repo.name;

      head.append(title, makeToneBadge(repo.priority || "P?", actionTone(repo.status || "")));

      const detail = document.createElement("p");
      detail.className = "signal-detail";
      detail.textContent = `${repo.lane || "lane"} | ${repo.status || "unknown"} | ${repo.integrationTarget || ""}`;

      const next = document.createElement("p");
      next.className = "metric-note";
      next.textContent = repo.nextAction || "No next action.";

      row.append(head, detail, next);
      return row;
    })
  );

  githubExtractionList.replaceChildren(
    ...(data.extractionTasks || fallbackGithubIntegration.extractionTasks).map((task) => {
      const row = document.createElement("article");
      const tone = task.status?.includes("blocked") || task.status?.includes("gated") ? "warn" : "safe";
      row.className = `repo-card integration-${tone}`;

      const head = document.createElement("div");
      head.className = "subdomain-head";

      const title = document.createElement("p");
      title.className = "repo-path";
      title.textContent = task.id;

      head.append(title, makeToneBadge(task.status || task.priority || "task", tone));

      const detail = document.createElement("p");
      detail.className = "signal-detail";
      detail.textContent = `${task.part || "part"} | ${task.repo || "repo"} | ${task.target || "target pending"}`;

      const finding = document.createElement("p");
      finding.className = "metric-note";
      finding.textContent = task.finding || task.allowedNextStep || "No finding recorded.";

      const source = document.createElement("p");
      source.className = "metric-note";
      source.textContent = `Source: ${(task.sourceFiles || []).slice(0, 3).join(", ") || "not listed"}`;

      row.append(head, detail, finding, source);
      return row;
    })
  );

  githubIntegrationNextActions.replaceChildren(
    ...(data.nextActions || fallbackGithubIntegration.nextActions).map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    })
  );
}

function renderExecutive(hq) {
  const data = hq || fallbackExecutive;
  const metrics = data.metrics || fallbackExecutive.metrics;
  const canRunNow = Boolean(data.presentation?.canRunNow);

  executiveStatus.textContent = canRunNow ? "HQ live" : "HQ partial";
  executiveStatus.classList.remove("status-safe", "status-warn", "status-lock");
  executiveStatus.classList.add(canRunNow ? "status-safe" : "status-warn");

  executiveSummary.replaceChildren(
    makeSummaryCard(
      "Run Status",
      canRunNow ? "Ready Now" : "Partial",
      data.presentation?.message || fallbackExecutive.presentation.message
    ),
    makeSummaryCard(
      "Services",
      `${metrics.servicesOnline}/${metrics.servicesTotal}`,
      "Local presentation stack"
    ),
    makeSummaryCard(
      "Agents",
      `${metrics.hermesAgents + metrics.thClawsAgents + (metrics.roninProfiles || 0)}`,
      `${metrics.roninProfiles || 0} Ronin / ${metrics.hermesAgents} Hermes / ${metrics.thClawsAgents} thClaws`
    ),
    makeSummaryCard(
      "Skills",
      `${metrics.skills}`,
      "Local Hermes workflow skills"
    ),
    makeSummaryCard(
      "Kanban",
      `${metrics.kanbanReady} ready`,
      `${metrics.kanbanRunning} running / ${metrics.kanbanBlocked} blocked`
    )
  );

  executiveServices.replaceChildren(
    ...(data.services || []).map((service) => {
      const row = document.createElement("article");
      row.className = `signal-row ${service.online ? "signal-ok" : "signal-warn"}`;

      const content = document.createElement("div");
      const title = document.createElement("p");
      title.className = "signal-title";
      title.textContent = service.name;

      const detail = document.createElement("p");
      detail.className = "signal-detail";
      detail.textContent = service.detail || "Local service";

      content.append(title, detail);
      row.append(content, makeStatusBadge(service.online ? "online" : "check", service.online));
      return row;
    })
  );

  const teamBlocks = [];
  for (const team of data.agentTeams || []) {
    const block = document.createElement("article");
    block.className = "team-block";

    const heading = document.createElement("p");
    heading.className = "signal-title";
    heading.textContent = `${team.name} (${team.agents.length})`;

    const roster = document.createElement("div");
    roster.className = "role-roster";
    for (const agent of team.agents) {
      const card = document.createElement("div");
      card.className = "role-chip";
      const name = document.createElement("strong");
      name.textContent = agent.name;
      const copy = document.createElement("span");
      copy.textContent = agent.description;
      card.append(name, copy);
      roster.append(card);
    }

    block.append(heading, roster);
    teamBlocks.push(block);
  }

  if (data.skills?.length) {
    const block = document.createElement("article");
    block.className = "team-block";

    const heading = document.createElement("p");
    heading.className = "signal-title";
    heading.textContent = `Hermes Skills (${data.skills.length})`;

    const tags = document.createElement("div");
    tags.className = "skill-strip";
    for (const skill of data.skills) {
      tags.append(makeTag(skill.name));
    }

    block.append(heading, tags);
    teamBlocks.push(block);
  }

  executiveAgents.replaceChildren(...teamBlocks);

  executiveProjects.replaceChildren(
    ...(data.projects || []).map((project) => {
      const row = document.createElement("article");
      row.className = "project-row";

      const title = document.createElement("p");
      title.className = "signal-title";
      title.textContent = project.name;

      const surface = document.createElement("p");
      surface.className = "signal-detail";
      surface.textContent = project.surface;

      const meta = document.createElement("div");
      meta.className = "action-meta";
      meta.append(makeTag(project.status), makeTag(project.run));

      row.append(title, surface, meta);
      return row;
    })
  );

  executiveKanban.replaceChildren(
    ...(data.kanbanTasks || []).slice(0, 6).map((task) => {
      const row = document.createElement("article");
      row.className = "task-row";

      const title = document.createElement("p");
      title.className = "signal-title";
      title.textContent = task.title;

      const meta = document.createElement("p");
      meta.className = "signal-detail";
      meta.textContent = `${task.id} - ${task.state} - ${task.lane}`;

      row.append(title, meta);
      return row;
    })
  );
}

function renderBrainSummary(brain) {
  const stats = [
    ["Roots", brain.rootCount || 0],
    ["Notes", brain.noteCount],
    ["Open tasks", brain.totals.openTasks],
    ["Done tasks", brain.totals.doneTasks],
    ["Links", brain.totals.links]
  ];

  brainSummary.replaceChildren(
    ...stats.map(([label, value]) => {
      const item = document.createElement("div");
      item.className = "brain-stat";

      const strong = document.createElement("strong");
      strong.textContent = value;

      const span = document.createElement("span");
      span.textContent = label;

      item.append(strong, span);
      return item;
    })
  );
}

function renderBrainRoots(brain) {
  if (!brain.roots?.length) {
    brainRootList.replaceChildren();
    return;
  }

  brainRootList.replaceChildren(
    ...brain.roots.map((root) => {
      const card = document.createElement("article");
      card.className = `brain-root ${root.ok ? "root-ok" : "root-missing"}`;

      const title = document.createElement("p");
      title.className = "brain-root-title";
      title.textContent = root.label;

      const meta = document.createElement("p");
      meta.className = "brain-root-meta";
      meta.textContent = root.ok
        ? `${root.noteCount} notes - ${root.kind}`
        : `unavailable - ${root.error}`;

      card.append(title, meta);
      return card;
    })
  );
}

function renderBrainList(brain) {
  if (!brain.notes.length) {
    const empty = document.createElement("p");
    empty.className = "gate-copy";
    empty.textContent = "Obsidian brain notes are unavailable.";
    brainNoteList.replaceChildren(empty);
    return;
  }

  brainNoteList.replaceChildren(
    ...brain.notes.map((note) => {
      const button = document.createElement("button");
      button.className = "brain-note-button";
      button.type = "button";
      button.addEventListener("click", () => loadBrainNote(note.slug));

      const title = document.createElement("span");
      title.className = "brain-note-title";
      title.textContent = note.title;

      const summary = document.createElement("span");
      summary.className = "brain-note-summary";
      summary.textContent = note.summary;

      const meta = document.createElement("span");
      meta.className = "brain-note-meta";
      meta.textContent = `${note.sourceLabel} - ${note.relativePath} - ${note.tasks.open} open / ${note.tasks.done} done`;

      button.append(title, summary, meta);
      return button;
    })
  );
}

function renderMarkdownPreview(content) {
  const fragment = document.createDocumentFragment();
  const lines = content.split("\n").slice(0, 90);

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line || line.startsWith("%%")) {
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = Math.min(Number(heading[1].length) + 3, 6);
      const node = document.createElement(`h${level}`);
      node.textContent = heading[2];
      fragment.append(node);
      continue;
    }

    const task = line.match(/^- \[([ xX])\]\s+(.+)$/);
    if (task) {
      const row = document.createElement("p");
      row.className = "preview-task";
      row.textContent = `${task[1].trim() ? "Done" : "Open"} - ${task[2]}`;
      fragment.append(row);
      continue;
    }

    if (line.startsWith("- ")) {
      const row = document.createElement("p");
      row.className = "preview-list-item";
      row.textContent = line.slice(2);
      fragment.append(row);
      continue;
    }

    const paragraph = document.createElement("p");
    paragraph.textContent = line;
    fragment.append(paragraph);
  }

  brainNoteContent.replaceChildren(fragment);
}

function renderBrainNote(note) {
  brainNoteTitle.textContent = note.title;
  brainNotePath.textContent = `${note.sourceLabel} / ${note.relativePath}`;
  if (note.obsidianUrl) {
    brainOpenLink.href = note.obsidianUrl;
    brainOpenLink.setAttribute("aria-disabled", "false");
    brainOpenLink.target = "_blank";
  } else {
    brainOpenLink.href = "#";
    brainOpenLink.setAttribute("aria-disabled", "true");
    brainOpenLink.removeAttribute("target");
  }
  brainNoteMeta.replaceChildren(
    makeTag(note.sourceKind),
    makeTag(`${note.tasks.open} open tasks`),
    makeTag(`${note.tasks.done} done tasks`),
    makeTag(`${note.links.length} links`),
    makeTag(new Date(note.updatedAt).toLocaleString())
  );
  renderMarkdownPreview(note.content || "");
}

async function loadBrainNote(slug) {
  try {
    const note = await fetchJson(`/api/brain/${encodeURIComponent(slug)}`);
    renderBrainNote(note);
    logEvent(`Brain note loaded: ${note.title}`);
  } catch (error) {
    logEvent(`Brain note unavailable: ${error.message}`);
  }
}

async function loadBrain() {
  try {
    const brain = await fetchJson("/api/brain");
    brainStatus.textContent = `${brain.rootCount} roots / ${brain.noteCount} notes`;
    renderBrainSummary(brain);
    renderBrainRoots(brain);
    renderBrainList(brain);

    const first =
      brain.notes.find((note) => note.slug.includes("work-summary")) ||
      brain.notes.find((note) => note.slug.includes("dna-brain")) ||
      brain.notes[0];
    if (first) {
      await loadBrainNote(first.slug);
    }

    logEvent("Obsidian brain refreshed");
  } catch (error) {
    brainStatus.textContent = "Brain offline";
    renderBrainSummary(fallbackBrain);
    renderBrainRoots(fallbackBrain);
    renderBrainList(fallbackBrain);
    logEvent(`Brain fallback: ${error.message}`);
  }
}

async function loadProjectInventory() {
  try {
    const inventory = await fetchJson("/api/project-inventory");
    renderProjectInventory(inventory);
    logEvent("Tool management inventory refreshed");
    return inventory;
  } catch (error) {
    renderProjectInventory(fallbackProjectInventory);
    logEvent(`Tool inventory fallback: ${error.message}`);
    return fallbackProjectInventory;
  }
}

async function loadVibeCommandCenter() {
  try {
    const vibe = await fetchJson("/api/vibe-command-center");
    renderVibe(vibe);
    return vibe;
  } catch (error) {
    renderVibe(fallbackVibe);
    logEvent(`Vibe command fallback: ${error.message}`);
    return fallbackVibe;
  }
}

async function fetchJson(path, options) {
  const response = await fetch(`${apiBase}${path}`, {
    headers: { "content-type": "application/json" },
    ...options
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

async function loadDashboard() {
  let apiOnline = false;
  renderHermesInbox(fallbackHermesInbox);

  const loadPanel = async (path, render, renderFallback, fallbackLabel) => {
    try {
      const data = await fetchJson(path);
      render(data);
      return data;
    } catch (error) {
      renderFallback(error);
      logEvent(`${fallbackLabel} fallback: ${error.message}`);
      return null;
    }
  };

  const jobs = [
    loadPanel(
      "/health",
      (health) => {
        apiOnline = true;
        setApiState("online", `API ${health.status}`);
      },
      () => setApiState("offline", "API offline"),
      "Health"
    ),
    loadPanel("/api/gates", (gates) => renderGates(gates.gates), () => renderGates(fallbackGates), "Gates"),
    loadPanel("/api/actions", (actions) => renderActions(actions.actions), () => renderActions(fallbackActions), "Actions"),
    loadPanel("/api/switches", (switches) => renderSwitches(switches.switches), () => renderSwitches(fallbackSwitches), "Switches"),
    loadPanel(
      "/api/approval-queue",
      renderApprovalQueue,
      () => renderApprovalQueue(fallbackApprovalQueue),
      "Approval queue"
    ),
    loadPanel("/api/audit-events", renderAuditEvents, () => renderAuditEvents(fallbackAuditTrail), "Audit events"),
    loadPanel("/api/vibe-command-center", renderVibe, () => renderVibe(fallbackVibe), "Vibe command"),
    loadPanel("/api/lead-health", renderLeadHealth, () => renderLeadHealth(fallbackLeadHealth), "Lead health"),
    loadPanel("/api/lead-event-audit", renderLeadAudit, () => renderLeadAudit(fallbackLeadAudit), "Lead event audit"),
    loadPanel(
      "/api/sales-artifacts",
      renderSalesArtifacts,
      () => renderSalesArtifacts(fallbackSalesArtifacts),
      "Sales artifacts"
    ),
    loadPanel("/api/roi-preview", renderRoiPreview, () => renderRoiPreview(fallbackRoiPreview), "ROI preview"),
    loadPanel(
      "/api/proposal-draft",
      renderProposalDraft,
      () => renderProposalDraft(fallbackProposalDraft),
      "Proposal draft"
    ),
    loadPanel(
      "/api/proposal-review",
      renderProposalReview,
      () => renderProposalReview(fallbackProposalReview),
      "Proposal review"
    ),
    loadPanel(
      "/api/mobile-review-packet",
      renderMobileReviewPacket,
      () => renderMobileReviewPacket(fallbackMobileReviewPacket),
      "Mobile review packet"
    ),
    loadPanel(
      "/api/external-gate-packets",
      renderExternalGatePackets,
      () => renderExternalGatePackets(fallbackExternalGatePackets),
      "External gate packets"
    ),
    loadPanel(
      "/api/external-gate-preflight",
      renderExternalGatePreflight,
      () => renderExternalGatePreflight(fallbackExternalGatePreflight),
      "External gate preflight"
    ),
    loadPanel("/api/hermes", renderHermes, () => renderHermes(fallbackHermes), "Hermes"),
    loadPanel("/api/executive-hq", renderExecutive, () => renderExecutive(fallbackExecutive), "Executive HQ"),
    loadPanel(
      "/api/project-inventory",
      renderProjectInventory,
      () => renderProjectInventory(fallbackProjectInventory),
      "Tool inventory"
    ),
    loadPanel(
      "/api/github-integration",
      renderGithubIntegration,
      () => renderGithubIntegration(fallbackGithubIntegration),
      "GitHub integration"
    )
  ];

  await Promise.allSettled(jobs);
  lastUpdated.textContent = apiOnline ? new Date().toLocaleString() : "Fallback data";
  logEvent(apiOnline ? "Control API refreshed" : "Fallback mode: Control API unavailable");
  await loadBrain();
}

async function runDryRun(actionId) {
  try {
    const result = await fetchJson("/api/dry-run", {
      method: "POST",
      body: JSON.stringify({ actionId })
    });
    logEvent(`${result.actionId}: ${result.result}`);
    if (result.approvalRequest) {
      await loadApprovalQueue();
    }
    await loadAuditEvents();
  } catch (error) {
    logEvent(`${actionId}: dry-run unavailable (${error.message})`);
  }
}

async function runHermesInboxDryRun() {
  hermesInboxRunButton.disabled = true;
  hermesInboxRunResult.textContent = "Running local Hermes inbox dry-run...";

  try {
    const result = await fetchJson("/api/hermes-inbox/dry-run", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        requestId: "dashboard-hermes-inbox-local-doc",
        source: "codex-local",
        target: { id: "docs/knowledge/SIRINX_PLAN.md" },
        intent: {
          type: "local-doc-write",
          summary: "Dashboard Hermes inbox local preview",
          rawTextIncluded: false
        },
        action: {
          id: "dashboard-hermes-inbox-local-doc",
          type: "local-doc-write",
          externalWrite: false
        },
        dryRun: true
      })
    });

    renderHermesInbox(result);
    logEvent(`Hermes inbox dry-run: ${result.result}`);
    await loadAuditEvents();
  } catch (error) {
    hermesInboxRunResult.textContent = `Hermes inbox dry-run failed: ${error.message}`;
    logEvent(`Hermes inbox dry-run failed: ${error.message}`);
  } finally {
    hermesInboxRunButton.disabled = false;
  }
}

async function writeProposalDraftLocal() {
  proposalDraftWriteButton.disabled = true;
  proposalDraftWriteResult.textContent = "Writing local Obsidian proposal draft...";

  try {
    const result = await fetchJson("/api/proposal-draft/write", {
      method: "POST",
      body: JSON.stringify({ confirmLocalWrite: true })
    });

    if (result.didWrite) {
      proposalDraftWriteResult.textContent = `Written: ${result.targetPath}`;
      logEvent(`proposal draft written locally: ${result.targetPath}`);
    } else {
      proposalDraftWriteResult.textContent = `${result.status}: ${result.reason || "no file written"}`;
      logEvent(`proposal draft write blocked: ${result.status}`);
    }
  } catch (error) {
    proposalDraftWriteResult.textContent = `Local write failed: ${error.message}`;
    logEvent(`proposal draft write failed: ${error.message}`);
  } finally {
    proposalDraftWriteButton.disabled = false;
  }
}

async function calculateRoiPreview(event) {
  event.preventDefault();
  roiCalculateButton.disabled = true;

  try {
    const result = await fetchJson("/api/roi-preview", {
      method: "POST",
      body: JSON.stringify({
        assumptions: {
          monthly_bill_thb: Number(roiMonthlyBill.value || 0),
          daytime_load_ratio: Number(roiDaytimeRatio.value || 0.5),
          backup_priority: roiBackupPriority.value,
          phase_type: roiPhaseType.value,
          effective_tariff_thb_per_kwh: 4.2,
          annual_yield_per_kwp: 1450
        }
      })
    });
    renderRoiPreview(result);
    logEvent(`ROI preview calculated: ${result.result?.recommendedPackage?.id || "unknown"}`);
  } catch (error) {
    logEvent(`ROI preview unavailable (${error.message})`);
  } finally {
    roiCalculateButton.disabled = false;
  }
}

async function writeProposalReviewPacketLocal() {
  proposalReviewWriteButton.disabled = true;
  proposalReviewWriteResult.textContent = "Writing local Obsidian proposal review packet...";

  try {
    const result = await fetchJson("/api/proposal-review/write", {
      method: "POST",
      body: JSON.stringify({ confirmLocalWrite: true })
    });

    if (result.didWrite) {
      proposalReviewWriteResult.textContent = `Written: ${result.targetPath}`;
      logEvent(`proposal review packet written locally: ${result.targetPath}`);
    } else {
      proposalReviewWriteResult.textContent = `${result.status}: ${result.reason || "no file written"}`;
      logEvent(`proposal review packet write blocked: ${result.status}`);
    }
  } catch (error) {
    proposalReviewWriteResult.textContent = `Local write failed: ${error.message}`;
    logEvent(`proposal review packet write failed: ${error.message}`);
  } finally {
    proposalReviewWriteButton.disabled = false;
  }
}

async function writeMobileReviewPacketLocal() {
  mobileReviewWriteButton.disabled = true;
  mobileReviewWriteResult.textContent = "Writing local Codex Mobile review packet...";

  try {
    const result = await fetchJson("/api/mobile-review-packet/write", {
      method: "POST",
      body: JSON.stringify({ confirmLocalWrite: true })
    });

    if (result.didWrite) {
      mobileReviewWriteResult.textContent = `Written: ${result.targetPath}`;
      logEvent(`mobile review packet written locally: ${result.targetPath}`);
    } else {
      mobileReviewWriteResult.textContent = `${result.status}: ${result.reason || "no file written"}`;
      logEvent(`mobile review packet write blocked: ${result.status}`);
    }
  } catch (error) {
    mobileReviewWriteResult.textContent = `Local write failed: ${error.message}`;
    logEvent(`mobile review packet write failed: ${error.message}`);
  } finally {
    mobileReviewWriteButton.disabled = false;
  }
}

async function writeExternalGatePacketsLocal() {
  externalGateWriteButton.disabled = true;
  externalGateWriteResult.textContent = "Writing local external gate approval packets...";

  try {
    const result = await fetchJson("/api/external-gate-packets/write", {
      method: "POST",
      body: JSON.stringify({ confirmLocalWrite: true })
    });

    if (result.didWrite) {
      externalGateWriteResult.textContent = `Written: ${result.targetPath}`;
      logEvent(`external gate packets written locally: ${result.targetPath}`);
    } else {
      externalGateWriteResult.textContent = `${result.status}: ${result.reason || "no file written"}`;
      logEvent(`external gate packet write blocked: ${result.status}`);
    }
  } catch (error) {
    externalGateWriteResult.textContent = `Local write failed: ${error.message}`;
    logEvent(`external gate packet write failed: ${error.message}`);
  } finally {
    externalGateWriteButton.disabled = false;
  }
}

async function writeExternalGatePreflightLocal() {
  externalGatePreflightWriteButton.disabled = true;
  externalGatePreflightWriteResult.textContent = "Writing local external gate audit preflight...";

  try {
    const result = await fetchJson("/api/external-gate-preflight/write", {
      method: "POST",
      body: JSON.stringify({ confirmLocalWrite: true })
    });

    if (result.didWrite) {
      externalGatePreflightWriteResult.textContent = `Written: ${result.targetPath}`;
      logEvent(`external gate preflight written locally: ${result.targetPath}`);
    } else {
      externalGatePreflightWriteResult.textContent = `${result.status}: ${result.reason || "no file written"}`;
      logEvent(`external gate preflight write blocked: ${result.status}`);
    }
  } catch (error) {
    externalGatePreflightWriteResult.textContent = `Local write failed: ${error.message}`;
    logEvent(`external gate preflight write failed: ${error.message}`);
  } finally {
    externalGatePreflightWriteButton.disabled = false;
  }
}

refreshButton.addEventListener("click", loadDashboard);
toolRefreshButton.addEventListener("click", loadProjectInventory);
clearLogButton.addEventListener("click", () => eventLog.replaceChildren());
proposalDraftWriteButton.addEventListener("click", writeProposalDraftLocal);
roiAssumptionForm.addEventListener("submit", calculateRoiPreview);
proposalReviewWriteButton.addEventListener("click", writeProposalReviewPacketLocal);
mobileReviewWriteButton.addEventListener("click", writeMobileReviewPacketLocal);
externalGateWriteButton.addEventListener("click", writeExternalGatePacketsLocal);
externalGatePreflightWriteButton.addEventListener("click", writeExternalGatePreflightLocal);
hermesInboxRunButton.addEventListener("click", runHermesInboxDryRun);

loadDashboard();
