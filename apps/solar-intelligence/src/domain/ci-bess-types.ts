import type { Phase, TraceableValue, Utility } from "./types.js";

export type CommercialBessMode =
  | "grid-connected"
  | "island-backup"
  | "peak-shaving"
  | "tou-arbitrage"
  | "pv-self-consumption"
  | "diesel-displacement";

export type CommissioningGateStatus = "pass" | "hold" | "requires-test";

export interface CommercialBessProjectIntake {
  projectId: string;
  siteName: string;
  siteType: string;
  utility: Utility;
  phase: Phase;
  acVoltageVac: TraceableValue<number>;
  criticalLoadKw: TraceableValue<number>;
  peakDemandKw: TraceableValue<number>;
  pvCapacityKwp?: TraceableValue<number>;
  requiredTransferMs: TraceableValue<number>;
  backupHoursTarget: TraceableValue<number>;
  exportAllowed: TraceableValue<boolean>;
  generatorIntegrated: TraceableValue<boolean>;
  climate: TraceableValue<"indoor-controlled" | "outdoor-tropical" | "containerized">;
}

export interface HvBatteryArchitecture {
  id: string;
  brand: string;
  model: string;
  chemistry: "LFP";
  cellCapacityAh: number;
  cellNominalVoltageV: number;
  seriesCells: number;
  parallelCells: number;
  nominalEnergyKwh: number;
  operatingVoltageMinVdc: number;
  operatingVoltageMaxVdc: number;
  recommendedDod: number;
  thermalManagement: "liquid-cooled" | "air-cooled";
  coolant?: string;
  weightKg?: number;
  source: string;
}

export interface PcsSpec {
  id: string;
  ratedPowerKw: number;
  acVoltageVac: number;
  phase: Phase;
  supportsGridForming: boolean;
  supportsGridFollowing: boolean;
  supportsReactivePower: boolean;
  supportsHarmonicCompensation: boolean;
  antiIslandingRequired: boolean;
  source: string;
}

export interface StsSpec {
  id: string;
  poles: "3P" | "4P";
  transferTimeMs: number;
  requiresSyncCheck: boolean;
  syncSignals: string[];
  source: string;
}

export interface EmsStrategy {
  id: string;
  label: string;
  modes: CommercialBessMode[];
  controlVariables: string[];
  explanation: string;
}

export interface CommercialBessCatalog {
  battery: HvBatteryArchitecture;
  pcs: PcsSpec;
  sts: StsSpec;
  emsStrategies: EmsStrategy[];
}

export interface CommissioningGate {
  id: string;
  label: string;
  status: CommissioningGateStatus;
  owner: "electrical" | "controls" | "safety" | "utility" | "ems" | "mechanical";
  evidenceRequired: string;
  riskIfSkipped: string;
}

export interface CommercialBessDesign {
  project: CommercialBessProjectIntake;
  battery: HvBatteryArchitecture;
  pcs: PcsSpec;
  sts: StsSpec;
  nominalDcVoltageV: TraceableValue<number>;
  usableEnergyKwh: TraceableValue<number>;
  cRateP: TraceableValue<number>;
  fullPowerDurationHours: TraceableValue<number>;
  criticalLoadAutonomyHours: TraceableValue<number>;
  transferMeetsRequirement: boolean;
  emsStrategies: EmsStrategy[];
  powerFlowPriority: string[];
  commissioningGates: CommissioningGate[];
  failureModes: Array<{
    id: string;
    label: string;
    detection: string;
    mitigation: string;
  }>;
  assumptions: string[];
}
