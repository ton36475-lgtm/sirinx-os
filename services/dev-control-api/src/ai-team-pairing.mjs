import { getRoninAgentTeam } from "./agent-team.mjs";
import { getExternalGateEvidenceStatus } from "./external-gate-evidence.mjs";

const blockedActions = [
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
  "per_profile_gateway_start",
  "cli_auto_run"
];

const laneToProfile = {
  approval: "shogun",
  planning: "planner",
  website: "frontend",
  backend: "backend",
  release: "devops",
  quality: "qa",
  marketing: "growth",
  leads: "sales",
  data: "data",
  energy: "solis",
  creative: "design",
  memory: "scribe",
  risk: "shogun",
  messaging: "sales",
  ops: "devops",
  business: "sales"
};

const runtimeGroups = [
  {
    id: "codex-control",
    title: "Codex Control",
    purpose: "Local file edits, tests, API smoke checks, and evidence collection.",
    autoExecute: false,
    externalWrites: false
  },
  {
    id: "hermes-tui-manual",
    title: "Hermes TUI Manual Lane",
    purpose: "Manual interactive review after context-window readiness is fixed.",
    autoExecute: false,
    externalWrites: false
  },
  {
    id: "qwen-openrouter-manual",
    title: "Qwen 3.7 Max OpenRouter Manual Lane",
    purpose: "Large-context model review lane; provider calls require separate approval.",
    modelId: "qwen/qwen3.7-max",
    provider: "OpenRouter",
    autoExecute: false,
    externalWrites: false,
    providerCall: false
  },
  {
    id: "antigravity-cli-watch",
    title: "Antigravity CLI Watch",
    purpose: "Agent-first CLI watch lane; install and CLI execution remain blocked.",
    autoExecute: false,
    externalWrites: false,
    canInstall: false,
    canRunCli: false
  },
  {
    id: "gemini-review-manual",
    title: "Gemini CLI Manual Review",
    purpose: "Manual second-opinion review only; Gateway does not invoke Gemini.",
    autoExecute: false,
    externalWrites: false
  },
  {
    id: "a2a2loopsync-evidence",
    title: "A2A2LoopSync Evidence",
    purpose: "Local evidence packets, provenance, and next exact step synchronization.",
    autoExecute: false,
    externalWrites: false
  }
];

function nowIso(options) {
  const now = options.now || (() => new Date());
  return now().toISOString();
}

function makeProfileIndex(agentTeam) {
  return new Map(agentTeam.activeProfiles.map((profile) => [profile.name, profile]));
}

function pickPrimaryProfile(role, profileIndex) {
  const candidate = laneToProfile[role.lane] || "shogun";
  return profileIndex.get(candidate) || profileIndex.get("shogun");
}

function pickReviewRuntime(role) {
  if (["risk", "quality", "release"].includes(role.lane)) return "gemini-review-manual";
  if (["memory", "ops", "messaging"].includes(role.lane)) return "a2a2loopsync-evidence";
  if (role.runtime === "active-profile") return "hermes-tui-manual";
  return "codex-control";
}

function makePairing(role, profileIndex) {
  const primaryProfile = pickPrimaryProfile(role, profileIndex);
  const profileName = primaryProfile?.name || "shogun";

  return {
    pairId: `pair-${String(role.number).padStart(2, "0")}-${role.id}`,
    roleNumber: role.number,
    roleId: role.id,
    title: role.title,
    lane: role.lane,
    runtime: role.runtime,
    primaryProfile: profileName,
    primaryProfileStatus: primaryProfile?.status || "profile-needs-check",
    command: primaryProfile?.command || `${profileName} chat`,
    reviewRuntime: pickReviewRuntime(role),
    a2aChannel: `a2a:${role.lane}:${role.id}`,
    telegramTarget: "blocked-until-recipient-evidence",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canSendMessage: false,
    canStartGateway: false,
    canExecuteNow: false,
    nextExactStep: `Route ${role.id} through ${profileName} for local dry-run review only.`
  };
}

function makeHandoffPackets(pairings) {
  const grouped = new Map();

  for (const pairing of pairings) {
    if (!grouped.has(pairing.primaryProfile)) {
      grouped.set(pairing.primaryProfile, []);
    }
    grouped.get(pairing.primaryProfile).push(pairing);
  }

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([owner, ownerPairings], index) => ({
      packetId: `team-pairing-${String(index + 1).padStart(2, "0")}-${owner}`,
      owner,
      runtime: "a2a2loopsync-evidence",
      roleCount: ownerPairings.length,
      roles: ownerPairings.map((pairing) => pairing.roleId),
      sourceRefs: ["services/dev-control-api/src/agent-team.mjs", "services/dev-control-api/src/ai-team-pairing.mjs"],
      evidence: [
        `owner=${owner}`,
        `roles=${ownerPairings.length}`,
        "externalWrites=false",
        "telegramSend=false"
      ],
      blockedActions,
      nextExactStep: `Review ${ownerPairings.length} local role pairing(s) for ${owner}; do not start gateway or send messages.`,
      externalWrites: false,
      canExecuteNow: false
    }));
}

function messagingGate(evidence) {
  const gate = evidence.results.find((result) => result.id === "telegram-line-recipient-token");

  return {
    gateId: "telegram-line-recipient-token",
    evidenceStatus: gate?.status || "missing-evidence",
    checkedCount: gate?.checkedCount || 0,
    requiredCount: gate?.requiredCount || 5,
    missing: gate?.missing || [],
    canSend: false,
    nextAction: gate?.nextAction || "Complete Telegram/LINE recipient and token evidence before any send."
  };
}

export async function getAiTeamPairingStatus(options = {}) {
  const [agentTeam, evidence] = await Promise.all([
    Promise.resolve(getRoninAgentTeam()),
    getExternalGateEvidenceStatus(options)
  ]);
  const profileIndex = makeProfileIndex(agentTeam);
  const pairings = agentTeam.roleRoster.map((role) => makePairing(role, profileIndex));
  const activeProfiles = pairings.filter((pairing) => pairing.runtime === "active-profile").length;
  const telegram = messagingGate(evidence);

  return {
    title: "SIRINX AI Team Pairing",
    status: "local-pairing-ready",
    mode: "all-ai-team-local-pairing-contract",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canExecuteExternally: false,
    canRunMcp: false,
    canSendMessages: false,
    canStartGateways: false,
    telegram,
    runtimeGroups,
    summary: {
      rolesTotal: pairings.length,
      pairedRoles: pairings.length,
      activeProfiles,
      virtualRoles: pairings.length - activeProfiles,
      handoffPackets: makeHandoffPackets(pairings).length,
      executableExternalActions: 0,
      telegramReady: false,
      blockedActions: blockedActions.length
    },
    pairings,
    handoffPackets: makeHandoffPackets(pairings),
    stopRules: [
      "Do not send Telegram or LINE messages until recipient/token evidence is complete and final send approval exists.",
      "Do not start per-profile Hermes gateways in this phase.",
      "Do not auto-run Codex, Hermes TUI, Gemini CLI, MCP, or connector actions from pairing output.",
      "Use pairing output as a local routing map and approval packet source only."
    ],
    updatedAt: nowIso(options)
  };
}

export async function createAiTeamPairingDryRun(body = {}, options = {}) {
  const status = await getAiTeamPairingStatus(options);
  const goal = String(body.goal || "pair all AI team").trim();

  return {
    title: "AI Team Pairing Dry-Run",
    status: "dry-run-pairing-ready",
    mode: "local-only-dry-run",
    requestId: String(body.requestId || "ai-team-pairing-dry-run"),
    goal,
    source: String(body.source || "codex-local"),
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canExecuteExternally: false,
    canRunMcp: false,
    canSendMessages: false,
    canStartGateways: false,
    runtimeGroups,
    telegram: status.telegram,
    summary: status.summary,
    handoffPackets: status.handoffPackets,
    nextActions: [
      "Use the pairing map to route local tasks to the correct owner profile.",
      "Keep Telegram as blocked until `telegram-line-recipient-token` evidence is complete.",
      "Run local verification before creating any approval packet.",
      "Stop before any real send, connector activation, gateway start, deploy, push, publish, paid API call, or secret read."
    ],
    stopPoint: "AI TEAM PAIRED LOCAL-ONLY - WAITING FOR HUMAN APPROVAL",
    updatedAt: nowIso(options)
  };
}
