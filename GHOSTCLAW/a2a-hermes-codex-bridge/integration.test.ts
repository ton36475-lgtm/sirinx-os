/**
 * A2A Hermes-Codex Bridge v2 Integration Tests
 *
 * Tests packet-bus, manifest-store, and codex-sidecar contracts.
 * All writes are scoped to GHOSTCLAW/a2a-hermes-codex-bridge and temp dirs.
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { listPackets, movePacket, readPacket, writePacket } from "./packet-bus.js";
import { writeSimulationManifest, zeroHash } from "./manifest-store.js";
import { makeA2AMessage, runCodexSidecar } from "./codex-sidecar.js";

async function makeTempProject(): Promise<string> {
  return mkdtemp(join(tmpdir(), "a2a-bridge-test-"));
}

describe("Packet Bus", () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await makeTempProject();
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it("writes and reads an inbox packet", async () => {
    const packet = await writePacket(
      {
        project: "ghostclaw-a2a2a",
        priority: "P1",
        title: "test packet",
        agent: "hermes",
        status: "inbox",
        risk: "safe",
        input: ["GHOSTCLAW/test.ts"],
        output: [],
        approval_required: false,
      },
      { projectRoot }
    );
    expect(packet.id).toBeDefined();
    expect(packet.created_at).toBeDefined();

    const read = await readPacket("inbox", packet.id, { projectRoot });
    expect(read).not.toBeNull();
    expect(read?.title).toBe("test packet");
    expect(read?.status).toBe("inbox");
  });

  it("lists packets sorted by created_at", async () => {
    await writePacket(
      {
        project: "ghostclaw-a2a2a",
        priority: "P1",
        title: "first",
        agent: "hermes",
        status: "inbox",
        risk: "safe",
        input: [],
        output: [],
        approval_required: false,
        created_at: "2026-06-29T00:00:00.000Z",
      },
      { projectRoot }
    );
    await writePacket(
      {
        project: "ghostclaw-a2a2a",
        priority: "P1",
        title: "second",
        agent: "hermes",
        status: "inbox",
        risk: "safe",
        input: [],
        output: [],
        approval_required: false,
        created_at: "2026-06-29T00:00:01.000Z",
      },
      { projectRoot }
    );

    const list = await listPackets("inbox", { projectRoot });
    expect(list).toHaveLength(2);
    expect(list[0].title).toBe("first");
    expect(list[1].title).toBe("second");
  });

  it("moves a packet between statuses", async () => {
    const packet = await writePacket(
      {
        project: "ghostclaw-a2a2a",
        priority: "P1",
        title: "move me",
        agent: "codex",
        status: "inbox",
        risk: "medium",
        input: [],
        output: [],
        approval_required: true,
      },
      { projectRoot }
    );
    const moved = await movePacket("inbox", "working", packet.id, { projectRoot });
    expect(moved?.status).toBe("working");

    const fromInbox = await readPacket("inbox", packet.id, { projectRoot });
    const inWorking = await readPacket("working", packet.id, { projectRoot });
    expect(fromInbox).toBeNull();
    expect(inWorking).not.toBeNull();
  });
});

describe("Manifest Store", () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await makeTempProject();
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it("writes a simulation manifest", async () => {
    const manifest = await writeSimulationManifest(
      {
        correlation_id: "corr-1",
        mission_id: "mission-1",
        simulation_only: true,
        action_requested: "dependency_install",
        action_class: "EXTERNAL",
        final_tier: "D",
        reason: "auto_block_and_simulate:D:EXTERNAL",
        safe_replacement_action: "lockfile_analysis",
        target_files: [],
        snapshots: {},
        rollback_commands: [],
        codex_dry_run_preview: "codex exec --dry-run 'npm install'",
      },
      { projectRoot }
    );
    expect(manifest.schema).toBe("ghostclaw.simulation_manifest.v3_2");
    expect(manifest.manifest_id).toMatch(/^SM-/);
  });

  it("zeroHash returns 64 zeros", () => {
    expect(zeroHash()).toBe("0".repeat(64));
  });
});

describe("Codex Sidecar", () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await makeTempProject();
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it("Tier A action produces allowed_dry_run and outbox packet", async () => {
    const msg = makeA2AMessage("repo_scan");
    const result = await runCodexSidecar(msg, { projectRoot });
    expect(result.status).toBe("allowed_dry_run");
    expect(result.tier).toBe("A");
    expect(result.outbox_packet_id).toBeDefined();
    expect(result.manifest_id).toBeDefined();
    expect(result.codex_dry_run_preview).toContain("codex");
  });

  it("Tier D action is blocked_simulated with manifest", async () => {
    const msg = makeA2AMessage("dependency_install");
    const result = await runCodexSidecar(msg, { projectRoot });
    expect(result.status).toBe("blocked_simulated");
    expect(result.tier).toBe("D");
    expect(result.safe_replacement).toBe("lockfile_analysis");
    expect(result.manifest_id).toBeDefined();
    expect(result.outbox_packet_id).toBeDefined();
  });

  it("Tier X action is blocked_simulated with safe replacement", async () => {
    const msg = makeA2AMessage("generic_push");
    const result = await runCodexSidecar(msg, { projectRoot });
    expect(result.status).toBe("blocked_simulated");
    expect(result.tier).toBe("X");
    expect(result.safe_replacement).toBe("staging_dry_run");
  });

  it("allowRealExec=true still stops at dry-run preview", async () => {
    const msg = makeA2AMessage("allowed_path_code_patch", ["GHOSTCLAW/a2a-hermes-codex-bridge/router.ts"]);
    const result = await runCodexSidecar(msg, { projectRoot, allowRealExec: true });
    expect(result.status).toBe("allowed_dry_run");
    expect(result.tier).toBe("B");
    expect(result.codex_dry_run_preview).toContain("Real exec flag set");
  });

  it("forbidden path write is hard blocked", async () => {
    const msg = makeA2AMessage("write_module", [".env"]);
    const result = await runCodexSidecar(msg, { projectRoot });
    expect(result.status).toBe("blocked_simulated");
    expect(result.tier).toBe("X");
  });
});
