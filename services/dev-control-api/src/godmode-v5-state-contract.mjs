import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const GODMODE_V5_STATE_SCHEMA = "ghostclaw.godmode.v5.state.v1";
export const DEFAULT_GODMODE_V5_CONFIG_PATH = "configs/godmode_v5_runtime.config.json";

export const GODMODE_V5_PHASES = Object.freeze([
  Object.freeze({
    Name: "Baseline",
    Owner: "HermesCommander",
    ExitCriteria: Object.freeze([
      "ScopeLocked",
      "SourceOfTruthMapped",
      "DirtyLanesRecorded",
      "RiskClassified"
    ])
  }),
  Object.freeze({
    Name: "Architecture",
    Owner: "ClaudeArchitect",
    ExitCriteria: Object.freeze([
      "ArchitecturePacketAccepted",
      "OwnersAssigned",
      "DependenciesResolved",
      "RollbackDesigned"
    ])
  }),
  Object.freeze({
    Name: "Implementation",
    Owner: "CodexBuildCaptain",
    ExitCriteria: Object.freeze([
      "FileLeaseValid",
      "ScopedChangesComplete",
      "NoCrossLaneWrites",
      "ImplementationReceiptPresent"
    ])
  }),
  Object.freeze({
    Name: "Verification",
    Owner: "OpenCodeReviewer",
    ExitCriteria: Object.freeze([
      "FocusedChecksPassed",
      "SecurityChecksPassed",
      "EvidenceComplete",
      "IndependentReviewComplete"
    ])
  }),
  Object.freeze({
    Name: "Release",
    Owner: "HermesCommander",
    ExitCriteria: Object.freeze([
      "ReleasePacketComplete",
      "RollbackVerified",
      "TargetBoundApprovalPresent",
      "ReceiptChainValid"
    ])
  })
]);

const STATUS_VALUES = new Set(["Pending", "InProgress", "Blocked", "ReadyToAdvance", "Completed"]);
const TOP_LEVEL_ALIASES = Object.freeze({
  Schema: ["SCHEMA", "$schema", "schema"],
  Version: ["VERSION", "version"],
  TaskId: ["TASK_ID", "task_id", "taskId"],
  CorrelationId: ["CORRELATION_ID", "correlation_id", "correlationId"],
  Phase: ["PHASE", "CURRENT_PHASE", "phase", "current_phase", "currentPhase"],
  Status: ["STATUS", "status"],
  AbortWindow: ["ABORT_WINDOW", "abort_window", "abortWindow"],
  MaxRetries: ["MAX_RETRIES", "max_retries", "maxRetries"],
  Attempt: ["ATTEMPT", "attempt"],
  Owner: ["OWNER", "owner"],
  ExitCriteria: ["EXIT_CRITERIA", "exit_criteria", "exitCriteria"],
  Evidence: ["EVIDENCE", "evidence"],
  PreviousReceiptDigest: ["PREVIOUS_RECEIPT_DIGEST", "previous_receipt_digest", "previousReceiptDigest"],
  StartedAt: ["STARTED_AT", "started_at", "startedAt"],
  UpdatedAt: ["UPDATED_AT", "updated_at", "updatedAt"]
});

function own(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function sameValue(left, right) {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

function resolveAliasedValue(input, canonicalKey) {
  const keys = [canonicalKey, ...(TOP_LEVEL_ALIASES[canonicalKey] || [])];
  const present = keys.filter((key) => own(input, key));
  if (!present.length) return undefined;
  const first = input[present[0]];
  if (present.some((key) => !sameValue(first, input[key]))) {
    throw new Error(`conflicting_aliases:${canonicalKey}`);
  }
  return first;
}

function integerValue(value, key, minimum, maximum) {
  const parsed = typeof value === "string" && value.trim() ? Number(value) : value;
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`invalid_${key}`);
  }
  return parsed;
}

function canonicalPhase(value) {
  const normalized = String(value || "Baseline").replace(/[_\s-]+/g, "").toLowerCase();
  const phase = GODMODE_V5_PHASES.find(
    (candidate) => candidate.Name.replace(/[_\s-]+/g, "").toLowerCase() === normalized
  );
  if (!phase) throw new Error("invalid_Phase");
  return phase;
}

function canonicalExitCriteria(phase, value = {}) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const result = {};
  for (const criterion of phase.ExitCriteria) {
    const legacyKey = criterion.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
    const snakeKey = legacyKey.toLowerCase();
    const values = [criterion, legacyKey, snakeKey].filter((key) => own(input, key));
    if (values.length > 1 && values.some((key) => input[key] !== input[values[0]])) {
      throw new Error(`conflicting_exit_criterion:${criterion}`);
    }
    result[criterion] = values.length ? input[values[0]] === true : false;
  }
  const allowed = new Set(
    phase.ExitCriteria.flatMap((criterion) => {
      const legacyKey = criterion.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
      return [criterion, legacyKey, legacyKey.toLowerCase()];
    })
  );
  const unknown = Object.keys(input).filter((key) => !allowed.has(key));
  if (unknown.length) throw new Error(`unknown_exit_criteria:${unknown.join(",")}`);
  return result;
}

function canonicalEvidence(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new Error("invalid_Evidence");
  }
  return [...new Set(value.map((item) => item.trim()))].sort();
}

function nowIso(options = {}) {
  const value = typeof options.now === "function" ? options.now() : options.now || new Date();
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

function digestState(state) {
  return createHash("sha256").update(JSON.stringify(stableValue(state)), "utf8").digest("hex");
}

export function normalizeGodmodeV5State(input = {}, options = {}) {
  const phase = canonicalPhase(resolveAliasedValue(input, "Phase"));
  const phaseIndex = GODMODE_V5_PHASES.findIndex((candidate) => candidate.Name === phase.Name);
  const status = String(resolveAliasedValue(input, "Status") || "Pending");
  if (!STATUS_VALUES.has(status)) throw new Error("invalid_Status");
  const abortWindow = integerValue(resolveAliasedValue(input, "AbortWindow") ?? 900, "AbortWindow", 1, 3600);
  const maxRetries = integerValue(resolveAliasedValue(input, "MaxRetries") ?? 3, "MaxRetries", 0, 3);
  const attempt = integerValue(resolveAliasedValue(input, "Attempt") ?? 0, "Attempt", 0, maxRetries + 1);
  const timestamp = nowIso(options);
  const startedAt = String(resolveAliasedValue(input, "StartedAt") || timestamp);
  const updatedAt = String(resolveAliasedValue(input, "UpdatedAt") || timestamp);
  const stateWithoutDigest = {
    Schema: String(resolveAliasedValue(input, "Schema") || GODMODE_V5_STATE_SCHEMA),
    Version: String(resolveAliasedValue(input, "Version") || "5.0.0"),
    TaskId: String(resolveAliasedValue(input, "TaskId") || "GODMODE-V5-UNASSIGNED"),
    CorrelationId: String(resolveAliasedValue(input, "CorrelationId") || "GODMODE-V5-UNASSIGNED"),
    Phase: phase.Name,
    PhaseIndex: phaseIndex,
    Status: attempt > maxRetries ? "Blocked" : status,
    AbortWindow: abortWindow,
    MaxRetries: maxRetries,
    Attempt: attempt,
    AbortRequired: attempt > maxRetries,
    Owner: String(resolveAliasedValue(input, "Owner") || phase.Owner),
    ExitCriteria: canonicalExitCriteria(phase, resolveAliasedValue(input, "ExitCriteria")),
    Evidence: canonicalEvidence(resolveAliasedValue(input, "Evidence")),
    PreviousReceiptDigest: resolveAliasedValue(input, "PreviousReceiptDigest") || null,
    StartedAt: startedAt,
    UpdatedAt: updatedAt
  };
  if (stateWithoutDigest.Schema !== GODMODE_V5_STATE_SCHEMA) throw new Error("invalid_Schema");
  return { ...stateWithoutDigest, ReceiptDigest: digestState(stateWithoutDigest) };
}

export function markGodmodeV5ExitCriteria(state, updates = {}, options = {}) {
  const current = normalizeGodmodeV5State(state, options);
  const phase = GODMODE_V5_PHASES[current.PhaseIndex];
  const exitCriteria = canonicalExitCriteria(phase, { ...current.ExitCriteria, ...updates });
  const complete = Object.values(exitCriteria).every(Boolean);
  return normalizeGodmodeV5State(
    {
      ...current,
      Status: complete ? "ReadyToAdvance" : "InProgress",
      ExitCriteria: exitCriteria,
      UpdatedAt: nowIso(options)
    },
    options
  );
}

export function recordGodmodeV5Attempt(state, options = {}) {
  const current = normalizeGodmodeV5State(state, options);
  return normalizeGodmodeV5State(
    {
      ...current,
      Attempt: current.Attempt + 1,
      Status: current.Attempt + 1 > current.MaxRetries ? "Blocked" : "InProgress",
      UpdatedAt: nowIso(options)
    },
    options
  );
}

export function advanceGodmodeV5State(state, options = {}) {
  const current = normalizeGodmodeV5State(state, options);
  if (current.AbortRequired || current.Status === "Blocked") throw new Error("phase_blocked");
  if (!Object.values(current.ExitCriteria).every(Boolean)) throw new Error("exit_criteria_incomplete");
  if (current.PhaseIndex >= GODMODE_V5_PHASES.length - 1) {
    return normalizeGodmodeV5State({ ...current, Status: "Completed", UpdatedAt: nowIso(options) }, options);
  }
  const next = GODMODE_V5_PHASES[current.PhaseIndex + 1];
  return normalizeGodmodeV5State(
    {
      Schema: current.Schema,
      Version: current.Version,
      TaskId: current.TaskId,
      CorrelationId: current.CorrelationId,
      Phase: next.Name,
      Status: "InProgress",
      AbortWindow: current.AbortWindow,
      MaxRetries: current.MaxRetries,
      Attempt: 0,
      Owner: next.Owner,
      ExitCriteria: {},
      Evidence: current.Evidence,
      PreviousReceiptDigest: current.ReceiptDigest,
      StartedAt: current.StartedAt,
      UpdatedAt: nowIso(options)
    },
    options
  );
}

export async function getGodmodeV5RuntimeStatus(options = {}) {
  const repoRoot = options.repoRoot || options.root || process.cwd();
  const configPath = options.configPath || DEFAULT_GODMODE_V5_CONFIG_PATH;
  const config = JSON.parse(await readFile(path.join(repoRoot, configPath), "utf8"));
  const state = normalizeGodmodeV5State(config, options);
  return {
    ...state,
    Title: "GhostClaw GODMODE V5 Runtime",
    ConfigPath: configPath,
    PhaseOrder: GODMODE_V5_PHASES.map((phase) => phase.Name),
    ExitCriteriaComplete: Object.values(state.ExitCriteria).every(Boolean),
    CanAdvance: state.Status !== "Blocked" && Object.values(state.ExitCriteria).every(Boolean),
    ExternalActionAuthorized: false
  };
}
