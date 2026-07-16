import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import test from "node:test";
import {
  getGodmodeV5IntegrationStatus,
  writeGodmodeV5IntegrationStatusReceipt
} from "./godmode-v5-integration-status.mjs";

const fixedNow = () => new Date("2026-07-15T08:00:00.000Z");
const cloudflareR3Receipt = Object.freeze({
  status: "R3_VERIFIED_R4_BLOCKED",
  r3Verified: true,
  r4PreviewReady: false,
  r4Blockers: ["placeholder-binding", "missing-artifact"],
  receiptDigestSha256: "cloudflare-r3-digest",
  noExternalSideEffects: true
});

function dependencies(overrides = {}) {
  return {
    getAgentCoordinationStatus: async () => ({
      status: "ready",
      validation: { ok: true, roleCount: 10 },
      ownership: {
        repoWriter: "codex_build_captain",
        architectureOwner: "claude_architect",
        reviewOwner: "opencode_glm52_reviewer"
      },
      modelRoutes: {
        architecture: { status: "ready_with_fallback", selected: "glm/glm-5.2" },
        implementation: { status: "ready", selected: "current-codex-session" },
        review: { status: "ready", selected: "glm/glm-5.2" }
      },
      assignmentConflicts: [],
      warnings: [],
      sourceOfTruth: { coordinationContract: "configs/coordination.json" }
    }),
    getGodmodeV5RuntimeStatus: async () => ({
      Status: "InProgress",
      Phase: "Baseline",
      Owner: "HermesCommander",
      CanAdvance: false,
      ExitCriteriaComplete: false,
      ExitCriteria: { ScopeLocked: false, RiskClassified: false },
      ConfigPath: "configs/godmode.json"
    }),
    getGodmodeV5ArchitectureRequestStatus: async () => ({
      Status: "ArchitectureRequestReadyProviderGateClosed",
      RequestId: "architecture-request",
      RequestDigestSha256: "architecture-digest",
      RequestValid: true,
      SkillBundle: "unknowcoding-coding-team",
      HermesSkillInstalled: true,
      SourceSkillsReady: true,
      FinalArchitecturePacketPresent: false,
      HermesDecisionPresent: false,
      ArchitecturePacketAccepted: false,
      ProviderCall: {
        Authorized: false,
        Executed: false,
        RequiredExactGate: "APPROVE_CLAUDE_ARCHITECTURE"
      },
      CanAdvance: false
    }),
    getTelegramGatewayConfigStatus: async () => ({
      status: "telegram-gateway-config-ready-local-safe",
      mode: "dry_run_first",
      liveSendGate: "closed",
      configPath: "configs/telegram.json",
      validation: { valid: true },
      commandRegistry: { valid: true },
      modelRouting: {
        providerCallGate: "closed",
        providerCallApprovalPattern: "APPROVE_PROVIDER_<request_id>"
      },
      guardrails: { defaultLiveSend: false },
      routing: { queuePayloadExecution: false }
    }),
    getA2A2AStatusSurface: async () => ({
      status: "a2a2a-local-worker-packets-dispatched",
      mode: "read_only_status_surface",
      nextGate: "APPROVE_A2A_LOCAL",
      packets: { p004: { workerPacketsWritten: 10 } },
      acknowledgement: { payloadExecution: false, providerCall: false, secretRead: false }
    }),
    getTeamRuntimeBridgeStatus: async () => ({
      status: "team-runtime-bridge-ready-local-only",
      mode: "local-contract",
      openRouterQwenAdapter: { providerCalled: false, secretsRead: false, canCallPaidApi: false },
      aiTeamPairing: { canSendMessages: false, canStartGateways: false }
    }),
    getOpenRouterQwenModelRoutingApproval: () => ({
      status: "openrouter-qwen-model-routing-approval-ready-local-only",
      mode: "approval-packet-only",
      provider: "openrouter",
      modelSlugLocked: "qwen/test",
      adapterStatus: "configured-no-call",
      approvalPacket: { providerCallRouteExists: false, canApproveProviderCallNow: false }
    }),
    getCloudflareDeploymentReadiness: async () => ({
      status: "cloudflare-r3-inventory-ready",
      gate: "R3",
      validation: { ok: true, targetCount: 5 },
      recommendedPreviewTarget: "preview",
      recommendedTargetStatus: "blocked",
      previewDeployReady: false
    }),
    readCloudflareDeploymentTargets: async () => ({
      gates: {
        R4: { requiredGatePattern: "APPROVE_PREVIEW_<packet_id>" },
        R5: { requiredGatePattern: "APPROVE_PRODUCTION_<release_id>" }
      }
    }),
    getHermesAllJobsReadiness: async () => ({
      status: "hermes-all-jobs-ready-local-safe",
      localSafeReady: true,
      lanes: { ready: 8, total: 9, gated: 1 },
      failedChecks: [],
      externalRequests: {
        telegramLiveSend: { requiredApproval: "APPROVE_TELEGRAM" },
        providerCall: { requiredApproval: "APPROVE_MODEL" },
        cloudflareR2Write: { requiredApproval: "APPROVE_R2" },
        push: { requiredApproval: "APPROVE_PUSH" },
        deploy: { requiredApproval: "APPROVE_DEPLOY" },
        install: { requiredApproval: "APPROVE_INSTALL" }
      }
    }),
    ...overrides
  };
}

test("reports an incomplete GODMODE phase without overstating external readiness", async () => {
  const result = await getGodmodeV5IntegrationStatus({
    dependencies: dependencies(),
    cloudflareR3Receipt,
    now: fixedNow
  });

  assert.equal(result.Status, "GodmodePhaseInProgress");
  assert.equal(result.LocalControlPlaneReady, true);
  assert.equal(result.CurrentPhaseCanAdvance, false);
  assert.deepEqual(result.PendingPhaseCriteria, ["ScopeLocked", "RiskClassified"]);
  assert.equal(result.CompletionAudit.ProductionReady, false);
  assert.equal(result.ExternalActions.TelegramLiveSend.Authorized, false);
  assert.equal(result.ExternalActions.ProviderCall.Executed, false);
  assert.equal(result.RequiredExactGates.CloudflarePreviewDeployPattern, "APPROVE_PREVIEW_<packet_id>");
  assert.equal(result.RequiredExactGates.ClaudeArchitectureProviderCall, "APPROVE_CLAUDE_ARCHITECTURE");
  assert.equal(result.Components.ArchitectureHandoff.HermesSkillInstalled, true);
  assert.equal(result.Components.Cloudflare.R3Verified, true);
  assert.equal(result.Components.Cloudflare.R4BlockerCount, 2);
  assert.equal(result.Components.Cloudflare.PreviewDeployReady, false);
});

test("does not infer R3 verification when the local readiness receipt is absent", async () => {
  const root = await mkdtemp(join(tmpdir(), "godmode-v5-no-cloudflare-receipt-"));
  const result = await getGodmodeV5IntegrationStatus({
    repoRoot: root,
    dependencies: dependencies(),
    now: fixedNow
  });

  assert.equal(result.Components.Cloudflare.R3ReceiptPresent, false);
  assert.equal(result.Components.Cloudflare.R3Verified, false);
  assert.equal(result.Components.Cloudflare.R3ReceiptStatus, "not-recorded");
  assert.equal(result.Components.Cloudflare.PreviewDeployReady, false);
});

test("marks a requested provider call as gated rather than authorized", async () => {
  const readyGodmode = async () => ({
    Status: "ReadyToAdvance",
    Phase: "Implementation",
    Owner: "CodexBuildCaptain",
    CanAdvance: true,
    ExitCriteriaComplete: true,
    ExitCriteria: { ImplementationTestsPassed: true },
    ConfigPath: "configs/godmode.json"
  });
  const result = await getGodmodeV5IntegrationStatus({
    dependencies: dependencies({ getGodmodeV5RuntimeStatus: readyGodmode }),
    cloudflareR3Receipt,
    Requests: { ProviderCall: true },
    now: fixedNow
  });

  assert.equal(result.Status, "LocalControlPlaneReadyExternalRequestGated");
  assert.equal(result.ExternalActions.ProviderCall.Status, "ExactGateRequired");
  assert.equal(result.ExternalActions.ProviderCall.RequiredApproval, "APPROVE_PROVIDER_<request_id>");
  assert.equal(result.ExternalActions.ProviderCall.Authorized, false);
  assert.equal(result.Components.AgentCoordination.ModelRoutes.review.selected, "glm/glm-5.2");
  assert.equal(result.NoExternalSideEffects, true);
});

test("fails closed when a required local contract is invalid", async () => {
  const invalidTelegram = async () => ({
    status: "telegram-gateway-config-invalid",
    validation: { valid: false },
    commandRegistry: { valid: false },
    modelRouting: {},
    guardrails: {},
    routing: {}
  });
  const result = await getGodmodeV5IntegrationStatus({
    dependencies: dependencies({ getTelegramGatewayConfigStatus: invalidTelegram }),
    cloudflareR3Receipt,
    now: fixedNow
  });

  assert.equal(result.Status, "Blocked");
  assert.ok(result.Blockers.includes("TelegramGatewayConfigInvalid"));
});

test("writes a local receipt with a stable status digest", async () => {
  const root = await mkdtemp(join(tmpdir(), "godmode-v5-integration-"));
  const status = await getGodmodeV5IntegrationStatus({
    dependencies: dependencies(),
    cloudflareR3Receipt,
    now: fixedNow
  });
  const receipt = await writeGodmodeV5IntegrationStatusReceipt({
    repoRoot: root,
    outputPath: "runtime/receipt.json",
    status,
    now: fixedNow
  });
  const stored = JSON.parse(await readFile(join(root, "runtime/receipt.json"), "utf8"));

  assert.equal(receipt.ReceiptPath, "runtime/receipt.json");
  assert.equal(stored.StatusDigestSha256, receipt.StatusDigestSha256);
  assert.equal(stored.StatusSnapshot.Status, "GodmodePhaseInProgress");
  assert.equal(stored.NoExternalSideEffects, true);
});
