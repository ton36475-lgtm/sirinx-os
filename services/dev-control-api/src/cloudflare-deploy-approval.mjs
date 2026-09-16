import {
  createCloudflarePreviewPacket,
  getCloudflareDeploymentReadiness
} from "./cloudflare-deployment-readiness.mjs";

function recommendedTarget(readiness) {
  return readiness.targets.find(
    (target) => target.id === readiness.recommendedPreviewTarget
  );
}

export async function getCloudflareDeployStatus(options = {}) {
  const readiness = await getCloudflareDeploymentReadiness(options);
  const target = recommendedTarget(readiness);
  return {
    schema: "ghostclaw.cloudflare.deploy_status.v2",
    project: "GhostClaw OS V5",
    gate: readiness.gate,
    status: readiness.status,
    targetId: readiness.recommendedPreviewTarget,
    targetStatus: target?.status || "missing",
    previewDeployReady: readiness.previewDeployReady,
    blockerCount: target?.blockers.length || 0,
    blockers: target?.blockers || ["Recommended preview target is missing."],
    inventoryValidation: readiness.validation,
    dryRunAvailable: true,
    exactPreviewGatePattern:
      "APPROVE_CLOUDFLARE_PREVIEW_DEPLOY_PACKET_<packet_id>",
    deployAuthorized: false,
    deployExecuted: false,
    externalWrites: false,
    keyValuePrinted: false,
    noExternalSideEffects: true,
    updatedAt: readiness.updatedAt
  };
}

export async function createCloudflareDeployDryRun(gate = "LOCAL_PREVIEW_ONLY", options = {}) {
  const packet = await createCloudflarePreviewPacket(options);
  return {
    schema: "ghostclaw.cloudflare.deploy_dry_run.v2",
    status: packet.status,
    requestedGate: gate,
    gateAccepted: false,
    targetId: packet.targetId,
    blockerCount: packet.blockers.length,
    blockers: packet.blockers,
    commandPreview: packet.commandPreview,
    requiredGatePattern: packet.requiredGatePattern,
    packet,
    execute: false,
    deploy: false,
    externalRequests: false,
    keyValuePrinted: false,
    noExternalSideEffects: true
  };
}

export async function simulateCloudflareDeploy(options = {}) {
  const readiness = await getCloudflareDeploymentReadiness(options);
  const target = recommendedTarget(readiness);
  return {
    schema: "ghostclaw.cloudflare.local_simulation.v2",
    status: "local-simulation-only",
    targetId: readiness.recommendedPreviewTarget,
    targetStatus: target?.status || "missing",
    bindings: {
      kv: ["HERMES_LEDGER", "IDEMPOTENCY_CACHE"],
      r2: []
    },
    blockerCount: target?.blockers.length || 0,
    deployAuthorized: false,
    deployExecuted: false,
    externalRequests: false,
    externalWrites: false,
    keyValuePrinted: false,
    noExternalSideEffects: true,
    updatedAt: readiness.updatedAt
  };
}
