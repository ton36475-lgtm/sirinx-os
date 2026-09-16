import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getTelegramCommandCatalog } from "./telegram-command-registry.mjs";

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
  if (config?.credentials?.tokenEnvKey !== "TelegramBotToken") {
    issues.push("canonical_telegram_token_key_required");
  }
  if (config?.credentials?.primaryChatEnvKey !== "TelegramHomeChannel") {
    issues.push("canonical_telegram_home_channel_key_required");
  }
  if (config?.credentials?.fallbackChatEnvKey !== "TelegramChatId") {
    issues.push("canonical_telegram_chat_id_key_required");
  }
  if (config?.credentials?.approvalSigningKeyEnvKey !== "GhostClawTelegramTrustKey") {
    issues.push("canonical_telegram_trust_key_required");
  }
  if (config?.gates?.liveSend?.status !== "closed") {
    issues.push("live_send_gate_must_be_closed");
  }
  if (config?.gates?.liveSend?.receiptSchema !== "ghostclaw.telegram.approval-receipt.v2") {
    issues.push("signed_live_send_receipt_v2_required");
  }
  if (config?.gates?.liveSend?.singleUse !== true) {
    issues.push("live_send_receipt_single_use_required");
  }
  if (config?.gates?.liveSend?.signatureAlgorithm !== "hmac-sha256") {
    issues.push("live_send_receipt_hmac_required");
  }
  if (!config?.gates?.liveSend?.pendingReceiptRoot || !config?.gates?.liveSend?.consumedReceiptRoot) {
    issues.push("live_send_receipt_roots_required");
  }
  if (config?.blockedActions?.liveTelegramSend !== true) {
    issues.push("live_telegram_send_must_be_blocked_by_default");
  }
  if (config?.routing?.queuePayloadExecution !== false) {
    issues.push("queue_payload_execution_must_be_false");
  }
  if (!config?.commands?.registryPath) {
    issues.push("command_registry_path_required");
  }
  if (config?.commands?.sourceOfTruth !== "registry") {
    issues.push("command_registry_must_be_source_of_truth");
  }
  if (config?.commands?.inlineCommandCopiesAllowed !== false) {
    issues.push("inline_command_copies_must_be_disabled");
  }
  if (config?.modelRouting?.sourceOfTruth !== "configs/ghostclaw_agent_coordination.config.json") {
    issues.push("model_routing_coordination_source_required");
  }
  if (config?.modelRouting?.directProviderCall !== false) {
    issues.push("model_routing_direct_provider_call_must_be_false");
  }
  if (config?.modelRouting?.providerCredentialMutation !== false) {
    issues.push("model_routing_credential_mutation_must_be_false");
  }
  if (config.gates?.providerCall?.status !== "closed") {
    issues.push("provider_call_gate_must_be_closed");
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

export function assessTelegramPollingAdmission(config, options = {}) {
  const validation = validateTelegramGatewayConfig(config, options);
  const pollingEnabled = config?.gateway?.polling?.enabled === true;
  const testOverride = options.allowDisabledPollingForTest === true;
  return {
    admitted: validation.valid && (pollingEnabled || testOverride),
    validation,
    pollingEnabled,
    testOverride,
    blockedReason: !validation.valid
      ? "telegram_gateway_config_invalid"
      : !pollingEnabled && !testOverride
        ? "telegram_gateway_polling_disabled"
        : null
  };
}

export async function getTelegramGatewayConfigStatus(options = {}) {
  const loaded = await loadTelegramGatewayConfig(options);
  const validation = validateTelegramGatewayConfig(loaded.config, options);
  let commandCatalog = null;
  let commandRegistryError = null;
  try {
    commandCatalog = getTelegramCommandCatalog({
      configPath: resolve(options.root || process.cwd(), loaded.config.commands?.registryPath || "")
    });
  } catch (error) {
    commandRegistryError = error instanceof Error ? error.message : String(error);
  }
  const registryValid = Boolean(commandCatalog?.validation?.ok);
  const ready = validation.valid && registryValid;
  return {
    title: "Hermes Telegram Gateway Config",
    status: ready ? "telegram-gateway-config-ready-local-safe" : "telegram-gateway-config-invalid",
    configPath: loaded.configPath,
    mode: loaded.config.mode || "unknown",
    approvalReference: loaded.config.approval_reference || null,
    liveSendGate: loaded.config.gates?.liveSend?.status || "unknown",
    webhookGate: loaded.config.gates?.webhookActivation?.status || "unknown",
    runtimeRestartGate: loaded.config.gates?.runtimeRestart?.status || "unknown",
    commandRegistry: {
      path: loaded.config.commands?.registryPath || null,
      sourceOfTruth: loaded.config.commands?.sourceOfTruth || null,
      version: commandCatalog?.registry?.version || null,
      valid: registryValid,
      error: commandRegistryError
    },
    acceptedCommands: commandCatalog?.acceptedCommands || [],
    callbackCommands: commandCatalog?.callbackCommands || [],
    routing: {
      controlPlane: loaded.config.routing?.controlPlane,
      a2a2aInboxPath: loaded.config.routing?.a2a2aInboxPath,
      queuePayloadExecution: loaded.config.routing?.queuePayloadExecution === true
    },
    modelRouting: {
      sourceOfTruth: loaded.config.modelRouting?.sourceOfTruth || null,
      directProviderCall: loaded.config.modelRouting?.directProviderCall === true,
      providerCredentialMutation: loaded.config.modelRouting?.providerCredentialMutation === true,
      providerCallGate: loaded.config.gates?.providerCall?.status || "unknown",
      providerCallApprovalPattern: loaded.config.gates?.providerCall?.requiredApprovalPattern || null
    },
    guardrails: {
      defaultLiveSend: loaded.config.gateway?.defaultLiveSend === true,
      webhookEnabled: loaded.config.gateway?.webhook?.enabled === true,
      pollingEnabled: loaded.config.gateway?.polling?.enabled === true,
      tokenValuesStoredInRepo: loaded.config.credentials?.storeValuesInRepo === true,
      tokenValuesPrinted: loaded.config.credentials?.printValues === true,
      secretLikeValuesPresent: validation.secretLikePaths.length > 0
    },
    credentialContract: {
      tokenEnvKey: loaded.config.credentials?.tokenEnvKey || null,
      primaryChatEnvKey: loaded.config.credentials?.primaryChatEnvKey || null,
      fallbackChatEnvKey: loaded.config.credentials?.fallbackChatEnvKey || null,
      approvalSigningKeyEnvKey: loaded.config.credentials?.approvalSigningKeyEnvKey || null,
      legacyEnvKeysAccepted: Boolean(loaded.config.credentials?.legacyEnvKeys)
    },
    approvalReceipt: {
      schema: loaded.config.gates?.liveSend?.receiptSchema || null,
      singleUse: loaded.config.gates?.liveSend?.singleUse === true,
      signatureAlgorithm: loaded.config.gates?.liveSend?.signatureAlgorithm || null,
      pendingRoot: loaded.config.gates?.liveSend?.pendingReceiptRoot || null,
      consumedRoot: loaded.config.gates?.liveSend?.consumedReceiptRoot || null
    },
    validation,
    updatedAt: nowIso(options)
  };
}
