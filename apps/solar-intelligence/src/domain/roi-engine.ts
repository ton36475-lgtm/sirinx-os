import type { BusinessRules, CustomerIntake, DesignRecommendation, EnergyBehaviorModel, RoiResult } from "./types.js";

function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function calculateRoi(
  intake: CustomerIntake,
  behavior: EnergyBehaviorModel,
  design: DesignRecommendation,
  rules: BusinessRules
): RoiResult {
  const annualLoad = behavior.monthlyConsumptionKwh.value * 12;
  const selfConsumedKwh = Math.min(
    annualLoad,
    design.estimatedAnnualProductionKwh.value * design.selfConsumptionRatio.value
  );
  const annualSavings = selfConsumedKwh * rules.defaultTariff.averageThbPerKwh;
  const batteryContributionKwh =
    design.batteryUsableKwh && design.mode === "hybrid-ess"
      ? Math.min(behavior.nighttimeKwhPerDay.value * 365, design.batteryUsableKwh.value * 0.85 * 365)
      : 0;
  const batteryContribution = batteryContributionKwh * rules.defaultTariff.averageThbPerKwh;
  const batteryCapex =
    design.battery && design.batteryModules
      ? design.batteryModules.value * design.battery.nominalKwh * 14500
      : 0;
  const capex =
    design.pvSizeKwp.value * rules.installationCostThbPerKwp +
    batteryCapex +
    (design.mode === "hybrid-ess" ? rules.hybridIntegrationCostThb : 0);
  const payback = annualSavings > 0 ? capex / annualSavings : Number.POSITIVE_INFINITY;
  const escalation = rules.utilityEscalationAnnual[1] ?? 0.03;
  const tenYearCashflow = [];
  let cumulative = -capex;

  for (let year = 1; year <= 10; year += 1) {
    const savings = annualSavings * (1 + escalation) ** (year - 1);
    cumulative += savings;
    tenYearCashflow.push({
      year,
      savings: round(savings),
      cumulative: round(cumulative)
    });
  }

  return {
    monthlySavingsThb: {
      value: round(annualSavings / 12),
      kind: "estimated",
      source: "Self-consumed solar kWh x tariff assumption"
    },
    annualSavingsThb: {
      value: round(annualSavings),
      kind: "estimated",
      source: "Self-consumed solar kWh x tariff assumption"
    },
    batteryContributionThb: {
      value: round(batteryContribution),
      kind: "estimated",
      source: "Nighttime energy shifted through ESS x tariff assumption",
      note: "Battery value also includes resilience; simple ROI alone can understate backup value."
    },
    simplePaybackYears: {
      value: Number.isFinite(payback) ? round(payback, 1) : 999,
      kind: "estimated",
      source: "Estimated CAPEX / annual savings"
    },
    capexThb: {
      value: round(capex),
      kind: "estimated",
      source: "Configurable PV, battery, and hybrid integration cost assumptions"
    },
    tenYearCashflowThb: tenYearCashflow,
    resilienceValue: {
      backupLoadKw: intake.backupLoadKw.value,
      autonomyHours:
        design.batteryUsableKwh && intake.backupLoadKw.value > 0
          ? round(design.batteryUsableKwh.value / intake.backupLoadKw.value, 1)
          : 0,
      usableBackupKwh: design.batteryUsableKwh?.value ?? 0,
      note: "Resilience value is operational confidence, not counted as guaranteed bill savings."
    }
  };
}
