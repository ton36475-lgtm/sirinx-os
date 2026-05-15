import { sampleCommercialBessProject } from "./ci-bess-catalog.js";
import { sampleCustomer } from "./catalog.js";
import type { CommercialBessProjectIntake } from "./ci-bess-types.js";
import type { CustomerIntake, Phase, TraceableValue, Utility } from "./types.js";

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

function asPhase(value: unknown, fallback: Phase): Phase {
  return value === "single" || value === "three" ? value : fallback;
}

function asUtility(value: unknown, fallback: Utility): Utility {
  return value === "PEA" || value === "MEA" ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function measuredNumber(value: number, source: string, note?: string): TraceableValue<number> {
  return {
    value,
    kind: "measured",
    source,
    ...(note ? { note } : {})
  };
}

function assumptionNumber(value: number, source: string, note?: string): TraceableValue<number> {
  return {
    value,
    kind: "assumption",
    source,
    ...(note ? { note } : {})
  };
}

function assumptionBoolean(value: boolean, source: string): TraceableValue<boolean> {
  return {
    value,
    kind: "assumption",
    source
  };
}

export function buildCustomerIntakeFromPayload(payload: unknown): CustomerIntake {
  const data = asObject(payload);
  const dayUsageRatio = clamp(asNumber(data.dayUsageRatio, sampleCustomer.dayUsageRatio.value), 0, 1);
  const nightUsageRatio = clamp(asNumber(data.nightUsageRatio, 1 - dayUsageRatio), 0, 1);
  const budgetThb = asNumber(data.budgetThb, sampleCustomer.budgetThb?.value ?? 0);
  const roiExpectationYears = asNumber(data.roiExpectationYears, sampleCustomer.roiExpectationYears?.value ?? 0);

  return {
    customerId: asString(data.customerId, `local-${Date.now()}`),
    siteName: asString(data.siteName, sampleCustomer.siteName),
    province: asString(data.province, sampleCustomer.province),
    utility: asUtility(data.utility, sampleCustomer.utility),
    phase: asPhase(data.phase, sampleCustomer.phase),
    monthlyBillThb: measuredNumber(
      asNumber(data.monthlyBillThb, sampleCustomer.monthlyBillThb.value),
      "Operator intake form"
    ),
    dayUsageRatio: assumptionNumber(dayUsageRatio, "Operator intake form"),
    nightUsageRatio: assumptionNumber(nightUsageRatio, "Operator intake form"),
    airConditionerCount: measuredNumber(
      asNumber(data.airConditionerCount, sampleCustomer.airConditionerCount.value),
      "Operator intake form"
    ),
    evCount: measuredNumber(asNumber(data.evCount, sampleCustomer.evCount.value), "Operator intake form"),
    backupLoadKw: assumptionNumber(
      asNumber(data.backupLoadKw, sampleCustomer.backupLoadKw.value),
      "Operator intake form",
      "Critical loads only unless the site survey confirms whole-site backup."
    ),
    backupHoursTarget: assumptionNumber(
      asNumber(data.backupHoursTarget, sampleCustomer.backupHoursTarget.value),
      "Operator intake form"
    ),
    roofAreaM2: assumptionNumber(asNumber(data.roofAreaM2, sampleCustomer.roofAreaM2.value), "Operator intake form"),
    ...(budgetThb > 0
      ? {
          budgetThb: assumptionNumber(budgetThb, "Operator intake form")
        }
      : {}),
    ...(roiExpectationYears > 0
      ? {
          roiExpectationYears: assumptionNumber(roiExpectationYears, "Operator intake form")
        }
      : {})
  };
}

export function buildCommercialBessProjectFromPayload(payload: unknown): CommercialBessProjectIntake {
  const data = asObject(payload);

  return {
    projectId: asString(data.projectId, `ci-local-${Date.now()}`),
    siteName: asString(data.siteName, sampleCommercialBessProject.siteName),
    siteType: asString(data.siteType, sampleCommercialBessProject.siteType),
    utility: asUtility(data.utility, sampleCommercialBessProject.utility),
    phase: asPhase(data.phase, sampleCommercialBessProject.phase),
    acVoltageVac: assumptionNumber(
      asNumber(data.acVoltageVac, sampleCommercialBessProject.acVoltageVac.value),
      "Operator C&I BESS intake form"
    ),
    criticalLoadKw: assumptionNumber(
      asNumber(data.criticalLoadKw, sampleCommercialBessProject.criticalLoadKw.value),
      "Operator C&I BESS intake form"
    ),
    peakDemandKw: assumptionNumber(
      asNumber(data.peakDemandKw, sampleCommercialBessProject.peakDemandKw.value),
      "Operator C&I BESS intake form"
    ),
    pvCapacityKwp: assumptionNumber(
      asNumber(data.pvCapacityKwp, sampleCommercialBessProject.pvCapacityKwp?.value ?? 0),
      "Operator C&I BESS intake form"
    ),
    requiredTransferMs: assumptionNumber(
      asNumber(data.requiredTransferMs, sampleCommercialBessProject.requiredTransferMs.value),
      "Operator C&I BESS intake form"
    ),
    backupHoursTarget: assumptionNumber(
      asNumber(data.backupHoursTarget, sampleCommercialBessProject.backupHoursTarget.value),
      "Operator C&I BESS intake form"
    ),
    exportAllowed: assumptionBoolean(
      asBoolean(data.exportAllowed, sampleCommercialBessProject.exportAllowed.value),
      "Operator C&I BESS intake form"
    ),
    generatorIntegrated: assumptionBoolean(
      asBoolean(data.generatorIntegrated, sampleCommercialBessProject.generatorIntegrated.value),
      "Operator C&I BESS intake form"
    ),
    climate: {
      value:
        data.climate === "indoor-controlled" ||
        data.climate === "outdoor-tropical" ||
        data.climate === "containerized"
          ? data.climate
          : sampleCommercialBessProject.climate.value,
      kind: "assumption",
      source: "Operator C&I BESS intake form"
    }
  };
}
