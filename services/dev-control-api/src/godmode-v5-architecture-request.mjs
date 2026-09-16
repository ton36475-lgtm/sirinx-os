import { createHash } from "node:crypto";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { validateCoordinationConfig } from "./agent-coordination-contract.mjs";
import { normalizeGodmodeV5State } from "./godmode-v5-state-contract.mjs";

export const GODMODE_V5_ARCHITECTURE_REQUEST_PATH =
  "configs/godmode_v5_architecture.request.json";
export const GODMODE_V5_ARCHITECTURE_WAITING_PATH =
  ".ghostclaw_runtime/a2a2a/tasks/waiting_review/godmode-v5-architecture-request.json";

const REQUIRED_SECTIONS = Object.freeze([
  "Goal",
  "Current State",
  "Proposed Architecture",
  "Interface Contracts",
  "Data Model Changes",
  "Lane Assignments",
  "Risk Assessment",
  "Dependencies",
  "Rollback Plan",
  "Verification"
]);

const REQUIRED_SKILLS = Object.freeze([
  "autonomous-task-planner",
  "codebase-cartographer",
  "system-design-architect",
  "coding-model-router",
  "senior-fullstack-builder",
  "mcp-integration-manager",
  "codex-workflow-synthesizer",
  "safety-gate-enforcer",
  "evidence-verifier"
]);

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function digestJson(value) {
  return sha256(JSON.stringify(stableValue(value)));
}

function allFalse(value) {
  return value && Object.values(value).every((entry) => entry === false);
}

function includesAll(actual, expected) {
  const values = new Set(Array.isArray(actual) ? actual : []);
  return expected.every((item) => values.has(item));
}

function graphIsAcyclic(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return false;
  const graph = new Map(entries.map((entry) => [entry.Id, entry.DependsOn || []]));
  if (graph.size !== entries.length) return false;
  if ([...graph.values()].some((dependencies) => dependencies.some((id) => !graph.has(id)))) return false;
  const active = new Set();
  const complete = new Set();
  function visit(id) {
    if (complete.has(id)) return true;
    if (active.has(id)) return false;
    active.add(id);
    for (const dependency of graph.get(id)) {
      if (!visit(dependency)) return false;
    }
    active.delete(id);
    complete.add(id);
    return true;
  }
  return [...graph.keys()].every(visit);
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readJson(repoRoot, path) {
  return JSON.parse(await readFile(resolve(repoRoot, path), "utf8"));
}

async function writeJsonAtomic(path, value) {
  const temporaryPath = `${path}.${process.pid}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, path);
}

export function validateGodmodeV5ArchitectureRequest(request = {}, stateInput = {}, coordination = {}) {
  const state = normalizeGodmodeV5State(stateInput);
  const coordinationValidation = validateCoordinationConfig(coordination);
  const issues = [];
  if (request.$schema !== "ghostclaw.godmode-v5.architecture-request.v1") issues.push("InvalidRequestSchema");
  if (request.TaskId !== state.TaskId) issues.push("TaskIdMismatch");
  if (request.CorrelationId !== state.CorrelationId) issues.push("CorrelationIdMismatch");
  if (request.Phase !== "Architecture" || state.Phase !== "Architecture") issues.push("ArchitecturePhaseRequired");
  if (request.StateReceiptDigest !== state.ReceiptDigest) issues.push("StateReceiptDigestMismatch");
  if (request.RequestedBy !== "hermes_commander") issues.push("HermesRequesterRequired");
  if (request.AssignedTo !== "claude_architect") issues.push("ClaudeArchitectRequired");
  if (request.SkillBundle?.Name !== "unknowcoding-coding-team") issues.push("UnknowcodingBundleRequired");
  if (!includesAll(request.SkillBundle?.RequiredSkills, REQUIRED_SKILLS)) issues.push("RequiredSkillsIncomplete");
  if (!includesAll(request.RequiredSections, REQUIRED_SECTIONS)) issues.push("RequiredSectionsIncomplete");
  if (!coordinationValidation.ok) issues.push("CoordinationContractInvalid");
  if (request.Ownership?.SingleRepoWriter !== coordination.execution?.singleWriterRole) issues.push("SingleWriterMismatch");
  if (request.Ownership?.ArchitectureOwner !== "claude_architect") issues.push("ArchitectureOwnerMismatch");
  if (!graphIsAcyclic(request.DependencyGraph)) issues.push("DependencyGraphInvalid");
  if (!Array.isArray(request.RollbackRequirements) || request.RollbackRequirements.length < 5) issues.push("RollbackRequirementsIncomplete");
  if (request.ProviderDispatch?.Requested !== false) issues.push("ProviderDispatchMustStartClosed");
  if (request.ProviderDispatch?.Authorized !== false) issues.push("ProviderAuthorizationMustStartClosed");
  if (request.ProviderDispatch?.Executed !== false) issues.push("ProviderExecutionMustStartClosed");
  if (!request.ProviderDispatch?.RequiredExactGate) issues.push("ProviderExactGateRequired");
  if (!allFalse(request.ExternalActions)) issues.push("ExternalActionsMustBeClosed");
  return {
    Passed: issues.length === 0,
    Issues: issues,
    RequestDigestSha256: digestJson(request),
    State: state,
    Coordination: coordinationValidation
  };
}

export async function getGodmodeV5ArchitectureRequestStatus(options = {}) {
  const repoRoot = options.repoRoot || options.root || process.cwd();
  const dependencies = {
    readJson: options.readJson || ((path) => readJson(repoRoot, path)),
    pathExists: options.pathExists || pathExists
  };
  const request = options.request || await dependencies.readJson(GODMODE_V5_ARCHITECTURE_REQUEST_PATH);
  const state = options.state || await dependencies.readJson("configs/godmode_v5_runtime.config.json");
  const coordination = options.coordination || await dependencies.readJson("configs/ghostclaw_agent_coordination.config.json");
  const validation = validateGodmodeV5ArchitectureRequest(request, state, coordination);
  const sourceRoot = request.SkillBundle?.CanonicalSourceRoot || "";
  const skillChecks = await Promise.all(REQUIRED_SKILLS.map(async (skill) => ({
    Skill: skill,
    Path: `${sourceRoot}/${skill}/SKILL.md`,
    Present: await dependencies.pathExists(resolve(repoRoot, sourceRoot, skill, "SKILL.md"))
  })));
  const installedSkillPresent = await dependencies.pathExists(request.SkillBundle?.InstalledSkillPath || "");
  const finalPacketPresent = await dependencies.pathExists(resolve(repoRoot, request.Output?.ArchitecturePacketPath || ""));
  const hermesDecisionPresent = await dependencies.pathExists(resolve(repoRoot, request.Output?.HermesDecisionPath || ""));
  const sourceSkillsReady = skillChecks.every((item) => item.Present);
  const requestReady = validation.Passed && installedSkillPresent && sourceSkillsReady;
  return {
    Schema: "ghostclaw.godmode-v5.architecture-request-status.v1",
    Status: requestReady ? "ArchitectureRequestReadyProviderGateClosed" : "ArchitectureRequestBlocked",
    Phase: validation.State.Phase,
    PhaseOwner: validation.State.Owner,
    RequestId: request.RequestId,
    RequestDigestSha256: validation.RequestDigestSha256,
    RequestValid: validation.Passed,
    ValidationIssues: validation.Issues,
    SkillBundle: request.SkillBundle?.Name || null,
    HermesSkillInstalled: installedSkillPresent,
    SourceSkillsReady: sourceSkillsReady,
    SkillChecks: skillChecks,
    FinalArchitecturePacketPresent: finalPacketPresent,
    HermesDecisionPresent: hermesDecisionPresent,
    ArchitecturePacketAccepted: false,
    CanAdvance: false,
    ProviderCall: {
      Requested: false,
      Authorized: false,
      Executed: false,
      RequiredExactGate: request.ProviderDispatch?.RequiredExactGate || null
    },
    ExternalActionsAuthorized: false,
    NextSafeAction: requestReady
      ? "Review the request, then issue its exact provider gate if a Claude Code architecture call is intended."
      : "Resolve request validation or local skill-source blockers before any provider dispatch."
  };
}

export async function storeGodmodeV5ArchitectureWaitingPacket(options = {}) {
  const repoRoot = options.repoRoot || options.root || process.cwd();
  const status = await getGodmodeV5ArchitectureRequestStatus({ ...options, repoRoot });
  if (!status.RequestValid || !status.HermesSkillInstalled || !status.SourceSkillsReady) {
    throw new Error(`architecture_request_not_ready:${status.ValidationIssues.join(",")}`);
  }
  const packet = {
    Schema: "ghostclaw.a2a2a.architecture-request.v1",
    PacketId: status.RequestId,
    Status: "WaitingForExactProviderGate",
    From: "hermes_commander",
    To: "claude_architect",
    SkillBundle: status.SkillBundle,
    RequestPath: GODMODE_V5_ARCHITECTURE_REQUEST_PATH,
    RequestDigestSha256: status.RequestDigestSha256,
    ProviderCallRequested: false,
    ProviderCallAuthorized: false,
    ProviderCallExecuted: false,
    RequiredExactGate: status.ProviderCall.RequiredExactGate,
    RepoMutationAuthorized: false,
    ExternalActionsAuthorized: false
  };
  const outputPath = resolve(repoRoot, options.outputPath || GODMODE_V5_ARCHITECTURE_WAITING_PATH);
  await writeJsonAtomic(outputPath, packet);
  return { ...packet, Path: relative(repoRoot, outputPath) };
}
