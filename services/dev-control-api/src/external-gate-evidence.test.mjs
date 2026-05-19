import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getExternalGateEvidenceStatus } from "./external-gate-evidence.mjs";

let tempRoot;

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = undefined;
  }
});

async function makeEvidenceRoot() {
  tempRoot = await mkdtemp(path.join(tmpdir(), "sirinx-gate-evidence-"));
  return tempRoot;
}

describe("external gate evidence status", () => {
  it("reports missing evidence files without enabling external execution", async () => {
    const evidenceRoot = await makeEvidenceRoot();
    const status = await getExternalGateEvidenceStatus({ evidenceRoot });

    expect(status.status).toBe("blocked-evidence-incomplete");
    expect(status.externalWrites).toBe(false);
    expect(status.canExecuteExternally).toBe(false);
    expect(status.summary).toMatchObject({
      gates: 5,
      ready: 0,
      blocked: 5,
      missingEvidenceFiles: 5,
      unsafe: 0
    });
  });

  it("reports complete evidence as ready for human review only", async () => {
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

    const status = await getExternalGateEvidenceStatus({ evidenceRoot });
    const codexGate = status.results.find((result) => result.id === "codex-mobile-qr-mfa");

    expect(codexGate.status).toBe("ready-for-human-review");
    expect(codexGate.ready).toBe(true);
    expect(status.summary.ready).toBe(1);
    expect(status.canExecuteExternally).toBe(false);
    expect(status.externalWrites).toBe(false);
  });

  it("blocks secret-like evidence content", async () => {
    const evidenceRoot = await makeEvidenceRoot();
    const secretLikeValue = `${["TELEGRAM", "BOT", "TOKEN"].join("_")}=abc:defghijklmnopqrstuvwxyz`;
    await writeFile(path.join(evidenceRoot, "telegram-line-recipient-token.md"), secretLikeValue, "utf8");

    const status = await getExternalGateEvidenceStatus({ evidenceRoot });
    const messagingGate = status.results.find((result) => result.id === "telegram-line-recipient-token");

    expect(status.status).toBe("blocked-unsafe-evidence");
    expect(status.summary.unsafe).toBe(1);
    expect(messagingGate.unsafe).toBe(true);
    expect(messagingGate.status).toBe("unsafe-secret-like-content");
  });
});
