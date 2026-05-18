import { ensureApprovalRequest } from "./approval-queue.mjs";
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
    mode: "dry-run",
    requiresApproval: true
  },
  {
    id: "subdomain-build-preflight",
    title: "Prepare subdomain build preflight",
    description: "Simulate the checks needed before a subdomain build without touching DNS or Cloudflare.",
    risk: "medium",
    mode: "dry-run",
    requiresApproval: true
  },
  {
    id: "solis-readonly-preflight",
    title: "Prepare Solis read-only connector",
    description: "Simulate the first Solis telemetry connector gate without API secrets or control commands.",
    risk: "medium",
    mode: "dry-run",
    requiresApproval: true
  },
  {
    id: "approval-queue-preflight",
    title: "Review approval and audit queue",
    description: "Simulate approval workflow readiness while external writes remain disabled.",
    risk: "medium",
    mode: "dry-run",
    requiresApproval: true
  },
  {
    id: "brain-index-preflight",
    title: "Review Obsidian brain index",
    description: "Simulate knowledge capture readiness and confirm raw chat or secrets must not become memory.",
    risk: "low",
    mode: "dry-run"
  },
  {
    id: "agent-team-profile-check",
    title: "Review 47 Ronin agent team",
    description: "Simulate profile, roster, connector policy, and backlog gate readiness without starting gateways or external writes.",
    risk: "medium",
    mode: "dry-run",
    requiresApproval: true
  },
  {
    id: "telegram-line-bridge-check",
    title: "Check Telegram and LINE bridge gates",
    description: "Simulate messaging bridge readiness and prove production sends remain blocked.",
    risk: "high",
    mode: "dry-run",
    requiresApproval: true,
    requiredSwitches: ["customer-messaging"]
  },
  {
    id: "cloudflare-subdomain-plan",
    title: "Prepare Cloudflare subdomain plan",
    description: "Simulate Cloudflare Pages, Worker, route, and DNS planning without applying changes.",
    risk: "high",
    mode: "dry-run",
    requiresApproval: true,
    requiredSwitches: ["cloud-mutation"]
  },
  {
    id: "external-adapter-smoke",
    title: "External adapter smoke",
    description: "Simulate an external adapter send and prove kill switches block it locally.",
    risk: "high",
    mode: "dry-run",
    requiresApproval: true,
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
  const approvalRequest = action.requiresApproval
    ? ensureApprovalRequest(action, switchResult.blocked)
    : null;

  if (!switchResult.allowed) {
    return {
      ok: true,
      status: 200,
      body: {
        actionId,
        result: "blocked_by_kill_switch",
        externalWrites: false,
        requiresHumanApproval: true,
        approvalRequest,
        blockedSwitches: switchResult.blocked.map((item) => ({
          id: item.id,
          title: item.title,
          env: item.env
        })),
        timestamp: new Date().toISOString()
      }
    };
  }

  if (action.requiresApproval) {
    return {
      ok: true,
      status: 202,
      body: {
        actionId,
        result: "queued_for_approval",
        externalWrites: false,
        requiresHumanApproval: true,
        approvalRequest,
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
