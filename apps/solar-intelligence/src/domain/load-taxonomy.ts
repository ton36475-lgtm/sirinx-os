import { sampleCommercialBessProject } from "./ci-bess-catalog.js";
import type { CommercialBessProjectIntake } from "./ci-bess-types.js";

export type SystemSizeClass = "residential" | "sme" | "ci-small" | "ci-medium" | "ci-large" | "mw-microgrid";
export type LoadPriority = "critical" | "essential" | "operational" | "comfort" | "deferrable" | "ev-or-process";
export type LoadBehavior = "continuous" | "daytime" | "nighttime" | "peaky" | "backup-only" | "schedulable";

export interface SystemSizeBand {
  id: SystemSizeClass;
  label: string;
  peakDemandKw: string;
  pvSizeKwp: string;
  bessEnergyKwh: string;
  pcsPowerKw: string;
  typicalSites: string[];
  designFocus: string[];
}

export interface LoadSegment {
  id: string;
  label: string;
  priority: LoadPriority;
  behavior: LoadBehavior;
  estimatedKw: number;
  hoursPerDay: number;
  dailyKwh: number;
  backupRequired: boolean;
  sizingMeaning: string;
  designNotes: string[];
}

export interface LoadBreakdown {
  sizeClass: SystemSizeBand;
  totalPeakDemandKw: number;
  criticalLoadKw: number;
  dailyEnergyKwh: number;
  backupEnergyTargetKwh: number;
  segments: LoadSegment[];
  sizingSteps: Array<{
    step: string;
    explanation: string;
  }>;
}

function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export const systemSizeBands: SystemSizeBand[] = [
  {
    id: "residential",
    label: "Residential / Home ESS",
    peakDemandKw: "3-20 kW",
    pvSizeKwp: "3-20 kWp",
    bessEnergyKwh: "5-40 kWh",
    pcsPowerKw: "3-15 kW",
    typicalSites: ["home", "villa", "small home office"],
    designFocus: ["bill savings", "backup loads", "single/three-phase match", "simple ROI"]
  },
  {
    id: "sme",
    label: "SME / Small Commercial",
    peakDemandKw: "20-80 kW",
    pvSizeKwp: "20-120 kWp",
    bessEnergyKwh: "40-150 kWh",
    pcsPowerKw: "20-75 kW",
    typicalSites: ["shop", "small hotel", "restaurant", "office"],
    designFocus: ["self-consumption", "partial backup", "TOU behavior", "basic demand shaving"]
  },
  {
    id: "ci-small",
    label: "C&I Small Critical Load",
    peakDemandKw: "80-250 kW",
    pvSizeKwp: "100-500 kWp",
    bessEnergyKwh: "150-500 kWh",
    pcsPowerKw: "75-250 kW",
    typicalSites: ["hotel", "cold room", "pump station", "factory line"],
    designFocus: ["critical load panel", "STS transfer", "anti-export", "commissioning evidence"]
  },
  {
    id: "ci-medium",
    label: "C&I Medium Energy Node",
    peakDemandKw: "250-1000 kW",
    pvSizeKwp: "500 kWp-2 MWp",
    bessEnergyKwh: "500 kWh-3 MWh",
    pcsPowerKw: "250 kW-1 MW",
    typicalSites: ["factory", "cold storage", "resort", "logistics warehouse"],
    designFocus: ["peak shaving", "diesel displacement", "SCADA", "protection coordination"]
  },
  {
    id: "ci-large",
    label: "C&I Large / Campus ESS",
    peakDemandKw: "1-5 MW",
    pvSizeKwp: "2-10 MWp",
    bessEnergyKwh: "3-20 MWh",
    pcsPowerKw: "1-5 MW",
    typicalSites: ["industrial estate", "campus", "large resort", "data hall support"],
    designFocus: ["parallel cabinets", "microgrid control", "grid study", "operator training"]
  },
  {
    id: "mw-microgrid",
    label: "MW Microgrid / Distributed Energy Infrastructure",
    peakDemandKw: ">5 MW",
    pvSizeKwp: ">10 MWp",
    bessEnergyKwh: ">20 MWh",
    pcsPowerKw: ">5 MW",
    typicalSites: ["utility microgrid", "island grid", "industrial park"],
    designFocus: ["stability study", "dispatch optimization", "utility interconnection", "fleet intelligence"]
  }
];

export function classifySystemSize(peakDemandKw: number): SystemSizeBand {
  if (peakDemandKw < 20) {
    return systemSizeBands[0]!;
  }
  if (peakDemandKw < 80) {
    return systemSizeBands[1]!;
  }
  if (peakDemandKw < 250) {
    return systemSizeBands[2]!;
  }
  if (peakDemandKw < 1000) {
    return systemSizeBands[3]!;
  }
  if (peakDemandKw < 5000) {
    return systemSizeBands[4]!;
  }
  return systemSizeBands[5]!;
}

function segment(
  id: string,
  label: string,
  priority: LoadPriority,
  behavior: LoadBehavior,
  estimatedKw: number,
  hoursPerDay: number,
  backupRequired: boolean,
  sizingMeaning: string,
  designNotes: string[]
): LoadSegment {
  return {
    id,
    label,
    priority,
    behavior,
    estimatedKw: round(estimatedKw),
    hoursPerDay,
    dailyKwh: round(estimatedKw * hoursPerDay),
    backupRequired,
    sizingMeaning,
    designNotes
  };
}

export function buildLoadBreakdown(project: CommercialBessProjectIntake = sampleCommercialBessProject): LoadBreakdown {
  const peak = project.peakDemandKw.value;
  const critical = project.criticalLoadKw.value;
  const nonCritical = Math.max(0, peak - critical);
  const segments = [
    segment(
      "critical-continuity",
      "Critical continuity load",
      "critical",
      "continuous",
      critical,
      24,
      true,
      "Sets minimum PCS island capacity, STS rating, backup SOC reserve, and critical-load panel boundary.",
      ["servers, refrigeration, controls, selected pumps, safety systems", "must survive transfer without reboot where required"]
    ),
    segment(
      "essential-operations",
      "Essential operations",
      "essential",
      "daytime",
      nonCritical * 0.28,
      12,
      true,
      "May be restored after critical load if SOC and PCS headroom allow.",
      ["stage after island transition", "can be included in backup if customer accepts larger BESS/PCS"]
    ),
    segment(
      "process-or-ev",
      "Process / EV / high-power equipment",
      "ev-or-process",
      "peaky",
      nonCritical * 0.32,
      5,
      false,
      "Drives peak demand, cable sizing, transformer loading, and demand-charge reduction opportunity.",
      ["often not backed up", "good target for scheduling or peak shaving"]
    ),
    segment(
      "comfort-load",
      "Comfort HVAC and building load",
      "comfort",
      "daytime",
      nonCritical * 0.25,
      10,
      false,
      "Large energy consumer, useful for PV self-consumption and load shifting, but usually not critical.",
      ["segment by AHU/AC zones", "may need soft-start or staged restoration"]
    ),
    segment(
      "deferrable-load",
      "Deferrable load",
      "deferrable",
      "schedulable",
      nonCritical * 0.15,
      4,
      false,
      "Can be delayed or controlled by EMS to protect reserve and reduce peaks.",
      ["water heating, batch processes, noncritical pumps", "best candidate for automation"]
    )
  ];
  const dailyEnergyKwh = round(segments.reduce((sum, item) => sum + item.dailyKwh, 0));
  const backupEnergyTargetKwh = round(critical * project.backupHoursTarget.value);

  return {
    sizeClass: classifySystemSize(peak),
    totalPeakDemandKw: peak,
    criticalLoadKw: critical,
    dailyEnergyKwh,
    backupEnergyTargetKwh,
    segments,
    sizingSteps: [
      {
        step: "1. Separate load priority",
        explanation: "Split the site into critical, essential, operational/process, comfort, and deferrable loads before selecting BESS size."
      },
      {
        step: "2. Size PCS by power",
        explanation: "PCS kW must cover critical-load island operation plus transfer/inrush margin, not just average energy."
      },
      {
        step: "3. Size battery by energy",
        explanation: "Battery kWh must cover backup duration, reserve SOC, DoD limit, degradation margin, and economic cycling."
      },
      {
        step: "4. Size STS by continuity",
        explanation: "STS must meet transfer time, current rating, synchronization, bypass, and critical-load wiring requirements."
      },
      {
        step: "5. Size EMS strategy by objective",
        explanation: "Peak shaving, TOU, anti-export, PV self-consumption, and backup reserve must be separate rule layers."
      }
    ]
  };
}
