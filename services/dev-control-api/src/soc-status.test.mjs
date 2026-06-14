import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getSocStatus, writeSocDryRun } from "./soc-status.mjs";

let tempRoot;

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = undefined;
  }
});

async function makeEvidenceRoot() {
  tempRoot = await mkdtemp(path.join(tmpdir(), "sirinx-soc-evidence-"));
  return tempRoot;
}

describe("SOC status contract", () => {
  it("returns a local-only Mac snapshot without enabling Telegram delivery", async () => {
    const evidenceRoot = await makeEvidenceRoot();
    await writeFile(
      path.join(evidenceRoot, "telegram-line-recipient-token.md"),
      "- [x] no message-send smoke before final target approval\n",
      "utf8"
    );

    const status = await getSocStatus({
      target: "mac-local",
      evidenceRoot,
      collectors: {
        cpu: async () => ({ percent: 7.5, loadAverage: [1.1, 1.2, 1.3] }),
        memory: async () => ({ usedGb: 12.25, totalGb: 32, percent: 38.3 }),
        disk: async () => ({ usedGb: 420, totalGb: 926, percent: 45.4 }),
        docker: async () => ({ state: "unavailable", containers: [], note: "docker not running" })
      },
      now: () => new Date("2026-05-26T01:00:00.000Z")
    });

    expect(status.status).toBe("ready-local");
    expect(status.target).toBe("mac-local");
    expect(status.externalWrites).toBe(false);
    expect(status.productionWrites).toBe(false);
    expect(status.customerVisible).toBe(false);
    expect(status.snapshot.cpu.percent).toBe(7.5);
    expect(status.snapshot.docker.state).toBe("unavailable");
    expect(status.telegram.status).toBe("blocked-evidence-incomplete");
    expect(status.telegram.canSend).toBe(false);
    expect(status.truthStates.cpu).toBe("observed");
    expect(status.truthStates.telegram).toBe("blocked");
  });

  it("keeps Ubuntu host install as local install planning when metrics are not observed", async () => {
    const evidenceRoot = await makeEvidenceRoot();
    const status = await getSocStatus({
      target: "ubuntu-docker",
      evidenceRoot,
      collectors: {},
      now: () => new Date("2026-05-26T01:05:00.000Z")
    });

    expect(status.status).toBe("not-installed");
    expect(status.target).toBe("ubuntu-docker");
    expect(status.externalWrites).toBe(false);
    expect(status.installPack.status).toBe("planned-local-only");
    expect(status.telegram.canSend).toBe(false);
    expect(status.truthStates.cpu).toBe("not_run");
    expect(status.truthStates.docker).toBe("not_run");
  });

  it("writes a local A2A dry-run artifact with the final queue count", async () => {
    const evidenceRoot = await makeEvidenceRoot();
    const a2aRoot = path.join(evidenceRoot, "a2a");
    await writeFile(
      path.join(evidenceRoot, "telegram-line-recipient-token.md"),
      "- [x] no message-send smoke before final target approval\n",
      "utf8"
    );

    const result = await writeSocDryRun({
      evidenceRoot,
      a2aRoot,
      collectors: {
        cpu: async () => ({ percent: 7.5, loadAverage: [1.1, 1.2, 1.3] }),
        memory: async () => ({ usedGb: 12.25, totalGb: 32, percent: 38.3 }),
        disk: async () => ({ usedGb: 420, totalGb: 926, percent: 45.4 }),
        docker: async () => ({ state: "unavailable", containers: [], note: "docker not running" })
      },
      now: () => new Date("2026-05-26T01:10:00.000Z")
    });

    const files = await readdir(a2aRoot);
    expect(result.externalWrites).toBe(false);
    expect(files).toContain("latest.json");
    expect(files.some((file) => file.startsWith("soc-20260526T011000Z"))).toBe(true);
    expect(result.status.a2aQueue.itemCount).toBe(1);
  });
});
