import { describe, expect, it, vi } from "vitest";
import {
  buildTelegramCommandMenu,
  getTelegramCommandRouterStatus,
  handleTelegramCommand,
  sendTelegramRouterMessage
} from "./telegram-command-router.mjs";
import { createTelegramApprovalReceipt } from "./telegram-exact-gate.mjs";

const fixedNow = () => new Date("2026-06-15T14:30:00.000Z");
const secretLikePattern = /bot[0-9]+:[A-Za-z0-9_-]{20,}|TELEGRAM_BOT_TOKEN\s*=\s*[^"'\s]{8,}/;
const liveSendGate = "APPROVE_TELEGRAM_GATEWAY_LIVE_SEND_A019E53EE";
const signingKey = "telegram-router-test-signing-key-32-bytes-minimum";

function liveSendReceipt(commandId, recipientTarget = "test-chat") {
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
    issuedAt: "2026-06-15T14:25:00.000Z",
    expiresAt: "2026-06-15T14:35:00.000Z"
  }, { signingKey });
}

describe("Telegram command router", () => {
  it("exposes a simple button menu and safe command map", () => {
    const status = getTelegramCommandRouterStatus({ now: fixedNow });
    const menu = buildTelegramCommandMenu();

    expect(status.status).toBe("telegram-command-router-ready");
    expect(status.mode).toBe("dry-run-first-with-explicit-live-send-gate");
    expect(status.registryVersion).toBe("2.4.0");
    expect(status.registryValidation.ok).toBe(true);
    expect(status.guardrails.arbitraryShell).toBe(false);
    expect(status.guardrails.liveSendRequiresExplicitTrue).toBe(true);
    expect(status.guardrails.providerCallFromTelegramCommand).toBe(false);
    expect(status.guardrails.providerCallsRequireSeparateExactGate).toBe(true);
    expect(status.guardrails.modelRoutingUsesCoordinationContract).toBe(true);
    expect(status.guardrails.legacyFusionAliasesPreviewOnly).toBe(true);
    expect(status.guardrails.telegramCommandRegistrySingleSource).toBe(true);
    expect(status.guardrails.hermesAllJobsReadyReadOnly).toBe(true);
    expect(status.guardrails.telegramLiveSendTrueRequiresExactGate).toBe(true);
    expect(status.guardrails.a2a2aStatusReadOnly).toBe(true);
    expect(status.guardrails.a2a2aDispatchPreviewReadOnly).toBe(true);
    expect(status.guardrails.a2a2aGateCheckReadOnly).toBe(true);
    expect(status.guardrails.a2a2aExecuteReadinessReadOnly).toBe(true);
    expect(status.guardrails.a2a2aExecuteCommandPreviewReadOnly).toBe(true);
    expect(status.guardrails.a2a2aCompletionAuditReadOnly).toBe(true);
    expect(status.guardrails.a2a2aLiveGateReadinessReadOnly).toBe(true);
    expect(status.guardrails.commandCenterUiLockReadOnly).toBe(true);
    expect(status.acceptedCommands).toContain("/commands");
    expect(status.acceptedCommands).toContain("/ui lockspec");
    expect(status.acceptedCommands).toContain("/team status");
    expect(status.acceptedCommands).toContain("/godmode status");
    expect(status.acceptedCommands).toContain("/hermes all jobs ready");
    expect(status.acceptedCommands).toContain("/hermes all jobs ready liveSend true");
    expect(status.acceptedCommands).toContain("/a2a2a status");
    expect(status.acceptedCommands).toContain("/a2a2a dispatch preview");
    expect(status.acceptedCommands).toContain("/a2a2a gate check <exact gate>");
    expect(status.acceptedCommands).toContain("/a2a2a execute readiness");
    expect(status.acceptedCommands).toContain("/a2a2a execute command preview <exact gate>");
    expect(status.acceptedCommands).toContain("/a2a2a completion audit");
    expect(status.acceptedCommands).toContain("/a2a2a live gate readiness");
    expect(status.acceptedCommands).toContain("/cloudflare readiness");
    expect(status.acceptedCommands).toContain("/cloudflare preview packet");
    expect(status.acceptedCommands).toContain("/model smoke preview");
    expect(status.acceptedCommands).toContain("/agent loop preview");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:status");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:ui-lockspec");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:team-status");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:godmode-status");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:hermes-all-jobs-ready");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:a2a2a-status");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:a2a2a-dispatch-preview");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:a2a2a-gate-check");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:a2a2a-execute-readiness");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:a2a2a-execute-command-preview");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:a2a2a-completion-audit");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:a2a2a-live-gate-readiness");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:cloudflare-readiness");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:cloudflare-preview-packet");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:model-smoke-preview");
    expect(menu.inline_keyboard.flat().map((button) => button.callback_data)).toContain("cmd:agent-loop-preview");
  });

  it("renders the immutable read-only Command Center UI lock", async () => {
    const result = await handleTelegramCommand(
      { callbackData: "cmd:ui-lockspec" },
      { liveSend: false, now: fixedNow }
    );

    expect(result.commandId).toBe("ui_lockspec");
    expect(result.owner).toBe("frontend_guardian");
    expect(result.actionClass).toBe("read_only");
    expect(result.messagePreview).toContain("LOCKED_LOCAL_READ_ONLY");
    expect(result.messagePreview).toContain("external_writes: false");
    expect(result.actionResult.safety.publicExposure).toBe(false);
    expect(result.externalWrites).toBe(false);
    expect(result.providerCalled).toBe(false);
    expect(result.sendResult.telegramSent).toBe(false);
  });

  it("renders the canonical five-phase GODMODE V5 state without authorizing execution", async () => {
    const result = await handleTelegramCommand(
      { text: "/godmode status" },
      { liveSend: false, now: fixedNow, root: process.cwd(), repoRoot: process.cwd() }
    );

    expect(result.commandId).toBe("godmode_status");
    expect(result.owner).toBe("hermes_commander");
    expect(result.messagePreview).toContain("GhostClaw GODMODE V5");
    expect(result.actionResult.PhaseOrder).toHaveLength(5);
    expect(result.messagePreview).toContain(
      `Phase: ${result.actionResult.Phase} (${result.actionResult.PhaseIndex + 1}/5)`
    );
    expect(result.messagePreview).toContain("External action authorized: no");
    expect(result.actionResult.AbortWindow).toBe(900);
    expect(result.actionResult.MaxRetries).toBe(3);
    expect(result.externalWrites).toBe(false);
  });

  it("shows Cloudflare R3 readiness without deploying or calling Cloudflare", async () => {
    const result = await handleTelegramCommand(
      { callbackData: "cmd:cloudflare-readiness" },
      { liveSend: false, now: fixedNow, root: process.cwd(), repoRoot: process.cwd() }
    );

    expect(result.commandId).toBe("cloudflare_readiness");
    expect(result.messagePreview).toContain("Cloudflare Deployment Readiness");
    expect(result.messagePreview).toContain("Deploy executed: no");
    expect(result.actionResult.externalRequests).toBe(false);
    expect(result.actionResult.deploy).toBe(false);
    expect(result.externalWrites).toBe(false);
  });

  it("previews a blocked Cloudflare R4 packet without execution", async () => {
    const result = await handleTelegramCommand(
      { text: "/cloudflare preview packet" },
      { liveSend: false, now: fixedNow, root: process.cwd(), repoRoot: process.cwd() }
    );

    expect(result.commandId).toBe("cloudflare_preview_packet");
    expect(result.messagePreview).toContain("Cloudflare Preview Packet");
    expect(result.actionResult.status).toBe("blocked-preview-packet");
    expect(result.actionResult.execute).toBe(false);
    expect(result.providerCalled).toBe(false);
    expect(result.externalWrites).toBe(false);
  });

  it("renders the read-only team ownership and model routes from the coordination contract", async () => {
    const result = await handleTelegramCommand(
      { callbackData: "cmd:team-status" },
      {
        liveSend: false,
        now: fixedNow,
        root: process.cwd(),
        repoRoot: process.cwd(),
        providerHealth: {
          claude_code_oauth: "pending_auth",
          codex_local: "ready",
          opencode_glm52: "ready",
          opencode_fallback: "ready"
        }
      }
    );

    expect(result.commandId).toBe("team_status");
    expect(result.handler).toBe("agent_team_status");
    expect(result.owner).toBe("hermes_commander");
    expect(result.actionClass).toBe("read_only");
    expect(result.messagePreview).toContain("GhostClaw Agentic Coding Team");
    expect(result.messagePreview).toContain("Sole repo writer: codex_build_captain");
    expect(result.externalWrites).toBe(false);
  });

  it("previews /commands without live sending", async () => {
    const result = await handleTelegramCommand({ text: "/command" }, { liveSend: false, now: fixedNow });

    expect(result.status).toBe("blocked-or-preview-telegram-command");
    expect(result.command).toBe("/commands");
    expect(result.sendResult.status).toBe("telegram-send-preview");
    expect(result.hasInlineKeyboard).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(secretLikePattern);
  });

  it("blocks an injected Telegram send without an exact gate receipt", async () => {
    const fetchImpl = vi.fn();
    const result = await sendTelegramRouterMessage(
      { text: "hello", replyMarkup: buildTelegramCommandMenu() },
      {
        token: "test-token",
        chatId: "test-chat",
        commandId: "direct_message",
        fetchImpl,
        now: fixedNow
      }
    );

    expect(result.status).toBe("blocked-telegram-send-exact-gate");
    expect(result.telegramSent).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends through an injected Telegram fetch only with a target-bound exact gate receipt", async () => {
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
        commandId: "direct_message",
        liveSendExactGate: liveSendGate,
        liveSendApprovalReceipt: liveSendReceipt("direct_message"),
        telegramApprovalSigningKey: signingKey,
        allowProvidedReceiptObject: true,
        consumeTelegramApprovalReceipt: async () => true,
        fetchImpl,
        now: fixedNow
      }
    );

    expect(result.status).toBe("sent-telegram-message");
    expect(result.messageIdPresent).toBe(true);
    expect(result.chatIdPresent).toBe(true);
    expect(result.gateAssessment.recipientMatched).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).not.toHaveProperty("parse_mode");
    expect(JSON.stringify(result)).not.toMatch(secretLikePattern);
  });

  it("blocks a live send when the approval receipt is bound to another recipient", async () => {
    const fetchImpl = vi.fn();
    const result = await sendTelegramRouterMessage(
      { text: "hello" },
      {
        token: "test-token",
        chatId: "test-chat",
        commandId: "direct_message",
        liveSendExactGate: liveSendGate,
        liveSendApprovalReceipt: liveSendReceipt("direct_message", "different-chat"),
        telegramApprovalSigningKey: signingKey,
        allowProvidedReceiptObject: true,
        consumeTelegramApprovalReceipt: async () => true,
        fetchImpl,
        now: fixedNow
      }
    );

    expect(result.status).toBe("blocked-telegram-send-recipient-mismatch");
    expect(result.telegramSent).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
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
        liveSendExactGate: liveSendGate,
        liveSendApprovalReceipt: liveSendReceipt("runtime_status"),
        telegramApprovalSigningKey: signingKey,
        allowProvidedReceiptObject: true,
        consumeTelegramApprovalReceipt: async () => true,
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


  it("previews canonical model health without provider calls or Telegram sends", async () => {
    const fetchImpl = vi.fn();
    const result = await handleTelegramCommand(
      { text: "/model smoke preview" },
      {
        token: "test-token",
        chatId: "test-chat",
        fetchImpl,
        now: fixedNow,
        envPath: "/tmp/sirinx-telegram-router-missing-env",
        providerHealth: {
          claude_code_oauth: "pending_auth",
          codex_local: "ready",
          opencode_glm52: "ready",
          opencode_fallback: "ready"
        }
      }
    );

    expect(result.status).toBe("blocked-or-preview-telegram-command");
    expect(result.command).toBe("/model smoke preview");
    expect(result.messagePreview).toContain("Agent Model Smoke Preview");
    expect(result.messagePreview).toContain("Provider called: no");
    expect(result.messagePreview).toContain("Route source: configs/ghostclaw_agent_coordination.config.json");
    expect(result.actionResult.modelRoutes.review.selected).toBe("glm/glm-5.2");
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
