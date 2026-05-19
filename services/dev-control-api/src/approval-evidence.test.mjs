import { describe, expect, it } from "vitest";
import { getApprovalEvidenceSnapshot, writeApprovalEvidenceSnapshot } from "./approval-evidence.mjs";

describe("approval evidence snapshot writer", () => {
  it("builds a local approval queue snapshot without external writes", () => {
    const snapshot = getApprovalEvidenceSnapshot();

    expect(snapshot.status).toBe("ready-local-approval-evidence");
    expect(snapshot.externalWrites).toBe(false);
    expect(snapshot.summary.items).toBeGreaterThan(0);
    expect(snapshot.items.some((item) => item.actionId === "release-preflight")).toBe(true);
  });

  it("supports dry-run file output without writing", async () => {
    const result = await writeApprovalEvidenceSnapshot({ dryRun: true });

    expect(result.status).toBe("dry-run-ready");
    expect(result.didWrite).toBe(false);
    expect(result.wouldWrite).toBe(true);
    expect(result.externalWrites).toBe(false);
    expect(result.targetPath).toContain("Approval Evidence Snapshots");
  });

  it("blocks local file writes without explicit confirmation", async () => {
    const result = await writeApprovalEvidenceSnapshot();

    expect(result.status).toBe("blocked-confirm-local-write-required");
    expect(result.didWrite).toBe(false);
    expect(result.externalWrites).toBe(false);
  });
});
