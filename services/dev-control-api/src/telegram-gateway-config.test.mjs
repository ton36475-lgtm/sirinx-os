import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getTelegramGatewayConfigStatus,
  loadTelegramGatewayConfig,
  validateTelegramGatewayConfig
} from "./telegram-gateway-config.mjs";
import { getTelegramCommandRouterStatus } from "./telegram-command-router.mjs";

const fixedNow = () => new Date("2026-07-03T01:55:00.000Z");

describe("Telegram gateway config", () => {
  it("loads the repo config and keeps live actions closed by default", async () => {
    const status = await getTelegramGatewayConfigStatus({ now: fixedNow });

    expect(status.status).toBe("telegram-gateway-config-ready-local-safe");
    expect(status.configPath).toBe("configs/hermes_telegram_gateway.config.json");
    expect(status.mode).toBe("dry_run_first");
    expect(status.liveSendGate).toBe("closed");
    expect(status.webhookGate).toBe("closed");
    expect(status.runtimeRestartGate).toBe("closed");
    expect(status.guardrails.defaultLiveSend).toBe(false);
    expect(status.guardrails.webhookEnabled).toBe(false);
    expect(status.guardrails.pollingEnabled).toBe(false);
    expect(status.guardrails.tokenValuesStoredInRepo).toBe(false);
    expect(status.guardrails.tokenValuesPrinted).toBe(false);
    expect(status.guardrails.secretLikeValuesPresent).toBe(false);
    expect(status.routing.queuePayloadExecution).toBe(false);
    expect(status.commandRegistry).toMatchObject({
      path: "configs/telegram_command_center.config.json",
      sourceOfTruth: "registry",
      version: "2.3.0",
      valid: true,
      error: null
    });
    expect(status.acceptedCommands).toContain("/status");
    expect(status.acceptedCommands).toContain("/team status");
    expect(status.acceptedCommands).toContain("/a2a2a completion audit");
    expect(status.acceptedCommands).toContain("/a2a2a live gate readiness");
    expect(status.modelRouting).toMatchObject({
      sourceOfTruth: "configs/ghostclaw_agent_coordination.config.json",
      directProviderCall: false,
      providerCredentialMutation: false,
      providerCallGate: "closed",
      providerCallApprovalPattern: "APPROVE_TELEGRAM_PROVIDER_CALL_<request_id>"
    });
    expect(status.credentialContract).toMatchObject({
      tokenEnvKey: "TelegramBotToken",
      primaryChatEnvKey: "TelegramHomeChannel",
      fallbackChatEnvKey: "TelegramChatId",
      approvalSigningKeyEnvKey: "GhostClawTelegramTrustKey",
      legacyEnvKeysAccepted: true
    });
    expect(status.approvalReceipt).toMatchObject({
      schema: "ghostclaw.telegram.approval-receipt.v2",
      singleUse: true,
      signatureAlgorithm: "hmac-sha256"
    });
  });

  it("keeps configured A2A2A commands aligned with the router registry", async () => {
    const configStatus = await getTelegramGatewayConfigStatus({ now: fixedNow });
    const routerStatus = getTelegramCommandRouterStatus({ now: fixedNow });
    const routerA2A2ACommands = routerStatus.acceptedCommands.filter((command) => command.startsWith("/a2a2a"));
    const routerA2A2ACallbacks = routerStatus.callbackCommands.filter((command) => command.includes("a2a2a"));

    expect(configStatus.acceptedCommands).toEqual(expect.arrayContaining(routerA2A2ACommands));
    expect(configStatus.callbackCommands).toEqual(expect.arrayContaining(routerA2A2ACallbacks));
  });

  it("rejects config that enables live send or embeds a Telegram token", () => {
    const validation = validateTelegramGatewayConfig(
      {
        $schema: "ghostclaw.hermes.telegram_gateway.config.v1",
        gateway: {
          defaultLiveSend: true,
          webhook: { enabled: true },
          polling: { enabled: false }
        },
        credentials: {
          storeValuesInRepo: true,
          printValues: false,
          token: `123456789:${"a".repeat(30)}`
        },
        gates: { liveSend: { status: "open" } },
        routing: { queuePayloadExecution: false },
        commands: {
          registryPath: "commands.json",
          sourceOfTruth: "registry",
          inlineCommandCopiesAllowed: false
        },
        blockedActions: { liveTelegramSend: false }
      },
      { now: fixedNow }
    );

    expect(validation.valid).toBe(false);
    expect(validation.issues).toEqual(
      expect.arrayContaining([
        "default_live_send_must_be_false",
        "webhook_must_default_disabled",
        "credential_values_must_not_be_stored_in_repo",
        "live_send_gate_must_be_closed",
        "live_telegram_send_must_be_blocked_by_default",
        "secret_like_value_present"
      ])
    );
  });

  it("can load an explicit config path without reading env files", async () => {
    const root = await mkdtemp(join(tmpdir(), "telegram-gateway-config-"));
    const configPath = "telegram-config.json";
    const registryPath = "commands.json";
    await writeFile(
      join(root, registryPath),
      JSON.stringify(
        {
          $schema: "ghostclaw.telegram.command_center.v2",
          version: "test",
          policies: {
            singleWriterRole: "codex_build_captain",
            arbitraryShell: false,
            directDeploy: false,
            directPush: false,
            providerCallFromButton: false,
            secretsInPayload: false,
            receiptRequiredForExecution: true
          },
          menu: { rows: [["status"]] },
          commands: [
            {
              id: "status",
              label: "Status",
              callbackData: "cmd:status",
              textCommands: ["/status"],
              matchMode: "exact",
              handler: "runtime_status",
              owner: "hermes_commander",
              actionClass: "read_only",
              requiresExactGate: false,
              enabled: true
            }
          ]
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(root, configPath),
      JSON.stringify(
        {
          $schema: "ghostclaw.hermes.telegram_gateway.config.v1",
          gateway: {
            defaultLiveSend: false,
            webhook: { enabled: false },
            polling: { enabled: false }
          },
          credentials: {
            tokenEnvKey: "TelegramBotToken",
            primaryChatEnvKey: "TelegramHomeChannel",
            fallbackChatEnvKey: "TelegramChatId",
            approvalSigningKeyEnvKey: "GhostClawTelegramTrustKey",
            storeValuesInRepo: false,
            printValues: false
          },
          gates: {
            liveSend: {
              status: "closed",
              receiptSchema: "ghostclaw.telegram.approval-receipt.v2",
              pendingReceiptRoot: ".ghostclaw_runtime/telegram/approvals/pending",
              consumedReceiptRoot: ".ghostclaw_runtime/telegram/approvals/consumed",
              singleUse: true,
              signatureAlgorithm: "hmac-sha256"
            },
            providerCall: { status: "closed", requiredApprovalPattern: "APPROVE_TELEGRAM_PROVIDER_CALL_<request_id>" }
          },
          routing: { queuePayloadExecution: false },
          commands: {
            registryPath,
            sourceOfTruth: "registry",
            inlineCommandCopiesAllowed: false
          },
          modelRouting: {
            sourceOfTruth: "configs/ghostclaw_agent_coordination.config.json",
            directProviderCall: false,
            providerCredentialMutation: false
          },
          blockedActions: { liveTelegramSend: true }
        },
        null,
        2
      ),
      "utf8"
    );

    const loaded = await loadTelegramGatewayConfig({ root, configPath });
    expect(validateTelegramGatewayConfig(loaded.config).valid).toBe(true);
    const status = await getTelegramGatewayConfigStatus({ root, configPath, now: fixedNow });
    expect(status.status).toBe("telegram-gateway-config-ready-local-safe");
    expect(status.commandRegistry.valid).toBe(true);
  });
});
