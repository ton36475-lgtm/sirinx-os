import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { listApprovalQueue } from "./src/approval-queue.mjs";
import { listAuditEvents, recordDryRunAuditEvent } from "./src/audit-events.mjs";
import { getBrainNote, listBrainNotes } from "./src/brain.mjs";
import { actions, createDryRunResult, gates } from "./src/gates.mjs";
import { getProjectInventory } from "./src/project-inventory.mjs";
import { getPublicWebsiteStatus } from "./src/public-website.mjs";
import { getLeadBackendHealth } from "./src/lead-health.mjs";
import { getProposalDraftPreview, writeLocalProposalDraft } from "./src/proposal-draft.mjs";
import { getRoiPreview } from "./src/roi-preview.mjs";
import { getSalesArtifactsStatus } from "./src/sales-artifacts.mjs";
import { switches } from "./src/switches.mjs";
import { getRoninAgentTeam } from "./src/agent-team.mjs";
import { getVibeCommandCenter } from "./src/vibe-workflows.mjs";

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

const server = createServer(async (request, response) => {
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

  if (request.method === "GET" && url.pathname === "/api/audit-events") {
    sendJson(request, response, 200, listAuditEvents());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/hermes") {
    sendJson(request, response, 200, await getHermesStatus());
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

  if (request.method === "GET" && url.pathname === "/api/sales-artifacts") {
    sendJson(request, response, 200, await getSalesArtifactsStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/proposal-draft") {
    sendJson(request, response, 200, await getProposalDraftPreview());
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

  if (request.method === "GET" && url.pathname === "/api/vibe-command-center") {
    sendJson(request, response, 200, getVibeCommandCenter());
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
});

server.listen(port, host, () => {
  console.log(`SIRINX dev control API listening on http://${host}:${port}`);
});
