import { describe, expect, test } from "vitest";
import {
  evaluateSolisLoadControlProposal,
  solisApiOperatingFacts,
  solisLoadBalanceAgentTeam,
  type LoadControlConstraints,
  type LoadControlProposal,
  type SolisTelemetrySnapshot
} from "./solis-load-control.js";

const telemetry: SolisTelemetrySnapshot = {
  siteId: "home-bkk-001",
  stationId: "station-001",
  inverterSn: "solis-demo-sn",
  observedAt: "2026-05-16T03:00:00.000Z",
  receivedAt: "2026-05-16T03:01:00.000Z",
  source: "mock",
  loggerOnline: true,
  inverterOnline: true,
  meterOnline: true,
  gridOnline: true,
  pvPowerKw: 8.2,
  loadPowerKw: 11.4,
  gridPowerKw: 2.1,
  batterySocPercent: 68,
  batteryPowerKw: 0,
  alarms: []
};

const constraints: LoadControlConstraints = {
  telemetryMaxAgeMinutes: 10,
  minBatterySocPercent: 25,
  maxBatteryChargeKw: 5,
  maxBatteryDischargeKw: 5,
  maxGridImportKw: 15,
  maxGridExportKw: 3,
  protectedLoadKw: 4,
  maxActionDurationMinutes: 30,
  customerConsentActive: true,
  homeownerOverrideActive: false,
  killSwitchActive: false,
  humanApprovalRequired: true
};

const proposal: LoadControlProposal = {
  action: "discharge-battery",
  targetPowerKw: 3,
  durationMinutes: 15,
  reason: "Reduce grid import during evening peak."
};

describe("Solis load-control safety gates", () => {
  test("records official operating facts as read-only first principles", () => {
    expect(solisApiOperatingFacts.remoteControlAccess).toBe("separate-from-api-access");
    expect(solisApiOperatingFacts.observedDataCadenceMinutes).toBe(5);
    expect(solisApiOperatingFacts.maxDocumentedApiFrequencyPerSecond).toBe(2);
  });

  test("defines the agent team with control access isolated to the pilot adapter", () => {
    expect(solisLoadBalanceAgentTeam.map((agent) => agent.id)).toContain("control-adapter-agent");
    expect(solisLoadBalanceAgentTeam.find((agent) => agent.id === "control-adapter-agent")?.externalWriteAccess).toBe(
      "pilot-only"
    );
    expect(solisLoadBalanceAgentTeam.filter((agent) => agent.externalWriteAccess === "none").length).toBeGreaterThan(4);
  });

  test("keeps read-only mode simulation-only even when telemetry is healthy", () => {
    const decision = evaluateSolisLoadControlProposal(telemetry, constraints, proposal, "read-only", "2026-05-16T03:05:00.000Z");

    expect(decision.status).toBe("simulation-only");
    expect(decision.externalCommandAllowed).toBe(false);
    expect(decision.requiredApprovals).toContain("operator-approval-before-control-mode");
  });

  test("blocks stale telemetry before approval or execution", () => {
    const decision = evaluateSolisLoadControlProposal(
      telemetry,
      constraints,
      proposal,
      "manual-control-pilot",
      "2026-05-16T03:30:00.000Z"
    );

    expect(decision.status).toBe("blocked");
    expect(decision.externalCommandAllowed).toBe(false);
    expect(decision.reasons.join(" ")).toContain("Telemetry is stale");
  });

  test("requires human approval before pilot execution", () => {
    const decision = evaluateSolisLoadControlProposal(
      telemetry,
      constraints,
      proposal,
      "manual-control-pilot",
      "2026-05-16T03:05:00.000Z"
    );

    expect(decision.status).toBe("needs-approval");
    expect(decision.externalCommandAllowed).toBe(false);
    expect(decision.requiredApprovals).toContain("customer-or-operator-approval");
  });

  test("allows pilot execution only after guardrails and approval pass", () => {
    const decision = evaluateSolisLoadControlProposal(
      telemetry,
      { ...constraints, humanApprovalId: "approval-2026-05-16-001" },
      proposal,
      "manual-control-pilot",
      "2026-05-16T03:05:00.000Z"
    );

    expect(decision.status).toBe("approved-for-execution");
    expect(decision.externalCommandAllowed).toBe(true);
  });

  test("blocks discharge below protected battery reserve", () => {
    const decision = evaluateSolisLoadControlProposal(
      { ...telemetry, batterySocPercent: 20 },
      { ...constraints, humanApprovalId: "approval-2026-05-16-001" },
      proposal,
      "manual-control-pilot",
      "2026-05-16T03:05:00.000Z"
    );

    expect(decision.status).toBe("blocked");
    expect(decision.reasons.join(" ")).toContain("protected reserve");
  });
});
