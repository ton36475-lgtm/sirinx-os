import { createHash } from "node:crypto";

const PACKET_SCHEMA = "ghostclaw.cloudflare.r4_prerequisites_packet.v1";
const GRANT_SCHEMA = "ghostclaw.cloudflare.r4_prerequisite_approval_grant.v1";
const RECEIPT_SCHEMA = "ghostclaw.cloudflare.r4_prerequisite_step_receipt.v1";
const TARGET_ID = "hermes_orchestrator_preview";
const CONFIG_PATH = "services/orchestrator/wrangler.preview.jsonc";
const COMMAND_CWD = "services/orchestrator";
const CONFIG_BASENAME = "wrangler.preview.jsonc";
const WRANGLER_ENTRYPOINT = "node_modules/wrangler/bin/wrangler.js";
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const MAX_GRANT_LIFETIME_MS = 15 * 60 * 1000;
const GRANT_TRUST_BOUNDARY = "local-human-operator-record-not-cryptographic-identity";
const SENSITIVE_OUTPUT_PATTERN = /(?:sk-[A-Za-z0-9_-]{16,}|glm-share-[A-Za-z0-9_-]{16,}|Bearer\s+\S{16,}|(?:api[_-]?key|token|secret|password)\s*[:=]\s*\S{8,})/i;
const CLAIMED_GRANT_DIGESTS = new Set();

const wranglerCommand = (args, interactive = false) => ({
  command: "node-runtime",
  args: [WRANGLER_ENTRYPOINT, ...args, "--config", CONFIG_BASENAME],
  cwd: COMMAND_CWD,
  interactive
});

const STEP_DEFINITIONS = Object.freeze([
  {
    id: "oauth_login",
    gatePattern: "APPROVE_CLOUDFLARE_R4_OAUTH_LOGIN_PACKET_<packet_id>",
    externalRequest: true,
    cloudMutation: false,
    localCredentialMutation: true,
    commands: [wranglerCommand(["login"], true)]
  },
  {
    id: "resource_discovery",
    gatePattern: "APPROVE_CLOUDFLARE_R4_RESOURCE_DISCOVERY_PACKET_<packet_id>",
    externalRequest: true,
    cloudMutation: false,
    commands: [
      wranglerCommand(["whoami"]),
      wranglerCommand(["kv", "namespace", "list"])
    ]
  },
  {
    id: "resource_creation",
    gatePattern: "APPROVE_CLOUDFLARE_R4_RESOURCE_CREATE_PACKET_<packet_id>",
    externalRequest: true,
    cloudMutation: true,
    commands: [
      wranglerCommand([
        "kv",
        "namespace",
        "create",
        "hermes-v5-preview-ledger",
        "--preview",
        "--binding",
        "HERMES_LEDGER",
        "--update-config=false"
      ]),
      wranglerCommand([
        "kv",
        "namespace",
        "create",
        "hermes-v5-preview-idempotency",
        "--preview",
        "--binding",
        "IDEMPOTENCY_CACHE",
        "--update-config=false"
      ])
    ]
  },
  {
    id: "secret_provision",
    gatePattern: "APPROVE_CLOUDFLARE_R4_SECRET_PROVISION_PACKET_<packet_id>",
    externalRequest: true,
    cloudMutation: true,
    commands: [wranglerCommand(["secret", "put", "HERMES_API_TOKEN"], true)]
  }
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function cloneCommand(command) {
  return {
    command: command.command,
    args: [...command.args],
    cwd: command.cwd,
    interactive: command.interactive
  };
}

function definitionFor(stepId) {
  const definition = STEP_DEFINITIONS.find((candidate) => candidate.id === stepId);
  if (!definition) throw new Error(`Unknown Cloudflare R4 prerequisite step: ${stepId}`);
  return definition;
}

function stepIndex(stepId) {
  return STEP_DEFINITIONS.findIndex((candidate) => candidate.id === stepId);
}

function expectedGateId(definition, taskId) {
  return definition.gatePattern.replace("<packet_id>", taskId);
}

function withoutDigest(value, field) {
  const copy = { ...value };
  delete copy[field];
  return copy;
}

export function cloudflareR4PacketDigest(packet) {
  return sha256(JSON.stringify(packet));
}

function validatePacket(packet) {
  if (!packet || packet.$schema !== PACKET_SCHEMA) {
    throw new Error(`Cloudflare R4 prerequisite packet schema must be ${PACKET_SCHEMA}`);
  }
  if (!SAFE_ID.test(packet.taskId || "")) {
    throw new Error("Cloudflare R4 prerequisite packet taskId is invalid");
  }
  if (packet.targetId !== TARGET_ID || packet.configPath !== CONFIG_PATH) {
    throw new Error("Cloudflare R4 prerequisite packet target or config path is not allowlisted");
  }
  if (!Array.isArray(packet.steps) || packet.steps.length !== STEP_DEFINITIONS.length) {
    throw new Error("Cloudflare R4 prerequisite packet step set is invalid");
  }
  for (const definition of STEP_DEFINITIONS) {
    const step = packet.steps.find((candidate) => candidate.id === definition.id);
    if (
      !step ||
      step.requiredGatePattern !== definition.gatePattern ||
      step.expectedGateId !== expectedGateId(definition, packet.taskId) ||
      step.execute !== false
    ) {
      throw new Error(`Cloudflare R4 prerequisite packet step is invalid: ${definition.id}`);
    }
  }
}

function validateApprovalGrant(grant, packet, definition, now) {
  const blockers = [];
  if (!grant) return ["Approval grant is required"];
  if (grant.$schema !== GRANT_SCHEMA) blockers.push("Approval grant schema is invalid");
  if (!SAFE_ID.test(grant.grantId || "")) blockers.push("Approval grant id is invalid");
  if (grant.taskId !== packet.taskId) blockers.push("Approval grant taskId mismatch");
  if (grant.targetId !== TARGET_ID) blockers.push("Approval grant target mismatch");
  if (grant.stepId !== definition.id) blockers.push("Approval grant step mismatch");
  if (grant.packetDigestSha256 !== cloudflareR4PacketDigest(packet)) {
    blockers.push("Approval grant packet digest mismatch");
  }
  if (grant.exactGateId !== expectedGateId(definition, packet.taskId)) {
    blockers.push("Approval grant exact gate mismatch");
  }
  if (grant.approvedBy !== "human_operator") blockers.push("Approval grant approver is invalid");
  if (grant.singleUse !== true || grant.consumed !== false) {
    blockers.push("Approval grant must be unconsumed and single-use");
  }
  if (grant.trustBoundary !== GRANT_TRUST_BOUNDARY) {
    blockers.push("Approval grant trust boundary is invalid");
  }

  const issuedAt = Date.parse(grant.issuedAt);
  const expiresAt = Date.parse(grant.expiresAt);
  const observedAt = now.getTime();
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || issuedAt >= expiresAt) {
    blockers.push("Approval grant timestamps are invalid");
  } else {
    if (expiresAt - issuedAt > MAX_GRANT_LIFETIME_MS) {
      blockers.push("Approval grant lifetime exceeds 15 minutes");
    }
    if (observedAt < issuedAt) blockers.push("Approval grant is not active yet");
    if (observedAt >= expiresAt) blockers.push("Approval grant expired");
  }

  const recordedDigest = grant.grantDigestSha256;
  if (
    typeof recordedDigest !== "string" ||
    !SHA256_PATTERN.test(recordedDigest) ||
    sha256(JSON.stringify(withoutDigest(grant, "grantDigestSha256"))) !== recordedDigest
  ) {
    blockers.push("Approval grant digest is invalid");
  }
  return blockers;
}

export function verifyCloudflareR4ApprovalGrant(options = {}) {
  try {
    const { packet, stepId, approvalGrant } = options;
    validatePacket(packet);
    const definition = definitionFor(stepId);
    const nowProvider = options.now || (() => new Date());
    const now = typeof nowProvider === "function" ? nowProvider() : nowProvider;
    const blockers = validateApprovalGrant(approvalGrant, packet, definition, now);
    return { ok: blockers.length === 0, blockers };
  } catch (error) {
    return { ok: false, blockers: [error.message] };
  }
}

export function createCloudflareR4ApprovalGrant(options = {}) {
  const { packet, stepId, exactGateId, grantId } = options;
  validatePacket(packet);
  const definition = definitionFor(stepId);
  const expected = expectedGateId(definition, packet.taskId);
  if (exactGateId !== expected) {
    throw new Error(`Cloudflare R4 approval exact gate mismatch for step: ${stepId}`);
  }
  if (!SAFE_ID.test(grantId || "")) {
    throw new Error("Cloudflare R4 approval grant id is invalid");
  }

  const ttlSeconds = options.ttlSeconds ?? 300;
  if (
    !Number.isInteger(ttlSeconds) ||
    ttlSeconds <= 0 ||
    ttlSeconds * 1000 > MAX_GRANT_LIFETIME_MS
  ) {
    throw new Error("Cloudflare R4 approval grant lifetime must be 1 to 900 seconds");
  }

  const nowProvider = options.now || (() => new Date());
  const issued = typeof nowProvider === "function" ? nowProvider() : nowProvider;
  if (!(issued instanceof Date) || !Number.isFinite(issued.getTime())) {
    throw new Error("Cloudflare R4 approval grant issuance time is invalid");
  }

  const grant = {
    $schema: GRANT_SCHEMA,
    grantId,
    taskId: packet.taskId,
    targetId: TARGET_ID,
    stepId: definition.id,
    packetDigestSha256: cloudflareR4PacketDigest(packet),
    exactGateId: expected,
    approvedBy: "human_operator",
    issuedAt: issued.toISOString(),
    expiresAt: new Date(issued.getTime() + ttlSeconds * 1000).toISOString(),
    singleUse: true,
    consumed: false,
    trustBoundary: GRANT_TRUST_BOUNDARY
  };
  grant.grantDigestSha256 = sha256(JSON.stringify(grant));

  const verification = verifyCloudflareR4ApprovalGrant({
    packet,
    stepId,
    approvalGrant: grant,
    now: issued
  });
  if (!verification.ok) {
    throw new Error(verification.blockers.join("; "));
  }
  return grant;
}

function resultMatchesCommand(result, command) {
  return (
    result?.command === command.command &&
    JSON.stringify(result?.args) === JSON.stringify(command.args) &&
    result?.cwd === command.cwd &&
    result?.interactive === command.interactive
  );
}

function verifyReceiptCore(receipt, packet, definition, dependencyReceipt) {
  const blockers = [];
  if (receipt?.$schema !== RECEIPT_SCHEMA) blockers.push("Receipt schema is invalid");
  if (receipt?.taskId !== packet.taskId) blockers.push("Receipt taskId does not match packet");
  if (receipt?.targetId !== TARGET_ID) blockers.push("Receipt targetId is invalid");
  if (receipt?.stepId !== definition.id) blockers.push("Receipt stepId is invalid");
  if (receipt?.packetDigestSha256 !== cloudflareR4PacketDigest(packet)) {
    blockers.push("Receipt packet digest mismatch");
  }
  if (receipt?.status !== "succeeded" || receipt?.execute !== true) {
    blockers.push("Receipt does not prove successful execution");
  }
  if (receipt?.approvalGateId !== expectedGateId(definition, packet.taskId)) {
    blockers.push("Receipt approval gate is invalid");
  }
  if (!SHA256_PATTERN.test(receipt?.approvalGrantDigestSha256 || "")) {
    blockers.push("Receipt approval grant digest is invalid");
  }
  if (!SHA256_PATTERN.test(receipt?.approvalGrantClaimDigestSha256 || "")) {
    blockers.push("Receipt approval grant claim digest is invalid");
  }
  const expectedDependencyDigest = dependencyReceipt?.receiptDigestSha256 || null;
  if (receipt?.dependencyReceiptDigestSha256 !== expectedDependencyDigest) {
    blockers.push("Receipt dependency digest is invalid");
  }

  if (!Array.isArray(receipt?.results) || receipt.results.length !== definition.commands.length) {
    blockers.push("Receipt command results are incomplete or failed");
  } else {
    for (const [index, command] of definition.commands.entries()) {
      const result = receipt.results[index];
      if (!resultMatchesCommand(result, command)) {
        blockers.push(`Receipt command result does not match the fixed argv allowlist: ${index}`);
        continue;
      }
      if (
        result.exitCode !== 0 ||
        result.spawnErrorCode !== null ||
        result.sensitiveOutputDetected !== false ||
        !Number.isInteger(result.outputBytes) ||
        result.outputBytes < 0 ||
        !SHA256_PATTERN.test(result.outputDigestSha256 || "") ||
        !SHA256_PATTERN.test(result.executableDigestSha256 || "") ||
        !SHA256_PATTERN.test(result.wranglerEntrypointDigestSha256 || "")
      ) {
        blockers.push(`Receipt command result is incomplete or failed: ${index}`);
      }
    }
  }
  if (receipt?.rawOutputStored !== false) blockers.push("Receipt raw-output policy is invalid");
  if (
    receipt?.secretValueCapturedByWrapper !== false ||
    receipt?.secretValuePrintedByWrapper !== false
  ) {
    blockers.push("Receipt wrapper secret-handling policy is invalid");
  }
  if (receipt?.childOutputRedactionGuaranteed !== false) {
    blockers.push("Receipt overstates child-output redaction");
  }
  if (/"(?:stdout|stderr)"\s*:/.test(JSON.stringify(receipt || {}))) {
    blockers.push("Receipt contains raw command output");
  }

  const recordedDigest = receipt?.receiptDigestSha256;
  if (
    typeof recordedDigest !== "string" ||
    !SHA256_PATTERN.test(recordedDigest) ||
    sha256(JSON.stringify(withoutDigest(receipt, "receiptDigestSha256"))) !== recordedDigest
  ) {
    blockers.push("Receipt digest is invalid");
  }
  return blockers;
}

function orderedReceiptChain(packet, priorReceipts, count) {
  const blockers = [];
  if (!Array.isArray(priorReceipts)) return { blockers: ["Prior receipts must be an array"], ordered: [] };
  const expectedIds = STEP_DEFINITIONS.slice(0, count).map((definition) => definition.id);
  const expectedIdSet = new Set(expectedIds);
  for (const receipt of priorReceipts) {
    if (!expectedIdSet.has(receipt?.stepId)) {
      blockers.push(`Unexpected prerequisite receipt: ${receipt?.stepId || "missing-step-id"}`);
    }
  }

  const ordered = [];
  let dependencyReceipt = null;
  for (const [index, id] of expectedIds.entries()) {
    const matches = priorReceipts.filter((receipt) => receipt?.stepId === id);
    if (matches.length !== 1) {
      blockers.push(
        matches.length === 0
          ? `Missing successful prerequisite receipt: ${id}`
          : `Duplicate prerequisite receipt: ${id}`
      );
      continue;
    }
    const receipt = matches[0];
    const receiptBlockers = verifyReceiptCore(
      receipt,
      packet,
      STEP_DEFINITIONS[index],
      dependencyReceipt
    );
    blockers.push(...receiptBlockers.map((blocker) => `Invalid prerequisite receipt ${id}: ${blocker}`));
    ordered.push(receipt);
    dependencyReceipt = receipt;
  }
  return { blockers, ordered };
}

export function verifyCloudflareR4StepReceipt(receipt, packet, priorReceipts = []) {
  try {
    validatePacket(packet);
    const definition = definitionFor(receipt?.stepId);
    const index = stepIndex(definition.id);
    const chain = orderedReceiptChain(packet, priorReceipts, index);
    const dependencyReceipt = chain.ordered[index - 1] || null;
    const blockers = [
      ...chain.blockers,
      ...verifyReceiptCore(receipt, packet, definition, dependencyReceipt)
    ];
    return { ok: blockers.length === 0, blockers };
  } catch (error) {
    return { ok: false, blockers: [error.message] };
  }
}

export function buildCloudflareR4PrerequisitePlan(options = {}) {
  const { packet, stepId, approvalGrant = null, execute = false, priorReceipts = [] } = options;
  validatePacket(packet);
  const definition = definitionFor(stepId);
  const index = stepIndex(stepId);
  const chain = orderedReceiptChain(packet, priorReceipts, index);
  const nowProvider = options.now || (() => new Date());
  const now = typeof nowProvider === "function" ? nowProvider() : nowProvider;
  const grantBlockers = execute
    ? validateApprovalGrant(approvalGrant, packet, definition, now)
    : [];
  const blockers = [...grantBlockers, ...chain.blockers];

  return {
    $schema: "ghostclaw.cloudflare.r4_prerequisite_step_plan.v1",
    taskId: packet.taskId,
    targetId: packet.targetId,
    packetDigestSha256: cloudflareR4PacketDigest(packet),
    stepId: definition.id,
    dependency: index > 0 ? STEP_DEFINITIONS[index - 1].id : null,
    status: blockers.length
      ? "blocked"
      : execute
        ? "ready-for-single-step-execution"
        : "dry-run-exact-gate-required",
    expectedGateId: expectedGateId(definition, packet.taskId),
    approvalGrantRequired: true,
    approvalGrantId: execute ? approvalGrant?.grantId || null : null,
    approvalGrantDigestSha256: execute ? approvalGrant?.grantDigestSha256 || null : null,
    grantAccepted: execute && grantBlockers.length === 0,
    grantTrustBoundary: GRANT_TRUST_BOUNDARY,
    commands: definition.commands.map(cloneCommand),
    blockers,
    externalRequest: definition.externalRequest,
    cloudMutation: definition.cloudMutation,
    localCredentialMutation: definition.localCredentialMutation === true,
    execute: execute === true,
    deploy: false,
    push: false,
    rawOutputStored: false,
    secretValueCapturedByWrapper: false,
    secretValuePrintedByWrapper: false,
    childOutputRedactionGuaranteed: false
  };
}

function sanitizeResult(result, command, index) {
  const stdout = typeof result?.stdout === "string" ? result.stdout : "";
  const stderr = typeof result?.stderr === "string" ? result.stderr : "";
  const combined = `${stdout}${stderr}`;
  const sensitiveOutputDetected = SENSITIVE_OUTPUT_PATTERN.test(combined);
  return {
    index,
    command: command.command,
    args: [...command.args],
    cwd: command.cwd,
    interactive: command.interactive,
    exitCode:
      sensitiveOutputDetected || !Number.isInteger(result?.exitCode) ? 1 : result.exitCode,
    outputBytes: Buffer.byteLength(combined),
    outputDigestSha256: sha256(combined),
    sensitiveOutputDetected,
    outputCaptureMode: command.interactive ? "inherited-unobserved" : "captured-hashed-discarded",
    spawnErrorCode:
      typeof result?.spawnErrorCode === "string" ? result.spawnErrorCode : null,
    executableDigestSha256:
      typeof result?.executableDigestSha256 === "string"
        ? result.executableDigestSha256
        : "",
    wranglerEntrypointDigestSha256:
      typeof result?.wranglerEntrypointDigestSha256 === "string"
        ? result.wranglerEntrypointDigestSha256
        : ""
  };
}

async function claimGrantForExecution(options, plan) {
  if (typeof options.claimApprovalGrant !== "function") {
    throw new Error("Cloudflare R4 execution requires an atomic approval-grant claim adapter");
  }
  const grantDigestSha256 = options.approvalGrant?.grantDigestSha256;
  if (!SHA256_PATTERN.test(grantDigestSha256 || "")) {
    throw new Error("Approval grant digest is invalid before claim");
  }
  if (CLAIMED_GRANT_DIGESTS.has(grantDigestSha256)) {
    throw new Error("Approval grant is already claimed or consumed");
  }
  CLAIMED_GRANT_DIGESTS.add(grantDigestSha256);

  const claim = await options.claimApprovalGrant(Object.freeze({
    taskId: plan.taskId,
    targetId: plan.targetId,
    stepId: plan.stepId,
    packetDigestSha256: plan.packetDigestSha256,
    grantId: plan.approvalGrantId,
    grantDigestSha256,
    exactGateId: plan.expectedGateId
  }));
  if (claim?.claimed !== true || !SHA256_PATTERN.test(claim?.claimDigestSha256 || "")) {
    throw new Error("Approval grant claim adapter did not return durable claim proof");
  }
  return claim;
}

export async function executeCloudflareR4PrerequisiteStep(options = {}) {
  const execute = options.execute === true;
  const plan = buildCloudflareR4PrerequisitePlan({ ...options, execute });
  if (!execute) return plan;
  if (plan.blockers.length) throw new Error(plan.blockers.join("; "));
  if (typeof options.runCommand !== "function") {
    throw new Error("Cloudflare R4 prerequisite execution requires an injected command runner");
  }
  const grantClaim = await claimGrantForExecution(options, plan);

  const results = [];
  for (const [index, command] of plan.commands.entries()) {
    let rawResult;
    try {
      rawResult = await options.runCommand(cloneCommand(command), {
        taskId: plan.taskId,
        stepId: plan.stepId,
        index
      });
    } catch (error) {
      rawResult = {
        exitCode: 1,
        stdout: "",
        stderr: "",
        spawnErrorCode: typeof error?.code === "string" ? error.code : "COMMAND_RUNNER_ERROR",
        executableDigestSha256: "",
        wranglerEntrypointDigestSha256: ""
      };
    }
    const result = sanitizeResult(rawResult, command, index);
    results.push(result);
    if (result.exitCode !== 0 || result.spawnErrorCode !== null) break;
  }

  const succeeded =
    results.length === plan.commands.length &&
    results.every(
      (result) =>
        result.exitCode === 0 &&
        result.spawnErrorCode === null &&
        result.sensitiveOutputDetected === false &&
        SHA256_PATTERN.test(result.executableDigestSha256) &&
        SHA256_PATTERN.test(result.wranglerEntrypointDigestSha256)
    );
  const nowProvider = options.now || (() => new Date());
  const issuedAt = (typeof nowProvider === "function" ? nowProvider() : nowProvider).toISOString();
  const normalizedChain = orderedReceiptChain(
    options.packet,
    options.priorReceipts ?? [],
    stepIndex(plan.stepId)
  );
  const dependencyReceipt = normalizedChain.ordered.at(-1) || null;
  const receipt = {
    $schema: RECEIPT_SCHEMA,
    taskId: plan.taskId,
    targetId: plan.targetId,
    packetDigestSha256: plan.packetDigestSha256,
    stepId: plan.stepId,
    dependency: plan.dependency,
    dependencyReceiptDigestSha256: dependencyReceipt?.receiptDigestSha256 || null,
    status: succeeded ? "succeeded" : "failed",
    approvalGateId: plan.expectedGateId,
    approvalGrantId: plan.approvalGrantId,
    approvalGrantDigestSha256: plan.approvalGrantDigestSha256,
    approvalGrantClaimDigestSha256: grantClaim.claimDigestSha256,
    approvedBy: options.approvalGrant.approvedBy,
    grantTrustBoundary: plan.grantTrustBoundary,
    executionMode: "exact-gate-single-step",
    results,
    externalRequest: plan.externalRequest,
    cloudMutation: plan.cloudMutation,
    localCredentialMutation: plan.localCredentialMutation,
    execute: true,
    deploy: false,
    push: false,
    rawOutputStored: false,
    secretValueCapturedByWrapper: false,
    secretValuePrintedByWrapper: false,
    childOutputRedactionGuaranteed: false,
    issuedAt
  };
  receipt.receiptDigestSha256 = sha256(JSON.stringify(receipt));
  return receipt;
}

export const CLOUDFLARE_R4_PREREQUISITE_STEPS = STEP_DEFINITIONS.map(
  (definition) => definition.id
);
