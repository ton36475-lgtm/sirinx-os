import { describe, expect, it } from "vitest";
import {
  buildTelegramCommandMenuFromRegistry,
  getTelegramCommandCatalog,
  resolveTelegramCommand,
  validateTelegramCommandRegistry
} from "./telegram-command-registry.mjs";

describe("Telegram command registry", () => {
  it("keeps one validated source of truth for commands and buttons", () => {
    const catalog = getTelegramCommandCatalog();
    const menu = buildTelegramCommandMenuFromRegistry();

    expect(catalog.validation).toMatchObject({ ok: true, commandCount: 23, enabledCommandCount: 23 });
    expect(catalog.registry.version).toBe("2.3.0");
    expect(catalog.registry.policies.singleWriterRole).toBe("codex_build_captain");
    expect(catalog.registry.policies.arbitraryShell).toBe(false);
    expect(catalog.registry.policies.directDeploy).toBe(false);
    expect(catalog.registry.policies.directPush).toBe(false);
    expect(catalog.acceptedCommands).toContain("/team status");
    expect(menu.inline_keyboard.flat()).toContainEqual({ text: "Agent Team", callback_data: "cmd:team-status" });
    expect(menu.inline_keyboard.flat()).toContainEqual({
      text: "Cloudflare Ready",
      callback_data: "cmd:cloudflare-readiness"
    });
  });

  it("resolves aliases, callbacks, and prefix commands to the same handler", () => {
    expect(resolveTelegramCommand("/command")?.handler).toBe("command_menu");
    expect(resolveTelegramCommand("cmd:team-status")?.handler).toBe("agent_team_status");
    expect(
      resolveTelegramCommand("/a2a2a gate check APPROVE_EXACT_GATE")?.handler
    ).toBe("a2a2a_gate_check");
  });

  it("rejects duplicate commands and unsafe action classes", () => {
    const validation = validateTelegramCommandRegistry({
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
      menu: { rows: [] },
      commands: [
        {
          id: "danger",
          label: "Danger",
          callbackData: "cmd:danger",
          textCommands: ["/danger", "/danger"],
          matchMode: "exact",
          handler: "danger",
          owner: "telegram_controller",
          actionClass: "arbitrary_shell",
          enabled: true
        }
      ]
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors).toEqual(
      expect.arrayContaining(["duplicate_text_command:/danger", "blocked_action_class:danger:arbitrary_shell"])
    );
  });

  it("fails closed for unknown action classes and ungated provider previews", () => {
    const registry = structuredClone(getTelegramCommandCatalog().registry);
    registry.commands[0].actionClass = "read_only_typo";
    const providerCommand = registry.commands.find((command) => command.actionClass === "provider_preview");
    providerCommand.requiresExactGate = false;

    const validation = validateTelegramCommandRegistry(registry);

    expect(validation.ok).toBe(false);
    expect(validation.errors).toContain("unknown_action_class:commands:read_only_typo");
    expect(validation.errors).toContain(`provider_preview_requires_exact_gate:${providerCommand.id}`);
  });

  it("requires provider buttons to stay preview-only and execution receipts to remain mandatory", () => {
    const registry = structuredClone(getTelegramCommandCatalog().registry);
    registry.policies.providerCallFromButton = true;
    registry.policies.receiptRequiredForExecution = false;

    const validation = validateTelegramCommandRegistry(registry);

    expect(validation.ok).toBe(false);
    expect(validation.errors).toContain("provider_call_from_button_must_be_disabled");
    expect(validation.errors).toContain("execution_receipt_must_be_required");
  });
});
