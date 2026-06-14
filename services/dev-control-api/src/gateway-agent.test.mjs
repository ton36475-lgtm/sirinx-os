import { describe, expect, it } from "vitest";
import { createGatewayAgentDryRunPlan, getGatewayAgentStatus } from "./gateway-agent.mjs";

const fixedNow = () => new Date("2026-05-26T04:30:00.000Z");

describe("Gateway Agent contract", () => {
  it("reports local-only runtime lanes without enabling external execution", async () => {
    const status = await getGatewayAgentStatus({
      now: fixedNow,
      hermesContextWindow: 8192,
      requiredHermesContextWindow: 64000,
      evidenceRoot: "/tmp/sirinx-gateway-agent-test-empty"
    });

    expect(status.status).toBe("local-gateway-ready");
    expect(status.mode).toBe("local-only-control-contract");
    expect(status.externalWrites).toBe(false);
    expect(status.canExecuteExternally).toBe(false);
    expect(status.canRunMcp).toBe(false);
    expect(status.runtimes.map((runtime) => runtime.id)).toEqual([
      "codex",
      "hermes-tui",
      "gemini-cli",
      "a2a2loopsync"
    ]);
    expect(status.runtimes.find((runtime) => runtime.id === "hermes-tui")).toMatchObject({
      status: "blocked-context-too-small",
      contextWindow: 8192,
      requiredContextWindow: 64000,
      autoExecute: false
    });
    expect(status.runtimes.find((runtime) => runtime.id === "gemini-cli")).toMatchObject({
      status: "manual-review-runtime",
      autoExecute: false
    });
    expect(status.aiTeamPairing.summary).toMatchObject({
      rolesTotal: 47,
      pairedRoles: 47,
      telegramReady: false
    });
    expect(status.connectorRegistry.summary).toMatchObject({
      connectorsTotal: 15,
      ownerLanes: 7,
      activatableConnectors: 0
    });
    expect(status.summary.connectorsTotal).toBe(15);
    expect(status.summary.imageEdit).toBe(true);
    expect(status.summary.imageEditAcceptancePacketReady).toBe(true);
    expect(status.summary.launchGateAgents).toBe(9);
    expect(status.summary.launchGateAutoExecutable).toBe(0);
    expect(status.summary.teamRuntimeLanes).toBe(5);
    expect(status.summary.teamRuntimePaidApiExecutable).toBe(0);
    expect(status.hermesImageEdit).toMatchObject({
      status: "ready-local-only",
      externalWrites: false,
      canRunMcp: false,
      canReadSecrets: false
    });
    expect(status.hermesImageEdit.summary).toMatchObject({
      imageEdit: true,
      captionRequired: true,
      fallbackTextToImageBlocked: true,
      acceptancePacketReady: true,
      providerEditCapability: "needs_manual_probe"
    });
    expect(status.agentLaunchGate).toMatchObject({
      status: "local-launch-gate-ready",
      externalWrites: false,
      canLaunchAgents: false,
      canRunMcp: false,
      canReadSecrets: false
    });
    expect(status.agentLaunchGate.summary).toMatchObject({
      agentsTotal: 9,
      manualOnly: 9,
      autoExecutable: 0,
      blockedContextTooSmall: 1
    });
    expect(status.teamRuntimeBridge).toMatchObject({
      status: "team-runtime-bridge-ready-local-only",
      canCallPaidApi: false,
      canRunAntigravityCli: false,
      canReadSecrets: false
    });
    expect(status.teamRuntimeBridge.modelLanes.find((lane) => lane.id === "qwen-3-7-max-openrouter")).toMatchObject({
      provider: "OpenRouter",
      modelId: "qwen/qwen3.7-max",
      canCallProvider: false
    });
    expect(status.hermesImageEdit.acceptancePacket).toMatchObject({
      patch_ready: true,
      gateway_restart_required: true,
      provider_edit_capability: "needs_manual_probe",
      text_to_image_fallback: "blocked",
      canRestartGateway: false,
      canCallProvider: false
    });
  });

  it("creates dry-run part assignments without executing tools or external actions", async () => {
    const plan = await createGatewayAgentDryRunPlan(
      {
        goal: "Build gateway agent for Codex Hermes TUI Gemini CLI A2A2LoopSync",
        source: "codex-local"
      },
      {
        now: fixedNow,
        evidenceRoot: "/tmp/sirinx-gateway-agent-test-empty"
      }
    );

    expect(plan.status).toBe("dry-run-plan-ready");
    expect(plan.externalWrites).toBe(false);
    expect(plan.canExecuteExternally).toBe(false);
    expect(plan.canRunMcp).toBe(false);
    expect(plan.hermesInbox.result).toBe("allowed");
    expect(plan.partAssignments.map((part) => part.owner)).toEqual([
      "shogun",
      "planner",
      "backend",
      "scribe",
      "qa",
      "devops",
      "security"
    ]);
    expect(plan.partAssignments.every((part) => part.externalWrites === false && part.canExecuteNow === false)).toBe(true);
    expect(plan.a2a2LoopSync.syncBarrier).toEqual([
      "partId",
      "owner",
      "runtime",
      "sourceRefs",
      "evidence",
      "blockedActions",
      "nextExactStep"
    ]);
    expect(plan.aiTeamPairing.summary.pairedRoles).toBe(47);
    expect(plan.aiTeamPairing.canSendMessages).toBe(false);
    expect(plan.connectorRegistry.summary.connectorsTotal).toBe(15);
    expect(plan.connectorRegistry.canActivateConnectors).toBe(false);
    expect(plan.hermesImageEdit.summary.imageEdit).toBe(true);
    expect(plan.hermesImageEdit.acceptancePacket.status).toBe("acceptance-packet-ready-local-only");
    expect(plan.hermesImageEdit.canRunMcp).toBe(false);
    expect(plan.agentLaunchGate.summary.agentsTotal).toBe(9);
    expect(plan.agentLaunchGate.canLaunchAgents).toBe(false);
    expect(plan.teamRuntimeBridge.status).toBe("team-runtime-bridge-ready-local-only");
    expect(plan.teamRuntimeBridge.summary.paidApiExecutable).toBe(0);
  });
});
