import { describe, expect, it } from "vitest";
import { createProjectAppUsabilityAudit, DEFAULT_USABILITY_CHECKS } from "./ghostclaw_project_app_usability_audit.mjs";

describe("GhostClaw project app usability audit", () => {
  it("runs the expected local build, check, and smoke commands", async () => {
    const commands = [];
    const result = await createProjectAppUsabilityAudit({
      root: "/tmp/sirinx-os",
      runner: async (command, args, root) => {
        commands.push({ command, args, root });
        return { stdout: "{\"status\":\"PASS\"}", stderr: "" };
      }
    });

    expect(result.status).toBe("PASS");
    expect(result.summary.total_checks).toBe(DEFAULT_USABILITY_CHECKS.length);
    expect(commands.map((item) => [item.command, ...item.args].join(" "))).toEqual([
      "pnpm --filter @sirinx/site build",
      "pnpm --filter @sirinx/site check",
      "pnpm --filter @agm/site build",
      "pnpm --filter @agm/site check",
      "pnpm --filter @agm/site test:smoke",
      "pnpm --filter @sirinx/agm-autoglow-dashboard verify",
      "pnpm --filter @sirinx/autoglow-core test"
    ]);
    expect(result.guardrails.provider_call).toBe(false);
    expect(result.guardrails.deploy).toBe(false);
  });

  it("fails when any local usability command fails", async () => {
    const result = await createProjectAppUsabilityAudit({
      checks: DEFAULT_USABILITY_CHECKS.slice(0, 2),
      runner: async (_command, args) => {
        if (args.includes("check")) {
          const error = new Error("check failed");
          error.stdout = "bad output";
          error.stderr = "failure";
          throw error;
        }
        return { stdout: "ok", stderr: "" };
      }
    });

    expect(result.status).toBe("FAIL");
    expect(result.summary.passed_checks).toBe(1);
    expect(result.summary.failed_checks).toBe(1);
    expect(result.next_safe_action).toContain("Fix failed");
  });

  it("can return a plan without executing commands", async () => {
    const result = await createProjectAppUsabilityAudit({ planOnly: true });

    expect(result.status).toBe("PLAN_ONLY");
    expect(result.planned_checks).toHaveLength(DEFAULT_USABILITY_CHECKS.length);
  });

  it("redacts secret-like command output without embedding literal secret signatures", async () => {
    const result = await createProjectAppUsabilityAudit({
      checks: DEFAULT_USABILITY_CHECKS.slice(0, 1),
      runner: async () => ({
        stdout: [
          ["sk", "abcdefghijklmnopqrstuvwxyz"].join("-"),
          ["sk", "or", "v1", "abcdefghijklmnopqrstuvwxyz"].join("-"),
          ["ghp", "abcdefghijklmnopqrstuvwxyz"].join("_"),
          ["xoxb", "1234567890"].join("-"),
          ["AK", "IA1234567890"].join("")
        ].join("\n"),
        stderr: ""
      })
    });

    expect(result.status).toBe("PASS");
    expect(result.results[0].stdout_excerpt).not.toContain("abcdefghijklmnopqrstuvwxyz");
    expect(result.results[0].stdout_excerpt).toContain("[REDACTED_SECRET]");
  });
});
