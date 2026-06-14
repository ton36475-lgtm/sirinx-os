import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createAiTeamPairingDryRun, getAiTeamPairingStatus } from "./ai-team-pairing.mjs";

let tempRoot;

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = undefined;
  }
});

async function makeEvidenceRoot() {
  tempRoot = await mkdtemp(path.join(tmpdir(), "sirinx-ai-team-pairing-"));
  return tempRoot;
}

const fixedNow = () => new Date("2026-05-26T05:00:00.000Z");

describe("AI team pairing contract", () => {
  it("pairs every 47 Ronin role to a local runtime lane without enabling messaging", async () => {
    const evidenceRoot = await makeEvidenceRoot();
    const status = await getAiTeamPairingStatus({ evidenceRoot, now: fixedNow });

    expect(status.status).toBe("local-pairing-ready");
    expect(status.mode).toBe("all-ai-team-local-pairing-contract");
    expect(status.externalWrites).toBe(false);
    expect(status.canExecuteExternally).toBe(false);
    expect(status.canSendMessages).toBe(false);
    expect(status.canStartGateways).toBe(false);
    expect(status.summary).toMatchObject({
      rolesTotal: 47,
      pairedRoles: 47,
      activeProfiles: 12,
      virtualRoles: 35,
      executableExternalActions: 0,
      telegramReady: false
    });
    expect(status.pairings).toHaveLength(47);
    expect(status.pairings.every((pairing) => pairing.externalWrites === false && pairing.canSendMessage === false)).toBe(true);
    expect(status.telegram).toMatchObject({
      gateId: "telegram-line-recipient-token",
      canSend: false,
      evidenceStatus: "missing-evidence"
    });
  });

  it("creates a dry-run pairing handoff without running Codex, Hermes, Gemini, or Telegram", async () => {
    const evidenceRoot = await makeEvidenceRoot();
    const dryRun = await createAiTeamPairingDryRun(
      {
        goal: "pair all AI team",
        source: "codex-local"
      },
      { evidenceRoot, now: fixedNow }
    );

    expect(dryRun.status).toBe("dry-run-pairing-ready");
    expect(dryRun.externalWrites).toBe(false);
    expect(dryRun.canExecuteExternally).toBe(false);
    expect(dryRun.canSendMessages).toBe(false);
    expect(dryRun.canStartGateways).toBe(false);
    expect(dryRun.runtimeGroups.map((group) => group.id)).toEqual([
      "codex-control",
      "hermes-tui-manual",
      "qwen-openrouter-manual",
      "antigravity-cli-watch",
      "gemini-review-manual",
      "a2a2loopsync-evidence"
    ]);
    expect(dryRun.runtimeGroups.find((group) => group.id === "qwen-openrouter-manual")).toMatchObject({
      autoExecute: false,
      externalWrites: false,
      providerCall: false,
      modelId: "qwen/qwen3.7-max"
    });
    expect(dryRun.runtimeGroups.find((group) => group.id === "antigravity-cli-watch")).toMatchObject({
      autoExecute: false,
      externalWrites: false,
      canInstall: false,
      canRunCli: false
    });
    expect(dryRun.handoffPackets).toHaveLength(12);
    expect(dryRun.handoffPackets.every((packet) => packet.canExecuteNow === false)).toBe(true);
    expect(dryRun.stopPoint).toBe("AI TEAM PAIRED LOCAL-ONLY - WAITING FOR HUMAN APPROVAL");
  });
});
