import { describe, expect, it, vi } from "vitest";
import {
  buildTelegramCommandMenu,
  getTelegramCommandRouterStatus,
  handleTelegramCommand,
  sendTelegramRouterMessage
} from "./telegram-command-router.mjs";

const fixedNow = () => new Date("2026-06-15T14:30:00.000Z");
const secretLikePattern = /bot[0-9]+:[A-Za-z0-9_-]{20,}|TELEGRAM_BOT_TOKEN\s*=\s*[^"'\s]{8,}/;

describe("Telegram command router", () => {
  it("exposes a simple button menu and safe command map", () => {
    const status = getTelegramCommandRouterStatus({ now: fixedNow });
    const menu = buildTelegramCommandMenu();

    expect(status.status).toBe("telegram-command-router-ready");
    expect(status.guardrails.arbitraryShell).toBe(false);
    expect(status.acceptedCommands).toContain("/commands");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:status");
  });

  it("previews /commands without live sending", async () => {
    const result = await handleTelegramCommand({ text: "/command" }, { liveSend: false, now: fixedNow });

    expect(result.status).toBe("blocked-or-preview-telegram-command");
    expect(result.command).toBe("/commands");
    expect(result.sendResult.status).toBe("telegram-send-preview");
    expect(result.hasInlineKeyboard).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(secretLikePattern);
  });

  it("sends through an injected Telegram fetch implementation", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true, result: { message_id: 123, chat: { id: 456 } } })
    });
    const result = await sendTelegramRouterMessage(
      { text: "hello", replyMarkup: buildTelegramCommandMenu() },
      {
        token: "test-token",
        chatId: "test-chat",
        fetchImpl,
        now: fixedNow
      }
    );

    expect(result.status).toBe("sent-telegram-message");
    expect(result.messageIdPresent).toBe(true);
    expect(result.chatIdPresent).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toMatch(secretLikePattern);
  });

  it("runs command router status and sends a sanitized response through injected fetch", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true, result: { message_id: 1, chat: { id: 2 } } })
    });
    const result = await handleTelegramCommand(
      { text: "/Hermes status" },
      {
        token: "test-token",
        chatId: "test-chat",
        fetchImpl,
        now: fixedNow,
        envPath: "/tmp/sirinx-telegram-router-missing-env"
      }
    );

    expect(result.status).toBe("completed-telegram-command");
    expect(result.command).toBe("/status");
    expect(result.messagePreview).toContain("SIRINX Hermes Runtime Status");
    expect(result.externalWrites).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(secretLikePattern);
  });
});
