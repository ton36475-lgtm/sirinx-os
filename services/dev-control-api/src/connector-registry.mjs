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
  "connector_auto_run"
];

const connectorDefinitions = [
  ["openai-developers", "OpenAI Developers", "backend", "model-api-and-agent-sdk-build-context"],
  ["supabase", "Supabase", "security", "database-auth-storage-policy-review"],
  ["clickup", "ClickUp", "planner", "project-planning-context"],
  ["notion", "Notion", "scribe", "wiki-spec-and-knowledge-capture-context"],
  ["google-drive", "Google Drive", "scribe", "drive-docs-sheets-slides-context"],
  ["github", "GitHub", "devops", "repository-issues-pr-and-ci-context"],
  ["superpowers", "Superpowers", "shogun", "execution-methodology-and-review-context"],
  ["figma", "Figma", "planner", "design-system-and-figjam-context"],
  ["canva", "Canva", "planner", "creative-design-asset-context"],
  ["computer-use", "Computer Use", "qa", "local-desktop-observation-context"],
  ["chrome", "Chrome", "qa", "authenticated-browser-observation-context"],
  ["browser", "Browser", "qa", "local-browser-test-context"],
  ["spreadsheets", "Spreadsheets", "scribe", "workbook-analysis-and-report-context"],
  ["documents", "Documents", "scribe", "document-draft-and-review-context"],
  ["presentations", "Presentations", "scribe", "deck-outline-and-export-context"]
];

function nowIso(options) {
  const now = options.now || (() => new Date());
  return now().toISOString();
}

function makeConnector([id, title, owner, capability], index) {
  return {
    id,
    title,
    owner,
    ordinal: index + 1,
    capability,
    status: "registered-local-only",
    mode: "capability-visible-no-activation",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canActivate: false,
    canExecuteExternally: false,
    canRunMcp: false,
    canReadSecrets: false,
    requiresApproval: true,
    nextExactStep: `Use ${title} as local capability context for ${owner}; do not activate connector.`
  };
}

function makeConnectors() {
  return connectorDefinitions.map(makeConnector);
}

function makeOwnerPackets(connectors) {
  const grouped = new Map();

  for (const connector of connectors) {
    if (!grouped.has(connector.owner)) {
      grouped.set(connector.owner, []);
    }
    grouped.get(connector.owner).push(connector);
  }

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([owner, ownerConnectors], index) => ({
      packetId: `connector-registry-${String(index + 1).padStart(2, "0")}-${owner}`,
      owner,
      connectorCount: ownerConnectors.length,
      connectors: ownerConnectors.map((connector) => connector.id),
      sourceRefs: ["services/dev-control-api/src/connector-registry.mjs"],
      evidence: [
        `owner=${owner}`,
        `connectors=${ownerConnectors.length}`,
        "externalWrites=false",
        "canActivate=false",
        "canRunMcp=false"
      ],
      blockedActions,
      externalWrites: false,
      canActivate: false,
      canExecuteExternally: false,
      canRunMcp: false,
      canReadSecrets: false,
      requiresApproval: true,
      nextExactStep: `Review ${ownerConnectors.length} connector capability record(s) for ${owner}; do not activate connector.`
    }));
}

function makeSummary(connectors, ownerPackets) {
  return {
    connectorsTotal: connectors.length,
    ownerLanes: ownerPackets.length,
    activatableConnectors: connectors.filter((connector) => connector.canActivate).length,
    executableExternalActions: 0,
    blockedActions: blockedActions.length
  };
}

export async function getConnectorRegistryStatus(options = {}) {
  const connectors = makeConnectors();
  const ownerPackets = makeOwnerPackets(connectors);

  return {
    title: "Connector Capability Registry",
    status: "local-connector-registry-ready",
    mode: "local-only-capability-registry",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canActivateConnectors: false,
    canExecuteExternally: false,
    canRunMcp: false,
    canReadSecrets: false,
    summary: makeSummary(connectors, ownerPackets),
    connectors,
    ownerPackets,
    blockedActions,
    stopRules: [
      "Do not activate connectors from registry output.",
      "Do not call paid APIs, run real MCP, read secrets, or send customer-visible messages.",
      "Use registry output as local capability context and approval packet source only."
    ],
    updatedAt: nowIso(options)
  };
}

export async function createConnectorRegistryDryRun(body = {}, options = {}) {
  const status = await getConnectorRegistryStatus(options);
  const goal = String(body.goal || "map connector capabilities").trim();

  return {
    title: "Connector Registry Dry-Run",
    status: "dry-run-connector-registry-ready",
    mode: "local-only-dry-run",
    requestId: String(body.requestId || "connector-registry-dry-run"),
    goal,
    source: String(body.source || "codex-local"),
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canActivateConnectors: false,
    canExecuteExternally: false,
    canRunMcp: false,
    canReadSecrets: false,
    summary: status.summary,
    ownerPackets: status.ownerPackets,
    nextActions: [
      "Use owner packets as local capability hints for Gateway and AI Team Pairing.",
      "Keep all connectors blocked until exact approval and evidence exist.",
      "Run local verification before creating any approval packet.",
      "Stop before connector activation, real MCP execution, paid API calls, secret reads, sends, deploys, pushes, or publishes."
    ],
    stopPoint: "CONNECTOR REGISTRY READY LOCAL-ONLY - WAITING FOR HUMAN APPROVAL",
    updatedAt: nowIso(options)
  };
}
