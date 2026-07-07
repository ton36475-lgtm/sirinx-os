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
    expect(status.acceptedCommands).toContain("/status");
    expect(status.acceptedCommands).toContain("/fable5 preview");
    expect(status.acceptedCommands).toContain("/a2a2a completion audit");
    expect(status.acceptedCommands).toContain("/a2a2a live gate readiness");
    expect(status.modelRouting).toMatchObject({
      provider: "openrouter",
      model: "anthropic/claude-fable-5",
      profile: "fable5",
      apiKeyEnvKey: "OPENROUTER_API_KEY",
      defaultProviderCall: false,
      providerCallGate: "closed",
      providerCallApproval: "APPROVE_OPENROUTER_FABLE5_PROVIDER_CALL_A019E53EE"
    });
  });

  it("keeps configured A2A2A commands aligned with the router registry", async () => {
    const configStatus = await getTelegramGatewayConfigStatus({ now: fixedNow });
    const loaded = await loadTelegramGatewayConfig();
    const routerStatus = getTelegramCommandRouterStatus({ now: fixedNow });
    const routerA2A2ACommands = routerStatus.acceptedCommands.filter((command) => command.startsWith("/a2a2a"));
    const routerA2A2ACallbacks = routerStatus.callbackCommands.filter((command) => command.includes("a2a2a"));

    expect(configStatus.acceptedCommands).toEqual(expect.arrayContaining(routerA2A2ACommands));
    expect(loaded.config.commands.callbackCommands).toEqual(expect.arrayContaining(routerA2A2ACallbacks));
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
            storeValuesInRepo: false,
            printValues: false
          },
          gates: { liveSend: { status: "closed" } },
          routing: { queuePayloadExecution: false },
          blockedActions: { liveTelegramSend: true }
        },
        null,
        2
      ),
      "utf8"
    );

    const loaded = await loadTelegramGatewayConfig({ root, configPath });
    expect(validateTelegramGatewayConfig(loaded.config).valid).toBe(true);
  });
});
