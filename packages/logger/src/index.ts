/**
 * @sirinx/logger
 *
 * Structured logging interface for GhostClaw OS packages.
 *
 * Provides a minimal, dependency-free Logger interface that all GhostClaw
 * packages use. Implementations may wrap pino, winston, or console —
 * the interface is transport-agnostic.
 *
 * ## Usage
 *
 * ```typescript
 * import { createLogger } from '@sirinx/logger';
 *
 * const logger = createLogger({ level: 'info', name: 'hermes-api' });
 * logger.info('Server starting', { port: 8787 });
 * logger.child({ requestId: 'abc' }).debug('Processing request');
 * ```
 *
 * ## Design
 *
 * - **Structured**: Every log method accepts a message + optional metadata object.
 * - **Child loggers**: Support for request-scoped context via `.child()`.
 * - **Level filtering**: Logs below the configured level are dropped.
 * - **No external dependencies**: The interface itself depends on nothing.
 *   The implementation may choose to wrap any logging library.
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/**
 * Log severity level, ordered from most to least verbose.
 *
 * `'silent'` disables all output.
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';

/**
 * Numeric weight for level comparison. Higher = more verbose.
 */
export const LOG_LEVEL_WEIGHT: Readonly<Record<LogLevel, number>> = Object.freeze({
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  silent: 100,
});

/**
 * Arbitrary metadata object attached to log entries.
 *
 * Values must be JSON-serializable. The logger implementation
 * is responsible for redacting sensitive fields before output.
 */
export interface LogMeta {
  [key: string]: unknown;
}

/**
 * A structured log entry as emitted by the logger.
 */
export interface LogEntry {
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** Log level. */
  level: LogLevel;
  /** Human-readable message. */
  message: string;
  /** Optional metadata. */
  meta?: LogMeta;
  /** Optional logger name / component. */
  loggerName?: string;
}

/**
 * Configuration for creating a logger instance.
 */
export interface LoggerConfig {
  /** Minimum log level to output. Default: 'info'. */
  level: LogLevel;
  /** Logger name / component identifier. */
  name?: string;
  /** Whether to include timestamps in output. Default: true. */
  timestamps: boolean;
  /** Whether to use JSON format (vs. pretty-print). Default: true in production. */
  json: boolean;
  /** Keys to redact from metadata before output. */
  redactKeys?: string[];
}

/**
 * The core Logger interface.
 *
 * Every method is overloaded:
 * - `logger.info(message)` — string only
 * - `logger.info(message, meta)` — string + metadata
 */
export interface Logger {
  /** Logger name / component identifier. */
  readonly name: string;
  /** Current minimum log level. */
  readonly level: LogLevel;

  /** Log at trace level. */
  trace(message: string, meta?: LogMeta): void;
  /** Log at debug level. */
  debug(message: string, meta?: LogMeta): void;
  /** Log at info level. */
  info(message: string, meta?: LogMeta): void;
  /** Log at warn level. */
  warn(message: string, meta?: LogMeta): void;
  /** Log at error level. */
  error(message: string, meta?: LogMeta): void;

  /**
   * Creates a child logger with additional persistent context.
   *
   * The child inherits the parent's level and config, but merges
   * `context` into every log entry's metadata.
   *
   * @example
   * ```typescript
   * const requestLogger = logger.child({ requestId: 'abc-123', userId: 42 });
   * requestLogger.info('Processing request'); // includes requestId + userId
   * ```
   */
  child(context: LogMeta): Logger;

  /**
   * Registers a sink function that receives all log entries.
   *
   * Used for structured log shipping (e.g., to a file or external service).
   * Multiple sinks can be registered.
   *
   * @param sink - Function called with each emitted LogEntry.
   * @returns An unsubscribe function.
   */
  pipe(sink: (entry: LogEntry) => void): () => void;

  /**
   * Checks whether a given level would be emitted given the current config.
   *
   * @param level - The level to check.
   * @returns `true` if logs at this level would be output.
   */
  isLevelEnabled(level: LogLevel): boolean;
}

// ─────────────────────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────────────────────

/**
 * Default logger configuration.
 */
export const DEFAULT_LOGGER_CONFIG: Readonly<LoggerConfig> = Object.freeze({
  level: 'info',
  timestamps: true,
  json: process.env.NODE_ENV === 'production',
});

// ─────────────────────────────────────────────────────────────
// Public Functions — Stubs
// ─────────────────────────────────────────────────────────────

/**
 * Creates a new Logger instance.
 *
 * @param config - Logger configuration. Partial configs are merged with defaults.
 * @returns A configured Logger instance.
 *
 * @example
 * ```typescript
 * const logger = createLogger({ level: 'debug', name: 'mcp-server' });
 * logger.info('MCP server started', { tools: 7 });
 * ```
 */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  throw new Error('TODO: createLogger — implement Logger with level filtering and sinks');
}

/**
 * Creates a no-op logger that discards all output.
 *
 * Useful for tests and dry-run contexts where logging is noise.
 *
 * @returns A Logger instance that does nothing.
 */
export function createSilentLogger(): Logger {
  throw new Error('TODO: createSilentLogger — implement no-op Logger');
}

/**
 * Creates a child logger from a parent with merged context.
 *
 * This is the functional equivalent of `logger.child(context)` but
 * can be used standalone when you have a logger reference.
 *
 * @param parent - The parent logger.
 * @param context - Persistent metadata for the child.
 * @returns A new child Logger.
 */
export function createChildLogger(parent: Logger, context: LogMeta): Logger {
  throw new Error('TODO: createChildLogger — implement child logger creation');
}

/**
 * Parses a string into a LogLevel.
 *
 * Accepts case-insensitive strings. Returns 'info' for unrecognized input.
 *
 * @param value - String to parse (e.g., from an env var).
 * @returns The parsed LogLevel, or 'info' as fallback.
 */
export function parseLogLevel(value: string): LogLevel {
  throw new Error('TODO: parseLogLevel — implement string-to-Level parsing');
}
