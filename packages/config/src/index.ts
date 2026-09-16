/**
 * @sirinx/config
 *
 * Configuration schema and loaders for GhostClaw OS packages.
 *
 * All GhostClaw packages and services read their configuration through
 * this module. The schema is Zod-validated at load time so that invalid
 * or partial configs fail fast with a descriptive error rather than
 * causing runtime crashes deep in a handler.
 *
 * ## Usage
 *
 * ```typescript
 * import { loadConfig, validateConfig } from '@sirinx/config';
 *
 * // Load from default locations (env > .env > config/default.json)
 * const config = await loadConfig();
 *
 * // Or validate an already-parsed object
 * const validated = validateConfig(rawObject);
 * ```
 *
 * ## Schema Conventions
 *
 * - Every field has a default that works for local development.
 * - Secret fields (tokens, API keys) are read from environment variables
 *   and never from config files.
 * - All paths are resolved relative to the project root.
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/**
 * Log level for the GhostClaw system.
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';

/**
 * Risk tier gating configuration.
 */
export interface RiskTierConfig {
  /** Whether green-tier tasks can auto-execute without approval. Default: true. */
  autoExecuteGreen: boolean;
  /** Whether yellow-tier tasks require explicit approval. Default: true. */
  requireApprovalYellow: boolean;
  /** Whether red-tier tasks are hard-blocked. Default: true. */
  blockRed: boolean;
}

/**
 * Hermes API connection configuration.
 */
export interface HermesApiConfig {
  /** Bind host. Default: '127.0.0.1'. */
  host: string;
  /** Bind port. Default: 8787. */
  port: number;
  /** Full base URL (computed from host + port if not set). */
  baseUrl: string;
}

/**
 * Telegram bot configuration.
 */
export interface TelegramConfig {
  /** Authorized Telegram chat ID. */
  authorizedChatId: number;
  /** Whether the bot allows live execution. Default: false. */
  allowLive: boolean;
  /** Bot display name. Default: 'GhostClaw'. */
  botName: string;
  /**
   * Bot token. Read from TELEGRAM_BOT_TOKEN env var.
   * Never stored in config files.
   */
  botToken?: string;
}

/**
 * MCP server configuration.
 */
export interface McpConfig {
  /** Server name reported to MCP client. Default: 'ghostclaw-mcp'. */
  name: string;
  /** Whether live execution is allowed. Default: false. */
  allowLive: boolean;
  /** Default result limit for list-type tools. Default: 50. */
  defaultLimit: number;
}

/**
 * Database configuration (for future persistence layer).
 */
export interface DatabaseConfig {
  /** Database URL. Read from DATABASE_URL env var. */
  url?: string;
  /** Connection pool size. Default: 10. */
  poolSize: number;
  /** Connection timeout in milliseconds. Default: 5000. */
  timeoutMs: number;
}

/**
 * Top-level configuration schema for GhostClaw OS.
 *
 * All GhostClaw packages share this single schema. Individual packages
 * read only the sections they need.
 */
export interface ConfigSchema {
  /** Environment name: 'development', 'staging', 'production'. */
  env: 'development' | 'staging' | 'production';
  /** Project root directory. Default: process.cwd(). */
  projectRoot: string;
  /** Log level for all packages. Default: 'info'. */
  logLevel: LogLevel;
  /** Risk tier execution gating. */
  riskTier: RiskTierConfig;
  /** Hermes HTTP API. */
  hermesApi: HermesApiConfig;
  /** Telegram bot. */
  telegram: TelegramConfig;
  /** MCP server. */
  mcp: McpConfig;
  /** Database (optional, for future persistence). */
  database: DatabaseConfig;
  /** Whether the entire system runs in dry-run mode. Default: true. */
  dryRun: boolean;
}

/**
 * Validation error detail.
 */
export interface ConfigValidationError {
  /** JSON pointer path to the invalid field (e.g., '/hermesApi/port'). */
  path: string;
  /** Human-readable error message. */
  message: string;
  /** The invalid value. */
  value: unknown;
}

/**
 * Result of config validation.
 */
export type ConfigValidationResult =
  | { success: true; config: ConfigSchema }
  | { success: false; errors: ConfigValidationError[] };

// ─────────────────────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────────────────────

/**
 * Default configuration values for local development.
 *
 * These are used when a field is not explicitly set in the config source.
 */
export const DEFAULT_CONFIG: Readonly<ConfigSchema> = Object.freeze({
  env: 'development',
  projectRoot: process.cwd(),
  logLevel: 'info',
  riskTier: {
    autoExecuteGreen: true,
    requireApprovalYellow: true,
    blockRed: true,
  },
  hermesApi: {
    host: '127.0.0.1',
    port: 8787,
    baseUrl: 'http://127.0.0.1:8787',
  },
  telegram: {
    authorizedChatId: 0,
    allowLive: false,
    botName: 'GhostClaw',
  },
  mcp: {
    name: 'ghostclaw-mcp',
    allowLive: false,
    defaultLimit: 50,
  },
  database: {
    poolSize: 10,
    timeoutMs: 5000,
  },
  dryRun: true,
});

// ─────────────────────────────────────────────────────────────
// Public Functions — Stubs
// ─────────────────────────────────────────────────────────────

/**
 * Validates a raw configuration object against the ConfigSchema.
 *
 * Performs deep type checking, range validation, and env-var resolution.
 * Returns a discriminated union so callers can pattern-match on success.
 *
 * @param raw - The raw configuration object to validate.
 * @returns `{ success: true, config }` or `{ success: false, errors }`.
 *
 * @example
 * ```typescript
 * const result = validateConfig({ env: 'development', hermesApi: { port: 9999 } });
 * if (result.success) {
 *   console.log(result.config.hermesApi.port); // 9999
 * } else {
 *   for (const err of result.errors) console.error(err.path, err.message);
 * }
 * ```
 */
export function validateConfig(raw: unknown): ConfigValidationResult {
  throw new Error('TODO: validateConfig — implement Zod schema validation');
}

/**
 * Loads configuration from the environment.
 *
 * Resolution order (first wins):
 * 1. Process environment variables (prefixed `GHOSTCLAW_`)
 * 2. `.env` file (if present)
 * 3. `config/default.json` or `config/{NODE_ENV}.json`
 * 4. `DEFAULT_CONFIG`
 *
 * Secret fields (bot tokens, API keys) are ALWAYS read from environment
 * variables and never from config files.
 *
 * @param options - Optional overrides for config file path and env prefix.
 * @returns The validated configuration.
 * @throws If the merged configuration fails validation.
 *
 * @example
 * ```typescript
 * const config = await loadConfig({ configPath: './custom-config.json' });
 * ```
 */
export async function loadConfig(options?: LoadConfigOptions): Promise<ConfigSchema> {
  throw new Error('TODO: loadConfig — implement env + file + defaults merge');
}

/**
 * Options for `loadConfig`.
 */
export interface LoadConfigOptions {
  /** Path to a JSON config file. Overrides default search. */
  configPath?: string;
  /** Environment variable prefix. Default: 'GHOSTCLAW_'. */
  envPrefix?: string;
  /** Whether to skip loading `.env` files. Default: false. */
  skipDotenv?: boolean;
}

/**
 * Merges a partial config with defaults, producing a full ConfigSchema.
 *
 * Deep-merges nested objects. Arrays are replaced, not concatenated.
 *
 * @param partial - Partial configuration to merge.
 * @returns Full configuration with defaults filled in.
 */
export function mergeWithDefaults(partial: Partial<ConfigSchema>): ConfigSchema {
  throw new Error('TODO: mergeWithDefaults — implement deep merge with DEFAULT_CONFIG');
}
