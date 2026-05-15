import { commercialBessCatalog, sampleCommercialBessProject } from "./ci-bess-catalog.js";
import type {
  CommercialBessCatalog,
  CommercialBessDesign,
  CommercialBessProjectIntake,
  CommissioningGate
} from "./ci-bess-types.js";

function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function buildCommissioningGates(project: CommercialBessProjectIntake): CommissioningGate[] {
  return [
    {
      id: "insulation-resistance",
      label: "HVDC insulation resistance test",
      status: "requires-test",
      owner: "electrical",
      evidenceRequired: "Megger/IR report across HVDC bus, cabinet, and earth before energization.",
      riskIfSkipped: "Undetected insulation fault can create arc, shock, or PCS trip during precharge."
    },
    {
      id: "precharge",
      label: "PCS precharge validation",
      status: "requires-test",
      owner: "controls",
      evidenceRequired: "Logged DC bus ramp, contactor sequence, and no inrush alarm.",
      riskIfSkipped: "Inrush transient can damage DC link capacitors or trip protection."
    },
    {
      id: "phase-sequence",
      label: "AC phase sequence and voltage check",
      status: project.phase === "three" ? "requires-test" : "hold",
      owner: "electrical",
      evidenceRequired: "L1/L2/L3 sequence, 400 VAC reference, neutral/earth verification.",
      riskIfSkipped: "Reverse phase or neutral fault can break STS synchronization and motor loads."
    },
    {
      id: "ct-polarity",
      label: "Meter and CT polarity",
      status: "requires-test",
      owner: "ems",
      evidenceRequired: "Import/export direction verified on Eastron/anti-reverse meter under load.",
      riskIfSkipped: "EMS may export power when it intends to import, violating utility constraint."
    },
    {
      id: "can-bms",
      label: "BMS CAN communication",
      status: "requires-test",
      owner: "controls",
      evidenceRequired: "BMS heartbeat, SOC, alarms, charge/discharge limits visible in PCS/EMS.",
      riskIfSkipped: "PCS may operate without valid battery limits, causing trips or unsafe dispatch."
    },
    {
      id: "sts-sync-transfer",
      label: "STS synchronization and transfer",
      status: "requires-test",
      owner: "electrical",
      evidenceRequired: "Grid-loss transfer test with voltage, frequency, phase-angle, and transfer time log.",
      riskIfSkipped: "Critical load may reboot or breaker may trip during unsynchronized transfer."
    },
    {
      id: "ems-strategy",
      label: "EMS strategy acceptance test",
      status: "requires-test",
      owner: "ems",
      evidenceRequired: "Peak shaving, TOU, PV surplus charge, anti-export, backup reserve test cases.",
      riskIfSkipped: "System may be technically installed but fail the business objective."
    },
    {
      id: "fire-detection",
      label: "Fire and gas detection chain",
      status: "requires-test",
      owner: "safety",
      evidenceRequired: "Smoke, gas, thermal alarm, suppression, E-stop, and signage verification.",
      riskIfSkipped: "Thermal event may not be detected or contained early."
    },
    {
      id: "utility-export",
      label: "Utility export limit compliance",
      status: project.exportAllowed.value ? "requires-test" : "hold",
      owner: "utility",
      evidenceRequired: "Documented export permission or zero-export commissioning report.",
      riskIfSkipped: "Unauthorized export can violate interconnection rules."
    }
  ];
}

export function designCommercialBessSystem(
  project: CommercialBessProjectIntake = sampleCommercialBessProject,
  catalog: CommercialBessCatalog = commercialBessCatalog
): CommercialBessDesign {
  const nominalDcVoltage = catalog.battery.seriesCells * catalog.battery.cellNominalVoltageV;
  const computedEnergyKwh =
    (catalog.battery.seriesCells *
      catalog.battery.parallelCells *
      catalog.battery.cellNominalVoltageV *
      catalog.battery.cellCapacityAh) /
    1000;
  const usableEnergy = computedEnergyKwh * catalog.battery.recommendedDod;
  const cRate = catalog.pcs.ratedPowerKw / computedEnergyKwh;
  const fullPowerDuration = usableEnergy / catalog.pcs.ratedPowerKw;
  const criticalAutonomy = usableEnergy / project.criticalLoadKw.value;
  const transferMeetsRequirement = catalog.sts.transferTimeMs <= project.requiredTransferMs.value;

  return {
    project,
    battery: catalog.battery,
    pcs: catalog.pcs,
    sts: catalog.sts,
    nominalDcVoltageV: {
      value: round(nominalDcVoltage),
      kind: "estimated",
      source: `${catalog.battery.seriesCells} cells in series x ${catalog.battery.cellNominalVoltageV} V nominal`
    },
    usableEnergyKwh: {
      value: round(usableEnergy),
      kind: "estimated",
      source: `${round(computedEnergyKwh)} kWh nominal x ${catalog.battery.recommendedDod * 100}% DoD assumption`
    },
    cRateP: {
      value: round(cRate, 3),
      kind: "estimated",
      source: `${catalog.pcs.ratedPowerKw} kW PCS / ${round(computedEnergyKwh)} kWh battery`
    },
    fullPowerDurationHours: {
      value: round(fullPowerDuration, 2),
      kind: "estimated",
      source: "Usable battery energy / PCS rated power"
    },
    criticalLoadAutonomyHours: {
      value: round(criticalAutonomy, 2),
      kind: "estimated",
      source: "Usable battery energy / critical load kW"
    },
    transferMeetsRequirement,
    emsStrategies: catalog.emsStrategies,
    powerFlowPriority: [
      "PV -> critical and normal loads",
      "PV surplus -> BESS when SOC ceiling allows",
      "BESS -> critical load during peak, outage, or TOU strategy",
      "Grid -> load and BESS only when EMS economics or reserve require it",
      "Generator -> critical load and/or BESS only under approved fallback sequence"
    ],
    commissioningGates: buildCommissioningGates(project),
    failureModes: [
      {
        id: "ct-polarity-reversed",
        label: "CT polarity reversed",
        detection: "Import/export readings move opposite to actual load step.",
        mitigation: "Correct CT orientation, phase mapping, and meter sign convention before enabling anti-export."
      },
      {
        id: "bms-pcs-protocol-mismatch",
        label: "BMS/PCS protocol mismatch",
        detection: "PCS cannot read SOC, alarms, charge limit, or discharge limit over CAN.",
        mitigation: "Select exact protocol profile and firmware pair; verify heartbeat and limits under commissioning mode."
      },
      {
        id: "sts-unsynchronized-transfer",
        label: "STS unsynchronized transfer",
        detection: "Transfer event creates voltage transient, breaker trip, or load reboot.",
        mitigation: "Validate phase angle, frequency, voltage matching, SYNC1/SYNC2, and carrier synchronization."
      },
      {
        id: "ems-reserve-misconfigured",
        label: "EMS reserve misconfigured",
        detection: "BESS reaches low SOC before outage or peak window ends.",
        mitigation: "Lock minimum backup SOC by load class and require approval before lowering reserve."
      },
      {
        id: "thermal-loop-fault",
        label: "Liquid cooling loop fault",
        detection: "Cell delta-T, coolant alarm, pump alarm, or cabinet thermal derating.",
        mitigation: "Verify coolant concentration, pump operation, leak checks, and temperature sensor mapping."
      }
    ],
    assumptions: [
      "Commercial BESS data is seeded from operator-provided project brief and must be attached to OEM documentation before EPC release.",
      "Usable energy uses a configurable DoD assumption; warranty-specific usable energy must be confirmed.",
      "STS transfer time target does not guarantee load continuity until tested with real critical loads.",
      "Grid code, fire code, and utility interconnection requirements must be signed off by qualified local engineers."
    ]
  };
}
