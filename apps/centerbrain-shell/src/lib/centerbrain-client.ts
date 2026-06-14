export type CenterBrainSummary = {
  aiNodes: number;
  deviceNodes: number;
  connectorLanes: number;
  stackLanes: number;
  liveExternalActions: number;
};

export type CenterBrainNode = {
  id: string;
  label: string;
  status: string;
  lane?: string;
};

export type CenterBrainGuardrails = {
  canRunMcp: boolean;
  canDeploy: boolean;
  canExecuteCommands: boolean;
  canActivateConnectors: boolean;
  canReadSecrets: boolean;
  canSendMessages: boolean;
  canRemoteControlDevices: boolean;
};

export type CenterBrainShellStatus = {
  title: string;
  status: string;
  shellMode: string;
  apiContract: string;
  summary: CenterBrainSummary;
  guardrails: CenterBrainGuardrails;
  aiNodes: CenterBrainNode[];
  deviceNodes: CenterBrainNode[];
  stackLanes: CenterBrainNode[];
  connectorLanes: CenterBrainNode[];
  blockedActions: string[];
  stopPoint: string;
  requiresHumanApproval: boolean;
  canExecuteCommands: boolean;
  canActivateConnectors: boolean;
  canDeploy: boolean;
  source: "live" | "fallback";
};

const localApiOrigin =
  process.env.CENTERBRAIN_DEV_CONTROL_API_ORIGIN ?? "http://127.0.0.1:8711";

export const centerBrainShellBlockedActions = [
  "agent_command_execution",
  "external_connector_activation",
  "real_mcp_start",
  "device_remote_control",
  "package_install_from_ui",
  "paid_api_call",
  "deploy_push_publish",
  "secret_read_or_print",
];

export const centerBrainShellFallback: CenterBrainShellStatus = {
  title: "CenterBrain Shell",
  status: "centerbrain-shell-fallback-local-only",
  shellMode: "nextjs-tailwind-local-shell",
  apiContract: "consume-existing-dev-control-api",
  summary: {
    aiNodes: 9,
    deviceNodes: 3,
    connectorLanes: 15,
    stackLanes: 7,
    liveExternalActions: 0,
  },
  guardrails: {
    canRunMcp: false,
    canDeploy: false,
    canExecuteCommands: false,
    canActivateConnectors: false,
    canReadSecrets: false,
    canSendMessages: false,
    canRemoteControlDevices: false,
  },
  aiNodes: [
    { id: "codex", label: "Codex", status: "first-safe-smoke", lane: "ai-node" },
    { id: "claude-code", label: "Claude Code", status: "second-safe-smoke", lane: "ai-node" },
    { id: "hermes-agent", label: "Hermes Agent", status: "direct-help-only", lane: "ai-node" },
  ],
  deviceNodes: [
    { id: "mac", label: "Mac mini", status: "active-local-host", lane: "device" },
    { id: "pc", label: "PC", status: "manual-pairing-required", lane: "device" },
    { id: "mobile", label: "Mobile phone", status: "control-client-planned", lane: "device" },
  ],
  stackLanes: [
    { id: "nextjs", label: "Next.js", status: "shell-layer", lane: "stack" },
    { id: "tailwind", label: "Tailwind", status: "view-layer", lane: "stack" },
    { id: "javascript", label: "JavaScript", status: "browser-runtime", lane: "stack" },
    { id: "golang", label: "Go", status: "future-worker-lane", lane: "stack" },
  ],
  connectorLanes: [
    { id: "figma", label: "Figma", status: "locked-local-only", lane: "connector" },
    { id: "canva", label: "Canva", status: "locked-local-only", lane: "connector" },
    { id: "github", label: "GitHub", status: "locked-local-only", lane: "connector" },
    { id: "supabase", label: "Supabase", status: "locked-local-only", lane: "connector" },
  ],
  blockedActions: centerBrainShellBlockedActions,
  stopPoint: "CENTERBRAIN SHELL READY - LOCAL ONLY - WAITING FOR UI SMOKE APPROVAL",
  requiresHumanApproval: true,
  canExecuteCommands: false,
  canActivateConnectors: false,
  canDeploy: false,
  source: "fallback",
};

export function buildCenterBrainApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${localApiOrigin}${normalizedPath}`;
}

export function normalizeCenterBrainStatus(input: unknown): CenterBrainShellStatus {
  const record = isRecord(input) ? input : {};
  const summaryRecord = isRecord(record.summary) ? record.summary : {};
  const guardrailRecord = isRecord(record.guardrails) ? record.guardrails : {};

  return {
    ...centerBrainShellFallback,
    status: typeof record.status === "string" ? record.status : centerBrainShellFallback.status,
    summary: {
      aiNodes: toNumber(summaryRecord.aiNodes, centerBrainShellFallback.summary.aiNodes),
      deviceNodes: toNumber(summaryRecord.deviceNodes, centerBrainShellFallback.summary.deviceNodes),
      connectorLanes: toNumber(
        summaryRecord.connectorLanes,
        centerBrainShellFallback.summary.connectorLanes,
      ),
      stackLanes: toNumber(summaryRecord.stackLanes, centerBrainShellFallback.summary.stackLanes),
      liveExternalActions: 0,
    },
    guardrails: guardrailDenyList(guardrailRecord),
    aiNodes: normalizeNodeList(record.aiNodes, centerBrainShellFallback.aiNodes),
    deviceNodes: normalizeNodeList(record.deviceNodes, centerBrainShellFallback.deviceNodes),
    stackLanes: normalizeNodeList(record.stackLanes, centerBrainShellFallback.stackLanes),
    connectorLanes: normalizeNodeList(record.connectorLanes, centerBrainShellFallback.connectorLanes),
    blockedActions: normalizeStringList(record.blockedActions, centerBrainShellBlockedActions),
    source: "live",
  };
}

export async function fetchCenterBrainStatus(): Promise<CenterBrainShellStatus> {
  try {
    const response = await fetch("/api/centerbrain-hub", { cache: "no-store" });
    if (!response.ok) {
      return centerBrainShellFallback;
    }

    const data: unknown = await response.json();
    return normalizeCenterBrainStatus(data);
  } catch {
    return centerBrainShellFallback;
  }
}

function guardrailDenyList(_guardrails: Record<string, unknown>): CenterBrainGuardrails {
  return {
    canRunMcp: false,
    canDeploy: false,
    canExecuteCommands: false,
    canActivateConnectors: false,
    canReadSecrets: false,
    canSendMessages: false,
    canRemoteControlDevices: false,
  };
}

function normalizeNodeList(value: unknown, fallback: CenterBrainNode[]): CenterBrainNode[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const nodes = value
    .filter(isRecord)
    .map((node) => {
      const normalized: CenterBrainNode = {
        id: String(node.id ?? node.label ?? "unknown"),
        label: String(node.label ?? node.id ?? "Unknown"),
        status: String(node.status ?? node.classification ?? "local-only"),
      };

      if (typeof node.lane === "string") {
        normalized.lane = node.lane;
      }

      return normalized;
    });

  return nodes.length > 0 ? nodes : fallback;
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
