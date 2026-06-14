import { describe, expect, test } from "vitest";
import {
  buildCenterBrainApiUrl,
  centerBrainShellBlockedActions,
  centerBrainShellFallback,
  normalizeCenterBrainStatus,
} from "./centerbrain-client";

describe("centerbrain shell client contract", () => {
  test("targets the existing local dev-control API by default", () => {
    expect(buildCenterBrainApiUrl("/api/centerbrain-hub")).toBe(
      "http://127.0.0.1:8711/api/centerbrain-hub",
    );
  });

  test("keeps the shell read-only and local-only", () => {
    expect(centerBrainShellFallback.shellMode).toBe("nextjs-tailwind-local-shell");
    expect(centerBrainShellFallback.apiContract).toBe("consume-existing-dev-control-api");
    expect(centerBrainShellFallback.canExecuteCommands).toBe(false);
    expect(centerBrainShellFallback.canActivateConnectors).toBe(false);
    expect(centerBrainShellFallback.canDeploy).toBe(false);
    expect(centerBrainShellFallback.requiresHumanApproval).toBe(true);
  });

  test("fallback keeps the CenterBrain topology visible when API is offline", () => {
    expect(centerBrainShellFallback.summary.aiNodes).toBe(9);
    expect(centerBrainShellFallback.summary.deviceNodes).toBe(3);
    expect(centerBrainShellFallback.summary.connectorLanes).toBe(15);
    expect(centerBrainShellFallback.summary.stackLanes).toBe(7);
    expect(centerBrainShellFallback.summary.liveExternalActions).toBe(0);
  });

  test("normalizes live API data without granting new capabilities", () => {
    const normalized = normalizeCenterBrainStatus({
      status: "centerbrain-hub-ready-local-only",
      summary: {
        aiNodes: 9,
        deviceNodes: 3,
        connectorLanes: 15,
        stackLanes: 7,
        liveExternalActions: 0,
      },
      guardrails: {
        canRunMcp: true,
        canDeploy: true,
      },
      aiNodes: [{ id: "codex", label: "Codex", status: "passed" }],
    });

    expect(normalized.guardrails.canRunMcp).toBe(false);
    expect(normalized.guardrails.canDeploy).toBe(false);
    expect(normalized.aiNodes).toHaveLength(1);
    expect(normalized.aiNodes[0]?.label).toBe("Codex");
  });

  test("blocks agent work and external operations at the shell boundary", () => {
    expect(centerBrainShellBlockedActions).toEqual(
      expect.arrayContaining([
        "agent_command_execution",
        "external_connector_activation",
        "real_mcp_start",
        "device_remote_control",
        "package_install_from_ui",
        "paid_api_call",
        "deploy_push_publish",
        "secret_read_or_print",
      ]),
    );
  });
});
