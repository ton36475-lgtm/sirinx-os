import type { CustomerIntake, Proposal, RoiResult, DesignRecommendation, EnergyBehaviorModel } from "./types.js";
import { buildClaimGuard } from "./claim-guard.js";

function makeId(customerId: string): string {
  return `solar-proposal-${customerId}-${new Date().toISOString().slice(0, 10)}`;
}

export function createProposal(
  customer: CustomerIntake,
  behavior: EnergyBehaviorModel,
  design: DesignRecommendation,
  roi: RoiResult
): Proposal {
  const blockers = design.compatibility.filter((check) => check.severity === "blocker" && !check.passed);
  const thailandComplianceSummary = design.compatibility.filter((check) =>
    ["pea-approval", "anti-islanding", "export-limit", "phase-match"].includes(check.id)
  );
  const claimGuard = buildClaimGuard(design, roi, thailandComplianceSummary);
  const backupLine =
    design.mode === "hybrid-ess" && design.battery && design.batteryModules
      ? `${design.batteryModules.value} x ${design.battery.model} for ${design.batteryUsableKwh?.value ?? 0} usable kWh`
      : "No ESS backup selected";

  return {
    id: makeId(customer.customerId),
    generatedAt: new Date().toISOString(),
    customer,
    behavior,
    design,
    roi,
    claimGuard,
    executiveSummary: [
      `${customer.siteName} is modeled as a ${design.mode} solar design with ${design.pvSizeKwp.value} kWp PV and ${design.inverter.model}.`,
      `Estimated monthly savings are THB ${roi.monthlySavingsThb.value.toLocaleString()} with simple payback around ${roi.simplePaybackYears.value} years; these are assumptions, not guarantees.`,
      `Backup plan: ${backupLine}.`,
      blockers.length
        ? `Do not issue final quote until ${blockers.length} blocker(s) are resolved.`
        : "No blocking compatibility issue is present in the current rule set, but official approvals and site evidence must still be refreshed."
    ].join(" "),
    billOfMaterials: [
      {
        item: `${design.inverter.brand} ${design.inverter.model}`,
        quantity: 1,
        notes: `${design.inverter.ratedPowerKw} kW ${design.inverter.phase}-phase ${design.inverter.category} inverter`
      },
      {
        item: "550W-class PV module",
        quantity: Math.ceil((design.pvSizeKwp.value * 1000) / 550),
        notes: "Panel brand/model to be selected from approved installer catalog."
      },
      ...(design.battery && design.batteryModules
        ? [
            {
              item: `${design.battery.brand} ${design.battery.model}`,
              quantity: design.batteryModules.value,
              notes: `${design.battery.nominalKwh} kWh LiFePO4, ${design.battery.ipRating}, ${design.battery.communicationPorts.join("/")}`
            }
          ]
        : []),
      {
        item: "Protection, wiring, mounting, export limit/CT accessories",
        quantity: 1,
        notes: "Final engineering BOM depends on site survey, roof type, ACDB layout, and utility requirements."
      }
    ],
    thailandComplianceSummary,
    nextActions: [
      "Verify latest PEA Smart List status for inverter model before final quote.",
      "Replace tariff assumption with measured bill and TOU rate if available.",
      "Perform site survey for roof shading, structure, ACDB, grounding, and backup-load separation.",
      "Confirm battery BMS protocol profile with inverter firmware before procurement.",
      "Keep this proposal in draft status until claim guard verifications are complete."
    ]
  };
}
