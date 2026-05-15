import type {
  Battery,
  BusinessRules,
  CompatibilityCheck,
  CustomerIntake,
  DesignRecommendation,
  EnergyBehaviorModel,
  EquipmentCatalog,
  Inverter,
  SystemMode
} from "./types.js";

function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function pushCheck(
  checks: CompatibilityCheck[],
  id: string,
  label: string,
  passed: boolean,
  severity: CompatibilityCheck["severity"],
  explanation: string
): void {
  checks.push({ id, label, passed, severity, explanation });
}

function chooseMode(intake: CustomerIntake, rules: BusinessRules): SystemMode {
  if (intake.backupHoursTarget.value > 0 || intake.backupLoadKw.value > 0) {
    return "hybrid-ess";
  }
  if (intake.nightUsageRatio.value >= rules.hybridNightUsageThreshold) {
    return "hybrid-ess";
  }
  return "on-grid";
}

function inverterIsEligible(
  inverter: Inverter,
  intake: CustomerIntake,
  mode: SystemMode,
  rules: BusinessRules
): boolean {
  if (inverter.phase !== intake.phase) {
    return false;
  }
  if (mode === "hybrid-ess" && inverter.category !== "hybrid") {
    return false;
  }
  if (rules.peaApprovedInverterRequired && !inverter.peaRegistration?.approved) {
    return false;
  }
  if (rules.antiIslandingRequired && !inverter.antiIslandingCertified) {
    return false;
  }
  return true;
}

function selectInverter(
  catalog: EquipmentCatalog,
  intake: CustomerIntake,
  mode: SystemMode,
  targetKw: number,
  rules: BusinessRules
): Inverter {
  const eligible = catalog.inverters
    .filter((inverter) => inverterIsEligible(inverter, intake, mode, rules))
    .sort((a, b) => a.ratedPowerKw - b.ratedPowerKw);

  const sized = eligible.find((inverter) => inverter.ratedPowerKw >= targetKw);
  if (sized) {
    return sized;
  }

  const largest = eligible.at(-1);
  if (!largest) {
    throw new Error(`No eligible ${mode} inverter found for ${intake.phase}-phase ${intake.utility} site.`);
  }
  return largest;
}

function selectBattery(
  catalog: EquipmentCatalog,
  inverter: Inverter,
  requiredUsableKwh: number
): { battery: Battery; modules: number; usableKwh: number } | undefined {
  const battery = catalog.batteries.find((candidate) => {
    if (inverter.batteryVoltageClass && inverter.batteryVoltageClass !== "LV") {
      return false;
    }
    return candidate.communicationPorts.some(
      (port) => port !== "WiFi" && inverter.supportedBatteryComms.includes(port)
    );
  });

  if (!battery) {
    return undefined;
  }

  const modules = Math.ceil(requiredUsableKwh / battery.usableKwh);
  return {
    battery,
    modules,
    usableKwh: round(modules * battery.usableKwh)
  };
}

export function recommendDesign(
  intake: CustomerIntake,
  behavior: EnergyBehaviorModel,
  catalog: EquipmentCatalog,
  rules: BusinessRules
): DesignRecommendation {
  const mode = chooseMode(intake, rules);
  const roofLimitedKwp = intake.roofAreaM2.value * rules.kwpPerRoofM2;
  const targetPvKwp = Math.min(
    roofLimitedKwp,
    Math.max(behavior.daytimeKwhPerDay.value / 3.7, behavior.dailyConsumptionKwh.value / 4.1)
  );
  const inverterTargetKw = Math.max(3, Math.min(targetPvKwp / rules.pvOversizeMax, targetPvKwp / rules.pvOversizeMin));
  const inverter = selectInverter(catalog, intake, mode, inverterTargetKw, rules);
  const pvSizeKwp = Math.min(roofLimitedKwp, inverter.ratedPowerKw * rules.pvOversizeMax, targetPvKwp);
  const annualProduction = pvSizeKwp * rules.thailandSpecificYieldKwhPerKwpYear;
  const dailyProduction = annualProduction / 365;
  const batteryRequiredKwh = Math.max(
    behavior.backupEnergyKwh.value,
    mode === "hybrid-ess" ? behavior.nighttimeKwhPerDay.value * 0.65 : 0
  );
  const batteryPlan = mode === "hybrid-ess" ? selectBattery(catalog, inverter, batteryRequiredKwh) : undefined;
  const batteryNightShiftKwh = batteryPlan ? Math.min(behavior.nighttimeKwhPerDay.value, batteryPlan.usableKwh * 0.85) : 0;
  const selfConsumedDaily = Math.min(
    dailyProduction,
    behavior.daytimeKwhPerDay.value + batteryNightShiftKwh
  );
  const selfConsumptionRatio = annualProduction > 0 ? selfConsumedDaily / dailyProduction : 0;
  const compatibility: CompatibilityCheck[] = [];

  pushCheck(
    compatibility,
    "phase-match",
    "Phase compatibility",
    inverter.phase === intake.phase,
    "blocker",
    `${inverter.model} is ${inverter.phase}-phase and customer site is ${intake.phase}-phase.`
  );
  pushCheck(
    compatibility,
    "pea-approval",
    "PEA registered inverter",
    Boolean(inverter.peaRegistration?.approved),
    "blocker",
    inverter.peaRegistration?.sourceLabel || "No PEA registration source attached."
  );
  pushCheck(
    compatibility,
    "anti-islanding",
    "Anti-islanding",
    inverter.antiIslandingCertified,
    "blocker",
    "Grid-connected designs must use anti-islanding certified inverter data."
  );
  pushCheck(
    compatibility,
    "export-limit",
    "Export limitation",
    inverter.exportLimitSupported,
    "warning",
    "Enable export limit logic unless the utility agreement explicitly allows export."
  );

  if (mode === "hybrid-ess") {
    pushCheck(
      compatibility,
      "battery-selected",
      "Battery sizing available",
      Boolean(batteryPlan),
      "blocker",
      batteryPlan
        ? `${batteryPlan.modules} x ${batteryPlan.battery.model} provides ${batteryPlan.usableKwh} usable kWh.`
        : "No compatible battery with matching communication profile was found."
    );
    if (batteryPlan) {
      pushCheck(
        compatibility,
        "bms-communication",
        "BMS communication",
        batteryPlan.battery.communicationPorts.some(
          (port) => port !== "WiFi" && inverter.supportedBatteryComms.includes(port)
        ),
        "blocker",
        `${batteryPlan.battery.model} supports ${batteryPlan.battery.communicationPorts.join(", ")}; inverter supports ${inverter.supportedBatteryComms.join(", ")}.`
      );
    }
  }

  const engineeringWarnings = compatibility
    .filter((check) => !check.passed)
    .map((check) => `${check.label}: ${check.explanation}`);

  if (selfConsumptionRatio < rules.minSelfConsumptionRatioForOnGrid) {
    engineeringWarnings.push(
      "Self-consumption is low; validate daytime loads, export policy, and battery economics before final quote."
    );
  }

  return {
    mode,
    pvSizeKwp: {
      value: round(pvSizeKwp),
      kind: "estimated",
      source: "Design engine: roof limit, load model, inverter oversizing rules"
    },
    inverter,
    inverterTargetKw: {
      value: round(inverterTargetKw),
      kind: "estimated",
      source: "PV size and configurable oversizing ratio"
    },
    ...(batteryPlan
      ? {
          battery: batteryPlan.battery,
          batteryModules: {
            value: batteryPlan.modules,
            kind: "estimated" as const,
            source: "Backup energy and nighttime shifting requirement"
          },
          batteryUsableKwh: {
            value: batteryPlan.usableKwh,
            kind: "estimated" as const,
            source: "Selected battery usable capacity x module count"
          }
        }
      : {}),
    estimatedAnnualProductionKwh: {
      value: round(annualProduction),
      kind: "estimated",
      source: `${rules.thailandSpecificYieldKwhPerKwpYear} kWh/kWp/year Thailand yield assumption`
    },
    selfConsumptionRatio: {
      value: round(Math.min(1, selfConsumptionRatio), 3),
      kind: "estimated",
      source: "Daily production vs daytime load plus battery shifted nighttime load"
    },
    compatibility,
    assumptions: [
      "Solar yield is a configurable Thailand-average estimate until site irradiance and shade analysis are measured.",
      "Backup design is for critical loads only unless whole-home backup is explicitly surveyed.",
      "PEA approval status must be refreshed before issuing a binding commercial quote."
    ],
    engineeringWarnings
  };
}
