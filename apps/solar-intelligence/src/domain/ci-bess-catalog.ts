import type { CommercialBessCatalog, CommercialBessProjectIntake } from "./ci-bess-types.js";

const operatorBrief = "Operator-provided C&I BESS project brief, 2026-05-13. Attach OEM manual/datasheet before final EPC use.";

export const commercialBessCatalog: CommercialBessCatalog = {
  battery: {
    id: "lisiner-261kwh-liquid-cooled-hv-bess",
    brand: "LISINER",
    model: "261kWh liquid-cooled HV BESS",
    chemistry: "LFP",
    cellCapacityAh: 314,
    cellNominalVoltageV: 3.2,
    seriesCells: 260,
    parallelCells: 1,
    nominalEnergyKwh: 261,
    operatingVoltageMinVdc: 728,
    operatingVoltageMaxVdc: 910,
    recommendedDod: 0.9,
    thermalManagement: "liquid-cooled",
    coolant: "50% ethylene glycol",
    weightKg: 2300,
    source: operatorBrief
  },
  pcs: {
    id: "pcs-125kw-commercial-hybrid",
    ratedPowerKw: 125,
    acVoltageVac: 400,
    phase: "three",
    supportsGridForming: true,
    supportsGridFollowing: true,
    supportsReactivePower: true,
    supportsHarmonicCompensation: true,
    antiIslandingRequired: true,
    source: operatorBrief
  },
  sts: {
    id: "sts-critical-load-10ms",
    poles: "4P",
    transferTimeMs: 10,
    requiresSyncCheck: true,
    syncSignals: ["SYNC1", "SYNC2", "carrier synchronization"],
    source: operatorBrief
  },
  emsStrategies: [
    {
      id: "peak-shaving",
      label: "Peak Shaving",
      modes: ["peak-shaving"],
      controlVariables: ["demand threshold", "SOC reserve", "PCS discharge limit"],
      explanation: "Discharge BESS when site demand exceeds the contracted or economic threshold."
    },
    {
      id: "tou-optimization",
      label: "TOU Optimization",
      modes: ["tou-arbitrage"],
      controlVariables: ["peak tariff window", "off-peak charge window", "minimum backup SOC"],
      explanation: "Charge during low-cost windows and discharge during expensive windows while preserving reserve."
    },
    {
      id: "pv-self-consumption",
      label: "PV Self-Consumption",
      modes: ["pv-self-consumption"],
      controlVariables: ["PV surplus", "export limit", "SOC ceiling", "load forecast"],
      explanation: "Route PV to load first, charge BESS from surplus, and avoid unauthorized export."
    },
    {
      id: "critical-backup",
      label: "Critical Load Backup",
      modes: ["island-backup", "diesel-displacement"],
      controlVariables: ["SOC reserve", "STS source status", "generator state", "black-start permission"],
      explanation: "Maintain energy reserve and transfer critical loads to ESS/generator path during grid events."
    },
    {
      id: "power-quality",
      label: "Power Quality Support",
      modes: ["grid-connected"],
      controlVariables: ["power factor", "reactive setpoint", "THD alarms", "phase imbalance"],
      explanation: "Use PCS capabilities for reactive support, harmonic governance, and phase balancing when validated."
    }
  ]
};

export const sampleCommercialBessProject: CommercialBessProjectIntake = {
  projectId: "ci-bess-critical-load-001",
  siteName: "Hybrid C&I BESS + PV + STS critical load demo",
  siteType: "hotel / factory critical-load reference",
  utility: "PEA",
  phase: "three",
  acVoltageVac: {
    value: 400,
    kind: "assumption",
    source: "Thailand commercial LV reference from operator brief"
  },
  criticalLoadKw: {
    value: 95,
    kind: "assumption",
    source: "Critical load panel estimate"
  },
  peakDemandKw: {
    value: 210,
    kind: "assumption",
    source: "Commercial demand estimate"
  },
  pvCapacityKwp: {
    value: 180,
    kind: "assumption",
    source: "PV integration placeholder"
  },
  requiredTransferMs: {
    value: 10,
    kind: "assumption",
    source: "Critical load continuity target"
  },
  backupHoursTarget: {
    value: 2,
    kind: "assumption",
    source: "Critical-load autonomy target"
  },
  exportAllowed: {
    value: false,
    kind: "assumption",
    source: "Anti-reverse power design requirement"
  },
  generatorIntegrated: {
    value: true,
    kind: "assumption",
    source: "Hybrid grid + generator integration target"
  },
  climate: {
    value: "outdoor-tropical",
    kind: "assumption",
    source: "Thailand deployment environment"
  }
};
