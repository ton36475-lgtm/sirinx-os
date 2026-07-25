import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const DEFAULT_CONFIG_PATH = path.join(REPO_ROOT, "configs/telegram_command_center.config.json");
const BLOCKED_ACTION_CLASSES = new Set(["arbitrary_shell", "deploy", "production_mutation", "push", "secret_access"]);
const ALLOWED_ACTION_CLASSES = new Set(["read_only", "local_plan", "local_validation", "provider_preview"]);

function normalize(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function duplicateValues(values) {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

export function readTelegramCommandRegistry(options = {}) {
  if (options.registry) return options.registry;
  const configPath = options.configPath || DEFAULT_CONFIG_PATH;
  return JSON.parse(readFileSync(configPath, "utf8"));
}

export function validateTelegramCommandRegistry(registry) {
  const errors = [];
  const commands = Array.isArray(registry?.commands) ? registry.commands : [];
  const enabledCommands = commands.filter((command) => command.enabled !== false);
  const ids = commands.map((command) => command.id);
  const callbacks = enabledCommands.map((command) => command.callbackData).filter(Boolean);
  const textCommands = enabledCommands.flatMap((command) => command.textCommands || []).map(normalize);
  const commandMap = new Map(commands.map((command) => [command.id, command]));

  if (registry?.$schema !== "ghostclaw.telegram.command_center.v2") errors.push("invalid_schema");
  if (!registry?.version) errors.push("missing_version");
  if (!commands.length) errors.push("missing_commands");
  for (const id of duplicateValues(ids)) errors.push(`duplicate_command_id:${id}`);
  for (const callback of duplicateValues(callbacks)) errors.push(`duplicate_callback:${callback}`);
  for (const textCommand of duplicateValues(textCommands)) errors.push(`duplicate_text_command:${textCommand}`);

  for (const command of commands) {
    if (!command.id) errors.push("command_missing_id");
    if (!command.handler) errors.push(`command_missing_handler:${command.id || "unknown"}`);
    if (!command.owner) errors.push(`command_missing_owner:${command.id || "unknown"}`);
    if (!Array.isArray(command.textCommands) || !command.textCommands.length) {
      errors.push(`command_missing_text_commands:${command.id || "unknown"}`);
    }
    if (!new Set(["exact", "prefix"]).has(command.matchMode)) {
      errors.push(`invalid_match_mode:${command.id || "unknown"}`);
    }
    if (command.callbackData && Buffer.byteLength(command.callbackData, "utf8") > 64) {
      errors.push(`callback_too_long:${command.id}`);
    }
    if (BLOCKED_ACTION_CLASSES.has(command.actionClass)) {
      errors.push(`blocked_action_class:${command.id}:${command.actionClass}`);
    }
    if (!ALLOWED_ACTION_CLASSES.has(command.actionClass)) {
      errors.push(`unknown_action_class:${command.id}:${command.actionClass || "missing"}`);
    }
    if (command.actionClass === "provider_preview" && command.requiresExactGate !== true) {
      errors.push(`provider_preview_requires_exact_gate:${command.id}`);
    }
  }

  for (const [rowIndex, row] of (registry?.menu?.rows || []).entries()) {
    if (!Array.isArray(row) || !row.length) errors.push(`empty_menu_row:${rowIndex}`);
    if (row.length > 8) errors.push(`menu_row_too_wide:${rowIndex}`);
    for (const commandId of row) {
      const command = commandMap.get(commandId);
      if (!command) errors.push(`unknown_menu_command:${commandId}`);
      else if (command.enabled === false) errors.push(`disabled_menu_command:${commandId}`);
      else if (!command.callbackData) errors.push(`menu_command_missing_callback:${commandId}`);
    }
  }

  if (registry?.policies?.singleWriterRole !== "codex_build_captain") errors.push("single_writer_policy_mismatch");
  if (registry?.policies?.arbitraryShell !== false) errors.push("arbitrary_shell_must_be_disabled");
  if (registry?.policies?.directDeploy !== false) errors.push("direct_deploy_must_be_disabled");
  if (registry?.policies?.directPush !== false) errors.push("direct_push_must_be_disabled");
  if (registry?.policies?.providerCallFromButton !== false) errors.push("provider_call_from_button_must_be_disabled");
  if (registry?.policies?.secretsInPayload !== false) errors.push("secrets_in_payload_must_be_disabled");
  if (registry?.policies?.receiptRequiredForExecution !== true) errors.push("execution_receipt_must_be_required");

  return {
    ok: errors.length === 0,
    errors,
    commandCount: commands.length,
    enabledCommandCount: enabledCommands.length,
    callbackCount: callbacks.length,
    menuButtonCount: (registry?.menu?.rows || []).flat().length
  };
}

export function getTelegramCommandCatalog(options = {}) {
  const registry = readTelegramCommandRegistry(options);
  const validation = validateTelegramCommandRegistry(registry);
  if (!validation.ok) throw new Error(`Invalid Telegram command registry: ${validation.errors.join(", ")}`);
  const commands = registry.commands.filter((command) => command.enabled !== false);
  return {
    registry,
    validation,
    commands,
    acceptedCommands: commands.flatMap((command) => [...command.textCommands, ...(command.examples || [])]),
    callbackCommands: commands.map((command) => command.callbackData).filter(Boolean)
  };
}

export function buildTelegramCommandMenuFromRegistry(options = {}) {
  const { registry, commands } = getTelegramCommandCatalog(options);
  const commandMap = new Map(commands.map((command) => [command.id, command]));
  return {
    inline_keyboard: registry.menu.rows.map((row) =>
      row.map((commandId) => {
        const command = commandMap.get(commandId);
        return { text: command.label, callback_data: command.callbackData };
      })
    )
  };
}

export function resolveTelegramCommand(commandText, options = {}) {
  const normalized = normalize(commandText);
  const { commands } = getTelegramCommandCatalog(options);
  const callbackMatch = commands.find((command) => normalize(command.callbackData) === normalized);
  if (callbackMatch) return callbackMatch;

  const candidates = commands
    .flatMap((command) => (command.textCommands || []).map((textCommand) => ({ command, textCommand: normalize(textCommand) })))
    .sort((left, right) => right.textCommand.length - left.textCommand.length);

  for (const candidate of candidates) {
    if (candidate.command.matchMode === "exact" && normalized === candidate.textCommand) return candidate.command;
    if (
      candidate.command.matchMode === "prefix" &&
      (normalized === candidate.textCommand || normalized.startsWith(`${candidate.textCommand} `))
    ) {
      return candidate.command;
    }
  }
  return null;
}
