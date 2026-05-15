import { describe, expect, test } from "vitest";
import { equipmentCatalog, generateSolarProposal, sampleCustomer, thailandRules } from "./index.js";
import type { EquipmentCatalog } from "./types.js";

describe("Solar Energy Intelligence Phase 1", () => {
  test("generates a reproducible hybrid ESS proposal", () => {
    const proposal = generateSolarProposal();

    expect(proposal.design.mode).toBe("hybrid-ess");
    expect(proposal.design.inverter.brand).toBe("Deye");
    expect(proposal.design.battery?.model).toBe("GSL051314A-B-GBP2");
    expect(proposal.design.pvSizeKwp.value).toBeGreaterThan(0);
    expect(proposal.roi.annualSavingsThb.value).toBeGreaterThan(0);
    expect(proposal.thailandComplianceSummary.every((check) => check.passed)).toBe(true);
  });

  test("blocks incompatible phase recommendations", () => {
    const singlePhaseCustomer = {
      ...sampleCustomer,
      phase: "single" as const,
      backupLoadKw: { ...sampleCustomer.backupLoadKw, value: 6 },
      backupHoursTarget: { ...sampleCustomer.backupHoursTarget, value: 3 }
    };

    const proposal = generateSolarProposal(singlePhaseCustomer);
    expect(proposal.design.inverter.phase).toBe("single");
    expect(proposal.design.compatibility.find((check) => check.id === "phase-match")?.passed).toBe(true);
  });

  test("does not select inverters without PEA approval when the rule is enabled", () => {
    const catalog: EquipmentCatalog = {
      ...equipmentCatalog,
      inverters: equipmentCatalog.inverters.map((inverter) => {
        if (inverter.id !== "deye-sun-10k-sg04lp3-eu") {
          return inverter;
        }

        return {
          ...inverter,
          peaRegistration: { ...inverter.peaRegistration!, approved: false }
        };
      })
    };

    expect(() => generateSolarProposal(sampleCustomer, catalog, thailandRules)).toThrow(/No eligible/);
  });
});
