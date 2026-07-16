import { readFile } from "node:fs/promises";
import path from "node:path";

const CONFIG_PATH = "configs/ghostclaw_agent_coordination.config.json";

async function readJson(repoRoot, relativePath, fallback = null) {
  try {
    return JSON.parse(await readFile(path.join(repoRoot, relativePath), "utf8"));
  } catch {
    return fallback;
  }
}

function normalizePath(value) {
  return String(value || "")
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/\/+$/, "");
}

export function pathsOverlap(left, right) {
  const a = normalizePath(left).replace(/\/\*\*?$/, "");
  const b = normalizePath(right).replace(/\/\*\*?$/, "");
  if (!a || !b) return false;
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

export function validateActiveAssignments(assignments = []) {
  const active = assignments.filter((item) => ["leased", "implementing", "validating"].includes(item.status));
  const conflicts = [];

  for (let index = 0; index < active.length; index += 1) {
    for (let cursor = index + 1; cursor < active.length; cursor += 1) {
      const left = active[index];
      const right = active[cursor];
      if (left.owner === right.owner) continue;
      const overlap = (left.allowed_paths || []).find((leftPath) =>
        (right.allowed_paths || []).some((rightPath) => pathsOverlap(leftPath, rightPath))
      );
      if (overlap) {
        conflicts.push({
          type: "overlapping_active_lease",
          left: left.task_id,
          right: right.task_id,
          path: overlap
        });
      }
    }
  }

  return conflicts;
}

export function validateCoordinationConfig(config) {
  const errors = [];
  const roles = Array.isArray(config?.roles) ? config.roles : [];
  const roleIds = roles.map((role) => role.id);
  const duplicateRoleIds = roleIds.filter((id, index) => roleIds.indexOf(id) !== index);
  const writers = roles.filter((role) => role.repoAccess === "write_with_lease");
  const gitOwners = roles.filter((role) => role.gitAccess === "scoped_owner");

  if (!config || config.$schema !== "ghostclaw.agent_coordination.v1") errors.push("invalid_schema");
  if (duplicateRoleIds.length) errors.push(`duplicate_role_ids:${[...new Set(duplicateRoleIds)].join(",")}`);
  if (writers.length !== config?.execution?.maxConcurrentRepoWriters) errors.push("repo_writer_count_mismatch");
  if (writers.length !== 1 || writers[0]?.id !== config?.execution?.singleWriterRole) errors.push("single_writer_role_mismatch");
  if (gitOwners.length !== 1 || gitOwners[0]?.id !== config?.execution?.gitOwnerRole) errors.push("git_owner_role_mismatch");

  for (const role of roles) {
    if (["telegram_controller", "mission_control", "obsidian_brain", "mcp_connector", "kob_validator"].includes(role.id)) {
      if (!["none", "read_only"].includes(role.repoAccess)) errors.push(`forbidden_repo_write:${role.id}`);
      if (role.mayExecuteTasks) errors.push(`forbidden_task_execution:${role.id}`);
    }
  }

  for (const stage of config?.pipeline || []) {
    if (!roleIds.includes(stage.owner)) errors.push(`unknown_pipeline_owner:${stage.owner}`);
  }

  return {
    ok: errors.length === 0,
    errors,
    roleCount: roles.length,
    repoWriter: writers[0]?.id || null,
    gitOwner: gitOwners[0]?.id || null
  };
}

function routeStatus(route, providerHealth) {
  const providerStatus = (healthGate, fallback = "unknown") => {
    const health = providerHealth?.[healthGate];
    if (typeof health === "string") return health;
    return health?.status || fallback;
  };
  const primary = providerStatus(route.healthGate);
  if (primary === "ready") return { status: "ready", selected: route.primary, source: "primary" };
  const fallback = route.fallbackHealthGate ? providerStatus(route.fallbackHealthGate) : "unavailable";
  if (route.fallback && !route.fallback.startsWith("blocked_") && fallback === "ready") {
    return { status: "ready_with_fallback", selected: route.fallback, source: "fallback", primaryStatus: primary };
  }
  return { status: primary.startsWith("blocked") ? primary : "blocked_health", selected: null, primaryStatus: primary };
}

export async function readCoordinationConfig(options = {}) {
  const repoRoot = options.repoRoot || process.cwd();
  const config = await readJson(repoRoot, options.configPath || CONFIG_PATH);
  if (!config) throw new Error(`Coordination config not found: ${options.configPath || CONFIG_PATH}`);
  return config;
}

export async function getAgentCoordinationStatus(options = {}) {
  const repoRoot = options.repoRoot || process.cwd();
  const nowInput = options.now || new Date();
  const now = typeof nowInput === "function" ? nowInput() : nowInput;
  const config = await readCoordinationConfig({ repoRoot, configPath: options.configPath });
  const validation = validateCoordinationConfig(config);
  const [mission, activeLane, providerHealth, commandLock, gitLock, runtimeAlias] = await Promise.all([
    readJson(repoRoot, config.runtime.missionState),
    readJson(repoRoot, config.runtime.activeLane),
    options.providerHealth || readJson(repoRoot, config.runtime.providerHealth, {}),
    readJson(repoRoot, config.runtime.commandBrokerLock),
    readJson(repoRoot, config.runtime.gitOwnerLock),
    readJson(repoRoot, config.sourceOfTruth.runtimeAlias)
  ]);
  const updatedAt = mission?.updated_at ? new Date(mission.updated_at) : null;
  const missionAgeHours = updatedAt ? (now.getTime() - updatedAt.getTime()) / 3_600_000 : null;
  const missionStale =
    missionAgeHours === null ||
    missionAgeHours < 0 ||
    missionAgeHours > config.runtime.maxMissionAgeHours;
  const assignmentConflicts = validateActiveAssignments(options.assignments || []);
  const modelRoutes = Object.fromEntries(
    Object.entries(config.modelRouting).map(([name, route]) => [name, routeStatus(route, providerHealth)])
  );
  const warnings = [];

  if (missionStale) warnings.push("mission_state_stale");
  if (runtimeAlias?.alias_of !== config.sourceOfTruth.runtimeSnapshot) warnings.push("runtime_registry_alias_mismatch");
  if (assignmentConflicts.length) warnings.push("active_lease_overlap");
  if (commandLock?.locked && commandLock.owner === "none") warnings.push("invalid_command_broker_lock_owner");
  if (gitLock?.locked && gitLock.owner !== config.execution.gitOwnerRole) warnings.push("invalid_git_lock_owner");
  for (const [name, route] of Object.entries(modelRoutes)) {
    if (!route.status.startsWith("ready")) warnings.push(`${name}_route_${route.status}`);
  }

  return {
    title: "GhostClaw Agent Coordination Contract",
    status: validation.ok && !assignmentConflicts.length ? (warnings.length ? "ready_with_warnings" : "ready") : "blocked",
    mode: "single-writer-health-gated-reviewers",
    validation,
    ownership: {
      missionCommander: "hermes_commander",
      architectureOwner: "claude_architect",
      repoWriter: config.execution.singleWriterRole,
      gitOwner: config.execution.gitOwnerRole,
      reviewOwner: "opencode_glm52_reviewer",
      validationOwner: "kob_validator",
      commandIngress: "telegram_controller",
      observer: "mission_control"
    },
    modelRoutes,
    mission: {
      id: mission?.mission_id || null,
      phase: mission?.phase || null,
      currentLane: mission?.current_lane || activeLane?.lane_id || null,
      updatedAt: mission?.updated_at || null,
      ageHours: missionAgeHours === null ? null : Number(missionAgeHours.toFixed(1)),
      stale: missionStale
    },
    locks: {
      commandBroker: commandLock || null,
      gitOwner: gitLock || null
    },
    assignmentConflicts,
    warnings,
    sourceOfTruth: config.sourceOfTruth,
    updatedAt: now.toISOString()
  };
}
