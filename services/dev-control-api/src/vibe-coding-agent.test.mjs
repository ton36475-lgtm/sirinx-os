import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getVibeCodingAgentStatus } from "./vibe-coding-agent.mjs";

let tempRoot;

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = undefined;
  }
});

async function makeEvidenceRoot() {
  tempRoot = await mkdtemp(path.join(tmpdir(), "sirinx-vibe-agent-"));
  return tempRoot;
}

describe("Vibe Coding Agent contract", () => {
  it("recommends local safe actions without enabling external execution", async () => {
    const evidenceRoot = await makeEvidenceRoot();
    const status = await getVibeCodingAgentStatus({
      evidenceRoot,
      now: () => new Date("2026-05-26T02:00:00.000Z")
    });

    expect(status.status).toBe("local-agent-ready");
    expect(status.mode).toBe("local-only-execution-agent");
    expect(status.externalWrites).toBe(false);
    expect(status.canExecuteExternally).toBe(false);
    expect(status.canRunMcp).toBe(false);
    expect(status.canDeploy).toBe(false);
    expect(status.summary.blockedExternalGates).toBe(5);
    expect(status.summary.readyForHumanReview).toBe(0);
    expect(status.safeActions.map((action) => action.command)).toEqual([
      "pnpm verify:workspace",
      "pnpm soc:check",
      "pnpm dashboard:e2e"
    ]);
    expect(status.blockedActions).toEqual(
      expect.arrayContaining(["deploy", "push", "publish", "external_connector_activation", "real_mcp_execution"])
    );
    expect(status.approvalPacket.status).toBe("blocked-evidence-incomplete");
  });

  it("routes complete evidence to human review only, never auto-executes it", async () => {
    const evidenceRoot = await makeEvidenceRoot();
    await writeFile(
      path.join(evidenceRoot, "codex-mobile-qr-mfa.md"),
      [
        "- [x] same ChatGPT account/workspace confirmed",
        "- [x] Mac host appears online in ChatGPT mobile Codex",
        "- [x] MFA/SSO/passkey completed",
        "- [x] Mac keep-awake confirmed",
        "- [x] wrong-account rollback understood"
      ].join("\n"),
      "utf8"
    );

    const status = await getVibeCodingAgentStatus({
      evidenceRoot,
      now: () => new Date("2026-05-26T02:05:00.000Z")
    });

    expect(status.summary.readyForHumanReview).toBe(1);
    expect(status.summary.executableExternalActions).toBe(0);
    expect(status.canExecuteExternally).toBe(false);
    expect(status.reviewQueue.some((item) => item.id === "codex-mobile-qr-mfa" && item.status === "ready-for-human-review")).toBe(true);
    expect(status.approvalPacket.nextRequiredApproval).toContain("human review");
  });
});
