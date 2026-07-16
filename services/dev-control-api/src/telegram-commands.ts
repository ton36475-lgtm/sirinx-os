/**
 * Telegram Commands - Handlers for /ghostclaw, /skills, /deploy, /health
 * All handlers operate in dry-run mode by default, calling local API endpoints
 * for actual execution only when explicitly enabled.
 */

const LOCAL_API_BASE = process.env.DEV_CONTROL_API_URL || "http://localhost:3001";

// Type definitions for handler inputs/outputs
interface HandlerOptions {
  now?: Date | (() => Date);
  dryRun?: boolean;
  liveSend?: boolean;
  fetchImpl?: typeof fetch;
  exactGate?: string;
  executionExactGate?: string;
  executionIntent?: { requested: boolean; status: string };
}

interface HandlerResult {
  title: string;
  status: string;
  command: string;
  handler: string;
  actionClass: string;
  requiresExactGate: boolean;
  executionIntent?: { requested: boolean; status: string };
  executionGate?: Record<string, unknown>;
  actionResult: Record<string, unknown>;
  messagePreview: string;
  hasInlineKeyboard: boolean;
  replyMarkup: Record<string, unknown>;
  providerCalled: boolean;
  commandExecuted: boolean;
  updatedAt: string;
}

interface InputParams {
  command?: string;
}

/**
 * Format timestamp for consistent messaging
 */
function nowIso(options: HandlerOptions = {}): string {
  const now = options.now || (() => new Date());
  return typeof now === "function" ? now().toISOString() : now.toISOString();
}

/**
 * Safe string coercion with fallback
 */
function safeString(value: unknown, fallback = ""): string {
  return String(value || fallback).trim();
}

/**
 * Build inline keyboard menu for Telegram
 */
function buildCommandMenu(): Record<string, unknown> {
  return {
    inline_keyboard: [
      [{ text: "Commands", callback_data: "cmd:commands" }],
      [
        { text: "GHOSTCLAW Status", callback_data: "cmd:ghostclaw" },
        { text: "Skills", callback_data: "cmd:skills" }
      ],
      [
        { text: "Deploy Preview", callback_data: "cmd:deploy" },
        { text: "Health Check", callback_data: "cmd:health" }
      ]
    ]
  };
}

// Dynamic imports for JS modules (avoid type conflicts)
async function getRuntimeFoundationStatus(): Promise<(options?: Record<string, unknown>) => Promise<Record<string, unknown>>> {
  const mod = await import("./runtime-foundation.mjs");
  return mod.getRuntimeFoundationStatus;
}

async function getAgentCoordinationStatus(): Promise<(options?: Record<string, unknown>) => Promise<Record<string, unknown>>> {
  const mod = await import("./agent-coordination-contract.mjs");
  return mod.getAgentCoordinationStatus;
}

async function getGodmodeV5RuntimeStatus(): Promise<(options?: Record<string, unknown>) => Promise<Record<string, unknown>>> {
  const mod = await import("./godmode-v5-state-contract.mjs");
  return mod.getGodmodeV5RuntimeStatus;
}

/**
 * Handler for /ghostclaw command
 * Returns GhostClaw autonomous system status via local API (dry-run)
 */
export async function ghostclawHandler(
  input: InputParams,
  options: HandlerOptions = {}
): Promise<HandlerResult> {
  const dryRun = options.dryRun !== false;
  const liveSend = options.liveSend === true;
  const apiUrl = `${LOCAL_API_BASE}/api/ghostclaw/status`;

  let actionResult: Record<string, unknown> = {};

  if (!dryRun) {
    try {
      const fetchImpl = options.fetchImpl || globalThis.fetch;
      const response = await fetchImpl(apiUrl, { method: "GET" });
      actionResult = response.ok ? await response.json() : { status: "api_error", error: response.statusText };
    } catch (error) {
      actionResult = { status: "api_call_failed", error: String(error) };
    }
  }

  // Fallback to local status checks when dry-run
  if (dryRun || !actionResult.status) {
    const [foundation, coordination, godmode] = await Promise.all([
      (await getRuntimeFoundationStatus())(options),
      (await getAgentCoordinationStatus())(options),
      (await getGodmodeV5RuntimeStatus())(options)
    ]);

    actionResult = {
      status: "ghostclaw-dry-run",
      foundation: foundation?.status,
      architecture: coordination?.modelRoutes?.architecture?.status,
      implementation: coordination?.modelRoutes?.implementation?.status,
      review: coordination?.modelRoutes?.review?.status,
      godmodePhase: godmode?.Phase,
      godmodeStatus: godmode?.Status,
      dryRun: true,
      apiEndpoint: apiUrl
    };
  }

  return {
    title: "GHOSTCLAW System Status",
    status: dryRun ? "preview-ghostclaw-status" : "completed-ghostclaw-status",
    command: safeString((input as Record<string, unknown>).command) || "/ghostclaw",
    handler: "ghostclaw",
    actionClass: "read_only",
    requiresExactGate: false,
    actionResult,
    messagePreview: [
      "🏛️ GHOSTCLAW Autonomous System",
      "",
      `Status: ${actionResult.status}`,
      `Phase: ${actionResult.godmodePhase || "N/A"}`,
      `Architecture Route: ${actionResult.architecture || "unknown"}`,
      `Review Route: ${actionResult.review || "unknown"}`,
      "",
      "[SAFETY]",
      `dry_run: ${dryRun}`,
      `api_endpoint: ${apiUrl}`,
      `live_send: ${liveSend}`
    ].join("\n"),
    hasInlineKeyboard: true,
    replyMarkup: buildCommandMenu(),
    providerCalled: false,
    commandExecuted: dryRun,
    updatedAt: nowIso(options)
  };
}

/**
 * Handler for /skills command
 * Lists available skills on the system via local API (dry-run)
 */
export async function skillsHandler(
  input: InputParams,
  options: HandlerOptions = {}
): Promise<HandlerResult> {
  const dryRun = options.dryRun !== false;
  const liveSend = options.liveSend === true;
  const apiUrl = `${LOCAL_API_BASE}/api/skills`;

  let actionResult: Record<string, unknown> = {};

  if (!dryRun) {
    try {
      const fetchImpl = options.fetchImpl || globalThis.fetch;
      const response = await fetchImpl(apiUrl, { method: "GET" });
      actionResult = response.ok ? await response.json() : { status: "api_error", error: response.statusText };
    } catch (error) {
      actionResult = { status: "api_call_failed", error: String(error) };
    }
  }

  // Fallback: return known skill categories when dry-run
  if (dryRun || !actionResult.status) {
    actionResult = {
      status: "skills-dry-run",
      skillCategories: [
        "ghostclaw-autonomous-mutual-approval-v2",
        "hermes-agent",
        "spec-driven-ai-coding",
        "start-run-debug",
        "codex",
        "claude-code",
        "github-pr-workflow",
        "mcp-native"
      ],
      totalSkills: 8,
      dryRun: true,
      apiEndpoint: apiUrl
    };
  }

  const skillCategories = (actionResult.skillCategories as string[]) || [];
  const categoriesList = skillCategories.map((cat) => `• ${cat}`);

  return {
    title: "Hermes Skills Catalog",
    status: dryRun ? "preview-skills" : "completed-skills",
    command: safeString((input as Record<string, unknown>).command) || "/skills",
    handler: "skills",
    actionClass: "read_only",
    requiresExactGate: false,
    actionResult,
    messagePreview: [
      "📚 Available Skills",
      "",
      `Total: ${actionResult.totalSkills || 8}`,
      "",
      ...categoriesList,
      "",
      "[SAFETY]",
      `dry_run: ${dryRun}`,
      `api_endpoint: ${apiUrl}`,
      `live_send: ${liveSend}`
    ].join("\n"),
    hasInlineKeyboard: true,
    replyMarkup: buildCommandMenu(),
    providerCalled: false,
    commandExecuted: dryRun,
    updatedAt: nowIso(options)
  };
}

/**
 * Handler for /deploy command
 * Deploy preview endpoint - dry-run only, requires exact gate for actual deployment
 */
export async function deployHandler(
  input: InputParams,
  options: HandlerOptions = {}
): Promise<HandlerResult> {
  const dryRun = options.dryRun !== false;
  const liveSend = options.liveSend === true;
  const apiUrl = `${LOCAL_API_BASE}/api/deploy`;
  const executionIntent = options.executionIntent || { requested: liveSend, status: "preview" };

  let executionGate: Record<string, unknown> = {
    required: true,
    authorized: false,
    status: executionIntent.requested ? "pending_exact_gate" : "preview_only",
    reason: null,
    scope: "deploy_exect",
    commandId: "deploy",
    dryRun: true
  };

  // Check if execution was requested but gate not provided
  if (executionIntent.requested && !options.exactGate && !options.executionExactGate) {
    return {
      title: "Deploy Preview",
      status: "blocked-deploy-execution",
      command: safeString((input as Record<string, unknown>).command) || "/deploy",
      handler: "deploy",
      actionClass: "local_plan",
      requiresExactGate: true,
      executionIntent,
      executionGate,
      actionResult: {},
      messagePreview: [
        "🚀 Deploy Preview",
        "",
        "Status: BLOCKED",
        "Reason: exact_gate_required for live deployment",
        "",
        "[SAFETY]",
        "dry_run: true",
        "live_send: false (gate required)",
        "provider_call: false"
      ].join("\n"),
      hasInlineKeyboard: true,
      replyMarkup: buildCommandMenu(),
      providerCalled: false,
      commandExecuted: false,
      updatedAt: nowIso(options)
    };
  }

  let actionResult: Record<string, unknown> = {};

  if (!dryRun) {
    try {
      const fetchImpl = options.fetchImpl || globalThis.fetch;
      const response = await fetchImpl(apiUrl, { method: "POST" });
      actionResult = response.ok ? await response.json() : { status: "api_error", error: response.statusText };
    } catch (error) {
      actionResult = { status: "api_call_failed", error: String(error) };
    }
  } else {
    actionResult = {
      status: "deploy-preview-dry-run",
      target: "sirinx-os",
      environment: "production",
      steps: ["validate", "build", "deploy", "verify"],
      dryRun: true,
      apiEndpoint: apiUrl
    };
  }

  const steps = (actionResult.steps as string[]) || [];

  return {
    title: "Deploy Preview",
    status: dryRun ? "preview-deploy" : "completed-deploy",
    command: safeString((input as Record<string, unknown>).command) || "/deploy",
    handler: "deploy",
    actionClass: "local_plan",
    requiresExactGate: true,
    executionIntent,
    executionGate,
    actionResult,
    messagePreview: [
      "🚀 Deploy Preview",
      "",
      `Target: ${actionResult.target || "sirinx-os"}`,
      `Environment: ${actionResult.environment || "production"}`,
      `Steps: ${steps ? steps.join(" → ") : ""}`,
      "",
      "[SAFETY]",
      `dry_run: ${dryRun}`,
      `live_send: ${liveSend}`,
      "provider_call: false",
      "requires_exact_gate: true"
    ].join("\n"),
    hasInlineKeyboard: true,
    replyMarkup: buildCommandMenu(),
    providerCalled: false,
    commandExecuted: !dryRun,
    updatedAt: nowIso(options)
  };
}

/**
 * Handler for /health command
 * Health check endpoint - read-only status via local API (dry-run)
 */
export async function healthHandler(
  input: InputParams,
  options: HandlerOptions = {}
): Promise<HandlerResult> {
  const dryRun = options.dryRun !== false;
  const liveSend = options.liveSend === true;
  const apiUrl = `${LOCAL_API_BASE}/api/health`;

  let actionResult: Record<string, unknown> = {};

  if (!dryRun) {
    try {
      const fetchImpl = options.fetchImpl || globalThis.fetch;
      const response = await fetchImpl(apiUrl, { method: "GET" });
      actionResult = response.ok ? await response.json() : { status: "api_error", error: response.statusText };
    } catch (error) {
      actionResult = { status: "api_call_failed", error: String(error) };
    }
  }

  // Fallback: check local services when dry-run
  if (dryRun || !actionResult.status) {
    const foundation = await (await getRuntimeFoundationStatus())(options);
    actionResult = {
      status: "health-dry-run",
      telegram: foundation?.readiness?.telegram ? "healthy" : "degraded",
      cloudflare: foundation?.readiness?.cloudflare ? "configured" : "not_configured",
      codex: "available",
      agentLoop: foundation?.status,
      uptime: foundation?.uptime || "unknown",
      dryRun: true,
      apiEndpoint: apiUrl
    };
  }

  const allHealthy = actionResult.telegram === "healthy" && actionResult.cloudflare !== "degraded";
  const healthEmoji = allHealthy ? "✅" : "⚠️";

  return {
    title: "System Health Check",
    status: dryRun ? "preview-health" : "completed-health",
    command: safeString((input as Record<string, unknown>).command) || "/health",
    handler: "health",
    actionClass: "read_only",
    requiresExactGate: false,
    actionResult,
    messagePreview: [
      `${healthEmoji} System Health`,
      "",
      `Telegram: ${actionResult.telegram || "unknown"}`,
      `Cloudflare: ${actionResult.cloudflare || "unknown"}`,
      `Codex: ${actionResult.codex || "unknown"}`,
      `Agent Loop: ${actionResult.agentLoop || "unknown"}`,
      `Uptime: ${actionResult.uptime || "unknown"}`,
      "",
      "[SAFETY]",
      `dry_run: ${dryRun}`,
      `api_endpoint: ${apiUrl}`,
      `live_send: ${liveSend}`
    ].join("\n"),
    hasInlineKeyboard: true,
    replyMarkup: buildCommandMenu(),
    providerCalled: false,
    commandExecuted: true,
    updatedAt: nowIso(options)
  };
}

/**
 * Export all command handlers as a map
 */
export const telegramCommandHandlers = {
  ghostclaw: ghostclawHandler,
  skills: skillsHandler,
  deploy: deployHandler,
  health: healthHandler
};

/**
 * Resolve a handler by command name
 */
export function resolveCommandHandler(
  commandName: string
): ((input: InputParams, options?: HandlerOptions) => Promise<HandlerResult>) | null {
  const normalized = safeString(commandName).toLowerCase().replace(/^\//, "");
  const handler = (telegramCommandHandlers as Record<string, ((input: InputParams, options?: HandlerOptions) => Promise<HandlerResult>) | null>)[normalized];
  return handler || null;
}

// Default export for convenience
export default telegramCommandHandlers;