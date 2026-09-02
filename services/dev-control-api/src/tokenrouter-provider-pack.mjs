import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DEFAULT_CONFIG_URL = new URL(
  "../../../config/providers/tokenrouter-pc-node.v1.json",
  import.meta.url
);

const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
  /\bBearer\s+[A-Za-z0-9._~+/-]{16,}\b/i,
  /\b(?:api[_-]?key|token|password|secret)\s*[=:]\s*["']?[A-Za-z0-9._~+/-]{12,}/i
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function collectStrings(value, output = []) {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, output));
  else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectStrings(item, output));
  }
  return output;
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

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function loadTokenRouterProviderPack(pathOrUrl = DEFAULT_CONFIG_URL) {
  const path = pathOrUrl instanceof URL ? fileURLToPath(pathOrUrl) : pathOrUrl;
  return JSON.parse(readFileSync(path, "utf8"));
}

export function validateTokenRouterProviderPack(config) {
  const errors = [];
  const warnings = [];

  if (config?.schemaVersion !== "sirinx.tokenrouter-provider-pack/v1") {
    errors.push("schemaVersion:unsupported");
  }
  if (config?.releaseState !== "HOLD_ROTATION_REQUIRED") {
    errors.push("releaseState:must-hold-rotation-required");
  }
  if (config?.securityIncident?.credentialState !== "ROTATION_REQUIRED") {
    errors.push("credential:rotation-required");
  }
  if (config?.securityIncident?.exposedCredentialAcceptedForUse !== false) {
    errors.push("credential:exposed-key-must-be-rejected");
  }
  if (config?.gateway?.baseUrl !== "https://api.tokenrouter.com/v1") {
    errors.push("gateway:unexpected-base-url");
  }
  if (config?.gateway?.credentialRef !== "env:TOKENROUTER_API_KEY_ROTATED") {
    errors.push("gateway:rotated-secret-reference-required");
  }
  if (config?.gateway?.credentialValueInRepository !== false) {
    errors.push("gateway:credential-value-forbidden");
  }

  const lane = config?.gateway?.routingLane || {};
  if (lane.retryOwner !== "TOKENROUTER") errors.push("routing:tokenrouter-must-own-broker-retries");
  if (lane.outerRetries !== 0) errors.push("routing:outer-retries-must-be-zero");
  if (lane.nestedBehindLiteLLM !== false) errors.push("routing:cannot-nest-behind-litellm");
  if (lane.nestedBehindOmniRoute !== false) errors.push("routing:cannot-nest-behind-omniroute");
  if (lane.nestedBehindOpenRouter !== false) errors.push("routing:cannot-nest-behind-openrouter");
  if (lane.productionAllowed !== false) errors.push("routing:production-must-remain-blocked");
  if (asArray(lane.allowedDataClasses).join(",") !== "public") {
    errors.push("routing:initial-data-class-must-be-public-only");
  }

  const models = new Map(asArray(config?.models).map((model) => [model.canonicalId, model]));
  for (const id of [
    "z-ai/glm-5.3-free",
    "z-ai/glm-5.3-flash",
    "qwen/qwen3.8-flash",
    "qwen/qwen3.8-max-free"
  ]) {
    if (!models.has(id)) errors.push(`model:missing:${id}`);
  }
  if (models.get("qwen/qwen3.8-flash")?.billingClass !== "PAID_CATALOG_SNAPSHOT") {
    errors.push("model:qwen3.8-flash-must-not-be-labelled-free");
  }
  for (const id of ["z-ai/glm-5.3-free", "qwen/qwen3.8-max-free"]) {
    const model = models.get(id);
    if (model?.billingClass !== "FREE_CATALOG_SNAPSHOT") {
      errors.push(`model:${id}:free-classification-missing`);
    }
    if (asArray(model?.allowedDataClasses).join(",") !== "public") {
      errors.push(`model:${id}:must-be-public-only`);
    }
  }

  const bai = asArray(config?.externalClaims).find((item) => item.id === "b-ai-qwen38-free");
  if (!bai || bai.state !== "UNVERIFIED_SECONDARY_ONLY" || bai.routeAllowed !== false) {
    errors.push("bai:must-remain-unverified-and-unroutable");
  }

  const openClaude = asArray(config?.clientCandidates).find((item) => item.id === "openclaude");
  if (!openClaude) errors.push("openclaude:missing");
  else {
    if (openClaude.sourceState !== "QUARANTINED_LEGAL_PROVENANCE_REVIEW") {
      errors.push("openclaude:legal-provenance-hold-required");
    }
    if (openClaude.installationAllowed !== false) errors.push("openclaude:installation-must-be-blocked");
    if (openClaude.routingAuthority !== false) errors.push("openclaude:routing-authority-forbidden");
    if (openClaude.backgroundSessionsAllowed !== false) {
      errors.push("openclaude:background-sessions-must-be-disabled");
    }
    if (openClaude.headlessGrpcAllowed !== false) {
      errors.push("openclaude:headless-grpc-must-be-disabled");
    }
    if (openClaude.directProviderCredentialsAllowed !== false) {
      errors.push("openclaude:direct-provider-credentials-forbidden");
    }
  }

  const embedded = collectStrings(config).some((value) => {
    const normalized = value.trim();
    if (/^(?:env|secret|approval|registry):/i.test(normalized)) return false;
    return SECRET_PATTERNS.some((pattern) => pattern.test(normalized));
  });
  if (embedded) errors.push("secret-scan:possible-embedded-secret");

  if (config?.gateway?.routingLane?.automaticFallbackAssumedPossible !== true) {
    warnings.push("routing:confirm-tokenrouter-provider-fallback-behavior");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    configSha256: sha256(canonicalJson(config))
  };
}

export function createTokenRouterCanaryPreview(input = {}, config = loadTokenRouterProviderPack()) {
  const validation = validateTokenRouterProviderPack(config);
  if (!validation.ok) {
    return {
      status: "BLOCKED_INVALID_CONFIG",
      canExecute: false,
      networkCallExecuted: false,
      errors: validation.errors
    };
  }

  const model = asArray(config.models).find((item) => item.canonicalId === input.model);
  const reasons = [];

  if (!model) reasons.push("UNKNOWN_MODEL_ID");
  if (config.securityIncident.credentialState !== "ROTATED_VERIFIED") {
    reasons.push("CREDENTIAL_ROTATION_NOT_VERIFIED");
  }
  if (input.dataClass !== "public") reasons.push("PUBLIC_DATA_ONLY");
  if (!input.approvalId) reasons.push("ACTION_BOUND_APPROVAL_REQUIRED");
  if (!input.promptSha256 || !/^sha256:[a-f0-9]{64}$/i.test(input.promptSha256)) {
    reasons.push("PROMPT_DIGEST_REQUIRED");
  }
  if (input.live === true) reasons.push("LIVE_EXECUTION_NOT_IMPLEMENTED");

  const action = {
    action: "TOKENROUTER_PUBLIC_CANARY",
    baseUrl: config.gateway.baseUrl,
    model: model?.canonicalId || input.model || null,
    dataClass: input.dataClass || null,
    promptSha256: input.promptSha256 || null,
    maxInputTokens: Number(input.maxInputTokens || 64),
    maxOutputTokens: Number(input.maxOutputTokens || 16),
    maxCostUsd: Number(input.maxCostUsd ?? 0),
    retryOwner: "TOKENROUTER",
    outerRetries: 0,
    approvalId: input.approvalId || null
  };

  return {
    status: reasons.length ? "BLOCKED" : "CANARY_PLAN_READY",
    canExecute: false,
    networkCallExecuted: false,
    credentialRead: false,
    reasons,
    action,
    actionDigest: `sha256:${sha256(canonicalJson(action))}`
  };
}
