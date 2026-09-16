import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  getRuntimeFoundationStatus,
  parseRuntimeEnvContent,
  readRuntimeSecret,
  readRuntimeSecretCompat,
  writeRuntimeFoundationAudit
} from "./runtime-foundation.mjs";

const fixedNow = () => new Date("2026-06-15T13:00:00.000Z");
const secretLikePattern = /sk-[A-Za-z0-9_-]{20,}|OPENROUTER_API_KEY\s*=\s*[^"'\s]{12,}/;

async function withTempEnv(content, callback) {
  const dir = await mkdtemp(join(tmpdir(), "sirinx-runtime-foundation-"));
  const envPath = join(dir, ".env");
  await writeFile(envPath, content, "utf8");
  try {
    return await callback(envPath, dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("runtime foundation env parser", () => {
  it("parses exact KEY=value lines without exposing values", () => {
    const content = [
      "OPENROUTER_API_KEY=",
      `TELEGRAM_BOT_TOKEN=${"t".repeat(16)}`,
      "TELEGRAM_HOME_CHANNEL=-100123",
      "not a valid line"
    ].join("\n");
    const parsed = parseRuntimeEnvContent(content);

    expect(parsed.keys.OPENROUTER_API_KEY).toMatchObject({ present: true, nonempty: false });
    expect(parsed.keys.TELEGRAM_BOT_TOKEN).toMatchObject({ present: true, nonempty: true });
    expect(parsed.keys.TELEGRAM_HOME_CHANNEL).toMatchObject({ present: true, nonempty: true });
    expect(parsed.malformed).toEqual([
      {
        lineNumber: 4,
        reason: "not_key_value",
        secretLike: false
      }
    ]);
    expect(JSON.stringify(parsed)).not.toMatch(secretLikePattern);
  });

  it("reports malformed secret-like lines only by count and line number", async () => {
    await withTempEnv(
      [
        "OPENROUTER_API_KEY=",
        "TELEGRAM_BOT_TOKEN=",
        "TELEGRAM_HOME_CHANNEL=",
        `malformed ${"x".repeat(30)}.${"y".repeat(14)}.${"z".repeat(30)}`
      ].join("\n"),
      async (envPath) => {
        const status = await getRuntimeFoundationStatus({ envPath, now: fixedNow });

        expect(status.status).toBe("runtime-foundation-needs-attention");
        expect(status.malformed.count).toBe(1);
        expect(status.malformed.secretLikeCount).toBe(1);
        expect(status.warnings).toContain("env_file_has_secret_like_malformed_lines_rotate_or_cleanup");
        expect(JSON.stringify(status)).not.toMatch(secretLikePattern);
      }
    );
  });

  it("can read one secret internally while keeping public status sanitized", async () => {
    await withTempEnv(`OPENROUTER_API_KEY=${"o".repeat(16)}\n`, async (envPath) => {
      const secret = await readRuntimeSecret("OPENROUTER_API_KEY", { envPath });
      const status = await getRuntimeFoundationStatus({ envPath, now: fixedNow });

      expect(secret.ok).toBe(true);
      expect(secret.value).toHaveLength(16);
      expect(status.keys.OPENROUTER_API_KEY).toMatchObject({ present: true, nonempty: true });
      expect(JSON.stringify(status)).not.toContain(secret.value);
      expect(JSON.stringify(status)).not.toMatch(secretLikePattern);
    });
  });

  it("prefers UpperCamelCase runtime keys while accepting a legacy alias", async () => {
    await withTempEnv(`OpenRouterApiKey=${"c".repeat(32)}\nOPENROUTER_API_KEY=${"l".repeat(32)}\n`, async (envPath) => {
      const canonical = await readRuntimeSecretCompat("OpenRouterApiKey", ["OPENROUTER_API_KEY"], { envPath });
      expect(canonical.ok).toBe(true);
      expect(canonical.sourceKey).toBe("OpenRouterApiKey");
      expect(canonical.legacyFallbackUsed).toBe(false);
    });

    await withTempEnv(`OPENROUTER_API_KEY=${"l".repeat(32)}\n`, async (envPath) => {
      const legacy = await readRuntimeSecretCompat("OpenRouterApiKey", ["OPENROUTER_API_KEY"], { envPath });
      expect(legacy.ok).toBe(true);
      expect(legacy.sourceKey).toBe("OPENROUTER_API_KEY");
      expect(legacy.legacyFallbackUsed).toBe(true);
    });
  });

  it("writes a sanitized local audit report", async () => {
    await withTempEnv("OPENROUTER_API_KEY=\n", async (envPath, dir) => {
      const reportPath = join(dir, "runtime-status.json");
      const result = await writeRuntimeFoundationAudit({ envPath, reportPath, now: fixedNow });
      const source = await readFile(reportPath, "utf8");

      expect(result.evidencePath).toBe(reportPath);
      expect(JSON.parse(source).status).toBe("runtime-foundation-needs-attention");
      expect(source).not.toMatch(secretLikePattern);
    });
  });
});
