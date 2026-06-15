import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { ensureApprovalRequest, listApprovalQueue } from "./src/approval-queue.mjs";
import { getApprovalEvidenceSnapshot, writeApprovalEvidenceSnapshot } from "./src/approval-evidence.mjs";
import { evaluateHermesInboxDryRun } from "../hermes-api/src/inbox.mjs";
import {
  createAdaptiveCommandDryRun,
  getAdaptiveCommandGatewayStatus
} from "../hermes-api/src/adaptive-command-gateway.mjs";
import { listAuditEvents, recordAuditEvent, recordDryRunAuditEvent } from "./src/audit-events.mjs";
import { getBrainNote, listBrainNotes } from "./src/brain.mjs";
import { getExternalGatePackets, writeExternalGatePackets } from "./src/external-gate-packets.mjs";
import { getExternalGateEvidenceStatus } from "./src/external-gate-evidence.mjs";
import { getExternalGatePreflight, writeExternalGatePreflight } from "./src/external-gate-preflight.mjs";
import { getExternalGateRunnerStatus } from "./src/external-gate-runner.mjs";
import { getPendingWorkLedger } from "./src/pending-work.mjs";
import { actions, createDryRunResult, gates } from "./src/gates.mjs";
import { getProjectInventory } from "./src/project-inventory.mjs";
import { getGithubIntegrationInventory } from "./src/github-integration.mjs";
import { getLeadCrmContract } from "./src/lead-crm-contract.mjs";
import { getPublicWebsiteStatus } from "./src/public-website.mjs";
import { getLeadEventAuditPreview } from "./src/lead-event-audit.mjs";
import { getLeadBackendHealth } from "./src/lead-health.mjs";
import { getMobileReviewPacket, writeMobileReviewPacket } from "./src/mobile-review-packet.mjs";
import { getPolicyCoreStatus } from "./src/policy-core-status.mjs";
import { getProposalDraftPreview, writeLocalProposalDraft } from "./src/proposal-draft.mjs";
import { getProposalReviewStatus, writeProposalReviewPacket } from "./src/proposal-review.mjs";
import { getRoiPreview } from "./src/roi-preview.mjs";
import { getSalesArtifactsStatus } from "./src/sales-artifacts.mjs";
import { getSolarOpsContract } from "./src/solar-ops-contract.mjs";
import { getSocStatus } from "./src/soc-status.mjs";
import { switches } from "./src/switches.mjs";
import { getTruthProtocolStatus } from "./src/truth-protocol.mjs";
import { getRoninAgentTeam } from "./src/agent-team.mjs";
import { getVibeCodingAgentStatus } from "./src/vibe-coding-agent.mjs";
import { getVibeCommandCenter } from "./src/vibe-workflows.mjs";
import { createGatewayAgentDryRunPlan, getGatewayAgentStatus } from "./src/gateway-agent.mjs";
import { createAiTeamPairingDryRun, getAiTeamPairingStatus } from "./src/ai-team-pairing.mjs";
import { createConnectorRegistryDryRun, getConnectorRegistryStatus } from "./src/connector-registry.mjs";
import { createLocalRagQueryDryRun, createLocalRagScanDryRun, getLocalRagStatus } from "./src/local-rag.mjs";
import { createAgentLaunchGateDryRun, getAgentLaunchGateStatus } from "./src/agent-launch-gate.mjs";
import { createAgentDriverSmokeDryRun, getAgentDriverStatus } from "./src/agent-driver.mjs";
import { createCenterBrainSyncDryRun, getCenterBrainHubStatus } from "./src/centerbrain-hub.mjs";
import { createRepoIntakeReviewDryRun, getRepoIntakeGateStatus } from "./src/repo-intake-gate.mjs";
import { createTeamRuntimeBridgeDryRun, getTeamRuntimeBridgeStatus } from "./src/team-runtime-bridge.mjs";
import {
  createOpenRouterQwenAdapterDryRun,
  getOpenRouterQwenAdapterStatus
} from "./src/openrouter-qwen-adapter.mjs";
import {
  createOpenRouterFusionRouterDryRun,
  getOpenRouterFusionRouterStatus
} from "./src/openrouter-fusion-router.mjs";
import {
  createOpenRouterQwenModelRoutingApprovalDryRun,
  getOpenRouterQwenModelRoutingApproval
} from "./src/model-routing-approval.mjs";
import {
  createHermesSpecFirstSwarmDryRun,
  getHermesSpecFirstSwarmStatus
} from "./src/hermes-spec-first-swarm.mjs";
import {
  createHermesAgentAuditApprovalDryRun,
  getHermesAgentAuditStatus
} from "./src/hermes-agent-audit.mjs";
import {
  createHermesImageEditAcceptanceDryRun,
  createHermesImageEditDryRun,
  getHermesImageEditStatus
} from "./src/hermes-image-edit.mjs";

const execFileAsync = promisify(execFile);
const host = process.env.DEV_CONTROL_API_HOST || "127.0.0.1";
const port = Number(process.env.DEV_CONTROL_API_PORT || 8711);
const hermesDashboardUrl = process.env.HERMES_DASHBOARD_URL || "http://127.0.0.1:9119";
const hermesKanbanBoard = process.env.HERMES_KANBAN_BOARD || "sirinx-os";
const projectRoot = process.env.SIRINX_PROJECT_ROOT || "/Users/sirinx/sirinx-os";
const hermesAgentDir = `${projectRoot}/.claude/agents`;
const thClawsAgentDir = `${projectRoot}/.thclaws/agents`;
const hermesSkillDir = `${projectRoot}/.claude/skills`;
const allowedOrigins = new Set([
  "http://localhost:8710",
  "http://127.0.0.1:8710"
]);

function getCorsOrigin(request) {
  const origin = request.headers.origin;
  return allowedOrigins.has(origin) ? origin : "http://localhost:8710";
}

function sendJson(request, response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": getCorsOrigin(request),
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(body, null, 2));
}

async function readJson(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function checkHttp(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1800);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return {
      online: response.status < 500,
      status: response.status
    };
  } catch (error) {
    return {
      online: false,
      error: error.name === "AbortError" ? "timeout" : "unreachable"
    };
  } finally {
    clearTimeout(timeout);
  }
}

function humanizeName(value) {
  return value
    .replace(/\.md$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function readFrontmatterValue(content, key) {
  const match = content.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return match ? match[1].replace(/^["']|["']$/g, "").trim() : "";
}

async function loadMarkdownCards(directory, sourceLabel) {
  try {
    const files = (await readdir(directory))
      .filter((file) => file.endsWith(".md"))
      .sort();

    return Promise.all(
      files.map(async (file) => {
        const content = await readFile(`${directory}/${file}`, "utf8");
        return {
          id: file.replace(/\.md$/i, ""),
          name: readFrontmatterValue(content, "name") || humanizeName(file),
          description: readFrontmatterValue(content, "description") || "Ready for local project work.",
          source: sourceLabel
        };
      })
    );
  } catch {
    return [];
  }
}

async function loadSkillCards(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const folders = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

    return Promise.all(
      folders.map(async (folder) => {
        try {
          const content = await readFile(`${directory}/${folder}/SKILL.md`, "utf8");
          const firstTextLine =
            content
              .split("\n")
              .map((line) => line.trim())
              .find((line) => line && !line.startsWith("#") && !line.startsWith("---")) || "";
          return {
            id: folder,
            name: humanizeName(folder),
            description: firstTextLine || "Installed local Hermes workflow skill."
          };
        } catch {
          return {
            id: folder,
            name: humanizeName(folder),
            description: "Installed local Hermes workflow skill."
          };
        }
      })
    );
  } catch {
    return [];
  }
}

function parseKanbanTasks(output) {
  return output
    .split("\n")
    .map((line) => {
      const match = line.trim().match(/^(?:\S+\s+)?(t_[a-z0-9]+)\s+(\w+)\s+(\S+)\s+(.+)$/i);
      if (!match) {
        return null;
      }
      return {
        id: match[1],
        state: match[2],
        lane: match[3],
        title: match[4]
      };
    })
    .filter(Boolean);
}

function buildService(name, check, detail) {
  return {
    name,
    online: Boolean(check.online),
    status: check.status || null,
    detail
  };
}

async function runHermes(args) {
  try {
    const { stdout, stderr } = await execFileAsync("hermes", args, {
      timeout: 3500,
      maxBuffer: 256 * 1024
    });
    return { ok: true, output: `${stdout}${stderr}` };
  } catch (error) {
    return {
      ok: false,
      output: `${error.stdout || ""}${error.stderr || ""}`.trim(),
      code: error.code || "failed"
    };
  }
}

function parseGatewayStatus(output) {
  return {
    running: /Gateway is running/i.test(output),
    service: /Running manually/i.test(output) ? "manual" : "service"
  };
}

async function hasTmuxSession(name) {
  try {
    await execFileAsync("tmux", ["has-session", "-t", name], {
      timeout: 1000,
      maxBuffer: 8 * 1024
    });
    return true;
  } catch {
    return false;
  }
}

function parseKanbanStats(output) {
  const stats = {
    triage: 0,
    todo: 0,
    ready: 0,
    running: 0,
    blocked: 0,
    done: 0
  };

  for (const line of output.split("\n")) {
    const match = line.trim().match(/^(triage|todo|ready|running|blocked|done)\s+(\d+)$/);
    if (match) {
      stats[match[1]] = Number(match[2]);
    }
  }

  return stats;
}

async function getHermesStatus() {
  const [dashboard, gateway, kanban, safeGatewaySession] = await Promise.all([
    checkHttp(hermesDashboardUrl),
    runHermes(["gateway", "status"]),
    runHermes(["kanban", "--board", hermesKanbanBoard, "stats"]),
    hasTmuxSession("hermes-gateway-safe")
  ]);

  const gatewayState = parseGatewayStatus(gateway.output);
  const kanbanStats = parseKanbanStats(kanban.output);

  return {
    connected: dashboard.online && gatewayState.running,
    dashboard: {
      online: dashboard.online,
      url: hermesDashboardUrl,
      status: dashboard.status || null
    },
    gateway: {
      running: gatewayState.running,
      mode: gatewayState.service,
      safeDispatch: safeGatewaySession || process.env.HERMES_KANBAN_DISPATCH_IN_GATEWAY === "0"
    },
    kanban: {
      board: hermesKanbanBoard,
      stats: kanbanStats,
      ready: kanbanStats.ready,
      ok: kanban.ok
    },
    updatedAt: new Date().toISOString()
  };
}

async function getExecutiveHq() {
  const [
    hermes,
    kanbanList,
    hermesAgents,
    thClawsAgents,
    hermesSkills,
    dashboard,
    controlApi,
    ollama,
    n8n,
    mcpGateway,
    rabbitMq
  ] = await Promise.all([
    getHermesStatus(),
    runHermes(["kanban", "--board", hermesKanbanBoard, "list"]),
    loadMarkdownCards(hermesAgentDir, "Hermes"),
    loadMarkdownCards(thClawsAgentDir, "thClaws"),
    loadSkillCards(hermesSkillDir),
    checkHttp("http://127.0.0.1:8710"),
    checkHttp(`http://${host}:${port}/health`),
    checkHttp("http://127.0.0.1:11434"),
    checkHttp("http://127.0.0.1:5678"),
    checkHttp("http://127.0.0.1:8787"),
    checkHttp("http://127.0.0.1:15672")
  ]);
  const publicWebsite = await getPublicWebsiteStatus();
  const projectInventory = await getProjectInventory();
  const roninTeam = getRoninAgentTeam();

  const kanbanTasks = parseKanbanTasks(kanbanList.output);
  const services = [
    buildService("SIRINX dashboard", dashboard, "Presentation surface at http://127.0.0.1:8710"),
    buildService("Control API", controlApi, "Local dry-run command API"),
    buildService("Public website", publicWebsite.primary || {}, publicWebsite.domain),
    buildService("Hermes Agent HQ", hermes.dashboard, hermesDashboardUrl),
    {
      name: "Hermes gateway",
      online: Boolean(hermes.gateway.running),
      status: null,
      detail: hermes.gateway.safeDispatch ? "Running in presentation-safe mode" : "Running with dispatcher enabled"
    },
    buildService("Local Ollama brain", ollama, "Local model endpoint on port 11434"),
    buildService("n8n automation", n8n, "Browser/workflow automation surface"),
    buildService("MCP gateway", mcpGateway, "Tool bridge for local integrations"),
    buildService("RabbitMQ control", rabbitMq, "Queue dashboard for async work")
  ];

  const projects = [
    {
      name: "SIRINX public website management",
      status: publicWebsite.status,
      surface: `${publicWebsite.domain} (${publicWebsite.provider})`,
      run: "curl /api/website"
    },
    {
      name: "Subdomain integration inventory",
      status: projectInventory.blockers.length ? "blocked review" : "ready",
      surface: "read-only project map",
      run: "curl /api/project-inventory"
    },
    {
      name: "SIRINX developer command center",
      status: dashboard.online ? "live" : "needs start",
      surface: "http://127.0.0.1:8710",
      run: "pnpm dashboard:restart"
    },
    {
      name: "Hermes agent dashboard",
      status: hermes.dashboard.online ? "live" : "needs start",
      surface: hermesDashboardUrl,
      run: "hermes-dashboard"
    },
    {
      name: "Agent team orchestration",
      status: hermesAgents.length && thClawsAgents.length ? "ready" : "needs agents",
      surface: `${hermesAgents.length + thClawsAgents.length} local roles`,
      run: "hermes kanban --board sirinx-os list"
    },
    {
      name: "Website browser automation",
      status: n8n.online || mcpGateway.online ? "ready" : "local tools ready",
      surface: "Browser, Playwright, MCP bridge",
      run: "pnpm dashboard:e2e"
    },
    {
      name: "Obsidian SIRINX knowledge",
      status: "indexed",
      surface: "/Users/sirinx/Documents/Obsidian Vault/SIRINX",
      run: "pnpm hq:digest"
    },
    {
      name: "Telegram Hermes channel",
      status: "waiting for channel approval",
      surface: "Bot token verified; delivery needs chat/channel start",
      run: "hermes-telegram-test"
    }
  ];

  const onlineServices = services.filter((service) => service.online).length;
  const roninProfileCount = roninTeam.summary.readyProfiles;
  const agentCount = hermesAgents.length + thClawsAgents.length + roninProfileCount;
  const canRunNow = Boolean(
    dashboard.online &&
      controlApi.online &&
      hermes.dashboard.online &&
      hermes.gateway.running &&
      agentCount
  );

  return {
    title: "Hermes Agent HQ",
    presentation: {
      mode: "Executive live demo",
      canRunNow,
      safeDispatch: hermes.gateway.safeDispatch,
      message: canRunNow
        ? "Live local HQ is connected, agent roles are loaded, and project work can be run from safe dry-run controls."
        : "HQ is partially online; keep the safe controls visible while the missing local service starts."
    },
    metrics: {
      servicesOnline: onlineServices,
      servicesTotal: services.length,
      hermesAgents: hermesAgents.length,
      thClawsAgents: thClawsAgents.length,
      roninProfiles: roninProfileCount,
      skills: hermesSkills.length,
      kanbanReady: hermes.kanban.ready,
      kanbanRunning: hermes.kanban.stats.running,
      kanbanBlocked: hermes.kanban.stats.blocked
    },
    services,
    agentTeams: [
      {
        name: "SIRINX 47 Ronin Active Profiles",
        agents: roninTeam.activeProfiles.map((profile) => ({
          id: profile.name,
          name: profile.name,
          description: `${profile.title}: ${profile.responsibility}`
        }))
      },
      {
        name: "Hermes Agent Team",
        agents: hermesAgents
      },
      {
        name: "thClaws Project Team",
        agents: thClawsAgents
      }
    ],
    skills: hermesSkills,
    projects,
    kanbanTasks,
    hermes,
    roninTeam,
    publicWebsite,
    projectInventory,
    updatedAt: new Date().toISOString()
  };
}

export async function handleRequest(request, response) {
  const url = new URL(request.url || "/", `http://${host}:${port}`);

  if (request.method === "OPTIONS") {
    sendJson(request, response, 204, {});
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(request, response, 200, {
      status: "ok",
      service: "sirinx-dev-control-api",
      dryRunOnly: true,
      externalWrites: false
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/gates") {
    sendJson(request, response, 200, { gates });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/actions") {
    sendJson(request, response, 200, { actions });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/switches") {
    sendJson(request, response, 200, { switches });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/approval-queue") {
    sendJson(request, response, 200, listApprovalQueue());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/approval-evidence") {
    sendJson(request, response, 200, getApprovalEvidenceSnapshot());
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/approval-evidence/write") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, await writeApprovalEvidenceSnapshot(body));
    } catch (error) {
      sendJson(request, response, 500, {
        error: "approval_evidence_write_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        requiresHumanReview: true
      });
    }
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/audit-events") {
    sendJson(request, response, 200, listAuditEvents());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/hermes") {
    sendJson(request, response, 200, await getHermesStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/hermes-agent-audit") {
    sendJson(request, response, 200, await getHermesAgentAuditStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/hermes-adaptive-command-gateway") {
    sendJson(request, response, 200, getAdaptiveCommandGatewayStatus());
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/hermes-adaptive-command-gateway/telegram/dry-run") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, createAdaptiveCommandDryRun(body));
    } catch (error) {
      sendJson(request, response, 400, {
        status: "invalid_hermes_adaptive_command_gateway_request",
        error: "hermes_adaptive_command_gateway_dry_run_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
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
        canPush: false,
        canPublish: false,
        shouldForwardToLlm: false,
        requiresHumanApproval: true
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/hermes-agent-audit/approval/dry-run") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, await createHermesAgentAuditApprovalDryRun(body));
    } catch (error) {
      sendJson(request, response, 400, {
        status: "invalid_hermes_agent_audit_approval_request",
        error: "hermes_agent_audit_approval_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        canRestartGateway: false,
        canSendMessages: false,
        canRunMcp: false,
        commandExecuted: false,
        gatewayRestarted: false,
        messageSent: false,
        secretsRead: false,
        requiresHumanApproval: true
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/hermes-inbox/dry-run") {
    try {
      const body = await readJson(request);
      const result = evaluateHermesInboxDryRun(body, {
        source: request.headers["x-sirinx-source"],
        signatureVerified: false
      });

      if (result.status === 202 && result.body.normalizedAction) {
        result.body.approvalRequest = ensureApprovalRequest(
          {
            id: result.body.normalizedAction.id,
            title: `Hermes inbox: ${result.body.normalizedAction.id}`,
            risk: result.body.normalizedAction.productionWrite || result.body.normalizedAction.customerVisible ? "high" : "medium"
          },
          []
        );
      }

      if (result.body.auditEvent) {
        recordAuditEvent(result.body.auditEvent);
      }

      sendJson(request, response, result.status, result.body);
    } catch (error) {
      sendJson(request, response, 400, {
        status: "invalid_request",
        error: "hermes_inbox_dry_run_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        requiresHumanApproval: true
      });
    }
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/executive-hq") {
    sendJson(request, response, 200, await getExecutiveHq());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/website") {
    sendJson(request, response, 200, await getPublicWebsiteStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/lead-health") {
    sendJson(request, response, 200, await getLeadBackendHealth());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/lead-event-audit") {
    sendJson(request, response, 200, getLeadEventAuditPreview());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/lead-crm-contract") {
    sendJson(request, response, 200, getLeadCrmContract());
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/lead-event-audit/preview") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, getLeadEventAuditPreview(body));
    } catch (error) {
      sendJson(request, response, 400, {
        status: "invalid_lead_event_audit_request",
        error: "lead_event_audit_preview_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        productionPostProbeRun: false,
        crmWrites: false,
        supabaseWrites: false,
        customerVisible: false,
        requiresHumanApproval: true
      });
    }
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/policy-core") {
    sendJson(request, response, 200, getPolicyCoreStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/soc/status") {
    sendJson(request, response, 200, await getSocStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/truth-protocol") {
    sendJson(request, response, 200, getTruthProtocolStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/sales-artifacts") {
    sendJson(request, response, 200, await getSalesArtifactsStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/solar-ops-contract") {
    sendJson(request, response, 200, getSolarOpsContract());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/proposal-draft") {
    sendJson(request, response, 200, await getProposalDraftPreview());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/proposal-review") {
    sendJson(request, response, 200, await getProposalReviewStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/mobile-review-packet") {
    sendJson(request, response, 200, await getMobileReviewPacket());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/external-gate-packets") {
    sendJson(request, response, 200, getExternalGatePackets());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/external-gate-evidence") {
    sendJson(request, response, 200, await getExternalGateEvidenceStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/external-gate-runner") {
    sendJson(request, response, 200, await getExternalGateRunnerStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/pending-work") {
    sendJson(request, response, 200, await getPendingWorkLedger());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/external-gate-preflight") {
    sendJson(request, response, 200, getExternalGatePreflight());
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/external-gate-preflight/write") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, await writeExternalGatePreflight(body));
    } catch (error) {
      sendJson(request, response, 500, {
        error: "external_gate_preflight_write_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        requiresHumanReview: true
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/external-gate-packets/write") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, await writeExternalGatePackets(body));
    } catch (error) {
      sendJson(request, response, 500, {
        error: "external_gate_packets_write_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        requiresHumanReview: true
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/mobile-review-packet/write") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, await writeMobileReviewPacket(body));
    } catch (error) {
      sendJson(request, response, 500, {
        error: "mobile_review_packet_write_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        requiresHumanReview: true
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/proposal-review/write") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, await writeProposalReviewPacket(body));
    } catch (error) {
      sendJson(request, response, 500, {
        error: "proposal_review_packet_write_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        requiresHumanReview: true
      });
    }
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/roi-preview") {
    sendJson(request, response, 200, await getRoiPreview());
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/roi-preview") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, await getRoiPreview(body.assumptions || body));
    } catch (error) {
      sendJson(request, response, 400, {
        error: "roi_preview_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        requiresHumanReview: true
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/proposal-draft/write") {
    try {
      const body = await readJson(request);
      const result = await writeLocalProposalDraft(body);
      sendJson(request, response, 200, result);
    } catch (error) {
      sendJson(request, response, 500, {
        error: "proposal_draft_write_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        requiresHumanReview: true
      });
    }
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/project-inventory") {
    sendJson(request, response, 200, await getProjectInventory());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/github-integration") {
    sendJson(request, response, 200, getGithubIntegrationInventory());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/vibe-command-center") {
    sendJson(request, response, 200, getVibeCommandCenter());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/vibe-coding-agent") {
    sendJson(request, response, 200, await getVibeCodingAgentStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/gateway-agent") {
    sendJson(request, response, 200, await getGatewayAgentStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/ai-team-pairing") {
    sendJson(request, response, 200, await getAiTeamPairingStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/connector-registry") {
    sendJson(request, response, 200, await getConnectorRegistryStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/agent-launch-gate") {
    sendJson(request, response, 200, getAgentLaunchGateStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/agent-driver") {
    sendJson(request, response, 200, getAgentDriverStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/centerbrain-hub") {
    sendJson(request, response, 200, await getCenterBrainHubStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/repo-intake-gate") {
    sendJson(request, response, 200, getRepoIntakeGateStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/team-runtime-bridge") {
    sendJson(request, response, 200, await getTeamRuntimeBridgeStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/openrouter-qwen-adapter") {
    sendJson(request, response, 200, getOpenRouterQwenAdapterStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/openrouter-fusion-router") {
    sendJson(request, response, 200, getOpenRouterFusionRouterStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/model-routing-approval/openrouter-qwen") {
    sendJson(request, response, 200, getOpenRouterQwenModelRoutingApproval());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/hermes-spec-first-swarm") {
    sendJson(request, response, 200, getHermesSpecFirstSwarmStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/local-rag") {
    sendJson(request, response, 200, await getLocalRagStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/hermes-image-edit") {
    sendJson(request, response, 200, getHermesImageEditStatus());
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/hermes-image-edit/dry-run") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, createHermesImageEditDryRun(body));
    } catch (error) {
      sendJson(request, response, 400, {
        status: "invalid_hermes_image_edit_dry_run_request",
        error: "hermes_image_edit_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        canExecuteExternally: false,
        canRunMcp: false,
        canReadSecrets: false,
        requiresHumanApproval: true
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/hermes-image-edit/acceptance/dry-run") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, createHermesImageEditAcceptanceDryRun(body));
    } catch (error) {
      sendJson(request, response, 400, {
        status: "invalid_hermes_image_edit_acceptance_request",
        error: "hermes_image_edit_acceptance_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        canExecuteExternally: false,
        canRunMcp: false,
        canReadSecrets: false,
        canCallProvider: false,
        canRestartGateway: false,
        requiresHumanApproval: true
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/local-rag/scan/dry-run") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, await createLocalRagScanDryRun(body));
    } catch (error) {
      sendJson(request, response, 400, {
        status: "invalid_local_rag_scan_request",
        error: "local_rag_scan_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        canCallPaidApi: false,
        canActivateConnector: false,
        canRunMcp: false,
        canReadSecrets: false,
        requiresHumanApproval: true
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/local-rag/query/dry-run") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, await createLocalRagQueryDryRun(body));
    } catch (error) {
      sendJson(request, response, 400, {
        status: "invalid_local_rag_query_request",
        error: "local_rag_query_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        canCallPaidApi: false,
        canActivateConnector: false,
        canRunMcp: false,
        canReadSecrets: false,
        requiresHumanApproval: true
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/connector-registry/dry-run") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, await createConnectorRegistryDryRun(body));
    } catch (error) {
      sendJson(request, response, 400, {
        status: "invalid_connector_registry_dry_run_request",
        error: "connector_registry_dry_run_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        canActivateConnectors: false,
        canExecuteExternally: false,
        canRunMcp: false,
        canReadSecrets: false,
        requiresHumanApproval: true
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/agent-launch-gate/plan/dry-run") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, createAgentLaunchGateDryRun(body));
    } catch (error) {
      sendJson(request, response, 400, {
        status: "invalid_agent_launch_gate_dry_run_request",
        error: "agent_launch_gate_dry_run_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        canExecuteExternally: false,
        canLaunchAgents: false,
        canRunMcp: false,
        canReadSecrets: false,
        requiresHumanApproval: true
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/agent-driver/smoke/dry-run") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, createAgentDriverSmokeDryRun(body));
    } catch (error) {
      sendJson(request, response, 400, {
        status: "invalid_agent_driver_smoke_dry_run_request",
        error: "agent_driver_smoke_dry_run_failed",
        message: error.message,
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
        requiresHumanApproval: true
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/centerbrain-hub/sync/dry-run") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, await createCenterBrainSyncDryRun(body));
    } catch (error) {
      sendJson(request, response, 400, {
        status: "invalid_centerbrain_sync_dry_run_request",
        error: "centerbrain_sync_dry_run_failed",
        message: error.message,
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
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/repo-intake-gate/review/dry-run") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, createRepoIntakeReviewDryRun(body));
    } catch (error) {
      sendJson(request, response, 400, {
        status: "invalid_repo_intake_review_dry_run_request",
        error: "repo_intake_review_dry_run_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        canExecuteExternally: false,
        canCloneRepo: false,
        canInstallPackages: false,
        canRunPostinstall: false,
        canExecuteCode: false,
        canReadSecrets: false,
        canRunMcp: false,
        canStartMcp: false,
        canSendMessages: false,
        canDeploy: false,
        canPush: false,
        canPublish: false,
        requiresHumanApproval: true
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/team-runtime-bridge/plan/dry-run") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, await createTeamRuntimeBridgeDryRun(body));
    } catch (error) {
      sendJson(request, response, 400, {
        status: "invalid_team_runtime_bridge_dry_run_request",
        error: "team_runtime_bridge_dry_run_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        canExecuteExternally: false,
        canCallPaidApi: false,
        canRunAntigravityCli: false,
        canRunMcp: false,
        canReadSecrets: false,
        canStartHermesTeam: false,
        canSendMessages: false,
        canDeploy: false,
        commandExecuted: false,
        requiresHumanApproval: true
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/openrouter-qwen-adapter/plan/dry-run") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, createOpenRouterQwenAdapterDryRun(body));
    } catch (error) {
      sendJson(request, response, 400, {
        status: "invalid_openrouter_qwen_adapter_dry_run_request",
        error: "openrouter_qwen_adapter_dry_run_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        canExecuteExternally: false,
        canCallPaidApi: false,
        canRunMcp: false,
        canReadSecrets: false,
        providerCalled: false,
        secretsRead: false,
        commandExecuted: false,
        requiresHumanApproval: true
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/openrouter-fusion-router/plan/dry-run") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, createOpenRouterFusionRouterDryRun(body));
    } catch (error) {
      sendJson(request, response, 400, {
        status: "invalid_openrouter_fusion_router_dry_run_request",
        error: "openrouter_fusion_router_dry_run_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        canExecuteExternally: false,
        canCallPaidApi: false,
        canRunMcp: false,
        canReadSecrets: false,
        providerCalled: false,
        secretsRead: false,
        keyValuePrinted: false,
        commandExecuted: false,
        requiresHumanApproval: true
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/model-routing-approval/openrouter-qwen/dry-run") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, createOpenRouterQwenModelRoutingApprovalDryRun(body));
    } catch (error) {
      sendJson(request, response, 400, {
        status: "invalid_openrouter_qwen_model_routing_approval_request",
        error: "openrouter_qwen_model_routing_approval_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        canExecuteExternally: false,
        canCallPaidApi: false,
        canRunMcp: false,
        canReadSecrets: false,
        providerCalled: false,
        secretsRead: false,
        keyValuePrinted: false,
        commandExecuted: false,
        requiresHumanApproval: true
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/ai-team-pairing/dry-run") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, await createAiTeamPairingDryRun(body));
    } catch (error) {
      sendJson(request, response, 400, {
        status: "invalid_ai_team_pairing_dry_run_request",
        error: "ai_team_pairing_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        canExecuteExternally: false,
        canSendMessages: false,
        canStartGateways: false,
        requiresHumanApproval: true
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/hermes-spec-first-swarm/plan/dry-run") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, createHermesSpecFirstSwarmDryRun(body));
    } catch (error) {
      sendJson(request, response, 400, {
        status: "invalid_hermes_spec_first_swarm_dry_run_request",
        error: "hermes_spec_first_swarm_dry_run_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        commandExecuted: false,
        canExecuteExternally: false,
        canModifySource: false,
        canInstallPackages: false,
        canStartMcp: false,
        canRunMcp: false,
        canCallProvider: false,
        canReadSecrets: false,
        canSendMessages: false,
        canDeploy: false,
        canPush: false,
        canPublish: false,
        canAutoStartAgents: false,
        requiresHumanApproval: true
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/gateway-agent/plan/dry-run") {
    try {
      const body = await readJson(request);
      sendJson(request, response, 200, await createGatewayAgentDryRunPlan(body));
    } catch (error) {
      sendJson(request, response, 400, {
        status: "invalid_gateway_agent_dry_run_request",
        error: "gateway_agent_plan_failed",
        message: error.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        canExecuteExternally: false,
        canRunMcp: false,
        requiresHumanApproval: true
      });
    }
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/brain") {
    try {
      sendJson(request, response, 200, await listBrainNotes());
    } catch (error) {
      sendJson(request, response, 500, {
        error: "brain_unavailable",
        message: error.message
      });
    }
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/brain/")) {
    const slug = decodeURIComponent(url.pathname.replace("/api/brain/", ""));
    const note = await getBrainNote(slug);

    if (!note) {
      sendJson(request, response, 404, { error: "brain_note_not_found", slug });
      return;
    }

    sendJson(request, response, 200, note);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/dry-run") {
    try {
      const body = await readJson(request);
      const result = createDryRunResult(body.actionId);
      recordDryRunAuditEvent(body.actionId, result.body, result.status);
      sendJson(request, response, result.status, result.body);
    } catch {
      const body = { error: "invalid_json", externalWrites: false, requiresHumanApproval: true };
      recordDryRunAuditEvent("invalid-json", body, 400);
      sendJson(request, response, 400, body);
    }
    return;
  }

  sendJson(request, response, 404, { error: "not_found" });
}

const server = createServer(handleRequest);

if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(port, host, () => {
    console.log(`SIRINX dev control API listening on http://${host}:${port}`);
  });
}
