import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { getCodexTaskRunnerStatus, runCodexTask } from "./codex-task-runner.mjs";

const fixedNow = () => new Date("2026-06-15T13:30:00.000Z");
const secretLikePattern = /OPENROUTER_API_KEY\s*=\s*[^"'\s]{8,}|TELEGRAM_BOT_TOKEN\s*=\s*[^"'\s]{8,}/;

async function withTempLog(callback) {
  const dir = await mkdtemp(join(tmpdir(), "sirinx-codex-runner-"));
  const logPath = join(dir, "runs.jsonl");
  try {
    return await callback(logPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("Codex task runner", () => {
  it("exposes only allowlisted local tasks", () => {
    const status = getCodexTaskRunnerStatus({ now: fixedNow });

    expect(status.status).toBe("codex-task-runner-ready");
    expect(status.canRunArbitraryShell).toBe(false);
    expect(status.allowedTasks.map((task) => task.id)).toEqual(
      expect.arrayContaining(["status", "diff", "test:fusion", "audit:secrets", "verify"])
    );
    expect(status.allowedTasks.some((task) => /deploy|push|publish/.test(task.commandPreview))).toBe(false);
  });

  it("blocks tasks outside the allowlist before command execution", async () => {
    const calls = [];
    const result = await withTempLog((logPath) =>
      runCodexTask(
        { task: "rm -rf important" },
        {
          logPath,
          now: fixedNow,
          executor: async (...args) => {
            calls.push(args);
            return { stdout: "", stderr: "", code: 0 };
          }
        }
      )
    );

    expect(result.status).toBe("blocked-codex-task");
    expect(result.commandExecuted).toBe(false);
    expect(calls).toEqual([]);
  });

  it("runs an allowlisted task with an injected executor and writes a sanitized audit log", async () => {
    await withTempLog(async (logPath) => {
      const result = await runCodexTask(
        { requestId: "task-test", task: "status" },
        {
          logPath,
          now: fixedNow,
          executor: async (command, args) => ({
            stdout: `${command} ${args.join(" ")}\nOPENROUTER_API_KEY=${"x".repeat(12)}`,
            stderr: "",
            code: 0
          })
        }
      );
      const log = await readFile(logPath, "utf8");

      expect(result.status).toBe("completed-codex-task");
      expect(result.commandExecuted).toBe(true);
      expect(result.stdoutPreview).toContain("[REDACTED_SECRET_LIKE]");
      expect(log).toContain("task-test");
      expect(log).not.toMatch(secretLikePattern);
    });
  });
});
