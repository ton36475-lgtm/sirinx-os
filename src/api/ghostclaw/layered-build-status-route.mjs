import {
  LAYERED_BUILD_ALLOWED_LAYERS,
  LAYERED_BUILD_ERROR_CODES,
  LAYERED_BUILD_STATUS_ROUTE,
  createLayeredBuildContractError,
  createLayeredBuildStatusResponse,
} from "../../lib/api/contracts/ghostclaw-layered-build-contract.mjs";
import {
  canOpenNextLayer,
  getBlockedActions,
} from "../../lib/server/ghostclaw/layered-build-service.mjs";

const PHASE_KEY_BY_LAYER = Object.freeze({
  observe_freeze: "observe_freeze",
  harness: "maxplus_glm52_safe_harness",
  backend_domain_schema: "backend_domain_schema",
  backend_service_logic: "backend_service_logic",
  api_contract: "api_contract_freeze",
  api_route_handler: "api_route_handler",
  api_client: "api_client_wiring",
  frontend_state_hooks: "frontend_state_hooks",
  frontend_components: "frontend_components",
  frontend_pages: "frontend_pages_one_by_one",
  local_uat: "local_uat",
  review_validation: "review_validation",
  local_commit_gate: "local_commit_gate",
});

const PACKET_ID_BY_LAYER = Object.freeze({
  api_route_handler: "P05-api-route-handler",
  api_client: "P06-api-client-wiring",
  frontend_state_hooks: "P07-frontend-state-hooks",
  frontend_components: "P08-frontend-components",
  frontend_pages: "P09-frontend-pages-one-by-one",
  local_uat: "P10-local-uat",
  review_validation: "P11-review-validation",
  local_commit_gate: "P12-local-commit-gate",
});

const ERROR_STATUS_BY_CODE = Object.freeze({
  [LAYERED_BUILD_ERROR_CODES.INVALID_QUERY]: 400,
  [LAYERED_BUILD_ERROR_CODES.POLICY_BLOCKED]: 403,
  [LAYERED_BUILD_ERROR_CODES.CONTRACT_VIOLATION]: 409,
  [LAYERED_BUILD_ERROR_CODES.STATUS_UNAVAILABLE]: 503,
});

export const layeredBuildStatusRoute = LAYERED_BUILD_STATUS_ROUTE;

function parseBooleanQuery(value, field) {
  if (value === undefined || value === null || value === "") {
    return false;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true" || value === "1") {
    return true;
  }
  if (value === "false" || value === "0") {
    return false;
  }
  throw createLayeredBuildContractError(
    LAYERED_BUILD_ERROR_CODES.INVALID_QUERY,
    `${field} must be a boolean query value.`,
    { field },
  );
}

function normalizeQuery(query = {}) {
  const layer = query.layer || undefined;
  if (layer && !LAYERED_BUILD_ALLOWED_LAYERS.includes(layer)) {
    throw createLayeredBuildContractError(
      LAYERED_BUILD_ERROR_CODES.INVALID_QUERY,
      "layer is not in the layered build sequence.",
      { field: "layer", layer },
    );
  }

  return {
    includeReceipts: parseBooleanQuery(query.include_receipts, "include_receipts"),
    layer,
  };
}

function normalizeMission(missionState) {
  const mission = missionState?.mission || {};
  return {
    mission_id: mission.mission_id || missionState?.mission_id,
    mission_name: mission.mission_name || mission.name || missionState?.mission_name || missionState?.mission_id,
    mode: mission.mode || missionState?.mode || "full_auto_safe_local_layered_sequence",
  };
}

function selectPhaseStatus(phaseStatus = {}, layer) {
  if (!layer) {
    return { ...phaseStatus };
  }
  const phaseKey = PHASE_KEY_BY_LAYER[layer] || layer;
  return Object.prototype.hasOwnProperty.call(phaseStatus, phaseKey)
    ? { [phaseKey]: phaseStatus[phaseKey] }
    : {};
}

function inferReviewStatus(currentPacket) {
  if (currentPacket?.review_status) {
    return currentPacket.review_status;
  }
  if (currentPacket?.status === "review_pass" || currentPacket?.status === "done") {
    return "pass";
  }
  if (currentPacket?.status === "review_warn") {
    return "warn";
  }
  return "pending";
}

function buildNextPacketGate(currentPacket) {
  const serviceGate = canOpenNextLayer({
    currentLayer: currentPacket.layer,
    currentStatus: currentPacket.status,
    receiptExists: Boolean(currentPacket.packet_receipt),
    reviewStatus: inferReviewStatus(currentPacket),
  });
  const nextPacketId = PACKET_ID_BY_LAYER[serviceGate.nextLayer] || null;

  return {
    next_packet_id: nextPacketId,
    opened: false,
    allowed_by_review_gate: serviceGate.ok,
    next_layer: serviceGate.nextLayer,
    requirements: serviceGate.requirements,
    reason: serviceGate.ok
      ? "Next layer may be leased by Hermes; this route reports status and does not open it."
      : "Next layer remains closed until receipt and review gate requirements pass.",
  };
}

function buildReceiptRefs(currentPacket, receipts, includeReceipts) {
  if (!includeReceipts) {
    return [];
  }
  const refs = Array.isArray(receipts) ? [...receipts] : [];
  if (currentPacket?.packet_receipt) {
    refs.push({
      packet_id: currentPacket.packet_id,
      path: currentPacket.packet_receipt,
      status: currentPacket.status,
    });
  }
  return refs.map((item) => ({
    packet_id: item.packet_id,
    path: item.path,
    status: item.status,
  }));
}

function normalizeRouteError(error) {
  if (error?.error?.code) {
    return error;
  }
  return createLayeredBuildContractError(
    LAYERED_BUILD_ERROR_CODES.STATUS_UNAVAILABLE,
    "Layered build status is unavailable.",
    { reason: error?.message || "unknown" },
  );
}

export function handleLayeredBuildStatusRequest({
  method = "GET",
  query = {},
  missionState,
  receipts = [],
  updatedAt = new Date().toISOString(),
} = {}) {
  try {
    if (method !== LAYERED_BUILD_STATUS_ROUTE.method) {
      throw createLayeredBuildContractError(
        LAYERED_BUILD_ERROR_CODES.POLICY_BLOCKED,
        "Only read-only GET status requests are allowed.",
        { method },
      );
    }

    const normalizedQuery = normalizeQuery(query);
    const currentPacket = missionState?.current_packet;
    if (!currentPacket) {
      throw createLayeredBuildContractError(
        LAYERED_BUILD_ERROR_CODES.STATUS_UNAVAILABLE,
        "current_packet is missing from mission state.",
        {},
      );
    }

    const body = createLayeredBuildStatusResponse({
      mission: normalizeMission(missionState),
      currentPacket,
      phaseStatus: selectPhaseStatus(missionState.phase_status, normalizedQuery.layer),
      nextPacketGate: buildNextPacketGate(currentPacket),
      blockedActions: Array.isArray(missionState.blocked_actions)
        ? missionState.blocked_actions
        : getBlockedActions(),
      receipts: buildReceiptRefs(currentPacket, receipts, normalizedQuery.includeReceipts),
      updatedAt,
    });

    return {
      status: layeredBuildStatusRoute.method === method ? 200 : 403,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
      body,
    };
  } catch (error) {
    const body = normalizeRouteError(error);
    return {
      status: ERROR_STATUS_BY_CODE[body.error.code] || 500,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
      body,
    };
  }
}
