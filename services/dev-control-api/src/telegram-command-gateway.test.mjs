import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  extractTelegramCommand,
  getTelegramCommandGatewayStatus,
  pollTelegramCommandsOnce
} from "./telegram-command-gateway.mjs";
import { createTelegramApprovalReceipt } from "./telegram-exact-gate.mjs";

const fixedNow = () => new Date("2026-07-14T13:30:00.000Z");
const liveSendGate = "APPROVE_TELEGRAM_GATEWAY_LIVE_SEND_A019E53EE";
const signingKey = "telegram-gateway-test-signing-key-32-bytes-minimum";

function liveSendReceipt(commandId, recipientTarget = "200") {
  return createTelegramApprovalReceipt({
    receiptId: `receipt-${commandId}`,
    scope: "telegram_live_send",
    commandId,
    requestedBy: "codex_build_captain",
    approvedBy: "hermes_commander",
    exactGate: liveSendGate,
    recipientTarget,
    configuredChatMatched: true,
    tokenPresenceOnlyChecked: true,
    issuedAt: "2026-07-14T13:25:00.000Z",
    expiresAt: "2026-07-14T13:35:00.000Z"
  }, { signingKey });
}

describe("Telegram command gateway", () => {
  it("extracts callback and message commands without retaining secret values", () => {
    expect(
      extractTelegramCommand({
        update_id: 7,
        callback_query: { id: "cb-1", data: "cmd:team-status", from: { id: 8 }, message: { chat: { id: 9 } } }
      })
    ).toMatchObject({ updateId: 7, kind: "callback_query", chatId: "9", input: { callbackData: "cmd:team-status" } });
    expect(extractTelegramCommand({ update_id: 8, message: { text: "/status", chat: { id: 9 }, from: { id: 8 } } })).toMatchObject({
      updateId: 8,
      kind: "message",
      chatId: "9",
      input: { text: "/status" }
    });
  });

  it("polls once, routes an authorized button, acknowledges it, and stores a replay offset", async () => {
    const root = await mkdtemp(join(tmpdir(), "telegram-command-gateway-"));
    const offsetPath = join(root, "offset.json");
    const receiptPath = join(root, "receipt.json");
    const approvalRoot = join(root, "approvals", "pending");
    const consumedApprovalRoot = join(root, "approvals", "consumed");
    const approvalReceiptId = "receipt-team_status";
    const approvalReceiptPath = join(approvalRoot, `${approvalReceiptId}.json`);
    await mkdir(approvalRoot, { recursive: true });
    await writeFile(
      approvalReceiptPath,
      `${JSON.stringify(liveSendReceipt("team_status", "200"), null, 2)}\n`,
      "utf8"
    );
    const fetchImpl = vi.fn(async (url) => {
      if (url.endsWith("/getUpdates")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              ok: true,
              result: [
                {
                  update_id: 42,
                  callback_query: {
                    id: "callback-42",
                    data: "cmd:team-status",
                    from: { id: 100 },
                    message: { chat: { id: 200 } }
                  }
                }
              ]
            })
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true, result: { message_id: 1, chat: { id: 200 } } })
      };
    });

    const result = await pollTelegramCommandsOnce({
      token: "test-token",
      chatId: "200",
      fetchImpl,
      offsetPath,
      receiptPath,
      repoRoot: process.cwd(),
      root: process.cwd(),
      liveSendResponses: true,
      approvalReceiptId,
      liveSendExactGate: liveSendGate,
      liveSendApprovalReceiptPath: approvalReceiptPath,
      liveSendApprovalReceiptRoot: approvalRoot,
      liveSendConsumedReceiptRoot: consumedApprovalRoot,
      telegramApprovalSigningKey: signingKey,
      providerHealth: {
        claude_code_oauth: { status: "pending_auth" },
        codex_local: { status: "ready" },
        opencode_glm52: { status: "ready" },
        opencode_fallback: { status: "unverified" }
      },
      now: fixedNow
    });

    expect(result.status).toBe("completed-telegram-command-poll");
    expect(result.commandsProcessed).toBe(1);
    expect(result.commandResults[0]).toMatchObject({
      commandId: "team_status",
      owner: "hermes_commander",
      telegramSent: true,
      callbackAcknowledged: true,
      providerCalled: false
    });
    expect(JSON.parse(await readFile(offsetPath, "utf8"))).toMatchObject({ nextUpdateId: 43 });
    expect(JSON.parse(await readFile(receiptPath, "utf8")).keyValuePrinted).toBe(false);
    expect(JSON.parse(await readFile(join(consumedApprovalRoot, `${approvalReceiptId}.json`), "utf8")).receiptId).toBe(
      approvalReceiptId
    );
  });

  it("fails closed before polling when live responses have no signed approval receipt", async () => {
    const root = await mkdtemp(join(tmpdir(), "telegram-command-gateway-"));
    const fetchImpl = vi.fn(async (url) => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify(
          url.endsWith("/getUpdates")
            ? {
                ok: true,
                result: [
                  {
                    update_id: 43,
                    callback_query: {
                      id: "callback-43",
                      data: "cmd:team-status",
                      from: { id: 100 },
                      message: { chat: { id: 200 } }
                    }
                  }
                ]
              }
            : { ok: true, result: true }
        )
    }));

    const result = await pollTelegramCommandsOnce({
      token: "test-token",
      chatId: "200",
      fetchImpl,
      offsetPath: join(root, "offset.json"),
      receiptPath: join(root, "receipt.json"),
      repoRoot: process.cwd(),
      root: process.cwd(),
      liveSendResponses: true,
      now: fixedNow
    });

    expect(result.status).toBe("blocked-telegram-command-poll-live-approval");
    expect(result.blockedReason).toBe("telegram_live_approval_receipt_id_required");
    expect(result.externalNetworkRead).toBe(false);
    expect(result.externalWrites).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("blocks updates from any chat other than the configured control chat", async () => {
    const root = await mkdtemp(join(tmpdir(), "telegram-command-gateway-"));
    const fetchImpl = vi.fn(async (url) => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify(
          url.endsWith("/getUpdates")
            ? { ok: true, result: [{ update_id: 1, message: { text: "/status", chat: { id: 999 }, from: { id: 999 } } }] }
            : { ok: true, result: true }
        )
    }));

    const result = await pollTelegramCommandsOnce({
      token: "test-token",
      chatId: "200",
      fetchImpl,
      offsetPath: join(root, "offset.json"),
      receiptPath: join(root, "receipt.json"),
      repoRoot: process.cwd(),
      root: process.cwd(),
      liveSendResponses: false,
      now: fixedNow
    });

    expect(result.commandsProcessed).toBe(0);
    expect(result.unauthorizedUpdates).toBe(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("reports credential presence without printing values", async () => {
    const status = await getTelegramCommandGatewayStatus({ token: "test-token", chatId: "200", now: fixedNow });
    expect(status.status).toBe("telegram-command-gateway-ready");
    expect(status.credentialPresence).toEqual({ token: true, chatTarget: true });
    expect(JSON.stringify(status)).not.toContain("test-token");
  });
});
