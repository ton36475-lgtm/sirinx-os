import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { getA2A2AStatusSurface } from "./a2a2a-status-surface.mjs";
import { getAgentCoordinationStatus } from "./agent-coordination-contract.mjs";
import {
  getCloudflareDeploymentReadiness,
  readCloudflareDeploymentTargets
} from "./cloudflare-deployment-readiness.mjs";
import { getGodmodeV5RuntimeStatus } from "./godmode-v5-state-contract.mjs";
import { getGodmodeV5ArchitectureRequestStatus } from "./godmode-v5-architecture-request.mjs";
import { getHermesAllJobsReadiness } from "./hermes-all-jobs-readiness.mjs";
import { getOpenRouterQwenModelRoutingApproval } from "./model-routing-approval.mjs";
import { getTeamRuntimeBridgeStatus } from "./team-runtime-bridge.mjs";
import { getTelegramGatewayConfigStatus } from "./telegram-gateway-config.mjs";

export const GODMODE_V5_INTEGRATION_RECEIPT_PATH =
  ".ghostclaw_runtime/a2a2a/evidence/godmode-v5-integration-status.json";
export const CLOUDFLARE_R3_READINESS_RECEIPT_PATH =
  ".ghostclaw_runtime/a2a2a/evidence/cloudflare-r3-readiness.json";

const defaultDependencies = {
  getA2A2AStatusSurface,
  getAgentCoordinationStatus,
  getCloudflareDeploymentReadiness,
  getGodmodeV5ArchitectureRequestStatus,
  getGodmodeV5RuntimeStatus,
  getHermesAllJobsReadiness,
  getOpenRouterQwenModelRoutingApproval,
  getTeamRuntimeBridgeStatus,
  getTelegramGatewayConfigStatus,
  readCloudflareDeploymentTargets
};

function nowIso(options = {}) {
  const value = typeof options.now === "function" ? options.now() : options.now || new Date();
  return value.toISOString();
}

function bool(value) {
  return value === true;
}

function externalRequest(requested, requiredApproval) {
  return {
    Requested: bool(requested),
    Status: requested ? "ExactGateRequired" : "NotRequested",
    RequiredApproval: requiredApproval || null,
    Authorized: false,
    Executed: false
  };
}

function pendingCriteria(exitCriteria = {}) {
  return Object.entries(exitCriteria)
    .filter(([, complete]) => complete !== true)
    .map(([name]) => name);
}

async function readOptionalJson(repoRoot, relativePath) {
  try {
    return JSON.parse(await readFile(resolve(repoRoot, relativePath), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT" || error instanceof SyntaxError) return null;
    throw error;
  }
}

function integrationBlockers({ coordination, telegram, cloudflare, allJobs, godmode, architectureRequest }) {
  const blockers = [];
  if (!coordination?.validation?.ok || coordination?.status === "blocked") {
    blockers.push("AgentCoordinationContractInvalid");
  }
  if (telegram?.validation?.valid !== true || telegram?.commandRegistry?.valid !== true) {
    blockers.push("TelegramGatewayConfigInvalid");
  }
  if (cloudflare?.validation?.ok !== true) blockers.push("CloudflareInventoryConfigInvalid");
  if (allJobs?.localSafeReady !== true) blockers.push("HermesAllJobsLocalChecksFailed");
  if (godmode?.Status === "Blocked") blockers.push("GodmodePhaseBlocked");
  if (godmode?.Phase === "Architecture" && architectureRequest?.RequestValid !== true) {
    blockers.push("ArchitectureRequestInvalid");
  }
  return blockers;
}

function componentSummary({
  coordination,
  godmode,
  architectureRequest,
  telegram,
  a2a2a,
  team,
  modelRouting,
  cloudflare,
  cloudflareR3Receipt,
  allJobs
}) {
  return {
    AgentCoordination: {
      Status: coordination.status,
      ContractValid: coordination.validation?.ok === true,
      RoleCount: coordination.validation?.roleCount ?? null,
      SingleRepoWriter: coordination.ownership?.repoWriter || null,
      ArchitectureOwner: coordination.ownership?.architectureOwner || null,
      ReviewOwner: coordination.ownership?.reviewOwner || null,
      ModelRoutes: coordination.modelRoutes || {},
      AssignmentConflictCount: coordination.assignmentConflicts?.length || 0,
      Warnings: coordination.warnings || []
    },
    GodmodeState: {
      Status: godmode.Status,
      Phase: godmode.Phase,
      Owner: godmode.Owner,
      CanAdvance: bool(godmode.CanAdvance),
      ExitCriteriaComplete: bool(godmode.ExitCriteriaComplete),
      PendingExitCriteria: pendingCriteria(godmode.ExitCriteria),
      ExternalActionAuthorized: false
    },
    ArchitectureHandoff: {
      Status: architectureRequest.Status,
      RequestId: architectureRequest.RequestId,
      RequestDigestSha256: architectureRequest.RequestDigestSha256,
      SkillBundle: architectureRequest.SkillBundle,
      HermesSkillInstalled: bool(architectureRequest.HermesSkillInstalled),
      SourceSkillsReady: bool(architectureRequest.SourceSkillsReady),
      FinalArchitecturePacketPresent: bool(architectureRequest.FinalArchitecturePacketPresent),
      HermesDecisionPresent: bool(architectureRequest.HermesDecisionPresent),
      ArchitecturePacketAccepted: bool(architectureRequest.ArchitecturePacketAccepted),
      ProviderCallAuthorized: bool(architectureRequest.ProviderCall?.Authorized),
      ProviderCallExecuted: bool(architectureRequest.ProviderCall?.Executed),
      RequiredExactGate: architectureRequest.ProviderCall?.RequiredExactGate || null,
      CanAdvance: bool(architectureRequest.CanAdvance)
    },
    HermesAllJobs: {
      Status: allJobs.status,
      LocalSafeReady: bool(allJobs.localSafeReady),
      ReadyLaneCount: allJobs.lanes?.ready ?? null,
      TotalLaneCount: allJobs.lanes?.total ?? null,
      GatedLaneCount: allJobs.lanes?.gated ?? null,
      FailedChecks: allJobs.failedChecks || []
    },
    TelegramGateway: {
      Status: telegram.status,
      ConfigValid: telegram.validation?.valid === true,
      CommandRegistryValid: telegram.commandRegistry?.valid === true,
      Mode: telegram.mode,
      LiveSendGate: telegram.liveSendGate,
      ProviderCallGate: telegram.modelRouting?.providerCallGate || "unknown",
      DefaultLiveSend: bool(telegram.guardrails?.defaultLiveSend),
      QueuePayloadExecution: bool(telegram.routing?.queuePayloadExecution)
    },
    A2A2A: {
      Status: a2a2a.status,
      Mode: a2a2a.mode,
      NextGate: a2a2a.nextGate || null,
      WorkerPacketsWritten: a2a2a.packets?.p004?.workerPacketsWritten ?? 0,
      PayloadExecution: bool(a2a2a.acknowledgement?.payloadExecution),
      ProviderCall: bool(a2a2a.acknowledgement?.providerCall),
      SecretRead: bool(a2a2a.acknowledgement?.secretRead)
    },
    TeamRuntime: {
      Status: team.status,
      Mode: team.mode,
      ProviderCalled: bool(team.openRouterQwenAdapter?.providerCalled),
      SecretsRead: bool(team.openRouterQwenAdapter?.secretsRead),
      CanCallPaidApi: bool(team.openRouterQwenAdapter?.canCallPaidApi),
      CanSendMessages: bool(team.aiTeamPairing?.canSendMessages),
      CanStartGateways: bool(team.aiTeamPairing?.canStartGateways)
    },
    ModelRouting: {
      Status: modelRouting.status,
      Mode: modelRouting.mode,
      Provider: modelRouting.provider,
      Model: modelRouting.modelSlugLocked,
      AdapterStatus: modelRouting.adapterStatus,
      ProviderCallRouteExists: bool(modelRouting.approvalPacket?.providerCallRouteExists),
      CanApproveProviderCallNow: bool(modelRouting.approvalPacket?.canApproveProviderCallNow)
    },
    Cloudflare: {
      Status: cloudflare.status,
      Gate: cloudflare.gate,
      InventoryValid: cloudflare.validation?.ok === true,
      TargetCount: cloudflare.validation?.targetCount ?? null,
      RecommendedPreviewTarget: cloudflare.recommendedPreviewTarget,
      RecommendedTargetStatus: cloudflare.recommendedTargetStatus,
      R3ReceiptPresent: cloudflareR3Receipt !== null,
      R3ReceiptStatus: cloudflareR3Receipt?.status || "not-recorded",
      R3Verified: bool(cloudflareR3Receipt?.r3Verified),
      R3ReceiptDigestSha256: cloudflareR3Receipt?.receiptDigestSha256 || null,
      R4BlockerCount: cloudflareR3Receipt?.r4Blockers?.length ?? null,
      PreviewDeployReady: bool(cloudflare.previewDeployReady),
      ExternalRequests: false,
      Deploy: false,
      Push: false
    }
  };
}

export async function getGodmodeV5IntegrationStatus(options = {}) {
  const repoRoot = options.repoRoot || options.root || process.cwd();
  const dependencies = { ...defaultDependencies, ...(options.dependencies || {}) };
  const requests = options.Requests || options.requests || {};
  const shared = { ...options, repoRoot, root: repoRoot };

  const [coordination, godmode, architectureRequest, telegram, a2a2a, team, modelRouting, cloudflare, cloudflareConfig, allJobs] =
    await Promise.all([
      dependencies.getAgentCoordinationStatus(shared),
      dependencies.getGodmodeV5RuntimeStatus(shared),
      dependencies.getGodmodeV5ArchitectureRequestStatus(shared),
      dependencies.getTelegramGatewayConfigStatus(shared),
      dependencies.getA2A2AStatusSurface(shared),
      dependencies.getTeamRuntimeBridgeStatus(shared),
      dependencies.getOpenRouterQwenModelRoutingApproval(shared),
      dependencies.getCloudflareDeploymentReadiness(shared),
      dependencies.readCloudflareDeploymentTargets(shared),
      dependencies.getHermesAllJobsReadiness({
        ...shared,
        liveSendRequested: bool(requests.TelegramLiveSend),
        providerCallRequested: bool(requests.ProviderCall),
        cloudflareR2WriteRequested: bool(requests.CloudflareWrite),
        pushRequested: bool(requests.GitPush),
        deployRequested: bool(requests.CloudflareDeploy),
        installRequested: bool(requests.Install)
      })
    ]);

  const blockers = integrationBlockers({ coordination, telegram, cloudflare, allJobs, godmode, architectureRequest });
  const cloudflareR3Receipt = options.cloudflareR3Receipt ??
    await readOptionalJson(repoRoot, CLOUDFLARE_R3_READINESS_RECEIPT_PATH);
  const hardBlocked = blockers.length > 0;
  const phaseReady = bool(godmode.CanAdvance);
  const localControlPlaneReady = !hardBlocked;
  const allJobGates = allJobs.externalRequests || {};
  const exactGates = {
    A2A2ALocalDispatch: a2a2a.nextGate || null,
    TelegramLiveSend: allJobGates.telegramLiveSend?.requiredApproval || null,
    TelegramProviderCallPattern: telegram.modelRouting?.providerCallApprovalPattern || null,
    ModelProviderCall: allJobGates.providerCall?.requiredApproval || null,
    ClaudeArchitectureProviderCall: architectureRequest.ProviderCall?.RequiredExactGate || null,
    CloudflarePreviewDeployPattern: cloudflareConfig.gates?.R4?.requiredGatePattern || null,
    CloudflareProductionDeployPattern: cloudflareConfig.gates?.R5?.requiredGatePattern || null,
    CloudflareWrite: allJobGates.cloudflareR2Write?.requiredApproval || null,
    GitPush: allJobGates.push?.requiredApproval || null,
    Deploy: allJobGates.deploy?.requiredApproval || null,
    Install: allJobGates.install?.requiredApproval || null
  };
  const externalActions = {
    TelegramLiveSend: externalRequest(requests.TelegramLiveSend, exactGates.TelegramLiveSend),
    ProviderCall: externalRequest(requests.ProviderCall, exactGates.TelegramProviderCallPattern),
    CloudflareWrite: externalRequest(requests.CloudflareWrite, exactGates.CloudflareWrite),
    CloudflareDeploy: externalRequest(requests.CloudflareDeploy, exactGates.CloudflarePreviewDeployPattern),
    GitPush: externalRequest(requests.GitPush, exactGates.GitPush),
    Install: externalRequest(requests.Install, exactGates.Install)
  };
  const externalActionRequested = Object.values(externalActions).some((action) => action.Requested);
  const status = hardBlocked
    ? "Blocked"
    : !phaseReady
      ? "GodmodePhaseInProgress"
      : externalActionRequested
        ? "LocalControlPlaneReadyExternalRequestGated"
        : "LocalControlPlaneReadyExternalActionsGated";

  return {
    Schema: "ghostclaw.godmode-v5.integration-status.v1",
    Title: "GhostClaw GODMODE V5 Integration Status",
    Status: status,
    Mode: "ReadOnlyLocalControlPlaneStatus",
    Phase: godmode.Phase,
    PhaseOwner: godmode.Owner,
    LocalControlPlaneReady: localControlPlaneReady,
    CurrentPhaseCanAdvance: phaseReady,
    LocalCodingAllowedByCurrentPhase: godmode.Phase === "Implementation" && godmode.Status !== "Blocked",
    NoExternalSideEffects: true,
    Components: componentSummary({
      coordination,
      godmode,
      architectureRequest,
      telegram,
      a2a2a,
      team,
      modelRouting,
      cloudflare,
      cloudflareR3Receipt,
      allJobs
    }),
    CompletionAudit: {
      LocalControlPlaneImplemented: localControlPlaneReady,
      CurrentPhaseExitCriteriaComplete: bool(godmode.ExitCriteriaComplete),
      ArchitectureApprovalProven:
        bool(architectureRequest.ArchitecturePacketAccepted) && bool(architectureRequest.HermesDecisionPresent),
      ProviderSmokeProven: false,
      TelegramLiveSendProven: false,
      CloudflarePreviewDeployProven: false,
      CloudflareProductionDeployProven: false,
      ProductionReady: false
    },
    ExternalActions: externalActions,
    RequiredExactGates: exactGates,
    Blockers: blockers,
    PendingPhaseCriteria: pendingCriteria(godmode.ExitCriteria),
    Guardrails: {
      ReadOnly: true,
      SingleRepoWriter: coordination.ownership?.repoWriter || null,
      ArchitectureOwner: coordination.ownership?.architectureOwner || null,
      LiveTelegramSend: false,
      ProviderCall: false,
      SecretRead: false,
      KeyValuePrint: false,
      Install: false,
      Push: false,
      Deploy: false,
      CloudMutation: false
    },
    Evidence: {
      CoordinationContract: coordination.sourceOfTruth?.coordinationContract || null,
      GodmodeConfig: godmode.ConfigPath || null,
      TelegramConfig: telegram.configPath || null,
      CloudflareConfig: "configs/cloudflare_deployment_targets.config.json",
      BaselineScope: "configs/godmode_v5_baseline.scope.json",
      BaselineEvidence:
        ".ghostclaw_runtime/a2a2a/evidence/godmode-v5-baseline-evidence.json",
      BaselineTransition:
        ".ghostclaw_runtime/a2a2a/evidence/godmode-v5-baseline-transition.json",
      ArchitectureRequest: "configs/godmode_v5_architecture.request.json",
      ArchitectureWaitingPacket:
        ".ghostclaw_runtime/a2a2a/tasks/waiting_review/godmode-v5-architecture-request.json",
      RuntimeRecovery:
        "docs/knowledge/OPENCODE_SKILLS_RUNTIME_RECOVERY_2026-07-15.md",
      CloudflareR3Readiness:
        CLOUDFLARE_R3_READINESS_RECEIPT_PATH
    },
    NextSafeAction: hardBlocked
      ? "Resolve the listed local contract blockers before dispatch."
      : !phaseReady
        ? "Complete and receipt the pending current-phase exit criteria before advancing."
        : "Keep external actions closed until one exact target-specific gate and its evidence packet are supplied.",
    UpdatedAt: nowIso(options)
  };
}

export async function writeGodmodeV5IntegrationStatusReceipt(options = {}) {
  const repoRoot = options.repoRoot || options.root || process.cwd();
  const status = options.status || await getGodmodeV5IntegrationStatus({ ...options, repoRoot });
  const outputPath = resolve(repoRoot, options.outputPath || GODMODE_V5_INTEGRATION_RECEIPT_PATH);
  const digest = createHash("sha256").update(JSON.stringify(status), "utf8").digest("hex");
  const receipt = {
    Schema: "ghostclaw.godmode-v5.integration-status-receipt.v1",
    ReceiptId: `godmode-v5-integration-${digest.slice(0, 16)}`,
    StatusDigestSha256: digest,
    GeneratedAt: nowIso(options),
    NoExternalSideEffects: true,
    StatusSnapshot: status
  };
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, outputPath);
  return {
    ...receipt,
    ReceiptPath: relative(repoRoot, outputPath)
  };
}
