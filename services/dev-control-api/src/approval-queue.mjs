const approvalQueue = [
  {
    id: "approval-staging-preflight",
    source: "release-gate",
    actionId: "release-preflight",
    action: "Evaluate release preflight",
    riskLevel: "medium",
    status: "pending",
    requestedBy: "system",
    approvedBy: null,
    requestedAt: "2026-05-16T00:00:00.000Z",
    reason: "Staging or production movement needs explicit operator approval.",
    evidence: ["dry-run only", "no external writes"]
  },
  {
    id: "approval-doc-baseline",
    source: "codex",
    actionId: "baseline-check",
    action: "Freeze Mac live baseline",
    riskLevel: "low",
    status: "approved",
    requestedBy: "system",
    approvedBy: "operator",
    requestedAt: "2026-05-16T00:00:00.000Z",
    reason: "Local baseline verification is documentation-only.",
    evidence: ["P0 baseline committed", "dry-run only"]
  },
  {
    id: "approval-customer-send",
    source: "connector-guard",
    actionId: "customer-message-send",
    action: "Customer message send",
    riskLevel: "high",
    status: "rejected",
    requestedBy: "system",
    approvedBy: "operator",
    requestedAt: "2026-05-16T00:00:00.000Z",
    reason: "Customer-facing sends are blocked in local mode.",
    evidence: ["CUSTOMER_MESSAGE_SEND_ENABLED=false"]
  },
  {
    id: "approval-cloud-mutation",
    source: "kill-switch",
    actionId: "external-adapter-smoke",
    action: "External adapter smoke",
    riskLevel: "high",
    status: "blocked",
    requestedBy: "system",
    approvedBy: null,
    requestedAt: "2026-05-16T00:00:00.000Z",
    reason: "Cloud mutation and customer messaging kill switches are off.",
    evidence: ["CLOUDFLARE_MUTATION_ENABLED=false", "CUSTOMER_MESSAGE_SEND_ENABLED=false"]
  }
];

function summarize(items) {
  return items.reduce(
    (totals, item) => {
      totals[item.status] = (totals[item.status] || 0) + 1;
      return totals;
    },
    { pending: 0, approved: 0, rejected: 0, blocked: 0 }
  );
}

export function listApprovalQueue() {
  return {
    items: approvalQueue,
    totals: summarize(approvalQueue)
  };
}

export function ensureApprovalRequest(action, blockedSwitches = []) {
  const existing = approvalQueue.find((item) => item.actionId === action.id);
  if (existing) {
    return existing;
  }

  const blocked = blockedSwitches.length > 0;
  const item = {
    id: `approval-${action.id}`,
    source: "dry-run",
    actionId: action.id,
    action: action.title,
    riskLevel: action.risk,
    status: blocked ? "blocked" : "pending",
    requestedBy: "codex-local",
    approvedBy: null,
    requestedAt: new Date().toISOString(),
    reason: blocked
      ? "Required kill switch is off; approval alone cannot run this action."
      : "Human approval is required before this action can proceed.",
    evidence: blocked
      ? blockedSwitches.map((item) => `${item.env}=false`)
      : ["dry-run only", "approval required"]
  };

  approvalQueue.unshift(item);
  return item;
}
