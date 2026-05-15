import { evaluateRequiredSwitches } from "./switches.mjs";

export const gates = [
  {
    id: "dry-run-lock",
    title: "Dry-run lock",
    state: "pass",
    description: "All command actions are simulated and cannot mutate external systems."
  },
  {
    id: "approval-required",
    title: "Human approval required",
    state: "warn",
    description: "Staging, production, paid API, customer messaging, and cloud mutation need approval."
  },
  {
    id: "secret-scan",
    title: "Secret scan",
    state: "warn",
    description: "Run a secret scan before any PR leaves local development."
  },
  {
    id: "public-exposure",
    title: "Public exposure blocked",
    state: "block",
    description: "Local AI, admin routes, MCP servers, and internal dashboards must not be public."
  }
];

export const actions = [
  {
    id: "baseline-check",
    title: "Freeze Mac live baseline",
    description: "Confirm current local baseline and write no external state.",
    risk: "low",
    mode: "dry-run"
  },
  {
    id: "dashboard-qa",
    title: "Run dashboard QA checklist",
    description: "Use the browser QA checklist against the local dashboard.",
    risk: "low",
    mode: "dry-run"
  },
  {
    id: "release-preflight",
    title: "Evaluate release preflight",
    description: "List missing gates before staging approval.",
    risk: "medium",
    mode: "dry-run"
  },
  {
    id: "external-adapter-smoke",
    title: "External adapter smoke",
    description: "Simulate an external adapter send and prove kill switches block it locally.",
    risk: "high",
    mode: "dry-run",
    requiredSwitches: ["customer-messaging", "cloud-mutation"]
  }
];

export function getAction(actionId) {
  return actions.find((action) => action.id === actionId);
}

export function createDryRunResult(actionId) {
  const action = getAction(actionId);

  if (!action) {
    return {
      ok: false,
      status: 404,
      body: {
        error: "unknown_action",
        actionId
      }
    };
  }

  const switchResult = evaluateRequiredSwitches(action.requiredSwitches);

  if (!switchResult.allowed) {
    return {
      ok: true,
      status: 200,
      body: {
        actionId,
        result: "blocked_by_kill_switch",
        externalWrites: false,
        requiresHumanApproval: true,
        blockedSwitches: switchResult.blocked.map((item) => ({
          id: item.id,
          title: item.title,
          env: item.env
        })),
        timestamp: new Date().toISOString()
      }
    };
  }

  return {
    ok: true,
    status: 200,
    body: {
      actionId,
      result: "simulated_only",
      externalWrites: false,
      requiresHumanApproval: true,
      timestamp: new Date().toISOString()
    }
  };
}
