export const LAYERED_BUILD_STATUS_ROUTE = Object.freeze({
  method: "GET",
  path: "/api/ghostclaw/layered-build/status",
  description: "Read-only status contract for the GhostClaw layered build lock.",
});

export const LAYERED_BUILD_ALLOWED_LAYERS = Object.freeze([
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

export const LAYERED_BUILD_ALLOWED_PACKET_STATUSES = Object.freeze([
  "queued",
  "leased",
  "building",
  "validation_pending",
  "ready_for_review",
  "review_pass",
  "review_warn",
  "done",
  "blocked",
]);

export const LAYERED_BUILD_ERROR_CODES = Object.freeze({
  INVALID_QUERY: "INVALID_QUERY",
  STATUS_UNAVAILABLE: "STATUS_UNAVAILABLE",
  POLICY_BLOCKED: "POLICY_BLOCKED",
  CONTRACT_VIOLATION: "CONTRACT_VIOLATION",
});

export const layeredBuildStatusContract = Object.freeze({
  route: LAYERED_BUILD_STATUS_ROUTE,
  request: Object.freeze({
    query: Object.freeze({
      include_receipts: Object.freeze({
        type: "boolean",
        default: false,
        description: "When true, include receipt paths but never receipt contents.",
      }),
      layer: Object.freeze({
        type: "string",
        optional: true,
        enum: LAYERED_BUILD_ALLOWED_LAYERS,
      }),
    }),
  }),
  response: Object.freeze({
    status: 200,
    body: Object.freeze({
      mission_id: "string",
      mission_name: "string",
      mode: "string",
      current_packet: "LayeredBuildPacket",
      phase_status: "Record<string,string>",
      next_packet_gate: "LayeredBuildNextPacketGate",
      blocked_actions: "string[]",
      receipts: "LayeredBuildReceiptRef[]",
      updated_at: "ISO-8601 string",
      local_only: true,
    }),
  }),
  errors: Object.freeze({
    400: LAYERED_BUILD_ERROR_CODES.INVALID_QUERY,
    403: LAYERED_BUILD_ERROR_CODES.POLICY_BLOCKED,
    409: LAYERED_BUILD_ERROR_CODES.CONTRACT_VIOLATION,
    503: LAYERED_BUILD_ERROR_CODES.STATUS_UNAVAILABLE,
  }),
});

export const mockLayeredBuildStatusResponse = Object.freeze({
  mission_id: "GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001",
  mission_name: "MAXPLUS_GLM52_SAFE_HARNESS_LAYERED_BUILD_LOCK_V8",
  mode: "full_auto_safe_local_layered_sequence",
  current_packet: Object.freeze({
    packet_id: "P04-api-contract-freeze",
    layer: "api_contract",
    status: "leased",
    active_file_lease: ".ghostclaw_runtime/a2a2a/locks/P04-api-contract-freeze.lease.json",
    packet_receipt: null,
  }),
  phase_status: Object.freeze({
    backend_service_logic: "review_pass",
    api_contract_freeze: "leased",
    api_route_handler: "blocked",
  }),
  next_packet_gate: Object.freeze({
    next_packet_id: "P05-api-route-handler",
    opened: false,
    reason: "API route remains blocked until the P04 contract receipt and review gate exist.",
  }),
  blocked_actions: Object.freeze([
    "git_push",
    "deploy",
    "install_dependencies",
    "provider_batch_calls",
    "read_or_print_secrets",
  ]),
  receipts: Object.freeze([
    Object.freeze({
      packet_id: "P03-backend-service-logic",
      path: ".ghostclaw_runtime/a2a2a/receipts/P03-backend-service-logic.receipt.json",
      status: "ready_for_review",
    }),
  ]),
  updated_at: "2026-06-30T10:44:14Z",
  local_only: true,
});

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function validatePacket(packet, issues) {
  if (!isPlainObject(packet)) {
    issues.push("current_packet must be an object");
    return;
  }
  if (typeof packet.packet_id !== "string" || packet.packet_id.length === 0) {
    issues.push("current_packet.packet_id must be a non-empty string");
  }
  if (!LAYERED_BUILD_ALLOWED_LAYERS.includes(packet.layer)) {
    issues.push("current_packet.layer is not in the layered build sequence");
  }
  if (!LAYERED_BUILD_ALLOWED_PACKET_STATUSES.includes(packet.status)) {
    issues.push("current_packet.status is not an allowed packet status");
  }
}

export function validateLayeredBuildStatusResponse(response) {
  const issues = [];

  if (!isPlainObject(response)) {
    return { ok: false, issues: ["response must be an object"] };
  }
  for (const field of ["mission_id", "mission_name", "mode", "updated_at"]) {
    if (typeof response[field] !== "string" || response[field].length === 0) {
      issues.push(`${field} must be a non-empty string`);
    }
  }
  validatePacket(response.current_packet, issues);
  if (!isPlainObject(response.phase_status)) {
    issues.push("phase_status must be an object");
  }
  if (!isPlainObject(response.next_packet_gate)) {
    issues.push("next_packet_gate must be an object");
  }
  if (!Array.isArray(response.blocked_actions)) {
    issues.push("blocked_actions must be an array");
  }
  if (!Array.isArray(response.receipts)) {
    issues.push("receipts must be an array");
  }
  if (response.local_only !== true) {
    issues.push("local_only must be true");
  }

  return { ok: issues.length === 0, issues };
}

export function createLayeredBuildStatusResponse({
  mission,
  currentPacket,
  phaseStatus,
  nextPacketGate,
  blockedActions,
  receipts = [],
  updatedAt,
}) {
  const response = {
    mission_id: mission.mission_id,
    mission_name: mission.mission_name,
    mode: mission.mode,
    current_packet: currentPacket,
    phase_status: phaseStatus,
    next_packet_gate: nextPacketGate,
    blocked_actions: blockedActions,
    receipts,
    updated_at: updatedAt,
    local_only: true,
  };
  const validation = validateLayeredBuildStatusResponse(response);
  if (!validation.ok) {
    throw createLayeredBuildContractError(
      LAYERED_BUILD_ERROR_CODES.CONTRACT_VIOLATION,
      "Layered build status response does not satisfy the frozen contract.",
      { issues: validation.issues },
    );
  }
  return response;
}

export function createLayeredBuildContractError(code, message, details = {}) {
  const safeCode = Object.values(LAYERED_BUILD_ERROR_CODES).includes(code)
    ? code
    : LAYERED_BUILD_ERROR_CODES.CONTRACT_VIOLATION;
  return {
    error: Object.freeze({
      code: safeCode,
      message: String(message || "Layered build contract error."),
      details,
      request_id: null,
    }),
  };
}
