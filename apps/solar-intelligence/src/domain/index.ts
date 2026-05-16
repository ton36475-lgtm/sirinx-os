import { equipmentCatalog, sampleCustomer, thailandRules } from "./catalog.js";
import { commercialBessCatalog, sampleCommercialBessProject } from "./ci-bess-catalog.js";
import { designCommercialBessSystem } from "./ci-bess-engine.js";
import { recommendDesign } from "./design-engine.js";
import { buildEnergyBehavior, validateIntake } from "./energy-model.js";
import { buildLoadBreakdown, classifySystemSize, systemSizeBands } from "./load-taxonomy.js";
import { buildCustomerUsageProfile } from "./usage-profile.js";
import { createProposal } from "./proposal.js";
import { calculateRoi } from "./roi-engine.js";
export { buildClaimGuard, findForbiddenClaimText } from "./claim-guard.js";
export { buildCompetitorIntelligence } from "./competitor-intelligence.js";
export {
  evaluateSolisLoadControlProposal,
  solisApiOperatingFacts,
  solisLoadBalanceAgentTeam
} from "./solis-load-control.js";
export { generateCommercialQuotation } from "./quotation.js";
import type { BusinessRules, CustomerIntake, EquipmentCatalog, Proposal } from "./types.js";

export function generateSolarProposal(
  customer: CustomerIntake = sampleCustomer,
  catalog: EquipmentCatalog = equipmentCatalog,
  rules: BusinessRules = thailandRules
): Proposal {
  const errors = validateIntake(customer);
  if (errors.length) {
    throw new Error(`Invalid customer intake: ${errors.join(" ")}`);
  }

  const behavior = buildEnergyBehavior(customer, rules);
  const design = recommendDesign(customer, behavior, catalog, rules);
  const roi = calculateRoi(customer, behavior, design, rules);
  return createProposal(customer, behavior, design, roi);
}

export { equipmentCatalog, sampleCustomer, thailandRules };
export { commercialBessCatalog, designCommercialBessSystem, sampleCommercialBessProject };
export { buildLoadBreakdown, classifySystemSize, systemSizeBands };
export { buildCustomerUsageProfile };
export type * from "./types.js";
export type * from "./ci-bess-types.js";
export type * from "./competitor-intelligence.js";
export type * from "./quotation.js";
export type * from "./solis-load-control.js";
