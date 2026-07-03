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
    expect(status.mode).toBe("dry-run-first-with-explicit-live-send-gate");
    expect(status.guardrails.arbitraryShell).toBe(false);
    expect(status.guardrails.liveSendRequiresExplicitTrue).toBe(true);
    expect(status.guardrails.providerCallOnlyForFusionSmoke).toBe(false);
    expect(status.guardrails.fusionSmokeTelegramPreviewOnly).toBe(true);
    expect(status.guardrails.fusionProviderCallRequiresSeparateGate).toBe(true);
    expect(status.guardrails.fable5PreviewReadOnly).toBe(true);
    expect(status.guardrails.fable5ProviderCallRequiresExplicitGate).toBe(true);
    expect(status.guardrails.hermesAllJobsReadyReadOnly).toBe(true);
    expect(status.guardrails.telegramLiveSendTrueRequiresExactGate).toBe(true);
    expect(status.guardrails.a2a2aStatusReadOnly).toBe(true);
    expect(status.guardrails.a2a2aDispatchPreviewReadOnly).toBe(true);
    expect(status.guardrails.a2a2aGateCheckReadOnly).toBe(true);
    expect(status.guardrails.a2a2aExecuteReadinessReadOnly).toBe(true);
    expect(status.guardrails.a2a2aExecuteCommandPreviewReadOnly).toBe(true);
    expect(status.guardrails.a2a2aCompletionAuditReadOnly).toBe(true);
    expect(status.guardrails.a2a2aLiveGateReadinessReadOnly).toBe(true);
    expect(status.acceptedCommands).toContain("/commands");
    expect(status.acceptedCommands).toContain("/hermes all jobs ready");
    expect(status.acceptedCommands).toContain("/hermes all jobs ready liveSend true");
    expect(status.acceptedCommands).toContain("/fable5 preview");
    expect(status.acceptedCommands).toContain("/a2a2a status");
    expect(status.acceptedCommands).toContain("/a2a2a dispatch preview");
    expect(status.acceptedCommands).toContain("/a2a2a gate check <exact gate>");
    expect(status.acceptedCommands).toContain("/a2a2a execute readiness");
    expect(status.acceptedCommands).toContain("/a2a2a execute command preview <exact gate>");
    expect(status.acceptedCommands).toContain("/a2a2a completion audit");
    expect(status.acceptedCommands).toContain("/a2a2a live gate readiness");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:status");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:hermes-all-jobs-ready");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:fable5-preview");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:a2a2a-status");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:a2a2a-dispatch-preview");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:a2a2a-gate-check");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:a2a2a-execute-readiness");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:a2a2a-execute-command-preview");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:a2a2a-completion-audit");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:a2a2a-live-gate-readiness");
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
        liveSend: true,
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

  it("defaults command handling to preview even when token and chat are supplied", async () => {
    const fetchImpl = vi.fn();
    const result = await handleTelegramCommand(
      { text: "/status" },
      {
        token: "test-token",
        chatId: "test-chat",
        fetchImpl,
        now: fixedNow,
        envPath: "/tmp/sirinx-telegram-router-missing-env"
      }
    );

    expect(result.status).toBe("blocked-or-preview-telegram-command");
    expect(result.sendResult.status).toBe("telegram-send-preview");
    expect(result.externalWrites).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(secretLikePattern);
  });

  it("previews OpenRouter Fable5 routing without provider calls or Telegram sends", async () => {
    const fetchImpl = vi.fn();
    const result = await handleTelegramCommand(
      { text: "/fable5 preview" },
      {
        token: "test-token",
        chatId: "test-chat",
        fetchImpl,
        now: fixedNow,
        envPath: "/tmp/sirinx-telegram-router-missing-env"
      }
    );

    expect(result.status).toBe("blocked-or-preview-telegram-command");
    expect(result.command).toBe("/fable5 preview");
    expect(result.messagePreview).toContain("OpenRouter Fable5 Preview");
    expect(result.messagePreview).toContain("Model: anthropic/claude-fable-5");
    expect(result.messagePreview).toContain("Provider called: no");
    expect(result.actionResult.status).toBe("dry-run-openrouter-fable5-adapter-ready");
    expect(result.actionResult.requestPreview.body.model).toBe("anthropic/claude-fable-5");
    expect(result.providerCalled).toBe(false);
    expect(result.externalWrites).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(secretLikePattern);
  });

  it("previews Fusion smoke without provider calls, retries, or Telegram sends", async () => {
    const fetchImpl = vi.fn();
    const result = await handleTelegramCommand(
      { text: "/fusion smoke" },
      {
        token: "test-token",
        chatId: "test-chat",
        fetchImpl,
        now: fixedNow,
        envPath: "/tmp/sirinx-telegram-router-missing-env"
      }
    );

    expect(result.status).toBe("blocked-or-preview-telegram-command");
    expect(result.command).toBe("/fusion smoke");
    expect(result.messagePreview).toContain("OpenRouter Fusion Smoke Preview");
    expect(result.messagePreview).toContain("Provider called: no");
    expect(result.messagePreview).toContain("Retry loop: blocked");
    expect(result.actionResult.status).toBe("dry-run-openrouter-fusion-router-ready");
    expect(result.actionResult.providerCalled).toBe(false);
    expect(result.actionResult.secretsRead).toBe(false);
    expect(result.providerCalled).toBe(false);
    expect(result.externalWrites).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(secretLikePattern);
  });

  it("previews Hermes all-jobs readiness and keeps liveSend true gated", async () => {
    const fetchImpl = vi.fn();
    const result = await handleTelegramCommand(
      { text: "/hermes all jobs ready liveSend true" },
      {
        token: "test-token",
        chatId: "test-chat",
        fetchImpl,
        now: fixedNow,
        envPath: "/tmp/sirinx-telegram-router-missing-env"
      }
    );

    expect(result.status).toBe("blocked-or-preview-telegram-command");
    expect(result.command).toBe("/hermes all jobs ready");
    expect(result.messagePreview).toContain("Hermes All Jobs Readiness");
    expect(result.messagePreview).toContain("Telegram liveSend requested: yes");
    expect(result.messagePreview).toContain("Telegram liveSend can send now: no");
    expect(result.actionResult.externalRequests.telegramLiveSend.status).toBe("exact_gate_required");
    expect(result.actionResult.externalRequests.telegramLiveSend.canSendNow).toBe(false);
    expect(result.actionResult.guardrails.liveTelegramSend).toBe(false);
    expect(result.providerCalled).toBe(false);
    expect(result.externalWrites).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(secretLikePattern);
  });

  it("previews A2A2A status without live sending or external writes", async () => {
    const fetchImpl = vi.fn();
    const result = await handleTelegramCommand(
      { text: "/a2a2a status" },
      {
        token: "test-token",
        chatId: "test-chat",
        fetchImpl,
        now: fixedNow,
        envPath: "/tmp/sirinx-telegram-router-missing-env"
      }
    );

    expect(result.status).toBe("blocked-or-preview-telegram-command");
    expect(result.command).toBe("/a2a2a status");
    expect(result.messagePreview).toContain("GhostClaw A2A2A Status");
    expect(result.messagePreview).toContain("Next exact gate:");
    expect(result.actionResult.guardrails.readOnly).toBe(true);
    expect(result.actionResult.guardrails.workerPacketWrite).toBe(false);
    expect(result.externalWrites).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(secretLikePattern);
  });

  it("previews A2A2A dispatch plan without writes or execution", async () => {
    const fetchImpl = vi.fn();
    const result = await handleTelegramCommand(
      { text: "/a2a2a dispatch preview" },
      {
        token: "test-token",
        chatId: "test-chat",
        fetchImpl,
        now: fixedNow,
        envPath: "/tmp/sirinx-telegram-router-missing-env"
      }
    );

    expect(result.status).toBe("blocked-or-preview-telegram-command");
    expect(result.command).toBe("/a2a2a dispatch preview");
    expect(result.messagePreview).toContain("GhostClaw A2A2A Dispatch Preview");
    expect(result.messagePreview).toContain("Required exact gate:");
    expect(result.actionResult.guardrails.readOnly).toBe(true);
    expect(result.actionResult.guardrails.workerPacketWrite).toBe(false);
    expect(result.actionResult.guardrails.queuePayloadExecution).toBe(false);
    expect(result.commandExecuted).toBe(false);
    expect(result.externalWrites).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(secretLikePattern);
  });

  it("previews A2A2A gate check without executing local dispatch", async () => {
    const fetchImpl = vi.fn();
    const result = await handleTelegramCommand(
      { text: "/a2a2a gate check APPROVE_A2A2A_P003_LOCAL_WORKER_PACKET_DISPATCH_ONLY_A019E53EE" },
      {
        token: "test-token",
        chatId: "test-chat",
        fetchImpl,
        now: fixedNow,
        envPath: "/tmp/sirinx-telegram-router-missing-env"
      }
    );

    expect(result.status).toBe("blocked-or-preview-telegram-command");
    expect(result.command).toBe("/a2a2a gate check");
    expect(result.messagePreview).toContain("GhostClaw A2A2A Gate Check");
    expect(result.messagePreview).toContain("Approval matched: yes");
    expect(result.messagePreview).toContain("Execute requested: no");
    expect(result.actionResult.approvalMatches).toBe(true);
    expect(result.actionResult.executeStillRequired).toBe(true);
    expect(result.actionResult.guardrails.workerPacketWrite).toBe(false);
    expect(result.commandExecuted).toBe(false);
    expect(result.externalWrites).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(secretLikePattern);
  });

  it("keeps callback gate check blocked when no exact phrase is supplied", async () => {
    const fetchImpl = vi.fn();
    const result = await handleTelegramCommand(
      { callbackData: "cmd:a2a2a-gate-check" },
      {
        token: "test-token",
        chatId: "test-chat",
        fetchImpl,
        now: fixedNow,
        envPath: "/tmp/sirinx-telegram-router-missing-env"
      }
    );

    expect(result.status).toBe("blocked-or-preview-telegram-command");
    expect(result.command).toBe("cmd:a2a2a-gate-check");
    expect(result.messagePreview).toContain("Approval matched: no");
    expect(result.actionResult.approvalProvided).toBe(false);
    expect(result.actionResult.guardrails.workerPacketWrite).toBe(false);
    expect(result.externalWrites).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("previews A2A2A execute readiness without dispatch execution", async () => {
    const fetchImpl = vi.fn();
    const result = await handleTelegramCommand(
      { text: "/a2a2a execute readiness" },
      {
        token: "test-token",
        chatId: "test-chat",
        fetchImpl,
        now: fixedNow,
        envPath: "/tmp/sirinx-telegram-router-missing-env"
      }
    );

    expect(result.status).toBe("blocked-or-preview-telegram-command");
    expect(result.command).toBe("/a2a2a execute readiness");
    expect(result.messagePreview).toContain("GhostClaw A2A2A Execute Readiness");
    expect(result.messagePreview).toContain("Ready for P004 execute: no");
    expect(result.actionResult.readyForExecute).toBe(false);
    expect(result.actionResult.guardrails.workerPacketWrite).toBe(false);
    expect(result.commandExecuted).toBe(false);
    expect(result.externalWrites).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(secretLikePattern);
  });

  it("previews A2A2A execute readiness with exact gate while blocking repeat dispatch", async () => {
    const fetchImpl = vi.fn();
    const result = await handleTelegramCommand(
      { text: "/a2a2a execute readiness APPROVE_A2A2A_P003_LOCAL_WORKER_PACKET_DISPATCH_ONLY_A019E53EE" },
      {
        token: "test-token",
        chatId: "test-chat",
        fetchImpl,
        now: fixedNow,
        envPath: "/tmp/sirinx-telegram-router-missing-env"
      }
    );

    expect(result.status).toBe("blocked-or-preview-telegram-command");
    expect(result.command).toBe("/a2a2a execute readiness");
    expect(result.command).not.toContain("APPROVE_A2A2A");
    expect(result.messagePreview).toContain("Approval matched: yes");
    expect(result.messagePreview).toContain("Execute requested: yes");
    expect(result.actionResult.approvalMatches).toBe(true);
    expect(result.actionResult.readyForExecute).toBe(false);
    expect(result.actionResult.failedChecks).not.toContain("p003_exact_gate_matches");
    expect(result.actionResult.failedChecks).not.toContain("p004_execute_requested");
    expect(result.actionResult.failedChecks).toContain("p004_not_already_dispatched");
    expect(result.actionResult.guardrails.workerPacketWrite).toBe(false);
    expect(result.commandExecuted).toBe(false);
    expect(result.externalWrites).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(secretLikePattern);
  });

  it("blocks the P004 execute command preview after local worker packets were dispatched", async () => {
    const fetchImpl = vi.fn();
    const result = await handleTelegramCommand(
      { text: "/a2a2a execute command preview APPROVE_A2A2A_P003_LOCAL_WORKER_PACKET_DISPATCH_ONLY_A019E53EE" },
      {
        token: "test-token",
        chatId: "test-chat",
        fetchImpl,
        now: fixedNow,
        envPath: "/tmp/sirinx-telegram-router-missing-env"
      }
    );

    expect(result.status).toBe("blocked-or-preview-telegram-command");
    expect(result.command).toBe("/a2a2a execute command preview");
    expect(result.messagePreview).toContain("GhostClaw A2A2A Execute Command Preview");
    expect(result.messagePreview).toContain("Blocked checks: p004_not_already_dispatched");
    expect(result.actionResult.commandPreviewReady).toBe(false);
    expect(result.actionResult.failedChecks).toContain("p004_not_already_dispatched");
    expect(result.actionResult.commandExecuted).toBe(false);
    expect(result.actionResult.guardrails.workerPacketWrite).toBe(false);
    expect(result.commandExecuted).toBe(false);
    expect(result.externalWrites).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(secretLikePattern);
  });

  it("previews A2A2A completion audit without live sending or external writes", async () => {
    const fetchImpl = vi.fn();
    const result = await handleTelegramCommand(
      { text: "/a2a2a completion audit" },
      {
        token: "test-token",
        chatId: "test-chat",
        fetchImpl,
        now: fixedNow,
        envPath: "/tmp/sirinx-telegram-router-missing-env"
      }
    );

    expect(result.status).toBe("blocked-or-preview-telegram-command");
    expect(result.command).toBe("/a2a2a completion audit");
    expect(result.messagePreview).toContain("GhostClaw A2A2A Completion Audit");
    expect(result.messagePreview).toContain("Local-safe complete: yes");
    expect(result.messagePreview).toContain("Blocked checks: none");
    expect(result.actionResult.status).toBe("a2a2a-local-safe-completion-pass");
    expect(result.actionResult.localSafeComplete).toBe(true);
    expect(result.actionResult.guardrails.liveTelegramSend).toBe(false);
    expect(result.actionResult.guardrails.providerCall).toBe(false);
    expect(result.externalWrites).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(secretLikePattern);
  });

  it("previews A2A2A live gate readiness without opening live gates", async () => {
    const fetchImpl = vi.fn();
    const result = await handleTelegramCommand(
      { text: "/a2a2a live gate readiness" },
      {
        token: "test-token",
        chatId: "test-chat",
        fetchImpl,
        now: fixedNow,
        envPath: "/tmp/sirinx-telegram-router-missing-env"
      }
    );

    expect(result.status).toBe("blocked-or-preview-telegram-command");
    expect(result.command).toBe("/a2a2a live gate readiness");
    expect(result.messagePreview).toContain("GhostClaw A2A2A Live Gate Readiness");
    expect(result.messagePreview).toContain("Live execution approved: no");
    expect(result.messagePreview).toContain("Blocked checks: none");
    expect(result.actionResult.status).toBe("a2a2a-live-gate-ready-for-exact-approval-execution-closed");
    expect(result.actionResult.readyForExactGateRequest).toBe(true);
    expect(result.actionResult.liveExecutionApproved).toBe(false);
    expect(result.actionResult.guardrails.liveTelegramSend).toBe(false);
    expect(result.actionResult.guardrails.webhookActivation).toBe(false);
    expect(result.actionResult.guardrails.secretRead).toBe(false);
    expect(result.externalWrites).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(secretLikePattern);
  });
});
