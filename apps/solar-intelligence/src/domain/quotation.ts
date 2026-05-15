import { designCommercialBessSystem, generateSolarProposal } from "./index.js";
import type { CommercialBessDesign } from "./ci-bess-types.js";
import type { CustomerUsageProfile } from "./usage-profile.js";
import { buildCustomerUsageProfile } from "./usage-profile.js";
import type { Proposal } from "./types.js";

export interface QuotationLineItem {
  section: string;
  description: string;
  quantity: number;
  unit: string;
  unitPriceThb: number;
  totalThb: number;
  notes: string;
}

export interface QuotationOptions {
  customerName?: string;
  companyName?: string;
  projectName?: string;
  includeVat?: boolean;
  marginPercent?: number;
  discountThb?: number;
  validityDays?: number;
}

export interface CommercialQuotation {
  quotationNo: string;
  generatedAt: string;
  customerName: string;
  companyName: string;
  projectName: string;
  currency: "THB";
  validityDays: number;
  lines: QuotationLineItem[];
  subtotalThb: number;
  marginThb: number;
  discountThb: number;
  vatThb: number;
  grandTotalThb: number;
  assumptions: string[];
  exclusions: string[];
  paymentTerms: string[];
  deliveryMilestones: string[];
  competitorAwareDifferentiators: string[];
}

function round(value: number): number {
  return Math.round(value);
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  }
  return fallback;
}

function line(
  section: string,
  description: string,
  quantity: number,
  unit: string,
  unitPriceThb: number,
  notes: string
): QuotationLineItem {
  return {
    section,
    description,
    quantity,
    unit,
    unitPriceThb,
    totalThb: round(quantity * unitPriceThb),
    notes
  };
}

function quotationNo(): string {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 12);
  return `SIRINX-Q-${stamp}`;
}

export function generateCommercialQuotation(
  proposal: Proposal = generateSolarProposal(),
  ciBess: CommercialBessDesign = designCommercialBessSystem(),
  usage: CustomerUsageProfile = buildCustomerUsageProfile({ siteName: ciBess.project.siteName }),
  options: QuotationOptions = {}
): CommercialQuotation {
  const projectName = options.projectName || ciBess.project.siteName || proposal.customer.siteName;
  const marginPercent = asNumber(options.marginPercent, 12);
  const discountThb = asNumber(options.discountThb, 0);
  const includeVat = asBoolean(options.includeVat, true);
  const validityDays = asNumber(options.validityDays, 15);
  const lines = [
    line(
      "Solar PV",
      `PV engineering, equipment package, installation and AC/DC integration (${proposal.design.pvSizeKwp.value} kWp)`,
      proposal.design.pvSizeKwp.value,
      "kWp",
      37000,
      "Final module layout and roof structure to be confirmed by site survey."
    ),
    line(
      "Solar PV",
      `${proposal.design.inverter.brand} ${proposal.design.inverter.model} inverter package`,
      1,
      "lot",
      390000,
      "PEA/MEA approval status to be refreshed before purchase order."
    ),
    line(
      "C&I BESS",
      `${ciBess.battery.brand} ${ciBess.battery.model}`,
      ciBess.battery.nominalEnergyKwh,
      "kWh",
      16500,
      `${ciBess.battery.parallelCells}P${ciBess.battery.seriesCells}S ${ciBess.battery.chemistry}, ${ciBess.nominalDcVoltageV.value} V nominal.`
    ),
    line(
      "C&I BESS",
      `PCS ${ciBess.pcs.ratedPowerKw} kW with grid-following/grid-forming configuration`,
      ciBess.pcs.ratedPowerKw,
      "kW",
      11500,
      "Includes PCS parameterization; final grid code settings require utility/site confirmation."
    ),
    line(
      "Critical Load",
      `STS critical-load transfer package <=${ciBess.sts.transferTimeMs} ms`,
      1,
      "lot",
      950000,
      "Includes synchronization verification and critical-load transfer testing scope."
    ),
    line(
      "EMS / SCADA",
      "EMS logic, anti-export control, metering map, dashboards and commissioning mode",
      1,
      "lot",
      680000,
      `Usage model: ${usage.dailyEnergyKwh} kWh/day, peak ${usage.estimatedPeakKw} kW.`
    ),
    line(
      "Engineering",
      "Detailed engineering, BOQ, SLD, protection review, load segmentation and method statements",
      1,
      "lot",
      520000,
      "Includes engineering assumptions register and ObsidianBrain project memory."
    ),
    line(
      "Commissioning",
      "Commissioning, test evidence pack, operator training and handover",
      1,
      "lot",
      420000,
      `${ciBess.commissioningGates.length} commissioning gates included.`
    ),
    line(
      "O&M",
      "First-year remote monitoring support and quarterly engineering review",
      1,
      "year",
      240000,
      "Optional; can be converted to multi-year O&M agreement."
    )
  ];
  const subtotalThb = round(lines.reduce((sum, item) => sum + item.totalThb, 0));
  const marginThb = round(subtotalThb * (marginPercent / 100));
  const taxable = Math.max(0, subtotalThb + marginThb - discountThb);
  const vatThb = includeVat ? round(taxable * 0.07) : 0;

  return {
    quotationNo: quotationNo(),
    generatedAt: new Date().toISOString(),
    customerName: options.customerName || "Customer",
    companyName: options.companyName || "Customer Company",
    projectName,
    currency: "THB",
    validityDays,
    lines,
    subtotalThb,
    marginThb,
    discountThb,
    vatThb,
    grandTotalThb: round(taxable + vatThb),
    assumptions: [
      "This quotation is based on preliminary operator inputs and must be finalized after site survey.",
      "Utility approval, export permission, roof/structural condition, cable route, and protection coordination can affect final price.",
      "Battery usable energy, thermal derating, and warranty conditions must be confirmed with OEM documentation.",
      "Savings are estimates; uptime/resilience value is separated from electricity bill savings."
    ],
    exclusions: [
      "Civil works outside stated equipment foundation and cable route assumptions.",
      "Transformer upgrade, utility-side works, or grid interconnection fees unless explicitly added.",
      "Fire authority, insurance, or special compliance fees not stated in line items.",
      "Production downtime cost, crane/lifting constraints, or night work premiums unless surveyed."
    ],
    paymentTerms: [
      "40% upon purchase order and engineering kickoff.",
      "40% upon major equipment delivery to site.",
      "15% upon installation completion.",
      "5% upon commissioning acceptance and handover."
    ],
    deliveryMilestones: [
      "Site survey and detailed engineering: 2-3 weeks.",
      "Procurement and fabrication: 8-12 weeks subject to OEM availability.",
      "Installation: 3-6 weeks depending on site access and shutdown windows.",
      "Commissioning and training: 1-2 weeks."
    ],
    competitorAwareDifferentiators: [
      "Engineering-grade real usage profile by time window and appliance inventory.",
      "C&I BESS + STS critical-load continuity design, not generic rooftop solar.",
      "EMS rule separation for anti-export, peak shaving, TOU, PV self-consumption and backup reserve.",
      "ObsidianBrain knowledge handoff with assumptions, failure cases, commissioning gates and RCA memory."
    ]
  };
}
