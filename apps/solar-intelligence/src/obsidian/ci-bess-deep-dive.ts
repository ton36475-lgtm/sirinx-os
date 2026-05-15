import type { CommercialBessDesign } from "../domain/ci-bess-types.js";

export interface DeepDiveTopic {
  id: string;
  title: string;
  category: "commissioning" | "controls" | "power" | "safety" | "economics" | "delivery" | "data";
  summary: string;
  sections: Array<{
    heading: string;
    bullets: string[];
  }>;
  links: string[];
}

function formatBullets(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function frontmatter(topic: DeepDiveTopic, design: CommercialBessDesign): string {
  return `---
type: ci-bess-deep-dive
project_id: "${design.project.projectId}"
category: "${topic.category}"
system: "Hybrid PV + BESS + STS + Critical Load"
tags: ["solar", "ci-bess", "${topic.category}", "energy-router"]
---
`;
}

export function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function renderDeepDiveTopic(topic: DeepDiveTopic, design: CommercialBessDesign): string {
  return `${frontmatter(topic, design)}
# ${topic.title}

## Purpose

${topic.summary}

## Project Context

- Battery architecture: ${design.battery.parallelCells}P${design.battery.seriesCells}S ${design.battery.chemistry}
- Nominal DC bus: ${design.nominalDcVoltageV.value} V
- Operating DC range: ${design.battery.operatingVoltageMinVdc}-${design.battery.operatingVoltageMaxVdc} VDC
- PCS rating: ${design.pcs.ratedPowerKw} kW
- STS target: ${design.sts.transferTimeMs} ms
- Critical load: ${design.project.criticalLoadKw.value} kW
- Autonomy estimate: ${design.criticalLoadAutonomyHours.value} hours

${topic.sections
  .map(
    (section) => `## ${section.heading}

${formatBullets(section.bullets)}`
  )
  .join("\n\n")}

## Linked Knowledge

${topic.links.map((link) => `- [[${link}]]`).join("\n")}

## Engineering Guardrail

This note is generated from operator-provided project knowledge. Before EPC release, attach OEM manuals, as-built wiring diagrams, protection settings, utility requirements, and commissioning evidence signed by the responsible engineer.
`;
}

export function buildCommercialBessDeepDiveTopics(design: CommercialBessDesign): DeepDiveTopic[] {
  return [
    {
      id: "commissioning-engineer-knowledge",
      title: "Commissioning Engineer Knowledge",
      category: "commissioning",
      summary:
        "Field commissioning converts the C&I BESS from installed hardware into a verified cyber-physical energy system with measured evidence.",
      sections: [
        {
          heading: "Commissioning Sequence",
          bullets: [
            "Confirm mechanical installation, cabinet clearances, grounding, signage, escape route, fire detection, and E-stop accessibility.",
            "Verify HVDC insulation resistance before closing battery string or PCS DC contactors.",
            "Validate AC phase sequence, neutral, earth, grid voltage, and protection coordination before PCS synchronization.",
            "Confirm BMS CAN data: SOC, voltage, current, temperature, charge/discharge limits, alarms, and heartbeat.",
            "Run PCS precharge, DC bus ramp, grid-following sync, grid-forming island, STS transfer, and EMS strategy tests in controlled order."
          ]
        },
        {
          heading: "Evidence Pack",
          bullets: [
            "IR test record, phase-sequence record, CT polarity screenshots, CAN/BMS communication screenshots, PCS parameter export, EMS strategy export.",
            "STS transfer waveform or event log proving transfer time and critical-load continuity.",
            "Alarm test evidence for smoke, gas, thermal, liquid-cooling, door, E-stop, and communication loss.",
            "As-built single-line diagram and wiring markup after field changes."
          ]
        }
      ],
      links: ["installation/ci-bess-commissioning-checklist", "failure-cases/commercial-bess-failure-modes"]
    },
    {
      id: "ems-logic-step-by-step",
      title: "EMS Logic Step By Step",
      category: "controls",
      summary:
        "EMS is the economic and operational brain: it decides when to charge, discharge, reserve energy, prevent export, and protect critical loads.",
      sections: [
        {
          heading: "Control Loop",
          bullets: [
            "Read grid meter, PV production, PCS status, BMS SOC, critical-load demand, generator state, and STS source status.",
            "Apply hard safety limits first: BMS limits, PCS limits, fire alarms, E-stop, communication loss, and minimum backup SOC.",
            "Apply utility constraints next: zero-export or export limit using anti-reverse meter feedback.",
            "Apply business objective after safety: peak shaving, TOU arbitrage, PV self-consumption, diesel displacement, or manual commissioning mode.",
            "Write PCS setpoint and record decision reason, measured values, estimated values, and active rule."
          ]
        },
        {
          heading: "SOC Reserve Logic",
          bullets: [
            "Separate economic SOC from backup SOC reserve.",
            "Do not use backup reserve for peak shaving unless operator override is approved and logged.",
            "Increase reserve before forecast outage windows, poor grid quality periods, or generator maintenance."
          ]
        }
      ],
      links: ["engineering/ems-logic-commercial-bess", "failure-cases/ems-reserve-misconfigured"]
    },
    {
      id: "power-flow-every-mode",
      title: "Power Flow Every Mode",
      category: "power",
      summary:
        "Power-flow mapping makes the system explainable across grid-connected, PV surplus, peak shaving, outage, generator, and recovery modes.",
      sections: [
        {
          heading: "Normal Grid Connected",
          bullets: [
            "PV feeds load first; grid supplies deficit; BESS idles or follows EMS economic dispatch.",
            "PCS operates grid-following and synchronizes to grid voltage and frequency.",
            "Anti-export meter confirms export direction stays within permission."
          ]
        },
        {
          heading: "Grid Failure",
          bullets: [
            "STS detects abnormal grid source and transfers critical-load bus to ESS-supported source within target time.",
            "PCS switches to grid-forming mode where supported and provides voltage/frequency reference.",
            "EMS freezes noncritical economic dispatch and preserves critical-load continuity."
          ]
        },
        {
          heading: "Generator Support",
          bullets: [
            "Generator may feed critical load, charge BESS, or support recovery depending on approved sequence.",
            "EMS must avoid unstable generator loading, reverse power, and bad synchronization."
          ]
        }
      ],
      links: ["engineering/hybrid-commercial-bess-pv-sts-critical-load", "engineering/sts-synchronization-and-transfer"]
    },
    {
      id: "bms-architecture-deep",
      title: "BMS Architecture Deep",
      category: "controls",
      summary:
        "BMS protects the 1P260S HV battery by supervising cell voltage, temperature, SOC, SOH, contactors, alarms, and PCS limits.",
      sections: [
        {
          heading: "BMS Responsibilities",
          bullets: [
            "Measure cell/module voltage and temperature across the high-voltage string.",
            "Estimate SOC and SOH using calibrated voltage, current, temperature, and capacity models.",
            "Publish charge current limit, discharge current limit, max/min voltage, SOC, alarms, and contactor state to PCS over CAN.",
            "Control contactors, precharge permissive, HV interlock, and fault lockout."
          ]
        },
        {
          heading: "Commissioning Checks",
          bullets: [
            "Confirm CAN baud rate, protocol profile, heartbeat, endian/sign convention, scaling, and alarm map.",
            "Verify cell voltage spread, module temperature spread, SOC calibration, and contactor feedback.",
            "Trigger safe simulated alarm where allowed and confirm PCS derates or stops."
          ]
        }
      ],
      links: ["failure-cases/bms-protocol-mismatch", "engineering/hybrid-commercial-bess-pv-sts-critical-load"]
    },
    {
      id: "pcs-control-loop",
      title: "PCS Control Loop",
      category: "power",
      summary:
        "PCS is the power-electronics intelligence layer that converts DC to AC, follows or forms the grid, and executes EMS setpoints safely.",
      sections: [
        {
          heading: "Control Layers",
          bullets: [
            "Inner current loop controls inverter current and protects semiconductors.",
            "DC-link control manages bus stability and precharge behavior.",
            "Grid-following PLL synchronizes to grid frequency and phase during normal operation.",
            "Grid-forming control provides voltage/frequency reference during island operation when enabled.",
            "Outer EMS setpoint loop commands active power, reactive power, charge, discharge, or standby."
          ]
        },
        {
          heading: "Engineering Constraints",
          bullets: [
            "PCS must respect BMS current limits, voltage limits, thermal derating, grid code, and protection settings.",
            "Transition between grid-following and grid-forming must be tested with STS and critical load.",
            "Reactive compensation and harmonic governance must be validated against real site power quality data."
          ]
        }
      ],
      links: ["engineering/sts-synchronization-and-transfer", "failure-cases/commercial-bess-failure-modes"]
    },
    {
      id: "grid-synchronization",
      title: "Grid Synchronization",
      category: "power",
      summary:
        "Synchronization prevents transient events by checking voltage, frequency, phase angle, and source quality before connection or transfer.",
      sections: [
        {
          heading: "Required Signals",
          bullets: [
            "Grid voltage and frequency within allowed window.",
            "Phase rotation and phase angle acceptable for transfer.",
            "PCS output synchronized to target source before closing transfer path.",
            "STS sync signals such as SYNC1, SYNC2, and carrier synchronization verified across cabinets."
          ]
        },
        {
          heading: "Bad Sync Consequences",
          bullets: [
            "Inrush current, torque shock on motors, voltage transient, breaker trip, PCS fault, or critical-load reboot.",
            "Parallel cabinets can circulate current if carrier/sync references are mismatched.",
            "Generator and PCS interaction can become unstable without controlled sync and load sharing."
          ]
        }
      ],
      links: ["engineering/sts-synchronization-and-transfer", "failure-cases/commercial-bess-failure-modes"]
    },
    {
      id: "protection-coordination",
      title: "Protection Coordination",
      category: "safety",
      summary:
        "Protection coordination ensures faults are cleared by the correct device without unnecessary loss of critical load.",
      sections: [
        {
          heading: "Protection Domains",
          bullets: [
            "HVDC battery protection: fuses, contactors, insulation monitoring, precharge, and DC disconnect.",
            "AC protection: breakers, RCD/earth fault where applicable, surge protection, grid protection relay, and STS source protection.",
            "Control protection: E-stop, fire alarm input, BMS trip, PCS trip, EMS command inhibit."
          ]
        },
        {
          heading: "Coordination Outputs",
          bullets: [
            "Single-line diagram with device ratings and trip curves.",
            "Fault-current assumptions for grid, PCS island mode, and generator mode.",
            "Load segmentation between critical and noncritical panels."
          ]
        }
      ],
      links: ["installation/ci-bess-commissioning-checklist", "regulations/thailand-grid-compliance"]
    },
    {
      id: "sizing-methodology",
      title: "Sizing Methodology",
      category: "power",
      summary:
        "Sizing aligns energy capacity, PCS power, STS rating, PV capacity, critical-load profile, economic objective, and safety reserve.",
      sections: [
        {
          heading: "Sizing Inputs",
          bullets: [
            "Critical load kW, startup/inrush profile, runtime target, acceptable transfer time, and power quality sensitivity.",
            "Peak demand profile, TOU tariff, demand charge, outage frequency, diesel cost, PV production profile, and export permission.",
            "Battery usable DoD, PCS continuous/overload rating, thermal derating, and reserve SOC."
          ]
        },
        {
          heading: "Core Equations",
          bullets: [
            "Nominal DC voltage = series cells x nominal cell voltage.",
            "Nominal energy kWh = series cells x parallel cells x cell voltage x Ah / 1000.",
            "C-rate/P-rate = PCS kW / battery nominal kWh.",
            "Autonomy hours = usable battery kWh / critical load kW."
          ]
        }
      ],
      links: ["engineering/hybrid-commercial-bess-pv-sts-critical-load", "engineering/ems-logic-commercial-bess"]
    },
    {
      id: "failure-modes-whole-system",
      title: "Failure Modes Whole System",
      category: "safety",
      summary:
        "Whole-system failure analysis covers electrical, thermal, communication, controls, metering, mechanical, and human-process faults.",
      sections: [
        {
          heading: "High-Risk Failure Modes",
          bullets: [
            "CT polarity reversal causing wrong anti-export control.",
            "BMS/PCS protocol mismatch causing missing battery limits.",
            "STS unsynchronized transfer causing trip or load reboot.",
            "Liquid-cooling loop fault causing thermal derating or propagation risk.",
            "EMS reserve misconfiguration consuming backup energy before outage."
          ]
        },
        {
          heading: "Mitigation Pattern",
          bullets: [
            "Convert every failure mode into commissioning test, alarm, operator runbook, and maintenance interval.",
            "Record measured evidence; do not rely on visual inspection alone.",
            "Maintain RCA notes linked to exact firmware, wiring revision, and parameter export."
          ]
        }
      ],
      links: ["failure-cases/commercial-bess-failure-modes", "installation/ci-bess-commissioning-checklist"]
    },
    {
      id: "root-cause-analysis",
      title: "Root Cause Analysis",
      category: "delivery",
      summary:
        "RCA turns incidents into reusable engineering memory by linking symptoms, data, physical cause, control cause, and corrective actions.",
      sections: [
        {
          heading: "RCA Structure",
          bullets: [
            "Describe event timeline using EMS logs, PCS logs, BMS logs, meter data, and operator actions.",
            "Separate initiating cause, contributing cause, detection failure, and recovery action.",
            "Tag whether root cause is design, installation, commissioning, configuration, component, environment, or operation."
          ]
        },
        {
          heading: "Evidence Sources",
          bullets: [
            "Waveforms, event logs, alarm history, Modbus/CAN captures, thermal data, site photos, parameter export, and as-built drawing.",
            "Before/after test proving corrective action resolves the fault.",
            "Linked failure case note for future projects."
          ]
        }
      ],
      links: ["failure-cases/commercial-bess-failure-modes", "failure-cases/ct-polarity-anti-reverse-export"]
    },
    {
      id: "scada-integration",
      title: "SCADA Integration",
      category: "data",
      summary:
        "SCADA integration exposes reliable operational state to operators, AI optimization, alarm management, reporting, and maintenance workflows.",
      sections: [
        {
          heading: "Core Signals",
          bullets: [
            "PCS active/reactive power, mode, status, fault, grid-forming/following state, DC voltage, AC voltage, frequency.",
            "BMS SOC, SOH, string voltage, current, max/min cell voltage, max/min temperature, alarms, contactor state.",
            "Meter import/export, demand, PF, THD, phase voltage/current, energy counters.",
            "STS source state, transfer events, sync status, source voltage/frequency, bypass status."
          ]
        },
        {
          heading: "Integration Rules",
          bullets: [
            "Use stable point names, units, scaling, alarm severity, and timestamps.",
            "Keep command points separate from monitor points and require role-based access.",
            "Record all AI/EMS optimization actions with reason and input data snapshot."
          ]
        }
      ],
      links: ["engineering/ems-logic-commercial-bess", "engineering/modbus-map-architecture"]
    },
    {
      id: "modbus-map-architecture",
      title: "Modbus Map Architecture",
      category: "data",
      summary:
        "A clean Modbus architecture prevents integration chaos by defining address maps, scaling, endian rules, polling rates, and command safety.",
      sections: [
        {
          heading: "Map Design",
          bullets: [
            "Group points by device: PCS, BMS, Eastron meter, STS, EMS, generator controller, fire panel.",
            "Define register address, function code, data type, scaling, units, signed/unsigned behavior, and read/write permission.",
            "Document polling rate and timeout behavior; critical controls need deterministic handling."
          ]
        },
        {
          heading: "Command Safety",
          bullets: [
            "Commands require interlocks: no discharge below reserve SOC, no charge above BMS limit, no export when export is disabled.",
            "Manual charge/discharge commands must expire automatically.",
            "Write commands must be logged with operator, timestamp, previous value, new value, and reason."
          ]
        }
      ],
      links: ["engineering/scada-integration", "failure-cases/commercial-bess-failure-modes"]
    },
    {
      id: "black-start-sequence",
      title: "Black Start Sequence",
      category: "controls",
      summary:
        "Black start defines how the system recovers from total outage and energizes the critical-load bus in a safe, ordered sequence.",
      sections: [
        {
          heading: "Sequence Concept",
          bullets: [
            "Confirm battery SOC above black-start minimum and no safety lockout.",
            "Energize control power and communication network.",
            "Close battery path through approved precharge and contactor sequence.",
            "Start PCS in grid-forming mode and establish stable voltage/frequency.",
            "Transfer or energize critical-load bus in staged blocks, watching inrush and voltage sag."
          ]
        },
        {
          heading: "Hold Conditions",
          bullets: [
            "Fire/gas/thermal alarm active.",
            "BMS communication invalid or contactor feedback mismatch.",
            "Insulation fault or DC bus precharge failure.",
            "Critical load exceeds PCS island-mode capacity."
          ]
        }
      ],
      links: ["engineering/island-mode-engineering", "installation/ci-bess-commissioning-checklist"]
    },
    {
      id: "island-mode-engineering",
      title: "Island Mode Engineering",
      category: "power",
      summary:
        "Island mode requires PCS grid-forming behavior, load segmentation, reserve SOC, stable control, and safe reconnection logic.",
      sections: [
        {
          heading: "Island Constraints",
          bullets: [
            "Critical load must fit PCS island-mode continuous and transient capacity.",
            "Motor inrush and nonlinear loads must be tested because island source fault current differs from grid fault current.",
            "Frequency and voltage droop or grid-forming parameters must support load steps.",
            "Grid return must synchronize before reconnection to avoid transient events."
          ]
        },
        {
          heading: "Load Strategy",
          bullets: [
            "Segment critical load, essential comfort load, and deferrable load.",
            "Apply staged load restoration after transfer or black start.",
            "Use EMS to shed nonessential load when SOC or PCS capacity is constrained."
          ]
        }
      ],
      links: ["engineering/black-start-sequence", "engineering/grid-synchronization"]
    },
    {
      id: "thai-utility-compliance",
      title: "Thai Utility Compliance",
      category: "safety",
      summary:
        "Thailand deployment requires grid, safety, anti-export, and site-engineering adaptation before final interconnection or customer handoff.",
      sections: [
        {
          heading: "Thailand-Specific Checks",
          bullets: [
            "Confirm 400 VAC three-phase LV design assumptions against site transformer and utility meter.",
            "Validate zero-export or export-limit behavior where export is not approved.",
            "Confirm anti-islanding, grid protection, grounding, signage, emergency shutdown, and Thai installer workflow.",
            "Map critical-load panel wiring and STS bypass/maintenance path clearly in Thai/English field documentation."
          ]
        },
        {
          heading: "Project Value In Thailand",
          bullets: [
            "High value for hotels, resorts, pumps, cold storage, factory automation, server rooms, refrigeration, and weak-grid areas.",
            "Sales should emphasize uptime, resilience, diesel displacement, demand reduction, and operational confidence, not only battery capacity."
          ]
        }
      ],
      links: ["regulations/thailand-grid-compliance", "engineering/hybrid-commercial-bess-pv-sts-critical-load"]
    },
    {
      id: "revenue-model-ess",
      title: "Revenue Model Of ESS",
      category: "economics",
      summary:
        "Commercial ESS economics combine avoided outage cost, demand reduction, TOU arbitrage, PV self-consumption, diesel displacement, and power quality value.",
      sections: [
        {
          heading: "Value Streams",
          bullets: [
            "Uptime and avoided business interruption for critical operations.",
            "Peak shaving to reduce demand charge or contracted demand penalty.",
            "TOU arbitrage when tariff spread exceeds efficiency and degradation cost.",
            "PV self-consumption where export is restricted or undervalued.",
            "Diesel displacement during outages or weak-grid periods."
          ]
        },
        {
          heading: "Do Not Overclaim",
          bullets: [
            "Separate bill savings, outage resilience, power quality improvement, and operational confidence.",
            "Model battery degradation and reserve SOC before claiming arbitrage value.",
            "Use measured load profile before final investment decision."
          ]
        }
      ],
      links: ["engineering/ems-logic-commercial-bess", "engineering/battery-degradation-modeling"]
    },
    {
      id: "advanced-hybrid-topology",
      title: "Advanced Hybrid Topology",
      category: "power",
      summary:
        "Hybrid topology integrates PV, PCS, BESS, grid, generator, STS, critical-load panel, meters, and EMS into one coordinated architecture.",
      sections: [
        {
          heading: "Topology Choices",
          bullets: [
            "AC-coupled PV with PCS/BESS on AC bus.",
            "Hybrid PCS with PV/BESS coordination where supported.",
            "Critical-load bus isolated through STS and bypass path.",
            "Generator integrated as emergency source or BESS charging source."
          ]
        },
        {
          heading: "Design Risks",
          bullets: [
            "Unclear load segmentation causes overloaded island operation.",
            "Meter placement errors break anti-export logic.",
            "Bypass path without clear interlock creates unsafe maintenance condition.",
            "Parallel cabinets need sync and communication design, not just power cable duplication."
          ]
        }
      ],
      links: ["engineering/power-flow-every-mode", "engineering/grid-synchronization"]
    },
    {
      id: "microgrid-engineering",
      title: "Microgrid Engineering",
      category: "power",
      summary:
        "At MW scale, the system evolves into a microgrid with source coordination, protection complexity, stability studies, and operational dispatch.",
      sections: [
        {
          heading: "Microgrid Capabilities",
          bullets: [
            "Grid-connected economic dispatch.",
            "Islanded critical-load support.",
            "PV smoothing and ramp management.",
            "Generator coordination and diesel displacement.",
            "Power quality and reactive support where validated."
          ]
        },
        {
          heading: "MW-Scale Requirements",
          bullets: [
            "Short-circuit and protection study for grid, PCS, generator, and island modes.",
            "Load-flow and stability study for large motor starts and transfer events.",
            "SCADA historian, alarm management, cybersecurity, maintenance workflow, and operator training.",
            "Parallel BESS cabinet coordination with deterministic communication and fail-safe fallback."
          ]
        }
      ],
      links: ["engineering/advanced-hybrid-topology", "engineering/scada-integration"]
    },
    {
      id: "battery-degradation-modeling",
      title: "Battery Degradation Modeling",
      category: "economics",
      summary:
        "Battery degradation modeling converts dispatch strategy into lifecycle cost by accounting for cycles, DoD, temperature, C-rate, and calendar aging.",
      sections: [
        {
          heading: "Degradation Drivers",
          bullets: [
            "Depth of discharge, average SOC, time at high SOC, temperature, C-rate, cycle count, and calendar time.",
            "Liquid cooling reduces cell temperature spread and can improve long-term balance and usable life.",
            "Reserve SOC policy changes economics and degradation because deeper economic cycling consumes lifecycle."
          ]
        },
        {
          heading: "Model Outputs",
          bullets: [
            "Equivalent full cycles per year.",
            "Capacity fade projection and usable energy by year.",
            "Degradation cost per discharged kWh.",
            "Warranty compliance risk if operating outside OEM conditions."
          ]
        }
      ],
      links: ["engineering/revenue-model-ess", "engineering/ems-logic-step-by-step"]
    },
    {
      id: "complete-epc-workflow",
      title: "Complete EPC Workflow",
      category: "delivery",
      summary:
        "Complete EPC workflow turns the engineering concept into a deliverable project with scope, design, procurement, installation, commissioning, handoff, and O&M.",
      sections: [
        {
          heading: "Workflow",
          bullets: [
            "Pre-sales qualification: load profile, outage pain, demand charge, tariff, PV roof/site, grid/export constraints, budget.",
            "Concept design: topology, critical-load boundary, BESS/PCS/STS sizing, EMS strategy, preliminary BOQ.",
            "Detailed engineering: SLD, protection, cable sizing, grounding, layout, fire strategy, SCADA map, commissioning plan.",
            "Procurement: OEM compliance documents, warranty conditions, spare parts, delivery method, lifting plan.",
            "Installation: mechanical, electrical, communication, safety signage, E-stop, fire detection, labeling.",
            "Commissioning: execute evidence checklist and resolve holds.",
            "Handoff: operator training, as-built package, maintenance plan, alarm response, EMS report schedule."
          ]
        },
        {
          heading: "Commercial Deliverables",
          bullets: [
            "Executive proposal, BOQ, energy and uptime value model, risk register, installation scope, exclusions, warranty summary.",
            "Commissioning acceptance certificate and O&M runbook.",
            "ObsidianBrain project memory linked to equipment, failure cases, and lessons learned."
          ]
        }
      ],
      links: ["installation/ci-bess-commissioning-checklist", "engineering/revenue-model-ess"]
    }
  ];
}
