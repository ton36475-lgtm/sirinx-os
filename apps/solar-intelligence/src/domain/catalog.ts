import type { BusinessRules, CustomerIntake, EquipmentCatalog } from "./types.js";

const peaSmartListPdf = "https://smartlist.pea.co.th/public/products/inverter/pdf";
const gslBatterySource =
  "https://gsl-energyusa.com/14kwh-and-16kwh-floor-standing-home-energy-storage-battery-system/";

export const thailandRules: BusinessRules = {
  peaApprovedInverterRequired: true,
  antiIslandingRequired: true,
  exportLimitRequiredWithoutAgreement: true,
  minSelfConsumptionRatioForOnGrid: 0.62,
  hybridNightUsageThreshold: 0.38,
  pvOversizeMin: 1.05,
  pvOversizeMax: 1.3,
  kwpPerRoofM2: 0.17,
  thailandSpecificYieldKwhPerKwpYear: 1450,
  defaultTariff: {
    averageThbPerKwh: 4.2,
    touPeakThbPerKwh: 5.8,
    touOffPeakThbPerKwh: 2.9,
    source: "Configurable operator assumption. Replace with customer tariff/TOU bill before final proposal."
  },
  utilityEscalationAnnual: [0.02, 0.03, 0.05],
  installationCostThbPerKwp: 37000,
  hybridIntegrationCostThb: 85000
};

export const equipmentCatalog: EquipmentCatalog = {
  inverters: [
    {
      id: "deye-sun-10k-sg04lp3-eu",
      brand: "Deye",
      model: "SUN-10K-SG04LP3-EU",
      phase: "three",
      category: "hybrid",
      ratedPowerKw: 10,
      acVoltage: "220/380 V",
      batteryVoltageClass: "LV",
      supportedBatteryComms: ["CAN", "RS485"],
      exportLimitSupported: true,
      antiIslandingCertified: true,
      peaRegistration: {
        approved: true,
        issueDate: "2025-02-20",
        expiryDate: "2028-02-20",
        sourceUrl: peaSmartListPdf,
        sourceLabel: "PEA smart inverter list, item 45, data shown as of 6 Feb 2026",
        verifiedAt: "2026-05-13"
      },
      notes: [
        "Hybrid LV inverter entry is seeded from PEA Smart List for demonstration.",
        "Final installer workflow must re-check PEA Smart List before quoting."
      ]
    },
    {
      id: "deye-sun-10k-g06p3-eu-bm2-p1",
      brand: "Deye",
      model: "SUN-10K-G06P3-EU-BM2-P1",
      phase: "three",
      category: "string",
      ratedPowerKw: 10,
      acVoltage: "220/380 V",
      supportedBatteryComms: [],
      exportLimitSupported: true,
      antiIslandingCertified: true,
      peaRegistration: {
        approved: true,
        issueDate: "2025-02-06",
        expiryDate: "2028-02-06",
        sourceUrl: peaSmartListPdf,
        sourceLabel: "PEA smart inverter list, item 43, data shown as of 6 Feb 2026",
        verifiedAt: "2026-05-13"
      },
      notes: ["String inverter option for on-grid designs without ESS backup."]
    },
    {
      id: "growatt-sph-6000",
      brand: "GROWATT",
      model: "SPH 6000",
      phase: "single",
      category: "hybrid",
      ratedPowerKw: 6,
      acVoltage: "230 V",
      batteryVoltageClass: "LV",
      supportedBatteryComms: ["CAN", "RS485"],
      exportLimitSupported: true,
      antiIslandingCertified: true,
      peaRegistration: {
        approved: true,
        sourceUrl: peaSmartListPdf,
        sourceLabel: "PEA Smart List product entry for GROWATT SPH 6000; re-check exact issue/expiry before final proposal",
        verifiedAt: "2026-05-13"
      },
      notes: ["Single-phase hybrid option for smaller homes."]
    }
  ],
  batteries: [
    {
      id: "gsl051314a-b-gbp2",
      brand: "GSL Energy",
      model: "GSL051314A-B-GBP2",
      chemistry: "LiFePO4",
      nominalKwh: 16.08,
      usableKwh: 12.86,
      voltageV: 51.2,
      cycleLife: 10000,
      recommendedDod: 0.8,
      continuousCRate: 0.5,
      ipRating: "IP65",
      communicationPorts: ["CAN", "RS485", "WiFi"],
      maxParallelModules: 16,
      warrantyYears: 15,
      sourceUrl: gslBatterySource,
      notes: [
        "Seeded from public GSL 16 kWh product references.",
        "Installer must verify inverter-specific BMS protocol profile before sale."
      ]
    }
  ],
  panels: [
    {
      id: "tier1-550w-mono",
      brand: "Tier 1 Reference",
      model: "Mono PERC/TOPCon 550W class",
      watts: 550,
      areaM2: 2.58,
      warrantyYears: 25
    }
  ]
};

export const sampleCustomer: CustomerIntake = {
  customerId: "demo-bkk-hybrid-001",
  siteName: "Bangkok hybrid ESS demo home",
  province: "Bangkok",
  utility: "PEA",
  phase: "three",
  monthlyBillThb: {
    value: 9800,
    kind: "measured",
    source: "Customer electricity bill"
  },
  dayUsageRatio: {
    value: 0.48,
    kind: "estimated",
    source: "Customer interview"
  },
  nightUsageRatio: {
    value: 0.52,
    kind: "estimated",
    source: "Customer interview"
  },
  airConditionerCount: {
    value: 5,
    kind: "measured",
    source: "Site survey"
  },
  evCount: {
    value: 1,
    kind: "measured",
    source: "Customer interview"
  },
  backupLoadKw: {
    value: 3.2,
    kind: "assumption",
    source: "Operator demo assumption",
    note: "Critical loads only: router, lighting, refrigerator, selected outlets, one small AC."
  },
  backupHoursTarget: {
    value: 4,
    kind: "assumption",
    source: "Customer backup expectation"
  },
  budgetThb: {
    value: 650000,
    kind: "assumption",
    source: "Demo budget"
  },
  roofAreaM2: {
    value: 74,
    kind: "estimated",
    source: "Desktop roof estimate"
  },
  roiExpectationYears: {
    value: 7,
    kind: "assumption",
    source: "Customer target"
  }
};
