import { evaluateHermesInboxDryRun } from "../../hermes-api/src/inbox.mjs";
import { getRoninAgentTeam } from "./agent-team.mjs";
import { getPendingWorkLedger } from "./pending-work.mjs";
import { getSocStatus } from "./soc-status.mjs";
import { getTruthProtocolStatus } from "./truth-protocol.mjs";
import { getVibeCodingAgentStatus, vibeAgentBlockedActions } from "./vibe-coding-agent.mjs";
import { getVibeCommandCenter } from "./vibe-workflows.mjs";
import { getAiTeamPairingStatus } from "./ai-team-pairing.mjs";
import { getConnectorRegistryStatus } from "./connector-registry.mjs";
import { getHermesImageEditStatus } from "./hermes-image-edit.mjs";
import { getAgentLaunchGateStatus } from "./agent-launch-gate.mjs";
import { getTeamRuntimeBridgeStatus } from "./team-runtime-bridge.mjs";

const DEFAULT_HERMES_CONTEXT_WINDOW = 8192;
const DEFAULT_REQUIRED_HERMES_CONTEXT_WINDOW = 64000;

export const gatewayAgentBlockedActions = [
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
  "text_to_image_fallback_when_source_image_exists",
  "per_profile_gateway_start",
  "ollama_launch_auto_execute"
];

const syncBarrier = ["partId", "owner", "runtime", "sourceRefs", "evidence", "blockedActions", "nextExactStep"];

function nowIso(options) {
  const now = options.now || (() => new Date());
  return now().toISOString();
}

function makeRuntimeLanes(options = {}) {
  const hermesContextWindow = Number(options.hermesContextWindow || DEFAULT_HERMES_CONTEXT_WINDOW);
  const requiredHermesContextWindow = Number(
    options.requiredHermesContextWindow || DEFAULT_REQUIRED_HERMES_CONTEXT_WINDOW
  );
  const hermesReady = hermesContextWindow >= requiredHermesContextWindow;

  return [
    {
      id: "codex",
      title: "Codex Local Execution Host",
      status: "active-local",
      role: "local-file-and-test-runner",
      commandSurface: "Codex workspace",
      autoExecute: false,
      externalWrites: false,
      canExecuteNow: false,
      notes: "Gateway may expose local plans and checks, but does not auto-run external effects."
    },
    {
      id: "hermes-tui",
      title: "Hermes TUI",
      status: hermesReady ? "manual-ready" : "blocked-context-too-small",
      role: "interactive-cli-review-and-routing",
      commandSurface: "hermes --tui",
      contextWindow: hermesContextWindow,
      requiredContextWindow: requiredHermesContextWindow,
      autoExecute: false,
      externalWrites: false,
      canExecuteNow: false,
      notes: hermesReady
        ? "Hermes TUI is represented as a manual runtime lane."
        : "Observed Hermes Agent context is below the 64k requirement; choose a larger-context model before using it for gateway routing."
    },
    {
      id: "gemini-cli",
      title: "Gemini CLI",
      status: "manual-review-runtime",
      role: "secondary-review-and-synthesis",
      commandSurface: "gemini",
      autoExecute: false,
      externalWrites: false,
      canExecuteNow: false,
      notes: "Gateway records Gemini as a manual reviewer lane and never invokes it automatically."
    },
    {
      id: "a2a2loopsync",
      title: "A2A2LoopSync",
      status: "local-sync-contract",
      role: "evidence-provenance-and-next-step-loop",
      commandSurface: "local JSON/Markdown artifacts",
      autoExecute: false,
      externalWrites: false,
      canExecuteNow: false,
      notes: "Loop produces evidence packets and next steps only."
    }
  ];
}

function makeA2A2LoopSync() {
  return {
    workLoop: ["Goal", "Plan", "PRD", "Issues", "Tasks", "Diff", "Verify", "Approval Packet", "Stop"],
    knowledgeLoop: ["Event", "Evidence", "Provenance", "Knowledge Split", "Retrieval", "Next Plan"],
    syncBarrier,
    externalWrites: false,
    canExecuteNow: false
  };
}

function makePartAssignments(goal) {
  const normalizedGoal = String(goal || "Gateway Agent local-only coordination").trim();

  return [
    {
      partId: "gateway-part-01",
      owner: "shogun",
      runtime: "codex",
      title: "Approval routing and final stop point",
      task: "Hold final approval packet and prevent external execution.",
      sourceRefs: ["services/dev-control-api/src/agent-team.mjs", "docs/approvals"],
      evidence: [`goal=${normalizedGoal}`, "approvalGate=required"],
      blockedActions: gatewayAgentBlockedActions,
      nextExactStep: "Review dry-run plan and decide whether a later external approval packet is needed.",
      externalWrites: false,
      canExecuteNow: false
    },
    {
      partId: "gateway-part-02",
      owner: "planner",
      runtime: "codex",
      title: "Goal to PRD to issues to tasks",
      task: "Split the requested goal into local implementation parts before any mutation.",
      sourceRefs: ["docs/knowledge/system-wiring/sirinx-vibecoding-system-map.json"],
      evidence: ["workflow=Goal -> Plan -> PRD -> Issues -> Tasks"],
      blockedActions: gatewayAgentBlockedActions,
      nextExactStep: "Convert the accepted goal into local-only task records.",
      externalWrites: false,
      canExecuteNow: false
    },
    {
      partId: "gateway-part-03",
      owner: "backend",
      runtime: "codex",
      title: "Gateway API contract and tests",
      task: "Maintain deterministic local API payloads for gateway status and dry-run planning.",
      sourceRefs: ["services/dev-control-api/src/gateway-agent.mjs", "services/dev-control-api/server.mjs"],
      evidence: ["api=/api/gateway-agent", "api=/api/gateway-agent/plan/dry-run"],
      blockedActions: gatewayAgentBlockedActions,
      nextExactStep: "Run gateway-agent tests and API syntax checks.",
      externalWrites: false,
      canExecuteNow: false
    },
    {
      partId: "gateway-part-04",
      owner: "scribe",
      runtime: "a2a2loopsync",
      title: "Knowledge split and provenance",
      task: "Write concise gateway knowledge without raw secrets, raw chat logs, or private customer data.",
      sourceRefs: ["docs/knowledge/gateway-agent", "docs/grid/11-gateway-agent-a2a2loopsync.md"],
      evidence: ["knowledgeSplit=summary-only", "provenance=required"],
      blockedActions: gatewayAgentBlockedActions,
      nextExactStep: "Update the gateway-agent knowledge index after local verification.",
      externalWrites: false,
      canExecuteNow: false
    },
    {
      partId: "gateway-part-05",
      owner: "qa",
      runtime: "codex",
      title: "Verification matrix",
      task: "Run local tests, secret scan, wiring check, and diff hygiene.",
      sourceRefs: ["package.json", "scripts/check-system-wiring.mjs", "scripts/secret-scan.mjs"],
      evidence: ["verification=local-only"],
      blockedActions: gatewayAgentBlockedActions,
      nextExactStep: "Run pnpm gateway-agent:test and the requested verification set.",
      externalWrites: false,
      canExecuteNow: false
    },
    {
      partId: "gateway-part-06",
      owner: "devops",
      runtime: "hermes-tui",
      title: "CLI readiness only",
      task: "Represent Hermes TUI, Gemini CLI, and Codex readiness without invoking them.",
      sourceRefs: ["docs/knowledge/gateway-agent/04-cli-boundaries.md"],
      evidence: ["autoExecute=false", "perProfileGatewayStart=blocked"],
      blockedActions: gatewayAgentBlockedActions,
      nextExactStep: "Keep CLI execution manual until a specific approved runbook exists.",
      externalWrites: false,
      canExecuteNow: false
    },
    {
      partId: "gateway-part-07",
      owner: "security",
      runtime: "a2a2loopsync",
      title: "Blocked actions and secret boundary",
      task: "Ensure policy, MCP, connector, paid API, and messaging gates remain blocked.",
      sourceRefs: ["services/dev-control-api/src/vibe-coding-agent.mjs", "docs/grid/10-risk-verification.md"],
      evidence: ["externalWrites=false", "canRunMcp=false", "secretRead=false"],
      blockedActions: gatewayAgentBlockedActions,
      nextExactStep: "Reject any packet that requests a secret read or external effect without exact approval.",
      externalWrites: false,
      canExecuteNow: false
    }
  ];
}

function makeHermesInboxPreview(goal, source = "codex-local") {
  const result = evaluateHermesInboxDryRun({
    requestId: "gateway-agent-dry-run",
    source,
    target: { id: "docs/knowledge/gateway-agent" },
    intent: {
      type: "local-gateway-plan",
      summary: String(goal || "Create Gateway Agent local plan"),
      rawTextIncluded: false
    },
    action: {
      id: "gateway-agent-plan",
      type: "local-gateway-plan",
      externalWrite: false,
      productionWrite: false,
      customerVisible: false,
      paidApi: false,
      destructive: false,
      readsSecretValues: false,
      printsSecrets: false,
      rawChatToMemory: false,
      readOnly: true
    },
    dryRun: true
  });

  return {
    status: result.status,
    result: result.body.result,
    requiresHumanApproval: result.body.requiresHumanApproval,
    externalWrites: false,
    policy: result.body.policy || null
  };
}

export async function getGatewayAgentStatus(options = {}) {
  const runtimes = makeRuntimeLanes(options);
  const [vibeAgent, pendingWork, socStatus, aiTeamPairing, connectorRegistry] = await Promise.all([
    getVibeCodingAgentStatus(options),
    getPendingWorkLedger(options),
    getSocStatus(options),
    getAiTeamPairingStatus(options),
    getConnectorRegistryStatus(options)
  ]);
  const vibeCommandCenter = getVibeCommandCenter();
  const agentTeam = getRoninAgentTeam();
  const truth = options.truth || getTruthProtocolStatus();
  const hermesImageEdit = getHermesImageEditStatus();
  const agentLaunchGate = getAgentLaunchGateStatus(options);
  const teamRuntimeBridge = await getTeamRuntimeBridgeStatus(options);

  return {
    title: "Unified Gateway Agent",
    status: "local-gateway-ready",
    mode: "local-only-control-contract",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canExecuteExternally: false,
    canRunMcp: false,
    canDeploy: false,
    canSendMessages: false,
    summary: {
      runtimes: runtimes.length,
      activeProfiles: agentTeam.summary.activeProfiles,
      rosterRoles: agentTeam.summary.rosterRoles,
      vibeFunctions: vibeCommandCenter.summary.functions,
      pendingGateItems: pendingWork.summary.pendingItems,
      pairedAiRoles: aiTeamPairing.summary.pairedRoles,
      connectorsTotal: connectorRegistry.summary.connectorsTotal,
      imageEdit: hermesImageEdit.summary.imageEdit,
      imageEditAcceptancePacketReady: hermesImageEdit.summary.acceptancePacketReady,
      launchGateAgents: agentLaunchGate.summary.agentsTotal,
      launchGateAutoExecutable: agentLaunchGate.summary.autoExecutable,
      teamRuntimeLanes: teamRuntimeBridge.summary.runtimeLanes,
      teamRuntimePaidApiExecutable: teamRuntimeBridge.summary.paidApiExecutable,
      blockedActions: gatewayAgentBlockedActions.length,
      socStatus: socStatus.status,
      truthProtocol: truth.status
    },
    integratedFlow: [
      "Human Goal",
      "Gateway Agent",
      "Local Vibe Coding Agent",
      "47 Ronin lane assignment",
      "Hermes Inbox dry-run",
      "A2A2LoopSync evidence packet",
      "Knowledge split",
      "Verify",
      "Approval Packet",
      "Stop"
    ],
    runtimes,
    a2a2LoopSync: makeA2A2LoopSync(),
    agentTeam: {
      mode: agentTeam.mode,
      activeProfiles: agentTeam.activeProfiles.map((profile) => ({
        name: profile.name,
        lane: profile.lane,
        status: profile.status,
        gateway: profile.gateway,
        externalWrites: profile.externalWrites
      })),
      rosterRoles: agentTeam.summary.rosterRoles
    },
    aiTeamPairing: {
      status: aiTeamPairing.status,
      mode: aiTeamPairing.mode,
      summary: aiTeamPairing.summary,
      telegram: aiTeamPairing.telegram,
      canSendMessages: aiTeamPairing.canSendMessages,
      canStartGateways: aiTeamPairing.canStartGateways
    },
    connectorRegistry: {
      status: connectorRegistry.status,
      mode: connectorRegistry.mode,
      summary: connectorRegistry.summary,
      ownerPackets: connectorRegistry.ownerPackets,
      canActivateConnectors: connectorRegistry.canActivateConnectors
    },
    hermesImageEdit: {
      status: hermesImageEdit.status,
      mode: hermesImageEdit.mode,
      summary: hermesImageEdit.summary,
      toolContract: hermesImageEdit.toolContract,
      acceptancePacket: hermesImageEdit.acceptancePacket,
      stopPoint: hermesImageEdit.stopPoint,
      externalWrites: hermesImageEdit.externalWrites,
      canExecuteExternally: hermesImageEdit.canExecuteExternally,
      canRunMcp: hermesImageEdit.canRunMcp,
      canReadSecrets: hermesImageEdit.canReadSecrets
    },
    agentLaunchGate: {
      status: agentLaunchGate.status,
      mode: agentLaunchGate.mode,
      summary: agentLaunchGate.summary,
      hermesContextRule: agentLaunchGate.hermesContextRule,
      stopPoint: agentLaunchGate.stopPoint,
      externalWrites: agentLaunchGate.externalWrites,
      canExecuteExternally: agentLaunchGate.canExecuteExternally,
      canLaunchAgents: agentLaunchGate.canLaunchAgents,
      canRunMcp: agentLaunchGate.canRunMcp,
      canReadSecrets: agentLaunchGate.canReadSecrets
    },
    teamRuntimeBridge: {
      status: teamRuntimeBridge.status,
      mode: teamRuntimeBridge.mode,
      summary: teamRuntimeBridge.summary,
      runtimeLanes: teamRuntimeBridge.runtimeLanes,
      modelLanes: teamRuntimeBridge.modelLanes,
      a2a2aContract: teamRuntimeBridge.a2a2aContract,
      stopPoint: teamRuntimeBridge.stopPoint,
      externalWrites: teamRuntimeBridge.externalWrites,
      canExecuteExternally: teamRuntimeBridge.canExecuteExternally,
      canCallPaidApi: teamRuntimeBridge.canCallPaidApi,
      canRunAntigravityCli: teamRuntimeBridge.canRunAntigravityCli,
      canRunMcp: teamRuntimeBridge.canRunMcp,
      canReadSecrets: teamRuntimeBridge.canReadSecrets
    },
    localVibeAgent: {
      status: vibeAgent.status,
      mode: vibeAgent.mode,
      safeActions: vibeAgent.summary.safeActions,
      blockedExternalGates: vibeAgent.summary.blockedExternalGates,
      readyForHumanReview: vibeAgent.summary.readyForHumanReview
    },
    blockedActions: Array.from(new Set([...vibeAgentBlockedActions, ...gatewayAgentBlockedActions])),
    approvalPacket: {
      status: "not-executable-local-only",
      nextRequiredApproval: "exact external approval packet required before any irreversible action",
      stopPoint: "GATEWAY AGENT READY LOCAL-ONLY — WAITING FOR HUMAN APPROVAL"
    },
    updatedAt: nowIso(options)
  };
}

export async function createGatewayAgentDryRunPlan(body = {}, options = {}) {
  const goal = String(body.goal || "Gateway Agent local-only coordination").trim();
  const source = String(body.source || "codex-local").trim();
  const status = await getGatewayAgentStatus(options);

  return {
    title: "Gateway Agent Dry-Run Plan",
    status: "dry-run-plan-ready",
    mode: "local-only-dry-run",
    requestId: String(body.requestId || "gateway-agent-dry-run"),
    goal,
    source,
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canExecuteExternally: false,
    canRunMcp: false,
    canDeploy: false,
    canSendMessages: false,
    hermesInbox: makeHermesInboxPreview(goal, source),
    runtimes: status.runtimes,
    aiTeamPairing: status.aiTeamPairing,
    connectorRegistry: status.connectorRegistry,
    hermesImageEdit: status.hermesImageEdit,
    agentLaunchGate: status.agentLaunchGate,
    teamRuntimeBridge: status.teamRuntimeBridge,
    partAssignments: makePartAssignments(goal),
    a2a2LoopSync: makeA2A2LoopSync(),
    knowledgeSplit: [
      "docs/knowledge/gateway-agent/00-index.md",
      "docs/knowledge/gateway-agent/01-runtime-contract.md",
      "docs/knowledge/gateway-agent/02-a2a2loopsync.md",
      "docs/knowledge/gateway-agent/03-agent-team-parts.md",
      "docs/knowledge/gateway-agent/04-cli-boundaries.md",
      "docs/knowledge/gateway-agent/05-approval-gates.md",
      "docs/knowledge/gateway-agent/06-ai-team-pairing.md",
      "docs/knowledge/gateway-agent/07-connector-registry.md",
      "docs/knowledge/gateway-agent/08-local-rag-turbovec.md",
      "docs/knowledge/gateway-agent/09-hermes-image-edit.md",
      "docs/knowledge/gateway-agent/10-agent-launch-gate.md",
      "docs/knowledge/gateway-agent/11-agent-driver.md",
      "docs/knowledge/gateway-agent/12-centerbrain-hub.md",
      "docs/knowledge/gateway-agent/13-centerbrain-shell.md",
      "docs/knowledge/gateway-agent/14-hermes-agent-audit.md",
      "docs/knowledge/gateway-agent/15-repo-intake-gate.md",
      "docs/knowledge/gateway-agent/16-team-runtime-bridge.md"
    ],
    verification: [
      "pnpm gateway-agent:test",
      "pnpm agent-launch-gate:test",
      "pnpm team-runtime-bridge:test",
      "pnpm connector-registry:test",
      "pnpm local-rag:test",
      "pnpm hermes-image-edit:test",
      "pnpm hermes-inbox:test",
      "pnpm vibe-agent:test",
      "pnpm soc:test",
      "pnpm wiring:check",
      "pnpm verify:workspace",
      "pnpm audit:secrets",
      "git diff --check"
    ],
    approvalPacket: {
      status: "required-before-external-action",
      stopPoint: "GATEWAY AGENT DRY-RUN PLAN READY — STOP BEFORE EXTERNAL ACTION"
    },
    updatedAt: nowIso(options)
  };
}
