import { getLeadBackendHealth } from "./lead-health.mjs";

const packages = [
  { id: "OG-5", type: "on-grid", kw: 5, batteryKwh: 0, price: 129000, targetMin: 2000, targetMax: 4000 },
  { id: "OG-10", type: "on-grid", kw: 10, batteryKwh: 0, price: 209000, targetMin: 4000, targetMax: 8000 },
  { id: "H-5", type: "hybrid", kw: 5, batteryKwh: 16, price: 329000, targetMin: 4000, targetMax: 6000 },
  { id: "H-10", type: "hybrid", kw: 10, batteryKwh: 32, price: 529000, targetMin: 6000, targetMax: 10000 },
  { id: "H-15", type: "hybrid", kw: 15, batteryKwh: 48, price: 789000, targetMin: 10000, targetMax: 16000 },
  { id: "H-20", type: "hybrid", kw: 20, batteryKwh: 64, price: 959000, targetMin: 16000, targetMax: 26000 }
];

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

function asNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function choosePackage(monthlyBill, backupPriority, phaseType) {
  const wantsBackup = ["high", "critical", "yes", "true"].includes(String(backupPriority).toLowerCase());
  const candidates = packages.filter((item) => (item.type === "hybrid") === wantsBackup);
  const matched = candidates.find((item) => item.targetMin <= monthlyBill && monthlyBill <= item.targetMax);

  if (matched) {
    return matched;
  }

  if (wantsBackup && ["3", "3p", "three-phase", "3-phase"].includes(String(phaseType).toLowerCase())) {
    return monthlyBill <= 16000 ? packages[4] : packages[5];
  }

  return monthlyBill > candidates[candidates.length - 1].targetMax ? candidates[candidates.length - 1] : candidates[0];
}

function evaluateCustomer(customer) {
  const monthlyBill = Math.max(0, asNumber(customer.monthly_bill_thb, 0));
  const tariff = Math.max(0.1, asNumber(customer.effective_tariff_thb_per_kwh, 4.2));
  const daytimeRatio = clamp(asNumber(customer.daytime_load_ratio, 0.5), 0, 1);
  const annualYieldPerKwp = Math.max(900, asNumber(customer.annual_yield_per_kwp, 1450));
  const packageInfo = choosePackage(monthlyBill, customer.backup_priority, customer.phase_type);
  const monthlyKwh = monthlyBill / tariff;
  const monthlyPvKwh = (packageInfo.kw * annualYieldPerKwp) / 12;

  let weakSelfConsumption = clamp(Math.min(daytimeRatio, 0.35), 0.2, 0.45);
  let realisticSelfConsumption = clamp(Math.max(daytimeRatio, packageInfo.type === "hybrid" ? 0.55 : 0.5), 0.35, 0.75);
  let bestSelfConsumption = clamp(Math.max(daytimeRatio, packageInfo.type === "hybrid" ? 0.75 : 0.7), 0.55, 0.9);

  if (packageInfo.type === "hybrid") {
    realisticSelfConsumption = clamp(realisticSelfConsumption + 0.1, 0.45, 0.85);
    bestSelfConsumption = clamp(bestSelfConsumption + 0.05, 0.6, 0.92);
  }

  const cases = [
    ["weak", weakSelfConsumption],
    ["realistic", realisticSelfConsumption],
    ["best", bestSelfConsumption]
  ].map(([name, selfConsumption]) => {
    const capturedKwh = Math.min(monthlyKwh, monthlyPvKwh * selfConsumption);
    const estimatedMonthlySavingsThb = Math.round(capturedKwh * tariff);
    const annualSavings = estimatedMonthlySavingsThb * 12;
    const estimatedPaybackYears = annualSavings > 0 ? Math.round((packageInfo.price / annualSavings) * 10) / 10 : null;

    return {
      name,
      selfConsumption: Math.round(selfConsumption * 100) / 100,
      capturedKwh: Math.round(capturedKwh * 10) / 10,
      estimatedMonthlySavingsThb,
      estimatedPaybackYears
    };
  });

  return {
    recommendedPackage: packageInfo,
    estimatedMonthlyKwh: Math.round(monthlyKwh * 10) / 10,
    estimatedMonthlyPvKwh: Math.round(monthlyPvKwh * 10) / 10,
    cases
  };
}

function customerFromLeadHealth(leadHealth) {
  const qualification = leadHealth.qualificationModel || {};
  const packageLane = qualification.packageLane || "";
  const isHybrid = packageLane.includes("hybrid");
  const isLargeHybrid = packageLane.includes("h15") || packageLane.includes("h20");

  return {
    customer_name: "Local Command Center Lead Probe",
    monthly_bill_thb: asNumber(qualification.monthlyBill, 0),
    daytime_load_ratio: isHybrid ? 0.42 : 0.55,
    backup_priority: isHybrid ? "high" : "medium",
    phase_type: isLargeHybrid ? "3-phase" : "unknown",
    effective_tariff_thb_per_kwh: 4.2,
    annual_yield_per_kwp: 1450
  };
}

export async function getRoiPreview(overrides = {}) {
  const leadHealth = await getLeadBackendHealth();
  const assumptions = {
    ...customerFromLeadHealth(leadHealth),
    ...overrides
  };
  const result = evaluateCustomer(assumptions);

  return {
    title: "SIRINX local ROI preview",
    status: "ready-local-roi-preview",
    mode: "local-planning-only",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    sourceApis: ["/api/lead-health"],
    assumptions,
    result,
    warnings: [
      "This is a planning model, not a production guarantee.",
      "Savings, ROI, payback, and cashflow remain estimates until bill, roof, phase, load profile, export limits, and inverter approval are verified.",
      "Battery resilience value is separate from financial payback."
    ],
    reviewGates: [
      "PEA Smartlist exact inverter verification required before customer-facing proposal release.",
      "Real customer bill and load profile required before quote.",
      "Roof, shading, phase type, and load-panel survey required before final design.",
      "Senior engineer or sales engineer must review ROI math before external use."
    ],
    nextActions: [
      "Use the local ROI form to test customer assumptions.",
      "Attach bill and load evidence before turning this into a customer proposal.",
      "Keep CRM writes and customer messages separately gated."
    ],
    updatedAt: new Date().toISOString()
  };
}
