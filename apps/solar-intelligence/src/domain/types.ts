export type Phase = "single" | "three";
export type Utility = "PEA" | "MEA";
export type SystemMode = "on-grid" | "hybrid-ess";
export type ValueKind = "measured" | "estimated" | "assumption";
export type InverterCategory = "string" | "hybrid";
export type BatteryVoltageClass = "LV" | "HV";

export interface TraceableValue<T> {
  value: T;
  kind: ValueKind;
  source: string;
  note?: string;
}

export interface CustomerIntake {
  customerId: string;
  siteName: string;
  province: string;
  utility: Utility;
  phase: Phase;
  monthlyBillThb: TraceableValue<number>;
  monthlyConsumptionKwh?: TraceableValue<number>;
  dayUsageRatio: TraceableValue<number>;
  nightUsageRatio: TraceableValue<number>;
  airConditionerCount: TraceableValue<number>;
  evCount: TraceableValue<number>;
  backupLoadKw: TraceableValue<number>;
  backupHoursTarget: TraceableValue<number>;
  budgetThb?: TraceableValue<number>;
  roofAreaM2: TraceableValue<number>;
  roofTiltDegrees?: TraceableValue<number>;
  roiExpectationYears?: TraceableValue<number>;
}

export interface PeaRegistration {
  approved: boolean;
  issueDate?: string;
  expiryDate?: string;
  sourceUrl: string;
  sourceLabel: string;
  verifiedAt: string;
}

export interface Inverter {
  id: string;
  brand: string;
  model: string;
  phase: Phase;
  category: InverterCategory;
  ratedPowerKw: number;
  maxAcPowerKva?: number;
  acVoltage: string;
  batteryVoltageClass?: BatteryVoltageClass;
  supportedBatteryComms: Array<"CAN" | "RS485">;
  exportLimitSupported: boolean;
  antiIslandingCertified: boolean;
  peaRegistration?: PeaRegistration;
  notes: string[];
}

export interface Battery {
  id: string;
  brand: string;
  model: string;
  chemistry: "LiFePO4";
  nominalKwh: number;
  usableKwh: number;
  voltageV: number;
  cycleLife: number;
  recommendedDod: number;
  continuousCRate: number;
  ipRating: string;
  communicationPorts: Array<"CAN" | "RS485" | "WiFi">;
  maxParallelModules: number;
  warrantyYears?: number;
  sourceUrl: string;
  notes: string[];
}

export interface Panel {
  id: string;
  brand: string;
  model: string;
  watts: number;
  areaM2: number;
  warrantyYears: number;
}

export interface EquipmentCatalog {
  inverters: Inverter[];
  batteries: Battery[];
  panels: Panel[];
}

export interface TariffModel {
  averageThbPerKwh: number;
  touPeakThbPerKwh: number;
  touOffPeakThbPerKwh: number;
  source: string;
}

export interface BusinessRules {
  peaApprovedInverterRequired: boolean;
  antiIslandingRequired: boolean;
  exportLimitRequiredWithoutAgreement: boolean;
  minSelfConsumptionRatioForOnGrid: number;
  hybridNightUsageThreshold: number;
  pvOversizeMin: number;
  pvOversizeMax: number;
  kwpPerRoofM2: number;
  thailandSpecificYieldKwhPerKwpYear: number;
  defaultTariff: TariffModel;
  utilityEscalationAnnual: number[];
  installationCostThbPerKwp: number;
  hybridIntegrationCostThb: number;
}

export interface EnergyBehaviorModel {
  monthlyConsumptionKwh: TraceableValue<number>;
  dailyConsumptionKwh: TraceableValue<number>;
  daytimeKwhPerDay: TraceableValue<number>;
  nighttimeKwhPerDay: TraceableValue<number>;
  backupEnergyKwh: TraceableValue<number>;
}

export interface CompatibilityCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: "blocker" | "warning" | "info";
  explanation: string;
}

export interface DesignRecommendation {
  mode: SystemMode;
  pvSizeKwp: TraceableValue<number>;
  inverter: Inverter;
  inverterTargetKw: TraceableValue<number>;
  battery?: Battery;
  batteryModules?: TraceableValue<number>;
  batteryUsableKwh?: TraceableValue<number>;
  estimatedAnnualProductionKwh: TraceableValue<number>;
  selfConsumptionRatio: TraceableValue<number>;
  compatibility: CompatibilityCheck[];
  assumptions: string[];
  engineeringWarnings: string[];
}

export interface RoiResult {
  monthlySavingsThb: TraceableValue<number>;
  annualSavingsThb: TraceableValue<number>;
  batteryContributionThb: TraceableValue<number>;
  simplePaybackYears: TraceableValue<number>;
  capexThb: TraceableValue<number>;
  tenYearCashflowThb: Array<{ year: number; savings: number; cumulative: number }>;
  resilienceValue: {
    backupLoadKw: number;
    autonomyHours: number;
    usableBackupKwh: number;
    note: string;
  };
}

export interface Proposal {
  id: string;
  generatedAt: string;
  customer: CustomerIntake;
  behavior: EnergyBehaviorModel;
  design: DesignRecommendation;
  roi: RoiResult;
  executiveSummary: string;
  billOfMaterials: Array<{ item: string; quantity: number; notes: string }>;
  thailandComplianceSummary: CompatibilityCheck[];
  nextActions: string[];
}
