import { describe, expect, it } from "vitest";
import { getLeadCrmContract } from "./lead-crm-contract.mjs";

describe("lead CRM handoff contract", () => {
  it("compares old marketing CRM schemas into a local-only SIRINX lead contract", () => {
    const contract = getLeadCrmContract();

    expect(contract.status).toBe("ready-local-lead-crm-contract");
    expect(contract.contractVersion).toBe("2026-05-20.lead-crm-handoff-contract.v1");
    expect(contract.externalWrites).toBe(false);
    expect(contract.crmWrites).toBe(false);
    expect(contract.supabaseWrites).toBe(false);
    expect(contract.summary).toMatchObject({
      sourceRepos: 2,
      sirinxLeadGroups: 5,
      sourceFieldMappings: 6,
      rejectedRuntimeDependencies: 5,
      handoffStages: 5,
      databaseWorkReady: false
    });
  });

  it("keeps CRM and database writes behind approval gates", () => {
    const contract = getLeadCrmContract();
    const externalStage = contract.handoffStages.find((stage) => stage.id === "external-crm-write");
    const approvalStage = contract.handoffStages.find((stage) => stage.id === "target-specific-approval");

    expect(externalStage).toMatchObject({
      externalWriteAllowed: false,
      approvalRequired: true,
      currentApi: "not-enabled"
    });
    expect(approvalStage?.approvalRequired).toBe(true);
    expect(contract.rejectedRuntimeDependencies.every((item) => item.status === "blocked")).toBe(true);
  });

  it("maps current SIRINX lead field groups needed before handoff", () => {
    const contract = getLeadCrmContract();

    expect(contract.sirinxLeadGroups.map((group) => group.id)).toEqual([
      "contact",
      "solar-qualification",
      "attribution",
      "quality",
      "audit"
    ]);
    expect(contract.sirinxLeadGroups.find((group) => group.id === "audit")?.canonicalFields).toEqual(
      expect.arrayContaining(["leadEvents", "automationRuns", "approvalEvidence"])
    );
  });

  it("keeps old domain terminology and raw credential names out of the contract output", () => {
    const serialized = JSON.stringify(getLeadCrmContract()).toLowerCase();

    expect(serialized).not.toContain("casino");
    expect(serialized).not.toContain("lottery");
    expect(serialized).not.toContain("whale");
    expect(serialized).not.toContain("hubspotapikey");
    expect(serialized).not.toContain("metaaccesstoken");
  });
});
