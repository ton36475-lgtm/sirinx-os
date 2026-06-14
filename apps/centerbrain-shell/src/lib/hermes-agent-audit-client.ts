import { buildCenterBrainApiUrl } from "./centerbrain-client";

export type HermesGatewayAudit = {
  id: string;
  title: string;
  status: string;
  ready: boolean;
  missing: string[];
  nextAction: string;
};

export type HermesAgentAuditSummary = {
  gateways: number;
  ready: number;
  blocked: number;
  unsafe: number;
};

export type HermesAgentAuditStatus = {
  title: string;
  status: string;
  summary: HermesAgentAuditSummary;
  gateways: HermesGatewayAudit[];
  blockedActions: string[];
  manualCommands: string[];
  manualCommandsExecutableByApi: boolean;
  canRestartGateway: boolean;
  commandExecuted: boolean;
  messageSent: boolean;
  secretsRead: boolean;
  requiresHumanApproval: boolean;
  stopPoint: string;
  source: "live" | "fallback";
};

const fallbackGateways: HermesGatewayAudit[] = [
  {
    id: "telegram",
    title: "Telegram",
    status: "blocked-evidence-incomplete",
    ready: false,
    missing: ["Telegram token/recipient evidence"],
    nextAction: "Confirm Telegram token ownership and target proof.",
  },
  {
    id: "line",
    title: "LINE OA",
    status: "blocked-evidence-incomplete",
    ready: false,
    missing: ["LINE OA scope and signature verification evidence"],
    nextAction: "Confirm LINE scope or explicitly mark it out of scope.",
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    status: "blocked-evidence-incomplete",
    ready: false,
    missing: ["WhatsApp scope evidence"],
    nextAction: "Mark WhatsApp out of scope or add session policy evidence.",
  },
  {
    id: "discord",
    title: "Discord",
    status: "blocked-evidence-incomplete",
    ready: false,
    missing: ["Discord scope evidence"],
    nextAction: "Mark Discord out of scope or add bot target policy evidence.",
  },
];

export const hermesAgentAuditFallback: HermesAgentAuditStatus = {
  title: "Hermes Agent Messaging Audit",
  status: "blocked-evidence-incomplete",
  summary: {
    gateways: 4,
    ready: 0,
    blocked: 4,
    unsafe: 0,
  },
  gateways: fallbackGateways,
  blockedActions: [
    "hermes_gateway_restart_from_api",
    "telegram_send",
    "line_send",
    "whatsapp_send",
    "discord_send",
    "secret_read_or_print",
  ],
  manualCommands: [],
  manualCommandsExecutableByApi: false,
  canRestartGateway: false,
  commandExecuted: false,
  messageSent: false,
  secretsRead: false,
  requiresHumanApproval: true,
  stopPoint: "HERMES MESSAGING AUDIT READY - MANUAL GATEWAY RESTART APPROVAL REQUIRED",
  source: "fallback",
};

export function normalizeHermesAgentAuditStatus(input: unknown): HermesAgentAuditStatus {
  const record = isRecord(input) ? input : {};
  const summary = isRecord(record.summary) ? record.summary : {};

  return {
    ...hermesAgentAuditFallback,
    title: typeof record.title === "string" ? record.title : hermesAgentAuditFallback.title,
    status: typeof record.status === "string" ? record.status : hermesAgentAuditFallback.status,
    summary: {
      gateways: toNumber(summary.gateways, hermesAgentAuditFallback.summary.gateways),
      ready: toNumber(summary.ready, hermesAgentAuditFallback.summary.ready),
      blocked: toNumber(summary.blocked, hermesAgentAuditFallback.summary.blocked),
      unsafe: toNumber(summary.unsafe, hermesAgentAuditFallback.summary.unsafe),
    },
    gateways: normalizeGateways(record.gateways),
    blockedActions: normalizeStringList(record.blockedActions, hermesAgentAuditFallback.blockedActions),
    manualCommands: normalizeStringList(record.manualCommands, []),
    manualCommandsExecutableByApi: false,
    canRestartGateway: false,
    commandExecuted: false,
    messageSent: false,
    secretsRead: false,
    requiresHumanApproval: true,
    stopPoint: typeof record.stopPoint === "string" ? record.stopPoint : hermesAgentAuditFallback.stopPoint,
    source: "live",
  };
}

export async function fetchHermesAgentAuditStatus(): Promise<HermesAgentAuditStatus> {
  try {
    const response = await fetch("/api/hermes-agent-audit", { cache: "no-store" });
    if (!response.ok) {
      return hermesAgentAuditFallback;
    }

    const data: unknown = await response.json();
    return normalizeHermesAgentAuditStatus(data);
  } catch {
    return hermesAgentAuditFallback;
  }
}

export async function proxyHermesAgentAuditStatus(): Promise<HermesAgentAuditStatus> {
  try {
    const response = await fetch(buildCenterBrainApiUrl("/api/hermes-agent-audit"), {
      cache: "no-store",
    });
    if (!response.ok) {
      return hermesAgentAuditFallback;
    }

    const data: unknown = await response.json();
    return normalizeHermesAgentAuditStatus(data);
  } catch {
    return hermesAgentAuditFallback;
  }
}

function normalizeGateways(value: unknown): HermesGatewayAudit[] {
  if (!Array.isArray(value)) {
    return fallbackGateways;
  }

  const gateways = value.filter(isRecord).map((gateway) => ({
    id: String(gateway.id ?? "unknown"),
    title: String(gateway.title ?? gateway.id ?? "Unknown"),
    status: String(gateway.status ?? "blocked-evidence-incomplete"),
    ready: gateway.ready === true,
    missing: normalizeStringList(gateway.missing, []),
    nextAction: String(gateway.nextAction ?? "Review gateway evidence."),
  }));

  return gateways.length > 0 ? gateways : fallbackGateways;
}

function normalizeStringList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value.filter((item): item is string => typeof item === "string");
  return items.length > 0 ? items : fallback;
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
