import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { getAgentLoopRuntimeStatus, runAgentLoop } from "./agent-loop-runtime.mjs";

const fixedNow = () => new Date("2026-06-15T14:00:00.000Z");

async function withTempRuntime(callback) {
  const dir = await mkdtemp(join(tmpdir(), "sirinx-agent-loop-"));
  const envPath = join(dir, ".env");
  try {
    return await callback(dir, envPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("agent loop runtime", () => {
  it("exposes closed-loop stages and blocks open-loop operation", () => {
    const status = getAgentLoopRuntimeStatus({ now: fixedNow });

    expect(status.status).toBe("agent-loop-runtime-ready");
    expect(status.openLoop.allowed).toBe(false);
    expect(status.closedLoop.allowed).toBe(true);
    expect(status.stages).toEqual(["discovery", "planning", "execution", "verification", "iteration", "evidence"]);
    expect(status.guardrails.deploy).toBe(false);
    expect(status.guardrails.push).toBe(false);
  });

  it("runs a bounded closed loop with an injected executor", async () => {
    await withTempRuntime(async (projectRoot, envPath) => {
      const calls = [];
      const result = await runAgentLoop(
        { requestId: "loop-test", goal: "Review fusion runtime readiness" },
        {
          projectRoot,
          envPath,
          now: fixedNow,
          executor: async (command, args) => {
            calls.push(`${command} ${args.join(" ")}`);
            return { stdout: "ok", stderr: "", code: 0 };
          }
        }
      );

      expect(result.status).toBe("completed-agent-loop-runtime");
      expect(result.intent).toBe("fusion_runtime_readiness");
      expect(result.summary).toMatchObject({ total: 3, passed: 3, failed: 0 });
      expect(calls).toEqual([
        "pnpm runtime-foundation:test",
        "pnpm openrouter-fusion-router:test",
        "pnpm audit:secrets"
      ]);
      expect(result.stages.find((stage) => stage.stage === "verification").status).toBe("passed");
    });
  });

  it("marks the loop blocked when a verification task fails", async () => {
    await withTempRuntime(async (projectRoot, envPath) => {
      const result = await runAgentLoop(
        { requestId: "loop-fail-test", goal: "Verify workspace" },
        {
          projectRoot,
          envPath,
          now: fixedNow,
          executor: async (command, args) => {
            if (args.includes("verify")) {
              const error = new Error("verify failed");
              error.code = 1;
              error.stderr = "verify failed";
              throw error;
            }
            return { stdout: "ok", stderr: "", code: 0 };
          }
        }
      );

      expect(result.status).toBe("blocked-agent-loop-runtime");
      expect(result.summary.failedTasks).toContain("verify");
      expect(result.stages.find((stage) => stage.stage === "iteration").status).toBe("targeted-retry-required");
    });
  });
});
