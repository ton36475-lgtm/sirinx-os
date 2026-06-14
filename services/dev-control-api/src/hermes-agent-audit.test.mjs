import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer } from "node:http";
import { once } from "node:events";
import { createHermesAgentAuditApprovalDryRun, getHermesAgentAuditStatus } from "./hermes-agent-audit.mjs";

const fixedNow = () => new Date("2026-05-27T00:00:00.000Z");

describe("Hermes Agent messaging audit contract", () => {
  let evidenceRoot;

  beforeEach(async () => {
    evidenceRoot = await mkdtemp(path.join(tmpdir(), "sirinx-hermes-agent-audit-"));
  });

  it("returns all messaging gateways and blocks restart when evidence is incomplete", async () => {
    await writeFile(
      path.join(evidenceRoot, "telegram-line-recipient-token.md"),
      [
        "# Telegram/LINE Recipient And Token Evidence",
        "- [x] no message-send smoke before final target approval",
        "Status: pending credential and recipient evidence",
      ].join("\n"),
    );

    const status = await getHermesAgentAuditStatus({ evidenceRoot, now: fixedNow });

    expect(status.status).toBe("blocked-evidence-incomplete");
    expect(status.summary.gateways).toBe(4);
    expect(status.summary.ready).toBe(0);
    expect(status.canRestartGateway).toBe(false);
    expect(status.commandExecuted).toBe(false);
    expect(status.messageSent).toBe(false);
    expect(status.secretsRead).toBe(false);
    expect(status.gateways.map((gateway) => gateway.id)).toEqual([
      "telegram",
      "line",
      "whatsapp",
      "discord",
    ]);
    expect(status.blockedActions).toEqual(
      expect.arrayContaining(["telegram_send", "line_send", "whatsapp_send", "discord_send"]),
    );
  });

  it("marks unsafe evidence as blocked without exposing the secret-like value", async () => {
    await writeFile(
      path.join(evidenceRoot, "telegram-line-recipient-token.md"),
      [
        "# Telegram/LINE Recipient And Token Evidence",
        "- [x] Telegram token rotated or owner-confirmed",
        "TELEGRAM_BOT_TOKEN=1234567890:abcdefghijklmnopqrstuvwxyzABCDE",
      ].join("\n"),
    );

    const status = await getHermesAgentAuditStatus({ evidenceRoot, now: fixedNow });
    const serialized = JSON.stringify(status);

    expect(status.status).toBe("blocked-unsafe-evidence");
    expect(status.summary.unsafe).toBe(1);
    expect(serialized).not.toContain("1234567890:abcdefghijklmnopqrstuvwxyzABCDE");
  });

  it("shows manual restart commands only after evidence is ready", async () => {
    await writeFile(
      path.join(evidenceRoot, "telegram-line-recipient-token.md"),
      [
        "# Telegram/LINE Recipient And Token Evidence",
        "- [x] Telegram token rotated or owner-confirmed",
        "- [x] Telegram intended recipient named",
        "- [x] Telegram recipient has messaged bot or joined target chat",
        "- [x] LINE OA channel confirmed or explicitly not in scope",
        "- [x] no message-send smoke before final target approval",
        "- [x] WhatsApp gateway explicitly out of scope for this approval",
        "- [x] Discord gateway explicitly out of scope for this approval",
      ].join("\n"),
    );

    const status = await getHermesAgentAuditStatus({ evidenceRoot, now: fixedNow });

    expect(status.status).toBe("ready-for-manual-gateway-restart-approval");
    expect(status.canRestartGateway).toBe(false);
    expect(status.manualCommands).toEqual(["hermes gateway status", "hermes gateway restart"]);
    expect(status.manualCommandsExecutableByApi).toBe(false);
  });

  it("creates a dry-run approval packet without executing restart or sends", async () => {
    const packet = await createHermesAgentAuditApprovalDryRun(
      { requestId: "hermes-audit-test", requestedBy: "codex-test" },
      { evidenceRoot, now: fixedNow },
    );

    expect(packet.status).toBe("blocked-hermes-agent-audit-approval");
    expect(packet.requestId).toBe("hermes-audit-test");
    expect(packet.requiresHumanApproval).toBe(true);
    expect(packet.commandExecuted).toBe(false);
    expect(packet.gatewayRestarted).toBe(false);
    expect(packet.messageSent).toBe(false);
    expect(packet.secretsRead).toBe(false);
    expect(packet.manualCommandsExecutableByApi).toBe(false);
  });
});

describe("Hermes Agent messaging audit API routes", () => {
  let server;
  let baseUrl;

  beforeEach(async () => {
    const module = await import("../server.mjs");
    server = createServer(module.handleRequest);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it("serves local-only audit status without secret-like values", async () => {
    const response = await fetch(`${baseUrl}/api/hermes-agent-audit`);
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.title).toBe("Hermes Agent Messaging Audit");
    expect(body.commandExecuted).toBe(false);
    expect(body.canRestartGateway).toBe(false);
    expect(serialized).not.toMatch(/TELEGRAM_BOT_TOKEN|LINE_CHANNEL_SECRET|[0-9]{8,}:[A-Za-z0-9_-]{20,}/);
  });

  it("serves approval dry-run and fails closed on invalid JSON", async () => {
    const response = await fetch(`${baseUrl}/api/hermes-agent-audit/approval/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId: "api-hermes-audit" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.requestId).toBe("api-hermes-audit");
    expect(body.commandExecuted).toBe(false);
    expect(body.requiresHumanApproval).toBe(true);

    const invalid = await fetch(`${baseUrl}/api/hermes-agent-audit/approval/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    const invalidBody = await invalid.json();

    expect(invalid.status).toBe(400);
    expect(invalidBody.status).toBe("invalid_hermes_agent_audit_approval_request");
    expect(invalidBody.commandExecuted).toBe(false);
    expect(invalidBody.requiresHumanApproval).toBe(true);
  });
});
