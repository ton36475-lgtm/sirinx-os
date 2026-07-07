import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const DEFAULT_TELEGRAM_GATEWAY_CONFIG_PATH = "configs/hermes_telegram_gateway.config.json";

const SECRET_VALUE_PATTERN =
  /(sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|\b\d{7,12}:[A-Za-z0-9_-]{25,}|Bearer\s+[A-Za-z0-9._-]{20,}|-----BEGIN [A-Z ]+PRIVATE KEY-----)/;

function nowIso(options = {}) {
  const now = options.now || (() => new Date());
  return now().toISOString();
}

function collectSecretLikeValues(value, path = "$", findings = []) {
  if (typeof value === "string" && SECRET_VALUE_PATTERN.test(value)) {
    findings.push(path);
    return findings;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectSecretLikeValues(item, `${path}[${index}]`, findings));
    return findings;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => collectSecretLikeValues(item, `${path}.${key}`, findings));
  }
  return findings;
}

export async function loadTelegramGatewayConfig(options = {}) {
  const configPath = options.configPath || DEFAULT_TELEGRAM_GATEWAY_CONFIG_PATH;
  const absolutePath = resolve(options.root || process.cwd(), configPath);
  const raw = await readFile(absolutePath, "utf8");
  return {
    configPath,
    absolutePath,
    config: JSON.parse(raw)
  };
}

export function validateTelegramGatewayConfig(config, options = {}) {
  const issues = [];
  if (config?.$schema !== "ghostclaw.hermes.telegram_gateway.config.v1") {
    issues.push("schema_mismatch");
  }
  if (config?.gateway?.defaultLiveSend !== false) {
    issues.push("default_live_send_must_be_false");
  }
  if (config?.gateway?.webhook?.enabled !== false) {
    issues.push("webhook_must_default_disabled");
  }
  if (config?.gateway?.polling?.enabled !== false) {
    issues.push("polling_must_default_disabled");
  }
  if (config?.credentials?.storeValuesInRepo !== false) {
    issues.push("credential_values_must_not_be_stored_in_repo");
  }
  if (config?.credentials?.printValues !== false) {
    issues.push("credential_values_must_not_be_printed");
  }
  if (config?.gates?.liveSend?.status !== "closed") {
    issues.push("live_send_gate_must_be_closed");
  }
  if (config?.blockedActions?.liveTelegramSend !== true) {
    issues.push("live_telegram_send_must_be_blocked_by_default");
  }
  if (config?.routing?.queuePayloadExecution !== false) {
    issues.push("queue_payload_execution_must_be_false");
  }
  if (config?.modelRouting) {
    if (config.modelRouting.provider !== "openrouter") {
      issues.push("model_routing_provider_must_be_openrouter");
    }
    if (config.modelRouting.profile !== "fable5") {
      issues.push("model_routing_profile_must_be_fable5");
    }
    if (config.modelRouting.apiKeyEnvKey !== "OPENROUTER_API_KEY") {
      issues.push("model_routing_openrouter_env_key_required");
    }
    if (config.modelRouting.defaultProviderCall !== false) {
      issues.push("model_routing_default_provider_call_must_be_false");
    }
    if (config.gates?.openRouterFable5ProviderCall?.status !== "closed") {
      issues.push("openrouter_fable5_provider_call_gate_must_be_closed");
    }
  }

  const secretLikePaths = collectSecretLikeValues(config);
  if (secretLikePaths.length > 0) {
    issues.push("secret_like_value_present");
  }

  return {
    status: issues.length ? "invalid" : "valid",
    valid: issues.length === 0,
    issues,
    secretLikePaths,
    liveSendDefault: config?.gateway?.defaultLiveSend === true,
    webhookEnabled: config?.gateway?.webhook?.enabled === true,
    pollingEnabled: config?.gateway?.polling?.enabled === true,
    updatedAt: nowIso(options)
  };
}

export async function getTelegramGatewayConfigStatus(options = {}) {
  const loaded = await loadTelegramGatewayConfig(options);
  const validation = validateTelegramGatewayConfig(loaded.config, options);
  return {
    title: "Hermes Telegram Gateway Config",
    status: validation.valid ? "telegram-gateway-config-ready-local-safe" : "telegram-gateway-config-invalid",
    configPath: loaded.configPath,
    mode: loaded.config.mode || "unknown",
    approvalReference: loaded.config.approval_reference || null,
    liveSendGate: loaded.config.gates?.liveSend?.status || "unknown",
    webhookGate: loaded.config.gates?.webhookActivation?.status || "unknown",
    runtimeRestartGate: loaded.config.gates?.runtimeRestart?.status || "unknown",
    acceptedCommands: loaded.config.commands?.accepted || [],
    routing: {
      controlPlane: loaded.config.routing?.controlPlane,
      a2a2aInboxPath: loaded.config.routing?.a2a2aInboxPath,
      queuePayloadExecution: loaded.config.routing?.queuePayloadExecution === true
    },
    modelRouting: loaded.config.modelRouting
      ? {
          provider: loaded.config.modelRouting.provider,
          model: loaded.config.modelRouting.model,
          profile: loaded.config.modelRouting.profile,
          apiKeyEnvKey: loaded.config.modelRouting.apiKeyEnvKey,
          defaultProviderCall: loaded.config.modelRouting.defaultProviderCall === true,
          providerCallGate: loaded.config.gates?.openRouterFable5ProviderCall?.status || "unknown",
          providerCallApproval:
            loaded.config.gates?.openRouterFable5ProviderCall?.requiredApproval || null
        }
      : null,
    guardrails: {
      defaultLiveSend: loaded.config.gateway?.defaultLiveSend === true,
      webhookEnabled: loaded.config.gateway?.webhook?.enabled === true,
      pollingEnabled: loaded.config.gateway?.polling?.enabled === true,
      tokenValuesStoredInRepo: loaded.config.credentials?.storeValuesInRepo === true,
      tokenValuesPrinted: loaded.config.credentials?.printValues === true,
      secretLikeValuesPresent: validation.secretLikePaths.length > 0
    },
    validation,
    updatedAt: nowIso(options)
  };
}
