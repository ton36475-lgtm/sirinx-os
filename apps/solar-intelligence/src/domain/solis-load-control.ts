export type SolisIntegrationMode = "read-only" | "simulation" | "approval-required" | "manual-control-pilot" | "limited-autopilot";

export type LoadControlAction = "hold" | "charge-battery" | "discharge-battery" | "limit-export" | "shift-deferrable-load";

export type LoadControlDecisionStatus = "blocked" | "simulation-only" | "needs-approval" | "approved-for-execution";

export interface SolisTelemetrySnapshot {
  siteId: string;
  stationId: string;
  inverterSn: string;
  observedAt: string;
  receivedAt: string;
  source: "soliscloud-api" | "mobile-app-export" | "manual-import" | "mock";
  loggerOnline: boolean;
  inverterOnline: boolean;
  meterOnline: boolean;
  gridOnline: boolean;
  pvPowerKw: number;
  loadPowerKw: number;
  gridPowerKw: number;
  batterySocPercent: number;
  batteryPowerKw: number;
  alarms: string[];
}

export interface LoadControlConstraints {
  telemetryMaxAgeMinutes: number;
  minBatterySocPercent: number;
  maxBatteryChargeKw: number;
  maxBatteryDischargeKw: number;
  maxGridImportKw: number;
  maxGridExportKw: number;
  protectedLoadKw: number;
  maxActionDurationMinutes: number;
  customerConsentActive: boolean;
  homeownerOverrideActive: boolean;
  killSwitchActive: boolean;
  humanApprovalRequired: boolean;
  humanApprovalId?: string;
}

export interface LoadControlProposal {
  action: LoadControlAction;
  targetPowerKw: number;
  durationMinutes: number;
  reason: string;
}

export interface LoadControlDecision {
  status: LoadControlDecisionStatus;
  mode: SolisIntegrationMode;
  externalCommandAllowed: boolean;
  reasons: string[];
  requiredApprovals: string[];
  auditTags: string[];
}

export interface LoadBalanceAgentRole {
  id: string;
  label: string;
  responsibility: string;
  externalWriteAccess: "none" | "approval-gated" | "pilot-only";
}

export const solisApiOperatingFacts = {
  apiAccessPurpose: "monitoring-data-access",
  remoteControlAccess: "separate-from-api-access",
  observedDataCadenceMinutes: 5,
  maxDocumentedApiFrequencyPerSecond: 2,
  sourceUrls: [
    "https://solis-service.solisinverters.com/en/support/solutions/articles/44002212561-request-api-access-soliscloud",
    "https://doc.ginlongcloud.com/en/20.API%20documentation/01.SolisCloud%20Platform%20API%20Document.html",
    "https://solis-service.solisinverters.com/en/support/solutions/articles/44002686962/"
  ]
} as const;

export const solisLoadBalanceAgentTeam: LoadBalanceAgentRole[] = [
  {
    id: "hermes-orchestrator",
    label: "Hermes Orchestrator",
    responsibility: "Routes work between telemetry, optimizer, approval, control, and audit agents.",
    externalWriteAccess: "none"
  },
  {
    id: "solis-telemetry-steward",
    label: "Solis Telemetry Steward",
    responsibility: "Pulls SolisCloud plant, inverter, EPM, collector, and alarm data in read-only mode.",
    externalWriteAccess: "none"
  },
  {
    id: "site-digital-twin",
    label: "Site Digital Twin Agent",
    responsibility: "Maintains per-house topology, protected loads, battery reserve, tariffs, and telemetry state.",
    externalWriteAccess: "none"
  },
  {
    id: "load-balance-optimizer",
    label: "Load Balance Optimizer",
    responsibility: "Creates proposed schedules and setpoints for load shifting, export limiting, and battery dispatch.",
    externalWriteAccess: "none"
  },
  {
    id: "safety-validator",
    label: "Safety Validator",
    responsibility: "Blocks unsafe proposals before approval or execution.",
    externalWriteAccess: "none"
  },
  {
    id: "customer-approval-agent",
    label: "Customer Approval Agent",
    responsibility: "Collects explicit human approval through dashboard, LINE, Telegram, or mobile review flows.",
    externalWriteAccess: "approval-gated"
  },
  {
    id: "control-adapter-agent",
    label: "Control Adapter Agent",
    responsibility: "Executes approved commands only in pilot mode after safety validation and rollback preparation.",
    externalWriteAccess: "pilot-only"
  },
  {
    id: "audit-incident-agent",
    label: "Audit And Incident Agent",
    responsibility: "Records decisions, command evidence, kill-switch events, and incident reports.",
    externalWriteAccess: "approval-gated"
  }
];

function minutesBetween(laterIso: string, earlierIso: string): number {
  const later = Date.parse(laterIso);
  const earlier = Date.parse(earlierIso);

  if (!Number.isFinite(later) || !Number.isFinite(earlier)) {
    return Number.POSITIVE_INFINITY;
  }

  return (later - earlier) / 60000;
}

function buildBlockDecision(mode: SolisIntegrationMode, reasons: string[], auditTags: string[]): LoadControlDecision {
  return {
    status: "blocked",
    mode,
    externalCommandAllowed: false,
    reasons,
    requiredApprovals: [],
    auditTags
  };
}

export function evaluateSolisLoadControlProposal(
  telemetry: SolisTelemetrySnapshot,
  constraints: LoadControlConstraints,
  proposal: LoadControlProposal,
  mode: SolisIntegrationMode,
  evaluatedAt: string
): LoadControlDecision {
  const reasons: string[] = [];
  const auditTags = ["solis", "load-control", mode];
  const telemetryAgeMinutes = minutesBetween(evaluatedAt, telemetry.observedAt);

  if (constraints.killSwitchActive) {
    reasons.push("Kill switch is active.");
  }
  if (!constraints.customerConsentActive) {
    reasons.push("Customer consent is not active.");
  }
  if (constraints.homeownerOverrideActive) {
    reasons.push("Homeowner override is active.");
  }
  if (!telemetry.loggerOnline || !telemetry.inverterOnline || !telemetry.meterOnline) {
    reasons.push("Logger, inverter, or meter is offline.");
  }
  if (!telemetry.gridOnline) {
    reasons.push("Grid is offline; external load-control commands are blocked.");
  }
  if (telemetry.alarms.length > 0) {
    reasons.push(`Active inverter or site alarms: ${telemetry.alarms.join(", ")}.`);
  }
  if (telemetryAgeMinutes > constraints.telemetryMaxAgeMinutes) {
    reasons.push(`Telemetry is stale: ${Math.round(telemetryAgeMinutes)} minutes old.`);
  }
  if (proposal.durationMinutes <= 0 || proposal.durationMinutes > constraints.maxActionDurationMinutes) {
    reasons.push("Action duration is outside approved bounds.");
  }
  if (proposal.targetPowerKw < 0) {
    reasons.push("Target power cannot be negative.");
  }
  if (proposal.action === "discharge-battery" && telemetry.batterySocPercent <= constraints.minBatterySocPercent) {
    reasons.push("Battery SOC is at or below the protected reserve.");
  }
  if (proposal.action === "discharge-battery" && proposal.targetPowerKw > constraints.maxBatteryDischargeKw) {
    reasons.push("Requested battery discharge exceeds configured site limit.");
  }
  if (proposal.action === "charge-battery" && proposal.targetPowerKw > constraints.maxBatteryChargeKw) {
    reasons.push("Requested battery charge exceeds configured site limit.");
  }
  if (proposal.action === "limit-export" && Math.abs(telemetry.gridPowerKw) > constraints.maxGridExportKw && telemetry.gridPowerKw < 0) {
    auditTags.push("export-limit-needed");
  }
  if (telemetry.loadPowerKw < constraints.protectedLoadKw && proposal.action === "shift-deferrable-load") {
    reasons.push("Measured load is below protected load boundary; no load shifting command is justified.");
  }

  if (reasons.length > 0) {
    return buildBlockDecision(mode, reasons, auditTags);
  }

  if (mode === "read-only" || mode === "simulation") {
    return {
      status: "simulation-only",
      mode,
      externalCommandAllowed: false,
      reasons: ["Solis telemetry can be used for analysis only in the current mode."],
      requiredApprovals: ["operator-approval-before-control-mode"],
      auditTags
    };
  }

  if (constraints.humanApprovalRequired && !constraints.humanApprovalId) {
    return {
      status: "needs-approval",
      mode,
      externalCommandAllowed: false,
      reasons: ["Human approval is required before any external control command."],
      requiredApprovals: ["customer-or-operator-approval", "safety-review"],
      auditTags
    };
  }

  if (mode === "approval-required") {
    return {
      status: "simulation-only",
      mode,
      externalCommandAllowed: false,
      reasons: ["Approval exists, but this mode still stops before command execution."],
      requiredApprovals: ["manual-control-pilot-change-approval"],
      auditTags
    };
  }

  return {
    status: "approved-for-execution",
    mode,
    externalCommandAllowed: true,
    reasons: ["All configured guardrails passed for the selected pilot mode."],
    requiredApprovals: [],
    auditTags
  };
}
