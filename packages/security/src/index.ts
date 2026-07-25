/**
 * @sirinx/security
 *
 * PII detection, secret scanning, and content masking for GhostClaw OS.
 *
 * All text that enters the GhostClaw control plane (task descriptions,
 * evidence output, log metadata) passes through these utilities before
 * persistence or display. This ensures secrets and PII never leak into
 * receipts, logs, or Telegram messages.
 *
 * ## Usage
 *
 * ```typescript
 * import { maskPII, scanSecrets, createPIIMasker } from '@sirinx/security';
 *
 * // One-shot masking
 * const safe = maskPII('Call John at john.doe@example.com, key=sk-abc123');
 * // 'Call John at [EMAIL_REDACTED], key=[REDACTED_SECRET]'
 *
 * // Scan for secrets (returns findings, doesn't mask)
 * const findings = scanSecrets('Bearer eyJhbGciOi...');
 * // [{ type: 'jwt', start: 7, end: 30, preview: 'eyJhbG...' }]
 *
 * // Reusable masker instance
 * const masker = createPIIMasker({ redactEmails: true, redactPhones: true });
 * const safe2 = masker.mask(input);
 * ```
 *
 * ## Design
 *
 * - **Composable**: `PIIMasker` is an interface; implementations can chain.
 * - **Conservative**: When in doubt, redact. False positives are preferred
 *   over leaking secrets.
 * - **Auditable**: `scanSecrets` returns structured findings so callers
 *   can log what was detected without exposing the actual secret.
 */

// ─────────────────────────────────────────────────────────────
// Detection Types
// ─────────────────────────────────────────────────────────────

/**
 * Type of detected secret or PII.
 */
export type FindingType =
  | 'api_key'       // Generic API key (sk-, gh_, akia, etc.)
  | 'jwt'           // JSON Web Token (three base64 segments)
  | 'bearer_token'  // Bearer token in Authorization header
  | 'private_key'   // PEM private key block
  | 'connection_string' // Database connection URL with credentials
  | 'email'         // Email address
  | 'phone'         // Phone number
  | 'credit_card'   // Credit card number
  | 'ssn'           // US Social Security Number
  | 'ip_address'    // IP address (v4 or v6)
  | 'aws_key_id'    // AWS access key ID (AKIA...)
  | 'github_token'  // GitHub token (ghp_, gho_, ghs_)
  | 'slack_token'   // Slack token (xox[bp]-)
  | 'openrouter_key' // OpenRouter key (sk-or-)
  | 'unknown_secret'; // High-entropy string that looks like a secret

/**
 * A single finding from scanning text for secrets/PII.
 */
export interface SecretFinding {
  /** Type of the detected content. */
  type: FindingType;
  /** Start index in the source string (inclusive). */
  start: number;
  /** End index in the source string (exclusive). */
  end: number;
  /** Safe preview of the matched text (truncated + masked). */
  preview: string;
  /** Confidence level (0.0–1.0). Higher = more confident. */
  confidence: number;
}

/**
 * Result of scanning text for secrets and PII.
 */
export interface ScanResult {
  /** All findings, ordered by position. */
  findings: SecretFinding[];
  /** Whether any secrets were detected. */
  hasSecrets: boolean;
  /** Whether any PII was detected. */
  hasPII: boolean;
  /** Number of findings by type. */
  counts: Partial<Record<FindingType, number>>;
}

// ─────────────────────────────────────────────────────────────
// Masking Types
// ─────────────────────────────────────────────────────────────

/**
 * The redaction placeholder used for each finding type.
 */
export const REDACTION_LABELS: Readonly<Record<FindingType, string>> = Object.freeze({
  api_key: '[REDACTED_SECRET]',
  jwt: '[REDACTED_JWT]',
  bearer_token: '[REDACTED_BEARER]',
  private_key: '[REDACTED_PRIVATE_KEY]',
  connection_string: '[REDACTED_CONNECTION_STRING]',
  email: '[EMAIL_REDACTED]',
  phone: '[PHONE_REDACTED]',
  credit_card: '[CC_REDACTED]',
  ssn: '[SSN_REDACTED]',
  ip_address: '[IP_REDACTED]',
  aws_key_id: '[AWS_KEY_REDACTED]',
  github_token: '[GITHUB_TOKEN_REDACTED]',
  slack_token: '[SLACK_TOKEN_REDACTED]',
  openrouter_key: '[OPENROUTER_KEY_REDACTED]',
  unknown_secret: '[REDACTED_SECRET]',
});

/**
 * Configuration for the PII masker.
 */
export interface PIIMaskerConfig {
  /** Whether to mask email addresses. Default: true. */
  redactEmails: boolean;
  /** Whether to mask phone numbers. Default: true. */
  redactPhones: boolean;
  /** Whether to mask IP addresses. Default: false (IPs are often operational). */
  redactIPs: boolean;
  /** Whether to mask credit card numbers. Default: true. */
  redactCreditCards: boolean;
  /** Whether to mask SSNs. Default: true. */
  redactSSNs: boolean;
  /** Whether to detect and mask high-entropy strings as secrets. Default: true. */
  detectHighEntropy: boolean;
  /** Minimum string length for high-entropy detection. Default: 20. */
  minSecretLength: number;
  /** Custom secret patterns to add (regex + label). */
  customPatterns?: CustomPattern[];
}

/**
 * Custom secret pattern for domain-specific detection.
 */
export interface CustomPattern {
  /** Pattern name / label. */
  name: string;
  /** Regex to match the secret. */
  regex: RegExp;
  /** Redaction label to use. */
  redactionLabel: string;
}

/**
 * Result of masking text.
 */
export interface MaskResult {
  /** The masked text with secrets/PII replaced. */
  masked: string;
  /** Findings from the scan that informed the masking. */
  findings: SecretFinding[];
  /** Number of redactions made. */
  redactionCount: number;
}

// ─────────────────────────────────────────────────────────────
// PIIMasker Interface
// ─────────────────────────────────────────────────────────────

/**
 * Interface for masking PII and secrets in text.
 *
 * Implementations scan text using regex patterns and entropy analysis,
 * then replace findings with redaction labels.
 *
 * ## Implementations
 *
 * - `createPIIMasker(config)` — The default implementation.
 * - Custom implementations can chain patterns or add domain-specific logic.
 */
export interface PIIMasker {
  /**
   * Masks all detected PII and secrets in the input text.
   *
   * @param text - The text to mask.
   * @returns The masked text.
   */
  mask(text: string): string;

  /**
   * Masks text and returns detailed results including findings.
   *
   * @param text - The text to mask.
   * @returns The masked text plus scan details.
   */
  maskWithDetails(text: string): MaskResult;

  /**
   * Scans text without masking — returns all findings.
   *
   * Used for auditing what would be redacted without modifying the text.
   *
   * @param text - The text to scan.
   * @returns Structured scan result.
   */
  scan(text: string): ScanResult;

  /**
   * Updates the masker configuration.
   *
   * @param config - Partial configuration to merge.
   */
  configure(config: Partial<PIIMaskerConfig>): void;
}

// ─────────────────────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────────────────────

/**
 * Default PII masker configuration.
 */
export const DEFAULT_MASKER_CONFIG: Readonly<PIIMaskerConfig> = Object.freeze({
  redactEmails: true,
  redactPhones: true,
  redactIPs: false,
  redactCreditCards: true,
  redactSSNs: true,
  detectHighEntropy: true,
  minSecretLength: 20,
});

// ─────────────────────────────────────────────────────────────
// Public Functions — Stubs
// ─────────────────────────────────────────────────────────────

/**
 * Scans text for secrets and PII without masking.
 *
 * Returns all findings with type, position, confidence, and a safe preview.
 * The original text is not modified.
 *
 * @param text - The text to scan.
 * @param config - Optional scanner configuration.
 * @returns Structured scan result.
 *
 * @example
 * ```typescript
 * const result = scanSecrets('export TOKEN=sk-or-abc123xyz');
 * console.log(result.findings);
 * // [{ type: 'openrouter_key', start: 14, end: 30, preview: 'sk-or-***' }]
 * ```
 */
export function scanSecrets(text: string, config?: Partial<PIIMaskerConfig>): ScanResult {
  throw new Error('TODO: scanSecrets — implement regex + entropy scanning');
}

/**
 * Masks all detected PII and secrets in text.
 *
 * Convenience function — equivalent to `createPIIMasker(config).mask(text)`.
 *
 * @param text - The text to mask.
 * @param config - Optional masker configuration.
 * @returns The masked text.
 *
 * @example
 * ```typescript
 * const safe = maskPII('Contact john@example.com, key=sk-abc123');
 * // 'Contact [EMAIL_REDACTED], key=[REDACTED_SECRET]'
 * ```
 */
export function maskPII(text: string, config?: Partial<PIIMaskerConfig>): string {
  throw new Error('TODO: maskPII — implement scan + replace pipeline');
}

/**
 * Creates a reusable PIIMasker instance.
 *
 * The masker compiles its regex patterns once and reuses them,
 * making it efficient for processing many texts.
 *
 * @param config - Optional initial configuration.
 * @returns A configured PIIMasker instance.
 *
 * @example
 * ```typescript
 * const masker = createPIIMasker({ redactIPs: true });
 * const safe1 = masker.mask(text1);
 * const safe2 = masker.mask(text2);
 * masker.configure({ redactIPs: false }); // update at runtime
 * ```
 */
export function createPIIMasker(config?: Partial<PIIMaskerConfig>): PIIMasker {
  throw new Error('TODO: createPIIMasker — implement PIIMasker class');
}

/**
 * Checks whether a string appears to contain any secrets or PII.
 *
 * This is a fast boolean check — use `scanSecrets` for detailed findings.
 *
 * @param text - The text to check.
 * @returns `true` if any secrets or PII are detected.
 */
export function hasSecrets(text: string): boolean {
  throw new Error('TODO: hasSecrets — implement fast boolean detection');
}
