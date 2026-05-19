import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getExternalGateRunnerStatus } from "./external-gate-runner.mjs";

let tempRoot;

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = undefined;
  }
});

async function makeEvidenceRoot() {
  tempRoot = await mkdtemp(path.join(tmpdir(), "sirinx-gate-runner-"));
  return tempRoot;
}

describe("external gate runner status", () => {
  it("keeps every gate non-executable without evidence", async () => {
    const evidenceRoot = await makeEvidenceRoot();
    const status = await getExternalGateRunnerStatus({ evidenceRoot });

    expect(status.status).toBe("blocked-external-execution");
    expect(status.externalWrites).toBe(false);
    expect(status.canExecuteNow).toBe(false);
    expect(status.summary).toMatchObject({
      gates: 5,
      blocked: 5,
      externalWrites: false,
      executableNow: 0
    });
    expect(status.runs.every((run) => run.canExecuteNow === false && run.externalWrites === false)).toBe(true);
  });

  it("tracks the sirinx-os GitHub publish gate as blocked from push commands", async () => {
    const evidenceRoot = await makeEvidenceRoot();
    const status = await getExternalGateRunnerStatus({ evidenceRoot });
    const publishGate = status.runs.find((run) => run.id === "sirinx-os-github-publish");

    expect(publishGate).toBeTruthy();
    expect(publishGate.status).toBe("blocked-evidence-incomplete");
    expect(publishGate.localChecks).toContain("git remote -v");
    expect(publishGate.blockedExternalActions).toEqual(expect.arrayContaining(["git push", "gh pr create"]));
  });

  it("does not become externally executable even when one gate evidence is ready", async () => {
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

    const status = await getExternalGateRunnerStatus({ evidenceRoot });
    const codexGate = status.runs.find((run) => run.id === "codex-mobile-qr-mfa");

    expect(codexGate.status).toBe("ready-for-human-review");
    expect(codexGate.canExecuteNow).toBe(false);
    expect(status.canExecuteNow).toBe(false);
    expect(status.summary.executableNow).toBe(0);
  });
});
