import { describe, expect, it } from "vitest";
import { getSolarOpsContract } from "./solar-ops-contract.mjs";

describe("solar ops entity contract", () => {
  it("maps sirinx-solar-energy entities into a local-only contract", () => {
    const contract = getSolarOpsContract();

    expect(contract.status).toBe("ready-local-solar-ops-contract");
    expect(contract.contractVersion).toBe("2026-05-20.solar-ops-contract.v1");
    expect(contract.externalWrites).toBe(false);
    expect(contract.supabaseWrites).toBe(false);
    expect(contract.summary.entities).toBe(8);
    expect(contract.entities.map((entity) => entity.id)).toEqual([
      "lead",
      "customer-profile",
      "installation-project",
      "contractor-profile",
      "seo-page",
      "campaign",
      "agent-task",
      "system-metric"
    ]);
  });

  it("keeps every entity and relationship non-mutating", () => {
    const contract = getSolarOpsContract();

    expect(contract.entities.every((entity) => entity.externalWrites === false)).toBe(true);
    expect(contract.relationships.every((relationship) => relationship.externalWrites === false)).toBe(true);
    expect(contract.summary.migrationReady).toBe(false);
  });

  it("blocks direct Supabase, schema, mock PII, and Cloudflare imports", () => {
    const contract = getSolarOpsContract();

    expect(contract.blockedImports.map((item) => item.id)).toEqual([
      "supabase-service-import",
      "database-schema-apply",
      "legacy-mock-pii-copy",
      "cloudflare-worker-deploy"
    ]);
    expect(contract.blockedImports.every((item) => item.status === "blocked")).toBe(true);
    expect(contract.blockedImports.every((item) => item.requiresHumanApproval === true)).toBe(true);
  });

  it("does not copy legacy mock contact values into the contract", () => {
    const serialized = JSON.stringify(getSolarOpsContract());

    expect(serialized).not.toContain("081-234-5678");
    expect(serialized).not.toContain("abc@example.com");
    expect(serialized).not.toContain("คุณสมชาย");
    expect(serialized).not.toContain("คุณประยุทธ์");
  });
});
