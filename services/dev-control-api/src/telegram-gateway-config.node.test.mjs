import assert from "node:assert/strict";
import test from "node:test";
import { assessTelegramPollingAdmission } from "./telegram-gateway-config.mjs";

const validConfig = {
  $schema: "ghostclaw.hermes.telegram_gateway.config.v1",
  gateway: { defaultLiveSend: false, webhook: { enabled: false }, polling: { enabled: false } },
  credentials: {
    storeValuesInRepo: false,
    printValues: false,
    tokenEnvKey: "TelegramBotToken",
    primaryChatEnvKey: "TelegramHomeChannel",
    fallbackChatEnvKey: "TelegramChatId",
    approvalSigningKeyEnvKey: "GhostClawTelegramTrustKey"
  },
  gates: {
    liveSend: {
      status: "closed",
      receiptSchema: "ghostclaw.telegram.approval-receipt.v2",
      singleUse: true,
      signatureAlgorithm: "hmac-sha256",
      pendingReceiptRoot: "pending",
      consumedReceiptRoot: "consumed"
    },
    providerCall: { status: "closed" }
  },
  blockedActions: { liveTelegramSend: true },
  routing: { queuePayloadExecution: false },
  commands: { registryPath: "registry.json", sourceOfTruth: "registry", inlineCommandCopiesAllowed: false },
  modelRouting: {
    sourceOfTruth: "configs/ghostclaw_agent_coordination.config.json",
    directProviderCall: false,
    providerCredentialMutation: false
  }
};

test("valid config remains blocked while polling is disabled", () => {
  const result = assessTelegramPollingAdmission(validConfig);
  assert.equal(result.validation.valid, true);
  assert.equal(result.admitted, false);
  assert.equal(result.blockedReason, "telegram_gateway_polling_disabled");
});

test("explicit test override admits only a valid config", () => {
  assert.equal(assessTelegramPollingAdmission(validConfig, { allowDisabledPollingForTest: true }).admitted, true);
  assert.equal(assessTelegramPollingAdmission({ ...validConfig, $schema: "wrong" }, { allowDisabledPollingForTest: true }).admitted, false);
});
