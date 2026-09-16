import { createHash } from "node:crypto";
import { access, readFile, realpath } from "node:fs/promises";
import path from "node:path";

const DEFAULT_CONFIG_PATH = "configs/cloudflare_deployment_targets.config.json";
const SECRET_VALUE_PATTERN = /(sk-[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}|-----BEGIN [A-Z ]+PRIVATE KEY-----)/;
const PLACEHOLDER_PATTERN = /(change[-_ ]?me|replace[-_ ]?with|<[^>]+>)/i;
const CLOUDFLARE_ID_PATTERN = /^[0-9a-f]{32}$/i;
const OWNER_PRINCIPAL_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:@+-]{0,127}$/;

export const R3_REQUIRED_SOURCE_HASH_PATHS = Object.freeze([
  "configs/cloudflare_deployment_targets.config.json",
  "services/dev-control-api/server.mjs",
  "services/dev-control-api/test-cloudflare-approval.mjs",
  "services/dev-control-api/src/cloudflare-deploy-approval.mjs",
  "services/dev-control-api/src/cloudflare-deployment-readiness.mjs",
  "services/dev-control-api/src/cloudflare-deployment-readiness.test.mjs",
  "services/dev-control-api/src/cloudflare-r4-prerequisites-runner.mjs",
  "services/dev-control-api/src/cloudflare-r4-prerequisites-runner.test.mjs",
  "scripts/ghostclaw-cloudflare-r3-readiness.mjs",
  "scripts/ghostclaw-cloudflare-r4-approval-grant.mjs",
  "scripts/ghostclaw-cloudflare-r4-approval-grant.test.mjs",
  "scripts/ghostclaw-cloudflare-r4-safe-store.py",
  "scripts/ghostclaw-cloudflare-r4-prerequisites-packet.mjs",
  "scripts/ghostclaw-cloudflare-r4-prerequisites-runner.mjs",
  "services/orchestrator/Cargo.toml",
  "services/orchestrator/Cargo.lock",
  "services/orchestrator/package.json",
  "services/orchestrator/wrangler.preview.jsonc",
  "services/orchestrator/scripts/build-worker.mjs",
  "services/orchestrator/scripts/verify-deploy-contract.mjs",
  "services/orchestrator/tests/deploy-contract.test.mjs",
  "services/orchestrator/crates/hermes-worker/src/lib.rs"
]);

export const R3_REQUIRED_OFFLINE_CHECK_SPECS = Object.freeze([
  Object.freeze({
    id: "deploy_contract_tests",
    executable: "node-runtime",
    args: Object.freeze(["--test", "tests/deploy-contract.test.mjs"]),
    cwd: "services/orchestrator"
  }),
  Object.freeze({
    id: "cargo_fmt",
    executable: "cargo",
    args: Object.freeze(["fmt", "--all", "--", "--check"]),
    cwd: "services/orchestrator"
  }),
  Object.freeze({
    id: "cargo_check_native",
    executable: "cargo",
    args: Object.freeze(["check", "--workspace", "--all-targets", "--offline"]),
    cwd: "services/orchestrator"
  }),
  Object.freeze({
    id: "cargo_test_native",
    executable: "cargo",
    args: Object.freeze(["test", "--workspace", "--all-targets", "--offline"]),
    cwd: "services/orchestrator"
  }),
  Object.freeze({
    id: "cargo_clippy_native",
    executable: "cargo",
    args: Object.freeze([
      "clippy",
      "--workspace",
      "--all-targets",
      "--offline",
      "--",
      "-D",
      "warnings"
    ]),
    cwd: "services/orchestrator"
  }),
  Object.freeze({
    id: "cargo_check_wasm",
    executable: "cargo",
    args: Object.freeze([
      "check",
      "--workspace",
      "--target",
      "wasm32-unknown-unknown",
      "--offline"
    ]),
    cwd: "services/orchestrator"
  })
]);

export const R3_REQUIRED_OFFLINE_CHECK_IDS = Object.freeze(
  R3_REQUIRED_OFFLINE_CHECK_SPECS.map((spec) => spec.id)
);

function nowIso(options = {}) {
  const now = options.now || (() => new Date());
  return (typeof now === "function" ? now() : now).toISOString();
}

async function pathExists(repoRoot, relativePath) {
  try {
    await access(path.join(repoRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

export async function inspectArtifactEvidence(repoRoot, target) {
  const requirement = target?.artifactEvidence;
  if (!requirement) {
    return {
      required: false,
      ok: true,
      status: "not_required",
      blockers: []
    };
  }

  const blockers = [];
  const manifestPath = path.resolve(repoRoot, requirement.manifestPath);
  const repositoryRoot = path.resolve(repoRoot);
  if (!manifestPath.startsWith(`${repositoryRoot}${path.sep}`)) {
    return {
      required: true,
      ok: false,
      status: "invalid_manifest_path",
      manifestPath: requirement.manifestPath,
      blockers: ["Artifact manifest path escapes the repository root."]
    };
  }

  let manifest;
  let manifestContents;
  try {
    manifestContents = await readFile(manifestPath);
    manifest = JSON.parse(manifestContents.toString("utf8"));
  } catch {
    return {
      required: true,
      ok: false,
      status: "manifest_missing_or_invalid",
      manifestPath: requirement.manifestPath,
      blockers: [`Artifact manifest is missing or invalid: ${requirement.manifestPath}`]
    };
  }

  if (manifest.schema !== requirement.schema) {
    blockers.push(`Artifact manifest schema must be ${requirement.schema}`);
  }

  const entries = new Map(
    (Array.isArray(manifest.files) ? manifest.files : []).map((entry) => [entry.path, entry])
  );
  const artifactRoot = path.dirname(manifestPath);
  for (const requiredFile of requirement.requiredFiles) {
    const entry = entries.get(requiredFile);
    if (!entry) {
      blockers.push(`Artifact manifest is missing required file: ${requiredFile}`);
      continue;
    }

    const filePath = path.resolve(artifactRoot, requiredFile);
    if (!filePath.startsWith(`${artifactRoot}${path.sep}`)) {
      blockers.push(`Artifact file escapes the output directory: ${requiredFile}`);
      continue;
    }

    let contents;
    try {
      contents = await readFile(filePath);
    } catch {
      blockers.push(`Artifact file is missing: ${requiredFile}`);
      continue;
    }
    if (entry.bytes !== contents.length) {
      blockers.push(`Artifact byte count mismatch: ${requiredFile}`);
    }
    if (entry.sha256 !== sha256(contents)) {
      blockers.push(`Artifact checksum mismatch: ${requiredFile}`);
    }
  }

  return {
    required: true,
    ok: blockers.length === 0,
    status: blockers.length ? "invalid" : "verified",
    manifestPath: requirement.manifestPath,
    manifestSchema: manifest.schema,
    manifestGeneratedAt: manifest.generated_at || null,
    manifestDigestSha256: sha256(manifestContents),
    requiredFiles: requirement.requiredFiles,
    blockers
  };
}

export async function inspectPreviewConfiguration(repoRoot, target) {
  const requirement = target?.previewConfigurationEvidence;
  if (!requirement) {
    return {
      required: false,
      ok: true,
      status: "not_required",
      blockers: []
    };
  }

  let config;
  try {
    config = JSON.parse(await readFile(path.resolve(repoRoot, target.configPath), "utf8"));
  } catch {
    return {
      required: true,
      ok: false,
      status: "config_missing_or_invalid",
      configPath: target.configPath,
      blockers: [`Preview config is missing or invalid: ${target.configPath}`]
    };
  }

  const blockers = [];
  const ownerVariable = requirement.ownerAllowlistVar;
  let ownerPrincipals = [];
  if (ownerVariable) {
    const owners = config.vars?.[ownerVariable];
    ownerPrincipals = typeof owners === "string"
      ? owners.split(",").map((owner) => owner.trim()).filter(Boolean)
      : [];
    if (
      typeof owners !== "string" ||
      PLACEHOLDER_PATTERN.test(owners) ||
      ownerPrincipals.length === 0 ||
      ownerPrincipals.length > 16 ||
      ownerPrincipals.some((owner) => !OWNER_PRINCIPAL_PATTERN.test(owner))
    ) {
      blockers.push(`${ownerVariable} requires exact preview owner principals`);
    }
  }

  const ownerRegistry = requirement.ownerPrincipalRegistry;
  if (ownerRegistry && ownerPrincipals.length && !blockers.length) {
    let registry;
    try {
      const registryPath = path.resolve(repoRoot, ownerRegistry.path);
      const repositoryRoot = path.resolve(repoRoot);
      if (!registryPath.startsWith(`${repositoryRoot}${path.sep}`)) {
        throw new Error("registry path escapes repository root");
      }
      registry = JSON.parse(await readFile(registryPath, "utf8"));
    } catch {
      blockers.push(`${ownerVariable} role registry is missing or invalid`);
    }

    if (registry) {
      const registeredRoleIds = new Set(
        (Array.isArray(registry.roles) ? registry.roles : []).map((role) => role.id)
      );
      const approvedRoleIds = new Set(ownerRegistry.allowedRoleIds ?? []);
      if (registry.$schema !== ownerRegistry.schema) {
        blockers.push(`${ownerVariable} role registry schema is invalid`);
      } else if (
        ownerPrincipals.some(
          (owner) => !registeredRoleIds.has(owner) || !approvedRoleIds.has(owner)
        )
      ) {
        blockers.push(
          `${ownerVariable} contains a principal outside the approved role registry`
        );
      }
    }
  }

  const bindings = new Map(
    (config.kv_namespaces ?? []).map((entry) => [entry.binding, entry.id])
  );
  for (const binding of requirement.kvBindings ?? []) {
    const id = bindings.get(binding);
    if (
      typeof id !== "string" ||
      PLACEHOLDER_PATTERN.test(id) ||
      !CLOUDFLARE_ID_PATTERN.test(id)
    ) {
      blockers.push(`${binding} requires an exact preview namespace id`);
    }
  }

  return {
    required: true,
    ok: blockers.length === 0,
    status: blockers.length ? "blocked" : "verified",
    configPath: target.configPath,
    checkedBindings: [
      ...(ownerVariable ? [ownerVariable] : []),
      ...(requirement.kvBindings ?? [])
    ],
    blockers
  };
}

export async function inspectRemoteReadinessEvidence(repoRoot, target) {
  const requirement = target?.remoteReadinessEvidence;
  if (!requirement) {
    return {
      required: false,
      ok: true,
      status: "not_required",
      blockers: []
    };
  }

  let evidence;
  let evidenceContents;
  try {
    const evidencePath = path.resolve(repoRoot, requirement.path);
    const repositoryRoot = path.resolve(repoRoot);
    if (!evidencePath.startsWith(`${repositoryRoot}${path.sep}`)) {
      throw new Error("evidence path escapes repository root");
    }
    evidenceContents = await readFile(evidencePath);
    evidence = JSON.parse(evidenceContents.toString("utf8"));
  } catch {
    return {
      required: true,
      ok: false,
      status: "evidence_missing_or_invalid",
      evidencePath: requirement.path,
      checkedKvBindings: requirement.requiredKvBindings ?? [],
      checkedSecretBindings: requirement.requiredSecretBindings ?? [],
      blockers: [`Remote readiness evidence is missing or invalid: ${requirement.path}`]
    };
  }

  const blockers = [];
  if (evidence.$schema !== requirement.schema) {
    blockers.push(`Remote readiness evidence schema must be ${requirement.schema}`);
  }
  if (evidence.targetId !== target.id) {
    blockers.push(`Remote readiness evidence target must be ${target.id}`);
  }
  if (evidence.credentialValueRead !== false || evidence.externalMutation !== false) {
    blockers.push("Remote readiness evidence violates the no-secret/no-mutation policy");
  }
  if (evidence.authenticationVerified !== true) {
    blockers.push("Cloudflare CLI authentication is not verified");
  }
  if (evidence.accountIdMatched !== true) {
    blockers.push("Cloudflare account id match is not verified");
  }

  const verifiedKvBindings = new Set(
    Array.isArray(evidence.verifiedKvBindings) ? evidence.verifiedKvBindings : []
  );
  for (const binding of requirement.requiredKvBindings ?? []) {
    if (!verifiedKvBindings.has(binding)) {
      blockers.push(`Remote KV namespace binding is not verified: ${binding}`);
    }
  }

  const verifiedSecretBindings = new Set(
    Array.isArray(evidence.verifiedSecretBindings) ? evidence.verifiedSecretBindings : []
  );
  for (const binding of requirement.requiredSecretBindings ?? []) {
    if (!verifiedSecretBindings.has(binding)) {
      blockers.push(`Remote secret binding is not verified: ${binding}`);
    }
  }

  return {
    required: true,
    ok: blockers.length === 0,
    status: blockers.length ? "blocked" : "verified",
    evidencePath: requirement.path,
    evidenceDigestSha256: sha256(evidenceContents),
    observedAt: typeof evidence.observedAt === "string" ? evidence.observedAt : null,
    authenticationVerified: evidence.authenticationVerified === true,
    accountIdMatched: evidence.accountIdMatched === true,
    checkedKvBindings: requirement.requiredKvBindings ?? [],
    checkedSecretBindings: requirement.requiredSecretBindings ?? [],
    verifiedKvBindings: [...verifiedKvBindings],
    verifiedSecretBindings: [...verifiedSecretBindings],
    credentialValueRead: evidence.credentialValueRead === true,
    externalMutation: evidence.externalMutation === true,
    blockers
  };
}

export async function inspectR3ReadinessReceipt(repoRoot, config, targetId) {
  const receiptPath = config?.gates?.R4?.readinessReceiptPath;
  if (!receiptPath) {
    return {
      required: true,
      ok: false,
      status: "receipt_path_missing",
      blockers: ["R4 requires a configured R3 readiness receipt path"]
    };
  }

  let receipt;
  try {
    const absolutePath = path.resolve(repoRoot, receiptPath);
    const repositoryRoot = path.resolve(repoRoot);
    if (!absolutePath.startsWith(`${repositoryRoot}${path.sep}`)) {
      throw new Error("receipt path escapes repository root");
    }
    receipt = JSON.parse(await readFile(absolutePath, "utf8"));
  } catch {
    return {
      required: true,
      ok: false,
      status: "receipt_missing_or_invalid",
      path: receiptPath,
      blockers: [`R3 readiness receipt is missing or invalid: ${receiptPath}`]
    };
  }

  const blockers = [];
  if (receipt.schema !== "ghostclaw.cloudflare.r3_readiness_receipt.v1") {
    blockers.push("R3 readiness receipt schema is invalid");
  }
  if (receipt.targetId !== targetId) {
    blockers.push(`R3 readiness receipt target must be ${targetId}`);
  }
  if (receipt.r3Verified !== true) {
    blockers.push("R3 readiness receipt does not prove R3 verification");
  }
  if (receipt.inventory?.inventoryValidation?.ok !== true) {
    blockers.push("R3 readiness receipt inventory validation did not pass");
  }
  if (receipt.networkIsolationEnforced !== false) {
    blockers.push("R3 readiness receipt must state that OS network isolation was not enforced");
  }
  if (typeof receipt.evidenceScope !== "string" || receipt.evidenceScope.length === 0) {
    blockers.push("R3 readiness receipt evidence scope is missing");
  }

  const offlineChecks = Array.isArray(receipt.offlineChecks) ? receipt.offlineChecks : [];
  const checksById = new Map();
  const requiredOfflineCheckIds = new Set(
    R3_REQUIRED_OFFLINE_CHECK_SPECS.map((spec) => spec.id)
  );
  for (const check of offlineChecks) {
    if (!check || typeof check.id !== "string" || checksById.has(check.id)) {
      blockers.push("R3 readiness receipt contains an invalid or duplicate offline check");
      continue;
    }
    checksById.set(check.id, check);
    if (!requiredOfflineCheckIds.has(check.id)) {
      blockers.push(`R3 readiness receipt contains unexpected offline check: ${check.id}`);
    }
  }
  for (const spec of R3_REQUIRED_OFFLINE_CHECK_SPECS) {
    const check = checksById.get(spec.id);
    if (!check) {
      blockers.push(`R3 readiness receipt is missing offline check: ${spec.id}`);
      continue;
    }
    if (
      check.passed !== true ||
      check.exitCode !== 0 ||
      check.spawnError !== null ||
      typeof check.outputDigestSha256 !== "string" ||
      !/^[0-9a-f]{64}$/.test(check.outputDigestSha256)
    ) {
      blockers.push(`R3 readiness offline check did not pass cleanly: ${spec.id}`);
    }
    const resolvedExecutable = spec.executable === "node-runtime" ? process.execPath : spec.executable;
    const expectedCommand = [resolvedExecutable, ...spec.args].join(" ");
    if (
      check.executable !== spec.executable ||
      JSON.stringify(check.args) !== JSON.stringify(spec.args) ||
      check.cwd !== spec.cwd ||
      check.command !== expectedCommand
    ) {
      blockers.push(`R3 readiness offline check command does not match: ${spec.id}`);
    }
  }

  const sourceHashes = Array.isArray(receipt.sourceHashes) ? receipt.sourceHashes : [];
  const sourceHashesByPath = new Map();
  const requiredSourceHashPaths = new Set(R3_REQUIRED_SOURCE_HASH_PATHS);
  const repositoryRoot = await realpath(path.resolve(repoRoot));
  for (const entry of sourceHashes) {
    if (!entry || typeof entry.path !== "string" || sourceHashesByPath.has(entry.path)) {
      blockers.push("R3 readiness receipt contains an invalid or duplicate source hash entry");
      continue;
    }
    sourceHashesByPath.set(entry.path, entry);
    if (!requiredSourceHashPaths.has(entry.path)) {
      blockers.push(`R3 readiness receipt contains unexpected source hash: ${entry.path}`);
    }
    const absolutePath = path.resolve(repositoryRoot, entry.path);
    if (!absolutePath.startsWith(`${repositoryRoot}${path.sep}`)) {
      blockers.push(`R3 readiness source hash path escapes repository root: ${entry.path}`);
      continue;
    }
    try {
      const canonicalPath = await realpath(absolutePath);
      if (!canonicalPath.startsWith(`${repositoryRoot}${path.sep}`)) {
        blockers.push(`R3 readiness source hash resolves outside repository root: ${entry.path}`);
        continue;
      }
      const contents = await readFile(canonicalPath);
      if (
        typeof entry.sha256 !== "string" ||
        !/^[0-9a-f]{64}$/.test(entry.sha256) ||
        sha256(contents) !== entry.sha256
      ) {
        blockers.push(`R3 readiness source hash does not match current file: ${entry.path}`);
      }
    } catch {
      blockers.push(`R3 readiness source hash file is missing or unreadable: ${entry.path}`);
    }
  }
  for (const requiredPath of R3_REQUIRED_SOURCE_HASH_PATHS) {
    if (!sourceHashesByPath.has(requiredPath)) {
      blockers.push(`R3 readiness receipt is missing source hash: ${requiredPath}`);
    }
  }

  const externalActions = receipt.externalActions;
  const externalActionKeys = [
    "network",
    "cloudflareApiCalled",
    "wranglerInvoked",
    "credentialRead",
    "install",
    "deploy",
    "push"
  ];
  if (
    !externalActions ||
    externalActionKeys.some((key) => externalActions[key] !== false) ||
    receipt.noExternalSideEffects !== true
  ) {
    blockers.push("R3 readiness receipt does not prove the declared no-external-action scope");
  }

  const recordedDigest = receipt.receiptDigestSha256;
  const digestInput = { ...receipt };
  delete digestInput.receiptDigestSha256;
  if (
    typeof recordedDigest !== "string" ||
    !/^[0-9a-f]{64}$/.test(recordedDigest) ||
    sha256(JSON.stringify(digestInput)) !== recordedDigest
  ) {
    blockers.push("R3 readiness receipt digest does not match its contents");
  }

  return {
    required: true,
    ok: blockers.length === 0,
    status: blockers.length ? "invalid" : "verified",
    path: receiptPath,
    receiptId: typeof receipt.receiptId === "string" ? receipt.receiptId : null,
    receiptStatus: typeof receipt.status === "string" ? receipt.status : null,
    generatedAt: typeof receipt.generatedAt === "string" ? receipt.generatedAt : null,
    receiptDigestSha256: typeof recordedDigest === "string" ? recordedDigest : null,
    verifiedSourceHashCount: sourceHashesByPath.size,
    verifiedOfflineCheckCount: checksById.size,
    blockers
  };
}

export async function readCloudflareDeploymentTargets(options = {}) {
  const repoRoot = options.repoRoot || process.cwd();
  const configPath = options.configPath || DEFAULT_CONFIG_PATH;
  return JSON.parse(await readFile(path.join(repoRoot, configPath), "utf8"));
}

export function validateCloudflareDeploymentTargets(config) {
  const errors = [];
  const targets = Array.isArray(config?.targets) ? config.targets : [];
  const ids = targets.map((target) => target.id);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];

  if (config?.$schema !== "ghostclaw.cloudflare.deployment_targets.v1") errors.push("invalid_schema");
  if (!config?.version) errors.push("missing_version");
  if (!targets.length) errors.push("missing_targets");
  if (duplicateIds.length) errors.push(`duplicate_target_ids:${duplicateIds.join(",")}`);
  if (!ids.includes(config?.recommendedPreviewTarget)) errors.push("unknown_recommended_preview_target");
  if (config?.gates?.R3?.deploy !== false || config?.gates?.R3?.network !== false) {
    errors.push("r3_must_be_local_readiness_only");
  }
  if (!config?.gates?.R4?.readinessReceiptPath) {
    errors.push("r4_readiness_receipt_path_missing");
  }
  const prerequisiteGates = config?.gates?.R4?.prerequisiteGatePatterns;
  for (const gateName of [
    "oauthLogin",
    "resourceDiscovery",
    "resourceCreation",
    "secretProvision"
  ]) {
    const pattern = prerequisiteGates?.[gateName];
    if (typeof pattern !== "string" || !pattern.includes("<packet_id>")) {
      errors.push(`r4_prerequisite_gate_missing:${gateName}`);
    }
  }
  if (config?.security?.secretValuesAllowed !== false) errors.push("secret_values_must_be_blocked");
  if (config?.security?.directDeployFromTelegram !== false) errors.push("telegram_direct_deploy_must_be_blocked");
  if (config?.security?.directProviderCallFromTelegram !== false) errors.push("telegram_provider_call_must_be_blocked");
  if (config?.security?.receiptRequired !== true) errors.push("deployment_receipt_must_be_required");
  if (SECRET_VALUE_PATTERN.test(JSON.stringify(config))) errors.push("secret_like_value_present");

  for (const target of targets) {
    if (!target.id) errors.push("target_missing_id");
    if (!target.sourcePath) errors.push(`target_missing_source_path:${target.id || "unknown"}`);
    if (!Array.isArray(target.requiredPaths) || !target.requiredPaths.length) {
      errors.push(`target_missing_required_paths:${target.id || "unknown"}`);
    }
    if (!Array.isArray(target.blockers)) errors.push(`target_blockers_must_be_array:${target.id || "unknown"}`);
    if (target.artifactEvidence) {
      if (!target.artifactEvidence.manifestPath) {
        errors.push(`target_artifact_manifest_missing:${target.id || "unknown"}`);
      }
      if (!target.artifactEvidence.schema) {
        errors.push(`target_artifact_schema_missing:${target.id || "unknown"}`);
      }
      if (
        !Array.isArray(target.artifactEvidence.requiredFiles) ||
        !target.artifactEvidence.requiredFiles.length
      ) {
        errors.push(`target_artifact_files_missing:${target.id || "unknown"}`);
      }
    }
    if (target.previewConfigurationEvidence) {
      if (!target.previewConfigurationEvidence.ownerAllowlistVar) {
        errors.push(`target_preview_owner_var_missing:${target.id || "unknown"}`);
      }
      const ownerRegistry = target.previewConfigurationEvidence.ownerPrincipalRegistry;
      if (
        !ownerRegistry?.path ||
        !ownerRegistry?.schema ||
        !Array.isArray(ownerRegistry?.allowedRoleIds) ||
        !ownerRegistry.allowedRoleIds.length
      ) {
        errors.push(`target_preview_owner_registry_missing:${target.id || "unknown"}`);
      }
      if (
        !Array.isArray(target.previewConfigurationEvidence.kvBindings) ||
        !target.previewConfigurationEvidence.kvBindings.length
      ) {
        errors.push(`target_preview_kv_bindings_missing:${target.id || "unknown"}`);
      }
    }
    if (target.remoteReadinessEvidence) {
      if (!target.remoteReadinessEvidence.path || !target.remoteReadinessEvidence.schema) {
        errors.push(`target_remote_evidence_missing:${target.id || "unknown"}`);
      }
      if (
        !Array.isArray(target.remoteReadinessEvidence.requiredKvBindings) ||
        !target.remoteReadinessEvidence.requiredKvBindings.length
      ) {
        errors.push(`target_remote_kv_bindings_missing:${target.id || "unknown"}`);
      }
      if (
        !Array.isArray(target.remoteReadinessEvidence.requiredSecretBindings) ||
        !target.remoteReadinessEvidence.requiredSecretBindings.length
      ) {
        errors.push(`target_remote_secret_bindings_missing:${target.id || "unknown"}`);
      }
      for (const secretName of target.remoteReadinessEvidence.requiredSecretBindings ?? []) {
        if (!config.security.secretsRequiredNamesOnly.includes(secretName)) {
          errors.push(`target_remote_secret_not_declared:${target.id || "unknown"}:${secretName}`);
        }
      }
    }
    if (target.previewEligible !== true && target.previewCommandTemplate) {
      errors.push(`ineligible_target_has_preview_command:${target.id}`);
    }
  }

  return { ok: errors.length === 0, errors, targetCount: targets.length };
}

export async function getCloudflareDeploymentReadiness(options = {}) {
  const repoRoot = options.repoRoot || process.cwd();
  const config = await readCloudflareDeploymentTargets(options);
  const validation = validateCloudflareDeploymentTargets(config);
  const targets = await Promise.all(
    config.targets.map(async (target) => {
      const requiredPaths = await Promise.all(
        target.requiredPaths.map(async (requiredPath) => ({
          path: requiredPath,
          exists: await pathExists(repoRoot, requiredPath)
        }))
      );
      const missingPaths = requiredPaths.filter((item) => !item.exists).map((item) => item.path);
      const artifactEvidence = await inspectArtifactEvidence(repoRoot, target);
      const previewConfigurationEvidence = await inspectPreviewConfiguration(repoRoot, target);
      const remoteReadinessEvidence = await inspectRemoteReadinessEvidence(repoRoot, target);
      const blockers = [
        ...target.blockers,
        ...missingPaths.map((item) => `Missing required path: ${item}`),
        ...artifactEvidence.blockers,
        ...previewConfigurationEvidence.blockers,
        ...remoteReadinessEvidence.blockers
      ];
      return {
        id: target.id,
        label: target.label,
        platform: target.platform,
        previewEligible: target.previewEligible === true,
        status: blockers.length ? "blocked" : target.previewEligible ? "preview_candidate" : "inventory_only",
        requiredPaths,
        blockers,
        buildCommand: target.buildCommand,
        validationCommand: target.validationCommand,
        outputDirectory: target.outputDirectory,
        configPath: target.configPath,
        artifactEvidence,
        previewConfigurationEvidence,
        remoteReadinessEvidence
      };
    })
  );
  const inventoryComplete = validation.ok && targets.every((target) => target.requiredPaths.every((item) => item.exists));
  const recommended = targets.find((target) => target.id === config.recommendedPreviewTarget);

  return {
    title: "GhostClaw Cloudflare Deployment Readiness",
    status: inventoryComplete ? "cloudflare-r3-inventory-ready" : "cloudflare-r3-inventory-blocked",
    gate: "R3",
    validation,
    topology: config.topology,
    recommendedPreviewTarget: config.recommendedPreviewTarget,
    recommendedTargetStatus: recommended?.status || "missing",
    previewDeployReady: recommended?.status === "preview_candidate",
    targets,
    security: config.security,
    externalRequests: false,
    deploy: false,
    push: false,
    keyValuePrinted: false,
    updatedAt: nowIso(options)
  };
}

export async function createCloudflarePreviewPacket(options = {}) {
  const config = await readCloudflareDeploymentTargets(options);
  const readiness = await getCloudflareDeploymentReadiness(options);
  const targetId = options.targetId || config.recommendedPreviewTarget;
  const targetConfig = config.targets.find((target) => target.id === targetId);
  const targetStatus = readiness.targets.find((target) => target.id === targetId);
  if (!targetConfig || !targetStatus) throw new Error(`Unknown Cloudflare target: ${targetId}`);

  const blockers = [...targetStatus.blockers];
  const readinessReceipt = await inspectR3ReadinessReceipt(
    options.repoRoot || process.cwd(),
    config,
    targetId
  );
  blockers.push(...readinessReceipt.blockers);
  if (!targetConfig.previewEligible) blockers.push("Target is not preview eligible.");
  if (!targetConfig.previewCommandTemplate) blockers.push("Preview command template is not defined.");

  return {
    $schema: "ghostclaw.cloudflare.preview_deploy_packet.v1",
    taskId: options.taskId || "CF-R4-PREVIEW-DRAFT",
    correlationId: options.correlationId || "CF-R4-PREVIEW-DRAFT",
    fromAgent: "hermes_commander",
    toAgent: "codex_build_captain",
    owner: "codex_build_captain",
    status: blockers.length ? "blocked-preview-packet" : "ready-for-explicit-r4-gate",
    mode: "preview_plan_only",
    targetId,
    platform: targetConfig.platform,
    sourcePath: targetConfig.sourcePath,
    configPath: targetConfig.configPath,
    buildCommand: targetConfig.buildCommand,
    validationCommand: targetConfig.validationCommand,
    outputDirectory: targetConfig.outputDirectory,
    artifactEvidence: targetStatus.artifactEvidence,
    previewConfigurationEvidence: targetStatus.previewConfigurationEvidence,
    remoteReadinessEvidence: targetStatus.remoteReadinessEvidence,
    readinessReceipt,
    commandPreview: targetConfig.previewCommandTemplate,
    environmentManifest: {
      environment: "preview",
      secretsRequiredNamesOnly: config.security.secretsRequiredNamesOnly
    },
    smokePlan: [
      "HTTP status is successful",
      "health endpoint passes",
      "no browser console errors",
      "agent endpoint returns an authenticated response",
      "Workers logs are visible with a correlation id"
    ],
    rollbackPlan: "Retain the previous deployment id and verify rollback before opening R5.",
    requiredGatePattern: config.gates.R4.requiredGatePattern,
    approvalGateId: null,
    receiptRequired: true,
    blockers,
    execute: false,
    externalRequests: false,
    deploy: false,
    push: false,
    keyValuePrinted: false,
    updatedAt: nowIso(options)
  };
}

export async function createCloudflareR4PrerequisitesPacket(options = {}) {
  const config = await readCloudflareDeploymentTargets(options);
  const readiness = await getCloudflareDeploymentReadiness(options);
  const targetId = options.targetId || config.recommendedPreviewTarget;
  const targetConfig = config.targets.find((target) => target.id === targetId);
  const targetStatus = readiness.targets.find((target) => target.id === targetId);
  if (!targetConfig || !targetStatus) throw new Error(`Unknown Cloudflare target: ${targetId}`);

  const remote = targetStatus.remoteReadinessEvidence;
  const gates = config.gates.R4.prerequisiteGatePatterns;
  const kvVerified =
    remote.authenticationVerified === true &&
    remote.accountIdMatched === true &&
    (targetConfig.remoteReadinessEvidence?.requiredKvBindings ?? []).every((binding) =>
      remote.verifiedKvBindings?.includes(binding)
    );
  const secretVerified =
    remote.authenticationVerified === true &&
    remote.accountIdMatched === true &&
    (targetConfig.remoteReadinessEvidence?.requiredSecretBindings ?? []).every((binding) =>
      remote.verifiedSecretBindings?.includes(binding)
    );
  const taskId = options.taskId || "CF-R4-PREREQUISITES-DRAFT";

  const step = (id, requiredGatePattern, commandPreview, complete, extra = {}) => ({
    id,
    status: complete ? "verified" : "exact-gate-required",
    requiredGatePattern,
    expectedGateId: requiredGatePattern.replace("<packet_id>", taskId),
    exactGateId: null,
    approvalGrantRequired: true,
    commandPreview,
    execute: false,
    ...extra
  });

  return {
    $schema: "ghostclaw.cloudflare.r4_prerequisites_packet.v1",
    taskId,
    correlationId: options.correlationId || taskId,
    fromAgent: "hermes_commander",
    toAgent: "codex_build_captain",
    owner: "codex_build_captain",
    status: targetStatus.blockers.length
      ? "blocked-prerequisites-packet"
      : "prerequisites-verified",
    mode: "r4_prerequisites_plan_only",
    targetId,
    configPath: targetConfig.configPath,
    remoteReadinessEvidence: remote,
    steps: [
      step(
        "oauth_login",
        gates.oauthLogin,
        "node node_modules/wrangler/bin/wrangler.js login --config wrangler.preview.jsonc",
        remote.authenticationVerified === true,
        { externalRequest: true, localCredentialMutation: true }
      ),
      step(
        "resource_discovery",
        gates.resourceDiscovery,
        [
          "node node_modules/wrangler/bin/wrangler.js whoami --config wrangler.preview.jsonc",
          "node node_modules/wrangler/bin/wrangler.js kv namespace list --config wrangler.preview.jsonc"
        ],
        remote.authenticationVerified === true && remote.accountIdMatched === true,
        { externalRequest: true, externalRead: true, cloudMutation: false }
      ),
      step(
        "resource_creation",
        gates.resourceCreation,
        [
          "node node_modules/wrangler/bin/wrangler.js kv namespace create hermes-v5-preview-ledger --preview --binding HERMES_LEDGER --update-config=false --config wrangler.preview.jsonc",
          "node node_modules/wrangler/bin/wrangler.js kv namespace create hermes-v5-preview-idempotency --preview --binding IDEMPOTENCY_CACHE --update-config=false --config wrangler.preview.jsonc"
        ],
        kvVerified,
        { externalRequest: true, cloudMutation: true }
      ),
      step(
        "secret_provision",
        gates.secretProvision,
        "node node_modules/wrangler/bin/wrangler.js secret put HERMES_API_TOKEN --config wrangler.preview.jsonc",
        secretVerified,
        {
          externalRequest: true,
          cloudMutation: true,
          secretValueRequiredViaInteractiveStdin: true,
          secretValueInCommand: false,
          secretValuePrinted: false
        }
      )
    ],
    blockers: targetStatus.blockers,
    runnerScript: "scripts/ghostclaw-cloudflare-r4-prerequisites-runner.mjs",
    approvalGrant: {
      schema: "ghostclaw.cloudflare.r4_prerequisite_approval_grant.v1",
      required: true,
      singleUse: true,
      maximumLifetimeSeconds: 900,
      packetDigestBound: true,
      issuerScript: "scripts/ghostclaw-cloudflare-r4-approval-grant.mjs",
      pendingRoot:
        ".ghostclaw_runtime/a2a2a/approvals/cloudflare-r4-prerequisites/pending",
      trustBoundary: "local-human-operator-record-not-cryptographic-identity"
    },
    approvalGateId: null,
    execute: false,
    externalRequests: false,
    cloudMutation: false,
    deploy: false,
    push: false,
    keyValuePrinted: false,
    updatedAt: nowIso(options)
  };
}

export function formatCloudflareReadinessMessage(result) {
  const targetLines = result.targets.map(
    (target) => `${target.label}: ${target.status} (${target.blockers.length} blockers)`
  );
  return [
    "Cloudflare Deployment Readiness",
    "",
    `Gate: ${result.gate}`,
    `Inventory: ${result.status}`,
    `Recommended preview: ${result.recommendedPreviewTarget}`,
    `Preview ready: ${result.previewDeployReady ? "yes" : "no"}`,
    "",
    ...targetLines,
    "",
    "Deploy executed: no",
    "Cloudflare API called: no"
  ].join("\n");
}

export function formatCloudflarePreviewPacketMessage(packet) {
  return [
    "Cloudflare Preview Packet",
    "",
    `Status: ${packet.status}`,
    `Target: ${packet.targetId}`,
    `Platform: ${packet.platform}`,
    `Blockers: ${packet.blockers.length}`,
    `Required gate: ${packet.requiredGatePattern}`,
    "",
    "Execute: no",
    "Deploy: no",
    "Provider call: no"
  ].join("\n");
}
