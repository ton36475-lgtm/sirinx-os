import { getExternalGateEvidenceStatus } from "./external-gate-evidence.mjs";
import { getSocStatus } from "./soc-status.mjs";
import { getTruthProtocolStatus } from "./truth-protocol.mjs";
import { getVibeCommandCenter } from "./vibe-workflows.mjs";

export const vibeAgentBlockedActions = [
  "deploy",
  "push",
  "publish",
  "external_connector_activation",
  "real_mcp_execution",
  "paid_api_call",
  "secret_read_or_print",
  "customer_message_send",
  "production_database_write"
];

const safeActions = [
  {
    id: "verify-workspace",
    title: "Verify Local Workspace",
    command: "pnpm verify:workspace",
    lane: "quality",
    externalWrites: false,
    approvalRequired: false,
    evidence: "Confirms skeleton, wiring, SOC, dry-run adapters, and secret scan."
  },
  {
    id: "soc-check",
    title: "Read SOC Status",
    command: "pnpm soc:check",
    lane: "security",
    externalWrites: false,
    approvalRequired: false,
    evidence: "Reads local host metrics and Telegram evidence without sending."
  },
  {
    id: "dashboard-e2e",
    title: "Run Dashboard E2E",
    command: "pnpm dashboard:e2e",
    lane: "frontend",
    externalWrites: false,
    approvalRequired: false,
    evidence: "Verifies Mission Control surfaces on desktop and mobile."
  }
];

function makeReviewQueue(evidence) {
  return evidence.results
    .filter((item) => item.ready)
    .map((item) => ({
      id: item.id,
      title: item.title,
      owner: item.owner,
      status: item.status,
      nextAction: "Human review required before any external execution.",
      externalWrites: false,
      canExecuteNow: false
    }));
}

function makeBlockedGateQueue(evidence) {
  return evidence.results
    .filter((item) => !item.ready)
    .map((item) => ({
      id: item.id,
      title: item.title,
      owner: item.owner,
      status: item.status,
      missingCount: item.missingCount,
      requiredCount: item.requiredCount,
      nextAction: item.nextAction,
      externalWrites: false,
      canExecuteNow: false
    }));
}

export async function getVibeCodingAgentStatus(options = {}) {
  const now = options.now || (() => new Date());
  const evidence = await getExternalGateEvidenceStatus({ evidenceRoot: options.evidenceRoot });
  const vibe = options.vibe || getVibeCommandCenter();
  const truth = options.truth || getTruthProtocolStatus();
  const soc =
    options.soc ||
    (await getSocStatus({
      evidenceRoot: options.evidenceRoot,
      now
    }));
  const reviewQueue = makeReviewQueue(evidence);
  const blockedGateQueue = makeBlockedGateQueue(evidence);

  return {
    title: "Local Vibe Coding Agent",
    status: "local-agent-ready",
    mode: "local-only-execution-agent",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canExecuteExternally: false,
    canRunMcp: false,
    canDeploy: false,
    mainWebsiteProtected: vibe.mainWebsiteProtected === true,
    summary: {
      safeActions: safeActions.length,
      blockedExternalGates: evidence.summary.blocked,
      readyForHumanReview: evidence.summary.ready,
      executableExternalActions: 0,
      blockedActions: vibeAgentBlockedActions.length,
      vibeFunctions: vibe.summary?.functions || 0,
      socStatus: soc.status,
      truthProtocol: truth.status
    },
    safeActions,
    reviewQueue,
    blockedGates: blockedGateQueue,
    blockedActions: vibeAgentBlockedActions,
    approvalPacket: {
      status: evidence.status,
      evidenceRoot: evidence.evidenceRoot,
      nextRequiredApproval:
        reviewQueue.length > 0
          ? "human review required before any external execution"
          : "complete external gate evidence, then human review required",
      stopPoint: "VIBE CODING AGENT READY LOCAL-ONLY — WAITING FOR HUMAN APPROVAL"
    },
    operatingRule:
      "Goal -> Plan -> PRD -> Issues -> Tasks -> Diff -> Verify -> Approval Packet -> Stop. Local commands may run; external effects stay blocked.",
    updatedAt: now().toISOString()
  };
}
