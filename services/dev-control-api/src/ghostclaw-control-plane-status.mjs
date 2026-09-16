import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const CONTROL_PLANE_STATUS_CONTRACT_ID = "ghostclaw-control-plane-status-v1";
export const DEFAULT_CONTROL_PLANE_STATUS_FIXTURE =
  "docs/api/examples/ghostclaw-control-plane-status-response.example.json";

const BOOLEAN_TRUE = new Set(["1", "true", "yes", "on"]);
const BOOLEAN_FALSE = new Set(["0", "false", "no", "off"]);

function nowIso(options = {}) {
  const now = options.now || (() => new Date());
  return now().toISOString();
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function parseBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  if (value == null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (BOOLEAN_TRUE.has(normalized)) return true;
  if (BOOLEAN_FALSE.has(normalized)) return false;
  throw new Error(`invalid_boolean:${value}`);
}

function parseLimit(value, fallback = 20) {
  if (value == null || value === "") return fallback;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`invalid_limit:${value}`);
  }
  return Math.min(parsed, 100);
}

function normalizeQuery(input = {}) {
  const query = input.query || input;
  return {
    project: query.project ? String(query.project).trim() : null,
    includeReceipts: parseBoolean(query.include_receipts ?? query.includeReceipts, false),
    includePaths: parseBoolean(query.include_paths ?? query.includePaths, true),
    limit: parseLimit(query.limit, 20)
  };
}

async function readJsonFile(path) {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw);
}

function makeError(code, message, details = {}) {
  return {
    error: {
      code,
      message,
      details,
      request_id: null
    }
  };
}

function assertControlPlaneStatusInvariants(payload) {
  const failures = [];
  if (payload?.contract_id !== CONTROL_PLANE_STATUS_CONTRACT_ID) failures.push("contract_id");
  if (payload?.mode !== "read_only_control_plane_status") failures.push("mode");
  if (payload?.dry_run !== true) failures.push("dry_run");
  if (payload?.live_execution !== false) failures.push("live_execution");

  const expectedGuardrails = {
    read_only: true,
    worker_execution: false,
    live_telegram_send: false,
    provider_call: false,
    secret_read: false,
    install: false,
    push: false,
    deploy: false,
    cloudflare_r2_mutation: false,
    database_migration: false
  };

  for (const [key, expected] of Object.entries(expectedGuardrails)) {
    if (payload?.guardrails?.[key] !== expected) {
      failures.push(`guardrails.${key}`);
    }
  }

  for (const packet of Array.isArray(payload?.packets) ? payload.packets : []) {
    if (packet.dry_run !== true) failures.push(`packet.${packet.packet_id || "unknown"}.dry_run`);
    if (packet.live_execution !== false) failures.push(`packet.${packet.packet_id || "unknown"}.live_execution`);
  }

  if (failures.length) {
    const error = new Error(`contract_violation:${failures.join(",")}`);
    error.code = "CONTRACT_VIOLATION";
    error.details = { failures };
    throw error;
  }
}

function stripPathsFromRows(rows, pathFields) {
  return rows.map((row) => {
    const next = { ...row };
    for (const field of pathFields) {
      if (Object.prototype.hasOwnProperty.call(next, field)) {
        next[field] = null;
      }
    }
    return next;
  });
}

function applyControlPlaneStatusQuery(payload, query, options = {}) {
  const response = cloneJson(payload);
  const limit = query.limit;

  if (query.project) {
    response.projects = response.projects.filter((project) => project.slug === query.project);
    response.missions = response.missions.filter((mission) => mission.project_slug === query.project);
    const missionIds = new Set(response.missions.map((mission) => mission.mission_id));
    response.packets = response.packets.filter((packet) => missionIds.has(packet.mission_id));
    response.approval_gates = response.approval_gates.filter((gate) => missionIds.has(gate.mission_id));
  }

  response.packets = response.packets.slice(0, limit);
  response.approval_gates = response.approval_gates.slice(0, limit);
  response.receipts = query.includeReceipts ? response.receipts.slice(0, limit) : [];

  if (!query.includePaths) {
    response.packets = stripPathsFromRows(response.packets, ["artifact_path"]);
    response.approval_gates = stripPathsFromRows(response.approval_gates, ["rollback_plan_path"]);
    response.receipts = stripPathsFromRows(response.receipts, ["artifact_path"]);
  }

  response.dashboard = {
    ...response.dashboard,
    active_project_count: response.projects.filter((project) => project.focus_state === "active").length,
    active_mission_count: response.missions.filter((mission) => mission.status !== "blocked").length,
    pending_approval_count: response.approval_gates.filter((gate) => gate.status === "pending").length
  };
  response.updated_at = nowIso(options);

  assertControlPlaneStatusInvariants(response);
  return response;
}

export async function getGhostClawControlPlaneStatus(options = {}) {
  const root = options.root || process.cwd();
  const fixturePath = resolve(root, options.fixturePath || DEFAULT_CONTROL_PLANE_STATUS_FIXTURE);

  try {
    const query = normalizeQuery(options);
    const fixture = await readJsonFile(fixturePath);
    assertControlPlaneStatusInvariants(fixture);
    return applyControlPlaneStatusQuery(fixture, query, options);
  } catch (error) {
    if (String(error.message || "").startsWith("invalid_boolean")) {
      return makeError("INVALID_QUERY", "Boolean query parameter is invalid.", {
        reason: error.message
      });
    }
    if (String(error.message || "").startsWith("invalid_limit")) {
      return makeError("INVALID_QUERY", "Limit query parameter is invalid.", {
        reason: error.message
      });
    }
    if (error?.code === "ENOENT") {
      return makeError("SOURCE_NOT_READY", "Control-plane status fixture is missing.", {
        fixture_path: fixturePath
      });
    }
    if (error?.code === "CONTRACT_VIOLATION") {
      return makeError("CONTRACT_VIOLATION", "Control-plane status fixture violates contract invariants.", error.details);
    }
    return makeError("STATUS_UNAVAILABLE", "Control-plane status could not be loaded.", {
      reason: error?.code || "unknown"
    });
  }
}

export function createGhostClawControlPlaneStatusHandler(options = {}) {
  return async function ghostClawControlPlaneStatusHandler(request = {}) {
    const payload = await getGhostClawControlPlaneStatus({
      ...options,
      query: request.query || request
    });
    const statusCode = payload.error ? (payload.error.code === "INVALID_QUERY" ? 400 : 503) : 200;

    return {
      statusCode,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      },
      body: JSON.stringify(payload, null, 2)
    };
  };
}
