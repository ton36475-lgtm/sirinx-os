import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DEFAULT_ENV_PATH = "/Users/sirinx/.hermes/profiles/solis/.env";
const DEFAULT_RUNTIME_REPORT = ".hermes/runtime/runtime-foundation-status.json";
const SECRET_LIKE_PATTERN =
  /(sk-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{24,}|AIza[0-9A-Za-z_-]{20,})/;

const REQUIRED_KEYS = [
  "OPENROUTER_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_HOME_CHANNEL",
  "TELEGRAM_CHAT_ID",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN"
];

function nowIso(options = {}) {
  const now = options.now || (() => new Date());
  return now().toISOString();
}

function trimTrailingNewlines(value) {
  return String(value || "").replace(/[\r\n]+$/g, "");
}

function stripOptionalQuotes(value) {
  const trimmed = String(value || "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parseRuntimeEnvContent(content) {
  const keys = {};
  const malformed = [];
  const lines = String(content || "").split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      malformed.push({
        lineNumber,
        reason: trimmed.includes("=") ? "invalid_env_key" : "not_key_value",
        secretLike: SECRET_LIKE_PATTERN.test(trimmed)
      });
      return;
    }

    const key = match[1];
    const value = stripOptionalQuotes(trimTrailingNewlines(match[2]));
    if (!keys[key]) {
      keys[key] = {
        present: true,
        nonempty: false,
        count: 0,
        lineNumbers: []
      };
    }
    keys[key].count += 1;
    keys[key].lineNumbers.push(lineNumber);
    if (value.length > 0) {
      keys[key].nonempty = true;
    }
  });

  return {
    keys,
    malformed,
    lineCount: lines.length
  };
}

export async function getHermesEnvPath(options = {}) {
  if (options.envPath) return options.envPath;
  if (process.env.HERMES_PROFILE_ENV_PATH) return process.env.HERMES_PROFILE_ENV_PATH;

  try {
    const { stdout } = await execFileAsync("hermes", ["config", "env-path"], {
      timeout: 1200,
      maxBuffer: 16 * 1024
    });
    const envPath = stdout.trim();
    return envPath || DEFAULT_ENV_PATH;
  } catch {
    return DEFAULT_ENV_PATH;
  }
}

export async function readRuntimeEnv(options = {}) {
  const envPath = await getHermesEnvPath(options);
  try {
    const content = await readFile(envPath, "utf8");
    return {
      ok: true,
      envPath,
      parsed: parseRuntimeEnvContent(content),
      error: null
    };
  } catch (error) {
    return {
      ok: false,
      envPath,
      parsed: parseRuntimeEnvContent(""),
      error: error.code || "read_failed"
    };
  }
}

export async function readRuntimeSecret(key, options = {}) {
  const envPath = await getHermesEnvPath(options);
  try {
    const content = await readFile(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || match[1] !== key) continue;
      const value = stripOptionalQuotes(trimTrailingNewlines(match[2]));
      return {
        ok: value.length > 0,
        present: true,
        value,
        envPath,
        error: value.length > 0 ? null : "empty_value"
      };
    }
    return {
      ok: false,
      present: false,
      value: "",
      envPath,
      error: "missing_key"
    };
  } catch (error) {
    return {
      ok: false,
      present: false,
      value: "",
      envPath,
      error: error.code || "read_failed"
    };
  }
}

function summarizeKey(parsed, key) {
  const entry = parsed.keys[key] || {
    present: false,
    nonempty: false,
    count: 0,
    lineNumbers: []
  };
  return {
    present: Boolean(entry.present),
    nonempty: Boolean(entry.nonempty),
    count: entry.count || 0,
    lineNumbers: entry.lineNumbers || []
  };
}

export async function getRuntimeFoundationStatus(options = {}) {
  const env = await readRuntimeEnv(options);
  const keys = Object.fromEntries(REQUIRED_KEYS.map((key) => [key, summarizeKey(env.parsed, key)]));
  const malformedSecretLikeCount = env.parsed.malformed.filter((entry) => entry.secretLike).length;
  const openRouterReady = keys.OPENROUTER_API_KEY.nonempty;
  const telegramReady =
    keys.TELEGRAM_BOT_TOKEN.nonempty &&
    (keys.TELEGRAM_HOME_CHANNEL.nonempty || keys.TELEGRAM_CHAT_ID.nonempty);
  const cloudflareReady =
    keys.CLOUDFLARE_ACCOUNT_ID.nonempty && keys.CLOUDFLARE_API_TOKEN.nonempty;

  const warnings = [];
  if (!openRouterReady) warnings.push("openrouter_api_key_missing_or_empty");
  if (!telegramReady) warnings.push("telegram_token_or_target_missing");
  if (!cloudflareReady) warnings.push("cloudflare_credentials_missing_or_empty");
  if (env.parsed.malformed.length > 0) warnings.push("env_file_has_malformed_lines");
  if (malformedSecretLikeCount > 0) warnings.push("env_file_has_secret_like_malformed_lines_rotate_or_cleanup");

  return {
    title: "SIRINX Real Runtime Foundation",
    status: warnings.length ? "runtime-foundation-needs-attention" : "runtime-foundation-ready",
    mode: "safe-env-readiness",
    envPath: env.envPath,
    envFileReadable: env.ok,
    envReadError: env.error,
    keys,
    readiness: {
      openRouter: openRouterReady,
      telegram: telegramReady,
      cloudflare: cloudflareReady
    },
    malformed: {
      count: env.parsed.malformed.length,
      secretLikeCount: malformedSecretLikeCount,
      lines: env.parsed.malformed.map((entry) => ({
        lineNumber: entry.lineNumber,
        reason: entry.reason,
        secretLike: entry.secretLike
      }))
    },
    guardrails: {
      shellSourceUsed: false,
      secretValuesReturned: false,
      secretValuesPrinted: false,
      exactKeyValueParserOnly: true
    },
    warnings,
    updatedAt: nowIso(options)
  };
}

export async function writeRuntimeFoundationAudit(options = {}) {
  const status = await getRuntimeFoundationStatus(options);
  const reportPath = options.reportPath || DEFAULT_RUNTIME_REPORT;
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(status, null, 2)}\n`, "utf8");
  return {
    ...status,
    evidencePath: reportPath
  };
}

export function runtimeFoundationEvidencePath(projectRoot = process.cwd()) {
  return join(projectRoot, DEFAULT_RUNTIME_REPORT);
}
