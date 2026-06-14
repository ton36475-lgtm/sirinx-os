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
const vibeAgentStatus = document.querySelector("#vibeAgentStatus");
const vibeAgentSummary = document.querySelector("#vibeAgentSummary");
const vibeAgentSafeActions = document.querySelector("#vibeAgentSafeActions");
const vibeAgentBlockedGates = document.querySelector("#vibeAgentBlockedGates");
const vibeAgentReviewQueue = document.querySelector("#vibeAgentReviewQueue");
const vibeAgentApprovalPacket = document.querySelector("#vibeAgentApprovalPacket");
const connectorPanelStatus = document.querySelector("#connectorPanelStatus");
const connectorPanelSummary = document.querySelector("#connectorPanelSummary");
const connectorStopPoint = document.querySelector("#connectorStopPoint");
const connectorOwnerList = document.querySelector("#connectorOwnerList");
const connectorList = document.querySelector("#connectorList");
const connectorGateList = document.querySelector("#connectorGateList");
const agentLaunchStatus = document.querySelector("#agentLaunchStatus");
const agentLaunchSummary = document.querySelector("#agentLaunchSummary");
const agentLaunchStopPoint = document.querySelector("#agentLaunchStopPoint");
const agentLaunchCommandList = document.querySelector("#agentLaunchCommandList");
const agentLaunchHealthList = document.querySelector("#agentLaunchHealthList");
const agentLaunchBlockedList = document.querySelector("#agentLaunchBlockedList");
const agentDriverStatus = document.querySelector("#agentDriverStatus");
const agentDriverSummary = document.querySelector("#agentDriverSummary");
const agentDriverStopPoint = document.querySelector("#agentDriverStopPoint");
const agentDriverLaneList = document.querySelector("#agentDriverLaneList");
const agentDriverEvidenceList = document.querySelector("#agentDriverEvidenceList");
const agentDriverBlockedList = document.querySelector("#agentDriverBlockedList");
const centerBrainStatus = document.querySelector("#centerBrainStatus");
const centerBrainSummary = document.querySelector("#centerBrainSummary");
const centerBrainStopPoint = document.querySelector("#centerBrainStopPoint");
const centerBrainNodeList = document.querySelector("#centerBrainNodeList");
const centerBrainStackList = document.querySelector("#centerBrainStackList");
const centerBrainBlockedList = document.querySelector("#centerBrainBlockedList");
const teamRuntimeStatus = document.querySelector("#teamRuntimeStatus");
const teamRuntimeSummary = document.querySelector("#teamRuntimeSummary");
const teamRuntimeStopPoint = document.querySelector("#teamRuntimeStopPoint");
const teamRuntimeLaneList = document.querySelector("#teamRuntimeLaneList");
const teamRuntimeModelList = document.querySelector("#teamRuntimeModelList");
const teamRuntimeBlockedList = document.querySelector("#teamRuntimeBlockedList");
const openRouterQwenAdapterStatus = document.querySelector("#openRouterQwenAdapterStatus");
const openRouterQwenAdapterSummary = document.querySelector("#openRouterQwenAdapterSummary");
const openRouterQwenAdapterPolicyList = document.querySelector("#openRouterQwenAdapterPolicyList");
const openRouterQwenAdapterBlockedList = document.querySelector("#openRouterQwenAdapterBlockedList");
const modelRoutingApprovalStatus = document.querySelector("#modelRoutingApprovalStatus");
const modelRoutingApprovalSummary = document.querySelector("#modelRoutingApprovalSummary");
const modelRoutingApprovalEvidenceList = document.querySelector("#modelRoutingApprovalEvidenceList");
const modelRoutingApprovalBlockedList = document.querySelector("#modelRoutingApprovalBlockedList");
const adaptiveCommandGatewayStatus = document.querySelector("#adaptiveCommandGatewayStatus");
const adaptiveCommandGatewaySummary = document.querySelector("#adaptiveCommandGatewaySummary");
const adaptiveCommandGatewayStopPoint = document.querySelector("#adaptiveCommandGatewayStopPoint");
const adaptiveCommandGatewayCommandList = document.querySelector("#adaptiveCommandGatewayCommandList");
const adaptiveCommandGatewayModelList = document.querySelector("#adaptiveCommandGatewayModelList");
const adaptiveCommandGatewayBlockedList = document.querySelector("#adaptiveCommandGatewayBlockedList");
const specFirstSwarmStatus = document.querySelector("#specFirstSwarmStatus");
const specFirstSwarmSummary = document.querySelector("#specFirstSwarmSummary");
const specFirstSwarmStopPoint = document.querySelector("#specFirstSwarmStopPoint");
const specFirstSwarmFileList = document.querySelector("#specFirstSwarmFileList");
const specFirstSwarmRoleList = document.querySelector("#specFirstSwarmRoleList");
const specFirstSwarmBlockedList = document.querySelector("#specFirstSwarmBlockedList");
const localRagStatus = document.querySelector("#localRagStatus");
const localRagSummary = document.querySelector("#localRagSummary");
const localRagStopPoint = document.querySelector("#localRagStopPoint");
const localRagCorpusList = document.querySelector("#localRagCorpusList");
const localRagDependencyList = document.querySelector("#localRagDependencyList");
const localRagBlockedList = document.querySelector("#localRagBlockedList");
const imageEditStatus = document.querySelector("#imageEditStatus");
const imageEditSummary = document.querySelector("#imageEditSummary");
const imageEditStopPoint = document.querySelector("#imageEditStopPoint");
const imageEditContractList = document.querySelector("#imageEditContractList");
const imageEditAcceptanceList = document.querySelector("#imageEditAcceptanceList");
const imageEditEvidenceList = document.querySelector("#imageEditEvidenceList");
const imageEditInvalidList = document.querySelector("#imageEditInvalidList");
const imageEditBlockedList = document.querySelector("#imageEditBlockedList");
const socStatus = document.querySelector("#socStatus");
const socSummary = document.querySelector("#socSummary");
const socSnapshotList = document.querySelector("#socSnapshotList");
const socGateList = document.querySelector("#socGateList");
const truthRuleList = document.querySelector("#truthRuleList");
const socNextActions = document.querySelector("#socNextActions");
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
const pendingWorkStatus = document.querySelector("#pendingWorkStatus");
const pendingWorkSummary = document.querySelector("#pendingWorkSummary");
const pendingWorkList = document.querySelector("#pendingWorkList");
const pendingWorkNextActions = document.querySelector("#pendingWorkNextActions");
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
const externalGateEvidenceStatus = document.querySelector("#externalGateEvidenceStatus");
const externalGateEvidenceSummary = document.querySelector("#externalGateEvidenceSummary");
const externalGateEvidenceList = document.querySelector("#externalGateEvidenceList");
const externalGateEvidenceNextActions = document.querySelector("#externalGateEvidenceNextActions");
const externalGateRunnerStatus = document.querySelector("#externalGateRunnerStatus");
const externalGateRunnerSummary = document.querySelector("#externalGateRunnerSummary");
const externalGateRunnerList = document.querySelector("#externalGateRunnerList");
const externalGateRunnerNextActions = document.querySelector("#externalGateRunnerNextActions");
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

const fallbackVibeCodingAgent = {
  title: "Local Vibe Coding Agent",
  status: "api-offline",
  mode: "local-fallback",
  externalWrites: false,
  productionWrites: false,
  customerVisible: false,
  canExecuteExternally: false,
  canRunMcp: false,
  canDeploy: false,
  mainWebsiteProtected: true,
  summary: {
    safeActions: 0,
    blockedExternalGates: 0,
    readyForHumanReview: 0,
    executableExternalActions: 0,
    blockedActions: 9,
    vibeFunctions: 0,
    socStatus: "unknown",
    truthProtocol: "unknown"
  },
  safeActions: [],
  reviewQueue: [],
  blockedGates: [
    {
      id: "api-offline",
      title: "Control API unavailable",
      owner: "local",
      status: "blocked-api-offline",
      missingCount: 1,
      requiredCount: 1,
      nextAction: "Start the local control API before running the Vibe Coding Agent."
    }
  ],
  blockedActions: ["deploy", "push", "publish", "external_connector_activation", "real_mcp_execution"],
  approvalPacket: {
    status: "blocked-api-offline",
    nextRequiredApproval: "Start local API, then complete evidence and human review.",
    stopPoint: "VIBE CODING AGENT WAITING FOR LOCAL API"
  },
  operatingRule: "Fallback mode only. No external writes are available.",
  updatedAt: new Date().toISOString()
};

const fallbackGatewayAgent = {
  title: "Unified Gateway Agent",
  status: "api-offline",
  mode: "local-fallback",
  externalWrites: false,
  canExecuteExternally: false,
  canRunMcp: false,
  canSendMessages: false,
  summary: {
    connectorsTotal: 0,
    rosterRoles: 0,
    pairedAiRoles: 0,
    blockedActions: 0
  },
  approvalPacket: {
    stopPoint: "GATEWAY AGENT WAITING FOR LOCAL API"
  },
  blockedActions: ["Start the local control API"]
};

const fallbackAiTeamPairing = {
  title: "SIRINX AI Team Pairing",
  status: "api-offline",
  mode: "local-fallback",
  externalWrites: false,
  canSendMessages: false,
  canStartGateways: false,
  summary: {
    pairedRoles: 0,
    activeProfiles: 0,
    virtualRoles: 0,
    handoffPackets: 0
  },
  telegram: {
    canSend: false,
    evidenceStatus: "api-offline"
  }
};

const fallbackConnectorRegistry = {
  title: "Connector Capability Registry",
  status: "api-offline",
  mode: "local-fallback",
  externalWrites: false,
  canActivateConnectors: false,
  canExecuteExternally: false,
  canRunMcp: false,
  canReadSecrets: false,
  summary: {
    connectorsTotal: 0,
    ownerLanes: 0,
    activatableConnectors: 0,
    executableExternalActions: 0,
    blockedActions: 1
  },
  connectors: [
    {
      id: "api-offline",
      title: "Connector registry unavailable",
      owner: "local",
      capability: "Start the local control API to inspect connector capabilities.",
      externalWrites: false,
      canActivate: false,
      canRunMcp: false,
      canReadSecrets: false,
      requiresApproval: true
    }
  ],
  ownerPackets: [
    {
      owner: "control-api",
      connectorCount: 1,
      connectors: ["Connector registry unavailable"],
      canActivate: false
    }
  ],
  blockedActions: ["Start the local control API"],
  stopPoint: "CONNECTOR REGISTRY WAITING FOR LOCAL API"
};

const connectorPanelState = {
  gateway: fallbackGatewayAgent,
  aiTeam: fallbackAiTeamPairing,
  registry: fallbackConnectorRegistry
};

const fallbackAgentLaunchGate = {
  title: "Ollama Agent Launch Gate",
  status: "api-offline",
  mode: "local-fallback",
  source: "Ollama Launch screen",
  externalWrites: false,
  productionWrites: false,
  customerVisible: false,
  canExecuteExternally: false,
  canLaunchAgents: false,
  canRunMcp: false,
  canReadSecrets: false,
  hermesContextRule: {
    observedContextWindow: 8192,
    requiredContextWindow: 64000,
    status: "blocked-context-too-small"
  },
  summary: {
    agentsTotal: 0,
    manualOnly: 0,
    autoExecutable: 0,
    blockedContextTooSmall: 0,
    recommendedManualSmokeCandidates: [],
    blockedActions: 1
  },
  agents: [
    {
      id: "api-offline",
      title: "Agent Launch Gate unavailable",
      command: "Start the local control API",
      role: "local-fallback",
      riskLevel: "medium",
      status: "api-offline",
      allowedMode: "manual_only",
      autoExecute: false,
      canLaunchAutomatically: false,
      canExecuteNow: false,
      externalWrites: false,
      canRunMcp: false,
      canReadSecrets: false,
      badges: ["manual-only", "health-check-required", "approval-required"],
      healthRequirements: ["Start the local control API to inspect launch commands."],
      recommendedFirstTest: "Start the local control API, then refresh this panel."
    }
  ],
  blockedActions: ["Start the local control API"],
  stopPoint: "OLLAMA AGENT LAUNCH GATE WAITING FOR LOCAL API"
};

const fallbackAgentDriver = {
  title: "Agent Driver",
  status: "api-offline",
  mode: "local-fallback",
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
  summary: {
    agentsTotal: 0,
    commandExecuted: 0,
    classifications: {
      passed: 0,
      missing: 0,
      side_effectful: 0,
      blocked: 0,
      needs_install: 0
    },
    blockedActions: 1,
    approvedReadOnlyCommands: 0
  },
  agents: [
    {
      id: "api-offline",
      title: "Agent Driver unavailable",
      classification: "blocked",
      approvedReadOnlyCommand: null,
      commandExecuted: false,
      canEditFiles: false,
      canStartMcp: false,
      canInstallPackages: false,
      canSendMessages: false,
      canDeploy: false,
      evidenceStatus: "api-offline",
      notes: "Start the local control API to inspect Agent Driver lanes.",
      badges: ["blocked", "local-only"]
    }
  ],
  nextRecommendedAgent: null,
  recommendedOrder: [],
  blockedActions: ["Start the local control API"],
  evidence: {
    path: "docs/knowledge/SIRINX_AGENT_DRIVER_V1.md",
    currentState: "api-offline",
    apiWritesEvidence: false
  },
  stopPoint: "AGENT DRIVER WAITING FOR LOCAL API"
};

const fallbackCenterBrainHub = {
  title: "CenterBrain Hub",
  status: "api-offline",
  mode: "local-fallback",
  externalWrites: false,
  productionWrites: false,
  customerVisible: false,
  canActivateConnectors: false,
  canRunMcp: false,
  canReadSecrets: false,
  canSendMessages: false,
  canDeploy: false,
  summary: {
    aiNodes: 0,
    deviceNodes: 0,
    connectorLanes: 0,
    stackLanes: 0,
    liveExternalActions: 0
  },
  aiNodes: [
    {
      id: "api-offline",
      title: "CenterBrain unavailable",
      status: "api-offline",
      classification: "blocked",
      canRunMcp: false,
      canSendMessages: false,
      canDeploy: false
    }
  ],
  deviceNodes: [],
  stackLanes: [],
  blockedActions: ["Start the local control API"],
  syncContract: {
    handshake: ["discover", "classify", "dry-run", "evidence", "approval", "manual-activation"],
    evidencePath: "docs/knowledge/SIRINX_CENTERBRAIN_HUB_V1.md"
  },
  nextRecommendedAction: "Start the local control API, then refresh this panel.",
  stopPoint: "CENTERBRAIN HUB WAITING FOR LOCAL API"
};

const fallbackTeamRuntimeBridge = {
  title: "Team Runtime Bridge",
  status: "api-offline",
  mode: "local-fallback",
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
  summary: {
    runtimeLanes: 0,
    cloudModelLanes: 0,
    paidApiExecutable: 0,
    antigravityExecutable: 0,
    hermesRoutingReady: false,
    localModelsObserved: 0,
    blockedActions: 1
  },
  runtimeLanes: [
    {
      id: "api-offline",
      title: "Team Runtime Bridge unavailable",
      status: "api-offline",
      role: "Start the local control API to inspect runtime lanes.",
      autoExecute: false,
      externalWrites: false,
      canExecuteNow: false,
      canRunMcp: false
    }
  ],
  modelLanes: [
    {
      id: "api-offline-model",
      title: "Qwen lane unavailable",
      provider: "unknown",
      modelId: "Start the local control API",
      status: "api-offline",
      canCallProvider: false,
      canReadApiKey: false,
      paidApiRequired: true,
      autoExecute: false,
      commandExecuted: false
    }
  ],
  blockedActions: ["Start the local control API"],
  stopPoint: "TEAM RUNTIME BRIDGE WAITING FOR LOCAL API"
};

const fallbackOpenRouterQwenAdapter = {
  title: "OpenRouter Qwen Adapter",
  status: "api-offline",
  mode: "local-fallback",
  provider: "OpenRouter",
  endpoint: "https://openrouter.ai/api/v1/chat/completions",
  providerCalled: false,
  secretsRead: false,
  canCallPaidApi: false,
  commandExecuted: false,
  requiresHumanApproval: true,
  model: {
    primary: "qwen/qwen3.7-max",
    fallback: "qwen/qwen3-max"
  },
  defaultPolicy: {
    temperature: 0.2,
    maxTokens: 4096,
    stream: false
  },
  sensitivePolicy: {
    appliesTo: ["internal_repo_analysis", "client_strategy", "security_report"],
    provider: { zdr: true }
  },
  jsonPolicy: {
    modes: ["jsonStrict", "sensitive"],
    response_format: { type: "json_object" }
  },
  promptCachingPolicy: {
    mode: "explicit-cache-control-preview-only",
    rejected: ["latest user command", "tokens", "secrets", "runtime logs", "credentials"]
  },
  blockedActions: ["Start the local control API"],
  stopPoint: "OPENROUTER QWEN ADAPTER WAITING FOR LOCAL API"
};

const fallbackModelRoutingApproval = {
  title: "OpenRouter Qwen Model Routing Approval",
  approvalId: "openrouter-qwen-model-routing",
  status: "api-offline",
  mode: "local-fallback",
  provider: "OpenRouter",
  modelSlugLocked: "qwen/qwen3.7-max",
  fallbackSlugLocked: "qwen/qwen3-max",
  providerCalled: false,
  commandExecuted: false,
  secretsRead: false,
  keyValuePrinted: false,
  canCallPaidApi: false,
  requiresHumanApproval: true,
  evidenceChecklist: [
    {
      id: "api-offline",
      label: "Approval API unavailable",
      status: "blocked",
      evidence: "Start the local control API to inspect model-routing approval."
    }
  ],
  futureSmokeCall: {
    requiresSeparateApproval: true,
    providerCalled: false,
    commandExecuted: false
  },
  approvalPacket: {
    path: "docs/approvals/OPENROUTER_QWEN_MODEL_ROUTING_APPROVAL.md",
    status: "api-offline"
  },
  blockedActions: ["Start the local control API"],
  stopPoint: "OPENROUTER QWEN MODEL ROUTING APPROVAL WAITING FOR LOCAL API"
};

const fallbackAdaptiveCommandGateway = {
  title: "Hermes Adaptive Command Gateway",
  version: "0.2",
  status: "api-offline",
  mode: "local-fallback",
  commandExecuted: false,
  providerCalled: false,
  secretsRead: false,
  messageSent: false,
  telegramMessageSent: false,
  canSendTelegram: false,
  canCallProvider: false,
  canExecuteAgents: false,
  canStartMcp: false,
  canInstallPackages: false,
  canDeploy: false,
  requiresHumanApproval: true,
  aliases: {
    clear: "reset"
  },
  commandRegistry: [
    "/clear",
    "/reset",
    "/kanban boards switch <slug>",
    "/mission create \"<name>\"",
    "/mission route \"<route>\" --provider <provider> --sync <targets> --mode <mode>"
  ],
  modelPolicy: {
    router: {
      provider: "openrouter",
      model: "qwen/qwen3.7-max",
      contextLength: 1000000,
      maxTokens: 512
    },
    planner: {
      provider: "openrouter",
      model: "qwen/qwen3.7-max",
      contextLength: 1000000,
      maxTokens: 4096
    },
    reviewer: {
      provider: "openrouter",
      model: "qwen/qwen3.7-max",
      contextLength: 1000000,
      maxTokens: 3000
    }
  },
  queuePolicy: {
    backend: "sqlite",
    dbPath: ".hermes/jobs.sqlite",
    persistedByDryRun: false
  },
  latencyControl: {
    fastAck: true,
    ackTimeoutMs: 1200,
    progressIntervalMs: 6000
  },
  blockedActions: ["Start the local control API"],
  stopPoint: "HERMES ADAPTIVE COMMAND GATEWAY WAITING FOR LOCAL API"
};

const fallbackSpecFirstSwarm = {
  title: "Hermes Spec-First Swarm",
  status: "api-offline",
  mode: "local-fallback",
  currentPhase: "APPROVAL_GATE",
  approvalStatus: "NOT_APPROVED",
  approvalPhrase: "APPROVE_IMPLEMENTATION",
  implementationStarted: false,
  environmentScanned: true,
  commandExecuted: false,
  canModifySource: false,
  canInstallPackages: false,
  canStartMcp: false,
  canCallProvider: false,
  requiredFiles: [
    { path: ".hermes/context.md", exists: false },
    { path: ".hermes/state.json", exists: false },
    { path: "docs/03-technical-spec.md", exists: false },
    { path: "docs/05-qa-checklist.md", exists: false }
  ],
  agentRoles: [
    {
      id: "api-offline",
      title: "Spec-First Swarm unavailable",
      owns: "Start the local control API to inspect live workflow state.",
      blocked: ["api_offline"]
    }
  ],
  blockedActions: ["Start the local control API"],
  stopPoint: "HERMES SPEC-FIRST SWARM WAITING FOR LOCAL API"
};

const fallbackLocalRag = {
  title: "Local RAG Prototype",
  status: "api-offline",
  mode: "local-fallback",
  externalWrites: false,
  productionWrites: false,
  customerVisible: false,
  canCallPaidApi: false,
  canActivateConnector: false,
  canRunMcp: false,
  canReadSecrets: false,
  canDeploy: false,
  canPublish: false,
  corpusScope: {
    id: "full-repo-safe-text",
    title: "Full Repo Safe Text",
    projectRoot: "/Users/sirinx/sirinx-os",
    include: ["repo text files"],
    exclude: ["Start the local control API to inspect safe corpus rules."]
  },
  dependency: {
    turbovec: {
      status: "unknown",
      package: "turbovec",
      optional: true,
      installHint: "pip install turbovec"
    },
    pythonWorker: {
      status: "optional",
      path: "tools/local-rag/turbovec_worker.py"
    }
  },
  summary: {
    corpusScope: "full-repo-safe-text",
    embeddingBackend: "deterministic-local-fixture",
    optionalVectorIndex: "turbovec",
    turbovecStatus: "unknown",
    canCallPaidApi: false,
    canRunMcp: false,
    canReadSecrets: false,
    externalWrites: false
  },
  blockedActions: ["Start the local control API"],
  stopPoint: "LOCAL RAG WAITING FOR LOCAL API"
};

const fallbackHermesImageEdit = {
  title: "Hermes Image-to-Image Gateway Patch",
  status: "api-offline",
  mode: "local-fallback",
  image_edit: true,
  caption_required: true,
  fallback_text_to_image_blocked: true,
  providerMustSupportEdit: true,
  externalWrites: false,
  canExecuteExternally: false,
  canRunMcp: false,
  canReadSecrets: false,
  toolContract: {
    tool: "image_edit",
    required: ["prompt", "image_ref"],
    optional: ["aspect_ratio"]
  },
  validUsage: [
    "Attach one source image",
    "Put the edit instruction in the same image caption",
    "Route to image_edit only"
  ],
  invalidUsage: [
    "Image and edit instruction sent as separate turns",
    "Prompt-only generation when a source image exists"
  ],
  blockedActions: ["Start the local control API"],
  acceptancePacket: {
    status: "api-offline",
    patch_ready: true,
    gateway_restart_required: true,
    caption_required: true,
    provider_edit_capability: "needs_manual_probe",
    text_to_image_fallback: "blocked",
    canRestartGateway: false,
    canCallProvider: false,
    providerCapabilityCheck: {
      status: "needs_manual_probe",
      checkedLive: false,
      tokenRead: false,
      tokenPrinted: false,
      providerSwitch: false
    },
    gatewayRestartChecklist: {
      required: true,
      autoRestart: false,
      manualApprovalRequired: true,
      steps: ["Start the local control API to inspect the manual gateway restart checklist."]
    },
    acceptanceTest: {
      inputImage: "food on black plate",
      caption: "change only the plate from black to white",
      expected: "same food, same framing, same composition, only plate color changes"
    },
    evidenceFields: [
      { id: "source_image_present", label: "Source image present", status: "operator-supplied" },
      { id: "caption_bound_same_event", label: "Caption bound in same event", status: "required" },
      { id: "image_ref_preserved", label: "image_ref preserved", status: "required" },
      { id: "image_edit_selected", label: "image_edit selected", status: "required" },
      { id: "image_generate_not_selected", label: "image_generate not selected", status: "required" },
      { id: "result_reviewed_by_human", label: "Result reviewed by human", status: "pending_manual_review" }
    ],
    stopPoint: "HERMES IMAGE EDIT ACCEPTANCE WAITING FOR LOCAL API"
  },
  summary: {
    imageEdit: true,
    captionRequired: true,
    fallbackTextToImageBlocked: true,
    acceptancePacketReady: false,
    localOnly: true,
    blockedActions: 1
  },
  stopPoint: "HERMES IMAGE EDIT WAITING FOR LOCAL API"
};

const fallbackSocStatus = {
  title: "A2ASync-1CeoAgent SOC monitor",
  status: "not-installed",
  mode: "local-fallback",
  target: "mac-local",
  externalWrites: false,
  productionWrites: false,
  customerVisible: false,
  snapshot: {
    timestamp: new Date().toISOString(),
    cpu: null,
    memory: null,
    disk: null,
    docker: null,
    errors: []
  },
  truthStates: {
    cpu: "not_run",
    memory: "not_run",
    disk: "not_run",
    docker: "not_run",
    telegram: "blocked"
  },
  a2aQueue: {
    path: "/Users/sirinx/sirinx-os/vault/a2a/soc",
    itemCount: 0,
    status: "local-only"
  },
  telegram: {
    status: "blocked-api-offline",
    canSend: false,
    checkedCount: 0,
    requiredCount: 0,
    nextAction: "Start the local control API before inspecting Telegram evidence."
  },
  installPack: {
    status: "planned-local-only",
    macLocal: "Start local control API",
    ubuntuDocker: "planned after local dry-run",
    externalSend: "blocked"
  },
  nextActions: ["Start the local control API and refresh SOC status."]
};

const fallbackTruthProtocol = {
  status: "unavailable",
  mode: "local-fallback",
  externalWrites: false,
  productionWrites: false,
  customerVisible: false,
  claimStates: ["observed", "template", "blocked", "not_run"],
  reportRules: [
    {
      id: "fallback",
      label: "Truth protocol unavailable",
      requiredState: "not_run",
      rule: "Start the local control API to inspect report rules."
    }
  ],
  corrections: [],
  stopPoint: "TRUTH PROTOCOL WAITING FOR LOCAL API"
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

const fallbackExternalGateEvidence = {
  status: "unavailable",
  mode: "local-fallback",
  externalWrites: false,
  productionWrites: false,
  customerVisible: false,
  canExecuteExternally: false,
  evidenceRoot: "/Users/sirinx/sirinx-os/docs/knowledge/external-gates/evidence",
  summary: {
    gates: 0,
    ready: 0,
    blocked: 1,
    missingEvidenceFiles: 0,
    incomplete: 1,
    unsafe: 0,
    checkedItems: 0,
    requiredItems: 0
  },
  results: [
    {
      id: "fallback",
      title: "External gate evidence unavailable",
      owner: "shogun",
      status: "blocked-api-offline",
      ready: false,
      unsafe: false,
      checkedCount: 0,
      requiredCount: 0,
      missingCount: 0,
      nextAction: "Start the local control API to inspect evidence readiness."
    }
  ],
  nextActions: ["Start the local control API and refresh external gate evidence."]
};

const fallbackExternalGateRunner = {
  status: "unavailable",
  mode: "local-fallback",
  externalWrites: false,
  productionWrites: false,
  customerVisible: false,
  canExecuteNow: false,
  summary: {
    gates: 0,
    readyForHumanReview: 0,
    blocked: 1,
    unsafe: 0,
    externalWrites: false,
    executableNow: 0
  },
  runs: [
    {
      id: "fallback",
      title: "External gate runner unavailable",
      lane: "shogun",
      status: "blocked-api-offline",
      localChecks: ["Start the local control API"],
      blockedExternalActions: ["all external actions"],
      operatorNextStep: "Start the local control API to inspect runner readiness.",
      canExecuteNow: false,
      externalWrites: false
    }
  ],
  nextActions: ["Start the local control API and refresh external gate runner readiness."]
};

const fallbackPendingWork = {
  status: "unavailable",
  mode: "local-fallback",
  externalWrites: false,
  productionWrites: false,
  customerVisible: false,
  canExecuteNow: false,
  mainWebsiteProtected: true,
  summary: {
    pendingItems: 0,
    blockedExternalGates: 1,
    readyForHumanReview: 0,
    unsafeEvidence: 0,
    localOnlyRunnable: 0,
    hiddenBacklog: false,
    externalWrites: false,
    executableNow: 0
  },
  pendingItems: [
    {
      id: "fallback",
      part: 1,
      title: "Pending work ledger unavailable",
      lane: "shogun",
      status: "blocked-api-offline",
      checkedCount: 0,
      requiredCount: 0,
      nextAction: "Start the local control API to inspect the current pending work queue.",
      canExecuteNow: false,
      externalWrites: false
    }
  ],
  nextActions: ["Start the local control API and refresh the pending work ledger."]
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

function renderVibeCodingAgent(agent) {
  const data = agent || fallbackVibeCodingAgent;
  const ready = data.status === "local-agent-ready";

  vibeAgentStatus.textContent = ready ? "Agent local ready" : data.status || "Agent blocked";
  vibeAgentStatus.classList.remove("status-safe", "status-warn", "status-lock");
  vibeAgentStatus.classList.add(ready ? "status-safe" : "status-warn");

  vibeAgentSummary.replaceChildren(
    makeSummaryCard("Mode", data.mode || "local-only", data.externalWrites ? "external writes armed" : "external writes blocked"),
    makeSummaryCard("Safe Actions", `${data.summary?.safeActions || 0}`, "local commands"),
    makeSummaryCard("Blocked Gates", `${data.summary?.blockedExternalGates || 0}`, "evidence incomplete"),
    makeSummaryCard("Human Review", `${data.summary?.readyForHumanReview || 0}`, "not executable"),
    makeSummaryCard("External Exec", `${data.summary?.executableExternalActions || 0}`, "always zero before approval"),
    makeSummaryCard("Truth", data.summary?.truthProtocol || "unknown", data.summary?.socStatus || "unknown")
  );

  renderSignalList(
    vibeAgentSafeActions,
    (data.safeActions?.length ? data.safeActions : fallbackVibeCodingAgent.safeActions).map((action) => ({
      title: action.title,
      detail: `${action.command} - ${action.evidence || "local-only"}`,
      ok: action.externalWrites === false && action.approvalRequired === false,
      badge: action.lane || "local"
    }))
  );

  renderSignalList(
    vibeAgentBlockedGates,
    (data.blockedGates || fallbackVibeCodingAgent.blockedGates).map((gate) => ({
      title: gate.title,
      detail: `${gate.nextAction || "Evidence required."} (${gate.missingCount || 0}/${gate.requiredCount || 0} missing)`,
      ok: false,
      badge: gate.status || "blocked"
    }))
  );

  const reviewRows = data.reviewQueue?.length
    ? data.reviewQueue.map((item) => ({
        title: item.title,
        detail: item.nextAction,
        ok: item.canExecuteNow === false,
        badge: item.status
      }))
    : [
        {
          title: "No external gate ready",
          detail: "Complete non-secret evidence first; execution remains blocked.",
          ok: true,
          badge: "local-only"
        }
      ];
  renderSignalList(vibeAgentReviewQueue, reviewRows);

  renderSignalList(vibeAgentApprovalPacket, [
    {
      title: "Approval packet",
      detail: data.approvalPacket?.nextRequiredApproval || "Human approval required before any external action.",
      ok: data.externalWrites === false,
      badge: data.approvalPacket?.status || "blocked"
    },
    {
      title: "Stop point",
      detail: data.approvalPacket?.stopPoint || fallbackVibeCodingAgent.approvalPacket.stopPoint,
      ok: data.canExecuteExternally === false,
      badge: data.canExecuteExternally ? "armed" : "stopped"
    }
  ]);
}

function renderConnectorPanel() {
  const gateway = connectorPanelState.gateway || fallbackGatewayAgent;
  const aiTeam = connectorPanelState.aiTeam || fallbackAiTeamPairing;
  const registry = connectorPanelState.registry || fallbackConnectorRegistry;
  const summary = registry.summary || fallbackConnectorRegistry.summary;
  const ready = registry.status === "local-connector-registry-ready";
  const pairedRoles = aiTeam.summary?.pairedRoles || gateway.summary?.pairedAiRoles || gateway.summary?.rosterRoles || 0;
  const connectorRows = registry.connectors?.length ? registry.connectors : fallbackConnectorRegistry.connectors;
  const ownerRows = registry.ownerPackets?.length ? registry.ownerPackets : fallbackConnectorRegistry.ownerPackets;
  const blockedActions = registry.blockedActions?.length
    ? registry.blockedActions
    : gateway.blockedActions?.length
      ? gateway.blockedActions
      : fallbackConnectorRegistry.blockedActions;

  connectorPanelStatus.textContent = ready ? "Registry local ready" : "Registry blocked";
  connectorPanelStatus.classList.remove("status-safe", "status-warn", "status-lock");
  connectorPanelStatus.classList.add(ready ? "status-safe" : "status-warn");

  connectorPanelSummary.replaceChildren(
    makeSummaryCard("Connectors", `${summary.connectorsTotal || 0}`, "registered local capabilities"),
    makeSummaryCard("Owner Lanes", `${summary.ownerLanes || 0}`, "7-lane routing target"),
    makeSummaryCard("Ronin Roles", `${pairedRoles}`, "inherited visibility"),
    makeSummaryCard("Activatable", `${summary.activatableConnectors || 0}`, "must stay zero"),
    makeSummaryCard("MCP", registry.canRunMcp ? "Armed" : "Locked", "real MCP blocked"),
    makeSummaryCard("Messages", aiTeam.canSendMessages ? "Armed" : "Locked", "Telegram/LINE blocked")
  );

  connectorStopPoint.textContent =
    registry.stopPoint ||
    gateway.approvalPacket?.stopPoint ||
    "CONNECTOR REGISTRY READY LOCAL-ONLY - WAITING FOR HUMAN APPROVAL";

  renderSignalList(
    connectorOwnerList,
    ownerRows.map((packet) => ({
      title: packet.owner,
      detail: `${packet.connectorCount || packet.connectors?.length || 0} connector(s): ${(packet.connectors || []).join(", ")}`,
      ok: packet.canActivate === false,
      badge: "LOCKED / LOCAL-ONLY"
    }))
  );

  renderSignalList(
    connectorList,
    connectorRows.map((connector) => ({
      title: connector.title,
      detail: `${connector.owner} - ${connector.capability || connector.nextExactStep || "local capability context only"}`,
      ok:
        connector.externalWrites === false &&
        connector.canActivate === false &&
        connector.canRunMcp === false &&
        connector.canReadSecrets === false,
      badge: "LOCKED / LOCAL-ONLY"
    }))
  );

  renderSignalList(
    connectorGateList,
    blockedActions.map((action) => ({
      title: action,
      detail: "Blocked until evidence and exact human approval exist.",
      ok: false,
      badge: "blocked"
    }))
  );
}

function renderAgentLaunchGate(status) {
  const data = status || fallbackAgentLaunchGate;
  const ready = data.status === "local-launch-gate-ready";
  const summary = data.summary || fallbackAgentLaunchGate.summary;
  const agents = data.agents?.length ? data.agents : fallbackAgentLaunchGate.agents;
  const blockedActions = data.blockedActions?.length ? data.blockedActions : fallbackAgentLaunchGate.blockedActions;
  const hermesRule = data.hermesContextRule || fallbackAgentLaunchGate.hermesContextRule;

  agentLaunchStatus.textContent = ready ? "Launch gate local ready" : data.status || "Launch gate blocked";
  agentLaunchStatus.classList.remove("status-safe", "status-warn", "status-lock");
  agentLaunchStatus.classList.add(ready ? "status-safe" : "status-warn");

  agentLaunchSummary.replaceChildren(
    makeSummaryCard("Agents", `${summary.agentsTotal || 0}`, "Ollama launch commands"),
    makeSummaryCard("Manual Only", `${summary.manualOnly || 0}`, "auto execution disabled"),
    makeSummaryCard("Auto Exec", `${summary.autoExecutable || 0}`, "must stay zero"),
    makeSummaryCard("Hermes", hermesRule.status || "unknown", `${hermesRule.observedContextWindow || 0}/${hermesRule.requiredContextWindow || 64000}`),
    makeSummaryCard("MCP", data.canRunMcp ? "Armed" : "Locked", "real MCP blocked"),
    makeSummaryCard("Secrets", data.canReadSecrets ? "Readable" : "Blocked", "no secret reads")
  );

  agentLaunchStopPoint.textContent = data.stopPoint || fallbackAgentLaunchGate.stopPoint;

  renderSignalList(
    agentLaunchCommandList,
    agents.map((agent) => ({
      title: `${agent.title} — ${agent.command}`,
      detail: `${agent.role || "local-agent"}; ${agent.recommendedFirstTest || "Manual smoke only."}`,
      ok:
        agent.autoExecute === false &&
        agent.canLaunchAutomatically === false &&
        agent.canExecuteNow === false &&
        agent.externalWrites === false,
      badge: (agent.badges || ["manual-only"]).join(" / ")
    }))
  );

  renderSignalList(agentLaunchHealthList, [
    {
      title: "Hermes context rule",
      detail: `Observed ${hermesRule.observedContextWindow || 0}; required ${hermesRule.requiredContextWindow || 64000}.`,
      ok: hermesRule.status !== "blocked-context-too-small",
      badge: hermesRule.status || "unknown"
    },
    {
      title: "Recommended first smoke",
      detail: (summary.recommendedManualSmokeCandidates || []).join(", ") || "Codex App / Codex after API readiness",
      ok: data.canLaunchAgents === false,
      badge: "manual-only"
    }
  ]);

  renderSignalList(
    agentLaunchBlockedList,
    blockedActions.map((action) => ({
      title: action,
      detail: "Blocked by local-only launch gate until manual smoke approval exists.",
      ok: false,
      badge: "blocked"
    }))
  );
}

function renderAgentDriver(status) {
  const data = status || fallbackAgentDriver;
  const ready = data.status === "agent-driver-ready-local-only";
  const summary = data.summary || fallbackAgentDriver.summary;
  const classifications = summary.classifications || fallbackAgentDriver.summary.classifications;
  const agents = data.agents?.length ? data.agents : fallbackAgentDriver.agents;
  const blockedActions = data.blockedActions?.length ? data.blockedActions : fallbackAgentDriver.blockedActions;
  const evidence = data.evidence || fallbackAgentDriver.evidence;
  const nextAgent = data.nextRecommendedAgent;

  agentDriverStatus.textContent = ready ? "Agent driver local ready" : data.status || "Agent driver blocked";
  agentDriverStatus.classList.remove("status-safe", "status-warn", "status-lock");
  agentDriverStatus.classList.add(ready ? "status-safe" : "status-warn");

  agentDriverSummary.replaceChildren(
    makeSummaryCard("Agents", `${summary.agentsTotal || 0}`, "Launch Gate mapped"),
    makeSummaryCard("Passed", `${classifications.passed || 0}`, "read-only smoke"),
    makeSummaryCard("Side Effect", `${classifications.side_effectful || 0}`, "manual direct checks"),
    makeSummaryCard("Needs Install", `${classifications.needs_install || 0}`, "install blocked"),
    makeSummaryCard("Executed", `${summary.commandExecuted || 0}`, "must stay zero"),
    makeSummaryCard("Next", nextAgent?.id || "none", "safe target")
  );

  agentDriverStopPoint.textContent = data.stopPoint || fallbackAgentDriver.stopPoint;

  renderSignalList(
    agentDriverLaneList,
    agents.map((agent) => ({
      title: `${agent.title} — ${agent.classification}`,
      detail: `${agent.approvedReadOnlyCommand || "no approved command"}; ${agent.notes || "Local-only dry-run lane."}`,
      ok:
        agent.commandExecuted === false &&
        agent.canEditFiles === false &&
        agent.canStartMcp === false &&
        agent.canInstallPackages === false &&
        agent.canSendMessages === false &&
        agent.canDeploy === false &&
        agent.classification !== "blocked" &&
        agent.classification !== "side_effectful",
      badge: (agent.badges || [agent.classification || "blocked"]).join(" / ")
    }))
  );

  renderSignalList(agentDriverEvidenceList, [
    {
      title: "Evidence path",
      detail: evidence.path || "docs/knowledge/SIRINX_AGENT_DRIVER_V1.md",
      ok: ready,
      badge: evidence.currentState || "local-docs"
    },
    {
      title: "API evidence writes",
      detail: evidence.apiWritesEvidence ? "API writes enabled" : "API writes blocked; dry-run returns packet only.",
      ok: evidence.apiWritesEvidence === false,
      badge: "dry-run-only"
    },
    {
      title: "Recommended order",
      detail: (data.recommendedOrder || []).map((agent) => agent.id).join(" → ") || "codex → claude-code → hermes-agent",
      ok: ready,
      badge: "manual-smoke"
    }
  ]);

  renderSignalList(
    agentDriverBlockedList,
    blockedActions.map((action) => ({
      title: action,
      detail: "Blocked by Agent Driver until separate explicit approval exists.",
      ok: false,
      badge: "blocked"
    }))
  );
}

function renderCenterBrainHub(status) {
  const data = status || fallbackCenterBrainHub;
  const ready = data.status === "centerbrain-hub-ready-local-only";
  const summary = data.summary || fallbackCenterBrainHub.summary;
  const aiNodes = data.aiNodes?.length ? data.aiNodes : fallbackCenterBrainHub.aiNodes;
  const deviceNodes = data.deviceNodes || [];
  const stackLanes = data.stackLanes?.length ? data.stackLanes : fallbackCenterBrainHub.stackLanes;
  const blockedActions = data.blockedActions?.length ? data.blockedActions : fallbackCenterBrainHub.blockedActions;

  centerBrainStatus.textContent = ready ? "CenterBrain local ready" : data.status || "CenterBrain blocked";
  centerBrainStatus.classList.remove("status-safe", "status-warn", "status-lock");
  centerBrainStatus.classList.add(ready ? "status-safe" : "status-warn");

  centerBrainSummary.replaceChildren(
    makeSummaryCard("AI Nodes", `${summary.aiNodes || 0}`, "Agent Driver mapped"),
    makeSummaryCard("Devices", `${summary.deviceNodes || 0}`, "Mac / PC / Mobile"),
    makeSummaryCard("Connectors", `${summary.connectorLanes || 0}`, "registered local-only"),
    makeSummaryCard("Stacks", `${summary.stackLanes || 0}`, "Next.js / Tailwind / Go"),
    makeSummaryCard("Live Actions", `${summary.liveExternalActions || 0}`, "must stay zero"),
    makeSummaryCard("Handshake", data.syncContract?.handshake?.length || 0, "A2A2 stages")
  );

  centerBrainStopPoint.textContent = data.stopPoint || fallbackCenterBrainHub.stopPoint;

  renderSignalList(
    centerBrainNodeList,
    [
      ...aiNodes.slice(0, 5).map((node) => ({
        title: `${node.title} — ${node.status || node.classification}`,
        detail: `${node.approvedReadOnlyCommand || "local status only"}; source=${node.source || "centerbrain"}`,
        ok:
          node.canRunMcp === false &&
          node.canSendMessages === false &&
          node.canDeploy === false &&
          node.status !== "side_effectful",
        badge: node.classification || node.status || "local-only"
      })),
      ...deviceNodes.map((node) => ({
        title: `${node.title} — ${node.status}`,
        detail: `${node.purpose} ${node.nextExactStep || ""}`,
        ok: node.id === "mac",
        badge: node.syncMode || "planned"
      }))
    ]
  );

  renderSignalList(
    centerBrainStackList,
    stackLanes.map((lane) => ({
      title: `${lane.title} — ${lane.status}`,
      detail: `${lane.purpose} ${lane.nextExactStep || ""}`,
      ok: lane.id === "local-api" || lane.id === "a2a2-sync" || lane.id === "html" || lane.id === "javascript",
      badge: lane.id
    }))
  );

  renderSignalList(
    centerBrainBlockedList,
    blockedActions.map((action) => ({
      title: action,
      detail: "Blocked until a separate explicit approval creates an activation packet.",
      ok: false,
      badge: "blocked"
    }))
  );
}

function renderTeamRuntimeBridge(status) {
  const data = status || fallbackTeamRuntimeBridge;
  const ready = data.status === "team-runtime-bridge-ready-local-only";
  const summary = data.summary || fallbackTeamRuntimeBridge.summary;
  const runtimeLanes = data.runtimeLanes?.length ? data.runtimeLanes : fallbackTeamRuntimeBridge.runtimeLanes;
  const modelLanes = data.modelLanes?.length ? data.modelLanes : fallbackTeamRuntimeBridge.modelLanes;
  const blockedActions = data.blockedActions?.length ? data.blockedActions : fallbackTeamRuntimeBridge.blockedActions;

  teamRuntimeStatus.textContent = ready ? "Team runtime bridge ready" : data.status || "Team runtime blocked";
  teamRuntimeStatus.classList.remove("status-safe", "status-warn", "status-lock");
  teamRuntimeStatus.classList.add(ready ? "status-safe" : "status-warn");

  teamRuntimeSummary.replaceChildren(
    makeSummaryCard("Runtime Lanes", `${summary.runtimeLanes || 0}`, "Codex / Hermes / Qwen / Antigravity / A2A2A"),
    makeSummaryCard("Cloud Models", `${summary.cloudModelLanes || 0}`, "OpenRouter model lanes"),
    makeSummaryCard("Paid API Exec", `${summary.paidApiExecutable || 0}`, "must stay zero"),
    makeSummaryCard("Antigravity Exec", `${summary.antigravityExecutable || 0}`, "manual watch only"),
    makeSummaryCard("Hermes 64k", summary.hermesRoutingReady ? "Ready" : "Blocked", "context gate"),
    makeSummaryCard("Local Qwen", `${summary.localModelsObserved || 0}`, "observed fallback models")
  );

  teamRuntimeStopPoint.textContent = data.stopPoint || fallbackTeamRuntimeBridge.stopPoint;

  renderSignalList(
    teamRuntimeLaneList,
    runtimeLanes.map((lane) => ({
      title: `${lane.title} — ${lane.status}`,
      detail: `${lane.role || "runtime lane"}; ${lane.nextExactStep || "Local-only dry-run lane."}`,
      ok:
        lane.autoExecute === false &&
        lane.externalWrites === false &&
        lane.canExecuteNow === false &&
        lane.canRunMcp === false,
      badge: lane.id
    }))
  );

  renderSignalList(
    teamRuntimeModelList,
    modelLanes.map((lane) => ({
      title: `${lane.title} — ${lane.modelId}`,
      detail: `${lane.provider}; ${lane.allowedUse || lane.status || "approval required"}`,
      ok:
        lane.canCallProvider === false &&
        lane.canReadApiKey === false &&
        lane.autoExecute === false &&
        lane.commandExecuted === false,
      badge: lane.status || lane.provider
    }))
  );

  renderSignalList(
    teamRuntimeBlockedList,
    blockedActions.map((action) => ({
      title: action,
      detail: "Blocked until a separate model-routing or CLI activation approval exists.",
      ok: false,
      badge: "blocked"
    }))
  );
}

function renderOpenRouterQwenAdapter(status) {
  const data = status || fallbackOpenRouterQwenAdapter;
  const ready = data.status === "openrouter-qwen-adapter-ready-local-only";
  const model = data.model || fallbackOpenRouterQwenAdapter.model;
  const defaultPolicy = data.defaultPolicy || fallbackOpenRouterQwenAdapter.defaultPolicy;
  const sensitivePolicy = data.sensitivePolicy || fallbackOpenRouterQwenAdapter.sensitivePolicy;
  const jsonPolicy = data.jsonPolicy || fallbackOpenRouterQwenAdapter.jsonPolicy;
  const promptCachingPolicy = data.promptCachingPolicy || fallbackOpenRouterQwenAdapter.promptCachingPolicy;
  const blockedActions = data.blockedActions?.length ? data.blockedActions : fallbackOpenRouterQwenAdapter.blockedActions;

  openRouterQwenAdapterStatus.textContent = ready ? "Adapter ready" : data.status || "Adapter blocked";
  openRouterQwenAdapterStatus.classList.remove("status-safe", "status-warn", "status-lock");
  openRouterQwenAdapterStatus.classList.add(ready ? "status-safe" : "status-warn");

  openRouterQwenAdapterSummary.replaceChildren(
    makeSummaryCard("Primary", model.primary || "unknown", "OpenRouter"),
    makeSummaryCard("Fallback", model.fallback || "unknown", "models array"),
    makeSummaryCard("Paid API", data.canCallPaidApi ? "Allowed" : "Blocked", "approval required"),
    makeSummaryCard("Provider Call", data.providerCalled ? "Executed" : "No", "dry-run only"),
    makeSummaryCard("Secrets", data.secretsRead ? "Read" : "Not read", "server-side only")
  );

  renderSignalList(openRouterQwenAdapterPolicyList, [
    {
      title: "JSON strict output",
      detail: `response_format=${JSON.stringify(jsonPolicy.response_format || { type: "json_object" })}`,
      ok: true,
      badge: "response_format"
    },
    {
      title: "Sensitive routing",
      detail: `provider.zdr=${sensitivePolicy.provider?.zdr === true}; applies=${(sensitivePolicy.appliesTo || []).join(", ")}`,
      ok: true,
      badge: "provider.zdr"
    },
    {
      title: "Prompt caching",
      detail: `${promptCachingPolicy.mode || "explicit-cache-control-preview-only"}; rejects ${(promptCachingPolicy.rejected || []).join(", ")}`,
      ok: true,
      badge: "explicit-cache-control"
    },
    {
      title: "Endpoint",
      detail: `${data.endpoint || fallbackOpenRouterQwenAdapter.endpoint}; provider calls stay blocked`,
      ok: data.providerCalled === false && data.commandExecuted === false,
      badge: "local-only"
    }
  ]);

  renderSignalList(
    openRouterQwenAdapterBlockedList,
    blockedActions.map((action) => ({
      title: action,
      detail: "Blocked until separate model-routing approval creates a non-dry-run path.",
      ok: false,
      badge: "blocked"
    }))
  );
}

function renderModelRoutingApproval(status) {
  const data = status || fallbackModelRoutingApproval;
  const ready = data.status === "openrouter-qwen-model-routing-approval-ready-local-only";
  const evidenceChecklist = data.evidenceChecklist?.length
    ? data.evidenceChecklist
    : fallbackModelRoutingApproval.evidenceChecklist;
  const blockedActions = data.blockedActions?.length ? data.blockedActions : fallbackModelRoutingApproval.blockedActions;

  modelRoutingApprovalStatus.textContent = ready ? "Approval ready" : data.status || "Approval blocked";
  modelRoutingApprovalStatus.classList.remove("status-safe", "status-warn", "status-lock");
  modelRoutingApprovalStatus.classList.add(ready ? "status-safe" : "status-warn");

  modelRoutingApprovalSummary.replaceChildren(
    makeSummaryCard("Model", data.modelSlugLocked || "unknown", "slug locked"),
    makeSummaryCard("Fallback", data.fallbackSlugLocked || "unknown", "slug locked"),
    makeSummaryCard("Paid API", data.canCallPaidApi ? "Allowed" : "Blocked", "no credit spend"),
    makeSummaryCard("Provider Call", data.providerCalled ? "Executed" : "No", "not taken"),
    makeSummaryCard("Key Value", data.keyValuePrinted ? "Printed" : "Hidden", "never print")
  );

  renderSignalList(
    modelRoutingApprovalEvidenceList,
    evidenceChecklist.map((item) => ({
      title: `${item.id} — ${item.status}`,
      detail: `${item.label || item.id}; ${item.evidence || data.approvalPacket?.path || ""}`,
      ok: item.status === "passed",
      badge: item.id
    }))
  );

  renderSignalList(
    modelRoutingApprovalBlockedList,
    blockedActions.map((action) => ({
      title: action,
      detail: "Blocked until a separate explicit provider-smoke approval exists.",
      ok: false,
      badge: "blocked"
    }))
  );
}

function renderAdaptiveCommandGateway(status) {
  const data = status || fallbackAdaptiveCommandGateway;
  const ready = data.status === "hermes-adaptive-command-gateway-ready-local-only";
  const commandRegistry = data.commandRegistry?.length
    ? data.commandRegistry
    : fallbackAdaptiveCommandGateway.commandRegistry;
  const modelPolicy = data.modelPolicy || fallbackAdaptiveCommandGateway.modelPolicy;
  const queuePolicy = data.queuePolicy || fallbackAdaptiveCommandGateway.queuePolicy;
  const latencyControl = data.latencyControl || fallbackAdaptiveCommandGateway.latencyControl;
  const blockedActions = data.blockedActions?.length ? data.blockedActions : fallbackAdaptiveCommandGateway.blockedActions;

  adaptiveCommandGatewayStatus.textContent = ready ? "Adaptive gateway ready" : data.status || "Gateway blocked";
  adaptiveCommandGatewayStatus.classList.remove("status-safe", "status-warn", "status-lock");
  adaptiveCommandGatewayStatus.classList.add(ready ? "status-safe" : "status-warn");

  adaptiveCommandGatewaySummary.replaceChildren(
    makeSummaryCard("Fast ACK", latencyControl.fastAck ? "On" : "Off", `${latencyControl.ackTimeoutMs || 1200}ms target`),
    makeSummaryCard("Queue", queuePolicy.backend || "sqlite", queuePolicy.persistedByDryRun ? "writes enabled" : "dry-run only"),
    makeSummaryCard("Router", modelPolicy.router?.model || "unknown", `${modelPolicy.router?.maxTokens || 512} max tokens`),
    makeSummaryCard("Planner", modelPolicy.planner?.model || "unknown", `${modelPolicy.planner?.contextLength || 0} context`),
    makeSummaryCard("Telegram Send", data.messageSent ? "Sent" : "Blocked", "status-only panel"),
    makeSummaryCard("Provider Call", data.providerCalled ? "Called" : "Blocked", "approval required")
  );

  adaptiveCommandGatewayStopPoint.textContent = data.stopPoint || fallbackAdaptiveCommandGateway.stopPoint;

  renderSignalList(
    adaptiveCommandGatewayCommandList,
    commandRegistry.slice(0, 8).map((command) => ({
      title: command,
      detail:
        command === "/clear"
          ? "Alias to /reset; fast ACK only."
          : command.includes("mission") || command.includes("hermes")
            ? "Parsed into job or approval intent; no worker execution in v0.2."
            : "Local command parser lane.",
      ok: true,
      badge: command === "/clear" ? "alias" : "parser"
    }))
  );

  renderSignalList(
    adaptiveCommandGatewayModelList,
    Object.entries(modelPolicy).map(([lane, model]) => ({
      title: `${lane} — ${model.model || "unknown"}`,
      detail: `${model.provider || "local"}; context=${model.contextLength || "n/a"}; maxTokens=${model.maxTokens || "n/a"}`,
      ok: lane === "router" || Number(model.contextLength || 0) >= 64000,
      badge: lane
    }))
  );

  renderSignalList(
    adaptiveCommandGatewayBlockedList,
    blockedActions.map((action) => ({
      title: action,
      detail: "Blocked by Telegram gateway v0.2 dry-run contract until a separate approval opens an execution path.",
      ok: false,
      badge: "blocked"
    }))
  );
}

function renderHermesSpecFirstSwarm(status) {
  const data = status || fallbackSpecFirstSwarm;
  const ready = data.status === "hermes-spec-first-swarm-ready-live-local-state";
  const requiredFiles = data.requiredFiles?.length ? data.requiredFiles : fallbackSpecFirstSwarm.requiredFiles;
  const agentRoles = data.agentRoles?.length ? data.agentRoles : fallbackSpecFirstSwarm.agentRoles;
  const blockedActions = data.blockedActions?.length ? data.blockedActions : fallbackSpecFirstSwarm.blockedActions;

  specFirstSwarmStatus.textContent = ready ? "Spec-first state ready" : data.status || "Spec-first blocked";
  specFirstSwarmStatus.classList.remove("status-safe", "status-warn", "status-lock");
  specFirstSwarmStatus.classList.add(ready ? "status-safe" : "status-warn");

  specFirstSwarmSummary.replaceChildren(
    makeSummaryCard("Phase", data.currentPhase || "unknown", "current workflow"),
    makeSummaryCard("Approval", data.approvalStatus || "unknown", data.approvalPhrase || "APPROVE_IMPLEMENTATION"),
    makeSummaryCard("Files", `${requiredFiles.filter((file) => file.exists).length}/${requiredFiles.length}`, "source of truth"),
    makeSummaryCard("Roles", `${agentRoles.length || 0}`, "swarm lanes"),
    makeSummaryCard("Source Edit", data.canModifySource ? "Allowed" : "Blocked", "requires approval"),
    makeSummaryCard("Executed", data.commandExecuted ? "Yes" : "No", "status-only API")
  );

  specFirstSwarmStopPoint.textContent = data.stopPoint || fallbackSpecFirstSwarm.stopPoint;

  renderSignalList(
    specFirstSwarmFileList,
    requiredFiles.map((file) => ({
      title: file.path,
      detail: file.exists ? "present in live local state" : "missing or API offline",
      ok: file.exists === true,
      badge: file.exists ? "present" : "missing"
    }))
  );

  renderSignalList(
    specFirstSwarmRoleList,
    agentRoles.map((role) => ({
      title: role.title || role.id,
      detail: `${role.owns || "workflow lane"}; blocked=${(role.blocked || []).join(", ") || "none"}`,
      ok: role.id !== "api-offline",
      badge: role.id
    }))
  );

  renderSignalList(
    specFirstSwarmBlockedList,
    blockedActions.map((action) => ({
      title: action,
      detail: "Blocked until context, spec, approval, test evidence, and a later implementation lane allow it.",
      ok: false,
      badge: "blocked"
    }))
  );
}

function renderLocalRag(status) {
  const data = status || fallbackLocalRag;
  const ready = data.status === "local-rag-prototype-ready";
  const dependency = data.dependency || fallbackLocalRag.dependency;
  const turbovec = dependency.turbovec || fallbackLocalRag.dependency.turbovec;
  const pythonWorker = dependency.pythonWorker || fallbackLocalRag.dependency.pythonWorker;
  const corpusScope = data.corpusScope || fallbackLocalRag.corpusScope;
  const summary = data.summary || fallbackLocalRag.summary;
  const blockedActions = data.blockedActions?.length ? data.blockedActions : fallbackLocalRag.blockedActions;

  localRagStatus.textContent = ready ? "RAG local ready" : data.status || "RAG blocked";
  localRagStatus.classList.remove("status-safe", "status-warn", "status-lock");
  localRagStatus.classList.add(ready ? "status-safe" : "status-warn");

  localRagSummary.replaceChildren(
    makeSummaryCard("Corpus", "Full Repo", corpusScope.id || "safe text"),
    makeSummaryCard("Index", summary.optionalVectorIndex || "turbovec", `optional: ${turbovec.status || "unknown"}`),
    makeSummaryCard("Embeddings", summary.embeddingBackend || "fixture", "local deterministic"),
    makeSummaryCard("Paid API", data.canCallPaidApi ? "Armed" : "Locked", "external embeddings blocked"),
    makeSummaryCard("MCP", data.canRunMcp ? "Armed" : "Locked", "real MCP blocked"),
    makeSummaryCard("Secrets", data.canReadSecrets ? "Readable" : "Blocked", "no secret reads")
  );

  localRagStopPoint.textContent = data.stopPoint || fallbackLocalRag.stopPoint;

  renderSignalList(localRagCorpusList, [
    {
      title: corpusScope.id || "full-repo-safe-text",
      detail: `${corpusScope.title || "Full Repo Safe Text"} - ${corpusScope.projectRoot || "local repo"}`,
      ok: data.externalWrites === false && data.canReadSecrets === false,
      badge: "LOCKED / LOCAL-ONLY"
    },
    {
      title: "Include",
      detail: (corpusScope.include || []).join(", ") || "safe text files",
      ok: true,
      badge: "safe text"
    },
    {
      title: "Exclude",
      detail: (corpusScope.exclude || []).join(", ") || "secrets and generated output",
      ok: true,
      badge: "guarded"
    }
  ]);

  renderSignalList(localRagDependencyList, [
    {
      title: "turbovec",
      detail: `${turbovec.status || "unknown"} - ${turbovec.installHint || "optional local Python dependency"}`,
      ok: turbovec.status === "available" || turbovec.optional === true,
      badge: turbovec.status || "optional"
    },
    {
      title: "Python worker",
      detail: `${pythonWorker.status || "optional"} - ${pythonWorker.path || "tools/local-rag/turbovec_worker.py"}`,
      ok: true,
      badge: "optional"
    }
  ]);

  renderSignalList(
    localRagBlockedList,
    blockedActions.map((action) => ({
      title: action,
      detail: "Blocked by the local RAG contract until evidence and exact human approval exist.",
      ok: false,
      badge: "blocked"
    }))
  );
}

function renderHermesImageEdit(status) {
  const data = status || fallbackHermesImageEdit;
  const ready = data.status === "ready-local-only";
  const summary = data.summary || fallbackHermesImageEdit.summary;
  const toolContract = data.toolContract || fallbackHermesImageEdit.toolContract;
  const validUsage = data.validUsage?.length ? data.validUsage : fallbackHermesImageEdit.validUsage;
  const invalidUsage = data.invalidUsage?.length ? data.invalidUsage : fallbackHermesImageEdit.invalidUsage;
  const blockedActions = data.blockedActions?.length ? data.blockedActions : fallbackHermesImageEdit.blockedActions;
  const acceptancePacket = data.acceptancePacket || fallbackHermesImageEdit.acceptancePacket;
  const providerCheck = acceptancePacket.providerCapabilityCheck || fallbackHermesImageEdit.acceptancePacket.providerCapabilityCheck;
  const restartChecklist =
    acceptancePacket.gatewayRestartChecklist || fallbackHermesImageEdit.acceptancePacket.gatewayRestartChecklist;
  const evidenceFields = acceptancePacket.evidenceFields?.length
    ? acceptancePacket.evidenceFields
    : fallbackHermesImageEdit.acceptancePacket.evidenceFields;

  imageEditStatus.textContent = ready ? "Image edit local ready" : data.status || "Image edit blocked";
  imageEditStatus.classList.remove("status-safe", "status-warn", "status-lock");
  imageEditStatus.classList.add(ready ? "status-safe" : "status-warn");

  imageEditSummary.replaceChildren(
    makeSummaryCard("Image Edit", summary.imageEdit ? "True" : "False", toolContract.tool || "image_edit"),
    makeSummaryCard("Caption", summary.captionRequired ? "Required" : "Optional", "same image message"),
    makeSummaryCard("Fallback", summary.fallbackTextToImageBlocked ? "Blocked" : "Allowed", "no text-to-image"),
    makeSummaryCard("Provider", data.providerMustSupportEdit ? "Must Edit" : "Unknown", "fail closed"),
    makeSummaryCard(
      "Acceptance",
      summary.acceptancePacketReady || acceptancePacket.status === "acceptance-packet-ready-local-only" ? "Ready" : "Local",
      acceptancePacket.provider_edit_capability || acceptancePacket.providerEditCapability || "needs_manual_probe"
    ),
    makeSummaryCard("MCP", data.canRunMcp ? "Armed" : "Locked", "real MCP blocked"),
    makeSummaryCard("Secrets", data.canReadSecrets ? "Readable" : "Blocked", "no secret reads")
  );

  imageEditStopPoint.textContent = data.stopPoint || fallbackHermesImageEdit.stopPoint;

  renderSignalList(imageEditContractList, [
    {
      title: toolContract.tool || "image_edit",
      detail: `required: ${(toolContract.required || []).join(", ")}; optional: ${(toolContract.optional || []).join(", ")}`,
      ok: data.externalWrites === false && data.canExecuteExternally === false,
      badge: "LOCKED / LOCAL-ONLY"
    },
    ...validUsage.map((item) => ({
      title: item,
      detail: "Required for true image-to-image editing.",
      ok: true,
      badge: "required"
    }))
  ]);

  renderSignalList(imageEditAcceptanceList, [
    {
      title: "patch_ready",
      detail: acceptancePacket.patch_ready || acceptancePacket.patchReady ? "Hermes image-edit patch is ready for local acceptance." : "Patch is not ready.",
      ok: Boolean(acceptancePacket.patch_ready || acceptancePacket.patchReady),
      badge: "packet"
    },
    {
      title: "gateway_restart_required",
      detail: restartChecklist.autoRestart
        ? "Auto restart is not allowed in this phase."
        : "Manual restart checklist is present; auto-restart remains blocked.",
      ok: restartChecklist.required === true && restartChecklist.autoRestart === false,
      badge: "manual"
    },
    {
      title: "provider_edit_capability",
      detail: providerCheck.status || acceptancePacket.provider_edit_capability || "needs_manual_probe",
      ok: providerCheck.checkedLive === false && providerCheck.tokenRead === false,
      badge: "needs_manual_probe"
    },
    {
      title: "text_to_image_fallback",
      detail: acceptancePacket.text_to_image_fallback || acceptancePacket.textToImageFallback || "blocked",
      ok: (acceptancePacket.text_to_image_fallback || acceptancePacket.textToImageFallback) === "blocked",
      badge: "blocked"
    },
    {
      title: "manual Telegram/Chat caption test",
      detail: `${acceptancePacket.acceptanceTest?.inputImage || "food on black plate"} -> ${acceptancePacket.acceptanceTest?.caption || "change only the plate from black to white"}`,
      ok: true,
      badge: "manual"
    }
  ]);

  renderSignalList(
    imageEditEvidenceList,
    evidenceFields.map((field) => ({
      title: field.id || field.label,
      detail:
        field.id === "result_reviewed_by_human"
          ? "Human review stays pending until the manual result is inspected."
          : `${field.label || field.id}: ${field.status || "required"}`,
      ok: field.id === "result_reviewed_by_human" ? false : field.expected !== false,
      badge: field.status || "evidence"
    }))
  );

  renderSignalList(
    imageEditInvalidList,
    invalidUsage.map((item) => ({
      title: item,
      detail: "Fails closed or asks for a caption-bound resend.",
      ok: false,
      badge: "blocked"
    }))
  );

  renderSignalList(
    imageEditBlockedList,
    blockedActions.map((action) => ({
      title: action,
      detail: "Blocked by local-only image edit contract.",
      ok: false,
      badge: "blocked"
    }))
  );
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

function renderSocStatus(status, truth) {
  const data = status || fallbackSocStatus;
  const protocol = truth || fallbackTruthProtocol;
  const ready = data.status === "ready-local";
  const telegramBlocked = data.telegram?.canSend === false;

  socStatus.textContent = ready ? "SOC local ready" : data.status || "SOC blocked";
  socStatus.classList.remove("status-safe", "status-warn", "status-lock");
  socStatus.classList.add(ready ? "status-safe" : "status-warn");

  socSummary.replaceChildren(
    makeSummaryCard("Target", data.target || "unknown", data.mode || "local-only"),
    makeSummaryCard("CPU", data.snapshot?.cpu?.percent == null ? "Observed" : `${data.snapshot.cpu.percent}%`, data.truthStates?.cpu || "not_run"),
    makeSummaryCard("Memory", data.snapshot?.memory?.percent == null ? "N/A" : `${data.snapshot.memory.percent}%`, data.truthStates?.memory || "not_run"),
    makeSummaryCard("A2A Queue", `${data.a2aQueue?.itemCount || 0}`, data.a2aQueue?.status || "local-only"),
    makeSummaryCard("Telegram", telegramBlocked ? "Blocked" : "Check", data.telegram?.status || "unknown"),
    makeSummaryCard("Truth", protocol.status === "local-truth-protocol-ready" ? "Ready" : "Check", protocol.mode || "local")
  );

  renderSignalList(socSnapshotList, [
    {
      title: "CPU collector",
      detail: data.snapshot?.cpu
        ? `load average ${(data.snapshot.cpu.loadAverage || []).join(" / ") || "recorded"}`
        : "CPU metrics were not collected.",
      ok: data.truthStates?.cpu === "observed",
      badge: data.truthStates?.cpu || "not_run"
    },
    {
      title: "Memory collector",
      detail: data.snapshot?.memory
        ? `${data.snapshot.memory.usedGb}GB / ${data.snapshot.memory.totalGb}GB`
        : "Memory metrics were not collected.",
      ok: data.truthStates?.memory === "observed",
      badge: data.truthStates?.memory || "not_run"
    },
    {
      title: "Disk collector",
      detail: data.snapshot?.disk
        ? `${data.snapshot.disk.usedGb}GB / ${data.snapshot.disk.totalGb}GB`
        : "Disk metrics were not collected.",
      ok: data.truthStates?.disk === "observed",
      badge: data.truthStates?.disk || "not_run"
    },
    {
      title: "Docker collector",
      detail: data.snapshot?.docker?.note || data.snapshot?.docker?.state || "Docker inspection not run.",
      ok: ["observed", "not_run"].includes(data.truthStates?.docker),
      badge: data.truthStates?.docker || "not_run"
    }
  ]);

  renderSignalList(socGateList, [
    {
      title: "External writes",
      detail: data.externalWrites ? "External write path is armed." : "No external writes are available from SOC v1.",
      ok: data.externalWrites === false,
      badge: data.externalWrites ? "armed" : "blocked"
    },
    {
      title: "Telegram delivery",
      detail: `${data.telegram?.status || "unknown"}; ${data.telegram?.nextAction || "no next action"}`,
      ok: data.telegram?.canSend === false,
      badge: data.telegram?.canSend ? "send" : "blocked"
    },
    {
      title: "Ubuntu install pack",
      detail: data.installPack?.ubuntuDocker || "Planned after Mac local validation.",
      ok: data.installPack?.status === "planned-local-only",
      badge: data.installPack?.status || "planned"
    }
  ]);

  renderSignalList(
    truthRuleList,
    (protocol.reportRules || fallbackTruthProtocol.reportRules).map((rule) => ({
      title: rule.label || rule.id,
      detail: rule.rule,
      ok: protocol.externalWrites === false,
      badge: rule.requiredState || "rule"
    }))
  );

  socNextActions.replaceChildren(
    ...(data.nextActions || fallbackSocStatus.nextActions).map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
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

function renderPendingWork(ledger) {
  const data = ledger || fallbackPendingWork;
  const apiReady = data.status !== "unavailable";
  const unsafe = (data.summary?.unsafeEvidence || 0) > 0;
  const summary = data.summary || fallbackPendingWork.summary;

  pendingWorkStatus.textContent = unsafe ? "Evidence unsafe" : apiReady ? "External gates blocked" : "Ledger unavailable";
  pendingWorkStatus.classList.remove("status-safe", "status-warn", "status-lock");
  pendingWorkStatus.classList.add(unsafe ? "status-lock" : "status-warn");

  pendingWorkSummary.replaceChildren(
    makeSummaryCard("Pending", `${summary.pendingItems || 0}`, `${summary.blockedExternalGates || 0} blocked`),
    makeSummaryCard("Human Review", `${summary.readyForHumanReview || 0}`, "evidence-ready"),
    makeSummaryCard("Hidden Backlog", summary.hiddenBacklog ? "Yes" : "No", "local ledger"),
    makeSummaryCard("Executable Now", `${summary.executableNow || 0}`, data.externalWrites ? "external armed" : "external off"),
    makeSummaryCard("Main Site", data.mainWebsiteProtected ? "Protected" : "Check", "www.sirinx.co")
  );

  renderSignalList(
    pendingWorkList,
    (data.pendingItems || fallbackPendingWork.pendingItems).map((item) => ({
      title: `Part ${item.part || "?"}: ${item.title || item.id}`,
      detail: `${item.status}; ${item.checkedCount || 0}/${item.requiredCount || 0} evidence checked; ${item.nextAction || "no next action"}`,
      ok: item.externalWrites === false && item.canExecuteNow === false && item.evidenceStatus !== "unsafe-secret-like-content",
      badge: item.lane || item.owner || "pending"
    }))
  );

  pendingWorkNextActions.replaceChildren(
    ...(data.nextActions || fallbackPendingWork.nextActions).map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    })
  );
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

function renderExternalGateEvidence(evidence) {
  const data = evidence || fallbackExternalGateEvidence;
  const apiReady = data.status !== "unavailable";
  const complete = data.status === "ready-for-human-review";
  const unsafe = (data.summary?.unsafe || 0) > 0;
  const summary = data.summary || fallbackExternalGateEvidence.summary;

  externalGateEvidenceStatus.textContent = complete ? "Evidence ready" : unsafe ? "Evidence unsafe" : apiReady ? "Evidence blocked" : "Evidence unavailable";
  externalGateEvidenceStatus.classList.remove("status-safe", "status-warn", "status-lock");
  externalGateEvidenceStatus.classList.add(complete ? "status-safe" : unsafe ? "status-lock" : "status-warn");

  externalGateEvidenceSummary.replaceChildren(
    makeSummaryCard("Ready", `${summary.ready || 0}`, `${summary.gates || 0} gates`),
    makeSummaryCard("Incomplete", `${summary.incomplete || 0}`, `${summary.missingEvidenceFiles || 0} missing files`),
    makeSummaryCard("Unsafe", `${summary.unsafe || 0}`, "secret-like findings"),
    makeSummaryCard("Checked Items", `${summary.checkedItems || 0}/${summary.requiredItems || 0}`, "operator evidence")
  );

  renderSignalList(
    externalGateEvidenceList,
    (data.results || fallbackExternalGateEvidence.results).map((entry) => ({
      title: entry.title || entry.id,
      detail: `${entry.status}; ${entry.checkedCount || 0}/${entry.requiredCount || 0} checked; ${entry.nextAction || "no next action"}`,
      ok: entry.ready === true && entry.unsafe === false,
      badge: entry.owner || "evidence"
    }))
  );

  externalGateEvidenceNextActions.replaceChildren(
    ...(data.nextActions || fallbackExternalGateEvidence.nextActions).map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    })
  );
}

function renderExternalGateRunner(runner) {
  const data = runner || fallbackExternalGateRunner;
  const apiReady = data.status !== "unavailable";
  const unsafe = (data.summary?.unsafe || 0) > 0;
  const summary = data.summary || fallbackExternalGateRunner.summary;

  externalGateRunnerStatus.textContent = unsafe ? "Runner unsafe" : apiReady ? "Runner blocked" : "Runner unavailable";
  externalGateRunnerStatus.classList.remove("status-safe", "status-warn", "status-lock");
  externalGateRunnerStatus.classList.add(unsafe ? "status-lock" : "status-warn");

  externalGateRunnerSummary.replaceChildren(
    makeSummaryCard("Gates", `${summary.gates || 0}`, `${summary.blocked || 0} blocked`),
    makeSummaryCard("Executable Now", `${summary.executableNow || 0}`, "external writes stay off"),
    makeSummaryCard("Human Review", `${summary.readyForHumanReview || 0}`, "evidence-ready gates"),
    makeSummaryCard("External Writes", data.externalWrites ? "Armed" : "Off", data.canExecuteNow ? "actionable" : "runner only")
  );

  renderSignalList(
    externalGateRunnerList,
    (data.runs || fallbackExternalGateRunner.runs).map((run) => ({
      title: run.title || run.id,
      detail: `${run.status}; lane ${run.lane || run.owner}; local checks: ${(run.localChecks || []).join(", ")}`,
      ok: run.canExecuteNow === false && run.externalWrites === false && run.evidenceUnsafe !== true,
      badge: run.lane || "runner"
    }))
  );

  externalGateRunnerNextActions.replaceChildren(
    ...(data.nextActions || fallbackExternalGateRunner.nextActions).map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    })
  );
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
  Object.assign(connectorPanelState, {
    gateway: fallbackGatewayAgent,
    aiTeam: fallbackAiTeamPairing,
    registry: fallbackConnectorRegistry
  });
  renderConnectorPanel();
  renderAgentLaunchGate(fallbackAgentLaunchGate);
  renderAgentDriver(fallbackAgentDriver);
  renderCenterBrainHub(fallbackCenterBrainHub);
  renderTeamRuntimeBridge(fallbackTeamRuntimeBridge);
  renderOpenRouterQwenAdapter(fallbackOpenRouterQwenAdapter);
  renderModelRoutingApproval(fallbackModelRoutingApproval);
  renderAdaptiveCommandGateway(fallbackAdaptiveCommandGateway);
  renderHermesSpecFirstSwarm(fallbackSpecFirstSwarm);
  renderLocalRag(fallbackLocalRag);
  renderHermesImageEdit(fallbackHermesImageEdit);
  let loadedSoc = null;
  let loadedTruth = null;

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
    loadPanel(
      "/api/vibe-coding-agent",
      renderVibeCodingAgent,
      () => renderVibeCodingAgent(fallbackVibeCodingAgent),
      "Vibe coding agent"
    ),
    loadPanel(
      "/api/gateway-agent",
      (gateway) => {
        connectorPanelState.gateway = gateway;
        renderConnectorPanel();
      },
      () => {
        connectorPanelState.gateway = fallbackGatewayAgent;
        renderConnectorPanel();
      },
      "Gateway agent"
    ),
    loadPanel(
      "/api/ai-team-pairing",
      (aiTeam) => {
        connectorPanelState.aiTeam = aiTeam;
        renderConnectorPanel();
      },
      () => {
        connectorPanelState.aiTeam = fallbackAiTeamPairing;
        renderConnectorPanel();
      },
      "AI team pairing"
    ),
    loadPanel(
      "/api/connector-registry",
      (registry) => {
        connectorPanelState.registry = registry;
        renderConnectorPanel();
      },
      () => {
        connectorPanelState.registry = fallbackConnectorRegistry;
        renderConnectorPanel();
      },
      "Connector registry"
    ),
    loadPanel(
      "/api/agent-launch-gate",
      renderAgentLaunchGate,
      () => renderAgentLaunchGate(fallbackAgentLaunchGate),
      "Agent launch gate"
    ),
    loadPanel(
      "/api/agent-driver",
      renderAgentDriver,
      () => renderAgentDriver(fallbackAgentDriver),
      "Agent driver"
    ),
    loadPanel(
      "/api/centerbrain-hub",
      renderCenterBrainHub,
      () => renderCenterBrainHub(fallbackCenterBrainHub),
      "CenterBrain hub"
    ),
    loadPanel(
      "/api/team-runtime-bridge",
      renderTeamRuntimeBridge,
      () => renderTeamRuntimeBridge(fallbackTeamRuntimeBridge),
      "Team runtime bridge"
    ),
    loadPanel(
      "/api/openrouter-qwen-adapter",
      renderOpenRouterQwenAdapter,
      () => renderOpenRouterQwenAdapter(fallbackOpenRouterQwenAdapter),
      "OpenRouter Qwen adapter"
    ),
    loadPanel(
      "/api/model-routing-approval/openrouter-qwen",
      renderModelRoutingApproval,
      () => renderModelRoutingApproval(fallbackModelRoutingApproval),
      "Model routing approval"
    ),
    loadPanel(
      "/api/hermes-adaptive-command-gateway",
      renderAdaptiveCommandGateway,
      () => renderAdaptiveCommandGateway(fallbackAdaptiveCommandGateway),
      "Hermes adaptive command gateway"
    ),
    loadPanel(
      "/api/hermes-spec-first-swarm",
      renderHermesSpecFirstSwarm,
      () => renderHermesSpecFirstSwarm(fallbackSpecFirstSwarm),
      "Hermes spec-first swarm"
    ),
    loadPanel("/api/local-rag", renderLocalRag, () => renderLocalRag(fallbackLocalRag), "Local RAG"),
    loadPanel(
      "/api/hermes-image-edit",
      renderHermesImageEdit,
      () => renderHermesImageEdit(fallbackHermesImageEdit),
      "Hermes image edit"
    ),
    loadPanel(
      "/api/soc/status",
      (soc) => {
        loadedSoc = soc;
        renderSocStatus(loadedSoc, loadedTruth);
      },
      () => {
        loadedSoc = fallbackSocStatus;
        renderSocStatus(loadedSoc, loadedTruth || fallbackTruthProtocol);
      },
      "SOC status"
    ),
    loadPanel(
      "/api/truth-protocol",
      (truth) => {
        loadedTruth = truth;
        renderSocStatus(loadedSoc || fallbackSocStatus, loadedTruth);
      },
      () => {
        loadedTruth = fallbackTruthProtocol;
        renderSocStatus(loadedSoc || fallbackSocStatus, loadedTruth);
      },
      "Truth protocol"
    ),
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
      "/api/pending-work",
      renderPendingWork,
      () => renderPendingWork(fallbackPendingWork),
      "Pending work"
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
    loadPanel(
      "/api/external-gate-evidence",
      renderExternalGateEvidence,
      () => renderExternalGateEvidence(fallbackExternalGateEvidence),
      "External gate evidence"
    ),
    loadPanel(
      "/api/external-gate-runner",
      renderExternalGateRunner,
      () => renderExternalGateRunner(fallbackExternalGateRunner),
      "External gate runner"
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
