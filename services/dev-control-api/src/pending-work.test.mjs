import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getPendingWorkLedger } from "./pending-work.mjs";

let tempRoot;

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = undefined;
  }
});

async function makeEvidenceRoot() {
  tempRoot = await mkdtemp(path.join(tmpdir(), "sirinx-pending-work-"));
  return tempRoot;
}

describe("pending work ledger", () => {
  it("keeps all pending work local-only and non-executable without evidence", async () => {
    const evidenceRoot = await makeEvidenceRoot();
    const ledger = await getPendingWorkLedger({ evidenceRoot });

    expect(ledger.status).toBe("blocked-external-gates");
    expect(ledger.externalWrites).toBe(false);
    expect(ledger.canExecuteNow).toBe(false);
    expect(ledger.mainWebsiteProtected).toBe(true);
    expect(ledger.summary).toMatchObject({
      pendingItems: 5,
      blockedExternalGates: 5,
      readyForHumanReview: 0,
      localOnlyRunnable: 0,
      hiddenBacklog: false,
      externalWrites: false,
      executableNow: 0
    });
    expect(ledger.pendingItems.every((item) => item.externalWrites === false && item.canExecuteNow === false)).toBe(true);
  });

  it("orders the queue by operator execution sequence", async () => {
    const evidenceRoot = await makeEvidenceRoot();
    const ledger = await getPendingWorkLedger({ evidenceRoot });

    expect(ledger.pendingItems.map((item) => item.id)).toEqual([
      "codex-mobile-qr-mfa",
      "sirinx-os-github-publish",
      "telegram-line-recipient-token",
      "solis-readonly-telemetry",
      "cloudflare-bot-management-review"
    ]);
  });

  it("marks ready evidence as human review only, not executable", async () => {
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

    const ledger = await getPendingWorkLedger({ evidenceRoot });
    const codexGate = ledger.pendingItems.find((item) => item.id === "codex-mobile-qr-mfa");

    expect(codexGate.evidenceStatus).toBe("ready-for-human-review");
    expect(codexGate.canExecuteNow).toBe(false);
    expect(ledger.canExecuteNow).toBe(false);
    expect(ledger.summary.readyForHumanReview).toBe(1);
    expect(ledger.summary.executableNow).toBe(0);
  });
});
