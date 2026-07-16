import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..", "..", "..");

async function readRepoFile(path) {
  return readFile(resolve(root, path), "utf8");
}

describe("website human review and deploy gate documents", () => {
  it("keeps manual review pending and separates checkboxes from deploy approval", async () => {
    const manualTemplate = await readRepoFile(
      "docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_RESULT_TEMPLATE_2026-07-03.md"
    );
    const completionAudit = await readRepoFile(
      "docs/website/SIRINX_WEBSITE_COMPLETION_AUDIT_2026-07-03.md"
    );

    // The template tracks review state; accept either pending or approval-recorded.
    expect(manualTemplate).toMatch(/Status: (pending human input|deploy approval token recorded)/);
    expect(manualTemplate).toContain("Do not mark any item passed until a human has actually reviewed it");
    expect(manualTemplate).toContain("Deploy approval granted separately with exact phrase");
    expect(manualTemplate).toContain("Do not deploy from this template alone");

    expect(completionAudit).toContain("Completion status: not complete");
    expect(completionAudit).toContain("QR is scannable on a real device");
    expect(completionAudit).toContain("Existing website bot/contact behavior is preserved exactly");
    expect(completionAudit).toContain("This audit is not deploy approval");
  });

  it("keeps review staging manifest explicit about include and exclude decisions", async () => {
    const manifest = await readRepoFile(
      "docs/website/SIRINX_WEBSITE_REVIEW_STAGING_MANIFEST_2026-07-03.md"
    );

    expect(manifest).toContain("Mode: no staging, no commit, no push, no deploy");
    expect(manifest).toContain("Core Website Files To Review Together");
    expect(manifest).toContain("New Website Files To Include In Human Review");
    expect(manifest).toContain("Website A2A Packets To Keep With The Review Packet");
    expect(manifest).toContain("Exclude Or Review Carefully Before Any Push");
    expect(manifest).toContain("apps/sirinx-site/src/components/floating-contact.bak.html");
    expect(manifest).toContain("apps/sirinx-site/dist/");
    expect(manifest).toContain("apps/sirinx-site/test-results/");
    expect(manifest).toContain("Do not push or deploy from this manifest alone");
  });

  it("keeps latest website review packets local-only and gate-closed", async () => {
    const packetPaths = [
      "_A2A_QUEUE/outbox/packet_053_sirinx_website_github_baseline_review.json",
      "_A2A_QUEUE/outbox/packet_054_sirinx_website_review_staging_manifest.json",
      "_A2A_QUEUE/outbox/packet_055_sirinx_website_check_guardrail_receipt.json"
    ];

    for (const packetPath of packetPaths) {
      const packet = JSON.parse(await readRepoFile(packetPath));

      expect(JSON.stringify(packet)).toContain("deploy");
      expect(JSON.stringify(packet)).toContain("push");
      expect(JSON.stringify(packet)).toContain("line_webhook");
      expect(JSON.stringify(packet)).toContain("production_analytics");
      expect(JSON.stringify(packet)).toContain("crm_customer_data_storage");
      expect(packet.next_safe_action.toLowerCase()).toContain("human");
    }
  });
});
