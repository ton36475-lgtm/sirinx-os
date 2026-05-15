import type { CompatibilityCheck, DesignRecommendation, RoiResult } from "./types.js";

export interface ClaimGuard {
  status: "draft-not-for-final-quote";
  finalQuoteAllowed: boolean;
  blockers: string[];
  forbiddenClaims: string[];
  requiredVerifications: string[];
  disclaimers: string[];
}

const forbiddenClaims = [
  "guaranteed savings",
  "guaranteed ROI",
  "guaranteed payback",
  "guaranteed approval",
  "zero downtime",
  "no-ban",
  "final utility compliance"
];

export function buildClaimGuard(
  design: DesignRecommendation,
  roi: RoiResult,
  compliance: CompatibilityCheck[]
): ClaimGuard {
  const blockers = compliance
    .filter((check) => check.severity === "blocker" && !check.passed)
    .map((check) => `${check.label}: ${check.explanation}`);

  return {
    status: "draft-not-for-final-quote",
    finalQuoteAllowed: false,
    blockers,
    forbiddenClaims,
    requiredVerifications: [
      "Refresh official PEA/MEA inverter approval status before final quote.",
      "Verify anti-islanding and export-limitation requirements against the actual utility connection.",
      "Confirm battery BMS compatibility with inverter firmware and OEM documentation.",
      "Replace tariff, yield, CAPEX, and ROI assumptions with measured bill and site survey data.",
      "Record engineer sign-off before customer handoff or purchase-order use."
    ],
    disclaimers: [
      "Savings, ROI, payback, and cashflow are estimates, not guarantees.",
      "Compliance status is a rule-engine draft until official sources and site evidence are refreshed.",
      "This proposal is not a binding final quote.",
      `Current modeled monthly savings are THB ${roi.monthlySavingsThb.value.toLocaleString()} from ${roi.monthlySavingsThb.source}.`,
      `Current design uses ${design.inverter.brand} ${design.inverter.model}; approval must be refreshed before procurement.`
    ]
  };
}

export function findForbiddenClaimText(text: string): string[] {
  const normalized = text.toLowerCase();
  return forbiddenClaims.filter((claim) => normalized.includes(claim));
}
