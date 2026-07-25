import assert from "node:assert/strict";
import test from "node:test";

import { getCommandCenterUiLock } from "./command-center-ui-lock.mjs";
import { getTelegramCommandCatalog, resolveTelegramCommand } from "./telegram-command-registry.mjs";
import { handleTelegramCommand } from "./telegram-command-router.mjs";

test("UI lock is an immutable local read-only contract", () => {
  const lock = getCommandCenterUiLock();

  assert.equal(lock.status, "LOCKED_LOCAL_READ_ONLY");
  assert.equal(lock.safety.readOnly, true);
  assert.equal(lock.safety.dryRun, true);
  assert.equal(lock.safety.externalWrites, false);
  assert.equal(lock.safety.liveSend, false);
  assert.equal(lock.safety.providerCalls, false);
  assert.equal(lock.safety.secretAccess, false);
  assert.equal(lock.safety.publicExposure, false);
  assert.equal(Object.isFrozen(lock), true);
  assert.equal(Object.isFrozen(lock.safety), true);
});

test("Telegram registry exposes one read-only UI lock command", () => {
  const catalog = getTelegramCommandCatalog();
  const command = resolveTelegramCommand("/ui lockspec");

  assert.equal(catalog.registry.version, "2.4.0");
  assert.equal(catalog.validation.ok, true);
  assert.equal(command?.id, "ui_lockspec");
  assert.equal(command?.handler, "command_center_ui_lockspec");
  assert.equal(command?.actionClass, "read_only");
  assert.equal(command?.requiresExactGate, false);
});

test("UI lock command performs no external action", async () => {
  const result = await handleTelegramCommand(
    { text: "/ui lockspec" },
    { liveSend: false, now: () => new Date("2026-07-18T00:00:00.000Z") }
  );

  assert.equal(result.commandId, "ui_lockspec");
  assert.equal(result.actionClass, "read_only");
  assert.equal(result.externalWrites, false);
  assert.equal(result.providerCalled, false);
  assert.equal(result.sendResult.telegramSent, false);
  assert.equal(result.actionResult.safety.externalWrites, false);
  assert.match(result.messagePreview, /LOCKED_LOCAL_READ_ONLY/);
  assert.match(result.messagePreview, /external_writes: false/);
});
