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
const hermesDashboardState = document.querySelector("#hermesDashboardState");
const hermesDashboardMeta = document.querySelector("#hermesDashboardMeta");
const hermesGatewayState = document.querySelector("#hermesGatewayState");
const hermesGatewayMeta = document.querySelector("#hermesGatewayMeta");
const hermesKanbanState = document.querySelector("#hermesKanbanState");
const hermesKanbanMeta = document.querySelector("#hermesKanbanMeta");
const executiveStatus = document.querySelector("#executiveStatus");
const executiveSummary = document.querySelector("#executiveSummary");
const executiveServices = document.querySelector("#executiveServices");
const executiveAgents = document.querySelector("#executiveAgents");
const executiveProjects = document.querySelector("#executiveProjects");
const executiveKanban = document.querySelector("#executiveKanban");
const eventLog = document.querySelector("#eventLog");
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
      for (const value of [action.mode, `risk: ${action.risk}`]) {
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
  hermesGatewayMeta.textContent = data.gateway?.safeDispatch
    ? "Safe mode - kanban dispatch paused"
    : "Dispatcher may pick ready tasks";

  setStateText(
    hermesKanbanState,
    data.kanban?.ok !== false,
    `${ready} ready`,
    "Unavailable"
  );
  hermesKanbanMeta.textContent = `Board: ${data.kanban?.board || "sirinx-os"} - ${running} running / ${blocked} blocked / ${done} done`;
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
      `${metrics.hermesAgents + metrics.thClawsAgents}`,
      `${metrics.hermesAgents} Hermes / ${metrics.thClawsAgents} thClaws`
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
  try {
    const [health, gates, actions, hermes, executiveHq] = await Promise.all([
      fetchJson("/health"),
      fetchJson("/api/gates"),
      fetchJson("/api/actions"),
      fetchJson("/api/hermes"),
      fetchJson("/api/executive-hq")
    ]);

    setApiState("online", `API ${health.status}`);
    renderGates(gates.gates);
    renderActions(actions.actions);
    renderHermes(hermes);
    renderExecutive(executiveHq);
    lastUpdated.textContent = new Date().toLocaleString();
    logEvent("Control API refreshed");
    await loadBrain();
  } catch (error) {
    setApiState("offline", "API offline");
    renderGates(fallbackGates);
    renderActions(fallbackActions);
    renderHermes(fallbackHermes);
    renderExecutive(fallbackExecutive);
    lastUpdated.textContent = "Fallback data";
    logEvent(`Fallback mode: ${error.message}`);
    await loadBrain();
  }
}

async function runDryRun(actionId) {
  try {
    const result = await fetchJson("/api/dry-run", {
      method: "POST",
      body: JSON.stringify({ actionId })
    });
    logEvent(`${result.actionId}: ${result.result}`);
  } catch (error) {
    logEvent(`${actionId}: dry-run unavailable (${error.message})`);
  }
}

refreshButton.addEventListener("click", loadDashboard);
clearLogButton.addEventListener("click", () => eventLog.replaceChildren());

loadDashboard();
