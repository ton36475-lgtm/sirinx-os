import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { CommercialBessDesign } from "../domain/ci-bess-types.js";
import type { CompetitorIntelligence } from "../domain/competitor-intelligence.js";
import type { CommercialQuotation } from "../domain/quotation.js";
import type { Battery, Inverter, Proposal } from "../domain/types.js";
import { buildCommercialBessDeepDiveTopics, renderDeepDiveTopic, slug as topicSlug } from "./ci-bess-deep-dive.js";
import { buildLoadBreakdown, systemSizeBands } from "../domain/load-taxonomy.js";
import { buildCustomerUsageProfile } from "../domain/usage-profile.js";

const defaultVaultRoot = "/Users/sirinx/Documents/Obsidian Vault/SIRINX/solar-business";

function yamlValue(value: string | number | boolean | string[] | undefined): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => `"${item}"`).join(", ")}]`;
  }
  if (typeof value === "string") {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return String(value);
}

function frontmatter(data: Record<string, string | number | boolean | string[] | undefined>): string {
  const lines = Object.entries(data)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${yamlValue(value)}`);
  return `---\n${lines.join("\n")}\n---`;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function inverterNote(inverter: Inverter): string {
  return `${frontmatter({
    type: "inverter",
    brand: inverter.brand,
    model: inverter.model,
    phase: inverter.phase,
    category: inverter.category,
    battery_voltage: inverter.batteryVoltageClass,
    power_kw: inverter.ratedPowerKw,
    pea_approved: inverter.peaRegistration?.approved,
    tags: ["solar", "inverter", "thailand-compliance"]
  })}

# ${inverter.brand} ${inverter.model}

## Compatibility

- Phase: ${inverter.phase}
- Category: ${inverter.category}
- Battery voltage class: ${inverter.batteryVoltageClass ?? "not applicable"}
- BMS communication: ${inverter.supportedBatteryComms.join(", ") || "not applicable"}
- Export limit supported: ${inverter.exportLimitSupported ? "yes" : "no"}

## Thailand Compliance

- PEA approval: ${inverter.peaRegistration?.approved ? "approved in seeded source" : "not verified"}
- Source: ${inverter.peaRegistration?.sourceUrl ?? "not attached"}
- Source label: ${inverter.peaRegistration?.sourceLabel ?? "not attached"}

## Constraints

- Re-check PEA Smart List before final customer quotation.
- Match inverter phase to site phase.
- Confirm anti-islanding and export limitation settings during commissioning.

## Failure Cases

- [[failure-cases/bms-protocol-mismatch]]
- [[failure-cases/export-limit-not-commissioned]]
`;
}

export function batteryNote(battery: Battery): string {
  return `${frontmatter({
    type: "battery",
    brand: battery.brand,
    model: battery.model,
    chemistry: battery.chemistry,
    nominal_kwh: battery.nominalKwh,
    usable_kwh: battery.usableKwh,
    ip_rating: battery.ipRating,
    cycle_life: battery.cycleLife,
    tags: ["solar", "battery", "lifepo4", "ess"]
  })}

# ${battery.brand} ${battery.model}

## Core Specs

- Chemistry: ${battery.chemistry}
- Nominal capacity: ${battery.nominalKwh} kWh
- Usable capacity assumption: ${battery.usableKwh} kWh
- Voltage: ${battery.voltageV} V
- Cycle life: ${battery.cycleLife}
- Recommended DoD: ${battery.recommendedDod * 100}%
- IP rating: ${battery.ipRating}
- Communication: ${battery.communicationPorts.join(", ")}
- Parallel expansion: up to ${battery.maxParallelModules} modules

## Compatibility

- Validate CAN/RS485 profile with inverter firmware before procurement.
- Add integration test result to customer proposal before final handoff.

## Source

${battery.sourceUrl}

## Failure Cases

- [[failure-cases/bms-protocol-mismatch]]
- [[failure-cases/battery-indoor-outdoor-rating]]
`;
}

export function proposalNote(proposal: Proposal): string {
  return `${frontmatter({
    type: "customer-profile",
    customer_id: proposal.customer.customerId,
    province: proposal.customer.province,
    utility: proposal.customer.utility,
    system_mode: proposal.design.mode,
    pv_kwp: proposal.design.pvSizeKwp.value,
    payback_years: proposal.roi.simplePaybackYears.value,
    tags: ["solar", "proposal", "roi-model"]
  })}

# ${proposal.customer.siteName}

## Executive Summary

${proposal.executiveSummary}

## Energy Behavior

- Monthly consumption: ${proposal.behavior.monthlyConsumptionKwh.value} kWh (${proposal.behavior.monthlyConsumptionKwh.kind})
- Daytime: ${proposal.behavior.daytimeKwhPerDay.value} kWh/day
- Nighttime: ${proposal.behavior.nighttimeKwhPerDay.value} kWh/day
- Backup energy: ${proposal.behavior.backupEnergyKwh.value} kWh

## System Design

- Mode: ${proposal.design.mode}
- PV size: ${proposal.design.pvSizeKwp.value} kWp
- Inverter: [[products/inverters/${slug(`${proposal.design.inverter.brand}-${proposal.design.inverter.model}`)}]]
- Battery: ${
    proposal.design.battery
      ? `[[products/battery/${slug(`${proposal.design.battery.brand}-${proposal.design.battery.model}`)}]]`
      : "none"
  }

## ROI Model

- Monthly savings: THB ${proposal.roi.monthlySavingsThb.value}
- Annual savings: THB ${proposal.roi.annualSavingsThb.value}
- CAPEX: THB ${proposal.roi.capexThb.value}
- Simple payback: ${proposal.roi.simplePaybackYears.value} years
- Resilience: ${proposal.roi.resilienceValue.autonomyHours} hours at ${proposal.roi.resilienceValue.backupLoadKw} kW critical load

## Thailand Compliance

${proposal.thailandComplianceSummary
  .map((check) => `- ${check.passed ? "PASS" : "CHECK"}: ${check.label} - ${check.explanation}`)
  .join("\n")}

## Assumptions

${proposal.design.assumptions.map((item) => `- ${item}`).join("\n")}

## Next Actions

${proposal.nextActions.map((item) => `- [ ] ${item}`).join("\n")}
`;
}

export async function syncProposalToObsidian(
  proposal: Proposal,
  vaultRoot = defaultVaultRoot
): Promise<string[]> {
  const writes: Array<{ path: string; content: string }> = [
    {
      path: join(vaultRoot, "products", "inverters", `${slug(`${proposal.design.inverter.brand}-${proposal.design.inverter.model}`)}.md`),
      content: inverterNote(proposal.design.inverter)
    },
    {
      path: join(vaultRoot, "customer-profiles", `${slug(proposal.customer.siteName)}.md`),
      content: proposalNote(proposal)
    }
  ];

  if (proposal.design.battery) {
    writes.push({
      path: join(vaultRoot, "products", "battery", `${slug(`${proposal.design.battery.brand}-${proposal.design.battery.model}`)}.md`),
      content: batteryNote(proposal.design.battery)
    });
  }

  writes.push(
    {
      path: join(vaultRoot, "regulations", "thailand-grid-compliance.md"),
      content: `${frontmatter({
        type: "regulation",
        region: "Thailand",
        tags: ["solar", "regulation", "pea", "anti-islanding"]
      })}

# Thailand Grid Compliance

## Current Operating Rules

- Use PEA-registered inverter models for PEA-connected projects.
- Require anti-islanding evidence for grid-connected systems.
- Treat export limitation as required unless an approved export agreement exists.
- Re-check official utility lists before final customer quote.

## Sources

- PEA Smart List: https://smartlist.pea.co.th/public/products/inverter/pdf
`
    },
    {
      path: join(vaultRoot, "failure-cases", "bms-protocol-mismatch.md"),
      content: `${frontmatter({
        type: "failure-case",
        tags: ["solar", "battery", "bms", "qa"]
      })}

# BMS Protocol Mismatch

## Symptom

Battery and inverter both advertise CAN/RS485, but closed-loop communication fails because firmware profiles do not match.

## Prevention

- Confirm exact inverter firmware and battery protocol profile.
- Run commissioning communication test before customer handoff.
- Document pass/fail in [[installation/commissioning-checklist]].
`
    }
  );

  for (const write of writes) {
    await mkdir(dirname(write.path), { recursive: true });
    await writeFile(write.path, write.content, "utf8");
  }

  return writes.map((write) => write.path);
}

export function commercialBessArchitectureNote(design: CommercialBessDesign): string {
  return `${frontmatter({
    type: "engineering-system",
    project_id: design.project.projectId,
    system: "Hybrid PV + BESS + STS + Critical Load",
    dc_voltage_nominal: design.nominalDcVoltageV.value,
    bess_kwh: design.battery.nominalEnergyKwh,
    pcs_kw: design.pcs.ratedPowerKw,
    tags: ["solar", "ci-bess", "critical-load", "sts", "ems"]
  })}

# ${design.project.siteName}

## System Architecture

This project is a Hybrid PV + BESS + STS + Critical Load system. It should be treated as an intelligent distributed energy node, not a simple battery installation.

## Core Equipment

- Battery: ${design.battery.brand} ${design.battery.model}
- Chemistry: ${design.battery.chemistry}
- Topology: ${design.battery.parallelCells}P${design.battery.seriesCells}S
- Nominal DC voltage: ${design.nominalDcVoltageV.value} V
- Operating range: ${design.battery.operatingVoltageMinVdc}-${design.battery.operatingVoltageMaxVdc} VDC
- PCS: ${design.pcs.ratedPowerKw} kW
- STS transfer target: ${design.sts.transferTimeMs} ms
- Critical load autonomy estimate: ${design.criticalLoadAutonomyHours.value} hours

## Energy Router Philosophy

The system combines electrochemistry, thermal engineering, power electronics, digital control, networking, AI/EMS, grid dynamics, and project economics into one cyber-physical energy system.

## Power Flow Priority

${design.powerFlowPriority.map((item) => `- ${item}`).join("\n")}

## Linked Notes

- [[engineering/ems-logic-commercial-bess]]
- [[engineering/sts-synchronization-and-transfer]]
- [[installation/ci-bess-commissioning-checklist]]
- [[failure-cases/ct-polarity-anti-reverse-export]]
`;
}

export function commercialBessCommissioningNote(design: CommercialBessDesign): string {
  return `${frontmatter({
    type: "commissioning-checklist",
    project_id: design.project.projectId,
    tags: ["solar", "ci-bess", "commissioning", "critical-load"]
  })}

# C&I BESS Commissioning Checklist

## Required Gates

${design.commissioningGates
  .map(
    (gate) => `- [ ] ${gate.label}
  - Owner: ${gate.owner}
  - Evidence: ${gate.evidenceRequired}
  - Risk if skipped: ${gate.riskIfSkipped}`
  )
  .join("\n")}

## Rule

No customer handoff until every required test has recorded evidence and unresolved holds are approved by the responsible engineer.
`;
}

export function commercialBessEmsNote(design: CommercialBessDesign): string {
  return `${frontmatter({
    type: "ems-logic",
    project_id: design.project.projectId,
    tags: ["solar", "ci-bess", "ems", "energy-router"]
  })}

# EMS Logic - Commercial BESS

## Strategy Layers

${design.emsStrategies
  .map(
    (strategy) => `## ${strategy.label}

- Modes: ${strategy.modes.join(", ")}
- Variables: ${strategy.controlVariables.join(", ")}
- Logic: ${strategy.explanation}`
  )
  .join("\n\n")}

## Operating Rule

Always separate economic dispatch from backup reserve. Peak shaving and TOU optimization must not consume the SOC reserve required for critical-load continuity unless a human operator approves the override.
`;
}

export function commercialBessStsNote(design: CommercialBessDesign): string {
  return `${frontmatter({
    type: "sts-engineering",
    project_id: design.project.projectId,
    transfer_ms: design.sts.transferTimeMs,
    tags: ["solar", "ci-bess", "sts", "critical-load"]
  })}

# STS Synchronization And Transfer

## Function

STS provides ultra-fast source transfer for critical loads. In this project model, transfer must be ${design.sts.transferTimeMs} ms or faster.

## Synchronization Requirements

- Phase angle check
- Frequency check
- Voltage matching
- ${design.sts.syncSignals.join("\n- ")}

## Failure Mode

Unsynchronized transfer can create inrush, transient voltage events, breaker trips, PCS collapse, or critical-load reboot.

## Test Requirement

Perform grid-loss transfer test with real or representative critical load and record transfer waveform evidence.
`;
}

export function commercialBessFailureNote(design: CommercialBessDesign): string {
  return `${frontmatter({
    type: "failure-cases",
    project_id: design.project.projectId,
    tags: ["solar", "ci-bess", "rca", "commissioning"]
  })}

# Commercial BESS Failure Modes

${design.failureModes
  .map(
    (failure) => `## ${failure.label}

- Detection: ${failure.detection}
- Mitigation: ${failure.mitigation}`
  )
  .join("\n\n")}
`;
}

export function commercialBessLoadTaxonomyNote(design: CommercialBessDesign): string {
  const breakdown = buildLoadBreakdown(design.project);

  return `${frontmatter({
    type: "load-taxonomy",
    project_id: design.project.projectId,
    size_class: breakdown.sizeClass.id,
    peak_kw: breakdown.totalPeakDemandKw,
    critical_kw: breakdown.criticalLoadKw,
    tags: ["solar", "ci-bess", "load-profile", "sizing"]
  })}

# Load Type, Size, And Power Breakdown

## Project Classification

- Size class: ${breakdown.sizeClass.label}
- Peak demand: ${breakdown.totalPeakDemandKw} kW
- Critical load: ${breakdown.criticalLoadKw} kW
- Estimated daily energy: ${breakdown.dailyEnergyKwh} kWh/day
- Backup energy target: ${breakdown.backupEnergyTargetKwh} kWh

## System Size Bands

${systemSizeBands
  .map(
    (band) => `### ${band.label}

- Peak demand: ${band.peakDemandKw}
- PV size: ${band.pvSizeKwp}
- BESS energy: ${band.bessEnergyKwh}
- PCS power: ${band.pcsPowerKw}
- Typical sites: ${band.typicalSites.join(", ")}
- Design focus: ${band.designFocus.join(", ")}`
  )
  .join("\n\n")}

## Load Segments

${breakdown.segments
  .map(
    (segment) => `### ${segment.label}

- Priority: ${segment.priority}
- Behavior: ${segment.behavior}
- Estimated power: ${segment.estimatedKw} kW
- Runtime: ${segment.hoursPerDay} h/day
- Daily energy: ${segment.dailyKwh} kWh/day
- Backup required: ${segment.backupRequired ? "yes" : "no"}
- Sizing meaning: ${segment.sizingMeaning}
- Design notes: ${segment.designNotes.join("; ")}`
  )
  .join("\n\n")}

## Sizing Steps

${breakdown.sizingSteps.map((step) => `- ${step.step}: ${step.explanation}`).join("\n")}

## Linked Knowledge

- [[engineering/hybrid-commercial-bess-pv-sts-critical-load]]
- [[engineering/deep-dive/sizing-methodology]]
- [[engineering/deep-dive/power-flow-every-mode]]
- [[engineering/deep-dive/complete-epc-workflow]]
`;
}

export function customerUsageProfileNote(design: CommercialBessDesign): string {
  const profile = buildCustomerUsageProfile({
    siteName: design.project.siteName,
    nightKw: Math.round(design.project.criticalLoadKw.value * 0.45),
    morningKw: Math.round(design.project.peakDemandKw.value * 0.45),
    solarKw: Math.round(design.project.peakDemandKw.value * 0.67),
    afternoonKw: Math.round(design.project.peakDemandKw.value * 0.6),
    eveningKw: Math.round(design.project.peakDemandKw.value * 0.76),
    lateKw: Math.round(design.project.criticalLoadKw.value * 0.9),
    refrigerationQty: 2,
    refrigerationKw: Math.max(8, Math.round(design.project.criticalLoadKw.value * 0.08)),
    refrigerationHours: 24,
    refrigerationDuty: 0.75,
    pumpQty: 2,
    pumpKw: 11,
    pumpHours: 4,
    pumpDuty: 0.5,
    serverQty: 1,
    serverKw: 6,
    serverHours: 24,
    acQty: 12,
    acKw: 2.5,
    acHours: 10,
    acDuty: 0.65
  });

  return `${frontmatter({
    type: "customer-usage-profile",
    project_id: design.project.projectId,
    site_name: profile.siteName,
    daily_kwh: profile.dailyEnergyKwh,
    peak_kw: profile.estimatedPeakKw,
    critical_kw: profile.criticalOperatingKw,
    tags: ["solar", "ci-bess", "usage-profile", "appliance-loads"]
  })}

# Customer Usage Profile - ${profile.siteName}

## Summary

- Daily energy by time window: ${profile.dailyEnergyKwh} kWh/day
- Estimated peak: ${profile.estimatedPeakKw} kW
- Critical appliance operating load: ${profile.criticalOperatingKw} kW
- Critical appliance energy: ${profile.criticalDailyKwh} kWh/day
- PV direct-use window energy: ${profile.pvDirectUseKwh} kWh/day
- Battery shift/backup window energy: ${profile.batteryShiftTargetKwh} kWh/day

## Time Window Usage

${profile.timeWindows
  .map(
    (window) => `### ${window.label}

- Average load: ${window.averageKw} kW
- Energy: ${window.energyKwh} kWh
- PV overlap: ${window.pvOverlap}
- BESS role: ${window.bessRole}
- Design meaning: ${window.designMeaning}`
  )
  .join("\n\n")}

## Appliance And Load Inventory

${profile.appliances
  .map(
    (load) => `### ${load.label}

- Category: ${load.category}
- Quantity: ${load.quantity}
- Rated size: ${load.ratedKwEach} kW each
- Connected load: ${load.connectedKw} kW
- Operating load: ${load.operatingKw} kW
- Daily energy: ${load.dailyKwh} kWh/day
- Estimated start surge: ${load.estimatedSurgeKw} kW
- Critical: ${load.critical ? "yes" : "no"}
- Behavior: ${load.behavior}
- Design meaning: ${load.designMeaning}`
  )
  .join("\n\n")}

## Insights

${profile.insights.map((item) => `- ${item}`).join("\n")}

## Linked Knowledge

- [[engineering/load-type-size-power-breakdown]]
- [[engineering/deep-dive/sizing-methodology]]
- [[engineering/deep-dive/power-flow-every-mode]]
- [[engineering/deep-dive/battery-degradation-modeling]]
`;
}

export async function syncCommercialBessToObsidian(
  design: CommercialBessDesign,
  vaultRoot = defaultVaultRoot
): Promise<string[]> {
  const writes: Array<{ path: string; content: string }> = [
    {
      path: join(vaultRoot, "engineering", "hybrid-commercial-bess-pv-sts-critical-load.md"),
      content: commercialBessArchitectureNote(design)
    },
    {
      path: join(vaultRoot, "engineering", "ems-logic-commercial-bess.md"),
      content: commercialBessEmsNote(design)
    },
    {
      path: join(vaultRoot, "engineering", "sts-synchronization-and-transfer.md"),
      content: commercialBessStsNote(design)
    },
    {
      path: join(vaultRoot, "installation", "ci-bess-commissioning-checklist.md"),
      content: commercialBessCommissioningNote(design)
    },
    {
      path: join(vaultRoot, "failure-cases", "commercial-bess-failure-modes.md"),
      content: commercialBessFailureNote(design)
    },
    {
      path: join(vaultRoot, "engineering", "load-type-size-power-breakdown.md"),
      content: commercialBessLoadTaxonomyNote(design)
    },
    {
      path: join(vaultRoot, "customer-profiles", "customer-usage-profile-time-appliances.md"),
      content: customerUsageProfileNote(design)
    },
    {
      path: join(vaultRoot, "failure-cases", "ct-polarity-anti-reverse-export.md"),
      content: `${frontmatter({
        type: "failure-case",
        tags: ["solar", "ci-bess", "anti-export", "metering"]
      })}

# CT Polarity And Anti-Reverse Export

## Risk

If CT direction or phase mapping is wrong, EMS can interpret export as import and command the PCS in the wrong direction.

## Required Test

Apply a known load step, confirm meter import/export sign, then verify EMS zero-export response before enabling automatic dispatch.
`
    }
  ];

  for (const topic of buildCommercialBessDeepDiveTopics(design)) {
    writes.push({
      path: join(vaultRoot, "engineering", "deep-dive", `${topicSlug(topic.id)}.md`),
      content: renderDeepDiveTopic(topic, design)
    });
  }

  for (const write of writes) {
    await mkdir(dirname(write.path), { recursive: true });
    await writeFile(write.path, write.content, "utf8");
  }

  return writes.map((write) => write.path);
}

export function quotationNote(quote: CommercialQuotation): string {
  return `${frontmatter({
    type: "commercial-quotation",
    quotation_no: quote.quotationNo,
    project_name: quote.projectName,
    customer_name: quote.customerName,
    company_name: quote.companyName,
    currency: quote.currency,
    grand_total_thb: quote.grandTotalThb,
    validity_days: quote.validityDays,
    tags: ["solar", "quotation", "boq", "ci-bess", "commercial"]
  })}

# ${quote.quotationNo} - ${quote.projectName}

## Customer

- Customer: ${quote.customerName}
- Company: ${quote.companyName}
- Generated: ${quote.generatedAt}
- Validity: ${quote.validityDays} days
- Currency: ${quote.currency}

## Commercial Summary

- Subtotal: THB ${quote.subtotalThb}
- Margin: THB ${quote.marginThb}
- Discount: THB ${quote.discountThb}
- VAT: THB ${quote.vatThb}
- Grand total: THB ${quote.grandTotalThb}

## BOQ

| Section | Description | Qty | Unit | Unit Price THB | Total THB | Notes |
| --- | --- | ---: | --- | ---: | ---: | --- |
${quote.lines
  .map(
    (line) =>
      `| ${line.section} | ${line.description.replace(/\|/g, "/")} | ${line.quantity} | ${line.unit} | ${line.unitPriceThb} | ${line.totalThb} | ${line.notes.replace(/\|/g, "/")} |`
  )
  .join("\n")}

## Assumptions

${quote.assumptions.map((item) => `- ${item}`).join("\n")}

## Exclusions

${quote.exclusions.map((item) => `- ${item}`).join("\n")}

## Payment Terms

${quote.paymentTerms.map((item) => `- ${item}`).join("\n")}

## Delivery Milestones

${quote.deliveryMilestones.map((item) => `- ${item}`).join("\n")}

## Competitor-Aware Differentiators

${quote.competitorAwareDifferentiators.map((item) => `- ${item}`).join("\n")}

## Linked Knowledge

- [[engineering/hybrid-commercial-bess-pv-sts-critical-load]]
- [[engineering/load-type-size-power-breakdown]]
- [[customer-profiles/customer-usage-profile-time-appliances]]
- [[market/competitor-intelligence-thailand-solar-bess]]
`;
}

export function competitorIntelligenceNote(intel: CompetitorIntelligence): string {
  return `${frontmatter({
    type: "market-intelligence",
    market: "Thailand Solar PV BESS EPC",
    competitor_count: intel.competitors.length,
    generated_at: intel.generatedAt,
    tags: ["solar", "market-intelligence", "competitor-analysis", "thailand", "bess"]
  })}

# Thailand Solar PV + BESS Competitor Intelligence

## Market Patterns

${intel.marketPatterns.map((item) => `- ${item}`).join("\n")}

## Competitors

${intel.competitors
  .map(
    (profile) => `### ${profile.name}

- Position: ${profile.marketPosition}
- Offerings: ${profile.observedOfferings.join(", ")}
- Strengths: ${profile.strengths.join("; ")}
- Gaps to exploit: ${profile.gapsToExploit.join("; ")}
- Source: ${profile.sourceUrl}`
  )
  .join("\n\n")}

## Strategic Positioning

${intel.strategicPositioning.map((item) => `- ${item}`).join("\n")}

## Quotation Implications

${intel.quotationImplications.map((item) => `- ${item}`).join("\n")}

## Linked Knowledge

- [[sales-playbooks/ci-bess-quotation-playbook]]
- [[engineering/hybrid-commercial-bess-pv-sts-critical-load]]
- [[proposals]]
`;
}

export async function syncQuotationToObsidian(
  quote: CommercialQuotation,
  vaultRoot = defaultVaultRoot
): Promise<string[]> {
  const writes = [
    {
      path: join(vaultRoot, "proposals", `${slug(`${quote.projectName}-${quote.quotationNo}`)}.md`),
      content: quotationNote(quote)
    },
    {
      path: join(vaultRoot, "sales-playbooks", "ci-bess-quotation-playbook.md"),
      content: `${frontmatter({
        type: "sales-playbook",
        tags: ["solar", "ci-bess", "quotation", "sales"]
      })}

# C&I BESS Quotation Playbook

## Rule

Never sell the project as a battery. Sell uptime, demand reduction, PV self-consumption, backup continuity, power quality, and operational confidence.

## Required Proposal Blocks

- Real usage profile by time window and appliance inventory.
- Critical-load boundary and autonomy assumption.
- STS transfer target and commissioning test evidence.
- EMS logic for anti-export, peak shaving, TOU, PV self-consumption, and SOC reserve.
- BOQ with assumptions, exclusions, validity, payment terms, and delivery milestones.
- O&M and RCA workflow after handover.
`
    }
  ];

  for (const write of writes) {
    await mkdir(dirname(write.path), { recursive: true });
    await writeFile(write.path, write.content, "utf8");
  }

  return writes.map((write) => write.path);
}

export async function syncCompetitorIntelligenceToObsidian(
  intel: CompetitorIntelligence,
  vaultRoot = defaultVaultRoot
): Promise<string[]> {
  const writes = [
    {
      path: join(vaultRoot, "market", "competitor-intelligence-thailand-solar-bess.md"),
      content: competitorIntelligenceNote(intel)
    }
  ];

  for (const write of writes) {
    await mkdir(dirname(write.path), { recursive: true });
    await writeFile(write.path, write.content, "utf8");
  }

  return writes.map((write) => write.path);
}
