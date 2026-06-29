import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { evaluateCommand } from "./command-broker.js";
import { runCodexSidecar } from "./codex-sidecar.js";
import { listPackets, readPacket } from "./packet-bus.js";
import {
  buildCommandInboxPacket,
  buildCommandMessage,
  commandIntentToAction,
  writeCommandInboxPacket,
} from "./command-intents.js";

async function makeTempProject(): Promise<string> {
  return mkdtemp(join(tmpdir(), "a2a-command-intents-"));
}

describe("Hermes goal/mission/brainstorm command intents", () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await makeTempProject();
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it("maps command names to Tier B plan actions", () => {
    expect(commandIntentToAction("goal")).toBe("goal_define");
    expect(commandIntentToAction("mission")).toBe("mission_create");
    expect(commandIntentToAction("brainstorm")).toBe("brainstorm_deliberate");

    for (const intent of ["goal", "mission", "brainstorm"] as const) {
      const message = buildCommandMessage(intent, {
        goal: "Sync all Hermes A2A Codex jobs under local-only godmode policy",
        files: ["docs/superpowers/plans/2026-06-29-a2a-sync-hermes-goal-mission-brainstorm.md"],
      });
      const { verdict, receipt } = evaluateCommand(message);

      expect(verdict.allowed).toBe(true);
      expect(verdict.tier).toBe("B");
      expect(receipt.action_class).toBe("PLAN");
      expect(message.human_approval_required).toBe(false);
      expect(message.context.license_policy?.requested_license).toBe("MIT");
      expect(message.context.license_policy?.assertion).toBe("intent_only_until_license_file_exists");
    }
  });

  it("rejects legacy BestStorm spellings instead of aliasing them", () => {
    expect(() => commandIntentToAction("BestStorm")).toThrow(/invalid_brainstorm_alias/);
    expect(() => commandIntentToAction("beststrom")).toThrow(/invalid_brainstorm_alias/);
  });

  it("builds an inbox packet for Hermes to Codex sync without execution approval", async () => {
    const packet = await writeCommandInboxPacket("goal", {
      projectRoot,
      packetId: "packet_024_sirinx_hermes_a2a_codex_sync_all_jobs",
      goal: "Sync all Hermes A2A Codex jobs under high-level godmode skill boundaries",
      files: ["docs/superpowers/decisions/2026-06-29-a2a-sync-hermes-goal-mission-brainstorm.md"],
    });

    expect(packet.id).toBe("packet_024_sirinx_hermes_a2a_codex_sync_all_jobs");
    expect(packet.status).toBe("inbox");
    expect(packet.agent).toBe("hermes");
    expect(packet.risk).toBe("safe");
    expect(packet.approval_required).toBe(false);
    expect(packet.notes).toContain("dry_run=true");
    expect(packet.notes).toContain("runtime_queue_execution=false");
    expect(packet.notes).toContain("requested_license=MIT");
    expect(packet.notes).toContain("license_assertion=intent_only_until_license_file_exists");
    expect(packet.a2a2a_message?.action_requested).toBe("goal_define");

    const read = await readPacket("inbox", packet.id, { projectRoot });
    expect(read?.id).toBe(packet.id);
  });

  it("routes goal, mission, and brainstorm through sidecar dry-run previews only", async () => {
    for (const intent of ["goal", "mission", "brainstorm"] as const) {
      const message = buildCommandMessage(intent, {
        goal: `Dry-run ${intent} command for Hermes A2A Codex sync`,
        files: ["GHOSTCLAW/a2a-hermes-codex-bridge/command-intents.ts"],
      });
      const result = await runCodexSidecar(message, { projectRoot });

      expect(result.status).toBe("allowed_dry_run");
      expect(result.tier).toBe("B");
      expect(result.codex_dry_run_preview).toContain("Codex CLI dry-run preview");
      expect(result.codex_dry_run_preview).toContain(message.action_requested);
      expect(result.manifest_id).toBeDefined();
      expect(result.outbox_packet_id).toBeDefined();
    }

    const outbox = await listPackets("outbox", { projectRoot });
    expect(outbox).toHaveLength(3);
    expect(
      outbox.map((packet) => packet.a2a2a_message?.action_requested).sort()
    ).toEqual(["brainstorm_deliberate", "goal_define", "mission_create"]);
    expect(outbox.every((packet) => packet.approval_required === false)).toBe(true);
  });

  it("can build packets without writing them for preview surfaces", () => {
    const packet = buildCommandInboxPacket("brainstorm", {
      goal: "Create a decision-ready proposal without auto-execution",
      files: ["GHOSTCLAW/a2a-hermes-codex-bridge/command-intents.ts"],
    });

    expect(packet.status).toBe("inbox");
    expect(packet.a2a2a_message?.action_requested).toBe("brainstorm_deliberate");
    expect(packet.notes).toContain("brainstorm_canonical=true");
    expect(packet.notes).not.toContain("BestStorm");
  });
});
