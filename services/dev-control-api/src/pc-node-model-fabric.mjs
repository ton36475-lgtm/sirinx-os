import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DEFAULT_CONFIG_URL = new URL("../../../config/pc-node-model-fabric.v1.json", import.meta.url);
const REQUIRED_PROVIDER_FAMILIES = [
  "deepseek",
  "gemini",
  "anthropic-claude",
  "openai",
  "zai-glm",
  "alibaba-qwen",
  "xai-grok",
  "openrouter-free-explicit",
  "local-openai-compatible",
  "custom-openai-compatible"
];
const REQUIRED_SERENA_ALLOWLIST = ["symbols", "references", "diagnostics", "semantic_search"];
const REQUIRED_SERENA_DENYLIST = ["execute_shell_command", "write", "memory_write", "delete", "git_push"];
const SENSITIVE_SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
  /\bAIza[A-Za-z0-9_-]{20,}\b/,
  /\bBearer\s+[A-Za-z0-9._~+\/-]{16,}\b/i,
  /\b(?:api[_-]?key|token|password|secret)\s*[=:]\s*["']?[A-Za-z0-9._~+\/-]{12,}/i
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueIds(items, label, errors) {
  const seen = new Set();
  for (const item of asArray(items)) {
    const id = String(item?.id || "").trim();
    if (!id) {
      errors.push(`${label}:missing-id`);
      continue;
    }
    if (seen.has(id)) errors.push(`${label}:duplicate-id:${id}`);
    seen.add(id);
  }
  return seen;
}

function containsEvery(haystack, required) {
  const values = new Set(asArray(haystack));
  return required.every((value) => values.has(value));
}

function collectStringValues(value, output = []) {
  if (typeof value === "string") {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStringValues(item, output);
    return output;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectStringValues(item, output);
  }
  return output;
}

function hasEmbeddedSecret(config) {
  return collectStringValues(config).some((value) => {
    const normalized = value.trim();
    if (/^(?:env|secret|binding|registry):/i.test(normalized)) return false;
    if (normalized === "sidecar-owned-browser-session") return false;
    return SENSITIVE_SECRET_PATTERNS.some((pattern) => pattern.test(normalized));
  });
}

function isLoopbackReference(value) {
  return /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(?:\/|$)/i.test(String(value || ""));
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function loadPcNodeModelFabric(pathOrUrl = DEFAULT_CONFIG_URL) {
  const path = pathOrUrl instanceof URL ? fileURLToPath(pathOrUrl) : pathOrUrl;
  return JSON.parse(readFileSync(path, "utf8"));
}

export function validatePcNodeModelFabric(config) {
  const errors = [];
  const warnings = [];

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return { ok: false, errors: ["config:not-an-object"], warnings };
  }

  if (config.schemaVersion !== "sirinx.pc-node-model-fabric/v1") {
    errors.push("schemaVersion:unsupported");
  }
  if (config.releaseState !== "HOLD_LOCAL_ONLY") errors.push("releaseState:must-hold-local-only");
  if (config.truthState !== "REGISTRY_ONLY_DISABLED") {
    errors.push("truthState:must-remain-registry-only-disabled-before-runtime-proof");
  }
  if (config.node?.platform !== "windows") errors.push("node:platform-must-be-windows");
  if (config.node?.authority !== "worker-only") errors.push("node:must-not-be-control-plane-authority");

  const invariants = config.invariants || {};
  if (invariants.exactlyOneRetryOwnerPerRequest !== true) {
    errors.push("invariant:exactly-one-retry-owner-required");
  }
  if (invariants.modelAliasesOnlyInClients !== true) errors.push("invariant:model-aliases-only-required");
  if (invariants.runtimeClaimsRequireEvidence !== true) errors.push("invariant:runtime-evidence-required");
  if (invariants.freeQuotaCountsAsSla !== false) errors.push("invariant:free-quota-is-not-sla");
  if (invariants.secretValuesInRepository !== false) errors.push("invariant:secrets-in-repository-forbidden");
  if (invariants.automaticBrowserAuthentication !== false) {
    errors.push("invariant:automatic-browser-authentication-forbidden");
  }
  if (invariants.consequentialActionsRequireActionBoundApproval !== true) {
    errors.push("invariant:action-bound-approval-required");
  }
  if (hasEmbeddedSecret(config)) errors.push("secret-scan:possible-embedded-secret");

  const laneIds = uniqueIds(config.lanes, "lane", errors);
  for (const lane of asArray(config.lanes)) {
    if (!lane?.owner) errors.push(`lane:${lane?.id || "unknown"}:missing-owner`);
    if (lane?.ownsRetries !== true || lane?.maxRetryOwners !== 1) {
      errors.push(`lane:${lane?.id || "unknown"}:retry-owner-cardinality-invalid`);
    }
    if (["OMNIROUTE", "LITELLM"].includes(lane?.owner) && lane?.downstreamRoutersAllowFallbacks !== false) {
      errors.push(`lane:${lane.id}:nested-router-fallback-forbidden`);
    }
    if (lane?.owner === "OPENROUTER" && lane?.nestedBehindAnotherRouter !== false) {
      errors.push(`lane:${lane.id}:openrouter-must-own-its-broker-lane`);
    }
    if (["local-developer", "cloud-governed"].includes(lane?.id) && !isLoopbackReference(lane.endpointRef)) {
      errors.push(`lane:${lane.id}:gateway-must-be-loopback`);
    }
    if (lane?.id === "direct-local" && lane?.maxRetries !== 0) {
      errors.push("lane:direct-local:retries-must-be-zero");
    }
  }

  const compatibilityRouters = new Map(
    asArray(config.compatibilityRouters).map((router) => [router.id, router])
  );
  if (compatibilityRouters.get("9router")?.productionAllowed !== false) {
    errors.push("compatibility-router:9router-production-forbidden");
  }

  const providerIds = uniqueIds(config.providerFamilies, "provider-family", errors);
  const providerPoolIds = uniqueIds(config.providerPools, "provider-pool", errors);
  for (const id of REQUIRED_PROVIDER_FAMILIES) {
    if (!providerIds.has(id)) errors.push(`provider-family:required-missing:${id}`);
  }
  for (const provider of asArray(config.providerFamilies)) {
    if (!provider?.modelDiscovery) errors.push(`provider-family:${provider?.id}:model-discovery-required`);
    if (!provider?.credentialRef) errors.push(`provider-family:${provider?.id}:credential-reference-required`);
    if (provider?.initialState === "ACTIVE") errors.push(`provider-family:${provider?.id}:activation-claim-forbidden`);
  }

  const aliasIds = uniqueIds(config.aliases, "alias", errors);
  const aliases = new Map(asArray(config.aliases).map((alias) => [alias.id, alias]));
  for (const alias of asArray(config.aliases)) {
    if (!String(alias?.id || "").startsWith("sirinx-")) errors.push(`alias:${alias?.id}:namespace-invalid`);
    if (!laneIds.has(alias?.lane)) errors.push(`alias:${alias?.id}:unknown-lane:${alias?.lane}`);
    if (!asArray(alias?.allowedDataClasses).length) errors.push(`alias:${alias?.id}:missing-data-class-policy`);
    if (alias?.automaticFallback !== false) errors.push(`alias:${alias?.id}:automatic-fallback-forbidden`);
    for (const selector of asArray(alias?.providerSelectors)) {
      if (!providerIds.has(selector) && !providerPoolIds.has(selector)) {
        errors.push(`alias:${alias?.id}:unknown-provider-selector:${selector}`);
      }
    }
  }
  if (aliases.get("sirinx-review")?.independentFromMaker !== true) {
    errors.push("alias:sirinx-review:independent-checker-required");
  }
  for (const id of ["sirinx-free-general", "sirinx-emergency-free", "sirinx-aipass-public"]) {
    const allowed = asArray(aliases.get(id)?.allowedDataClasses);
    if (allowed.length !== 1 || allowed[0] !== "public") {
      errors.push(`alias:${id}:must-be-public-only`);
    }
  }

  for (const client of asArray(config.clients)) {
    if (client?.routingAuthority !== false) errors.push(`client:${client?.id}:routing-authority-forbidden`);
    if (client?.defaultModelAlias && !aliasIds.has(client.defaultModelAlias)) {
      errors.push(`client:${client?.id}:unknown-model-alias:${client.defaultModelAlias}`);
    }
  }

  const aipass = asArray(config.experimentalAdapters).find((item) => item.id === "aipass-experimental");
  if (!aipass) {
    errors.push("adapter:aipass-experimental:missing");
  } else {
    if (aipass.enabled !== false) errors.push("adapter:aipass-experimental:must-default-disabled");
    if (aipass.loopbackOnly !== true || !isLoopbackReference(aipass.endpointRef)) {
      errors.push("adapter:aipass-experimental:loopback-required");
    }
    if (aipass.requiresInteractiveAuth !== true || aipass.automaticBrowserAuthentication !== false) {
      errors.push("adapter:aipass-experimental:manual-interactive-auth-required");
    }
    if (aipass.automaticFallback !== false || aipass.maxRetries !== 0) {
      errors.push("adapter:aipass-experimental:no-auto-fallback-or-retry");
    }
    if (aipass.consequentialActionsAllowed !== false || aipass.backgroundAutomationAllowed !== false) {
      errors.push("adapter:aipass-experimental:consequential-or-background-use-forbidden");
    }
    if (asArray(aipass.allowedDataClasses).join(",") !== "public") {
      errors.push("adapter:aipass-experimental:public-only");
    }
    if (aipass.sessionFileReadableBySirinx !== false) {
      errors.push("adapter:aipass-experimental:session-isolation-required");
    }
  }

  const serena = config.mcp?.serena;
  if (!serena) {
    errors.push("mcp:serena:missing");
  } else {
    if (serena.mode !== "read-only-pilot") errors.push("mcp:serena:read-only-pilot-required");
    if (!containsEvery(serena.toolAllowlist, REQUIRED_SERENA_ALLOWLIST)) {
      errors.push("mcp:serena:required-read-tools-missing");
    }
    if (!containsEvery(serena.toolDenylist, REQUIRED_SERENA_DENYLIST)) {
      errors.push("mcp:serena:dangerous-tools-must-be-denied");
    }
    if (serena.runtimeApiKeyStorage !== "windows-dpapi") errors.push("mcp:serena:dpapi-required");
    if (serena.adminApiKeyAllowed !== false) errors.push("mcp:serena:admin-key-forbidden");
  }

  const gates = new Set(asArray(config.activationGates));
  for (const gate of [
    "pinned-artifact-and-checksum",
    "secret-scan-pass",
    "per-provider-bounded-canary",
    "actual-provider-and-model-receipt",
    "signed-pc-node-pairing",
    "independent-checker-verdict"
  ]) {
    if (!gates.has(gate)) errors.push(`activation-gate:missing:${gate}`);
  }

  if (asArray(config.forbiddenChains).length < 4) warnings.push("forbiddenChains:review-for-new-routers");

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    configSha256: digest(config)
  };
}

export function getPcNodeModelFabricStatus(config = loadPcNodeModelFabric()) {
  const validation = validatePcNodeModelFabric(config);
  return {
    status: validation.ok ? "CONFIG_VERIFIED_RUNTIME_DISABLED" : "CONFIG_INVALID",
    releaseState: config.releaseState,
    truthState: config.truthState,
    nodeId: config.node?.id || null,
    runtimeObserved: false,
    providerCallsExecuted: false,
    secretsRead: false,
    routingOwners: asArray(config.lanes).map((lane) => ({ lane: lane.id, owner: lane.owner })),
    aliases: asArray(config.aliases).map((alias) => alias.id),
    activationGateCount: asArray(config.activationGates).length,
    validation
  };
}

export function createPcNodeRoutePreview(
  input = {},
  config = loadPcNodeModelFabric()
) {
  const validation = validatePcNodeModelFabric(config);
  if (!validation.ok) {
    return {
      status: "BLOCKED_INVALID_CONFIG",
      canExecute: false,
      networkCallExecuted: false,
      secretsRead: false,
      errors: validation.errors
    };
  }

  const aliasId = String(input.alias || "").trim();
  const dataClass = String(input.dataClass || "public").trim();
  const taskType = String(input.taskType || "unspecified").trim();
  const alias = asArray(config.aliases).find((item) => item.id === aliasId);

  if (!alias) {
    return {
      status: aliasId && !aliasId.startsWith("sirinx-") ? "BLOCKED_RAW_MODEL_ID" : "BLOCKED_UNKNOWN_ALIAS",
      canExecute: false,
      networkCallExecuted: false,
      secretsRead: false,
      alias: aliasId || null,
      reason: "Clients must request a registered SIRINX alias, never a provider model ID."
    };
  }

  if (!asArray(alias.allowedDataClasses).includes(dataClass)) {
    return {
      status: "BLOCKED_DATA_CLASS",
      canExecute: false,
      networkCallExecuted: false,
      secretsRead: false,
      alias: alias.id,
      dataClass,
      allowedDataClasses: alias.allowedDataClasses,
      reason: `Alias ${alias.id} cannot receive ${dataClass} data.`
    };
  }

  const lane = asArray(config.lanes).find((item) => item.id === alias.lane);
  const isAipass = alias.providerSelectors?.includes("aipass-experimental");
  const aipass = asArray(config.experimentalAdapters).find((item) => item.id === "aipass-experimental");
  const blockedReasons = [];

  if (input.live === true) blockedReasons.push("LIVE_EXECUTION_NOT_AVAILABLE_IN_PREVIEW");
  if (config.releaseState !== "HOLD_LOCAL_ONLY") blockedReasons.push("RELEASE_STATE_NOT_HOLD");
  if (config.truthState !== "REGISTRY_ONLY_DISABLED") blockedReasons.push("PC_NODE_TRUTH_STATE_CHANGED_WITHOUT_PROOF");
  if (isAipass && aipass?.enabled !== true) blockedReasons.push("AIPASS_EXPERIMENTAL_ADAPTER_DISABLED");
  if (isAipass && input.interactiveSessionVerified !== true) {
    blockedReasons.push("AIPASS_INTERACTIVE_SESSION_NOT_VERIFIED");
  }

  const preview = {
    status: blockedReasons.length ? "BLOCKED_PREVIEW" : "READY_FOR_ACTION_BOUND_CANARY_APPROVAL",
    canExecute: false,
    networkCallExecuted: false,
    secretsRead: false,
    providerCalled: false,
    alias: alias.id,
    taskType,
    dataClass,
    lane: lane.id,
    retryOwner: lane.owner,
    endpointRef: lane.endpointRef,
    providerSelectors: alias.providerSelectors,
    allowedDataClasses: alias.allowedDataClasses,
    requiresAccountVisibleModelDiscovery: alias.requiresAccountVisibleModelDiscovery,
    requiresActionBoundApproval: true,
    blockedReasons,
    activationGates: config.activationGates,
    evidenceRequired: config.receiptRequirements,
    configSha256: validation.configSha256
  };

  return {
    ...preview,
    previewSha256: digest(preview)
  };
}
