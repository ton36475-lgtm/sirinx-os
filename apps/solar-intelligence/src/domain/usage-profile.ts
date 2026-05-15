export type UsageBehavior = "base" | "daytime" | "evening-peak" | "night" | "peaky" | "schedulable";
export type ApplianceCategory =
  | "hvac"
  | "refrigeration"
  | "pump"
  | "lighting"
  | "ev"
  | "server-controls"
  | "process"
  | "other";

export interface UsageTimeWindow {
  id: string;
  label: string;
  startHour: number;
  endHour: number;
  hours: number;
  averageKw: number;
  energyKwh: number;
  pvOverlap: "none" | "partial" | "high";
  bessRole: "backup-reserve" | "peak-shaving" | "pv-direct" | "energy-shifting";
  designMeaning: string;
}

export interface ApplianceLoad {
  id: string;
  label: string;
  category: ApplianceCategory;
  quantity: number;
  ratedKwEach: number;
  dutyCycle: number;
  hoursPerDay: number;
  connectedKw: number;
  operatingKw: number;
  dailyKwh: number;
  startSurgeMultiplier: number;
  estimatedSurgeKw: number;
  critical: boolean;
  behavior: UsageBehavior;
  designMeaning: string;
}

export interface CustomerUsageProfile {
  siteName: string;
  source: string;
  dailyEnergyKwh: number;
  estimatedPeakKw: number;
  criticalOperatingKw: number;
  criticalDailyKwh: number;
  pvDirectUseKwh: number;
  batteryShiftTargetKwh: number;
  timeWindows: UsageTimeWindow[];
  appliances: ApplianceLoad[];
  insights: string[];
}

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
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

function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function windowKw(payload: JsonObject, key: string, fallback: number): number {
  return asNumber(payload[`${key}Kw`], fallback);
}

function makeWindow(
  id: string,
  label: string,
  startHour: number,
  endHour: number,
  averageKw: number,
  pvOverlap: UsageTimeWindow["pvOverlap"],
  bessRole: UsageTimeWindow["bessRole"],
  designMeaning: string
): UsageTimeWindow {
  const hours = endHour > startHour ? endHour - startHour : 24 - startHour + endHour;
  return {
    id,
    label,
    startHour,
    endHour,
    hours,
    averageKw: round(averageKw),
    energyKwh: round(averageKw * hours),
    pvOverlap,
    bessRole,
    designMeaning
  };
}

function makeAppliance(
  payload: JsonObject,
  prefix: string,
  defaults: Omit<ApplianceLoad, "quantity" | "ratedKwEach" | "dutyCycle" | "hoursPerDay" | "connectedKw" | "operatingKw" | "dailyKwh" | "estimatedSurgeKw">
): ApplianceLoad {
  const quantity = asNumber(payload[`${prefix}Qty`], prefix === "server" || prefix === "process" ? 1 : 0);
  const ratedKwEach = asNumber(payload[`${prefix}Kw`], defaults.id === "lighting" ? 8 : 0);
  const dutyCycle = Math.max(0, Math.min(1, asNumber(payload[`${prefix}Duty`], 1)));
  const hoursPerDay = Math.max(0, Math.min(24, asNumber(payload[`${prefix}Hours`], defaults.behavior === "base" ? 24 : 8)));
  const connectedKw = quantity * ratedKwEach;
  const operatingKw = connectedKw * dutyCycle;

  return {
    ...defaults,
    quantity,
    ratedKwEach: round(ratedKwEach),
    dutyCycle: round(dutyCycle, 2),
    hoursPerDay,
    connectedKw: round(connectedKw),
    operatingKw: round(operatingKw),
    dailyKwh: round(operatingKw * hoursPerDay),
    estimatedSurgeKw: round(connectedKw * defaults.startSurgeMultiplier)
  };
}

export function buildCustomerUsageProfile(payload: unknown = {}): CustomerUsageProfile {
  const data = asObject(payload);
  const siteName = asString(data.siteName, "Customer real usage profile");
  const timeWindows = [
    makeWindow(
      "night-base",
      "00:00-06:00 Night base load",
      0,
      6,
      windowKw(data, "night", 45),
      "none",
      "backup-reserve",
      "Base load during no-solar hours; drives battery reserve and overnight autonomy."
    ),
    makeWindow(
      "morning-ramp",
      "06:00-09:00 Morning ramp",
      6,
      9,
      windowKw(data, "morning", 95),
      "partial",
      "peak-shaving",
      "Morning startup load; check motor starts, pumps, HVAC, and grid demand spike."
    ),
    makeWindow(
      "solar-production",
      "09:00-15:00 Solar production window",
      9,
      15,
      windowKw(data, "solar", 140),
      "high",
      "pv-direct",
      "Best window for direct PV self-consumption and process scheduling."
    ),
    makeWindow(
      "afternoon-shoulder",
      "15:00-18:00 Afternoon shoulder",
      15,
      18,
      windowKw(data, "afternoon", 125),
      "partial",
      "energy-shifting",
      "PV falls while business load remains high; BESS may smooth ramp and protect peak."
    ),
    makeWindow(
      "evening-peak",
      "18:00-22:00 Evening peak",
      18,
      22,
      windowKw(data, "evening", 160),
      "none",
      "peak-shaving",
      "High-value BESS discharge window for TOU, demand control, and resilience."
    ),
    makeWindow(
      "late-night",
      "22:00-24:00 Late night",
      22,
      24,
      windowKw(data, "late", 85),
      "none",
      "backup-reserve",
      "Late base load; reserve policy determines how much BESS can discharge."
    )
  ];
  const appliances = [
    makeAppliance(data, "ac", {
      id: "air-conditioning",
      label: "Air conditioners / HVAC",
      category: "hvac",
      startSurgeMultiplier: 1.5,
      critical: false,
      behavior: "daytime",
      designMeaning: "Large flexible load; affects PV self-consumption, comfort backup, and staged restoration."
    }),
    makeAppliance(data, "refrigeration", {
      id: "refrigeration",
      label: "Refrigeration / cold room",
      category: "refrigeration",
      startSurgeMultiplier: 2.5,
      critical: true,
      behavior: "base",
      designMeaning: "Usually critical and continuous; sets backup reserve and transfer continuity requirement."
    }),
    makeAppliance(data, "pump", {
      id: "pump",
      label: "Pumps / motors",
      category: "pump",
      startSurgeMultiplier: 3,
      critical: true,
      behavior: "peaky",
      designMeaning: "Motor inrush affects PCS overload, STS transfer, breaker coordination, and staged restart."
    }),
    makeAppliance(data, "ev", {
      id: "ev-charging",
      label: "EV chargers",
      category: "ev",
      startSurgeMultiplier: 1,
      critical: false,
      behavior: "schedulable",
      designMeaning: "Good controllable load for PV hours; avoid charging during outage reserve periods."
    }),
    makeAppliance(data, "process", {
      id: "process-equipment",
      label: "Process / production equipment",
      category: "process",
      startSurgeMultiplier: 2,
      critical: asBoolean(data.processCritical, false),
      behavior: "peaky",
      designMeaning: "Usually drives demand charge and transformer loading; decide whether it belongs on critical bus."
    }),
    makeAppliance(data, "server", {
      id: "server-controls",
      label: "Server / controls / network",
      category: "server-controls",
      startSurgeMultiplier: 1.2,
      critical: true,
      behavior: "base",
      designMeaning: "Small but high-criticality load; should remain on UPS/critical bus and survive STS transfer."
    }),
    makeAppliance(data, "lighting", {
      id: "lighting",
      label: "Lighting / small power",
      category: "lighting",
      startSurgeMultiplier: 1,
      critical: false,
      behavior: "evening-peak",
      designMeaning: "Often essential but can be zoned; affects evening BESS discharge and backup scope."
    })
  ].filter((item) => item.quantity > 0 && item.ratedKwEach > 0);
  const dailyEnergyKwh = round(timeWindows.reduce((sum, item) => sum + item.energyKwh, 0));
  const applianceOperatingKw = round(appliances.reduce((sum, item) => sum + item.operatingKw, 0));
  const timePeakKw = Math.max(...timeWindows.map((item) => item.averageKw));
  const criticalOperatingKw = round(
    appliances.filter((item) => item.critical).reduce((sum, item) => sum + item.operatingKw, 0)
  );
  const criticalDailyKwh = round(
    appliances.filter((item) => item.critical).reduce((sum, item) => sum + item.dailyKwh, 0)
  );
  const pvDirectUseKwh = round(
    timeWindows.filter((item) => item.pvOverlap !== "none").reduce((sum, item) => sum + item.energyKwh, 0)
  );
  const batteryShiftTargetKwh = round(
    timeWindows.filter((item) => item.pvOverlap === "none").reduce((sum, item) => sum + item.energyKwh, 0)
  );
  const highestWindow = timeWindows.reduce((max, item) => (item.averageKw > max.averageKw ? item : max), timeWindows[0]!);
  const highestAppliance = appliances.reduce<ApplianceLoad | undefined>(
    (max, item) => (!max || item.dailyKwh > max.dailyKwh ? item : max),
    undefined
  );
  const highestSurge = appliances.reduce<ApplianceLoad | undefined>(
    (max, item) => (!max || item.estimatedSurgeKw > max.estimatedSurgeKw ? item : max),
    undefined
  );

  return {
    siteName,
    source: "Operator usage profile form",
    dailyEnergyKwh,
    estimatedPeakKw: round(Math.max(timePeakKw, applianceOperatingKw)),
    criticalOperatingKw,
    criticalDailyKwh,
    pvDirectUseKwh,
    batteryShiftTargetKwh,
    timeWindows,
    appliances,
    insights: [
      `Highest time window: ${highestWindow.label} at ${highestWindow.averageKw} kW.`,
      highestAppliance
        ? `Largest daily appliance group: ${highestAppliance.label} at ${highestAppliance.dailyKwh} kWh/day.`
        : "No appliance inventory entered yet.",
      highestSurge
        ? `Highest starting surge risk: ${highestSurge.label} around ${highestSurge.estimatedSurgeKw} kW connected surge estimate.`
        : "No surge risk can be calculated without appliance inventory.",
      `PV direct-use opportunity: ${pvDirectUseKwh} kWh/day; BESS shift/backup target: ${batteryShiftTargetKwh} kWh/day.`,
      criticalOperatingKw > 0
        ? `Critical operating load from appliance inventory: ${criticalOperatingKw} kW.`
        : "Critical load boundary should be surveyed before final BESS sizing."
    ]
  };
}
