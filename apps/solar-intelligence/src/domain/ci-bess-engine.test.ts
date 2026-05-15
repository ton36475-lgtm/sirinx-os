import { describe, expect, test } from "vitest";
import {
  buildCompetitorIntelligence,
  designCommercialBessSystem,
  generateCommercialQuotation,
  generateSolarProposal
} from "./index.js";
import { buildCommercialBessDeepDiveTopics } from "../obsidian/ci-bess-deep-dive.js";
import { buildLoadBreakdown, classifySystemSize } from "./load-taxonomy.js";
import { buildCustomerUsageProfile } from "./usage-profile.js";

describe("Commercial BESS + PV + STS design intelligence", () => {
  test("calculates HV battery topology and PCS C-rate", () => {
    const design = designCommercialBessSystem();

    expect(design.nominalDcVoltageV.value).toBe(832);
    expect(design.usableEnergyKwh.value).toBeGreaterThan(230);
    expect(design.cRateP.value).toBeGreaterThan(0.47);
    expect(design.cRateP.value).toBeLessThan(0.49);
    expect(design.fullPowerDurationHours.value).toBeGreaterThan(1.8);
  });

  test("marks STS transfer as meeting the critical-load target", () => {
    const design = designCommercialBessSystem();

    expect(design.transferMeetsRequirement).toBe(true);
    expect(design.sts.requiresSyncCheck).toBe(true);
    expect(design.sts.syncSignals).toContain("SYNC1");
  });

  test("creates commissioning gates for field delivery", () => {
    const design = designCommercialBessSystem();
    const gateIds = design.commissioningGates.map((gate) => gate.id);

    expect(gateIds).toContain("insulation-resistance");
    expect(gateIds).toContain("ct-polarity");
    expect(gateIds).toContain("sts-sync-transfer");
    expect(gateIds).toContain("ems-strategy");
  });

  test("provides the complete 20-topic deep knowledge pack", () => {
    const design = designCommercialBessSystem();
    const topics = buildCommercialBessDeepDiveTopics(design);

    expect(topics).toHaveLength(20);
    expect(topics.map((topic) => topic.id)).toEqual([
      "commissioning-engineer-knowledge",
      "ems-logic-step-by-step",
      "power-flow-every-mode",
      "bms-architecture-deep",
      "pcs-control-loop",
      "grid-synchronization",
      "protection-coordination",
      "sizing-methodology",
      "failure-modes-whole-system",
      "root-cause-analysis",
      "scada-integration",
      "modbus-map-architecture",
      "black-start-sequence",
      "island-mode-engineering",
      "thai-utility-compliance",
      "revenue-model-ess",
      "advanced-hybrid-topology",
      "microgrid-engineering",
      "battery-degradation-modeling",
      "complete-epc-workflow"
    ]);
  });

  test("breaks down system size and load power by segment", () => {
    const design = designCommercialBessSystem();
    const breakdown = buildLoadBreakdown(design.project);

    expect(breakdown.sizeClass.id).toBe("ci-small");
    expect(breakdown.totalPeakDemandKw).toBe(210);
    expect(breakdown.criticalLoadKw).toBe(95);
    expect(breakdown.backupEnergyTargetKwh).toBe(190);
    expect(breakdown.segments.map((segment) => segment.priority)).toEqual([
      "critical",
      "essential",
      "ev-or-process",
      "comfort",
      "deferrable"
    ]);
    expect(classifySystemSize(1200).id).toBe("ci-large");
  });

  test("builds real customer usage profile by time window and appliance size", () => {
    const profile = buildCustomerUsageProfile({
      siteName: "Factory usage survey",
      nightKw: 40,
      morningKw: 90,
      solarKw: 140,
      afternoonKw: 120,
      eveningKw: 160,
      lateKw: 80,
      refrigerationQty: 2,
      refrigerationKw: 10,
      refrigerationHours: 24,
      refrigerationDuty: 0.75,
      pumpQty: 2,
      pumpKw: 11,
      pumpHours: 4,
      pumpDuty: 0.5,
      evQty: 2,
      evKw: 7.4,
      evHours: 3
    });

    expect(profile.siteName).toBe("Factory usage survey");
    expect(profile.dailyEnergyKwh).toBe(2510);
    expect(profile.estimatedPeakKw).toBe(160);
    expect(profile.appliances.find((load) => load.id === "refrigeration")?.dailyKwh).toBe(360);
    expect(profile.appliances.find((load) => load.id === "pump")?.estimatedSurgeKw).toBe(66);
    expect(profile.insights.length).toBeGreaterThanOrEqual(4);
  });

  test("generates a real commercial quotation with BOQ, VAT, and delivery terms", () => {
    const quote = generateCommercialQuotation(generateSolarProposal(), designCommercialBessSystem(), buildCustomerUsageProfile(), {
      customerName: "Executive Demo",
      companyName: "SIRINX Customer",
      marginPercent: 10,
      discountThb: 50000,
      includeVat: true
    });

    expect(quote.quotationNo).toMatch(/^SIRINX-Q-/);
    expect(quote.lines.map((line) => line.section)).toContain("Critical Load");
    expect(quote.lines.map((line) => line.section)).toContain("EMS / SCADA");
    expect(quote.vatThb).toBeGreaterThan(0);
    expect(quote.grandTotalThb).toBeGreaterThan(quote.subtotalThb);
    expect(quote.paymentTerms).toHaveLength(4);
    expect(quote.assumptions.join(" ")).toContain("not a binding final quote");
    expect(quote.assumptions.join(" ")).toContain("not guarantees");
  });

  test("builds competitor intelligence for Thailand quotation positioning", () => {
    const intel = buildCompetitorIntelligence();

    expect(intel.competitors.length).toBeGreaterThanOrEqual(6);
    expect(intel.competitors.every((competitor) => competitor.sourceUrl.startsWith("https://"))).toBe(true);
    expect(intel.quotationImplications.join(" ")).toContain("assumptions");
    expect(intel.strategicPositioning.join(" ")).toContain("Energy Engineering Intelligence Platform");
  });
});
