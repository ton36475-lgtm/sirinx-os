const LAYER_ORDER = Object.freeze([
  "observe_freeze",
  "harness",
  "backend_domain_schema",
  "backend_service_logic",
  "api_contract",
  "api_route_handler",
  "api_client",
  "frontend_state_hooks",
  "frontend_components",
  "frontend_pages",
  "local_uat",
  "review_validation",
  "local_commit_gate",
]);

const BLOCKED_ACTIONS = Object.freeze([
  "git_push",
  "git_merge",
  "git_rebase",
  "deploy",
  "cloud_mutation",
  "install_dependencies",
  "migration",
  "provider_batch_calls",
  "model_download",
  "gpu_heavy_job",
  "read_or_print_secrets",
  "edit_real_env",
  "delete_files",
]);

const LAYER_SCOPES = Object.freeze({
  backend_domain_schema: Object.freeze([
    "src/server/",
    "server/",
    "backend/",
    "src/lib/server/",
    "src/db/",
    "db/",
    "prisma/schema.prisma",
    "drizzle/",
    "schemas/",
    "types/",
  ]),
  backend_service_logic: Object.freeze([
    "src/server/services/",
    "src/services/",
    "server/services/",
    "src/lib/server/",
    "src/domain/",
    "src/repositories/",
  ]),
  api_contract: Object.freeze([
    "src/api/contracts/",
    "src/contracts/",
    "src/lib/api/contracts/",
    "docs/api/",
    ".ghostclaw_runtime/api_contracts/",
  ]),
  api_route_handler: Object.freeze([
    "src/app/api/",
    "app/api/",
    "pages/api/",
    "src/api/",
    "server/routes/",
    "src/routes/",
  ]),
  api_client: Object.freeze([
    "src/lib/api/",
    "src/client/api/",
    "src/features/",
    "src/services/client/",
  ]),
  frontend_state_hooks: Object.freeze([
    "src/hooks/",
    "src/features/",
    "src/store/",
    "src/state/",
    "src/lib/query/",
  ]),
  frontend_components: Object.freeze([
    "src/components/",
    "components/",
    "src/features/",
  ]),
  frontend_pages: Object.freeze([
    "src/app/",
    "app/",
    "src/pages/",
    "pages/",
    "src/routes/",
  ]),
});

const FRONTEND_OR_PAGE_PREFIXES = Object.freeze([
  "src/app/",
  "src/pages/",
  "app/",
  "pages/",
  "components/",
  "src/components/",
]);

const API_PREFIXES = Object.freeze([
  "src/api/",
  "src/app/api/",
  "app/api/",
  "pages/api/",
  "server/routes/",
  "src/routes/",
  "src/lib/api/",
]);

function normalizePath(filePath) {
  return String(filePath || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

function matchesAnyPrefix(filePath, prefixes) {
  const normalized = normalizePath(filePath);
  return prefixes.some((prefix) => normalized === prefix || normalized.startsWith(prefix));
}

export function getLayerOrder() {
  return [...LAYER_ORDER];
}

export function getBlockedActions() {
  return [...BLOCKED_ACTIONS];
}

export function getAllowedPrefixesForLayer(layer) {
  return [...(LAYER_SCOPES[layer] || [])];
}

export function getPreviousLayer(layer) {
  const index = LAYER_ORDER.indexOf(layer);
  if (index <= 0) {
    return null;
  }
  return LAYER_ORDER[index - 1];
}

export function isActionBlocked(action) {
  return BLOCKED_ACTIONS.includes(String(action || ""));
}

export function isFileAllowedForLayer(filePath, layer) {
  const allowed = getAllowedPrefixesForLayer(layer);
  if (allowed.length === 0) {
    return false;
  }
  return matchesAnyPrefix(filePath, allowed);
}

export function classifyLayerScope(filePaths, layer) {
  const paths = Array.isArray(filePaths) ? filePaths : [];
  const allowed = [];
  const forbidden = [];
  for (const filePath of paths) {
    if (isFileAllowedForLayer(filePath, layer)) {
      allowed.push(normalizePath(filePath));
    } else {
      forbidden.push(normalizePath(filePath));
    }
  }
  return {
    layer,
    allowed,
    forbidden,
    ok: forbidden.length === 0,
  };
}

export function detectCrossLayerMutation(filePaths) {
  const paths = Array.isArray(filePaths) ? filePaths.map(normalizePath) : [];
  return {
    apiTouched: paths.some((path) => matchesAnyPrefix(path, API_PREFIXES)),
    frontendOrPageTouched: paths.some((path) => matchesAnyPrefix(path, FRONTEND_OR_PAGE_PREFIXES)),
    backendServiceTouched: paths.some((path) => isFileAllowedForLayer(path, "backend_service_logic")),
  };
}

export function assertBackendServicePacket(filePaths) {
  const scope = classifyLayerScope(filePaths, "backend_service_logic");
  const crossLayer = detectCrossLayerMutation(filePaths);
  const blockingIssues = [];

  if (!scope.ok) {
    blockingIssues.push("backend_service_logic packet contains files outside the allowed service layer scope");
  }
  if (crossLayer.apiTouched) {
    blockingIssues.push("backend_service_logic packet must not touch API contract or route files");
  }
  if (crossLayer.frontendOrPageTouched) {
    blockingIssues.push("backend_service_logic packet must not touch frontend, component, or page files");
  }

  return {
    ok: blockingIssues.length === 0,
    scope,
    crossLayer,
    blockingIssues,
  };
}

export function canOpenNextLayer({ currentLayer, currentStatus, receiptExists, reviewStatus }) {
  const statusAllowsProgress = currentStatus === "review_pass" || currentStatus === "done";
  const reviewAllowsProgress = reviewStatus === "pass" || reviewStatus === "warn";
  return {
    ok: Boolean(statusAllowsProgress && receiptExists && reviewAllowsProgress),
    nextLayer: LAYER_ORDER[LAYER_ORDER.indexOf(currentLayer) + 1] || null,
    requirements: {
      statusAllowsProgress,
      receiptExists: Boolean(receiptExists),
      reviewAllowsProgress,
    },
  };
}

export function buildServiceLogicReceiptDraft({ missionId, packetId, filesChanged, validation }) {
  const packetCheck = assertBackendServicePacket(filesChanged);
  return {
    schema: "ghostclaw.a2a2a.packet_receipt.v1",
    mission_id: missionId,
    packet_id: packetId,
    layer: "backend_service_logic",
    status: packetCheck.ok ? "ready_for_review" : "blocked",
    files_changed: filesChanged.map(normalizePath),
    validation,
    layer_scope: packetCheck,
    next_packet_gate: {
      next_packet_id: "P04-api-contract-freeze",
      opened: false,
      reason: packetCheck.ok
        ? "Service logic packet is ready for review; API contract remains closed until review passes."
        : "Service logic packet has blocking scope issues.",
    },
  };
}
