#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RUN_DATE = "2026-05-19";
const vaultRoot = "/Users/sirinx/Documents/Obsidian Vault/SIRINX";
const repoRoot = "/Users/sirinx/sirinx-os";
const repoKnowledge = path.join(repoRoot, "docs", "knowledge");
const marker = "generated_by: sirinx-omega-vault-generator";

const written = [];
const skipped = [];

function yamlList(items) {
  return items.map((item) => `  - ${item}`).join("\n");
}

function note(title, tags, body, extra = {}) {
  const extraYaml = Object.entries(extra)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n");
  return `---\ntitle: ${JSON.stringify(title)}\ncreated: ${RUN_DATE}\nstatus: active\nsystem: SIRINX\n${marker}\ntags:\n${yamlList(tags)}${extraYaml ? `\n${extraYaml}` : ""}\n---\n\n# ${title}\n\n${body.trim()}\n`;
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function writeGenerated(filePath, content) {
  await ensureDir(path.dirname(filePath));
  let existing = null;
  try {
    existing = await readFile(filePath, "utf8");
  } catch {
    // File does not exist.
  }

  if (existing && !existing.includes(marker)) {
    skipped.push(filePath);
    return;
  }

  const finalContent = content.endsWith("\n") ? content : `${content}\n`;
  await writeFile(filePath, finalContent, "utf8");
  written.push(filePath);
}

async function writeNewOnly(filePath, content) {
  await ensureDir(path.dirname(filePath));
  try {
    await readFile(filePath, "utf8");
    skipped.push(filePath);
    return;
  } catch {
    const finalContent = content.endsWith("\n") ? content : `${content}\n`;
    await writeFile(filePath, finalContent, "utf8");
    written.push(filePath);
  }
}

const topDirs = [
  "00_CORE_SYSTEM",
  "01_MOC",
  "02_META",
  "03_KNOWLEDGE_GRAPH",
  "04_ENGINEERING",
  "05_PROJECTS",
  "06_OPERATIONS",
  "07_RESEARCH",
  "08_AI_MEMORY",
  "09_AUTOMATIONS",
  "10_SCADA",
  "11_PROTOCOLS",
  "12_DASHBOARDS",
  "13_DATABASES",
  "14_TEMPLATES",
  "15_CANVAS",
  "16_DIAGRAMS",
  "17_MEDIA",
  "18_ARCHIVE",
  ".obsidian",
  ".obsidian/snippets",
];

const engineeringDirs = [
  "BESS",
  "BATTERY_CHEMISTRY",
  "CELL_ENGINEERING",
  "PACK_ARCHITECTURE",
  "HV_SYSTEMS",
  "PCS",
  "EMS",
  "BMS",
  "STS",
  "UPS",
  "PV",
  "MICROGRID",
  "GRID",
  "POWER_QUALITY",
  "COMMUNICATION",
  "SCADA",
  "PROTECTION",
  "THERMAL",
  "FIRE",
  "SAFETY",
  "FAILURE_ANALYSIS",
  "ROOT_CAUSE",
  "COMMISSIONING",
  "O_AND_M",
  "ECONOMICS",
  "DIGITAL_TWIN",
  "AI_OPTIMIZATION",
];

const approvedKnowledgePolicy = `
## Operating Rule

SIRINX must not recommend an inverter as installable in Thailand until the exact model is checked against the current PEA Smartlist or other current utility approval source.

## Source

- PEA Smartlist product search: https://smartlist.pea.co.th/products?page=2
- PEA Smartlist inverter PDF export: https://smartlist.pea.co.th/public/products/inverter/pdf

## Current Control

The Deye models captured from the master prompt are stored as candidate equipment. They are useful for planning, sales discovery, and package mapping, but final proposals must run the approval gate:

1. Search exact model in PEA Smartlist.
2. Record supplier/manufacturer, certificate status, and date checked.
3. Attach screenshot or exported PDF evidence to the customer/project note.
4. Only then promote status from candidate to verified_for_proposal.

## Candidate Deye Models From Prompt

### On-Grid
- SUN-5K-G05P1-EU-AM2
- SUN-10K-G06P3-EU-BM2-P1
- SUN-20K-G05
- SUN-50K-G04
- SUN-100K-G03

### Hybrid LV
- SUN-5K-SG04LP1-EU-SM2
- SUN-10K-SG02LP1-EU-AM3
- SUN-16K-SG01LP1-EU
- SUN-5K-SG05LP3-EU-SM2
- SUN-10K-SG04LP3-EU
- SUN-15K-SG05LP3-EU-SM2
- SUN-20K-SG05LP3-EU-SM2

### Hybrid HV
- SUN-30K-SG01HP3-EU-BM3
- SUN-50K-SG01HP3-EU-BM4
- SUN-80K-SG02HP3-EU-EM6
`;

const coreDocs = new Map([
  [
    "00_CORE_SYSTEM/SIRINX Energy Infrastructure Cognitive OS.md",
    note(
      "SIRINX Energy Infrastructure Cognitive OS",
      ["sirinx/core", "energy/os", "obsidian"],
      `
## Mission

Build a local-first engineering brain for Thailand solar, residential ESS, C&I ESS, utility-scale BESS, SCADA, EPC delivery, and AI-assisted operations.

## Operating Layers

1. Market intelligence: Thailand tariffs, customer profiles, competitor positioning, objections, and public claims.
2. Engineering intelligence: PV, inverter, BESS, EMS, BMS, PCS, STS, UPS, microgrid, grid integration, protection, thermal, fire, and SCADA.
3. Commercial intelligence: packages, ROI, payback, proposal generation, CRM qualification, and installer sales workflow.
4. Delivery intelligence: FAT, SAT, commissioning, QA/QC, O&M, failure analysis, incident review, and spare parts.
5. AI memory: semantic memory, project memory, decision memory, failure memory, RAG, embeddings, and autonomous indexing.

## Non-Negotiable Controls

- No secret values in notes.
- No raw chat logs as memory.
- No unverified inverter recommendation.
- No unrealistic payback promise.
- Separate financial ROI from energy independence value.
- Every customer proposal must include assumptions, risk, and behavior dependency.

## Working Definition

This vault is not a generic PKM. It is the operating memory for sales engineers, installers, project managers, AI agents, and executives running SIRINX energy infrastructure work.
      `,
    ),
  ],
  [
    "00_CORE_SYSTEM/Thailand Solar ESS Operating Doctrine.md",
    note(
      "Thailand Solar ESS Operating Doctrine",
      ["sirinx/thailand", "solar/ess", "sales-engineering"],
      `
## Core Truths

On-grid solar normally wins on pure financial ROI when daytime self-consumption is high. Hybrid systems cost more and usually show weaker payback, but they create backup capability, nighttime energy shifting, energy freedom, and psychological security.

## Thailand-Specific Constraints

- Heat reduces PV and inverter efficiency; design must allow ventilation, derating, and thermal margin.
- Many premium residential customers consume heavily at night through air-conditioning, EV charging, pumps, pools, kitchens, and home-office loads.
- Battery economics depend on cycling behavior, blackout value, TOU opportunity, and load-shifting discipline.
- Utility approval and anti-reverse/export-limit requirements can be project blockers.

## Customer Education Rule

Every sales conversation must distinguish:

1. Financial return: savings, payback, self-consumption, tariff assumptions.
2. Resilience value: backup, comfort, outage protection, energy continuity.
3. Lifestyle value: EV readiness, home office continuity, smart home expansion, premium property positioning.

## Proposal Guardrail

Never sell batteries as a guaranteed ROI accelerator. Sell them as resilience infrastructure with a secondary financial benefit when user behavior supports it.
      `,
    ),
  ],
  [
    "00_CORE_SYSTEM/Solar Package Catalog - Thailand.md",
    note(
      "Solar Package Catalog - Thailand",
      ["sirinx/packages", "solar/thailand", "sales"],
      `
## On-Grid Packages

| Package | System | PV Limit | Target Bill | Price |
|---|---:|---:|---:|---:|
| OG-5 | 5 kW on-grid | <= 5 kWp | 2,000-4,000 THB/month | 129,000 THB |
| OG-10 | 10 kW on-grid | <= 10 kWp | 4,000-8,000 THB/month | 209,000 THB |

## Hybrid Packages

| Package | System | Battery | Target Bill | Price |
|---|---:|---:|---:|---:|
| H-5 | 5 kW hybrid | 16 kWh | 4,000-6,000 THB/month | 329,000 THB |
| H-10 | 10 kW hybrid | 32 kWh | 6,000-10,000 THB/month | 529,000 THB |
| H-15 | 15 kW hybrid 3-phase | 48 kWh | project-specific | 789,000 THB |
| H-20 | 20 kW hybrid 3-phase | 64 kWh | project-specific | 959,000 THB |

## Battery Expansion

- 16 kWh expansion module: 115,000 THB per module.

## Qualification Flow

1. Monthly bill.
2. Daytime versus nighttime load ratio.
3. Phase type.
4. Roof area and shading.
5. AC count and simultaneous use.
6. Backup expectation.
7. EV plan.
8. Budget and emotional driver.

## Sales Engineering Rule

Package is a starting point, not final design. Final sizing must validate peak load, surge load, phase balance, inverter approval, export control, battery C-rate, and customer behavior.
      `,
    ),
  ],
  [
    "00_CORE_SYSTEM/Inverter Approval Gate - PEA Smartlist.md",
    note(
      "Inverter Approval Gate - PEA Smartlist",
      ["sirinx/compliance", "pea", "inverter"],
      approvedKnowledgePolicy,
    ),
  ],
  [
    "00_CORE_SYSTEM/GSL 16kWh Battery Knowledge.md",
    note(
      "GSL 16kWh Battery Knowledge",
      ["sirinx/battery", "lfp", "residential-ess"],
      `
## Model

GSL-051314A-B-GBP2.

## Technical Profile

- Nominal voltage: 51.2 V.
- Capacity: 314 Ah.
- Energy: 16.08 kWh.
- Chemistry: LiFePO4.
- Enclosure: IP65, outdoor capable when installed correctly.
- Communication: CAN2.0, RS485, WiFi.
- Cycle claim: >= 10,000 cycles.
- Warranty: 10 years.
- Depth of discharge: 90 percent.
- Weight: 145.5 kg.
- Parallel expansion: up to 16 units, about 257 kWh total.

## Operating Envelope

- Charge: 0 C to 55 C.
- Discharge: -20 C to 55 C.

## Installation Implications

- Heavy wall/floor mounting planning is mandatory.
- Internet connectivity is required for warranty support.
- Authorized installation is required.
- Warranty exclusions such as labor, shipping, and removal must be explained before sale.
      `,
    ),
  ],
]);

const mocNames = [
  "Energy Infrastructure Master Index",
  "Utility-scale BESS Master MOC",
  "Hybrid ESS Master MOC",
  "EMS Intelligence MOC",
  "PCS Control Systems MOC",
  "BMS Cognitive Map",
  "STS Synchronization MOC",
  "Grid Synchronization MOC",
  "Microgrid Engineering MOC",
  "Thermal Management MOC",
  "Fire Protection MOC",
  "SCADA Systems MOC",
  "Communication Protocols MOC",
  "AI Optimization MOC",
  "EPC Delivery MOC",
  "Failure Analysis MOC",
  "Protection Coordination MOC",
  "Thai Utility Compliance MOC",
  "AI Memory Architecture MOC",
  "Cognitive Infrastructure MOC",
];

function mocBody(name) {
  return `
## Purpose

This MOC maps the notes, dashboards, procedures, and decision gates for ${name}.

## Entry Points

- [[SIRINX Energy Infrastructure Cognitive OS]]
- [[Thailand Solar ESS Operating Doctrine]]
- [[Solar Package Catalog - Thailand]]
- [[Inverter Approval Gate - PEA Smartlist]]

## Engineering Links

- [[1P260S Topology]]
- [[314Ah LFP Cells]]
- [[832VDC ESS Architecture]]
- [[Grid-Forming Theory]]
- [[Peak Shaving Algorithms]]
- [[Thai Grid Integration and Export Limiting]]
- [[Telemetry and Alarm Architecture]]
- [[FMEA and Fault Trees]]

## Decision Questions

1. What asset or customer class is this note serving?
2. What electrical constraint can break the design?
3. What financial assumption can mislead the sale?
4. What control or telemetry signal must be captured?
5. What approval gate blocks deployment?

## Dataview

\`\`\`dataview
TABLE status, updated, owner
FROM #sirinx
WHERE contains(file.outlinks, this.file.link)
SORT updated DESC
\`\`\`
  `;
}

const mocs = new Map(mocNames.map((name) => [`01_MOC/${name}.md`, note(name, ["sirinx/moc", "energy/index"], mocBody(name))]));

const knowledgeGraphDocs = new Map([
  [
    "03_KNOWLEDGE_GRAPH/SIRINX Energy Ontology.md",
    note(
      "SIRINX Energy Ontology",
      ["sirinx/ontology", "knowledge-graph"],
      `
## Top-Level Classes

- Asset: PV array, inverter, battery, BMS, PCS, EMS, STS, UPS, transformer, meter, breaker, router, gateway, sensor.
- Constraint: electrical, thermal, regulatory, financial, behavioral, operational, communication.
- State: grid-connected, islanded, charging, discharging, standby, fault, emergency shutdown, maintenance.
- Signal: voltage, current, power, frequency, SOC, SOH, temperature, alarm, event, tariff, forecast.
- Decision: design, sizing, proposal, approval, dispatch, maintenance, escalation.
- Evidence: PEA listing, datasheet, FAT record, SAT record, commissioning screenshot, customer bill, telemetry export.

## Relationship Types

- powers
- protects
- measures
- controls
- limits
- approves
- dispatches
- fails_by
- mitigates
- verifies
- depends_on
- generates_cashflow_from

## Required Note Properties

- asset_class
- design_stage
- verification_status
- owner
- source_quality
- risk_level
- next_action
      `,
    ),
  ],
  [
    "03_KNOWLEDGE_GRAPH/System Dependency Graph.md",
    note(
      "System Dependency Graph",
      ["sirinx/knowledge-graph", "architecture"],
      `
\`\`\`mermaid
flowchart TD
  CustomerLoad["Customer Load Profile"] --> Sizing["PV/Battery/Inverter Sizing"]
  UtilityRules["PEA/MEA Approval Rules"] --> ApprovalGate["Equipment Approval Gate"]
  ApprovalGate --> Proposal["Technical Proposal"]
  Sizing --> Proposal
  Proposal --> Install["Installation Workflow"]
  Install --> Commissioning["FAT/SAT/Commissioning"]
  Commissioning --> Telemetry["SCADA/Telemetry"]
  Telemetry --> Operations["O&M and Diagnostics"]
  Operations --> FailureMemory["Failure Memory"]
  FailureMemory --> DesignRules["Updated Design Rules"]
  DesignRules --> Sizing
  Tariff["Tariff/TOU"] --> ROI["ROI Engine"]
  LoadBehavior["User Behavior"] --> ROI
  ROI --> Proposal
\`\`\`

## Control Point

The loop only improves when commissioning evidence and telemetry return to the design rules. This vault must therefore track not only sales claims, but measured operational results.
      `,
    ),
  ],
]);

const engineeringNotes = new Map([
  [
    "04_ENGINEERING/BESS/1P260S Topology.md",
    note(
      "1P260S Topology",
      ["sirinx/bess", "battery/topology", "hv"],
      `
## Summary

1P260S means one cell in parallel and 260 cells in series. For LFP cells around 3.2 V nominal, the nominal DC bus is about 832 VDC before pack-level architecture, contactors, fuses, and BMS limits are applied.

## Engineering Details

- High series count increases voltage and reduces current for the same power.
- Lower current reduces conductor losses but raises insulation, isolation, arc flash, creepage, clearance, precharge, and contactor requirements.
- Pack-level balancing strategy is critical because a single weak cell string limits usable capacity.

## Risks

- HV isolation fault.
- Cell imbalance.
- Contactor welding.
- Precharge resistor overheating.
- Incorrect service procedure.

## Related Notes

- [[832VDC ESS Architecture]]
- [[314Ah LFP Cells]]
- [[FMEA and Fault Trees]]
      `,
    ),
  ],
  [
    "04_ENGINEERING/BATTERY_CHEMISTRY/314Ah LFP Cells.md",
    note(
      "314Ah LFP Cells",
      ["sirinx/battery", "lfp", "cell-engineering"],
      `
## Summary

314 Ah LFP cells are common in modern ESS designs because they provide high capacity, good safety behavior versus many nickel-rich chemistries, and long cycle life when thermal and SOC windows are controlled.

## Technical Considerations

- Calendar aging is affected by high temperature and high SOC dwell.
- Cycle aging is affected by depth of discharge, C-rate, and temperature.
- Cell impedance rise reduces power capability over time.
- BMS must estimate SOC, SOH, and SOP using measured current, voltage, temperature, and model-based correction.

## Installation Implications

For Thailand, high ambient heat means enclosure ventilation, shade, derating, and telemetry must be designed rather than assumed.
      `,
    ),
  ],
  [
    "04_ENGINEERING/HV_SYSTEMS/832VDC ESS Architecture.md",
    note(
      "832VDC ESS Architecture",
      ["sirinx/hv", "bess", "safety"],
      `
## Summary

832 VDC ESS architecture requires explicit HV safety design: isolation monitoring, precharge, contactor sequencing, fusing, arc mitigation, service lockout, and BMS-controlled fault state transitions.

## Sequence

1. Verify insulation and no active fault.
2. Close precharge path.
3. Confirm DC bus ramp within expected curve.
4. Close main positive and negative contactors.
5. Open precharge relay.
6. Enable PCS operation.

## Failure Modes

- Precharge timeout.
- Welded contactor.
- Isolation fault.
- Overtemperature.
- DC bus undervoltage or overvoltage.
- Communication timeout between BMS and PCS.
      `,
    ),
  ],
  [
    "04_ENGINEERING/EMS/Peak Shaving Algorithms.md",
    note(
      "Peak Shaving Algorithms",
      ["sirinx/ems", "dispatch", "economics"],
      `
## Objective

Reduce peak demand by discharging battery power when load approaches a threshold, while preserving SOC for resilience and avoiding excessive cycling.

## Inputs

- Real-time load power.
- PV production forecast.
- Battery SOC/SOH/SOP.
- Tariff and demand charge window.
- Backup reserve requirement.
- Export limit.

## Control Logic

1. Forecast load over the control horizon.
2. Detect probable peak breach.
3. Calculate discharge power required to cap peak.
4. Limit discharge by inverter power, battery SOP, SOC reserve, thermal state, and grid constraints.
5. Recalculate every telemetry interval.

## Business Rule

Peak shaving value must be calculated separately from simple kWh bill savings.
      `,
    ),
  ],
  [
    "04_ENGINEERING/EMS/AI Dispatch Optimization.md",
    note(
      "AI Dispatch Optimization",
      ["sirinx/ems", "ai-optimization", "dispatch"],
      `
## Purpose

AI dispatch must optimize cost, resilience, battery health, and customer comfort without violating inverter, battery, grid, or approval constraints.

## Decision Variables

- Charge power.
- Discharge power.
- Backup SOC reserve.
- Export limitation.
- Load-shift window.
- Demand peak cap.

## Guardrails

- Never discharge below critical reserve during storm/outage risk windows.
- Never optimize tariff savings at the cost of excessive battery degradation.
- Never override BMS or inverter safety constraints.
- Always log why an automated dispatch decision was taken.
      `,
    ),
  ],
  [
    "04_ENGINEERING/PCS/Grid-Forming Theory.md",
    note(
      "Grid-Forming Theory",
      ["sirinx/pcs", "grid-forming", "microgrid"],
      `
## Summary

Grid-forming PCS controls establish voltage and frequency reference for an islanded or weak-grid system. This differs from grid-following control, which synchronizes to an existing grid reference.

## Concepts

- Droop control.
- Virtual synchronous generator.
- Virtual inertia.
- Black start.
- Short-circuit current limitation.
- Multi-inverter synchronization.

## Design Implication

Critical-load systems need load-shedding and transfer logic coordinated with PCS current limits. Grid-forming capability does not mean unlimited motor-start capacity.
      `,
    ),
  ],
  [
    "04_ENGINEERING/PCS/PLL Synchronization.md",
    note(
      "PLL Synchronization",
      ["sirinx/pcs", "grid", "control-loop"],
      `
## Summary

Phase-locked loop synchronization estimates grid phase angle and frequency so the inverter can inject current in phase with utility voltage. Weak grids, harmonics, and voltage imbalance can disturb PLL behavior.

## Failure Symptoms

- Unstable power output.
- Nuisance anti-islanding trips.
- Poor power factor response.
- Oscillation during weak-grid events.

## Diagnostics

Log grid voltage, frequency, THD, phase imbalance, inverter alarm code, and event timestamp before changing control settings.
      `,
    ),
  ],
  [
    "04_ENGINEERING/STS/Less Than 10ms Transfer Systems.md",
    note(
      "Less Than 10ms Transfer Systems",
      ["sirinx/sts", "ups", "critical-load"],
      `
## Summary

Sub-10 ms transfer aims to keep critical loads powered during grid loss or source transition. Real performance depends on phase alignment, source availability, load type, static switch design, and upstream/downstream protection.

## Verification

- Oscilloscope capture during transfer.
- Critical-load ride-through test.
- UPS compatibility test.
- Bypass path verification.
- Alarm and event log capture.

## Risk

Marketing transfer time claims are not enough. Commissioning must prove the actual transition under representative load.
      `,
    ),
  ],
  [
    "04_ENGINEERING/THERMAL/Liquid Cooling Loops.md",
    note(
      "Liquid Cooling Loops",
      ["sirinx/thermal", "bess", "cooling"],
      `
## Summary

Liquid cooling stabilizes battery temperature gradients in high-density ESS. Design must account for pump redundancy, flow rate, coolant mix, leak detection, heat exchanger capacity, and serviceability.

## Thailand Considerations

- High ambient temperature reduces cooling margin.
- Outdoor equipment needs solar gain mitigation.
- Humidity and corrosion affect connectors and enclosures.

## Telemetry

Track inlet temperature, outlet temperature, cell temperature spread, pump status, coolant pressure, leak sensor status, and chiller alarm state.
      `,
    ),
  ],
  [
    "04_ENGINEERING/FIRE/Thermal Runaway and Aerosol Suppression.md",
    note(
      "Thermal Runaway and Aerosol Suppression",
      ["sirinx/fire", "safety", "bess"],
      `
## Summary

Thermal runaway prevention is stronger than suppression. Detection, isolation, ventilation, spacing, zoning, and emergency response procedure must be designed together.

## Signals

- Cell overtemperature.
- Temperature rise rate.
- Smoke detection.
- Gas or hydrogen detection.
- BMS critical alarm.
- Rack voltage anomaly.

## Response Layers

1. Early warning and derating.
2. Fault isolation.
3. Emergency shutdown.
4. Ventilation and suppression.
5. Fire service handoff.

## Note

Suppression does not guarantee prevention of propagation. Treat all fire designs as layered risk reduction.
      `,
    ),
  ],
  [
    "04_ENGINEERING/GRID/Thai Grid Integration and Export Limiting.md",
    note(
      "Thai Grid Integration and Export Limiting",
      ["sirinx/grid", "thailand", "compliance"],
      `
## Summary

Thailand grid-connected PV and ESS projects require utility-aware design. Equipment approval, anti-islanding, export limit, metering, interconnection drawings, and commissioning evidence must be handled before commercial claims.

## Controls

- Anti-reverse power.
- Export limiting.
- Anti-islanding.
- Frequency and voltage ride-through where required.
- PCC measurement.
- Utility inspection evidence.

## Sales Impact

If export is limited or zero-export is required, ROI depends heavily on self-consumption and load shifting.
      `,
    ),
  ],
  [
    "04_ENGINEERING/COMMUNICATION/Modbus and RS485 Architecture.md",
    note(
      "Modbus and RS485 Architecture",
      ["sirinx/protocol", "modbus", "rs485"],
      `
## Summary

RS485 is the physical layer. Modbus RTU is a common protocol over RS485. Modbus TCP runs over Ethernet/IP. Many solar and ESS devices expose registers for power, energy, SOC, alarm, and status.

## Design Rules

- Use correct termination and biasing.
- Keep address map under version control.
- Record baud rate, parity, stop bits, device address, and register scaling.
- Never write control registers without explicit test plan and rollback.

## Failure Modes

- Address conflict.
- Reversed polarity.
- Grounding/noise issue.
- Register map mismatch.
- Firmware version mismatch.
      `,
    ),
  ],
  [
    "04_ENGINEERING/SCADA/Telemetry and Alarm Architecture.md",
    note(
      "Telemetry and Alarm Architecture",
      ["sirinx/scada", "telemetry", "alarm"],
      `
## Summary

Telemetry must support operations, warranty, diagnostics, ROI validation, and customer reporting. Alarm design must separate critical safety events from informational noise.

## Data Classes

- Electrical: voltage, current, active power, reactive power, frequency, energy.
- Battery: SOC, SOH, SOP, cell temperature, rack voltage, alarms.
- Thermal: inlet/outlet, cabinet, coolant, pump, fan, leak.
- Grid: outage, voltage sag/swell, THD, phase imbalance.
- Financial: tariff period, savings estimate, demand peak.

## Alarm Priority

P1 safety shutdown, P2 production impact, P3 maintenance required, P4 advisory.
      `,
    ),
  ],
  [
    "04_ENGINEERING/FAILURE_ANALYSIS/FMEA and Fault Trees.md",
    note(
      "FMEA and Fault Trees",
      ["sirinx/failure-analysis", "fmea", "rca"],
      `
## Summary

Failure analysis must connect symptoms to cause, evidence, affected asset, mitigation, and design rule update.

## Required Fields

- Failure mode.
- Local effect.
- System effect.
- Detection method.
- Severity.
- Occurrence.
- Detectability.
- Mitigation.
- Verification evidence.
- Rule update.

## Fault Tree Root Examples

- No backup power during outage.
- Battery not charging.
- Inverter grid trip.
- Export limit violation.
- High temperature alarm.
- Communication loss.
      `,
    ),
  ],
  [
    "04_ENGINEERING/COMMISSIONING/FAT SAT Commissioning Workflow.md",
    note(
      "FAT SAT Commissioning Workflow",
      ["sirinx/commissioning", "fat", "sat"],
      `
## FAT

Factory acceptance verifies equipment before shipment: nameplate, firmware, protection settings, communication, BMS/PCS handshake, insulation, alarms, documentation, and packaging.

## SAT

Site acceptance verifies installation under real site conditions: grounding, polarity, torque, communication, grid sync, export limit, backup transfer, thermal behavior, alarm reporting, and customer handover.

## Required Evidence

- Photos.
- Screenshots.
- Test sheets.
- Inverter logs.
- BMS logs.
- Meter readings.
- Customer sign-off.
      `,
    ),
  ],
  [
    "04_ENGINEERING/ECONOMICS/Residential Hybrid ESS ROI Thailand.md",
    note(
      "Residential Hybrid ESS ROI Thailand",
      ["sirinx/economics", "roi", "residential-ess"],
      `
## Summary

Hybrid ESS ROI in Thailand must be modeled conservatively. Batteries can improve nighttime self-consumption and outage resilience, but they add CAPEX and degradation.

## Inputs

- Monthly bill.
- Daytime load ratio.
- Nighttime load ratio.
- PV generation estimate.
- Self-consumption ratio.
- Battery usable capacity.
- Battery round-trip efficiency.
- Battery cycle count.
- Tariff/TOU assumption.
- Backup reserve requirement.

## Output

Always show best-case, realistic-case, and weak-case savings. State which customer behavior makes each case true.

## Rule

Do not merge energy freedom value into payback math. Keep resilience value explicit and separate.
      `,
    ),
  ],
]);

const databaseDocs = new Map([
  [
    "13_DATABASES/Approved Equipment Registry.md",
    note(
      "Approved Equipment Registry",
      ["sirinx/database", "equipment", "compliance"],
      `
## Status Model

| Status | Meaning |
|---|---|
| candidate_from_prompt | Captured from user/project knowledge but not yet verified today |
| verified_for_proposal | Exact model found in current official approval source |
| rejected | Not approved or mismatch found |
| expired_review_required | Previously approved but evidence is stale |

## Deye Candidate Models

${[
  "SUN-5K-G05P1-EU-AM2",
  "SUN-10K-G06P3-EU-BM2-P1",
  "SUN-20K-G05",
  "SUN-50K-G04",
  "SUN-100K-G03",
  "SUN-5K-SG04LP1-EU-SM2",
  "SUN-10K-SG02LP1-EU-AM3",
  "SUN-16K-SG01LP1-EU",
  "SUN-5K-SG05LP3-EU-SM2",
  "SUN-10K-SG04LP3-EU",
  "SUN-15K-SG05LP3-EU-SM2",
  "SUN-20K-SG05LP3-EU-SM2",
  "SUN-30K-SG01HP3-EU-BM3",
  "SUN-50K-SG01HP3-EU-BM4",
  "SUN-80K-SG02HP3-EU-EM6",
].map((model) => `- ${model}: candidate_from_prompt`).join("\n")}

## Review Cadence

Verify exact model before every customer-facing proposal and again before procurement.
      `,
    ),
  ],
  [
    "13_DATABASES/Package Catalog Database.md",
    note(
      "Package Catalog Database",
      ["sirinx/database", "packages", "sales"],
      `
\`\`\`dataview
TABLE package_type, system_kw, battery_kwh, target_bill, price_thb, verification_status
FROM #sirinx/packages
SORT system_kw ASC
\`\`\`

## Manual Package Table

| ID | Type | kW | Battery kWh | Price THB |
|---|---|---:|---:|---:|
| OG-5 | on-grid | 5 | 0 | 129000 |
| OG-10 | on-grid | 10 | 0 | 209000 |
| H-5 | hybrid | 5 | 16 | 329000 |
| H-10 | hybrid | 10 | 32 | 529000 |
| H-15 | hybrid | 15 | 48 | 789000 |
| H-20 | hybrid | 20 | 64 | 959000 |
      `,
    ),
  ],
]);

const aiMemoryDocs = new Map([
  [
    "08_AI_MEMORY/AI Memory Architecture.md",
    note(
      "AI Memory Architecture",
      ["sirinx/ai-memory", "rag", "architecture"],
      `
## Memory Types

- Semantic memory: engineering concepts, package rules, equipment specs.
- Episodic memory: project events, customer discussions, test results.
- Decision memory: why a design, package, price, or deployment path was chosen.
- Failure memory: symptoms, causes, evidence, fixes, and prevention rules.
- Operational memory: live telemetry summaries and maintenance actions.

## Storage Rule

Store decisions, commands, evidence, and next actions. Do not store raw chat logs, secrets, passwords, tokens, private customer PII, or unverified claims.

## Retrieval Layers

1. Exact file lookup.
2. Tag and frontmatter filter.
3. Link graph traversal.
4. Embedding/vector search.
5. Reasoned synthesis with source citations.
      `,
    ),
  ],
  [
    "08_AI_MEMORY/RAG Pipeline Design.md",
    note(
      "RAG Pipeline Design",
      ["sirinx/rag", "ai-memory", "automation"],
      `
## Pipeline

1. Ingest markdown, PDFs, datasheets, commissioning forms, and telemetry exports.
2. Normalize metadata.
3. Chunk by engineering topic, not arbitrary size alone.
4. Add source quality and verification status.
5. Embed locally or in approved infrastructure.
6. Retrieve with filters for domain, asset class, and verification status.
7. Answer with citations and uncertainty.

## Local AI Targets

- Ollama for local language models.
- LM Studio for local model testing.
- OpenWebUI for operator interface.
- Local vector database for engineering retrieval.

## Safety

Control actions and external writes require approval gates. Retrieval is allowed; mutation is gated.
      `,
    ),
  ],
]);

const dashboards = new Map([
  [
    "12_DASHBOARDS/Engineering Command Dashboard.md",
    note(
      "Engineering Command Dashboard",
      ["sirinx/dashboard", "command-center"],
      `
## Open Engineering Items

\`\`\`dataview
TABLE status, risk_level, owner, next_action
FROM #sirinx
WHERE status != "closed"
SORT risk_level DESC, file.mtime DESC
\`\`\`

## Approval Gates

- Inverter approval gate.
- Source evidence gate.
- Customer assumption gate.
- Proposal math gate.
- Installation safety gate.
- Telemetry and warranty gate.

## Daily Operator Checklist

1. Check unresolved safety or compliance notes.
2. Review new customer profiles.
3. Validate equipment approval status.
4. Update project telemetry or commissioning evidence.
5. Record decisions in decision memory.
      `,
    ),
  ],
  [
    "12_DASHBOARDS/Knowledge Freshness Dashboard.md",
    note(
      "Knowledge Freshness Dashboard",
      ["sirinx/dashboard", "knowledge-freshness"],
      `
\`\`\`dataview
TABLE updated, verification_status, source_quality, owner
FROM #sirinx
WHERE verification_status = "expired_review_required" OR updated < date(today) - dur(90 days)
SORT updated ASC
\`\`\`

## Freshness Rules

- Equipment approvals: verify before proposal and procurement.
- Prices: verify before quote.
- Regulations: verify before permit submission.
- Datasheets: verify before design freeze.
- Telemetry rules: verify after firmware updates.
      `,
    ),
  ],
]);

const templates = new Map([
  [
    "14_TEMPLATES/Engineering Note Template.md",
    note(
      "Engineering Note Template",
      ["sirinx/template", "engineering"],
      `
## Summary

## Technical Details

## Financial Logic

## Related Notes

## Installation Implications

## Risks

## Upgrade Paths

## Thailand-Specific Insights
      `,
      { template_type: "engineering_note" },
    ),
  ],
  [
    "14_TEMPLATES/Failure Analysis Template.md",
    note(
      "Failure Analysis Template",
      ["sirinx/template", "failure-analysis"],
      `
## Failure Mode

## Symptoms

## Evidence

## Local Effect

## System Effect

## Root Cause Hypotheses

## Tests

## Corrective Action

## Prevention Rule

## Updated Design Rule
      `,
      { template_type: "failure_analysis" },
    ),
  ],
  [
    "14_TEMPLATES/Commissioning Report Template.md",
    note(
      "Commissioning Report Template",
      ["sirinx/template", "commissioning"],
      `
## Project

## Equipment

## Preconditions

## Safety Checks

## Electrical Tests

## Communication Tests

## Functional Tests

## Backup/Transfer Tests

## Export Limit Tests

## Evidence

## Sign-Off
      `,
      { template_type: "commissioning_report" },
    ),
  ],
  [
    "14_TEMPLATES/Utility Compliance Review Template.md",
    note(
      "Utility Compliance Review Template",
      ["sirinx/template", "compliance"],
      `
## Utility

## Project Type

## Inverter Approval Evidence

## Export Control Requirement

## Anti-Islanding Requirement

## Protection Settings

## Drawings Required

## Inspection Evidence

## Open Risks
      `,
      { template_type: "utility_compliance_review" },
    ),
  ],
  [
    "14_TEMPLATES/AI Diagnostic Report Template.md",
    note(
      "AI Diagnostic Report Template",
      ["sirinx/template", "ai-diagnostics"],
      `
## Question

## Evidence Reviewed

## Hypotheses

## Ranked Diagnosis

## Tests To Run

## Safety Constraints

## Recommended Action

## Confidence

## Missing Data
      `,
      { template_type: "ai_diagnostic_report" },
    ),
  ],
]);

const phase2KnowledgeDocs = new Map([
  [
    "07_RESEARCH/Thailand Residential Solar ESS Buyer Intelligence.md",
    note(
      "Thailand Residential Solar ESS Buyer Intelligence",
      ["sirinx/sales", "thailand", "customer-intelligence"],
      `
## Buyer Segments

### High-Load Luxury Residence

Typical loads include multiple inverter air-conditioners, pool pumps, water pumps, EV charging, kitchens, security systems, home theater, and always-on networking. Purchase logic often blends comfort, status, backup power, and long-term energy independence.

### Home Office Or Family Business Residence

The sale is driven by uptime, predictable operating cost, staff productivity, and protection from grid interruption. Backup scope must be explicit: networking, lights, workstations, refrigerators, pumps, selected AC circuits, and security.

### Large Village / Estate Project

The decision may involve developer reputation, common-area energy cost, EV readiness, clubhouse load, future battery expansion, and long-term service contract.

## Qualification Signals

- Monthly electricity bill above 6,000 THB.
- Heavy night-time AC usage.
- Backup concern after outages or voltage instability.
- EV purchase plan.
- Existing generator dissatisfaction.
- Desire for verifiable installation evidence rather than generic marketing.

## Sales Guardrail

Do not counter market distrust with vague guarantee language. Use evidence: installed project photos, commissioning records, monitoring screenshots, warranty documents, and clear assumptions.
      `,
    ),
  ],
  [
    "06_OPERATIONS/Residential ESS Sales Qualification Workflow.md",
    note(
      "Residential ESS Sales Qualification Workflow",
      ["sirinx/sales", "workflow", "qualification"],
      `
## Intake Questions

1. Monthly electricity bill for the last 3-12 months.
2. Daytime usage ratio and night-time usage ratio.
3. Number and size of air-conditioners.
4. Phase type: single-phase or three-phase.
5. Roof area, direction, shading, and roof material.
6. Critical loads requiring backup.
7. Budget range.
8. EV plan.
9. Expansion plan.
10. Motivation: savings, backup, comfort, independence, or property value.

## Routing

| Condition | Likely Path |
|---|---|
| High daytime load, low backup need | On-grid first |
| Heavy night usage, backup expectation | Hybrid ESS |
| Three-phase high peak load | H-15/H-20 or engineered project |
| Budget sensitive | Smaller on-grid with future-ready design |
| Critical uptime required | Hybrid plus critical-load panel design |

## Required Output

- Package recommendation.
- Assumptions.
- What the package does not cover.
- ROI range.
- Backup scope.
- Next site-survey checklist.
      `,
    ),
  ],
  [
    "06_OPERATIONS/Residential ESS Proposal Workflow.md",
    note(
      "Residential ESS Proposal Workflow",
      ["sirinx/proposal", "workflow", "sales-engineering"],
      `
## Proposal Sections

1. Customer load summary.
2. Recommended package and why.
3. Equipment approval status.
4. PV and battery design assumptions.
5. Backup scope.
6. Savings model with best, realistic, and weak cases.
7. Energy independence value.
8. Installation workflow.
9. Risks and exclusions.
10. Next action.

## Required Evidence Before Customer Release

- Bill evidence or customer-declared bill marked as unverified.
- Site photo or survey pending marker.
- PEA Smartlist inverter verification.
- Datasheet verification.
- Roof and phase assumptions.
- No unrealistic ROI claim.

## Approval Gate

Engineer or senior sales engineer must review proposal math before it is sent externally.
      `,
    ),
  ],
  [
    "04_ENGINEERING/ECONOMICS/Solar ROI Model - Thailand Residential.md",
    note(
      "Solar ROI Model - Thailand Residential",
      ["sirinx/roi", "economics", "thailand"],
      `
## Model Purpose

Estimate conservative savings ranges for Thailand residential solar and hybrid ESS without promising exact returns.

## Inputs

- Monthly bill.
- Effective energy tariff.
- PV system size.
- Package price.
- Daytime self-consumption ratio.
- Battery usable capacity.
- Battery cycle behavior.
- Backup reserve.
- Export limitation.

## Calculation Logic

Monthly kWh estimate = monthly bill / effective tariff.

On-grid savings depends mainly on daytime self-consumption. Hybrid savings depends on PV generation, battery cycling, round-trip efficiency, and night-load capture. Backup value is not converted into ROI unless the customer assigns an explicit outage cost.

## Output Bands

- Weak case: low daytime use, low battery cycling, high backup reserve.
- Realistic case: measured load pattern or conservative declared usage.
- Best case: high daytime load, effective load shifting, low curtailment.

## Guardrail

Payback must be shown as a range, and every range must state behavior assumptions.
      `,
    ),
  ],
  [
    "13_DATABASES/Solar ROI Assumption Database.md",
    note(
      "Solar ROI Assumption Database",
      ["sirinx/database", "roi", "assumptions"],
      `
## Default Assumptions

| Assumption | Default | Reason |
|---|---:|---|
| Effective residential tariff | 4.2 THB/kWh | Conservative planning placeholder |
| Annual PV yield per kWp | 1450 kWh/year | Thailand planning estimate; verify per site |
| Hybrid round-trip efficiency | 0.9 | Conservative battery/inverter path |
| Battery usable DoD | 0.9 | GSL prompt spec; verify datasheet |
| Weak self-consumption | 0.35 | Low daytime use |
| Realistic self-consumption | 0.60 | Mixed home load |
| Strong self-consumption | 0.80 | High daytime or controlled load |

## Review Rule

These defaults are not quote guarantees. Replace with site data whenever bills, interval data, or inverter telemetry is available.
      `,
    ),
  ],
  [
    "12_DASHBOARDS/Sales Engineering Dashboard.md",
    note(
      "Sales Engineering Dashboard",
      ["sirinx/dashboard", "sales-engineering"],
      `
## Proposal Readiness

\`\`\`dataview
TABLE status, verification_status, risk_level, next_action
FROM #sirinx/proposal OR #sirinx/sales
SORT file.mtime DESC
\`\`\`

## Review Checklist

- Customer bill captured.
- Load ratio declared or measured.
- Package selected.
- ROI assumptions stated.
- Backup scope stated.
- PEA inverter check complete.
- Site survey requirement clear.
- No guarantee language beyond evidence.
      `,
    ),
  ],
  [
    "14_TEMPLATES/Residential Solar ESS Proposal Template.md",
    note(
      "Residential Solar ESS Proposal Template",
      ["sirinx/template", "proposal", "residential-ess"],
      `
## Customer Summary

## Recommended System

## Why This Package Fits

## Savings Model

### Weak Case

### Realistic Case

### Best Case

## Energy Independence Value

## Backup Scope

## Equipment Approval Evidence

## Installation Plan

## Risks And Exclusions

## Next Action
      `,
      { template_type: "residential_solar_ess_proposal" },
    ),
  ],
]);

const automationReadme = note(
  "Automation README",
  ["sirinx/automation", "local-first"],
  `
## Purpose

Local utilities in this folder support safe vault maintenance. They do not call external SaaS by default and do not read secret files.

## Utilities

- vault_ingest.py: scans markdown notes and creates a lightweight local index.
- knowledge_freshness.py: reports notes that need review by updated date or verification status.
- solar_roi_calculator.py: produces conservative on-grid/hybrid package and payback estimates from local JSON input.
- proposal_brief_generator.py: turns a local customer JSON file into a proposal brief draft.

## Control Rule

These scripts are allowed to read markdown notes under the SIRINX vault. They must not read .env files, shell history, key material, or private credentials.
  `,
);

const vaultIngestPy = `#!/usr/bin/env python3
# ${marker}
from __future__ import annotations

import json
from pathlib import Path

VAULT = Path("/Users/sirinx/Documents/Obsidian Vault/SIRINX")
OUT = VAULT / "13_DATABASES" / "local_markdown_index.json"


def frontmatter(text: str) -> dict:
    if not text.startswith("---\\n"):
        return {}
    end = text.find("\\n---\\n", 4)
    if end == -1:
        return {}
    data = {}
    for line in text[4:end].splitlines():
        if ":" in line and not line.startswith("  "):
            key, value = line.split(":", 1)
            data[key.strip()] = value.strip().strip('"')
    return data


def main() -> None:
    records = []
    for note in VAULT.rglob("*.md"):
        if ".obsidian" in note.parts:
            continue
        text = note.read_text(encoding="utf-8", errors="ignore")
        meta = frontmatter(text)
        records.append(
            {
                "path": str(note.relative_to(VAULT)),
                "title": meta.get("title") or note.stem,
                "status": meta.get("status"),
                "mtime": note.stat().st_mtime,
                "links": text.count("[["),
            }
        )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"indexed {len(records)} markdown notes -> {OUT}")


if __name__ == "__main__":
    main()
`;

const solarRoiCalculatorPy = `#!/usr/bin/env python3
# ${marker}
from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any


PACKAGES = [
    {"id": "OG-5", "type": "on-grid", "kw": 5, "battery_kwh": 0, "price": 129000, "target_min": 2000, "target_max": 4000},
    {"id": "OG-10", "type": "on-grid", "kw": 10, "battery_kwh": 0, "price": 209000, "target_min": 4000, "target_max": 8000},
    {"id": "H-5", "type": "hybrid", "kw": 5, "battery_kwh": 16, "price": 329000, "target_min": 4000, "target_max": 6000},
    {"id": "H-10", "type": "hybrid", "kw": 10, "battery_kwh": 32, "price": 529000, "target_min": 6000, "target_max": 10000},
    {"id": "H-15", "type": "hybrid", "kw": 15, "battery_kwh": 48, "price": 789000, "target_min": 10000, "target_max": 16000},
    {"id": "H-20", "type": "hybrid", "kw": 20, "battery_kwh": 64, "price": 959000, "target_min": 16000, "target_max": 26000},
]


@dataclass
class RoiCase:
    name: str
    self_consumption: float
    estimated_monthly_savings_thb: int
    estimated_payback_years: float | None


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def choose_package(monthly_bill: float, backup_priority: str, phase_type: str) -> dict[str, Any]:
    wants_backup = backup_priority.lower() in {"high", "critical", "yes", "true"}
    candidates = [p for p in PACKAGES if (p["type"] == "hybrid") == wants_backup]
    for package in candidates:
        if package["target_min"] <= monthly_bill <= package["target_max"]:
            return package
    if wants_backup and phase_type.lower() in {"3", "3p", "three-phase", "3-phase"}:
        return PACKAGES[4] if monthly_bill <= 16000 else PACKAGES[5]
    return candidates[-1] if monthly_bill > candidates[-1]["target_max"] else candidates[0]


def evaluate(customer: dict[str, Any]) -> dict[str, Any]:
    monthly_bill = float(customer.get("monthly_bill_thb", 0))
    tariff = float(customer.get("effective_tariff_thb_per_kwh", 4.2))
    daytime_ratio = clamp(float(customer.get("daytime_load_ratio", 0.5)), 0, 1)
    backup_priority = str(customer.get("backup_priority", "medium"))
    phase_type = str(customer.get("phase_type", "unknown"))
    annual_yield_per_kwp = float(customer.get("annual_yield_per_kwp", 1450))

    package = choose_package(monthly_bill, backup_priority, phase_type)
    monthly_kwh = monthly_bill / tariff if tariff > 0 else 0
    monthly_pv_kwh = package["kw"] * annual_yield_per_kwp / 12

    weak_sc = clamp(min(daytime_ratio, 0.35), 0.2, 0.45)
    realistic_sc = clamp(max(daytime_ratio, 0.55 if package["type"] == "hybrid" else 0.5), 0.35, 0.75)
    best_sc = clamp(max(daytime_ratio, 0.75 if package["type"] == "hybrid" else 0.7), 0.55, 0.9)
    if package["type"] == "hybrid":
        realistic_sc = clamp(realistic_sc + 0.1, 0.45, 0.85)
        best_sc = clamp(best_sc + 0.05, 0.6, 0.92)

    cases: list[RoiCase] = []
    for name, sc in [("weak", weak_sc), ("realistic", realistic_sc), ("best", best_sc)]:
        captured_kwh = min(monthly_kwh, monthly_pv_kwh * sc)
        savings = int(round(captured_kwh * tariff))
        annual = savings * 12
        payback = round(package["price"] / annual, 1) if annual > 0 else None
        cases.append(RoiCase(name, round(sc, 2), savings, payback))

    return {
        "customer": customer,
        "recommended_package": package,
        "estimated_monthly_kwh": round(monthly_kwh, 1),
        "estimated_monthly_pv_kwh": round(monthly_pv_kwh, 1),
        "cases": [asdict(case) for case in cases],
        "warnings": [
            "This is a planning model, not a production guarantee.",
            "Verify roof, shading, phase type, inverter approval, export limits, and real load profile before proposal.",
            "Battery resilience value is separate from financial payback.",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="SIRINX local solar ROI planning calculator")
    parser.add_argument("--input", type=Path, help="Customer JSON input file")
    parser.add_argument("--sample", action="store_true", help="Print sample input JSON")
    args = parser.parse_args()

    if args.sample:
        print(json.dumps({
            "customer_name": "Sample Home Office",
            "monthly_bill_thb": 8500,
            "daytime_load_ratio": 0.45,
            "backup_priority": "high",
            "phase_type": "3-phase",
            "effective_tariff_thb_per_kwh": 4.2
        }, indent=2))
        return

    if not args.input:
        raise SystemExit("--input is required unless --sample is used")
    customer = json.loads(args.input.read_text(encoding="utf-8"))
    print(json.dumps(evaluate(customer), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
`;

const proposalBriefGeneratorPy = `#!/usr/bin/env python3
# ${marker}
from __future__ import annotations

import argparse
import json
from pathlib import Path

from solar_roi_calculator import evaluate


def brief(customer: dict) -> str:
    result = evaluate(customer)
    package = result["recommended_package"]
    cases = result["cases"]
    customer_name = customer.get("customer_name", "Unnamed Customer")
    critical_loads = customer.get("critical_loads", ["networking", "lights", "refrigerator"])
    lines = [
        f"# Residential Solar ESS Proposal Brief - {customer_name}",
        "",
        "## Customer Summary",
        "",
        f"- Monthly bill: {customer.get('monthly_bill_thb', 'unknown')} THB",
        f"- Daytime load ratio: {customer.get('daytime_load_ratio', 'unknown')}",
        f"- Backup priority: {customer.get('backup_priority', 'unknown')}",
        f"- Phase type: {customer.get('phase_type', 'unknown')}",
        "",
        "## Recommended Package",
        "",
        f"- Package: {package['id']}",
        f"- Type: {package['type']}",
        f"- Inverter class: {package['kw']} kW",
        f"- Battery: {package['battery_kwh']} kWh",
        f"- Planning price: {package['price']} THB",
        "",
        "## Savings Range",
        "",
        "| Case | Self-consumption | Monthly savings | Payback |",
        "|---|---:|---:|---:|",
    ]
    for case in cases:
        payback = case["estimated_payback_years"]
        payback_text = "n/a" if payback is None else f"{payback} years"
        lines.append(
            f"| {case['name']} | {case['self_consumption']} | {case['estimated_monthly_savings_thb']} THB | {payback_text} |"
        )
    lines.extend([
        "",
        "## Backup Scope Draft",
        "",
        *[f"- {load}" for load in critical_loads],
        "",
        "## Required Verification Before Sending",
        "",
        "- PEA Smartlist exact inverter model check.",
        "- Roof and shading survey.",
        "- Phase and load-panel verification.",
        "- Export-limit requirement.",
        "- Proposal math review by engineer or senior sales engineer.",
        "",
        "## Guardrail",
        "",
        "This brief is a local planning draft. It is not a customer-facing guarantee until evidence and approvals are attached.",
    ])
    return "\\n".join(lines) + "\\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate SIRINX residential solar ESS proposal brief from local JSON")
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    customer = json.loads(args.input.read_text(encoding="utf-8"))
    content = brief(customer)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(content, encoding="utf-8")
        print(args.output)
    else:
        print(content)


if __name__ == "__main__":
    main()
`;

const freshnessPy = `#!/usr/bin/env python3
# ${marker}
from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path

VAULT = Path("/Users/sirinx/Documents/Obsidian Vault/SIRINX")
STALE_DAYS = 90


def main() -> None:
    cutoff = datetime.now().timestamp() - timedelta(days=STALE_DAYS).total_seconds()
    stale = []
    for note in VAULT.rglob("*.md"):
        if ".obsidian" in note.parts:
            continue
        text = note.read_text(encoding="utf-8", errors="ignore")
        needs_review = "verification_status: expired_review_required" in text
        old = note.stat().st_mtime < cutoff
        if needs_review or old:
            stale.append(note.relative_to(VAULT))
    for item in stale:
        print(item)
    print(f"stale_or_review_required={len(stale)}")


if __name__ == "__main__":
    main()
`;

const cssTheme = `/* ${marker} */
:root {
  --sirinx-bg: #061311;
  --sirinx-panel: #0b1e1b;
  --sirinx-grid: rgba(95, 245, 214, 0.16);
  --sirinx-cyan: #66f5dd;
  --sirinx-gold: #f0c66c;
  --sirinx-danger: #ff5f73;
  --sirinx-ok: #7dff9f;
}

.markdown-preview-view {
  background:
    linear-gradient(rgba(102, 245, 221, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(102, 245, 221, 0.03) 1px, transparent 1px),
    var(--sirinx-bg);
  background-size: 32px 32px;
}

.markdown-preview-view h1,
.markdown-preview-view h2,
.markdown-preview-view h3 {
  color: var(--sirinx-cyan);
}

.markdown-preview-view table {
  border: 1px solid var(--sirinx-grid);
}

.markdown-preview-view blockquote {
  border-left-color: var(--sirinx-gold);
}

.sirinx-risk-high {
  color: var(--sirinx-danger);
  font-weight: 700;
}

.sirinx-state-ok {
  color: var(--sirinx-ok);
  font-weight: 700;
}
`;

const canvas = JSON.stringify(
  {
    generated_by: "sirinx-omega-vault-generator",
    nodes: [
      { id: "pv", type: "text", text: "PV Array", x: 0, y: 0, width: 240, height: 80 },
      { id: "pcs", type: "text", text: "PCS / Hybrid Inverter", x: 320, y: 0, width: 260, height: 80 },
      { id: "battery", type: "text", text: "Battery / BMS", x: 320, y: 160, width: 260, height: 80 },
      { id: "grid", type: "text", text: "Grid / PCC / Export Limit", x: 660, y: 0, width: 280, height: 80 },
      { id: "load", type: "text", text: "Critical + Flexible Loads", x: 660, y: 160, width: 280, height: 80 },
      { id: "ems", type: "text", text: "EMS / Dispatch / Telemetry", x: 320, y: 320, width: 280, height: 80 },
    ],
    edges: [
      { id: "e1", fromNode: "pv", fromSide: "right", toNode: "pcs", toSide: "left" },
      { id: "e2", fromNode: "battery", fromSide: "top", toNode: "pcs", toSide: "bottom" },
      { id: "e3", fromNode: "pcs", fromSide: "right", toNode: "grid", toSide: "left" },
      { id: "e4", fromNode: "pcs", fromSide: "right", toNode: "load", toSide: "left" },
      { id: "e5", fromNode: "ems", fromSide: "top", toNode: "pcs", toSide: "bottom" },
      { id: "e6", fromNode: "ems", fromSide: "right", toNode: "grid", toSide: "bottom" },
    ],
  },
  null,
  2,
);

const repoDocs = new Map([
  [
    "SIRINX_SOLAR_INTELLIGENCE_MASTER_PROMPT.md",
    note(
      "SIRINX Solar Intelligence Master Prompt",
      ["sirinx/codex", "solar-intelligence", "source-of-truth"],
      `
## Role

SIRINX operates as a Thailand solar ESS architect, sales engineer, financial modeler, installer workflow designer, and Obsidian knowledge operating system.

## Required Reasoning

- Energy flow.
- Cashflow.
- Electrical constraints.
- Thai utility structure.
- User behavior.
- ESS lifecycle economics.
- Long-term operational efficiency.

## Thailand Rules

- Never recommend an inverter as approved until exact model is checked in current PEA Smartlist evidence.
- On-grid generally has stronger ROI when daytime self-consumption is high.
- Hybrid generally has weaker payback but stronger resilience, backup, comfort, and energy independence value.
- Battery sales must separate financial ROI from emotional/security value.

## Output Quality

Every technical output must include assumptions, constraints, risk, validation path, and next action.
      `,
    ),
  ],
  [
    "SIRINX_ENERGY_OBSIDIAN_SUPER_BRAIN_DESIGN.md",
    note(
      "SIRINX Energy Obsidian Super Brain Design",
      ["sirinx/obsidian", "system-design", "energy-os"],
      `
## Design Goal

Create a local-first Obsidian vault that acts as the institutional memory for SIRINX solar, ESS, BESS, SCADA, EPC, sales engineering, AI automation, and failure analysis.

## Generated Vault Root

\`/Users/sirinx/Documents/Obsidian Vault/SIRINX\`

## System Components

- Core doctrine and package knowledge.
- Engineering MOCs.
- Atomic engineering notes.
- Dataview dashboards.
- Templates for engineering, commissioning, failure analysis, utility compliance, and AI diagnostics.
- AI memory architecture and local RAG design.
- Local Python utilities for indexing and freshness checks.
- Industrial Obsidian CSS snippet.
- Canvas topology starter.

## Non-Destructive Rule

The generator only overwrites files carrying its own generated marker. Existing human-written notes are skipped.
      `,
    ),
  ],
  [
    "SIRINX_THAILAND_SOLAR_ESS_KNOWLEDGE_ENGINE.md",
    note(
      "SIRINX Thailand Solar ESS Knowledge Engine",
      ["sirinx/thailand", "ess", "knowledge-engine"],
      `
## Engine Inputs

- Monthly bill.
- Daytime and nighttime load ratio.
- Air-conditioner count.
- Phase type.
- Roof area and shading.
- Backup expectation.
- Budget.
- EV plan.
- Future expansion.
- Emotional drivers.

## Engine Outputs

- Suggested package.
- Design assumptions.
- PV size.
- Battery size.
- Inverter class.
- Backup scope.
- Best, realistic, and weak savings cases.
- Payback period with explicit assumptions.
- Energy freedom value separated from financial return.

## Approval Gates

- PEA Smartlist inverter verification.
- Datasheet verification.
- Load profile verification.
- Site survey verification.
- Proposal math review.
      `,
    ),
  ],
  [
    "SIRINX_OMEGA_VAULT_IMPLEMENTATION_REPORT_2026-05-19.md",
    note(
      "SIRINX Omega Vault Implementation Report 2026-05-19",
      ["sirinx/report", "obsidian", "implementation"],
      `
## Scope

Phase 1 creates the local-first vault structure, core doctrine, MOCs, atomic engineering seed notes, dashboards, templates, CSS, canvas, and local automation utilities.

## Exclusions

- No live website runtime changes.
- No Cloudflare deployment.
- No external SaaS writes.
- No secrets read or printed.
- No production telemetry connection.

## Verification

Run:

\`\`\`bash
node /Users/sirinx/sirinx-os/tools/generate_sirinx_omega_vault.mjs
python3 "/Users/sirinx/Documents/Obsidian Vault/SIRINX/09_AUTOMATIONS/vault_ingest.py"
python3 "/Users/sirinx/Documents/Obsidian Vault/SIRINX/09_AUTOMATIONS/knowledge_freshness.py"
\`\`\`

## Next Phase

Build proposal calculator and lead intake backend after this knowledge base is committed and reviewed.
      `,
    ),
  ],
  [
    "SIRINX_SOLAR_ROI_PROPOSAL_ENGINE_PHASE_2.md",
    note(
      "SIRINX Solar ROI Proposal Engine Phase 2",
      ["sirinx/roi", "proposal", "implementation"],
      `
## Scope

Phase 2 adds a local sales-engineering layer on top of the Obsidian vault.

## Added Artifacts

- Residential ESS buyer intelligence.
- Sales qualification workflow.
- Proposal workflow.
- Residential ROI model.
- ROI assumption database.
- Sales engineering dashboard.
- Residential proposal template.
- Local ROI calculator utility.
- Local proposal brief generator.

## Runtime Safety

This phase does not touch the public website, Cloudflare, production lead endpoints, Supabase, Solis, Telegram, LINE, customer data, or external SaaS.

## Validation

Use a local JSON customer profile only:

\`\`\`bash
python3 "/Users/sirinx/Documents/Obsidian Vault/SIRINX/09_AUTOMATIONS/solar_roi_calculator.py" --sample
python3 "/Users/sirinx/Documents/Obsidian Vault/SIRINX/09_AUTOMATIONS/solar_roi_calculator.py" --input /tmp/sirinx-sample-customer.json
python3 "/Users/sirinx/Documents/Obsidian Vault/SIRINX/09_AUTOMATIONS/proposal_brief_generator.py" --input /tmp/sirinx-sample-customer.json
\`\`\`

## Next Phase

After local proposal math is stable, wire a read-only lead intake schema and Command Center status model. Production lead POST must remain separately gated.
      `,
    ),
  ],
]);

async function main() {
  for (const dir of topDirs) {
    await ensureDir(path.join(vaultRoot, dir));
  }
  for (const dir of engineeringDirs) {
    await ensureDir(path.join(vaultRoot, "04_ENGINEERING", dir));
  }

  const allVaultDocs = new Map([
    ...coreDocs,
    ...mocs,
    ...knowledgeGraphDocs,
    ...engineeringNotes,
    ...databaseDocs,
    ...aiMemoryDocs,
    ...dashboards,
    ...templates,
    ...phase2KnowledgeDocs,
    ["09_AUTOMATIONS/README.md", automationReadme],
  ]);

  for (const [relativePath, content] of allVaultDocs) {
    await writeGenerated(path.join(vaultRoot, relativePath), content);
  }

  await writeGenerated(path.join(vaultRoot, "09_AUTOMATIONS", "vault_ingest.py"), vaultIngestPy);
  await writeGenerated(path.join(vaultRoot, "09_AUTOMATIONS", "knowledge_freshness.py"), freshnessPy);
  await writeGenerated(path.join(vaultRoot, "09_AUTOMATIONS", "solar_roi_calculator.py"), solarRoiCalculatorPy);
  await writeGenerated(path.join(vaultRoot, "09_AUTOMATIONS", "proposal_brief_generator.py"), proposalBriefGeneratorPy);
  await writeGenerated(path.join(vaultRoot, ".obsidian", "snippets", "sirinx-industrial-cyberpunk.css"), cssTheme);
  await writeNewOnly(path.join(vaultRoot, "15_CANVAS", "ESS Topology.canvas"), canvas);

  const manifest = note(
    "SIRINX Omega Vault Manifest",
    ["sirinx/manifest", "obsidian"],
    `
## Generated On

${RUN_DATE}

## Vault Root

\`${vaultRoot}\`

## Directories

${topDirs.map((dir) => `- ${dir}`).join("\n")}

## Engineering Subdirectories

${engineeringDirs.map((dir) => `- 04_ENGINEERING/${dir}`).join("\n")}

## Files Written In Last Run

${written.map((file) => `- ${file}`).join("\n") || "- None"}

## Files Skipped Because They Were User-Owned Or Pre-Existing

${skipped.map((file) => `- ${file}`).join("\n") || "- None"}
    `,
  );
  await writeGenerated(path.join(vaultRoot, "02_META", "SIRINX Omega Vault Manifest.md"), manifest);

  for (const [relativePath, content] of repoDocs) {
    await writeGenerated(path.join(repoKnowledge, relativePath), content);
  }

  console.log(JSON.stringify({ written: written.length, skipped: skipped.length, vaultRoot, repoKnowledge }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
