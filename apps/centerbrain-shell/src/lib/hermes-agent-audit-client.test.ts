import { describe, expect, test } from "vitest";
import {
  hermesAgentAuditFallback,
  normalizeHermesAgentAuditStatus,
} from "./hermes-agent-audit-client";

describe("hermes agent audit shell contract", () => {
  test("keeps messaging audit blocked by default", () => {
    expect(hermesAgentAuditFallback.title).toBe("Hermes Agent Messaging Audit");
    expect(hermesAgentAuditFallback.canRestartGateway).toBe(false);
    expect(hermesAgentAuditFallback.commandExecuted).toBe(false);
    expect(hermesAgentAuditFallback.messageSent).toBe(false);
    expect(hermesAgentAuditFallback.secretsRead).toBe(false);
    expect(hermesAgentAuditFallback.requiresHumanApproval).toBe(true);
  });

  test("shows all four messaging gateways in fallback", () => {
    expect(hermesAgentAuditFallback.gateways.map((gateway) => gateway.id)).toEqual([
      "telegram",
      "line",
      "whatsapp",
      "discord",
    ]);
  });

  test("normalizes live data without granting restart or send capability", () => {
    const normalized = normalizeHermesAgentAuditStatus({
      status: "ready-for-manual-gateway-restart-approval",
      canRestartGateway: true,
      commandExecuted: true,
      messageSent: true,
      secretsRead: true,
      manualCommands: ["hermes gateway status", "hermes gateway restart"],
      summary: { gateways: 4, ready: 4, blocked: 0, unsafe: 0 },
    });

    expect(normalized.status).toBe("ready-for-manual-gateway-restart-approval");
    expect(normalized.canRestartGateway).toBe(false);
    expect(normalized.commandExecuted).toBe(false);
    expect(normalized.messageSent).toBe(false);
    expect(normalized.secretsRead).toBe(false);
    expect(normalized.manualCommands).toEqual(["hermes gateway status", "hermes gateway restart"]);
  });

  test("keeps send and restart actions blocked at the shell boundary", () => {
    expect(hermesAgentAuditFallback.blockedActions).toEqual(
      expect.arrayContaining([
        "hermes_gateway_restart_from_api",
        "telegram_send",
        "line_send",
        "whatsapp_send",
        "discord_send",
        "secret_read_or_print",
      ]),
    );
  });
});
