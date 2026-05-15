import type { BusinessRules, CustomerIntake, EnergyBehaviorModel, TraceableValue } from "./types.js";

function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function estimateMonthlyConsumption(
  intake: CustomerIntake,
  rules: BusinessRules
): TraceableValue<number> {
  if (intake.monthlyConsumptionKwh) {
    return intake.monthlyConsumptionKwh;
  }

  return {
    value: round(intake.monthlyBillThb.value / rules.defaultTariff.averageThbPerKwh),
    kind: "estimated",
    source: rules.defaultTariff.source,
    note: `Derived from monthly bill THB ${intake.monthlyBillThb.value} / ${rules.defaultTariff.averageThbPerKwh} THB/kWh.`
  };
}

export function buildEnergyBehavior(
  intake: CustomerIntake,
  rules: BusinessRules
): EnergyBehaviorModel {
  const monthlyConsumptionKwh = estimateMonthlyConsumption(intake, rules);
  const daily = round(monthlyConsumptionKwh.value / 30.42);
  const daytime = round(daily * intake.dayUsageRatio.value);
  const nighttime = round(daily * intake.nightUsageRatio.value);
  const backupEnergy = round(intake.backupLoadKw.value * intake.backupHoursTarget.value);

  return {
    monthlyConsumptionKwh,
    dailyConsumptionKwh: {
      value: daily,
      kind: monthlyConsumptionKwh.kind,
      source: monthlyConsumptionKwh.source,
      note: "Monthly kWh normalized to average calendar month."
    },
    daytimeKwhPerDay: {
      value: daytime,
      kind: intake.dayUsageRatio.kind === "measured" ? "measured" : "estimated",
      source: intake.dayUsageRatio.source
    },
    nighttimeKwhPerDay: {
      value: nighttime,
      kind: intake.nightUsageRatio.kind === "measured" ? "measured" : "estimated",
      source: intake.nightUsageRatio.source
    },
    backupEnergyKwh: {
      value: backupEnergy,
      kind: "assumption",
      source: "Backup load kW x target autonomy hours",
      note: "Critical-load autonomy estimate, not whole-home backup."
    }
  };
}

export function validateIntake(intake: CustomerIntake): string[] {
  const errors: string[] = [];
  const ratios = intake.dayUsageRatio.value + intake.nightUsageRatio.value;

  if (intake.monthlyBillThb.value <= 0) {
    errors.push("Monthly bill must be positive.");
  }
  if (intake.roofAreaM2.value <= 0) {
    errors.push("Roof area must be positive.");
  }
  if (Math.abs(ratios - 1) > 0.05) {
    errors.push("Day and night usage ratios should total approximately 1.0.");
  }
  if (intake.backupLoadKw.value < 0 || intake.backupHoursTarget.value < 0) {
    errors.push("Backup load and target hours cannot be negative.");
  }

  return errors;
}
