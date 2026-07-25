import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { validateCoordinationConfig } from "./agent-coordination-contract.mjs";
import { validateCloudflareDeploymentTargets } from "./cloudflare-deployment-readiness.mjs";
import {
  advanceGodmodeV5State,
  markGodmodeV5ExitCriteria,
  normalizeGodmodeV5State
} from "./godmode-v5-state-contract.mjs";
import { validateTelegramGatewayConfig } from "./telegram-gateway-config.mjs";

const execFileAsync = promisify(execFile);

export const GODMODE_V5_BASELINE_SCOPE_PATH = "configs/godmode_v5_baseline.scope.json";
export const GODMODE_V5_BASELINE_EVIDENCE_PATH =
  ".ghostclaw_runtime/a2a2a/evidence/godmode-v5-baseline-evidence.json";
export const GODMODE_V5_BASELINE_TRANSITION_PATH =
  ".ghostclaw_runtime/a2a2a/evidence/godmode-v5-baseline-transition.json";

const STATE_PATH = "configs/godmode_v5_runtime.config.json";
const STATE_MIRROR_PATH = "services/dev-control-api/configs/godmode_v5_runtime.config.json";

const SOURCE_DESCRIPTORS = Object.freeze([
  {
    Id: "BaselineScope",
    CanonicalPath: GODMODE_V5_BASELINE_SCOPE_PATH,
    Format: "json"
  },
  {
    Id: "GodmodeState",
    CanonicalPath: STATE_PATH,
    MirrorPath: STATE_MIRROR_PATH,
    Format: "json"
  },
  {
    Id: "AgentCoordination",
    CanonicalPath: "configs/ghostclaw_agent_coordination.config.json",
    MirrorPath: "services/dev-control-api/configs/ghostclaw_agent_coordination.config.json",
    Format: "json"
  },
  {
    Id: "TelegramGateway",
    CanonicalPath: "configs/hermes_telegram_gateway.config.json",
    MirrorPath: "services/dev-control-api/configs/hermes_telegram_gateway.config.json",
    Format: "json"
  },
  {
    Id: "CloudflareTargets",
    CanonicalPath: "configs/cloudflare_deployment_targets.config.json",
    MirrorPath: "services/dev-control-api/configs/cloudflare_deployment_targets.config.json",
    Format: "json"
  },
  {
    Id: "GodmodeStateContract",
    CanonicalPath: "services/dev-control-api/src/godmode-v5-state-contract.mjs",
    Format: "module"
  },
  {
    Id: "GodmodeIntegrationStatus",
    CanonicalPath: "services/dev-control-api/src/godmode-v5-integration-status.mjs",
    Format: "module"
  },
  {
    Id: "GodmodeSkillBundle",
    CanonicalPath: "configs/hermes/skill-bundles/full-stack-godmode.yaml",
    Format: "yaml"
  }
]);

function nowIso(options = {}) {
  const value = typeof options.now === "function" ? options.now() : options.now || new Date();
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

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

function packetDigest(packet) {
  const { EvidenceDigestSha256: _ignored, ...unsigned } = packet;
  return sha256(JSON.stringify(stableValue(unsigned)));
}

async function readJson(repoRoot, path) {
  return JSON.parse(await readFile(resolve(repoRoot, path), "utf8"));
}

async function writeJsonAtomic(path, value, mode = 0o600) {
  const temporaryPath = `${path}.${process.pid}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { mode });
  await rename(temporaryPath, path);
}

function isSensitivePath(path) {
  const normalized = String(path).toLowerCase();
  const name = normalized.split("/").pop() || normalized;
  if (name === ".env" || (name.startsWith(".env.") && !name.endsWith(".example") && !name.endsWith(".sample"))) {
    return true;
  }
  return /(^|\/)(id_rsa|id_ed25519|credentials\.json|cookies?\.json|[^/]+\.(pem|key|p12))$/.test(normalized);
}

function safeDirtyPath(path) {
  if (!isSensitivePath(path)) return { Path: path, SensitivePathRedacted: false };
  return {
    Path: "<redacted-sensitive-path>",
    PathDigestSha256: sha256(path),
    SensitivePathRedacted: true
  };
}

export function parseGitStatus(rawStatus = "") {
  const records = String(rawStatus)
    .split("\0")
    .filter(Boolean)
    .map((record) => {
      const Status = record.slice(0, 2);
      const rawPath = record.slice(3);
      const path = safeDirtyPath(rawPath);
      const Lane = path.SensitivePathRedacted ? "<sensitive>" : rawPath.includes("/") ? rawPath.split("/")[0] : "<root>";
      return { Status, Lane, ...path };
    });
  const laneCounts = {};
  for (const record of records) laneCounts[record.Lane] = (laneCounts[record.Lane] || 0) + 1;
  return {
    EntryCount: records.length,
    StagedCount: records.filter((record) => ![" ", "?"].includes(record.Status[0])).length,
    WorktreeCount: records.filter((record) => ![" ", "?"].includes(record.Status[1])).length,
    UntrackedCount: records.filter((record) => record.Status === "??").length,
    DeletedCount: records.filter((record) => record.Status.includes("D")).length,
    SensitivePathCount: records.filter((record) => record.SensitivePathRedacted).length,
    LaneCounts: Object.fromEntries(Object.entries(laneCounts).sort(([left], [right]) => left.localeCompare(right))),
    Entries: records,
    StatusDigestSha256: sha256(String(rawStatus))
  };
}

export async function getGitDirtySnapshot(options = {}) {
  const repoRoot = options.repoRoot || options.root || process.cwd();
  const runGit = options.runGit || (async (args) => {
    const result = await execFileAsync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    return result.stdout;
  });
  const [rawStatus, branchOutput, headOutput] = await Promise.all([
    runGit(["status", "--porcelain=v1", "-uall", "--no-renames", "-z"]),
    runGit(["branch", "--show-current"]),
    runGit(["rev-parse", "HEAD"])
  ]);
  const parsed = parseGitStatus(rawStatus);
  return {
    Branch: String(branchOutput).trim() || "DETACHED",
    HeadCommit: String(headOutput).trim(),
    ...parsed,
    ContentsRead: false
  };
}

export function validateBaselineScope(scope = {}, state = {}) {
  const checks = {
    SchemaValid: scope.$schema === "ghostclaw.godmode.v5.baseline-scope.v1",
    TaskMatches: scope.TaskId === state.TaskId,
    CorrelationMatches: scope.CorrelationId === state.CorrelationId,
    LaneLocked: typeof scope.LaneId === "string" && scope.LaneId.length > 0,
    ObjectiveLocked: typeof scope.Objective === "string" && scope.Objective.length > 20,
    PathsLocked: Array.isArray(scope.AllowedPaths) && scope.AllowedPaths.length > 0,
    SingleWriterLocked: scope.Owners?.SingleRepoWriter === "codex_build_captain",
    ArchitectureOwnerLocked: scope.Owners?.ArchitectureOwner === "claude_architect",
    ExternalActionsClosed:
      scope.ExternalActions && Object.values(scope.ExternalActions).every((value) => value === false)
  };
  return { Passed: Object.values(checks).every(Boolean), Checks: checks };
}

export async function buildGodmodeV5SourceMap(options = {}) {
  const repoRoot = options.repoRoot || options.root || process.cwd();
  const descriptors = options.sourceDescriptors || SOURCE_DESCRIPTORS;
  const sources = await Promise.all(
    descriptors.map(async (descriptor) => {
      try {
        const canonical = await readFile(resolve(repoRoot, descriptor.CanonicalPath));
        const canonicalDigest = sha256(canonical);
        let mirrorDigest = null;
        let mirrorMatches = true;
        if (descriptor.MirrorPath) {
          const mirror = await readFile(resolve(repoRoot, descriptor.MirrorPath));
          mirrorDigest = sha256(mirror);
          mirrorMatches = canonicalDigest === mirrorDigest;
        }
        return {
          ...descriptor,
          Present: true,
          CanonicalDigestSha256: canonicalDigest,
          MirrorDigestSha256: mirrorDigest,
          MirrorMatches: mirrorMatches,
          Error: null
        };
      } catch (error) {
        return {
          ...descriptor,
          Present: false,
          CanonicalDigestSha256: null,
          MirrorDigestSha256: null,
          MirrorMatches: false,
          Error: String(error?.code || error?.message || error)
        };
      }
    })
  );
  return {
    Passed: sources.every((source) => source.Present && source.MirrorMatches),
    SourceCount: sources.length,
    MirrorCount: sources.filter((source) => source.MirrorPath).length,
    Sources: sources
  };
}

export function buildGodmodeV5RiskClassification(configs = {}) {
  const coordinationValidation = validateCoordinationConfig(configs.coordination || {});
  const telegramValidation = validateTelegramGatewayConfig(configs.telegram || {});
  const cloudflareValidation = validateCloudflareDeploymentTargets(configs.cloudflare || {});
  const checks = {
    CoordinationValid: coordinationValidation.ok,
    TelegramConfigValid: telegramValidation.valid,
    CloudflareConfigValid: cloudflareValidation.ok,
    DirectWorkerCommitBlocked: configs.coordination?.execution?.directWorkerCommit === false,
    DirectWorkerPushBlocked: configs.coordination?.execution?.directWorkerPush === false,
    DirectWorkerDeployBlocked: configs.coordination?.execution?.directWorkerDeploy === false,
    TelegramLiveSendClosed: configs.telegram?.gates?.liveSend?.status === "closed",
    TelegramProviderCallClosed: configs.telegram?.gates?.providerCall?.status === "closed",
    CloudflareR3NetworkClosed: configs.cloudflare?.gates?.R3?.network === false,
    CloudflareR3DeployClosed: configs.cloudflare?.gates?.R3?.deploy === false,
    CloudflarePreviewPatternPresent: Boolean(configs.cloudflare?.gates?.R4?.requiredGatePattern),
    CloudflareProductionPatternPresent: Boolean(configs.cloudflare?.gates?.R5?.requiredGatePattern),
    ScopeExternalActionsClosed:
      configs.scope?.ExternalActions && Object.values(configs.scope.ExternalActions).every((value) => value === false)
  };
  return {
    Passed: Object.values(checks).every(Boolean),
    Checks: checks,
    Validation: {
      Coordination: coordinationValidation,
      Telegram: telegramValidation,
      Cloudflare: cloudflareValidation
    },
    Classes: [
      {
        Class: "GreenLocalReadOnly",
        Actions: ["inspect", "status", "docs", "tests", "receipt_preview"],
        Gate: "none"
      },
      {
        Class: "YellowLocalMutation",
        Actions: ["scoped_source_edit", "state_transition", "local_receipt_write"],
        Gate: "valid_file_lease_and_phase_owner"
      },
      {
        Class: "RedExternalBounded",
        Actions: ["provider_call", "telegram_live_send", "install", "git_push", "cloud_write", "deploy"],
        Gate: "single_action_target_bound_exact_gate_and_receipt"
      },
      {
        Class: "BlackProhibited",
        Actions: ["secret_exfiltration", "self_approval", "policy_bypass", "audit_concealment"],
        Gate: "blocked"
      }
    ]
  };
}

export async function buildGodmodeV5BaselineEvidence(options = {}) {
  const repoRoot = options.repoRoot || options.root || process.cwd();
  const dependencies = {
    readJson: (path) => readJson(repoRoot, path),
    buildSourceMap: (inner) => buildGodmodeV5SourceMap({ ...inner, repoRoot }),
    getGitSnapshot: (inner) => getGitDirtySnapshot({ ...inner, repoRoot }),
    buildRiskClassification: buildGodmodeV5RiskClassification,
    ...(options.dependencies || {})
  };
  const [stateInput, scope, coordination, telegram, cloudflare, sourceMap, dirtySnapshot] = await Promise.all([
    dependencies.readJson(STATE_PATH),
    dependencies.readJson(GODMODE_V5_BASELINE_SCOPE_PATH),
    dependencies.readJson("configs/ghostclaw_agent_coordination.config.json"),
    dependencies.readJson("configs/hermes_telegram_gateway.config.json"),
    dependencies.readJson("configs/cloudflare_deployment_targets.config.json"),
    dependencies.buildSourceMap(options),
    dependencies.getGitSnapshot(options)
  ]);
  const state = normalizeGodmodeV5State(stateInput, options);
  const scopeValidation = validateBaselineScope(scope, state);
  const riskClassification = dependencies.buildRiskClassification({ coordination, telegram, cloudflare, scope });
  const criteria = {
    ScopeLocked: {
      Passed: scopeValidation.Passed,
      Evidence: GODMODE_V5_BASELINE_SCOPE_PATH,
      Checks: scopeValidation.Checks
    },
    SourceOfTruthMapped: {
      Passed: sourceMap.Passed,
      Evidence: sourceMap.Sources.map((source) => source.CanonicalPath),
      SourceCount: sourceMap.SourceCount,
      MirrorCount: sourceMap.MirrorCount
    },
    DirtyLanesRecorded: {
      Passed: Boolean(dirtySnapshot.HeadCommit && dirtySnapshot.Branch && dirtySnapshot.StatusDigestSha256),
      Evidence: "git status --porcelain=v1 -uall --no-renames -z",
      EntryCount: dirtySnapshot.EntryCount,
      LaneCount: Object.keys(dirtySnapshot.LaneCounts || {}).length,
      ContentsRead: false
    },
    RiskClassified: {
      Passed: riskClassification.Passed,
      Evidence: "embedded deterministic risk classification",
      ClassCount: riskClassification.Classes.length
    }
  };
  const unsigned = {
    Schema: "ghostclaw.godmode-v5.baseline-evidence.v1",
    TaskId: state.TaskId,
    CorrelationId: state.CorrelationId,
    Phase: state.Phase,
    StateBeforeDigest: state.ReceiptDigest,
    GeneratedAt: nowIso(options),
    Criteria: criteria,
    OverallPassed: Object.values(criteria).every((criterion) => criterion.Passed),
    Scope: scope,
    SourceOfTruth: sourceMap,
    DirtyLanes: dirtySnapshot,
    RiskClassification: riskClassification,
    NoExternalSideEffects: true
  };
  return { ...unsigned, EvidenceDigestSha256: sha256(JSON.stringify(stableValue(unsigned))) };
}

export function verifyGodmodeV5BaselineEvidence(packet = {}, stateInput = {}, options = {}) {
  const state = normalizeGodmodeV5State(stateInput, options);
  const issues = [];
  if (packet.Schema !== "ghostclaw.godmode-v5.baseline-evidence.v1") issues.push("InvalidEvidenceSchema");
  if (packetDigest(packet) !== packet.EvidenceDigestSha256) issues.push("EvidenceDigestMismatch");
  if (packet.TaskId !== state.TaskId) issues.push("TaskIdMismatch");
  if (packet.CorrelationId !== state.CorrelationId) issues.push("CorrelationIdMismatch");
  if (packet.Phase !== "Baseline" || state.Phase !== "Baseline") issues.push("BaselinePhaseRequired");
  if (packet.StateBeforeDigest !== state.ReceiptDigest) issues.push("StateDigestMismatch");
  for (const criterion of ["ScopeLocked", "SourceOfTruthMapped", "DirtyLanesRecorded", "RiskClassified"]) {
    if (packet.Criteria?.[criterion]?.Passed !== true) issues.push(`CriterionFailed:${criterion}`);
  }
  if (packet.OverallPassed !== true) issues.push("OverallEvidenceFailed");
  if (packet.NoExternalSideEffects !== true) issues.push("ExternalSideEffectsNotClosed");
  return { Passed: issues.length === 0, Issues: issues, State: state };
}

export function createArchitectureStateFromBaselineEvidence(packet = {}, stateInput = {}, options = {}) {
  const verification = verifyGodmodeV5BaselineEvidence(packet, stateInput, options);
  if (!verification.Passed) throw new Error(`baseline_evidence_invalid:${verification.Issues.join(",")}`);
  const evidencePath = options.evidencePath || GODMODE_V5_BASELINE_EVIDENCE_PATH;
  const evidence = [...new Set([
    ...verification.State.Evidence,
    GODMODE_V5_BASELINE_SCOPE_PATH,
    evidencePath
  ])];
  const stateWithEvidence = normalizeGodmodeV5State({ ...verification.State, Evidence: evidence }, options);
  const readyState = markGodmodeV5ExitCriteria(
    stateWithEvidence,
    {
      ScopeLocked: true,
      SourceOfTruthMapped: true,
      DirtyLanesRecorded: true,
      RiskClassified: true
    },
    options
  );
  const architectureState = advanceGodmodeV5State(readyState, options);
  return { Verification: verification, ReadyState: readyState, ArchitectureState: architectureState };
}

export async function writeGodmodeV5BaselineEvidence(packet, options = {}) {
  const repoRoot = options.repoRoot || options.root || process.cwd();
  const path = resolve(repoRoot, options.evidencePath || GODMODE_V5_BASELINE_EVIDENCE_PATH);
  await writeJsonAtomic(path, packet, 0o600);
  return { Path: relative(repoRoot, path), EvidenceDigestSha256: packet.EvidenceDigestSha256 };
}

export async function advanceGodmodeV5Baseline(options = {}) {
  const repoRoot = options.repoRoot || options.root || process.cwd();
  const packet = options.packet || await buildGodmodeV5BaselineEvidence({ ...options, repoRoot });
  const stateInput = await readJson(repoRoot, STATE_PATH);
  const evidenceWrite = await writeGodmodeV5BaselineEvidence(packet, { ...options, repoRoot });
  const transition = createArchitectureStateFromBaselineEvidence(packet, stateInput, {
    ...options,
    evidencePath: evidenceWrite.Path
  });
  await writeJsonAtomic(resolve(repoRoot, STATE_PATH), transition.ArchitectureState, 0o644);
  await writeJsonAtomic(resolve(repoRoot, STATE_MIRROR_PATH), transition.ArchitectureState, 0o644);
  const unsignedReceipt = {
    Schema: "ghostclaw.godmode-v5.baseline-transition.v1",
    Status: "AdvancedToArchitecture",
    TaskId: transition.ArchitectureState.TaskId,
    CorrelationId: transition.ArchitectureState.CorrelationId,
    FromPhase: "Baseline",
    ToPhase: transition.ArchitectureState.Phase,
    EvidenceDigestSha256: packet.EvidenceDigestSha256,
    StateBeforeDigest: transition.Verification.State.ReceiptDigest,
    ReadyStateDigest: transition.ReadyState.ReceiptDigest,
    StateAfterDigest: transition.ArchitectureState.ReceiptDigest,
    PreviousReceiptDigest: transition.ArchitectureState.PreviousReceiptDigest,
    UpdatedPaths: [STATE_PATH, STATE_MIRROR_PATH],
    ExternalActionsAuthorized: false,
    GeneratedAt: nowIso(options)
  };
  const receipt = {
    ...unsignedReceipt,
    TransitionDigestSha256: sha256(JSON.stringify(stableValue(unsignedReceipt)))
  };
  const transitionPath = resolve(repoRoot, options.transitionPath || GODMODE_V5_BASELINE_TRANSITION_PATH);
  await writeJsonAtomic(transitionPath, receipt, 0o600);
  return {
    ...receipt,
    EvidencePath: evidenceWrite.Path,
    TransitionPath: relative(repoRoot, transitionPath),
    NoExternalSideEffects: true
  };
}
