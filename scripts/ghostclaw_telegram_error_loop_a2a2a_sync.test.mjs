import { describe, expect, it } from "vitest";
import { createTelegramErrorLoopA2A2ASync } from "./ghostclaw_telegram_error_loop_a2a2a_sync.mjs";

describe("Telegram error loop A2A2A sync", () => {
  it("creates local file-bus packets for Codex, Hermes, and OpenCode only", () => {
    const sync = createTelegramErrorLoopA2A2ASync({
      createdAt: "2026-07-03T00:00:00.000Z"
    });

    expect(sync.status).toBe("PASS_LOCAL_SYNC_PACKETS_READY");
    expect(sync.target_packets.map((packet) => packet.target)).toEqual(["codex", "hermes", "opencode"]);
    expect(sync.target_packets.map((packet) => packet.path)).toEqual([
      ".ghostclaw_runtime/a2a2a/inbox/codex/A2A2A-P063-CODEX-TELEGRAM-ERROR-LOOP-HANDOFF-20260703.json",
      ".ghostclaw_runtime/a2a2a/inbox/hermes/A2A2A-P063-HERMES-TELEGRAM-ERROR-LOOP-ROUTE-20260703.json",
      ".ghostclaw_runtime/a2a2a/inbox/opencode/A2A2A-P063-OPENCODE-TELEGRAM-ERROR-LOOP-REVIEW-20260703.json"
    ]);
    expect(sync.guardrails.telegram_live_send).toBe(false);
    expect(sync.guardrails.provider_call).toBe(false);
    expect(sync.guardrails.secret_read).toBe(false);
    expect(sync.closed_gates).toEqual(expect.arrayContaining(["telegram_live_send", "provider_call", "push", "deploy"]));
  });
});
